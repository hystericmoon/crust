//! SFTP with russh and russh-sftp. They're async; each call runs on a
//! small runtime of its own, so the rest of the publish code stays simple.

use std::sync::{Arc, Mutex};

use russh::client::{self, AuthResult, KeyboardInteractiveAuthResponse};
use russh::keys::HashAlg;
use russh_sftp::client::SftpSession;
use russh_sftp::client::error::Error as SftpError;
use russh_sftp::protocol::{OpenFlags, StatusCode};
use tokio::io::AsyncWriteExt;
use tokio::runtime::Runtime;

use super::{FtpSettings, Password, Remote, TIMEOUT, login_refused, unreachable};
use crate::hosts::HostError;

pub struct SftpRemote {
    runtime: Runtime,
    sftp: SftpSession,
    session: client::Handle<KeyCheck>,
}

/// Checks the server's key against the one seen before, and notes what it was.
struct KeyCheck {
    known: String,
    seen: Arc<Mutex<String>>,
}

impl client::Handler for KeyCheck {
    type Error = russh::Error;

    async fn check_server_key(&mut self, key: &russh::keys::PublicKeyOrCertificate) -> Result<bool, Self::Error> {
        let fingerprint = match key {
            russh::keys::PublicKeyOrCertificate::PublicKey { key, .. } => key.fingerprint(HashAlg::Sha256).to_string(),
            russh::keys::PublicKeyOrCertificate::Certificate(cert) => cert.public_key().fingerprint(HashAlg::Sha256).to_string(),
        };
        *self.seen.lock().unwrap_or_else(|e| e.into_inner()) = fingerprint.clone();
        Ok(self.known.is_empty() || self.known == fingerprint)
    }
}

fn key_changed(settings: &FtpSettings, seen: &str) -> HostError {
    HostError::new(
        "identity",
        format!(
            "The server's key has changed since you connected (it was {}, now it's {seen}). This can happen when your host moves the site to a new server, but it can also mean someone is pretending to be the server. Ask your host, then check the server details again.",
            settings.host_key
        ),
    )
}

pub fn open(settings: &FtpSettings, password: &str, which: Password, known_key: &str) -> Result<(SftpRemote, String), HostError> {
    let runtime = tokio::runtime::Builder::new_current_thread().enable_all().build().map_err(|e| HostError::other(e.to_string()))?;
    let seen = Arc::new(Mutex::new(String::new()));
    let handler = KeyCheck { known: known_key.to_string(), seen: seen.clone() };
    let config = Arc::new(client::Config { inactivity_timeout: Some(TIMEOUT * 3), ..Default::default() });
    let server = settings.server.trim_start_matches('[').trim_end_matches(']').to_string();
    let seen_key = || seen.lock().unwrap_or_else(|e| e.into_inner()).clone();

    let (session, sftp) = runtime.block_on(async {
        let connect = client::connect(config, (server.as_str(), settings.port), handler);
        let mut session = match tokio::time::timeout(TIMEOUT, connect).await {
            Err(_) => return Err(unreachable(settings, "no answer")),
            Ok(Err(russh::Error::UnknownKey)) => {
                let mut changed = settings.clone();
                changed.host_key = known_key.to_string();
                return Err(key_changed(&changed, &seen_key()));
            }
            Ok(Err(e)) => return Err(unreachable(settings, e)),
            Ok(Ok(session)) => session,
        };
        let failed = |e: russh::Error| HostError::other(format!("Signing in stopped: {e}"));
        let mut ok = matches!(session.authenticate_password(settings.username.as_str(), password).await.map_err(failed)?, AuthResult::Success);
        if !ok {
            // Many hosts ask for the password as a question ("keyboard-interactive") instead.
            let mut reply = session.authenticate_keyboard_interactive_start(settings.username.as_str(), None).await.map_err(failed)?;
            for _ in 0..3 {
                match reply {
                    KeyboardInteractiveAuthResponse::Success => {
                        ok = true;
                        break;
                    }
                    KeyboardInteractiveAuthResponse::Failure { .. } => break,
                    KeyboardInteractiveAuthResponse::InfoRequest { prompts, .. } => {
                        let answers = prompts.iter().map(|_| password.to_string()).collect();
                        reply = session.authenticate_keyboard_interactive_respond(answers).await.map_err(failed)?;
                    }
                }
            }
        }
        if !ok {
            return Err(login_refused(which));
        }
        let channel = session.channel_open_session().await.map_err(failed)?;
        channel.request_subsystem(true, "sftp").await.map_err(failed)?;
        let sftp = tokio::time::timeout(TIMEOUT, SftpSession::new(channel.into_stream()))
            .await
            .map_err(|_| HostError::other("The server signed in but didn't start SFTP. Check that your host offers SFTP for this account."))?
            .map_err(|e| HostError::other(format!("The server signed in but didn't start SFTP: {e}")))?;
        sftp.set_timeout(TIMEOUT.as_secs());
        Ok((session, sftp))
    })?;
    let key = seen_key();
    Ok((SftpRemote { runtime, sftp, session }, key))
}

fn describe(e: SftpError) -> String {
    match e {
        SftpError::Status(status) => format!("{} ({:?})", status.error_message, status.status_code),
        other => other.to_string(),
    }
}

impl Remote for SftpRemote {
    fn put(&mut self, path: &str, bytes: &[u8]) -> Result<(), String> {
        let sftp = &self.sftp;
        self.runtime.block_on(async {
            let mut file = sftp.open_with_flags(path, OpenFlags::CREATE | OpenFlags::TRUNCATE | OpenFlags::WRITE).await.map_err(describe)?;
            file.write_all(bytes).await.map_err(|e| e.to_string())?;
            file.shutdown().await.map_err(|e| e.to_string())
        })
    }

    fn mkdir(&mut self, path: &str) -> Result<(), String> {
        let sftp = &self.sftp;
        self.runtime.block_on(async {
            match sftp.create_dir(path).await {
                Ok(()) => Ok(()),
                Err(e) => match sftp.metadata(path).await {
                    Ok(meta) if meta.is_dir() => Ok(()),
                    _ => Err(describe(e)),
                },
            }
        })
    }

    fn delete(&mut self, path: &str) -> Result<(), String> {
        let sftp = &self.sftp;
        self.runtime.block_on(async {
            match sftp.remove_file(path).await {
                Ok(()) => Ok(()),
                Err(SftpError::Status(s)) if s.status_code == StatusCode::NoSuchFile => Ok(()),
                Err(e) => Err(describe(e)),
            }
        })
    }

    fn close(&mut self) {
        let (sftp, session) = (&self.sftp, &self.session);
        self.runtime.block_on(async {
            let _ = sftp.close().await;
            let _ = session.disconnect(russh::Disconnect::ByApplication, "", "en").await;
        });
    }
}

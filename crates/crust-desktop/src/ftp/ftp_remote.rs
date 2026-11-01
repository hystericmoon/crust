//! FTP and FTPS (explicit TLS on the usual port) with suppaftp.

use std::io::Cursor;
use std::net::{TcpStream, ToSocketAddrs};
use std::sync::Arc;

use suppaftp::types::FileType;
use suppaftp::{FtpError, Mode, RustlsConnector, RustlsFtpStream, Status};

use super::{FtpSettings, Password, Protocol, Remote, TIMEOUT, Trust, login_refused, unreachable};
use crate::hosts::HostError;

pub struct FtpRemote {
    stream: RustlsFtpStream,
}

fn tls_config(trust: &Trust) -> Result<rustls::ClientConfig, String> {
    let provider = Arc::new(rustls::crypto::ring::default_provider());
    let builder = rustls::ClientConfig::builder_with_provider(provider.clone()).with_safe_default_protocol_versions().map_err(|e| e.to_string())?;
    if trust.extra_roots.is_empty() {
        use rustls_platform_verifier::BuilderVerifierExt;
        Ok(builder.with_platform_verifier().map_err(|e| e.to_string())?.with_no_client_auth())
    } else {
        let mut roots = rustls::RootCertStore::empty();
        for der in &trust.extra_roots {
            roots.add(rustls::pki_types::CertificateDer::from(der.clone())).map_err(|e| e.to_string())?;
        }
        Ok(builder.with_root_certificates(roots).with_no_client_auth())
    }
}

/// The server's name without IPv6 brackets.
fn bare(server: &str) -> &str {
    server.trim_start_matches('[').trim_end_matches(']')
}

pub fn open(settings: &FtpSettings, password: &str, which: Password, trust: &Trust) -> Result<FtpRemote, HostError> {
    let address = (bare(&settings.server), settings.port)
        .to_socket_addrs()
        .map_err(|e| unreachable(settings, e))?
        .next()
        .ok_or_else(|| unreachable(settings, "no address for this name"))?;
    let tcp = TcpStream::connect_timeout(&address, TIMEOUT).map_err(|e| unreachable(settings, e))?;
    let _ = tcp.set_read_timeout(Some(TIMEOUT));
    let _ = tcp.set_write_timeout(Some(TIMEOUT));
    let mut stream = RustlsFtpStream::connect_with_stream(tcp).map_err(|e| unreachable(settings, e))?;
    if settings.protocol == Protocol::Ftps {
        let config = tls_config(trust).map_err(HostError::other)?;
        stream = stream.into_secure(RustlsConnector::from(Arc::new(config)), bare(&settings.server)).map_err(|e| tls_problem(settings, e))?;
    }
    // Servers behind a router often name a private address for files; use the server's own.
    stream.set_mode(Mode::Passive);
    stream.set_passive_nat_workaround(true);
    match stream.login(settings.username.as_str(), password) {
        Ok(()) => {}
        Err(FtpError::UnexpectedResponse(r)) if r.status == Status::NotLoggedIn || r.status == Status::NeedPassword => return Err(login_refused(which)),
        Err(FtpError::UnexpectedResponse(r)) if settings.protocol == Protocol::Ftp && r.status == Status::NotAvailable => {
            return Err(HostError::other(
                "This server only allows encrypted connections. Choose FTPS (or SFTP if your host offers it).",
            ));
        }
        Err(e) => return Err(said(e)),
    }
    stream.transfer_type(FileType::Binary).map_err(said)?;
    Ok(FtpRemote { stream })
}

fn tls_problem(settings: &FtpSettings, e: FtpError) -> HostError {
    match e {
        FtpError::UnexpectedResponse(_) => HostError::other("This server doesn't offer FTPS. Choose SFTP if your host offers it, or plain FTP if there's nothing else."),
        // rustls reports a refused certificate inside the connection error.
        FtpError::ConnectionError(e) if e.get_ref().is_some_and(|inner| inner.downcast_ref::<rustls::Error>().is_some()) => tls_problem(settings, FtpError::SecureError(e.to_string())),
        FtpError::SecureError(why) => HostError::other(format!(
            "The server's security certificate isn't valid for “{}”. Use the exact FTPS server name your host gives (it may differ from your site's domain), or choose SFTP. ({why})",
            settings.server
        )),
        other => unreachable(settings, other),
    }
}

/// The server's own words.
fn said(e: FtpError) -> HostError {
    HostError::other(format!("The server said: {}", describe(&e)))
}

fn describe(e: &FtpError) -> String {
    match e {
        FtpError::UnexpectedResponse(r) => format!("{} ({})", String::from_utf8_lossy(&r.body).trim(), r.status.code()),
        other => other.to_string(),
    }
}

impl Remote for FtpRemote {
    fn put(&mut self, path: &str, bytes: &[u8]) -> Result<(), String> {
        self.stream.put_file(path, &mut Cursor::new(bytes)).map(|_| ()).map_err(|e| describe(&e))
    }

    fn mkdir(&mut self, path: &str) -> Result<(), String> {
        match self.stream.mkdir(path) {
            Ok(()) => Ok(()),
            // Already there? Moving into it proves it.
            Err(e) => {
                let back = self.stream.pwd().map_err(|_| describe(&e))?;
                if self.stream.cwd(path).is_ok() {
                    let _ = self.stream.cwd(back);
                    Ok(())
                } else {
                    Err(describe(&e))
                }
            }
        }
    }

    fn delete(&mut self, path: &str) -> Result<(), String> {
        match self.stream.rm(path) {
            Ok(()) => Ok(()),
            Err(FtpError::UnexpectedResponse(r)) if r.status == Status::FileUnavailable => Ok(()),
            Err(e) => Err(describe(&e)),
        }
    }

    fn close(&mut self) {
        let _ = self.stream.quit();
    }
}

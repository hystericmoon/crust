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
    // A secure connection that broke off (not a certificate problem) is tried
    // up to three times: some servers (libunftp) switch to TLS a moment after
    // saying they will, and read a quick client's first TLS bytes as a command.
    let mut attempt = connect(settings, trust);
    for _ in 1..TLS_TRIES {
        if !matches!(attempt, Err(Tls::BrokeOff(_))) {
            break;
        }
        attempt = connect(settings, trust);
    }
    let mut stream = attempt.map_err(Tls::into_error)?;
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

/// How many times a secure connection that broke off is tried.
const TLS_TRIES: usize = 3;

/// Why connecting failed; only `BrokeOff` is worth trying again.
enum Tls {
    Failed(HostError),
    BrokeOff(HostError),
}

impl Tls {
    fn into_error(self) -> HostError {
        match self {
            Tls::Failed(e) | Tls::BrokeOff(e) => e,
        }
    }
}

/// Connects, and for FTPS secures the connection.
fn connect(settings: &FtpSettings, trust: &Trust) -> Result<RustlsFtpStream, Tls> {
    let address = (bare(&settings.server), settings.port)
        .to_socket_addrs()
        .map_err(|e| Tls::Failed(unreachable(settings, e)))?
        .next()
        .ok_or_else(|| Tls::Failed(unreachable(settings, "no address for this name")))?;
    let tcp = TcpStream::connect_timeout(&address, TIMEOUT).map_err(|e| Tls::Failed(unreachable(settings, e)))?;
    let _ = tcp.set_read_timeout(Some(TIMEOUT));
    let _ = tcp.set_write_timeout(Some(TIMEOUT));
    let stream = RustlsFtpStream::connect_with_stream(tcp).map_err(|e| Tls::Failed(unreachable(settings, e)))?;
    if settings.protocol != Protocol::Ftps {
        return Ok(stream);
    }
    let config = tls_config(trust).map_err(|e| Tls::Failed(HostError::other(e)))?;
    stream.into_secure(RustlsConnector::from(Arc::new(config)), bare(&settings.server)).map_err(|e| tls_problem(settings, e))
}

fn tls_problem(settings: &FtpSettings, e: FtpError) -> Tls {
    match e {
        FtpError::UnexpectedResponse(_) => Tls::Failed(HostError::other(
            "This server doesn't offer FTPS. Choose SFTP if your host offers it, or plain FTP if there's nothing else.",
        )),
        // rustls reports what went wrong inside the connection error.
        FtpError::ConnectionError(e) => match e.get_ref().and_then(|inner| inner.downcast_ref::<rustls::Error>()) {
            Some(why) if certificate_problem(why) => Tls::Failed(certificate_refused(settings, why)),
            Some(why) => Tls::BrokeOff(HostError::other(format!(
                "The secure connection to the server broke off. Try again; if it keeps happening, choose SFTP or ask your host. ({why})"
            ))),
            None => Tls::Failed(unreachable(settings, e)),
        },
        FtpError::SecureError(why) => Tls::Failed(certificate_refused(settings, why)),
        other => Tls::Failed(unreachable(settings, other)),
    }
}

/// The server's certificate was refused (rather than the connection breaking off).
fn certificate_problem(e: &rustls::Error) -> bool {
    matches!(e, rustls::Error::InvalidCertificate(_) | rustls::Error::NoCertificatesPresented | rustls::Error::UnsupportedNameType)
}

fn certificate_refused(settings: &FtpSettings, why: impl std::fmt::Display) -> HostError {
    HostError::other(format!(
        "The server's security certificate isn't valid for “{}”. Use the exact FTPS server name your host gives (it may differ from your site's domain), or choose SFTP. ({why})",
        settings.server
    ))
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

#[cfg(test)]
mod tls_tests {
    use super::*;
    use std::io;

    fn settings() -> FtpSettings {
        FtpSettings { protocol: Protocol::Ftps, server: "ftp.example.com".into(), port: 21, username: "rina".into(), folder: String::new(), host_key: String::new() }
    }

    fn broken(e: rustls::Error) -> FtpError {
        FtpError::ConnectionError(io::Error::new(io::ErrorKind::InvalidData, e))
    }

    #[test]
    fn a_refused_certificate_says_so_and_is_not_tried_again() {
        let e = broken(rustls::Error::InvalidCertificate(rustls::CertificateError::NotValidForName));
        match tls_problem(&settings(), e) {
            Tls::Failed(e) => assert!(e.message.contains("security certificate isn't valid for “ftp.example.com”"), "{}", e.message),
            Tls::BrokeOff(e) => panic!("should not retry: {}", e.message),
        }
    }

    #[test]
    fn a_connection_that_broke_off_is_tried_again_without_blaming_the_certificate() {
        let e = broken(rustls::Error::InvalidMessage(rustls::InvalidMessage::InvalidContentType));
        match tls_problem(&settings(), e) {
            Tls::BrokeOff(e) => {
                assert!(e.message.starts_with("The secure connection to the server broke off."), "{}", e.message);
                assert!(!e.message.contains("certificate"), "{}", e.message);
            }
            Tls::Failed(e) => panic!("should retry: {}", e.message),
        }
    }
}

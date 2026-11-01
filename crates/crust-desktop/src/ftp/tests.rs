//! The plan and the upload loop are tested with an in-memory server; the
//! real connections against real FTP, FTPS and SFTP servers started inside
//! the tests on 127.0.0.1 (libunftp, and russh's server side), so CI needs
//! no outside server.

use super::*;
use crate::hosts::{HostKind, HostService, Client, MemoryKeychain, load_connection, HOSTS_FILE};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};

fn file(path: &str, text: &str) -> SiteFile {
    SiteFile { path: path.into(), bytes: text.as_bytes().to_vec() }
}

fn site_files() -> Vec<SiteFile> {
    vec![
        file("/_redirects", "/old /new 301\n"),
        file("/about/index.html", "<h1>About</h1>"),
        file("/blog/opening/index.html", "<h1>Open</h1>"),
        file("/index.html", "<h1>Home</h1>"),
        file("/media/door-480w.jpg", "jpg"),
        file("/styles.css", "body{}"),
    ]
}

fn settings(protocol: Protocol, port: u16) -> FtpSettings {
    FtpSettings { protocol, server: "127.0.0.1".into(), port, username: "rina".into(), folder: "public_html".into(), host_key: String::new() }
}

fn paths(files: &[SiteFile], idx: &[usize]) -> Vec<String> {
    idx.iter().map(|i| files[*i].path.clone()).collect()
}

// --------------------------------------------------------------------- plan

#[test]
fn the_first_publish_sends_everything_photos_first_pages_last() {
    let files = site_files();
    let p = plan(&Sent::default(), "t", &files);
    assert_eq!(paths(&files, &p.upload), ["/media/door-480w.jpg", "/styles.css", "/about/index.html", "/blog/opening/index.html", "/index.html"]);
    assert_eq!(p.folders, ["/about", "/blog", "/media", "/blog/opening"]);
    assert!(p.delete.is_empty());
}

#[test]
fn later_publishes_send_only_changes_and_remove_what_is_gone() {
    let files = site_files();
    let mut sent = Sent { target: "t".into(), files: files.iter().filter(|f| f.path != "/_redirects").map(|f| (f.path.clone(), hash(&f.bytes))).collect() };
    sent.files.insert("/old-page/index.html".into(), "h".into());
    assert_eq!(plan(&sent, "t", &files), Plan { folders: vec![], upload: vec![], delete: vec!["/old-page/index.html".into()] });

    let mut changed = files.clone();
    changed[3].bytes = b"<h1>New home</h1>".to_vec();
    changed.push(file("/contact/index.html", "<h1>Contact</h1>"));
    let p = plan(&sent, "t", &changed);
    assert_eq!(paths(&changed, &p.upload), ["/contact/index.html", "/index.html"]);
    assert_eq!(p.folders, ["/contact"]);
}

#[test]
fn another_server_or_folder_starts_over_and_removes_nothing() {
    let files = site_files();
    let sent = Sent { target: "old".into(), files: [("/gone.html".to_string(), "h".to_string())].into() };
    let p = plan(&sent, "new", &files);
    assert_eq!(p.upload.len(), 5);
    assert!(p.delete.is_empty());
}

#[test]
fn settings_are_tidied_and_checked() {
    let typed = FtpSettings { protocol: Protocol::Sftp, server: " sftp://ftp.example.com/ ".into(), port: 0, username: " rina ".into(), folder: "public_html/".into(), host_key: String::new() };
    let tidy = typed.tidy().unwrap();
    assert_eq!((tidy.server.as_str(), tidy.port, tidy.username.as_str(), tidy.folder.as_str()), ("ftp.example.com", 22, "rina", "public_html"));
    assert_eq!(tidy.target(), "sftp://rina@ftp.example.com:22/public_html");
    assert_eq!(tidy.remote_path("/blog/index.html"), "public_html/blog/index.html");
    assert_eq!(FtpSettings { folder: String::new(), ..tidy.clone() }.remote_path("/index.html"), "index.html");
    assert_eq!(FtpSettings { folder: "../etc".into(), ..tidy.clone() }.tidy().unwrap_err().kind, "folder");
    assert_eq!(FtpSettings { server: "ftp.example.com/www".into(), ..tidy.clone() }.tidy().unwrap_err().kind, "server");
    assert_eq!(FtpSettings { username: String::new(), ..tidy }.tidy().unwrap_err().kind, "username");
}

#[test]
fn the_site_address_is_a_domain_with_nothing_after_it() {
    assert_eq!(tidy_site_url("Example.com/").unwrap(), "https://example.com");
    assert_eq!(tidy_site_url("http://example.com").unwrap(), "http://example.com");
    assert_eq!(tidy_site_url("https://example.com/blog").unwrap_err().kind, "url");
    assert_eq!(tidy_site_url("").unwrap_err().kind, "url");
    assert_eq!(tidy_site_url("ftp://example.com").unwrap_err().kind, "url");
}

// ------------------------------------------------------------ upload loop

#[derive(Default)]
struct MemoryServer {
    files: HashMap<String, Vec<u8>>,
    folders: Vec<String>,
    log: Vec<String>,
    fail_on_put: Option<usize>,
    puts: usize,
}

impl Remote for MemoryServer {
    fn put(&mut self, path: &str, bytes: &[u8]) -> Result<(), String> {
        self.puts += 1;
        if self.fail_on_put == Some(self.puts) {
            return Err("connection lost".into());
        }
        self.log.push(format!("put {path}"));
        self.files.insert(path.into(), bytes.to_vec());
        Ok(())
    }
    fn mkdir(&mut self, path: &str) -> Result<(), String> {
        self.log.push(format!("mkdir {path}"));
        self.folders.push(path.into());
        Ok(())
    }
    fn delete(&mut self, path: &str) -> Result<(), String> {
        self.log.push(format!("delete {path}"));
        self.files.remove(path);
        Ok(())
    }
    fn close(&mut self) {}
}

#[test]
fn run_makes_folders_then_sends_then_removes_and_remembers() {
    let s = settings(Protocol::Sftp, 22);
    let files = site_files();
    let mut server = MemoryServer::default();
    let mut sent = Sent { target: "elsewhere".into(), files: [("/x".to_string(), "h".to_string())].into() };
    let seen = Mutex::new(Vec::new());
    let published = run(&mut server, &s, &files, &mut sent, &|p| seen.lock().unwrap().push(p.done)).unwrap();
    assert_eq!((published.uploaded, published.files), (5, 5));
    assert_eq!(server.log[0], "mkdir public_html/about");
    assert_eq!(server.log.last().unwrap(), "put public_html/index.html");
    assert!(!server.files.contains_key("public_html/_redirects"));
    assert_eq!(*seen.lock().unwrap(), [0, 1, 2, 3, 4, 5]);
    assert_eq!(sent.target, s.target());
    assert_eq!(sent.files.len(), 5);

    // Remove a page: only it goes.
    let fewer: Vec<SiteFile> = files.iter().filter(|f| f.path != "/about/index.html").cloned().collect();
    server.log.clear();
    let published = run(&mut server, &s, &fewer, &mut sent, &|_| {}).unwrap();
    assert_eq!(published.uploaded, 0);
    assert_eq!(server.log, ["delete public_html/about/index.html"]);
    assert!(!sent.files.contains_key("/about/index.html"));
}

#[test]
fn a_stopped_upload_carries_on_where_it_left_off() {
    let s = settings(Protocol::Ftp, 21);
    let files = site_files();
    let mut server = MemoryServer { fail_on_put: Some(3), ..Default::default() };
    let mut sent = Sent::default();
    let err = run(&mut server, &s, &files, &mut sent, &|_| {}).unwrap_err();
    assert!(err.message.contains("Publish again to send the rest"), "{}", err.message);
    assert_eq!(sent.files.len(), 2);
    server.log.clear();
    let published = run(&mut server, &s, &files, &mut sent, &|_| {}).unwrap();
    assert_eq!(published.uploaded, 3);
    assert_eq!(server.log.iter().filter(|l| l.starts_with("put")).count(), 3);
}

// ---------------------------------------------------- real FTP and FTPS

fn free_port() -> u16 {
    std::net::TcpListener::bind("127.0.0.1:0").unwrap().local_addr().unwrap().port()
}

fn wait_for(port: u16) {
    for _ in 0..200 {
        if std::net::TcpStream::connect(("127.0.0.1", port)).is_ok() {
            return;
        }
        std::thread::sleep(std::time::Duration::from_millis(20));
    }
    panic!("test server on {port} didn't start");
}

#[derive(Debug)]
struct OnePerson;

#[async_trait::async_trait]
impl unftp_core::auth::Authenticator for OnePerson {
    async fn authenticate(&self, username: &str, creds: &unftp_core::auth::Credentials) -> Result<unftp_core::auth::Principal, unftp_core::auth::AuthenticationError> {
        if username == "rina" && creds.password.as_deref() == Some("secret") {
            Ok(unftp_core::auth::Principal { username: username.into() })
        } else {
            Err(unftp_core::auth::AuthenticationError::BadPassword)
        }
    }
}

struct Certs {
    dir: tempfile::TempDir,
    ca_der: Vec<u8>,
}

fn certs() -> Certs {
    use rcgen::{BasicConstraints, CertificateParams, IsCa, Issuer, KeyPair};
    let ca_key = KeyPair::generate().unwrap();
    let mut ca_params = CertificateParams::new(Vec::<String>::new()).unwrap();
    ca_params.is_ca = IsCa::Ca(BasicConstraints::Unconstrained);
    let ca = ca_params.self_signed(&ca_key).unwrap();
    let issuer = Issuer::new(ca_params, ca_key);
    let key = KeyPair::generate().unwrap();
    let cert = CertificateParams::new(vec!["127.0.0.1".to_string()]).unwrap().signed_by(&key, &issuer).unwrap();
    let dir = tempfile::tempdir().unwrap();
    fs::write(dir.path().join("cert.pem"), cert.pem() + &ca.pem()).unwrap();
    fs::write(dir.path().join("key.pem"), key.serialize_pem()).unwrap();
    Certs { dir, ca_der: ca.der().to_vec() }
}

/// A real FTP server for one person (rina / secret) serving `root`;
/// with `certs` it also offers FTPS.
fn ftp_server(root: &Path, certs: Option<&Certs>) -> u16 {
    let port = free_port();
    let root = root.to_path_buf();
    let tls = certs.map(|c| (c.dir.path().join("cert.pem"), c.dir.path().join("key.pem")));
    std::thread::spawn(move || {
        let runtime = tokio::runtime::Builder::new_multi_thread().worker_threads(2).enable_all().build().unwrap();
        runtime.block_on(async move {
            let mut builder = libunftp::ServerBuilder::with_authenticator(Box::new(move || unftp_sbe_fs::Filesystem::new(root.clone()).unwrap()), Arc::new(OnePerson))
                .greeting("test server")
                .passive_ports(50000..=60000);
            if let Some((cert, key)) = tls {
                builder = builder.ftps(cert, key);
            }
            builder.build().unwrap().listen(format!("127.0.0.1:{port}")).await.unwrap();
        });
    });
    wait_for(port);
    port
}

fn service(trust: Trust) -> HostService {
    let mut service = HostService::new(Client::default(), Box::new(MemoryKeychain::default()));
    service.trust = trust;
    service
}

fn finished_site() -> tempfile::TempDir {
    let dir = tempfile::tempdir().unwrap();
    fs::write(dir.path().join("index.html"), "<h1>Home</h1>").unwrap();
    fs::create_dir_all(dir.path().join("about")).unwrap();
    fs::write(dir.path().join("about/index.html"), "<h1>About</h1>").unwrap();
    fs::create_dir_all(dir.path().join("media")).unwrap();
    fs::write(dir.path().join("media/door.jpg"), [0xFFu8, 0xD8, 0, 1, 2, 3]).unwrap();
    fs::write(dir.path().join("_redirects"), "/old /new 301\n").unwrap();
    dir
}

/// Connects, publishes twice (the second sends nothing), changes and removes
/// a page, and checks the server holds exactly that.
fn publish_round_trip(protocol: Protocol, port: u16, server_root: &Path, service: &HostService) {
    let site_dir = tempfile::tempdir().unwrap();
    let site = SiteFolder::new(site_dir.path());
    let view = service.connect_ftp(&site, settings(protocol, port), "secret", "example.com").unwrap();
    assert_eq!(view.host, HostKind::Ftp);
    assert_eq!(view.url, "https://example.com");
    assert_eq!(view.account_name, "rina@127.0.0.1");
    let www = server_root.join("public_html");
    assert!(!www.join(CHECK_FILE).exists(), "the check file is removed");

    // The password is in the keychain, not the site folder.
    let saved = String::from_utf8(site.read(HOSTS_FILE).unwrap().unwrap()).unwrap();
    assert!(!saved.contains("secret"));
    let connection = load_connection(&site).unwrap();
    assert_eq!(service.keychain.get(&connection.token_key).unwrap().as_deref(), Some("secret"));

    // A file put there by hand is never touched.
    fs::write(www.join("google123.html"), "verify").unwrap();

    let build = finished_site();
    let published = service.publish(&site, build.path(), &|_| {}).unwrap();
    assert_eq!((published.uploaded, published.files, published.url.as_str()), (3, 3, "https://example.com"));
    assert_eq!(fs::read_to_string(www.join("about/index.html")).unwrap(), "<h1>About</h1>");
    assert_eq!(fs::read(www.join("media/door.jpg")).unwrap(), [0xFFu8, 0xD8, 0, 1, 2, 3]);
    assert!(!www.join("_redirects").exists());
    assert!(load_connection(&site).unwrap().last_published.is_some());

    assert_eq!(service.publish(&site, build.path(), &|_| {}).unwrap().uploaded, 0);

    fs::write(build.path().join("index.html"), "<h1>New home</h1>").unwrap();
    fs::remove_dir_all(build.path().join("about")).unwrap();
    assert_eq!(service.publish(&site, build.path(), &|_| {}).unwrap().uploaded, 1);
    assert_eq!(fs::read_to_string(www.join("index.html")).unwrap(), "<h1>New home</h1>");
    assert!(!www.join("about/index.html").exists());
    assert!(www.join("google123.html").exists());

    // "Send every file next time".
    service.resend_all(&site).unwrap();
    assert_eq!(service.publish(&site, build.path(), &|_| {}).unwrap().uploaded, 2);

    // Disconnecting forgets the password and what was sent.
    service.disconnect(&site).unwrap();
    assert!(load_connection(&site).is_none());
    assert_eq!(load_sent(&site), Sent::default());
    assert_eq!(service.keychain.get(&connection.token_key).unwrap(), None);
}

#[test]
fn ftp_connects_and_sends_only_changed_files() {
    let root = tempfile::tempdir().unwrap();
    fs::create_dir(root.path().join("public_html")).unwrap();
    let port = ftp_server(root.path(), None);
    publish_round_trip(Protocol::Ftp, port, root.path(), &service(Trust::default()));
}

#[test]
fn ftps_connects_with_a_trusted_certificate() {
    let root = tempfile::tempdir().unwrap();
    fs::create_dir(root.path().join("public_html")).unwrap();
    let certs = certs();
    let port = ftp_server(root.path(), Some(&certs));
    publish_round_trip(Protocol::Ftps, port, root.path(), &service(Trust { extra_roots: vec![certs.ca_der.clone()] }));
}

#[test]
fn ftps_refuses_a_certificate_it_cant_trust() {
    let root = tempfile::tempdir().unwrap();
    fs::create_dir(root.path().join("public_html")).unwrap();
    let certs = certs();
    let port = ftp_server(root.path(), Some(&certs));
    let site_dir = tempfile::tempdir().unwrap();
    let err = service(Trust::default()).connect_ftp(&SiteFolder::new(site_dir.path()), settings(Protocol::Ftps, port), "secret", "example.com").unwrap_err();
    assert!(err.message.contains("security certificate isn't valid for “127.0.0.1”"), "{}", err.message);
    assert!(load_connection(&SiteFolder::new(site_dir.path())).is_none());
}

#[test]
fn ftps_on_a_server_without_it_says_so() {
    let root = tempfile::tempdir().unwrap();
    let port = ftp_server(root.path(), None);
    let site_dir = tempfile::tempdir().unwrap();
    let err = service(Trust::default()).connect_ftp(&SiteFolder::new(site_dir.path()), settings(Protocol::Ftps, port), "secret", "example.com").unwrap_err();
    assert!(err.message.contains("doesn't offer FTPS"), "{}", err.message);
}

#[test]
fn ftp_wrong_password_missing_folder_and_no_server_are_told_apart() {
    let root = tempfile::tempdir().unwrap();
    let port = ftp_server(root.path(), None);
    let site_dir = tempfile::tempdir().unwrap();
    let site = SiteFolder::new(site_dir.path());
    let s = service(Trust::default());

    let err = s.connect_ftp(&site, settings(Protocol::Ftp, port), "wrong", "example.com").unwrap_err();
    assert_eq!(err.kind, "token");
    assert!(err.message.contains("didn't accept this username and password"));

    let err = s.connect_ftp(&site, settings(Protocol::Ftp, port), "secret", "example.com").unwrap_err();
    assert_eq!(err.kind, "folder", "{}", err.message);
    assert!(err.message.contains("“public_html”"));

    let err = s.connect_ftp(&site, settings(Protocol::Ftp, free_port()), "secret", "example.com").unwrap_err();
    assert_eq!(err.kind, "offline");
    assert!(err.message.starts_with("Couldn't reach 127.0.0.1 on port"));

    // An empty folder means where the login lands: that works.
    s.connect_ftp(&site, FtpSettings { folder: String::new(), ..settings(Protocol::Ftp, port) }, "secret", "example.com").unwrap();
    assert!(load_connection(&site).is_some());
}

#[test]
fn ftp_a_changed_password_asks_for_it_and_takes_the_new_one() {
    let root = tempfile::tempdir().unwrap();
    fs::create_dir(root.path().join("public_html")).unwrap();
    let port = ftp_server(root.path(), None);
    let site_dir = tempfile::tempdir().unwrap();
    let site = SiteFolder::new(site_dir.path());
    let s = service(Trust::default());
    s.connect_ftp(&site, settings(Protocol::Ftp, port), "secret", "example.com").unwrap();
    let key = load_connection(&site).unwrap().token_key;
    s.keychain.set(&key, "old-password").unwrap();

    let build = finished_site();
    let err = s.publish(&site, build.path(), &|_| {}).unwrap_err();
    assert_eq!(err.kind, "token");
    assert!(err.message.contains("no longer accepts the saved password"));

    assert_eq!(s.replace_token(&site, "nope").unwrap_err().kind, "token");
    s.replace_token(&site, "secret").unwrap();
    assert_eq!(s.publish(&site, build.path(), &|_| {}).unwrap().uploaded, 3);

    s.keychain.delete(&key).unwrap();
    let err = s.publish(&site, build.path(), &|_| {}).unwrap_err();
    assert!(err.message.contains("keychain no longer has the server's password"));
}

// ------------------------------------------------------------ real SFTP

mod sftp_server {
    use russh::server::{Auth, Msg, Server as _, Session};
    use russh::{Channel, ChannelId, MethodKind, MethodSet};
    use russh_sftp::protocol::{Attrs, FileAttributes, Handle, Name, OpenFlags, Status, StatusCode, Version};
    use std::collections::HashMap;
    use std::fs::{self, File};
    use std::io::{Seek, SeekFrom, Write};
    use std::net::SocketAddr;
    use std::path::{Path, PathBuf};
    use std::sync::Arc;

    pub fn key(seed: u8) -> russh::keys::PrivateKey {
        russh::keys::PrivateKey::from(russh::keys::ssh_key::private::Ed25519Keypair::from_seed(&[seed; 32]))
    }

    #[derive(Clone)]
    struct Server {
        root: PathBuf,
        keyboard_only: bool,
    }

    impl russh::server::Server for Server {
        type Handler = Ssh;
        fn new_client(&mut self, _: Option<SocketAddr>) -> Ssh {
            Ssh { root: self.root.clone(), keyboard_only: self.keyboard_only, channels: HashMap::new() }
        }
    }

    struct Ssh {
        root: PathBuf,
        keyboard_only: bool,
        channels: HashMap<ChannelId, Channel<Msg>>,
    }

    fn methods() -> MethodSet {
        MethodSet::from(&[MethodKind::KeyboardInteractive][..])
    }

    impl russh::server::Handler for Ssh {
        type Error = russh::Error;

        async fn auth_password(&mut self, user: &str, password: &str) -> Result<Auth, Self::Error> {
            if !self.keyboard_only && user == "rina" && password == "secret" {
                Ok(Auth::Accept)
            } else {
                Ok(Auth::Reject { proceed_with_methods: self.keyboard_only.then(methods), partial_success: false })
            }
        }

        async fn auth_keyboard_interactive<'a>(&'a mut self, user: &str, _submethods: &str, response: Option<russh::server::Response<'a>>) -> Result<Auth, Self::Error> {
            if !self.keyboard_only {
                return Ok(Auth::Reject { proceed_with_methods: None, partial_success: false });
            }
            match response {
                None => Ok(Auth::Partial { name: "".into(), instructions: "".into(), prompts: vec![("Password: ".into(), false)].into() }),
                Some(mut answers) => {
                    let ok = user == "rina" && answers.next().is_some_and(|a| a.as_ref() == b"secret");
                    Ok(if ok { Auth::Accept } else { Auth::Reject { proceed_with_methods: None, partial_success: false } })
                }
            }
        }

        async fn channel_open_session(&mut self, channel: Channel<Msg>, reply: russh::server::ChannelOpenHandle, _: &mut Session) -> Result<(), Self::Error> {
            self.channels.insert(channel.id(), channel);
            reply.accept().await;
            Ok(())
        }

        async fn channel_eof(&mut self, channel: ChannelId, session: &mut Session) -> Result<(), Self::Error> {
            session.close(channel)?;
            Ok(())
        }

        async fn subsystem_request(&mut self, id: ChannelId, name: &str, session: &mut Session) -> Result<(), Self::Error> {
            match (name, self.channels.remove(&id)) {
                ("sftp", Some(channel)) => {
                    session.channel_success(id)?;
                    russh_sftp::server::run(channel.into_stream(), Files { root: self.root.clone(), open: HashMap::new(), next: 0 }).await;
                }
                _ => session.channel_failure(id)?,
            }
            Ok(())
        }
    }

    /// Serves files under `root` (paths are relative to it, like a home folder).
    struct Files {
        root: PathBuf,
        open: HashMap<String, File>,
        next: u32,
    }

    impl Files {
        fn path(&self, path: &str) -> Result<PathBuf, StatusCode> {
            let rel = Path::new(path.trim_start_matches('/'));
            if rel.components().any(|c| matches!(c, std::path::Component::ParentDir)) {
                return Err(StatusCode::PermissionDenied);
            }
            Ok(self.root.join(rel))
        }
    }

    fn ok(id: u32) -> Status {
        Status { id, status_code: StatusCode::Ok, error_message: "Ok".into(), language_tag: "en-US".into() }
    }

    fn code(e: std::io::Error) -> StatusCode {
        if e.kind() == std::io::ErrorKind::NotFound { StatusCode::NoSuchFile } else { StatusCode::Failure }
    }

    impl russh_sftp::server::Handler for Files {
        type Error = StatusCode;

        fn unimplemented(&self) -> StatusCode {
            StatusCode::OpUnsupported
        }

        async fn init(&mut self, _: u32, _: HashMap<String, String>) -> Result<Version, StatusCode> {
            Ok(Version::new())
        }

        async fn open(&mut self, id: u32, filename: String, flags: OpenFlags, _: FileAttributes) -> Result<Handle, StatusCode> {
            let path = self.path(&filename)?;
            let file = fs::OpenOptions::new()
                .write(flags.contains(OpenFlags::WRITE))
                .read(flags.contains(OpenFlags::READ))
                .create(flags.contains(OpenFlags::CREATE))
                .truncate(flags.contains(OpenFlags::TRUNCATE))
                .open(path)
                .map_err(code)?;
            self.next += 1;
            let handle = format!("h{}", self.next);
            self.open.insert(handle.clone(), file);
            Ok(Handle { id, handle })
        }

        async fn write(&mut self, id: u32, handle: String, offset: u64, data: Vec<u8>) -> Result<Status, StatusCode> {
            let file = self.open.get_mut(&handle).ok_or(StatusCode::Failure)?;
            file.seek(SeekFrom::Start(offset)).map_err(code)?;
            file.write_all(&data).map_err(code)?;
            Ok(ok(id))
        }

        async fn close(&mut self, id: u32, handle: String) -> Result<Status, StatusCode> {
            self.open.remove(&handle);
            Ok(ok(id))
        }

        async fn mkdir(&mut self, id: u32, path: String, _: FileAttributes) -> Result<Status, StatusCode> {
            fs::create_dir(self.path(&path)?).map_err(code)?;
            Ok(ok(id))
        }

        async fn remove(&mut self, id: u32, filename: String) -> Result<Status, StatusCode> {
            fs::remove_file(self.path(&filename)?).map_err(code)?;
            Ok(ok(id))
        }

        async fn stat(&mut self, id: u32, path: String) -> Result<Attrs, StatusCode> {
            let meta = fs::metadata(self.path(&path)?).map_err(code)?;
            Ok(Attrs { id, attrs: FileAttributes::from(&meta) })
        }

        async fn lstat(&mut self, id: u32, path: String) -> Result<Attrs, StatusCode> {
            self.stat(id, path).await
        }

        async fn realpath(&mut self, id: u32, path: String) -> Result<Name, StatusCode> {
            Ok(Name { id, files: vec![russh_sftp::protocol::File::dummy(format!("/{}", path.trim_start_matches(['.', '/'])))] })
        }
    }

    /// A real SFTP server for rina / secret with host key `seed`, serving `root`.
    pub fn start(root: &Path, seed: u8, keyboard_only: bool) -> u16 {
        let config = Arc::new(russh::server::Config {
            keys: vec![key(seed)],
            auth_rejection_time: std::time::Duration::from_millis(10),
            auth_rejection_time_initial: Some(std::time::Duration::from_millis(0)),
            ..Default::default()
        });
        let mut server = Server { root: root.to_path_buf(), keyboard_only };
        let (tx, rx) = std::sync::mpsc::channel();
        std::thread::spawn(move || {
            let runtime = tokio::runtime::Builder::new_multi_thread().worker_threads(2).enable_all().build().unwrap();
            runtime.block_on(async move {
                let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
                tx.send(listener.local_addr().unwrap().port()).unwrap();
                let _ = server.run_on_socket(config, &listener).await;
            });
        });
        rx.recv().unwrap()
    }
}

fn fingerprint(seed: u8) -> String {
    sftp_server::key(seed).public_key().fingerprint(russh::keys::HashAlg::Sha256).to_string()
}

#[test]
fn sftp_connects_remembers_the_server_key_and_sends_only_changed_files() {
    let root = tempfile::tempdir().unwrap();
    fs::create_dir(root.path().join("public_html")).unwrap();
    let port = sftp_server::start(root.path(), 1, false);
    let s = service(Trust::default());

    let site_dir = tempfile::tempdir().unwrap();
    let site = SiteFolder::new(site_dir.path());
    let view = s.connect_ftp(&site, settings(Protocol::Sftp, port), "secret", "https://example.com").unwrap();
    assert_eq!(view.ftp.as_ref().unwrap().host_key, fingerprint(1));
    assert!(fingerprint(1).starts_with("SHA256:"));
    s.disconnect(&site).unwrap();

    publish_round_trip(Protocol::Sftp, port, root.path(), &s);
}

#[test]
fn sftp_works_with_hosts_that_ask_for_the_password_as_a_question() {
    let root = tempfile::tempdir().unwrap();
    fs::create_dir(root.path().join("public_html")).unwrap();
    let port = sftp_server::start(root.path(), 2, true);
    let s = service(Trust::default());
    let site_dir = tempfile::tempdir().unwrap();
    let site = SiteFolder::new(site_dir.path());
    assert_eq!(s.connect_ftp(&site, settings(Protocol::Sftp, port), "wrong", "example.com").unwrap_err().kind, "token");
    s.connect_ftp(&site, settings(Protocol::Sftp, port), "secret", "example.com").unwrap();
    assert_eq!(s.publish(&site, finished_site().path(), &|_| {}).unwrap().uploaded, 3);
}

#[test]
fn sftp_stops_when_the_server_key_changes() {
    let root = tempfile::tempdir().unwrap();
    fs::create_dir(root.path().join("public_html")).unwrap();
    let first = sftp_server::start(root.path(), 3, false);
    let s = service(Trust::default());
    let site_dir = tempfile::tempdir().unwrap();
    let site = SiteFolder::new(site_dir.path());
    s.connect_ftp(&site, settings(Protocol::Sftp, first), "secret", "example.com").unwrap();

    // Another server (another key) answers at the same place.
    let other = sftp_server::start(root.path(), 4, false);
    let mut connection = load_connection(&site).unwrap();
    connection.ftp.as_mut().unwrap().port = other;
    crate::hosts::save_connection(&site, &connection).unwrap();
    let err = s.publish(&site, finished_site().path(), &|_| {}).unwrap_err();
    assert_eq!(err.kind, "identity");
    assert!(err.message.contains(&fingerprint(3)) && err.message.contains(&fingerprint(4)), "{}", err.message);
    assert!(!root.path().join("public_html/index.html").exists(), "nothing was sent");

    // Checking the details again trusts the new key.
    let view = s.connect_ftp(&site, settings(Protocol::Sftp, other), "secret", "example.com").unwrap();
    assert_eq!(view.ftp.unwrap().host_key, fingerprint(4));
    assert_eq!(s.publish(&site, finished_site().path(), &|_| {}).unwrap().uploaded, 3);
}

#[test]
fn sftp_folder_that_isnt_there_is_said_plainly() {
    let root = tempfile::tempdir().unwrap();
    let port = sftp_server::start(root.path(), 5, false);
    let site_dir = tempfile::tempdir().unwrap();
    let err = service(Trust::default()).connect_ftp(&SiteFolder::new(site_dir.path()), settings(Protocol::Sftp, port), "secret", "example.com").unwrap_err();
    assert_eq!(err.kind, "folder", "{}", err.message);
}

#[test]
fn connections_round_trip_through_hosts_json() {
    let dir = tempfile::tempdir().unwrap();
    let site = SiteFolder::new(dir.path());
    let c = crate::hosts::Connection {
        host: HostKind::Ftp,
        account: String::new(),
        account_name: "rina@ftp.example.com".into(),
        project: "ftp.example.com".into(),
        site_id: String::new(),
        url: "https://example.com".into(),
        token_key: "ftp-1".into(),
        last_published: None,
        ftp: Some(FtpSettings { host_key: "SHA256:x".into(), ..settings(Protocol::Sftp, 22) }),
    };
    crate::hosts::save_connection(&site, &c).unwrap();
    assert_eq!(load_connection(&site), Some(c.clone()));
    let text = String::from_utf8(site.read(HOSTS_FILE).unwrap().unwrap()).unwrap();
    assert!(text.contains("\"host\": \"ftp\"") && text.contains("\"protocol\": \"sftp\"") && text.contains("\"hostKey\": \"SHA256:x\""), "{text}");
    let _ = PathBuf::new();
}

//! F059: publish a site to any web host by SFTP, FTPS or plain FTP.
//!
//! Unlike Cloudflare and Netlify, an FTP server doesn't know which files it
//! already has, so each site remembers what it sent where in
//! `.crust/ftp-sent.json` (path → hash). Publishing sends only new or
//! changed files (photos and other files first, pages last, so a page never
//! points at a photo that isn't there yet), then removes files Crust sent
//! before that are no longer part of the site. Files Crust never sent are
//! never touched. The password is kept in the keychain like F058's tokens.

use std::collections::{BTreeMap, BTreeSet};
use std::time::Duration;

use serde::{Deserialize, Serialize};

use crate::hosts::{HostError, Progress, Published, SiteFile};
use crate::site::SiteFolder;

mod ftp_remote;
mod sftp_remote;

/// What was sent to the server last time (left out of duplicates, F057).
pub const SENT_FILE: &str = ".crust/ftp-sent.json";
/// A small file written and removed when connecting, to check the folder can be written.
pub const CHECK_FILE: &str = ".crust-check";

/// How long to wait for a server before calling it unreachable.
pub const TIMEOUT: Duration = Duration::from_secs(20);

#[derive(Serialize, Deserialize, Debug, Clone, Copy, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum Protocol {
    Sftp,
    Ftps,
    Ftp,
}

impl Protocol {
    pub fn default_port(self) -> u16 {
        match self {
            Protocol::Sftp => 22,
            Protocol::Ftps | Protocol::Ftp => 21,
        }
    }
    pub fn name(self) -> &'static str {
        match self {
            Protocol::Sftp => "SFTP",
            Protocol::Ftps => "FTPS",
            Protocol::Ftp => "FTP",
        }
    }
    fn scheme(self) -> &'static str {
        match self {
            Protocol::Sftp => "sftp",
            Protocol::Ftps => "ftps",
            Protocol::Ftp => "ftp",
        }
    }
}

/// How to reach the server (kept in `.crust/hosts.json`; the password isn't).
#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct FtpSettings {
    pub protocol: Protocol,
    /// "ftp.example.com"
    pub server: String,
    pub port: u16,
    pub username: String,
    /// The folder the site goes in, e.g. "public_html" (empty: where the login lands).
    #[serde(default)]
    pub folder: String,
    /// SFTP: the server's key fingerprint seen when connecting ("SHA256:…").
    /// A different key later stops publishing (someone may be pretending to be the server).
    #[serde(default, skip_serializing_if = "String::is_empty")]
    pub host_key: String,
}

impl FtpSettings {
    /// Trims what was typed; refuses what can't work.
    pub fn tidy(mut self) -> Result<Self, HostError> {
        self.server = self.server.trim().trim_end_matches('/').to_string();
        for prefix in ["sftp://", "ftps://", "ftp://"] {
            if let Some(rest) = self.server.strip_prefix(prefix) {
                self.server = rest.to_string();
            }
        }
        self.username = self.username.trim().to_string();
        self.folder = self.folder.trim().trim_end_matches('/').to_string();
        let server_ok = !self.server.is_empty()
            && self.server.len() <= 253
            && self.server.chars().all(|c| c.is_ascii_alphanumeric() || c == '.' || c == '-' || c == ':' || c == '[' || c == ']')
            && !self.server.starts_with('-');
        if !server_ok {
            return Err(HostError::new("server", "Type the server's name as your host gives it, like ftp.example.com."));
        }
        if self.port == 0 {
            self.port = self.protocol.default_port();
        }
        if self.username.is_empty() {
            return Err(HostError::new("username", "Type the username your host gave you."));
        }
        if self.folder.split('/').any(|part| part == "..") || self.folder.contains('\\') || self.folder.chars().any(char::is_control) {
            return Err(HostError::new("folder", "Type the folder's name, like public_html, without “..”."));
        }
        Ok(self)
    }

    /// Identifies where files go: memory of sent files only counts for the same place.
    pub fn target(&self) -> String {
        format!("{}://{}@{}:{}/{}", self.protocol.scheme(), self.username, self.server, self.port, self.folder)
    }

    /// The path on the server for a site file ("/blog/index.html" → "public_html/blog/index.html").
    pub fn remote_path(&self, path: &str) -> String {
        join(&self.folder, path.trim_start_matches('/'))
    }

    /// "user@ftp.example.com"
    pub fn label(&self) -> String {
        format!("{}@{}", self.username, self.server)
    }
}

fn join(folder: &str, rest: &str) -> String {
    match (folder.is_empty(), rest.is_empty()) {
        (true, _) => rest.to_string(),
        (false, true) => folder.to_string(),
        (false, false) => format!("{folder}/{rest}"),
    }
}

/// A site's web address as typed for an FTP host: `https://` (or `http://`)
/// plus the domain, nothing after it, since pages link to `/media/…` from the top.
pub fn tidy_site_url(url: &str) -> Result<String, HostError> {
    let url = url.trim().trim_end_matches('/');
    let url = if url.contains("://") { url.to_string() } else { format!("https://{url}") };
    let rest = url.strip_prefix("https://").or_else(|| url.strip_prefix("http://"));
    let ok = rest.is_some_and(|domain| {
        !domain.is_empty()
            && domain.contains('.')
            && domain.chars().all(|c| c.is_ascii_alphanumeric() || c == '.' || c == '-' || c == ':')
            && !domain.starts_with(['.', '-'])
    });
    if ok {
        Ok(url.to_ascii_lowercase())
    } else {
        Err(HostError::new("url", "Type the site's address, like https://example.com, with nothing after the domain."))
    }
}

// ------------------------------------------------------------------ memory

/// What was sent, and where.
#[derive(Serialize, Deserialize, Debug, Clone, Default, PartialEq, Eq)]
pub struct Sent {
    pub target: String,
    /// "/index.html" → blake3 of its content
    pub files: BTreeMap<String, String>,
}

pub fn load_sent(site: &SiteFolder) -> Sent {
    site.read(SENT_FILE).ok().flatten().and_then(|bytes| serde_json::from_slice(&bytes).ok()).unwrap_or_default()
}

pub fn save_sent(site: &SiteFolder, sent: &Sent) -> Result<(), String> {
    let text = serde_json::to_vec_pretty(sent).map_err(|e| e.to_string())?;
    site.write(SENT_FILE, &text).map_err(|e| e.to_string())
}

/// Forgets what was sent, so the next publish sends every file.
pub fn forget_sent(site: &SiteFolder) -> Result<(), String> {
    site.remove(SENT_FILE).map_err(|e| e.to_string())
}

pub fn hash(bytes: &[u8]) -> String {
    blake3::hash(bytes).to_hex().to_string()
}

/// Files only Cloudflare reads; an FTP host would just show them.
fn skipped(path: &str) -> bool {
    path == "/_redirects" || path == "/_headers"
}

/// What a publish will do.
#[derive(Debug, Clone, PartialEq, Eq, Default)]
pub struct Plan {
    /// Folders to make first (site paths, e.g. "/blog"), parents before children.
    pub folders: Vec<String>,
    /// Indexes into the site's files: everything but pages first, then pages.
    pub upload: Vec<usize>,
    /// Site paths Crust sent before that the site no longer has.
    pub delete: Vec<String>,
}

pub fn plan(sent: &Sent, target: &str, files: &[SiteFile]) -> Plan {
    let empty = BTreeMap::new();
    let before = if sent.target == target { &sent.files } else { &empty };
    let wanted: Vec<(usize, &SiteFile)> = files.iter().enumerate().filter(|(_, f)| !skipped(&f.path)).collect();

    let mut upload: Vec<usize> = wanted.iter().filter(|(_, f)| before.get(&f.path) != Some(&hash(&f.bytes))).map(|(i, _)| *i).collect();
    let page = |i: &usize| files[*i].path.ends_with(".html");
    upload.sort_by(|a, b| page(a).cmp(&page(b)).then_with(|| files[*a].path.cmp(&files[*b].path)));

    // Folders that already hold a file Crust sent exist; others may not.
    let existing: BTreeSet<String> = before.keys().flat_map(|p| parents(p)).collect();
    let folders: BTreeSet<String> = upload.iter().flat_map(|i| parents(&files[*i].path)).filter(|d| !existing.contains(d)).collect();
    let mut folders: Vec<String> = folders.into_iter().collect();
    folders.sort_by(|a, b| a.matches('/').count().cmp(&b.matches('/').count()).then_with(|| a.cmp(b)));

    let keep: BTreeSet<&str> = wanted.iter().map(|(_, f)| f.path.as_str()).collect();
    let delete = before.keys().filter(|p| !keep.contains(p.as_str())).cloned().collect();
    Plan { folders, upload, delete }
}

/// "/a/b/c.html" → ["/a", "/a/b"]
fn parents(path: &str) -> Vec<String> {
    let parts: Vec<&str> = path.trim_start_matches('/').split('/').collect();
    (1..parts.len()).map(|n| format!("/{}", parts[..n].join("/"))).collect()
}

// ------------------------------------------------------------------ remote

/// Whether a refused password is one just typed or the saved one.
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum Password {
    New,
    Saved,
}

/// A signed-in connection to the server. Paths are as on the server
/// (already joined with the folder).
pub trait Remote {
    fn put(&mut self, path: &str, bytes: &[u8]) -> Result<(), String>;
    /// Makes a folder; fine if it's already there.
    fn mkdir(&mut self, path: &str) -> Result<(), String>;
    /// Removes a file; fine if it's already gone.
    fn delete(&mut self, path: &str) -> Result<(), String>;
    fn close(&mut self);
}

/// For tests: lets the in-test servers' certificates count as trusted.
#[derive(Clone, Default)]
pub struct Trust {
    /// Extra certificate authorities (DER), only used by tests.
    pub extra_roots: Vec<Vec<u8>>,
}

/// Signs in. Returns the connection and (SFTP) the server's key fingerprint.
/// `known_key` (SFTP): the fingerprint seen before; a different one is refused.
pub fn open(settings: &FtpSettings, password: &str, which: Password, known_key: &str, trust: &Trust) -> Result<(Box<dyn Remote>, String), HostError> {
    match settings.protocol {
        Protocol::Sftp => sftp_remote::open(settings, password, which, known_key).map(|(r, key)| (Box::new(r) as Box<dyn Remote>, key)),
        Protocol::Ftps | Protocol::Ftp => ftp_remote::open(settings, password, which, trust).map(|r| (Box::new(r) as Box<dyn Remote>, String::new())),
    }
}

pub fn unreachable(settings: &FtpSettings, why: impl std::fmt::Display) -> HostError {
    HostError::new(
        "offline",
        format!(
            "Couldn't reach {} on port {}. Check the server's name and port, and the internet connection. ({why})",
            settings.server, settings.port
        ),
    )
}

pub fn login_refused(which: Password) -> HostError {
    HostError::new(
        "token",
        match which {
            Password::New => "The server didn't accept this username and password. Check both with your host.",
            Password::Saved => "The server no longer accepts the saved password. It may have been changed at your host.",
        },
    )
}

/// Checks the folder can be written: puts a small file there and removes it.
pub fn check_folder(remote: &mut dyn Remote, settings: &FtpSettings) -> Result<(), HostError> {
    let path = join(&settings.folder, CHECK_FILE);
    remote.put(&path, b"Crust checks it can publish here. Safe to delete.\n").map_err(|why| folder_problem(settings, why))?;
    let _ = remote.delete(&path);
    Ok(())
}

fn folder_problem(settings: &FtpSettings, why: String) -> HostError {
    let place = if settings.folder.is_empty() { "the folder you land in after signing in".to_string() } else { format!("the folder “{}”", settings.folder) };
    HostError::new(
        "folder",
        format!("Signed in, but couldn't save files in {place}. Check the folder's name with your host (often public_html, www or htdocs). ({why})"),
    )
}

/// Sends the plan's files, removes what's gone, and keeps `sent` up to date
/// as it goes (so a stopped publish carries on where it left off).
pub fn run(remote: &mut dyn Remote, settings: &FtpSettings, files: &[SiteFile], sent: &mut Sent, progress: &dyn Fn(Progress)) -> Result<Published, HostError> {
    let target = settings.target();
    let plan = plan(sent, &target, files);
    if sent.target != target {
        *sent = Sent { target, files: BTreeMap::new() };
    }
    let total = plan.upload.len();
    progress(Progress { done: 0, total });
    let lost = |why: String| HostError::other(format!("The upload stopped partway: {why}. Publish again to send the rest; files already sent won't be sent twice."));
    for folder in &plan.folders {
        remote.mkdir(&settings.remote_path(folder)).map_err(|why| if sent.files.is_empty() { folder_problem(settings, why) } else { lost(why) })?;
    }
    for (n, i) in plan.upload.iter().enumerate() {
        let file = &files[*i];
        remote.put(&settings.remote_path(&file.path), &file.bytes).map_err(lost)?;
        sent.files.insert(file.path.clone(), hash(&file.bytes));
        progress(Progress { done: n + 1, total });
    }
    for path in &plan.delete {
        remote.delete(&settings.remote_path(path)).map_err(lost)?;
        sent.files.remove(path);
    }
    remote.close();
    Ok(Published { url: String::new(), uploaded: total, files: files.iter().filter(|f| !skipped(&f.path)).count() })
}

#[cfg(test)]
mod tests;

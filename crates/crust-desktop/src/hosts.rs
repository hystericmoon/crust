//! F058: publish a site to Cloudflare Pages or Netlify with the person's
//! own token.
//!
//! The app builds the site (publish.rs) and this module uploads the build
//! through the host's API, sending only files the host doesn't already
//! have (both hosts keep files by their hash). Which host and address a
//! site uses is kept in its `.crust/hosts.json`; the token itself is kept
//! in the computer's keychain under a key named there, never in the site
//! folder, so duplicating or sharing a site never shares a token.

use std::collections::{BTreeMap, HashMap};
use std::fs;
use std::path::Path;
use std::sync::Mutex;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use base64::Engine;
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};

use crate::ftp::{self, FtpSettings, Password, Trust};
use crate::site::SiteFolder;

/// Where a site's host connection is kept (left out of duplicates, F057).
pub const HOSTS_FILE: &str = ".crust/hosts.json";
/// The keychain's name for Crust's entries.
pub const KEYCHAIN_SERVICE: &str = "Crust";

pub const CLOUDFLARE_API: &str = "https://api.cloudflare.com/client/v4";
pub const NETLIFY_API: &str = "https://api.netlify.com/api/v1";

#[derive(Serialize, Deserialize, Debug, Clone, Copy, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum HostKind {
    Cloudflare,
    Netlify,
    /// F059: any web host by SFTP, FTPS or FTP (details in `Connection::ftp`).
    Ftp,
}

impl HostKind {
    /// The host's page where people make a token (opened from the connect dialog).
    pub fn token_page(self) -> &'static str {
        match self {
            HostKind::Cloudflare => "https://dash.cloudflare.com/profile/api-tokens",
            HostKind::Netlify => "https://app.netlify.com/user/applications#personal-access-tokens",
            HostKind::Ftp => "",
        }
    }

    pub fn name(self) -> &'static str {
        match self {
            HostKind::Cloudflare => "Cloudflare",
            HostKind::Netlify => "Netlify",
            HostKind::Ftp => "the server",
        }
    }
}

/// Why talking to a host didn't work, in words the Publish card shows.
/// `kind`: "token" (ask for a new token), "offline", "taken" (the address
/// belongs to someone else; `suggestion` is a free one to try), "name"
/// (not a valid address), "other".
#[derive(Serialize, Debug, Clone, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct HostError {
    pub kind: &'static str,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub suggestion: Option<String>,
}

impl HostError {
    pub(crate) fn new(kind: &'static str, message: impl Into<String>) -> Self {
        Self { kind, message: message.into(), suggestion: None }
    }
    pub fn other(message: impl Into<String>) -> Self {
        Self::new("other", message)
    }
}

impl std::fmt::Display for HostError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(&self.message)
    }
}

/// A site's connection, as kept in `.crust/hosts.json`.
#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct Connection {
    pub host: HostKind,
    /// Cloudflare: the account id. Netlify: empty.
    #[serde(default)]
    pub account: String,
    /// Shown as "Cloudflare Pages · <account name>".
    #[serde(default)]
    pub account_name: String,
    /// The project (Cloudflare) or site (Netlify) name: the address's first part.
    pub project: String,
    /// Netlify's site id (Cloudflare: the project name).
    #[serde(default)]
    pub site_id: String,
    /// The live address, e.g. https://harbour-studio.pages.dev
    pub url: String,
    /// The keychain entry holding the token.
    pub token_key: String,
    /// When the site was last published here (ms since 1970).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub last_published: Option<u64>,
    /// F059: how to reach an FTP host.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub ftp: Option<FtpSettings>,
}

/// What the Publish card is told about a connection (no token key).
#[derive(Serialize, Debug, Clone, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ConnectionView {
    pub host: HostKind,
    pub account_name: String,
    pub project: String,
    pub url: String,
    pub last_published: Option<u64>,
    /// False when the keychain no longer has the token (ask for a new one).
    pub has_token: bool,
    pub ftp: Option<FtpSettings>,
}

impl Connection {
    pub fn view(&self, has_token: bool) -> ConnectionView {
        ConnectionView {
            host: self.host,
            account_name: self.account_name.clone(),
            project: self.project.clone(),
            url: self.url.clone(),
            last_published: self.last_published,
            has_token,
            ftp: self.ftp.clone(),
        }
    }
}

pub fn load_connection(site: &SiteFolder) -> Option<Connection> {
    let bytes = site.read(HOSTS_FILE).ok().flatten()?;
    serde_json::from_slice(&bytes).ok()
}

pub fn save_connection(site: &SiteFolder, connection: &Connection) -> Result<(), String> {
    let text = serde_json::to_vec_pretty(connection).map_err(|e| e.to_string())?;
    site.write(HOSTS_FILE, &text).map_err(|e| e.to_string())
}

pub fn remove_connection(site: &SiteFolder) -> Result<(), String> {
    site.remove(HOSTS_FILE).map_err(|e| e.to_string())
}

pub fn now_ms() -> u64 {
    SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_millis() as u64).unwrap_or(0)
}

/// A new keychain key for a connection's token.
pub fn new_token_key(host: HostKind) -> String {
    let nanos = SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_nanos()).unwrap_or(0);
    format!("{}-{nanos:x}", serde_json::to_value(host).ok().and_then(|v| v.as_str().map(String::from)).unwrap_or_default())
}

// ---------------------------------------------------------------- keychain

/// Where tokens are kept.
pub trait Keychain: Send + Sync {
    fn get(&self, key: &str) -> Result<Option<String>, String>;
    fn set(&self, key: &str, secret: &str) -> Result<(), String>;
    fn delete(&self, key: &str) -> Result<(), String>;
}

/// The computer's own keychain (Mac Keychain, Windows Credential Manager).
pub struct SystemKeychain;

impl Keychain for SystemKeychain {
    fn get(&self, key: &str) -> Result<Option<String>, String> {
        let entry = keyring::Entry::new(KEYCHAIN_SERVICE, key).map_err(keychain_error)?;
        match entry.get_password() {
            Ok(secret) => Ok(Some(secret)),
            Err(keyring::Error::NoEntry) => Ok(None),
            Err(e) => Err(keychain_error(e)),
        }
    }
    fn set(&self, key: &str, secret: &str) -> Result<(), String> {
        keyring::Entry::new(KEYCHAIN_SERVICE, key).and_then(|e| e.set_password(secret)).map_err(keychain_error)
    }
    fn delete(&self, key: &str) -> Result<(), String> {
        match keyring::Entry::new(KEYCHAIN_SERVICE, key).and_then(|e| e.delete_credential()) {
            Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
            Err(e) => Err(keychain_error(e)),
        }
    }
}

fn keychain_error(e: keyring::Error) -> String {
    format!("The computer's keychain didn't let Crust use the token: {e}")
}

/// Keeps tokens in memory (tests, and the window self-check).
#[derive(Default)]
pub struct MemoryKeychain(Mutex<HashMap<String, String>>);

impl Keychain for MemoryKeychain {
    fn get(&self, key: &str) -> Result<Option<String>, String> {
        Ok(self.0.lock().unwrap_or_else(|e| e.into_inner()).get(key).cloned())
    }
    fn set(&self, key: &str, secret: &str) -> Result<(), String> {
        self.0.lock().unwrap_or_else(|e| e.into_inner()).insert(key.into(), secret.into());
        Ok(())
    }
    fn delete(&self, key: &str) -> Result<(), String> {
        self.0.lock().unwrap_or_else(|e| e.into_inner()).remove(key);
        Ok(())
    }
}

// ------------------------------------------------------------------ client

/// An account the token can publish to.
#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct Account {
    pub id: String,
    pub name: String,
}

/// Where a project ended up after connecting.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Project {
    pub project: String,
    pub site_id: String,
    pub url: String,
}

/// How far an upload is.
#[derive(Serialize, Debug, Clone, Copy, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct Progress {
    /// Files sent so far, of `total` that the host didn't have yet.
    pub done: usize,
    pub total: usize,
}

#[derive(Serialize, Debug, Clone, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct Published {
    pub url: String,
    /// Files sent (the host already had the rest).
    pub uploaded: usize,
    pub files: usize,
}

/// Talks to the hosts' APIs.
pub struct Client {
    agent: ureq::Agent,
    cloudflare: String,
    netlify: String,
    /// How long to wait between "is the deploy ready?" questions (Netlify).
    poll: Duration,
}

/// Whether a token being refused means a pasted one is wrong, or the saved one stopped working.
#[derive(Clone, Copy, PartialEq, Eq)]
enum Token {
    New,
    Saved,
}

struct Reply {
    status: u16,
    body: Vec<u8>,
}

impl Reply {
    fn json(&self) -> Value {
        serde_json::from_slice(&self.body).unwrap_or(Value::Null)
    }
}

impl Default for Client {
    fn default() -> Self {
        Self::new(CLOUDFLARE_API, NETLIFY_API)
    }
}

impl Client {
    pub fn new(cloudflare: &str, netlify: &str) -> Self {
        let local = cloudflare.starts_with("http://127.0.0.1") || netlify.starts_with("http://127.0.0.1");
        let tls = ureq::tls::TlsConfig::builder().root_certs(ureq::tls::RootCerts::PlatformVerifier).build();
        let mut config = ureq::Agent::config_builder()
            .http_status_as_error(false)
            .timeout_global(Some(Duration::from_secs(300)))
            .tls_config(tls)
            .user_agent("Crust desktop");
        if local {
            config = config.proxy(None);
        }
        Self {
            agent: config.build().into(),
            cloudflare: cloudflare.trim_end_matches('/').into(),
            netlify: netlify.trim_end_matches('/').into(),
            poll: if local { Duration::from_millis(10) } else { Duration::from_secs(1) },
        }
    }

    /// Sends a request; a host that can't be reached is "offline", a
    /// refused token is "token", anything else comes back as a reply.
    fn send(&self, host: HostKind, token: Token, method: &str, url: &str, auth: &str, body: Body) -> Result<Reply, HostError> {
        let bearer = format!("Bearer {auth}");
        let result = match (method, body) {
            ("GET", _) => self.agent.get(url).header("Authorization", &bearer).call(),
            (_, Body::Json(value)) => {
                let bytes = serde_json::to_vec(&value).unwrap_or_default();
                let request = if method == "PUT" { self.agent.put(url) } else { self.agent.post(url) };
                request.header("Authorization", &bearer).header("Content-Type", "application/json").send(&bytes[..])
            }
            (_, Body::Bytes(content_type, bytes)) => {
                let request = if method == "PUT" { self.agent.put(url) } else { self.agent.post(url) };
                request.header("Authorization", &bearer).header("Content-Type", &content_type).send(&bytes[..])
            }
            (_, Body::None) => self.agent.post(url).header("Authorization", &bearer).send(&[][..]),
        };
        let mut response = result.map_err(|e| offline(host, e))?;
        let status = response.status().as_u16();
        let body = response.body_mut().with_config().limit(64 * 1024 * 1024).read_to_vec().map_err(|e| offline(host, e))?;
        let reply = Reply { status, body };
        if status == 401 || (host == HostKind::Cloudflare && cloudflare_auth_error(&reply.json())) {
            return Err(token_refused(host, token));
        }
        if status == 429 {
            return Err(HostError::other(format!("{} is busy right now. Wait a minute and try again.", host.name())));
        }
        Ok(reply)
    }

    // ------------------------------------------------------ check a token

    /// The accounts a pasted token can publish to; refuses a wrong token.
    pub fn check_token(&self, host: HostKind, token: &str) -> Result<Vec<Account>, HostError> {
        let token = token.trim();
        if token.is_empty() || token.chars().any(char::is_whitespace) {
            return Err(token_refused(host, Token::New));
        }
        match host {
            HostKind::Cloudflare => {
                let reply = self.send(host, Token::New, "GET", &format!("{}/accounts?per_page=50", self.cloudflare), token, Body::None)?;
                if reply.status == 403 {
                    return Err(token_refused(host, Token::New));
                }
                let value = expect_ok(host, &reply)?;
                let accounts: Vec<Account> = value["result"]
                    .as_array()
                    .into_iter()
                    .flatten()
                    .filter_map(|a| Some(Account { id: a["id"].as_str()?.into(), name: a["name"].as_str().unwrap_or("").into() }))
                    .collect();
                if accounts.is_empty() {
                    return Err(HostError::new(
                        "token",
                        "This token can't reach any Cloudflare account. When you make it, choose Account · Cloudflare Pages · Edit.",
                    ));
                }
                Ok(accounts)
            }
            HostKind::Netlify => {
                let reply = self.send(host, Token::New, "GET", &format!("{}/user", self.netlify), token, Body::None)?;
                if reply.status == 403 {
                    return Err(token_refused(host, Token::New));
                }
                let value = expect_ok(host, &reply)?;
                let name = ["full_name", "email", "slug"].iter().find_map(|k| value[*k].as_str().filter(|s| !s.is_empty())).unwrap_or("Netlify");
                Ok(vec![Account { id: String::new(), name: name.into() }])
            }
            HostKind::Ftp => Err(HostError::other("FTP hosts sign in with a password, not a token.")),
        }
    }

    // ---------------------------------------------- connect to a project

    /// Uses the project (Cloudflare) or site (Netlify) called `name` if the
    /// token's account has it, or makes it.
    pub fn connect(&self, host: HostKind, token: &str, account: &str, name: &str) -> Result<Project, HostError> {
        check_name(host, name)?;
        match host {
            HostKind::Cloudflare => {
                let projects = format!("{}/accounts/{account}/pages/projects", self.cloudflare);
                let reply = self.send(host, Token::New, "GET", &format!("{projects}/{name}"), token, Body::None)?;
                let reply = match reply.status {
                    200 => reply,
                    404 => self.send(host, Token::New, "POST", &projects, token, Body::Json(json!({ "name": name, "production_branch": "main" })))?,
                    403 => return Err(no_pages_permission()),
                    _ => return Err(failed(host, &reply)),
                };
                if reply.status == 403 {
                    return Err(no_pages_permission());
                }
                if reply.status == 409 {
                    return Err(taken(host, name));
                }
                let value = expect_ok(host, &reply)?;
                let subdomain = value["result"]["subdomain"].as_str().map(String::from).unwrap_or_else(|| format!("{name}.pages.dev"));
                Ok(Project { project: name.into(), site_id: name.into(), url: format!("https://{subdomain}") })
            }
            HostKind::Netlify => {
                let reply = self.send(host, Token::New, "GET", &format!("{}/sites/{name}.netlify.app", self.netlify), token, Body::None)?;
                let reply = match reply.status {
                    200 => reply,
                    404 => self.send(host, Token::New, "POST", &format!("{}/sites", self.netlify), token, Body::Json(json!({ "name": name })))?,
                    _ => return Err(failed(host, &reply)),
                };
                if reply.status == 422 {
                    return Err(taken(host, name));
                }
                let value = expect_ok(host, &reply)?;
                let site_id = value["id"].as_str().ok_or_else(|| failed(host, &reply))?.to_string();
                let url = ["ssl_url", "url"]
                    .iter()
                    .find_map(|k| value[*k].as_str().filter(|s| !s.is_empty()))
                    .map(|u| u.replace("http://", "https://"))
                    .unwrap_or_else(|| format!("https://{name}.netlify.app"));
                Ok(Project { project: name.into(), site_id, url })
            }
            HostKind::Ftp => Err(HostError::other("FTP hosts are connected with their server details.")),
        }
    }

    // ----------------------------------------------------------- publish

    /// Uploads the finished site in `dir` to the connection's project.
    pub fn publish(&self, connection: &Connection, token: &str, dir: &Path, progress: &dyn Fn(Progress)) -> Result<Published, HostError> {
        let files = site_files(dir).map_err(|e| HostError::other(format!("Couldn't read the finished site: {e}")))?;
        if !files.iter().any(|f| f.path == "/index.html") {
            return Err(HostError::other("There's no finished site to publish yet. Try again."));
        }
        match connection.host {
            HostKind::Cloudflare => self.publish_cloudflare(connection, token, &files, progress),
            HostKind::Netlify => self.publish_netlify(connection, token, &files, progress),
            HostKind::Ftp => Err(HostError::other("FTP hosts are published by the host service.")),
        }
    }

    fn publish_cloudflare(&self, c: &Connection, token: &str, files: &[SiteFile], progress: &dyn Fn(Progress)) -> Result<Published, HostError> {
        let host = HostKind::Cloudflare;
        let project = format!("{}/accounts/{}/pages/projects/{}", self.cloudflare, c.account, c.project);
        let reply = self.send(host, Token::Saved, "GET", &format!("{project}/upload-token"), token, Body::None)?;
        if reply.status == 404 {
            return Err(project_gone(c));
        }
        if reply.status == 403 {
            return Err(no_pages_permission());
        }
        let value = expect_ok(host, &reply)?;
        let jwt = value["result"]["jwt"].as_str().ok_or_else(|| failed(host, &reply))?.to_string();

        // _redirects and _headers go with the deployment, not as files.
        let (special, assets): (Vec<&SiteFile>, Vec<&SiteFile>) = files.iter().partition(|f| f.path == "/_redirects" || f.path == "/_headers");
        let hashes: Vec<String> = assets.iter().map(|f| cloudflare_hash(f)).collect();
        let by_hash: HashMap<&str, &SiteFile> = hashes.iter().map(String::as_str).zip(assets.iter().copied()).collect();

        let reply = self.send(host, Token::Saved, "POST", &format!("{}/pages/assets/check-missing", self.cloudflare), &jwt, Body::Json(json!({ "hashes": hashes })))?;
        let value = expect_ok(host, &reply)?;
        let mut missing: Vec<String> = value["result"].as_array().into_iter().flatten().filter_map(|h| h.as_str().map(String::from)).collect();
        missing.sort();
        missing.dedup();
        missing.retain(|h| by_hash.contains_key(h.as_str()));

        let total = missing.len();
        progress(Progress { done: 0, total });
        let mut done = 0;
        for bucket in buckets(&missing, |h| by_hash[h.as_str()].bytes.len()) {
            let payload: Vec<Value> = bucket
                .iter()
                .map(|h| {
                    let file = by_hash[h.as_str()];
                    json!({ "key": h, "value": base64::engine::general_purpose::STANDARD.encode(&file.bytes), "metadata": { "contentType": content_type(&file.path) }, "base64": true })
                })
                .collect();
            let reply = self.send(host, Token::Saved, "POST", &format!("{}/pages/assets/upload", self.cloudflare), &jwt, Body::Json(Value::Array(payload)))?;
            expect_ok(host, &reply)?;
            done += bucket.len();
            progress(Progress { done, total });
        }
        let reply = self.send(host, Token::Saved, "POST", &format!("{}/pages/assets/upsert-hashes", self.cloudflare), &jwt, Body::Json(json!({ "hashes": hashes })))?;
        expect_ok(host, &reply)?;

        let manifest: BTreeMap<&str, &str> = assets.iter().map(|f| f.path.as_str()).zip(hashes.iter().map(String::as_str)).collect();
        let mut form = Multipart::new();
        form.text("manifest", &serde_json::to_string(&manifest).unwrap_or_default());
        for file in special {
            form.file(file.path.trim_start_matches('/'), &file.bytes);
        }
        let (content_type, body) = form.finish();
        let reply = self.send(host, Token::Saved, "POST", &format!("{project}/deployments"), token, Body::Bytes(content_type, body))?;
        if reply.status == 404 {
            return Err(project_gone(c));
        }
        expect_ok(host, &reply)?;
        Ok(Published { url: c.url.clone(), uploaded: total, files: files.len() })
    }

    fn publish_netlify(&self, c: &Connection, token: &str, files: &[SiteFile], progress: &dyn Fn(Progress)) -> Result<Published, HostError> {
        let host = HostKind::Netlify;
        let digests: BTreeMap<&str, String> = files.iter().map(|f| (f.path.as_str(), sha1_smol::Sha1::from(&f.bytes).digest().to_string())).collect();
        let reply = self.send(host, Token::Saved, "POST", &format!("{}/sites/{}/deploys", self.netlify, c.site_id), token, Body::Json(json!({ "files": digests })))?;
        if reply.status == 404 {
            return Err(project_gone(c));
        }
        let value = expect_ok(host, &reply)?;
        let deploy = value["id"].as_str().ok_or_else(|| failed(host, &reply))?.to_string();
        let required: Vec<&str> = value["required"].as_array().into_iter().flatten().filter_map(Value::as_str).collect();
        // Several files can share content (and so a digest): one upload each is enough.
        let mut sent = std::collections::HashSet::new();
        let to_send: Vec<&SiteFile> = files.iter().filter(|f| required.contains(&digests[f.path.as_str()].as_str()) && sent.insert(digests[f.path.as_str()].clone())).collect();
        let total = to_send.len();
        progress(Progress { done: 0, total });
        for (i, file) in to_send.iter().enumerate() {
            let url = format!("{}/deploys/{deploy}/files{}", self.netlify, encode_path(&file.path));
            let reply = self.send(host, Token::Saved, "PUT", &url, token, Body::Bytes("application/octet-stream".into(), file.bytes.clone()))?;
            expect_ok(host, &reply)?;
            progress(Progress { done: i + 1, total });
        }
        // Netlify finishes the deploy on its side; wait until it's live (up to ~2 minutes).
        for attempt in 0..120 {
            if attempt > 0 {
                std::thread::sleep(self.poll);
            }
            let reply = self.send(host, Token::Saved, "GET", &format!("{}/deploys/{deploy}", self.netlify), token, Body::None)?;
            let value = expect_ok(host, &reply)?;
            match value["state"].as_str().unwrap_or("") {
                "ready" => return Ok(Published { url: c.url.clone(), uploaded: total, files: files.len() }),
                "error" => {
                    let why = value["error_message"].as_str().unwrap_or("no reason given");
                    return Err(HostError::other(format!("Netlify couldn't finish publishing: {why}")));
                }
                _ => {}
            }
        }
        Err(HostError::other("Netlify is still finishing the publish. Check the site in a few minutes; if it hasn't changed, publish again."))
    }
}

enum Body {
    None,
    Json(Value),
    Bytes(String, Vec<u8>),
}

fn offline(host: HostKind, e: ureq::Error) -> HostError {
    HostError::new("offline", format!("Couldn't reach {}. Check the internet connection and try again. ({e})", host.name()))
}

fn token_refused(host: HostKind, token: Token) -> HostError {
    let message = match (host, token) {
        (HostKind::Cloudflare, Token::New) => "Cloudflare didn't accept this token. Check you copied all of it, and that it has Account · Cloudflare Pages · Edit.",
        (HostKind::Netlify, Token::New) => "Netlify didn't accept this token. Check you copied all of it.",
        (HostKind::Cloudflare, Token::Saved) => "Cloudflare no longer accepts the saved token. It may have expired or been deleted on Cloudflare.",
        (HostKind::Netlify, Token::Saved) => "Netlify no longer accepts the saved token. It may have expired or been deleted on Netlify.",
        (HostKind::Ftp, _) => return ftp::login_refused(if token == Token::New { Password::New } else { Password::Saved }),
    };
    HostError::new("token", message)
}

fn no_pages_permission() -> HostError {
    HostError::new("token", "This token can't manage Cloudflare Pages. Make a new one with Account · Cloudflare Pages · Edit.")
}

fn project_gone(c: &Connection) -> HostError {
    HostError::new(
        "gone",
        format!("{} no longer has “{}”. It may have been deleted there. Connect again to make it anew.", c.host.name(), c.project),
    )
}

fn taken(host: HostKind, name: &str) -> HostError {
    let suggestion = format!("{}-2", name.trim_end_matches(|c: char| c == '-' || c.is_ascii_digit()).trim_end_matches('-'));
    let suggestion = if suggestion == "-2" { format!("{name}-2") } else { suggestion };
    HostError { kind: "taken", message: format!("“{name}” is taken on {}. Try “{suggestion}”.", host.name()), suggestion: Some(suggestion) }
}

/// Cloudflare reports refused tokens in its JSON (codes 10000, 9106, 9109, …).
fn cloudflare_auth_error(value: &Value) -> bool {
    value["errors"].as_array().into_iter().flatten().any(|e| matches!(e["code"].as_u64(), Some(10000 | 9103 | 9106 | 9109 | 6003)))
}

/// The reply's JSON if it worked, or an error with the host's own words.
fn expect_ok(host: HostKind, reply: &Reply) -> Result<Value, HostError> {
    let value = reply.json();
    let ok = (200..300).contains(&reply.status) && !(host == HostKind::Cloudflare && value["success"] == Value::Bool(false));
    if ok { Ok(value) } else { Err(failed(host, reply)) }
}

fn failed(host: HostKind, reply: &Reply) -> HostError {
    let value = reply.json();
    let said = value["errors"][0]["message"].as_str().or_else(|| value["message"].as_str()).or_else(|| value["errors"].as_str());
    match said {
        Some(text) => HostError::other(format!("{} said: {text} (code {}).", host.name(), reply.status)),
        None => HostError::other(format!("{} answered with an error (code {}). Try again in a moment.", host.name(), reply.status)),
    }
}

/// Lowercase letters, numbers and dashes; no dash at either end.
pub fn check_name(host: HostKind, name: &str) -> Result<(), HostError> {
    let max = match host {
        HostKind::Cloudflare => 58,
        HostKind::Netlify | HostKind::Ftp => 63,
    };
    let ok = !name.is_empty()
        && name.len() <= max
        && name.chars().all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '-')
        && !name.starts_with('-')
        && !name.ends_with('-');
    if ok {
        Ok(())
    } else {
        Err(HostError::new("name", format!("Use lowercase letters, numbers and dashes (at most {max}), with no dash at the start or end.")))
    }
}

/// A site name made into an address: "Rina's Portfolio" → "rinas-portfolio".
pub fn suggest_name(site_name: &str) -> String {
    let mut out = String::new();
    for c in site_name.to_lowercase().chars() {
        if c.is_ascii_alphanumeric() {
            out.push(c);
        } else if (c.is_whitespace() || c == '-' || c == '_' || c == '.') && !out.ends_with('-') && !out.is_empty() {
            out.push('-');
        }
    }
    let out: String = out.trim_matches('-').chars().take(58).collect();
    let out = out.trim_end_matches('-').to_string();
    if out.is_empty() { "my-site".into() } else { out }
}

// ---------------------------------------------------------------- service

/// What the Publish card is told when it opens.
#[derive(Serialize, Debug, Clone, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct HostStatus {
    pub connection: Option<ConnectionView>,
    /// The address the connect dialog starts with (from the site's name).
    pub suggested_name: String,
}

/// Connections, tokens and publishing for one site at a time.
pub struct HostService {
    pub client: Client,
    pub keychain: Box<dyn Keychain>,
    /// F059: certificates the tests' FTPS server uses (empty in the app).
    pub trust: Trust,
}

fn keychain_failed(message: String) -> HostError {
    HostError::other(message)
}

impl HostService {
    pub fn new(client: Client, keychain: Box<dyn Keychain>) -> Self {
        Self { client, keychain, trust: Trust::default() }
    }

    pub fn status(&self, site: &SiteFolder, site_name: &str) -> HostStatus {
        let connection = load_connection(site).map(|c| {
            let has_token = self.keychain.get(&c.token_key).ok().flatten().is_some();
            c.view(has_token)
        });
        HostStatus { connection, suggested_name: suggest_name(site_name) }
    }

    pub fn check_token(&self, host: HostKind, token: &str) -> Result<Vec<Account>, HostError> {
        self.client.check_token(host, token)
    }

    /// Connects the site: checks the address with the host (making the
    /// project if needed), keeps the token in the keychain and the rest in
    /// `.crust/hosts.json`. A previous connection's token is forgotten.
    pub fn connect(&self, site: &SiteFolder, host: HostKind, token: &str, account: &Account, name: &str) -> Result<ConnectionView, HostError> {
        let token = token.trim();
        let project = self.client.connect(host, token, &account.id, name)?;
        let previous = load_connection(site);
        let token_key = new_token_key(host);
        self.keychain.set(&token_key, token).map_err(keychain_failed)?;
        let connection = Connection {
            host,
            account: account.id.clone(),
            account_name: account.name.clone(),
            project: project.project,
            site_id: project.site_id,
            url: project.url,
            token_key,
            last_published: None,
            ftp: None,
        };
        self.keep(site, connection, previous)
    }

    /// Saves a new connection; forgets the previous one's secret and (for FTP) what it sent.
    fn keep(&self, site: &SiteFolder, connection: Connection, previous: Option<Connection>) -> Result<ConnectionView, HostError> {
        if let Err(e) = save_connection(site, &connection) {
            let _ = self.keychain.delete(&connection.token_key);
            return Err(HostError::other(e));
        }
        if let Some(old) = previous.filter(|old| old.token_key != connection.token_key) {
            let _ = self.keychain.delete(&old.token_key);
        }
        // What was sent stays useful only for the same server and folder (ftp::plan checks).
        if connection.ftp.is_none() {
            let _ = ftp::forget_sent(site);
        }
        Ok(connection.view(true))
    }

    /// F059: signs in to the server, checks the folder can be written, and
    /// keeps the details (password in the keychain). SFTP remembers the
    /// server's key from now on.
    pub fn connect_ftp(&self, site: &SiteFolder, settings: FtpSettings, password: &str, url: &str) -> Result<ConnectionView, HostError> {
        let mut settings = settings.tidy()?;
        let url = ftp::tidy_site_url(url)?;
        if password.is_empty() {
            return Err(HostError::new("token", "Type the password."));
        }
        let (mut remote, key) = ftp::open(&settings, password, Password::New, "", &self.trust)?;
        let checked = ftp::check_folder(remote.as_mut(), &settings);
        remote.close();
        checked?;
        settings.host_key = key;
        let previous = load_connection(site);
        let token_key = new_token_key(HostKind::Ftp);
        self.keychain.set(&token_key, password).map_err(keychain_failed)?;
        let connection = Connection {
            host: HostKind::Ftp,
            account: String::new(),
            account_name: settings.label(),
            project: settings.server.clone(),
            site_id: String::new(),
            url,
            token_key,
            last_published: None,
            ftp: Some(settings),
        };
        self.keep(site, connection, previous)
    }

    /// F059: the next publish sends every file again.
    pub fn resend_all(&self, site: &SiteFolder) -> Result<(), String> {
        ftp::forget_sent(site)
    }

    /// "Paste a new token": checks it reaches the same account, then keeps it.
    pub fn replace_token(&self, site: &SiteFolder, token: &str) -> Result<ConnectionView, HostError> {
        let connection = load_connection(site).ok_or_else(not_connected)?;
        if let Some(settings) = &connection.ftp {
            if token.is_empty() {
                return Err(HostError::new("token", "Type the password."));
            }
            let (mut remote, _) = ftp::open(settings, token, Password::New, &settings.host_key, &self.trust)?;
            remote.close();
            self.keychain.set(&connection.token_key, token).map_err(keychain_failed)?;
            return Ok(connection.view(true));
        }
        let accounts = self.client.check_token(connection.host, token)?;
        if connection.host == HostKind::Cloudflare && !accounts.iter().any(|a| a.id == connection.account) {
            return Err(HostError::new(
                "token",
                format!("This token belongs to another Cloudflare account. Make it in the account “{}”.", connection.account_name),
            ));
        }
        self.keychain.set(&connection.token_key, token.trim()).map_err(keychain_failed)?;
        Ok(connection.view(true))
    }

    /// Forgets the site's host and its token (nothing changes on the host).
    pub fn disconnect(&self, site: &SiteFolder) -> Result<(), String> {
        if let Some(connection) = load_connection(site) {
            self.keychain.delete(&connection.token_key)?;
        }
        ftp::forget_sent(site)?;
        remove_connection(site)
    }

    /// Uploads the finished site in `dir` and remembers when.
    pub fn publish(&self, site: &SiteFolder, dir: &Path, progress: &dyn Fn(Progress)) -> Result<Published, HostError> {
        let mut connection = load_connection(site).ok_or_else(not_connected)?;
        let token = self.keychain.get(&connection.token_key).map_err(keychain_failed)?.ok_or_else(|| match connection.host {
            HostKind::Ftp => HostError::new("token", "This computer's keychain no longer has the server's password. Type it again."),
            host => HostError::new("token", format!("This computer's keychain no longer has the {} token. Paste it again.", host.name())),
        })?;
        let published = match &connection.ftp {
            Some(settings) => self.publish_ftp(site, &connection, settings, &token, dir, progress)?,
            None => self.client.publish(&connection, &token, dir, progress)?,
        };
        connection.last_published = Some(now_ms());
        save_connection(site, &connection).map_err(HostError::other)?;
        Ok(published)
    }
}

impl HostService {
    fn publish_ftp(&self, site: &SiteFolder, c: &Connection, settings: &FtpSettings, password: &str, dir: &Path, progress: &dyn Fn(Progress)) -> Result<Published, HostError> {
        let files = site_files(dir).map_err(|e| HostError::other(format!("Couldn't read the finished site: {e}")))?;
        if !files.iter().any(|f| f.path == "/index.html") {
            return Err(HostError::other("There's no finished site to publish yet. Try again."));
        }
        let (mut remote, _) = ftp::open(settings, password, Password::Saved, &settings.host_key, &self.trust)?;
        let mut sent = ftp::load_sent(site);
        let result = ftp::run(remote.as_mut(), settings, &files, &mut sent, progress);
        if result.is_err() {
            remote.close();
        }
        ftp::save_sent(site, &sent).map_err(HostError::other)?;
        result.map(|p| Published { url: c.url.clone(), ..p })
    }
}

fn not_connected() -> HostError {
    HostError::new("disconnected", "This site isn't connected to a host yet.")
}

// ------------------------------------------------------------------ files

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SiteFile {
    /// "/blog/index.html"
    pub path: String,
    pub bytes: Vec<u8>,
}

/// Every file of the finished site, sorted by path. Hidden files are left out.
pub fn site_files(dir: &Path) -> std::io::Result<Vec<SiteFile>> {
    fn walk(dir: &Path, prefix: &str, out: &mut Vec<SiteFile>) -> std::io::Result<()> {
        for entry in fs::read_dir(dir)? {
            let entry = entry?;
            let name = entry.file_name().to_string_lossy().into_owned();
            if name.starts_with('.') {
                continue;
            }
            let path = format!("{prefix}/{name}");
            if entry.file_type()?.is_dir() {
                walk(&entry.path(), &path, out)?;
            } else {
                out.push(SiteFile { path, bytes: fs::read(entry.path())? });
            }
        }
        Ok(())
    }
    let mut out = Vec::new();
    walk(dir, "", &mut out)?;
    out.sort_by(|a, b| a.path.cmp(&b.path));
    Ok(out)
}

/// Cloudflare Pages' file key: blake3 of the base64 content plus the
/// extension, first 32 hex digits (what its own upload tool does).
pub fn cloudflare_hash(file: &SiteFile) -> String {
    let encoded = base64::engine::general_purpose::STANDARD.encode(&file.bytes);
    let extension = Path::new(&file.path).extension().map(|e| e.to_string_lossy().into_owned()).unwrap_or_default();
    let mut hasher = blake3::Hasher::new();
    hasher.update(encoded.as_bytes());
    hasher.update(extension.as_bytes());
    hasher.finalize().to_hex()[..32].to_string()
}

pub fn content_type(path: &str) -> &'static str {
    match Path::new(path).extension().and_then(|e| e.to_str()).unwrap_or("").to_ascii_lowercase().as_str() {
        "html" | "htm" => "text/html",
        "css" => "text/css",
        "js" | "mjs" => "application/javascript",
        "json" => "application/json",
        "xml" => "application/xml",
        "txt" => "text/plain",
        "svg" => "image/svg+xml",
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "webp" => "image/webp",
        "gif" => "image/gif",
        "ico" => "image/x-icon",
        "woff2" => "font/woff2",
        "woff" => "font/woff",
        "wasm" => "application/wasm",
        _ => "application/octet-stream",
    }
}

/// Splits uploads into requests of at most ~30 MB of base64 and 500 files.
fn buckets(keys: &[String], size: impl Fn(&String) -> usize) -> Vec<&[String]> {
    const MAX_BYTES: usize = 30 * 1024 * 1024;
    const MAX_FILES: usize = 500;
    let mut out = Vec::new();
    let (mut start, mut bytes) = (0, 0);
    for (i, key) in keys.iter().enumerate() {
        let next = size(key) * 4 / 3 + 64;
        if i > start && (bytes + next > MAX_BYTES || i - start >= MAX_FILES) {
            out.push(&keys[start..i]);
            start = i;
            bytes = 0;
        }
        bytes += next;
    }
    if start < keys.len() {
        out.push(&keys[start..]);
    }
    out
}

/// Percent-encodes a file path for a URL, keeping the slashes.
pub fn encode_path(path: &str) -> String {
    let mut out = String::new();
    for b in path.bytes() {
        if b.is_ascii_alphanumeric() || b"/-_.~".contains(&b) {
            out.push(b as char);
        } else {
            out.push_str(&format!("%{b:02X}"));
        }
    }
    out
}

/// A multipart/form-data body.
struct Multipart {
    boundary: String,
    body: Vec<u8>,
}

impl Multipart {
    fn new() -> Self {
        let nanos = SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_nanos()).unwrap_or(0);
        Self { boundary: format!("----crust{nanos:x}"), body: Vec::new() }
    }
    fn text(&mut self, name: &str, value: &str) {
        self.body.extend(format!("--{}\r\nContent-Disposition: form-data; name=\"{name}\"\r\n\r\n{value}\r\n", self.boundary).as_bytes());
    }
    fn file(&mut self, name: &str, bytes: &[u8]) {
        self.body.extend(
            format!(
                "--{}\r\nContent-Disposition: form-data; name=\"{name}\"; filename=\"{name}\"\r\nContent-Type: application/octet-stream\r\n\r\n",
                self.boundary
            )
            .as_bytes(),
        );
        self.body.extend(bytes);
        self.body.extend(b"\r\n");
    }
    fn finish(mut self) -> (String, Vec<u8>) {
        self.body.extend(format!("--{}--\r\n", self.boundary).as_bytes());
        (format!("multipart/form-data; boundary={}", self.boundary), self.body)
    }
}

#[cfg(test)]
mod tests;

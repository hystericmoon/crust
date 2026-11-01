//! F061: updates built in.
//!
//! Crust asks its downloads site (a free Cloudflare Pages site, see
//! scripts/update-feed.ts) whether a newer version is out, using Tauri's
//! updater. A newer version is downloaded in the background and checked
//! against the update key's public half; it's installed when Crust quits
//! (or right away with "Restart now"), so nobody loses work to an update.
//!
//! Updates are switched off in a copy of Crust built without the public key
//! (`CRUST_UPDATE_PUBKEY` at build time): the key is the owner's to make
//! (BLOCKED.md), and an app that can't check a signature must never install.

use std::sync::Mutex;
use std::time::Duration;

use serde::Serialize;
use tauri::{AppHandle, Runtime};
use tauri_plugin_updater::{Error as UpdaterError, Update, UpdaterExt};
use url::Url;

/// Where the app looks for updates: the downloads site's feed (the
/// Desktop installers workflow can build in another, `CRUST_UPDATE_FEED`,
/// if Cloudflare gave the site a different address).
pub const DEFAULT_FEED: &str = match option_env!("CRUST_UPDATE_FEED") {
    Some(feed) if !feed.is_empty() => feed,
    _ => "https://crust-downloads.pages.dev/updates/latest.json",
};
/// The update key's public half, built into release copies of the app.
const BUILT_IN_KEY: Option<&str> = option_env!("CRUST_UPDATE_PUBKEY");
/// Most lines of "what's new" shown, and the longest line.
const MAX_NOTES: usize = 20;
const MAX_NOTE_CHARS: usize = 300;

/// Where to look for updates and the key that signs them.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct UpdateFeed {
    pub endpoint: Url,
    pub pubkey: String,
}

impl UpdateFeed {
    /// The feed for this copy of Crust: the built-in key, if it has one.
    /// Test builds may point elsewhere (`CRUST_UPDATE_URL`) and bring a test
    /// key (`CRUST_UPDATE_PUBKEY` when the app starts); release builds
    /// can't be redirected that way.
    pub fn for_this_app() -> Option<Self> {
        let env = |name: &str| std::env::var(name).ok().filter(|v| !v.trim().is_empty());
        if cfg!(debug_assertions) || cfg!(test) {
            Self::from_parts(env("CRUST_UPDATE_URL").as_deref(), env("CRUST_UPDATE_PUBKEY").as_deref().or(BUILT_IN_KEY))
        } else {
            Self::from_parts(None, BUILT_IN_KEY)
        }
    }

    /// A feed from an address (the default if none) and a key (none: off).
    pub fn from_parts(endpoint: Option<&str>, pubkey: Option<&str>) -> Option<Self> {
        let pubkey = pubkey.map(str::trim).filter(|k| !k.is_empty())?;
        let endpoint = Url::parse(endpoint.unwrap_or(DEFAULT_FEED)).ok()?;
        Some(Self { endpoint, pubkey: pubkey.to_string() })
    }
}

/// What checking found, for the window.
#[derive(Serialize, Debug, Clone, PartialEq, Eq)]
#[serde(tag = "state", rename_all = "camelCase")]
pub enum UpdateCheck {
    /// This copy of Crust has no update key, so it doesn't look.
    Off { current: String },
    UpToDate { current: String },
    #[serde(rename_all = "camelCase")]
    Available {
        current: String,
        version: String,
        /// "What's new", one plain line each.
        notes: Vec<String>,
        /// When it came out (YYYY-MM-DD), if the feed says.
        date: Option<String>,
    },
}

/// Download progress, sent to the window as "update-progress".
#[derive(Serialize, Debug, Clone, Copy, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct UpdateProgress {
    pub downloaded: u64,
    pub total: Option<u64>,
}

/// The app's update state: what the last check found, and a downloaded,
/// checked update waiting to be installed.
pub struct Updates {
    feed: Option<UpdateFeed>,
    current: String,
    found: Mutex<Option<Update>>,
    ready: Mutex<Option<(Update, Vec<u8>)>>,
}

impl Updates {
    pub fn new(feed: Option<UpdateFeed>, current: impl Into<String>) -> Self {
        Self { feed, current: current.into(), found: Mutex::new(None), ready: Mutex::new(None) }
    }

    /// The version running.
    pub fn current(&self) -> &str {
        &self.current
    }

    /// Whether this copy of Crust looks for updates at all.
    pub fn enabled(&self) -> bool {
        self.feed.is_some()
    }

    /// The version waiting to be installed, if one is.
    pub fn ready_version(&self) -> Option<String> {
        self.ready.lock().unwrap().as_ref().map(|(u, _)| u.version.clone())
    }

    /// Asks the downloads site whether a newer Crust is out.
    pub async fn check<R: Runtime>(&self, app: &AppHandle<R>) -> Result<UpdateCheck, String> {
        let current = self.current.clone();
        let Some(feed) = &self.feed else { return Ok(UpdateCheck::Off { current }) };
        let updater = app
            .updater_builder()
            .endpoints(vec![feed.endpoint.clone()])
            .and_then(|b| b.pubkey(feed.pubkey.clone()).timeout(Duration::from_secs(30)).build())
            .map_err(|e| plain_error(&e))?;
        let found = updater.check().await.map_err(|e| plain_error(&e))?;
        let Some(update) = found else {
            *self.found.lock().unwrap() = None;
            return Ok(UpdateCheck::UpToDate { current });
        };
        let result = UpdateCheck::Available {
            current,
            version: update.version.clone(),
            notes: plain_notes(update.body.as_deref().unwrap_or("")),
            date: update.date.map(|d| d.date().to_string()),
        };
        *self.found.lock().unwrap() = Some(update);
        Ok(result)
    }

    /// Downloads the update the last check found, and checks its signature.
    /// Returns the version now ready to install.
    pub async fn download(&self, mut progress: impl FnMut(UpdateProgress)) -> Result<String, String> {
        let Some(update) = self.found.lock().unwrap().clone() else {
            return Err("There's no update to download. Check for updates first.".into());
        };
        if self.ready_version().as_deref() == Some(update.version.as_str()) {
            return Ok(update.version);
        }
        let mut downloaded = 0u64;
        let bytes = update
            .download(
                |chunk, total| {
                    downloaded += chunk as u64;
                    progress(UpdateProgress { downloaded, total });
                },
                || {},
            )
            .await
            .map_err(|e| plain_error(&e))?;
        let version = update.version.clone();
        *self.ready.lock().unwrap() = Some((update, bytes));
        Ok(version)
    }

    /// Installs the waiting update, if there is one. Returns its version.
    /// On Windows this starts the installer, which closes Crust; `reopen`
    /// says whether Crust opens again afterwards.
    pub fn install_ready(&self, reopen: bool) -> Result<Option<String>, String> {
        let Some((update, bytes)) = self.ready.lock().unwrap().take() else { return Ok(None) };
        let version = update.version.clone();
        update.restart_after_install(reopen).install(&bytes).map_err(|e| plain_error(&e))?;
        Ok(Some(version))
    }
}

/// "What's new" as plain lines: list marks and blank lines dropped, kept short.
pub fn plain_notes(body: &str) -> Vec<String> {
    body.lines()
        .map(|line| {
            let line = line.trim();
            let line = line.strip_prefix("- ").or_else(|| line.strip_prefix("* ")).or_else(|| line.strip_prefix("• ")).unwrap_or(line);
            let line = line.trim_start_matches('#').trim();
            if line.chars().count() > MAX_NOTE_CHARS {
                let cut: String = line.chars().take(MAX_NOTE_CHARS - 1).collect();
                format!("{}…", cut.trim_end())
            } else {
                line.to_string()
            }
        })
        .filter(|line| !line.is_empty())
        .take(MAX_NOTES)
        .collect()
}

/// What went wrong, in words for the person using Crust.
pub fn plain_error(error: &UpdaterError) -> String {
    match error {
        UpdaterError::Reqwest(_) | UpdaterError::Network(_) => {
            "Crust couldn't reach its update site. Check your internet connection and try again.".into()
        }
        UpdaterError::Minisign(_) | UpdaterError::Base64(_) | UpdaterError::SignatureUtf8(_) | UpdaterError::SignedVersionMismatch { .. } | UpdaterError::MissingSignedVersion => {
            "The update didn't pass Crust's safety check (its signature doesn't match), so it wasn't installed.".into()
        }
        UpdaterError::ReleaseNotFound | UpdaterError::Serialization(_) | UpdaterError::Semver(_) | UpdaterError::UrlParse(_) => {
            "Crust's update site answered with something Crust doesn't understand. Try again later.".into()
        }
        UpdaterError::TargetNotFound(_) | UpdaterError::TargetsNotFound(_) | UpdaterError::UnsupportedOs | UpdaterError::UnsupportedArch => {
            "There's no update for this kind of computer yet.".into()
        }
        UpdaterError::InsecureTransportProtocol => "Crust only downloads updates over a secure connection.".into(),
        other => format!("The update couldn't be installed: {other}"),
    }
}

#[cfg(test)]
mod tests;

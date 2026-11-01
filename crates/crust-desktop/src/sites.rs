//! Several sites (F057): every site is a folder in the Crust folder
//! ("Documents/Crust/<Site name>"), with its own content, history (`.crust`)
//! and publish settings. One of them is open in the window at a time.
//!
//! A deleted site moves to "Crust/.Recently deleted" and is removed for good
//! after 30 days, so deleting can be undone for a month.

use std::fs;
use std::io::ErrorKind;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex, RwLock};
use std::time::{SystemTime, UNIX_EPOCH};

use serde::{Deserialize, Serialize};

use crate::site::{SiteError, SiteFolder};

/// Where deleted sites wait (hidden, inside the Crust folder).
pub const TRASH: &str = ".Recently deleted";
/// Which site was open last (hidden, inside the Crust folder).
pub const STATE: &str = ".sites.json";
/// What a deleted site remembers about itself (inside its `.crust`).
const DELETED: &str = ".crust/deleted.json";
/// Files a copy leaves behind: where and when the original was published.
const PUBLISH_FILES: &[&str] = &[".crust/published", ".crust/hosts.json", ".crust/ftp-sent.json"];
/// The site opened when there's nothing else.
pub const FIRST_SITE: &str = "My site";
/// How long a deleted site can be brought back.
pub const KEEP_DELETED_MS: u64 = 30 * 24 * 60 * 60 * 1000;
/// Longest site name.
pub const MAX_NAME: usize = 80;

/// One site, for the Sites screen.
#[derive(Serialize, Debug, PartialEq, Eq, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SiteSummary {
    /// The folder's name; how the app refers to the site.
    pub id: String,
    /// The site's name from its settings (the folder's name if it has none).
    pub name: String,
    pub pages: usize,
    /// Last saved, in milliseconds since 1970 (None if unknown).
    pub edited: Option<u64>,
    /// The site open in the window.
    pub open: bool,
}

/// One deleted site, for "Recently deleted".
#[derive(Serialize, Debug, PartialEq, Eq, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DeletedSite {
    /// Its folder's name inside the trash.
    pub id: String,
    pub name: String,
    pub deleted_at: u64,
    /// When it's removed for good.
    pub removed_at: u64,
}

#[derive(Serialize, Deserialize, Default)]
struct State {
    current: Option<String>,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct DeletedInfo {
    name: String,
    deleted_at: u64,
}

fn io(what: &str, e: std::io::Error) -> SiteError {
    let reason = match e.kind() {
        ErrorKind::PermissionDenied => "the computer didn't allow it. Check that the Crust folder isn't locked or read-only".to_string(),
        _ => e.to_string(),
    };
    SiteError::Io(format!("Couldn't {what}: {reason}."))
}

/// Milliseconds since 1970, now.
pub fn now_ms() -> u64 {
    SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_millis() as u64).unwrap_or(0)
}

fn modified_ms(path: &Path) -> Option<u64> {
    let time = fs::metadata(path).and_then(|m| m.modified()).ok()?;
    time.duration_since(UNIX_EPOCH).ok().map(|d| d.as_millis() as u64)
}

/// A name people typed, tidied: spaces trimmed and collapsed. Errors say
/// what to change.
pub fn clean_name(name: &str) -> Result<String, SiteError> {
    let name = name.split_whitespace().collect::<Vec<_>>().join(" ");
    if name.is_empty() {
        return Err(SiteError::Io("Give the site a name.".into()));
    }
    if name.chars().count() > MAX_NAME {
        return Err(SiteError::Io(format!("Use a shorter name (at most {MAX_NAME} characters).")));
    }
    Ok(name)
}

/// A folder name for a site name, safe on Mac, Windows and Linux: no
/// slashes or other characters Windows refuses, no dot at the start, no dot
/// or space at the end, not one of Windows' reserved names.
pub fn folder_name(name: &str) -> String {
    let cleaned: String = name
        .chars()
        .map(|c| if c.is_control() || matches!(c, '/' | '\\' | ':' | '*' | '?' | '"' | '<' | '>' | '|') { ' ' } else { c })
        .collect();
    let mut folder = cleaned.split_whitespace().collect::<Vec<_>>().join(" ");
    folder = folder.trim_start_matches('.').trim_end_matches(['.', ' ']).trim().to_string();
    folder = folder.chars().take(60).collect::<String>().trim_end_matches(['.', ' ']).to_string();
    if folder.is_empty() {
        return "Site".into();
    }
    let stem = folder.split('.').next().unwrap_or("").to_ascii_uppercase();
    let reserved = matches!(stem.as_str(), "CON" | "PRN" | "AUX" | "NUL")
        || ((stem.starts_with("COM") || stem.starts_with("LPT")) && stem.len() == 4 && stem.as_bytes()[3].is_ascii_digit());
    if reserved {
        folder.push_str(" site");
    }
    folder
}

/// Copies a folder and everything in it; `skip` names files (relative,
/// forward slashes) to leave out.
fn copy_folder(from: &Path, to: &Path, skip: &[&str], rel: &str) -> std::io::Result<()> {
    fs::create_dir_all(to)?;
    for entry in fs::read_dir(from)? {
        let entry = entry?;
        let name = entry.file_name();
        let name_str = name.to_string_lossy();
        let path = if rel.is_empty() { name_str.to_string() } else { format!("{rel}/{name_str}") };
        if skip.contains(&path.as_str()) {
            continue;
        }
        let kind = entry.file_type()?;
        if kind.is_dir() {
            copy_folder(&entry.path(), &to.join(&name), skip, &path)?;
        } else if kind.is_file() {
            fs::copy(entry.path(), to.join(&name))?;
        }
        // Links are left out: a site never needs them.
    }
    Ok(())
}

/// All the sites in the Crust folder, and which one is open.
pub struct Sites {
    home: PathBuf,
    current: RwLock<Arc<SiteFolder>>,
    /// One change to the list at a time.
    changing: Mutex<()>,
}

impl Sites {
    /// Opens the Crust folder: the site open last time, `forced` if given
    /// (tests), or "My site". Creates whatever is missing.
    pub fn open(home: impl Into<PathBuf>, forced: Option<String>) -> Result<Self, SiteError> {
        let home = home.into();
        fs::create_dir_all(&home).map_err(|e| io("make the Crust folder", e))?;
        let remembered = fs::read(home.join(STATE)).ok().and_then(|b| serde_json::from_slice::<State>(&b).ok()).and_then(|s| s.current);
        let usable = |id: &String| plain_id(id) && home.join(id).is_dir();
        let id = match forced {
            Some(id) if plain_id(&id) => id,
            _ => remembered.filter(usable).unwrap_or_else(|| FIRST_SITE.into()),
        };
        let folder = home.join(&id);
        fs::create_dir_all(&folder).map_err(|e| io("make the site's folder", e))?;
        let sites = Self { home, current: RwLock::new(Arc::new(SiteFolder::new(folder))), changing: Mutex::default() };
        sites.remember(&id);
        Ok(sites)
    }

    pub fn home(&self) -> &Path {
        &self.home
    }

    /// The site open in the window.
    pub fn current(&self) -> Arc<SiteFolder> {
        self.current.read().unwrap_or_else(|e| e.into_inner()).clone()
    }

    pub fn current_id(&self) -> String {
        self.current().root().file_name().map(|n| n.to_string_lossy().into_owned()).unwrap_or_default()
    }

    fn lock(&self) -> std::sync::MutexGuard<'_, ()> {
        self.changing.lock().unwrap_or_else(|e| e.into_inner())
    }

    fn remember(&self, id: &str) {
        let state = State { current: Some(id.to_string()) };
        let _ = fs::write(self.home.join(STATE), serde_json::to_vec(&state).unwrap_or_default());
    }

    fn set_current(&self, id: &str) {
        *self.current.write().unwrap_or_else(|e| e.into_inner()) = Arc::new(SiteFolder::new(self.home.join(id)));
        self.remember(id);
    }

    /// A site's folder, or an error if there's no such site.
    pub fn folder(&self, id: &str) -> Result<SiteFolder, SiteError> {
        if !plain_id(id) || !self.home.join(id).is_dir() {
            return Err(SiteError::Io("That site isn't in the Crust folder any more.".into()));
        }
        Ok(SiteFolder::new(self.home.join(id)))
    }

    /// The site for a file command: the one named, or the open one.
    pub fn site_or_current(&self, id: Option<&str>) -> Result<Arc<SiteFolder>, SiteError> {
        match id {
            Some(id) if !id.is_empty() => self.folder(id).map(Arc::new),
            _ => Ok(self.current()),
        }
    }

    /// Folder names in use (sites and deleted sites), lower-cased: Mac and
    /// Windows treat "Bakery" and "bakery" as the same folder.
    fn taken(&self, dir: &Path) -> Vec<String> {
        fs::read_dir(dir)
            .map(|entries| entries.flatten().map(|e| e.file_name().to_string_lossy().to_lowercase()).collect())
            .unwrap_or_default()
    }

    /// A free folder name for a site name in `dir`: "Bakery", "Bakery 2", …
    fn free_folder(&self, dir: &Path, name: &str, except: Option<&str>) -> String {
        let base = folder_name(name);
        let taken = self.taken(dir);
        let except = except.map(str::to_lowercase);
        let free = |candidate: &str| {
            let lower = candidate.to_lowercase();
            except.as_deref() == Some(lower.as_str()) || (!taken.contains(&lower) && !lower.starts_with('.'))
        };
        if free(&base) {
            return base;
        }
        (2..).map(|n| format!("{base} {n}")).find(|c| free(c)).unwrap_or(base)
    }

    /// The sites, newest first.
    pub fn list(&self) -> Result<Vec<SiteSummary>, SiteError> {
        let current = self.current_id();
        let entries = fs::read_dir(&self.home).map_err(|e| io("read the Crust folder", e))?;
        let mut sites = Vec::new();
        for entry in entries.flatten() {
            let id = entry.file_name().to_string_lossy().into_owned();
            if !plain_id(&id) || !entry.file_type().map(|t| t.is_dir()).unwrap_or(false) {
                continue;
            }
            let root = entry.path();
            let pages = fs::read_dir(root.join("content/pages"))
                .map(|e| e.flatten().filter(|f| f.file_name().to_string_lossy().ends_with(".json")).count())
                .unwrap_or(0);
            let edited = modified_ms(&root.join(".crust/HEAD")).or_else(|| modified_ms(&root.join("content/site.json")));
            let name = site_name(&root).unwrap_or_else(|| id.clone());
            sites.push(SiteSummary { open: id == current, id, name, pages, edited });
        }
        sites.sort_by(|a, b| b.edited.cmp(&a.edited).then_with(|| a.name.to_lowercase().cmp(&b.name.to_lowercase())));
        Ok(sites)
    }

    /// Makes an empty folder for a new site; the builder fills it.
    pub fn create(&self, name: &str) -> Result<String, SiteError> {
        let name = clean_name(name)?;
        let _one = self.lock();
        let id = self.free_folder(&self.home, &name, None);
        fs::create_dir_all(self.home.join(&id)).map_err(|e| io("make the site's folder", e))?;
        Ok(id)
    }

    /// Renames a site's folder to match its new name (the builder changes the
    /// name in its settings). Returns the folder's new name.
    pub fn rename(&self, id: &str, name: &str) -> Result<String, SiteError> {
        let name = clean_name(name)?;
        let from = self.folder(id)?;
        let _one = self.lock();
        let to = self.free_folder(&self.home, &name, Some(id));
        if to != id {
            fs::rename(from.root(), self.home.join(&to)).map_err(|e| io(&format!("rename the folder of “{id}”. If another program has it open, close it and try again"), e))?;
            if self.current_id() == id {
                self.set_current(&to);
            }
        }
        Ok(to)
    }

    /// Copies a site, history and all, except where it was published.
    pub fn duplicate(&self, id: &str, name: &str) -> Result<String, SiteError> {
        let name = clean_name(name)?;
        let from = self.folder(id)?;
        let _one = self.lock();
        let to = self.free_folder(&self.home, &name, None);
        let target = self.home.join(&to);
        if let Err(e) = copy_folder(from.root(), &target, PUBLISH_FILES, "") {
            let _ = fs::remove_dir_all(&target);
            return Err(io(&format!("copy “{id}”"), e));
        }
        Ok(to)
    }

    /// Moves a site to Recently deleted. If it was open, the most recently
    /// edited other site opens (or a new "My site"). Returns the open site.
    pub fn delete(&self, id: &str, now: u64) -> Result<String, SiteError> {
        let site = self.folder(id)?;
        let name = site_name(site.root()).unwrap_or_else(|| id.to_string());
        let _one = self.lock();
        let trash = self.home.join(TRASH);
        fs::create_dir_all(&trash).map_err(|e| io("make the Recently deleted folder", e))?;
        let entry = self.free_folder(&trash, id, None);
        let info = serde_json::to_vec(&DeletedInfo { name, deleted_at: now }).unwrap_or_default();
        site.write(DELETED, &info)?;
        if let Err(e) = fs::rename(site.root(), trash.join(&entry)) {
            let _ = site.remove(DELETED);
            return Err(io(&format!("delete “{id}”. If another program has its folder open, close it and try again"), e));
        }
        if self.current_id() == id {
            drop(_one);
            let next = self.list()?.into_iter().next().map(|s| s.id);
            let next = match next {
                Some(next) => next,
                None => {
                    let first = self.free_folder(&self.home, FIRST_SITE, None);
                    fs::create_dir_all(self.home.join(&first)).map_err(|e| io("make a new site", e))?;
                    first
                }
            };
            self.set_current(&next);
        }
        Ok(self.current_id())
    }

    /// The deleted sites, newest first. Sites deleted more than 30 days
    /// ago are removed for good first.
    pub fn deleted(&self, now: u64) -> Result<Vec<DeletedSite>, SiteError> {
        let trash = self.home.join(TRASH);
        let entries = match fs::read_dir(&trash) {
            Ok(entries) => entries,
            Err(e) if e.kind() == ErrorKind::NotFound => return Ok(Vec::new()),
            Err(e) => return Err(io("read Recently deleted", e)),
        };
        let mut sites = Vec::new();
        for entry in entries.flatten() {
            let id = entry.file_name().to_string_lossy().into_owned();
            if !plain_id(&id) || !entry.file_type().map(|t| t.is_dir()).unwrap_or(false) {
                continue;
            }
            // Only folders Crust put here, with their note, are ever removed.
            let Some(info) = fs::read(entry.path().join(DELETED)).ok().and_then(|b| serde_json::from_slice::<DeletedInfo>(&b).ok()) else {
                continue;
            };
            let removed_at = info.deleted_at.saturating_add(KEEP_DELETED_MS);
            if removed_at <= now {
                let _ = fs::remove_dir_all(entry.path());
                continue;
            }
            sites.push(DeletedSite { id, name: info.name, deleted_at: info.deleted_at, removed_at });
        }
        sites.sort_by_key(|d| std::cmp::Reverse(d.deleted_at));
        Ok(sites)
    }

    /// Brings a deleted site back. Returns its folder's name.
    pub fn restore(&self, id: &str) -> Result<String, SiteError> {
        let trash = self.home.join(TRASH);
        if !plain_id(id) || !trash.join(id).join(DELETED).is_file() {
            return Err(SiteError::Io("That site isn't in Recently deleted any more.".into()));
        }
        let _one = self.lock();
        let deleted = SiteFolder::new(trash.join(id));
        let name = fs::read(trash.join(id).join(DELETED))
            .ok()
            .and_then(|b| serde_json::from_slice::<DeletedInfo>(&b).ok())
            .map(|i| i.name)
            .unwrap_or_else(|| id.to_string());
        let to = self.free_folder(&self.home, &name, None);
        fs::rename(deleted.root(), self.home.join(&to)).map_err(|e| io(&format!("bring back “{name}”"), e))?;
        let _ = SiteFolder::new(self.home.join(&to)).remove(DELETED);
        Ok(to)
    }

    /// Opens another site in the window.
    pub fn switch(&self, id: &str) -> Result<(), SiteError> {
        self.folder(id)?;
        let _one = self.lock();
        self.set_current(id);
        Ok(())
    }
}

/// A site folder's name as the app uses it: one plain name, not hidden.
fn plain_id(id: &str) -> bool {
    !id.is_empty() && !id.starts_with('.') && !id.contains(['/', '\\', '\0']) && id != ".." && Path::new(id).components().count() == 1
}

/// The name in a site's settings, if it has one.
fn site_name(root: &Path) -> Option<String> {
    let bytes = fs::read(root.join("content/site.json")).ok()?;
    let value: serde_json::Value = serde_json::from_slice(&bytes).ok()?;
    let name = value.get("name")?.as_str()?.trim();
    (!name.is_empty()).then(|| name.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    const DAY: u64 = 24 * 60 * 60 * 1000;

    fn home() -> (tempfile::TempDir, Sites) {
        let dir = tempfile::tempdir().unwrap();
        let sites = Sites::open(dir.path().join("Crust"), None).unwrap();
        (dir, sites)
    }

    fn make_site(sites: &Sites, id: &str, name: &str) {
        let site = SiteFolder::new(sites.home().join(id));
        site.write("content/site.json", format!("{{\"name\":\"{name}\"}}").as_bytes()).unwrap();
        site.write("content/pages/index.json", b"{}").unwrap();
        site.write(".crust/HEAD", b"abc").unwrap();
    }

    #[test]
    fn starts_with_my_site_and_remembers_the_open_one() {
        let dir = tempfile::tempdir().unwrap();
        let sites = Sites::open(dir.path().join("Crust"), None).unwrap();
        assert_eq!(sites.current_id(), "My site");
        assert!(dir.path().join("Crust/My site").is_dir());
        let id = sites.create("Bakery").unwrap();
        sites.switch(&id).unwrap();
        drop(sites);
        assert_eq!(Sites::open(dir.path().join("Crust"), None).unwrap().current_id(), "Bakery");
        // A forced folder (tests, CRUST_SITE_FOLDER) wins.
        assert_eq!(Sites::open(dir.path().join("Crust"), Some("Other".into())).unwrap().current_id(), "Other");
        // A remembered site that's gone falls back to My site.
        fs::remove_dir_all(dir.path().join("Crust/Other")).unwrap();
        fs::write(dir.path().join("Crust").join(STATE), r#"{"current":"Gone"}"#).unwrap();
        assert_eq!(Sites::open(dir.path().join("Crust"), None).unwrap().current_id(), "My site");
    }

    #[test]
    fn lists_sites_with_names_and_pages() {
        let (_dir, sites) = home();
        make_site(&sites, "My site", "Harbour Studio");
        make_site(&sites, "Bakery", "Bakery Lumière");
        SiteFolder::new(sites.home().join("Bakery")).write("content/pages/menu.json", b"{}").unwrap();
        fs::create_dir_all(sites.home().join(TRASH)).unwrap();
        let list = sites.list().unwrap();
        assert_eq!(list.len(), 2, "hidden folders aren't sites");
        let bakery = list.iter().find(|s| s.id == "Bakery").unwrap();
        assert_eq!((bakery.name.as_str(), bakery.pages, bakery.open), ("Bakery Lumière", 2, false));
        assert!(bakery.edited.is_some());
        assert!(list.iter().find(|s| s.id == "My site").unwrap().open);
        // A folder without settings shows its own name.
        sites.create("Empty").unwrap();
        assert_eq!(sites.list().unwrap().iter().find(|s| s.id == "Empty").unwrap().name, "Empty");
    }

    #[test]
    fn folder_names_are_safe_everywhere() {
        assert_eq!(folder_name("Bakery Lumière"), "Bakery Lumière");
        assert_eq!(folder_name("Rina's / portfolio: 2026?"), "Rina's portfolio 2026");
        assert_eq!(folder_name("..hidden"), "hidden");
        assert_eq!(folder_name("Ends with dot."), "Ends with dot");
        assert_eq!(folder_name("CON"), "CON site");
        assert_eq!(folder_name("com1"), "com1 site");
        assert_eq!(folder_name("Company"), "Company");
        assert_eq!(folder_name("///"), "Site");
        assert_eq!(folder_name(&"a".repeat(100)).len(), 60);
        assert_eq!(clean_name("  Two   words ").unwrap(), "Two words");
        assert!(clean_name("   ").is_err());
        assert!(clean_name(&"x".repeat(81)).is_err());
    }

    #[test]
    fn new_sites_get_free_folder_names() {
        let (_dir, sites) = home();
        assert_eq!(sites.create("Bakery").unwrap(), "Bakery");
        assert_eq!(sites.create("bakery").unwrap(), "bakery 2", "Mac and Windows ignore case");
        assert_eq!(sites.create("Bakery").unwrap(), "Bakery 3");
        assert_eq!(sites.create("My site").unwrap(), "My site 2");
        assert!(sites.create(" ").is_err());
    }

    #[test]
    fn renames_the_folder_and_follows_the_open_site() {
        let (_dir, sites) = home();
        make_site(&sites, "My site", "Harbour");
        assert_eq!(sites.rename("My site", "Harbour Studio").unwrap(), "Harbour Studio");
        assert_eq!(sites.current_id(), "Harbour Studio");
        assert!(sites.home().join("Harbour Studio/content/site.json").is_file());
        // Same name, other case: renamed in place (not "Harbour studio 2").
        assert_eq!(sites.rename("Harbour Studio", "Harbour studio").unwrap(), "Harbour studio");
        // Taken by another site: gets a number.
        sites.create("Bakery").unwrap();
        assert_eq!(sites.rename("Bakery", "Harbour studio").unwrap(), "Harbour studio 2");
        assert!(sites.rename("Nope", "X").is_err());
        assert!(sites.rename("../Crust", "X").is_err());
    }

    #[test]
    fn duplicates_everything_but_where_it_was_published() {
        let (_dir, sites) = home();
        make_site(&sites, "My site", "Harbour");
        let original = SiteFolder::new(sites.home().join("My site"));
        original.write(".crust/published", b"{}").unwrap();
        original.write(".crust/hosts.json", b"{}").unwrap();
        original.write(".crust/ftp-sent.json", b"{}").unwrap();
        original.write(".crust/objects/ab", b"old version").unwrap();
        original.write("content/media/harbour.jpg", &[1, 2, 3]).unwrap();
        let id = sites.duplicate("My site", "Harbour copy").unwrap();
        assert_eq!(id, "Harbour copy");
        let copy = SiteFolder::new(sites.home().join(&id));
        assert_eq!(copy.read("content/media/harbour.jpg").unwrap().unwrap(), vec![1, 2, 3]);
        assert_eq!(copy.read(".crust/objects/ab").unwrap().unwrap(), b"old version");
        assert_eq!(copy.read(".crust/HEAD").unwrap().unwrap(), b"abc");
        assert_eq!(copy.read(".crust/published").unwrap(), None);
        assert_eq!(copy.read(".crust/hosts.json").unwrap(), None);
        assert_eq!(copy.read(".crust/ftp-sent.json").unwrap(), None);
        assert_eq!(sites.current_id(), "My site", "the copy doesn't open by itself");
        assert_eq!(sites.duplicate("My site", "Harbour copy").unwrap(), "Harbour copy 2");
    }

    #[test]
    fn deletes_to_recently_deleted_and_brings_back() {
        let (_dir, sites) = home();
        make_site(&sites, "My site", "Harbour");
        make_site(&sites, "Bakery", "Bakery Lumière");
        let now = 1_000 * DAY;
        assert_eq!(sites.delete("Bakery", now).unwrap(), "My site");
        assert!(!sites.home().join("Bakery").exists());
        assert_eq!(sites.list().unwrap().len(), 1);
        let deleted = sites.deleted(now).unwrap();
        assert_eq!(deleted, vec![DeletedSite { id: "Bakery".into(), name: "Bakery Lumière".into(), deleted_at: now, removed_at: now + 30 * DAY }]);
        // Its name is taken meanwhile: it comes back with the next free one.
        sites.create("Bakery Lumière").unwrap();
        assert_eq!(sites.restore("Bakery").unwrap(), "Bakery Lumière 2");
        let back = SiteFolder::new(sites.home().join("Bakery Lumière 2"));
        assert!(back.read("content/site.json").unwrap().is_some());
        assert_eq!(back.read(DELETED).unwrap(), None);
        assert!(sites.deleted(now).unwrap().is_empty());
        assert!(sites.restore("Bakery").is_err());
    }

    #[test]
    fn deleting_the_open_site_opens_another() {
        let (_dir, sites) = home();
        make_site(&sites, "My site", "Harbour");
        make_site(&sites, "Bakery", "Bakery");
        assert_eq!(sites.delete("My site", 5).unwrap(), "Bakery");
        assert_eq!(sites.current_id(), "Bakery");
        // The last one: a new empty site opens.
        assert_eq!(sites.delete("Bakery", 6).unwrap(), "My site");
        assert!(sites.home().join("My site").is_dir());
        assert_eq!(sites.deleted(7).unwrap().len(), 2);
        // Two deleted sites with the same folder name both wait.
        assert_eq!(sites.deleted(7).unwrap().iter().map(|d| d.id.as_str()).collect::<Vec<_>>().len(), 2);
    }

    #[test]
    fn removes_deleted_sites_after_thirty_days_only() {
        let (_dir, sites) = home();
        make_site(&sites, "Old", "Old");
        make_site(&sites, "New", "New");
        sites.delete("Old", 0).unwrap();
        sites.delete("New", 10 * DAY).unwrap();
        // A folder someone put there by hand is never removed.
        fs::create_dir_all(sites.home().join(TRASH).join("Mine")).unwrap();
        let left = sites.deleted(30 * DAY).unwrap();
        assert_eq!(left.iter().map(|d| d.name.as_str()).collect::<Vec<_>>(), vec!["New"]);
        assert!(!sites.home().join(TRASH).join("Old").exists());
        assert!(sites.home().join(TRASH).join("Mine").exists());
        assert_eq!(sites.deleted(29 * DAY).unwrap().len(), 1);
    }

    #[test]
    fn file_commands_reach_only_real_sites() {
        let (_dir, sites) = home();
        make_site(&sites, "Bakery", "Bakery");
        assert_eq!(sites.site_or_current(Some("Bakery")).unwrap().root(), sites.home().join("Bakery"));
        assert_eq!(sites.site_or_current(None).unwrap().root(), sites.home().join("My site"));
        assert_eq!(sites.site_or_current(Some("")).unwrap().root(), sites.home().join("My site"));
        for bad in ["..", "../x", ".Recently deleted", "a/b", "Missing", ".sites.json"] {
            assert!(sites.site_or_current(Some(bad)).is_err(), "{bad}");
            assert!(sites.switch(bad).is_err(), "{bad}");
        }
    }
}

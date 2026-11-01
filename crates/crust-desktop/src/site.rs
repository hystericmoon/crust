//! The site folder: where one site's files and its hidden history live on
//! the computer (F055). The builder's content store (F054, `LocalStore` in
//! apps/admin/server/local-store.ts) reads and writes through these four
//! operations, so all the rules about what may be touched live here.
//!
//! Paths always come from the builder as forward-slash paths relative to
//! the site folder ("content/pages/about.json", ".crust/HEAD"). Anything
//! that could reach outside the folder is refused.

use std::fs;
use std::io::ErrorKind;
use std::path::{Component, Path, PathBuf};

/// Why a request was refused, in words the builder can show.
#[derive(Debug, PartialEq, Eq)]
pub enum SiteError {
    /// The path is empty, absolute, or climbs out of the folder.
    Outside(String),
    /// The computer said no (permissions, disk full, …).
    Io(String),
}

impl std::fmt::Display for SiteError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            SiteError::Outside(path) => write!(f, "{path} is outside the site folder."),
            SiteError::Io(message) => write!(f, "{message}"),
        }
    }
}

impl std::error::Error for SiteError {}

fn io(path: &str, e: std::io::Error) -> SiteError {
    SiteError::Io(format!("Couldn't use {path} in the site folder: {e}"))
}

/// One site, kept in a folder.
#[derive(Debug, Clone)]
pub struct SiteFolder {
    root: PathBuf,
}

impl SiteFolder {
    pub fn new(root: impl Into<PathBuf>) -> Self {
        Self { root: root.into() }
    }

    pub fn root(&self) -> &Path {
        &self.root
    }

    /// The full path for a relative one, or an error if it would leave the
    /// folder. Only plain names are allowed: no "..", no "/" at the start,
    /// no drive letters, no backslashes (so Windows and Mac agree).
    pub fn resolve(&self, path: &str) -> Result<PathBuf, SiteError> {
        let refuse = || SiteError::Outside(path.to_string());
        if path.is_empty() || path.contains('\\') || path.contains('\0') {
            return Err(refuse());
        }
        let mut full = self.root.clone();
        for component in Path::new(path).components() {
            match component {
                Component::Normal(name) => full.push(name),
                _ => return Err(refuse()),
            }
        }
        Ok(full)
    }

    /// A file's bytes, or None if there's no such file.
    pub fn read(&self, path: &str) -> Result<Option<Vec<u8>>, SiteError> {
        let full = self.resolve(path)?;
        match fs::read(&full) {
            Ok(bytes) => Ok(Some(bytes)),
            Err(e) if e.kind() == ErrorKind::NotFound => Ok(None),
            // A folder where a file was expected reads as "no such file".
            Err(_) if full.is_dir() => Ok(None),
            Err(e) => Err(io(path, e)),
        }
    }

    /// Writes a file, creating its folders. The file is written next to its
    /// final place and then moved there, so a crash never leaves half a file.
    pub fn write(&self, path: &str, bytes: &[u8]) -> Result<(), SiteError> {
        let full = self.resolve(path)?;
        if let Some(parent) = full.parent() {
            fs::create_dir_all(parent).map_err(|e| io(path, e))?;
        }
        let mut temp = full.clone().into_os_string();
        temp.push(".saving");
        let temp = PathBuf::from(temp);
        fs::write(&temp, bytes).map_err(|e| io(path, e))?;
        fs::rename(&temp, &full).map_err(|e| {
            let _ = fs::remove_file(&temp);
            io(path, e)
        })
    }

    /// Removes a file; a missing file is fine.
    pub fn remove(&self, path: &str) -> Result<(), SiteError> {
        let full = self.resolve(path)?;
        match fs::remove_file(&full) {
            Ok(()) => Ok(()),
            Err(e) if e.kind() == ErrorKind::NotFound => Ok(()),
            Err(e) => Err(io(path, e)),
        }
    }

    /// Names of the files (not folders) directly inside a folder, sorted;
    /// empty if the folder doesn't exist. Hidden system files (".DS_Store")
    /// and half-written files are left out.
    pub fn list(&self, dir: &str) -> Result<Vec<String>, SiteError> {
        let full = if dir.is_empty() { self.root.clone() } else { self.resolve(dir)? };
        let entries = match fs::read_dir(&full) {
            Ok(entries) => entries,
            Err(e) if e.kind() == ErrorKind::NotFound => return Ok(Vec::new()),
            Err(e) => return Err(io(dir, e)),
        };
        let mut names = Vec::new();
        for entry in entries {
            let entry = entry.map_err(|e| io(dir, e))?;
            if !entry.file_type().map_err(|e| io(dir, e))?.is_file() {
                continue;
            }
            let Ok(name) = entry.file_name().into_string() else { continue };
            if is_system_file(&name) || name.ends_with(".saving") {
                continue;
            }
            names.push(name);
        }
        names.sort();
        Ok(names)
    }
}

/// Files the computer puts in folders by itself.
fn is_system_file(name: &str) -> bool {
    matches!(name, ".DS_Store" | "Thumbs.db" | "desktop.ini") || name.starts_with("._")
}

/// Where the site lives when nothing else says: "Crust/My site" in the
/// person's Documents folder.
pub fn default_site_folder(documents: &Path) -> PathBuf {
    documents.join("Crust").join("My site")
}

/// Photos the builder shows from the site (F034): `/media/<file>` is
/// `content/media/<file>`. Only plain photo names, as the builder makes
/// them; anything else isn't a photo.
pub fn media_path(url_path: &str) -> Option<String> {
    let file = url_path.trim_start_matches('/').strip_prefix("media/")?;
    let (stem, ext) = file.rsplit_once('.')?;
    let ok_name = !stem.is_empty()
        && !stem.starts_with('.')
        && file.chars().all(|c| c.is_ascii_alphanumeric() || matches!(c, '-' | '_' | '.'));
    let ok_ext = matches!(ext.to_ascii_lowercase().as_str(), "jpg" | "jpeg" | "png" | "webp");
    (ok_name && ok_ext).then(|| format!("content/media/{file}"))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn site() -> (tempfile::TempDir, SiteFolder) {
        let dir = tempfile::tempdir().unwrap();
        let site = SiteFolder::new(dir.path().join("My site"));
        (dir, site)
    }

    #[test]
    fn writes_reads_and_lists_files() {
        let (_dir, site) = site();
        site.write("content/pages/about.json", b"{\"path\":\"/about\"}").unwrap();
        site.write("content/pages/index.json", b"{}").unwrap();
        site.write("content/site.json", b"{}").unwrap();
        assert_eq!(site.read("content/pages/about.json").unwrap().unwrap(), b"{\"path\":\"/about\"}");
        assert_eq!(site.list("content/pages").unwrap(), vec!["about.json", "index.json"]);
        // Folders aren't listed, only files.
        assert_eq!(site.list("content").unwrap(), vec!["site.json"]);
    }

    #[test]
    fn missing_things_are_empty_not_errors() {
        let (_dir, site) = site();
        assert_eq!(site.read("content/site.json").unwrap(), None);
        assert_eq!(site.list("content/pages").unwrap(), Vec::<String>::new());
        site.remove("content/pages/gone.json").unwrap();
        site.write("content/pages/x.json", b"1").unwrap();
        assert_eq!(site.read("content/pages").unwrap(), None);
    }

    #[test]
    fn overwrites_and_removes() {
        let (_dir, site) = site();
        site.write(".crust/HEAD", b"aaa").unwrap();
        site.write(".crust/HEAD", b"bbb").unwrap();
        assert_eq!(site.read(".crust/HEAD").unwrap().unwrap(), b"bbb");
        assert_eq!(site.list(".crust").unwrap(), vec!["HEAD"]);
        site.remove(".crust/HEAD").unwrap();
        assert_eq!(site.read(".crust/HEAD").unwrap(), None);
    }

    #[test]
    fn keeps_binary_files_exact() {
        let (_dir, site) = site();
        let bytes: Vec<u8> = (0..=255).collect();
        site.write("content/media/photo.jpg", &bytes).unwrap();
        assert_eq!(site.read("content/media/photo.jpg").unwrap().unwrap(), bytes);
    }

    #[test]
    fn refuses_paths_outside_the_folder() {
        let (dir, site) = site();
        std::fs::write(dir.path().join("secret.txt"), "no").unwrap();
        for bad in ["../secret.txt", "content/../../secret.txt", "/etc/passwd", "", "content\\..\\x", "./content/site.json", "a\0b"] {
            assert!(matches!(site.read(bad), Err(SiteError::Outside(_))), "read {bad:?}");
            assert!(matches!(site.write(bad, b"x"), Err(SiteError::Outside(_))), "write {bad:?}");
            assert!(matches!(site.remove(bad), Err(SiteError::Outside(_))), "remove {bad:?}");
        }
        assert!(matches!(site.list("../"), Err(SiteError::Outside(_))));
        assert_eq!(std::fs::read_to_string(dir.path().join("secret.txt")).unwrap(), "no");
        assert_eq!(SiteError::Outside("../x".into()).to_string(), "../x is outside the site folder.");
    }

    #[test]
    fn leaves_out_system_and_half_written_files() {
        let (_dir, site) = site();
        site.write("content/media/a.jpg", b"1").unwrap();
        site.write("content/media/.DS_Store", b"1").unwrap();
        site.write("content/media/._a.jpg", b"1").unwrap();
        site.write("content/media/b.jpg.saving", b"1").unwrap();
        assert_eq!(site.list("content/media").unwrap(), vec!["a.jpg"]);
    }

    #[test]
    fn default_folder_is_in_documents() {
        let docs = Path::new("/Users/hosni/Documents");
        assert_eq!(default_site_folder(docs), docs.join("Crust").join("My site"));
    }

    #[test]
    fn media_addresses_map_to_the_media_folder() {
        assert_eq!(media_path("/media/harbour.jpg").as_deref(), Some("content/media/harbour.jpg"));
        assert_eq!(media_path("media/door-2.WEBP").as_deref(), Some("content/media/door-2.WEBP"));
        assert_eq!(media_path("/media/a.b.png").as_deref(), Some("content/media/a.b.png"));
        for bad in ["/media/../site.json", "/media/x.json", "/media/.jpg", "/media/sub/a.jpg", "/assets/a.jpg", "/media/a%20b.jpg", "/media/"] {
            assert_eq!(media_path(bad), None, "{bad}");
        }
    }
}

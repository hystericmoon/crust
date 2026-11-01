//! Crust as a desktop app (F055): the builder in a native window, with the
//! site kept in a folder on the computer.
//!
//! The window shows the same builder as the web admin (apps/admin, built to
//! apps/admin/dist). Its server code runs inside the window too, saving
//! through a local content store (F054) whose files go through the four
//! commands below. Photos (`/media/<file>`) are served straight from the
//! site folder, so the builder shows them as it does on the web.
//!
//! F056: the builder renders the site and the commands below finish it
//! (checks, sitemap, photos, search index), export it to a folder, or
//! show it in the person's browser.

pub mod preview;
pub mod publish;
pub mod site;
pub mod sites;

use std::borrow::Cow;
use std::path::PathBuf;
use std::sync::{Arc, Mutex, OnceLock};

use crust_publish::Checks;
use serde::Serialize;
use tauri::ipc::{InvokeBody, Request, Response};
use tauri::utils::assets::{AssetKey, AssetsIter, CspHash};
use tauri::{Manager, Runtime, State};
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_opener::OpenerExt;

pub use preview::PreviewServer;
pub use publish::{BuildReport, Exported, RenderedFile, build_site, export_folder, export_site};
pub use site::{SiteError, SiteFolder, default_site_folder, media_path};
pub use sites::{DeletedSite, SiteSummary, Sites};

/// What the builder is told when a file isn't there (it reads as `null`).
pub const NOT_FOUND: &str = "crust:not-found";
/// The header carrying the path of a file being written.
pub const PATH_HEADER: &str = "x-crust-path";
/// F057: the header naming another site to write to (the open one if absent).
pub const SITE_HEADER: &str = "x-crust-site";

/// The sites, and the one this window works on (F057).
pub struct AppSites(pub Arc<Sites>);

#[derive(Serialize, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct SiteInfo {
    /// The folder on the computer, to show people where their site is.
    pub folder: String,
    /// F057: the folder's name, which names the site in the app's commands
    /// and is the name a new site starts with.
    pub id: String,
}

pub fn site_info_of(sites: &Sites) -> SiteInfo {
    SiteInfo { folder: sites.current().root().display().to_string(), id: sites.current_id() }
}

#[tauri::command]
fn site_info(sites: State<'_, AppSites>) -> SiteInfo {
    site_info_of(&sites.0)
}

fn pick(sites: &State<'_, AppSites>, site: Option<String>) -> Result<Arc<SiteFolder>, String> {
    sites.0.site_or_current(site.as_deref()).map_err(|e| e.to_string())
}

#[tauri::command]
fn site_read(sites: State<'_, AppSites>, path: String, site: Option<String>) -> Result<Response, String> {
    match pick(&sites, site)?.read(&path).map_err(|e| e.to_string())? {
        Some(bytes) => Ok(Response::new(bytes)),
        None => Err(NOT_FOUND.to_string()),
    }
}

/// The bytes come as the request's raw body (no JSON, so photos stay fast);
/// the path comes in a header, URL-encoded.
#[tauri::command]
fn site_write(sites: State<'_, AppSites>, request: Request<'_>) -> Result<(), String> {
    let site = request.headers().get(SITE_HEADER).and_then(|v| v.to_str().ok()).and_then(percent_decode);
    let path = request
        .headers()
        .get(PATH_HEADER)
        .and_then(|v| v.to_str().ok())
        .and_then(percent_decode)
        .ok_or("The file to save has no name.")?;
    let InvokeBody::Raw(bytes) = request.body() else {
        return Err("The file to save came in the wrong form.".into());
    };
    pick(&sites, site)?.write(&path, bytes).map_err(|e| e.to_string())
}

#[tauri::command]
fn site_remove(sites: State<'_, AppSites>, path: String, site: Option<String>) -> Result<(), String> {
    pick(&sites, site)?.remove(&path).map_err(|e| e.to_string())
}

#[tauri::command]
fn site_list(sites: State<'_, AppSites>, dir: String, site: Option<String>) -> Result<Vec<String>, String> {
    pick(&sites, site)?.list(&dir).map_err(|e| e.to_string())
}

// --- F057: several sites ---------------------------------------------------------------------

#[tauri::command]
fn sites_list(sites: State<'_, AppSites>) -> Result<Vec<SiteSummary>, String> {
    sites.0.list().map_err(|e| e.to_string())
}

#[tauri::command]
fn sites_deleted(sites: State<'_, AppSites>) -> Result<Vec<DeletedSite>, String> {
    sites.0.deleted(sites::now_ms()).map_err(|e| e.to_string())
}

#[tauri::command]
fn sites_create(sites: State<'_, AppSites>, name: String) -> Result<String, String> {
    sites.0.create(&name).map_err(|e| e.to_string())
}

#[tauri::command]
fn sites_rename(sites: State<'_, AppSites>, id: String, name: String) -> Result<String, String> {
    sites.0.rename(&id, &name).map_err(|e| e.to_string())
}

#[tauri::command]
fn sites_duplicate(sites: State<'_, AppSites>, id: String, name: String) -> Result<String, String> {
    sites.0.duplicate(&id, &name).map_err(|e| e.to_string())
}

/// Returns the site open afterwards (another one if this one was open).
#[tauri::command]
fn sites_delete(sites: State<'_, AppSites>, builds: State<'_, Builds>, id: String) -> Result<String, String> {
    let before = sites.0.current_id();
    let open = sites.0.delete(&id, sites::now_ms()).map_err(|e| e.to_string())?;
    if open != before {
        builds.forget_exports();
    }
    Ok(open)
}

#[tauri::command]
fn sites_restore(sites: State<'_, AppSites>, id: String) -> Result<String, String> {
    sites.0.restore(&id).map_err(|e| e.to_string())
}

/// Opens another site; the builder reloads afterwards.
#[tauri::command]
fn sites_open(sites: State<'_, AppSites>, builds: State<'_, Builds>, id: String) -> Result<(), String> {
    sites.0.switch(&id).map_err(|e| e.to_string())?;
    builds.forget_exports();
    Ok(())
}

/// F056: where the finished site is built, and what's been done with it.
pub struct Builds {
    /// The latest finished site (in the app's cache, not the site folder).
    dir: PathBuf,
    /// One build at a time.
    building: Arc<Mutex<()>>,
    server: Mutex<Option<PreviewServer>>,
    /// An export waiting for "Replace" (the folder was already there).
    pending_export: Mutex<Option<PathBuf>>,
    last_export: Mutex<Option<PathBuf>>,
}

impl Builds {
    pub fn new(dir: PathBuf) -> Self {
        Self { dir, building: Arc::default(), server: Mutex::default(), pending_export: Mutex::default(), last_export: Mutex::default() }
    }

    /// F057: another site opened, so the last export belongs to the one before.
    pub fn forget_exports(&self) {
        *self.pending_export.lock().unwrap_or_else(|e| e.into_inner()) = None;
        *self.last_export.lock().unwrap_or_else(|e| e.into_inner()) = None;
    }
}

/// Finishes the rendered site. `preview`: problems are listed, not stopping it.
#[tauri::command]
async fn site_build(sites: State<'_, AppSites>, builds: State<'_, Builds>, files: Vec<RenderedFile>, base_url: String, preview: bool) -> Result<BuildReport, String> {
    let (site, out, lock) = (sites.0.current(), builds.dir.clone(), builds.building.clone());
    let checks = if preview { Checks::Report } else { Checks::Stop };
    tauri::async_runtime::spawn_blocking(move || {
        let _one_at_a_time = lock.lock().unwrap_or_else(|e| e.into_inner());
        build_site(&site, &files, &base_url, checks, &out)
    })
    .await
    .map_err(|e| format!("Building the site stopped unexpectedly: {e}"))?
}

/// Shows the latest build in the person's browser; returns its address.
#[tauri::command]
fn site_preview<R: Runtime>(app: tauri::AppHandle<R>, builds: State<'_, Builds>, open: bool) -> Result<String, String> {
    if !publish::looks_like_export(&builds.dir) {
        return Err("There's no finished site to show yet. Try again.".into());
    }
    let mut server = builds.server.lock().unwrap_or_else(|e| e.into_inner());
    if server.is_none() {
        *server = Some(PreviewServer::start(builds.dir.clone()).map_err(|e| format!("Couldn't start the preview: {e}"))?);
    }
    let url = server.as_ref().map(PreviewServer::url).unwrap_or_default();
    if open {
        app.opener().open_url(&url, None::<&str>).map_err(|e| format!("Couldn't open your browser: {e}"))?;
    }
    Ok(url)
}

#[derive(Serialize, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ExportResult {
    /// "done", "exists" (ask before replacing) or "cancelled".
    pub status: &'static str,
    pub folder: String,
}

fn export_result(builds: &Builds, outcome: Exported) -> ExportResult {
    let lock = |m: &Mutex<Option<PathBuf>>| *m.lock().unwrap_or_else(|e| e.into_inner()) = None;
    match outcome {
        Exported::Done(folder) => {
            lock(&builds.pending_export);
            *builds.last_export.lock().unwrap_or_else(|e| e.into_inner()) = Some(folder.clone());
            ExportResult { status: "done", folder: folder.display().to_string() }
        }
        Exported::Exists(folder) => {
            *builds.pending_export.lock().unwrap_or_else(|e| e.into_inner()) = Some(folder.clone());
            ExportResult { status: "exists", folder: folder.display().to_string() }
        }
    }
}

/// Asks where to put the site (a folder picker), then copies the latest
/// build there as "<Site name> website". `CRUST_EXPORT_FOLDER` skips the
/// picker (tests).
#[tauri::command]
async fn site_export<R: Runtime>(app: tauri::AppHandle<R>, builds: State<'_, Builds>, name: String) -> Result<ExportResult, String> {
    let chosen = match std::env::var_os("CRUST_EXPORT_FOLDER").filter(|f| !f.is_empty()) {
        Some(folder) => Some(PathBuf::from(folder)),
        None => {
            let dialog = app.dialog().clone();
            tauri::async_runtime::spawn_blocking(move || dialog.file().set_title("Choose where to put your site").blocking_pick_folder())
                .await
                .map_err(|e| e.to_string())?
                .and_then(|picked| picked.into_path().ok())
        }
    };
    let Some(parent) = chosen else {
        return Ok(ExportResult { status: "cancelled", folder: String::new() });
    };
    let target = export_folder(&parent, &name);
    let outcome = export_site(&builds.dir, &target, false)?;
    Ok(export_result(&builds, outcome))
}

/// "Replace": finishes the export that found its folder already there.
#[tauri::command]
fn site_export_replace(builds: State<'_, Builds>) -> Result<ExportResult, String> {
    let target = builds.pending_export.lock().unwrap_or_else(|e| e.into_inner()).clone().ok_or("There's no export waiting. Export again.")?;
    let outcome = export_site(&builds.dir, &target, true)?;
    Ok(export_result(&builds, outcome))
}

/// Shows the last exported folder in Finder or File Explorer.
#[tauri::command]
fn site_show_export<R: Runtime>(app: tauri::AppHandle<R>, builds: State<'_, Builds>) -> Result<(), String> {
    let folder = builds.last_export.lock().unwrap_or_else(|e| e.into_inner()).clone().ok_or("Nothing has been exported yet.")?;
    app.opener().reveal_item_in_dir(folder.join("index.html")).map_err(|e| format!("Couldn't show the folder: {e}"))
}

/// Decodes `%XX` escapes (what the builder's `encodeURIComponent` makes).
/// None if the escapes are broken or the result isn't text.
pub fn percent_decode(text: &str) -> Option<String> {
    let bytes = text.as_bytes();
    let mut out = Vec::with_capacity(bytes.len());
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b'%' {
            let hex = text.get(i + 1..i + 3)?;
            out.push(u8::from_str_radix(hex, 16).ok()?);
            i += 3;
        } else {
            out.push(bytes[i]);
            i += 1;
        }
    }
    String::from_utf8(out).ok()
}

/// Where the window's sites are kept once the app knows them (the Crust
/// folder is chosen after start-up, when Documents can be looked up).
pub type SiteSlot = Arc<OnceLock<Arc<Sites>>>;

/// The builder's files (built into the app), plus the site's photos from
/// the folder at `/media/<file>`.
pub struct SiteAssets<R: Runtime> {
    builder: Box<dyn tauri::Assets<R>>,
    site: SiteSlot,
}

impl<R: Runtime> SiteAssets<R> {
    pub fn new(builder: Box<dyn tauri::Assets<R>>, site: SiteSlot) -> Self {
        Self { builder, site }
    }
}

/// A photo from the site folder, if the address is one.
pub fn site_photo(site: &SiteFolder, url_path: &str) -> Option<Vec<u8>> {
    let path = media_path(url_path)?;
    site.read(&path).ok().flatten()
}

impl<R: Runtime> tauri::Assets<R> for SiteAssets<R> {
    fn setup(&self, app: &tauri::App<R>) {
        self.builder.setup(app)
    }

    fn get(&self, key: &AssetKey) -> Option<Cow<'_, [u8]>> {
        if media_path(key.as_ref()).is_some() {
            return site_photo(&self.site.get()?.current(), key.as_ref()).map(Cow::Owned);
        }
        self.builder.get(key)
    }

    fn iter(&self) -> Box<AssetsIter<'_>> {
        self.builder.iter()
    }

    fn csp_hashes(&self, html_path: &AssetKey) -> Box<dyn Iterator<Item = CspHash<'_>> + '_> {
        self.builder.csp_hashes(html_path)
    }
}

/// Which sites to use: the Crust folder in Documents (or the home folder),
/// with the site open last time. `CRUST_SITE_FOLDER` (tests, power users)
/// opens that folder, and its neighbours are the other sites.
fn choose_sites<R: Runtime>(app: &tauri::App<R>) -> Result<Sites, SiteError> {
    let (home, forced) = match std::env::var_os("CRUST_SITE_FOLDER").filter(|f| !f.is_empty()).map(PathBuf::from) {
        Some(folder) => sites_for_folder(&folder),
        None => {
            let paths = app.path();
            let documents = paths.document_dir().or_else(|_| paths.home_dir()).unwrap_or_else(|_| PathBuf::from("."));
            let first = default_site_folder(&documents);
            (first.parent().map(PathBuf::from).unwrap_or(documents), None)
        }
    };
    Sites::open(home, forced)
}

/// The Crust folder and site for one site folder: its parent, and its name.
pub fn sites_for_folder(folder: &std::path::Path) -> (PathBuf, Option<String>) {
    let home = folder.parent().map(PathBuf::from).unwrap_or_else(|| PathBuf::from("."));
    (home, folder.file_name().map(|n| n.to_string_lossy().into_owned()))
}

/// F055: `CRUST_SELF_CHECK=1` runs src/self_check.js in the window once the
/// builder has loaded, prints its report and quits: 0 if every check passed.
const SELF_CHECK: &str = include_str!("self_check.js");

fn self_check_on() -> bool {
    std::env::var_os("CRUST_SELF_CHECK").is_some_and(|v| v == "1")
}

/// Whether a self-check report says everything worked.
pub fn self_check_passed(report: &str) -> bool {
    let Ok(value) = serde_json::from_str::<serde_json::Value>(report) else { return false };
    let errors = value["errors"].as_array().is_some_and(|e| e.is_empty());
    let checks = value["checks"].as_object();
    errors && checks.is_some_and(|c| !c.is_empty() && c.values().all(|v| v == "ok"))
}

#[tauri::command]
fn self_check_report<R: Runtime>(app: tauri::AppHandle<R>, report: String) {
    if !self_check_on() {
        return;
    }
    println!("{report}");
    app.exit(if self_check_passed(&report) { 0 } else { 1 });
}

/// Starts the app.
pub fn run() {
    let mut context = tauri::generate_context!();
    let slot = SiteSlot::default();
    let builder_assets = context.set_assets(Box::new(NoAssets));
    context.set_assets(Box::new(SiteAssets::new(builder_assets, slot.clone())));

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .setup(move |app| {
            let sites = Arc::new(choose_sites(app)?);
            let _ = slot.set(sites.clone());
            app.manage(AppSites(sites));
            let cache = app.path().app_cache_dir().unwrap_or_else(|_| std::env::temp_dir().join("crust"));
            app.manage(Builds::new(cache.join("site-build")));
            Ok(())
        })
        .on_page_load(|webview, payload| {
            if self_check_on() && payload.event() == tauri::webview::PageLoadEvent::Finished {
                let _ = webview.eval(SELF_CHECK);
            }
        })
        .invoke_handler(tauri::generate_handler![site_info, site_read, site_write, site_remove, site_list, site_build, site_preview, site_export, site_export_replace, site_show_export, sites_list, sites_deleted, sites_create, sites_rename, sites_duplicate, sites_delete, sites_restore, sites_open, self_check_report])
        .run(context)
        .expect("Crust couldn't start");
}

/// Stands in for a moment while the builder's files are wrapped.
struct NoAssets;

impl<R: Runtime> tauri::Assets<R> for NoAssets {
    fn get(&self, _key: &AssetKey) -> Option<Cow<'_, [u8]>> {
        None
    }
    fn iter(&self) -> Box<AssetsIter<'_>> {
        Box::new(std::iter::empty())
    }
    fn csp_hashes(&self, _html_path: &AssetKey) -> Box<dyn Iterator<Item = CspHash<'_>> + '_> {
        Box::new(std::iter::empty())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn decodes_encoded_paths() {
        assert_eq!(percent_decode("content%2Fpages%2Fabout.json").as_deref(), Some("content/pages/about.json"));
        assert_eq!(percent_decode("content/media/caf%C3%A9.jpg").as_deref(), Some("content/media/café.jpg"));
        assert_eq!(percent_decode("plain").as_deref(), Some("plain"));
        assert_eq!(percent_decode("bad%2"), None);
        assert_eq!(percent_decode("bad%zz"), None);
        assert_eq!(percent_decode("%FF"), None);
    }

    #[test]
    fn photos_come_from_the_site_folder() {
        let dir = tempfile::tempdir().unwrap();
        let site = SiteFolder::new(dir.path());
        site.write("content/media/harbour.jpg", b"jpeg bytes").unwrap();
        site.write("content/site.json", b"{}").unwrap();
        assert_eq!(site_photo(&site, "/media/harbour.jpg").unwrap(), b"jpeg bytes");
        assert_eq!(site_photo(&site, "/media/missing.jpg"), None);
        // Only photos: the site's other files can't be fetched this way.
        assert_eq!(site_photo(&site, "/content/site.json"), None);
        assert_eq!(site_photo(&site, "/media/../site.json"), None);
    }

    #[test]
    fn self_check_passes_only_when_everything_worked() {
        assert!(self_check_passed(r#"{"checks":{"a":"ok","b":"ok"},"errors":[]}"#));
        assert!(!self_check_passed(r#"{"checks":{"a":"ok","b":"failed: no"},"errors":[]}"#));
        assert!(!self_check_passed(r#"{"checks":{"a":"ok"},"errors":["boom"]}"#));
        assert!(!self_check_passed(r#"{"checks":{},"errors":[]}"#));
        assert!(!self_check_passed("not json"));
    }

    #[test]
    fn site_info_names_the_folder() {
        let dir = tempfile::tempdir().unwrap();
        let sites = Sites::open(dir.path().join("Crust"), Some("Harbour".into())).unwrap();
        let info = site_info_of(&sites);
        assert_eq!(info.id, "Harbour");
        assert_eq!(info.folder, dir.path().join("Crust/Harbour").display().to_string());
        let value = serde_json::to_value(&info).unwrap();
        assert!(value.get("folder").is_some() && value.get("id").is_some());
    }

    #[test]
    fn a_given_site_folder_opens_with_its_neighbours() {
        let (home, id) = sites_for_folder(std::path::Path::new("/Users/hosni/Documents/Crust/Harbour"));
        assert_eq!(home, PathBuf::from("/Users/hosni/Documents/Crust"));
        assert_eq!(id.as_deref(), Some("Harbour"));
    }

    #[test]
    fn photos_follow_the_open_site() {
        let dir = tempfile::tempdir().unwrap();
        let sites = Sites::open(dir.path().join("Crust"), None).unwrap();
        sites.current().write("content/media/a.jpg", b"first").unwrap();
        let other = sites.create("Other").unwrap();
        sites.folder(&other).unwrap().write("content/media/a.jpg", b"second").unwrap();
        assert_eq!(site_photo(&sites.current(), "/media/a.jpg").unwrap(), b"first");
        sites.switch(&other).unwrap();
        assert_eq!(site_photo(&sites.current(), "/media/a.jpg").unwrap(), b"second");
    }

    #[test]
    fn switching_sites_forgets_the_last_export() {
        let builds = Builds::new(PathBuf::from("/tmp/x"));
        *builds.last_export.lock().unwrap() = Some(PathBuf::from("/tmp/y"));
        *builds.pending_export.lock().unwrap() = Some(PathBuf::from("/tmp/z"));
        builds.forget_exports();
        assert!(builds.last_export.lock().unwrap().is_none() && builds.pending_export.lock().unwrap().is_none());
    }
}

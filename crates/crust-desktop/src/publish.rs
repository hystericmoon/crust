//! Publish on your computer (F056): the finished site, built inside the app.
//!
//! The builder renders the pages (the same renderer the GitHub publish
//! pipeline runs, `packages/render/src/site.ts`) and hands them here. This
//! side does what the pipeline does after rendering, with the same code:
//! crust-publish's checks, sitemap, robots.txt, redirects and resized
//! photos, then the search index (Pagefind as a library). The result is a
//! plain folder that can be exported or previewed in a browser.

use crust_publish::{Checks, finish, load_redirects, publish_media, search::build_search_index};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};

use crate::site::SiteFolder;

/// One rendered file from the builder: where it goes, and its text.
#[derive(Deserialize, Debug, Clone)]
pub struct RenderedFile {
    pub path: String,
    pub content: String,
}

/// What a build made, for the Publish card.
#[derive(Serialize, Debug, Default, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct BuildReport {
    pub pages: usize,
    pub photos: usize,
    /// Pages in the search index.
    pub searchable: usize,
    pub redirects: usize,
    /// Problems that would stop a publish, one sentence each (previews only:
    /// an export stops on them instead).
    pub problems: Vec<String>,
}

/// Builds the finished site into `out`, replacing what was there only once
/// the new one is complete. `checks` says whether problems stop it.
pub fn build_site(site: &SiteFolder, files: &[RenderedFile], base_url: &str, checks: Checks, out: &Path) -> Result<BuildReport, String> {
    let fail = |e: anyhow::Error| format!("{e:#}");
    let staging = sibling(out, "building");
    remove_dir(&staging)?;
    // The same path rules as the site folder: nothing lands outside.
    let target = SiteFolder::new(&staging);
    for file in files {
        target.write(&file.path, file.content.as_bytes()).map_err(|e| e.to_string())?;
    }
    fs::create_dir_all(&staging).map_err(|e| format!("Couldn't make the site folder: {e}"))?;
    let photos = publish_media(&site.root().join("content").join("media"), &staging).map_err(fail)?;
    let redirects_file = site.root().join("content").join("redirects.json");
    let redirects = if redirects_file.is_file() { load_redirects(&redirects_file).map_err(fail)? } else { Vec::new() };
    let result = finish(&staging, base_url, &redirects, checks);
    let (report, issues) = match result {
        Ok(done) => done,
        Err(e) => {
            let _ = fs::remove_dir_all(&staging);
            return Err(fail(e));
        }
    };
    let searchable = build_search_index(&staging).map_err(fail)?;
    remove_dir(out)?;
    fs::rename(&staging, out).map_err(|e| format!("Couldn't put the finished site in place: {e}"))?;
    Ok(BuildReport {
        pages: report.pages.len(),
        photos: photos.photos,
        searchable,
        redirects: report.redirects.len(),
        problems: issues.iter().map(|i| format!("Page {i}")).collect(),
    })
}

/// `…/site` → `…/site-building`.
fn sibling(path: &Path, suffix: &str) -> PathBuf {
    let mut name = path.file_name().map(|n| n.to_os_string()).unwrap_or_default();
    name.push(format!("-{suffix}"));
    path.with_file_name(name)
}

fn remove_dir(path: &Path) -> Result<(), String> {
    match fs::remove_dir_all(path) {
        Ok(()) => Ok(()),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(()),
        Err(e) => Err(format!("Couldn't clear {}: {e}", path.display())),
    }
}

/// The folder an export goes into: "<Site name> website" inside the folder
/// the person picked. Characters Mac or Windows don't allow in names are
/// left out.
pub fn export_folder(parent: &Path, site_name: &str) -> PathBuf {
    let clean: String = site_name
        .chars()
        .filter(|c| !c.is_control() && !matches!(c, '/' | '\\' | ':' | '*' | '?' | '"' | '<' | '>' | '|'))
        .take(60)
        .collect();
    let clean = clean.trim().trim_matches('.').trim();
    let name = if clean.is_empty() { "My site" } else { clean };
    parent.join(format!("{name} website"))
}

/// What happened to an export.
#[derive(Debug, PartialEq, Eq)]
pub enum Exported {
    Done(PathBuf),
    /// The folder is already there and holds files: ask before replacing it.
    Exists(PathBuf),
}

/// True for a folder an earlier export made (or another static site):
/// it has a home page and a sitemap. Only those are ever replaced.
pub fn looks_like_export(folder: &Path) -> bool {
    folder.join("index.html").is_file() && folder.join("sitemap.xml").is_file()
}

fn is_empty_dir(folder: &Path) -> bool {
    fs::read_dir(folder).is_ok_and(|mut entries| entries.next().is_none())
}

/// Copies the finished site in `build` to `target`. An existing folder with
/// files in it is replaced only with `replace`, and only if it looks like
/// an earlier export; anything else is never deleted.
pub fn export_site(build: &Path, target: &Path, replace: bool) -> Result<Exported, String> {
    if !looks_like_export(build) {
        return Err("There's no finished site to export yet. Try again.".into());
    }
    let occupied = target.exists() && !is_empty_dir(target);
    if occupied && !replace {
        return Ok(Exported::Exists(target.to_path_buf()));
    }
    if occupied && !looks_like_export(target) {
        return Err(format!("{} holds other files, so Crust won't replace it. Choose another place.", target.display()));
    }
    let staging = sibling(target, "exporting");
    remove_dir(&staging)?;
    copy_dir(build, &staging).map_err(|e| {
        let _ = fs::remove_dir_all(&staging);
        format!("Couldn't write the site to {}: {e}", target.display())
    })?;
    if target.exists() {
        fs::remove_dir_all(target).map_err(|e| format!("Couldn't replace {}: {e}", target.display()))?;
    }
    fs::rename(&staging, target).map_err(|e| format!("Couldn't finish the export to {}: {e}", target.display()))?;
    Ok(Exported::Done(target.to_path_buf()))
}

fn copy_dir(from: &Path, to: &Path) -> std::io::Result<()> {
    fs::create_dir_all(to)?;
    for entry in fs::read_dir(from)? {
        let entry = entry?;
        let dest = to.join(entry.file_name());
        if entry.file_type()?.is_dir() {
            copy_dir(&entry.path(), &dest)?;
        } else {
            fs::copy(entry.path(), dest)?;
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    const PAGE: &str = "<!doctype html><html lang=\"en\"><head><title>Home</title><meta name=\"description\" content=\"The home page.\"></head>\
        <body><main data-pagefind-body><h1>Fresh bread</h1><p>Sourdough every morning.</p></main></body></html>";

    fn file(path: &str, content: &str) -> RenderedFile {
        RenderedFile { path: path.into(), content: content.into() }
    }

    fn folders() -> (tempfile::TempDir, SiteFolder, PathBuf) {
        let dir = tempfile::tempdir().unwrap();
        let site = SiteFolder::new(dir.path().join("My site"));
        site.write("content/site.json", b"{}").unwrap();
        (dir, site.clone(), site.root().parent().unwrap().join("build"))
    }

    #[test]
    fn builds_a_finished_site() {
        let (_dir, site, out) = folders();
        site.write("content/redirects.json", br#"[{"from":"/old","to":"/"}]"#).unwrap();
        let files = [file("index.html", PAGE), file("about/index.html", &PAGE.replace("Home", "About")), file("404.html", PAGE)];
        let report = build_site(&site, &files, "https://bakery.example", Checks::Stop, &out).unwrap();
        assert_eq!(report, BuildReport { pages: 2, photos: 0, searchable: 3, redirects: 1, problems: vec![] });
        assert!(fs::read_to_string(out.join("sitemap.xml")).unwrap().contains("https://bakery.example/about/"));
        assert!(out.join("robots.txt").is_file());
        assert!(fs::read_to_string(out.join("_redirects")).unwrap().contains("/old"));
        assert!(out.join("pagefind/pagefind.js").is_file());
        assert!(!sibling(&out, "building").exists());
    }

    #[test]
    fn copies_photos_with_resized_copies() {
        let (_dir, site, out) = folders();
        let mut png = Vec::new();
        image::RgbImage::from_pixel(1000, 500, image::Rgb([200, 120, 40]))
            .write_to(&mut std::io::Cursor::new(&mut png), image::ImageFormat::Png)
            .unwrap();
        site.write("content/media/harbour.png", &png).unwrap();
        let page = PAGE.replace("</h1>", "</h1><img src=\"/media/harbour.png\" alt=\"Boats\">");
        let report = build_site(&site, &[file("index.html", &page)], "https://a.dev", Checks::Stop, &out).unwrap();
        assert_eq!(report.photos, 1);
        assert!(out.join("media/harbour.png").is_file());
        assert!(out.join("media/harbour-480w.png").is_file());
        assert!(out.join("media/harbour-960w.png").is_file());
    }

    #[test]
    fn problems_stop_an_export_but_a_preview_lists_them() {
        let (_dir, site, out) = folders();
        let bad = PAGE.replace("<meta name=\"description\" content=\"The home page.\">", "");
        let files = [file("index.html", &bad)];
        let err = build_site(&site, &files, "https://a.dev", Checks::Stop, &out).unwrap_err();
        assert!(err.starts_with("Nothing was published."), "{err}");
        assert!(!out.exists());
        let report = build_site(&site, &files, "https://a.dev", Checks::Report, &out).unwrap();
        assert_eq!(report.problems.len(), 1);
        assert!(report.problems[0].starts_with("Page /:"), "{:?}", report.problems);
        assert!(out.join("index.html").is_file());
    }

    #[test]
    fn a_failed_build_keeps_the_previous_one() {
        let (_dir, site, out) = folders();
        build_site(&site, &[file("index.html", PAGE)], "https://a.dev", Checks::Stop, &out).unwrap();
        let bad = PAGE.replace("<title>Home</title>", "");
        assert!(build_site(&site, &[file("index.html", &bad)], "https://a.dev", Checks::Stop, &out).is_err());
        assert!(fs::read_to_string(out.join("index.html")).unwrap().contains("<title>Home</title>"));
    }

    #[test]
    fn rendered_files_stay_inside_the_build() {
        let (dir, site, out) = folders();
        for bad in ["../escape.html", "/etc/x.html", "a\\b.html"] {
            let err = build_site(&site, &[file("index.html", PAGE), file(bad, PAGE)], "https://a.dev", Checks::Stop, &out).unwrap_err();
            assert!(err.contains("outside the site folder"), "{bad}: {err}");
        }
        assert!(!dir.path().join("escape.html").exists());
    }

    #[test]
    fn export_folder_is_named_after_the_site() {
        let parent = Path::new("/Users/hosni/Desktop");
        assert_eq!(export_folder(parent, "Harbour Bakery"), parent.join("Harbour Bakery website"));
        assert_eq!(export_folder(parent, "A/B: \"C\"?"), parent.join("AB C website"));
        assert_eq!(export_folder(parent, " .. "), parent.join("My site website"));
    }

    #[test]
    fn exports_and_asks_before_replacing() {
        let (dir, site, out) = folders();
        build_site(&site, &[file("index.html", PAGE)], "https://a.dev", Checks::Stop, &out).unwrap();
        let target = export_folder(dir.path(), "Bakery");
        assert_eq!(export_site(&out, &target, false).unwrap(), Exported::Done(target.clone()));
        assert!(target.join("pagefind/pagefind.js").is_file());
        // A second export finds the first one there and asks.
        assert_eq!(export_site(&out, &target, false).unwrap(), Exported::Exists(target.clone()));
        fs::write(target.join("stale.html"), "old").unwrap();
        assert_eq!(export_site(&out, &target, true).unwrap(), Exported::Done(target.clone()));
        assert!(!target.join("stale.html").exists(), "replacing leaves no old files behind");
        // An empty folder is simply used.
        let empty = dir.path().join("Empty website");
        fs::create_dir_all(&empty).unwrap();
        assert_eq!(export_site(&out, &empty, false).unwrap(), Exported::Done(empty.clone()));
    }

    #[test]
    fn never_replaces_a_folder_that_isnt_a_site() {
        let (dir, site, out) = folders();
        build_site(&site, &[file("index.html", PAGE)], "https://a.dev", Checks::Stop, &out).unwrap();
        let target = dir.path().join("Bakery website");
        fs::create_dir_all(&target).unwrap();
        fs::write(target.join("taxes.pdf"), "keep me").unwrap();
        assert_eq!(export_site(&out, &target, false).unwrap(), Exported::Exists(target.clone()));
        let err = export_site(&out, &target, true).unwrap_err();
        assert!(err.contains("won't replace it"), "{err}");
        assert_eq!(fs::read_to_string(target.join("taxes.pdf")).unwrap(), "keep me");
    }

    #[test]
    fn nothing_to_export_before_a_build() {
        let dir = tempfile::tempdir().unwrap();
        let err = export_site(&dir.path().join("none"), &dir.path().join("x website"), false).unwrap_err();
        assert!(err.contains("no finished site"), "{err}");
    }
}

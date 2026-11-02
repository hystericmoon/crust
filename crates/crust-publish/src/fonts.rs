//! Bundled fonts (F070): copies the font files a site's pages point to.
//!
//! Pages name them as `/fonts/<name>.woff2` (in their @font-face rules and
//! preload links). Only those files are copied, from wherever the fonts are
//! kept: `packages/blocks/fonts` for the publish pipeline, the app's own
//! files in the desktop app. The fonts' licence (SIL OFL 1.1) goes with
//! them as `/fonts/LICENSE.txt`.

use anyhow::{Context, Result, bail};
use std::collections::BTreeSet;
use std::fs;
use std::path::Path;
use walkdir::WalkDir;

/// What a font copy did.
#[derive(Debug, Default, PartialEq, Eq)]
pub struct FontReport {
    /// Font files copied, by name.
    pub files: Vec<String>,
}

/// The font files the site's pages refer to, sorted, without repeats.
pub fn font_refs(site_dir: &Path) -> Result<BTreeSet<String>> {
    let mut names = BTreeSet::new();
    for entry in WalkDir::new(site_dir).into_iter().filter_map(|e| e.ok()) {
        let path = entry.path();
        if !entry.file_type().is_file() || path.extension().and_then(|e| e.to_str()) != Some("html") {
            continue;
        }
        let html = fs::read_to_string(path).with_context(|| format!("couldn't read {}", path.display()))?;
        collect(&html, &mut names);
    }
    Ok(names)
}

/// Finds `/fonts/<name>.woff2` with a plain name (lowercase letters, digits, dashes).
fn collect(text: &str, names: &mut BTreeSet<String>) {
    let mut rest = text;
    while let Some(at) = rest.find("/fonts/") {
        let after = &rest[at + "/fonts/".len()..];
        let name: String = after.chars().take_while(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || *c == '-').collect();
        if !name.is_empty() && after[name.len()..].starts_with(".woff2") {
            names.insert(format!("{name}.woff2"));
        }
        rest = after;
    }
}

/// Copies the fonts the pages use into `<site_dir>/fonts/`, plus the licence.
/// `read` returns a file's bytes by name (or None when Crust doesn't have it,
/// which stops the publish: the page would show the wrong font).
pub fn publish_fonts(site_dir: &Path, read: &dyn Fn(&str) -> Option<Vec<u8>>) -> Result<FontReport> {
    let names = font_refs(site_dir)?;
    if names.is_empty() {
        return Ok(FontReport::default());
    }
    let out = site_dir.join("fonts");
    fs::create_dir_all(&out).with_context(|| format!("couldn't make {}", out.display()))?;
    for name in &names {
        let Some(bytes) = read(name) else {
            bail!("The font file {name} isn't in this copy of Crust. Pick the font again in Site settings → Typography, or update Crust.");
        };
        fs::write(out.join(name), bytes).with_context(|| format!("couldn't write fonts/{name}"))?;
    }
    if let Some(licence) = read("LICENSE.txt") {
        fs::write(out.join("LICENSE.txt"), licence).context("couldn't write fonts/LICENSE.txt")?;
    }
    Ok(FontReport { files: names.into_iter().collect() })
}

/// Reads font files from a folder (the publish pipeline: packages/blocks/fonts).
pub fn folder_fonts(dir: &Path) -> impl Fn(&str) -> Option<Vec<u8>> + '_ {
    move |name: &str| {
        if name.contains('/') || name.contains('\\') || name.starts_with('.') {
            return None;
        }
        fs::read(dir.join(name)).ok()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp(name: &str) -> std::path::PathBuf {
        let dir = std::env::temp_dir().join(format!("crust-fonts-{name}-{}", std::process::id()));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    const PAGE: &str = r#"<html><head><link rel="preload" href="/fonts/fraunces-latin.woff2" as="font"><style>
@font-face { src: url(/fonts/fraunces-latin.woff2) format("woff2"); }
@font-face { src: url(/fonts/fraunces-latin-ext-italic.woff2) format("woff2"); }
@font-face { src: url(/fonts/../secret.woff2); }
</style></head><body><a href="/fonts/">Fonts</a></body></html>"#;

    #[test]
    fn finds_only_plain_font_names() {
        let mut names = BTreeSet::new();
        collect(PAGE, &mut names);
        assert_eq!(names.into_iter().collect::<Vec<_>>(), vec!["fraunces-latin-ext-italic.woff2", "fraunces-latin.woff2"]);
    }

    #[test]
    fn copies_the_fonts_pages_use_and_the_licence() {
        let src = temp("src");
        fs::write(src.join("fraunces-latin.woff2"), b"A").unwrap();
        fs::write(src.join("fraunces-latin-ext-italic.woff2"), b"B").unwrap();
        fs::write(src.join("geist-latin.woff2"), b"unused").unwrap();
        fs::write(src.join("LICENSE.txt"), b"OFL").unwrap();
        let site = temp("site");
        fs::create_dir_all(site.join("about")).unwrap();
        fs::write(site.join("index.html"), PAGE).unwrap();
        fs::write(site.join("about/index.html"), PAGE).unwrap();
        let report = publish_fonts(&site, &folder_fonts(&src)).unwrap();
        assert_eq!(report.files, vec!["fraunces-latin-ext-italic.woff2", "fraunces-latin.woff2"]);
        assert_eq!(fs::read(site.join("fonts/fraunces-latin.woff2")).unwrap(), b"A");
        assert_eq!(fs::read(site.join("fonts/LICENSE.txt")).unwrap(), b"OFL");
        assert!(!site.join("fonts/geist-latin.woff2").exists());
    }

    #[test]
    fn a_site_without_bundled_fonts_gets_no_fonts_folder() {
        let site = temp("none");
        fs::write(site.join("index.html"), "<html><body>Hi</body></html>").unwrap();
        assert_eq!(publish_fonts(&site, &|_| None).unwrap(), FontReport::default());
        assert!(!site.join("fonts").exists());
    }

    #[test]
    fn a_missing_font_stops_with_a_message() {
        let site = temp("missing");
        fs::write(site.join("index.html"), PAGE).unwrap();
        let err = publish_fonts(&site, &|_| None).unwrap_err().to_string();
        assert!(err.contains("isn't in this copy of Crust"), "{err}");
    }

    #[test]
    fn folder_reader_stays_in_its_folder() {
        let src = temp("fence");
        let read = folder_fonts(&src);
        assert!(read("../Cargo.toml").is_none());
        assert!(read(".hidden").is_none());
    }
}

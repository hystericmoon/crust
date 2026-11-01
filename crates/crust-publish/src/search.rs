//! The site's search index (F039), built with Pagefind as a library (F056).
//!
//! The GitHub publish pipeline runs the Pagefind command (`npx pagefind
//! --site dist/site`); the desktop app has no Node, so it calls the same
//! Pagefind version here. Both index each page's `<main data-pagefind-body>`
//! and write the index to `<site>/pagefind/`.

use anyhow::{Context, Result, anyhow};
use pagefind::api::PagefindIndex;
use std::path::Path;

/// Builds the search index for a finished site folder; returns how many
/// pages it holds.
pub fn build_search_index(site_dir: &Path) -> Result<usize> {
    let site = site_dir.to_string_lossy().into_owned();
    let out = site_dir.join("pagefind").to_string_lossy().into_owned();
    // Pagefind is async. Its own runtime on its own thread, so this works
    // from anywhere, including inside the app's runtime.
    std::thread::scope(|scope| {
        scope
            .spawn(move || -> Result<usize> {
                let runtime = tokio::runtime::Builder::new_multi_thread().enable_all().build()?;
                runtime.block_on(async move {
                    let mut index = PagefindIndex::new(None).map_err(|e| anyhow!("{e}"))?;
                    let pages = index.add_directory(site, None).await.map_err(|e| anyhow!("{e}"))?;
                    index.write_files(Some(out)).await.map_err(|e| anyhow!("{e}"))?;
                    Ok(pages)
                })
            })
            .join()
            .map_err(|_| anyhow!("Building the search index stopped unexpectedly."))?
    })
    .context("Couldn't build the site search index")
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    #[test]
    fn indexes_the_page_bodies() {
        let dir = tempfile::tempdir().unwrap();
        let page = |title: &str, words: &str| {
            format!("<!doctype html><html lang=\"en\"><head><title>{title}</title></head><body><header>Menu</header><main data-pagefind-body><h1>{title}</h1><p>{words}</p></main></body></html>")
        };
        fs::write(dir.path().join("index.html"), page("Home", "Fresh sourdough every morning")).unwrap();
        fs::create_dir_all(dir.path().join("about")).unwrap();
        fs::write(dir.path().join("about/index.html"), page("About", "A small bakery by the harbour")).unwrap();
        assert_eq!(build_search_index(dir.path()).unwrap(), 2);
        let bundle = dir.path().join("pagefind");
        for file in ["pagefind.js", "pagefind-entry.json", "pagefind-ui.js", "pagefind-ui.css"] {
            assert!(bundle.join(file).is_file(), "{file} missing");
        }
        let entry = fs::read_to_string(bundle.join("pagefind-entry.json")).unwrap();
        assert!(entry.contains("\"en\""), "{entry}");
        // Same search format as the Pagefind command the publish pipeline runs.
        assert!(entry.contains("\"version\":\"1.5.2\""), "{entry}");
    }
}

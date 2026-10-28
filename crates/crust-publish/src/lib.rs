//! Crust publish engine.
//!
//! Takes a folder of rendered HTML pages and finishes it into a deployable
//! static site: `sitemap.xml`, `robots.txt`, and (in later features)
//! validation, image optimisation and the search index.

use anyhow::{Context, Result, bail};
use std::fs;
use std::path::Path;
use walkdir::WalkDir;

/// What a publish run produced, for the summary printed to the log.
#[derive(Debug, PartialEq, Eq)]
pub struct Report {
    pub pages: Vec<String>,
}

/// Checks the site's public address and removes any trailing slash.
pub fn normalize_base_url(input: &str) -> Result<String> {
    let url = input.trim().trim_end_matches('/');
    let rest = url
        .strip_prefix("https://")
        .or_else(|| url.strip_prefix("http://"));
    match rest {
        Some(host) if !host.is_empty() && !host.contains(char::is_whitespace) => Ok(url.to_string()),
        _ => bail!("The site address must look like https://example.com (got {input:?})"),
    }
}

/// Lists the URL path of every page in the site folder, sorted.
/// `index.html` → `/`, `about/index.html` → `/about/`, `x.html` → `/x.html`.
/// `404.html` is left out because it isn't a real page.
pub fn page_paths(site_dir: &Path) -> Result<Vec<String>> {
    if !site_dir.is_dir() {
        bail!("Site folder {} does not exist. Did the render step run?", site_dir.display());
    }
    let mut paths = Vec::new();
    for entry in WalkDir::new(site_dir).sort_by_file_name() {
        let entry = entry.with_context(|| format!("Couldn't read {}", site_dir.display()))?;
        if !entry.file_type().is_file() || entry.path().extension().is_none_or(|e| e != "html") {
            continue;
        }
        let rel = entry.path().strip_prefix(site_dir)?;
        let rel = rel
            .components()
            .map(|c| c.as_os_str().to_string_lossy().into_owned())
            .collect::<Vec<_>>()
            .join("/");
        if rel == "404.html" {
            continue;
        }
        let path = match rel.strip_suffix("index.html") {
            Some(dir) => format!("/{dir}"),
            None => format!("/{rel}"),
        };
        paths.push(path);
    }
    paths.sort();
    Ok(paths)
}

fn escape_xml(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&apos;")
}

/// Builds `sitemap.xml` for the given pages.
pub fn sitemap_xml(base_url: &str, paths: &[String]) -> String {
    let mut xml = String::from(
        "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n",
    );
    for path in paths {
        xml.push_str(&format!("  <url><loc>{}</loc></url>\n", escape_xml(&format!("{base_url}{path}"))));
    }
    xml.push_str("</urlset>\n");
    xml
}

/// Builds `robots.txt` pointing search engines at the sitemap.
pub fn robots_txt(base_url: &str) -> String {
    format!("User-agent: *\nAllow: /\n\nSitemap: {base_url}/sitemap.xml\n")
}

/// Runs the full publish step on a rendered site folder.
pub fn publish(site_dir: &Path, base_url: &str) -> Result<Report> {
    let base_url = normalize_base_url(base_url)?;
    let pages = page_paths(site_dir)?;
    if pages.is_empty() {
        bail!("No pages found in {}. Add at least one page before publishing.", site_dir.display());
    }
    fs::write(site_dir.join("sitemap.xml"), sitemap_xml(&base_url, &pages))
        .context("Couldn't write sitemap.xml")?;
    fs::write(site_dir.join("robots.txt"), robots_txt(&base_url)).context("Couldn't write robots.txt")?;
    Ok(Report { pages })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn base_url_is_normalised() {
        assert_eq!(normalize_base_url("https://a.dev/").unwrap(), "https://a.dev");
        assert_eq!(normalize_base_url(" http://a.dev ").unwrap(), "http://a.dev");
    }

    #[test]
    fn bad_base_urls_are_rejected() {
        for bad in ["", "a.dev", "ftp://a.dev", "https://", "https://a b.dev"] {
            assert!(normalize_base_url(bad).is_err(), "{bad:?} should be rejected");
        }
    }

    #[test]
    fn sitemap_lists_and_escapes_urls() {
        let xml = sitemap_xml("https://a.dev", &["/".into(), "/q&a/".into()]);
        assert!(xml.contains("<loc>https://a.dev/</loc>"));
        assert!(xml.contains("<loc>https://a.dev/q&amp;a/</loc>"));
        assert!(xml.starts_with("<?xml"));
        assert!(xml.trim_end().ends_with("</urlset>"));
    }

    #[test]
    fn robots_points_to_sitemap() {
        assert!(robots_txt("https://a.dev").contains("Sitemap: https://a.dev/sitemap.xml"));
    }
}

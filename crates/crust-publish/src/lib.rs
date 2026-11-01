//! Crust publish engine.
//!
//! Takes a folder of rendered HTML pages and finishes it into a deployable
//! static site: validation, `sitemap.xml`, `robots.txt`, resized copies of
//! library photos (F034), and with the `search` feature the search index
//! (Pagefind as a library, F056: the desktop app has no Node).

pub mod media;
pub mod redirects;
#[cfg(feature = "search")]
pub mod search;
pub mod validate;

use anyhow::{Context, Result, bail};
use std::fs;
use std::path::{Path, PathBuf};
use walkdir::WalkDir;

pub use redirects::{Redirect, load_redirects, plan_redirects};
pub use media::{MediaReport, publish_media};
pub use validate::{Issue, is_noindex, media_refs, validate_page};

/// What a publish run produced, for the summary printed to the log.
#[derive(Debug, PartialEq, Eq)]
pub struct Report {
    pub pages: Vec<String>,
    /// Old addresses that now redirect to a renamed page.
    pub redirects: Vec<String>,
    /// Old addresses left alone because a page lives there again.
    pub skipped_redirects: Vec<String>,
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
    Ok(page_files(site_dir)?.into_iter().map(|(path, _)| path).collect())
}

/// Like [`page_paths`], paired with each page's file.
fn page_files(site_dir: &Path) -> Result<Vec<(String, PathBuf)>> {
    if !site_dir.is_dir() {
        bail!("Site folder {} does not exist. Did the render step run?", site_dir.display());
    }
    let mut pages = Vec::new();
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
        pages.push((path, entry.into_path()));
    }
    pages.sort();
    Ok(pages)
}

/// Pages for sitemap.xml: all of them except those hidden from search engines (F036).
pub fn listed_pages(site_dir: &Path) -> Result<Vec<String>> {
    let mut listed = Vec::new();
    for (path, file) in page_files(site_dir)? {
        let html = fs::read_to_string(&file).with_context(|| format!("Couldn't read {}", file.display()))?;
        if !is_noindex(&html) {
            listed.push(path);
        }
    }
    Ok(listed)
}

/// Checks every page and returns all problems found, in page order.
pub fn validate_site(site_dir: &Path) -> Result<Vec<Issue>> {
    let mut issues = Vec::new();
    for (path, file) in page_files(site_dir)? {
        let html = fs::read_to_string(&file).with_context(|| format!("Couldn't read {}", file.display()))?;
        issues.extend(validate_page(&path, &html));
        // F034: every library photo a page shows must be in the site (copied by publish_media).
        let mut missing: Vec<String> = Vec::new();
        for file in media_refs(&html) {
            let original = media_original(&file);
            if !site_dir.join("media").join(&file).is_file() && !missing.contains(&original) {
                missing.push(original);
            }
        }
        issues.extend(missing.into_iter().map(|original| Issue {
            page: path.clone(),
            message: format!("The photo {original} isn't in the media library. Choose another photo for this image, or upload it again."),
        }));
    }
    Ok(issues)
}

/// `harbour-480w.jpg` → `harbour.jpg`, so a missing photo is named once, as the owner knows it.
fn media_original(file: &str) -> String {
    if let Some((stem, ext)) = file.rsplit_once('.')
        && let Some((base, width)) = stem.rsplit_once('-')
        && width.strip_suffix('w').is_some_and(|n| media::VARIANT_WIDTHS.iter().any(|w| w.to_string() == n))
    {
        return format!("{base}.{ext}");
    }
    file.to_string()
}

/// Plain-language summary of validation problems, one per line.
pub fn issues_message(issues: &[Issue]) -> String {
    let pages = issues.iter().map(|i| &i.page).collect::<std::collections::BTreeSet<_>>().len();
    let mut msg = format!(
        "Nothing was published. Fix {} on {} and publish again:",
        if issues.len() == 1 { "this problem".to_string() } else { format!("these {} problems", issues.len()) },
        if pages == 1 { "1 page".to_string() } else { format!("{pages} pages") },
    );
    for issue in issues {
        msg.push_str(&format!("\n  - Page {issue}"));
    }
    msg
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
    publish_with_redirects(site_dir, base_url, &[])
}

/// Like [`publish`], also writing `_redirects` for renamed pages (F015).
pub fn publish_with_redirects(site_dir: &Path, base_url: &str, redirects: &[Redirect]) -> Result<Report> {
    finish(site_dir, base_url, redirects, Checks::Stop).map(|(report, _)| report)
}

/// What to do when pages have problems.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Checks {
    /// Stop with every problem listed: nothing is finished (publishing, exporting).
    Stop,
    /// Finish the site anyway and return the problems (a preview, F056).
    Report,
}

/// Like [`publish_with_redirects`]; with [`Checks::Report`] the site is
/// finished even when pages have problems, and they're returned.
pub fn finish(site_dir: &Path, base_url: &str, redirects: &[Redirect], checks: Checks) -> Result<(Report, Vec<Issue>)> {
    let base_url = normalize_base_url(base_url)?;
    let pages = page_paths(site_dir)?;
    if pages.is_empty() {
        bail!("No pages found in {}. Add at least one page before publishing.", site_dir.display());
    }
    let issues = validate_site(site_dir)?;
    if !issues.is_empty() && checks == Checks::Stop {
        bail!(issues_message(&issues));
    }
    let plan = plan_redirects(redirects, &pages)?;
    let listed = listed_pages(site_dir)?;
    fs::write(site_dir.join("sitemap.xml"), sitemap_xml(&base_url, &listed))
        .context("Couldn't write sitemap.xml")?;
    fs::write(site_dir.join("robots.txt"), robots_txt(&base_url)).context("Couldn't write robots.txt")?;
    if !plan.file.is_empty() {
        fs::write(site_dir.join("_redirects"), &plan.file).context("Couldn't write _redirects")?;
    }
    Ok((Report { pages, redirects: plan.active, skipped_redirects: plan.skipped }, issues))
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
    fn a_preview_is_finished_with_its_problems_listed() {
        let dir = tempfile::tempdir().unwrap();
        // No meta description: a problem that stops publishing.
        fs::write(dir.path().join("index.html"), "<html lang=\"en\"><head><title>Home</title></head><body><main><h1>Hi</h1></main></body></html>").unwrap();
        assert!(finish(dir.path(), "https://a.dev", &[], Checks::Stop).is_err());
        assert!(!dir.path().join("sitemap.xml").exists(), "a stopped publish writes nothing");
        let (report, issues) = finish(dir.path(), "https://a.dev", &[], Checks::Report).unwrap();
        assert_eq!(report.pages, vec!["/"]);
        assert!(!issues.is_empty());
        assert!(dir.path().join("sitemap.xml").is_file());
    }

    #[test]
    fn robots_points_to_sitemap() {
        assert!(robots_txt("https://a.dev").contains("Sitemap: https://a.dev/sitemap.xml"));
    }
}

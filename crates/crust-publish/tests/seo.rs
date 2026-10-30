//! F036: pages hidden from search engines are published but left out of sitemap.xml.
use crust_publish::{is_noindex, publish};
use std::fs;

fn page(title: &str, extra: &str) -> String {
    format!("<!doctype html>\n<html lang=\"en\">\n<head>\n<title>{title}</title>\n<meta name=\"description\" content=\"{title}\">\n{extra}</head>\n<body><main><h1>{title}</h1></main></body>\n</html>\n")
}

#[test]
fn hidden_pages_leave_the_sitemap_but_still_publish() {
    let dir = tempfile::tempdir().unwrap();
    fs::write(dir.path().join("index.html"), page("Home", "")).unwrap();
    fs::create_dir_all(dir.path().join("thanks")).unwrap();
    fs::write(dir.path().join("thanks/index.html"), page("Thanks", "<meta name=\"robots\" content=\"noindex\">\n")).unwrap();
    let report = publish(dir.path(), "https://a.dev").unwrap();
    assert_eq!(report.pages, vec!["/".to_string(), "/thanks/".to_string()]);
    let sitemap = fs::read_to_string(dir.path().join("sitemap.xml")).unwrap();
    assert!(sitemap.contains("<loc>https://a.dev/</loc>"));
    assert!(!sitemap.contains("thanks"));
}

#[test]
fn finds_noindex_however_it_is_written() {
    assert!(is_noindex(r#"<meta name="robots" content="noindex">"#));
    assert!(is_noindex(r#"<META NAME="Robots" CONTENT="noindex, follow">"#));
    assert!(!is_noindex(r#"<meta name="robots" content="index">"#));
    assert!(!is_noindex(r#"<meta name="description" content="noindex">"#));
}

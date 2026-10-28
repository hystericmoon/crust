use crust_publish::{Report, page_paths, publish};
use std::fs;
use std::path::Path;

fn write(root: &Path, rel: &str, body: &str) {
    let path = root.join(rel);
    fs::create_dir_all(path.parent().unwrap()).unwrap();
    fs::write(path, body).unwrap();
}

#[test]
fn publish_writes_sitemap_and_robots() {
    let dir = tempfile::tempdir().unwrap();
    write(dir.path(), "index.html", "<h1>Home</h1>");
    write(dir.path(), "about/index.html", "<h1>About</h1>");
    write(dir.path(), "blog/first-post/index.html", "<h1>Post</h1>");
    write(dir.path(), "404.html", "<h1>Not found</h1>");

    let report = publish(dir.path(), "https://demo.pages.dev/").unwrap();
    assert_eq!(
        report,
        Report { pages: vec!["/".into(), "/about/".into(), "/blog/first-post/".into()] }
    );

    let sitemap = fs::read_to_string(dir.path().join("sitemap.xml")).unwrap();
    assert!(sitemap.contains("<loc>https://demo.pages.dev/about/</loc>"));
    assert!(!sitemap.contains("404"));

    let robots = fs::read_to_string(dir.path().join("robots.txt")).unwrap();
    assert!(robots.contains("Sitemap: https://demo.pages.dev/sitemap.xml"));
}

#[test]
fn publish_fails_clearly_without_pages() {
    let dir = tempfile::tempdir().unwrap();
    let err = publish(dir.path(), "https://demo.pages.dev").unwrap_err();
    assert!(err.to_string().contains("No pages found"));
}

#[test]
fn publish_fails_clearly_when_folder_is_missing() {
    let err = page_paths(Path::new("/definitely/not/here")).unwrap_err();
    assert!(err.to_string().contains("Did the render step run?"));
}

use crust_publish::{Redirect, Report, page_paths, publish, publish_with_redirects, validate_site};
use std::fs;
use std::path::Path;

fn write(root: &Path, rel: &str, body: &str) {
    let path = root.join(rel);
    fs::create_dir_all(path.parent().unwrap()).unwrap();
    fs::write(path, body).unwrap();
}

/// A complete page the way the renderer writes it.
fn page(title: &str, body: &str) -> String {
    format!(
        "<!doctype html>\n<html lang=\"en\">\n<head>\n<title>{title}</title>\n<meta name=\"description\" content=\"About {title}\">\n<style>h1 > a {{}}</style>\n</head>\n<body class=\"cr-page\">\n<main>{body}</main>\n</body>\n</html>\n"
    )
}

#[test]
fn publish_writes_sitemap_and_robots() {
    let dir = tempfile::tempdir().unwrap();
    write(dir.path(), "index.html", &page("Home", "<h1>Home</h1>"));
    write(dir.path(), "about/index.html", &page("About", "<h1>About</h1>"));
    write(dir.path(), "blog/first-post/index.html", &page("Post", "<h1>Post</h1>"));
    write(dir.path(), "404.html", "<h2>Not found</h2>");

    let report = publish(dir.path(), "https://demo.pages.dev/").unwrap();
    assert_eq!(
        report,
        Report {
            pages: vec!["/".into(), "/about/".into(), "/blog/first-post/".into()],
            redirects: vec![],
            skipped_redirects: vec![],
        }
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

#[test]
fn validate_stops_publish_and_lists_every_problem() {
    let dir = tempfile::tempdir().unwrap();
    write(dir.path(), "index.html", &page("Home", "<h1>Home</h1><img src=\"cat.jpg\">"));
    write(dir.path(), "about/index.html", &page("About", "<h2>About</h2><h4>Team</h4>"));
    write(dir.path(), "contact/index.html", &page("Contact", "<h1>Contact</h1>"));

    let issues = validate_site(dir.path()).unwrap();
    assert_eq!(issues.len(), 3, "{issues:?}");

    let err = publish(dir.path(), "https://demo.pages.dev").unwrap_err().to_string();
    assert!(err.starts_with("Nothing was published. Fix these 3 problems on 2 pages"), "{err}");
    assert!(err.contains("Page /: The image “cat.jpg” has no alt text"), "{err}");
    assert!(err.contains("Page /about/: The page has no main heading"), "{err}");
    assert!(err.contains("Page /about/: The heading “Team” jumps from H2 to H4"), "{err}");
    assert!(!err.contains("/contact/"), "{err}");
    assert!(!dir.path().join("sitemap.xml").exists(), "nothing should be written on failure");
}

#[test]
fn validate_message_is_singular_for_one_problem() {
    let dir = tempfile::tempdir().unwrap();
    write(dir.path(), "index.html", &page("", "<h1>Home</h1>"));
    let err = publish(dir.path(), "https://demo.pages.dev").unwrap_err().to_string();
    assert!(err.starts_with("Nothing was published. Fix this problem on 1 page and publish again:"), "{err}");
    assert!(err.contains("Page /: The page title is empty"), "{err}");
}

#[test]
fn publish_writes_redirects_for_renamed_pages() {
    let dir = tempfile::tempdir().unwrap();
    write(dir.path(), "index.html", &page("Home", "<h1>Home</h1>"));
    write(dir.path(), "about-us/index.html", &page("About", "<h1>About</h1>"));
    let redirects = vec![Redirect { from: "/about".into(), to: "/about-us".into() }];

    let report = publish_with_redirects(dir.path(), "https://demo.pages.dev", &redirects).unwrap();
    assert_eq!(report.redirects, vec!["/about"]);
    let file = fs::read_to_string(dir.path().join("_redirects")).unwrap();
    assert_eq!(file, "/about /about-us/ 301\n/about/ /about-us/ 301\n");
    // The sitemap only lists real pages.
    assert!(!fs::read_to_string(dir.path().join("sitemap.xml")).unwrap().contains("/about/<"));
}

#[test]
fn no_redirects_means_no_redirects_file() {
    let dir = tempfile::tempdir().unwrap();
    write(dir.path(), "index.html", &page("Home", "<h1>Home</h1>"));
    publish(dir.path(), "https://demo.pages.dev").unwrap();
    assert!(!dir.path().join("_redirects").exists());
}

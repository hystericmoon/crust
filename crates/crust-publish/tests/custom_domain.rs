//! F044: the sitemap and robots.txt use the site's own address.
use crust_publish::publish;
use std::fs;

#[test]
fn sitemap_and_robots_use_the_custom_domain() {
    let dir = tempfile::tempdir().unwrap();
    let page = "<!doctype html>\n<html lang=\"en\">\n<head>\n<title>Home</title>\n<meta name=\"description\" content=\"Home\">\n</head>\n<body><main><h1>Home</h1></main></body>\n</html>\n";
    fs::write(dir.path().join("index.html"), page).unwrap();
    publish(dir.path(), "https://studio.com/").unwrap();
    let sitemap = fs::read_to_string(dir.path().join("sitemap.xml")).unwrap();
    assert!(sitemap.contains("<loc>https://studio.com/</loc>"));
    let robots = fs::read_to_string(dir.path().join("robots.txt")).unwrap();
    assert!(robots.contains("Sitemap: https://studio.com/sitemap.xml"));
}

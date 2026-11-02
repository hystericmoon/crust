//! F034: library photos are copied into the site with resized copies, and
//! pages can't be published with a photo that isn't there. F081: each photo
//! and resized copy also gets AVIF and WebP copies, kept in a cache.
use crust_publish::{MediaReport, media_refs, publish_media, publish_media_cached, publish_with_redirects, validate_site};
use image::{ImageFormat, Rgb, RgbImage, Rgba, RgbaImage};
use std::fs;
use std::path::Path;

fn page(body: &str) -> String {
    format!(
        "<!doctype html>\n<html lang=\"en\">\n<head>\n<title>Home</title>\n<meta name=\"description\" content=\"Home\">\n</head>\n<body>\n<main><h1>Home</h1>{body}</main>\n</body>\n</html>\n"
    )
}

fn photo(dir: &Path, name: &str, width: u32, height: u32) {
    fs::create_dir_all(dir).unwrap();
    let path = dir.join(name);
    if name.ends_with(".png") {
        RgbaImage::from_pixel(width, height, Rgba([10, 20, 30, 128])).save_with_format(path, ImageFormat::Png).unwrap();
    } else {
        RgbImage::from_pixel(width, height, Rgb([200, 120, 40])).save_with_format(path, ImageFormat::Jpeg).unwrap();
    }
}

fn size(path: &Path) -> (u32, u32) {
    image::image_dimensions(path).unwrap()
}

#[test]
fn photos_get_resized_copies_smaller_than_themselves() {
    let content = tempfile::tempdir().unwrap();
    let site = tempfile::tempdir().unwrap();
    let media = content.path().join("media");
    photo(&media, "harbour.jpg", 2400, 1600);
    photo(&media, "logo.png", 600, 200);
    photo(&media, "tiny.jpg", 300, 300);
    fs::write(media.join("notes.txt"), "not a photo").unwrap();

    let report = publish_media(&media, site.path()).unwrap();
    // 3 photos + 4 resized copies; JPG and PNG each get AVIF and WebP copies.
    assert_eq!(report, MediaReport { photos: 3, copies: 4, modern: 14 });

    let out = site.path().join("media");
    assert_eq!(size(&out.join("harbour.jpg")), (2400, 1600));
    assert_eq!(size(&out.join("harbour-480w.jpg")), (480, 320));
    assert_eq!(size(&out.join("harbour-960w.jpg")), (960, 640));
    assert_eq!(size(&out.join("harbour-1440w.jpg")), (1440, 960));
    assert_eq!(size(&out.join("logo-480w.png")), (480, 160));
    // PNG copies keep their transparency.
    assert!(image::open(out.join("logo-480w.png")).unwrap().color().has_alpha());
    assert!(!out.join("logo-960w.png").exists());
    assert!(!out.join("tiny-480w.jpg").exists());
    assert!(!out.join("notes.txt").exists());

    // F081: AVIF and WebP copies, same size as what they copy.
    for file in ["harbour.jpg", "harbour-480w.jpg", "harbour-1440w.jpg", "logo.png", "logo-480w.png", "tiny.jpg"] {
        let avif = fs::read(out.join(format!("{file}.avif"))).unwrap();
        assert_eq!(&avif[4..12], b"ftypavif", "{file}.avif");
        let webp = out.join(format!("{file}.webp"));
        assert_eq!(size(&webp), size(&out.join(file)), "{file}.webp");
    }
    // The PNG's WebP keeps its transparency.
    assert!(image::open(out.join("logo-480w.png.webp")).unwrap().color().has_alpha());
    // A plain photo's copies are smaller than the JPEG.
    let jpg = fs::metadata(out.join("harbour.jpg")).unwrap().len();
    assert!(fs::metadata(out.join("harbour.jpg.avif")).unwrap().len() < jpg);
}

#[test]
fn a_webp_photo_gets_only_an_avif_copy() {
    let content = tempfile::tempdir().unwrap();
    let site = tempfile::tempdir().unwrap();
    fs::create_dir_all(content.path()).unwrap();
    RgbImage::from_pixel(600, 400, Rgb([30, 90, 160])).save_with_format(content.path().join("sea.webp"), ImageFormat::WebP).unwrap();
    let report = publish_media(content.path(), site.path()).unwrap();
    assert_eq!(report, MediaReport { photos: 1, copies: 1, modern: 2 });
    let out = site.path().join("media");
    assert!(out.join("sea.webp.avif").is_file() && out.join("sea-480w.webp.avif").is_file());
    assert!(!out.join("sea.webp.webp").exists());
}

#[test]
fn the_cache_reuses_copies_of_unchanged_photos() {
    let content = tempfile::tempdir().unwrap();
    let cache = tempfile::tempdir().unwrap();
    let cache = cache.path().join("photos");
    photo(content.path(), "harbour.jpg", 1000, 500);
    photo(content.path(), "old.jpg", 200, 100);

    let first = tempfile::tempdir().unwrap();
    let report = publish_media_cached(content.path(), first.path(), Some(&cache)).unwrap();
    assert_eq!(report, MediaReport { photos: 2, copies: 2, modern: 8 });
    let entries = |c: &Path| {
        let mut e: Vec<String> = fs::read_dir(c).unwrap().map(|e| e.unwrap().file_name().to_string_lossy().into_owned()).collect();
        e.sort();
        e
    };
    let made = entries(&cache);
    assert_eq!(made.len(), 2, "{made:?}");

    // Mark the cached AVIF so we can tell it was reused rather than made again.
    let entry = cache.join(made.iter().find(|e| e.starts_with("harbour.jpg-")).unwrap());
    fs::write(entry.join("harbour.jpg.avif"), b"from the cache").unwrap();
    fs::remove_file(content.path().join("old.jpg")).unwrap();

    let second = tempfile::tempdir().unwrap();
    let report = publish_media_cached(content.path(), second.path(), Some(&cache)).unwrap();
    assert_eq!(report, MediaReport { photos: 1, copies: 2, modern: 6 });
    let out = second.path().join("media");
    assert_eq!(fs::read(out.join("harbour.jpg.avif")).unwrap(), b"from the cache");
    assert!(out.join("harbour-960w.jpg.webp").is_file() && out.join("harbour-480w.jpg").is_file());
    // The photo that's gone leaves the cache.
    assert_eq!(entries(&cache).len(), 1);

    // A changed photo is encoded again.
    photo(content.path(), "harbour.jpg", 1000, 600);
    let third = tempfile::tempdir().unwrap();
    publish_media_cached(content.path(), third.path(), Some(&cache)).unwrap();
    assert_ne!(fs::read(third.path().join("media").join("harbour.jpg.avif")).unwrap(), b"from the cache");
    assert_eq!(size(&third.path().join("media").join("harbour-480w.jpg.webp")), (480, 288));
}

#[test]
fn no_media_folder_is_fine() {
    let site = tempfile::tempdir().unwrap();
    assert_eq!(publish_media(&site.path().join("nope"), site.path()).unwrap(), MediaReport::default());
}

#[test]
fn a_damaged_photo_stops_the_publish_with_its_name() {
    let content = tempfile::tempdir().unwrap();
    let site = tempfile::tempdir().unwrap();
    fs::write(content.path().join("broken.jpg"), b"\xff\xd8\xff not really").unwrap();
    let err = publish_media(content.path(), site.path()).unwrap_err();
    assert!(format!("{err:#}").contains("broken.jpg"), "{err:#}");
}

#[test]
fn finds_photos_in_src_and_srcset() {
    let html = r#"<img src="/media/a.jpg" srcset="/media/a-480w.jpg 480w, /media/a.jpg 2400w" alt="A"><img src="https://x.dev/b.jpg" alt="B">"#;
    assert_eq!(media_refs(html), vec!["a.jpg", "a-480w.jpg"]);
}

#[test]
fn finds_photos_in_picture_sources() {
    let html = r#"<picture><source type="image/avif" srcset="/media/a-480w.jpg.avif 480w, /media/a.jpg.avif 2400w"><img src="/media/a.jpg" alt="A"></picture>"#;
    assert_eq!(media_refs(html), vec!["a-480w.jpg.avif", "a.jpg.avif", "a.jpg"]);
}

#[test]
fn a_missing_avif_copy_names_the_photo() {
    let site = tempfile::tempdir().unwrap();
    let body = r#"<picture><source type="image/avif" srcset="/media/gone-480w.jpg.avif 480w"><img src="/media/gone.jpg" alt="Gone"></picture>"#;
    fs::write(site.path().join("index.html"), page(body)).unwrap();
    let issues = validate_site(site.path()).unwrap();
    assert_eq!(issues.len(), 1, "{issues:?}");
    assert!(issues[0].message.contains("The photo gone.jpg isn't"), "{}", issues[0].message);
}

#[test]
fn a_missing_photo_is_named_once_and_stops_the_publish() {
    let site = tempfile::tempdir().unwrap();
    let body = r#"<img src="/media/gone.jpg" srcset="/media/gone-480w.jpg 480w, /media/gone.jpg 1200w" alt="Gone">"#;
    fs::write(site.path().join("index.html"), page(body)).unwrap();
    let issues = validate_site(site.path()).unwrap();
    assert_eq!(issues.len(), 1, "{issues:?}");
    assert!(issues[0].message.contains("The photo gone.jpg isn't in the media library"));
    assert!(publish_with_redirects(site.path(), "https://a.dev", &[]).is_err());

    photo(&site.path().join("media"), "gone.jpg", 1200, 800);
    photo(&site.path().join("media"), "gone-480w.jpg", 480, 320);
    assert!(validate_site(site.path()).unwrap().is_empty());
}

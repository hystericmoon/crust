//! F034: library photos are copied into the site with resized copies, and
//! pages can't be published with a photo that isn't there.
use crust_publish::{MediaReport, media_refs, publish_media, publish_with_redirects, validate_site};
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
    assert_eq!(report, MediaReport { photos: 3, copies: 4 });

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

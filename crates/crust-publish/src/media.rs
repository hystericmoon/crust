//! Media library photos (F034): copies `content/media/` into the site and
//! makes the smaller copies that pages list in `srcset`, so phones download
//! small files. Widths and names match `packages/blocks/src/media.ts`.

use anyhow::{Context, Result};
use image::codecs::jpeg::JpegEncoder;
use image::imageops::FilterType;
use image::{DynamicImage, ImageFormat};
use std::fs;
use std::io::BufWriter;
use std::path::Path;

/// Widths of the resized copies; a photo only gets those smaller than itself.
pub const VARIANT_WIDTHS: [u32; 3] = [480, 960, 1440];

/// JPEG quality of the resized copies.
const JPEG_QUALITY: u8 = 80;

/// What the media step did, for the publish log.
#[derive(Debug, Default, PartialEq, Eq)]
pub struct MediaReport {
    pub photos: usize,
    pub copies: usize,
}

/// True for names the library writes: `harbour-at-dawn.jpg`.
pub fn is_media_file(name: &str) -> bool {
    let Some((stem, ext)) = name.rsplit_once('.') else { return false };
    matches!(ext, "jpg" | "png" | "webp")
        && !stem.is_empty()
        && stem.len() <= 80
        && stem.starts_with(|c: char| c.is_ascii_lowercase() || c.is_ascii_digit())
        && stem.chars().all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '-')
}

/// `harbour.jpg`, 480 → `harbour-480w.jpg`.
pub fn variant_file(file: &str, width: u32) -> String {
    match file.rsplit_once('.') {
        Some((stem, ext)) => format!("{stem}-{width}w.{ext}"),
        None => format!("{file}-{width}w"),
    }
}

/// Copies every library photo into `<site_dir>/media/` and writes its resized copies.
pub fn publish_media(media_dir: &Path, site_dir: &Path) -> Result<MediaReport> {
    let mut report = MediaReport::default();
    if !media_dir.is_dir() {
        return Ok(report);
    }
    let out = site_dir.join("media");
    fs::create_dir_all(&out).with_context(|| format!("Couldn't create {}", out.display()))?;
    let mut names: Vec<String> = fs::read_dir(media_dir)
        .with_context(|| format!("Couldn't read {}", media_dir.display()))?
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().is_ok_and(|t| t.is_file()))
        .map(|e| e.file_name().to_string_lossy().into_owned())
        .filter(|n| is_media_file(n))
        .collect();
    names.sort();
    for name in names {
        let source = media_dir.join(&name);
        fs::copy(&source, out.join(&name)).with_context(|| format!("Couldn't copy photo {name}"))?;
        report.photos += 1;
        report.copies += write_variants(&source, &out, &name)?;
    }
    Ok(report)
}

/// Writes the resized copies of one photo; returns how many.
fn write_variants(source: &Path, out: &Path, name: &str) -> Result<usize> {
    let img = image::ImageReader::open(source)
        .and_then(|r| r.with_guessed_format())
        .with_context(|| format!("Couldn't open photo {name}"))?
        .decode()
        .with_context(|| format!("The photo {name} is damaged. Delete it from the media library and upload it again."))?;
    let mut count = 0;
    for width in VARIANT_WIDTHS.into_iter().filter(|w| *w < img.width()) {
        let height = ((u64::from(img.height()) * u64::from(width) + u64::from(img.width()) / 2) / u64::from(img.width())).max(1) as u32;
        let small = img.resize_exact(width, height, FilterType::CatmullRom);
        let target = out.join(variant_file(name, width));
        save(&small, &target, name).with_context(|| format!("Couldn't write a resized copy of {name}"))?;
        count += 1;
    }
    Ok(count)
}

fn save(img: &DynamicImage, target: &Path, name: &str) -> Result<()> {
    let file = BufWriter::new(fs::File::create(target)?);
    if name.ends_with(".jpg") {
        // JPEG has no transparency; RGB keeps the encoder from refusing other layouts.
        img.to_rgb8().write_with_encoder(JpegEncoder::new_with_quality(file, JPEG_QUALITY))?;
    } else {
        let format = if name.ends_with(".png") { ImageFormat::Png } else { ImageFormat::WebP };
        let mut file = file;
        img.write_to(&mut file, format)?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn names_match_the_library() {
        assert!(is_media_file("harbour-at-dawn.jpg"));
        assert!(is_media_file("a-2.png"));
        for bad in ["Harbour.jpg", "x.svg", ".jpg", "-a.jpg", "a b.jpg", "../a.jpg", "a.jpeg"] {
            assert!(!is_media_file(bad), "{bad:?}");
        }
        assert_eq!(variant_file("harbour.jpg", 480), "harbour-480w.jpg");
    }
}

//! Media library photos (F034): copies `content/media/` into the site and
//! makes the smaller copies that pages list in `srcset`, so phones download
//! small files. F081 adds AVIF and WebP copies of the photo and of each
//! smaller copy, which pages offer first in `<picture>`. Widths and names
//! match `packages/blocks/src/media.ts`.

use anyhow::{Context, Result};
use image::codecs::jpeg::JpegEncoder;
use image::imageops::FilterType;
use image::{DynamicImage, ImageFormat};
use ravif::{Encoder as AvifEncoder, Img as AvifImg};
use std::fs;
use std::io::BufWriter;
use std::path::Path;
use std::sync::atomic::{AtomicUsize, Ordering};

/// Widths of the resized copies; a photo only gets those smaller than itself.
pub const VARIANT_WIDTHS: [u32; 3] = [480, 960, 1440];

/// JPEG quality of the resized copies.
const JPEG_QUALITY: u8 = 80;

/// AVIF quality (0–100). Photos at 60 look like the JPEGs at 80 and weigh about half.
const AVIF_QUALITY: f32 = 60.0;
/// rav1e speed (1 slow – 10 fast). At 10 a 2400 px photo and its smaller
/// copies take about a second; slower speeds saved only a few percent.
const AVIF_SPEED: u8 = 10;
/// Bump when the copies change (widths, qualities, formats), so cached copies are made again.
const COPIES_VERSION: u32 = 1;
/// Lossy WebP quality (0–100).
const WEBP_QUALITY: f32 = 78.0;

/// What the media step did, for the publish log.
#[derive(Debug, Default, PartialEq, Eq)]
pub struct MediaReport {
    pub photos: usize,
    pub copies: usize,
    /// F081: AVIF and WebP copies written.
    pub modern: usize,
}

/// The newer formats a photo gets copies in (F081), best first. A WebP
/// photo only gets AVIF: it's already WebP.
pub fn modern_formats(file: &str) -> &'static [&'static str] {
    if file.ends_with(".webp") { &["avif"] } else { &["avif", "webp"] }
}

/// `harbour-480w.jpg`, "avif" → `harbour-480w.jpg.avif`. Keeping the
/// original's extension means `harbour.jpg` and an uploaded `harbour.webp`
/// never share a copy's name.
pub fn modern_file(file: &str, format: &str) -> String {
    format!("{file}.{format}")
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
    publish_media_cached(media_dir, site_dir, None)
}

/// Like [`publish_media`], keeping each photo's copies in `cache` (F081): a
/// photo whose bytes haven't changed since the last publish gets its copies
/// from there instead of being encoded again. Copies of photos that are gone
/// are removed from the cache.
pub fn publish_media_cached(media_dir: &Path, site_dir: &Path, cache: Option<&Path>) -> Result<MediaReport> {
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
    if let Some(cache) = cache {
        fs::create_dir_all(cache).with_context(|| format!("Couldn't create {}", cache.display()))?;
    }

    // Photos are shared out between a few threads; each encoder also uses several.
    let workers = std::thread::available_parallelism().map_or(1, |n| n.get().div_ceil(2)).clamp(1, names.len().max(1));
    let next = AtomicUsize::new(0);
    let mut results: Vec<(usize, Result<Published>)> = std::thread::scope(|scope| {
        let handles: Vec<_> = (0..workers)
            .map(|_| {
                scope.spawn(|| {
                    let mut done = Vec::new();
                    loop {
                        let i = next.fetch_add(1, Ordering::Relaxed);
                        let Some(name) = names.get(i) else { break };
                        done.push((i, publish_one(media_dir, &out, name, cache)));
                    }
                    done
                })
            })
            .collect();
        handles.into_iter().flat_map(|h| h.join().expect("a photo thread stopped")).collect()
    });
    results.sort_by_key(|(i, _)| *i);
    let mut kept = Vec::new();
    for (_, result) in results {
        let (copies, modern, key) = result?;
        report.photos += 1;
        report.copies += copies;
        report.modern += modern;
        kept.push(key);
    }
    if let Some(cache) = cache {
        prune_cache(cache, &kept);
    }
    drop_missing_webp_sources(site_dir)?;
    Ok(report)
}

/// F081 review: a WebP copy that was skipped for being bigger than its JPEG
/// isn't in the site, so the pages' `<source type="image/webp">` must not
/// list it (a browser that picks that source doesn't fall back to the JPEG).
/// Listed copies that are gone are dropped from the `srcset`; a source left
/// with none is removed, so the `<img>` (the JPEG) is what shows.
fn drop_missing_webp_sources(site_dir: &Path) -> Result<()> {
    for entry in walkdir::WalkDir::new(site_dir).into_iter().filter_map(|e| e.ok()) {
        if !entry.file_type().is_file() || entry.path().extension().is_none_or(|e| e != "html") {
            continue;
        }
        let html = fs::read_to_string(entry.path()).with_context(|| format!("Couldn't read {}", entry.path().display()))?;
        let fixed = fix_webp_sources(&html, &|file| site_dir.join("media").join(file).is_file());
        if fixed != html {
            fs::write(entry.path(), fixed).with_context(|| format!("Couldn't write {}", entry.path().display()))?;
        }
    }
    Ok(())
}

/// The page with its WebP `<source>` tags limited to the copies `exists` knows.
fn fix_webp_sources(html: &str, exists: &dyn Fn(&str) -> bool) -> String {
    let mut out = String::with_capacity(html.len());
    let mut rest = html;
    while let Some(start) = rest.find("<source ") {
        out.push_str(&rest[..start]);
        let Some(len) = rest[start..].find('>') else { break };
        let tag = &rest[start..start + len + 1];
        rest = &rest[start + len + 1..];
        out.push_str(&limit_webp_source(tag, exists).unwrap_or_default());
    }
    out.push_str(rest);
    out
}

/// `Some(tag)` (maybe with a shorter srcset) to keep, `None` to remove it.
fn limit_webp_source(tag: &str, exists: &dyn Fn(&str) -> bool) -> Option<String> {
    if !tag.contains("type=\"image/webp\"") {
        return Some(tag.to_string());
    }
    let key = "srcSet=\"";
    let key = if tag.contains(key) { key } else { "srcset=\"" };
    let Some(at) = tag.find(key) else { return Some(tag.to_string()) };
    let from = at + key.len();
    let to = from + tag[from..].find('"')?;
    let kept: Vec<&str> = tag[from..to]
        .split(',')
        .map(str::trim)
        .filter(|c| c.split_whitespace().next().and_then(|u| u.strip_prefix("/media/")).is_none_or(exists))
        .collect();
    if kept.is_empty() {
        return None;
    }
    Some(format!("{}{}{}", &tag[..from], kept.join(", "), &tag[to..]))
}

/// One photo's resized copies, AVIF/WebP copies, and its cache entry's name.
type Published = (usize, usize, String);

/// Copies one photo in and writes (or fetches from the cache) its copies.
fn publish_one(media_dir: &Path, out: &Path, name: &str, cache: Option<&Path>) -> Result<Published> {
    let source = media_dir.join(name);
    let bytes = fs::read(&source).with_context(|| format!("Couldn't read photo {name}"))?;
    fs::write(out.join(name), &bytes).with_context(|| format!("Couldn't copy photo {name}"))?;
    let key = format!("{name}-{:016x}", fingerprint(&bytes));
    if let Some(entry) = cache.map(|c| c.join(&key))
        && let Some(counts) = from_cache(&entry, out)
    {
        return Ok((counts.0, counts.1, key));
    }
    let made = write_variants(&bytes, out, name)?;
    if let Some(cache) = cache {
        // A cache that can't be written only makes the next publish slower.
        let _ = to_cache(cache, &key, out, name);
    }
    Ok((made.0, made.1, key))
}

/// FNV-1a over the photo's bytes and the copies' settings: same photo, same copies.
fn fingerprint(bytes: &[u8]) -> u64 {
    let mut hash: u64 = 0xcbf2_9ce4_8422_2325;
    for b in COPIES_VERSION.to_le_bytes().iter().chain(bytes) {
        hash ^= u64::from(*b);
        hash = hash.wrapping_mul(0x0000_0100_0000_01b3);
    }
    hash
}

/// The copies a photo made, by name (resized and AVIF/WebP), that exist in `dir`.
fn made_files(dir: &Path, name: &str) -> Vec<String> {
    let mut files: Vec<String> = modern_formats(name).iter().map(|f| modern_file(name, f)).collect();
    for width in VARIANT_WIDTHS {
        let variant = variant_file(name, width);
        files.extend(modern_formats(name).iter().map(|f| modern_file(&variant, f)));
        files.push(variant);
    }
    files.retain(|f| dir.join(f).is_file());
    files
}

/// Copies a cache entry's files into `out`; None when there's no complete entry.
fn from_cache(entry: &Path, out: &Path) -> Option<(usize, usize)> {
    let list = fs::read_to_string(entry.join("files.txt")).ok()?;
    let files: Vec<&str> = list.lines().filter(|l| !l.is_empty()).collect();
    if files.iter().any(|f| !is_copy_name(f) || !entry.join(f).is_file()) {
        return None;
    }
    for f in &files {
        fs::copy(entry.join(f), out.join(f)).ok()?;
    }
    // `harbour.jpg.avif`: the AVIF/WebP copies have two dots.
    let modern = files.iter().filter(|f| f.matches('.').count() == 2).count();
    Some((files.len() - modern, modern))
}

/// A cached copy's name: one or two dots, library characters only (no paths).
fn is_copy_name(f: &str) -> bool {
    !f.is_empty() && !f.starts_with('.') && f.chars().all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '-' || c == '.') && !f.contains("..")
}

fn to_cache(cache: &Path, key: &str, out: &Path, name: &str) -> Result<()> {
    let files = made_files(out, name);
    // Written beside the entry, then renamed, so a stopped publish never leaves half an entry.
    let temp = cache.join(format!(".{key}.part"));
    let _ = fs::remove_dir_all(&temp);
    fs::create_dir_all(&temp)?;
    for f in &files {
        fs::copy(out.join(f), temp.join(f))?;
    }
    fs::write(temp.join("files.txt"), files.join("\n"))?;
    let entry = cache.join(key);
    let _ = fs::remove_dir_all(&entry);
    fs::rename(&temp, &entry)?;
    Ok(())
}

/// Removes cache entries for photos that are gone or changed.
fn prune_cache(cache: &Path, kept: &[String]) {
    let Ok(entries) = fs::read_dir(cache) else { return };
    for e in entries.filter_map(|e| e.ok()) {
        let name = e.file_name().to_string_lossy().into_owned();
        if !kept.contains(&name) && e.file_type().is_ok_and(|t| t.is_dir()) {
            let _ = fs::remove_dir_all(e.path());
        }
    }
}

/// Writes the resized copies of one photo, and the AVIF/WebP copies of the
/// photo and of each resized copy; returns how many of each.
fn write_variants(bytes: &[u8], out: &Path, name: &str) -> Result<(usize, usize)> {
    let img = image::ImageReader::new(std::io::Cursor::new(bytes))
        .with_guessed_format()
        .with_context(|| format!("Couldn't open photo {name}"))?
        .decode()
        .with_context(|| format!("The photo {name} is damaged. Delete it from the media library and upload it again."))?;
    let mut count = 0;
    let mut modern = write_modern(&img, out, name, Some(bytes.len()))?;
    for width in VARIANT_WIDTHS.into_iter().filter(|w| *w < img.width()) {
        let height = ((u64::from(img.height()) * u64::from(width) + u64::from(img.width()) / 2) / u64::from(img.width())).max(1) as u32;
        let small = img.resize_exact(width, height, FilterType::CatmullRom);
        let file = variant_file(name, width);
        save(&small, &out.join(&file), name).with_context(|| format!("Couldn't write a resized copy of {name}"))?;
        count += 1;
        let source_len = fs::metadata(out.join(&file)).ok().map(|m| m.len() as usize);
        modern += write_modern(&small, out, &file, source_len)?;
    }
    Ok((count, modern))
}

/// Writes `<file>.avif` (and `<file>.webp` for JPG/PNG) next to `file`; returns how many.
/// A WebP copy bigger than its source (`source_len` bytes) is skipped, so the
/// original stays the fallback; the page's `<picture>` is built from what exists.
fn write_modern(img: &DynamicImage, out: &Path, file: &str, source_len: Option<usize>) -> Result<usize> {
    let formats = modern_formats(file);
    let mut written = 0;
    for format in formats {
        let bytes = match *format {
            "avif" => encode_avif(img),
            _ => encode_webp(img),
        }
        .with_context(|| format!("Couldn't make the {} copy of {file}", format.to_uppercase()))?;
        if !keep_copy(format, bytes.len(), source_len) {
            continue;
        }
        fs::write(out.join(modern_file(file, format)), bytes).with_context(|| format!("Couldn't write the {} copy of {file}", format.to_uppercase()))?;
        written += 1;
    }
    Ok(written)
}

/// F081 review: only a WebP can be dropped for being bigger than its source.
fn keep_copy(format: &str, copy_len: usize, source_len: Option<usize>) -> bool {
    format != "webp" || source_len.is_none_or(|source| copy_len <= source)
}

/// Photos without see-through parts are encoded without an alpha channel (smaller files).
fn encode_avif(img: &DynamicImage) -> Result<Vec<u8>> {
    let encoder = AvifEncoder::new().with_quality(AVIF_QUALITY).with_alpha_quality(AVIF_QUALITY).with_speed(AVIF_SPEED);
    let (w, h) = (img.width() as usize, img.height() as usize);
    let encoded = if img.color().has_alpha() {
        let rgba = img.to_rgba8();
        let pixels: Vec<ravif::RGBA8> = rgba.pixels().map(|p| ravif::RGBA8::new(p[0], p[1], p[2], p[3])).collect();
        encoder.encode_rgba(AvifImg::new(&pixels[..], w, h))?
    } else {
        let rgb = img.to_rgb8();
        let pixels: Vec<ravif::RGB8> = rgb.pixels().map(|p| ravif::RGB8::new(p[0], p[1], p[2])).collect();
        encoder.encode_rgb(AvifImg::new(&pixels[..], w, h))?
    };
    Ok(encoded.avif_file)
}

fn encode_webp(img: &DynamicImage) -> Result<Vec<u8>> {
    let (w, h) = (img.width(), img.height());
    let memory = if img.color().has_alpha() {
        let rgba = img.to_rgba8();
        webp::Encoder::from_rgba(rgba.as_raw(), w, h).encode(WEBP_QUALITY)
    } else {
        let rgb = img.to_rgb8();
        webp::Encoder::from_rgb(rgb.as_raw(), w, h).encode(WEBP_QUALITY)
    };
    if memory.is_empty() {
        anyhow::bail!("the WebP encoder gave up");
    }
    Ok(memory.to_vec())
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

    #[test]
    fn modern_copies_keep_the_original_name() {
        assert_eq!(modern_file("harbour-480w.jpg", "avif"), "harbour-480w.jpg.avif");
        assert_eq!(modern_formats("a.jpg"), ["avif", "webp"]);
        assert_eq!(modern_formats("a.png"), ["avif", "webp"]);
        assert_eq!(modern_formats("a.webp"), ["avif"]);
    }

    #[test]
    fn pages_stop_listing_webp_copies_that_were_skipped() {
        let html = r#"<picture><source type="image/avif" srcset="/media/a.jpg.avif 960w"/><source type="image/webp" srcset="/media/a-480w.jpg.webp 480w, /media/a.jpg.webp 960w" sizes="100vw"/><img src="/media/a.jpg"/></picture>"#;
        let only_480 = fix_webp_sources(html, &|f| f != "a.jpg.webp");
        assert!(only_480.contains(r#"srcset="/media/a-480w.jpg.webp 480w" sizes"#), "{only_480}");
        assert!(only_480.contains("image/avif") && only_480.contains(r#"<img src="/media/a.jpg"/>"#));
        let none = fix_webp_sources(html, &|f| !f.ends_with(".webp"));
        assert!(!none.contains("image/webp") && none.contains("image/avif") && none.contains("<img"), "{none}");
        assert_eq!(fix_webp_sources(html, &|_| true), html);
    }

    #[test]
    fn a_webp_bigger_than_its_source_is_skipped() {
        assert!(!keep_copy("webp", 1001, Some(1000)));
        assert!(keep_copy("webp", 1000, Some(1000)));
        assert!(keep_copy("webp", 900, Some(1000)));
        assert!(keep_copy("avif", 5000, Some(1000)));
        assert!(keep_copy("webp", 5000, None));
    }
}

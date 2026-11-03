use clap::Parser;
use std::path::PathBuf;
use std::process::ExitCode;

/// Finishes a rendered Crust site so it's ready to deploy.
#[derive(Parser)]
#[command(version)]
struct Args {
    /// Folder with the rendered pages (e.g. dist/site).
    site_dir: PathBuf,
    /// The site's public address, e.g. https://mysite.pages.dev
    #[arg(long)]
    base_url: String,
    /// Redirects for renamed pages (content/redirects.json). Optional.
    #[arg(long)]
    redirects: Option<PathBuf>,
    /// The media library folder (content/media): copied in, with resized copies. Optional.
    #[arg(long)]
    media: Option<PathBuf>,
    /// Keeps each photo's resized and AVIF/WebP copies here between publishes (F081). Optional.
    #[arg(long)]
    photo_cache: Option<PathBuf>,
    /// Crust's bundled fonts (packages/blocks/fonts): the ones the pages use are copied in. Optional.
    #[arg(long)]
    fonts: Option<PathBuf>,
}

fn main() -> ExitCode {
    let args = Args::parse();
    let redirects = match args.redirects.as_deref().map(crust_publish::load_redirects).transpose() {
        Ok(list) => list.unwrap_or_default(),
        Err(err) => {
            eprintln!("publish failed: {err:#}");
            return ExitCode::FAILURE;
        }
    };
    let photos = match args.media.as_deref().map(|dir| crust_publish::publish_media_cached(dir, &args.site_dir, args.photo_cache.as_deref())).transpose() {
        Ok(report) => report.unwrap_or_default(),
        Err(err) => {
            eprintln!("publish failed: {err:#}");
            return ExitCode::FAILURE;
        }
    };
    let fonts = match args.fonts.as_deref().map(|dir| crust_publish::publish_fonts(&args.site_dir, &crust_publish::folder_fonts(dir))).transpose() {
        Ok(report) => report.unwrap_or_default(),
        Err(err) => {
            eprintln!("publish failed: {err:#}");
            return ExitCode::FAILURE;
        }
    };
    match crust_publish::publish_with_redirects(&args.site_dir, &args.base_url, &redirects) {
        Ok(report) => {
            println!("publish: {} page(s) ready", report.pages.len());
            if photos.photos > 0 {
                println!("  {} photo(s), {} resized copies, {} AVIF/WebP copies", photos.photos, photos.copies, photos.modern);
            }
            if !fonts.files.is_empty() {
                println!("  {} font file(s)", fonts.files.len());
            }
            for page in &report.pages {
                println!("  {page}");
            }
            for from in &report.redirects {
                println!("  redirect {from}");
            }
            for from in &report.skipped_redirects {
                println!("  redirect {from} skipped: a page lives there again");
            }
            ExitCode::SUCCESS
        }
        Err(err) => {
            eprintln!("publish failed: {err:#}");
            ExitCode::FAILURE
        }
    }
}

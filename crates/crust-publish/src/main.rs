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
    match crust_publish::publish_with_redirects(&args.site_dir, &args.base_url, &redirects) {
        Ok(report) => {
            println!("publish: {} page(s) ready", report.pages.len());
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

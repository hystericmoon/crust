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
}

fn main() -> ExitCode {
    let args = Args::parse();
    match crust_publish::publish(&args.site_dir, &args.base_url) {
        Ok(report) => {
            println!("publish: {} page(s) ready", report.pages.len());
            for page in &report.pages {
                println!("  {page}");
            }
            ExitCode::SUCCESS
        }
        Err(err) => {
            eprintln!("publish failed: {err:#}");
            ExitCode::FAILURE
        }
    }
}

//! Redirects for renamed pages (F015).
//!
//! `content/redirects.json` lists old addresses and the page each one now
//! lives at. The publish step turns it into Cloudflare Pages' `_redirects`
//! file, so links to an old address keep working.

use anyhow::{Context, Result, bail};
use serde::Deserialize;
use std::fs;
use std::path::Path;

#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
pub struct Redirect {
    pub from: String,
    pub to: String,
}

/// Reads the redirects file. A missing file means no redirects.
pub fn load_redirects(file: &Path) -> Result<Vec<Redirect>> {
    if !file.exists() {
        return Ok(Vec::new());
    }
    let text =
        fs::read_to_string(file).with_context(|| format!("Couldn't read {}", file.display()))?;
    serde_json::from_str(&text).with_context(|| {
        format!(
            "{} is damaged; it should be a list of {{\"from\", \"to\"}} pairs",
            file.display()
        )
    })
}

/// "/about" → "/about/", "/" → "/": how the renderer publishes page addresses.
fn as_page_url(path: &str) -> String {
    let clean = path.trim_matches('/');
    if clean.is_empty() {
        "/".to_string()
    } else {
        format!("/{clean}/")
    }
}

fn is_valid_path(path: &str) -> bool {
    path.starts_with('/')
        && path.trim_matches('/').split('/').all(|s| {
            s.is_empty()
                || s.bytes()
                    .all(|b| b.is_ascii_lowercase() || b.is_ascii_digit() || b == b'-')
        })
}

/// What goes into `_redirects`, plus the old addresses now used by a page again.
#[derive(Debug, PartialEq, Eq)]
pub struct RedirectPlan {
    /// The `_redirects` file text; empty when there's nothing to redirect.
    pub file: String,
    /// Old addresses that redirect.
    pub active: Vec<String>,
    /// Old addresses skipped because a page lives there again (the page wins).
    pub skipped: Vec<String>,
}

/// Checks every redirect against the published pages and builds `_redirects`.
/// Both `/old` and `/old/` are listed so either form of a link works.
pub fn plan_redirects(redirects: &[Redirect], pages: &[String]) -> Result<RedirectPlan> {
    let mut plan = RedirectPlan {
        file: String::new(),
        active: Vec::new(),
        skipped: Vec::new(),
    };
    let mut problems = Vec::new();
    for r in redirects {
        if !is_valid_path(&r.from) || !is_valid_path(&r.to) || r.from.trim_matches('/').is_empty() {
            problems.push(format!(
                "the redirect from {:?} to {:?} isn't a valid pair of page addresses",
                r.from, r.to
            ));
            continue;
        }
        let from = as_page_url(&r.from);
        let to = as_page_url(&r.to);
        if pages.contains(&from) {
            plan.skipped.push(r.from.clone());
            continue;
        }
        if !pages.contains(&to) {
            problems.push(format!(
                "the old address {} sends visitors to {}, but there's no page there",
                r.from, r.to
            ));
            continue;
        }
        let bare = from.trim_end_matches('/');
        plan.file
            .push_str(&format!("{bare} {to} 301\n{from} {to} 301\n"));
        plan.active.push(r.from.clone());
    }
    if !problems.is_empty() {
        bail!(
            "Nothing was published. Fix the redirects for renamed pages:\n  - {}",
            problems.join("\n  - ")
        );
    }
    Ok(plan)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn r(from: &str, to: &str) -> Redirect {
        Redirect {
            from: from.into(),
            to: to.into(),
        }
    }

    fn pages() -> Vec<String> {
        vec!["/".into(), "/about-us/".into(), "/contact/".into()]
    }

    #[test]
    fn lists_both_forms_of_the_old_address() {
        let plan = plan_redirects(&[r("/about", "/about-us"), r("/start", "/")], &pages()).unwrap();
        assert_eq!(
            plan.file,
            "/about /about-us/ 301\n/about/ /about-us/ 301\n/start / 301\n/start/ / 301\n"
        );
        assert_eq!(plan.active, vec!["/about", "/start"]);
        assert!(plan.skipped.is_empty());
    }

    #[test]
    fn a_page_at_the_old_address_wins() {
        let plan = plan_redirects(&[r("/contact", "/about-us")], &pages()).unwrap();
        assert_eq!(plan.file, "");
        assert_eq!(plan.skipped, vec!["/contact"]);
    }

    #[test]
    fn missing_targets_and_bad_addresses_stop_the_publish() {
        let err = plan_redirects(
            &[r("/team", "/gone"), r("/", "/about-us"), r("/x y", "/")],
            &pages(),
        )
        .unwrap_err()
        .to_string();
        assert!(err.starts_with("Nothing was published."), "{err}");
        assert!(
            err.contains(
                "the old address /team sends visitors to /gone, but there's no page there"
            ),
            "{err}"
        );
        assert!(err.contains("\"/\""), "{err}");
        assert!(err.contains("\"/x y\""), "{err}");
    }

    #[test]
    fn missing_file_means_no_redirects() {
        let dir = tempfile::tempdir().unwrap();
        assert!(
            load_redirects(&dir.path().join("redirects.json"))
                .unwrap()
                .is_empty()
        );
        fs::write(dir.path().join("bad.json"), "{nope").unwrap();
        assert!(
            load_redirects(&dir.path().join("bad.json"))
                .unwrap_err()
                .to_string()
                .contains("damaged")
        );
    }
}

//! F061 tests: a fake downloads site on 127.0.0.1 and update files signed
//! with a test key made here (the real key is the owner's, BLOCKED.md).

use super::*;
use base64::Engine;
use std::collections::HashMap;
use std::io::{Read, Write};
use std::net::TcpListener;
use std::sync::Arc;
use tauri::test::{MockRuntime, mock_builder, mock_context, noop_assets};

fn b64(text: &str) -> String {
    base64::engine::general_purpose::STANDARD.encode(text)
}

/// A test update key: (public half as the app takes it, secret half).
fn test_key() -> (String, minisign::SecretKey) {
    let pair = minisign::KeyPair::generate_unencrypted_keypair().unwrap();
    (b64(&pair.pk.to_box().unwrap().to_string()), pair.sk)
}

/// The signature the release step would publish for `bytes` at `version`.
fn sign(sk: &minisign::SecretKey, bytes: &[u8], version: &str) -> String {
    let comment = format!("timestamp:1793500000\tfile:crust.app.tar.gz\tversion:{version}");
    let sig = minisign::sign(None, sk, bytes, Some(&comment), Some("signature from tauri secret key")).unwrap();
    b64(&sig.to_string())
}

/// A fake downloads site: answers each path with its bytes, 404 otherwise.
fn serve(files: HashMap<String, Vec<u8>>) -> String {
    let listener = TcpListener::bind("127.0.0.1:0").unwrap();
    let base = format!("http://{}", listener.local_addr().unwrap());
    let files = Arc::new(files);
    std::thread::spawn(move || {
        for stream in listener.incoming() {
            let Ok(mut stream) = stream else { continue };
            let files = files.clone();
            std::thread::spawn(move || {
                let mut buf = [0u8; 8192];
                let n = stream.read(&mut buf).unwrap_or(0);
                let request = String::from_utf8_lossy(&buf[..n]);
                let path = request.split_whitespace().nth(1).unwrap_or("/").to_string();
                let (status, body) = match files.get(&path) {
                    Some(body) => ("200 OK", body.clone()),
                    None => ("404 Not Found", b"not here".to_vec()),
                };
                let head = format!("HTTP/1.1 {status}\r\nContent-Length: {}\r\nConnection: close\r\n\r\n", body.len());
                let _ = stream.write_all(head.as_bytes());
                let _ = stream.write_all(&body);
            });
        }
    });
    base
}

/// A Crust app at version 0.1.0 with the updater, allowed to use http on 127.0.0.1.
fn app() -> tauri::App<MockRuntime> {
    let mut context = mock_context(noop_assets());
    context.config_mut().version = Some("0.1.0".into());
    context.config_mut().plugins.0.insert(
        "updater".into(),
        serde_json::json!({ "pubkey": "", "dangerousInsecureTransportProtocol": true, "requireSignedVersion": true }),
    );
    mock_builder().plugin(tauri_plugin_updater::Builder::new().build()).build(context).unwrap()
}

const PACKAGE: &[u8] = b"pretend this is Crust 0.2.0, packed for this computer";

/// The feed the release step writes, offering `version` for every computer.
fn feed(base: &str, version: &str, signature: &str) -> Vec<u8> {
    let platform = serde_json::json!({ "url": format!("{base}/crust-{version}.tar.gz"), "signature": signature });
    let platforms: serde_json::Map<String, serde_json::Value> =
        ["linux-x86_64", "linux-aarch64", "darwin-aarch64", "darwin-x86_64", "windows-x86_64"].iter().map(|t| (t.to_string(), platform.clone())).collect();
    serde_json::to_vec(&serde_json::json!({
        "version": version,
        "notes": "- Updates arrive by themselves now.\n\n- Faster publishing.\n",
        "pub_date": "2026-11-02T08:00:00Z",
        "platforms": platforms,
    }))
    .unwrap()
}

/// A downloads site offering `version`, signed by `sk` (as if for `signed_as`).
fn site(sk: &minisign::SecretKey, version: &str, signed_as: &str) -> String {
    // The address is only known once the server runs, so serve the feed from a second one.
    let packages = serve(HashMap::from([(format!("/crust-{version}.tar.gz"), PACKAGE.to_vec())]));
    serve(HashMap::from([("/updates/latest.json".to_string(), feed(&packages, version, &sign(sk, PACKAGE, signed_as)))]))
}

fn updates(base: &str, pubkey: &str) -> Updates {
    Updates::new(UpdateFeed::from_parts(Some(&format!("{base}/updates/latest.json")), Some(pubkey)), "0.1.0")
}

#[tokio::test]
async fn finds_a_newer_version_with_its_notes() {
    let (pubkey, sk) = test_key();
    let base = site(&sk, "0.2.0", "0.2.0");
    let app = app();
    let updates = updates(&base, &pubkey);
    let found = updates.check(app.handle()).await.unwrap();
    assert_eq!(
        found,
        UpdateCheck::Available {
            current: "0.1.0".into(),
            version: "0.2.0".into(),
            notes: vec!["Updates arrive by themselves now.".into(), "Faster publishing.".into()],
            date: Some("2026-11-02".into()),
        }
    );
    let json = serde_json::to_value(&found).unwrap();
    assert_eq!(json["state"], "available");
}

#[tokio::test]
async fn downloads_and_checks_the_signature_then_waits_for_a_restart() {
    let (pubkey, sk) = test_key();
    let base = site(&sk, "0.2.0", "0.2.0");
    let app = app();
    let updates = updates(&base, &pubkey);
    updates.check(app.handle()).await.unwrap();
    let mut seen = Vec::new();
    let version = updates.download(|p| seen.push(p)).await.unwrap();
    assert_eq!(version, "0.2.0");
    assert_eq!(updates.ready_version().as_deref(), Some("0.2.0"));
    let last = seen.last().unwrap();
    assert_eq!(last.downloaded, PACKAGE.len() as u64);
    assert_eq!(last.total, Some(PACKAGE.len() as u64));
}

/// A throwaway test key's public half and a signature of PACKAGE for 0.2.0,
/// both made with the Tauri tool the release build uses (`tauri signer
/// generate`, then `tauri signer sign --app-version 0.2.0`). The secret half
/// was thrown away; the owner's real key is BLOCKED.md.
const TAURI_TOOL_PUBKEY: &str = "dW50cnVzdGVkIGNvbW1lbnQ6IG1pbmlzaWduIHB1YmxpYyBrZXk6IEQ3MDRGODMzNEZGNjhFNUUKUldSZWp2WlBNL2dFMXhmd05FekRlVTZCdnFvUFlMUDgwOWU0Z2JsR2M5RThmYXBlUTQzdmpFTXoK";
const TAURI_TOOL_SIGNATURE: &str = "dW50cnVzdGVkIGNvbW1lbnQ6IHNpZ25hdHVyZSBmcm9tIHRhdXJpIHNlY3JldCBrZXkKUlVSZWp2WlBNL2dFMTRTOWZoc01uMUp4WHV3dlczR2FUU2JmRENGZGVsYWpVbWZYK0JZcjY3NDVPYXQ5b3NrQXpCdnpEcmZSQ09UbCtNdWZrVFZRYm4yd3ZKR3JhakZEVXdvPQp0cnVzdGVkIGNvbW1lbnQ6IHRpbWVzdGFtcDoxNzkzNTU3Mzg5CWZpbGU6cGtnCXZlcnNpb246MC4yLjAKSExQUWVHR1JjdHpydTdJenVoNS9XdHFzYW9pd0loTjAwa3hNcGFWdWE3cEF1OTVIZkdBT1hwQ3lBOTRKbEdzMldwZGViTWNVMmY4Q04vZU1ySkhXQ0E9PQo=";

#[tokio::test]
async fn accepts_an_update_signed_by_the_release_tool() {
    let packages = serve(HashMap::from([("/crust-0.2.0.tar.gz".to_string(), PACKAGE.to_vec())]));
    let base = serve(HashMap::from([("/updates/latest.json".to_string(), feed(&packages, "0.2.0", TAURI_TOOL_SIGNATURE))]));
    let app = app();
    let updates = updates(&base, TAURI_TOOL_PUBKEY);
    updates.check(app.handle()).await.unwrap();
    assert_eq!(updates.download(|_| {}).await.unwrap(), "0.2.0");
}

#[tokio::test]
async fn the_same_or_an_older_version_is_not_an_update() {
    let (pubkey, sk) = test_key();
    let app = app();
    for version in ["0.1.0", "0.0.9"] {
        let base = site(&sk, version, version);
        let found = updates(&base, &pubkey).check(app.handle()).await.unwrap();
        assert_eq!(found, UpdateCheck::UpToDate { current: "0.1.0".into() });
    }
}

#[tokio::test]
async fn an_update_signed_with_another_key_is_refused() {
    let (pubkey, _) = test_key();
    let (_, someone_else) = test_key();
    let base = site(&someone_else, "0.2.0", "0.2.0");
    let app = app();
    let updates = updates(&base, &pubkey);
    assert!(matches!(updates.check(app.handle()).await.unwrap(), UpdateCheck::Available { .. }));
    let err = updates.download(|_| {}).await.unwrap_err();
    assert!(err.contains("safety check"), "{err}");
    assert_eq!(updates.ready_version(), None);
    assert_eq!(updates.install_ready(false).unwrap(), None);
}

#[tokio::test]
async fn an_old_release_passed_off_as_new_is_refused() {
    // Signed for 0.1.5 but announced as 0.2.0: the signed version must match.
    let (pubkey, sk) = test_key();
    let base = site(&sk, "0.2.0", "0.1.5");
    let app = app();
    let updates = updates(&base, &pubkey);
    updates.check(app.handle()).await.unwrap();
    let err = updates.download(|_| {}).await.unwrap_err();
    assert!(err.contains("safety check"), "{err}");
}

#[tokio::test]
async fn without_a_key_crust_does_not_look() {
    let app = app();
    let updates = Updates::new(UpdateFeed::from_parts(Some("http://127.0.0.1:9/never"), None), "0.1.0");
    assert!(!updates.enabled());
    assert_eq!(updates.check(app.handle()).await.unwrap(), UpdateCheck::Off { current: "0.1.0".into() });
    assert_eq!(serde_json::to_value(UpdateCheck::Off { current: "0.1.0".into() }).unwrap()["state"], "off");
}

#[tokio::test]
async fn an_unreachable_or_broken_site_says_so_plainly() {
    let (pubkey, _) = test_key();
    let app = app();
    // Nothing listens on port 9.
    let err = updates("http://127.0.0.1:9", &pubkey).check(app.handle()).await.unwrap_err();
    assert!(err.contains("couldn't reach") || err.contains("doesn't understand"), "{err}");
    let broken = serve(HashMap::from([("/updates/latest.json".to_string(), b"<html>oops</html>".to_vec())]));
    let err = updates(&broken, &pubkey).check(app.handle()).await.unwrap_err();
    assert!(!err.is_empty() && !err.contains("<html>"), "{err}");
}

#[tokio::test]
async fn downloading_needs_a_check_first() {
    let updates = Updates::new(None, "0.1.0");
    let err = updates.download(|_| {}).await.unwrap_err();
    assert!(err.contains("Check for updates first"));
}

#[test]
fn notes_become_plain_lines() {
    let notes = plain_notes("## What's new\n\n- Faster publishing\n* Fixed photos\n• Bullet\n\n   \nPlain line");
    assert_eq!(notes, vec!["What's new", "Faster publishing", "Fixed photos", "Bullet", "Plain line"]);
    let long = "x".repeat(400);
    let cut = plain_notes(&long);
    assert_eq!(cut[0].chars().count(), MAX_NOTE_CHARS);
    assert!(cut[0].ends_with('…'));
    let many: String = (0..30).map(|i| format!("- line {i}\n")).collect();
    assert_eq!(plain_notes(&many).len(), MAX_NOTES);
}

#[test]
fn a_feed_needs_a_key_and_a_good_address() {
    assert_eq!(UpdateFeed::from_parts(None, None), None);
    assert_eq!(UpdateFeed::from_parts(None, Some("  ")), None);
    assert_eq!(UpdateFeed::from_parts(Some("not a url"), Some("key")), None);
    let feed = UpdateFeed::from_parts(None, Some(" key ")).unwrap();
    assert_eq!(feed.endpoint.as_str(), DEFAULT_FEED);
    assert_eq!(feed.pubkey, "key");
}

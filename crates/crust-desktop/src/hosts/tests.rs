//! The hosts are played by a small fake server on 127.0.0.1 that answers
//! like the Cloudflare and Netlify APIs and remembers what it was sent.

use super::*;
use std::io::{BufRead, BufReader, Read, Write};
use std::net::TcpListener;
use std::sync::Arc;

#[derive(Debug, Clone)]
struct Seen {
    method: String,
    path: String,
    auth: String,
    content_type: String,
    body: Vec<u8>,
}

impl Seen {
    fn json(&self) -> Value {
        serde_json::from_slice(&self.body).unwrap_or(Value::Null)
    }
}

type Handler = dyn Fn(&Seen) -> (u16, Value) + Send + Sync;

struct Fake {
    url: String,
    seen: Arc<Mutex<Vec<Seen>>>,
}

impl Fake {
    fn start(handler: impl Fn(&Seen) -> (u16, Value) + Send + Sync + 'static) -> Fake {
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        let url = format!("http://{}", listener.local_addr().unwrap());
        let seen = Arc::new(Mutex::new(Vec::new()));
        let (log, handler): (_, Arc<Handler>) = (seen.clone(), Arc::new(handler));
        std::thread::spawn(move || {
            for stream in listener.incoming() {
                let Ok(mut stream) = stream else { continue };
                let mut reader = BufReader::new(stream.try_clone().unwrap());
                let mut line = String::new();
                if reader.read_line(&mut line).is_err() || line.is_empty() {
                    continue;
                }
                let mut parts = line.split_whitespace();
                let (method, path) = (parts.next().unwrap_or("").to_string(), parts.next().unwrap_or("").to_string());
                let (mut length, mut auth, mut content_type) = (0usize, String::new(), String::new());
                loop {
                    let mut header = String::new();
                    reader.read_line(&mut header).unwrap();
                    let header = header.trim_end();
                    if header.is_empty() {
                        break;
                    }
                    let (name, value) = header.split_once(':').unwrap_or((header, ""));
                    match name.to_ascii_lowercase().as_str() {
                        "content-length" => length = value.trim().parse().unwrap_or(0),
                        "authorization" => auth = value.trim().to_string(),
                        "content-type" => content_type = value.trim().to_string(),
                        _ => {}
                    }
                }
                let mut body = vec![0; length];
                reader.read_exact(&mut body).unwrap();
                let request = Seen { method, path, auth, content_type, body };
                let (status, reply) = handler(&request);
                log.lock().unwrap().push(request);
                let text = reply.to_string();
                let _ = write!(stream, "HTTP/1.1 {status} X\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{text}", text.len());
            }
        });
        Fake { url, seen }
    }

    fn seen(&self) -> Vec<Seen> {
        self.seen.lock().unwrap().clone()
    }

    fn paths(&self) -> Vec<String> {
        self.seen().iter().map(|s| format!("{} {}", s.method, s.path)).collect()
    }
}

fn cf_ok(result: Value) -> (u16, Value) {
    (200, json!({ "success": true, "errors": [], "result": result }))
}

fn client(fake: &Fake) -> Client {
    Client::new(&fake.url, &fake.url)
}

fn finished_site() -> tempfile::TempDir {
    let dir = tempfile::tempdir().unwrap();
    fs::write(dir.path().join("index.html"), "<h1>Home</h1>").unwrap();
    fs::create_dir_all(dir.path().join("about")).unwrap();
    fs::write(dir.path().join("about/index.html"), "<h1>About</h1>").unwrap();
    fs::write(dir.path().join("styles.css"), "body{}").unwrap();
    fs::write(dir.path().join("_redirects"), "/old /new 301\n").unwrap();
    fs::write(dir.path().join(".DS_Store"), "x").unwrap();
    dir
}

fn connection(host: HostKind) -> Connection {
    Connection {
        host,
        account: "acc1".into(),
        account_name: "Hosni".into(),
        project: "harbour-studio".into(),
        site_id: if host == HostKind::Netlify { "site-123".into() } else { "harbour-studio".into() },
        url: "https://harbour-studio.pages.dev".into(),
        token_key: "k".into(),
        last_published: None,
    }
}

// ------------------------------------------------------------ Cloudflare

#[test]
fn cloudflare_token_check_lists_accounts() {
    let fake = Fake::start(|r| {
        assert_eq!(r.auth, "Bearer good-token");
        cf_ok(json!([{ "id": "acc1", "name": "Hosni's account" }]))
    });
    let accounts = client(&fake).check_token(HostKind::Cloudflare, "  good-token \n").unwrap();
    assert_eq!(accounts, vec![Account { id: "acc1".into(), name: "Hosni's account".into() }]);
    assert_eq!(fake.paths(), vec!["GET /accounts?per_page=50"]);
}

#[test]
fn wrong_cloudflare_token_is_refused_in_plain_words() {
    let fake = Fake::start(|_| (400, json!({ "success": false, "errors": [{ "code": 6003, "message": "Invalid request headers" }] })));
    let error = client(&fake).check_token(HostKind::Cloudflare, "nope").unwrap_err();
    assert_eq!(error.kind, "token");
    assert!(error.message.starts_with("Cloudflare didn't accept this token"), "{}", error.message);

    let fake = Fake::start(|_| (401, json!({})));
    assert_eq!(client(&fake).check_token(HostKind::Cloudflare, "nope").unwrap_err().kind, "token");
}

#[test]
fn a_token_with_spaces_or_nothing_is_refused_without_asking() {
    let fake = Fake::start(|_| cf_ok(json!([])));
    assert_eq!(client(&fake).check_token(HostKind::Cloudflare, "").unwrap_err().kind, "token");
    assert_eq!(client(&fake).check_token(HostKind::Netlify, "two words").unwrap_err().kind, "token");
    assert!(fake.seen().is_empty());
}

#[test]
fn a_token_without_account_access_says_which_permission() {
    let fake = Fake::start(|_| cf_ok(json!([])));
    let error = client(&fake).check_token(HostKind::Cloudflare, "t").unwrap_err();
    assert_eq!(error.kind, "token");
    assert!(error.message.contains("Cloudflare Pages · Edit"));
}

#[test]
fn cloudflare_connect_uses_an_existing_project() {
    let fake = Fake::start(|r| match r.path.as_str() {
        "/accounts/acc1/pages/projects/harbour" => cf_ok(json!({ "name": "harbour", "subdomain": "harbour-3x.pages.dev" })),
        other => panic!("unexpected {other}"),
    });
    let project = client(&fake).connect(HostKind::Cloudflare, "t", "acc1", "harbour").unwrap();
    assert_eq!(project.url, "https://harbour-3x.pages.dev");
    assert_eq!(fake.paths().len(), 1);
}

#[test]
fn cloudflare_connect_makes_the_project_when_missing() {
    let fake = Fake::start(|r| match (r.method.as_str(), r.path.as_str()) {
        ("GET", _) => (404, json!({ "success": false, "errors": [{ "code": 8000007, "message": "Project not found" }] })),
        ("POST", "/accounts/acc1/pages/projects") => {
            assert_eq!(r.json(), json!({ "name": "harbour", "production_branch": "main" }));
            cf_ok(json!({ "name": "harbour", "subdomain": "harbour.pages.dev" }))
        }
        other => panic!("unexpected {other:?}"),
    });
    let project = client(&fake).connect(HostKind::Cloudflare, "t", "acc1", "harbour").unwrap();
    assert_eq!(project, Project { project: "harbour".into(), site_id: "harbour".into(), url: "https://harbour.pages.dev".into() });
}

#[test]
fn a_token_that_cant_manage_pages_is_told_so() {
    let fake = Fake::start(|_| (403, json!({ "success": false, "errors": [{ "code": 8000011, "message": "forbidden" }] })));
    let error = client(&fake).connect(HostKind::Cloudflare, "t", "acc1", "harbour").unwrap_err();
    assert_eq!(error.kind, "token");
    assert!(error.message.contains("can't manage Cloudflare Pages"));
}

#[test]
fn bad_addresses_are_refused_before_asking_the_host() {
    let fake = Fake::start(|_| cf_ok(json!({})));
    for name in ["", "Harbour", "-harbour", "harbour-", "har bour", "härbour", &"a".repeat(59)] {
        assert_eq!(client(&fake).connect(HostKind::Cloudflare, "t", "acc1", name).unwrap_err().kind, "name", "{name}");
    }
    assert!(fake.seen().is_empty());
}

#[test]
fn cloudflare_publish_sends_only_missing_files_then_deploys() {
    let site = finished_site();
    let files = site_files(site.path()).unwrap();
    let home = files.iter().find(|f| f.path == "/index.html").unwrap();
    let home_hash = cloudflare_hash(home);
    let wanted = home_hash.clone();
    let fake = Fake::start(move |r| match r.path.as_str() {
        "/accounts/acc1/pages/projects/harbour-studio/upload-token" => {
            assert_eq!(r.auth, "Bearer saved-token");
            cf_ok(json!({ "jwt": "upload-jwt" }))
        }
        "/pages/assets/check-missing" => {
            assert_eq!(r.auth, "Bearer upload-jwt");
            assert_eq!(r.json()["hashes"].as_array().unwrap().len(), 3, "_redirects isn't a file here");
            cf_ok(json!([wanted.clone()]))
        }
        "/pages/assets/upload" => cf_ok(json!({ "successful_key_count": 1 })),
        "/pages/assets/upsert-hashes" => cf_ok(json!(null)),
        "/accounts/acc1/pages/projects/harbour-studio/deployments" => {
            assert_eq!(r.auth, "Bearer saved-token");
            cf_ok(json!({ "id": "dep1", "url": "https://abc.harbour-studio.pages.dev" }))
        }
        other => panic!("unexpected {other}"),
    });
    let steps = Mutex::new(Vec::new());
    let published = client(&fake).publish(&connection(HostKind::Cloudflare), "saved-token", site.path(), &|p| steps.lock().unwrap().push(p)).unwrap();
    assert_eq!(published, Published { url: "https://harbour-studio.pages.dev".into(), uploaded: 1, files: 4 });
    assert_eq!(steps.into_inner().unwrap(), vec![Progress { done: 0, total: 1 }, Progress { done: 1, total: 1 }]);

    let seen = fake.seen();
    let upload = seen.iter().find(|s| s.path == "/pages/assets/upload").unwrap().json();
    assert_eq!(upload[0]["key"], json!(home_hash));
    assert_eq!(upload[0]["metadata"]["contentType"], json!("text/html"));
    assert_eq!(upload[0]["value"], json!(base64::engine::general_purpose::STANDARD.encode("<h1>Home</h1>")));
    assert_eq!(upload.as_array().unwrap().len(), 1);

    let deploy = seen.iter().find(|s| s.path.ends_with("/deployments")).unwrap();
    assert!(deploy.content_type.starts_with("multipart/form-data; boundary="));
    let body = String::from_utf8_lossy(&deploy.body);
    assert!(body.contains("name=\"manifest\""));
    assert!(body.contains(&format!("\"/index.html\":\"{home_hash}\"")));
    assert!(body.contains("name=\"_redirects\"; filename=\"_redirects\""));
    assert!(body.contains("/old /new 301"));
    assert!(!body.contains(".DS_Store"));
}

#[test]
fn an_expired_cloudflare_token_asks_for_a_new_one() {
    let site = finished_site();
    let fake = Fake::start(|_| (403, json!({ "success": false, "errors": [{ "code": 10000, "message": "Authentication error" }] })));
    let error = client(&fake).publish(&connection(HostKind::Cloudflare), "old", site.path(), &|_| {}).unwrap_err();
    assert_eq!(error.kind, "token");
    assert!(error.message.contains("no longer accepts the saved token"), "{}", error.message);
}

#[test]
fn a_deleted_cloudflare_project_says_so() {
    let site = finished_site();
    let fake = Fake::start(|_| (404, json!({ "success": false, "errors": [{ "code": 8000007, "message": "Project not found" }] })));
    let error = client(&fake).publish(&connection(HostKind::Cloudflare), "t", site.path(), &|_| {}).unwrap_err();
    assert_eq!(error.kind, "gone");
    assert!(error.message.contains("harbour-studio"));
}

#[test]
fn cloudflare_errors_keep_the_hosts_words() {
    let site = finished_site();
    let fake = Fake::start(|r| match r.path.as_str() {
        p if p.ends_with("/upload-token") => cf_ok(json!({ "jwt": "j" })),
        _ => (500, json!({ "success": false, "errors": [{ "code": 8000000, "message": "An unknown error occurred" }] })),
    });
    let error = client(&fake).publish(&connection(HostKind::Cloudflare), "t", site.path(), &|_| {}).unwrap_err();
    assert_eq!(error.kind, "other");
    assert_eq!(error.message, "Cloudflare said: An unknown error occurred (code 500).");
}

#[test]
fn an_unreachable_host_is_offline() {
    let site = finished_site();
    // Nothing listens on port 9 here.
    let client = Client::new("http://127.0.0.1:9", "http://127.0.0.1:9");
    let error = client.publish(&connection(HostKind::Netlify), "t", site.path(), &|_| {}).unwrap_err();
    assert_eq!(error.kind, "offline");
    assert!(error.message.starts_with("Couldn't reach Netlify."));
    assert_eq!(client.check_token(HostKind::Cloudflare, "t").unwrap_err().kind, "offline");
}

#[test]
fn a_busy_host_asks_to_wait() {
    let fake = Fake::start(|_| (429, json!({})));
    let error = client(&fake).check_token(HostKind::Netlify, "t").unwrap_err();
    assert_eq!(error.message, "Netlify is busy right now. Wait a minute and try again.");
}

// --------------------------------------------------------------- Netlify

#[test]
fn netlify_token_check_names_the_person() {
    let fake = Fake::start(|r| {
        assert_eq!(r.path, "/user");
        (200, json!({ "full_name": "Hosni", "email": "h@example.com" }))
    });
    assert_eq!(client(&fake).check_token(HostKind::Netlify, "t").unwrap(), vec![Account { id: String::new(), name: "Hosni".into() }]);
    let fake = Fake::start(|_| (401, json!({ "code": 401, "message": "Access Denied" })));
    let error = client(&fake).check_token(HostKind::Netlify, "t").unwrap_err();
    assert_eq!((error.kind, error.message.as_str()), ("token", "Netlify didn't accept this token. Check you copied all of it."));
}

#[test]
fn netlify_connect_uses_or_makes_the_site() {
    let fake = Fake::start(|r| match (r.method.as_str(), r.path.as_str()) {
        ("GET", "/sites/harbour.netlify.app") => (200, json!({ "id": "s1", "name": "harbour", "ssl_url": "https://harbour.netlify.app" })),
        ("GET", _) => (404, json!({ "code": 404, "message": "Not Found" })),
        ("POST", "/sites") => {
            assert_eq!(r.json(), json!({ "name": "fresh" }));
            (201, json!({ "id": "s2", "name": "fresh", "url": "http://fresh.netlify.app" }))
        }
        other => panic!("unexpected {other:?}"),
    });
    let c = client(&fake);
    assert_eq!(c.connect(HostKind::Netlify, "t", "", "harbour").unwrap(), Project { project: "harbour".into(), site_id: "s1".into(), url: "https://harbour.netlify.app".into() });
    assert_eq!(c.connect(HostKind::Netlify, "t", "", "fresh").unwrap(), Project { project: "fresh".into(), site_id: "s2".into(), url: "https://fresh.netlify.app".into() });
}

#[test]
fn a_taken_netlify_address_suggests_another() {
    let fake = Fake::start(|r| match r.method.as_str() {
        "GET" => (404, json!({})),
        _ => (422, json!({ "errors": { "subdomain": ["must be unique"] } })),
    });
    let error = client(&fake).connect(HostKind::Netlify, "t", "", "harbour").unwrap_err();
    assert_eq!(error.kind, "taken");
    assert_eq!(error.suggestion.as_deref(), Some("harbour-2"));
    assert_eq!(error.message, "“harbour” is taken on Netlify. Try “harbour-2”.");
    assert_eq!(taken(HostKind::Netlify, "harbour-2").suggestion.as_deref(), Some("harbour-2"));
}

#[test]
fn netlify_publish_sends_only_required_files_and_waits_until_ready() {
    let site = finished_site();
    fs::write(site.path().join("copy.css"), "body{}").unwrap(); // same content as styles.css
    let css = sha1_smol::Sha1::from("body{}").digest().to_string();
    let required = css.clone();
    let polls = Arc::new(Mutex::new(0));
    let counter = polls.clone();
    let fake = Fake::start(move |r| match (r.method.as_str(), r.path.as_str()) {
        ("POST", "/sites/site-123/deploys") => {
            let files = r.json()["files"].clone();
            assert_eq!(files.as_object().unwrap().len(), 5);
            assert!(files.get("/_redirects").is_some(), "Netlify reads _redirects itself");
            assert!(files.get("/.DS_Store").is_none());
            (200, json!({ "id": "d1", "required": [required.clone()], "state": "uploading" }))
        }
        ("PUT", path) => {
            assert!(path == "/deploys/d1/files/copy.css" || path == "/deploys/d1/files/styles.css");
            assert_eq!(r.body, b"body{}");
            (200, json!({}))
        }
        ("GET", "/deploys/d1") => {
            let mut n = counter.lock().unwrap();
            *n += 1;
            (200, json!({ "state": if *n < 2 { "processing" } else { "ready" } }))
        }
        other => panic!("unexpected {other:?}"),
    });
    let mut c = connection(HostKind::Netlify);
    c.url = "https://harbour-studio.netlify.app".into();
    let published = client(&fake).publish(&c, "t", site.path(), &|_| {}).unwrap();
    assert_eq!(published, Published { url: "https://harbour-studio.netlify.app".into(), uploaded: 1, files: 5 });
    assert_eq!(fake.paths().iter().filter(|p| p.starts_with("PUT")).count(), 1, "same content is sent once");
    assert_eq!(*polls.lock().unwrap(), 2);
}

#[test]
fn a_failed_netlify_deploy_says_why() {
    let site = finished_site();
    let fake = Fake::start(|r| match r.method.as_str() {
        "POST" => (200, json!({ "id": "d1", "required": [] })),
        _ => (200, json!({ "state": "error", "error_message": "Build blocked" })),
    });
    let error = client(&fake).publish(&connection(HostKind::Netlify), "t", site.path(), &|_| {}).unwrap_err();
    assert_eq!(error.message, "Netlify couldn't finish publishing: Build blocked");
}

#[test]
fn an_expired_netlify_token_asks_for_a_new_one() {
    let site = finished_site();
    let fake = Fake::start(|_| (401, json!({})));
    let error = client(&fake).publish(&connection(HostKind::Netlify), "t", site.path(), &|_| {}).unwrap_err();
    assert_eq!(error.kind, "token");
    assert!(error.message.starts_with("Netlify no longer accepts the saved token"));
}

#[test]
fn nothing_to_publish_without_a_finished_site() {
    let empty = tempfile::tempdir().unwrap();
    let fake = Fake::start(|_| (200, json!({})));
    let error = client(&fake).publish(&connection(HostKind::Netlify), "t", empty.path(), &|_| {}).unwrap_err();
    assert!(error.message.starts_with("There's no finished site"));
    assert!(fake.seen().is_empty());
}

// ------------------------------------------------------------ the pieces

#[test]
fn the_connection_lives_in_the_site_folder_without_the_token() {
    let dir = tempfile::tempdir().unwrap();
    let site = SiteFolder::new(dir.path());
    assert_eq!(load_connection(&site), None);
    let mut c = connection(HostKind::Cloudflare);
    c.last_published = Some(5);
    save_connection(&site, &c).unwrap();
    assert_eq!(load_connection(&site), Some(c.clone()));
    let text = String::from_utf8(site.read(HOSTS_FILE).unwrap().unwrap()).unwrap();
    assert!(text.contains("\"tokenKey\": \"k\""));
    assert!(!text.contains("saved-token"));
    let view = c.view(true);
    assert_eq!(serde_json::to_value(&view).unwrap()["host"], json!("cloudflare"));
    remove_connection(&site).unwrap();
    assert_eq!(load_connection(&site), None);
}

#[test]
fn memory_keychain_keeps_and_forgets() {
    let keys = MemoryKeychain::default();
    assert_eq!(keys.get("a").unwrap(), None);
    keys.set("a", "secret").unwrap();
    assert_eq!(keys.get("a").unwrap().as_deref(), Some("secret"));
    keys.delete("a").unwrap();
    keys.delete("a").unwrap();
    assert_eq!(keys.get("a").unwrap(), None);
    assert!(new_token_key(HostKind::Netlify).starts_with("netlify-"));
}

#[test]
fn cloudflare_hash_matches_its_upload_tool() {
    // blake3(base64("hello") + "txt"), first 32 hex digits.
    let file = SiteFile { path: "/a.txt".into(), bytes: b"hello".to_vec() };
    let mut expected = blake3::Hasher::new();
    expected.update(b"aGVsbG8=txt");
    assert_eq!(cloudflare_hash(&file), expected.finalize().to_hex()[..32]);
    assert_eq!(cloudflare_hash(&file).len(), 32);
}

#[test]
fn site_names_become_addresses() {
    assert_eq!(suggest_name("Harbour Studio"), "harbour-studio");
    assert_eq!(suggest_name("Rina's  portfolio!"), "rinas-portfolio");
    assert_eq!(suggest_name("  --Café 2026-- "), "caf-2026");
    assert_eq!(suggest_name("日本"), "my-site");
    assert!(check_name(HostKind::Cloudflare, &suggest_name(&"x ".repeat(80))).is_ok());
}

#[test]
fn uploads_are_split_into_requests() {
    let keys: Vec<String> = (0..1200).map(|i| i.to_string()).collect();
    let small = buckets(&keys, |_| 10);
    assert_eq!(small.iter().map(|b| b.len()).collect::<Vec<_>>(), vec![500, 500, 200]);
    let big = buckets(&keys[..3], |_| 20 * 1024 * 1024);
    assert_eq!(big.len(), 3);
    assert!(buckets(&[], |_: &String| 1).is_empty());
}

#[test]
fn paths_and_types() {
    assert_eq!(encode_path("/blog/my post/ü.html"), "/blog/my%20post/%C3%BC.html");
    assert_eq!(content_type("/pagefind/pagefind.js"), "application/javascript");
    assert_eq!(content_type("/media/a.JPG"), "image/jpeg");
    assert_eq!(content_type("/pagefind/x.pf_meta"), "application/octet-stream");
}

// --------------------------------------------------------------- service

fn service(fake: &Fake) -> HostService {
    HostService::new(client(fake), Box::new(MemoryKeychain::default()))
}

fn cloudflare_fake() -> Fake {
    Fake::start(|r| match (r.method.as_str(), r.path.as_str()) {
        ("GET", "/accounts?per_page=50") if r.auth == "Bearer other" => cf_ok(json!([{ "id": "acc9", "name": "Someone else" }])),
        ("GET", "/accounts?per_page=50") => cf_ok(json!([{ "id": "acc1", "name": "Hosni" }])),
        ("GET", p) if p.ends_with("/upload-token") => {
            if r.auth == "Bearer expired" {
                (401, json!({}))
            } else {
                cf_ok(json!({ "jwt": "j" }))
            }
        }
        ("GET", _) => cf_ok(json!({ "name": "harbour-studio", "subdomain": "harbour-studio.pages.dev" })),
        ("POST", "/pages/assets/check-missing") => cf_ok(json!([])),
        ("POST", _) => cf_ok(json!({})),
        other => panic!("unexpected {other:?}"),
    })
}

#[test]
fn connect_keeps_the_token_in_the_keychain_and_publishes() {
    let fake = cloudflare_fake();
    let hosts = service(&fake);
    let dir = tempfile::tempdir().unwrap();
    let site = SiteFolder::new(dir.path());
    assert_eq!(hosts.status(&site, "Harbour Studio"), HostStatus { connection: None, suggested_name: "harbour-studio".into() });

    let accounts = hosts.check_token(HostKind::Cloudflare, "good").unwrap();
    let view = hosts.connect(&site, HostKind::Cloudflare, " good ", &accounts[0], "harbour-studio").unwrap();
    assert_eq!(view.url, "https://harbour-studio.pages.dev");
    assert_eq!(view.account_name, "Hosni");
    assert!(view.has_token);

    let saved = load_connection(&site).unwrap();
    assert_eq!(hosts.keychain.get(&saved.token_key).unwrap().as_deref(), Some("good"));
    let folder_text: String = site_files(dir.path()).unwrap().iter().map(|f| String::from_utf8_lossy(&f.bytes).into_owned()).collect();
    assert!(!folder_text.contains("good\""), "the token never goes in the site folder");

    let build = finished_site();
    let published = hosts.publish(&site, build.path(), &|_| {}).unwrap();
    assert_eq!(published.uploaded, 0);
    let status = hosts.status(&site, "Harbour Studio");
    assert!(status.connection.unwrap().last_published.is_some());
}

#[test]
fn a_missing_keychain_token_asks_for_it_again() {
    let fake = cloudflare_fake();
    let hosts = service(&fake);
    let dir = tempfile::tempdir().unwrap();
    let site = SiteFolder::new(dir.path());
    let account = Account { id: "acc1".into(), name: "Hosni".into() };
    hosts.connect(&site, HostKind::Cloudflare, "good", &account, "harbour-studio").unwrap();
    let key = load_connection(&site).unwrap().token_key;
    hosts.keychain.delete(&key).unwrap();
    assert!(!hosts.status(&site, "x").connection.unwrap().has_token);
    let error = hosts.publish(&site, finished_site().path(), &|_| {}).unwrap_err();
    assert_eq!(error.kind, "token");
    assert!(error.message.contains("keychain no longer has the Cloudflare token"));
}

#[test]
fn a_new_token_replaces_an_expired_one() {
    let fake = cloudflare_fake();
    let hosts = service(&fake);
    let dir = tempfile::tempdir().unwrap();
    let site = SiteFolder::new(dir.path());
    let account = Account { id: "acc1".into(), name: "Hosni".into() };
    hosts.connect(&site, HostKind::Cloudflare, "expired", &account, "harbour-studio").unwrap();
    let build = finished_site();
    assert_eq!(hosts.publish(&site, build.path(), &|_| {}).unwrap_err().kind, "token");

    let other = hosts.replace_token(&site, "other").unwrap_err();
    assert!(other.message.contains("another Cloudflare account"), "{}", other.message);
    hosts.replace_token(&site, "fresh").unwrap();
    hosts.publish(&site, build.path(), &|_| {}).unwrap();
}

#[test]
fn reconnecting_or_disconnecting_forgets_the_old_token() {
    let fake = cloudflare_fake();
    let hosts = service(&fake);
    let dir = tempfile::tempdir().unwrap();
    let site = SiteFolder::new(dir.path());
    let account = Account { id: "acc1".into(), name: "Hosni".into() };
    hosts.connect(&site, HostKind::Cloudflare, "first", &account, "harbour-studio").unwrap();
    let first = load_connection(&site).unwrap().token_key;
    std::thread::sleep(Duration::from_millis(2));
    hosts.connect(&site, HostKind::Cloudflare, "second", &account, "harbour-studio").unwrap();
    let second = load_connection(&site).unwrap().token_key;
    assert_ne!(first, second);
    assert_eq!(hosts.keychain.get(&first).unwrap(), None);

    hosts.disconnect(&site).unwrap();
    assert_eq!(hosts.keychain.get(&second).unwrap(), None);
    assert_eq!(load_connection(&site), None);
    assert_eq!(hosts.publish(&site, finished_site().path(), &|_| {}).unwrap_err().kind, "disconnected");
    hosts.disconnect(&site).unwrap();
}

#[test]
fn a_failed_connect_leaves_the_site_as_it_was() {
    let fake = Fake::start(|_| (403, json!({ "success": false, "errors": [] })));
    let hosts = service(&fake);
    let dir = tempfile::tempdir().unwrap();
    let site = SiteFolder::new(dir.path());
    let account = Account { id: "acc1".into(), name: "Hosni".into() };
    assert!(hosts.connect(&site, HostKind::Cloudflare, "t", &account, "harbour").is_err());
    assert_eq!(load_connection(&site), None);
}

#[test]
fn token_pages_are_the_hosts_own() {
    assert!(HostKind::Cloudflare.token_page().starts_with("https://dash.cloudflare.com/"));
    assert!(HostKind::Netlify.token_page().starts_with("https://app.netlify.com/"));
}

//! "Preview in browser" (F056): a tiny web server for the finished site,
//! on this computer only (127.0.0.1), so the person's own browser shows
//! it exactly as visitors will: real addresses (/about/), the search page
//! and the 404 page. Opening the files directly wouldn't work: the site
//! uses addresses that start at "/", as hosts serve them.

use std::fs;
use std::io::{BufRead, BufReader, Read, Write};
use std::net::{SocketAddr, TcpListener, TcpStream};
use std::path::{Component, Path, PathBuf};
use std::thread;
use std::time::Duration;

/// A running preview server. It serves whatever is in its folder at the
/// moment of each request, so a new build shows on reload.
pub struct PreviewServer {
    addr: SocketAddr,
}

impl PreviewServer {
    /// Starts serving `root` on a free port of 127.0.0.1.
    pub fn start(root: PathBuf) -> std::io::Result<Self> {
        let listener = TcpListener::bind(("127.0.0.1", 0))?;
        let addr = listener.local_addr()?;
        thread::spawn(move || {
            for stream in listener.incoming().flatten() {
                let root = root.clone();
                thread::spawn(move || {
                    let _ = handle(stream, &root);
                });
            }
        });
        Ok(Self { addr })
    }

    /// The address to open: `http://127.0.0.1:<port>/`.
    pub fn url(&self) -> String {
        format!("http://{}/", self.addr)
    }
}

/// A reply: status line, type, and body (or where to go for a redirect).
#[derive(Debug, PartialEq, Eq)]
pub enum Reply {
    File { status: u16, content_type: &'static str, body: Vec<u8> },
    Redirect(String),
    Refused(u16),
}

fn handle(mut stream: TcpStream, root: &Path) -> std::io::Result<()> {
    stream.set_read_timeout(Some(Duration::from_secs(10)))?;
    let mut reader = BufReader::new(stream.try_clone()?);
    let mut request_line = String::new();
    reader.by_ref().take(8 * 1024).read_line(&mut request_line)?;
    // The rest of the request (headers) isn't needed; read it so the browser is happy.
    let mut line = String::new();
    let mut total = 0;
    while reader.read_line(&mut line)? > 2 && total < 64 * 1024 {
        total += line.len();
        line.clear();
    }
    let mut parts = request_line.split_whitespace();
    let (method, target) = (parts.next().unwrap_or(""), parts.next().unwrap_or(""));
    let reply = if method == "GET" || method == "HEAD" { answer(root, target) } else { Reply::Refused(405) };
    let head_only = method == "HEAD";
    let (status, headers, body) = match reply {
        Reply::File { status, content_type, body } => (status, format!("Content-Type: {content_type}\r\n"), body),
        Reply::Redirect(to) => (301, format!("Location: {to}\r\n"), Vec::new()),
        Reply::Refused(status) => (status, "Content-Type: text/plain; charset=utf-8\r\n".into(), b"Not here.".to_vec()),
    };
    let reason = match status {
        200 => "OK",
        301 => "Moved Permanently",
        404 => "Not Found",
        405 => "Method Not Allowed",
        _ => "Bad Request",
    };
    write!(
        stream,
        "HTTP/1.1 {status} {reason}\r\n{headers}Content-Length: {}\r\nCache-Control: no-store\r\nConnection: close\r\n\r\n",
        body.len()
    )?;
    if !head_only {
        stream.write_all(&body)?;
    }
    stream.flush()
}

/// What to send for a request address, the way static hosts do:
/// `/about/` is `about/index.html`, `/about` moves to `/about/`, and
/// anything missing gets the site's 404 page.
pub fn answer(root: &Path, target: &str) -> Reply {
    let path = target.split(['?', '#']).next().unwrap_or("");
    let Some(decoded) = crate::percent_decode(path) else { return Reply::Refused(400) };
    if !decoded.starts_with('/') {
        return Reply::Refused(400);
    }
    let mut file = root.to_path_buf();
    for component in Path::new(decoded.trim_start_matches('/')).components() {
        match component {
            Component::Normal(name) => file.push(name),
            _ => return Reply::Refused(400),
        }
    }
    if file.is_dir() {
        if !decoded.ends_with('/') {
            return Reply::Redirect(format!("{decoded}/"));
        }
        file.push("index.html");
    }
    match fs::read(&file) {
        Ok(body) => Reply::File { status: 200, content_type: content_type(&file), body },
        Err(_) => match fs::read(root.join("404.html")) {
            Ok(body) => Reply::File { status: 404, content_type: "text/html; charset=utf-8", body },
            Err(_) => Reply::Refused(404),
        },
    }
}

fn content_type(file: &Path) -> &'static str {
    match file.extension().and_then(|e| e.to_str()).map(|e| e.to_ascii_lowercase()).as_deref() {
        Some("html") => "text/html; charset=utf-8",
        Some("css") => "text/css; charset=utf-8",
        Some("js") => "text/javascript; charset=utf-8",
        Some("json") => "application/json",
        Some("xml") => "application/xml",
        Some("txt") => "text/plain; charset=utf-8",
        Some("jpg" | "jpeg") => "image/jpeg",
        Some("png") => "image/png",
        Some("webp") => "image/webp",
        Some("avif") => "image/avif",
        Some("svg") => "image/svg+xml",
        Some("wasm") => "application/wasm",
        _ => "application/octet-stream",
    }
}

#[cfg(test)]
mod tests {
    use super::*;


    fn site() -> tempfile::TempDir {
        let dir = tempfile::tempdir().unwrap();
        fs::write(dir.path().join("index.html"), "<h1>Home</h1>").unwrap();
        fs::write(dir.path().join("404.html"), "<h1>Not found</h1>").unwrap();
        fs::create_dir_all(dir.path().join("about")).unwrap();
        fs::write(dir.path().join("about/index.html"), "<h1>About</h1>").unwrap();
        fs::create_dir_all(dir.path().join("pagefind")).unwrap();
        fs::write(dir.path().join("pagefind/pagefind.js"), "export {}").unwrap();
        dir
    }

    fn body(reply: Reply) -> (u16, String) {
        match reply {
            Reply::File { status, body, .. } => (status, String::from_utf8(body).unwrap()),
            other => panic!("not a file: {other:?}"),
        }
    }

    #[test]
    fn serves_pages_like_a_host() {
        let dir = site();
        assert_eq!(body(answer(dir.path(), "/")), (200, "<h1>Home</h1>".into()));
        assert_eq!(body(answer(dir.path(), "/about/")), (200, "<h1>About</h1>".into()));
        assert_eq!(body(answer(dir.path(), "/about/?q=1#top")), (200, "<h1>About</h1>".into()));
        assert_eq!(answer(dir.path(), "/about"), Reply::Redirect("/about/".into()));
        assert_eq!(body(answer(dir.path(), "/missing/")), (404, "<h1>Not found</h1>".into()));
        let Reply::File { content_type, .. } = answer(dir.path(), "/pagefind/pagefind.js") else { panic!() };
        assert_eq!(content_type, "text/javascript; charset=utf-8");
    }

    #[test]
    fn never_serves_outside_the_site() {
        let dir = site();
        fs::write(dir.path().parent().unwrap().join("secret.txt"), "no").ok();
        for bad in ["/../secret.txt", "/%2e%2e/secret.txt", "/about/../../secret.txt", "relative", "/%zz"] {
            assert!(matches!(answer(dir.path(), bad), Reply::Refused(400)), "{bad}");
        }
    }

    #[test]
    fn answers_over_the_network_on_this_computer_only() {
        let dir = site();
        let server = PreviewServer::start(dir.path().to_path_buf()).unwrap();
        let url = server.url();
        assert!(url.starts_with("http://127.0.0.1:"), "{url}");
        let get = |request: &str| {
            let mut stream = TcpStream::connect(server.addr).unwrap();
            stream.write_all(request.as_bytes()).unwrap();
            let mut out = String::new();
            stream.read_to_string(&mut out).unwrap();
            out
        };
        let home = get("GET / HTTP/1.1\r\nHost: x\r\n\r\n");
        assert!(home.starts_with("HTTP/1.1 200 OK\r\n"), "{home}");
        assert!(home.contains("Content-Type: text/html; charset=utf-8"));
        assert!(home.ends_with("<h1>Home</h1>"));
        let moved = get("GET /about HTTP/1.1\r\n\r\n");
        assert!(moved.starts_with("HTTP/1.1 301") && moved.contains("Location: /about/\r\n"), "{moved}");
        let head = get("HEAD /about/ HTTP/1.1\r\n\r\n");
        assert!(head.contains("Content-Length: 14") && !head.contains("<h1>"), "{head}");
        assert!(get("POST / HTTP/1.1\r\n\r\n").starts_with("HTTP/1.1 405"));
        // A new build shows on the next request.
        fs::write(dir.path().join("index.html"), "<h1>New</h1>").unwrap();
        assert!(get("GET / HTTP/1.1\r\n\r\n").ends_with("<h1>New</h1>"));
    }
}

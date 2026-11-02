//! Output validation: checks each rendered page before anything is published.
//!
//! The renderer is the only producer of these files and React escapes all
//! text and attribute values, so a small tag scanner is enough here; it
//! skips comments and the raw text inside `<style>` and `<script>`.

/// One problem found on one page, written for the site owner.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Issue {
    pub page: String,
    pub message: String,
}

impl std::fmt::Display for Issue {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}: {}", self.page, self.message)
    }
}

#[derive(Debug)]
struct Tag {
    name: String,
    closing: bool,
    attrs: Vec<(String, String)>,
    /// Byte offset just past the tag's `>`.
    end: usize,
}

impl Tag {
    fn attr(&self, name: &str) -> Option<&str> {
        self.attrs.iter().find(|(n, _)| n == name).map(|(_, v)| v.as_str())
    }
}

/// Library photos (`/media/<file>`) a page shows, from `src` and `srcset`, in order, without repeats (F034).
pub fn media_refs(html: &str) -> Vec<String> {
    let mut refs: Vec<String> = Vec::new();
    for tag in scan(html).iter().filter(|t| !t.closing && t.name == "img") {
        let src = tag.attr("src").into_iter();
        let srcset = tag.attr("srcset").into_iter().flat_map(|s| s.split(',').filter_map(|c| c.split_whitespace().next()));
        for url in src.chain(srcset) {
            if let Some(file) = url.strip_prefix("/media/")
                && !refs.iter().any(|r| r == file)
            {
                refs.push(file.to_string());
            }
        }
    }
    refs
}

/// True when the page asks search engines not to list it (`<meta name="robots" content="noindex">`, F036).
pub fn is_noindex(html: &str) -> bool {
    scan(html).iter().any(|t| {
        !t.closing
            && t.name == "meta"
            && t.attr("name").is_some_and(|n| n.eq_ignore_ascii_case("robots"))
            && t.attr("content").is_some_and(|c| c.to_ascii_lowercase().split(',').any(|v| v.trim() == "noindex"))
    })
}

/// Checks one rendered page. `page` is its URL path, used in messages.
pub fn validate_page(page: &str, html: &str) -> Vec<Issue> {
    let mut messages = Vec::new();
    let tags = scan(html);

    let title = tags
        .iter()
        .find(|t| !t.closing && t.name == "title")
        .map(|t| inner_text(html, t));
    match title {
        None => messages.push("The page has no title. Add one in the page settings.".to_string()),
        Some(t) if t.is_empty() => messages.push("The page title is empty. Add one in the page settings.".to_string()),
        Some(_) => {}
    }

    let description = tags
        .iter()
        .find(|t| !t.closing && t.name == "meta" && t.attr("name") == Some("description"))
        .and_then(|t| t.attr("content"));
    if description.is_none_or(|d| d.trim().is_empty()) {
        messages.push(
            "The page has no description. Add a short summary in the page settings; search engines show it under the title."
                .to_string(),
        );
    }

    for img in tags.iter().filter(|t| !t.closing && t.name == "img") {
        match img.attr("alt") {
            // alt="" is an explicit "decorative image" choice.
            Some(alt) if alt.is_empty() || !alt.trim().is_empty() => {}
            _ => {
                let src = img.attr("src").unwrap_or("");
                messages.push(format!(
                    "The image {} has no alt text. Describe the image in its Alt text field so people using screen readers know what it shows.",
                    quote(src)
                ));
            }
        }
    }

    // An Image block with no URL renders its editor placeholder instead of an <img>.
    let empty_images = tags
        .iter()
        .filter(|t| !t.closing && t.attr("class").is_some_and(|c| c.split_whitespace().any(|c| c == "cr-image-empty")))
        .count();
    match empty_images {
        0 => {}
        1 => messages.push("An Image block has no image URL. Add the image's address, or remove the block.".to_string()),
        n => messages.push(format!("{n} Image blocks have no image URL. Add each image's address, or remove those blocks.")),
    }

    // F077: an Icon block that is a link needs a name, or screen readers only say "link".
    let unnamed_icons = tags.iter().filter(|t| !t.closing && t.attr("data-cr-needs-name").is_some()).count();
    match unnamed_icons {
        0 => {}
        1 => messages.push(
            "An icon is a link but has no name. Say where it goes in the Icon block's \"Name for screen readers\" (for example \"Call us\").".to_string(),
        ),
        n => messages.push(format!(
            "{n} icons are links but have no name. Say where each goes in its Icon block's \"Name for screen readers\" (for example \"Call us\")."
        )),
    }

    // F046: template sample content still marked "replace me".
    let samples: Vec<&str> = tags.iter().filter(|t| !t.closing).filter_map(|t| t.attr("data-crust-placeholder")).collect();
    if !samples.is_empty() {
        let shown: Vec<String> = samples.iter().take(10).map(|s| s.trim().to_string()).collect();
        let more = samples.len().saturating_sub(shown.len());
        let what = if samples.len() == 1 { "1 block still holds".to_string() } else { format!("{} blocks still hold", samples.len()) };
        messages.push(format!(
            "{what} the template's sample content: {}{}. Replace it, or choose \"Keep as is\" in the builder's \"To replace\" list.",
            shown.join("; "),
            if more > 0 { format!("; and {more} more") } else { String::new() }
        ));
    }

    let headings: Vec<(u8, String)> = tags
        .iter()
        .filter(|t| !t.closing)
        .filter_map(|t| heading_level(&t.name).map(|level| (level, inner_text(html, t))))
        .collect();

    let h1s: Vec<&String> = headings.iter().filter(|(l, _)| *l == 1).map(|(_, text)| text).collect();
    match h1s.len() {
        0 => messages.push(
            "The page has no main heading. Add one Heading block set to H1 at the top; it tells visitors and search engines what the page is about."
                .to_string(),
        ),
        1 => {}
        n => messages.push(format!(
            "The page has {n} main headings ({}). Keep one H1 and change the others to H2.",
            h1s.iter().map(|t| quote(t)).collect::<Vec<_>>().join(", ")
        )),
    }

    let mut previous: Option<&(u8, String)> = None;
    for heading in &headings {
        let (level, text) = heading;
        let prev_level = previous.map_or(0, |(l, _)| *l);
        if *level > prev_level + 1 {
            let message = match previous {
                // The h1 check above already covers a page with no h1 at all.
                None if h1s.is_empty() => None,
                None => Some(format!(
                    "The heading {} (H{level}) comes before the main heading. Put the H1 first.",
                    quote(text)
                )),
                Some((pl, pt)) => Some(format!(
                    "The heading {} jumps from H{pl} to H{level} after {}. Use H{} instead so screen-reader users don't think a section is missing.",
                    quote(text),
                    quote(pt),
                    pl + 1
                )),
            };
            messages.extend(message);
        }
        previous = Some(heading);
    }

    messages.into_iter().map(|message| Issue { page: page.to_string(), message }).collect()
}

fn heading_level(name: &str) -> Option<u8> {
    match name.as_bytes() {
        [b'h', d @ b'1'..=b'6'] => Some(d - b'0'),
        _ => None,
    }
}

/// Short quoted label for messages: “text”, cut at 60 characters.
fn quote(text: &str) -> String {
    const MAX: usize = 60;
    if text.is_empty() {
        return "(empty)".to_string();
    }
    if text.chars().count() > MAX {
        let cut: String = text.chars().take(MAX - 1).collect();
        format!("“{}…”", cut.trim_end())
    } else {
        format!("“{text}”")
    }
}

/// Text between an opening tag and its matching closing tag, with inner
/// tags removed, entities decoded and whitespace collapsed.
fn inner_text(html: &str, open: &Tag) -> String {
    let rest = &html[open.end..];
    let close = format!("</{}", open.name);
    let end = find_ci(rest, &close).unwrap_or(rest.len());
    let mut text = String::new();
    let mut in_tag = false;
    for c in rest[..end].chars() {
        match c {
            '<' => in_tag = true,
            '>' => in_tag = false,
            c if !in_tag => text.push(c),
            _ => {}
        }
    }
    decode_entities(&text).split_whitespace().collect::<Vec<_>>().join(" ")
}

fn find_ci(haystack: &str, needle: &str) -> Option<usize> {
    let needle = needle.to_ascii_lowercase();
    haystack.to_ascii_lowercase().find(&needle)
}

fn decode_entities(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    let mut rest = s;
    while let Some(pos) = rest.find('&') {
        out.push_str(&rest[..pos]);
        rest = &rest[pos..];
        let decoded = rest.find(';').filter(|&semi| semi <= 10).and_then(|semi| {
            let entity = &rest[1..semi];
            let c = match entity {
                "amp" => Some('&'),
                "lt" => Some('<'),
                "gt" => Some('>'),
                "quot" => Some('"'),
                "apos" => Some('\''),
                "nbsp" => Some('\u{a0}'),
                _ => entity
                    .strip_prefix("#x")
                    .or_else(|| entity.strip_prefix("#X"))
                    .and_then(|hex| u32::from_str_radix(hex, 16).ok())
                    .or_else(|| entity.strip_prefix('#').and_then(|dec| dec.parse().ok()))
                    .and_then(char::from_u32),
            };
            c.map(|c| (c, semi + 1))
        });
        match decoded {
            Some((c, len)) => {
                out.push(c);
                rest = &rest[len..];
            }
            None => {
                out.push('&');
                rest = &rest[1..];
            }
        }
    }
    out.push_str(rest);
    out
}

/// Lists the tags in document order.
fn scan(html: &str) -> Vec<Tag> {
    let bytes = html.as_bytes();
    let mut tags = Vec::new();
    let mut i = 0;
    while let Some(off) = html[i..].find('<') {
        i += off;
        if html[i..].starts_with("<!--") {
            i = html[i..].find("-->").map_or(html.len(), |e| i + e + 3);
            continue;
        }
        if html[i..].starts_with("<!") || html[i..].starts_with("<?") {
            i = html[i..].find('>').map_or(html.len(), |e| i + e + 1);
            continue;
        }
        let closing = bytes.get(i + 1) == Some(&b'/');
        let name_start = i + 1 + usize::from(closing);
        let name_len = html[name_start..]
            .bytes()
            .take_while(|b| b.is_ascii_alphanumeric() || *b == b'-')
            .count();
        if name_len == 0 {
            i += 1;
            continue;
        }
        let name = html[name_start..name_start + name_len].to_ascii_lowercase();
        let (attrs, end) = parse_attrs(html, name_start + name_len);
        let raw_text = !closing && (name == "style" || name == "script");
        let close = format!("</{name}");
        tags.push(Tag { name, closing, attrs, end });
        i = end;
        if raw_text {
            i = find_ci(&html[i..], &close).map_or(html.len(), |e| i + e);
        }
    }
    tags
}

/// Parses attributes from `start` up to the tag's `>`.
/// Returns them with names lowercased and values decoded, plus the offset past `>`.
fn parse_attrs(html: &str, start: usize) -> (Vec<(String, String)>, usize) {
    let bytes = html.as_bytes();
    let mut attrs = Vec::new();
    let mut i = start;
    loop {
        while i < bytes.len() && (bytes[i].is_ascii_whitespace() || bytes[i] == b'/') {
            i += 1;
        }
        if i >= bytes.len() {
            return (attrs, bytes.len());
        }
        if bytes[i] == b'>' {
            return (attrs, i + 1);
        }
        let name_start = i;
        while i < bytes.len() && !bytes[i].is_ascii_whitespace() && !matches!(bytes[i], b'=' | b'>' | b'/') {
            i += 1;
        }
        let name = html[name_start..i].to_ascii_lowercase();
        while i < bytes.len() && bytes[i].is_ascii_whitespace() {
            i += 1;
        }
        let mut value = String::new();
        if bytes.get(i) == Some(&b'=') {
            i += 1;
            while i < bytes.len() && bytes[i].is_ascii_whitespace() {
                i += 1;
            }
            match bytes.get(i) {
                Some(&q @ (b'"' | b'\'')) => {
                    let v_start = i + 1;
                    let v_end = html[v_start..].find(q as char).map_or(bytes.len(), |e| v_start + e);
                    value = decode_entities(&html[v_start..v_end]);
                    i = (v_end + 1).min(bytes.len());
                }
                _ => {
                    let v_start = i;
                    while i < bytes.len() && !bytes[i].is_ascii_whitespace() && bytes[i] != b'>' {
                        i += 1;
                    }
                    value = decode_entities(&html[v_start..i]);
                }
            }
        }
        attrs.push((name, value));
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn page(head: &str, body: &str) -> String {
        format!("<!doctype html><html><head>{head}<style>main > h1 {{ color: red }} </style></head><body><main>{body}</main></body></html>")
    }

    const HEAD: &str = r#"<title>Home</title><meta name="description" content="A page.">"#;

    fn messages(html: &str) -> Vec<String> {
        validate_page("/", html).into_iter().map(|i| i.message).collect()
    }

    #[test]
    fn validate_flags_leftover_placeholders() {
        let html = page(
            "<title>Home</title><meta name=\"description\" content=\"d\">",
            "<h1>Hi</h1><div class=\"cr-show\" data-crust-placeholder=\"Heading &#x201C;Your studio name&#x201D; (text)\"><h2>Your studio name</h2></div>\
             <div class=\"cr-show\" data-crust-placeholder=\"Image sample.jpg (photo)\"><img src=\"/media/sample.jpg\" alt=\"x\"></div>",
        );
        let found = messages(&html);
        assert_eq!(found.len(), 1, "{found:?}");
        assert!(found[0].starts_with("2 blocks still hold the template's sample content: Heading \u{201C}Your studio name\u{201D} (text); Image sample.jpg (photo)."), "{}", found[0]);
    }

    #[test]
    fn validate_placeholders_counts_one_and_caps_the_list() {
        let one = page("<title>t</title><meta name=\"description\" content=\"d\">", "<h1>Hi</h1><div data-crust-placeholder=\"Button (button text)\"></div>");
        assert!(messages(&one)[0].starts_with("1 block still holds the template's sample content: Button (button text)."));
        let many: String = (0..12).map(|i| format!("<div data-crust-placeholder=\"Text {i} (text)\"></div>")).collect();
        let html = page("<title>t</title><meta name=\"description\" content=\"d\">", &format!("<h1>Hi</h1>{many}"));
        let m = &messages(&html)[0];
        assert!(m.starts_with("12 blocks") && m.contains("Text 9 (text); and 2 more.") && !m.contains("Text 10"), "{m}");
    }

    #[test]
    fn validate_flags_icon_links_without_a_name() {
        let unnamed = r#"<a class="cr-icon-link" href="/menu" data-cr-needs-name="Icon"><span aria-hidden="true"></span></a>"#;
        let m = messages(&page(HEAD, &format!("<h1>Hi</h1>{unnamed}")));
        assert_eq!(m.len(), 1, "{m:?}");
        assert!(m[0].starts_with("An icon is a link but has no name."), "{}", m[0]);
        let m = messages(&page(HEAD, &format!("<h1>Hi</h1>{unnamed}{unnamed}")));
        assert!(m[0].starts_with("2 icons are links"), "{}", m[0]);
        let named = r#"<a class="cr-icon-link" href="/menu" aria-label="Our menu"><span aria-hidden="true"></span></a>"#;
        assert!(messages(&page(HEAD, &format!("<h1>Hi</h1>{named}"))).is_empty());
    }

    #[test]
    fn validate_accepts_a_good_page() {
        let html = page(
            HEAD,
            r#"<h1 class="cr-h1">Hi</h1><h2>A</h2><h3>B</h3><h2>C</h2><img src="a.jpg" alt="A cat"><img src="line.svg" alt="">"#,
        );
        assert_eq!(messages(&html), Vec::<String>::new());
    }

    #[test]
    fn validate_flags_image_without_alt() {
        let html = page(HEAD, r#"<h1>Hi</h1><img src="https://x.dev/cat.jpg" loading="lazy"><img src="b.jpg" alt="  ">"#);
        let m = messages(&html);
        assert_eq!(m.len(), 2, "{m:?}");
        assert!(m[0].contains("“https://x.dev/cat.jpg” has no alt text"));
        assert!(m[1].contains("“b.jpg”"));
    }

    #[test]
    fn validate_flags_image_blocks_without_url() {
        let empty = r#"<figure class="cr-image"><div class="cr-image-empty">Add an image URL</div></figure>"#;
        let m = messages(&page(HEAD, &format!("<h1>Hi</h1>{empty}")));
        assert_eq!(m, vec!["An Image block has no image URL. Add the image's address, or remove the block."]);
        let m = messages(&page(HEAD, &format!("<h1>Hi</h1>{empty}{empty}")));
        assert_eq!(m, vec!["2 Image blocks have no image URL. Add each image's address, or remove those blocks."]);
        // Only the exact class counts.
        assert!(messages(&page(HEAD, r#"<h1>Hi</h1><div class="cr-image-empty-ish"></div>"#)).is_empty());
    }

    #[test]
    fn validate_flags_missing_and_multiple_h1() {
        assert!(messages(&page(HEAD, "<h2>Only</h2>"))[0].contains("no main heading"));
        let m = messages(&page(HEAD, "<h1>One</h1><h1>Two</h1>"));
        assert_eq!(m, vec!["The page has 2 main headings (“One”, “Two”). Keep one H1 and change the others to H2."]);
    }

    #[test]
    fn validate_flags_skipped_heading_levels() {
        let m = messages(&page(HEAD, "<h1>Top</h1><h2>Sub</h2><h4>Deep</h4>"));
        assert_eq!(m.len(), 1);
        assert!(m[0].contains("“Deep” jumps from H2 to H4 after “Sub”. Use H3 instead"), "{m:?}");
    }

    #[test]
    fn validate_flags_heading_before_h1() {
        let m = messages(&page(HEAD, "<h2>Intro</h2><h1>Top</h1>"));
        assert_eq!(m, vec!["The heading “Intro” (H2) comes before the main heading. Put the H1 first."]);
    }

    #[test]
    fn validate_flags_missing_or_empty_title_and_description() {
        let m = messages(&page("", "<h1>Hi</h1>"));
        assert!(m[0].contains("no title"));
        assert!(m[1].contains("no description"));
        let m = messages(&page(r#"<title> </title><meta name="description" content="">"#, "<h1>Hi</h1>"));
        assert!(m[0].contains("title is empty"));
        assert!(m[1].contains("no description"));
    }

    #[test]
    fn validate_ignores_markup_in_comments_and_styles() {
        let html = page(HEAD, "<!-- <h1>old</h1> --><h1>Hi</h1><script>let s = '<h1>x</h1>'</script>");
        assert_eq!(messages(&html), Vec::<String>::new());
    }

    #[test]
    fn validate_reads_heading_text_with_entities_and_inner_tags() {
        let m = messages(&page(HEAD, "<h1>Q&amp;A <em>now</em></h1><h1>B</h1>"));
        assert!(m[0].contains("“Q&A now”"), "{m:?}");
    }

    #[test]
    fn validate_shortens_long_labels() {
        let long = "word ".repeat(30);
        let m = messages(&page(HEAD, &format!("<h1>{long}</h1><h1>B</h1>")));
        assert!(m[0].contains("…”"), "{m:?}");
    }

    #[test]
    fn validate_decodes_attribute_entities() {
        assert_eq!(decode_entities("a &amp; b &#39;c&#x27; &bogus; &"), "a & b 'c' &bogus; &");
    }
}

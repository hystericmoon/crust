import { defaultTokens, newPost, type MediaItem, type Post, type Site } from "@crust/blocks";
import { describe, expect, it } from "vitest";
import { renderBlogIndex, renderPost, rssFeed } from "./blog";

const site: Site = { name: "Haho & Co", baseUrl: "https://haho.test", language: "en-GB", tokens: defaultTokens };
const blog = { title: "News", intro: "From the studio." };
const first: Post = { ...newPost("Opening day", "opening-day", "2026-10-01"), description: "We open on Friday.", cover: "/media/door.jpg", coverAlt: "Our red front door" };
const second: Post = { ...newPost("Autumn <menu>", "autumn-menu", "2026-10-30"), description: "Soup & bread." };
const media: MediaItem[] = [{ file: "door.jpg", alt: "Door", width: 1600, height: 1000, bytes: 1, uploadedAt: "" }];

describe("published posts (F035)", () => {
  it("renders a post with its title as the only h1, date, summary and cover", () => {
    const html = renderPost(site, first, blog, "", { media });
    expect(html).toContain("<title>Opening day | Haho &amp; Co</title>");
    expect(html).toContain('<meta name="description" content="We open on Friday.">');
    expect(html).toContain('<link rel="alternate" type="application/rss+xml" title="News | Haho &amp; Co" href="/blog/feed.xml">');
    expect(html.match(/<h1/g)).toHaveLength(1);
    expect(html).toContain('<h1 class="cr-heading cr-h1">Opening day</h1>');
    expect(html).toContain('<a href="/blog/">News</a>');
    expect(html).toContain('<time dateTime="2026-10-01">1 October 2026</time>');
    expect(html).toContain('<img class="cr-post-cover" src="/media/door.jpg" srcSet="/media/door-480w.jpg 480w');
    expect(html).toContain('alt="Our red front door"');
    expect(html).toContain("Start writing here.");
  });

  it("lists posts newest first on /blog/, each title a link", () => {
    const html = renderBlogIndex(site, [first, second], blog, "", { media });
    expect(html).toContain("<title>News | Haho &amp; Co</title>");
    expect(html).toContain('<h1 class="cr-heading cr-h1">News</h1>');
    expect(html.indexOf("autumn-menu")).toBeLessThan(html.indexOf("opening-day"));
    expect(html).toContain('<h2 class="cr-heading cr-h3"><a href="/blog/autumn-menu/">Autumn &lt;menu&gt;</a></h2>');
    // The cover next to a linked title is decoration.
    expect(html).toMatch(/<img class="cr-post-thumb" src="\/media\/door.jpg"[^>]*alt=""/);
  });

  it("writes an RSS feed with full addresses, escaped", () => {
    const xml = rssFeed(site, [first, second], blog, "https://haho.pages.dev/");
    expect(xml).toMatch(/^<\?xml version="1.0" encoding="UTF-8"\?>\n<rss version="2.0"/);
    expect(xml).toContain("<title>News | Haho &amp; Co</title>");
    expect(xml).toContain("<link>https://haho.pages.dev/blog/</link>");
    expect(xml).toContain('<atom:link href="https://haho.pages.dev/blog/feed.xml" rel="self" type="application/rss+xml"/>');
    expect(xml).toContain("<item><title>Autumn &lt;menu&gt;</title><link>https://haho.pages.dev/blog/autumn-menu/</link>");
    expect(xml).toContain("<pubDate>Fri, 30 Oct 2026 00:00:00 GMT</pubDate><description>Soup &amp; bread.</description>");
    expect(xml.indexOf("autumn-menu")).toBeLessThan(xml.indexOf("opening-day"));
    expect(xml).toContain("<language>en-GB</language>");
  });
});

/** F082: post, blog and "Page not found" designs, published. */
import { currentDesign, defaultTokens, designLayoutsFor, newPost, type MediaItem, type PageDesign, type Post, type Site } from "@crust/blocks";
import type { ComponentData } from "@puckeditor/core";
import { describe, expect, it } from "vitest";
import { renderBlogIndex, renderPost } from "./blog";
import { renderNotFound } from "./render";
import { readSiteContent, renderSite, type ContentSource } from "./site";

const site: Site = { name: "Corner", baseUrl: "https://corner.test", language: "en-GB", tokens: defaultTokens };
const blog = { title: "News", intro: "From the bakery." };
const loaves: Post = { ...newPost("Winter loaves are back", "winter-loaves", "2026-11-02"), description: "Rye and spelt from Friday.", cover: "/media/loaves.jpg", coverAlt: "Loaves on a rack" };
const wheel: Post = { ...newPost("A morning at the wheel", "wheel", "2026-10-20"), description: "Clay day." };
const coffee: Post = { ...newPost("New coffee", "coffee", "2026-10-08"), description: "" };
const media: MediaItem[] = [{ file: "loaves.jpg", alt: "Loaves", width: 1600, height: 1200, bytes: 1, uploadedAt: "" }];

const design = (kind: PageDesign["kind"], content: ComponentData[], title?: string): PageDesign => ({ kind, savedAt: "", content, ...(title ? { title } : {}) });
const start = (id: string) => designLayoutsFor(id.startsWith("post") ? "post" : id.startsWith("blog") ? "blog" : "notFound").find((l) => l.id === id)!.build();
const h1s = (html: string) => html.match(/<h1[ >]/g)?.length ?? 0;

describe("post page design (F082)", () => {
  it("without a design, posts look as before", () => {
    expect(renderPost(site, loaves, blog, "", { media, designs: {} })).toBe(renderPost(site, loaves, blog, "", { media }));
  });

  it("puts the post's title, details, summary, cover and own blocks where the design says", () => {
    const signup = { type: "Section", props: { id: "s-signup", background: "surface", paddingY: "md", content: [{ type: "Heading", props: { id: "h-signup", text: "Get new posts by email", level: "h2", align: "left" } }] } };
    const html = renderPost(site, loaves, blog, "", { media, designs: { post: design("post", [...currentDesign("post"), signup as ComponentData]) } });
    expect(h1s(html)).toBe(1);
    expect(html).toContain('<h1 class="cr-heading cr-h1 cr-align-left">Winter loaves are back</h1>');
    expect(html).toContain('<p class="cr-post-meta cr-align-left"><a href="/blog/">News</a><span aria-hidden="true"> · </span><time dateTime="2026-11-02">2 November 2026</time></p>');
    expect(html).toContain('<p class="cr-post-summary cr-align-left">Rye and spelt from Friday.</p>');
    expect(html).toMatch(/<img class="cr-post-cover cr-cover-auto" src="\/media\/loaves.jpg"[^>]*alt="Loaves on a rack"/);
    // The post's own text sits between the top and the design's own section.
    const own = html.indexOf("Start writing here.");
    expect(own).toBeGreaterThan(html.indexOf("Winter loaves are back</h1>"));
    expect(own).toBeLessThan(html.indexOf("Get new posts by email"));
    expect(html).toContain('<article class="cr-post">');
    // Sharing still uses the cover; the title is the post's.
    expect(html).toContain("<title>Winter loaves are back | Corner</title>");
    expect(html).toContain('<meta property="og:type" content="article">');
  });

  it("a Post list on the post page leaves out the post itself", () => {
    const more = { type: "PostList", props: { id: "more", look: "cards", columns: "3", count: "3", photo: "yes", date: "yes", summary: "no", titleLevel: "h3" } };
    const html = renderPost(site, loaves, blog, "", { designs: { post: design("post", [...currentDesign("post"), more as ComponentData]) }, posts: [coffee, loaves, wheel] });
    expect(html).toContain('<ul class="cr-post-list cr-post-list-cards cr-post-cols-3">');
    expect(html).toContain('<h3 class="cr-heading cr-h3"><a href="/blog/wheel/">A morning at the wheel</a></h3>');
    expect(html.indexOf("/blog/wheel/")).toBeLessThan(html.indexOf("/blog/coffee/"));
    expect(html).not.toContain('href="/blog/winter-loaves/"');
  });

  it("“On the photo” fills the top with the cover and makes the header able to sit on it", () => {
    const html = renderPost(site, loaves, blog, "", { media, designs: { post: design("post", start("post-cover")) } });
    expect(html).toMatch(/<section class="cr-section cr-style-dark cr-height-large cr-valign-bottom cr-post-hero"><picture class="cr-picture">/);
    expect(html).toContain('<div class="cr-section-tint cr-tint-strong" aria-hidden="true"></div>');
    expect(html).toContain('<h1 class="cr-heading cr-h1 cr-display cr-align-left">Winter loaves are back</h1>');
    expect(h1s(html)).toBe(1);
    const over = renderPost({ ...site, header: { overHero: true } as Site["header"] }, loaves, blog, "", { media, designs: { post: design("post", start("post-cover")) } });
    expect(over).toContain("cr-page-header-over");
    // Without a cover it's a plain dark section, still with the title.
    const plain = renderPost(site, wheel, blog, "", { designs: { post: design("post", start("post-cover")) } });
    expect(plain).not.toContain("cr-section-media");
    expect(plain).toContain("A morning at the wheel</h1>");
  });

  it("“Split” puts the title beside a tall cover cropped to its focal point", () => {
    const html = renderPost(site, loaves, blog, "", { media: [{ ...media[0]!, focus: { x: 30, y: 60 } }], designs: { post: design("post", start("post-split")) } });
    expect(html).toContain("cr-columns");
    expect(html).toMatch(/class="cr-post-cover cr-cover-tall"[^>]*style="object-position:30% 60%"/);
  });

  it("scripts follow the design's blocks too", () => {
    const tabs = { type: "Tabs", props: { id: "Tabs-d", look: "underline", titleLevel: "h2", tabs: [{ label: "One", text: "a" }, { label: "Two", text: "b" }] } };
    const html = renderPost(site, wheel, blog, "", { designs: { post: design("post", [...currentDesign("post"), tabs as ComponentData]) } });
    expect(html).toMatch(/<script type="module">[^<]*cr-tabs/);
  });
});

describe("blog page design (F082)", () => {
  it("without a design, the list looks as before", () => {
    expect(renderBlogIndex(site, [loaves, wheel], blog, "", { designs: {} })).toBe(renderBlogIndex(site, [loaves, wheel], blog, ""));
  });

  it("“Cards” (today's look as a design) shows the blog's title, intro and every post", () => {
    const html = renderBlogIndex(site, [wheel, loaves, coffee], blog, "", { media, designs: { blog: design("blog", start("blog-cards")) } });
    expect(h1s(html)).toBe(1);
    expect(html).toContain('<h1 class="cr-heading cr-h1 cr-align-left">News</h1>');
    expect(html).toContain('<p class="cr-post-summary cr-align-left">From the bakery.</p>');
    expect(html).toContain('<ul class="cr-post-list cr-post-list-cards">');
    expect(html.indexOf("winter-loaves")).toBeLessThan(html.indexOf("/blog/wheel/"));
    expect(html).toContain('<h2 class="cr-heading cr-h3"><a href="/blog/winter-loaves/">Winter loaves are back</a></h2>');
    expect(html).toMatch(/<img class="cr-post-thumb" src="\/media\/loaves.jpg"[^>]*alt=""/);
    // The list page isn't in the search index (the posts are).
    expect(html).not.toContain("data-pagefind-body");
  });

  it("“Featured” makes the newest post large; “List” puts one per row; counts and switches apply", () => {
    const featured = renderBlogIndex(site, [wheel, loaves], blog, "", { designs: { blog: design("blog", start("blog-featured")) } });
    expect(featured).toContain('<li class="cr-post-item cr-post-featured"><article>');
    expect(featured).toContain('<h2 class="cr-heading cr-h2"><a href="/blog/winter-loaves/">');
    const list = { type: "PostList", props: { id: "l", look: "list", columns: "auto", count: "3", photo: "no", date: "no", summary: "no", titleLevel: "h2" } };
    const title = { type: "BlogTitle", props: { id: "t", size: "normal", align: "left" } };
    const posts = [1, 2, 3, 4].map((i) => ({ ...wheel, slug: `p${i}`, title: `Post ${i}`, date: `2026-10-0${i}` }));
    const html = renderBlogIndex(site, posts, blog, "", { designs: { blog: design("blog", [title, list] as ComponentData[]) } });
    expect(html.match(/<li class="cr-post-item">/g)).toHaveLength(3);
    expect(html).not.toContain("<time");
    expect(html).not.toContain("Clay day.");
  });
});

describe("“Page not found” design (F082)", () => {
  it("without a design, the 404 page is as before; with one, it's the design with its title", () => {
    expect(renderNotFound(site, "", { designs: {} })).toBe(renderNotFound(site, ""));
    const html = renderNotFound(site, "", { designs: { notFound: design("notFound", start("not-found-helpful"), "Halaman tidak ditemukan") } });
    expect(html).toContain("<title>Halaman tidak ditemukan | Corner</title>");
    expect(html).toContain("We couldn&#x27;t find that page");
    expect(html).toContain('href="/search/"');
    expect(h1s(html)).toBe(1);
    expect(html).not.toContain("data-pagefind-body");
  });
});

describe("reading designs from content/ (F082)", () => {
  const source = (files: Record<string, string>): ContentSource => ({
    read: async (p) => files[p] ?? null,
    list: async (dir) => Object.keys(files).filter((p) => p.startsWith(`${dir}/`)).map((p) => p.slice(dir.length + 1)),
  });
  const siteJson = JSON.stringify(site);

  it("reads designs and publishes the post, blog and 404 pages with them", async () => {
    const files = {
      "site.json": siteJson,
      "posts/winter-loaves.json": JSON.stringify(loaves),
      "designs/post.json": JSON.stringify(design("post", start("post-split"))),
      "designs/blog.json": JSON.stringify(design("blog", start("blog-list"))),
      "designs/404.json": JSON.stringify(design("notFound", start("not-found-statement"))),
    };
    const content = await readSiteContent(source(files));
    expect(Object.keys(content.designs ?? {}).sort()).toEqual(["blog", "notFound", "post"]);
    const out = new Map(renderSite(content, "").map((f) => [f.path, f.content]));
    expect(out.get("blog/winter-loaves/index.html")).toContain("cr-cover-tall");
    expect(out.get("blog/index.html")).toContain("cr-post-list-list");
    expect(out.get("404.html")).toContain("This page has moved or never was");
  });

  it("a damaged design stops the publish, saying which and why", async () => {
    const files = { "site.json": siteJson, "designs/post.json": JSON.stringify(design("post", [{ type: "PostTitle", props: { id: "t" } }] as ComponentData[])) };
    await expect(readSiteContent(source(files))).rejects.toThrow(/The Post page design \(content\/designs\/post.json\) can't be published\. The post page design needs a “Post content” block/);
    await expect(readSiteContent(source({ "site.json": siteJson, "designs/404.json": "{" }))).rejects.toThrow(/The file is damaged/);
  });
});

import { defaultTokens, newPost, type MediaItem, type Page, type Site } from "@crust/blocks";
import { describe, expect, it } from "vitest";
import { renderPost } from "./blog";
import { renderPage } from "./render";

const site: Site = { name: "Haho", baseUrl: "https://haho.test", language: "en", tokens: defaultTokens };
const page = (over: Partial<Page> = {}): Page => ({
  path: "/about",
  title: "About",
  description: "Who we are & what we do.",
  puck: { root: { props: {} }, content: [{ type: "Heading", props: { id: "h", text: "About", level: "h1", align: "left" } }] },
  ...over,
});
const media: MediaItem[] = [{ file: "team.jpg", alt: "Team", width: 2400, height: 1600, bytes: 1, uploadedAt: "" }];

describe("search and sharing tags (F036)", () => {
  it("every page gets a canonical address and sharing tags", () => {
    const html = renderPage(site, page(), "", { baseUrl: "https://haho.pages.dev/" });
    expect(html).toContain('<link rel="canonical" href="https://haho.pages.dev/about/">');
    expect(html).toContain('<meta property="og:type" content="website">');
    expect(html).toContain('<meta property="og:site_name" content="Haho">');
    expect(html).toContain('<meta property="og:title" content="About">');
    expect(html).toContain('<meta property="og:description" content="Who we are &amp; what we do.">');
    expect(html).toContain('<meta property="og:url" content="https://haho.pages.dev/about/">');
    expect(html).toContain('<meta name="twitter:card" content="summary">');
    expect(html).not.toContain("og:image");
    expect(html).not.toContain("robots");
    expect(html).toContain("<title>About | Haho</title>");
  });

  it("uses the search title, the social image (1440 px copy) and noindex", () => {
    const html = renderPage(site, page({ seo: { title: "About Haho, a small studio", image: "/media/team.jpg", imageAlt: "The team", noindex: true } }), "", { media });
    expect(html).toContain("<title>About Haho, a small studio</title>");
    expect(html).toContain('<meta property="og:title" content="About Haho, a small studio">');
    expect(html).toContain('<meta property="og:image" content="https://haho.test/media/team-1440w.jpg">');
    expect(html).toContain('<meta property="og:image:alt" content="The team">');
    expect(html).toContain('<meta name="twitter:card" content="summary_large_image">');
    expect(html).toContain('<meta name="robots" content="noindex">');
  });

  it("keeps web-address images and refuses unsafe ones", () => {
    expect(renderPage(site, page({ seo: { image: "https://cdn.test/a.jpg", imageAlt: "A" } }), "")).toContain('content="https://cdn.test/a.jpg"');
    expect(renderPage(site, page({ seo: { image: "javascript:alert(1)", imageAlt: "A" } }), "")).not.toContain("og:image");
  });

  it("the home page's address ends in a single slash", () => {
    expect(renderPage(site, page({ path: "/" }), "")).toContain('<link rel="canonical" href="https://haho.test/">');
  });

  it("a shared post shows its cover and is an article", () => {
    const html = renderPost(site, { ...newPost("Hello", "hello", "2026-10-30"), cover: "/media/team.jpg", coverAlt: "Team" }, { title: "Blog", intro: "" }, "", { media });
    expect(html).toContain('<meta property="og:type" content="article">');
    expect(html).toContain('<meta property="og:url" content="https://haho.test/blog/hello/">');
    expect(html).toContain('<meta property="og:image" content="https://haho.test/media/team-1440w.jpg">');
  });
});

describe("site-wide search defaults (F094)", () => {
  const withSeo: Site = { ...site, seo: { description: "Sourdough by the loaf.", image: "/media/team.jpg", imageAlt: "The team" } };

  it("a site without defaults publishes exactly as before", () => {
    const html = renderPage(site, page({ description: "" }), "");
    expect(html).toContain('<meta name="description" content="">');
    expect(html).not.toContain("og:image");
  });

  it("a page with no description gets the site's; a page with its own keeps it", () => {
    expect(renderPage(withSeo, page({ description: "" }), "")).toContain('<meta name="description" content="Sourdough by the loaf.">');
    expect(renderPage(withSeo, page({ description: "  " }), "")).toContain('<meta property="og:description" content="Sourdough by the loaf.">');
    expect(renderPage(withSeo, page(), "")).toContain('<meta name="description" content="Who we are &amp; what we do.">');
  });

  it("a page with no sharing picture gets the site's, with the site's alt text; a page with its own keeps it", () => {
    const html = renderPage(withSeo, page(), "", { media });
    expect(html).toContain('<meta property="og:image" content="https://haho.test/media/team-1440w.jpg">');
    expect(html).toContain('<meta property="og:image:alt" content="The team">');
    expect(html).toContain('<meta name="twitter:card" content="summary_large_image">');
    const own = renderPage(withSeo, page({ seo: { image: "https://cdn.test/own.jpg", imageAlt: "Ours" } }), "");
    expect(own).toContain('content="https://cdn.test/own.jpg"');
    expect(own).toContain('<meta property="og:image:alt" content="Ours">');
    expect(own).not.toContain("team.jpg");
  });

  it("escapes the default description", () => {
    const html = renderPage({ ...site, seo: { description: '"><script>x</script>' } }, page({ description: "" }), "");
    expect(html).not.toContain("<script>x</script>");
    expect(html).toContain("&lt;script&gt;");
  });
});


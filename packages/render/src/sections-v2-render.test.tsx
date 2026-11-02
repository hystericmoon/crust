import { defaultTokens, type Page, type Site } from "@crust/blocks";
import { describe, expect, it } from "vitest";
import { renderPage } from "./render";
import { renderPost } from "./blog";

const site: Site = {
  name: "Test",
  baseUrl: "https://example.test",
  language: "en",
  tokens: defaultTokens,
  header: { show: true, sticky: true, style: "background", menu: [{ label: "About", href: "/about" }] },
} as Site;
const page = (content: unknown[]): Page => ({ path: "/", title: "Home", description: "Desc", puck: { root: { props: {} }, content } as Page["puck"] });
const hero = (props: Record<string, unknown>) => ({ type: "Section", props: { id: "s1", background: "dark", paddingY: "lg", content: [], ...props } });

describe("F073 sections v2 on published pages", () => {
  it("puts the header on the first section, in its style, not sticky", () => {
    const html = renderPage(site, page([hero({ headerOver: true })]), "");
    expect(html).toContain('<body class="cr-page cr-page-header-over">');
    expect(html).toContain('<header class="cr-site-header cr-style-dark cr-header-over">');
    expect(html).not.toContain("cr-sticky");
    expect(html).not.toContain("cr-has-sticky");
    expect(html).toContain("cr-under-header");
  });

  it("keeps the usual header when the first block doesn't ask, or the header is off", () => {
    const later = renderPage(site, page([hero({}), hero({ id: "s2", headerOver: true })]), "");
    expect(later).toContain('<body class="cr-page">');
    expect(later).toContain('<header class="cr-site-header cr-style-background cr-sticky">');
    // A section moved down drops the flag.
    expect(later).not.toContain("cr-under-header");
    const off = renderPage({ ...site, header: { ...site.header!, show: false } } as Site, page([hero({ headerOver: true })]), "");
    expect(off).toContain('<body class="cr-page">');
  });

  it("adds the video script only to pages with a background video", () => {
    const video = hero({ bgKind: "video", imageSrc: "/media/still.jpg", videoSrc: "https://cdn.example.com/loop.webm" });
    const html = renderPage(site, page([video]), "");
    expect(html).toContain('<script type="module">const still=matchMedia("(prefers-reduced-motion: reduce)")');
    expect(html).toContain('type="video/webm"');
    expect(renderPage(site, page([hero({ imageSrc: "/media/still.jpg" })]), "")).not.toContain("<script");
  });

  it("adds the video script to posts with a background video", () => {
    const video = hero({ bgKind: "video", imageSrc: "/media/still.jpg", videoSrc: "/media/loop.mp4" });
    const post = { slug: "p", title: "Post", description: "", date: "2026-11-02", cover: "", coverAlt: "", puck: { root: { props: {} }, content: [video] } };
    const html = renderPost(site, post as never, { title: "News", intro: "" }, "", {});
    expect(html).toContain("prefers-reduced-motion");
  });
});

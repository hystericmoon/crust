import { defaultTokens, fontPairs, newPost, pairFonts, type Page, type Site } from "@crust/blocks";
import { describe, expect, it } from "vitest";
import { renderPost } from "./blog";
import { renderNotFound, renderPage } from "./render";
import { renderSite, type SiteContent } from "./site";

const editorial = pairFonts(fontPairs.find((p) => p.id === "editorial")!);
const site = (fonts = defaultTokens.fonts): Site => ({ name: "Haho", baseUrl: "https://haho.test", language: "en", tokens: { ...defaultTokens, fonts } });
const page: Page = {
  path: "/",
  title: "Home",
  description: "d",
  puck: { root: { props: {} }, content: [{ type: "Heading", props: { id: "h", text: "Hello", level: "h1", align: "left" } }] },
};

describe("fonts in published pages (F070)", () => {
  it("adds the font rules and preloads for a site with a bundled pair", () => {
    const html = renderPage(site(editorial), page, "");
    expect(html).toContain('<link rel="preload" href="/fonts/fraunces-latin.woff2" as="font" type="font/woff2" crossorigin>');
    expect(html).toContain('<link rel="preload" href="/fonts/inter-tight-latin.woff2" as="font" type="font/woff2" crossorigin>');
    expect(html).toContain("@font-face { font-family: 'Fraunces'");
    expect(html).toContain("src: url(/fonts/inter-tight-latin-ext.woff2)");
    // Preloads come before the styles, so the browser starts on them first.
    expect(html.indexOf('rel="preload"')).toBeLessThan(html.indexOf("<style>"));
    expect(html).not.toMatch(/fonts\.(googleapis|gstatic)\.com/);
  });

  it("changes nothing for a site on system fonts", () => {
    const html = renderPage(site(), page, "");
    expect(html).not.toContain("@font-face");
    expect(html).not.toContain('rel="preload"');
    expect(html).not.toContain("/fonts/");
  });

  it("uses the fonts on posts, the 404 page and every rendered page", () => {
    expect(renderNotFound(site(editorial), "")).toContain("/fonts/fraunces-latin.woff2");
    const post = newPost("Opening day", "opening-day", "2026-10-30");
    expect(renderPost(site(editorial), post, { title: "News", intro: "" }, "")).toContain("/fonts/fraunces-latin.woff2");
    const content: SiteContent = { site: site(editorial), pages: [{ file: "index.json", page }], posts: [], blog: { title: "News", intro: "" }, media: [], linkedSections: new Map() };
    for (const file of renderSite(content, "").filter((f) => f.path.endsWith(".html"))) {
      expect(file.content, file.path).toContain('href="/fonts/fraunces-latin.woff2"');
    }
  });
});

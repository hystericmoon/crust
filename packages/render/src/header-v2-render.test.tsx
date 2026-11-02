import { defaultTokens, type Page, type Site } from "@crust/blocks";
import { describe, expect, it } from "vitest";
import { renderPage } from "./render";

const site = (header: Record<string, unknown> = {}, footer: Record<string, unknown> = {}): Site =>
  ({ name: "Atelier", baseUrl: "https://atelier.test", language: "en", tokens: defaultTokens, header, footer }) as Site;
const page = (first: Record<string, unknown>): Page => ({
  path: "/",
  title: "Home",
  description: "Hi",
  puck: { root: { props: {} }, content: [{ type: "Section", props: { id: "s", background: "dark", paddingY: "lg", content: [], ...first } }] },
});
const photo = page({ imageSrc: "/media/a.jpg" });
const plain = page({});
const footerSection = {
  id: "footer",
  name: "Footer",
  savedAt: "2026-11-02T00:00:00Z",
  content: [{ type: "Section", props: { id: "f", background: "dark", paddingY: "lg", content: [{ type: "Text", props: { id: "t", text: "Let's make something.", align: "left", tone: "default" } }] } }],
};

describe("published header v2 (F076)", () => {
  it("sits clear on a first photo section when asked, and stays solid elsewhere", () => {
    const on = site({ overHero: true });
    expect(renderPage(on, photo, "")).toContain('<header class="cr-site-header cr-style-dark cr-header-over">');
    expect(renderPage(on, photo, "")).toContain('<body class="cr-page cr-page-header-over">');
    expect(renderPage(on, plain, "")).toContain('<header class="cr-site-header cr-style-background">');
    expect(renderPage(site(), photo, "")).toContain('<header class="cr-site-header cr-style-background">');
  });

  it("adds the small closing script only when the menu has a dropdown", () => {
    const menu = [{ label: "Studio", href: "", children: [{ label: "Team", href: "/team" }] }];
    expect(renderPage(site({ menu }), plain, "")).toContain('<script type="module">document.addEventListener("keydown"');
    expect(renderPage(site(), plain, "")).not.toContain("<script");
  });

  it("leaves room for a taller header (logo on top, top bar)", () => {
    expect(renderPage(site(), plain, "")).toMatch(/<html lang="en">/);
    expect(renderPage(site({ layout: "stacked" }), plain, "")).toContain('<html lang="en" style="--cr-header-room: 112px">');
    expect(renderPage(site({ topBar: { show: true, text: "Hi" } }), plain, "")).toContain('style="--cr-header-room: 100px"');
  });
});

describe("published footer from blocks (F076)", () => {
  const blocks = site({}, { kind: "blocks", section: "footer", style: "dark" });

  it("shows the linked section's blocks, then the copyright line", () => {
    const html = renderPage(blocks, plain, "", { linkedSections: new Map([["footer", footerSection]]), year: 2026 });
    const footer = html.slice(html.indexOf("<footer"));
    expect(footer).toMatch(/^<footer class="cr-site-footer cr-footer-blocks"><section class="cr-section cr-style-dark/);
    expect(footer).toContain("Let&#x27;s make something.");
    expect(footer).toContain('<div class="cr-footer-end cr-style-dark"><div class="cr-container"><p class="cr-footer-copy">© 2026 Atelier</p></div></div></footer>');
  });

  it("stops the publish when its section is missing, and names the fix", () => {
    expect(() => renderPage(blocks, plain, "", { linkedSections: new Map() })).toThrow(/The footer uses the linked section "footer", which doesn't exist/);
  });

  it("without the sections at hand (a preview), the simple footer stands in", () => {
    expect(renderPage(blocks, plain, "")).toContain('<footer class="cr-site-footer cr-style-dark">');
  });
});

import { defaultTokens, type Page, type Site } from "@crust/blocks";
import { describe, expect, it } from "vitest";
import { renderPage } from "./render";

const pages = [
  { path: "/", title: "Welcome" },
  { path: "/about", title: "About" },
];
const site: Site = { name: "Haho & Co", baseUrl: "https://example.test", language: "en", tokens: defaultTokens };
const page = (path: string): Page => ({
  path,
  title: "About",
  description: "d",
  puck: { root: { props: {} }, content: [{ type: "Heading", props: { id: "h", text: "About", level: "h1", align: "left" } }] },
});

describe("published header", () => {
  it("adds a skip link, the header before main, and marks the current page", () => {
    const html = renderPage(site, page("/about"), "", { pages });
    expect(html).toContain('<a class="cr-skip" href="#content">Skip to content</a>');
    expect(html.indexOf("<header")).toBeLessThan(html.indexOf('<main id="content" tabindex="-1"'));
    expect(html).toContain('<a class="cr-logo" href="/">Haho &amp; Co</a>');
    expect(html).toContain('<a href="/about" aria-current="page">About</a>');
    expect(html).toContain('<a href="/">Home</a>');
    expect(html).not.toContain("<script");
  });

  it("folds the menu into a <details> for phones, so it opens without JavaScript", () => {
    const html = renderPage(site, page("/about"), "", { pages });
    expect(html).toMatch(/<details class="cr-nav-phone"><summary>Menu<\/summary><nav class="cr-nav" aria-label="Main">/);
    expect(html.match(/aria-label="Main"/g)).toHaveLength(2);
  });

  it("puts a class on <html> when the header is sticky, so scrolling keeps room for it", () => {
    expect(renderPage(site, page("/"), "", { pages })).toContain('<html lang="en">');
    const sticky = { ...site, header: { sticky: true } };
    expect(renderPage(sticky, page("/"), "", { pages })).toContain('<html lang="en" class="cr-has-sticky">');
    expect(renderPage(sticky, page("/"), "", { pages })).toContain("cr-site-header cr-style-background cr-sticky");
  });

  it("shows a logo image with its alt text, a button, and drops unsafe addresses", () => {
    const s = { ...site, header: { logo: { text: "", imageSrc: "/logo.svg", imageAlt: "Haho" }, menu: [{ label: "Bad", href: "javascript:alert(1)" }], cta: { label: "Contact", href: "/contact" } } };
    const html = renderPage(s, page("/"), "", { pages });
    expect(html).toContain('<img class="cr-logo-image" src="/logo.svg" alt="Haho"/>');
    expect(html).toContain('<a href="#">Bad</a>');
    expect(html).toContain('<a class="cr-button cr-button-primary cr-header-cta" href="/contact">Contact</a>');
  });

  it("can be turned off", () => {
    const html = renderPage({ ...site, header: { show: false }, footer: { show: false } }, page("/"), "", { pages });
    expect(html).not.toContain("<header");
    expect(html).not.toContain("<footer");
    expect(html).toContain("Skip to content");
  });
});

describe("published footer", () => {
  it("fills in {year} and {name} by default", () => {
    const html = renderPage(site, page("/"), "", { pages, year: 2031 });
    expect(html).toContain('<footer class="cr-site-footer cr-style-surface">');
    expect(html).toContain('<p class="cr-footer-copy">© 2031 Haho &amp; Co</p>');
    expect(html.indexOf("</main>")).toBeLessThan(html.indexOf("<footer"));
  });

  it("keeps a site name with $ in it as typed", () => {
    const html = renderPage({ ...site, name: "Rock $' Roll $&" }, page("/"), "", { pages, year: 2031 });
    expect(html).toContain("© 2031 Rock $&#x27; Roll $&amp;</p>");
  });

  it("renders text and titled columns of links as labelled navigation", () => {
    const footer = { text: "A small studio.", columns: [{ title: "Studio", links: [{ label: "About", href: "/about" }] }], copyright: "" };
    const html = renderPage({ ...site, footer }, page("/about"), "", { pages });
    expect(html).toContain('<p class="cr-footer-text">A small studio.</p>');
    expect(html).toContain('<nav class="cr-footer-column" aria-labelledby="cr-footer-0"><h2 class="cr-footer-title" id="cr-footer-0">Studio</h2>');
    expect(html).toContain('<a href="/about" aria-current="page">About</a>');
    expect(html).not.toContain("cr-footer-copy");
  });
});

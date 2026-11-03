// F069: fixes from Claude's review (DECISIONS.md, Proposals, "From the review"), published side.
import { defaultTokens, newPost, type Page, type Post, type Site } from "@crust/blocks";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { renderPost } from "./blog";
import { renderBody, renderPage } from "./render";
import { renderSearchPage } from "./search";

const site: Site = { name: "Haho", baseUrl: "https://haho.test", language: "en", tokens: defaultTokens };
const blog = { title: "News", intro: "" };
const text = (id: string, words: string) => ({ type: "Text", props: { id, text: words, align: "left", tone: "default" } });
const section = (id: string, content: unknown[] = []) => ({ type: "Section", props: { id, background: "background", paddingY: "lg", content } });
const styles = readFileSync("packages/blocks/src/styles.css", "utf8");

describe("review-fixes 3: post body inside the page column (F035)", () => {
  it("puts a post's body text in the same column as its title", () => {
    // As in every starter template's post: a bare Text block at the top of the body.
    const base = newPost("Opening day", "opening-day", "2026-10-01");
    const post: Post = { ...base, puck: { ...base.puck, content: [text("t", "We open on Friday.")] } as never };
    const html = renderPost(site, post, blog, "");
    const article = html.slice(html.indexOf('<article class="cr-post">'), html.indexOf("</article>"));
    expect(article).toMatch(/<\/header><div class="cr-container cr-page-column"><div class="cr-text[^"]*"[^>]*>.*We open on Friday\./s);
    // Never straight under <article>.
    expect(article).not.toMatch(/<\/header><div class="cr-text/);
  });

  it("groups neighbouring page-level blocks in one column and leaves Sections full width", () => {
    const html = renderBody({ root: { props: {} }, content: [text("a", "One"), text("b", "Two"), section("s", [text("c", "Inside")]), text("d", "After")] } as never);
    expect(html.match(/class="cr-container cr-page-column"/g)).toHaveLength(2);
    expect(html.indexOf("Two")).toBeLessThan(html.indexOf("</div><section"));
    expect(html).toMatch(/^<div class="cr-container cr-page-column">.*One.*Two.*<\/div><section class="cr-section/s);
    expect(html).toMatch(/<\/section><div class="cr-container cr-page-column">.*After/s);
    // Inside a Section nothing changes.
    expect(html).not.toMatch(/<section[^>]*><div class="cr-container"><div class="cr-container cr-page-column"/);
  });

  it("pages with Sections only render as before", () => {
    const page: Page = { path: "/a", title: "A", description: "A", puck: { root: { props: {} }, content: [section("s", [text("c", "Inside")])] } as never };
    expect(renderPage(site, page, "")).not.toContain("cr-page-column");
  });

  it("the canvas gives page-level blocks the same column", () => {
    const css = readFileSync("apps/admin/src/chrome-canvas.css", "utf8");
    expect(css).toContain('[data-puck-dropzone="root:default-zone"] > [data-puck-component]:not(section):not(.cr-linked)');
    expect(css).toContain("margin-inline: max(var(--cr-space-sm), calc((100% - var(--cr-max-width)) / 2 + var(--cr-space-sm)));");
  });
});

describe("review-fixes 10: search results and the posts list (F035, F039)", () => {
  it("styles search results and post titles with the site's link style", () => {
    const rule = styles.slice(styles.indexOf(".cr-post-item :is(h2, h3) a, .cr-search-results a {"));
    expect(rule).toMatch(/^\.cr-post-item :is\(h2, h3\) a, \.cr-search-results a \{[^}]*text-decoration-thickness: var\(--cr-link-thickness, auto\);[^}]*background: var\(--cr-link-bg, none\)/);
    expect(styles).toContain(".cr-search-results a { color: var(--cr-sec-accent, var(--cr-color-primary)); }");
  });

  it("moves focus to the results count once results show", () => {
    const html = renderSearchPage(site, "");
    expect(html).toContain('role="status" aria-live="polite" tabindex="-1"></p>');
    const script = html.slice(html.indexOf('<script type="module">'));
    expect(script.indexOf("status.focus();")).toBeGreaterThan(script.indexOf('" results"'));
  });
});

import { defaultTokens, newPost, type Page, type Site } from "@crust/blocks";
import { describe, expect, it } from "vitest";
import { renderBlogIndex, renderPost } from "./blog";
import { renderNotFound, renderPage } from "./render";
import { renderSearchPage } from "./search";
import { isSearchPath } from "@crust/blocks";
import { checkPage } from "../../../apps/admin/server/content";

const site: Site = { name: "Haho", baseUrl: "https://haho.test", language: "en", tokens: defaultTokens, header: { search: true } };
const page = (over: Partial<Page> = {}): Page => ({
  path: "/about",
  title: "About",
  description: "Who we are",
  puck: { root: { props: {} }, content: [{ type: "Heading", props: { id: "h", text: "About", level: "h1", align: "left" } }] },
  ...over,
});

describe("site search (F039)", () => {
  it("has a search page: a labelled search form, live results, never itself a result", () => {
    const html = renderSearchPage(site, "");
    expect(html).toContain('<form class="cr-search-form" role="search" action="/search/" method="get">');
    expect(html).toContain('<label for="cr-search-q">Search this site</label>');
    expect(html).toContain('<input id="cr-search-q" name="q" type="search"');
    expect(html).toContain('<p id="cr-search-status" class="cr-search-status" role="status" aria-live="polite" tabindex="-1"></p>');
    expect(html).toContain('import("/pagefind/pagefind.js")');
    expect(html).toContain("<noscript>");
    expect(html).toContain('<meta name="robots" content="noindex">');
    expect(html).toContain('<main id="content" tabindex="-1">');
    expect(html.match(/<h1/g)).toHaveLength(1);
  });

  it("only keeps Pagefind's <mark> highlights from excerpts", () => {
    const html = renderSearchPage(site, "");
    const strip = new Function("s", `return s.replace(${html.match(/\.replace\((\/<\(\?![^)]*\)[^,]*\/g)/)![1]}, "");`) as (s: string) => string;
    expect(strip('fast <mark>HTML</mark><img src=x onerror=alert(1)>')).toBe("fast <mark>HTML</mark>");
  });

  it("indexes pages and posts, not hidden pages, the blog list or the 404", () => {
    expect(renderPage(site, page(), "")).toContain('<main id="content" tabindex="-1" data-pagefind-body>');
    expect(renderPage(site, page({ seo: { noindex: true } }), "")).not.toContain("data-pagefind-body");
    expect(renderNotFound(site, "")).not.toContain("data-pagefind-body");
    const post = newPost("Hello", "hello", "2026-10-30");
    expect(renderPost(site, post, { title: "Blog", intro: "" }, "")).toContain("data-pagefind-body");
    expect(renderBlogIndex(site, [post], { title: "Blog", intro: "" }, "")).not.toContain("data-pagefind-body");
  });

  it("shows a Search link in the header when switched on", () => {
    const html = renderPage(site, page(), "");
    expect(html).toContain('<a class="cr-header-search" href="/search/">Search</a>');
    expect(renderSearchPage(site, "")).toContain('<a class="cr-header-search" href="/search/" aria-current="page">Search</a>');
    expect(renderPage({ ...site, header: {} }, page(), "")).not.toContain("cr-header-search");
  });

  it("keeps /search for the search page", () => {
    expect(isSearchPath("/search")).toBe(true);
    expect(isSearchPath("/searching")).toBe(false);
    expect(checkPage(page({ path: "/search" }))).toEqual(["/search is where site search lives. Choose another address."]);
  });
});

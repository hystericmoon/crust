import { defaultTokens, newPost, type Page, type Site } from "@crust/blocks";
import { describe, expect, it } from "vitest";
import { rssFeed } from "./blog";
import { renderPage } from "./render";

// F044: the site's own address reaches every absolute link on the published site.
const site: Site = { name: "Studio", baseUrl: "https://studio.com", language: "en", tokens: defaultTokens };
const page: Page = {
  path: "/about",
  title: "About",
  description: "Who we are.",
  seo: { image: "https://cdn.test/x.jpg", imageAlt: "X" },
  puck: { root: { props: {} }, content: [{ type: "Heading", props: { id: "h", text: "About", level: "h1", align: "left" } }] },
};

describe("custom domain in published pages (F044)", () => {
  it("canonical and sharing links use the site's own address", () => {
    const html = renderPage(site, page, "", { baseUrl: "https://studio.com" });
    expect(html).toContain('<link rel="canonical" href="https://studio.com/about/">');
    expect(html).toContain('<meta property="og:url" content="https://studio.com/about/">');
    expect(html).not.toContain("pages.dev");
  });

  it("the RSS feed links to posts on the site's own address", () => {
    const xml = rssFeed(site, [newPost("Hello", "hello", "2026-10-30")], { title: "News", intro: "" }, "https://studio.com/");
    expect(xml).toContain("<link>https://studio.com/blog/hello/</link>");
    expect(xml).not.toContain("studio.com//");
  });
});

import { defaultTokens, type Page, type Site } from "@crust/blocks";
import { describe, expect, it } from "vitest";
import sample from "../../../content/pages/index.json";
import { outputFileFor, renderBody, renderNotFound, renderPage } from "./render";

const site: Site = { name: "Test", baseUrl: "https://example.test", language: "en", tokens: defaultTokens };
const page = (content: Page["puck"]["content"]): Page => ({
  path: "/",
  title: "Home",
  description: "Desc",
  puck: { root: { props: {} }, content },
});

describe("renderPage", () => {
  it("renders the sample page as a full static document", () => {
    const html = renderPage(site, sample as Page, "");
    expect(html).toMatch(/^<!doctype html>/);
    expect(html).toContain('<html lang="en">');
    expect(html).toContain("<title>Crust demo</title>");
    expect(html).toContain('<meta name="description" content="A sample page built with the Crust visual builder.">');
    expect(html).toContain("--cr-color-primary: #4338ca;");
    // F071: the sample hero is a Display heading with a small label above it.
    expect(html).toContain('<hgroup class="cr-hgroup cr-align-center"><p class="cr-eyebrow">Visual website builder</p><h1 class="cr-heading cr-h1 cr-display cr-align-center">Build fast sites, visually</h1></hgroup>');
    expect(html).not.toContain("<script");
  });

  it("renders nested slot content inside sections", () => {
    const html = renderBody(
      page([
        {
          type: "Section",
          props: {
            id: "s",
            background: "surface",
            paddingY: "md",
            content: [{ type: "Heading", props: { id: "h", text: "Inside", level: "h2", align: "left" } }],
          },
        },
      ]).puck,
    );
    // Pages saved before F025 have no height or image: auto height, no media.
    expect(html).toMatch(
      /<section class="cr-section cr-style-surface cr-height-auto cr-valign-center"[^>]*><div class="cr-container"><h2[^>]*>Inside<\/h2><\/div><\/section>/,
    );
  });

  it("renders blocks nested in columns", () => {
    const card = (id: string, title: string) => ({
      type: "Card",
      props: { id, title, titleLevel: "h3", text: "", imageSrc: "", imageAlt: "", linkLabel: "", linkHref: "", background: "surface" },
    });
    const html = renderBody(
      page([
        {
          type: "Columns",
          props: {
            id: "c",
            count: "2",
            gap: "md",
            column1: [card("a", "Left")],
            column2: [card("b", "Right")],
            column3: [card("x", "Hidden")],
            column4: [],
          },
        },
      ]).puck,
    );
    expect(html).toMatch(/<div class="cr-columns cr-columns-2"[^>]*><div class="cr-column"><article[^>]*>.*Left.*<\/article><\/div><div class="cr-column"><article[^>]*>.*Right/);
    expect(html).not.toContain("Hidden");
  });

  it("escapes user text", () => {
    const html = renderBody(
      page([{ type: "Text", props: { id: "t", text: "<script>alert(1)</script>", align: "left", tone: "default" } }]).puck,
    );
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("neutralises unsafe links", () => {
    const html = renderBody(
      page([{ type: "Button", props: { id: "b", label: "x", href: "javascript:alert(1)", variant: "primary" } }]).puck,
    );
    expect(html).toContain('href="#"');
  });

  it("omits alt when missing so the publish engine can flag it", () => {
    const html = renderBody(page([{ type: "Image", props: { id: "i", src: "/a.jpg", alt: "", caption: "" } }]).puck);
    expect(html).toMatch(/<img src="\/a.jpg"(?![^>]*alt=)/);
  });

  it("rejects unknown block types", () => {
    expect(() => renderBody(page([{ type: "Nope", props: { id: "n" } }]).puck)).toThrow(/Unknown block type/);
  });
});

describe("renderNotFound", () => {
  it("renders an accessible not-found page with a link home", () => {
    const html = renderNotFound(site, "");
    expect(html).toContain("<title>Page not found | Test</title>");
    expect(html.match(/<h1/g)).toHaveLength(1);
    expect(html).toContain("Page not found</h1>");
    expect(html).toMatch(/<a [^>]*href="\/"[^>]*>Go to the home page<\/a>/);
    expect(html).not.toContain("<script");
  });
});

describe("outputFileFor", () => {
  it("maps paths to files", () => {
    expect(outputFileFor("/")).toBe("index.html");
    expect(outputFileFor("/about")).toBe("about/index.html");
    expect(outputFileFor("/blog/first-post/")).toBe("blog/first-post/index.html");
  });
  it("rejects unsafe paths", () => {
    expect(() => outputFileFor("/../etc")).toThrow();
    expect(() => outputFileFor("/About Us")).toThrow();
  });
});

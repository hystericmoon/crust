import { config, defaultTokens, readTemplate, type Template } from "@crust/blocks";
import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { templateFromContent } from "./content-template";
import {
  axeGroup,
  contrastGroup,
  fileGroup,
  findFiller,
  pageFileName,
  placeholderGroup,
  publishGroup,
  renderLayouts,
  reportFails,
  reportHtml,
  reportText,
  speedGroup,
  stripPlaceholders,
  unpackTemplate,
  type TemplateReport,
} from "./template-check";

const baseCss = readFileSync("packages/blocks/src/styles.css", "utf8");
// A 1×1 PNG: enough for the template reader's photo check.
const PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

let sample: Template;
beforeAll(async () => {
  sample = (await templateFromContent("content")).template;
});

const heading = (id: string, text: string, extra: Record<string, unknown> = {}) => ({ type: "Heading", props: { id, text, level: "h2", align: "left", ...extra } });
const section = (id: string, content: unknown[]) => ({ type: "Section", props: { id, background: "background", paddingY: "lg", content } });

/** The sample site plus a post, a linked section, a layout, a photo and marks. */
function fuller(): Template {
  return {
    ...sample,
    pages: [
      ...sample.pages,
      {
        path: "/services/design",
        title: "Design",
        description: "What we design.",
        puck: {
          root: { props: {} },
          content: [
            section("s1", [
              heading("h1", "Your studio name", { level: "h1", placeholder: ["text"] }),
              { type: "Image", props: { id: "img", src: "/media/harbour.png", alt: "The harbour", placeholder: ["src"] } },
            ]),
          ],
        },
      },
    ],
    sections: [{ id: "contact-strip", name: "Contact strip", content: [section("cs", [heading("cs-h", "Say hello", { placeholder: ["text"] })])] }],
    layouts: [
      { name: "Intro", kind: "section", content: [section("l1", [heading("l1-h", "Intro")])] },
      { name: "Nothing", kind: "section", content: [] },
    ],
    posts: [{ slug: "opening-day", title: "Opening day", description: "We open Friday.", date: "2026-10-30", cover: "", coverAlt: "", puck: { root: { props: {} }, content: [] } }],
    blog: { title: "News", intro: "" },
    media: [{ file: "harbour.png", alt: "The harbour", width: 1, height: 1, data: PNG }],
  };
}

describe("template check: unpacking (F047)", () => {
  it("names page files like the builder does", () => {
    expect(pageFileName("/")).toBe("index.json");
    expect(pageFileName("/about")).toBe("about.json");
    expect(pageFileName("/services/design")).toBe("services__design.json");
  });

  it("takes every Replace me mark off, however deep, without changing the original", () => {
    const t = fuller();
    const stripped = stripPlaceholders(t.pages);
    expect(JSON.stringify(stripped)).not.toContain("placeholder");
    expect(JSON.stringify(t.pages)).toContain("placeholder");
  });

  it("writes a content folder the renderer can read: site, pages, linked sections, blog, photos", () => {
    const files = unpackTemplate(fuller());
    expect([...files.keys()].sort()).toEqual(
      ["blog.json", "media.json", "media/harbour.png", "pages/index.json", "pages/services__design.json", "posts/opening-day.json", "sections/contact-strip.json", "site.json"].sort(),
    );
    const site = JSON.parse(files.get("site.json") as string);
    expect(site.baseUrl).toBe("https://example.pages.dev");
    expect(site.header.menu.length).toBeGreaterThan(0);
    expect(JSON.parse(files.get("sections/contact-strip.json") as string).savedAt).toBe(sample.exportedAt);
    const photo = files.get("media/harbour.png") as Uint8Array;
    expect([...photo.slice(1, 4)].map((c) => String.fromCharCode(c)).join("")).toBe("PNG");
    for (const [path, body] of files) if (typeof body === "string") expect(body, path).not.toContain('"placeholder"');
  });

  it("leaves the blog out when there are no posts", () => {
    const files = unpackTemplate(sample);
    expect(files.has("blog.json")).toBe(false);
    expect(files.has("media.json")).toBe(false);
  });

  it("packs the sample site as a template Crust can open", () => {
    const read = readTemplate(JSON.stringify(sample), config.components);
    expect(read.problems).toEqual([]);
    expect(read.template?.pages.map((p) => p.path)).toEqual(["/"]);
  });
});

describe("template check: the checks (F047)", () => {
  it("passes on a template that opens, and lists why one doesn't", () => {
    expect(reportFails({ name: "x", source: "x", groups: [fileGroup([])] })).toBe(false);
    const bad = fileGroup(["The template's site name is missing."], ["boat.jpg"]);
    expect(bad.items.map((i) => i.status)).toEqual(["fail", "fail"]);
    expect(bad.items[0]!.detail).toEqual(["The template's site name is missing."]);
  });

  it("checks every text colour in every section style", () => {
    const g = contrastGroup(sample);
    expect(g.items).toHaveLength(5); // site colours + 4 section styles
    expect(g.items.every((i) => i.status === "pass")).toBe(true);
    expect(g.items[2]!.text).toMatch(/^Muted sections: text \d+(\.\d+)?:1, muted text/);
  });

  it("fails a section style no site colour reads on", () => {
    const grey = { ...defaultTokens, sectionStyles: { ...defaultTokens.sectionStyles!, surface: { bg: "#8A8A8A", button: "solid" as const } }, colors: { ...defaultTokens.colors, text: "#5A5A5A", background: "#B0B0B0", surface: "#B0B0B0", onPrimary: "#B0B0B0" } };
    const g = contrastGroup({ ...sample, tokens: grey });
    const surface = g.items.find((i) => i.text.startsWith("Muted"))!;
    expect(surface.status).toBe("fail");
    expect(surface.detail?.[0]).toMatch(/^Text: .* \(needs 4\.5:1\)$/);
  });

  it("turns crust-publish's problems into one line per problem", () => {
    expect(publishGroup(true, "publish: 2 page(s) ready").items[0]!.status).toBe("pass");
    const out = "publish failed: Nothing was published. Fix these 2 problems on 1 page and publish again:\n  - Page /about: no h1\n  - Page /about: heading level skips from h2 to h4";
    const g = publishGroup(false, out);
    expect(g.items[0]).toMatchObject({ status: "fail", text: "2 problems would stop publishing.", detail: ["/about: no h1", "/about: heading level skips from h2 to h4"] });
    expect(publishGroup(false, "Error: render broke").items[0]!.detail).toEqual(["Error: render broke"]);
  });

  it("fails on serious axe issues, notes minor ones", () => {
    const clean = axeGroup([
      { path: "/", size: "desktop", serious: [], minor: 1 },
      { path: "/", size: "phone", serious: [], minor: 0 },
    ]);
    expect(clean.items.map((i) => i.status)).toEqual(["pass", "note"]);
    expect(clean.items[0]!.text).toBe("No serious issues on 1 page at desktop, phone widths.");
    const bad = axeGroup([{ path: "/about/", size: "tablet", serious: [{ id: "color-contrast", help: "Elements must meet contrast", impact: "serious", targets: [".cr-x"] }], minor: 0 }]);
    expect(bad.items[0]).toMatchObject({ status: "fail", text: "/about/ at tablet width: 1 serious issue." });
    expect(bad.items[0]!.detail?.[0]).toContain("color-contrast");
  });

  it("needs 95 for speed", () => {
    const s = { performance: 94, accessibility: 100, seo: 100, bestPractices: 100, slow: ["Reduce unused CSS"] };
    expect(speedGroup(s).items[0]).toMatchObject({ status: "fail", detail: ["Reduce unused CSS"] });
    expect(speedGroup({ ...s, performance: 95 }).items[0]!.status).toBe("pass");
    expect(speedGroup({ error: "Chrome didn't start" }).items[0]!.status).toBe("fail");
  });

  it("renders every saved layout, and fails an empty one", () => {
    const { pages, group } = renderLayouts(fuller(), baseCss);
    expect(pages.map((p) => p.slug)).toEqual(["layout-1"]);
    expect(pages[0]!.html).toContain("Intro");
    expect(group.items.map((i) => i.status)).toEqual(["pass", "fail"]);
    expect(renderLayouts(sample, baseCss).group.items[0]!.status).toBe("note");
  });

  it("fails a layout that doesn't render, with the reason", () => {
    const t = { ...sample, layouts: [{ name: "Broken", kind: "section" as const, content: [{ type: "LinkedSection", props: { id: "x", section: "gone" } }] }] };
    const item = renderLayouts(t, baseCss).group.items[0]!;
    expect(item.status).toBe("fail");
    expect(item.detail?.[0]).toBeTruthy();
  });
});

describe("template check: sample content (F047)", () => {
  it("finds unmarked filler words and stand-in photos, in nested blocks too", () => {
    const blocks = [
      section("s", [
        heading("a", "Lorem ipsum dolor sit amet"),
        { type: "Text", props: { id: "t", text: { rich: 1, blocks: [{ type: "p", children: [{ text: "Prices: TBD" }] }] } } },
        { type: "Image", props: { id: "i", src: "https://picsum.photos/800", alt: "x" } },
        { type: "Grid", props: { id: "g", items: [{ title: "[Your service]", text: "Fine" }] } },
      ]),
    ];
    expect(findFiller(blocks)).toEqual([
      "Heading block: “Lorem ipsum dolor sit amet”",
      "Text block: “Prices: TBD”",
      "Image block: a stand-in photo (https://picsum.photos/800)",
      "Card grid block: “[Your service]”",
    ]);
  });

  it("lets marked fields and settings through", () => {
    const blocks = [
      heading("a", "Lorem ipsum", { placeholder: ["text"] }),
      { type: "Grid", props: { id: "TODO-grid", items: [{ title: "Lorem" }], placeholder: ["items"] } },
      heading("b", "Our todo list is short"),
    ];
    expect(findFiller(blocks)).toEqual([]);
  });

  it("counts the Replace me marks on pages, posts and linked sections, and passes without filler", () => {
    const g = placeholderGroup(fuller());
    expect(g.items[0]!.status).toBe("pass");
    expect(g.items[1]!.status).toBe("note");
    expect(g.items[1]!.text).toMatch(/^3 things marked Replace me/);
    expect(g.items[1]!.detail).toContain("Page /services/design: Heading “Your studio name” (text)");
    expect(g.items[1]!.detail).toContain("Linked section “Contact strip”: Heading “Say hello” (text)");
    expect(placeholderGroup(sample).items[1]!.text).toMatch(/^Nothing is marked Replace me/);
  });

  it("fails filler in the header, footer, titles and post covers", () => {
    const t = { ...fuller(), footer: { ...sample.footer, text: "Lorem ipsum" } };
    const g = placeholderGroup(t);
    expect(g.items[0]!.status).toBe("fail");
    expect(g.items[0]!.detail?.[0]).toBe("Header, footer or blog settings: filler words or a stand-in photo");
    const titled = { ...sample, pages: [{ ...sample.pages[0]!, title: "TODO" }] };
    expect(placeholderGroup(titled).items[0]!.detail?.[0]).toBe("Page /: title or description");
  });
});

describe("template check: the report (F047)", () => {
  const reports: TemplateReport[] = [
    { name: "Studio <b>", source: "templates/studio.crust", groups: [fileGroup([]), publishGroup(false, "  - Page /: no h1")] },
    { name: "Plain", source: "the sample site in content/", groups: [fileGroup([])] },
  ];

  it("writes a readable page that escapes what's in the template", () => {
    const html = reportHtml(reports, new Date("2026-10-30T12:00:00Z"));
    expect(html).toContain("<title>Template check</title>");
    expect(html).toContain('<html lang="en">');
    expect(html).toContain("Studio &lt;b&gt;");
    expect(html).not.toContain("Studio <b>");
    expect(html).toContain("1 of 2 templates needs work");
    expect(html).toContain("1 of 2 checks failed");
    expect(html).toContain("All 1 checks passed");
    expect(html).toContain("2026-10-30 12:00 UTC");
    expect(html).toContain("prefers-color-scheme:dark");
  });

  it("says when everything is ready", () => {
    expect(reportHtml([reports[1]!], new Date())).toContain("The template is ready to offer");
  });

  it("summarises failures for the terminal and the CI job page", () => {
    const text = reportText(reports);
    expect(text).toContain("✗ Studio <b> (templates/studio.crust)");
    expect(text).toContain("  ✗ Headings, photo descriptions, titles");
    expect(text).toContain("        - /: no h1");
    expect(reportText(reports, true)).toContain("### ✅ Plain");
  });
});

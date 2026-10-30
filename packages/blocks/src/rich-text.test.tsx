import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { paragraphs } from "./block-helpers";
import { config } from "./config";
import { sectionLayouts } from "./layouts";
import { relinkPage } from "./links";
import { newPost } from "./posts";
import {
  checkRichText,
  isAllowedLink,
  mapRichLinks,
  migrateRichText,
  migrateRichTextBlocks,
  normalizeRichText,
  plainToRichText,
  richTextProblems,
  richTextToPlain,
  toRichText,
  type RichText,
} from "./rich-text";
import { RichTextView } from "./rich-text-view";
import { readThemePack } from "./theme-pack";

const sample: RichText = {
  rich: 1,
  blocks: [
    { type: "p", children: [{ text: "Fresh bread " }, { text: "every morning", bold: true }, { text: ". See the " }, { text: "menu", href: "/menu" }, { text: "." }] },
    { type: "ul", items: [[{ text: "Sourdough" }], [{ text: "Rye", italic: true }]] },
    { type: "ol", items: [[{ text: "Order" }], [{ text: "Collect" }]] },
  ],
};
const html = (value: unknown) => renderToStaticMarkup(<RichTextView value={value} />);

describe("rich-text: the format (F042)", () => {
  it("reads older plain text as paragraphs, exactly as it published before", () => {
    const old = "First paragraph\nstill first.\n\nSecond one.\n\n\n";
    expect(plainToRichText(old)).toEqual({
      rich: 1,
      blocks: [
        { type: "p", children: [{ text: "First paragraph still first." }] },
        { type: "p", children: [{ text: "Second one." }] },
      ],
    });
    // Same HTML as the old paragraphs() helper, apart from the line break, which HTML showed as a space anyway.
    expect(html(old)).toBe(renderToStaticMarkup(<>{paragraphs(old.replace("\nstill", " still"))}</>));
  });

  it("reads anything unknown as empty, and drops unknown fields", () => {
    expect(toRichText(42)).toEqual({ rich: 1, blocks: [] });
    expect(toRichText(null)).toEqual({ rich: 1, blocks: [] });
    const messy = { rich: 1, blocks: [{ type: "p", children: [{ text: "a", bold: true, color: "red" }, { text: "b", bold: true }, { text: "" }] }, { type: "h1", children: [] }, "x"] };
    expect(normalizeRichText(messy as unknown as RichText)).toEqual({ rich: 1, blocks: [{ type: "p", children: [{ text: "ab", bold: true }] }] });
  });

  it("publishes bold, italic, links and lists as plain HTML", () => {
    expect(html(sample)).toBe(
      '<p>Fresh bread <strong>every morning</strong>. See the <a href="/menu">menu</a>.</p>' +
        "<ul><li>Sourdough</li><li><em>Rye</em></li></ul><ol><li>Order</li><li>Collect</li></ol>",
    );
  });

  it("escapes words, makes unsafe links harmless, and keeps line breaks", () => {
    const doc: RichText = { rich: 1, blocks: [{ type: "p", children: [{ text: "<script>alert(1)</script>" }, { text: "x", href: "javascript:alert(1)" }, { text: "a\nb" }] }] };
    const out = html(doc);
    expect(out).not.toContain("<script>");
    expect(out).toContain("&lt;script&gt;");
    expect(out).toContain('<a href="#">x</a>');
    expect(out).toContain("a<br/>b");
  });

  it("leaves out empty paragraphs, lists and list items", () => {
    const doc: RichText = { rich: 1, blocks: [{ type: "p", children: [] }, { type: "ul", items: [[{ text: " " }]] }, { type: "ol", items: [[{ text: "One" }], []] }] };
    expect(html(doc)).toBe("<ol><li>One</li></ol>");
  });

  it("the Text block renders it, keeping alignment and tone", () => {
    const Text = config.components.Text;
    const out = renderToStaticMarkup(<>{Text.render({ ...Text.defaultProps, text: sample, align: "center", tone: "muted", id: "t" } as never)}</>);
    expect(out).toContain('class="cr-text cr-rich cr-align-center cr-tone-muted"');
    expect(out).toContain("<strong>every morning</strong>");
    expect(Text.defaultProps?.text).toEqual({ rich: 1, blocks: [{ type: "p", children: [{ text: "Write something here." }] }] });
  });

  it("gives the words without styles", () => {
    expect(richTextToPlain(sample)).toBe("Fresh bread every morning. See the menu.\n\nSourdough\nRye\n\nOrder\nCollect");
    expect(richTextToPlain("Old text")).toBe("Old text");
  });
});

describe("rich-text: links", () => {
  it("accepts page addresses, web, email and phone links only", () => {
    for (const ok of ["/menu", "/menu#today", "#top", "https://example.com", "mailto:hi@example.com", "tel:+62 21 555"]) expect(isAllowedLink(ok), ok).toBe(true);
    for (const bad of ["", "#", "javascript:alert(1)", "data:text/html,x", "//evil.example", "vbscript:x"]) expect(isAllowedLink(bad), bad).toBe(false);
  });

  it("the save check refuses unsafe links and damaged text, in plain words", () => {
    expect(checkRichText(sample)).toEqual([]);
    expect(checkRichText("plain text from an older page")).toEqual([]);
    const bad: RichText = { rich: 1, blocks: [{ type: "p", children: [{ text: "x", href: "javascript:alert(1)" }] }] };
    expect(checkRichText(bad).join(" ")).toMatch(/can't be used: "javascript:alert\(1\)"/);
    expect(checkRichText({ rich: 2, blocks: [] })).toEqual(["A Text block's text isn't in a format Crust knows."]);
    expect(checkRichText({ rich: 1, blocks: [{ type: "table" }] })).toEqual(["A Text block has a paragraph Crust can't read."]);
    const long: RichText = { rich: 1, blocks: [{ type: "p", children: [{ text: "x".repeat(20_001) }] }] };
    expect(checkRichText(long).join(" ")).toMatch(/too long/);
  });

  it("finds Text blocks anywhere in a page, posts and layouts included", () => {
    const bad = { type: "Text", props: { id: "t", text: { rich: 1, blocks: [{ type: "p", children: [{ text: "x", href: "javascript:x" }] }] } } };
    const nested = [{ type: "Section", props: { id: "s", content: [{ type: "Columns", props: { id: "c", column1: [bad] } }] } }];
    expect(richTextProblems({ content: nested })).toHaveLength(1);
    expect(richTextProblems({ content: [], zones: { "a:b": [bad] } })).toHaveLength(1);
    expect(richTextProblems(nested)).toHaveLength(1);
    expect(richTextProblems({ content: [{ type: "Text", props: { id: "t", text: sample } }] })).toEqual([]);
  });

  it("follows a renamed page (F018), counting each link", () => {
    const data = {
      root: { props: {} },
      content: [
        { type: "Text", props: { id: "t", text: { rich: 1, blocks: [{ type: "p", children: [{ text: "a", href: "/about#team" }, { text: "b", href: "/contact" }] }, { type: "ul", items: [[{ text: "c", href: "/about" }]] }] } } },
      ],
    };
    const { puck, count } = relinkPage(data as never, "/about", "/team");
    expect(count).toBe(2);
    const text = (puck.content[0]!.props as { text: RichText }).text;
    expect(text.blocks[0]).toEqual({ type: "p", children: [{ text: "a", href: "/team#team" }, { text: "b", href: "/contact" }] });
    expect(text.blocks[1]).toEqual({ type: "ul", items: [[{ text: "c", href: "/team" }]] });
    expect(mapRichLinks("plain", () => "/x")).toEqual({ value: "plain", count: 0 });
  });

  it("a theme pack with an unsafe link in a Text block is refused", () => {
    const pack = {
      format: "crust-theme-pack",
      version: 1,
      name: "Bad",
      exportedAt: "2026-10-30T00:00:00Z",
      layouts: [{ name: "Intro", kind: "section", content: [{ type: "Text", props: { id: "t", align: "left", tone: "default", text: { rich: 1, blocks: [{ type: "p", children: [{ text: "x", href: "javascript:x" }] }] } } }] }],
    };
    const check = readThemePack(JSON.stringify(pack), config.components as never);
    expect(check.problems.join(" ")).toMatch(/“Intro”: A link in a Text block can't be used/);
  });
});

describe("rich-text: migration", () => {
  it("turns plain text in Text blocks into rich text, anywhere in the tree", () => {
    const data = {
      root: { props: {} },
      content: [
        { type: "Section", props: { id: "s", content: [{ type: "Text", props: { id: "t1", text: "One\n\nTwo", align: "left" } }] } },
        { type: "Heading", props: { id: "h", text: "Keep me a string" } },
      ],
      zones: { "z:a": [{ type: "Text", props: { id: "t2", text: "Zone" } }] },
    };
    const out = migrateRichText(data);
    const section = out.content[0]!.props.content as unknown as { props: { text: RichText; align: string } }[];
    expect(section[0]!.props.text).toEqual({ rich: 1, blocks: [{ type: "p", children: [{ text: "One" }] }, { type: "p", children: [{ text: "Two" }] }] });
    expect(section[0]!.props.align).toBe("left");
    expect(out.content[1]!.props.text).toBe("Keep me a string");
    expect((out.zones!["z:a"] as unknown as { props: { text: RichText } }[])[0]!.props.text.blocks).toHaveLength(1);
    // The input is untouched, and already-migrated data comes back as the same object.
    expect(data.content[0]!.props.content![0]!.props.text).toBe("One\n\nTwo");
    expect(migrateRichText(out)).toBe(out);
    expect(migrateRichTextBlocks(out.content)).toBe(out.content);
  });

  it("new posts and every built-in layout start in the rich format", () => {
    const texts = (blocks: unknown): unknown[] =>
      Array.isArray(blocks)
        ? blocks.flatMap((b: { type: string; props: Record<string, unknown> }) => [
            ...(b.type === "Text" ? [b.props.text] : []),
            ...Object.values(b.props).flatMap((v) => (Array.isArray(v) && v.every((x) => x && typeof x === "object" && "props" in x) ? texts(v) : [])),
          ])
        : [];
    const all = [...texts(newPost("Hi", "hi", "2026-10-30").puck.content), ...sectionLayouts.flatMap((l) => texts(l.build()))];
    expect(all.length).toBeGreaterThan(10);
    for (const t of all) expect(typeof t).toBe("object");
  });
});

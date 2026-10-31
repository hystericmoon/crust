import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { config } from "./config";
import {
  cleanPlaceholder,
  clearEditedPlaceholders,
  countPlaceholders,
  findPlaceholders,
  placeholderBadge,
  placeholderLabel,
  placeholderSummary,
  unmarkPlaceholder,
} from "./placeholders";
import { richParagraphs } from "./rich-text";
import { makeTemplate, readTemplate } from "./template";
import { defaultTokens } from "./tokens";
import { migrateChrome } from "./chrome-model";

type Render = (p: Record<string, unknown>) => React.ReactNode;
const render = (type: keyof typeof config.components, props: Record<string, unknown>, editing = false) =>
  renderToStaticMarkup(<>{(config.components[type].render as unknown as Render)({ ...config.components[type].defaultProps, ...props, puck: { isEditing: editing } })}</>);

const heading = { type: "Heading", props: { id: "h", text: "Your studio name", level: "h1", align: "left", placeholder: ["text"] } };
const card = { type: "Card", props: { id: "c", title: "Service", text: "What you offer.", imageSrc: "/media/sample-desk.png", imageAlt: "A desk", placeholder: ["imageSrc", "title", "nope"] } };
const grid = { type: "Grid", props: { id: "g", items: [{ title: "A" }, { title: "B" }], placeholder: ["items"] } };
const section = { type: "Section", props: { id: "s", background: "surface", content: [card, { type: "Columns", props: { id: "col", column1: [grid], column2: [] } }] } };
const blocks = [heading, section, { type: "Text", props: { id: "t", text: richParagraphs("Real words.") } }];

describe("placeholders: marks", () => {
  it("keeps only fields the block can mark, in the block's order", () => {
    expect(cleanPlaceholder("Card", ["imageSrc", "title", "nope", "title"])).toEqual(["title", "imageSrc"]);
    expect(cleanPlaceholder("Spacer", ["size"])).toEqual([]);
    expect(cleanPlaceholder("Heading", "text")).toEqual([]);
  });

  it("finds marked blocks anywhere on the page, in page order", () => {
    const found = findPlaceholders(blocks);
    expect(found.map((p) => [p.id, p.fields.map((f) => f.field), p.preview])).toEqual([
      ["h", ["text"], "“Your studio name”"],
      ["c", ["title", "imageSrc"], "“Service”"],
      ["g", ["items"], "2 items"],
    ]);
    expect(countPlaceholders(blocks)).toBe(4);
    expect(countPlaceholders([])).toBe(0);
    expect(placeholderSummary(1)).toBe("1 thing to replace");
    expect(placeholderSummary(4)).toBe("4 things to replace");
  });

  it("quotes rich text and names photos", () => {
    expect(findPlaceholders([{ type: "Text", props: { id: "t", text: richParagraphs("A long sample paragraph that goes on and on for a while."), placeholder: ["text"] } }])[0]!.preview).toBe("“A long sample paragraph that goes on an…”");
    expect(findPlaceholders([{ type: "Image", props: { id: "i", src: "/media/sample%20boat.jpg", placeholder: ["src"] } }])[0]!.preview).toBe("sample boat.jpg");
  });

  it("labels a block for the publish check and the builder", () => {
    expect(placeholderLabel("Card", card.props)).toBe("Card “Service” (title, photo)");
    expect(placeholderLabel("Heading", { text: "x" })).toBe("");
    expect(placeholderBadge("Grid", ["items"])).toBe("Replace me: cards");
  });
});

describe("placeholders: replacing", () => {
  it("clears a text or photo mark once that field is edited", () => {
    const edited = JSON.parse(JSON.stringify(blocks));
    edited[0].props.text = "Studio Rivera";
    edited[1].props.content[0].props.imageSrc = "/media/my-desk.jpg";
    const next = clearEditedPlaceholders(blocks, edited);
    expect(next[0]!.props).not.toHaveProperty("placeholder");
    expect(findPlaceholders(next).map((p) => [p.id, p.fields.map((f) => f.field)])).toEqual([
      ["c", ["title"]],
      ["g", ["items"]],
    ]);
  });

  it("keeps a mark that undo brought back", () => {
    const edited = clearEditedPlaceholders(blocks, JSON.parse(JSON.stringify(blocks)).map((b: typeof heading, i: number) => (i === 0 ? { ...b, props: { ...b.props, text: "Mine" } } : b)));
    expect(edited[0]!.props).not.toHaveProperty("placeholder");
    // Undo: the old text and its mark come back together.
    expect(clearEditedPlaceholders(edited, blocks)).toBe(blocks);
  });

  it("keeps a list marked when only some of it changed", () => {
    const edited = JSON.parse(JSON.stringify(blocks));
    edited[1].props.content[1].props.column1[0].props.items[0].title = "Mine";
    expect(findPlaceholders(clearEditedPlaceholders(blocks, edited)).map((p) => p.id)).toEqual(["h", "c", "g"]);
  });

  it("returns the same blocks when nothing was replaced", () => {
    const same = JSON.parse(JSON.stringify(blocks));
    same[2].props.text = richParagraphs("Other real words.");
    expect(clearEditedPlaceholders(blocks, same)).toBe(same);
  });

  it("keeps a block as is when asked, one field or all", () => {
    expect(findPlaceholders(unmarkPlaceholder(blocks, "c", "title")).find((p) => p.id === "c")!.fields.map((f) => f.field)).toEqual(["imageSrc"]);
    const kept = unmarkPlaceholder(blocks, "g");
    expect(findPlaceholders(kept).map((p) => p.id)).toEqual(["h", "c"]);
    expect(unmarkPlaceholder(blocks, "t")).toBe(blocks);
  });
});

describe("placeholders: rendering", () => {
  it("marks sample content in the HTML so publishing can stop", () => {
    const html = render("Heading", { text: "Your studio name", level: "h1", placeholder: ["text"] });
    expect(html).toBe('<div class="cr-show" data-crust-placeholder="Heading “Your studio name” (text)"><h1 class="cr-heading cr-h1 cr-align-left">Your studio name</h1></div>');
  });

  it("adds a 'Replace me' label in the builder only", () => {
    expect(render("Image", { src: "/media/a.jpg", alt: "A", placeholder: ["src"] }, true)).toContain('data-replace="Replace me: photo"');
    expect(render("Image", { src: "/media/a.jpg", alt: "A", placeholder: ["src"] })).not.toContain("data-replace");
  });

  it("leaves unmarked blocks exactly as before", () => {
    expect(render("Heading", { text: "Hi", level: "h2" })).not.toContain("cr-show");
    expect(render("Heading", { text: "Hi", level: "h2", placeholder: [] })).not.toContain("cr-show");
  });
});

describe("placeholders: in a template file", () => {
  it("survive saving and reading a template", async () => {
    const site = { name: "Studio", language: "en" };
    const { template } = await makeTemplate(
      { name: "Studio", description: "" },
      {
        site,
        tokens: defaultTokens,
        chrome: migrateChrome({ ...site }, [{ path: "/", title: "Home" }]),
        pages: [{ path: "/", title: "Home", description: "Hi", puck: { root: { props: {} }, content: [heading, section] as never } }],
        sections: [],
        layouts: [],
        blog: { title: "News", intro: "" },
        posts: [],
        media: [{ file: "sample-desk.png", alt: "A desk", width: 1, height: 1 }],
      },
      async () => "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    );
    const check = readTemplate(JSON.stringify(template), config.components);
    expect(check.problems).toEqual([]);
    expect(countPlaceholders(check.template!.pages[0]!.puck.content)).toBe(4);
  });
});

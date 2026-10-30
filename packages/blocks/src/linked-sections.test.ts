import type { ComponentData } from "@puckeditor/core";
import { describe, expect, it } from "vitest";
import { config } from "./config";
import {
  MissingLinkedSection,
  checkSectionContent,
  linkedBlock,
  linkedSectionIds,
  parseLinkedSection,
  resolveLinkedSections,
  sectionIdFor,
  sectionIdForFile,
  unlinkedCopy,
  type LinkedSectionFile,
} from "./linked-sections";

const heading = (id: string, level = "h2") => ({ type: "Heading", props: { id, text: "Questions? Call us.", level, align: "left" } });
const strip: LinkedSectionFile = {
  id: "contact-strip",
  name: "Contact strip",
  savedAt: "2026-10-30T10:00:00Z",
  content: [{ type: "Section", props: { id: "s1", background: "dark", content: [heading("h1", "h1"), { type: "Button", props: { id: "b1", label: "Call", href: "tel:+62215550123" } }] } }],
};
const sections = new Map([[strip.id, strip]]);
const all = (blocks: ComponentData[]): ComponentData[] =>
  blocks.flatMap((b) => [b, ...Object.values(b.props).flatMap((v) => (Array.isArray(v) && v.every((x) => x && typeof x === "object" && "props" in x) ? all(v as ComponentData[]) : []))]);

describe("linked-sections: files and ids (F043)", () => {
  it("makes readable, unique ids from names", () => {
    expect(sectionIdFor("Contact strip", new Set())).toBe("contact-strip");
    expect(sectionIdFor("Contact strip", new Set(["contact-strip", "contact-strip-2"]))).toBe("contact-strip-3");
    expect(sectionIdFor("Café ✨", new Set())).toBe("cafe");
    expect(sectionIdFor("!!!", new Set())).toBe("section");
    expect(sectionIdForFile("content/sections/contact-strip.json")).toBe("contact-strip");
    expect(sectionIdForFile("content/sections/../x.json")).toBeNull();
  });

  it("reads a section file back, or nothing when it's damaged", () => {
    expect(parseLinkedSection(JSON.stringify(strip), "contact-strip")).toEqual(strip);
    expect(parseLinkedSection(JSON.stringify(strip), "other-id")).toBeNull();
    expect(parseLinkedSection(JSON.stringify({ ...strip, content: [] }), "contact-strip")).toBeNull();
    expect(parseLinkedSection("{oops", "contact-strip")).toBeNull();
  });

  it("can't hold another linked section", () => {
    expect(checkSectionContent([linkedBlock("other")])).toEqual(["A linked section can't hold another linked section. Unlink it first."]);
    expect(checkSectionContent(strip.content)).toEqual([]);
  });

  it("lists the linked sections a page uses, in slots and zones", () => {
    const page = { content: [{ type: "Columns", props: { id: "c", column1: [linkedBlock("a")] } }, linkedBlock("b")], zones: { "x:y": [linkedBlock("c")] } };
    expect([...linkedSectionIds(page)].sort()).toEqual(["a", "b", "c"]);
  });

  it("isn't in the block list; it's added from Layouts → Linked", () => {
    expect(config.categories?.linked).toMatchObject({ components: ["LinkedSection"], visible: false });
  });
});

describe("linked-sections: publishing", () => {
  it("builds the section's current blocks into the page, where the link was", () => {
    const link = linkedBlock("contact-strip");
    const data = { root: { props: {} }, content: [heading("top", "h1"), link] };
    const out = resolveLinkedSections(data, sections);
    expect(out.content.map((b) => b.type)).toEqual(["Heading", "Section"]);
    // The page keeps its own h1; the section's becomes an h2.
    expect(all(out.content).filter((b) => b.props.level === "h1")).toHaveLength(1);
    // Ids are unique per use, so the section can appear twice.
    const twice = resolveLinkedSections({ content: [linkedBlock("contact-strip"), linkedBlock("contact-strip")] }, sections);
    const ids = all(twice.content).map((b) => b.props.id);
    expect(new Set(ids).size).toBe(ids.length);
    // Pages without links come back as they are.
    expect(resolveLinkedSections(data.content.length ? { content: [heading("x")] } : data, sections).content[0]!.props.id).toBe("x");
  });

  it("keeps the link's own Hide on and anchor", () => {
    const link = { ...linkedBlock("contact-strip"), props: { ...linkedBlock("contact-strip").props, hideOn: ["phone"], anchor: "contact" } };
    const out = resolveLinkedSections({ content: [link] }, sections);
    expect(out.content[0]!.props).toMatchObject({ hideOn: ["phone"], anchor: "contact" });
  });

  it("stops with a clear message when a page uses a section that's gone", () => {
    expect(() => resolveLinkedSections({ content: [linkedBlock("gone")] }, sections)).toThrow(MissingLinkedSection);
    expect(() => resolveLinkedSections({ content: [linkedBlock("gone")] }, sections)).toThrow(/"gone", which doesn't exist any more/);
  });

  it("unlinking gives a normal copy with new ids and no h1", () => {
    const copy = unlinkedCopy(strip);
    const blocks = all(copy);
    expect(blocks.map((b) => b.type)).toEqual(["Section", "Heading", "Button"]);
    expect(blocks.some((b) => ["s1", "h1", "b1"].includes(String(b.props.id)))).toBe(false);
    expect(blocks.find((b) => b.type === "Heading")!.props.level).toBe("h2");
    expect(strip.content[0]!.props.id).toBe("s1");
  });
});

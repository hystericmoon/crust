import { defaultTokens, type Template } from "@crust/blocks";
import { beforeAll, describe, expect, it } from "vitest";
import { templateFromContent } from "./content-template";
import { findFiller } from "./template-check";
import { AWAITING_REBUILD, cropMismatches, cropsGroup, emptySlots, excuseUntilRebuilt, gradientGroup, MIN_HOME_SECTION_TYPES, sectionKind, slotsGroup, varietyGroup } from "./template-strict";

let sample: Template;
beforeAll(async () => {
  sample = (await templateFromContent("content")).template;
});

const photo = (file: string, width: number, height: number) => ({ file, alt: "A photo", width, height, data: "" });
const withMedia = (t: Template, media: Template["media"]): Template => ({ ...t, media });
const block = (type: string, props: Record<string, unknown>) => ({ type, props: { id: type.toLowerCase(), ...props } });
const section = (content: unknown[], props: Record<string, unknown> = {}) => block("Section", { background: "background", paddingY: "lg", content, ...props });
const home = (t: Template, content: unknown[]): Template => ({ ...t, pages: [{ path: "/", title: "Home", description: "Home", puck: { root: { props: {} }, content } } as Template["pages"][number]] });

describe("template check: filler text (F083)", () => {
  it("catches the builder's default words and sentences", () => {
    const found = findFiller([section([block("Heading", { text: "Heading", level: "h2" }), block("Quote", { text: "Crust made our site faster and easier to change.", name: "Alex Rivera" })])]);
    expect(found.length).toBe(3);
  });
  it("lets a sentence that merely contains the word through", () => {
    expect(findFiller([section([block("Heading", { text: "Heading home after the storm", level: "h2" })])])).toEqual([]);
  });
});

describe("template check: empty slots (F083)", () => {
  it("finds an image block, slide, picture and logo without its photo", () => {
    expect(emptySlots(block("Image", { src: "", alt: "x" }))).toEqual(["Image: no photo"]);
    expect(emptySlots(block("Slideshow", { slides: [{ imageSrc: "/media/a.jpg", title: "One" }, { imageSrc: "", title: "Two" }] }))).toEqual(["Slide 2 “Two”: no photo"]);
    expect(emptySlots(block("Gallery", { images: [{ src: "" }] }))).toHaveLength(1);
    expect(emptySlots(block("LogoRow", { logos: [{ src: "/media/a.png" }, { src: " " }] }))).toHaveLength(1);
  });
  it("flags only the card that lacks a photo when its neighbours have one; words-only cards are fine", () => {
    const mixed = block("Grid", { items: [{ title: "A", imageSrc: "/media/a.jpg" }, { title: "B", imageSrc: "" }] });
    expect(emptySlots(mixed)).toEqual(["Card 2 “B”: no photo, though its neighbours have one"]);
    expect(emptySlots(block("Grid", { items: [{ title: "A", imageSrc: "" }, { title: "B", imageSrc: "" }] }))).toEqual([]);
  });
  it("counts a card's icon as its picture", () => {
    const columns = block("Columns", { column1: [block("Card", { title: "A", imageSrc: "/media/a.jpg" })], column2: [block("Card", { title: "B", imageSrc: "", icon: "heart" })], column3: [block("Card", { title: "C", imageSrc: "" })] });
    expect(emptySlots(columns)).toEqual(["Card “C”: no photo or icon, though its neighbours have one"]);
  });
  it("fails the group with where it is, passes a clean template", () => {
    expect(slotsGroup(home(sample, [section([block("Image", { src: "", alt: "x" })])])).items[0]!).toMatchObject({ status: "fail" });
    expect(slotsGroup(home(sample, [section([block("Heading", { text: "Hi", level: "h1" })])])).items[0]!.status).toBe("pass");
  });
});

describe("template check: mismatched crops (F083)", () => {
  let t: Template;
  beforeAll(() => {
    t = withMedia(sample, [photo("wide.jpg", 1600, 1000), photo("wide2.jpg", 1500, 1000), photo("tall.jpg", 800, 1000)]);
  });
  it("fails a row of a landscape and a portrait, naming both", () => {
    const row = block("Columns", { column1: [block("Image", { src: "/media/wide.jpg" })], column2: [block("Image", { src: "/media/tall.jpg" })] });
    const m = cropMismatches(t, row)[0]!;
    expect(m.detail).toEqual(["Image in column 1: landscape 1.60:1", "Image in column 2: portrait 0.80:1"]);
  });
  it("lets close shapes through (3:2 next to 16:10)", () => {
    const row = block("Columns", { column1: [block("Image", { src: "/media/wide.jpg" })], column2: [block("Image", { src: "/media/wide2.jpg" })] });
    expect(cropMismatches(t, row)).toEqual([]);
  });
  it("checks grid cards, but not a square or wide gallery, which crops every picture the same", () => {
    const grid = block("Grid", { items: [{ title: "A", imageSrc: "/media/wide.jpg" }, { title: "B", imageSrc: "/media/tall.jpg" }] });
    expect(cropMismatches(t, grid)).toHaveLength(1);
    const images = [{ src: "/media/wide.jpg" }, { src: "/media/tall.jpg" }];
    expect(cropMismatches(t, block("Gallery", { shape: "square", images }))).toEqual([]);
    expect(cropMismatches(t, block("Gallery", { shape: "original", images }))).toHaveLength(1);
  });
  it("ignores photos it can't measure (web addresses)", () => {
    const row = block("Columns", { column1: [block("Image", { src: "https://example.com/a.jpg" })], column2: [block("Image", { src: "/media/tall.jpg" })] });
    expect(cropMismatches(t, row)).toEqual([]);
  });
  it("reports in the group", () => {
    const row = block("Columns", { column1: [block("Image", { src: "/media/wide.jpg" })], column2: [block("Image", { src: "/media/tall.jpg" })] });
    expect(cropsGroup(home(t, [section([row])])).items[0]!.status).toBe("fail");
    expect(cropsGroup(home(t, [section([block("Heading", { text: "Hi", level: "h1" })])])).items[0]!.status).toBe("pass");
  });
});

describe("template check: variety on Home (F083)", () => {
  const hero = section([block("Heading", { text: "Hi", level: "h1" })], { bgKind: "photo", imageSrc: "/media/a.jpg" });
  const kinds = [hero, section([block("Grid", { items: [] })]), section([block("Stats", { items: [] })]), section([block("Quote", {})]), section([block("LogoRow", { logos: [] })])];
  it("names the kind of each section", () => {
    expect(sectionKind(hero, 0)).toBe("Hero");
    expect(sectionKind(kinds[1]!, 1)).toBe("Card grid");
    expect(sectionKind(section([block("Text", {})]), 2)).toBe("Text");
    expect(sectionKind(section([block("Columns", { column1: [block("Image", {})], column2: [block("Text", {})] })]), 2)).toBe("Image and text");
    expect(sectionKind(section([block("Columns", { column1: [block("Text", {})] })]), 2)).toBe("Columns");
  });
  it(`passes with ${MIN_HOME_SECTION_TYPES} kinds, fails with fewer, and counts a kind once`, () => {
    expect(varietyGroup(home(sample, kinds)).items[0]!.status).toBe("pass");
    expect(varietyGroup(home(sample, [...kinds.slice(0, 4), kinds[1]!, kinds[1]!])).items[0]!.status).toBe("fail");
  });
  it("looks inside linked sections", () => {
    const t = { ...home(sample, [...kinds.slice(0, 4), block("LinkedSection", { section: "logos" })]), sections: [{ id: "logos", name: "Logos", content: [kinds[4]!] }] } as Template;
    expect(varietyGroup(t).items[0]!.status).toBe("pass");
  });
});

describe("template check: gradients (F083)", () => {
  const gradient = (to: string) => home(sample, [section([block("Heading", { text: "Hi", level: "h1" })], { bgKind: "gradient", gradient: { to, direction: "down" } })]);
  it("passes a gradient that keeps text readable and fails one that doesn't", () => {
    const t = (to: string) => ({ ...gradient(to), tokens: defaultTokens });
    const results = (["background", "surface", "primary", "text"] as const).map((to) => gradientGroup(t(to)).items[0]!.status);
    expect(results).toContain("pass");
    expect(results).toContain("fail");
  });
  it("says so when there are none", () => {
    expect(gradientGroup(home(sample, [section([])])).items[0]!).toMatchObject({ status: "pass", text: "No section gradients." });
  });
});

describe("template check: until F084 (F083)", () => {
  it("turns the stricter failures into notes, and leaves other groups alone", () => {
    const g = { id: "slots", title: "t", why: "w", items: [{ status: "fail" as const, text: "bad" }, { status: "pass" as const, text: "ok" }] };
    expect(excuseUntilRebuilt(g).items.map((i) => i.status)).toEqual(["note", "pass"]);
    const other = { ...g, id: "contrast" };
    expect(excuseUntilRebuilt(other)).toBe(other);
  });
  it("excuses nobody now that F084 has rebuilt Harbour, Signal and Corner", () => {
    expect(AWAITING_REBUILD).toEqual([]);
  });
});

import { config, countPlaceholders, readTemplate, type Template } from "@crust/blocks";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { gallerySources } from "../../apps/admin/src/templates/sources";
import { buildStarter, harbour, signal, corner, starters } from "./starter";
import { png, standIn } from "./standins";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

type Block = { type: string; props: Record<string, unknown> };
/** A Text block that is nothing but one link. */
const isLinkOnly = (text: unknown) => {
  const blocks = (text as { blocks?: { type: string; children?: { href?: string }[] }[] })?.blocks;
  return blocks?.length === 1 && blocks[0]!.type === "p" && blocks[0]!.children?.length === 1 && !!blocks[0]!.children[0]!.href;
};
/** Every block, nested ones included (sections and columns). */
function allBlocks(content: unknown[]): Block[] {
  const out: Block[] = [];
  const walk = (list: unknown) => {
    if (!Array.isArray(list)) return;
    for (const b of list as Block[]) {
      out.push(b);
      for (const key of ["content", "column1", "column2", "column3", "column4"]) walk(b.props?.[key]);
    }
  };
  walk(content);
  return out;
}

describe.each(starters)("starter template $name (F049–F051)", (spec) => {
  let template: Template;

  it("the committed file is up to date and opens like any template", async () => {
    const text = await readFile(join(root, "templates", `${spec.id}.crust`), "utf8");
    expect(text).toBe(`${JSON.stringify(await buildStarter(spec))}\n`);
    const read = readTemplate(text, config.components);
    expect(read.problems).toEqual([]);
    template = read.template!;
  });

  it("has Home, About, Services, Work, Contact, a journal with one post, and the linked contact strip", () => {
    expect(template.pages.map((p) => p.path)).toEqual(["/", "/about", "/services", "/work", "/contact"]);
    expect(template.posts).toHaveLength(1);
    expect(template.blog.title).toBe("Journal");
    expect(template.sections.map((s) => s.id)).toEqual(["contact-strip"]);
    for (const path of ["/", "/about", "/services", "/work"]) {
      const blocks = allBlocks(template.pages.find((p) => p.path === path)!.puck.content);
      expect(blocks.some((b) => b.type === "LinkedSection" && b.props.section === "contact-strip"), path).toBe(true);
    }
    expect(allBlocks(template.pages.find((p) => p.path === "/contact")!.puck.content).some((b) => b.type === "ContactForm")).toBe(true);
    expect(template.header.menu.map((m) => m.href)).toEqual(["/about", "/services", "/work", "/blog", "/contact"]);
  });

  it("marks every sample text and image Replace me, so nothing sample survives unnoticed", () => {
    for (const part of [...template.pages, ...template.posts]) {
      for (const b of allBlocks(part.puck.content)) {
        // A quiet link ("See the work") says where it goes, so it isn't sample content (F052).
        if (b.type === "Text" && !isLinkOnly(b.props.text)) expect(b.props.placeholder, `${part.title}: Text`).toContain("text");
        if (b.type === "Image") expect(b.props.placeholder).toContain("src");
        if (b.type === "Gallery" || b.type === "Grid" || b.type === "IconList" || b.type === "Accordion") expect(b.props.placeholder, b.type).toBeDefined();
      }
    }
    expect(countPlaceholders(template.pages[0]!.puck.content)).toBeGreaterThanOrEqual(5);
  });

  it.runIf(!spec.photos)("uses only its own stand-in images, each described as a stand-in", () => {
    expect(template.media.length).toBe(7);
    for (const m of template.media) {
      expect(m.alt).toMatch(/^Stand-in image: replace with a photo of/);
      expect(m.width).toBe(1200);
      expect(Buffer.from(m.data, "base64").length).toBeLessThan(40_000);
    }
  });

  it.runIf(!!spec.photos)("uses only its credited photos, described and marked Replace me wherever they're used (F052)", async () => {
    const credits = await readFile(join(root, "scripts/starter-templates/photos/CREDITS.md"), "utf8");
    expect(template.media.map((m) => m.file).sort()).toEqual(spec.photos!.map((p) => p.file).sort());
    for (const m of template.media) {
      expect(credits, `${m.file} credited`).toContain(`| ${m.file} |`);
      expect(m.alt).not.toMatch(/stand-in/i);
      expect(m.alt.length).toBeGreaterThan(20);
      const bytes = Buffer.from(m.data, "base64");
      expect([...bytes.subarray(0, 3)], `${m.file} is a JPEG`).toEqual([0xff, 0xd8, 0xff]);
      expect(bytes.length, `${m.file} size`).toBeLessThan(400_000);
      expect(Math.max(m.width, m.height)).toBeLessThanOrEqual(1920);
    }
    for (const part of [...template.pages, ...template.posts]) {
      for (const b of allBlocks(part.puck.content)) {
        if (b.type === "Image") expect(String(b.props.src)).toMatch(/^\/media\/.+\.jpg$/);
        if (b.type === "Section" && b.props.imageSrc) expect(b.props.placeholder, "Section photo").toContain("imageSrc");
      }
    }
  });

  it.runIf(spec === harbour)("opens with a photo and shows the work as a tall photo beside two wide ones (F052)", () => {
    const home = template.pages[0]!.puck.content as Block[];
    expect(home[0]!.type).toBe("Section");
    expect(home[0]!.props).toMatchObject({ imageSrc: "/media/terraces.jpg", tint: "light", valign: "bottom" });
    const mosaic = allBlocks(home).find((b) => b.type === "Columns" && (b.props.column1 as Block[])[0]?.type === "Image")!;
    expect((mosaic.props.column1 as Block[]).filter((b) => b.type === "Image")).toHaveLength(1);
    expect((mosaic.props.column2 as Block[]).filter((b) => b.type === "Image")).toHaveLength(2);
    expect(allBlocks(home).filter((b) => b.type === "Button")).toHaveLength(0);
  });

  it.runIf(spec === signal)("opens dark on a stage photo and shows the work as named photo tiles (F053)", () => {
    const home = template.pages[0]!.puck.content as Block[];
    expect(home[0]!.props).toMatchObject({ background: "dark", imageSrc: "/media/stage-crowd.jpg", height: "large", valign: "bottom" });
    const tiles = allBlocks(home).filter((b) => b.type === "ImageOverlay");
    expect(tiles).toHaveLength(4);
    for (const t of tiles) {
      expect(t.props).toMatchObject({ background: "dark", titleLevel: "h3" });
      expect(t.props.placeholder).toEqual(["imageSrc", "title", "text"]);
      expect(String(t.props.imageAlt).length).toBeGreaterThan(20);
    }
    expect(template.posts[0]!.cover).toBe("/media/spiral-amber.jpg");
    expect(template.posts[0]!.coverAlt.length).toBeGreaterThan(20);
  });

  it.runIf(spec === corner)("opens split (words on yellow, photo beside) and shows products as cards with photos (F053)", () => {
    const home = template.pages[0]!.puck.content as Block[];
    expect(home[0]!.props).toMatchObject({ background: "surface", imageSrc: "" });
    const split = (home[0]!.props.content as Block[])[0]!;
    expect(split.type).toBe("Columns");
    expect((split.props.column1 as Block[]).map((b) => b.type)).toEqual(["Heading", "Text", "Button"]);
    expect((split.props.column2 as Block[]).map((b) => b.type)).toEqual(["Image"]);
    const cards = allBlocks(home).find((b) => b.type === "Grid")!;
    const items = cards.props.items as { imageSrc: string; imageAlt: string }[];
    expect(items).toHaveLength(3);
    for (const i of items) {
      expect(i.imageSrc).toMatch(/^\/media\/.+\.jpg$/);
      expect(i.imageAlt.length).toBeGreaterThan(20);
    }
    const contact = allBlocks(template.pages.find((p) => p.path === "/contact")!.puck.content);
    expect(contact.some((b) => b.type === "Image" && b.props.src === "/media/flower-shop.jpg")).toBe(true);
    expect(template.posts[0]!.cover).toBe("/media/moka-pour.jpg");
  });

  it.runIf(!!spec.photos)("puts text on a photo only under a tint (F053)", () => {
    for (const part of template.pages) {
      for (const b of allBlocks(part.puck.content)) {
        if ((b.type === "Section" || b.type === "ImageOverlay") && b.props.imageSrc) expect(["light", "medium", "strong"]).toContain(b.props.tint);
      }
    }
  });

  it("shows up in the Start from a template gallery", () => {
    expect(gallerySources().map((s) => s.id)).toContain(spec.id);
  });
});

describe("stand-in images", () => {
  it("are real PNG files, the same every time", () => {
    const a = standIn("arches", ["#ffffff", "#888888", "#000000"], 60, 40);
    expect([...a.slice(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(Buffer.from(a).equals(Buffer.from(standIn("arches", ["#ffffff", "#888888", "#000000"], 60, 40)))).toBe(true);
    expect(png(2, 1, () => [255, 0, 0]).length).toBeGreaterThan(40);
  });
});

describe("card photos (F053)", () => {
  it("keep their 16:9 shape even with a library photo's width and height attributes", async () => {
    const css = await readFile(join(root, "packages/blocks/src/styles.css"), "utf8");
    const rule = css.match(/\.cr-card-media \{([^}]*)\}/)![1]!;
    expect(rule).toContain("aspect-ratio: 16 / 9");
    expect(rule).toContain("height: auto");
  });
});

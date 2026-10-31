import { config, countPlaceholders, readTemplate, type Template } from "@crust/blocks";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { gallerySources } from "../../apps/admin/src/templates/sources";
import { buildStarter, starters } from "./starter";
import { png, standIn } from "./standins";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

type Block = { type: string; props: Record<string, unknown> };
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
        if (b.type === "Text") expect(b.props.placeholder, `${part.title}: Text`).toContain("text");
        if (b.type === "Image") expect(b.props.placeholder).toContain("src");
        if (b.type === "Gallery" || b.type === "Grid" || b.type === "IconList" || b.type === "Accordion") expect(b.props.placeholder, b.type).toBeDefined();
      }
    }
    expect(countPlaceholders(template.pages[0]!.puck.content)).toBeGreaterThanOrEqual(5);
  });

  it("uses only its own stand-in images, each described as a stand-in", () => {
    expect(template.media.length).toBe(7);
    for (const m of template.media) {
      expect(m.alt).toMatch(/^Stand-in image: replace with a photo of/);
      expect(m.width).toBe(1200);
      expect(Buffer.from(m.data, "base64").length).toBeLessThan(40_000);
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

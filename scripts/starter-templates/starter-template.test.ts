import { checkDesign, config, countPlaceholders, findBundledFont, findFontPair, matchingLook, readTemplate, type Template } from "@crust/blocks";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { gallerySources } from "../../apps/admin/src/templates/sources";
import { findFiller } from "../../packages/render/src/template-check";
import { cropsGroup, gradientGroup, sectionKind, slotsGroup, varietyGroup } from "../../packages/render/src/template-strict";
import { buildStarter, corner, harbour, signal, starters } from "./starter";
import { png, standIn } from "./standins";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

type Block = { type: string; props: Record<string, unknown> };
/** A Text block that is nothing but links (a quiet link, or a footer's list of links). */
const isLinksOnly = (text: unknown) => {
  const blocks = (text as { blocks?: { type: string; children?: { href?: string }[] }[] })?.blocks;
  return !!blocks?.length && blocks.every((b) => b.type === "p" && b.children?.length === 1 && !!b.children[0]!.href);
};
/** Every block, nested ones included (sections, columns, tabs…). */
function allBlocks(content: unknown): Block[] {
  const out: Block[] = [];
  const walk = (list: unknown) => {
    if (!Array.isArray(list)) return;
    for (const b of list as Block[]) {
      if (!b || typeof b !== "object" || typeof b.type !== "string") continue;
      out.push(b);
      for (const v of Object.values(b.props ?? {})) if (Array.isArray(v) && v.some((x) => x && typeof x === "object" && "type" in x)) walk(v);
    }
  };
  walk(content);
  return out;
}

/** Blocks whose words or photos describe the made-up business, and the field that must be marked. */
const MUST_MARK: Record<string, string> = {
  Image: "src",
  Gallery: "images",
  Grid: "items",
  CardSlider: "items",
  Slideshow: "slides",
  IconList: "items",
  Accordion: "items",
  Stats: "items",
  Pricing: "plans",
  Tabs: "tabs",
  Table: "rows",
  LogoRow: "logos",
  Quote: "text",
  ImageOverlay: "imageSrc",
};

const PAGES: Record<string, { paths: string[]; menu: string[]; contact: string; blog: string }> = {
  harbour: { paths: ["/", "/about", "/services", "/work", "/contact"], menu: ["Studio", "Services", "Projects", "Journal", "Contact"], contact: "/contact", blog: "Journal" },
  signal: { paths: ["/", "/work", "/services", "/about", "/contact"], menu: ["Work", "Services", "Studio", "Notes", "Contact"], contact: "/contact", blog: "Notes" },
  corner: { paths: ["/", "/menu", "/workshops", "/about", "/visit"], menu: ["Menu", "Workshops", "Our story", "News", "Visit us"], contact: "/visit", blog: "News" },
};

describe.each(starters)("starter template $name (F049–F053, rebuilt in F084)", (spec) => {
  let template: Template;
  const plan = PAGES[spec.id]!;

  it("the committed file is up to date and opens like any template", async () => {
    const text = await readFile(join(root, "templates", `${spec.id}.crust`), "utf8");
    expect(text).toBe(`${JSON.stringify(await buildStarter(spec))}\n`);
    const read = readTemplate(text, config.components);
    expect(read.problems).toEqual([]);
    template = read.template!;
  });

  it("has pages that fit the business, a journal with two posts and the linked contact strip (F084)", () => {
    expect(template.pages.map((p) => p.path)).toEqual(plan.paths);
    expect(template.header.menu.map((m) => m.label)).toEqual(plan.menu);
    for (const m of template.header.menu) expect(m.href === "/blog" || plan.paths.includes(m.href), m.href).toBe(true);
    expect(template.blog.title).toBe(plan.blog);
    expect(template.posts).toHaveLength(2);
    expect(template.sections.map((s) => s.id)).toContain("contact-strip");
    for (const page of template.pages.filter((p) => p.path !== plan.contact)) {
      expect(allBlocks(page.puck.content).some((b) => b.type === "LinkedSection" && b.props.section === "contact-strip"), page.path).toBe(true);
    }
    expect(allBlocks(template.pages.find((p) => p.path === plan.contact)!.puck.content).some((b) => b.type === "ContactForm")).toBe(true);
  });

  it("uses its Style library look, with bundled fonts and motion (F084)", () => {
    const match = matchingLook(template.tokens);
    expect(match?.look.id).toBe(spec.look.id);
    expect(match?.variation.id).toBe(spec.look.variation);
    const pair = findFontPair(template.tokens.fonts)!;
    expect(findBundledFont(pair.heading)).toBeDefined();
    expect(template.tokens.style?.motion).toBe(spec.motion);
  });

  it("is full length: Home has 8 or more sections, other pages 3 or more", () => {
    expect(template.pages[0]!.puck.content.length).toBeGreaterThanOrEqual(8);
    for (const page of template.pages.slice(1).filter((p) => p.path !== plan.contact)) expect(page.puck.content.length, page.path).toBeGreaterThanOrEqual(4);
    const kinds = new Set((template.pages[0]!.puck.content as Block[]).map((b, i) => sectionKind(b, i)));
    expect(kinds.size).toBeGreaterThanOrEqual(6);
  });

  it("passes the stricter check (F083): no empty slots, matching crops, variety, readable gradients", () => {
    for (const group of [slotsGroup(template), cropsGroup(template), varietyGroup(template), gradientGroup(template)]) {
      expect(group.items.filter((i) => i.status === "fail"), group.title).toEqual([]);
    }
  });

  it("has finished copy, no filler, and marks every made-up word and photo to replace", () => {
    const parts = [...template.pages.map((p) => p.puck.content), ...template.posts.map((p) => p.puck.content), ...template.sections.map((s) => s.content)];
    for (const content of parts) {
      expect(findFiller(content)).toEqual([]);
      for (const b of allBlocks(content)) {
        if (b.type === "Text" && !isLinksOnly(b.props.text)) expect(b.props.placeholder, `Text ${b.props.id}`).toContain("text");
        if (MUST_MARK[b.type]) expect(b.props.placeholder, `${b.type} ${b.props.id}`).toContain(MUST_MARK[b.type]);
        if (b.type === "Section" && b.props.imageSrc) expect(b.props.placeholder, "Section photo").toContain("imageSrc");
      }
    }
    const words = JSON.stringify(template.pages);
    for (const old of ["One line on this service", "Project name, the client, the year", "A sentence a happy client said", "Replace me"]) expect(words).not.toContain(old);
    expect(countPlaceholders(template.pages[0]!.puck.content)).toBeGreaterThanOrEqual(8);
  });

  it("ships its own post, blog and Page not found designs (F082)", () => {
    expect((template.designs ?? []).map((d) => d.kind).sort()).toEqual(["blog", "notFound", "post"]);
    for (const d of template.designs!) expect(checkDesign({ ...d, savedAt: "2026-11-03T00:00:00.000Z" }), d.kind).toEqual([]);
  });

  it("uses only its credited photos, each described (F052, F053, F084)", async () => {
    const credits = await readFile(join(root, "scripts/starter-templates/photos/CREDITS.md"), "utf8");
    expect(template.media.map((m) => m.file).sort()).toEqual(spec.photos.map((p) => p.file).sort());
    for (const m of template.media) {
      expect(credits, `${m.file} credited`).toContain(`| ${m.file} |`);
      expect(m.alt).not.toMatch(/stand-in/i);
      const bytes = Buffer.from(m.data, "base64");
      if (m.file.endsWith(".png")) {
        expect([...bytes.subarray(0, 4)], `${m.file} is a PNG`).toEqual([0x89, 0x50, 0x4e, 0x47]);
        expect(m.alt.length).toBeGreaterThan(2);
      } else {
        expect([...bytes.subarray(0, 3)], `${m.file} is a JPEG`).toEqual([0xff, 0xd8, 0xff]);
        expect(m.alt.length).toBeGreaterThan(20);
      }
      expect(bytes.length, `${m.file} size`).toBeLessThan(400_000);
      expect(Math.max(m.width, m.height)).toBeLessThanOrEqual(1920);
    }
    for (const part of [...template.pages, ...template.posts]) {
      for (const b of allBlocks(part.puck.content)) if (b.type === "Image") expect(String(b.props.src)).toMatch(/^\/media\/.+\.jpg$/);
    }
    for (const p of template.posts) {
      expect(p.cover).toMatch(/^\/media\/.+\.jpg$/);
      expect(p.coverAlt.length).toBeGreaterThan(20);
    }
  });

  it("puts text on a photo only under a tint (F053)", () => {
    for (const part of [...template.pages, ...template.sections.map((s) => ({ puck: { content: s.content } }))]) {
      for (const b of allBlocks(part.puck.content)) {
        if ((b.type === "Section" || b.type === "ImageOverlay") && b.props.imageSrc) expect(["light", "medium", "strong"]).toContain(b.props.tint);
      }
    }
  });

  it.runIf(spec === harbour)("opens on a full photo with the header over it, and shows projects in a slider (F084)", () => {
    const home = template.pages[0]!.puck.content as Block[];
    expect(home[0]!.props).toMatchObject({ imageSrc: "/media/terraces.jpg", bgKind: "photo", height: "full", valign: "bottom" });
    expect(template.header).toMatchObject({ layout: "classic", overHero: true });
    expect(allBlocks(home).some((b) => b.type === "CardSlider")).toBe(true);
    expect(allBlocks(template.pages.find((p) => p.path === "/services")!.puck.content).some((b) => b.type === "Pricing")).toBe(true);
  });

  it.runIf(spec === signal)("is dark, with a top bar, client logos, named work tiles and a footer made of blocks (F084)", () => {
    const home = template.pages[0]!.puck.content as Block[];
    expect(home[0]!.props).toMatchObject({ imageSrc: "/media/stage-crowd.jpg", tint: "strong" });
    expect(template.header.topBar?.show).toBe(true);
    expect(template.header.cta.label).toBe("Start a project");
    expect(template.footer).toMatchObject({ kind: "blocks", section: "site-footer" });
    expect(template.sections.map((s) => s.id)).toContain("site-footer");
    const tiles = allBlocks(home).filter((b) => b.type === "ImageOverlay");
    expect(tiles).toHaveLength(4);
    for (const t of tiles) expect(String(t.props.imageAlt).length).toBeGreaterThan(20);
    const logos = allBlocks(home).find((b) => b.type === "LogoRow")!;
    expect(logos.props.moving).toBe("yes");
    expect((logos.props.logos as { src: string }[]).every((l) => l.src.endsWith(".png"))).toBe(true);
  });

  it.runIf(spec === corner)("opens split with the shop's photo, and has a menu with prices and opening hours (F084)", () => {
    const home = template.pages[0]!.puck.content as Block[];
    const split = (home[0]!.props.content as Block[])[0]!;
    expect(split.type).toBe("Columns");
    expect((split.props.column2 as Block[]).map((b) => b.type)).toEqual(["Image"]);
    expect(template.header).toMatchObject({ layout: "stacked" });
    expect(template.header.topBar?.text).toMatch(/7:00/);
    const tables = allBlocks(template.pages.find((p) => p.path === "/menu")!.puck.content).filter((b) => b.type === "Table");
    expect(tables.map((t) => t.props.caption)).toEqual(["Bread", "Pastry and cake", "Coffee", "Breakfast, until 11:30"]);
    for (const t of tables) for (const row of (t.props.rows as string[][]).slice(1)) expect(row[1]).toMatch(/^€\d/);
    expect(allBlocks(home).some((b) => b.type === "Table" && b.props.caption === "Opening hours")).toBe(true);
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

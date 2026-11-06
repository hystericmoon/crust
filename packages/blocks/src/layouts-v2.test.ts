import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { ComponentData } from "@puckeditor/core";
import { describe, expect, it } from "vitest";
import { LAYOUT_PHOTO_PREFIX, layoutLogos, layoutPhotoOf, layoutPhotoSrcs, layoutPhotos, swapLayoutPhotos } from "./layout-photos";
import { buildPageLayout, findSectionLayout, fitHeadings, layoutCategories, pageLayouts, sectionLayouts } from "./layouts";
import { fitLayoutToTokens, pageLayoutsV2, sectionLayoutsV2 } from "./layouts-v2";
import { cleanPlaceholder, clearEditedPlaceholders, findPlaceholders, uncopiedSampleLabel } from "./placeholders";
import { gradientReads } from "./sections-v2";
import { resolveSectionStyle, sectionStyleIds } from "./section-styles";
import { contrastRatio } from "./contrast";
import { applyLook, styleLooks } from "./style-library";
import { defaultTokens, type SiteTokens } from "./tokens";
import { isIconName } from "./icons";

const here = dirname(fileURLToPath(import.meta.url));
const publicDir = join(here, "../../../apps/admin/public/layout-photos");

const isTree = (v: unknown): v is ComponentData[] => Array.isArray(v) && v.length > 0 && v.every((x) => x && typeof x === "object" && "type" in x);
function all(items: ComponentData[]): ComponentData[] {
  return items.flatMap((item) => [item, ...Object.values(item.props).flatMap((v) => (isTree(v) ? all(v) : []))]);
}
const levels = (items: ComponentData[]) => all(items).filter((b) => b.type === "Heading").map((b) => Number(String(b.props.level).slice(1)));

describe("layout library v2 (F080)", () => {
  it("has about 60 new sections and 10 new whole pages, listed before the first library's", () => {
    expect(sectionLayoutsV2.length).toBeGreaterThanOrEqual(60);
    expect(pageLayoutsV2).toHaveLength(10);
    expect(sectionLayouts.slice(0, sectionLayoutsV2.length).every((l) => !l.simple)).toBe(true);
    expect(sectionLayouts.slice(sectionLayoutsV2.length).every((l) => l.simple)).toBe(true);
    expect(pageLayouts.slice(10).every((l) => l.simple)).toBe(true);
  });

  it("gives every layout a unique id, a known category and a description", () => {
    const ids = sectionLayouts.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
    const pageIds = pageLayouts.map((l) => l.id);
    expect(new Set(pageIds).size).toBe(pageIds.length);
    for (const l of sectionLayoutsV2) {
      expect(layoutCategories, l.id).toContain(l.category);
      expect(l.description.length, l.id).toBeGreaterThan(15);
    }
    // Every category but the first library's "Content" has new layouts.
    for (const c of layoutCategories.filter((c) => c !== "Content")) expect(sectionLayoutsV2.some((l) => l.category === c), c).toBe(true);
  });

  it("builds fresh ids every time", () => {
    for (const l of sectionLayoutsV2) {
      const a = all(l.build()).map((b) => String(b.props.id));
      const b = all(l.build()).map((b) => String(b.props.id));
      expect(new Set(a).size, l.id).toBe(a.length);
      expect(a.some((x) => b.includes(x)), l.id).toBe(false);
    }
  });

  it("keeps headings in order: at most one h1, and no level skipped inside a section", () => {
    for (const l of sectionLayoutsV2) {
      const ls = levels(l.build());
      expect(ls.filter((x) => x === 1).length, l.id).toBeLessThanOrEqual(1);
      ls.forEach((x, i) => {
        if (i > 0) expect(x - ls[i - 1]!, `${l.id}: h${ls[i - 1]} then h${x}`).toBeLessThanOrEqual(1);
      });
      // A section starts at h1 (a hero) or h2.
      if (ls.length) expect(ls[0], l.id).toBeLessThanOrEqual(2);
    }
  });

  it("whole pages use only sections that exist, and keep one h1 once fitted", () => {
    for (const p of pageLayoutsV2) {
      for (const id of p.sections) expect(findSectionLayout(id), `${p.id}: ${id}`).toBeDefined();
      const ls = levels(fitHeadings(buildPageLayout(p), false));
      expect(ls.filter((x) => x === 1).length, p.id).toBeLessThanOrEqual(1);
    }
  });

  it("uses only icons from Crust's set", () => {
    for (const l of sectionLayoutsV2) {
      for (const b of all(l.build())) {
        for (const name of [b.props.icon, ...(((b.props.items as { icon?: string }[] | undefined) ?? []).map((i) => i.icon))]) {
          if (typeof name === "string" && name && name !== "check" && name !== "numbers") expect(isIconName(name), `${l.id}: ${name}`).toBe(true);
        }
      }
    }
  });

  it("uses only the bundled sample photos, and marks every one to replace", () => {
    for (const l of sectionLayoutsV2) {
      const blocks = all(l.build());
      for (const src of layoutPhotoSrcs(blocks)) expect(layoutPhotoOf(src), `${l.id}: ${src}`).toBeDefined();
      for (const b of blocks) {
        const own = Object.fromEntries(Object.entries(b.props).filter(([, v]) => !isTree(v)));
        if (!layoutPhotoSrcs(own).length) continue;
        expect(cleanPlaceholder(b.type, b.props.placeholder).length, `${l.id}: ${b.type} has a sample photo but no mark`).toBeGreaterThan(0);
      }
      // Photos and logos carry a description.
      for (const b of blocks) {
        for (const [k, v] of Object.entries(b.props)) if (k.toLowerCase().includes("alt") && typeof v === "string" && b.props.imageSrc) expect(v.trim(), `${l.id}: ${b.type}.${k}`).not.toBe("");
      }
    }
  });

  it("ships every sample photo, at the size it says", () => {
    for (const p of [...Object.values(layoutPhotos), ...layoutLogos]) {
      const file = join(publicDir, p.file);
      expect(existsSync(file), p.file).toBe(true);
      const bytes = readFileSync(file);
      expect(bytes.length, p.file).toBeLessThan(450 * 1024);
      if (p.file.endsWith(".png")) {
        expect([bytes.readUInt32BE(16), bytes.readUInt32BE(20)], p.file).toEqual([p.width, p.height]);
      } else {
        // JPEG: the first SOF marker holds the size.
        let i = 2;
        while (i < bytes.length && !(bytes[i] === 0xff && bytes[i + 1]! >= 0xc0 && bytes[i + 1]! <= 0xc2)) i += 2 + bytes.readUInt16BE(i + 2);
        expect([bytes.readUInt16BE(i + 7), bytes.readUInt16BE(i + 5)], p.file).toEqual([p.width, p.height]);
      }
      expect(p.alt.length, p.file).toBeGreaterThan(3);
    }
  });
});

describe("sample photos (F080)", () => {
  const src = `${LAYOUT_PHOTO_PREFIX}${layoutPhotos.pool.file}`;

  it("finds and swaps sample addresses anywhere in blocks", () => {
    const blocks = [{ type: "Section", props: { id: "s", imageSrc: src, content: [{ type: "Gallery", props: { id: "g", images: [{ src, alt: "x" }, { src: "/media/mine.jpg", alt: "y" }] } }] } }];
    expect(layoutPhotoSrcs(blocks)).toEqual([src]);
    const swapped = swapLayoutPhotos(blocks, new Map([[src, "/media/sample-pool-house.jpg"]]));
    expect(layoutPhotoSrcs(swapped)).toEqual([]);
    expect(JSON.stringify(swapped)).toContain("/media/mine.jpg");
    expect(layoutPhotoOf("/layout-photos/nope.jpg")).toBeUndefined();
    expect(layoutPhotoOf("/media/sample-pool-house.jpg")).toBeUndefined();
  });

  it("keeps the 'to replace' mark when the builder copies a sample into the Media library", () => {
    const before = [{ type: "Image", props: { id: "i", src, alt: "a", placeholder: ["src"] } }];
    const copied = [{ type: "Image", props: { id: "i", src: "/media/sample-pool-house-2.jpg", alt: "a", placeholder: ["src"] } }];
    expect(findPlaceholders(clearEditedPlaceholders(before, copied))).toHaveLength(1);
    // The owner picking another photo is a real replacement.
    const replaced = [{ type: "Image", props: { id: "i", src: "/media/our-shop.jpg", alt: "a", placeholder: ["src"] } }];
    expect(findPlaceholders(clearEditedPlaceholders(before, replaced))).toHaveLength(0);
  });

  it("stops publishing a block that still points at a sample photo, even unmarked", () => {
    expect(uncopiedSampleLabel("Image", { src, alt: "a" })).toMatch(/sample photo not in your Media library/);
    expect(uncopiedSampleLabel("Gallery", { images: [{ src }] })).not.toBe("");
    expect(uncopiedSampleLabel("Image", { src: "/media/sample-pool-house.jpg" })).toBe("");
    // A section is checked on its own props; the blocks inside it carry their own label.
    expect(uncopiedSampleLabel("Section", { content: [{ type: "Image", props: { id: "i", src } }] })).toBe("");
  });
});

describe("fitting a layout to the site's colours (F080)", () => {
  const gradientSections = (items: ComponentData[]) => all(items).filter((b) => b.type === "Section" && b.props.bgKind === "gradient");

  it("keeps every gradient readable in every look and colourway", () => {
    const built = sectionLayoutsV2.flatMap((l) => l.build());
    for (const look of styleLooks) {
      for (const v of look.variations) {
        const tokens = applyLook(defaultTokens, look, v);
        for (const s of gradientSections(fitLayoutToTokens(built, tokens))) {
          const g = s.props.gradient as { to: "primary" };
          expect(gradientReads(tokens, s.props.background as "background", g.to), `${look.id}: ${s.props.background} → ${g.to}`).toBe(true);
        }
      }
    }
  });

  it("falls back to the plain colour when no gradient reads", () => {
    const flat: SiteTokens = { ...defaultTokens, colors: { ...defaultTokens.colors, primary: "#777777", surface: "#777777", muted: "#777777" } };
    const section = { type: "Section", props: { id: "s", background: "background", bgKind: "gradient", gradient: { to: "primary", direction: "glow" }, content: [] } };
    const [fitted] = fitLayoutToTokens([section], { ...flat, colors: { ...flat.colors, background: "#777777", text: "#777777", onPrimary: "#777777" } });
    expect(fitted!.props.bgKind).toBe("colour");
    expect(fitted!.props.gradient).toBeUndefined();
  });
});

describe("Soft button label (F080 fix)", () => {
  it("reads on its own tint in every section style of every look", () => {
    for (const look of styleLooks) {
      for (const v of look.variations) {
        const tokens = applyLook(defaultTokens, look, v);
        for (const id of sectionStyleIds) {
          const s = resolveSectionStyle(tokens, id);
          expect(contrastRatio(s.softFg, s.softBg), `${look.id}/${v.id}/${id}`).toBeGreaterThanOrEqual(4.5);
        }
      }
    }
  });
});

describe("Gallery shapes in the layout library", () => {
  it("only use shapes the Gallery block knows", () => {
    const found: string[] = [];
    const walk = (v: unknown) => {
      if (Array.isArray(v)) return v.forEach(walk);
      if (v && typeof v === "object") {
        const o = v as Record<string, unknown>;
        if (o.type === "Gallery") found.push(String((o.props as { shape?: unknown } | undefined)?.shape));
        Object.values(o).forEach(walk);
      }
    };
    walk(sectionLayoutsV2.map((l) => l.build?.() ?? l));
    walk(pageLayoutsV2);
    expect(found.length).toBeGreaterThan(0);
    for (const s of found) expect(["square", "wide", "original"]).toContain(s);
  });
});

describe("F080 review: hero buttons", () => {
  it("the full photo hero keeps its two buttons together, not in far-apart columns", () => {
    const hero = findSectionLayout("hero-photo-full");
    expect(hero).toBeDefined();
    const json = JSON.stringify(hero!.build());
    expect(json).not.toContain('"one-three"');
    expect(json).toContain("See the work");
    expect(json).toContain("About the studio");
  });
});

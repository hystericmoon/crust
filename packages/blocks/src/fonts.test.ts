import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { fontMainBytes } from "./font-sizes";
import {
  allFontsPreviewCss,
  bundledFontIn,
  bundledFonts,
  bundledStack,
  findBundledFont,
  findFontPair,
  fontDownloadKb,
  fontFaceCss,
  fontFiles,
  fontPairs,
  fontPreloads,
  fontStacks,
  pairFonts,
  siteFonts,
} from "./fonts";
import { defaultTokens, tokensToCss } from "./tokens";

const dir = join(__dirname, "../fonts");
const fraunces = findBundledFont("fraunces")!;
const geist = findBundledFont("geist")!;

describe("fonts: the bundled set", () => {
  it("has 32 families with unique ids and names", () => {
    expect(bundledFonts).toHaveLength(32);
    expect(new Set(bundledFonts.map((f) => f.id)).size).toBe(32);
    expect(new Set(bundledFonts.map((f) => f.family)).size).toBe(32);
    expect(bundledFonts.filter((f) => f.category === "mono").length).toBeGreaterThanOrEqual(4);
  });

  it("ships every file the list names, and nothing else, with the licence", () => {
    const expected = bundledFonts.flatMap((f) => fontFiles(f).map((x) => x.file)).sort();
    const shipped = readdirSync(dir).filter((f) => f.endsWith(".woff2")).sort();
    expect(shipped).toEqual(expected);
    for (const file of shipped) {
      const bytes = readFileSync(join(dir, file));
      expect(bytes.subarray(0, 4).toString("latin1"), file).toBe("wOF2");
    }
    const licence = readFileSync(join(dir, "LICENSE.txt"), "utf8");
    expect(licence).toContain("SIL Open Font License, Version 1.1");
    for (const f of bundledFonts) expect(licence, f.family).toContain(`${f.family}:`);
  });

  it("keeps each font's main file small enough for a fast page", () => {
    for (const f of bundledFonts) {
      expect(fontMainBytes[f.id], f.id).toBeGreaterThan(5_000);
      expect(fontMainBytes[f.id], f.id).toBeLessThan(80_000);
    }
  });

  it("names variable and static files the way the sync script writes them", () => {
    expect(fontFiles(fraunces).map((f) => f.file)).toEqual(["fraunces-latin.woff2", "fraunces-latin-ext.woff2", "fraunces-latin-italic.woff2", "fraunces-latin-ext-italic.woff2"]);
    expect(fontFiles(findBundledFont("ibm-plex-mono")!).map((f) => f.file)).toContain("ibm-plex-mono-500-latin-italic.woff2");
    expect(fontFiles(findBundledFont("manrope")!).every((f) => f.style === "normal")).toBe(true);
  });
});

describe("fonts: font lists", () => {
  it("stores a bundled font as its family plus a system fallback", () => {
    expect(bundledStack(fraunces)).toBe("'Fraunces', Georgia, 'Times New Roman', serif");
    expect(bundledStack(findBundledFont("geist-mono")!)).toContain("monospace");
  });

  it("recognises a bundled font by the first family in a list, quoted or not", () => {
    expect(bundledFontIn("'Fraunces', serif")).toBe(fraunces);
    expect(bundledFontIn('"Geist", sans-serif')).toBe(geist);
    expect(bundledFontIn("geist, sans-serif")).toBe(geist);
    expect(bundledFontIn("Georgia, 'Fraunces'")).toBeUndefined();
    expect(bundledFontIn(undefined)).toBeUndefined();
  });

  it("lists a site's fonts once, heading first", () => {
    expect(siteFonts({ heading: bundledStack(geist), body: bundledStack(geist) })).toEqual([geist]);
    expect(siteFonts({ heading: bundledStack(fraunces), body: bundledStack(geist) })).toEqual([fraunces, geist]);
    expect(siteFonts(defaultTokens.fonts)).toEqual([]);
  });
});

describe("fonts: CSS", () => {
  it("writes @font-face rules for the fonts in use only, served from the site", () => {
    const css = fontFaceCss({ heading: bundledStack(fraunces), body: fontStacks[0]!.stack });
    expect(css.match(/@font-face/g)).toHaveLength(4);
    expect(css).toContain("font-family: 'Fraunces'; font-style: italic; font-weight: 100 900; font-display: swap; src: url(/fonts/fraunces-latin-italic.woff2)");
    expect(css).toContain("unicode-range: U+0000-00FF");
    expect(css).not.toContain("googleapis");
  });

  it("leaves sites on system fonts with exactly the CSS they had", () => {
    expect(fontFaceCss(defaultTokens.fonts)).toBe("");
    expect(tokensToCss(defaultTokens)).not.toContain("@font-face");
    expect(tokensToCss(defaultTokens).startsWith(":root {")).toBe(true);
  });

  it("puts the font rules ahead of the site's variables", () => {
    const css = tokensToCss({ ...defaultTokens, fonts: pairFonts(fontPairs[0]!) });
    expect(css.indexOf("@font-face")).toBeLessThan(css.indexOf(":root {"));
    expect(css).toContain("--cr-font-heading: 'Fraunces', Georgia, 'Times New Roman', serif;");
  });

  it("preloads the main file of each font in use", () => {
    expect(fontPreloads({ heading: bundledStack(fraunces), body: bundledStack(geist) })).toEqual(["/fonts/fraunces-latin.woff2", "/fonts/geist-latin.woff2"]);
    expect(fontPreloads({ heading: bundledStack(findBundledFont("dm-mono")!) })).toEqual(["/fonts/dm-mono-400-latin.woff2"]);
    expect(fontPreloads(defaultTokens.fonts)).toEqual([]);
  });

  it("gives the admin a preview rule per font, Latin upright only", () => {
    const css = allFontsPreviewCss();
    expect(css.match(/@font-face/g)).toHaveLength(32);
    expect(css).not.toContain("italic.woff2");
  });

  it("says roughly how much a choice adds", () => {
    expect(fontDownloadKb(defaultTokens.fonts)).toBe(0);
    const kb = fontDownloadKb(pairFonts(fontPairs[0]!));
    expect(kb).toBeGreaterThanOrEqual(60);
    expect(kb).toBeLessThanOrEqual(150);
    expect(kb % 10).toBe(0);
  });
});

describe("fonts: pairs", () => {
  it("has 12 pairs of real fonts, with headings-only fonts never used for body text", () => {
    expect(fontPairs).toHaveLength(12);
    for (const p of fontPairs) {
      const h = findBundledFont(p.heading);
      const b = findBundledFont(p.body);
      expect(h, p.id).toBeTruthy();
      expect(b, p.id).toBeTruthy();
      expect(b!.displayOnly, `${p.id} body`).toBeFalsy();
      expect(b!.category, `${p.id} body`).not.toBe("mono");
    }
  });

  it("keeps every pair light enough for a 95 speed score", () => {
    for (const p of fontPairs) expect(fontDownloadKb(pairFonts(p)), p.id).toBeLessThanOrEqual(150);
  });

  it("finds the pair a site's fonts match", () => {
    expect(findFontPair(pairFonts(fontPairs[3]!))?.id).toBe(fontPairs[3]!.id);
    expect(findFontPair(defaultTokens.fonts)).toBeUndefined();
    expect(findFontPair({ heading: bundledStack(geist), body: bundledStack(fraunces) })).toBeUndefined();
  });

  it("ships the files on disk that the pairs need", () => {
    for (const p of fontPairs) for (const id of [p.heading, p.body]) for (const f of fontFiles(findBundledFont(id)!)) expect(existsSync(join(dir, f.file)), f.file).toBe(true);
    expect(statSync(dir).isDirectory()).toBe(true);
  });
});

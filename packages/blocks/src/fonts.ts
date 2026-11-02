import { fontMainBytes } from "./font-sizes";

/**
 * Curated font stacks. They use fonts already installed on the visitor's
 * device: no downloads, no cost, no tracking. Each looks slightly different
 * on Mac, Windows and phones, but keeps the same character.
 */
export interface FontStack {
  id: string;
  label: string;
  stack: string;
}

export const fontStacks: FontStack[] = [
  { id: "system", label: "System sans", stack: "system-ui, -apple-system, 'Segoe UI', sans-serif" },
  { id: "humanist", label: "Humanist sans", stack: "Seravek, 'Gill Sans Nova', Ubuntu, Calibri, 'DejaVu Sans', sans-serif" },
  { id: "geometric", label: "Geometric sans", stack: "Avenir, Montserrat, Corbel, 'URW Gothic', sans-serif" },
  { id: "transitional", label: "Transitional serif", stack: "Charter, 'Bitstream Charter', 'Sitka Text', Cambria, serif" },
  { id: "oldstyle", label: "Old-style serif", stack: "'Iowan Old Style', 'Palatino Linotype', 'URW Palladio L', P052, serif" },
  { id: "mono", label: "Monospace", stack: "ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, Consolas, monospace" },
];

/** The curated stack matching `stack`, or undefined for a custom one. */
export function findFontStack(stack: string): FontStack | undefined {
  const norm = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();
  return fontStacks.find((f) => norm(f.stack) === norm(stack));
}

// --- Bundled fonts (F070) -----------------------------------------------------------
//
// Open-licence typefaces (SIL OFL 1.1, allowed by the owner 2026-11-02) that
// ship with Crust in packages/blocks/fonts/ (made by `npm run fonts:sync` from
// the @fontsource packages). A site uses one by naming its family first in a
// font list, e.g. "'Fraunces', Georgia, serif": the content format doesn't
// change. Publishing copies only the files a site's pages point to, from the
// site itself: no requests to Google, nothing for visitors to consent to.

export type FontCategory = "serif" | "sans" | "mono";

export interface BundledFont {
  id: string;
  family: string;
  category: FontCategory;
  /** A variable font's weight range [min, max], or a static font's weights. */
  weights: number[];
  variable: boolean;
  italic: boolean;
  /** Too decorative or high-contrast for running text: offered for headings only. */
  displayOnly?: boolean;
}

const v = (id: string, family: string, category: FontCategory, min: number, max: number, italic = true, displayOnly = false): BundledFont => ({
  id, family, category, weights: [min, max], variable: true, italic, ...(displayOnly ? { displayOnly } : {}),
});
const s = (id: string, family: string, category: FontCategory, weights: number[], italic: boolean, displayOnly = false): BundledFont => ({
  id, family, category, weights, variable: false, italic, ...(displayOnly ? { displayOnly } : {}),
});

export const bundledFonts: BundledFont[] = [
  // Serif
  v("fraunces", "Fraunces", "serif", 100, 900),
  v("newsreader", "Newsreader", "serif", 200, 800),
  v("playfair-display", "Playfair Display", "serif", 400, 900, true, true),
  v("eb-garamond", "EB Garamond", "serif", 400, 800),
  v("cormorant-garamond", "Cormorant Garamond", "serif", 300, 700, true, true),
  v("source-serif-4", "Source Serif 4", "serif", 200, 900),
  v("literata", "Literata", "serif", 200, 900),
  v("lora", "Lora", "serif", 400, 700),
  v("bodoni-moda", "Bodoni Moda", "serif", 400, 900, true, true),
  s("instrument-serif", "Instrument Serif", "serif", [400], true, true),
  s("dm-serif-display", "DM Serif Display", "serif", [400], true, true),
  s("young-serif", "Young Serif", "serif", [400], false, true),
  // Sans
  v("geist", "Geist", "sans", 100, 900),
  v("inter-tight", "Inter Tight", "sans", 100, 900),
  v("dm-sans", "DM Sans", "sans", 100, 1000),
  v("instrument-sans", "Instrument Sans", "sans", 400, 700),
  v("schibsted-grotesk", "Schibsted Grotesk", "sans", 400, 900),
  v("manrope", "Manrope", "sans", 200, 800, false),
  v("figtree", "Figtree", "sans", 300, 900),
  v("onest", "Onest", "sans", 100, 900, false),
  v("hanken-grotesk", "Hanken Grotesk", "sans", 100, 900),
  v("plus-jakarta-sans", "Plus Jakarta Sans", "sans", 200, 800),
  v("space-grotesk", "Space Grotesk", "sans", 300, 700, false),
  v("sora", "Sora", "sans", 100, 800, false),
  v("outfit", "Outfit", "sans", 100, 900, false),
  v("public-sans", "Public Sans", "sans", 100, 900),
  v("work-sans", "Work Sans", "sans", 100, 900),
  v("bricolage-grotesque", "Bricolage Grotesque", "sans", 200, 800, false),
  // Mono
  v("geist-mono", "Geist Mono", "mono", 100, 900),
  v("jetbrains-mono", "JetBrains Mono", "mono", 100, 800),
  s("ibm-plex-mono", "IBM Plex Mono", "mono", [400, 500], true),
  s("dm-mono", "DM Mono", "mono", [400, 500], true),
];

export const fontCategoryNames: Record<FontCategory, string> = { serif: "Serif", sans: "Sans serif", mono: "Monospace" };

const fallbacks: Record<FontCategory, string> = {
  serif: "Georgia, 'Times New Roman', serif",
  sans: "system-ui, -apple-system, 'Segoe UI', sans-serif",
  mono: "ui-monospace, Menlo, Consolas, monospace",
};

/** The font list a site stores for a bundled font: its family, then a close system fallback. */
export const bundledStack = (font: BundledFont): string => `'${font.family}', ${fallbacks[font.category]}`;

export const findBundledFont = (id: string): BundledFont | undefined => bundledFonts.find((f) => f.id === id);

/** The bundled font a font list starts with, if any. */
export function bundledFontIn(stack: string | undefined): BundledFont | undefined {
  const first = (stack ?? "").split(",")[0]?.trim().replace(/^['"]|['"]$/g, "").toLowerCase();
  return first ? bundledFonts.find((f) => f.family.toLowerCase() === first) : undefined;
}

/** Character ranges of the two subsets we ship (from @fontsource's unicode.json). */
export const fontSubsets = {
  latin:
    "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD",
  "latin-ext":
    "U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF",
} as const;
export type FontSubset = keyof typeof fontSubsets;

export interface FontFile {
  /** File name in packages/blocks/fonts/ and in the published site's /fonts/. */
  file: string;
  subset: FontSubset;
  style: "normal" | "italic";
  /** "100 900" for a variable font, "400" for a static one. */
  weight: string;
}

/** Every file of a font, in a stable order. */
export function fontFiles(font: BundledFont): FontFile[] {
  const out: FontFile[] = [];
  const styles = font.italic ? (["normal", "italic"] as const) : (["normal"] as const);
  const weights = font.variable ? [`${font.weights[0]} ${font.weights[1]}`] : font.weights.map(String);
  for (const weight of weights) {
    for (const style of styles) {
      for (const subset of Object.keys(fontSubsets) as FontSubset[]) {
        const w = font.variable ? "" : `-${weight}`;
        out.push({ file: `${font.id}${w}-${subset}${style === "italic" ? "-italic" : ""}.woff2`, subset, style, weight });
      }
    }
  }
  return out;
}

/** F071: the font for Mono and Chip labels. */
export const LABEL_FONT_ID = "geist-mono";
export const labelFontStack = (): string => bundledStack(findBundledFont(LABEL_FONT_ID)!);

/** The bundled fonts a site uses (heading first), without repeats. `extra`: more font lists (F071: the label font). */
export function siteFonts(fonts: { heading?: string; body?: string } | undefined, extra: string[] = []): BundledFont[] {
  const out: BundledFont[] = [];
  for (const stack of [fonts?.heading, fonts?.body, ...extra]) {
    const font = bundledFontIn(stack);
    if (font && !out.includes(font)) out.push(font);
  }
  return out;
}

/**
 * @font-face rules for the bundled fonts a site uses; empty when it uses
 * none, so sites without them publish exactly the CSS they did before.
 * Browsers fetch a file only when text needs it (unicode-range, style).
 */
export function fontFaceCss(fonts: { heading?: string; body?: string } | undefined, base = "/fonts/", extra: string[] = []): string {
  return siteFonts(fonts, extra)
    .flatMap((font) =>
      fontFiles(font).map(
        (f) =>
          `@font-face { font-family: '${font.family}'; font-style: ${f.style}; font-weight: ${f.weight}; font-display: swap; src: url(${base}${f.file}) format("woff2"); unicode-range: ${fontSubsets[f.subset]}; }`,
      ),
    )
    .join("\n");
}

/** The files worth preloading: the Latin, upright file of each font in use (static fonts: their 400). */
export function fontPreloads(fonts: { heading?: string; body?: string } | undefined, base = "/fonts/"): string[] {
  return siteFonts(fonts).map((font) => {
    const files = fontFiles(font);
    const f = files.find((x) => x.subset === "latin" && x.style === "normal" && (font.variable || x.weight === "400")) ?? files[0]!;
    return `${base}${f.file}`;
  });
}

/** A tested heading and body combination, shown as a card in Site settings. */
export interface FontPair {
  id: string;
  name: string;
  heading: string;
  body: string;
}

export const fontPairs: FontPair[] = [
  { id: "editorial", name: "Editorial", heading: "fraunces", body: "inter-tight" },
  { id: "studio", name: "Studio", heading: "geist", body: "geist" },
  { id: "gallery", name: "Gallery", heading: "instrument-serif", body: "instrument-sans" },
  { id: "luxury", name: "Luxury", heading: "bodoni-moda", body: "hanken-grotesk" },
  { id: "friendly", name: "Friendly", heading: "bricolage-grotesque", body: "figtree" },
  { id: "clinic", name: "Clinic", heading: "plus-jakarta-sans", body: "dm-sans" },
  { id: "classic", name: "Classic", heading: "cormorant-garamond", body: "lora" },
  { id: "newsroom", name: "Newsroom", heading: "newsreader", body: "public-sans" },
  { id: "modern", name: "Modern", heading: "schibsted-grotesk", body: "schibsted-grotesk" },
  { id: "tech", name: "Tech", heading: "space-grotesk", body: "inter-tight" },
  { id: "bistro", name: "Bistro", heading: "young-serif", body: "work-sans" },
  { id: "boutique", name: "Boutique", heading: "playfair-display", body: "manrope" },
];

/** A pair's font lists, ready for tokens.fonts. */
export function pairFonts(pair: FontPair): { heading: string; body: string } {
  return { heading: bundledStack(findBundledFont(pair.heading)!), body: bundledStack(findBundledFont(pair.body)!) };
}

/** The pair these font lists match, if any. */
export function findFontPair(fonts: { heading?: string; body?: string }): FontPair | undefined {
  const h = bundledFontIn(fonts.heading)?.id;
  const b = bundledFontIn(fonts.body)?.id;
  return fontPairs.find((p) => p.heading === h && p.body === b);
}

/** About how many KB a visitor downloads for these fonts (the main file of each); 0 on system fonts. */
export function fontDownloadKb(fonts: { heading?: string; body?: string } | undefined): number {
  const bytes = siteFonts(fonts).reduce((sum, f) => sum + (fontMainBytes[f.id] ?? 0), 0);
  return bytes ? Math.max(1, Math.round(bytes / 1024 / 10) * 10) : 0;
}

/**
 * @font-face rules for every bundled font (Latin, upright only), so the admin
 * can show each font name and pair card in its own font. A browser downloads
 * a file only when text on screen uses it.
 */
export function allFontsPreviewCss(base = "/fonts/"): string {
  return bundledFonts
    .map((font) => {
      const f = fontFiles(font).find((x) => x.subset === "latin" && x.style === "normal" && (font.variable || x.weight === "400"))!;
      return `@font-face { font-family: '${font.family}'; font-style: normal; font-weight: ${f.weight}; font-display: swap; src: url(${base}${f.file}) format("woff2"); unicode-range: ${fontSubsets.latin}; }`;
    })
    .join("\n");
}

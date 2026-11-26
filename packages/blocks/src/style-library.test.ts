import { describe, expect, it } from "vitest";
import { checkContrast, formatRatio } from "./contrast";
import { bundledFontIn, findFontPair, fontPairs } from "./fonts";
import { sectionStylesOf, sectionStyleWarnings } from "./section-styles";
import { applyLook, findLook, lookFonts, matchingLook, styleLooks } from "./style-library";
import { styleOptionsCss, styleOptionsOf, validateStyleOptions } from "./style-options";
import { defaultTokens, validateTokens } from "./tokens";

const every = styleLooks.flatMap((l) => l.variations.map((v) => [`${l.name} ${v.name}`, l, v] as const));

describe("style-library: the looks", () => {
  it("has 13 looks with 3 variations each, unique names", () => {
    expect(styleLooks).toHaveLength(13);
    for (const l of styleLooks) expect(l.variations, l.id).toHaveLength(3);
    expect(new Set(styleLooks.map((l) => l.id)).size).toBe(13);
    expect(new Set(styleLooks.map((l) => l.name)).size).toBe(13);
    for (const l of styleLooks) expect(new Set(l.variations.map((v) => v.id)).size, l.id).toBe(3);
  });

  it("uses each tested font pair once", () => {
    expect(styleLooks.map((l) => l.pair).sort()).toEqual(fontPairs.map((p) => p.id).sort());
  });

  it("each look has a dark variation", () => {
    const lum = (hex: string) => parseInt(hex.slice(1, 3), 16) + parseInt(hex.slice(3, 5), 16) + parseInt(hex.slice(5, 7), 16);
    for (const l of styleLooks) expect(l.variations.some((v) => lum(v.colors.background) < 150), l.id).toBe(true);
  });

  it.each(every)("%s passes every contrast pair", (_, _look, v) => {
    const failing = checkContrast(v.colors).filter((r) => !r.passes).map((r) => `${r.label} ${formatRatio(r.ratio)}`);
    expect(failing).toEqual([]);
  });

  it.each(every)("%s makes valid tokens with no section style warnings", (_, look, v) => {
    const tokens = applyLook(defaultTokens, look, v);
    expect(validateTokens(tokens)).toEqual([]);
    expect(validateStyleOptions(tokens)).toEqual([]);
    expect(sectionStyleWarnings(tokens)).toEqual([]);
  });
});

describe("style-library: applying", () => {
  const atelier = findLook("atelier")!;
  it("sets colours, the font pair, style options, radius and the main button; keeps spacing and width", () => {
    const custom = { ...defaultTokens, maxWidth: 900, spacing: { ...defaultTokens.spacing, md: 3 } };
    const t = applyLook(custom, atelier, atelier.variations[1]);
    expect(t.colors).toEqual(atelier.variations[1]!.colors);
    expect(findFontPair(t.fonts)?.id).toBe("editorial");
    expect(bundledFontIn(t.fonts.heading)?.family).toBe("Fraunces");
    expect(styleOptionsOf(t)).toEqual(atelier.style);
    expect(t.style).not.toHaveProperty("photoText");
    expect(t.radius).toBe(6);
    expect(sectionStylesOf(t).background.button).toBe("solid");
    expect(t.maxWidth).toBe(900);
    expect(t.spacing.md).toBe(3);
  });

  it("uses the first variation by default", () => {
    expect(applyLook(defaultTokens, atelier).colors).toEqual(atelier.variations[0]!.colors);
  });

  it("recognises the look and variation, and stops matching after an edit", () => {
    const studio = findLook("studio")!;
    const t = applyLook(defaultTokens, studio, studio.variations[2]);
    expect(matchingLook(t)).toEqual({ look: studio, variation: studio.variations[2] });
    expect(matchingLook({ ...t, colors: { ...t.colors, primary: t.colors.primary.toLowerCase() } })?.variation.id).toBe("signal");
    expect(matchingLook({ ...t, radius: 9 })).toBeUndefined();
    expect(matchingLook({ ...t, colors: { ...t.colors, primary: "#123456" } })).toBeUndefined();
    expect(matchingLook(defaultTokens)).toBeUndefined();
  });

  it("gives every look real bundled fonts", () => {
    for (const l of styleLooks) {
      const f = lookFonts(l);
      expect(bundledFontIn(f.heading), l.id).toBeTruthy();
      expect(bundledFontIn(f.body), l.id).toBeTruthy();
    }
  });
});

describe("style-library: Matte (F102)", () => {
  const matte = findLook("matte")!;
  it("is a look with Oat, Lichen and Slate, and turns on the fade under words on photos", () => {
    expect(matte.variations.map((v) => v.id)).toEqual(["oat", "lichen", "slate"]);
    expect(matte.style.photoText).toBe("scrim");
    expect(applyLook(defaultTokens, matte).style?.photoText).toBe("scrim");
  });

  it("other looks keep the plain tint, so their CSS has no fade", () => {
    for (const l of styleLooks.filter((x) => x.id !== "matte")) expect(l.style.photoText, l.id).toBe("tint");
    expect(styleOptionsCss(applyLook(defaultTokens, findLook("atelier")!))).not.toContain("::after");
  });

  it("adds the fade only under the dark style, where the text is light, and never lightens the tint", () => {
    const css = styleOptionsCss(applyLook(defaultTokens, matte));
    expect(css).toContain(".cr-overlay.cr-style-dark::after");
    expect(css).not.toMatch(/cr-style-(background|surface|primary)::after/);
    expect(css).toContain(".cr-overlay.cr-style-dark.cr-overlay-top-left::after");
    expect(css).not.toMatch(/rgb\((?!8 8 8)/);
  });

  it("matches back to the look and validates", () => {
    const t = applyLook(defaultTokens, matte, matte.variations[2]);
    expect(matchingLook(t)?.look.id).toBe("matte");
    expect(validateStyleOptions({ ...t, style: { ...t.style!, photoText: "nope" as never } })).toHaveLength(1);
  });
});

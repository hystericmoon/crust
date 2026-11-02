import { describe, expect, it } from "vitest";
import { checkContrast, formatRatio } from "./contrast";
import { bundledFontIn, findFontPair, fontPairs } from "./fonts";
import { sectionStylesOf, sectionStyleWarnings } from "./section-styles";
import { applyLook, findLook, lookFonts, matchingLook, styleLooks } from "./style-library";
import { validateStyleOptions } from "./style-options";
import { defaultTokens, validateTokens } from "./tokens";

const every = styleLooks.flatMap((l) => l.variations.map((v) => [`${l.name} ${v.name}`, l, v] as const));

describe("style-library: the looks", () => {
  it("has 12 looks with 3 variations each, unique names", () => {
    expect(styleLooks).toHaveLength(12);
    for (const l of styleLooks) expect(l.variations, l.id).toHaveLength(3);
    expect(new Set(styleLooks.map((l) => l.id)).size).toBe(12);
    expect(new Set(styleLooks.map((l) => l.name)).size).toBe(12);
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
    expect(t.style).toEqual(atelier.style);
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

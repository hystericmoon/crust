import { describe, expect, it } from "vitest";
import { checkContrast, contrastRatio, formatRatio, normalizeHex, suggestFix } from "./contrast";
import { findFontStack, fontStacks } from "./fonts";
import { defaultTokens, spacingIncreases, tokensToCss, validateTokens, type SiteTokens } from "./tokens";

const colors = (over: Partial<SiteTokens["colors"]> = {}) => ({ ...defaultTokens.colors, ...over });

describe("contrast maths (tokens)", () => {
  it("matches WCAG reference values", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 5);
    expect(contrastRatio("#777777", "#FFFFFF")).toBeCloseTo(4.48, 2);
    expect(contrastRatio("#71717A", "#F4F4F5")).toBeCloseTo(4.4, 1);
    expect(contrastRatio("#FFF", "#000")).toBe(contrastRatio("#000", "#FFF"));
  });

  it("never rounds a failing ratio up to a pass", () => {
    expect(formatRatio(4.499)).toBe("4.49:1");
    expect(formatRatio(21)).toBe("21.00:1");
  });

  it("normalises hex values", () => {
    expect(normalizeHex(" #abc ")).toBe("#AABBCC");
    expect(normalizeHex("#4338ca")).toBe("#4338CA");
    expect(normalizeHex("4338ca")).toBeNull();
    expect(normalizeHex("#12345")).toBeNull();
  });
});

describe("contrast checks (tokens)", () => {
  it("default tokens pass every pair", () => {
    const results = checkContrast(defaultTokens.colors);
    expect(results).toHaveLength(7);
    expect(results.every((r) => r.passes)).toBe(true);
  });

  it("checks muted text on Surface, not only on the page", () => {
    // The design snapshot's suggested fix: passes on white, fails on Surface.
    const results = checkContrast(colors({ muted: "#71717A" }));
    const byId = Object.fromEntries(results.map((r) => [r.id, r]));
    expect(byId["muted-background"]?.passes).toBe(true);
    expect(byId["muted-surface"]?.passes).toBe(false);
  });

  it("checks labels on primary", () => {
    const results = checkContrast(colors({ primary: "#A5B4FC" }));
    expect(results.find((r) => r.id === "onPrimary-primary")?.passes).toBe(false);
  });
});

describe("suggestFix (tokens)", () => {
  it("suggests a muted colour that passes on every background it sits on", () => {
    const c = colors({ muted: "#A1A1AA" });
    const fix = suggestFix(c, "muted");
    expect(fix).toMatch(/^#[0-9A-F]{6}$/);
    const after = checkContrast({ ...c, muted: fix! }).filter((r) => r.fg === "muted");
    expect(after.every((r) => r.passes)).toBe(true);
    // Stays close: darker grey, not black.
    expect(contrastRatio(fix!, "#F4F4F5")).toBeLessThan(5.5);
  });

  it("keeps the other pairs a role takes part in passing", () => {
    // Too-light primary: fixing it as link text must not break white labels on it.
    const c = colors({ primary: "#8B93F8" });
    const fix = suggestFix(c, "primary")!;
    const after = checkContrast({ ...c, primary: fix }).filter((r) => r.fg === "primary" || r.bg === "primary");
    expect(after.every((r) => r.passes)).toBe(true);
  });

  it("returns the value unchanged when it already passes", () => {
    expect(suggestFix(defaultTokens.colors, "text")).toBe("#18181B");
  });

  it("returns null when no lightness can work", () => {
    // Dark page, white surface: no grey reads well on both.
    const c = colors({ background: "#333333", surface: "#FFFFFF" });
    expect(suggestFix(c, "muted")).toBeNull();
  });
});

describe("validateTokens", () => {
  it("accepts the defaults", () => {
    expect(validateTokens(defaultTokens)).toEqual([]);
  });

  it("explains each problem in plain words", () => {
    const bad: SiteTokens = {
      ...defaultTokens,
      colors: colors({ primary: "blue" }),
      fonts: { heading: "x; } body {", body: "" },
      spacing: { ...defaultTokens.spacing, lg: -1 },
      radius: 100,
      maxWidth: 200,
    };
    const messages = validateTokens(bad).map((p) => `${p.path}: ${p.message}`);
    expect(messages).toEqual([
      "colors.primary: Primary: use a hex colour like #4338CA.",
      "fonts.heading: The heading font list contains characters that aren't allowed.",
      "fonts.body: The body font list contains characters that aren't allowed.",
      "spacing.lg: Spacing LG: use a number from 0 to 20.",
      "radius: Corner radius: use 0 to 64 px.",
      "maxWidth: Page width: use 480 to 2400 px.",
    ]);
  });

  it("notices spacing steps that don't increase", () => {
    expect(spacingIncreases(defaultTokens.spacing)).toBe(true);
    expect(spacingIncreases({ ...defaultTokens.spacing, md: 0.5 })).toBe(false);
  });
});

describe("tokensToCss", () => {
  it("can scope variables to a selector", () => {
    expect(tokensToCss(defaultTokens, ".preview")).toMatch(/^\.preview \{\n  --cr-color-background: #ffffff;/);
  });
});

describe("font stacks (tokens)", () => {
  it("are all safe token values", () => {
    for (const f of fontStacks) {
      expect(validateTokens({ ...defaultTokens, fonts: { heading: f.stack, body: f.stack } }), f.label).toEqual([]);
    }
  });
  it("recognise the default stack and treat others as custom", () => {
    expect(findFontStack(defaultTokens.fonts.body)?.id).toBe("system");
    expect(findFontStack("Comic Sans MS, cursive")).toBeUndefined();
  });
});

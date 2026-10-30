import { describe, expect, it } from "vitest";
import { AA, contrastRatio } from "./contrast";
import { applyPreset, matchingPreset, themePresets } from "./presets";
import { buttonLooks, resolveSectionStyle, sectionStyleIds, sectionStyleWarnings } from "./section-styles";
import { defaultStyleOptions, headingSizes, styleOptionsCss, styleOptionsOf, validateStyleOptions } from "./style-options";
import { defaultTokens, tokensToCss, validateTokens, type SiteTokens } from "./tokens";

const withStyle = (style: SiteTokens["style"]): SiteTokens => ({ ...defaultTokens, style });

describe("customizer: style options", () => {
  it("leaves sites that never set them exactly as they were", () => {
    expect(styleOptionsCss(defaultTokens)).toBe("");
    expect(tokensToCss(defaultTokens)).not.toContain("--cr-h1-size");
    expect(styleOptionsOf(defaultTokens)).toEqual(defaultStyleOptions);
  });

  it("Balanced is the old heading sizes", () => {
    expect(headingSizes("balanced")).toEqual(["clamp(2.25rem, 5vw, 3.5rem)", "clamp(1.75rem, 3.5vw, 2.5rem)", "1.5rem", "1.25rem"]);
  });

  it("each scale grows from Subtle to Dramatic", () => {
    const h1 = (["subtle", "balanced", "bold", "dramatic"] as const).map((s) => Number(headingSizes(s)[0].match(/([\d.]+)rem\)$/)![1]));
    expect([...h1].sort((a, b) => a - b)).toEqual(h1);
  });

  it("writes variables for type, weight, spacing, buttons and links", () => {
    const css = tokensToCss(withStyle({ typeScale: "dramatic", headingWeight: 800, headingTracking: "tight", buttonShape: "pill", linkStyle: "thick" }));
    expect(css).toContain("--cr-h1-size: clamp(3.054rem, 5vw, 4.75rem);");
    expect(css).toContain("--cr-heading-weight: 800;");
    expect(css).toContain("--cr-h1-track: -0.03em;");
    expect(css).toContain("--cr-button-radius: 999px;");
    expect(css).toContain("--cr-link-thickness: 0.14em;");
  });

  it("card styles become rules that beat the default card border", () => {
    expect(styleOptionsCss(withStyle({ cardStyle: "shadow" }))).toContain(".cr-card, .cr-card.cr-bg-background { border: 0; box-shadow:");
    expect(styleOptionsCss(withStyle({ cardStyle: "outline" }), ".preview")).toContain(".preview .cr-card, .preview .cr-card.cr-bg-background { border: 1.5px solid");
    expect(styleOptionsCss(withStyle({ cardStyle: "flat" }))).not.toContain(".cr-card");
  });

  it("scopes variables for the preview", () => {
    expect(styleOptionsCss(withStyle({}), ".pv").startsWith(".pv {")).toBe(true);
  });

  it("refuses values outside the lists", () => {
    expect(validateStyleOptions(withStyle({ typeScale: "huge" as never }))).toEqual([
      { path: "style.typeScale", message: "Type scale: pick one of Subtle, Balanced, Bold, Dramatic." },
    ]);
    expect(validateStyleOptions(withStyle({ colour: "red" } as never))[0]!.message).toBe('Unknown style option "colour".');
    expect(validateTokens(withStyle({ headingWeight: 900 as never }))).toHaveLength(1);
    expect(validateTokens(withStyle(defaultStyleOptions))).toEqual([]);
  });
});

describe("customizer: buttons", () => {
  it.each(themePresets.map((p) => [p.name, p] as const))("%s: every button look reads in every section style", (_, preset) => {
    const tokens = applyPreset(defaultTokens, preset);
    for (const look of buttonLooks) {
      const t: SiteTokens = {
        ...tokens,
        sectionStyles: Object.fromEntries(sectionStyleIds.map((id) => [id, { ...tokens.sectionStyles![id], button: look }])) as SiteTokens["sectionStyles"],
      };
      for (const id of sectionStyleIds) {
        const b = resolveSectionStyle(t, id).button;
        const label = contrastRatio(b.fg, b.bg === "transparent" ? resolveSectionStyle(t, id).bg : b.bg);
        expect(label, `${look} on ${id}`).toBeGreaterThanOrEqual(AA);
      }
    }
  });

  it("soft is a light tint of the brand colour", () => {
    const t: SiteTokens = { ...defaultTokens, sectionStyles: { ...applyPreset(defaultTokens, themePresets[0]!).sectionStyles!, background: { bg: "background", button: "soft" } } };
    const b = resolveSectionStyle(t, "background").button;
    expect(b.look).toBe("soft");
    expect(b.bg).not.toBe(defaultTokens.colors.primary);
    expect(b.fg).toBe(defaultTokens.colors.primary);
  });
});

describe("customizer: presets", () => {
  it("has 9 complete looks", () => {
    expect(themePresets.map((p) => p.name)).toEqual(["Crust", "Ink", "Forest", "Sunset", "Mono", "Ocean", "Studio", "Paper", "Night"]);
  });

  it.each(themePresets.map((p) => [p.name, p] as const))("%s keeps every section style readable", (_, preset) => {
    expect(sectionStyleWarnings(applyPreset(defaultTokens, preset))).toEqual([]);
  });

  it("sets the style options and the main button, keeps spacing and corners", () => {
    const custom: SiteTokens = { ...defaultTokens, radius: 3, maxWidth: 900 };
    const studio = applyPreset(custom, themePresets.find((p) => p.id === "studio")!);
    expect(studio.style).toMatchObject({ buttonShape: "pill", headingWeight: 800 });
    expect(studio.sectionStyles!.background.button).toBe("solid");
    expect(studio.radius).toBe(3);
    const ocean = applyPreset(custom, themePresets.find((p) => p.id === "ocean")!);
    expect([ocean.sectionStyles!.background.button, ocean.sectionStyles!.surface.button]).toEqual(["soft", "soft"]);
    expect(ocean.sectionStyles!.primary.button).toBe("inverse");
  });

  it("a preset stops matching once any part of its look changes", () => {
    const sunset = applyPreset(defaultTokens, themePresets.find((p) => p.id === "sunset")!);
    expect(matchingPreset(sunset)?.id).toBe("sunset");
    expect(matchingPreset({ ...sunset, style: { ...sunset.style, cardStyle: "flat" } })).toBeUndefined();
    expect(matchingPreset({ ...sunset, sectionStyles: { ...sunset.sectionStyles!, surface: { bg: "surface", button: "outline" } } })).toBeUndefined();
  });

  it("a site saved before F028 still counts as Crust", () => {
    expect(matchingPreset(defaultTokens)?.id).toBe("crust");
  });
});

import { describe, expect, it } from "vitest";
import { checkContrast, formatRatio } from "./contrast";
import { applyPreset, matchingPreset, themePresets } from "./presets";
import { defaultTokens, validateTokens } from "./tokens";

describe("theme presets", () => {
  it.each(themePresets.map((p) => [p.name, p] as const))("%s passes every contrast pair", (_, preset) => {
    const failing = checkContrast(preset.colors)
      .filter((r) => !r.passes)
      .map((r) => `${r.label} ${formatRatio(r.ratio)}`);
    expect(failing).toEqual([]);
  });

  it.each(themePresets.map((p) => [p.name, p] as const))("%s is a valid set of tokens", (_, preset) => {
    expect(validateTokens(applyPreset(defaultTokens, preset))).toEqual([]);
  });

  it("changes colours and fonts only", () => {
    const custom = { ...defaultTokens, radius: 2, maxWidth: 900 };
    const applied = applyPreset(custom, themePresets.find((p) => p.id === "forest")!);
    expect(applied.radius).toBe(2);
    expect(applied.maxWidth).toBe(900);
    expect(applied.colors.primary).toBe("#1F6B45");
  });

  it("recognises which preset the tokens match", () => {
    expect(matchingPreset(defaultTokens)?.id).toBe("crust");
    const ink = applyPreset(defaultTokens, themePresets.find((p) => p.id === "ink")!);
    expect(matchingPreset({ ...ink, colors: { ...ink.colors, primary: ink.colors.primary.toLowerCase() } })?.id).toBe("ink");
    expect(matchingPreset({ ...ink, colors: { ...ink.colors, primary: "#123456" } })).toBeUndefined();
  });

  it("has unique ids and names", () => {
    expect(new Set(themePresets.map((p) => p.id)).size).toBe(themePresets.length);
    expect(new Set(themePresets.map((p) => p.name)).size).toBe(themePresets.length);
  });
});

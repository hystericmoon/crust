/**
 * Ready-made starting points for Site settings (F013). Each changes colours
 * and fonts only; spacing, radius and width stay as they are. Every preset
 * passes all contrast pairs (checked in presets.test.ts).
 */
import { fontStacks } from "./fonts";
import { defaultTokens, type SiteTokens } from "./tokens";

export interface ThemePreset {
  id: string;
  name: string;
  description: string;
  colors: SiteTokens["colors"];
  fonts: SiteTokens["fonts"];
}

const font = (id: string) => fontStacks.find((f) => f.id === id)!.stack;

export const themePresets: ThemePreset[] = [
  {
    id: "crust",
    name: "Crust",
    description: "Neutral greys with an indigo accent",
    colors: { ...defaultTokens.colors },
    fonts: { ...defaultTokens.fonts },
  },
  {
    id: "ink",
    name: "Ink",
    description: "Warm paper, black ink, classic serif headings",
    colors: { background: "#FAF9F6", surface: "#EFEDE8", text: "#1A1A1A", muted: "#55524C", primary: "#1A1A1A", onPrimary: "#FAF9F6" },
    fonts: { heading: font("oldstyle"), body: font("system") },
  },
  {
    id: "forest",
    name: "Forest",
    description: "Deep green on soft white, friendly sans",
    colors: { background: "#FFFFFF", surface: "#EEF4EF", text: "#14231A", muted: "#4A5A50", primary: "#1F6B45", onPrimary: "#FFFFFF" },
    fonts: { heading: font("humanist"), body: font("humanist") },
  },
  {
    id: "sunset",
    name: "Sunset",
    description: "Terracotta on cream, serif headings",
    colors: { background: "#FFFBF7", surface: "#FBEFE6", text: "#2A1A14", muted: "#6B5148", primary: "#A63E1B", onPrimary: "#FFFFFF" },
    fonts: { heading: font("transitional"), body: font("humanist") },
  },
  {
    id: "mono",
    name: "Mono",
    description: "Black and white, monospace headings",
    colors: { background: "#FFFFFF", surface: "#F2F2F2", text: "#111111", muted: "#595959", primary: "#111111", onPrimary: "#FFFFFF" },
    fonts: { heading: font("mono"), body: font("system") },
  },
];

const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

/** The preset the tokens currently match (colours and fonts), if any. */
export function matchingPreset(tokens: SiteTokens): ThemePreset | undefined {
  return themePresets.find(
    (p) =>
      (Object.keys(p.colors) as (keyof SiteTokens["colors"])[]).every((k) => same(p.colors[k], tokens.colors[k])) &&
      p.fonts.heading === tokens.fonts.heading &&
      p.fonts.body === tokens.fonts.body,
  );
}

export function applyPreset(tokens: SiteTokens, preset: ThemePreset): SiteTokens {
  return { ...tokens, colors: { ...preset.colors }, fonts: { ...preset.fonts } };
}

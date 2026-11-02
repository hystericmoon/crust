/**
 * Ready-made starting points for Site settings (F013, extended in F028).
 * Each sets colours, fonts and the style options (type, buttons, cards,
 * links); spacing, corner radius and page width stay as they are. Every
 * preset passes all contrast pairs (checked in presets.test.ts).
 */
import { fontStacks } from "./fonts";
import { sectionStylesOf, type ButtonLook } from "./section-styles";
import { defaultStyleOptions, styleOptionsOf, type StyleOptions } from "./style-options";
import { defaultTokens, type SiteTokens } from "./tokens";

export interface ThemePreset {
  id: string;
  name: string;
  description: string;
  colors: SiteTokens["colors"];
  fonts: SiteTokens["fonts"];
  /** Type, button shape, cards and links (F028). */
  style: StyleOptions;
  /** How the main button looks on Page and Muted sections (F028). */
  buttonLook: ButtonLook;
}

const font = (id: string) => fontStacks.find((f) => f.id === id)!.stack;
const style = (o: Partial<StyleOptions>): StyleOptions => ({ ...defaultStyleOptions, ...o });

export const themePresets: ThemePreset[] = [
  {
    id: "crust",
    name: "Crust",
    description: "Neutral greys with an indigo accent",
    colors: { ...defaultTokens.colors },
    fonts: { ...defaultTokens.fonts },
    style: style({}),
    buttonLook: "solid",
  },
  {
    id: "ink",
    name: "Ink",
    description: "Warm paper, black ink, classic serif headings",
    colors: { background: "#FAF9F6", surface: "#EFEDE8", text: "#1A1A1A", muted: "#55524C", primary: "#1A1A1A", onPrimary: "#FAF9F6" },
    fonts: { heading: font("oldstyle"), body: font("system") },
    style: style({ typeScale: "dramatic", headingWeight: 500, buttonShape: "square", cardStyle: "outline", linkStyle: "thick" }),
    buttonLook: "outline",
  },
  {
    id: "forest",
    name: "Forest",
    description: "Deep green on soft white, friendly sans",
    colors: { background: "#FFFFFF", surface: "#EEF4EF", text: "#14231A", muted: "#4A5A50", primary: "#1F6B45", onPrimary: "#FFFFFF" },
    fonts: { heading: font("humanist"), body: font("humanist") },
    style: style({ headingTracking: "normal", buttonShape: "pill" }),
    buttonLook: "solid",
  },
  {
    id: "sunset",
    name: "Sunset",
    description: "Terracotta on cream, serif headings",
    colors: { background: "#FFFBF7", surface: "#FBEFE6", text: "#2A1A14", muted: "#6B5148", primary: "#A63E1B", onPrimary: "#FFFFFF" },
    fonts: { heading: font("transitional"), body: font("humanist") },
    style: style({ typeScale: "bold", headingWeight: 600, cardStyle: "shadow", linkStyle: "highlight" }),
    buttonLook: "solid",
  },
  {
    id: "mono",
    name: "Mono",
    description: "Black and white, monospace headings",
    colors: { background: "#FFFFFF", surface: "#F2F2F2", text: "#111111", muted: "#595959", primary: "#111111", onPrimary: "#FFFFFF" },
    fonts: { heading: font("mono"), body: font("system") },
    style: style({ headingTracking: "tight", buttonShape: "square", cardStyle: "outline", linkStyle: "thick" }),
    buttonLook: "solid",
  },
  {
    id: "ocean",
    name: "Ocean",
    description: "Calm blue, soft buttons, lifted cards",
    colors: { background: "#F7FAFC", surface: "#E6EFF5", text: "#0F2433", muted: "#4A5E6B", primary: "#0B5C8C", onPrimary: "#FFFFFF" },
    fonts: { heading: font("humanist"), body: font("system") },
    style: style({ headingWeight: 600, headingTracking: "normal", cardStyle: "shadow" }),
    buttonLook: "soft",
  },
  {
    id: "studio",
    name: "Studio",
    description: "Bold geometric headings, violet, pill buttons",
    colors: { background: "#FFFFFF", surface: "#F5F0FF", text: "#1C1530", muted: "#5B5470", primary: "#6D28D9", onPrimary: "#FFFFFF" },
    fonts: { heading: font("geometric"), body: font("system") },
    style: style({ typeScale: "dramatic", headingWeight: 800, headingTracking: "tight", buttonShape: "pill", cardStyle: "shadow", linkStyle: "highlight" }),
    buttonLook: "solid",
  },
  {
    id: "paper",
    name: "Paper",
    description: "Quiet and bookish, serif throughout",
    colors: { background: "#FFFEF9", surface: "#F3F0E6", text: "#23211C", muted: "#5E5A50", primary: "#7A4B12", onPrimary: "#FFFFFF" },
    fonts: { heading: font("oldstyle"), body: font("oldstyle") },
    style: style({ typeScale: "subtle", headingWeight: 600, headingTracking: "normal" }),
    buttonLook: "outline",
  },
  {
    id: "night",
    name: "Night",
    description: "A dark site with a light blue accent",
    colors: { background: "#111318", surface: "#1C1F26", text: "#F1F2F4", muted: "#A9AEB8", primary: "#8AB4FF", onPrimary: "#0B1020" },
    fonts: { heading: font("geometric"), body: font("system") },
    style: style({ typeScale: "bold", cardStyle: "outline", linkStyle: "thick" }),
    buttonLook: "solid",
  },
];

const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
const sameStyle = (a: StyleOptions, b: StyleOptions) => (Object.keys(a) as (keyof StyleOptions)[]).every((k) => a[k] === b[k]);

/** The preset the tokens currently match (colours, fonts, style options and main button), if any. */
export function matchingPreset(tokens: SiteTokens): ThemePreset | undefined {
  const looks = sectionStylesOf(tokens);
  return themePresets.find(
    (p) =>
      (Object.keys(p.colors) as (keyof SiteTokens["colors"])[]).every((k) => same(p.colors[k], tokens.colors[k])) &&
      p.fonts.heading === tokens.fonts.heading &&
      p.fonts.body === tokens.fonts.body &&
      sameStyle(p.style, styleOptionsOf(tokens)) &&
      looks.background.button === p.buttonLook &&
      looks.surface.button === p.buttonLook,
  );
}

export function applyPreset(tokens: SiteTokens, preset: ThemePreset): SiteTokens {
  const looks = sectionStylesOf(tokens);
  return {
    ...tokens,
    colors: { ...preset.colors },
    fonts: { ...preset.fonts },
    // F075: motion is its own setting; a preset keeps it.
    style: { ...preset.style, ...(tokens.style?.motion ? { motion: tokens.style.motion } : {}) },
    sectionStyles: {
      ...looks,
      background: { ...looks.background, button: preset.buttonLook },
      surface: { ...looks.surface, button: preset.buttonLook },
    },
  };
}

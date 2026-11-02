/**
 * The Style library (F072): complete looks to start a site from. Each look
 * sets fonts (a bundled pair, F070), the type and detail options (F071),
 * button shape and main button look, cards, links and the corner radius, in
 * one of three colour variations. Spacing and
 * page width stay as they are. Every variation passes every contrast pair
 * (style-library.test.ts). Replaces the colour presets (F013) as the first
 * thing Site settings shows; those stay readable for sites that use them.
 */
import { bundledStack, findBundledFont, findFontPair, fontPairs, pairFonts } from "./fonts";
import { sectionStylesOf, type ButtonLook } from "./section-styles";
import { defaultStyleOptions, styleOptionsOf, type StyleOptions } from "./style-options";
import type { SiteTokens } from "./tokens";

export interface LookVariation {
  id: string;
  name: string;
  colors: SiteTokens["colors"];
}

export interface StyleLook {
  id: string;
  name: string;
  /** Who it suits, in a few words. */
  suits: string;
  /** A font pair id (fontPairs). */
  pair: string;
  style: StyleOptions;
  buttonLook: ButtonLook;
  /** Corner radius in px. */
  radius: number;
  variations: LookVariation[];
}

const style = (o: Partial<StyleOptions>): StyleOptions => ({ ...defaultStyleOptions, ...o });
const c = (background: string, surface: string, text: string, muted: string, primary: string, onPrimary: string): SiteTokens["colors"] => ({
  background, surface, text, muted, primary, onPrimary,
});

export const styleLooks: StyleLook[] = [
  {
    id: "atelier", name: "Atelier", suits: "Architects, interiors, studios", pair: "editorial",
    style: style({ typeScale: "dramatic", headingWeight: 400, headingTracking: "tighter", displayWeight: 300, displayTracking: "tightest", labelStyle: "chip", buttonShape: "pill", cardStyle: "flat", linkStyle: "underline" }),
    buttonLook: "solid", radius: 6,
    variations: [
      { id: "stone", name: "Stone", colors: c("#F4F0E9", "#EAE3D8", "#1D1A16", "#5E564C", "#2F4A3A", "#FFFFFF") },
      { id: "clay", name: "Clay", colors: c("#F6EEE6", "#EDDCCD", "#2A1D15", "#6A5245", "#8A3B1E", "#FFFFFF") },
      { id: "night", name: "Night", colors: c("#171512", "#24211C", "#F2EDE4", "#B8AE9F", "#D9C7A7", "#1A1612") },
    ],
  },
  {
    id: "studio", name: "Studio", suits: "Agencies, product teams", pair: "studio",
    style: style({ typeScale: "dramatic", headingWeight: 500, headingTracking: "tighter", displayWeight: 400, displayTracking: "tightest", labelStyle: "mono", buttonShape: "square", cardStyle: "outline", linkStyle: "underline" }),
    buttonLook: "solid", radius: 4,
    variations: [
      { id: "carbon", name: "Carbon", colors: c("#0E0F11", "#191B1F", "#F2F2EF", "#A3A7AD", "#F2F2EF", "#0E0F11") },
      { id: "paper", name: "Paper", colors: c("#FFFFFF", "#F3F3F1", "#111214", "#585C62", "#111214", "#FFFFFF") },
      { id: "signal", name: "Signal", colors: c("#0E0F11", "#191B1F", "#F2F2EF", "#A3A7AD", "#FF6B4A", "#0E0F11") },
    ],
  },
  {
    id: "gallery", name: "Gallery", suits: "Photographers, artists", pair: "gallery",
    style: style({ typeScale: "dramatic", headingWeight: 400, headingTracking: "tight", displayWeight: 400, displayTracking: "tight", labelStyle: "plain", buttonShape: "square", cardStyle: "flat", linkStyle: "underline" }),
    buttonLook: "outline", radius: 0,
    variations: [
      { id: "white", name: "White", colors: c("#FFFFFF", "#F4F4F2", "#141414", "#5C5C5A", "#141414", "#FFFFFF") },
      { id: "linen", name: "Linen", colors: c("#F3EFE7", "#E8E1D4", "#1E1B17", "#5F584E", "#1E1B17", "#F3EFE7") },
      { id: "black", name: "Black", colors: c("#0B0B0B", "#171717", "#EDEDEA", "#A2A29E", "#EDEDEA", "#0B0B0B") },
    ],
  },
  {
    id: "maison", name: "Maison", suits: "Fashion, hotels, luxury", pair: "luxury",
    style: style({ typeScale: "dramatic", headingWeight: 400, headingTracking: "tight", displayWeight: 400, displayTracking: "tighter", labelStyle: "caps", buttonShape: "square", cardStyle: "flat", linkStyle: "underline" }),
    buttonLook: "solid", radius: 0,
    variations: [
      { id: "ivory", name: "Ivory", colors: c("#FAF7F2", "#F0EBE2", "#1A1714", "#5E5850", "#1A1714", "#FAF7F2") },
      { id: "bordeaux", name: "Bordeaux", colors: c("#F7F1EE", "#EDE0DA", "#2A1416", "#6B4F51", "#6E1F2B", "#FFFFFF") },
      { id: "onyx", name: "Onyx", colors: c("#121110", "#1D1B19", "#F3EEE7", "#B5ADA2", "#CBB27C", "#121110") },
    ],
  },
  {
    id: "playground", name: "Playground", suits: "Startups, kids, community", pair: "friendly",
    style: style({ typeScale: "bold", headingWeight: 700, headingTracking: "tight", displayWeight: 800, displayTracking: "tight", labelStyle: "chip", buttonShape: "pill", cardStyle: "shadow", linkStyle: "thick" }),
    buttonLook: "solid", radius: 18,
    variations: [
      { id: "sunny", name: "Sunny", colors: c("#FFF8EC", "#FFEFD2", "#1F1A2E", "#5C5470", "#5B3DF5", "#FFFFFF") },
      { id: "mint", name: "Mint", colors: c("#F1FBF6", "#DDF3E8", "#10261C", "#45604F", "#0B7A4B", "#FFFFFF") },
      { id: "grape", name: "Grape", colors: c("#17122B", "#231C3D", "#F5F2FF", "#B8B0D6", "#FFC94A", "#17122B") },
    ],
  },
  {
    id: "clinic", name: "Clinic", suits: "Health, labs, care", pair: "clinic",
    style: style({ typeScale: "bold", headingWeight: 700, headingTracking: "tight", displayWeight: 700, displayTracking: "tight", labelStyle: "caps", buttonShape: "rounded", cardStyle: "shadow", linkStyle: "underline" }),
    buttonLook: "solid", radius: 12,
    variations: [
      { id: "clear", name: "Clear", colors: c("#FFFFFF", "#EEF4FB", "#0F1E33", "#4D5B70", "#1559D6", "#FFFFFF") },
      { id: "sage", name: "Sage", colors: c("#FAFCFA", "#E9F2EC", "#13241B", "#4B5D52", "#1E6B4A", "#FFFFFF") },
      { id: "navy", name: "Navy", colors: c("#0D1A2D", "#16263D", "#EEF3FA", "#A9B6C8", "#7DB2FF", "#0D1A2D") },
    ],
  },
  {
    id: "heritage", name: "Heritage", suits: "Weddings, wineries, history", pair: "classic",
    style: style({ typeScale: "dramatic", headingWeight: 500, headingTracking: "snug", displayWeight: 500, displayTracking: "snug", labelStyle: "plain", buttonShape: "rounded", cardStyle: "outline", linkStyle: "underline" }),
    buttonLook: "outline", radius: 6,
    variations: [
      { id: "parchment", name: "Parchment", colors: c("#FBF7EF", "#F1EADB", "#2B2117", "#66584A", "#6B4E2E", "#FFFFFF") },
      { id: "olive", name: "Olive", colors: c("#F6F5EE", "#E8E7D8", "#22241A", "#5E604F", "#4F5A2A", "#FFFFFF") },
      { id: "cellar", name: "Cellar", colors: c("#1A1512", "#26201B", "#F1E9DD", "#B8AA97", "#D8B98A", "#1A1512") },
    ],
  },
  {
    id: "journal", name: "Journal", suits: "Writers, magazines, newsletters", pair: "newsroom",
    style: style({ typeScale: "bold", headingWeight: 500, headingTracking: "tight", displayWeight: 400, displayTracking: "tighter", labelStyle: "caps", buttonShape: "square", cardStyle: "flat", linkStyle: "highlight" }),
    buttonLook: "solid", radius: 2,
    variations: [
      { id: "newsprint", name: "Newsprint", colors: c("#FBFAF7", "#F0EEE8", "#161616", "#555450", "#B3261E", "#FFFFFF") },
      { id: "ink", name: "Ink", colors: c("#FFFFFF", "#F2F4F7", "#0E1726", "#4E5868", "#1D3F8F", "#FFFFFF") },
      { id: "midnight", name: "Midnight", colors: c("#111317", "#1B1E24", "#ECEDEF", "#A6AAB2", "#F2A490", "#111317") },
    ],
  },
  {
    id: "nordic", name: "Nordic", suits: "Consultants, architects, NGOs", pair: "modern",
    style: style({ typeScale: "bold", headingWeight: 600, headingTracking: "tighter", displayWeight: 500, displayTracking: "tighter", labelStyle: "mono", buttonShape: "rounded", cardStyle: "outline", linkStyle: "underline" }),
    buttonLook: "solid", radius: 8,
    variations: [
      { id: "fjord", name: "Fjord", colors: c("#F7F9FA", "#E8EEF1", "#132029", "#4D5C66", "#1F5F7A", "#FFFFFF") },
      { id: "birch", name: "Birch", colors: c("#FAFAF7", "#EFEEE7", "#1C1D1A", "#575851", "#2E2F2A", "#FFFFFF") },
      { id: "polar", name: "Polar", colors: c("#0F161B", "#18222A", "#EAF0F3", "#A2B0B9", "#8CCBE6", "#0F161B") },
    ],
  },
  {
    id: "launch", name: "Launch", suits: "Software, apps, tech", pair: "tech",
    style: style({ typeScale: "dramatic", headingWeight: 600, headingTracking: "tighter", displayWeight: 500, displayTracking: "tightest", labelStyle: "mono", buttonShape: "pill", cardStyle: "outline", linkStyle: "underline" }),
    buttonLook: "solid", radius: 14,
    variations: [
      { id: "orbit", name: "Orbit", colors: c("#0B0D12", "#151924", "#EEF1F7", "#A3ABBD", "#9B8CFF", "#0B0D12") },
      { id: "daylight", name: "Daylight", colors: c("#FFFFFF", "#F2F4FA", "#0E1220", "#4E566B", "#4B3BDB", "#FFFFFF") },
      { id: "lime", name: "Lime", colors: c("#0B0D0C", "#161A17", "#EEF2EE", "#A4ADA5", "#C6F36B", "#0B0D0C") },
    ],
  },
  {
    id: "bistro", name: "Bistro", suits: "Restaurants, cafés, bakeries", pair: "bistro",
    style: style({ typeScale: "bold", headingWeight: 400, headingTracking: "snug", displayWeight: 400, displayTracking: "tight", labelStyle: "caps", buttonShape: "pill", cardStyle: "flat", linkStyle: "underline" }),
    buttonLook: "solid", radius: 10,
    variations: [
      { id: "cream", name: "Cream", colors: c("#FBF4E4", "#F3E7CC", "#1F2340", "#575A70", "#1F2340", "#FBF4E4") },
      { id: "tomato", name: "Tomato", colors: c("#FFF6EF", "#FBE5D6", "#2B1A14", "#6B5248", "#B8341B", "#FFFFFF") },
      { id: "espresso", name: "Espresso", colors: c("#1B1411", "#271D18", "#F6EDE2", "#BCAA98", "#E9B872", "#1B1411") },
    ],
  },
  {
    id: "boutique", name: "Boutique", suits: "Shops, beauty, florists", pair: "boutique",
    style: style({ typeScale: "dramatic", headingWeight: 400, headingTracking: "tight", displayWeight: 400, displayTracking: "tight", labelStyle: "chip", buttonShape: "pill", cardStyle: "shadow", linkStyle: "underline" }),
    buttonLook: "solid", radius: 14,
    variations: [
      { id: "blush", name: "Blush", colors: c("#FCF5F3", "#F6E6E1", "#2A1B1C", "#6A5556", "#8C3B4A", "#FFFFFF") },
      { id: "sand", name: "Sand", colors: c("#FAF6EF", "#F0E8DA", "#24201A", "#625B4F", "#5A4632", "#FFFFFF") },
      { id: "velvet", name: "Velvet", colors: c("#1A1216", "#261B21", "#F6ECEF", "#BCA9B0", "#E8A7B7", "#1A1216") },
    ],
  },
];

export const findLook = (id: string): StyleLook | undefined => styleLooks.find((l) => l.id === id);

const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
const sameStyle = (a: StyleOptions, b: StyleOptions) => (Object.keys(a) as (keyof StyleOptions)[]).every((k) => a[k] === b[k]);

/** A look's fonts as font lists. */
export const lookFonts = (look: StyleLook): SiteTokens["fonts"] => pairFonts(fontPairs.find((p) => p.id === look.pair)!);

/** The tokens with a look and one of its variations applied. Spacing and page width stay. */
export function applyLook(tokens: SiteTokens, look: StyleLook, variation: LookVariation = look.variations[0]!): SiteTokens {
  const looks = sectionStylesOf(tokens);
  return {
    ...tokens,
    colors: { ...variation.colors },
    fonts: lookFonts(look),
    radius: look.radius,
    // F075: motion is its own setting; a look keeps it.
    style: { ...look.style, ...(tokens.style?.motion ? { motion: tokens.style.motion } : {}) },
    sectionStyles: {
      ...looks,
      background: { ...looks.background, button: look.buttonLook },
      surface: { ...looks.surface, button: look.buttonLook },
    },
  };
}

/** The look and variation the tokens match, if any. */
export function matchingLook(tokens: SiteTokens): { look: StyleLook; variation: LookVariation } | undefined {
  const pair = findFontPair(tokens.fonts);
  const looks = sectionStylesOf(tokens);
  for (const look of styleLooks) {
    if (pair?.id !== look.pair || tokens.radius !== look.radius || !sameStyle(look.style, styleOptionsOf(tokens))) continue;
    if (looks.background.button !== look.buttonLook || looks.surface.button !== look.buttonLook) continue;
    const variation = look.variations.find((v) => (Object.keys(v.colors) as (keyof SiteTokens["colors"])[]).every((k) => same(v.colors[k], tokens.colors[k])));
    if (variation) return { look, variation };
  }
  return undefined;
}

/** The look's display font, for its card in Site settings. */
export const lookHeadingFont = (look: StyleLook): string => bundledStack(findBundledFont(fontPairs.find((p) => p.id === look.pair)!.heading)!);

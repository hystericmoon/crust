/**
 * Site-wide style options (F028): type scale, heading weight and spacing,
 * button shape, card style and link style. Stored as `tokens.style`; every
 * option is optional and falls back to the look sites had before F028, so
 * nothing changes until the owner picks something.
 *
 * Like section styles, these are plain choices from short lists, never CSS
 * typed by the owner.
 */
import type { SiteTokens } from "./tokens";

export const typeScales = ["subtle", "balanced", "bold", "dramatic"] as const;
export type TypeScale = (typeof typeScales)[number];
export const headingWeights = [500, 600, 700, 800] as const;
export type HeadingWeight = (typeof headingWeights)[number];
export const headingTrackings = ["tight", "snug", "normal", "wide"] as const;
export type HeadingTracking = (typeof headingTrackings)[number];
export const buttonShapes = ["square", "rounded", "pill"] as const;
export type ButtonShape = (typeof buttonShapes)[number];
export const cardStyles = ["flat", "outline", "shadow"] as const;
export type CardStyle = (typeof cardStyles)[number];
export const linkStyles = ["underline", "thick", "highlight"] as const;
export type LinkStyle = (typeof linkStyles)[number];

export interface StyleOptions {
  typeScale: TypeScale;
  headingWeight: HeadingWeight;
  headingTracking: HeadingTracking;
  buttonShape: ButtonShape;
  cardStyle: CardStyle;
  linkStyle: LinkStyle;
}

/** The look before F028: "Balanced" is exactly the old heading sizes. */
export const defaultStyleOptions: StyleOptions = {
  typeScale: "balanced",
  headingWeight: 700,
  headingTracking: "snug",
  buttonShape: "rounded",
  cardStyle: "flat",
  linkStyle: "underline",
};

export const styleOptionNames = {
  typeScale: { subtle: "Subtle", balanced: "Balanced", bold: "Bold", dramatic: "Dramatic" },
  headingWeight: { 500: "Medium", 600: "Semibold", 700: "Bold", 800: "Heavy" },
  headingTracking: { tight: "Tight", snug: "Snug", normal: "Normal", wide: "Wide" },
  buttonShape: { square: "Square", rounded: "Rounded", pill: "Pill" },
  cardStyle: { flat: "Flat", outline: "Outline", shadow: "Shadow" },
  linkStyle: { underline: "Underline", thick: "Thick", highlight: "Highlight" },
} as const;

/** Largest size of h1–h4 in rem; h1 and h2 shrink on small screens. */
const sizes: Record<TypeScale, [number, number, number, number]> = {
  subtle: [2.5, 2, 1.375, 1.1875],
  balanced: [3.5, 2.5, 1.5, 1.25],
  bold: [4, 2.75, 1.625, 1.3125],
  dramatic: [4.75, 3.125, 1.75, 1.375],
};

/** Letter spacing in em: [h1, h2, h3 and h4]. "Snug" is the old look. */
const tracking: Record<HeadingTracking, [number, number, number]> = {
  tight: [-0.03, -0.025, -0.01],
  snug: [-0.02, -0.015, 0],
  normal: [0, 0, 0],
  wide: [0.01, 0.01, 0.01],
};

const round = (n: number) => Math.round(n * 1000) / 1000;

/** h1–h4 font sizes as CSS values (h1/h2 fluid, like before). */
export function headingSizes(scale: TypeScale): [string, string, string, string] {
  const [h1, h2, h3, h4] = sizes[scale];
  return [`clamp(${round((h1 * 9) / 14)}rem, 5vw, ${h1}rem)`, `clamp(${round(h2 * 0.7)}rem, 3.5vw, ${h2}rem)`, `${h3}rem`, `${h4}rem`];
}

/** A site's options, with defaults for anything not set. */
export function styleOptionsOf(tokens: SiteTokens): StyleOptions {
  return { ...defaultStyleOptions, ...(tokens.style ?? {}) };
}

/**
 * CSS variables for the options, plus card rules. Empty for sites that
 * never set any, so their published CSS stays byte-for-byte the same.
 */
export function styleOptionsCss(tokens: SiteTokens, scope = ""): string {
  if (!tokens.style) return "";
  const o = styleOptionsOf(tokens);
  const [h1, h2, h3, h4] = headingSizes(o.typeScale);
  const [t1, t2, t34] = tracking[o.headingTracking];
  const radius = { square: "2px", rounded: "var(--cr-radius)", pill: "999px" }[o.buttonShape];
  const vars = [
    `--cr-h1-size: ${h1};`,
    `--cr-h2-size: ${h2};`,
    `--cr-h3-size: ${h3};`,
    `--cr-h4-size: ${h4};`,
    `--cr-h1-track: ${t1}em;`,
    `--cr-h2-track: ${t2}em;`,
    `--cr-h34-track: ${t34}em;`,
    `--cr-heading-weight: ${o.headingWeight};`,
    `--cr-button-radius: ${radius};`,
    `--cr-link-thickness: ${o.linkStyle === "thick" ? "0.14em" : "auto"};`,
    `--cr-link-bg: ${o.linkStyle === "highlight" ? "color-mix(in srgb, currentColor 12%, transparent)" : "none"};`,
  ];
  const pre = scope ? `${scope} ` : "";
  const root = scope || ":root";
  const cards =
    o.cardStyle === "outline"
      ? `${pre}.cr-card, ${pre}.cr-card.cr-bg-background { border: 1.5px solid color-mix(in srgb, var(--cr-color-muted) 45%, transparent); }`
      : o.cardStyle === "shadow"
        ? `${pre}.cr-card, ${pre}.cr-card.cr-bg-background { border: 0; box-shadow: 0 1px 2px rgb(0 0 0 / 0.08), 0 8px 24px rgb(0 0 0 / 0.1); }`
        : "";
  return [`${root} {\n  ${vars.join("\n  ")}\n}`, cards].filter(Boolean).join("\n");
}

export interface StyleOptionProblem {
  path: string;
  message: string;
}

const lists: { [K in keyof StyleOptions]: readonly StyleOptions[K][] } = {
  typeScale: typeScales,
  headingWeight: headingWeights,
  headingTracking: headingTrackings,
  buttonShape: buttonShapes,
  cardStyle: cardStyles,
  linkStyle: linkStyles,
};

const labels: Record<keyof StyleOptions, string> = {
  typeScale: "Type scale",
  headingWeight: "Heading weight",
  headingTracking: "Heading letter spacing",
  buttonShape: "Button shape",
  cardStyle: "Card style",
  linkStyle: "Link style",
};

export function validateStyleOptions(tokens: SiteTokens): StyleOptionProblem[] {
  const style = tokens.style as Record<string, unknown> | undefined;
  if (style === undefined) return [];
  if (typeof style !== "object" || style === null || Array.isArray(style)) return [{ path: "style", message: "The style options are damaged." }];
  const problems: StyleOptionProblem[] = [];
  for (const [key, value] of Object.entries(style)) {
    const list = lists[key as keyof StyleOptions] as readonly unknown[] | undefined;
    if (!list) problems.push({ path: `style.${key}`, message: `Unknown style option "${key}".` });
    else if (!list.includes(value)) {
      const names = Object.values(styleOptionNames[key as keyof StyleOptions]).join(", ");
      problems.push({ path: `style.${key}`, message: `${labels[key as keyof StyleOptions]}: pick one of ${names}.` });
    }
  }
  return problems;
}

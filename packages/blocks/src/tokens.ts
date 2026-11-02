/**
 * Design tokens: the site's global colours, type and spacing.
 * Blocks never use raw values; they reference these through CSS variables,
 * so changing a token restyles the whole site.
 */
import { fontFaceCss } from "./fonts";
import { sectionStylesCss, validateSectionStyles, type SectionStyle, type SectionStyleId } from "./section-styles";
import { styleOptionsCss, validateStyleOptions, type StyleOptions } from "./style-options";

export const spacingSteps = ["none", "xs", "sm", "md", "lg", "xl"] as const;
export type SpacingStep = (typeof spacingSteps)[number];

export const colorRoles = ["background", "surface", "text", "muted", "primary", "onPrimary"] as const;
export type ColorRole = (typeof colorRoles)[number];

export interface SiteTokens {
  colors: Record<ColorRole, string>;
  fonts: { heading: string; body: string };
  /** Spacing scale in rem, keyed by step. */
  spacing: Record<SpacingStep, number>;
  /** Corner radius in px. */
  radius: number;
  /** Content max width in px. */
  maxWidth: number;
  /** Site-wide section styles (F025). Optional: sites saved before F025 use the defaults. */
  sectionStyles?: Record<SectionStyleId, SectionStyle>;
  /** Type, buttons, cards and links (F028). Optional: missing options keep the pre-F028 look. */
  style?: Partial<StyleOptions>;
}

export const defaultTokens: SiteTokens = {
  colors: {
    background: "#ffffff",
    surface: "#f4f4f5",
    text: "#18181b",
    muted: "#52525b",
    primary: "#4338ca",
    onPrimary: "#ffffff",
  },
  fonts: {
    heading: "system-ui, -apple-system, 'Segoe UI', sans-serif",
    body: "system-ui, -apple-system, 'Segoe UI', sans-serif",
  },
  spacing: { none: 0, xs: 0.5, sm: 1, md: 2, lg: 4, xl: 6 },
  radius: 8,
  maxWidth: 1120,
};

const SAFE_VALUE = /^[#(),.%\w\s'"-]+$/;

/** Rejects values that could break out of a CSS declaration. */
function safe(value: string): string {
  if (!SAFE_VALUE.test(value) || /[;{}<>]/.test(value)) {
    throw new Error(`Unsafe token value: ${JSON.stringify(value)}`);
  }
  return value;
}

/** Turns tokens into a `:root { --cr-… }` block (or another selector). */
export function tokensToCss(tokens: SiteTokens, selector = ":root"): string {
  const lines: string[] = [];
  for (const role of colorRoles) lines.push(`--cr-color-${role}: ${safe(tokens.colors[role])};`);
  lines.push(`--cr-font-heading: ${safe(tokens.fonts.heading)};`);
  lines.push(`--cr-font-body: ${safe(tokens.fonts.body)};`);
  for (const step of spacingSteps) lines.push(`--cr-space-${step}: ${Number(tokens.spacing[step])}rem;`);
  lines.push(`--cr-radius: ${Number(tokens.radius)}px;`);
  lines.push(`--cr-max-width: ${Number(tokens.maxWidth)}px;`);
  const scope = selector === ":root" ? "" : selector;
  const options = styleOptionsCss(tokens, scope);
  // F070: bundled fonts the site uses (nothing for sites on system fonts).
  const faces = fontFaceCss(tokens.fonts);
  return `${faces ? `${faces}\n` : ""}${selector} {\n  ${lines.join("\n  ")}\n}\n${sectionStylesCss(tokens, scope)}${options ? `\n${options}` : ""}`;
}

/** What each colour role does, in the owner's words. */
export const colorRoleInfo: Record<ColorRole, { name: string; job: string; usedFor: string }> = {
  background: { name: "Page", job: "Behind everything", usedFor: "Page background, Page sections and cards" },
  surface: { name: "Surface", job: "Quiet panels", usedFor: "Surface sections and cards" },
  text: { name: "Text", job: "Headings and body text", usedFor: "All headings and paragraphs" },
  muted: { name: "Muted text", job: "Secondary text", usedFor: "Muted text, captions" },
  primary: { name: "Primary", job: "Brand and actions", usedFor: "Buttons, links, Primary sections" },
  onPrimary: { name: "Text on primary", job: "Labels on primary", usedFor: "Button labels, text in Primary sections" },
};

export const tokenLimits = {
  spacing: { min: 0, max: 20 },
  radius: { min: 0, max: 64 },
  maxWidth: { min: 480, max: 2400 },
} as const;

export interface TokenProblem {
  /** Dotted path, e.g. "colors.primary". */
  path: string;
  message: string;
}

const isNumberIn = (v: unknown, min: number, max: number) => typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;

/** Checks token values before they're saved or published. Empty = valid. */
export function validateTokens(tokens: SiteTokens): TokenProblem[] {
  const problems: TokenProblem[] = [];
  for (const role of colorRoles) {
    if (!/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(tokens.colors[role] ?? "")) {
      problems.push({ path: `colors.${role}`, message: `${colorRoleInfo[role].name}: use a hex colour like #4338CA.` });
    }
  }
  for (const key of ["heading", "body"] as const) {
    const stack = tokens.fonts[key] ?? "";
    if (!stack.trim() || !SAFE_VALUE.test(stack) || /[;{}<>]/.test(stack)) {
      problems.push({ path: `fonts.${key}`, message: `The ${key} font list contains characters that aren't allowed.` });
    }
  }
  for (const step of spacingSteps) {
    const { min, max } = tokenLimits.spacing;
    if (!isNumberIn(tokens.spacing[step], min, max)) {
      problems.push({ path: `spacing.${step}`, message: `Spacing ${step.toUpperCase()}: use a number from ${min} to ${max}.` });
    }
  }
  if (!isNumberIn(tokens.radius, tokenLimits.radius.min, tokenLimits.radius.max)) {
    problems.push({ path: "radius", message: `Corner radius: use ${tokenLimits.radius.min} to ${tokenLimits.radius.max} px.` });
  }
  if (!isNumberIn(tokens.maxWidth, tokenLimits.maxWidth.min, tokenLimits.maxWidth.max)) {
    problems.push({ path: "maxWidth", message: `Page width: use ${tokenLimits.maxWidth.min} to ${tokenLimits.maxWidth.max} px.` });
  }
  problems.push(...validateSectionStyles(tokens));
  problems.push(...validateStyleOptions(tokens));
  return problems;
}

/** True when each spacing step is larger than the one before. */
export function spacingIncreases(spacing: Record<SpacingStep, number>): boolean {
  return spacingSteps.every((step, i) => i === 0 || spacing[step] > spacing[spacingSteps[i - 1] as SpacingStep]);
}

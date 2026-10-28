/**
 * Design tokens: the site's global colours, type and spacing.
 * Blocks never use raw values; they reference these through CSS variables,
 * so changing a token restyles the whole site.
 */
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

/** Turns tokens into a `:root { --cr-… }` block. */
export function tokensToCss(tokens: SiteTokens): string {
  const lines: string[] = [];
  for (const role of colorRoles) lines.push(`--cr-color-${role}: ${safe(tokens.colors[role])};`);
  lines.push(`--cr-font-heading: ${safe(tokens.fonts.heading)};`);
  lines.push(`--cr-font-body: ${safe(tokens.fonts.body)};`);
  for (const step of spacingSteps) lines.push(`--cr-space-${step}: ${Number(tokens.spacing[step])}rem;`);
  lines.push(`--cr-radius: ${Number(tokens.radius)}px;`);
  lines.push(`--cr-max-width: ${Number(tokens.maxWidth)}px;`);
  return `:root {\n  ${lines.join("\n  ")}\n}`;
}

/**
 * Site-wide section styles (F025). A Section stores only which style it uses
 * ("background", "surface", "primary" or "dark"); what each style looks like
 * is defined once in the site tokens, so changing "Muted" restyles every Muted
 * section on every page.
 *
 * Text colour is never chosen by hand: each style picks the token colour that
 * reads best on its background, and links, muted text and buttons follow
 * rules that keep WCAG AA contrast.
 */
import { AA, contrastRatio, isHexColor, normalizeHex } from "./contrast";
import type { ColorRole, SiteTokens } from "./tokens";

// Kept here (not imported from tokens.ts) so the two modules don't import each other.
const roles: readonly string[] = ["background", "surface", "text", "muted", "primary", "onPrimary"];

export const sectionStyleIds = ["background", "surface", "primary", "dark"] as const;
export type SectionStyleId = (typeof sectionStyleIds)[number];

export const buttonLooks = ["solid", "outline", "inverse", "soft"] as const;
export type ButtonLook = (typeof buttonLooks)[number];

export interface SectionStyle {
  /** A colour role ("surface") or a hex colour ("#F3EAD8"). */
  bg: ColorRole | string;
  /** How a Primary button looks inside this style. */
  button: ButtonLook;
}

export const sectionStyleNames: Record<SectionStyleId, string> = {
  background: "Page",
  surface: "Muted",
  primary: "Primary",
  dark: "Dark",
};

export const buttonLookNames: Record<ButtonLook, string> = { solid: "Solid", outline: "Outline", inverse: "Inverse", soft: "Soft" };

/** Matches how Page, Surface and Primary sections looked before F025. */
export const defaultSectionStyles: Record<SectionStyleId, SectionStyle> = {
  background: { bg: "background", button: "solid" },
  surface: { bg: "surface", button: "solid" },
  primary: { bg: "primary", button: "inverse" },
  dark: { bg: "text", button: "inverse" },
};

/** Section styles of a site; sites saved before F025 have none and get the defaults. */
export function sectionStylesOf(tokens: SiteTokens): Record<SectionStyleId, SectionStyle> {
  const saved = tokens.sectionStyles ?? {};
  return Object.fromEntries(
    sectionStyleIds.map((id) => [id, { ...defaultSectionStyles[id], ...(saved as Partial<Record<SectionStyleId, SectionStyle>>)[id] }]),
  ) as Record<SectionStyleId, SectionStyle>;
}

const isRole = (v: string): v is ColorRole => roles.includes(v);

/** The hex colour behind a style. */
export function styleBackground(tokens: SiteTokens, bg: string): string {
  if (isRole(bg)) return tokens.colors[bg];
  return normalizeHex(bg) ?? tokens.colors.background;
}

/** Mixes `a` over `b`: t = 1 is all `a`. */
export function mixHex(a: string, b: string, t: number): string {
  const p = (h: string) => {
    const n = normalizeHex(h)!;
    return [1, 3, 5].map((i) => parseInt(n.slice(i, i + 2), 16));
  };
  const [A, B] = [p(a), p(b)];
  return `#${A.map((v, i) => Math.round(v * t + B[i]! * (1 - t)).toString(16).padStart(2, "0")).join("").toUpperCase()}`;
}

export interface ResolvedSectionStyle {
  id: SectionStyleId;
  bg: string;
  /** Headings and body text. */
  ink: string;
  muted: string;
  /** Links and outline buttons. */
  accent: string;
  button: { bg: string; fg: string; border: string; look: ButtonLook };
  /** Contrast of ink on bg; below AA only when no token colour reads on this background. */
  inkRatio: number;
}

/** Works out every colour a style needs from the tokens. */
export function resolveSectionStyle(tokens: SiteTokens, id: SectionStyleId): ResolvedSectionStyle {
  const style = sectionStylesOf(tokens)[id];
  const c = tokens.colors;
  const bg = styleBackground(tokens, style.bg);

  // Text: whichever token colour reads best here. Text first, so ties keep the usual look.
  const ink = [c.text, c.background, c.onPrimary, c.surface].reduce((best, x) =>
    contrastRatio(x, bg) > contrastRatio(best, bg) ? x : best,
  );
  const inkRatio = contrastRatio(ink, bg);

  const softened = mixHex(ink, bg, 0.8);
  const muted = contrastRatio(c.muted, bg) >= AA ? c.muted : contrastRatio(softened, bg) >= AA ? softened : ink;
  const accent = contrastRatio(c.primary, bg) >= AA ? c.primary : ink;

  // A solid button must stand out from the section (3:1, WCAG 1.4.11); otherwise it goes inverse.
  let look = style.button;
  if (look === "solid" && contrastRatio(c.primary, bg) < 3) look = "inverse";
  // Soft (F028): a light tint of the brand colour; its label falls back to the text colour if the brand colour won't read on it.
  const softBg = mixHex(c.primary, bg, 0.14);
  const button =
    look === "solid"
      ? { bg: c.primary, fg: c.onPrimary, border: c.primary, look }
      : look === "inverse"
        ? { bg: ink, fg: bg, border: ink, look }
        : look === "soft"
          ? { bg: softBg, fg: contrastRatio(c.primary, softBg) >= AA ? c.primary : ink, border: softBg, look }
          : { bg: "transparent", fg: ink, border: ink, look };

  return { id, bg, ink, muted, accent, button, inkRatio };
}

// --- Background images ------------------------------------------------------

export const tintLevels = ["light", "medium", "strong"] as const;
export type TintLevel = (typeof tintLevels)[number];
export const tintNames: Record<TintLevel, string> = { light: "Light", medium: "Medium", strong: "Strong" };
const tintOpacity: Record<TintLevel, number> = { light: 0.45, medium: 0.65, strong: 0.82 };

/**
 * Worst case for text on a photo: any pixel could be pure black or pure
 * white. The tint is the style's background laid over the photo at `opacity`.
 */
export function imageContrast(ink: string, bg: string, opacity: number): number {
  return Math.min(contrastRatio(ink, mixHex(bg, "#000000", opacity)), contrastRatio(ink, mixHex(bg, "#FFFFFF", opacity)));
}

/** The weakest tint (0–1, in steps of 0.01) that keeps text readable on any photo. */
export function minimumTint(ink: string, bg: string): number {
  for (let o = 0; o <= 100; o++) if (imageContrast(ink, bg, o / 100) >= AA) return o / 100;
  return 1;
}

/** The opacity actually used: the chosen level, raised when it's too faint for this style. */
export function effectiveTint(style: ResolvedSectionStyle, level: TintLevel): { opacity: number; raised: boolean } {
  const min = minimumTint(style.ink, style.bg);
  const wanted = tintOpacity[level];
  return wanted >= min ? { opacity: wanted, raised: false } : { opacity: min, raised: true };
}

/** The weakest level that needs no raising; null when even Strong is raised. */
export function weakestReadableTint(style: ResolvedSectionStyle): TintLevel | null {
  return tintLevels.find((l) => !effectiveTint(style, l).raised) ?? null;
}

// --- CSS and checks -----------------------------------------------------------

/** CSS for every section style, scoped under `scope` (e.g. ".preview") when given. */
export function sectionStylesCss(tokens: SiteTokens, scope = ""): string {
  const pre = scope ? `${scope} ` : "";
  return sectionStyleIds
    .map((id) => {
      const s = resolveSectionStyle(tokens, id);
      const vars = [
        `--cr-sec-bg: ${s.bg};`,
        `--cr-sec-ink: ${s.ink};`,
        `--cr-sec-muted: ${s.muted};`,
        `--cr-sec-accent: ${s.accent};`,
        `--cr-btn-bg: ${s.button.bg};`,
        `--cr-btn-fg: ${s.button.fg};`,
        `--cr-btn-border: ${s.button.border};`,
      ];
      const tints = tintLevels.map((l) => `${pre}.cr-style-${id} > .cr-tint-${l} { opacity: ${effectiveTint(s, l).opacity}; }`);
      return [`${pre}.cr-style-${id} {\n  ${vars.join("\n  ")}\n}`, ...tints].join("\n");
    })
    .join("\n");
}

export interface SectionStyleProblem {
  path: string;
  message: string;
}

export function validateSectionStyles(tokens: SiteTokens): SectionStyleProblem[] {
  const problems: SectionStyleProblem[] = [];
  const saved = tokens.sectionStyles;
  if (saved === undefined) return problems;
  for (const id of sectionStyleIds) {
    const s = saved[id];
    if (!s) continue;
    if (!isRole(s.bg) && !isHexColor(s.bg)) {
      problems.push({ path: `sectionStyles.${id}.bg`, message: `${sectionStyleNames[id]} style: use a site colour or a hex colour like #F3EAD8.` });
    }
    if (!(buttonLooks as readonly string[]).includes(s.button)) {
      problems.push({ path: `sectionStyles.${id}.button`, message: `${sectionStyleNames[id]} style: the button look must be Solid, Outline, Inverse or Soft.` });
    }
  }
  return problems;
}

/** Styles whose background no site colour can be read on, in the owner's words. */
export function sectionStyleWarnings(tokens: SiteTokens): { id: SectionStyleId; message: string }[] {
  return sectionStyleIds
    .map((id) => resolveSectionStyle(tokens, id))
    .filter((s) => s.inkRatio < AA)
    .map((s) => ({
      id: s.id,
      message: `Text on ${sectionStyleNames[s.id]} sections is hard to read (${s.inkRatio.toFixed(2)}:1). Pick a lighter or darker background.`,
    }));
}

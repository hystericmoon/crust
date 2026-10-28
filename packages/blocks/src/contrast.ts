/**
 * WCAG contrast checks for the site's colour tokens.
 * A pair is a foreground role drawn on a background role somewhere in the
 * blocks; every pair must reach 4.5:1 (AA for normal text).
 */
import type { ColorRole } from "./tokens";

export const AA = 4.5;

type Rgb = { r: number; g: number; b: number };

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

export function isHexColor(value: string): boolean {
  return HEX.test(value.trim());
}

/** "#abc" or "#aabbcc" → "#AABBCC"; null when not a hex colour. */
export function normalizeHex(value: string): string | null {
  const v = value.trim();
  if (!HEX.test(v)) return null;
  const digits = v.length === 4 ? [...v.slice(1)].map((c) => c + c).join("") : v.slice(1);
  return `#${digits.toUpperCase()}`;
}

function toRgb(hex: string): Rgb {
  const n = normalizeHex(hex);
  if (!n) throw new Error(`Not a hex colour: ${JSON.stringify(hex)}`);
  return { r: parseInt(n.slice(1, 3), 16), g: parseInt(n.slice(3, 5), 16), b: parseInt(n.slice(5, 7), 16) };
}

function toHex({ r, g, b }: Rgb): string {
  return `#${[r, g, b].map((c) => Math.round(c).toString(16).padStart(2, "0")).join("").toUpperCase()}`;
}

function luminance(hex: string): number {
  const { r, g, b } = toRgb(hex);
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** WCAG contrast ratio, 1–21. */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

/** Ratio shown to people: truncated, never rounded up to a pass. */
export function formatRatio(ratio: number): string {
  return `${(Math.floor(ratio * 100) / 100).toFixed(2)}:1`;
}

export interface ContrastPair {
  id: string;
  fg: ColorRole;
  bg: ColorRole;
  /** Where this combination shows up, in the owner's words. */
  label: string;
}

/** Every text/background combination the blocks can produce. */
export const contrastPairs: ContrastPair[] = [
  { id: "text-background", fg: "text", bg: "background", label: "Text on the page" },
  { id: "text-surface", fg: "text", bg: "surface", label: "Text on Surface sections and cards" },
  { id: "muted-background", fg: "muted", bg: "background", label: "Muted text on the page" },
  { id: "muted-surface", fg: "muted", bg: "surface", label: "Muted text on Surface" },
  { id: "primary-background", fg: "primary", bg: "background", label: "Links and outline buttons on the page" },
  { id: "primary-surface", fg: "primary", bg: "surface", label: "Links and outline buttons on Surface" },
  { id: "onPrimary-primary", fg: "onPrimary", bg: "primary", label: "Labels on Primary buttons and sections" },
];

export interface ContrastResult extends ContrastPair {
  ratio: number;
  passes: boolean;
}

export function checkContrast(colors: Record<ColorRole, string>): ContrastResult[] {
  return contrastPairs.map((pair) => {
    const ratio = contrastRatio(colors[pair.fg], colors[pair.bg]);
    return { ...pair, ratio, passes: ratio >= AA };
  });
}

function rgbToHsl({ r, g, b }: Rgb): [number, number, number] {
  const [rn, gn, bn] = [r / 255, g / 255, b / 255];
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h =
    max === rn ? ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6 : max === gn ? ((bn - rn) / d + 2) / 6 : ((rn - gn) / d + 4) / 6;
  return [h, s, l];
}

function hslToRgb(h: number, s: number, l: number): Rgb {
  if (s === 0) return { r: l * 255, g: l * 255, b: l * 255 };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hue = (t: number) => {
    const u = t < 0 ? t + 1 : t > 1 ? t - 1 : t;
    if (u < 1 / 6) return p + (q - p) * 6 * u;
    if (u < 1 / 2) return q;
    if (u < 2 / 3) return p + (q - p) * (2 / 3 - u) * 6;
    return p;
  };
  return { r: hue(h + 1 / 3) * 255, g: hue(h) * 255, b: hue(h - 1 / 3) * 255 };
}

/**
 * Suggests a new value for `role` that passes every pair the role takes
 * part in (as text or as background), keeping its hue and saturation and
 * changing lightness as little as possible. Null when no lightness works.
 */
export function suggestFix(colors: Record<ColorRole, string>, role: ColorRole): string | null {
  const related = contrastPairs.filter((p) => p.fg === role || p.bg === role);
  const passesAll = (candidate: string) =>
    related.every((p) => {
      const fg = p.fg === role ? candidate : colors[p.fg];
      const bg = p.bg === role ? candidate : colors[p.bg];
      return contrastRatio(fg, bg) >= AA;
    });
  const current = normalizeHex(colors[role]);
  if (!current) return null;
  if (passesAll(current)) return current;

  const [h, s, l] = rgbToHsl(toRgb(current));
  const step = 0.002;
  const search = (dir: 1 | -1) => {
    for (let x = l + dir * step; x >= 0 && x <= 1; x += dir * step) {
      const candidate = toHex(hslToRgb(h, s, x));
      if (passesAll(candidate)) return { candidate, delta: Math.abs(x - l) };
    }
    return null;
  };
  const best = [search(-1), search(1)]
    .filter((r): r is { candidate: string; delta: number } => r !== null)
    .sort((a, b) => a.delta - b.delta)[0];
  return best?.candidate ?? null;
}

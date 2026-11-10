import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/** F085: every app token pair meets WCAG 2.2 AA in both looks, computed from app-theme.css itself. */

const css = readFileSync(new URL("./app-theme.css", import.meta.url), "utf8");

type RGBA = [number, number, number, number];

function block(marker: string): Record<string, string> {
  const at = css.indexOf(marker);
  if (at < 0) throw new Error(`No ${marker} in app-theme.css`);
  const body = css.slice(css.indexOf("{", at) + 1, css.indexOf("}", at));
  const out: Record<string, string> = {};
  for (const m of body.matchAll(/--app-([\w-]+):\s*([^;]+);/g)) out[m[1]!] = m[2]!.trim();
  return out;
}

function parse(value: string): RGBA {
  const hex = /^#([0-9a-f]{6})$/i.exec(value);
  if (hex) {
    const n = parseInt(hex[1]!, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 1];
  }
  const rgba = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+))?\s*\)$/.exec(value);
  if (rgba) return [Number(rgba[1]), Number(rgba[2]), Number(rgba[3]), rgba[4] === undefined ? 1 : Number(rgba[4])];
  throw new Error(`Not a colour: ${value}`);
}

/** A see-through colour as it shows over an opaque one. */
function over(top: RGBA, under: RGBA): RGBA {
  const a = top[3];
  return [top[0] * a + under[0] * (1 - a), top[1] * a + under[1] * (1 - a), top[2] * a + under[2] * (1 - a), 1];
}

function luminance([r, g, b]: RGBA): number {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export function contrast(a: RGBA, b: RGBA): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

const light = block("/* app-theme:light */");
const themes = { light, dark: { ...light, ...block("/* app-theme:dark */") } };

/** A surface: a token, or a see-through token laid over another ("acc-soft/panel"). */
function surface(t: Record<string, string>, name: string): RGBA {
  const [top, ...rest] = name.split("/");
  const c = parse(t[top!]!);
  if (c[3] === 1) return c;
  return over(c, surface(t, rest.length ? rest.join("/") : "panel"));
}

// [foreground, background]: text, at least 4.5:1.
const textPairs: [string, string][] = [
  ["ink", "bg"], ["ink", "top"], ["ink", "panel"], ["ink", "raised"], ["ink", "canvas"],
  ["ink", "fill/panel"], ["ink", "hover/panel"], ["ink", "hover/bg"],
  ["mute", "bg"], ["mute", "panel"], ["mute", "raised"], ["mute", "canvas"], ["mute", "fill/panel"], ["mute", "hover/panel"],
  ["pri-fg", "pri"], ["pri-fg", "pri-hover"],
  ["acc-fg", "acc"], ["acc-fg", "acc-hover"],
  ["acc", "bg"], ["acc", "panel"], ["acc", "canvas"], ["acc", "acc-soft/panel"], ["acc", "acc-soft/bg"], ["acc", "acc-soft/fill/panel"],
  // The canvas toolbar's chosen scope ("This section" / "Whole site") keeps the toolbar's text colour.
  ["pri-fg", "acc"], ["pri-fg", "warn"], ["pri-fg", "danger"],
  ["warn", "bg"], ["warn", "panel"], ["warn", "warn-soft/panel"], ["warn-fg", "warn"], ["warn-fg", "warn-hover"],
  ["danger", "bg"], ["danger", "panel"], ["danger", "danger-soft/panel"], ["danger-fg", "danger"], ["danger-fg", "danger-hover"],
  ["ok", "bg"], ["ok", "panel"], ["ok", "ok-soft/panel"],
];

// Boundaries people need to see (field borders, focus ring, selection): at least 3:1.
const uiPairs: [string, string][] = [
  ["line-strong", "bg"], ["line-strong", "panel"], ["line-strong", "fill/panel"],
  ["acc", "bg"], ["acc", "panel"], ["acc", "raised"], ["acc", "canvas"],
  ["pri", "bg"], ["pri", "panel"],
  ["warn", "panel"], ["danger", "panel"],
];

describe("app-theme tokens", () => {
  it("define the same tokens in both looks", () => {
    const darkOnly = block("/* app-theme:dark */");
    const colourNames = Object.keys(light).filter((k) => !["font", "mono"].includes(k));
    expect(Object.keys(darkOnly).sort()).toEqual(colourNames.sort());
  });

  for (const [name, t] of Object.entries(themes)) {
    describe(`${name} look`, () => {
      it.each(textPairs)(`text %s on %s is at least 4.5:1`, (fg, bg) => {
        const back = surface(t, bg);
        const ratio = contrast(over(parse(t[fg]!), back), back);
        expect(ratio, `${fg} on ${bg}: ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(4.5);
      });
      it.each(uiPairs)(`boundary %s on %s is at least 3:1`, (fg, bg) => {
        const back = surface(t, bg);
        const ratio = contrast(over(parse(t[fg]!), back), back);
        expect(ratio, `${fg} on ${bg}: ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(3);
      });
    });
  }

  it("matches the approved take A colours", () => {
    // design/f085-app-themes-v1.html, .tA.dark and .tA.light
    expect([light.bg, light.panel, light.raised, light.ink, light.acc, light.pri, light.canvas]).toEqual(["#ffffff", "#fbfafc", "#efedf3", "#27272a", "#7c3aed", "#18151d", "#f3f1f6"]);
    const d = themes.dark;
    expect([d.bg, d.panel, d.raised, d.ink, d.mute, d.acc, d.pri, d.canvas, d.warn]).toEqual(["#120f17", "#16121c", "#2a2533", "#f6f4f9", "#a49fae", "#a78bfa", "#f4f2f7", "#0d0b11", "#f5b454"]);
  });
});

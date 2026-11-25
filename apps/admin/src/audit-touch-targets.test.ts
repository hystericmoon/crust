import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/** Touch-target floors from the UI audit (WCAG 2.5.8 = 24px; touch guidance = 44px). */
const css = (file: string) => readFileSync(`apps/admin/src/${file}`, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

/** Declarations of the first rule whose selector list contains `selector`, inside the given @media text (or outside any @media). */
function rule(sheet: string, selector: string, media?: string): string {
  let text = sheet;
  if (media) {
    const at = sheet.indexOf(media);
    if (at < 0) return "";
    const open = sheet.indexOf("{", at);
    let depth = 0;
    let end = open;
    for (; end < sheet.length; end++) {
      if (sheet[end] === "{") depth++;
      if (sheet[end] === "}" && --depth === 0) break;
    }
    text = sheet.slice(open + 1, end);
  } else {
    text = sheet.replace(/@media[^{]*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, "");
  }
  for (const m of text.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (m[1].split(",").map((x) => x.trim()).includes(selector)) return m[2];
  }
  return "";
}
const px = (decl: string, prop: string) => Number(new RegExp(`(?:^|[;\\s])${prop}:\\s*(\\d+)px`).exec(decl)?.[1] ?? 0);
const COARSE = "@media (pointer: coarse)";

describe("audit A006: layout cards", () => {
  const sheet = css("layouts/layouts.css");
  it("card title buttons are at least 24px tall, and 44px on touch screens", () => {
    expect(px(rule(sheet, ".lg-card-button"), "min-height")).toBeGreaterThanOrEqual(24);
    expect(px(rule(sheet, ".lg-card-button", COARSE), "min-height")).toBeGreaterThanOrEqual(44);
    expect(px(rule(sheet, ".lg-more", COARSE), "height")).toBeGreaterThanOrEqual(44);
  });
});

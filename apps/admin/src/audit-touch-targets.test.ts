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
    const list = (m[1] ?? "").trim();
    if (list === selector || list.split(",").map((x) => x.trim()).includes(selector)) return m[2] ?? "";
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

describe("audit A309: pages list on a phone", () => {
  const sheet = css("pages-panel/pages-panel.css");
  const touch = "@media (pointer: coarse), (max-width: 640px)";
  it("page names, the drag handle, More and menu items are 44px on touch or narrow screens", () => {
    expect(px(rule(sheet, ".pp-grip", touch), "min-height")).toBeGreaterThanOrEqual(44);
    expect(px(rule(sheet, ".pp-grip", touch), "min-width")).toBeGreaterThanOrEqual(44);
    expect(px(rule(sheet, ".pp-more", touch), "min-height")).toBeGreaterThanOrEqual(44);
    expect(px(rule(sheet, ".pp-name a", touch), "min-height")).toBeGreaterThanOrEqual(44);
    expect(px(rule(sheet, ".pp-menu :is(a, button)", touch), "min-height")).toBeGreaterThanOrEqual(44);
  });
});

describe("audit A206: phone controls", () => {
  const phone = "@media (pointer: coarse), (max-width: 560px)";
  it("light/dark switch, top-bar buttons and the text toolbar are 44px on touch or phones", () => {
    expect(px(rule(css("app-theme/app-theme.css"), ".app-theme-toggle", phone), "height")).toBeGreaterThanOrEqual(44);
    expect(px(rule(css("app-frame/app-frame.css"), ".af-site-button, .af-button, .af-tools .st-button, .af-tools .crust-header-link, .af-publish", phone), "min-height")).toBeGreaterThanOrEqual(44);
    expect(px(rule(css("app-frame/app-frame.css"), ".af-icon-button", phone), "height")).toBeGreaterThanOrEqual(44);
    expect(px(rule(css("rich-text/rich-text.css"), ".rt-tool", phone), "height")).toBeGreaterThanOrEqual(44);
    expect(px(rule(css("rich-text/rich-text.css"), ".rt-link-input", phone), "min-height")).toBeGreaterThanOrEqual(44);
    expect(px(rule(css("inline-text/inline-text.css"), ".it-btn", phone), "min-height")).toBeGreaterThanOrEqual(44);
  });
});

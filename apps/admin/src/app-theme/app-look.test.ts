// @vitest-environment happy-dom
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { fontFaceCss } from "@crust/blocks";
import { APP_FONTS } from "./fonts";
import { installSpotlight } from "./spotlight";

/** F095: the "Magic touch" look (owner chose B and Instrument Sans, 2026-11-24). */

const read = (name: string): string => readFileSync(fileURLToPath(new URL(name, import.meta.url)), "utf8");
const look = read("./app-look.css").replace(/\/\*[\s\S]*?\*\//g, "");

describe("F095 font", () => {
  it("uses Instrument Sans for the app and Geist Mono for small print", () => {
    expect(APP_FONTS.heading).toContain("Instrument Sans");
    expect(APP_FONTS.body).toContain("Geist Mono");
    expect(read("./app-theme.css")).toMatch(/--app-font: "Instrument Sans"/);
  });

  it("loads the bundled Instrument Sans files, so the desktop app works offline", () => {
    const css = fontFaceCss(APP_FONTS);
    expect(css).toContain("instrument-sans-latin.woff2");
    expect(css).toContain("url(/fonts/");
  });
});

describe("F095 look", () => {
  it("sets the radius tokens once", () => {
    expect(look).toMatch(/--app-r-btn: 10px/);
    expect(look).toMatch(/--app-r-card: 12px/);
  });

  it("starts every rule with :root, so import order never changes the result", () => {
    const text = look.replace(/@media[^{]*\{/g, "").replace(/@keyframes[^{]*\{[\s\S]*?\}\s*\}/g, "").replace(/@property[^{]*\{[^}]*\}/g, "");
    const selectors = [...text.matchAll(/([^{};]+)\{/g)].map((m) => m[1]!.trim()).filter(Boolean);
    expect(selectors.length).toBeGreaterThan(10);
    for (const s of selectors) expect(s.startsWith(":root"), s).toBe(true);
  });

  it("gives only the .af-hero button the coloured edge", () => {
    const uses = [...look.matchAll(/([^{}]*)\{[^{}]*var\(--app-edge\)[^{}]*\}/g)].map((m) => m[1]!.trim());
    expect(uses).toEqual([":root .af-hero", ":root .af-hero:hover"]);
  });

  it("plays the selection light once, then stops, and switches all motion off for reduce-motion", () => {
    expect(look).toMatch(/animation: app-beam 1\.6s ease-out 1 forwards/);
    expect(look).not.toMatch(/infinite/);
    const reduce = look.slice(look.indexOf("prefers-reduced-motion"));
    expect(reduce).toMatch(/animation: none/);
    expect(reduce).toMatch(/transition: none/);
  });

  it("marks both Publish buttons with af-hero", () => {
    const bar = read("../app-frame/AppTopBar.tsx");
    expect(bar.match(/className="af-publish af-hero"/g)?.length).toBe(2);
  });
});

describe("F095 spotlight", () => {
  it("sets --mx and --my on the card under the cursor, and stops when asked", () => {
    document.body.innerHTML = '<div class="lg-card" id="c"><span id="inner">Hero</span></div><div id="other">no</div>';
    const card = document.getElementById("c") as HTMLElement;
    card.getBoundingClientRect = () => ({ left: 100, top: 50, right: 300, bottom: 250, width: 200, height: 200, x: 100, y: 50, toJSON: () => ({}) });
    const stop = installSpotlight(document);
    document.getElementById("inner")!.dispatchEvent(new MouseEvent("pointermove", { bubbles: true, clientX: 160, clientY: 90 }));
    expect(card.style.getPropertyValue("--mx")).toBe("60px");
    expect(card.style.getPropertyValue("--my")).toBe("40px");
    document.getElementById("other")!.dispatchEvent(new MouseEvent("pointermove", { bubbles: true, clientX: 1, clientY: 1 }));
    expect(card.style.getPropertyValue("--mx")).toBe("60px");
    stop();
    document.getElementById("inner")!.dispatchEvent(new MouseEvent("pointermove", { bubbles: true, clientX: 200, clientY: 100 }));
    expect(card.style.getPropertyValue("--mx")).toBe("60px");
  });
});

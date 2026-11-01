// F069: fixes from Claude's review (DECISIONS.md, Proposals, "From the review"), shared block code.
import { describe, expect, it } from "vitest";
import { config } from "./config";
import { countChromeLinks, relinkChrome } from "./links";
import { findPlaceholders } from "./placeholders";
import { makeThemePack, readThemePack } from "./theme-pack";
import { defaultTokens } from "./tokens";

describe("review-fixes 8: header and footer links follow a renamed page (F018)", () => {
  const site = {
    name: "Bakery",
    header: { menu: [{ label: "Menu", href: "/menu" }, { label: "Shop", href: "https://shop.example/menu" }], cta: { label: "Order", href: "/menu/#order" } },
    footer: { columns: [{ title: "Visit", links: [{ label: "Menu", href: "/menu?x" }, { label: "Menus", href: "/menus" }] }], text: "Hi" },
  };
  it("updates the menu, the header button and footer columns, and counts them", () => {
    const { site: next, count } = relinkChrome(site, "/menu", "/food");
    expect(count).toBe(3);
    expect(next.header.menu).toEqual([{ label: "Menu", href: "/food" }, { label: "Shop", href: "https://shop.example/menu" }]);
    expect(next.header.cta).toEqual({ label: "Order", href: "/food/#order" });
    expect(next.footer.columns[0]!.links).toEqual([{ label: "Menu", href: "/food?x" }, { label: "Menus", href: "/menus" }]);
    expect(next.footer.text).toBe("Hi");
    expect(countChromeLinks(site, "/menu")).toBe(3);
  });
  it("leaves a site without a header, footer or matching links as it is", () => {
    const plain: { name: string; header?: unknown } = { name: "Bakery" };
    expect(relinkChrome(plain, "/menu", "/food")).toEqual({ site: plain, count: 0 });
    expect(relinkChrome(site, "/about", "/us").site).toBe(site);
  });
});

describe("review-fixes 10: To replace in page order (F046)", () => {
  it("lists columns left to right, whatever order the builder keeps them in", () => {
    const heading = (id: string, text: string) => ({ type: "Heading", props: { id, text, level: "h3", placeholder: ["text"] } });
    // The builder's copy of a page can hold column4 … column1.
    const columns = { type: "Columns", props: { id: "c", count: "3", column4: [], column3: [heading("c3", "Landscape")], column2: [heading("c2", "Interiors")], column1: [heading("c1", "Architecture")] } };
    expect(findPlaceholders([{ type: "Section", props: { id: "s", content: [columns] } }]).map((p) => p.id)).toEqual(["c1", "c2", "c3"]);
  });
});

describe("review-fixes 10: contrast problems once each on theme import (F033)", () => {
  it("doesn't repeat text on the page as text on Page sections", () => {
    const tokens = { ...defaultTokens, colors: { ...defaultTokens.colors, text: "#d4d4d4", background: "#ffffff" } };
    const pack = makeThemePack("Pale", { tokens: true, chrome: false, layouts: false }, { tokens, chrome: { header: { style: "background", sticky: false }, footer: { style: "surface" } }, layouts: [] }, new Date("2026-11-01T00:00:00Z"));
    const out = readThemePack(JSON.stringify(pack), config.components);
    const lines = out.warnings ?? out.problems;
    expect(lines.some((l) => l.startsWith("Contrast: text on the page is"))).toBe(true);
    expect(lines.some((l) => l.includes("Text on Page sections is hard to read"))).toBe(false);
  });
});

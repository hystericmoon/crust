import { describe, expect, it } from "vitest";
import { config } from "./config";
import { applyPreset, themePresets } from "./presets";
import { freeLayoutName, makeThemePack, packFileName, packLimits, packSummary, readThemePack, type PackChrome, type PackLayout } from "./theme-pack";
import { defaultTokens, type SiteTokens } from "./tokens";

const known = config.components;
const chrome: PackChrome = { header: { style: "dark", sticky: true }, footer: { style: "surface" } };
const layouts: PackLayout[] = [
  {
    name: "Studio intro",
    kind: "section",
    content: [
      {
        type: "Section",
        props: { id: "s", background: "surface", paddingY: "lg", content: [{ type: "Heading", props: { id: "h", text: "Hi", level: "h2", align: "left" } }] },
      },
    ],
  },
  { name: "FAQ", kind: "section", content: [{ type: "Accordion", props: { id: "a", items: [{ question: "Q?", answer: "A." }], firstOpen: "no", oneAtATime: "no" } }] },
];
const all = { tokens: true, chrome: true, layouts: true };
const text = (v: unknown) => JSON.stringify(v);
const pack = (tokens: SiteTokens = defaultTokens) => makeThemePack("Studio look", all, { tokens, chrome, layouts }, new Date("2026-10-29T12:00:00Z"));
const read = (v: unknown) => readThemePack(typeof v === "string" ? v : text(v), known);

describe("theme pack: export", () => {
  it("holds the format, name, date and the chosen parts", () => {
    const p = pack();
    expect(p).toMatchObject({ format: "crust-theme-pack", version: 1, name: "Studio look", exportedAt: "2026-10-29T12:00:00.000Z" });
    expect(p.tokens).toEqual(defaultTokens);
    expect(p.chrome).toEqual(chrome);
    expect(p.layouts?.map((l) => l.name)).toEqual(["Studio intro", "FAQ"]);
    const styleOnly = makeThemePack("x", { tokens: true, chrome: false, layouts: false }, { tokens: defaultTokens, chrome, layouts });
    expect(styleOnly.chrome).toBeUndefined();
    expect(styleOnly.layouts).toBeUndefined();
  });

  it("names the file after the theme", () => {
    expect(packFileName("Studio Look — Été!")).toBe("studio-look-ete.crust");
    expect(packFileName("!!!")).toBe("theme.crust");
  });
});

describe("theme pack: import", () => {
  it("round-trips a pack, every preset included", () => {
    for (const preset of themePresets) {
      const tokens = applyPreset(defaultTokens, preset);
      const { pack: back, problems } = read(pack(tokens));
      expect(problems, preset.name).toEqual([]);
      expect(back?.tokens).toEqual(tokens);
    }
    const { pack: back } = read(pack());
    expect(back?.chrome).toEqual(chrome);
    expect(back?.layouts).toEqual(layouts);
  });

  it("refuses files that aren't theme packs", () => {
    expect(read("not json").problems).toEqual(["This file isn't a Crust theme pack (it couldn't be read)."]);
    expect(read({ hello: 1 }).problems).toEqual(["This file isn't a Crust theme pack."]);
    expect(read({ ...pack(), version: 2 }).problems[0]).toContain("newer Crust");
    expect(read("x".repeat(packLimits.bytes + 1)).problems).toEqual(["This file is too big to be a theme pack."]);
    expect(read({ format: "crust-theme-pack", version: 1, name: "Empty" }).problems).toEqual(["This theme pack is empty."]);
  });

  it("refuses a style with values that could break out of CSS", () => {
    const bad = { ...defaultTokens, fonts: { heading: "x; } body { display: none", body: "Inter" } };
    const { pack: back, problems } = read(pack(bad));
    expect(back).toBeNull();
    expect(problems).toContain("The heading font list contains characters that aren't allowed.");
    expect(read({ ...pack(), tokens: { colors: "red" } }).problems).toEqual(["The style in this file is damaged."]);
  });

  it("leaves out a style that fails the contrast checks, and keeps the rest", () => {
    const pale = { ...defaultTokens, colors: { ...defaultTokens.colors, text: "#cccccc" } };
    const { pack: back, problems, warnings } = read(pack(pale));
    expect(problems).toEqual([]);
    expect(back?.tokens).toBeUndefined();
    expect(back?.layouts).toHaveLength(2);
    expect(warnings?.[0]).toBe("The style was left out because it's hard to read:");
    expect(warnings?.some((p) => p.startsWith("Contrast: text on the page is"))).toBe(true);
    // A pack with nothing else is refused, with the same reasons.
    const styleOnly = makeThemePack("x", { tokens: true, chrome: false, layouts: false }, { tokens: pale, chrome, layouts });
    const refused = read(styleOnly);
    expect(refused.pack).toBeNull();
    expect(refused.problems.some((p) => p.startsWith("Contrast: text on the page is"))).toBe(true);
  });

  it("refuses choice fields with values the block doesn't offer (they become tags and styles)", () => {
    const withBlock = (b: unknown) => ({ ...pack(), layouts: [{ name: "X", kind: "section", content: [b] }] });
    expect(read(withBlock({ type: "Heading", props: { id: "h", text: "alert(1)", level: "script", align: "left" } })).pack).toBeNull();
    expect(read(withBlock({ type: "Spacer", props: { id: "s", size: "x);position:fixed;inset:0" } })).pack).toBeNull();
    // Inside a slot, and inside a list item, too.
    expect(read(withBlock({ type: "Section", props: { content: [{ type: "Grid", props: { titleLevel: "style", items: [] } }] } })).pack).toBeNull();
    expect(read(withBlock({ type: "Grid", props: { titleLevel: "h3", items: [{ title: "A" }, "x"] } })).pack).toBeNull();
    // Known values pass.
    expect(read(withBlock({ type: "Heading", props: { id: "h", text: "Hi", level: "h2", align: "center" } })).problems).toEqual([]);
  });

  it("keeps only the token fields Crust knows", () => {
    const extra = { ...pack(), tokens: { ...defaultTokens, css: "body{}", colors: { ...defaultTokens.colors, evil: "#000" } } };
    const back = read(extra).pack!;
    expect(back.tokens).toEqual(defaultTokens);
  });

  it("refuses unknown blocks, odd prop names and damaged layouts", () => {
    const withBlock = (b: unknown) => ({ ...pack(), layouts: [{ name: "X", kind: "section", content: [b] }] });
    expect(read(withBlock({ type: "Script", props: { src: "evil.js" } })).problems).toEqual(["“X” has blocks Crust doesn't know, or damaged ones."]);
    expect(read(withBlock({ type: "Text", props: { "on click": "x" } })).pack).toBeNull();
    expect(read(text(withBlock({ type: "Text", props: { text: "hi" } })).replace('"text":"hi"', '"__proto__":{"x":1}')).pack).toBeNull();
    // A block hidden inside a slot is checked too.
    expect(read(withBlock({ type: "Section", props: { content: [{ type: "Iframe", props: {} }] } })).pack).toBeNull();
    expect(read({ ...pack(), layouts: [{ name: "", kind: "section", content: [] }] }).problems[0]).toContain("needs a name");
    expect(read({ ...pack(), layouts: [{ name: "Y", kind: "header", content: [{ type: "Text", props: {} }] }] }).problems[0]).toContain("section or a whole page");
  });

  it("drops fields of a layout it doesn't use, and checks the header and footer look", () => {
    const extra = { ...pack(), layouts: [{ ...layouts[1], id: "x", savedAt: "y", html: "<b>" }] };
    expect(read(extra).pack!.layouts).toEqual([layouts[1]]);
    expect(read({ ...pack(), chrome: { header: { style: "neon", sticky: true }, footer: { style: "dark" } } }).problems).toEqual(["The header and footer look in this file is damaged."]);
    // Links and text never come along, even if a file has them.
    const withLinks = { ...pack(), chrome: { header: { ...chrome.header, menu: [{ label: "Evil", href: "javascript:x" }] }, footer: chrome.footer } };
    expect(read(withLinks).pack!.chrome).toEqual(chrome);
  });

  it("summarises a pack in plain words", () => {
    expect(packSummary(pack())).toEqual([
      "Style: colours, fonts, spacing, section styles, buttons, cards and links",
      "Header and footer look: Dark header (stays at the top), Muted footer",
      "2 layouts: Studio intro, FAQ",
    ]);
  });
});

describe("theme pack: layout names", () => {
  it("never replaces one of your layouts", () => {
    expect(freeLayoutName("FAQ", ["Hero"])).toBe("FAQ");
    expect(freeLayoutName("FAQ", ["faq"])).toBe("FAQ (2)");
    expect(freeLayoutName("FAQ", ["FAQ", "FAQ (2)"])).toBe("FAQ (3)");
    expect(freeLayoutName("x".repeat(60), ["x".repeat(60)])).toHaveLength(60);
  });
});

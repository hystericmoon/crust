/**
 * F068: the store's licence, terms and refund pages, the links to them from
 * every template page and every buy button, and the gate that keeps real
 * payments off until the owner approves the wording.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { readSiteContent, renderSite } from "../../packages/render/src/site";
import { checkoutGate, type Checkout } from "./checkout";
import { LEGAL, legalGate, legalPages, legalProblems, LICENCE_PATH, LICENCE_SUMMARY, REFUNDS_PATH, TERMS_PATH, type LegalSettings } from "./legal";
import { loadStore, ROOT } from "./load";
import { storePages, storeSite, STORE_URL, type StoreTemplate } from "./model";

const { templates, checkout } = loadStore();
const pages = storePages(templates, checkout);
const harbour = templates.find((t) => t.item.id === "harbour")!;
const olive = (t: StoreTemplate): StoreTemplate => ({ ...t, item: { ...t.item, id: "olive", price: "US$49", buy: "https://sandbox.polar.sh/checkout/olive", licence: LICENCE_SUMMARY } });
const polarTest: Checkout = { provider: "polar", mode: "test" };
const polarLive: Checkout = { provider: "polar", mode: "live" };
const approved: LegalSettings = { approved: "2026-11-10", seller: "Studio Example", contact: "hello@example.com", refundDays: 14 };

type B = { type: string; props: Record<string, unknown> };
const blocksOf = (content: unknown[]): B[] =>
  (content as B[]).flatMap((b) => [b, ...Object.values(b.props).flatMap((v) => (Array.isArray(v) && v.every((x) => x && typeof x === "object" && "type" in x) ? blocksOf(v) : []))]);
const textOf = (p: { puck: { content: unknown[] } }) =>
  JSON.stringify(p.puck.content).match(/"text":"[^"]*"/g)!.map((m) => m.slice(8, -1)).join(" ");

describe("the licence, terms and refund pages", () => {
  const legal = pages.filter((p) => [LICENCE_PATH, TERMS_PATH, REFUNDS_PATH].includes(p.path));

  it("are always in the store, even with nothing for sale (the licence covers free templates)", () => {
    expect(legal.map((p) => p.path)).toEqual(["/licence", "/terms", "/refunds"]);
    for (const p of legal) {
      expect(p.description.length).toBeGreaterThan(20);
      expect(p.description.length).toBeLessThanOrEqual(300);
    }
  });

  it("have one H1, then H2s in order, and no “to replace” marks", () => {
    for (const p of legal) {
      const levels = blocksOf(p.puck.content).filter((b) => b.type === "Heading").map((b) => b.props.level);
      expect(levels[0], p.path).toBe("h1");
      expect(levels.slice(1).every((l) => l === "h2"), p.path).toBe(true);
      expect(levels.length).toBeGreaterThan(2);
      expect(JSON.stringify(p)).not.toContain('"placeholder"');
    }
  });

  it("say “Draft” at the top until the owner approves the wording", () => {
    expect(LEGAL.approved).toBeNull();
    for (const p of legal) expect(textOf(p).startsWith("Draft."), p.path).toBe(true);
    for (const p of legalPages(polarTest, approved)) {
      expect(textOf(p), p.path).not.toContain("Draft.");
      expect(JSON.stringify(p)).toContain('"eyebrow":"Updated 2026-11-10"');
    }
  });

  it("say the licence in plain words: unlimited sites, clients too, no passing the file on", () => {
    const t = textOf(legal[0]!);
    expect(t).toContain("any number of websites, for yourself or for clients");
    expect(t).toContain("Sell, share or give away the template file");
    expect(t).toContain("templates that come with Crust are free");
  });

  it("name the payment company in the terms, and the seller once the owner has said who", () => {
    const draft = textOf(legalPages(polarTest)[1]!);
    expect(draft).toContain("Polar handles the payment");
    expect(draft).toContain("the maker of Crust");
    expect(textOf(legalPages(null)[1]!)).toContain("Our payment company handles the payment");
    expect(textOf(legalPages(polarTest, approved)[1]!)).toContain("made by Studio Example");
  });

  it("promise a full refund within 14 days, and say the download page stops working (as F067 does)", () => {
    const t = textOf(legal[2]!);
    expect(t).toContain("full refund within 14 days of buying, for any reason");
    expect(t).toContain("Your download page stops working");
    expect(t).toContain("reply to your receipt email");
    const withContact = JSON.stringify(legalPages(polarTest, approved)[2]);
    expect(withContact).toContain('"href":"mailto:hello@example.com"');
    expect(JSON.stringify(legalPages(polarTest, { ...approved, refundDays: 30 })[2])).toContain("within 30 days");
  });

  it("link to each other", () => {
    expect(JSON.stringify(legal[0])).toContain(`"href":"${REFUNDS_PATH}"`);
    expect(JSON.stringify(legal[1])).toContain(`"href":"${LICENCE_PATH}"`);
    expect(JSON.stringify(legal[1])).toContain(`"href":"${REFUNDS_PATH}"`);
  });
});

describe("links to them", () => {
  it("every template page links to the full licence, free ones too", () => {
    for (const { item } of templates) {
      const p = pages.find((x) => x.path === `/templates/${item.id}`)!;
      expect(JSON.stringify(p), item.id).toContain('"text":"Read the full licence","href":"/licence"');
    }
  });

  it("the footer has a Buying column with all three", () => {
    const footer = storeSite(templates).footer!.columns!.find((c) => c.title === "Buying")!;
    expect(footer.links).toEqual([
      { label: "Licence", href: "/licence" },
      { label: "Terms", href: "/terms" },
      { label: "Refunds", href: "/refunds" },
    ]);
  });

  it("under every buy button (desktop and the phone summary): licence, terms and the refund promise", () => {
    const p = storePages([olive(harbour)], polarTest).find((x) => x.path === "/templates/olive")!;
    const json = JSON.stringify(p);
    const line = '"text":"By buying you agree to the "},{"text":"licence","href":"/licence"},{"text":" and "},{"text":"terms","href":"/terms"},{"text":". Not right for you? "},{"text":"Full refund within 14 days","href":"/refunds"}';
    expect(json.split(line).length - 1).toBe(2);
    // In reading order (F066 review): button, the legal and refund line, the live demo, the test note, then who takes the payment.
    const order = ["Get Harbour · US$49", "By buying you agree", "Try the live demo", "Test checkout.", "Secure checkout by Polar"].map((s) => json.indexOf(s));
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it("free templates have no buy line", () => {
    expect(JSON.stringify(pages.find((x) => x.path === "/templates/harbour"))).not.toContain("By buying");
  });
});

describe("real payments wait for approved wording", () => {
  it("lists what's missing in plain words", () => {
    expect(legalProblems()).toHaveLength(3);
    expect(legalProblems(approved)).toEqual([]);
    expect(legalProblems({ ...approved, contact: null })).toEqual(["The terms and refund pages have no contact email yet."]);
  });

  it("stops live mode only: test mode and a store with nothing for sale are fine", () => {
    expect(legalGate(1, polarLive)).toHaveLength(3);
    expect(legalGate(1, polarLive, approved)).toEqual([]);
    expect(legalGate(1, polarTest)).toEqual([]);
    expect(legalGate(0, polarLive)).toEqual([]);
    expect(legalGate(1, null)).toEqual([]);
    // Alongside F066's gate: live mode with the switch on still stops on draft wording.
    expect([...checkoutGate(1, polarLive, true), ...legalGate(1, polarLive)][0]).toContain("still drafts");
  });

  it("is run by the Publish store workflow's checkout step", () => {
    expect(readFileSync(join(ROOT, "scripts/store/checkout-check.ts"), "utf8")).toContain("legalGate(priced, checkout)");
  });
});

describe("rendered", () => {
  it("each page is a real page with its links, and the committed store has them", async () => {
    const dir = join(ROOT, "store/content");
    for (const f of ["licence.json", "terms.json", "refunds.json"]) expect(existsSync(join(dir, "pages", f)), f).toBe(true);
    const content = await readSiteContent({
      read: async (p) => (existsSync(join(dir, p)) ? readFileSync(join(dir, p), "utf8") : null),
      list: async (sub) => (existsSync(join(dir, sub)) ? readdirSync(join(dir, sub)) : []),
    });
    const css = readFileSync(join(ROOT, "packages/blocks/src/styles.css"), "utf8");
    const files = renderSite(content, css, { baseUrl: STORE_URL });
    const html = (path: string) => files.find((f) => f.path === path)!.content;
    expect(html("licence/index.html")).toMatch(/<h1[^>]*>[\s\S]*Licence/);
    expect(html("licence/index.html")).toContain('href="/refunds"');
    expect(html("refunds/index.html")).toContain("14 days");
    expect(html("terms/index.html")).toContain('href="/licence"');
    expect(html("templates/corner/index.html")).toContain('href="/licence"');
  });
});

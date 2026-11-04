/**
 * F066: checkout. Buy buttons are plain links to the payment company's
 * hosted checkout (Polar recommended, Lemon Squeezy also understood), test
 * mode first with a note under each button, a "Thank you" page, and a gate
 * on the Publish store workflow so real payments need the owner's switch.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import { describe, expect, it } from "vitest";
import { readSiteContent, renderSite } from "../../packages/render/src/site";
import { buyLinkProblem, checkoutGate, checkoutLine, checkoutUrl, readCheckout, testNote, TEST_CARD, THANKS_PATH, type Checkout } from "./checkout";
import { loadStore, ROOT, storeContentFiles } from "./load";
import { pageFileName, readStoreList, storePages, storeSite, STORE_URL, type StoreTemplate } from "./model";

const POLAR_TEST = "https://sandbox-api.polar.sh/v1/checkout-links/polar_cl_Ab12Cd34/redirect";
const POLAR_LIVE = "https://buy.polar.sh/polar_cl_Ab12Cd34";
const LEMON = "https://crust.lemonsqueezy.com/checkout/buy/5f1c2a9e-7b3d-4c8e-9a10-2b3c4d5e6f70";
const test: Checkout = { provider: "polar", mode: "test" };
const live: Checkout = { provider: "polar", mode: "live" };

const { templates } = loadStore();
const harbour = templates.find((t) => t.item.id === "harbour")!;
const priced = (buy: string): StoreTemplate => ({
  ...harbour,
  item: { ...harbour.item, id: "harbour-plus", price: "US$49", buy, licence: "One site per purchase." },
});
const list = (extra: object, templatesJson: unknown[]) => JSON.stringify({ format: "crust-store", version: 1, ...extra, templates: templatesJson });
const entry = { id: "olive", file: "templates/olive.crust", kind: "Restaurants", price: "US$49", licence: "One site.", show: ["/"] };

type B = { type: string; props: Record<string, unknown> };
const blocksOf = (content: unknown[]): B[] =>
  (content as B[]).flatMap((b) => [
    b,
    ...Object.values(b.props).flatMap((v) => (Array.isArray(v) && v.every((x) => x && typeof x === "object" && "type" in x && "props" in x) ? blocksOf(v) : [])),
  ]);
const buttons = (blocks: B[]) => blocks.filter((b) => b.type === "Button" && String(b.props.label).startsWith("Get "));
const words = (b: B) => JSON.stringify(b.props.text ?? "");

describe("the checkout setting in store/list.json", () => {
  it("is Polar in test mode (the owner's account, no real payments yet)", () => {
    const { list: l } = readStoreList(readFileSync(join(ROOT, "store/list.json"), "utf8"));
    expect(l!.checkout).toEqual({ provider: "polar", mode: "test" });
    expect(loadStore().checkout).toEqual({ provider: "polar", mode: "test" });
  });

  it("is optional, and refuses unknown companies and modes", () => {
    expect(readCheckout(undefined)).toEqual({ checkout: null, problems: [] });
    expect(readCheckout({ provider: "lemonsqueezy", mode: "live" }).checkout).toEqual({ provider: "lemonsqueezy", mode: "live" });
    expect(readCheckout({ provider: "paddle", mode: "sandbox" }).problems).toEqual([
      '"checkout": "provider" should be "polar" or "lemonsqueezy".',
      '"checkout": "mode" should be "test" or "live".',
    ]);
    expect(readStoreList(list({ checkout: { provider: "stripe", mode: "test" } }, [{ ...entry, price: "Free" }])).list).toBeNull();
  });

  it("only takes the company's own checkout links, for the right mode", () => {
    expect(buyLinkProblem("“olive”", POLAR_TEST, test)).toBeNull();
    expect(buyLinkProblem("“olive”", POLAR_LIVE, live)).toBeNull();
    expect(buyLinkProblem("“olive”", POLAR_LIVE, test)).toBe('“olive”: its "buy" link is a live Polar link, but the store\'s checkout is in test mode.');
    expect(buyLinkProblem("“olive”", POLAR_TEST, live)).toBe('“olive”: its "buy" link is a test (sandbox) Polar link, but the store\'s checkout is in live mode.');
    expect(buyLinkProblem("“olive”", "https://polar.sh/crust/products/olive", test)).toBe(
      '“olive”: its "buy" link should be a Polar checkout link for test mode, like https://sandbox-api.polar.sh/v1/checkout-links/polar_cl_…/redirect',
    );
    expect(buyLinkProblem("“olive”", "https://buy.polar.sh.evil.example/polar_cl_x", live)).not.toBeNull();
    expect(buyLinkProblem("“olive”", "not a link", live)).not.toBeNull();
    // Lemon Squeezy: test mode is a setting of its store, so the same link shape serves both.
    expect(buyLinkProblem("“olive”", LEMON, { provider: "lemonsqueezy", mode: "test" })).toBeNull();
    expect(buyLinkProblem("“olive”", LEMON, { provider: "lemonsqueezy", mode: "live" })).toBeNull();
    expect(buyLinkProblem("“olive”", POLAR_LIVE, { provider: "lemonsqueezy", mode: "live" })).toContain("Lemon Squeezy checkout link");
  });

  it("checks every priced template's link when the list reads", () => {
    const ok = readStoreList(list({ checkout: test }, [{ ...entry, buy: POLAR_TEST }]));
    expect(ok.problems).toEqual([]);
    expect(ok.list!.checkout).toEqual(test);
    const bad = readStoreList(list({ checkout: test }, [{ ...entry, buy: POLAR_LIVE }]));
    expect(bad.list).toBeNull();
    expect(bad.problems).toEqual(['“olive”: its "buy" link is a live Polar link, but the store\'s checkout is in test mode.']);
    // Without the setting, a link is used as written (as before F066); the publish gate asks for the setting.
    expect(readStoreList(list({}, [{ ...entry, buy: "https://pay.example/olive" }])).problems).toEqual([]);
  });
});

describe("the buy button", () => {
  it("names the template in the order, so the 'order paid' message says which one (F067)", () => {
    expect(checkoutUrl(POLAR_TEST, "olive", test)).toBe(`${POLAR_TEST}?reference_id=olive`);
    expect(checkoutUrl(POLAR_LIVE, "olive", live)).toBe(`${POLAR_LIVE}?reference_id=olive`);
    expect(new URL(checkoutUrl(LEMON, "olive", { provider: "lemonsqueezy", mode: "live" })).searchParams.get("checkout[custom][template]")).toBe("olive");
    expect(checkoutUrl("https://pay.example/olive", "olive", null)).toBe("https://pay.example/olive");
  });

  it("in test mode: a note under the button, said in words, with the test card", () => {
    const page = storePages([priced(POLAR_TEST)], test).find((p) => p.path === "/templates/harbour-plus")!;
    const blocks = blocksOf(page.puck.content);
    const buy = buttons(blocks);
    // Once in the details column, once at the top for phones.
    expect(buy).toHaveLength(2);
    for (const b of buy) expect(b.props.href).toBe(`${POLAR_TEST}?reference_id=harbour-plus`);
    const notes = blocks.filter((b) => b.type === "Text" && words(b).includes("Test checkout."));
    expect(notes).toHaveLength(2);
    expect(words(notes[0]!)).toContain(TEST_CARD);
    expect(words(notes[0]!)).toContain('"bold":true');
    // The note comes straight after the button it belongs to, in reading order.
    for (const b of buy) {
      const i = blocks.indexOf(b);
      // F066 review: the licence and refund line first, then the live demo, then the small print.
      expect(words(blocks[i + 1]!)).toContain("By buying you agree");
      expect(blocks[i + 2]!.type).toBe("Button");
      expect(words(blocks[i + 3]!)).toContain("Test checkout.");
      expect(words(blocks[i + 4]!)).toContain("Secure checkout by Polar");
    }
    // The phone copy hides on bigger screens like the rest of the phone summary.
    expect(notes.some((n) => JSON.stringify(n.props.hideOn) === '["desktop","tablet"]')).toBe(true);
  });

  it("in live mode: no note, still who takes the payment", () => {
    const page = storePages([priced(POLAR_LIVE)], live).find((p) => p.path === "/templates/harbour-plus")!;
    const text = JSON.stringify(page);
    expect(text).not.toContain("Test checkout.");
    expect(text).toContain(checkoutLine(live));
    expect(testNote(live)).toBeNull();
  });

  it("leaves the free templates' pages as they were", () => {
    // F068: only the Terms page names the payment company once one is set.
    const notTerms = (ps: ReturnType<typeof storePages>) => ps.filter((p) => p.path !== "/terms");
    const before = notTerms(storePages(templates));
    expect(notTerms(storePages(templates, test))).toEqual(before);
    expect(JSON.stringify(before)).not.toContain("checkout");
  });
});

describe("the Thank you page", () => {
  it("appears once something is for sale, kept out of search engines", () => {
    expect(storePages(templates, test).some((p) => p.path === THANKS_PATH)).toBe(false);
    const thanks = storePages([...templates, priced(POLAR_TEST)], test).find((p) => p.path === THANKS_PATH)!;
    expect(thanks.seo).toEqual({ noindex: true });
    const blocks = blocksOf(thanks.puck.content);
    expect(blocks.filter((b) => b.type === "Heading" && b.props.level === "h1")).toHaveLength(1);
    expect(JSON.stringify(thanks)).toContain("Start from a template → Open a file");
    expect(JSON.stringify(thanks)).toContain("That was a test order");
    const real = storePages([priced(POLAR_LIVE)], live).find((p) => p.path === THANKS_PATH)!;
    expect(JSON.stringify(real)).not.toContain("test order");
    expect(JSON.stringify(real)).toContain("download link");
  });
});

describe("audit F063/F066 polish", () => {
  it("keeps the two Thank you buttons together, with no Columns block between them", () => {
    const thanks = storePages([...templates, priced(POLAR_TEST)], test).find((p) => p.path === THANKS_PATH)!;
    const blocks = blocksOf(thanks.puck.content);
    expect(blocks.some((b) => b.type === "Columns")).toBe(false);
    expect(blocks.filter((b) => b.type === "Button").map((b) => b.props.label)).toEqual(["Download Crust", "Help"]);
  });
  it("shows the phone price as a labelled heading above the Get button", () => {
    const page = storePages([priced(POLAR_TEST)], test).find((p) => p.path === "/templates/harbour-plus")!;
    const phone = blocksOf(page.puck.content).filter((b) => Array.isArray(b.props.hideOn) && b.props.hideOn.includes("desktop"));
    expect(phone[0]!.type).toBe("Heading");
    expect(phone[0]!.props).toMatchObject({ text: "US$49", eyebrow: "Price" });
    expect(phone[1]!.type).toBe("Button");
  });
  it("shows big template cards, never one alone on a half row", () => {
    const home = storePages(templates).find((p) => p.path === "/")!;
    const n = templates.length;
    expect(blocksOf(home.puck.content).find((b) => b.type === "Grid")!.props.columns).toBe(n <= 2 || n % 2 === 0 ? "2" : "3");
  });
  it("stacks the two home buttons instead of putting them in 1/4 + 3/4 columns", () => {
    const home = storePages(templates).find((p) => p.path === "/")!;
    const hero = home.puck.content[0] as { props: { content: { type: string }[] } };
    expect(hero.props.content.filter((b) => b.type === "Button")).toHaveLength(2);
  });
});

describe("published, the buy button works without JavaScript", () => {
  it("renders a plain link to the checkout, the note and the Thank you page", async () => {
    const dir = join(ROOT, "store/content");
    const all = [...templates, priced(POLAR_TEST)];
    const pages = new Map(storePages(all, test).map((p) => [`pages/${pageFileName(p)}`, JSON.stringify(p)]));
    const content = await readSiteContent({
      read: async (p) => (p === "site.json" ? JSON.stringify(storeSite(all)) : pages.get(p) ?? (existsSync(join(dir, p)) ? readFileSync(join(dir, p), "utf8") : null)),
      list: async (sub) => (sub === "pages" ? [...pages.keys()].map((k) => k.slice(6)) : existsSync(join(dir, sub)) ? readdirSync(join(dir, sub)) : []),
    });
    const css = readFileSync(join(ROOT, "packages/blocks/src/styles.css"), "utf8");
    const files = renderSite(content, css, { baseUrl: STORE_URL });
    const html = files.find((f) => f.path === "templates/harbour-plus/index.html")!.content;
    expect(html).toContain(`href="${POLAR_TEST}?reference_id=harbour-plus"`);
    expect(html).toMatch(/<strong>Test checkout\.<\/strong>/);
    const thanks = files.find((f) => f.path === "thanks/index.html")!.content;
    expect(thanks).toContain('name="robots" content="noindex');
  });
});

describe("the Publish store workflow's gate", () => {
  it("lets a store with nothing for sale through, unless real payments are asked for", () => {
    expect(checkoutGate(0, test, false)).toEqual([]);
    expect(checkoutGate(0, null, false)).toEqual([]);
    expect(checkoutGate(0, test, true)[0]).toContain("nothing in the store has a price");
  });

  it("needs a checkout setting before anything priced goes out", () => {
    expect(checkoutGate(1, null, false)[0]).toContain('needs "checkout"');
  });

  it("takes real payments only with the owner's switch, and never test links with it", () => {
    expect(checkoutGate(1, test, false)).toEqual([]);
    expect(checkoutGate(1, live, false)[0]).toContain('"Take real payments" switched on');
    expect(checkoutGate(1, live, true)).toEqual([]);
    expect(checkoutGate(1, test, true)[0]).toContain("still in test mode");
  });

  it("runs before the store is rendered, with the switch off by default", () => {
    const wf = parse(readFileSync(join(ROOT, ".github/workflows/publish-store.yml"), "utf8"));
    const input = wf.on.workflow_dispatch.inputs.real_payments;
    expect(input).toMatchObject({ type: "boolean", default: false });
    const steps: { name: string; run?: string; env?: Record<string, string> }[] = wf.jobs.publish.steps;
    const gate = steps.findIndex((s) => s.run?.includes("scripts/store/checkout-check.ts"));
    expect(gate).toBeGreaterThan(-1);
    expect(gate).toBeLessThan(steps.findIndex((s) => s.name === "Render pages"));
    expect(steps[gate]!.env!.CRUST_REAL_PAYMENTS).toBe("${{ inputs.real_payments && 'yes' || 'no' }}");
  });

  it("the committed store pages match the list (nothing for sale yet, so no Thank you page)", () => {
    const { templates: t, checkout } = loadStore();
    expect([...storeContentFiles(t, checkout).keys()]).not.toContain("pages/thanks.json");
  });
});

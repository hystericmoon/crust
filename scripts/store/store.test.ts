/**
 * F063: the template store. The list of templates for sale, the store's
 * pages written from it, the pictures, the catalogue for the app, and the
 * "Publish store" workflow.
 */
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import { describe, expect, it } from "vitest";
import { parseMediaIndex } from "@crust/blocks";
import { readCatalogue, STORE_CATALOGUE_ADDRESS, STORE_CATALOGUE_URL } from "../../apps/admin/src/templates/catalogue";
import { readSiteContent, renderSite } from "../../packages/render/src/site";
import { DOWNLOADS_URL } from "../updates-site";
import { loadStore, ROOT, storeContentFiles } from "./load";
import {
  CATALOGUE_FILE,
  firstFamily,
  includedLines,
  isPriced,
  listOf,
  pictureFile,
  picturesNeeded,
  PICTURE_SIZES,
  readStoreList,
  readStoreTemplates,
  storeCatalogue,
  storePages,
  STORE_PROJECT,
  STORE_URL,
  templateFacts,
  type StoreTemplate,
} from "./model";

const listText = readFileSync(join(ROOT, "store/list.json"), "utf8");
const { templates } = loadStore();
const pages = storePages(templates);
const harbour = templates.find((t) => t.item.id === "harbour")!;

/** A copy of a listed template with a price, as a premium one will be. */
const priced = (t: StoreTemplate, extra: Partial<StoreTemplate["item"]> = {}): StoreTemplate => ({
  ...t,
  item: { ...t.item, id: `${t.item.id}-plus`, price: "US$49", buy: "https://checkout.example/harbour", licence: "One site per purchase.", ...extra },
});

const blocksOf = (content: unknown[]): { type: string; props: Record<string, unknown> }[] =>
  (content as { type: string; props: Record<string, unknown> }[]).flatMap((b) => [
    b,
    ...Object.values(b.props).flatMap((v) => (Array.isArray(v) && v.every((x) => x && typeof x === "object" && "type" in x && "props" in x) ? blocksOf(v) : [])),
  ]);

const list = (templatesJson: unknown[]) => JSON.stringify({ format: "crust-store", version: 1, templates: templatesJson });
const entry = { id: "olive", file: "templates/olive.crust", kind: "Restaurants", price: "Free", show: ["/"] };

describe("the list of templates for sale", () => {
  it("reads store/list.json: Harbour, Signal and Corner, free", () => {
    const { list: l, problems } = readStoreList(listText);
    expect(problems).toEqual([]);
    expect(l!.templates.map((t) => [t.id, t.price])).toEqual([["harbour", "Free"], ["signal", "Free"], ["corner", "Free"]]);
  });

  it("refuses the whole list with plain reasons", () => {
    expect(readStoreList("{").problems).toEqual(["store/list.json isn't valid JSON."]);
    expect(readStoreList(JSON.stringify({ templates: [] })).problems[0]).toContain('"format": "crust-store"');
    expect(readStoreList(list([])).problems).toEqual(["store/list.json lists no templates."]);
    const bad = readStoreList(list([{ ...entry, id: "Olive!" }, entry, entry, { ...entry, id: "x", price: "49 dollars", show: ["/menu"] }]));
    expect(bad.list).toBeNull();
    expect(bad.problems).toEqual([
      "“Olive!”: the id should be lowercase letters, numbers and dashes.",
      "“olive” is listed twice.",
      '“x”: the price should be "Free" or like "US$49".',
      '“x”: "show" should list 1 to 4 page addresses, starting with "/".',
    ]);
  });

  it("won't sell a priced template without a way to buy it and its licence", () => {
    const r = readStoreList(list([{ ...entry, price: "US$49" }]));
    expect(r.problems).toEqual([
      '“olive” has a price, so it needs a "buy" link (https://…) before the store can sell it.',
      '“olive” has a price, so it needs its licence in "licence" (one or two sentences).',
    ]);
    const ok = readStoreList(list([{ ...entry, price: "€39", buy: "https://pay.example/olive", licence: "One site." }]));
    expect(ok.list!.templates[0]).toMatchObject({ price: "€39", buy: "https://pay.example/olive", licence: "One site." });
    expect(readStoreList(list([{ ...entry, price: "US$49", buy: "http://pay.example", licence: "x" }])).problems[0]).toContain('"buy" link');
  });

  it("checks each template file opens and has the pages to show", () => {
    const r = readStoreTemplates({ templates: [{ ...entry, file: "templates/harbour.crust", show: ["/", "/menu"] }, { ...entry, id: "gone", file: "templates/gone.crust" }] }, (p) => {
      try {
        return readFileSync(join(ROOT, p), "utf8");
      } catch {
        return null;
      }
    });
    expect(r.problems).toEqual(["“olive”: Harbour has no page at /menu.", "“gone”: templates/gone.crust isn't there."]);
  });
});

describe("what's included, counted from the template file", () => {
  it("names the fonts and lists the pages", () => {
    expect(firstFamily("'Fraunces', Georgia, serif")).toBe("Fraunces");
    expect(listOf(["a"])).toBe("a");
    expect(listOf(["a", "b", "c"])).toBe("a, b and c");
    const facts = templateFacts(harbour.template);
    expect(facts).toMatchObject({ pages: ["Home", "Studio", "Services", "Projects", "Contact"], posts: 2, fonts: ["Fraunces", "Inter Tight"], linkedSections: 1 });
    expect(includedLines(facts)).toEqual([
      "5 pages: Home, Studio, Services, Projects and Contact",
      "A blog with 2 finished posts",
      "Designs for the post page, blog page and “Page not found”",
      "Fonts: Fraunces and Inter Tight, included with Crust",
      `${harbour.template.media.length} photos to swap for your own`,
      "1 shared section, edited once for every page",
      "Header, footer and colours set up in Site settings",
    ]);
  });

  it("says “Font” for a template with one family", () => {
    const signal = templates.find((t) => t.item.id === "signal")!;
    expect(includedLines(templateFacts(signal.template))).toContain("Font: Geist, included with Crust");
  });
});

describe("the store's pages", () => {
  it("has Home, All templates, a page per template, Download and Help", () => {
    expect(pages.map((p) => p.path)).toEqual(["/", "/templates", "/templates/harbour", "/templates/signal", "/templates/corner", "/download", "/help", "/licence", "/terms", "/refunds"]);
    for (const p of pages) {
      expect(p.title.length).toBeGreaterThan(0);
      expect(p.description.length).toBeGreaterThan(20);
      expect(p.description.length).toBeLessThanOrEqual(300);
    }
  });

  it("has one H1 per page, words of its own (no “to replace” marks) and described pictures", () => {
    for (const p of pages) {
      const blocks = blocksOf(p.puck.content);
      expect(blocks.filter((b) => b.type === "Heading" && b.props.level === "h1"), p.path).toHaveLength(1);
      expect(JSON.stringify(p)).not.toContain('"placeholder"');
      for (const b of blocks) {
        if (b.type === "Image") expect(String(b.props.alt).length, p.path).toBeGreaterThan(10);
        for (const key of ["items", "images"]) {
          for (const i of (b.props[key] as Record<string, unknown>[] | undefined) ?? []) {
            if (i.imageSrc || i.src) expect(String(i.imageAlt ?? i.alt).length, p.path).toBeGreaterThan(10);
          }
        }
      }
    }
  });

  it("links only to its own pages, the help answers and the downloads", () => {
    const paths = new Set(pages.map((p) => p.path));
    const links = JSON.stringify(pages).match(/"(?:href|linkHref)":"[^"]*"/g)!.map((m) => m.split('":"')[1]!.slice(0, -1));
    expect(links.length).toBeGreaterThan(10);
    for (const href of links) {
      if (href.startsWith("https://")) expect(href).toBe(DOWNLOADS_URL);
      else if (href.includes("#")) expect(href).toBe("/help#questions");
      else if (/^\/demos\/[a-z-]+\/$/.test(href)) expect(templates.some(({ item }) => href === `/demos/${item.id}/`), href).toBe(true); // F064
      else expect(paths.has(href), href).toBe(true);
    }
    expect(JSON.stringify(pages.find((p) => p.path === "/help"))).toContain('"anchor":"questions"');
  });

  it("shows a template's price, what's included, its licence and its pictures", () => {
    const page = pages.find((p) => p.path === "/templates/harbour")!;
    const text = JSON.stringify(page);
    expect(text).toContain("What's included");
    expect(text).toContain("5 pages: Home, Studio, Services, Projects and Contact");
    expect(text).toContain("Free with Crust. Use it for as many sites as you like.");
    expect(text).toContain("How to open it");
    for (const path of ["/", "/services", "/work"]) for (const w of ["desktop", "phone"] as const) expect(text).toContain(`/media/${pictureFile("harbour", path, w)}`);
    // The details stay in view beside the pictures (snapshot choice A).
    const cols = blocksOf(page.puck.content).find((b) => b.type === "Columns" && b.props.sticky)!;
    expect(cols.props).toMatchObject({ sticky: 2, widths: { desktop: "two-one", phone: "stack" } });
    // On phones the details come after the pictures, so the price and button are also under the title, phones only.
    const top = blocksOf(page.puck.content.slice(0, 1));
    expect(top.filter((b) => JSON.stringify(b.props.hideOn) === '["desktop","tablet"]').map((b) => b.type)).toEqual(["Heading", "Button", "Button"]); // price, next step, live demo (F064)
    // The other templates are offered underneath.
    expect(text).toContain("/templates/signal");
    expect(text).toContain("/templates/corner");
  });

  it("puts a priced template's buy button and licence on its page", () => {
    const p = storePages([priced(harbour)]).find((x) => x.path === "/templates/harbour-plus")!;
    const text = JSON.stringify(p);
    expect(text).toContain('"label":"Get Harbour · US$49","href":"https://checkout.example/harbour"');
    expect(text).toContain("One site per purchase.");
    expect(text).not.toContain("How to open it");
  });

  it("is built with the Studio · Paper look and a header that leads to the download", () => {
    const site = JSON.parse(readFileSync(join(ROOT, "store/content/site.json"), "utf8"));
    expect(site.tokens.colors).toMatchObject({ background: "#FFFFFF", text: "#111214" });
    expect(site.header.cta).toEqual({ label: "Download Crust", href: "/download" });
    expect(site.footer.columns[1].links.map((l: { label: string }) => l.label)).toEqual(["Harbour", "Signal", "Corner"]);
    expect(site.baseUrl).toBe(STORE_URL);
  });

  it("is committed as written (run npm run build:store after changing the list or a template)", () => {
    const files = storeContentFiles(templates, loadStore().checkout);
    for (const [path, text] of files) expect(readFileSync(join(ROOT, "store/content", path), "utf8"), path).toBe(text);
    const pagesOnDisk = readdirSync(join(ROOT, "store/content/pages")).sort();
    expect(pagesOnDisk).toEqual([...files.keys()].filter((f) => f.startsWith("pages/")).map((f) => f.slice(6)).sort());
  });

  it("renders: the template page shows its price and pictures in a <picture>", async () => {
    const dir = join(ROOT, "store/content");
    const content = await readSiteContent({
      read: async (p) => (existsSync(join(dir, p)) ? readFileSync(join(dir, p), "utf8") : null),
      list: async (sub) => (existsSync(join(dir, sub)) ? readdirSync(join(dir, sub)) : []),
    });
    const css = readFileSync(join(ROOT, "packages/blocks/src/styles.css"), "utf8");
    const files = renderSite(content, css, { baseUrl: STORE_URL });
    const html = files.find((f) => f.path === "templates/harbour/index.html")!.content;
    expect(html).toContain("<h1");
    expect(html).toContain("Harbour");
    expect(html).toContain("What&#x27;s included");
    expect(html).toMatch(/<picture class="cr-picture">/);
    expect(files.some((f) => f.path === "index.html")).toBe(true);
  });
});

/** A JPEG's width and height, from its frame header. */
function jpegSize(bytes: Buffer): [number, number] {
  let i = 2;
  while (i < bytes.length) {
    const marker = bytes[i + 1]!;
    if (marker >= 0xc0 && marker <= 0xc3) return [bytes.readUInt16BE(i + 7), bytes.readUInt16BE(i + 5)];
    i += 2 + bytes.readUInt16BE(i + 2);
  }
  return [0, 0];
}

describe("the pictures", () => {
  const index = parseMediaIndex(readFileSync(join(ROOT, "store/content/media.json"), "utf8"));
  const needed = picturesNeeded(templates);

  it("has a desktop, tablet and phone picture of every shown page, described", () => {
    expect(needed).toHaveLength(templates.reduce((n, t) => n + t.item.show.length * 3, 0));
    expect(index.map((m) => m.file).sort()).toEqual(needed.map((m) => m.file).sort());
    for (const m of index) {
      expect(existsSync(join(ROOT, "store/content/media", m.file)), m.file).toBe(true);
      expect(m.alt).toMatch(/^The (Harbour|Signal|Corner) template's .+ page on a (computer screen|tablet|phone)$/);
      expect(m.focus).toEqual({ x: 50, y: 0 });
      expect(Math.max(m.width, m.height)).toBeLessThanOrEqual(2400);
      expect(jpegSize(readFileSync(join(ROOT, "store/content/media", m.file))), m.file).toEqual([m.width, m.height]);
    }
    expect(readdirSync(join(ROOT, "store/content/media")).sort()).toEqual(index.map((m) => m.file).sort());
  });

  it("takes phone pictures at a phone's sharpness", () => {
    expect(PICTURE_SIZES.phone.scale).toBe(2);
    const phone = index.find((m) => m.file === pictureFile("harbour", "/", "phone"))!;
    expect([phone.width, phone.height]).toEqual([780, 2340]);
  });
});

describe("the catalogue for the app (F062)", () => {
  it("leaves out free templates: they're already in the app", () => {
    expect(templates.every((t) => !isPriced(t.item))).toBe(true);
    expect(storeCatalogue(templates)).toEqual({ format: "crust-catalogue", version: 1, templates: [] });
  });

  it("lists a priced template so the app's gallery reads every page and picture", () => {
    const file = storeCatalogue([...templates, priced(harbour)]);
    expect(file.templates).toHaveLength(1);
    const read = readCatalogue(JSON.parse(JSON.stringify(file)), `${STORE_URL}/${CATALOGUE_FILE}`)!;
    expect(read.templates).toHaveLength(1);
    const t = read.templates[0]!;
    expect(t).toMatchObject({ id: "harbour-plus", name: "Harbour", price: "US$49", kind: harbour.item.kind, url: `${STORE_URL}/templates/harbour-plus/` });
    expect(t.pages.map((p) => p.title)).toEqual(["Home", "Services", "Projects"]);
    expect(t.pages[0]!.pictures.map((p) => [p.width, p.src])).toEqual([
      ["desktop", `${STORE_URL}/media/harbour-plus-home-desktop.jpg`],
      ["tablet", `${STORE_URL}/media/harbour-plus-home-tablet.jpg`],
      ["phone", `${STORE_URL}/media/harbour-plus-home-phone.jpg`],
    ]);
  });

  it("is where the app looks, and the app starts looking once something has a price", () => {
    expect(STORE_CATALOGUE_ADDRESS).toBe(`${STORE_URL}/${CATALOGUE_FILE}`);
    const sells = readStoreList(listText).list!.templates.some(isPriced);
    expect(STORE_CATALOGUE_URL).toBe(sells ? STORE_CATALOGUE_ADDRESS : null);
  });
});

describe("the Publish store workflow", () => {
  const wf = parse(readFileSync(join(ROOT, ".github/workflows/publish-store.yml"), "utf8"));
  const steps: { name?: string; run?: string; env?: Record<string, string> }[] = wf.jobs.publish.steps;
  const step = (name: string) => steps.find((s) => s.name === name)!;

  it("runs only when started by hand, with read-only access", () => {
    expect(Object.keys(wf.on)).toEqual(["workflow_dispatch"]);
    expect(wf.permissions).toEqual({ contents: "read" });
  });

  it("publishes to the crust-store project at the address the app knows", () => {
    expect(wf.env.STORE_PROJECT).toBe(STORE_PROJECT);
    expect(wf.env.STORE_URL).toBe(STORE_URL);
    expect(step("Check the store's address").run).toContain('"https://$SUBDOMAIN" != "$STORE_URL"');
    expect(step("Deploy to Cloudflare Pages").run).toContain("pages deploy dist/store");
    expect(wf.env.WRANGLER_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("checks before it deploys: pages up to date, crust-publish, the catalogue, axe", () => {
    const names = steps.map((s) => s.name);
    const at = (n: string) => names.indexOf(n);
    for (const n of ["Check the store's pages are up to date", "Check and finish the store (crust-publish)", "Write the catalogue for the app", "Accessibility check (stops the publish on serious issues)"]) {
      expect(at(n), n).toBeGreaterThan(0);
      expect(at(n), n).toBeLessThan(at("Deploy to Cloudflare Pages"));
    }
    expect(step("Accessibility check (stops the publish on serious issues)").run).toBe("node scripts/check-a11y.mjs dist/store");
  });

  it("never puts expressions straight into shell scripts", () => {
    for (const s of steps) expect(s.run ?? "").not.toMatch(/\$\{\{/);
  });
});

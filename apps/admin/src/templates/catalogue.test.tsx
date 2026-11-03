// @vitest-environment happy-dom
/**
 * F062: premium templates in the gallery. The store's catalogue is read
 * strictly; the gallery shows Free first, then Premium (with prices), a
 * premium template's pictures at three widths, and "Get this template"
 * opening the store in the browser. Offline: one quiet line.
 */
import { config, defaultTokens, makeTemplate, migrateChrome, type TemplateSource } from "@crust/blocks";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { readFileSync, existsSync } from "node:fs";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { setSitesInvoke } from "../sites/sites";
import {
  cardPicture,
  catalogueLink,
  catalogueSource,
  EXAMPLE_CATALOGUE_PATH,
  loadCatalogue,
  MAX_TEMPLATES,
  premiumLabel,
  premiumTemplates,
  readCatalogue,
  type CatalogueState,
} from "./catalogue";
import { TemplatesScreen } from "./TemplatesScreen";

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});
afterEach(() => {
  cleanup();
  setSitesInvoke(null);
  delete (globalThis as { __CRUST_CATALOGUE_URL__?: string }).__CRUST_CATALOGUE_URL__;
});

const BASE = "https://store.crust.example/catalogue.json";
const pic = (width: string, src = `/pics/olive-${width}.jpg`) => ({ width, src, alt: `Olive home page at ${width} width` });
const olive = {
  id: "olive",
  name: "Olive",
  description: "Warm and generous: big food photos, an easy menu and booking.",
  kind: "Restaurant",
  price: "US$49",
  url: "/templates/olive/",
  pages: [
    { title: "Menu", path: "/menu", pictures: [pic("desktop", "/pics/olive-menu.jpg")] },
    { title: "Home", path: "/", pictures: [pic("desktop"), pic("tablet"), pic("phone")] },
  ],
};
const file = (templates: unknown[]) => ({ format: "crust-catalogue", version: 1, templates });

describe("catalogue: reading the file", () => {
  it("reads templates with their pages and pictures, Home first, links made absolute", () => {
    const c = readCatalogue(file([olive]), BASE)!;
    expect(c.templates).toHaveLength(1);
    const t = c.templates[0]!;
    expect(t).toMatchObject({ id: "olive", name: "Olive", kind: "Restaurant", price: "US$49", url: "https://store.crust.example/templates/olive/" });
    expect(t.pages.map((p) => p.path)).toEqual(["/", "/menu"]);
    expect(t.pages[0]!.pictures.map((p) => p.src)).toEqual([
      "https://store.crust.example/pics/olive-desktop.jpg",
      "https://store.crust.example/pics/olive-tablet.jpg",
      "https://store.crust.example/pics/olive-phone.jpg",
    ]);
    expect(cardPicture(t)?.src).toBe("https://store.crust.example/pics/olive-desktop.jpg");
    expect(premiumLabel(t)).toBe("Olive, premium, US$49");
  });

  it("refuses files that aren't a catalogue", () => {
    expect(readCatalogue(null, BASE)).toBeNull();
    expect(readCatalogue({ format: "crust-template", version: 1, templates: [] }, BASE)).toBeNull();
    expect(readCatalogue({ format: "crust-catalogue", version: 2, templates: [] }, BASE)).toBeNull();
    expect(readCatalogue({ format: "crust-catalogue", version: 1 }, BASE)).toBeNull();
  });

  it("leaves out bad entries instead of failing the whole file", () => {
    const c = readCatalogue(
      file([
        olive,
        { ...olive }, // same id twice
        { ...olive, id: "Bad Id" },
        { ...olive, id: "no-price", price: "" },
        { ...olive, id: "long-price", price: "x".repeat(21) },
        { ...olive, id: "unsafe", url: "javascript:alert(1)" },
        { ...olive, id: "plain-http", url: "http://elsewhere.example/olive" },
        { ...olive, id: "no-pages", pages: [] },
        { ...olive, id: "no-alt", pages: [{ title: "Home", path: "/", pictures: [{ width: "desktop", src: "/a.jpg", alt: "" }] }] },
        { ...olive, id: "bad-width", pages: [{ title: "Home", path: "/", pictures: [{ width: "watch", src: "/a.jpg", alt: "A" }] }] },
        { ...olive, id: "bad-path", pages: [{ title: "Home", path: "home", pictures: [pic("desktop")] }] },
        "not an object",
      ]),
      BASE,
    )!;
    expect(c.templates.map((t) => t.id)).toEqual(["olive"]);
  });

  it("drops unknown fields and tidies text", () => {
    const c = readCatalogue(file([{ ...olive, name: "  Olive \n Grove ", secret: "x", onclick: "alert(1)" }]), BASE)!;
    expect(c.templates[0]!.name).toBe("Olive Grove");
    expect(Object.keys(c.templates[0]!).sort()).toEqual(["changes", "description", "id", "kind", "name", "pages", "price", "url"]);
  });

  it("keeps at most so many templates, one picture per width", () => {
    const many = Array.from({ length: MAX_TEMPLATES + 5 }, (_, i) => ({ ...olive, id: `t${i}` }));
    expect(readCatalogue(file(many), BASE)!.templates).toHaveLength(MAX_TEMPLATES);
    const twice = readCatalogue(file([{ ...olive, pages: [{ title: "Home", path: "/", pictures: [pic("desktop", "/1.jpg"), pic("desktop", "/2.jpg")] }] }]), BASE)!;
    expect(twice.templates[0]!.pages[0]!.pictures.map((p) => p.src)).toEqual(["https://store.crust.example/1.jpg"]);
  });

  it("accepts only secure addresses, or ones on the catalogue's own site", () => {
    expect(catalogueLink("https://cdn.example/a.jpg", BASE)).toBe("https://cdn.example/a.jpg");
    expect(catalogueLink("/a.jpg", BASE)).toBe("https://store.crust.example/a.jpg");
    expect(catalogueLink("http://cdn.example/a.jpg", BASE)).toBeNull();
    expect(catalogueLink("data:image/png;base64,AAAA", BASE)).toBeNull();
    expect(catalogueLink("https://me:pw@cdn.example/a.jpg", BASE)).toBeNull();
    expect(catalogueLink("", BASE)).toBeNull();
    expect(catalogueLink(42, BASE)).toBeNull();
    // A local example on the app's own address is fine.
    expect(catalogueLink("a.jpg", "http://localhost:5173/sample-catalogue/catalogue.json")).toBe("http://localhost:5173/sample-catalogue/a.jpg");
  });
});

describe("catalogue: loading", () => {
  const ok = (body: unknown, url = BASE) => vi.fn(async (_url: string, _init?: RequestInit) => ({ ok: true, url, json: async () => body }) as unknown as Response);

  it("loads a catalogue, and says offline when it can't", async () => {
    expect(await loadCatalogue(BASE, ok(file([olive])))).toMatchObject({ kind: "ready", catalogue: { templates: [{ id: "olive" }] } });
    expect(await loadCatalogue(BASE, vi.fn(async () => ({ ok: false }) as Response))).toEqual({ kind: "offline" });
    expect(await loadCatalogue(BASE, vi.fn(async () => Promise.reject(new TypeError("Failed to fetch"))))).toEqual({ kind: "offline" });
    expect(await loadCatalogue(BASE, ok({ not: "a catalogue" }))).toEqual({ kind: "offline" });
  });

  it("gives up after a while instead of waiting for ever", async () => {
    const slow = vi.fn((_url: string, init?: RequestInit) => new Promise<Response>((_, fail) => init?.signal?.addEventListener("abort", () => fail(new Error("aborted")))));
    expect(await loadCatalogue(BASE, slow, 10)).toEqual({ kind: "offline" });
  });

  it("asks the store without cookies, every time", async () => {
    const fetcher = ok(file([olive]));
    await loadCatalogue(BASE, fetcher);
    expect(fetcher.mock.calls[0]![1]).toMatchObject({ credentials: "omit", cache: "no-cache" });
  });

  it("has no store to ask yet, unless examples or a test address are asked for", async () => {
    expect(catalogueSource("#/templates", "https://crust-admin.pages.dev/")).toBeNull();
    expect(await premiumTemplates("#/templates", "https://crust-admin.pages.dev/", vi.fn())).toEqual({ kind: "none" });
    expect(catalogueSource("#/templates?examples", "https://crust-admin.pages.dev/x/")).toEqual({ url: `https://crust-admin.pages.dev/${EXAMPLE_CATALOGUE_PATH}`, examples: true });
    (globalThis as { __CRUST_CATALOGUE_URL__?: string }).__CRUST_CATALOGUE_URL__ = BASE;
    expect(catalogueSource("#/templates", "https://crust-admin.pages.dev/")).toEqual({ url: BASE, examples: false });
  });

  it("marks the example catalogue as examples", async () => {
    const state = await premiumTemplates("#/templates?examples", "http://localhost/", ok(file([olive]), "http://localhost/sample-catalogue/catalogue.json"));
    expect(state).toMatchObject({ kind: "ready", catalogue: { examples: true } });
  });

  it("ships an example catalogue whose every picture is there", () => {
    const dir = "apps/admin/public/sample-catalogue/";
    const c = readCatalogue(JSON.parse(readFileSync(`${dir}catalogue.json`, "utf8")), "http://localhost/sample-catalogue/catalogue.json")!;
    expect(c.templates.length).toBeGreaterThan(0);
    for (const t of c.templates) {
      expect(t.name).toMatch(/^Example/);
      for (const p of t.pages) for (const pic of p.pictures) expect(existsSync(`${dir}${pic.src.split("/sample-catalogue/")[1]}`), pic.src).toBe(true);
      expect(t.pages.every((p) => p.pictures.length === 3)).toBe(true);
    }
  });
});

describe("catalogue: the gallery", () => {
  const ready = (examples = false): CatalogueState => ({ kind: "ready", catalogue: { templates: readCatalogue(file([olive]), BASE)!.templates, examples } });

  async function gallery(state: CatalogueState) {
    render(<TemplatesScreen siteName="Bakery" githubOn={false} currentSite={async () => ({ language: "en", pages: [], posts: 0, sections: [], photos: [], drafts: 0 })} sources={[]} premium={async () => state} />);
    await act(async () => undefined);
  }

  it("shows Free first, then Premium with the price on every card", async () => {
    await gallery(ready());
    const headings = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(headings).toEqual(["Free", "Premium"]);
    const premium = screen.getByRole("list", { name: "Premium templates" });
    const card = within(premium).getByRole("button", { name: /^Olive ?, premium, US\$49\./ });
    expect(card.textContent).toMatch(/Restaurant, 2 pages/);
    expect(card.textContent).toMatch(/US\$49/);
    expect(screen.getByText(/Bought in the Crust store, which opens in your browser/)).toBeTruthy();
    expect(screen.queryByText(/Examples:/)).toBeNull();
  });

  it("says when the premium ones are examples", async () => {
    await gallery(ready(true));
    expect(screen.getByText(/Examples: the Crust store isn't open yet/)).toBeTruthy();
  });

  it("shows one quiet line offline, and nothing before the store exists", async () => {
    await gallery({ kind: "offline" });
    expect(screen.getByText("Premium templates show here when you're online.")).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Premium" })).toBeNull();
    cleanup();
    await gallery({ kind: "none" });
    expect(screen.queryByText(/Premium/)).toBeNull();
  });

  it("previews a premium template with the store's pictures at three widths", async () => {
    await gallery(ready());
    fireEvent.click(screen.getByRole("button", { name: /^Olive ?, premium, US\$49\./ }));
    expect(screen.getByRole("heading", { level: 1, name: "Olive" })).toBe(document.activeElement);
    const nav = screen.getByRole("navigation", { name: "Pages in Olive" });
    expect(within(nav).getByRole("button", { name: "Home /" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("img", { name: "Olive home page at desktop width" }).getAttribute("src")).toBe("https://store.crust.example/pics/olive-desktop.jpg");
    fireEvent.click(screen.getByRole("button", { name: "Phone" }));
    expect(screen.getByRole("img").getAttribute("src")).toBe("https://store.crust.example/pics/olive-phone.jpg");
    // The Menu page has only a desktop picture.
    fireEvent.click(within(nav).getByRole("button", { name: "Menu /menu" }));
    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.getByText("There's no picture of this page at phone width.")).toBeTruthy();
  });

  it("buys in the browser: a link on the web, the app's own command in the app", async () => {
    await gallery(ready());
    fireEvent.click(screen.getByRole("button", { name: /^Olive ?, premium, US\$49\./ }));
    const get = screen.getByRole("link", { name: /Get this template · US\$49 \(opens in your browser\)/ });
    expect(get.getAttribute("href")).toBe("https://store.crust.example/templates/olive/");
    expect(get.getAttribute("target")).toBe("_blank");
    expect(get.getAttribute("rel")).toContain("noopener");

    const invoke = vi.fn(async () => null);
    setSitesInvoke(invoke);
    const click = new MouseEvent("click", { bubbles: true, cancelable: true });
    get.dispatchEvent(click);
    expect(click.defaultPrevented).toBe(true);
    expect(invoke).toHaveBeenCalledWith("open_link", { url: "https://store.crust.example/templates/olive/" });
  });

  it("goes back to the premium card, and opens a bought file from the preview", async () => {
    await gallery(ready());
    fireEvent.click(screen.getByRole("button", { name: /^Olive ?, premium, US\$49\./ }));
    fireEvent.click(screen.getByRole("button", { name: /All templates/ }));
    await act(async () => undefined);
    expect(document.activeElement).toBe(screen.getByRole("button", { name: /^Olive ?, premium, US\$49\./ }));

    fireEvent.click(screen.getByRole("button", { name: /^Olive ?, premium, US\$49\./ }));
    const site = { name: "Olive Kitchen", language: "en" };
    const source: TemplateSource = {
      site,
      tokens: defaultTokens,
      chrome: migrateChrome({ ...site }, [{ path: "/", title: "Home" }]),
      pages: [{ path: "/", title: "Home", description: "Welcome.", puck: { root: { props: {} }, content: [{ type: "Heading", props: { id: "h", text: "Olive", level: "h1", align: "left" } }] } }],
      sections: [],
      layouts: [],
      blog: { title: "News", intro: "" },
      posts: [],
      media: [],
    };
    const { template } = await makeTemplate({ name: "Olive", description: "Bought." }, source, async () => "");
    expect(config.components).toBeTruthy();
    const bought = new File([JSON.stringify(template)], "olive.crust");
    await act(async () => {
      fireEvent.change(screen.getByLabelText("Already bought it? Open the file"), { target: { files: [bought] } });
      await new Promise((r) => setTimeout(r, 0));
    });
    // The bought template opens like any template file: ready to use.
    expect(screen.getByRole("button", { name: "Use this template" })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 1, name: "Olive" })).toBeTruthy();
  });
});

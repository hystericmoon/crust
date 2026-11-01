/**
 * F062: premium templates in the gallery. The Crust store (Milestone 7,
 * F063) publishes a catalogue file listing its templates: name, price, the
 * store page to buy it, and pictures of its pages at desktop, tablet and
 * phone width. The gallery reads it each time it opens; without internet
 * (or before the store exists) it shows the free starters only.
 *
 * The file comes from outside, so it's read strictly: unknown fields are
 * dropped, links must be secure web addresses, a picture without a
 * description isn't shown, and a template with nothing to show is left out.
 */

export type PreviewWidth = "desktop" | "tablet" | "phone";
export const PREVIEW_WIDTHS: PreviewWidth[] = ["desktop", "tablet", "phone"];

export interface CataloguePicture {
  width: PreviewWidth;
  src: string;
  alt: string;
}

export interface CataloguePage {
  title: string;
  path: string;
  pictures: CataloguePicture[];
}

export interface CatalogueTemplate {
  id: string;
  name: string;
  description: string;
  /** What kind of business it's for ("Restaurant"). */
  kind: string;
  /** As the store shows it ("US$49"). */
  price: string;
  /** The store's page for this template, where it's bought. */
  url: string;
  pages: CataloguePage[];
}

export interface Catalogue {
  templates: CatalogueTemplate[];
  /** True for the example catalogue shown before the store opens. */
  examples?: boolean;
}

/**
 * The store's catalogue. None until the store exists (F063 sets it): an
 * address nobody controls yet could serve anything, so the app doesn't
 * guess one. Tests and the builder check set `__CRUST_CATALOGUE_URL__`.
 */
export const STORE_CATALOGUE_URL: string | null = null;

/** The example catalogue (`#/templates?examples`), so the gallery can be tried before the store opens. */
export const EXAMPLE_CATALOGUE_PATH = "sample-catalogue/catalogue.json";

export const MAX_TEMPLATES = 60;
const MAX_PAGES = 12;
const MAX_TEXT = 300;
const MAX_NAME = 60;
const MAX_PRICE = 20;

const text = (v: unknown, max: number): string | null => {
  if (typeof v !== "string") return null;
  const t = v.replace(/\s+/g, " ").trim();
  return t && [...t].length <= max ? t : null;
};

/**
 * A link from the catalogue, made absolute: a secure (https) web address,
 * or one on the catalogue's own site (so a local example works too).
 */
export function catalogueLink(v: unknown, base: string): string | null {
  if (typeof v !== "string" || !v.trim()) return null;
  let url: URL;
  let from: URL;
  try {
    from = new URL(base);
    url = new URL(v.trim(), from);
  } catch {
    return null;
  }
  if (url.username || url.password) return null;
  if (url.protocol === "https:" || url.origin === from.origin) return url.href;
  return null;
}

/** Reads a catalogue file; null if it isn't one. Bad entries are left out, not fatal. */
export function readCatalogue(json: unknown, base: string): Catalogue | null {
  if (!json || typeof json !== "object") return null;
  const file = json as Record<string, unknown>;
  if (file.format !== "crust-catalogue" || file.version !== 1 || !Array.isArray(file.templates)) return null;
  const seen = new Set<string>();
  const templates: CatalogueTemplate[] = [];
  for (const raw of file.templates.slice(0, MAX_TEMPLATES)) {
    const t = readTemplate(raw, base);
    if (t && !seen.has(t.id)) {
      seen.add(t.id);
      templates.push(t);
    }
  }
  return { templates };
}

function readTemplate(raw: unknown, base: string): CatalogueTemplate | null {
  if (!raw || typeof raw !== "object") return null;
  const t = raw as Record<string, unknown>;
  const id = typeof t.id === "string" && /^[a-z0-9][a-z0-9-]{0,59}$/.test(t.id) ? t.id : null;
  const name = text(t.name, MAX_NAME);
  const price = text(t.price, MAX_PRICE);
  const url = catalogueLink(t.url, base);
  if (!id || !name || !price || !url) return null;
  const pages: CataloguePage[] = [];
  for (const p of Array.isArray(t.pages) ? t.pages.slice(0, MAX_PAGES) : []) {
    const page = readPage(p, base);
    if (page && !pages.some((x) => x.path === page.path)) pages.push(page);
  }
  // Nothing to look at: not worth a card.
  if (!pages.length) return null;
  pages.sort((a, b) => (a.path === "/" ? -1 : b.path === "/" ? 1 : 0));
  return { id, name, price, url, description: text(t.description, MAX_TEXT) ?? "", kind: text(t.kind, MAX_NAME) ?? "", pages };
}

function readPage(raw: unknown, base: string): CataloguePage | null {
  if (!raw || typeof raw !== "object") return null;
  const p = raw as Record<string, unknown>;
  const title = text(p.title, MAX_NAME);
  const path = typeof p.path === "string" && /^\/[a-z0-9/-]*$/.test(p.path) && p.path.length <= 100 ? p.path : null;
  if (!title || !path) return null;
  const pictures: CataloguePicture[] = [];
  for (const raw of Array.isArray(p.pictures) ? p.pictures : []) {
    if (!raw || typeof raw !== "object") continue;
    const pic = raw as Record<string, unknown>;
    const width = PREVIEW_WIDTHS.find((w) => w === pic.width);
    const src = catalogueLink(pic.src, base);
    // A picture without a description isn't shown (WCAG 1.1.1).
    const alt = text(pic.alt, MAX_TEXT);
    if (width && src && alt && !pictures.some((x) => x.width === width)) pictures.push({ width, src, alt });
  }
  return pictures.length ? { title, path, pictures } : null;
}

/** What the gallery knows about premium templates. */
export type CatalogueState =
  /** No store yet: nothing to show, nothing to say. */
  | { kind: "none" }
  | { kind: "loading" }
  /** Couldn't reach the store (usually no internet). */
  | { kind: "offline" }
  | { kind: "ready"; catalogue: Catalogue };

type Fetch = (url: string, init?: RequestInit) => Promise<Response>;

/** Loads a catalogue; "offline" if it can't be reached or read in time. */
export async function loadCatalogue(url: string, fetcher: Fetch = fetch, timeoutMs = 8000): Promise<CatalogueState> {
  const controller = typeof AbortController === "function" ? new AbortController() : null;
  const timer = setTimeout(() => controller?.abort(), timeoutMs);
  try {
    const res = await fetcher(url, { signal: controller?.signal, cache: "no-cache", credentials: "omit" });
    if (!res.ok) return { kind: "offline" };
    const catalogue = readCatalogue(await res.json(), res.url || url);
    return catalogue ? { kind: "ready", catalogue } : { kind: "offline" };
  } catch {
    return { kind: "offline" };
  } finally {
    clearTimeout(timer);
  }
}

/** Where this gallery reads the catalogue from: the examples, a test address, the store, or nowhere. */
export function catalogueSource(hash: string, pageUrl: string): { url: string; examples: boolean } | null {
  const query = hash.includes("?") ? hash.slice(hash.indexOf("?") + 1) : "";
  if (new URLSearchParams(query).has("examples")) {
    return { url: new URL(EXAMPLE_CATALOGUE_PATH, new URL("/", pageUrl)).href, examples: true };
  }
  const forced = (globalThis as { __CRUST_CATALOGUE_URL__?: unknown }).__CRUST_CATALOGUE_URL__;
  if (typeof forced === "string" && forced) return { url: forced, examples: false };
  return STORE_CATALOGUE_URL ? { url: STORE_CATALOGUE_URL, examples: false } : null;
}

/** The gallery's premium templates, as they load. */
export async function premiumTemplates(hash: string, pageUrl: string, fetcher: Fetch = fetch): Promise<CatalogueState> {
  const source = catalogueSource(hash, pageUrl);
  if (!source) return { kind: "none" };
  const state = await loadCatalogue(source.url, fetcher);
  return state.kind === "ready" && source.examples ? { kind: "ready", catalogue: { ...state.catalogue, examples: true } } : state;
}

/** The picture for a page at a width, or the nearest width it has. */
export function pictureFor(page: CataloguePage, width: PreviewWidth): CataloguePicture | null {
  return page.pictures.find((p) => p.width === width) ?? null;
}

/** The card's small picture: the Home page at desktop width, or what there is. */
export function cardPicture(t: CatalogueTemplate): CataloguePicture | null {
  const home = t.pages[0];
  return home ? (pictureFor(home, "desktop") ?? home.pictures[0] ?? null) : null;
}

/** "Olive, premium, US$49": how a premium card is read out (its visible name first). */
export const premiumLabel = (t: CatalogueTemplate) => `${t.name}, premium, ${t.price}`;

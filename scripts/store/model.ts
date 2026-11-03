/**
 * F063: the Crust template store. A Crust site of its own (store/content/),
 * written from the list of templates for sale (store/list.json) and the
 * template files themselves, so a template's page always says what's really
 * in it. Snapshot: design/f063-store-site-v1.html (A on every choice).
 *
 *   store/list.json         what's for sale: id, template file, kind, price,
 *                           which pages to show, (priced) buy link + licence
 *   store/content/          the store as a normal content folder: site.json,
 *                           pages/*.json, media/ (pictures of each template)
 *   catalogue.json          written at publish time for the app's gallery
 *                           (F062): priced templates only, the free ones are
 *                           already in the app
 *
 * Nothing here touches the disk: build.ts, pictures.ts and catalogue.ts do.
 */
import { readTemplate, type MediaItem, type Page, type RichText, type Site, type Template, config } from "@crust/blocks";
import { kit, type Block } from "../starter-templates/kit";
import { lookTokens } from "../starter-templates/starter";
import { DOWNLOADS_URL } from "../updates-site";
import { demoPath } from "./demos";
import { buyLinkProblem, checkoutLine, checkoutUrl, readCheckout, testNote, THANKS_PATH, type Checkout } from "./checkout";

export const STORE_FORMAT = "crust-store";
/** The store's own address: its free Cloudflare Pages project, "crust-store". */
export const STORE_URL = "https://crust-store.pages.dev";
export const STORE_PROJECT = "crust-store";
/** Where the app reads the catalogue (apps/admin/src/templates/catalogue.ts says the same). */
export const CATALOGUE_FILE = "catalogue.json";
export const FREE = "Free";

export type PictureWidth = "desktop" | "tablet" | "phone";
/** Screen sizes the pictures are taken at, and how much of the page they show. */
/** `scale` 2 takes the picture as a sharp phone screen does (so photos chosen for phones look as they would there). */
/** `screen` is the window's height (a full-height opening fills it); the picture shows `height` of the page. */
export const PICTURE_SIZES: Record<PictureWidth, { width: number; height: number; screen: number; scale: 1 | 2 }> = {
  desktop: { width: 1280, height: 1600, screen: 800, scale: 1 },
  tablet: { width: 768, height: 1536, screen: 1024, scale: 1 },
  phone: { width: 390, height: 1170, screen: 844, scale: 2 },
};
export const PICTURE_WIDTHS = Object.keys(PICTURE_SIZES) as PictureWidth[];

export interface StoreItem {
  /** Lowercase letters, numbers and dashes; the page is /templates/<id>. */
  id: string;
  /** The template file, from the repository root ("templates/harbour.crust"). */
  file: string;
  /** Who it's for, shown on cards ("Architects, interiors and studios"). */
  kind: string;
  /** "Free", or a price as shown ("US$49"). */
  price: string;
  /** The template's pages to show pictures of, Home first. 1 to 4. */
  show: string[];
  /** Priced only: where "Get this template" goes (the checkout, F066). */
  buy?: string;
  /** Priced only: the licence in one or two plain sentences (F068 adds the full pages). */
  licence?: string;
  /** F065 (optional): what changed in the template's current release, 1 to 5 short lines. */
  changes?: string[];
}

export interface StoreList {
  templates: StoreItem[];
  /** F066 (optional): the payment company and test or live mode (checkout.ts). */
  checkout?: Checkout;
}

const ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const PRICE = /^(Free|[A-Z]{0,3}[$€£¥]\d+(\.\d\d)?)$/;
const MAX_TEXT = 120;

const isPriced = (item: Pick<StoreItem, "price">) => item.price !== FREE;
export { isPriced };

/** Reads store/list.json. Any problem refuses the whole list, with plain reasons. */
export function readStoreList(text: string): { list: StoreList | null; problems: string[] } {
  const problems: string[] = [];
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { list: null, problems: ["store/list.json isn't valid JSON."] };
  }
  const r = raw as { format?: unknown; version?: unknown; templates?: unknown; checkout?: unknown };
  if (!r || typeof r !== "object" || r.format !== STORE_FORMAT || r.version !== 1) {
    return { list: null, problems: [`store/list.json should start with "format": "${STORE_FORMAT}", "version": 1.`] };
  }
  if (!Array.isArray(r.templates) || r.templates.length === 0) {
    return { list: null, problems: ["store/list.json lists no templates."] };
  }
  const seen = new Set<string>();
  const templates: StoreItem[] = [];
  // F066: with a checkout setting, every buy link must be that company's link for that mode.
  const { checkout, problems: checkoutProblems } = readCheckout(r.checkout);
  problems.push(...checkoutProblems);
  r.templates.forEach((t: unknown, i: number) => {
    const x = (t ?? {}) as Record<string, unknown>;
    const where = typeof x.id === "string" && x.id ? `“${x.id}”` : `Template ${i + 1}`;
    const str = (k: string) => (typeof x[k] === "string" ? (x[k] as string).trim() : "");
    const id = str("id");
    if (!ID.test(id)) problems.push(`${where}: the id should be lowercase letters, numbers and dashes.`);
    else if (seen.has(id)) problems.push(`${where} is listed twice.`);
    seen.add(id);
    const file = str("file");
    if (!/^templates\/[a-z0-9-]+\.crust$/.test(file)) problems.push(`${where}: the file should be templates/<name>.crust.`);
    const kind = str("kind");
    if (!kind || kind.length > MAX_TEXT) problems.push(`${where}: say who it's for in "kind" (at most ${MAX_TEXT} characters).`);
    const price = str("price");
    if (!PRICE.test(price)) problems.push(`${where}: the price should be "Free" or like "US$49".`);
    const show = Array.isArray(x.show) ? x.show.filter((p): p is string => typeof p === "string") : [];
    if (show.length < 1 || show.length > 4 || show[0] !== "/") problems.push(`${where}: "show" should list 1 to 4 page addresses, starting with "/".`);
    if (new Set(show).size !== show.length) problems.push(`${where}: "show" lists a page twice.`);
    const item: StoreItem = { id, file, kind, price, show };
    // F065: what changed in the current release, shown in the app's quiet update note.
    if (x.changes !== undefined) {
      const changes = Array.isArray(x.changes) ? x.changes : [];
      if (!changes.length || changes.length > 5 || !changes.every((c) => typeof c === "string" && c.trim() && c.length <= 300)) problems.push(`${where}: "changes" should be 1 to 5 short lines (at most 300 characters each).`);
      else item.changes = changes.map((c) => (c as string).trim());
    }
    if (PRICE.test(price) && price !== FREE) {
      const buy = str("buy");
      const licence = str("licence");
      if (!/^https:\/\/[^\s"'<>]+$/.test(buy)) problems.push(`${where} has a price, so it needs a "buy" link (https://…) before the store can sell it.`);
      else if (checkout) {
        const problem = buyLinkProblem(where, buy, checkout);
        if (problem) problems.push(problem);
      }
      if (!licence || licence.length > 400) problems.push(`${where} has a price, so it needs its licence in "licence" (one or two sentences).`);
      item.buy = buy;
      item.licence = licence;
    }
    templates.push(item);
  });
  return problems.length ? { list: null, problems } : { list: { templates, ...(checkout ? { checkout } : {}) }, problems: [] };
}

/** A listed template with its file read. */
export interface StoreTemplate {
  item: StoreItem;
  template: Template;
}

/** Reads each listed template file through the template reader. */
export function readStoreTemplates(list: StoreList, readFile: (path: string) => string | null): { templates: StoreTemplate[]; problems: string[] } {
  const problems: string[] = [];
  const templates: StoreTemplate[] = [];
  for (const item of list.templates) {
    const text = readFile(item.file);
    if (text === null) {
      problems.push(`“${item.id}”: ${item.file} isn't there.`);
      continue;
    }
    const read = readTemplate(text, config.components);
    if (!read.template) {
      problems.push(`“${item.id}”: ${item.file} doesn't open (${read.problems.join(" ")}).`);
      continue;
    }
    for (const path of item.show) {
      if (!read.template.pages.some((p) => p.path === path)) problems.push(`“${item.id}”: ${read.template.name} has no page at ${path}.`);
    }
    // F065: a file that names its id must be listed under that id; a priced one needs a release so the app can tell buyers about updates.
    if (read.template.id && read.template.id !== item.id) problems.push(`“${item.id}”: ${item.file} says it is “${read.template.id}”.`);
    if (item.buy && !read.template.release) problems.push(`“${item.id}”: a priced template needs an id and release number in its file (see F065).`);
    templates.push({ item, template: read.template });
  }
  return { templates, problems };
}

/** The first family of a CSS font list: "'Fraunces', Georgia, serif" → "Fraunces". */
export function firstFamily(list: string): string {
  return (list.split(",")[0] ?? "").trim().replace(/^['"]|['"]$/g, "");
}

/** What's in a template, counted from the file itself. */
export interface TemplateFacts {
  pages: string[];
  posts: number;
  designs: string[];
  fonts: string[];
  photos: number;
  linkedSections: number;
}

export function templateFacts(t: Template): TemplateFacts {
  const fonts = [...new Set([firstFamily(t.tokens.fonts.heading), firstFamily(t.tokens.fonts.body)].filter(Boolean))];
  const names: Record<string, string> = { post: "post page", blog: "blog page", notFound: "“Page not found”" };
  return {
    pages: t.pages.map((p) => p.title),
    posts: t.posts.length,
    designs: (t.designs ?? []).map((d) => names[d.kind] ?? d.kind),
    fonts,
    photos: t.media.length,
    linkedSections: t.sections.length,
  };
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
/** "a, b and c" */
export function listOf(words: string[]): string {
  return words.length < 2 ? (words[0] ?? "") : `${words.slice(0, -1).join(", ")} and ${words[words.length - 1]}`;
}

/** The "What's included" lines on a template's page. */
export function includedLines(f: TemplateFacts): string[] {
  return [
    `${plural(f.pages.length, "page")}: ${listOf(f.pages)}`,
    ...(f.posts ? [`A blog with ${plural(f.posts, "finished post")}`] : []),
    ...(f.designs.length ? [`Designs for the ${listOf(f.designs)}`] : []),
    ...(f.fonts.length ? [`${f.fonts.length === 1 ? "Font" : "Fonts"}: ${listOf(f.fonts)}, included with Crust`] : []),
    ...(f.photos ? [`${plural(f.photos, "photo")} to swap for your own`] : []),
    ...(f.linkedSections ? [`${plural(f.linkedSections, "shared section")}, edited once for every page`] : []),
    "Header, footer and colours set up in Site settings",
  ];
}

/** "/" → "home", "/about/team" → "about-team" */
export const pageSlug = (path: string) => (path === "/" ? "home" : path.replace(/^\/|\/$/g, "").replace(/\//g, "-"));
/** The picture of a template's page at a width, in the store's media library. */
export const pictureFile = (id: string, path: string, width: PictureWidth) => `${id}-${pageSlug(path)}-${width}.jpg`;
export function pictureAlt(name: string, pageTitle: string, width: PictureWidth): string {
  const on = width === "phone" ? "on a phone" : width === "tablet" ? "on a tablet" : "on a computer screen";
  return `The ${name} template's ${pageTitle} page ${on}`;
}

/** Every picture the store needs, with its media library entry (for pictures.ts and the checks). */
export function picturesNeeded(templates: StoreTemplate[]): (MediaItem & { id: string; path: string; widthName: PictureWidth })[] {
  return templates.flatMap(({ item, template }) =>
    item.show.flatMap((path) => {
      const title = template.pages.find((p) => p.path === path)?.title ?? path;
      return PICTURE_WIDTHS.map((w) => ({
        file: pictureFile(item.id, path, w),
        alt: pictureAlt(template.name, title, w),
        width: PICTURE_SIZES[w].width * PICTURE_SIZES[w].scale,
        height: PICTURE_SIZES[w].height * PICTURE_SIZES[w].scale,
        bytes: 0,
        uploadedAt: "2026-11-03T00:00:00.000Z",
        focus: { x: 50, y: 0 },
        id: item.id,
        path,
        widthName: w,
      }));
    }),
  );
}

/** Takes the "to replace" marks off: the store's words are its own, not samples. */
function unmark<T>(value: T): T {
  if (Array.isArray(value)) return value.map(unmark) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).filter(([k]) => k !== "placeholder").map(([k, v]) => [k, unmark(v)])) as T;
  }
  return value;
}

const media = (file: string) => `/media/${file}`;
const templatePath = (id: string) => `/templates/${id}`;
const priceLabel = (item: StoreItem) => (isPriced(item) ? item.price : "Free with Crust");
const HELP_OPEN = "/help#questions";

function cards(k: ReturnType<typeof kit>, templates: StoreTemplate[], all: ReturnType<typeof picturesNeeded>, level: "h2" | "h3" = "h3"): Block {
  return k.raw("Grid", {
    columns: "3",
    titleLevel: level,
    background: "background",
    items: templates.map(({ item, template }) => {
      const pic = all.find((p) => p.id === item.id && p.path === "/" && p.widthName === "desktop")!;
      return {
        title: template.name,
        text: `${item.kind}. ${priceLabel(item)}.`,
        imageSrc: media(pic.file),
        imageAlt: pic.alt,
        linkLabel: `See ${template.name}`,
        linkHref: templatePath(item.id),
      };
    }),
  });
}

const page = (path: string, title: string, description: string, content: Block[]): Page => ({ path, title, description, puck: { root: { props: {} }, content: unmark(content) } });

function homePage(templates: StoreTemplate[], pics: ReturnType<typeof picturesNeeded>): Page {
  const k = kit("home");
  return page("/", "Templates for Crust", "Whole websites for Crust, the free website builder: pick a template, open it in Crust and make it yours.", [
    k.section("background", [
      k.h1("Whole websites, ready for your words.", { eyebrow: "Templates for Crust", mark: false }),
      k.text("Pick a template, open it in the free Crust app and make it yours. Every page, post and photo is ready to change.", { tone: "muted" }),
      k.spacer("xs"),
      k.columns([[k.button("See all templates", "/templates")], [k.button("Download Crust", "/download", "arrow")]], { gap: "sm", widths: "one-three", valign: "middle" }),
    ], { paddingY: "xl" }),
    k.section("background", [
      k.columns([[k.heading("The templates", { mark: false })], [k.link("All templates", "/templates", "right")]], { widths: "two-one", valign: "bottom", gap: "sm" }),
      cards(k, templates, pics),
    ], { paddingY: "md" }),
    k.section("surface", [
      k.columns([
        [k.heading("From template to live site", { mark: false, eyebrow: "How it works" })],
        [k.steps([
          "Choose a template here and look through its pages.",
          "Open it in Crust: Pages → Start from a template.",
          "Replace the words and photos with your own, then publish.",
        ])],
      ], { widths: "one-two", gap: "xl" }),
    ], { paddingY: "xl" }),
    k.section("background", [
      k.columns([
        [k.heading("Crust is free", { mark: false }), k.text("A website builder for Mac and Windows. Design with blocks, publish plain, fast pages to the host you choose. No account, no monthly fee.")],
        [k.button("Download Crust", "/download", "primary", { align: "right" })],
      ], { widths: "two-one", valign: "middle", gap: "lg" }),
    ], { paddingY: "xl" }),
  ]);
}

function allPage(templates: StoreTemplate[], pics: ReturnType<typeof picturesNeeded>): Page {
  const k = kit("all");
  return page("/templates", "All templates", "Every template for Crust, with who it's for and what it costs.", [
    k.section("background", [
      k.h1("All templates", { mark: false }),
      k.text(`${templates.length === 1 ? "One template" : `${templates.length} templates`}, each written for one kind of business. Free ones come with Crust; more are on the way.`),
      k.spacer("sm"),
      cards(k, templates, pics, "h2"),
    ], { paddingY: "xl" }),
  ]);
}

/** F066: under a buy button, the test note (test mode only) and who takes the payment. */
function afterBuy(k: ReturnType<typeof kit>, checkout: Checkout | null): Block[] {
  if (!checkout) return [];
  const note = testNote(checkout);
  return [
    ...(note ? [k.text({ rich: 1, blocks: [{ type: "p", children: [{ text: note[0], bold: true }, { text: note[1] }] }] } as RichText, { tone: "default" })] : []),
    k.text(checkoutLine(checkout), { tone: "muted" }),
  ];
}

function templatePage(st: StoreTemplate, others: StoreTemplate[], pics: ReturnType<typeof picturesNeeded>, checkout: Checkout | null = null): Page {
  const { item, template } = st;
  const k = kit(`t-${item.id}`);
  const mine = pics.filter((p) => p.id === item.id);
  const facts = templateFacts(template);
  const titleOf = (path: string) => template.pages.find((p) => p.path === path)?.title ?? path;
  const desktop = item.show.map((path) => mine.find((p) => p.path === path && p.widthName === "desktop")!);
  const phone = item.show.map((path) => mine.find((p) => p.path === path && p.widthName === "phone")!);
  // F066: the button goes to the payment company's checkout, tagged with the template's id.
  const buyButton = () => k.button(`Get ${template.name} · ${item.price}`, checkoutUrl(item.buy!, item.id, checkout), "primary");
  const buy = isPriced(item)
    ? [buyButton(), ...afterBuy(k, checkout)]
    : [k.text("It's already in the app: open Crust and choose Pages → Start from a template.", { tone: "muted" }), k.button("How to open it", HELP_OPEN, "secondary")];
  // F064: the demo is published under the store by demos-build.ts.
  const demo = (): Block => k.button("Try the live demo", `${demoPath(item.id)}/`, "secondary", { icon: "external-link" });
  const licence = isPriced(item) ? item.licence! : "Free with Crust. Use it for as many sites as you like.";
  return page(templatePath(item.id), `${template.name} template`, `${template.name}: ${template.description}`.slice(0, 300), [
    k.section("background", [
      k.h1(template.name, { eyebrow: item.kind, mark: false }),
      k.text(template.description, { tone: "default" }),
      // On phones the details column comes after the pictures, so the price and next step are also here.
      ...[
        k.text(isPriced(item) ? item.price : "Free with Crust", { tone: "default" }),
        ...(isPriced(item) ? [buyButton(), ...afterBuy(k, checkout)] : [k.button("How to open it", HELP_OPEN, "secondary")]),
        demo(),
      ].map((b) => ({ ...b, props: { ...b.props, hideOn: ["desktop", "tablet"] } }) as Block),
    ], { paddingY: "lg" }),
    k.section("background", [
      k.columns([
        desktop.flatMap((p, i) => [
          k.raw("Image", { src: media(p.file), alt: p.alt, caption: `${titleOf(item.show[i]!)} page` }),
          ...(i < desktop.length - 1 ? [k.spacer("sm")] : []),
        ]),
        [
          k.heading(item.price === FREE ? "Free" : item.price, { eyebrow: "Price", mark: false }),
          ...buy,
          demo(),
          k.divider("line", { space: "sm" }),
          k.heading("What's included", { level: "h3", mark: false }),
          k.raw("IconList", { icon: "check", iconColor: "primary", items: includedLines(facts).map((text) => ({ text })) }),
          k.heading("Licence", { level: "h3", mark: false }),
          k.text(licence),
        ],
      ], { widths: "two-one", gap: "xl", sticky: 2, highlight: { column: 2, style: "surface" }, box: { style: "none", padding: "md", rounded: true } }),
    ], { paddingY: "sm" }),
    k.section("surface", [
      k.heading("On a phone", { mark: false }),
      k.raw("Gallery", { columns: phone.length >= 3 ? "3" : phone.length === 2 ? "2" : "3", shape: "original", lightbox: "yes", images: phone.map((p, i) => ({ src: media(p.file), alt: p.alt, caption: `${titleOf(item.show[i]!)} page` })) }),
    ], { paddingY: "xl" }),
    ...(others.length
      ? [k.section("background", [k.heading("Other templates", { mark: false }), cards(k, others, pics)], { paddingY: "xl" })]
      : []),
  ]);
}

function downloadPage(): Page {
  const k = kit("download");
  return page("/download", "Download Crust", "Crust is a free website builder for Mac and Windows. Download it, then open any template from the store.", [
    k.section("background", [
      k.h1("Download Crust", { eyebrow: "Free for Mac and Windows", mark: false }),
      k.text("Crust is a website builder that runs on your computer. Your site stays in a folder you own, and you publish it when you're ready.", { tone: "default" }),
      k.spacer("xs"),
      k.button("Go to the downloads", DOWNLOADS_URL, "primary", { icon: "download" }),
      k.text("The downloads page has the newest version for each kind of computer, with what's new.", { tone: "muted" }),
    ], { paddingY: "xl", width: "narrow" }),
    k.section("surface", [
      k.heading("What you get", { mark: false }),
      k.raw("IconList", {
        icon: "check",
        iconColor: "primary",
        items: [
          "Design pages with blocks: sections, columns, photos, galleries, prices, maps and more.",
          "Set colours, fonts and spacing once in Site settings; every page follows.",
          "Publish plain, fast pages to Cloudflare Pages, Netlify, or any host by FTP or SFTP.",
          "Three free templates to start from, and every template from this store.",
          "No account and no monthly fee.",
        ].map((text) => ({ text })),
      }),
    ], { paddingY: "xl", width: "narrow" }),
  ]);
}

function helpPage(): Page {
  const k = kit("help");
  const qa: [string, string][] = [
    ["How do I open a template?", "In Crust, choose Pages → Start from a template. Free templates are listed there. A template you bought is a .crust file: choose Open a file and pick it."],
    ["Will a template replace my site?", "Starting from a template replaces your pages, posts, look, header and footer with the template's. Your site's address stays. If you change your mind, Bring back my previous site undoes it in one step."],
    ["Can I change everything?", "Yes: every word, photo, colour, font and page. The template's sample words and photos are marked To replace, and Crust won't publish while any are left, so nothing made up goes live by accident."],
    ["Do I need to know code?", "No. You edit pages by clicking, with a panel of settings beside each block. Everything also works with the keyboard."],
    ["Where does my site go live?", "Where you choose: Cloudflare Pages or Netlify (both have free plans), or any web host by FTP or SFTP. Crust publishes plain pages that load fast."],
    ["Is Crust really free?", "Yes. The app and its free templates cost nothing. Some templates in this store will have a price; the free ones stay free."],
  ];
  return page("/help", "Help", "Answers about Crust templates: opening one, changing it, and publishing your site.", [
    k.section("background", [
      k.h1("Help", { mark: false }),
      k.text("Short answers about templates and Crust."),
      k.spacer("sm"),
      k.raw("Accordion", { anchor: "questions", firstOpen: "no", oneAtATime: "no", items: qa.map(([question, answer]) => ({ question, answer })) }),
    ], { paddingY: "xl", width: "narrow" }),
  ]);
}

/**
 * F066: where buyers land after paying (the "success" address set in the
 * payment company's dashboard). Kept out of search engines: it's only
 * useful straight after a purchase.
 */
function thanksPage(checkout: Checkout | null): Page {
  const k = kit("thanks");
  const note = testNote(checkout);
  return {
    ...page(THANKS_PATH, "Thank you", "Your template is on its way by email.", [
      k.section("background", [
        k.h1("Thanks, it's yours.", { eyebrow: note ? "Test order" : "Order complete", mark: false }),
        k.text(
          note
            ? "That was a test order: no money was taken. In live mode, this is where buyers land after paying."
            : "Your payment went through and the receipt is on its way. We're also emailing you a personal download link for your template. It can take a few minutes; if it doesn't arrive, check your spam folder.",
          { tone: "default" },
        ),
        k.spacer("xs"),
        k.heading("Then open it in Crust", { level: "h2", mark: false }),
        k.raw("IconList", {
          icon: "numbers",
          numberStyle: "circle",
          items: [
            "Download the template file from the link in the email. The link keeps working, so you can come back for updates.",
            "Open Crust and choose Pages → Start from a template → Open a file.",
            "Pick the file. Replace the words and photos with your own, then publish.",
          ].map((text) => ({ text })),
        }),
        k.spacer("xs"),
        k.columns([[k.button("Download Crust", "/download", "primary")], [k.button("Help", "/help", "secondary")]], { gap: "sm", widths: "one-two", valign: "middle" }),
      ], { paddingY: "xl", width: "narrow" }),
    ]),
    seo: { noindex: true },
  };
}

/** The store's site.json. */
export function storeSite(templates: StoreTemplate[]): Site {
  return {
    name: "Crust",
    baseUrl: STORE_URL,
    language: "en",
    tokens: lookTokens({ look: { id: "studio", variation: "paper" }, motion: "subtle" }),
    header: {
      show: true,
      logo: { text: "Crust", imageSrc: "", imageAlt: "" },
      menu: [
        { label: "Templates", href: "/templates" },
        { label: "Help", href: "/help" },
      ],
      cta: { label: "Download Crust", href: "/download" },
      sticky: false,
      style: "background",
      layout: "classic",
    },
    footer: {
      show: true,
      text: "Crust is a free website builder that publishes plain, fast pages. These templates are made for it.",
      columns: [
        { title: "Store", links: [{ label: "All templates", href: "/templates" }, { label: "Download Crust", href: "/download" }, { label: "Help", href: "/help" }] },
        { title: "Templates", links: templates.map(({ item, template }) => ({ label: template.name, href: templatePath(item.id) })) },
      ],
      copyright: "© {year} {name}",
      style: "surface",
    },
  };
}

/** Every store page, from the list and the template files (F066: and the checkout setting). */
export function storePages(templates: StoreTemplate[], checkout: Checkout | null = null): Page[] {
  const pics = picturesNeeded(templates);
  return [
    homePage(templates, pics),
    allPage(templates, pics),
    ...templates.map((t) => templatePage(t, templates.filter((o) => o !== t), pics, checkout)),
    downloadPage(),
    helpPage(),
    // F066: only once something is for sale.
    ...(templates.some(({ item }) => isPriced(item)) ? [thanksPage(checkout)] : []),
  ];
}

/** The page's file name in store/content/pages/. */
export const pageFileName = (p: Page) => (p.path === "/" ? "index.json" : `${p.path.slice(1).replace(/\//g, "-")}.json`);

/** The catalogue the app's gallery reads (format in docs/spec.md): priced templates only. */
export function storeCatalogue(templates: StoreTemplate[], baseUrl = STORE_URL) {
  const pics = picturesNeeded(templates);
  return {
    format: "crust-catalogue",
    version: 1,
    templates: templates
      .filter(({ item }) => isPriced(item))
      .map(({ item, template }) => ({
        id: item.id,
        name: template.name,
        description: template.description.slice(0, 300),
        kind: item.kind,
        price: item.price,
        url: `${baseUrl}${templatePath(item.id)}/`,
        ...(template.release ? { version: template.release, changes: item.changes ?? [] } : {}),
        pages: item.show.map((path) => ({
          title: template.pages.find((p) => p.path === path)?.title ?? path,
          path,
          pictures: pics.filter((p) => p.id === item.id && p.path === path).map((p) => ({ width: p.widthName, src: `media/${p.file}`, alt: p.alt })),
        })),
      })),
  };
}

import { config, HEADER_V2_CSS, needsHeaderV2Css, ICONS_CSS, needsIconCss, BLOCKS_V3_CSS, needsBlocksV3Css, hasVideoEmbed, VIDEO_EMBED_SCRIPT, INTERACTIVE_CSS, needsInteractiveCss, hasMapEmbed, interactiveTags, motionCss, heroStyle, hasDropdowns, DROPDOWN_SCRIPT, layoutOf, CONTACT_FORM_SCRIPT, hasBackgroundVideo, headerOverStyle, onlyFirstHeaderOver, VIDEO_SCRIPT, type SectionStyleId, fontPreloads, FormsContext, MissingLinkedSection, resolveLinkedSections, type LinkedSectionFile, hasContactForm, MediaContext, mediaFileOf, migrateChrome, variantFile, PageDesignContext, NOT_FOUND_TITLE, type PageDesignData, type PageDesigns, type FormsSetup, SiteFooterView, SiteHeaderView, tokensToCss, type MediaItem, type Page, type Site } from "@crust/blocks";
import type { ComponentData, Data } from "@puckeditor/core";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";

type AnyComponentConfig = {
  render: (props: Record<string, unknown>) => ReactNode;
  fields?: Record<string, { type: string }>;
};

/**
 * Renders one block and its nested slots. We walk the tree ourselves instead
 * of using Puck's <Render> so the published HTML contains only our markup.
 */
function renderItem(item: ComponentData, editing = false): ReactNode {
  const component = (config.components as unknown as Record<string, AnyComponentConfig | undefined>)[item.type];
  if (!component) throw new Error(`Unknown block type "${item.type}"`);

  const props: Record<string, unknown> = { ...item.props };
  for (const [name, field] of Object.entries(component.fields ?? {})) {
    if (field.type === "slot") {
      const children = (item.props[name] ?? []) as ComponentData[];
      props[name] = () => <>{children.map((child) => renderItem(child, editing))}</>;
    }
  }
  const id = String(item.props.id ?? item.type);
  return <ComponentShell key={id} render={component.render} props={props} editing={editing} />;
}

function ComponentShell({ render, props, editing }: { render: AnyComponentConfig["render"]; props: Record<string, unknown>; editing: boolean }) {
  return <>{render({ ...props, puck: { isEditing: editing } })}</>;
}

/** With the media library (F034), uploaded photos get their size and a srcset of resized copies. */
export const withMedia = (node: ReactNode, media: MediaItem[] | undefined) =>
  media ? <MediaContext.Provider value={new Map(media.map((m) => [m.file, m]))}>{node}</MediaContext.Provider> : node;

/** Blocks that span the whole width themselves; everything else needs the page column. */
const FULL_WIDTH = new Set(["Section", "LinkedSection", "PostHero", "PostContent"]);

/**
 * F069: page-level blocks outside a Section (a post's body text, a block
 * dropped between sections) go inside the page column, so their text
 * doesn't touch the screen edge. Next to each other, they share one column.
 */
function pageLevel(items: ComponentData[], editing = false): ReactNode[] {
  const out: ReactNode[] = [];
  let run: ComponentData[] = [];
  const flush = () => {
    if (!run.length) return;
    out.push(
      <div key={`column-${out.length}`} className="cr-container cr-page-column">
        {run.map((item) => renderItem(item, editing))}
      </div>,
    );
    run = [];
  };
  for (const item of items) {
    if (FULL_WIDTH.has(item.type)) {
      flush();
      out.push(renderItem(item, editing));
    } else run.push(item);
  }
  flush();
  return out;
}

export function renderBody(data: Data, media?: MediaItem[], forms?: FormsSetup): string {
  // F073: only the first block can carry the header.
  const blocks = withMedia(<>{pageLevel(onlyFirstHeaderOver(data.content))}</>, media);
  // F037: contact forms post to the Worker and come back to this page.
  return renderToStaticMarkup(forms ? <FormsContext.Provider value={forms}>{blocks}</FormsContext.Provider> : blocks);
}

/**
 * F082: a post, blog or "Page not found" design. Its self-filling blocks
 * read `data`; `inner` (a post's own blocks) goes where "Post content" is.
 */
export function renderDesignBody(design: Data, data: Omit<PageDesignData, "body">, inner: Data | null, media?: MediaItem[], forms?: FormsSetup): string {
  const value: PageDesignData = inner ? { ...data, body: <>{pageLevel(inner.content)}</> } : data;
  const blocks = withMedia(<PageDesignContext.Provider value={value}>{pageLevel(onlyFirstHeaderOver(design.content))}</PageDesignContext.Provider>, media);
  return renderToStaticMarkup(forms ? <FormsContext.Provider value={forms}>{blocks}</FormsContext.Provider> : blocks);
}

/** F082: blocks drawn as in the builder, as React (the post editor draws the post design around the post). */
export function StaticBlocks({ items }: { items: ComponentData[] }) {
  return <>{pageLevel(items, true)}</>;
}

/**
 * Blocks as the builder draws them, for previews such as the layout
 * gallery's cards (F041): photos without an address show as placeholders
 * instead of being left out. Never used for publishing.
 */
export const renderPreview = (data: Data): string => renderToStaticMarkup(<>{pageLevel(data.content, true)}</>);

/** The contact form setup for one page, when the publish step has one (F037). */
export const formsFor = (options: RenderOptions, path: string): FormsSetup | undefined =>
  options.forms?.endpoint ? { ...options.forms, path: path === "/" ? "/" : `${path.replace(/\/+$/, "")}/` } : undefined;

/** Turnstile's script, and (F069) the form's send-in-place script, only on pages with a connected contact form. */
export const turnstileTag = (options: RenderOptions, puck: unknown) => {
  if (!options.forms?.endpoint || !hasContactForm(puck)) return "";
  const turnstile = options.forms.siteKey ? `<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>\n` : "";
  return `${turnstile}<script type="module">${CONTACT_FORM_SCRIPT}</script>\n`;
};

/** F073: starts background videos, only on pages that have one. */
export const videoTag = (puck: unknown) =>
  (hasBackgroundVideo(puck) ? `<script type="module">${VIDEO_SCRIPT}</script>\n` : "") +
  // F078: a YouTube or Vimeo player is put in only when its cover is pressed; F079: a map too.
  (hasVideoEmbed(puck) || hasMapEmbed(puck) ? `<script type="module">${VIDEO_EMBED_SCRIPT}</script>\n` : "") +
  // F079: sliders, tabs and the gallery lightbox, each only on pages that use it.
  interactiveTags(puck);

export const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export interface RenderOptions {
  /** Every page, for the default menu of sites saved before F031. */
  pages?: { path: string; title: string }[];
  /** For "{year}" in the footer; this year by default. */
  year?: number;
  /** content/media.json (F034). Without it, images are published as they are. */
  media?: MediaItem[];
  /** The site's public address, for links in sharing tags (F036); site.baseUrl by default. */
  baseUrl?: string;
  /** Where contact forms send messages, and the Turnstile site key (F037). */
  forms?: { endpoint: string; siteKey: string };
  /** content/sections (F043): linked sections are built into each page that uses them. */
  linkedSections?: ReadonlyMap<string, LinkedSectionFile>;
  /** content/designs (F082): the post, blog and "Page not found" designs; missing ones use the built-in look. */
  designs?: PageDesigns;
}

/** A page's or post's blocks with linked sections built in (F043). Says which page uses a missing one. */
export function withLinkedSections<D extends Page["puck"]>(puck: D, options: RenderOptions, where: string): D {
  try {
    return resolveLinkedSections(puck, options.linkedSections ?? new Map());
  } catch (e) {
    if (e instanceof MissingLinkedSection) throw new Error(`${where}: ${e.message}`);
    throw e;
  }
}

/** Full HTML document for one page. `baseCss` is packages/blocks/src/styles.css. */
export function renderPage(site: Site, input: Page, baseCss: string, options: RenderOptions = {}): string {
  const page = { ...input, puck: withLinkedSections(input.puck, options, `Page ${input.path}`) };
  const searchable = page.path !== "/404";
  const seo = page.seo ?? {};
  return renderDocument(
    site,
    {
      path: page.path,
      title: page.title,
      description: page.description,
      body: renderBody(page.puck, options.media, formsFor(options, page.path)),
      head: turnstileTag(options, page.puck) + videoTag(page.puck),
      headerOver: headerOverStyle(page.puck.content) ?? undefined,
      hero: heroStyle(page.puck.content) ?? undefined,
      share: { searchTitle: seo.title, image: seo.image, imageAlt: seo.imageAlt, noindex: seo.noindex },
      searchable,
    },
    baseCss,
    options,
  );
}

export interface DocumentParts {
  path: string;
  title: string;
  description: string;
  /** Rendered HTML inside <main>. */
  body: string;
  /** Extra tags for <head> (already escaped). */
  head?: string;
  /** Search and sharing (F036). */
  share?: ShareInfo;
  /** In the site search index (F039); not for hidden pages, lists or the 404. Default true. */
  searchable?: boolean;
  /** F073: the page's first section carries the header, in this style. */
  headerOver?: SectionStyleId;
  /** F076: the style of a first section with a photo or video, for the header's "Clear on a hero photo". */
  hero?: SectionStyleId;
}

export interface ShareInfo {
  /** The whole <title> and the shared title, instead of "Page | Site". */
  searchTitle?: string;
  image?: string;
  imageAlt?: string;
  noindex?: boolean;
  type?: "website" | "article";
}

/** A full address for sharing tags; library photos use their 1440 px copy when there is one. */
function absolute(base: string, src: string, media: MediaItem[] | undefined): string | null {
  const url = src.trim();
  if (/^https?:\/\//i.test(url)) return url;
  if (!url.startsWith("/") || url.startsWith("//")) return null;
  const file = mediaFileOf(url);
  const item = file ? media?.find((m) => m.file === file) : undefined;
  return `${base}${item && item.width > 1440 ? `/media/${variantFile(item.file, 1440)}` : url}`;
}

/** Canonical address, Open Graph and Twitter card tags, and robots (F036). */
function shareTags(site: Site, doc: DocumentParts, options: RenderOptions): string {
  const share = doc.share ?? {};
  const base = (options.baseUrl ?? site.baseUrl).replace(/\/+$/, "");
  const url = `${base}${doc.path === "/" ? "/" : `${doc.path.replace(/\/+$/, "")}/`}`;
  const image = share.image ? absolute(base, share.image, options.media) : null;
  const tag = (attr: "property" | "name", key: string, value: string) => `<meta ${attr}="${key}" content="${escapeHtml(value)}">\n`;
  let out = "";
  if (share.noindex) out += `<meta name="robots" content="noindex">\n`;
  out += `<link rel="canonical" href="${escapeHtml(url)}">\n`;
  out += tag("property", "og:type", share.type ?? "website");
  out += tag("property", "og:site_name", site.name);
  out += tag("property", "og:title", share.searchTitle?.trim() || doc.title);
  if (doc.description.trim()) out += tag("property", "og:description", doc.description);
  out += tag("property", "og:url", url);
  if (image) {
    out += tag("property", "og:image", image);
    if (share.imageAlt?.trim()) out += tag("property", "og:image:alt", share.imageAlt.trim());
  }
  out += tag("name", "twitter:card", image ? "summary_large_image" : "summary");
  return out;
}

/**
 * Smaller inline CSS for published pages (from F074, when the block styles
 * grew past Lighthouse's "Minify CSS" threshold): drops comments and spare
 * whitespace. Quoted strings (font names, `content: ""`) are kept as they
 * are; spaces inside calc() and between selectors stay.
 */
export function minifyCss(css: string): string {
  // One pass: comments out, quoted strings kept whole, the rest squeezed.
  let out = "";
  let plain = "";
  const flush = () => {
    out += plain.replace(/\s+/g, " ").replace(/\s*([{};,>])\s*/g, "$1").replace(/;}/g, "}");
    plain = "";
  };
  for (let i = 0; i < css.length; i++) {
    const ch = css[i]!;
    if (ch === "/" && css[i + 1] === "*") {
      const end = css.indexOf("*/", i + 2);
      i = end < 0 ? css.length : end + 1;
      plain += " ";
    } else if (ch === '"' || ch === "'") {
      let j = i + 1;
      while (j < css.length && css[j] !== ch && css[j] !== "\n") j += css[j] === "\\" ? 2 : 1;
      flush();
      out += css.slice(i, j + 1);
      i = j;
    } else plain += ch;
  }
  flush();
  return out.trim();
}

/**
 * The footer: the simple one (F031), or (F076) a linked section's blocks
 * with the copyright line under them. A missing section stops the publish;
 * without the sections at hand (a preview), the simple footer stands in.
 */
function footerHtml(site: Site, footer: ReturnType<typeof migrateChrome>["footer"], path: string, year: number, options: RenderOptions): string {
  if (footer.show && footer.kind === "blocks" && options.linkedSections) {
    const section = options.linkedSections.get(footer.section ?? "");
    if (!section) throw new Error(`The footer uses the linked section "${footer.section ?? ""}", which doesn't exist. Pick another in Site settings → Footer, or go back to Simple.`);
    const body = renderBody({ root: { props: {} }, content: section.content } as Page["puck"], options.media, formsFor(options, path));
    const copyright = footer.copyright.replace(/\{year\}/g, String(year)).replace(/\{name\}/g, () => site.name).trim();
    const end = copyright ? `<div class="cr-footer-end cr-style-${footer.style}"><div class="cr-container"><p class="cr-footer-copy">${escapeHtml(copyright)}</p></div></div>` : "";
    return `<footer class="cr-site-footer cr-footer-blocks">${body}${end}</footer>`;
  }
  return renderToStaticMarkup(<SiteFooterView footer={footer} siteName={site.name} path={path} year={year} />);
}

/** The page shell around any content: head, header, main, footer. */
export function renderDocument(site: Site, doc: DocumentParts, baseCss: string, options: RenderOptions): string {
  const { header, footer } = migrateChrome(site, options.pages ?? [{ path: doc.path, title: doc.title }]);
  const year = options.year ?? new Date().getFullYear();
  const over = header.show ? (doc.headerOver ?? (header.overHero ? doc.hero : undefined)) : undefined;
  const top = renderToStaticMarkup(withMedia(<SiteHeaderView header={header} path={doc.path} over={over} />, options.media));
  const bottom = footerHtml(site, footer, doc.path, year, options);
  // A sticky header would cover whatever is scrolled or tabbed to; the page keeps room for it (WCAG 2.4.11).
  const htmlClass = header.show && header.sticky && !over ? ' class="cr-has-sticky"' : "";
  // F076: a taller header (logo on top, top bar) needs more room above a section it sits on, and below a sticky one.
  const room = header.show ? (layoutOf(header) === "stacked" ? 112 : 64) + (header.topBar?.show ? 36 : 0) : 64;
  const htmlStyle = room !== 64 ? ` style="--cr-header-room: ${room}px"` : "";
  const dropdowns = hasDropdowns(header) ? `<script type="module">${DROPDOWN_SCRIPT}</script>\n` : "";
  // F075: motion CSS only when the site turns motion on (the builder canvas never gets it).
  const motion = motionCss(site.tokens);
  // F076: the new header and footer CSS only for sites that use them.
  const chromeCss = needsHeaderV2Css(header, footer) ? `\n${HEADER_V2_CSS}` : "";
  // F077: icon, divider and social CSS only on pages that show one.
  const iconCss = needsIconCss(top + doc.body + bottom) ? `\n${ICONS_CSS}` : "";
  // F078: stats, video, table, pricing and numbered-list CSS only on pages that show one.
  const v3Css = needsBlocksV3Css(top + doc.body + bottom) ? `\n${BLOCKS_V3_CSS}` : "";
  // F079: slideshow, card slider, tabs, map and lightbox CSS only on pages that show one.
  const interactiveCss = needsInteractiveCss(top + doc.body + bottom) ? `\n${INTERACTIVE_CSS}` : "";
  const css = minifyCss(`${tokensToCss(site.tokens)}\n${baseCss}${chromeCss}${iconCss}${v3Css}${interactiveCss}${motion ? `\n${motion}` : ""}`);
  const title = doc.share?.searchTitle?.trim() || (doc.path === "/" ? doc.title : `${doc.title} | ${site.name}`);
  return `<!doctype html>
<html lang="${escapeHtml(site.language)}"${htmlClass}${htmlStyle}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(doc.description)}">
<meta name="generator" content="Crust">
${shareTags(site, doc, options)}${fontPreloads(site.tokens.fonts).map((href) => `<link rel="preload" href="${escapeHtml(href)}" as="font" type="font/woff2" crossorigin>\n`).join("")}${doc.head ?? ""}${dropdowns}<style>${css.replace(/<\/style/gi, "<\\/style")}</style>
</head>
<body class="cr-page${over ? " cr-page-header-over" : ""}">
<a class="cr-skip" href="#content">Skip to content</a>
${top}<main id="content" tabindex="-1"${doc.searchable === false || doc.share?.noindex ? "" : " data-pagefind-body"}>${doc.body}</main>
${bottom}
</body>
</html>
`;
}

/**
 * The "page not found" document. Cloudflare Pages serves 404.html with a 404
 * status for unknown addresses; without it, every unknown address returns
 * the home page with status 200.
 */
export function renderNotFound(site: Site, baseCss: string, options: RenderOptions = {}): string {
  // F082: a designed "Page not found" is published like a page.
  const design = options.designs?.notFound;
  if (design) {
    const puck = withLinkedSections({ root: { props: {} }, content: design.content } as Page["puck"], options, "The “Page not found” design");
    return renderPage(site, { path: "/404", title: design.title ?? NOT_FOUND_TITLE, description: "This page doesn't exist.", puck }, baseCss, options);
  }
  const page: Page = {
    path: "/404",
    title: "Page not found",
    description: "This page doesn't exist.",
    puck: {
      root: { props: {} },
      content: [
        {
          type: "Section",
          props: {
            id: "Section-not-found",
            background: "background",
            paddingY: "xl",
            content: [
              { type: "Heading", props: { id: "Heading-not-found", text: "Page not found", level: "h1", align: "center" } },
              {
                type: "Text",
                props: {
                  id: "Text-not-found",
                  text: "There's no page at this address. It may have moved or been deleted.",
                  align: "center",
                  tone: "muted",
                },
              },
              { type: "Spacer", props: { id: "Spacer-not-found", size: "sm" } },
              {
                type: "Button",
                props: { id: "Button-not-found", label: "Go to the home page", href: "/", variant: "primary", align: "center" },
              },
            ],
          },
        },
      ],
    },
  };
  return renderPage(site, page, baseCss, options);
}

/** Maps a page path ("/", "/about") to its output file ("index.html", "about/index.html"). */
export function outputFileFor(path: string): string {
  const clean = path.replace(/^\/+|\/+$/g, "");
  if (clean === "") return "index.html";
  if (!/^[a-z0-9][a-z0-9-]*(\/[a-z0-9][a-z0-9-]*)*$/.test(clean)) {
    throw new Error(`Invalid page path "${path}". Use lowercase letters, numbers and dashes.`);
  }
  return `${clean}/index.html`;
}

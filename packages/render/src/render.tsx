import { config, FormsContext, MissingLinkedSection, resolveLinkedSections, type LinkedSectionFile, hasContactForm, MediaContext, mediaFileOf, migrateChrome, variantFile, type FormsSetup, SiteFooterView, SiteHeaderView, tokensToCss, type MediaItem, type Page, type Site } from "@crust/blocks";
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

export function renderBody(data: Data, media?: MediaItem[], forms?: FormsSetup): string {
  const blocks = withMedia(<>{data.content.map((item) => renderItem(item))}</>, media);
  // F037: contact forms post to the Worker and come back to this page.
  return renderToStaticMarkup(forms ? <FormsContext.Provider value={forms}>{blocks}</FormsContext.Provider> : blocks);
}

/**
 * Blocks as the builder draws them, for previews such as the layout
 * gallery's cards (F041): photos without an address show as placeholders
 * instead of being left out. Never used for publishing.
 */
export const renderPreview = (data: Data): string => renderToStaticMarkup(<>{data.content.map((item) => renderItem(item, true))}</>);

/** The contact form setup for one page, when the publish step has one (F037). */
export const formsFor = (options: RenderOptions, path: string): FormsSetup | undefined =>
  options.forms?.endpoint ? { ...options.forms, path: path === "/" ? "/" : `${path.replace(/\/+$/, "")}/` } : undefined;

/** Turnstile's script, only on pages with a contact form. */
export const turnstileTag = (options: RenderOptions, puck: unknown) =>
  options.forms?.endpoint && options.forms.siteKey && hasContactForm(puck)
    ? `<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>\n`
    : "";

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
      head: turnstileTag(options, page.puck),
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

/** The page shell around any content: head, header, main, footer. */
export function renderDocument(site: Site, doc: DocumentParts, baseCss: string, options: RenderOptions): string {
  const { header, footer } = migrateChrome(site, options.pages ?? [{ path: doc.path, title: doc.title }]);
  const year = options.year ?? new Date().getFullYear();
  const top = renderToStaticMarkup(withMedia(<SiteHeaderView header={header} path={doc.path} />, options.media));
  const bottom = renderToStaticMarkup(<SiteFooterView footer={footer} siteName={site.name} path={doc.path} year={year} />);
  // A sticky header would cover whatever is scrolled or tabbed to; the page keeps room for it (WCAG 2.4.11).
  const htmlClass = header.show && header.sticky ? ' class="cr-has-sticky"' : "";
  const css = `${tokensToCss(site.tokens)}\n${baseCss}`;
  const title = doc.share?.searchTitle?.trim() || (doc.path === "/" ? doc.title : `${doc.title} | ${site.name}`);
  return `<!doctype html>
<html lang="${escapeHtml(site.language)}"${htmlClass}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(doc.description)}">
<meta name="generator" content="Crust">
${shareTags(site, doc, options)}${doc.head ?? ""}<style>${css.replace(/<\/style/gi, "<\\/style")}</style>
</head>
<body class="cr-page">
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

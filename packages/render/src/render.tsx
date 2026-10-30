import { config, MediaContext, migrateChrome, SiteFooterView, SiteHeaderView, tokensToCss, type MediaItem, type Page, type Site } from "@crust/blocks";
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
function renderItem(item: ComponentData): ReactNode {
  const component = (config.components as unknown as Record<string, AnyComponentConfig | undefined>)[item.type];
  if (!component) throw new Error(`Unknown block type "${item.type}"`);

  const props: Record<string, unknown> = { ...item.props };
  for (const [name, field] of Object.entries(component.fields ?? {})) {
    if (field.type === "slot") {
      const children = (item.props[name] ?? []) as ComponentData[];
      props[name] = () => <>{children.map((child) => renderItem(child))}</>;
    }
  }
  const id = String(item.props.id ?? item.type);
  return <ComponentShell key={id} render={component.render} props={props} />;
}

function ComponentShell({ render, props }: { render: AnyComponentConfig["render"]; props: Record<string, unknown> }) {
  return <>{render({ ...props, puck: { isEditing: false } })}</>;
}

/** With the media library (F034), uploaded photos get their size and a srcset of resized copies. */
export const withMedia = (node: ReactNode, media: MediaItem[] | undefined) =>
  media ? <MediaContext.Provider value={new Map(media.map((m) => [m.file, m]))}>{node}</MediaContext.Provider> : node;

export function renderBody(data: Data, media?: MediaItem[]): string {
  return renderToStaticMarkup(withMedia(<>{data.content.map((item) => renderItem(item))}</>, media));
}

export const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export interface RenderOptions {
  /** Every page, for the default menu of sites saved before F031. */
  pages?: { path: string; title: string }[];
  /** For "{year}" in the footer; this year by default. */
  year?: number;
  /** content/media.json (F034). Without it, images are published as they are. */
  media?: MediaItem[];
}

/** Full HTML document for one page. `baseCss` is packages/blocks/src/styles.css. */
export function renderPage(site: Site, page: Page, baseCss: string, options: RenderOptions = {}): string {
  return renderDocument(site, { path: page.path, title: page.title, description: page.description, body: renderBody(page.puck, options.media) }, baseCss, options);
}

export interface DocumentParts {
  path: string;
  title: string;
  description: string;
  /** Rendered HTML inside <main>. */
  body: string;
  /** Extra tags for <head> (already escaped). */
  head?: string;
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
  const title = doc.path === "/" ? doc.title : `${doc.title} | ${site.name}`;
  return `<!doctype html>
<html lang="${escapeHtml(site.language)}"${htmlClass}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(doc.description)}">
<meta name="generator" content="Crust">
${doc.head ?? ""}<style>${css.replace(/<\/style/gi, "<\\/style")}</style>
</head>
<body class="cr-page">
<a class="cr-skip" href="#content">Skip to content</a>
${top}<main id="content" tabindex="-1">${doc.body}</main>
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

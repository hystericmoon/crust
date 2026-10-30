import { config, migrateChrome, SiteFooterView, SiteHeaderView, tokensToCss, type Page, type Site } from "@crust/blocks";
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

export function renderBody(data: Data): string {
  return renderToStaticMarkup(<>{data.content.map((item) => renderItem(item))}</>);
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export interface RenderOptions {
  /** Every page, for the default menu of sites saved before F031. */
  pages?: { path: string; title: string }[];
  /** For "{year}" in the footer; this year by default. */
  year?: number;
}

/** Full HTML document for one page. `baseCss` is packages/blocks/src/styles.css. */
export function renderPage(site: Site, page: Page, baseCss: string, options: RenderOptions = {}): string {
  const body = renderBody(page.puck);
  const { header, footer } = migrateChrome(site, options.pages ?? [{ path: page.path, title: page.title }]);
  const year = options.year ?? new Date().getFullYear();
  const top = renderToStaticMarkup(<SiteHeaderView header={header} path={page.path} />);
  const bottom = renderToStaticMarkup(<SiteFooterView footer={footer} siteName={site.name} path={page.path} year={year} />);
  // A sticky header would cover whatever is scrolled or tabbed to; the page keeps room for it (WCAG 2.4.11).
  const htmlClass = header.show && header.sticky ? ' class="cr-has-sticky"' : "";
  const css = `${tokensToCss(site.tokens)}\n${baseCss}`;
  const title = page.path === "/" ? page.title : `${page.title} | ${site.name}`;
  return `<!doctype html>
<html lang="${escapeHtml(site.language)}"${htmlClass}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(page.description)}">
<meta name="generator" content="Crust">
<style>${css.replace(/<\/style/gi, "<\\/style")}</style>
</head>
<body class="cr-page">
<a class="cr-skip" href="#content">Skip to content</a>
${top}<main id="content" tabindex="-1">${body}</main>
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

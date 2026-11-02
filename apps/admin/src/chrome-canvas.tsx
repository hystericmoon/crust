/**
 * The site header and footer on the builder canvas (F031), so a page is
 * designed in context. They're edited in Site settings, so here they're a
 * picture: inert (no focus, no clicks) with a link to where they're edited.
 */
import { headerOverStyle, SiteFooterView, SiteHeaderView, type Components, type SectionStyleId, type SiteChrome } from "@crust/blocks";
import { createUsePuck, type Config, type Data } from "@puckeditor/core";
import { createContext, useContext, type ReactNode } from "react";

const usePuckSelector = createUsePuck();

export const SiteChromeContext = createContext<{ chrome: SiteChrome; siteName: string; path: string } | null>(null);

function Chrome({ part, over }: { part: "header" | "footer"; over?: SectionStyleId }) {
  const ctx = useContext(SiteChromeContext);
  if (!ctx) return null;
  const view =
    part === "header" ? (
      <SiteHeaderView header={ctx.chrome.header} path={ctx.path} over={over} />
    ) : (
      <SiteFooterView footer={ctx.chrome.footer} siteName={ctx.siteName} path={ctx.path} year={new Date().getFullYear()} />
    );
  if (!(part === "header" ? ctx.chrome.header.show : ctx.chrome.footer.show)) return null;
  return (
    <div className={over ? "cc-chrome is-over" : "cc-chrome"} data-part={part === "header" ? "Site header · edit in Site settings" : "Site footer · edit in Site settings"}>
      <div inert aria-hidden="true">
        {view}
      </div>
    </div>
  );
}

/** F073: when the first section asks for it, the header sits on that section, as on the published page. */
function CanvasPage({ children }: { children: ReactNode }) {
  const ctx = useContext(SiteChromeContext);
  const content = usePuckSelector((s) => (s.appState.data as Data).content);
  const style = headerOverStyle(content);
  const over = style && ctx?.chrome.header.show ? style : undefined;
  return (
    <div className={over ? "cr-page cc-page cr-page-header-over" : "cr-page cc-page"}>
      <Chrome part="header" over={over} />
      {children}
      <Chrome part="footer" />
    </div>
  );
}

/** The builder's root: header above the page's blocks, footer below. */
export function withSiteChrome(config: Config<Components>): Config<Components> {
  const root = config.root ?? {};
  return {
    ...config,
    root: {
      ...root,
      render: ({ children }: { children: ReactNode }) => <CanvasPage>{children}</CanvasPage>,
    },
  } as unknown as Config<Components>;
}

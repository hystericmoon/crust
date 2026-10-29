/**
 * The site header and footer on the builder canvas (F031), so a page is
 * designed in context. They're edited in Site settings, so here they're a
 * picture: inert (no focus, no clicks) with a link to where they're edited.
 */
import { SiteFooterView, SiteHeaderView, type Components, type SiteChrome } from "@crust/blocks";
import type { Config } from "@puckeditor/core";
import { createContext, useContext, type ReactNode } from "react";

export const SiteChromeContext = createContext<{ chrome: SiteChrome; siteName: string; path: string } | null>(null);

function Chrome({ part }: { part: "header" | "footer" }) {
  const ctx = useContext(SiteChromeContext);
  if (!ctx) return null;
  const view =
    part === "header" ? (
      <SiteHeaderView header={ctx.chrome.header} path={ctx.path} />
    ) : (
      <SiteFooterView footer={ctx.chrome.footer} siteName={ctx.siteName} path={ctx.path} year={new Date().getFullYear()} />
    );
  if (!(part === "header" ? ctx.chrome.header.show : ctx.chrome.footer.show)) return null;
  return (
    <div className="cc-chrome" data-part={part === "header" ? "Site header · edit in Site settings" : "Site footer · edit in Site settings"}>
      <div inert aria-hidden="true">
        {view}
      </div>
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
      render: ({ children }: { children: ReactNode }) => (
        <div className="cr-page">
          <Chrome part="header" />
          {children}
          <Chrome part="footer" />
        </div>
      ),
    },
  } as unknown as Config<Components>;
}

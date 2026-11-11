import type { ComponentData, Data } from "@puckeditor/core";
import type { SiteFooter, SiteHeader } from "./chrome";
import type { PageSeo, SiteSeo } from "./seo";
import type { SiteTokens } from "./tokens";

/** content/site.json */
export interface Site {
  name: string;
  baseUrl: string;
  language: string;
  tokens: SiteTokens;
  /** Site header and menu (F031). Optional: older sites get defaults (see migrateChrome). */
  header?: Partial<SiteHeader>;
  /** Site footer (F031). Optional, like header. */
  footer?: Partial<SiteFooter>;
  /** F065 (optional): the template this site started from, and its release then. */
  template?: { id: string; version: number };
  /** F094 (optional): site-wide search and sharing defaults, used by pages that have none of their own. */
  seo?: SiteSeo;
}

/** content/pages/<slug>.json */
export interface Page {
  path: string;
  title: string;
  description: string;
  /** Search and sharing settings (F036). Optional: pages without it publish as before. */
  seo?: PageSeo;
  puck: Data;
}

/**
 * content/redirects.json (optional; added with F015). An old page address
 * that sends visitors to a page's new address. A page at `from` wins.
 */
export interface Redirect {
  from: string;
  to: string;
}

/**
 * content/layouts/<id>.json (optional; added with F027). A section or a whole
 * page the owner saved to reuse from the layout library. It's a copy: pages
 * that used it don't change when it's renamed or deleted.
 */
export interface SavedLayout {
  /** Also the file name; never changes, even on rename. */
  id: string;
  name: string;
  /** F080: "element" is a saved element style: one block holding only its style settings, applied as a copy. */
  kind: "section" | "page" | "element";
  /** ISO date. */
  savedAt: string;
  /** Top-level blocks, as in a page's puck.content. */
  content: ComponentData[];
}

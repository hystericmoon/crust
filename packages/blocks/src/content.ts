import type { ComponentData, Data } from "@puckeditor/core";
import type { SiteFooter, SiteHeader } from "./chrome";
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
}

/** content/pages/<slug>.json */
export interface Page {
  path: string;
  title: string;
  description: string;
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
  kind: "section" | "page";
  /** ISO date. */
  savedAt: string;
  /** Top-level blocks, as in a page's puck.content. */
  content: ComponentData[];
}

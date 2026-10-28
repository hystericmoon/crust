import type { Data } from "@puckeditor/core";
import type { SiteTokens } from "./tokens";

/** content/site.json */
export interface Site {
  name: string;
  baseUrl: string;
  language: string;
  tokens: SiteTokens;
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

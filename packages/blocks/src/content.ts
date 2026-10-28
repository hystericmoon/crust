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

/**
 * F055: the site the desktop app opened. The web admin is rebuilt from the
 * repository on every change, so it ships with the site's settings, pages
 * and posts built in. The app reads them from the site folder instead,
 * once, before the builder starts; everything after that goes through the
 * API as on the web. Null on the web.
 */
import type { Page, Post, Site } from "@crust/blocks";

export interface DesktopContent {
  site: Site;
  pages: Page[];
  posts: Post[];
  /** The site folder on the computer, to show where the site is kept. */
  folder: string;
}

let current: DesktopContent | null = null;

export const desktopContent = (): DesktopContent | null => current;

export function setDesktopContent(content: DesktopContent | null) {
  current = content;
}

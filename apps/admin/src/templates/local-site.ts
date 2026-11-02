/**
 * F048 in this browser. Without GitHub (preview links) the builder starts
 * from the site bundled with the app; after "Start from a template" the
 * template's pages and posts take its place here, and everything the
 * switch touched is kept aside so "Bring back my previous site" can put it
 * back. On GitHub the switch is a commit; the browser's own drafts are kept
 * aside the same way, since they'd otherwise win over the template's pages.
 */
import type { BlogSettings, Page, Post } from "@crust/blocks";

export const BASE_KEY = "crust:template-base";
export const BEFORE_KEY = "crust:before-template";
/** Set right before the reload, so the Pages screen can say what happened. */
export const JUST_KEY = "crust:template-just";

/** What a template switch replaces in this browser. */
const SWITCHED = (key: string) =>
  key.startsWith("crust:page:") ||
  key.startsWith("crust:post:") ||
  // F082: page designs kept in this browser.
  key.startsWith("crust:design:") ||
  key === "crust:draft:index" ||
  key === "crust:sections" ||
  key === "crust:my-layouts" ||
  key === "crust:draft:tokens" ||
  key === "crust:draft:chrome" ||
  key === BASE_KEY;

export interface TemplateBase {
  name: string;
  pages: Page[];
  posts: Post[];
  blog: BlogSettings;
}

export interface BeforeTemplate {
  /** The template switched to. */
  name: string;
  at: string;
  /** Where the switch happened: GitHub (with its commit) or only this browser. */
  commit: string | null;
  /** Every switched key as it was; a missing key didn't exist. */
  saved: Record<string, string>;
}

function storage(): Storage | null {
  try {
    return localStorage;
  } catch {
    return null;
  }
}

function readJson<T>(key: string): T | null {
  try {
    const raw = storage()?.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

let cachedBase: { raw: string | null; base: TemplateBase | null } = { raw: null, base: null };

/** The template's pages and posts standing in for the bundled site, when one was applied here. */
export function templateBase(): TemplateBase | null {
  let raw: string | null = null;
  try {
    raw = storage()?.getItem(BASE_KEY) ?? null;
  } catch {
    return null;
  }
  if (raw !== cachedBase.raw) {
    let base: TemplateBase | null = null;
    try {
      base = raw ? (JSON.parse(raw) as TemplateBase) : null;
    } catch {
      base = null;
    }
    cachedBase = { raw, base: base && Array.isArray(base.pages) && Array.isArray(base.posts) ? base : null };
  }
  return cachedBase.base;
}

export const beforeTemplate = (): BeforeTemplate | null => readJson<BeforeTemplate>(BEFORE_KEY);

/**
 * Keeps every switched key aside, then removes them, so the template starts
 * clean. Returns false (and changes nothing) when the browser won't store it.
 */
export function setAsideBrowserSite(name: string, commit: string | null, now = new Date()): boolean {
  const s = storage();
  if (!s) return false;
  const saved: Record<string, string> = {};
  const keys: string[] = [];
  for (let i = 0; i < s.length; i++) {
    const key = s.key(i);
    if (key && SWITCHED(key)) keys.push(key);
  }
  for (const key of keys) saved[key] = s.getItem(key) ?? "";
  try {
    s.setItem(BEFORE_KEY, JSON.stringify({ name, at: now.toISOString(), commit, saved } satisfies BeforeTemplate));
  } catch {
    return false;
  }
  for (const key of keys) s.removeItem(key);
  return true;
}

/** Puts back what setAsideBrowserSite kept, and forgets the template's own keys. */
export function bringBackBrowserSite(): boolean {
  const s = storage();
  const before = beforeTemplate();
  if (!s || !before) return false;
  const keys: string[] = [];
  for (let i = 0; i < s.length; i++) {
    const key = s.key(i);
    if (key && SWITCHED(key)) keys.push(key);
  }
  for (const key of keys) s.removeItem(key);
  try {
    for (const [key, value] of Object.entries(before.saved)) if (SWITCHED(key)) s.setItem(key, value);
  } catch {
    return false;
  }
  s.removeItem(BEFORE_KEY);
  return true;
}

/** Forgets the kept-aside copy (it's no longer the latest switch on GitHub). */
export function forgetBrowserSite() {
  storage()?.removeItem(BEFORE_KEY);
}

export function setJustApplied(message: string) {
  try {
    sessionStorage.setItem(JUST_KEY, message);
  } catch {
    // Only the confirmation is lost.
  }
}

/** The message to announce once after the reload, then forgotten. */
export function takeJustApplied(): string | null {
  try {
    const m = sessionStorage.getItem(JUST_KEY);
    sessionStorage.removeItem(JUST_KEY);
    return m;
  } catch {
    return null;
  }
}

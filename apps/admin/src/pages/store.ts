/**
 * Where pages come from in the admin (F007):
 *  - GitHub, through the API, once saving is switched on;
 *  - otherwise the pages bundled into the app at build time (content/pages);
 *  - plus drafts kept in this browser, which win until they're saved to GitHub.
 */
import { countPlaceholders, migrateRichText, type Page } from "@crust/blocks";
import type { Data } from "@puckeditor/core";
import { seoFromRoot, seoToRoot } from "../seo/fields";

export interface LocalDraft {
  page: Page;
  /** ISO time of the last save in this browser. */
  updatedAt: string;
  /** True once the same version was saved to GitHub. */
  savedToGitHub: boolean;
}

export interface PageRow {
  path: string;
  title: string;
  /** ISO time, or null if unknown. */
  lastEdited: string | null;
  /** Has changes in this browser that aren't on GitHub yet. */
  localChanges: boolean;
  /** Exists on GitHub (or in the app's bundled content), not only in this browser. */
  inRepo: boolean;
  /** Saved to GitHub but not live yet (F016). */
  unpublished?: "new" | "edited";
  /** F046: how many template placeholders are left to replace. */
  placeholders?: number;
}

const PREFIX = "crust:page:";
const LEGACY_HOME_DRAFT = "crust:draft:index";

const bundled: Page[] = Object.values(
  import.meta.glob<Page>("../../../../content/pages/*.json", { eager: true, import: "default" }),
);

export const bundledPages = (): Page[] => bundled;

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Moves the pre-F007 Home draft (Puck data only) into the new format, once. */
function migrateLegacyHomeDraft() {
  const raw = safeGet(LEGACY_HOME_DRAFT);
  if (!raw || safeGet(PREFIX + "/")) return;
  try {
    const home = bundled.find((p) => p.path === "/");
    if (home) {
      const draft: LocalDraft = { page: { ...home, puck: JSON.parse(raw) as Data }, updatedAt: new Date().toISOString(), savedToGitHub: false };
      localStorage.setItem(PREFIX + "/", JSON.stringify(draft));
    }
    localStorage.removeItem(LEGACY_HOME_DRAFT);
  } catch {
    // Unreadable old draft: leave it.
  }
}

export function localDrafts(): LocalDraft[] {
  migrateLegacyHomeDraft();
  const drafts: LocalDraft[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith(PREFIX)) continue;
      const draft = JSON.parse(localStorage.getItem(key)!) as LocalDraft;
      if (draft?.page?.path) drafts.push(draft);
    }
  } catch {
    // Storage unavailable.
  }
  return drafts;
}

export function getLocalDraft(path: string): LocalDraft | null {
  migrateLegacyHomeDraft();
  const raw = safeGet(PREFIX + path);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as LocalDraft;
  } catch {
    return null;
  }
}

/** Returns false when the browser refuses to store it. */
export function saveLocalDraft(page: Page, savedToGitHub: boolean, now = new Date()): boolean {
  try {
    const draft: LocalDraft = { page, updatedAt: now.toISOString(), savedToGitHub };
    localStorage.setItem(PREFIX + page.path, JSON.stringify(draft));
    return true;
  } catch {
    return false;
  }
}

/** Forgets the browser draft of a page (F015 delete). */
export function removeLocalDraft(path: string) {
  try {
    localStorage.removeItem(PREFIX + path);
  } catch {
    // Storage unavailable: nothing to remove.
  }
}

/** Moves a browser draft to a page's new address (F015 rename), keeping unsaved edits. */
export function moveLocalDraft(from: string, to: string): boolean {
  const draft = getLocalDraft(from);
  if (!draft) return true;
  try {
    localStorage.setItem(PREFIX + to, JSON.stringify({ ...draft, page: { ...draft.page, path: to } }));
    localStorage.removeItem(PREFIX + from);
    return true;
  } catch {
    return false;
  }
}

/**
 * One row per page address. Remote pages (GitHub or bundled) are merged
 * with browser drafts; a draft not yet on GitHub is flagged.
 */
export function mergePageRows(
  remote: { path: string; title: string; lastEdited: string | null; placeholders?: number }[],
  drafts: LocalDraft[],
): PageRow[] {
  const rows = new Map<string, PageRow>();
  for (const r of remote) rows.set(r.path, { ...r, localChanges: false, inRepo: true });
  for (const d of drafts) {
    const existing = rows.get(d.page.path);
    const placeholders = countPlaceholders(d.page.puck?.content);
    const newer = !existing?.lastEdited || d.updatedAt > existing.lastEdited;
    rows.set(d.page.path, {
      path: d.page.path,
      title: d.page.title || existing?.title || "Untitled",
      lastEdited: newer ? d.updatedAt : existing!.lastEdited,
      localChanges: !d.savedToGitHub,
      inRepo: existing?.inRepo ?? false,
      // The draft is what gets saved before publishing, so its own count wins.
      ...(placeholders ? { placeholders } : {}),
    });
  }
  return [...rows.values()].sort((a, b) => (a.path === "/" ? -1 : b.path === "/" ? 1 : a.path.localeCompare(b.path)));
}

/** Puck keeps the page title and description as root fields while editing. */
export function toPuckData(page: Page): Data {
  // F036: search and sharing settings are edited in the page settings too.
  const props = { ...(page.puck.root?.props ?? {}), title: page.title, description: page.description, ...(page.seo ? seoToRoot(page.seo) : {}) };
  // F042: plain text in older Text blocks becomes rich text; saved that way next time.
  return migrateRichText({ ...page.puck, root: { ...page.puck.root, props } as Data["root"] });
}

/** And back: the page file stores them at the top level (content contract). */
export function fromPuckData(path: string, data: Data): Page {
  const props = (data.root?.props ?? {}) as { title?: string; description?: string };
  const { title = "", description = "", ...others } = props;
  const { seo, rest } = seoFromRoot(others);
  return { path, title, description, ...(seo ? { seo } : {}), puck: { ...data, root: { ...data.root, props: rest } } };
}

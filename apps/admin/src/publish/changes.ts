/** What's saved but not live yet, in the owner's words (F016). */
import type { PendingChanges } from "../api-client";
import type { PageRow } from "../pages/store";

/** Adds the "not published yet" marks to page rows. */
export function markUnpublished(rows: PageRow[], changes: PendingChanges | null): PageRow[] {
  if (!changes) return rows;
  const byPath = new Map(changes.pages.map((p) => [p.path, p.change]));
  return rows.map((row) => {
    const change = row.inRepo ? byPath.get(row.path) : undefined;
    return change ? { ...row, unpublished: change } : row;
  });
}

/**
 * F069: a page with a browser draft is already listed as "changes in this
 * browser", so its saved-but-not-live line would count it twice.
 */
export function withoutDraftPages(changes: PendingChanges, draftPaths: Iterable<string>): PendingChanges {
  const drafts = new Set(draftPaths);
  return drafts.size ? { ...changes, pages: changes.pages.filter((p) => !drafts.has(p.path)) } : changes;
}

/** One line per thing the next publish changes, plus a short summary. */
export function describeChanges(changes: PendingChanges, titles: Map<string, string>): { summary: string; items: string[] } {
  if (!changes.lastPublish) {
    return { summary: "The site hasn't been published yet, so publishing puts every saved page live.", items: [] };
  }
  const name = (path: string) => (titles.has(path) ? `${titles.get(path)} (${path})` : path);
  const items = [
    ...changes.pages.map((p) => `${name(p.path)}: ${p.change === "new" ? "new page" : "edited"}`),
    ...changes.removed.map((path) => `${path}: removed`),
    ...changes.moved.map((m) => `${m.from}: moved to ${m.to}`),
    ...(changes.site ? ["Site settings"] : []),
    // F043: a linked section shows on many pages.
    ...(changes.sections ?? []).map((sec) => `Linked section “${sec.name}”: ${sec.change === "new" ? "new" : sec.change === "removed" ? "deleted" : "edited"}`),
    // Redirect changes not already explained by a move above.
    ...(changes.redirects && changes.moved.length === 0 ? ["Redirects from old page addresses"] : []),
  ];
  if (items.length === 0) return { summary: "Everything saved is live.", items };
  return { summary: items.length === 1 ? "1 change waiting to go live:" : `${items.length} changes waiting to go live:`, items };
}

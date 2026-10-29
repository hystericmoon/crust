/** How the page list shows each page (F021) and which pages, in what order (F023). */
import type { PageRow } from "./store";

export type StatusKey = "local" | "unsaved" | "new" | "edited" | "live" | "saved" | "builtin";

/** Ink for the status dot; the words always carry the meaning. */
export interface PageStatus {
  key: StatusKey;
  label: string;
}

/**
 * One status per page, the most urgent first: where its latest version is.
 * `githubOn`: saving to GitHub works. `liveKnown`: we know what the last publish contained.
 */
export function pageStatus(row: PageRow, githubOn: boolean, liveKnown: boolean): PageStatus {
  if (!row.inRepo) return { key: "local", label: "Only in this browser" };
  if (!githubOn) return row.localChanges ? { key: "local", label: "Only in this browser" } : { key: "builtin", label: "Built into the app" };
  if (row.localChanges) return { key: "unsaved", label: "Changes not saved" };
  if (row.unpublished === "new") return { key: "new", label: "Saved, not live yet" };
  if (row.unpublished === "edited") return { key: "edited", label: "Edits not live yet" };
  return liveKnown ? { key: "live", label: "Live" } : { key: "saved", label: "Saved" };
}

export type SortKey = "recent" | "address";
export const SORT_LABELS: Record<SortKey, string> = { recent: "Newest edit", address: "Address (A–Z)" };

/** The find box and sort appear once the list is long enough to need them. */
export const FIND_FROM = 6;

/** Title or address contains every word typed, ignoring case and accents. */
export function matchesQuery(row: PageRow, query: string): boolean {
  const fold = (s: string) => s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const hay = fold(`${row.title} ${row.path}`);
  return fold(query)
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => hay.includes(word));
}

export function sortRows(rows: PageRow[], sort: SortKey): PageRow[] {
  const copy = [...rows];
  if (sort === "address") return copy.sort((a, b) => (a.path === "/" ? -1 : b.path === "/" ? 1 : a.path.localeCompare(b.path)));
  // Newest edit first; pages without a date keep address order at the end.
  return copy.sort((a, b) => {
    if (a.lastEdited && b.lastEdited) return b.lastEdited.localeCompare(a.lastEdited) || a.path.localeCompare(b.path);
    if (a.lastEdited) return -1;
    if (b.lastEdited) return 1;
    return a.path === "/" ? -1 : b.path === "/" ? 1 : a.path.localeCompare(b.path);
  });
}

const SORT_KEY = "crust:pages-sort";
export function loadSort(): SortKey {
  try {
    const v = localStorage.getItem(SORT_KEY);
    return v === "address" ? "address" : "recent";
  } catch {
    return "recent";
  }
}
export function saveSort(sort: SortKey) {
  try {
    localStorage.setItem(SORT_KEY, sort);
  } catch {
    // A remembered sort is a convenience only.
  }
}

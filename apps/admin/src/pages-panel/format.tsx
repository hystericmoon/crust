import type { ReactNode } from "react";
import type { LinkingPage } from "../pages/PageActions";

/**
 * F069: an address may wrap after a "/" or "-", never mid-word
 * ("/contac" + "t" in a narrow column).
 */
export function breakablePath(path: string): ReactNode[] {
  return path.split(/(?<=[/-])/).flatMap((part, i) => (i ? [<wbr key={i} />, part] : [part]));
}

/** F069: " It also updated 3 links to the new address: Menu (2), Site header and footer (1)." */
export function relinkedNote(relinked: LinkingPage[]): string {
  const total = relinked.reduce((n, r) => n + r.count, 0);
  if (!total) return "";
  const where = relinked.map((r) => `${r.title} (${r.count})`).join(", ");
  return ` It also updated ${total === 1 ? "1 link" : `${total} links`} to the new address: ${where}.`;
}

export const formatDate = (iso: string | null) =>
  iso ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso)) : "Not recorded yet";

export const editHref = (path: string) => `#/edit?path=${encodeURIComponent(path)}`;
/** The page's own settings (title, address, search and sharing): opens the page with its settings panel. */
export const settingsHref = (path: string) => `#/edit?path=${encodeURIComponent(path)}&settings=1`;

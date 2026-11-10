/**
 * F091: which pages are "In the menu" and in what order. The menu is the
 * site header's menu (site.json header.menu); a page is in it when a menu
 * item points at its address. Pure functions, so the panel, the keyboard
 * and the tests share one set of rules. Menu items that are not pages
 * (outside links, "#" dropdown titles) stay where they are.
 */
import { chromeLimits, type MenuLink } from "@crust/blocks";
import { removeItem } from "../settings/MenuEditor";
import type { PageRow } from "../pages/store";

/** [item] for a top-level item, [item, child] inside a dropdown. */
export type MenuPath = [number] | [number, number];

export interface MenuEntry {
  row: PageRow;
  at: MenuPath;
  /** The dropdown's title when the page sits inside one. */
  under?: string;
}

export interface Grouped {
  inMenu: MenuEntry[];
  notInMenu: PageRow[];
}

/** The pages the menu links to, in menu order (dropdown pages follow their title), and the rest by address. */
export function groupPages(rows: PageRow[], menu: MenuLink[]): Grouped {
  const byPath = new Map(rows.map((r) => [r.path, r]));
  const inMenu: MenuEntry[] = [];
  const seen = new Set<string>();
  const take = (l: MenuLink, at: MenuPath, under?: string) => {
    const row = byPath.get(l.href);
    if (!row || seen.has(row.path)) return;
    seen.add(row.path);
    inMenu.push({ row, at, ...(under ? { under } : {}) });
  };
  menu.forEach((l, i) => {
    take(l, [i]);
    l.children?.forEach((c, j) => take(c, [i, j], l.label || l.href));
  });
  const notInMenu = rows
    .filter((r) => !seen.has(r.path))
    .sort((a, b) => (a.path === "/" ? -1 : b.path === "/" ? 1 : a.path.localeCompare(b.path)));
  return { inMenu, notInMenu };
}

const sameAt = (a: MenuPath, b: MenuPath) => a.length === b.length && a.every((n, i) => n === b[i]);
export const atKey = (a: MenuPath) => a.join("-");
export { sameAt };

const itemAt = (menu: MenuLink[], at: MenuPath): MenuLink | undefined => (at.length === 1 ? menu[at[0]] : menu[at[0]]?.children?.[at[1]]);

const withChildren = (l: MenuLink, children: MenuLink[]): MenuLink => {
  const { children: _drop, ...rest } = l;
  return children.length ? { ...rest, children } : rest;
};

/** Moves `list[i]` to `j`. */
function relocate<T>(list: T[], i: number, j: number): T[] {
  const next = [...list];
  const [item] = next.splice(i, 1);
  next.splice(j, 0, item!);
  return next;
}

/**
 * One step up or down among the page links of the same list: it jumps
 * over menu items that are not pages, so a press always shows a change.
 * Null at either end.
 */
export function moveStep(menu: MenuLink[], at: MenuPath, by: -1 | 1, isPage: (href: string) => boolean): MenuLink[] | null {
  const list = at.length === 1 ? menu : menu[at[0]]?.children;
  const i = at[at.length - 1]!;
  if (!list) return null;
  let j = i + by;
  while (j >= 0 && j < list.length && !isPage(list[j]!.href)) j += by;
  if (j < 0 || j >= list.length) return null;
  const moved = relocate(list, i, j);
  if (at.length === 1) return moved;
  return menu.map((l, k) => (k === at[0] ? withChildren(l, moved) : l));
}

/** Drag and drop: a top-level item goes before the top-level item `before` (or to the end when `before` is null). */
export function moveBefore(menu: MenuLink[], from: MenuPath, before: MenuPath | null): MenuLink[] | null {
  if (from.length !== 1 || (before && before.length !== 1)) return null;
  const i = from[0];
  let j = before ? before[0] : menu.length;
  if (j === i || j === i + 1) return null;
  if (j > i) j -= 1;
  return relocate(menu, i, j);
}

/** "Add to menu": a link to the page, labelled with its title, at the end (or before `before`). Null when the menu is full. */
export function addPage(menu: MenuLink[], row: PageRow, before: MenuPath | null = null): MenuLink[] | null {
  if (menu.length >= chromeLimits.menu) return null;
  if (menu.some((l) => l.href === row.path || l.children?.some((c) => c.href === row.path))) return null;
  const link: MenuLink = { label: (row.title || row.path).slice(0, chromeLimits.label), href: row.path };
  const next = [...menu];
  next.splice(before && before.length === 1 ? before[0] : next.length, 0, link);
  return next;
}

/** "Take out of menu". A dropdown title that loses its last page stays as a title. */
export function takeOut(menu: MenuLink[], at: MenuPath): MenuLink[] {
  return removeItem(menu, at);
}

export const hrefAt = (menu: MenuLink[], at: MenuPath) => itemAt(menu, at)?.href;

/** Position among the page entries, for "2 of 5". */
export function positionOf(entries: MenuEntry[], at: MenuPath): number {
  return entries.findIndex((e) => sameAt(e.at, at)) + 1;
}

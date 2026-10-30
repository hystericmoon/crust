/**
 * The layout library in the builder (F026): which layouts to show, where one
 * lands, and inserting it as one undoable step. The gallery and the "+"
 * buttons on the canvas share this.
 */
import {
  buildPageLayout,
  insertLayout,
  pageLayouts,
  sectionLayouts,
  type LayoutCategory,
  type PageLayout,
  type SectionLayout,
} from "@crust/blocks";
import type { ComponentData, Config, Data } from "@puckeditor/core";

export type LayoutKind = "section" | "page";
export type LayoutItem = { kind: "section"; layout: SectionLayout } | { kind: "page"; layout: PageLayout };

const words = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Layouts of one kind, in one category ("All" for every one), matching every word of the search. */
export function filterLayouts(kind: LayoutKind, category: LayoutCategory | "All", query: string): LayoutItem[] {
  const terms = words(query).split(/\s+/).filter(Boolean);
  const matches = (text: string) => terms.every((t) => words(text).includes(t));
  if (kind === "page") {
    return pageLayouts
      .filter((l) => matches(`${l.name} ${l.description} page`))
      .map((layout) => ({ kind: "page", layout }));
  }
  return sectionLayouts
    .filter((l) => (category === "All" || l.category === category) && matches(`${l.name} ${l.category} ${l.description}`))
    .map((layout) => ({ kind: "section", layout }));
}

/** Fresh blocks for a layout. */
export const buildItem = (item: LayoutItem): ComponentData[] =>
  item.kind === "page" ? buildPageLayout(item.layout) : item.layout.build();

const isTree = (v: unknown): v is ComponentData[] =>
  Array.isArray(v) && v.every((x) => x && typeof x === "object" && "type" in x);

const contains = (item: ComponentData, id: string): boolean =>
  item.props.id === id || Object.values(item.props).some((v) => isTree(v) && v.some((child) => contains(child, id)));

/** Position of the top-level block that is or holds `id`, or null. */
export function topLevelIndexOf(content: ComponentData[], id: string | null | undefined): number | null {
  if (!id) return null;
  const i = content.findIndex((item) => contains(item, id));
  return i === -1 ? null : i;
}

/** Where the "Layouts" button adds: after the selected block's section, else at the end. */
export function insertionPoint(content: ComponentData[], selectedId: string | null | undefined): number {
  const i = topLevelIndexOf(content, selectedId);
  return i === null ? content.length : i + 1;
}

/** A short name for a top-level block: its first heading, else its type. */
export function blockName(config: Config, item: ComponentData): string {
  let heading = "";
  const walk = (list: ComponentData[]) => {
    for (const child of list) {
      if (heading) return;
      if (child.type === "Heading" && typeof child.props.text === "string" && child.props.text.trim()) heading = child.props.text.trim();
      for (const v of Object.values(child.props)) if (isTree(v)) walk(v);
    }
  };
  walk([item]);
  const label = config.components[item.type]?.label ?? item.type;
  return heading ? `“${heading.length > 40 ? `${heading.slice(0, 39)}…` : heading}”` : label;
}

/** What the gallery says about where the layout will go. */
export function describeInsertion(config: Config, content: ComponentData[], index: number): string {
  if (content.length === 0) return "Adds to this empty page.";
  if (index <= 0) return `Adds at the top, above ${blockName(config, content[0]!)}.`;
  if (index >= content.length) return `Adds at the end, after ${blockName(config, content[content.length - 1]!)}.`;
  return `Adds between ${blockName(config, content[index - 1]!)} and ${blockName(config, content[index]!)}.`;
}

export interface Insertion {
  data: Data;
  /** Id of the first inserted block, to select and focus. */
  firstId: string;
  index: number;
  announcement: string;
}

/** The new page data with the layout in place, headings fitted to keep one h1. */
export function planLayoutInsert(data: Data, item: LayoutItem, index: number): Insertion | null {
  const blocks = buildItem(item);
  if (!blocks.length) return null;
  const at = Math.max(0, Math.min(index, data.content.length));
  const content = insertLayout(data.content, blocks, at);
  const firstId = String(content[at]!.props.id);
  const announcement =
    item.kind === "page"
      ? `Added the ${item.layout.name} page layout: ${blocks.length} sections. It uses your site style.`
      : `Added ${item.layout.name}. It uses your site style.`;
  return { data: { ...data, content }, firstId, index: at, announcement };
}

// --- Opening the gallery from anywhere (header button, canvas "+") --------------

type Opener = (index: number | null) => void;
let opener: Opener | null = null;

/** Opens the gallery to add at `index`; null means "after the selection, or at the end". */
export const openLayoutGallery = (index: number | null = null) => opener?.(index);
export function registerGalleryOpener(fn: Opener): () => void {
  opener = fn;
  return () => {
    if (opener === fn) opener = null;
  };
}

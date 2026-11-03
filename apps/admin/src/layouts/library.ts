/**
 * The layout library in the builder (F026): which layouts to show, where one
 * lands, and inserting it as one undoable step. The gallery and the "+"
 * buttons on the canvas share this.
 */
import {
  buildPageLayout,
  fitLayoutToTokens,
  insertLayout,
  linkedBlock,
  migrateRichTextBlocks,
  designLayoutsFor,
  pageLayouts,
  sectionLayouts,
  type DesignKind,
  type DesignLayout,
  type LayoutCategory,
  type LinkedSectionFile,
  type PageLayout,
  type SavedLayout,
  type SectionLayout,
  type SiteTokens,
} from "@crust/blocks";
import type { ComponentData, Config, Data } from "@puckeditor/core";

export type LayoutKind = "section" | "page" | "mine" | "linked";
export type LayoutItem =
  | { kind: "section"; layout: SectionLayout }
  | { kind: "page"; layout: PageLayout }
  | { kind: "mine"; layout: SavedLayout }
  /** F043: inserted as a link to the shared section, not a copy. */
  | { kind: "linked"; layout: LinkedSectionFile }
  /** F082: a starting design (post, blog or "Page not found"); picking one replaces the design. */
  | { kind: "design"; layout: DesignLayout };

const words = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Layouts of one kind, in one category ("All" for every one), matching every word of the search. */
export function filterLayouts(
  kind: LayoutKind,
  category: LayoutCategory | "All",
  query: string,
  mine: SavedLayout[] = [],
  linked: LinkedSectionFile[] = [],
  design: DesignKind | null = null,
): LayoutItem[] {
  const terms = words(query).split(/\s+/).filter(Boolean);
  const matches = (text: string) => terms.every((t) => words(text).includes(t));
  if (kind === "linked") return linked.filter((l) => matches(`${l.name} linked section`)).map((layout) => ({ kind: "linked", layout }));
  if (kind === "mine") {
    // F080: saved element styles live beside saved layouts, but aren't layouts.
    return mine.filter((l) => l.kind !== "element" && matches(`${l.name} ${l.kind === "page" ? "page" : "section"}`)).map((layout) => ({ kind: "mine", layout }));
  }
  // F082: in a design, "Whole pages" are that design's starting designs.
  if (kind === "page" && design) {
    return designLayoutsFor(design)
      .filter((l) => matches(`${l.name} ${l.description} design`))
      .map((layout) => ({ kind: "design", layout }));
  }
  if (kind === "page") {
    return pageLayouts
      .filter((l) => matches(`${l.name} ${l.description} page${l.simple ? " simple" : ""}`))
      .map((layout) => ({ kind: "page", layout }));
  }
  return sectionLayouts
    .filter((l) => (category === "All" || l.category === category) && matches(`${l.name} ${l.category} ${l.description}${l.simple ? " simple" : ""}`))
    .map((layout) => ({ kind: "section", layout }));
}

const isTree = (v: unknown): v is ComponentData[] =>
  Array.isArray(v) && v.every((x) => x && typeof x === "object" && "type" in x);

/** A copy of blocks with new ids all the way down, so a layout can be inserted any number of times. */
export function freshIds(items: ComponentData[]): ComponentData[] {
  return items.map((item) => {
    const props: Record<string, unknown> = { ...item.props, id: `${item.type}-${globalThis.crypto.randomUUID()}` };
    for (const [k, v] of Object.entries(props)) if (isTree(v)) props[k] = freshIds(v);
    return { ...item, props: props as ComponentData["props"] };
  });
}

/** Fresh blocks for a layout; built-in ones fitted to the site's colours when `tokens` are given (F080). */
export function buildItem(item: LayoutItem, tokens?: SiteTokens): ComponentData[] {
  if (item.kind === "linked") return [linkedBlock(item.layout.id)];
  if (item.kind === "mine") return freshIds(migrateRichTextBlocks(item.layout.content));
  if (item.kind === "design") return freshIds(item.layout.build());
  const blocks = item.kind === "page" ? buildPageLayout(item.layout) : item.layout.build();
  return tokens ? fitLayoutToTokens(blocks, tokens) : blocks;
}

/** F080: built-in items split into the new layouts and the first library's plainer ones ("Simple"). */
export function splitSimple(items: LayoutItem[]): { main: LayoutItem[]; simple: LayoutItem[] } {
  const isSimple = (i: LayoutItem) => (i.kind === "section" || i.kind === "page") && (i.layout as { simple?: boolean }).simple === true;
  return { main: items.filter((i) => !isSimple(i)), simple: items.filter(isSimple) };
}

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

/** The first heading's text in a tree of blocks, or "". */
export function firstHeading(items: ComponentData[]): string {
  let heading = "";
  const walk = (list: ComponentData[]) => {
    for (const child of list) {
      if (heading) return;
      if (child.type === "Heading" && typeof child.props.text === "string" && child.props.text.trim()) heading = child.props.text.trim();
      for (const v of Object.values(child.props)) if (isTree(v)) walk(v);
    }
  };
  walk(items);
  return heading;
}

/** A short name for a top-level block: its first heading, else its type. */
export function blockName(config: Config, item: ComponentData): string {
  const heading = firstHeading([item]);
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
export function planLayoutInsert(data: Data, item: LayoutItem, index: number, tokens?: SiteTokens): Insertion | null {
  const blocks = buildItem(item, tokens);
  if (!blocks.length) return null;
  // F082: a starting design is the whole design, so it replaces what's there (one Undo brings it back).
  if (item.kind === "design") {
    return {
      data: { ...data, content: blocks },
      firstId: String(blocks[0]!.props.id),
      index: 0,
      announcement: `The design is now “${item.layout.name}”. Undo brings back the one before.`,
    };
  }
  const at = Math.max(0, Math.min(index, data.content.length));
  const content = insertLayout(data.content, blocks, at);
  const firstId = String(content[at]!.props.id);
  const sections = blocks.length === 1 ? "" : `: ${blocks.length} sections`;
  const announcement =
    item.kind === "page"
      ? `Added the ${item.layout.name} page layout: ${blocks.length} sections. It uses your site style.`
      : item.kind === "mine"
        ? `Added your layout “${item.layout.name}”${sections}.`
        : item.kind === "linked"
          ? `Added the linked section “${item.layout.name}”. Edit it once and every page that shows it changes.`
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

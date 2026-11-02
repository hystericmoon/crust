/**
 * F046: placeholder content. A template's sample words and photos can be
 * marked "replace me" so a first publish never shows them. The mark is an
 * optional `placeholder` list on a block's props, naming the fields that
 * still hold sample content (`["title", "imageSrc"]`). The builder outlines
 * marked blocks and lists them; publishing stops while any are left.
 *
 * A single field (a heading, a photo) stops being sample content as soon as
 * it's edited. A list (a Grid's cards, a Gallery's photos) is only done when
 * you say so, because changing one card doesn't replace the others.
 */
import { LAYOUT_PHOTO_PREFIX, layoutPhotoSrcs } from "./layout-photos";
import { richTextToPlain } from "./rich-text";

export type PlaceholderKind = "text" | "photo" | "list";
export interface MarkableField {
  field: string;
  label: string;
  kind: PlaceholderKind;
}

const text = (field: string, label: string): MarkableField => ({ field, label, kind: "text" });
const photo = (field: string, label = "Photo"): MarkableField => ({ field, label, kind: "photo" });
const list = (field: string, label: string): MarkableField => ({ field, label, kind: "list" });

/** The fields each block can mark, in the order the checklist names them. */
export const markableFields: Readonly<Record<string, readonly MarkableField[]>> = {
  Section: [photo("imageSrc", "Background photo")],
  Heading: [text("text", "Text"), text("eyebrow", "Small label")],
  Text: [text("text", "Text")],
  Image: [photo("src")],
  Button: [text("label", "Button text")],
  Card: [text("title", "Title"), text("text", "Text"), photo("imageSrc")],
  Grid: [list("items", "Cards")],
  Gallery: [list("images", "Photos")],
  Accordion: [list("items", "Questions")],
  IconList: [list("items", "List")],
  LogoRow: [list("logos", "Logos")],
  Quote: [text("text", "Quote"), text("name", "Name"), text("role", "Role"), photo("imageSrc")],
  ImageOverlay: [photo("imageSrc"), text("title", "Title"), text("text", "Text")],
  Divider: [text("label", "Label")],
  SocialLinks: [list("links", "Profiles")],
  Stats: [list("items", "Figures")],
  Video: [text("src", "Video"), text("title", "Title"), photo("imageSrc", "Cover photo")],
  Table: [text("caption", "Title"), list("rows", "Cells")],
  Pricing: [list("plans", "Plans")],
  Slideshow: [list("slides", "Slides")],
  CardSlider: [list("items", "Cards")],
  Tabs: [list("tabs", "Tabs")],
  Map: [text("place", "Place name"), text("address", "Address"), photo("imageSrc", "Photo of the place")],
};

/** Plain names of blocks, for the checklist and the publish check. */
const blockNames: Record<string, string> = {
  Section: "Section",
  Heading: "Heading",
  Text: "Text",
  Image: "Image",
  Button: "Button",
  Card: "Card",
  Grid: "Card grid",
  Gallery: "Gallery",
  Accordion: "Questions",
  IconList: "List",
  LogoRow: "Logo row",
  Quote: "Quote",
  ImageOverlay: "Photo with text",
  Icon: "Icon",
  Divider: "Divider",
  SocialLinks: "Social links",
  Stats: "Stats",
  Video: "Video",
  Table: "Table",
  Pricing: "Pricing",
  Slideshow: "Slideshow",
  CardSlider: "Card slider",
  Tabs: "Tabs",
  Map: "Map",
};
export const blockName = (type: string): string => blockNames[type] ?? type;

/** A stored mark, cleaned: known fields of this block only, each once, in the block's order. */
export function cleanPlaceholder(type: string, value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return (markableFields[type] ?? []).map((f) => f.field).filter((f) => value.includes(f));
}

export interface Placeholder {
  /** The block's id, to select it in the builder. */
  id: string;
  type: string;
  /** The marked fields, with their labels. */
  fields: MarkableField[];
  /** A short quote of what's there now, e.g. “Your studio name”; "" when there's nothing to quote. */
  preview: string;
}

type Block = { type: string; props: Record<string, unknown> };
const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const isBlock = (v: unknown): v is Block => isObject(v) && typeof v.type === "string" && isObject(v.props);
const isBlockList = (v: unknown): v is Block[] => Array.isArray(v) && v.length > 0 && v.every(isBlock);

function shorten(s: string, max = 40): string {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
}
const fileName = (src: string) => decodeURIComponent(src.split(/[?#]/)[0]!.split("/").pop() ?? "");

function previewOf(props: Record<string, unknown>, fields: MarkableField[]): string {
  for (const f of fields) {
    const v = props[f.field];
    if (f.kind === "text") {
      const s = shorten(typeof v === "string" ? v : richTextToPlain(v));
      if (s) return `“${s}”`;
    } else if (f.kind === "photo" && typeof v === "string" && v.trim()) {
      return fileName(v.trim());
    } else if (f.kind === "list" && Array.isArray(v)) {
      return v.length === 1 ? "1 item" : `${v.length} items`;
    }
  }
  return "";
}

const byReadingOrder = (a: string, b: string) => a.localeCompare(b, "en", { numeric: true });

/** The marked blocks in a list of blocks, in page order, including blocks inside sections and columns. */
export function findPlaceholders(blocks: unknown): Placeholder[] {
  const out: Placeholder[] = [];
  const visit = (v: unknown) => {
    if (!Array.isArray(v)) return;
    for (const b of v) {
      if (!isBlock(b)) continue;
      const marked = cleanPlaceholder(b.type, b.props.placeholder);
      if (marked.length) {
        const fields = markableFields[b.type]!.filter((f) => marked.includes(f.field));
        out.push({ id: typeof b.props.id === "string" ? b.props.id : "", type: b.type, fields, preview: previewOf(b.props, fields) });
      }
      // F069: slots in reading order (column1, column2, …). The builder's
      // copy of a page can hold them in another order, which listed a row of
      // columns backwards.
      for (const key of Object.keys(b.props).sort(byReadingOrder)) {
        const child = b.props[key];
        if (isBlockList(child)) visit(child);
      }
    }
  };
  visit(blocks);
  return out;
}

/** How many things are left to replace: one per marked field. */
export const countPlaceholders = (blocks: unknown): number => findPlaceholders(blocks).reduce((n, p) => n + p.fields.length, 0);

/** "Heading “Your studio name”" etc.: how a marked block is named on its own. */
export function placeholderLabel(type: string, props: Record<string, unknown>): string {
  const marked = cleanPlaceholder(type, props.placeholder);
  if (!marked.length) return "";
  const fields = markableFields[type]!.filter((f) => marked.includes(f.field));
  const preview = previewOf(props, fields);
  const what = fields.map((f) => f.label.toLowerCase()).join(", ");
  return `${blockName(type)}${preview ? ` ${preview}` : ""} (${what})`;
}

/** "Replace me: text, photo": the label the builder shows on a marked block. */
export function placeholderBadge(type: string, value: unknown): string {
  const marked = cleanPlaceholder(type, value);
  if (!marked.length) return "";
  return `Replace me: ${markableFields[type]!.filter((f) => marked.includes(f.field)).map((f) => f.label.toLowerCase()).join(", ")}`;
}

const same = (a: unknown, b: unknown) => a === b || JSON.stringify(a) === JSON.stringify(b);

const stem = (src: string) => fileName(src).replace(/(-\d+)?\.[a-z0-9]+$/i, "");
/**
 * F080: the builder swapping a layout's sample photo for its copy in the
 * Media library (sample-pool.jpg → /media/sample-pool.jpg, or -2 when the
 * name was taken) isn't the owner replacing it, so the mark stays.
 */
export const isSampleCopy = (before: unknown, after: unknown): boolean =>
  typeof before === "string" &&
  typeof after === "string" &&
  before.startsWith(LAYOUT_PHOTO_PREFIX) &&
  after.startsWith("/media/") &&
  stem(after) === stem(before);

/**
 * F080: a block still pointing at a builder sample photo (not yet copied into
 * the Media library) can't be published: the photo isn't part of the site.
 * Its own props only; blocks inside it are checked on their own.
 */
export function uncopiedSampleLabel(type: string, props: Record<string, unknown>): string {
  const own = Object.fromEntries(Object.entries(props).filter(([, v]) => !isBlockList(v)));
  return layoutPhotoSrcs(own).length ? `${blockName(type)} (sample photo not in your Media library yet)` : "";
}

function mapBlocks(blocks: Block[], fn: (b: Block) => Block): Block[] {
  let changed = false;
  const out = blocks.map((b) => {
    if (!isBlock(b)) return b;
    let props = b.props;
    for (const [k, v] of Object.entries(b.props)) {
      if (!isBlockList(v)) continue;
      const next = mapBlocks(v, fn);
      if (next !== v) props = { ...props, [k]: next };
    }
    const own = fn(props === b.props ? b : { ...b, props });
    if (own !== b) changed = true;
    return own;
  });
  return changed ? out : blocks;
}

function withMark(b: Block, marked: string[]): Block {
  const { placeholder: _old, ...rest } = b.props;
  return { ...b, props: marked.length ? { ...rest, placeholder: marked } : rest };
}

/**
 * After an edit: marked text and photo fields whose value changed stop being
 * placeholders. Lists stay marked (see the top of this file). Returns the
 * same array when nothing changed, so callers can skip an update.
 */
export function clearEditedPlaceholders<T>(before: T, after: T): T {
  if (!Array.isArray(before) || !Array.isArray(after)) return after;
  const old = new Map<string, Record<string, unknown>>();
  const collect = (v: unknown) => {
    if (!Array.isArray(v)) return;
    for (const b of v) {
      if (!isBlock(b)) continue;
      if (typeof b.props.id === "string") old.set(b.props.id, b.props);
      for (const child of Object.values(b.props)) if (isBlockList(child)) collect(child);
    }
  };
  collect(before);
  return mapBlocks(after as Block[], (b) => {
    const marked = cleanPlaceholder(b.type, b.props.placeholder);
    const prev = typeof b.props.id === "string" ? old.get(b.props.id) : undefined;
    if (!marked.length || !prev) return b;
    const kinds = new Map(markableFields[b.type]!.map((f) => [f.field, f.kind]));
    // Only marks that were there before the edit: undoing an edit brings its mark back.
    const before = cleanPlaceholder(b.type, prev.placeholder);
    const left = marked.filter((f) => kinds.get(f) === "list" || !before.includes(f) || same(prev[f], b.props[f]) || isSampleCopy(prev[f], b.props[f]));
    return left.length === marked.length ? b : withMark(b, left);
  }) as T;
}

/** "Keep as is": removes a block's mark (all of it, or one field). */
export function unmarkPlaceholder<T>(blocks: T, id: string, field?: string): T {
  if (!Array.isArray(blocks)) return blocks;
  return mapBlocks(blocks as Block[], (b) => {
    if (b.props.id !== id || b.props.placeholder === undefined) return b;
    return withMark(b, field ? cleanPlaceholder(b.type, b.props.placeholder).filter((f) => f !== field) : []);
  }) as T;
}

/** The publish check's wording, also used before publishing in the admin. */
export function placeholderSummary(n: number): string {
  return n === 1 ? "1 thing to replace" : `${n} things to replace`;
}

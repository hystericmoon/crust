/**
 * Phone quick edit (F038): the words, button labels and photos on a page,
 * in reading order, without layout. Each entry knows where its value
 * lives in the block tree, so a change touches only that value.
 */
import { richTextToPlain, type RichText } from "@crust/blocks";
import type { ComponentData, Data } from "@puckeditor/core";

/** "rich": a Text block's rich text (F042), edited with the same toolbar as the builder. */
export type QuickKind = "text" | "textarea" | "image" | "rich";

export interface QuickSpec {
  key: string;
  label: string;
  kind: QuickKind;
  /** For images: the block's alt text field, set with the photo. */
  altKey?: string;
}

/** What can be edited in each block; lists name their array and its item fields. */
const blockSpecs: Record<string, { name: string; fields: QuickSpec[]; lists?: { key: string; item: string; fields: QuickSpec[] }[] }> = {
  Heading: { name: "Heading", fields: [{ key: "text", label: "Heading", kind: "text" }] },
  Text: { name: "Text", fields: [{ key: "text", label: "Text", kind: "rich" }] },
  Button: { name: "Button", fields: [{ key: "label", label: "Button label", kind: "text" }] },
  Image: {
    name: "Image",
    fields: [
      { key: "src", label: "Photo", kind: "image", altKey: "alt" },
      { key: "alt", label: "Alt text", kind: "text" },
      { key: "caption", label: "Caption", kind: "text" },
    ],
  },
  Card: {
    name: "Card",
    fields: [
      { key: "imageSrc", label: "Photo", kind: "image", altKey: "imageAlt" },
      { key: "title", label: "Title", kind: "text" },
      { key: "text", label: "Text", kind: "textarea" },
      { key: "linkLabel", label: "Link label", kind: "text" },
    ],
  },
  Quote: {
    name: "Quote",
    fields: [
      { key: "text", label: "Quote", kind: "textarea" },
      { key: "name", label: "Name", kind: "text" },
      { key: "role", label: "Role", kind: "text" },
    ],
  },
  ImageOverlay: {
    name: "Image overlay",
    fields: [
      { key: "imageSrc", label: "Photo", kind: "image", altKey: "imageAlt" },
      { key: "title", label: "Title", kind: "text" },
      { key: "text", label: "Text", kind: "textarea" },
      { key: "linkLabel", label: "Button label", kind: "text" },
    ],
  },
  Section: { name: "Section", fields: [{ key: "imageSrc", label: "Background photo", kind: "image" }] },
  Grid: {
    name: "Grid of cards",
    fields: [],
    lists: [
      {
        key: "items",
        item: "Card",
        fields: [
          { key: "imageSrc", label: "Photo", kind: "image", altKey: "imageAlt" },
          { key: "title", label: "Title", kind: "text" },
          { key: "text", label: "Text", kind: "textarea" },
          { key: "linkLabel", label: "Link label", kind: "text" },
        ],
      },
    ],
  },
  Gallery: {
    name: "Gallery",
    fields: [],
    lists: [
      {
        key: "images",
        item: "Photo",
        fields: [
          { key: "src", label: "Photo", kind: "image", altKey: "alt" },
          { key: "alt", label: "Alt text", kind: "text" },
          { key: "caption", label: "Caption", kind: "text" },
        ],
      },
    ],
  },
  Accordion: {
    name: "Accordion / FAQ",
    fields: [],
    lists: [
      {
        key: "items",
        item: "Question",
        fields: [
          { key: "question", label: "Question", kind: "text" },
          { key: "answer", label: "Answer", kind: "textarea" },
        ],
      },
    ],
  },
  IconList: { name: "Icon list", fields: [], lists: [{ key: "items", item: "Line", fields: [{ key: "text", label: "Text", kind: "text" }] }] },
  // F078
  Stats: {
    name: "Stats",
    fields: [],
    lists: [
      {
        key: "items",
        item: "Figure",
        fields: [
          { key: "value", label: "Figure", kind: "text" },
          { key: "label", label: "What it counts", kind: "text" },
          { key: "detail", label: "Extra line", kind: "text" },
        ],
      },
    ],
  },
  Video: {
    name: "Video",
    fields: [
      { key: "title", label: "What the video is", kind: "text" },
      { key: "imageSrc", label: "Cover photo", kind: "image" },
      { key: "caption", label: "Caption", kind: "text" },
    ],
  },
  Table: { name: "Table", fields: [{ key: "caption", label: "Title", kind: "text" }] },
  Pricing: {
    name: "Pricing",
    fields: [{ key: "badge", label: "Badge", kind: "text" }],
    lists: [
      {
        key: "plans",
        item: "Plan",
        fields: [
          { key: "name", label: "Plan name", kind: "text" },
          { key: "price", label: "Price", kind: "text" },
          { key: "period", label: "After the price", kind: "text" },
          { key: "description", label: "Description", kind: "textarea" },
          { key: "features", label: "What's included (one per line)", kind: "textarea" },
          { key: "buttonLabel", label: "Button text", kind: "text" },
        ],
      },
    ],
  },
  LogoRow: {
    name: "Logo row",
    fields: [],
    lists: [
      {
        key: "logos",
        item: "Logo",
        fields: [
          { key: "src", label: "Logo", kind: "image", altKey: "alt" },
          { key: "alt", label: "Company name", kind: "text" },
        ],
      },
    ],
  },
  // F079
  Slideshow: {
    name: "Slideshow",
    fields: [],
    lists: [
      {
        key: "slides",
        item: "Slide",
        fields: [
          { key: "imageSrc", label: "Photo", kind: "image", altKey: "imageAlt" },
          { key: "imageAlt", label: "Photo description", kind: "text" },
          { key: "title", label: "Title", kind: "text" },
          { key: "text", label: "Line under it", kind: "text" },
        ],
      },
    ],
  },
  CardSlider: {
    name: "Card slider",
    fields: [],
    lists: [
      {
        key: "items",
        item: "Card",
        fields: [
          { key: "title", label: "Title", kind: "text" },
          { key: "text", label: "Text", kind: "textarea" },
          { key: "imageSrc", label: "Photo", kind: "image", altKey: "imageAlt" },
        ],
      },
    ],
  },
  Tabs: {
    name: "Tabs",
    fields: [],
    lists: [
      {
        key: "tabs",
        item: "Tab",
        fields: [
          { key: "label", label: "Tab name", kind: "text" },
          { key: "text", label: "Text", kind: "textarea" },
        ],
      },
    ],
  },
  Map: {
    name: "Map",
    fields: [
      { key: "place", label: "Place name", kind: "text" },
      { key: "address", label: "Address", kind: "textarea" },
    ],
  },
};

/** One editable value. `list`/`index` point into a block's list (e.g. a Gallery photo). */
export interface QuickField extends QuickSpec {
  /** Unique, stable for React keys and ids. */
  id: string;
  blockId: string;
  list?: string;
  index?: number;
  /** The words (for rich text: without styles, to tell whether there are any). */
  value: string;
  /** Rich text fields: the value as stored. */
  rich?: unknown;
}

export interface QuickGroup {
  /** "Heading", "Card 2 of Grid of cards"… */
  title: string;
  blockId: string;
  fields: QuickField[];
}

const isBlock = (v: unknown): v is ComponentData => typeof v === "object" && v !== null && typeof (v as ComponentData).type === "string" && typeof (v as ComponentData).props === "object";
const childLists = (b: ComponentData) => Object.values(b.props).filter((v): v is ComponentData[] => Array.isArray(v) && v.length > 0 && v.every(isBlock));
const str = (v: unknown) => (typeof v === "string" ? v : "");

/** Everything editable on a page, in reading order, grouped by block. */
export function quickGroups(data: Data): QuickGroup[] {
  const groups: QuickGroup[] = [];
  const visit = (blocks: ComponentData[]) => {
    for (const b of blocks) {
      const spec = blockSpecs[b.type];
      const blockId = String(b.props.id ?? "");
      if (spec) {
        const own = spec.fields.map((f) => ({
          ...f,
          id: `${blockId}:${f.key}`,
          blockId,
          value: f.kind === "rich" ? richTextToPlain(b.props[f.key]) : str(b.props[f.key]),
          ...(f.kind === "rich" ? { rich: b.props[f.key] } : {}),
        }));
        // A Section only matters here when it has a background photo to swap.
        if (b.type !== "Section" || own.some((f) => f.value.trim())) {
          if (own.length) groups.push({ title: spec.name, blockId, fields: own });
        }
        for (const list of spec.lists ?? []) {
          const items = Array.isArray(b.props[list.key]) ? (b.props[list.key] as Record<string, unknown>[]) : [];
          items.forEach((item, index) =>
            groups.push({
              title: `${list.item} ${index + 1} of ${items.length} · ${spec.name}`,
              blockId,
              fields: list.fields.map((f) => ({ ...f, id: `${blockId}:${list.key}:${index}:${f.key}`, blockId, list: list.key, index, value: str(item[f.key]) })),
            }),
          );
        }
      }
      for (const children of childLists(b)) visit(children);
    }
  };
  visit(data.content);
  return groups;
}

/** A copy of the page with one value changed (and, for a photo, its alt text). */
export function applyQuickEdit(data: Data, field: Pick<QuickField, "blockId" | "key" | "list" | "index">, value: string | RichText, extra: Record<string, string> = {}): Data {
  const patch = { [field.key]: value, ...extra };
  const edit = (blocks: ComponentData[]): ComponentData[] =>
    blocks.map((b) => {
      let props = b.props;
      if (String(b.props.id) === field.blockId) {
        if (field.list !== undefined && field.index !== undefined) {
          const items = Array.isArray(props[field.list]) ? [...(props[field.list] as Record<string, unknown>[])] : [];
          if (items[field.index]) items[field.index] = { ...items[field.index], ...patch };
          props = { ...props, [field.list]: items };
        } else {
          props = { ...props, ...patch };
        }
      }
      // Walk into slots (Section content, Columns) without touching other props.
      const next: Record<string, unknown> = { ...props };
      let changed = props !== b.props;
      for (const [k, v] of Object.entries(props)) {
        if (Array.isArray(v) && v.length && v.every(isBlock)) {
          const inner = edit(v as ComponentData[]);
          if (inner.some((x, i) => x !== v[i])) {
            next[k] = inner;
            changed = true;
          }
        }
      }
      return changed ? { ...b, props: next as ComponentData["props"] } : b;
    });
  return { ...data, content: edit(data.content) };
}

/** Phones get quick edit unless the full builder was asked for. */
export const prefersQuickEdit = (width: number, hash: string) => {
  const q = new URLSearchParams(hash.split("?")[1] ?? "");
  if (q.get("mode") === "full") return false;
  if (q.get("mode") === "quick") return true;
  return width <= 760;
};

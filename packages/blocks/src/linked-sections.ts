/**
 * Linked sections (F043): a section saved once in content/sections/<id>.json
 * and shown on many pages through a small LinkedSection block that points to
 * it. Editing the file updates every page; publishing builds each page with
 * the section's current content. No React here: the server uses it too.
 */
import type { ComponentData, Data } from "@puckeditor/core";
import { fitHeadings } from "./layouts";

export const SECTIONS_FOLDER = "content/sections";
export const LINKED_TYPE = "LinkedSection";
export const MAX_SECTION_NAME = 60;

export interface LinkedSectionFile {
  id: string;
  name: string;
  savedAt: string;
  /** Top-level blocks, like a page's content (normally one Section). */
  content: ComponentData[];
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const isBlock = (v: unknown): v is ComponentData => isObject(v) && typeof v.type === "string" && /^[A-Z][A-Za-z0-9]*$/.test(v.type) && isObject(v.props);

export const isValidSectionId = (id: unknown): id is string => typeof id === "string" && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(id) && id.length <= 80;
export const sectionFileFor = (id: string) => `${SECTIONS_FOLDER}/${id}.json`;
export const sectionIdForFile = (path: string): string | null => {
  const m = /^content\/sections\/([a-z0-9-]+)\.json$/.exec(path);
  return m && isValidSectionId(m[1]) ? m[1]! : null;
};

/** A readable id from the name, unique among `taken`: "Contact strip" → "contact-strip", "contact-strip-2"… */
export function sectionIdFor(name: string, taken: ReadonlySet<string>): string {
  const base =
    name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "section";
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

export function checkSectionName(name: unknown): string[] {
  if (typeof name !== "string" || !name.trim()) return ["The linked section needs a name."];
  if (name.trim().length > MAX_SECTION_NAME) return [`The linked section's name is longer than ${MAX_SECTION_NAME} characters.`];
  return [];
}

/** What a linked section's blocks may be: blocks, none of them a link to another linked section. */
export function checkSectionContent(content: unknown): string[] {
  if (!Array.isArray(content) || content.length === 0 || !content.every(isBlock)) return ["The linked section's blocks are missing or damaged."];
  if (linkedSectionIds(content).size) return ["A linked section can't hold another linked section. Unlink it first."];
  return [];
}

/** A section file as read back; null when it isn't one. */
export function parseLinkedSection(text: string | null, id: string): LinkedSectionFile | null {
  if (!text) return null;
  try {
    const v = JSON.parse(text) as unknown;
    if (!isObject(v) || v.id !== id || checkSectionName(v.name).length || checkSectionContent(v.content).length) return null;
    return { id, name: String(v.name).trim(), savedAt: typeof v.savedAt === "string" ? v.savedAt : "", content: v.content as ComponentData[] };
  } catch {
    return null;
  }
}

/** The page's main heading belongs to each page: an h1 in a linked section becomes an h2. */
export const sectionContentFor = (content: ComponentData[]): ComponentData[] => fitHeadings(content, true);

/** The block a page holds in place of the section. */
export const linkedBlock = (sectionId: string): ComponentData => ({
  type: LINKED_TYPE,
  props: { id: `${LINKED_TYPE}-${globalThis.crypto.randomUUID()}`, section: sectionId },
});

const walkBlocks = (blocks: unknown, visit: (b: ComponentData) => void) => {
  if (!Array.isArray(blocks)) return;
  for (const b of blocks) {
    if (!isBlock(b)) continue;
    visit(b);
    for (const v of Object.values(b.props)) if (Array.isArray(v) && v.some(isBlock)) walkBlocks(v, visit);
  }
};

/** The linked sections a page (its content, zones, or a plain block list) uses. */
export function linkedSectionIds(data: unknown): Set<string> {
  const ids = new Set<string>();
  const visit = (b: ComponentData) => {
    if (b.type === LINKED_TYPE && typeof b.props.section === "string") ids.add(b.props.section);
  };
  if (Array.isArray(data)) walkBlocks(data, visit);
  else if (isObject(data)) {
    walkBlocks(data.content, visit);
    if (isObject(data.zones)) for (const z of Object.values(data.zones)) walkBlocks(z, visit);
  }
  return ids;
}

export class MissingLinkedSection extends Error {
  constructor(readonly section: string) {
    super(`A page uses the linked section "${section}", which doesn't exist any more. Open the page and remove or replace it.`);
  }
}

/** Ids made unique per use, so a section shown twice on a page still has distinct keys and anchors. */
function withIds(blocks: ComponentData[], prefix: string): ComponentData[] {
  return blocks.map((b) => {
    const props: Record<string, unknown> = { ...b.props, id: `${prefix}-${String(b.props.id ?? b.type)}` };
    for (const [k, v] of Object.entries(props)) if (Array.isArray(v) && v.some(isBlock)) props[k] = withIds(v as ComponentData[], prefix);
    return { ...b, props: props as ComponentData["props"] };
  });
}

/** Blocks with every LinkedSection replaced by the section's current content. Throws on a missing one. */
export function resolveLinkedBlocks(blocks: ComponentData[], sections: ReadonlyMap<string, LinkedSectionFile>): ComponentData[] {
  return blocks.flatMap((b): ComponentData[] => {
    if (b.type === LINKED_TYPE) {
      const file = sections.get(String(b.props.section));
      if (!file) throw new MissingLinkedSection(String(b.props.section));
      const content = withIds(sectionContentFor(file.content), String(b.props.id ?? file.id));
      // F029/F030: the link's own "hide on" and anchor apply to the first block.
      const own = b.props as Record<string, unknown>;
      if (content[0] && (own.hideOn || own.anchor)) {
        content[0] = { ...content[0], props: { ...content[0].props, ...(own.hideOn ? { hideOn: own.hideOn } : {}), ...(own.anchor ? { anchor: own.anchor } : {}) } };
      }
      return content;
    }
    let props = b.props;
    for (const [k, v] of Object.entries(b.props)) {
      if (Array.isArray(v) && v.some(isBlock)) props = { ...props, [k]: resolveLinkedBlocks(v as ComponentData[], sections) };
    }
    return [props === b.props ? b : { ...b, props }];
  });
}

/** A page's Puck data with linked sections built in, for publishing. */
export function resolveLinkedSections<D extends Pick<Data, "content" | "zones">>(data: D, sections: ReadonlyMap<string, LinkedSectionFile>): D {
  if (!linkedSectionIds(data).size) return data;
  const zones = data.zones ? Object.fromEntries(Object.entries(data.zones).map(([k, v]) => [k, resolveLinkedBlocks(v, sections)])) : undefined;
  return { ...data, content: resolveLinkedBlocks(data.content, sections), ...(zones ? { zones } : {}) };
}

/** "Unlink here": a normal copy of the section with fresh ids, for one page. */
export function unlinkedCopy(file: LinkedSectionFile): ComponentData[] {
  const fresh = (blocks: ComponentData[]): ComponentData[] =>
    blocks.map((b) => {
      const props: Record<string, unknown> = { ...b.props, id: `${b.type}-${globalThis.crypto.randomUUID()}` };
      for (const [k, v] of Object.entries(props)) if (Array.isArray(v) && v.some(isBlock)) props[k] = fresh(v as ComponentData[]);
      return { ...b, props: props as ComponentData["props"] };
    });
  return fresh(sectionContentFor(file.content));
}

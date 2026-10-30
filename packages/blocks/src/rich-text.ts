/**
 * Rich text for Text blocks (F042): paragraphs and lists of words that can
 * be bold, italic or a link. Saved as this structure in the page JSON, never
 * as HTML. No React here: the admin's server code checks it on save.
 *
 * Older pages hold plain text (paragraphs split by blank lines); every
 * reader goes through `toRichText`, and `migrateRichText` rewrites a page's
 * Text blocks in the new format when it's loaded into the builder.
 */
import { safeUrl } from "./url";

export type RichSpan = { text: string; bold?: true; italic?: true; href?: string };
export type RichParagraph = { type: "p"; children: RichSpan[] };
export type RichList = { type: "ul" | "ol"; items: RichSpan[][] };
export type RichBlock = RichParagraph | RichList;
export type RichText = { rich: 1; blocks: RichBlock[] };

export const richLimits = { blocks: 200, items: 100, spans: 400, chars: 20_000 } as const;

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

export const isRichText = (v: unknown): v is RichText => isObject(v) && v.rich === 1 && Array.isArray(v.blocks);

/** A link the editor and the server accept: what `safeUrl` keeps as it is. */
export const isAllowedLink = (href: string): boolean => {
  const h = href.trim();
  return h !== "" && h !== "#" && safeUrl(h) === h;
};

/** Plain text from older pages: blank lines split paragraphs; single line breaks read as spaces, as they did. */
export function plainToRichText(text: string): RichText {
  const blocks: RichBlock[] = text
    .split(/\n\s*\n/)
    .map((p) => p.trim().replace(/\s*\n\s*/g, " "))
    .filter(Boolean)
    .map((p) => ({ type: "p", children: [{ text: p }] }));
  return { rich: 1, blocks };
}

/** Plain text or rich text in, rich text out. Anything else reads as empty. */
export function toRichText(value: unknown): RichText {
  if (typeof value === "string") return plainToRichText(value);
  if (isRichText(value)) return normalizeRichText(value);
  return { rich: 1, blocks: [] };
}

/** Joins neighbouring spans with the same style and drops empty ones. */
function tidySpans(spans: RichSpan[]): RichSpan[] {
  const out: RichSpan[] = [];
  for (const s of spans) {
    if (!s.text) continue;
    const last = out[out.length - 1];
    if (last && !!last.bold === !!s.bold && !!last.italic === !!s.italic && last.href === s.href) last.text += s.text;
    else out.push({ ...s });
  }
  return out;
}

function cleanSpan(v: unknown): RichSpan | null {
  if (!isObject(v) || typeof v.text !== "string") return null;
  const span: RichSpan = { text: v.text };
  if (v.bold === true) span.bold = true;
  if (v.italic === true) span.italic = true;
  if (typeof v.href === "string" && v.href.trim()) span.href = v.href.trim();
  return span;
}

const cleanSpans = (v: unknown): RichSpan[] => (Array.isArray(v) ? tidySpans(v.map(cleanSpan).filter((s): s is RichSpan => s !== null)) : []);

/** Keeps only the known shape (unknown fields and block types are dropped). */
export function normalizeRichText(doc: RichText): RichText {
  const blocks: RichBlock[] = [];
  for (const b of doc.blocks as unknown[]) {
    if (!isObject(b)) continue;
    if (b.type === "p") blocks.push({ type: "p", children: cleanSpans(b.children) });
    else if ((b.type === "ul" || b.type === "ol") && Array.isArray(b.items)) blocks.push({ type: b.type, items: b.items.map(cleanSpans) });
  }
  return { rich: 1, blocks };
}

/** Problems with a Text block's text, in plain words; empty when it's fine. */
export function checkRichText(value: unknown): string[] {
  if (typeof value === "string") return [];
  if (!isRichText(value)) return ["A Text block's text isn't in a format Crust knows."];
  const problems: string[] = [];
  const doc = value;
  if (doc.blocks.length > richLimits.blocks) problems.push(`A Text block has more than ${richLimits.blocks} paragraphs and lists; split it into several blocks.`);
  let spans = 0;
  let chars = 0;
  const bad = new Set<string>();
  const visit = (list: unknown) => {
    if (!Array.isArray(list)) {
      problems.push("A Text block has a paragraph Crust can't read.");
      return;
    }
    for (const s of list) {
      if (!isObject(s) || typeof s.text !== "string") {
        problems.push("A Text block has words Crust can't read.");
        continue;
      }
      spans++;
      chars += s.text.length;
      if (s.href !== undefined && (typeof s.href !== "string" || !isAllowedLink(s.href))) bad.add(String(s.href));
    }
  };
  for (const b of doc.blocks as unknown[]) {
    if (!isObject(b)) problems.push("A Text block has a paragraph Crust can't read.");
    else if (b.type === "p") visit(b.children);
    else if (b.type === "ul" || b.type === "ol") {
      if (!Array.isArray(b.items) || b.items.length > richLimits.items) problems.push(`A list in a Text block has more than ${richLimits.items} items, or can't be read.`);
      else for (const item of b.items) visit(item);
    } else problems.push("A Text block has a paragraph Crust can't read.");
  }
  if (spans > richLimits.spans || chars > richLimits.chars) problems.push("A Text block is too long; split it into several blocks.");
  for (const href of bad) problems.push(`A link in a Text block can't be used: "${href.slice(0, 80)}". Use a page like /menu, a web address starting with https://, mailto: or tel:.`);
  return [...new Set(problems)];
}

/** All words, without styles: for summaries, search and Quick edit's list. */
export function richTextToPlain(value: unknown): string {
  const doc = toRichText(value);
  const line = (spans: RichSpan[]) => spans.map((s) => s.text).join("");
  return doc.blocks.map((b) => (b.type === "p" ? line(b.children) : b.items.map(line).join("\n"))).join("\n\n");
}

/** Every link in a Text block's text, changed by `fn` (null keeps it). Counts the changes. */
export function mapRichLinks(value: unknown, fn: (href: string) => string | null): { value: unknown; count: number } {
  if (!isRichText(value)) return { value, count: 0 };
  let count = 0;
  const spans = (list: RichSpan[]) =>
    list.map((s) => {
      if (!s.href) return s;
      const next = fn(s.href);
      if (next === null) return s;
      count++;
      return { ...s, href: next };
    });
  const blocks = value.blocks.map((b): RichBlock => (b.type === "p" ? { ...b, children: spans(b.children) } : { ...b, items: b.items.map(spans) }));
  return count ? { value: { ...value, blocks }, count } : { value, count: 0 };
}

type Block = { type: string; props: Record<string, unknown> };
const isBlock = (v: unknown): v is Block => isObject(v) && typeof v.type === "string" && isObject(v.props);

/** Text blocks in a block tree, plain text turned into rich text (F042 migration). Other blocks are untouched. */
export function migrateRichTextBlocks<T>(blocks: T): T {
  if (!Array.isArray(blocks)) return blocks;
  let changed = false;
  const out = blocks.map((b) => {
    if (!isBlock(b)) return b;
    let props = b.props;
    if (b.type === "Text" && typeof props.text === "string") {
      props = { ...props, text: plainToRichText(props.text) };
    }
    for (const [k, v] of Object.entries(props)) {
      if (!Array.isArray(v) || !v.some(isBlock)) continue;
      const next = migrateRichTextBlocks(v);
      if (next !== v) props = { ...props, [k]: next };
    }
    if (props === b.props) return b;
    changed = true;
    return { ...b, props };
  });
  return (changed ? out : blocks) as T;
}

/** A page's (or post's) Puck data with its Text blocks in the rich format. */
export function migrateRichText<D extends { content: unknown; zones?: Record<string, unknown> }>(data: D): D {
  const content = migrateRichTextBlocks(data.content);
  let zones = data.zones;
  if (zones) {
    const next = Object.fromEntries(Object.entries(zones).map(([k, v]) => [k, migrateRichTextBlocks(v)]));
    if (Object.entries(next).some(([k, v]) => v !== zones![k])) zones = next;
  }
  return content === data.content && zones === data.zones ? data : { ...data, content, ...(zones ? { zones } : {}) };
}

/** A one-paragraph rich text, for defaults and layouts. */
export const richParagraphs = (...paragraphs: string[]): RichText => ({ rich: 1, blocks: paragraphs.map((t) => ({ type: "p", children: [{ text: t }] })) });

/** Problems in every Text block of a block tree (and Puck zones), for the save checks. */
export function richTextProblems(data: unknown): string[] {
  const problems: string[] = [];
  const walk = (blocks: unknown) => {
    if (!Array.isArray(blocks)) return;
    for (const b of blocks) {
      if (!isBlock(b)) continue;
      if (b.type === "Text") problems.push(...checkRichText(b.props.text));
      for (const v of Object.values(b.props)) if (Array.isArray(v) && v.some(isBlock)) walk(v);
    }
  };
  if (Array.isArray(data)) walk(data);
  else if (isObject(data)) {
    walk(data.content);
    if (isObject(data.zones)) for (const z of Object.values(data.zones)) walk(z);
  }
  return [...new Set(problems)];
}

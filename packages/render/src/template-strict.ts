/**
 * F083: the stricter half of the template quality check. Four more things
 * a premium template must get right, all worked out from the template's
 * data (no browser needed):
 *
 *  - empty slots: a card, slide, gallery picture or logo without its photo;
 *  - mismatched crops: photos of very different shapes side by side;
 *  - variety: Home needs several different kinds of section;
 *  - gradients: a section gradient must keep its text readable.
 *
 * (Filler text lives in template-check.ts next to the older filler check.)
 */
import { blockName, gradientReads, mediaFileOf, sectionStyleIds, type SectionStyleId, type Template } from "@crust/blocks";
import type { CheckGroup, CheckItem } from "./template-check";

type Json = Record<string, unknown>;
type Block = { type: string; props: Json };
const isObject = (v: unknown): v is Json => typeof v === "object" && v !== null && !Array.isArray(v);
const isBlock = (v: unknown): v is Block => isObject(v) && typeof v.type === "string" && isObject(v.props);
const text = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
const list = (v: unknown): Json[] => (Array.isArray(v) ? v.filter(isObject) : []);

/** Photos in one row may differ in shape by at most this factor (4:3 next to 3:2 is fine; 3:2 next to 3:4 is not). */
export const MAX_CROP_MISMATCH = 1.3;
/** Home needs at least this many different kinds of section. */
export const MIN_HOME_SECTION_TYPES = 5;

/** Every list of blocks in a template, with where it lives in the owner's words. */
function places(t: Template): { where: string; blocks: unknown }[] {
  return [
    ...t.pages.map((p) => ({ where: `Page ${p.path}`, blocks: p.puck.content })),
    ...t.posts.map((p) => ({ where: `Post “${p.title}”`, blocks: p.puck.content })),
    ...t.sections.map((s) => ({ where: `Linked section “${s.name}”`, blocks: s.content })),
    ...(t.designs ?? []).map((d) => ({ where: `Design “${d.kind}”`, blocks: d.content })),
  ];
}

/** Calls `visit` for every block at any depth (sections, columns, tabs…). */
function walk(blocks: unknown, visit: (b: Block) => void) {
  if (!Array.isArray(blocks)) return;
  for (const b of blocks) {
    if (!isBlock(b)) continue;
    visit(b);
    for (const v of Object.values(b.props)) if (Array.isArray(v) && v.some(isBlock)) walk(v, visit);
  }
}

const shorten = (s: string, max = 40) => {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
};
const named = (label: string, title: string) => (title ? `${label} “${shorten(title)}”` : label);

// --- Empty slots ------------------------------------------------------------------------

/** What's missing in one block: a photo slot left empty. Returns lines like "Card “Harbour”: no photo". */
export function emptySlots(block: Block): string[] {
  const p = block.props;
  const out: string[] = [];
  switch (block.type) {
    case "Image":
      if (!text(p.src)) out.push("Image: no photo");
      break;
    case "Slideshow":
      list(p.slides).forEach((s, i) => {
        if (!text(s.imageSrc)) out.push(`${named(`Slide ${i + 1}`, text(s.title))}: no photo`);
      });
      break;
    case "Gallery":
      list(p.images).forEach((s, i) => {
        if (!text(s.src)) out.push(`Gallery picture ${i + 1}: no photo`);
      });
      break;
    case "LogoRow":
      list(p.logos).forEach((s, i) => {
        if (!text(s.src)) out.push(`Logo ${i + 1}: no image`);
      });
      break;
    case "Grid":
    case "CardSlider": {
      // Cards with only words are a fine design; a row where some have photos and some don't is a hole.
      const items = list(p.items);
      if (items.some((c) => text(c.imageSrc))) items.forEach((c, i) => text(c.imageSrc) || out.push(`${named(`Card ${i + 1}`, text(c.title))}: no photo, though its neighbours have one`));
      break;
    }
    case "Columns": {
      const cards: Block[] = [];
      for (const k of ["column1", "column2", "column3", "column4"]) for (const b of Array.isArray(p[k]) ? p[k] : []) if (isBlock(b) && b.type === "Card") cards.push(b);
      if (cards.some((c) => text(c.props.imageSrc) || text(c.props.icon))) {
        for (const c of cards) if (!text(c.props.imageSrc) && !text(c.props.icon)) out.push(`${named("Card", text(c.props.title))}: no photo or icon, though its neighbours have one`);
      }
      break;
    }
  }
  return out;
}

export function slotsGroup(t: Template): CheckGroup {
  const found: string[] = [];
  for (const { where, blocks } of places(t)) walk(blocks, (b) => emptySlots(b).forEach((s) => found.push(`${where}, ${blockName(b.type)} block: ${s}`)));
  const items: CheckItem[] = found.length
    ? [{ status: "fail", text: `${found.length} empty slot${found.length === 1 ? "" : "s"}: a card, slide or picture is missing its photo, so it'd show a hole on the page. Add a photo (Replace me marks don't help here) or take the item out.`, detail: found }]
    : [{ status: "pass", text: "No empty slots: every card, slide, picture and logo has its photo." }];
  return { id: "slots", title: "Empty slots", why: "A card without its photo looks broken in a template whose job is to look finished.", items };
}

// --- Mismatched crops -------------------------------------------------------------------

/** Width ÷ height of a template photo, or null when the address isn't one of the template's photos. */
function ratioOf(t: Template, src: unknown): number | null {
  const file = mediaFileOf(typeof src === "string" ? src : "");
  const m = file ? t.media.find((x) => x.file === file) : undefined;
  return m && m.width > 0 && m.height > 0 ? m.width / m.height : null;
}

const shapeName = (r: number) => (r >= 1.05 ? "landscape" : r <= 0.95 ? "portrait" : "square") + ` ${r.toFixed(2)}:1`;

/** The photos that sit side by side in one block, as [label, src] (rows that crop to one shape). */
function rowsOf(block: Block): { label: string; src: unknown }[][] {
  const p = block.props;
  switch (block.type) {
    case "Grid":
    case "CardSlider":
      return [list(p.items).map((c, i) => ({ label: named(`Card ${i + 1}`, text(c.title)), src: c.imageSrc }))];
    case "Slideshow":
      return [list(p.slides).map((s, i) => ({ label: `Slide ${i + 1}`, src: s.imageSrc }))];
    case "Gallery":
      // Square and wide galleries crop every picture to one shape; only "original" shows each as it is.
      return p.shape === "original" ? [list(p.images).map((s, i) => ({ label: `Picture ${i + 1}`, src: s.src }))] : [];
    case "Columns": {
      const row: { label: string; src: unknown }[] = [];
      for (const k of ["column1", "column2", "column3", "column4"]) {
        const first = (Array.isArray(p[k]) ? p[k] : []).find((b) => isBlock(b) && (b.type === "Image" || b.type === "Card"));
        if (isBlock(first)) row.push({ label: first.type === "Card" ? named("Card", text(first.props.title)) : `Image in column ${k.slice(-1)}`, src: first.type === "Card" ? first.props.imageSrc : first.props.src });
      }
      return [row];
    }
    default:
      return [];
  }
}

/** Rows where the tallest-to-widest shapes differ by more than `max`. Returns one line per row. */
export function cropMismatches(t: Template, block: Block, max = MAX_CROP_MISMATCH): { summary: string; detail: string[] }[] {
  const out: { summary: string; detail: string[] }[] = [];
  for (const row of rowsOf(block)) {
    const known = row.map((r) => ({ ...r, ratio: ratioOf(t, r.src) })).filter((r): r is { label: string; src: unknown; ratio: number } => r.ratio !== null);
    if (known.length < 2) continue;
    const ratios = known.map((r) => r.ratio);
    if (Math.max(...ratios) / Math.min(...ratios) <= max) continue;
    out.push({ summary: `${blockName(block.type)} block`, detail: known.map((r) => `${r.label}: ${shapeName(r.ratio)}`) });
  }
  return out;
}

export function cropsGroup(t: Template): CheckGroup {
  const items: CheckItem[] = [];
  for (const { where, blocks } of places(t)) {
    walk(blocks, (b) => {
      for (const m of cropMismatches(t, b)) items.push({ status: "fail", text: `${where}: ${m.summary} mixes photo shapes, so one is cropped much harder than the others. Use photos of one shape, or change the template's crop.`, detail: m.detail });
    });
  }
  if (!items.length) items.push({ status: "pass", text: `Photos in one row share a shape (within ${Math.round((MAX_CROP_MISMATCH - 1) * 100)}%).` });
  return { id: "crops", title: "Photo crops in a row", why: "Cards and columns crop photos to one shape; a portrait next to a landscape loses heads and horizons.", items };
}

// --- Variety on Home --------------------------------------------------------------------

/** Blocks that make a section "a kind of section" of their own. */
const FEATURE = ["Grid", "Gallery", "Stats", "Pricing", "Quote", "LogoRow", "Accordion", "CardSlider", "Slideshow", "Tabs", "Table", "Video", "Map", "ContactForm", "IconList", "ImageOverlay", "Card", "PostList"];

/** What kind of section a top-level block is: Hero, a feature block's name, Image and text, Columns or Text. */
export function sectionKind(block: Block, index: number): string {
  const p = block.props;
  const photo = ["photo", "video"].includes(String(p.bgKind)) || (p.bgKind === undefined && !!text(p.imageSrc)) || p.bgKind === "gradient";
  let h1 = false;
  let feature: string | null = null;
  let columns = false;
  let imageInColumns = false;
  walk([block], (b) => {
    if (b === block) return;
    if (b.type === "Heading" && (b.props.level === "h1" || b.props.size === "display")) h1 = true;
    if (!feature && FEATURE.includes(b.type)) feature = blockName(b.type);
    if (b.type === "Columns") {
      columns = true;
      walk(["column1", "column2", "column3", "column4"].flatMap((k) => (Array.isArray(b.props[k]) ? (b.props[k] as unknown[]) : [])), (c) => c.type === "Image" && (imageInColumns = true));
    }
  });
  if (block.type !== "Section" && FEATURE.includes(block.type)) return blockName(block.type);
  if (index === 0 && (h1 || photo)) return "Hero";
  if (photo && h1) return "Hero";
  if (feature) return feature;
  if (columns) return imageInColumns ? "Image and text" : "Columns";
  return "Text";
}

export function varietyGroup(t: Template): CheckGroup {
  const home = t.pages.find((p) => p.path === "/");
  const sections = new Map(t.sections.map((s) => [s.id, s]));
  const kinds: string[] = [];
  if (home) {
    let i = 0;
    for (const b of home.puck.content as unknown[]) {
      if (!isBlock(b)) continue;
      if (b.type === "LinkedSection") {
        const s = sections.get(text(b.props.section));
        for (const inner of s ? (s.content as unknown[]) : []) if (isBlock(inner)) kinds.push(sectionKind(inner, i++));
      } else kinds.push(sectionKind(b, i++));
    }
  }
  const distinct = [...new Set(kinds)];
  const items: CheckItem[] =
    distinct.length >= MIN_HOME_SECTION_TYPES
      ? [{ status: "pass", text: `Home has ${distinct.length} kinds of section: ${distinct.join(", ")}.` }]
      : [{ status: "fail", text: `Home has only ${distinct.length} kind${distinct.length === 1 ? "" : "s"} of section (${distinct.join(", ") || "none"}); a premium Home needs at least ${MIN_HOME_SECTION_TYPES}. Add sections of other kinds: a grid of cards, stats, a quote, logos, a slideshow, pricing…`, detail: kinds.map((k, i) => `Section ${i + 1}: ${k}`) }];
  return { id: "variety", title: "Variety on Home", why: "A Home page of the same section repeated reads as a template; rhythm between different kinds of section reads as designed.", items };
}

// --- Gradients --------------------------------------------------------------------------

/** Section gradients that no longer keep their text readable (F073 left this to the template check). */
export function gradientGroup(t: Template): CheckGroup {
  const bad: string[] = [];
  let count = 0;
  for (const { where, blocks } of places(t)) {
    walk(blocks, (b) => {
      if (b.type !== "Section" || b.props.bgKind !== "gradient" || !isObject(b.props.gradient)) return;
      count++;
      const style = String(b.props.background);
      const to = String(b.props.gradient.to);
      if (!(sectionStyleIds as readonly string[]).includes(style) || !(to in t.tokens.colors) || !gradientReads(t.tokens, style as SectionStyleId, to as keyof Template["tokens"]["colors"])) bad.push(`${where}: a ${style} section's gradient to ${to}`);
    });
  }
  const items: CheckItem[] = bad.length
    ? [{ status: "fail", text: `${bad.length} gradient${bad.length === 1 ? "" : "s"} no longer keep${bad.length === 1 ? "s" : ""} the text readable. Pick another end colour.`, detail: bad }]
    : [{ status: "pass", text: count ? `All ${count} section gradient${count === 1 ? "" : "s"} keep text readable.` : "No section gradients." }];
  return { id: "gradients", title: "Section gradients", why: "Text has to stay readable along the whole gradient, not only at its ends.", items };
}

// --- Until F084 ---------------------------------------------------------------------------

/** The stricter groups (F083) a template can be excused from while it waits to be rebuilt. */
export const STRICT_GROUP_IDS = ["slots", "crops", "variety", "gradients"];
/**
 * Templates built before F083 that F084 rebuilds. Their stricter findings
 * show as notes ("Not yet fixed: …") so the check can run in CI meanwhile.
 * F084 empties this list; a new template is never excused.
 */
export const AWAITING_REBUILD = ["Harbour", "Signal", "Corner"];

/** The same group with its failures turned into notes, for a template that's waiting to be rebuilt. */
export function excuseUntilRebuilt(g: CheckGroup): CheckGroup {
  if (!STRICT_GROUP_IDS.includes(g.id)) return g;
  return { ...g, items: g.items.map((i) => (i.status === "fail" ? { ...i, status: "note" as const, text: `Waiting for F084's rebuild: ${i.text}` } : i)) };
}

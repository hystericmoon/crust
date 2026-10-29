/**
 * Theme packs (F033): a site's look in one `.crust` file, to bring into
 * another Crust site. A pack holds only Crust data: design tokens, the
 * header and footer look, and saved layouts (block trees). Never code,
 * CSS or HTML: every value is checked against what Crust itself would
 * save, and anything unknown is dropped or refused before it's used.
 */
import { checkContrast, formatRatio } from "./contrast";
import { sectionStyleIds, sectionStyleNames, sectionStyleWarnings, type SectionStyleId } from "./section-styles";
import { colorRoles, spacingSteps, validateTokens, type SiteTokens } from "./tokens";

export const PACK_FORMAT = "crust-theme-pack";
export const PACK_VERSION = 1;
export const packLimits = { bytes: 2_000_000, layouts: 50, name: 60, depth: 16, text: 20_000, blocks: 2_000 } as const;

export interface PackLayout {
  name: string;
  kind: "section" | "page";
  content: { type: string; props: Record<string, unknown> }[];
}

/** The header and footer look: styles and the sticky option, never their links or text. */
export interface PackChrome {
  header: { style: SectionStyleId; sticky: boolean };
  footer: { style: SectionStyleId };
}

export interface ThemePack {
  format: typeof PACK_FORMAT;
  version: typeof PACK_VERSION;
  name: string;
  exportedAt: string;
  tokens?: SiteTokens;
  chrome?: PackChrome;
  layouts?: PackLayout[];
}

/** What to put in a pack, or take from one. */
export interface PackParts {
  tokens: boolean;
  chrome: boolean;
  layouts: boolean;
}

export function makeThemePack(
  name: string,
  parts: PackParts,
  source: { tokens: SiteTokens; chrome: PackChrome; layouts: PackLayout[] },
  now = new Date(),
): ThemePack {
  const pack: ThemePack = { format: PACK_FORMAT, version: PACK_VERSION, name: name.trim().slice(0, packLimits.name) || "My theme", exportedAt: now.toISOString() };
  if (parts.tokens) pack.tokens = source.tokens;
  if (parts.chrome) pack.chrome = source.chrome;
  if (parts.layouts && source.layouts.length) pack.layouts = source.layouts.map(({ name, kind, content }) => ({ name, kind, content }));
  return pack;
}

/** A file name for the download: "studio-look.crust". */
export function packFileName(name: string): string {
  const slug = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
  return `${slug || "theme"}.crust`;
}

// --- Reading a pack: everything is untrusted until checked ------------------------

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const BLOCK_TYPE = /^[A-Z][A-Za-z0-9]{0,39}$/;
const PROP_KEY = /^[A-Za-z][A-Za-z0-9_-]{0,39}$/;

/** Copies tokens field by field, so nothing Crust doesn't know about comes along. */
function pickTokens(v: unknown): SiteTokens | null {
  if (!isObject(v) || !isObject(v.colors) || !isObject(v.fonts) || !isObject(v.spacing)) return null;
  const colors = Object.fromEntries(colorRoles.map((r) => [r, String((v.colors as Record<string, unknown>)[r] ?? "")])) as SiteTokens["colors"];
  const fonts = { heading: String(v.fonts.heading ?? ""), body: String(v.fonts.body ?? "") };
  const spacing = Object.fromEntries(spacingSteps.map((s) => [s, (v.spacing as Record<string, unknown>)[s]])) as SiteTokens["spacing"];
  const tokens: SiteTokens = { colors, fonts, spacing, radius: v.radius as number, maxWidth: v.maxWidth as number };
  if (isObject(v.sectionStyles)) {
    const saved = v.sectionStyles;
    tokens.sectionStyles = Object.fromEntries(
      sectionStyleIds.filter((id) => isObject(saved[id])).map((id) => {
        const s = saved[id] as Record<string, unknown>;
        return [id, { bg: String(s.bg ?? ""), button: s.button }];
      }),
    ) as SiteTokens["sectionStyles"];
  }
  if (v.style !== undefined) tokens.style = v.style as SiteTokens["style"];
  return tokens;
}

function pickChrome(v: unknown): PackChrome | null {
  if (!isObject(v) || !isObject(v.header) || !isObject(v.footer)) return null;
  const ok = (s: unknown): s is SectionStyleId => (sectionStyleIds as readonly unknown[]).includes(s);
  if (!ok(v.header.style) || !ok(v.footer.style) || typeof v.header.sticky !== "boolean") return null;
  return { header: { style: v.header.style, sticky: v.header.sticky }, footer: { style: v.footer.style } };
}

/**
 * A block tree as plain data: block types Crust knows, prop names that
 * look like Crust's, values that are text, numbers, yes/no, lists or
 * objects of those. Returns null when anything else is found.
 */
function cleanValue(v: unknown, known: ReadonlySet<string>, depth: number, count: { blocks: number }): unknown {
  if (depth > packLimits.depth) return undefined;
  if (typeof v === "string") return v.length <= packLimits.text ? v : undefined;
  if (typeof v === "number") return Number.isFinite(v) ? v : undefined;
  if (typeof v === "boolean" || v === null) return v;
  if (Array.isArray(v)) {
    const out = v.map((x) => cleanValue(x, known, depth + 1, count));
    return out.includes(undefined) ? undefined : out;
  }
  if (!isObject(v)) return undefined;
  // A block: { type, props }
  if ("type" in v && "props" in v) {
    if (typeof v.type !== "string" || !BLOCK_TYPE.test(v.type) || !known.has(v.type) || !isObject(v.props)) return undefined;
    if (++count.blocks > packLimits.blocks) return undefined;
    const props = cleanValue(v.props, known, depth + 1, count);
    return props === undefined ? undefined : { type: v.type, props };
  }
  const out: Record<string, unknown> = {};
  for (const [k, x] of Object.entries(v)) {
    if (!PROP_KEY.test(k)) return undefined;
    const c = cleanValue(x, known, depth + 1, count);
    if (c === undefined) return undefined;
    out[k] = c;
  }
  return out;
}

function pickLayouts(v: unknown, known: ReadonlySet<string>): { layouts: PackLayout[]; problems: string[] } {
  if (!Array.isArray(v)) return { layouts: [], problems: ["The layouts in this file are damaged."] };
  if (v.length > packLimits.layouts) return { layouts: [], problems: [`This file has more than ${packLimits.layouts} layouts.`] };
  const layouts: PackLayout[] = [];
  const problems: string[] = [];
  const count = { blocks: 0 };
  v.forEach((l, i) => {
    const label = isObject(l) && typeof l.name === "string" && l.name.trim() ? `“${l.name.trim().slice(0, packLimits.name)}”` : `Layout ${i + 1}`;
    if (!isObject(l) || typeof l.name !== "string" || !l.name.trim() || l.name.trim().length > packLimits.name) {
      problems.push(`${label} needs a name of up to ${packLimits.name} characters.`);
      return;
    }
    if (l.kind !== "section" && l.kind !== "page") {
      problems.push(`${label} must be a section or a whole page.`);
      return;
    }
    const content = Array.isArray(l.content) && l.content.length ? cleanValue(l.content, known, 0, count) : undefined;
    if (!Array.isArray(content) || !content.every((b) => isObject(b) && typeof b.type === "string")) {
      problems.push(`${label} has blocks Crust doesn't know, or damaged ones.`);
      return;
    }
    layouts.push({ name: l.name.trim(), kind: l.kind, content: content as PackLayout["content"] });
  });
  return { layouts, problems };
}

export interface PackCheck {
  /** The cleaned pack; null when the file can't be used at all. */
  pack: ThemePack | null;
  /** Why it can't be used. Nothing changes while there are any. */
  problems: string[];
}

/**
 * Reads a `.crust` file's text. `knownBlocks` is the builder's block types.
 * Refuses the whole file on any format problem, and a style that fails the
 * contrast checks, so a pack never makes a site harder to read.
 */
export function readThemePack(text: string, knownBlocks: Iterable<string>): PackCheck {
  if (text.length > packLimits.bytes) return { pack: null, problems: ["This file is too big to be a theme pack."] };
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { pack: null, problems: ["This file isn't a Crust theme pack (it couldn't be read)."] };
  }
  if (!isObject(raw) || raw.format !== PACK_FORMAT) return { pack: null, problems: ["This file isn't a Crust theme pack."] };
  if (raw.version !== PACK_VERSION) return { pack: null, problems: ["This theme pack was made by a newer Crust. Update Crust, then try again."] };

  const problems: string[] = [];
  const name = typeof raw.name === "string" && raw.name.trim() ? raw.name.trim().slice(0, packLimits.name) : "Theme pack";
  const pack: ThemePack = { format: PACK_FORMAT, version: PACK_VERSION, name, exportedAt: typeof raw.exportedAt === "string" ? raw.exportedAt.slice(0, 40) : "" };

  if (raw.tokens !== undefined) {
    const tokens = pickTokens(raw.tokens);
    if (!tokens) problems.push("The style in this file is damaged.");
    else {
      let format: string[] = [];
      try {
        format = validateTokens(tokens).map((p) => p.message);
      } catch {
        format = ["The style in this file is damaged."];
      }
      problems.push(...format);
      if (!format.length) {
        const failing = checkContrast(tokens.colors).filter((r) => !r.passes);
        for (const r of failing) problems.push(`Contrast: ${r.label.toLowerCase()} is ${formatRatio(r.ratio)}, below the 4.5:1 minimum.`);
        for (const w of sectionStyleWarnings(tokens)) problems.push(`Contrast: ${w.message}`);
        pack.tokens = tokens;
      }
    }
  }
  if (raw.chrome !== undefined) {
    const chrome = pickChrome(raw.chrome);
    if (!chrome) problems.push("The header and footer look in this file is damaged.");
    else pack.chrome = chrome;
  }
  if (raw.layouts !== undefined) {
    const { layouts, problems: p } = pickLayouts(raw.layouts, new Set(knownBlocks));
    problems.push(...p);
    if (layouts.length) pack.layouts = layouts;
  }
  if (!pack.tokens && !pack.chrome && !pack.layouts && !problems.length) problems.push("This theme pack is empty.");
  return problems.length ? { pack: null, problems } : { pack, problems: [] };
}

/** "Studio intro" taken → "Studio intro (2)": imported layouts never replace yours. */
export function freeLayoutName(name: string, taken: Iterable<string>): string {
  const used = new Set([...taken].map((n) => n.toLowerCase()));
  if (!used.has(name.toLowerCase())) return name;
  for (let n = 2; ; n++) {
    const suffix = ` (${n})`;
    const candidate = `${name.slice(0, packLimits.name - suffix.length)}${suffix}`;
    if (!used.has(candidate.toLowerCase())) return candidate;
  }
}

/** One line per part, in the owner's words, for the import summary. */
export function packSummary(pack: ThemePack): string[] {
  const lines: string[] = [];
  if (pack.tokens) lines.push("Style: colours, fonts, spacing, section styles, buttons, cards and links");
  if (pack.chrome) {
    const h = sectionStyleNames[pack.chrome.header.style];
    const f = sectionStyleNames[pack.chrome.footer.style];
    lines.push(`Header and footer look: ${h} header${pack.chrome.header.sticky ? " (stays at the top)" : ""}, ${f} footer`);
  }
  if (pack.layouts?.length) lines.push(`${pack.layouts.length} layout${pack.layouts.length === 1 ? "" : "s"}: ${pack.layouts.map((l) => l.name).join(", ")}`);
  return lines;
}

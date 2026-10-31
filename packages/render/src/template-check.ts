/**
 * F047: the template quality check. A template must pass this before it's
 * offered: it opens, every text colour reads in every section style, pages
 * have one h1 and headings in order with alt text, axe finds no serious
 * issue at three widths, the home page scores 95+ for speed, every saved
 * layout renders, and no sample content slipped through unmarked.
 *
 * This file holds the parts that don't need a browser: unpacking a
 * template into a content folder, the checks on its data, and the report
 * page. scripts/check-template.ts runs the rest (render, crust-publish,
 * axe, Lighthouse) and puts it together.
 */
import {
  AA,
  blockName,
  checkContrast,
  cleanPlaceholder,
  findPlaceholders,
  formatRatio,
  isRichText,
  placeholderLabel,
  resolveSectionStyle,
  richTextToPlain,
  sectionStyleIds,
  sectionStyleNames,
  contrastRatio,
  type LinkedSectionFile,
  type MediaItem,
  type Page,
  type Site,
  type Template,
} from "@crust/blocks";
import { renderPage } from "./render";

export type Status = "pass" | "fail" | "note";
export interface CheckItem {
  status: Status;
  text: string;
  /** Lines under the item: where, and what to change. */
  detail?: string[];
}
export interface CheckGroup {
  id: string;
  title: string;
  /** One line: why this matters to the people who'll use the site. */
  why: string;
  items: CheckItem[];
}
export interface TemplateReport {
  name: string;
  /** Where the template came from: a file name, or "the sample site". */
  source: string;
  groups: CheckGroup[];
}

export const groupFails = (g: CheckGroup) => g.items.some((i) => i.status === "fail");
export const reportFails = (r: TemplateReport) => r.groups.some(groupFails);

/** The address the check publishes under; never a real site. */
export const CHECK_BASE_URL = "https://example.pages.dev";

// --- Unpacking ------------------------------------------------------------------------

type Json = Record<string, unknown>;
const isObject = (v: unknown): v is Json => typeof v === "object" && v !== null && !Array.isArray(v);

/** A deep copy with every "Replace me" mark taken off, so the publish step renders the template as a buyer would first see it. */
export function stripPlaceholders<T>(value: T): T {
  const strip = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(strip);
    if (!isObject(v)) return v;
    const out: Json = {};
    for (const [k, x] of Object.entries(v)) if (k !== "placeholder") out[k] = strip(x);
    return out;
  };
  return strip(value) as T;
}

/** Same naming as the admin's pageFileFor: "/" → index.json, "/services/design" → services__design.json. */
export function pageFileName(path: string): string {
  const clean = path.replace(/^\/+|\/+$/g, "");
  return `${clean === "" ? "index" : clean.split("/").join("__")}.json`;
}

export const siteOf = (t: Template): Site => ({ name: t.site.name, baseUrl: CHECK_BASE_URL, language: t.site.language, tokens: t.tokens, header: t.header, footer: t.footer });

export const mediaOf = (t: Template): MediaItem[] =>
  t.media.map((m) => ({ file: m.file, alt: m.alt, width: m.width, height: m.height, bytes: Math.floor((m.data.length * 3) / 4), uploadedAt: t.exportedAt }));

export const linkedSectionsOf = (t: Template): Map<string, LinkedSectionFile> =>
  new Map(stripPlaceholders(t.sections).map((s) => [s.id, { ...s, savedAt: t.exportedAt }]));

/**
 * The template as a content folder (paths relative to it), the same shape
 * as the repo's content/: what the renderer and crust-publish read. Marks
 * are taken off; photos are bytes.
 */
export function unpackTemplate(t: Template): Map<string, string | Uint8Array> {
  const files = new Map<string, string | Uint8Array>();
  const json = (v: unknown) => `${JSON.stringify(v, null, 2)}\n`;
  files.set("site.json", json(siteOf(t)));
  for (const p of stripPlaceholders(t.pages)) files.set(`pages/${pageFileName(p.path)}`, json({ ...p, puck: { root: { props: {} }, content: p.puck.content } }));
  for (const s of linkedSectionsOf(t).values()) files.set(`sections/${s.id}.json`, json(s));
  if (t.posts.length) {
    files.set("blog.json", json(t.blog));
    for (const p of stripPlaceholders(t.posts)) files.set(`posts/${p.slug}.json`, json(p));
  }
  if (t.media.length) {
    files.set("media.json", json(mediaOf(t)));
    for (const m of t.media) files.set(`media/${m.file}`, new Uint8Array(Buffer.from(m.data, "base64")));
  }
  return files;
}

// --- The file -------------------------------------------------------------------------

export function fileGroup(problems: string[], missing: string[] = []): CheckGroup {
  const items: CheckItem[] = problems.length
    ? [{ status: "fail", text: "Crust can't open this template.", detail: problems }]
    : [{ status: "pass", text: "Crust can open this template; every value is one Crust itself would save." }];
  if (missing.length) items.push({ status: "fail", text: "Photos used on a page aren't in the photo library, so they'd be left out.", detail: missing });
  return { id: "file", title: "The file opens", why: "A template either arrives complete or not at all.", items };
}

// --- Contrast -------------------------------------------------------------------------

/**
 * Every text colour in every section style, worked out the way the
 * renderer does it. Text needs 4.5:1 (WCAG 1.4.3); a solid or inverse
 * button needs 3:1 against its section (1.4.11).
 */
export function contrastGroup(t: Template): CheckGroup {
  const items: CheckItem[] = [];
  const site = checkContrast(t.tokens.colors);
  const weak = site.filter((r) => !r.passes);
  items.push(
    weak.length
      ? { status: "fail", text: "Some site colours are too close to each other.", detail: weak.map((r) => `${r.label}: ${formatRatio(r.ratio)} (needs 4.5:1)`) }
      : { status: "pass", text: `Site colours: all ${site.length} text and background pairs read (lowest ${formatRatio(Math.min(...site.map((r) => r.ratio)))}).` },
  );
  for (const id of sectionStyleIds) {
    const s = resolveSectionStyle(t.tokens, id);
    const labelBg = s.button.bg === "transparent" ? s.bg : s.button.bg;
    const rows: { what: string; ratio: number; min: number }[] = [
      { what: "Text", ratio: contrastRatio(s.ink, s.bg), min: AA },
      { what: "Muted text", ratio: contrastRatio(s.muted, s.bg), min: AA },
      { what: "Links", ratio: contrastRatio(s.accent, s.bg), min: AA },
      { what: "Button label", ratio: contrastRatio(s.button.fg, labelBg), min: AA },
    ];
    if (s.button.look === "solid" || s.button.look === "inverse") rows.push({ what: "Button against the section", ratio: contrastRatio(s.button.bg, s.bg), min: 3 });
    const bad = rows.filter((r) => r.ratio < r.min);
    const summary = rows.map((r) => `${r.what.toLowerCase()} ${formatRatio(r.ratio)}`).join(", ");
    items.push(
      bad.length
        ? { status: "fail", text: `${sectionStyleNames[id]} sections: ${bad.map((r) => r.what.toLowerCase()).join(", ")} too faint.`, detail: bad.map((r) => `${r.what}: ${formatRatio(r.ratio)} (needs ${r.min}:1)`) }
        : { status: "pass", text: `${sectionStyleNames[id]} sections: ${summary}.` },
    );
  }
  return { id: "contrast", title: "Contrast in every section style", why: "Text has to be readable on every background a page can use, for people with low vision and on phones in sunlight.", items };
}

// --- Headings, alt text, titles (crust-publish) ---------------------------------------

/** crust-publish's output: on failure, one "  - Page /x: message" line per problem. */
export function publishGroup(ok: boolean, output: string): CheckGroup {
  const why = "Screen reader users jump between headings; people who can't see photos hear their descriptions; search engines and link previews show titles.";
  const title = "Headings, photo descriptions, titles";
  if (ok) return { id: "publish", title, why, items: [{ status: "pass", text: "Every page has one main heading (h1), headings in order, photo descriptions, a title and a description." }] };
  const lines = output.split("\n").map((l) => l.match(/^\s*- Page (.*)$/)?.[1]).filter((l): l is string => !!l);
  const detail = lines.length ? lines : output.trim().split("\n").filter(Boolean).slice(-10);
  return { id: "publish", title, why, items: [{ status: "fail", text: lines.length === 1 ? "1 problem would stop publishing." : `${lines.length || "Some"} problems would stop publishing.`, detail }] };
}

// --- axe -------------------------------------------------------------------------------

export interface AxeResultLike {
  path: string;
  size: string;
  serious: { id: string; help: string; impact: string; targets: string[] }[];
  minor: number;
}

export function axeGroup(results: AxeResultLike[], what = "page"): CheckGroup {
  const bad = results.filter((r) => r.serious.length);
  const minor = results.reduce((n, r) => n + r.minor, 0);
  const pages = new Set(results.map((r) => r.path)).size;
  const sizes = [...new Set(results.map((r) => r.size))].join(", ");
  const items: CheckItem[] = bad.length
    ? bad.map((r) => ({
        status: "fail" as const,
        text: `${r.path} at ${r.size} width: ${r.serious.length} serious issue${r.serious.length === 1 ? "" : "s"}.`,
        detail: r.serious.map((v) => `${v.help} (${v.id}${v.targets.length ? `, at ${v.targets.join("; ")}` : ""})`),
      }))
    : [{ status: "pass", text: `No serious issues on ${pages} ${what}${pages === 1 ? "" : "s"} at ${sizes} widths.` }];
  if (minor) items.push({ status: "note", text: `${minor} minor finding${minor === 1 ? "" : "s"} (not blocking); the check's log lists them.` });
  return { id: what === "page" ? "axe" : "layouts-axe", title: what === "page" ? "Accessibility at three widths (axe)" : "Saved layouts: accessibility (axe)", why: "axe finds missing labels, unreadable text, broken landmarks and more, the way assistive technology sees the page.", items };
}

// --- Lighthouse -----------------------------------------------------------------------

export function speedGroup(s: { performance: number; accessibility: number; seo: number; bestPractices: number; slow: string[] } | { error: string }, min = 95): CheckGroup {
  const base = { id: "speed", title: "Speed on the home page (Lighthouse)", why: "Slow pages lose visitors, most of all on phones." };
  if ("error" in s) return { ...base, items: [{ status: "fail", text: "Lighthouse couldn't run.", detail: [s.error] }] };
  const scores = `Performance ${s.performance}, accessibility ${s.accessibility}, SEO ${s.seo}, best practices ${s.bestPractices}.`;
  return {
    ...base,
    items:
      s.performance >= min
        ? [{ status: "pass", text: `${scores} (performance needs ${min}).` }]
        : [{ status: "fail", text: `Performance is ${s.performance}; it needs ${min}. ${scores}`, detail: s.slow }],
  };
}

// --- Saved layouts --------------------------------------------------------------------

export const layoutSlug = (i: number) => `layout-${i + 1}`;

/**
 * Renders each saved layout as a page of its own (with the template's style
 * and linked sections). Returns the pages that rendered, to run axe on, and
 * the result.
 */
export function renderLayouts(t: Template, baseCss: string): { pages: { slug: string; html: string }[]; group: CheckGroup } {
  const site = siteOf(t);
  const options = { media: mediaOf(t), linkedSections: linkedSectionsOf(t), baseUrl: CHECK_BASE_URL };
  const pages: { slug: string; html: string }[] = [];
  const items: CheckItem[] = [];
  for (const [i, layout] of stripPlaceholders(t.layouts).entries()) {
    const slug = layoutSlug(i);
    const page: Page = { path: `/${slug}`, title: layout.name, description: `Saved layout: ${layout.name}`, puck: { root: { props: {} }, content: layout.content } };
    try {
      const html = renderPage(site, page, baseCss, options);
      if (!layout.content.length) items.push({ status: "fail", text: `“${layout.name}” is empty.` });
      else {
        pages.push({ slug, html });
        items.push({ status: "pass", text: `“${layout.name}” (${layout.kind === "page" ? "whole page" : "section"}) renders.` });
      }
    } catch (e) {
      items.push({ status: "fail", text: `“${layout.name}” doesn't render.`, detail: [e instanceof Error ? e.message : String(e)] });
    }
  }
  if (!items.length) items.push({ status: "note", text: "This template has no saved layouts." });
  return { pages, group: { id: "layouts", title: "Saved layouts render", why: "Whoever uses the template inserts these later; a broken one fails them when they need it.", items } };
}

// --- Sample content -------------------------------------------------------------------

/** Filler words a finished template shouldn't show unmarked. */
const FILLER = [/lorem ipsum/i, /dolor sit amet/i, /\b(TODO|TBD|FIXME|XXX)\b/, /\[(your|insert|add|enter)\b[^\]]*\]/i, /\{\{[^}]*\}\}/];
/** Placeholder-image services: fine while sketching, never in a template. */
const FILLER_PHOTOS = /\b(placehold\.co|placeholder\.com|placehold\.it|dummyimage\.com|picsum\.photos|placekitten\.com|loremflickr\.com|fakeimg\.pl)\b/i;
/** Props that hold settings, not words or photos. */
const SKIP = new Set(["id", "placeholder", "anchor", "hideOn", "widths", "level", "align", "background", "paddingY", "size", "variant", "kind", "required", "section"]);

type Block = { type: string; props: Json };
const isBlock = (v: unknown): v is Block => isObject(v) && typeof v.type === "string" && isObject(v.props);

function shorten(s: string, max = 60): string {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
}

/** Unmarked filler in a list of blocks: "Text block: “Lorem ipsum dolor…”". */
export function findFiller(blocks: unknown): string[] {
  const found: string[] = [];
  const strings = (v: unknown, out: string[]) => {
    if (typeof v === "string") out.push(v);
    else if (isRichText(v)) out.push(richTextToPlain(v));
    else if (Array.isArray(v)) for (const x of v) strings(x, out);
    else if (isObject(v)) for (const [k, x] of Object.entries(v)) if (!SKIP.has(k)) strings(x, out);
  };
  const visit = (list: unknown) => {
    if (!Array.isArray(list)) return;
    for (const b of list) {
      if (!isBlock(b)) continue;
      const marked = new Set(cleanPlaceholder(b.type, b.props.placeholder));
      const texts: string[] = [];
      for (const [k, v] of Object.entries(b.props)) {
        if (SKIP.has(k) || marked.has(k)) continue;
        if (Array.isArray(v) && v.length && v.every(isBlock)) visit(v);
        else strings(v, texts);
      }
      for (const s of texts) {
        if (FILLER.some((re) => re.test(s))) found.push(`${blockName(b.type)} block: “${shorten(s)}”`);
        else if (FILLER_PHOTOS.test(s)) found.push(`${blockName(b.type)} block: a stand-in photo (${shorten(s)})`);
      }
    }
  };
  visit(blocks);
  return found;
}

/** Where each list of blocks lives in a template, in the owner's words. */
function places(t: Template): { where: string; blocks: unknown }[] {
  return [
    ...t.pages.map((p) => ({ where: `Page ${p.path}`, blocks: p.puck.content })),
    ...t.posts.map((p) => ({ where: `Post “${p.title}”`, blocks: p.puck.content })),
    ...t.sections.map((s) => ({ where: `Linked section “${s.name}”`, blocks: s.content })),
  ];
}

/**
 * Sample content: what's marked "Replace me" (expected in a template: it's
 * how the buyer knows what to change), and filler that isn't marked (which
 * would reach a live site). Saved layouts are skipped: they're inserted and
 * filled in later.
 */
export function placeholderGroup(t: Template): CheckGroup {
  const items: CheckItem[] = [];
  const marked: string[] = [];
  let count = 0;
  for (const { where, blocks } of places(t)) {
    for (const p of findPlaceholders(blocks)) {
      count += p.fields.length;
      marked.push(`${where}: ${placeholderLabel(p.type, { ...markedProps(blocks, p.id), placeholder: p.fields.map((f) => f.field) })}`);
    }
  }
  const filler: string[] = [];
  for (const { where, blocks } of places(t)) for (const f of findFiller(blocks)) filler.push(`${where}, ${f}`);
  const chrome: string[] = [];
  const chromeText = JSON.stringify([t.header, t.footer, t.site.name, t.blog]);
  if (FILLER.some((re) => re.test(chromeText)) || FILLER_PHOTOS.test(chromeText)) chrome.push("Header, footer or blog settings: filler words or a stand-in photo");
  for (const p of t.posts) if (FILLER.some((re) => re.test(`${p.title} ${p.description}`)) || FILLER_PHOTOS.test(p.cover)) chrome.push(`Post “${p.title}”: title, summary or cover`);
  for (const p of t.pages) if (FILLER.some((re) => re.test(`${p.title} ${p.description}`))) chrome.push(`Page ${p.path}: title or description`);

  const leftovers = [...filler, ...chrome];
  items.push(
    leftovers.length
      ? { status: "fail", text: `${leftovers.length} piece${leftovers.length === 1 ? "" : "s"} of filler aren't marked Replace me, so they'd reach a live site. Write real sample content, or mark them Replace me (the block's Advanced tab).`, detail: leftovers }
      : { status: "pass", text: "No unmarked filler (lorem ipsum, TODO, stand-in photos)." },
  );
  items.push(
    count
      ? { status: "note", text: `${count} thing${count === 1 ? "" : "s"} marked Replace me: whoever uses the template is asked to replace ${count === 1 ? "it" : "them"} before publishing.`, detail: marked }
      : { status: "note", text: "Nothing is marked Replace me. Whoever uses this template won't be told which words and photos are samples." },
  );
  return { id: "placeholders", title: "Sample content", why: "A buyer's first publish shouldn't show lorem ipsum or our sample photos.", items };
}

/** A marked block's props, found by id (for its label). */
function markedProps(blocks: unknown, id: string): Json {
  let found: Json = {};
  const visit = (list: unknown) => {
    if (!Array.isArray(list)) return;
    for (const b of list) {
      if (!isBlock(b)) continue;
      if (b.props.id === id) found = b.props;
      for (const v of Object.values(b.props)) if (Array.isArray(v) && v.every(isBlock)) visit(v);
    }
  };
  visit(blocks);
  return found;
}

// --- The report page ------------------------------------------------------------------

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const mark: Record<Status, string> = { pass: "Passed", fail: "Failed", note: "Note" };

/** Plain-text summary for the terminal and the CI job page. */
export function reportText(reports: TemplateReport[], markdown = false): string {
  const lines: string[] = [];
  for (const r of reports) {
    lines.push(markdown ? `### ${reportFails(r) ? "❌" : "✅"} ${r.name} (${r.source})` : `${reportFails(r) ? "✗" : "✓"} ${r.name} (${r.source})`);
    for (const g of r.groups) {
      lines.push(`${markdown ? "- " : "  "}${groupFails(g) ? "✗" : "✓"} ${g.title}`);
      for (const i of g.items.filter((i) => i.status === "fail")) {
        lines.push(`${markdown ? "  - " : "      "}${i.text}`);
        for (const d of (i.detail ?? []).slice(0, 8)) lines.push(`${markdown ? "    - " : "        - "}${d}`);
      }
    }
  }
  return lines.join("\n");
}

/** The readable report page: one card per template, one row per check. */
export function reportHtml(reports: TemplateReport[], when: Date): string {
  const failed = reports.filter(reportFails).length;
  const verdict = failed ? `${failed} of ${reports.length} template${reports.length === 1 ? "" : "s"} need${failed === 1 ? "s" : ""} work` : `${reports.length === 1 ? "The template is" : `All ${reports.length} templates are`} ready to offer`;
  const item = (i: CheckItem) =>
    `<li class="item ${i.status}"><span class="tag">${mark[i.status]}</span><div><p>${esc(i.text)}</p>${i.detail?.length ? `<ul>${i.detail.map((d) => `<li>${esc(d)}</li>`).join("")}</ul>` : ""}</div></li>`;
  const group = (g: CheckGroup) =>
    `<section class="group ${groupFails(g) ? "fail" : "pass"}"><h3><span class="tag">${groupFails(g) ? "Failed" : "Passed"}</span> ${esc(g.title)}</h3><p class="why">${esc(g.why)}</p><ul class="items">${g.items.map(item).join("")}</ul></section>`;
  const card = (r: TemplateReport) =>
    `<article class="template"><h2>${esc(r.name)} <span class="source">${esc(r.source)}</span></h2><p class="result ${reportFails(r) ? "fail" : "pass"}">${reportFails(r) ? `${r.groups.filter(groupFails).length} of ${r.groups.length} checks failed` : `All ${r.groups.length} checks passed`}</p>${r.groups.map(group).join("")}</article>`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Template check</title>
<style>
:root{--bg:#F7F6F2;--card:#FFFFFF;--text:#1C1B18;--muted:#5C5A52;--line:#E2DFD6;--pass:#1E6B3F;--pass-bg:#E5F2EA;--fail:#A1261B;--fail-bg:#FBE9E6;--note:#5C5A52;--note-bg:#EFEDE6}
@media (prefers-color-scheme:dark){:root{--bg:#141412;--card:#1E1D1A;--text:#F1EFE8;--muted:#B5B2A8;--line:#36342E;--pass:#7FD3A0;--pass-bg:#18301F;--fail:#FFA196;--fail-bg:#3A1C18;--note:#B5B2A8;--note-bg:#2A2925}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--text);font:16px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif}
main{max-width:860px;margin:0 auto;padding:32px 16px 64px}
h1{font-size:1.75rem;margin:0 0 4px}
.meta{color:var(--muted);margin:0 0 24px}
.verdict{font-size:1.125rem;font-weight:600;padding:12px 16px;border-radius:8px;margin:0 0 32px}
.verdict.pass,.result.pass{background:var(--pass-bg);color:var(--pass)}
.verdict.fail,.result.fail{background:var(--fail-bg);color:var(--fail)}
.template{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:24px;margin:0 0 24px}
.template h2{margin:0 0 8px;font-size:1.375rem}
.source{font-weight:400;color:var(--muted);font-size:1rem}
.result{display:inline-block;font-weight:600;padding:2px 10px;border-radius:999px;margin:0 0 16px}
.group{border-top:1px solid var(--line);padding:16px 0 4px}
.group h3{font-size:1.0625rem;margin:0;display:flex;gap:10px;align-items:center}
.why{color:var(--muted);margin:4px 0 8px}
.items{list-style:none;margin:0;padding:0}
.item{display:flex;gap:12px;align-items:flex-start;padding:6px 0}
.item p{margin:0}
.item ul{margin:4px 0 0;padding-left:20px;color:var(--muted);overflow-wrap:anywhere}
.tag{flex:none;font-size:.8125rem;font-weight:600;padding:1px 8px;border-radius:999px;min-width:56px;text-align:center}
.pass>.tag,.group.pass .tag{background:var(--pass-bg);color:var(--pass)}
.fail>.tag,.group.fail h3 .tag{background:var(--fail-bg);color:var(--fail)}
.note>.tag{background:var(--note-bg);color:var(--note)}
</style>
</head>
<body>
<main>
<h1>Template check</h1>
<p class="meta">Checked ${esc(when.toISOString().slice(0, 16).replace("T", " "))} UTC. A template is ready to offer only when every check passes.</p>
<p class="verdict ${failed ? "fail" : "pass"}">${esc(verdict)}</p>
${reports.map(card).join("\n")}
</main>
</body>
</html>
`;
}

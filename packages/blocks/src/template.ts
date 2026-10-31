/**
 * Templates (F045): a whole Crust site in one `.crust` file — design
 * tokens, header and footer, pages, linked sections, saved layouts, the
 * blog and the photos it uses. Like theme packs (F033), a template is only
 * Crust data, never code, CSS or HTML: reading one checks every value
 * against what Crust itself would save and drops anything unknown.
 * Applying a template to a site is F048; this file only makes and reads.
 */
import type { Data } from "@puckeditor/core";
import { validateChrome, type SiteChrome, type SiteFooter, type SiteHeader } from "./chrome-model";
import { checkContrast, formatRatio } from "./contrast";
import { checkSectionContent, checkSectionName, isValidSectionId, linkedSectionIds, type LinkedSectionFile } from "./linked-sections";
import { mediaFileOf, mediaLimits, mediaTypes, mediaUsedIn, MAX_EDGE, sniffImage, type MediaExt } from "./media";
import { checkBlog, checkPost, isBlogPath, isSearchPath, type BlogSettings, type Post } from "./posts";
import { richTextProblems } from "./rich-text";
import { sectionStyleWarnings } from "./section-styles";
import { checkSeo, cleanSeo, type PageSeo } from "./seo";
import { cleanBlocks, packFileName, packLimits, pickTokens, type BlockSpecs, type PackLayout } from "./theme-pack";
import { validateTokens, type SiteTokens } from "./tokens";

export const TEMPLATE_FORMAT = "crust-template";
export const TEMPLATE_VERSION = 1;
export const templateLimits = {
  /** The whole file, photos included (they're base64 text). */
  bytes: 60 * 1024 * 1024,
  pages: 40,
  posts: 20,
  sections: 30,
  layouts: 50,
  photos: 60,
  blocks: 20_000,
  name: 60,
  description: 300,
} as const;

export interface TemplatePage {
  path: string;
  title: string;
  description: string;
  seo?: PageSeo;
  puck: Data;
}

export interface TemplatePhoto {
  file: string;
  alt: string;
  width: number;
  height: number;
  /** The photo itself, base64. */
  data: string;
}

export interface Template {
  format: typeof TEMPLATE_FORMAT;
  version: typeof TEMPLATE_VERSION;
  /** The template's name, e.g. "Studio". */
  name: string;
  /** One or two lines for the gallery (F048). */
  description: string;
  exportedAt: string;
  site: { name: string; language: string };
  tokens: SiteTokens;
  header: SiteHeader;
  footer: SiteFooter;
  pages: TemplatePage[];
  sections: Pick<LinkedSectionFile, "id" | "name" | "content">[];
  layouts: PackLayout[];
  blog: BlogSettings;
  posts: Post[];
  media: TemplatePhoto[];
}

/** Everything a template is made from, as the builder has it. */
export interface TemplateSource {
  site: { name: string; language: string };
  tokens: SiteTokens;
  chrome: SiteChrome;
  pages: TemplatePage[];
  sections: Pick<LinkedSectionFile, "id" | "name" | "content">[];
  layouts: PackLayout[];
  blog: BlogSettings;
  posts: Post[];
  /** The photo library; only photos the template uses are fetched and kept. */
  media: { file: string; alt: string; width: number; height: number }[];
}

/** The photos (file names) a template's pages, posts, sections, layouts and header use. */
export function photosUsed(source: Pick<TemplateSource, "chrome" | "pages" | "sections" | "layouts" | "posts">): string[] {
  const found = new Set<string>();
  mediaUsedIn([source.pages, source.sections, source.layouts, source.posts, source.chrome.header.logo], found);
  for (const post of source.posts) {
    const cover = mediaFileOf(post.cover);
    if (cover) found.add(cover);
  }
  return [...found].sort();
}

/**
 * Builds the template. `photo` reads one photo's bytes as base64 (from the
 * site, in the builder); photos the library doesn't have are left out and
 * named in `missing`, so the owner can fix the page before sharing it.
 */
export async function makeTemplate(
  details: { name: string; description: string },
  source: TemplateSource,
  photo: (file: string) => Promise<string | null>,
  now = new Date(),
): Promise<{ template: Template; missing: string[] }> {
  const library = new Map(source.media.map((m) => [m.file, m]));
  const media: TemplatePhoto[] = [];
  const missing: string[] = [];
  for (const file of photosUsed(source)) {
    const item = library.get(file);
    const data = item ? await photo(file) : null;
    if (!item || !data) missing.push(file);
    else media.push({ file, alt: item.alt, width: item.width, height: item.height, data });
  }
  const template: Template = {
    format: TEMPLATE_FORMAT,
    version: TEMPLATE_VERSION,
    name: details.name.trim().slice(0, templateLimits.name) || source.site.name.slice(0, templateLimits.name) || "My template",
    description: details.description.trim().slice(0, templateLimits.description),
    exportedAt: now.toISOString(),
    site: { name: source.site.name, language: source.site.language },
    tokens: source.tokens,
    header: source.chrome.header,
    footer: source.chrome.footer,
    pages: source.pages.map(({ path, title, description, seo, puck }) => ({ path, title, description, ...(seo ? { seo } : {}), puck: { root: { props: {} }, content: puck.content } })),
    sections: source.sections.map(({ id, name, content }) => ({ id, name, content })),
    layouts: source.layouts.map(({ name, kind, content }) => ({ name, kind, content })),
    blog: { title: source.blog.title, intro: source.blog.intro },
    posts: source.posts.map((p) => ({ slug: p.slug, title: p.title, description: p.description, date: p.date, cover: p.cover, coverAlt: p.coverAlt, puck: { root: { props: {} }, content: p.puck.content } })),
    media,
  };
  return { template, missing };
}

/** "studio.crust" — the same naming as theme packs. */
export const templateFileName = (name: string) => packFileName(name).replace(/^theme\.crust$/, "template.crust");

/** One line per part, in the owner's words, for summaries. */
export function templateSummary(t: Pick<Template, "pages" | "sections" | "layouts" | "posts" | "media">): string[] {
  const n = (count: number, one: string, many = `${one}s`) => `${count} ${count === 1 ? one : many}`;
  const lines = [`${n(t.pages.length, "page")}: ${t.pages.map((p) => p.title).join(", ")}`];
  if (t.sections.length) lines.push(`${n(t.sections.length, "linked section")}: ${t.sections.map((s) => s.name).join(", ")}`);
  if (t.layouts.length) lines.push(`${n(t.layouts.length, "saved layout")}`);
  if (t.posts.length) lines.push(`${n(t.posts.length, "blog post")}`);
  lines.push(t.media.length ? `${n(t.media.length, "photo")}` : "No photos");
  lines.push("Style, header and footer");
  return lines;
}

// --- Reading a template: everything is untrusted until checked ------------------------

export interface TemplateCheck {
  /** The cleaned template; null when it can't be used. */
  template: Template | null;
  /** Why it can't be used, in plain words. */
  problems: string[];
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const SEGMENT = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const PHOTO_FILE = /^[a-z0-9]+(-[a-z0-9]+)*\.(jpg|png|webp)$/;
const LANGUAGE = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/;

/** Same rule as the page addresses Crust saves: "/" or "/about", "/services/design". */
export function isTemplatePagePath(path: unknown): path is string {
  if (typeof path !== "string" || !path.startsWith("/")) return false;
  if (path === "/") return true;
  const segments = path.slice(1).split("/");
  return segments.length <= 4 && segments.every((s) => SEGMENT.test(s) && s.length <= 60);
}

const text = (v: unknown, max: number): string | null => (typeof v === "string" && v.length <= max ? v : null);
const link = (v: unknown) => (isObject(v) ? { label: String(v.label ?? ""), href: String(v.href ?? "") } : { label: "", href: "" });

/** Copies the header field by field (the checks below then judge the values). */
function pickHeader(v: unknown): SiteHeader | null {
  if (!isObject(v) || !isObject(v.logo) || !Array.isArray(v.menu)) return null;
  const header: SiteHeader = {
    show: v.show === true,
    logo: { text: String(v.logo.text ?? ""), imageSrc: String(v.logo.imageSrc ?? ""), imageAlt: String(v.logo.imageAlt ?? "") },
    menu: v.menu.map(link),
    cta: link(v.cta),
    sticky: v.sticky === true,
    style: v.style as SiteHeader["style"],
  };
  if (v.search === true) header.search = true;
  return header;
}

function pickFooter(v: unknown): SiteFooter | null {
  if (!isObject(v) || !Array.isArray(v.columns)) return null;
  return {
    show: v.show === true,
    text: String(v.text ?? ""),
    columns: v.columns.map((c) => (isObject(c) ? { title: String(c.title ?? ""), links: Array.isArray(c.links) ? c.links.map(link) : [] } : { title: "", links: [] })),
    copyright: String(v.copyright ?? ""),
    style: v.style as SiteFooter["style"],
  };
}

/** base64 → bytes; null when it isn't base64. */
function decodeBase64(data: string): Uint8Array | null {
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(data) || data.length % 4 !== 0) return null;
  try {
    const bin = atob(data);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

/**
 * Reads a template file's text. `blocks` is the builder's block config
 * (`config.components`). The whole file is refused on any problem, with
 * every reason listed: a template either arrives complete or not at all.
 */
export function readTemplate(fileText: string, blocks: BlockSpecs): TemplateCheck {
  const fail = (...problems: string[]): TemplateCheck => ({ template: null, problems });
  if (fileText.length > templateLimits.bytes) return fail("This file is too big to be a Crust template.");
  let raw: unknown;
  try {
    raw = JSON.parse(fileText);
  } catch {
    return fail("This file isn't a Crust template (it couldn't be read).");
  }
  if (isObject(raw) && raw.format === "crust-theme-pack") return fail("This file is a theme pack (a look), not a whole-site template. Bring it in from Site settings → Theme pack.");
  if (!isObject(raw) || raw.format !== TEMPLATE_FORMAT) return fail("This file isn't a Crust template.");
  if (raw.version !== TEMPLATE_VERSION) return fail("This template was made by a newer Crust. Update Crust, then try again.");

  const problems: string[] = [];
  const count = { blocks: 0 };
  const name = text(raw.name, 200)?.trim().slice(0, templateLimits.name) || "Template";
  const description = text(raw.description, 2000)?.trim().slice(0, templateLimits.description) ?? "";
  const site = isObject(raw.site) ? raw.site : {};
  const siteName = text(site.name, 120)?.trim() ?? "";
  if (!siteName) problems.push("The template's site name is missing.");
  const language = typeof site.language === "string" && LANGUAGE.test(site.language) ? site.language : null;
  if (!language) problems.push("The template's language must be a code like en or id.");

  // Style: must pass the same checks as Site settings, contrast included.
  const tokens = pickTokens(raw.tokens);
  if (!tokens) problems.push("The template's style is missing or damaged.");
  else {
    let format: string[];
    try {
      format = validateTokens(tokens).map((p) => p.message);
    } catch {
      format = ["The template's style is damaged."];
    }
    problems.push(...format);
    if (!format.length) {
      for (const r of checkContrast(tokens.colors).filter((r) => !r.passes)) problems.push(`Contrast: ${r.label.toLowerCase()} is ${formatRatio(r.ratio)}, below the 4.5:1 minimum.`);
      for (const w of sectionStyleWarnings(tokens)) problems.push(`Contrast: ${w.message}`);
    }
  }

  const header = pickHeader(raw.header);
  const footer = pickFooter(raw.footer);
  if (!header || !footer) problems.push("The template's header or footer is missing or damaged.");
  else problems.push(...validateChrome({ header, footer }).map((p) => p.message));

  // Pages
  const pages: TemplatePage[] = [];
  const rawPages = Array.isArray(raw.pages) ? raw.pages : [];
  if (!rawPages.length) problems.push("The template has no pages.");
  if (rawPages.length > templateLimits.pages) problems.push(`The template has more than ${templateLimits.pages} pages.`);
  const paths = new Set<string>();
  for (const [i, p] of rawPages.slice(0, templateLimits.pages).entries()) {
    const label = isObject(p) && typeof p.title === "string" && p.title.trim() ? `Page “${p.title.trim().slice(0, 60)}”` : `Page ${i + 1}`;
    if (!isObject(p)) {
      problems.push(`${label} is damaged.`);
      continue;
    }
    if (!isTemplatePagePath(p.path)) problems.push(`${label} has an address Crust can't use.`);
    else if (isBlogPath(p.path) || isSearchPath(p.path)) problems.push(`${label} uses ${p.path}, which Crust keeps for the blog or search.`);
    else if (paths.has(p.path)) problems.push(`Two pages use the address ${p.path}.`);
    const title = text(p.title, 120)?.trim();
    const desc = text(p.description, 300);
    if (!title) problems.push(`${label} needs a title of up to 120 characters.`);
    if (desc === null) problems.push(`${label}'s description is missing or longer than 300 characters.`);
    const seoProblems = checkSeo(p.seo);
    problems.push(...seoProblems.map((s) => `${label}: ${s}`));
    const content = isObject(p.puck) ? cleanBlocks(p.puck.content, blocks, count, templateLimits.blocks) : null;
    if (!content) {
      problems.push(`${label} has blocks Crust doesn't know, or damaged ones.`);
      continue;
    }
    const textProblems = richTextProblems(content);
    if (textProblems.length) problems.push(`${label}: ${textProblems[0]}`);
    if (typeof p.path === "string") paths.add(p.path);
    if (title && desc !== null && isTemplatePagePath(p.path)) {
      const seo = seoProblems.length ? undefined : cleanSeo(p.seo as PageSeo | undefined);
      pages.push({ path: p.path, title, description: desc, ...(seo ? { seo } : {}), puck: { root: { props: {} }, content: content as Data["content"] } });
    }
  }
  if (rawPages.length && !paths.has("/")) problems.push("The template needs a Home page (address /).");

  // Linked sections
  const sections: Template["sections"] = [];
  const rawSections = Array.isArray(raw.sections) ? raw.sections : [];
  if (rawSections.length > templateLimits.sections) problems.push(`The template has more than ${templateLimits.sections} linked sections.`);
  for (const s of rawSections.slice(0, templateLimits.sections)) {
    const label = isObject(s) && typeof s.name === "string" ? `Linked section “${s.name.slice(0, 60)}”` : "A linked section";
    if (!isObject(s) || !isValidSectionId(s.id)) {
      problems.push(`${label} is damaged.`);
      continue;
    }
    const nameProblems = checkSectionName(s.name);
    const content = cleanBlocks(s.content, blocks, count, templateLimits.blocks);
    const contentProblems = content ? checkSectionContent(content) : [`${label} has blocks Crust doesn't know, or damaged ones.`];
    problems.push(...nameProblems, ...contentProblems);
    if (!nameProblems.length && !contentProblems.length && content) sections.push({ id: s.id, name: String(s.name).trim(), content: content as LinkedSectionFile["content"] });
  }
  const sectionIds = new Set(sections.map((s) => s.id));

  // Saved layouts: the theme pack's rules.
  const layouts: PackLayout[] = [];
  const rawLayouts = Array.isArray(raw.layouts) ? raw.layouts : [];
  if (rawLayouts.length > templateLimits.layouts) problems.push(`The template has more than ${templateLimits.layouts} saved layouts.`);
  for (const l of rawLayouts.slice(0, templateLimits.layouts)) {
    const content = isObject(l) ? cleanBlocks(l.content, blocks, count, templateLimits.blocks) : null;
    const lname = isObject(l) ? text(l.name, packLimits.name)?.trim() : null;
    if (!isObject(l) || !lname || (l.kind !== "section" && l.kind !== "page") || !content || !content.length) problems.push("A saved layout in the template is damaged.");
    else layouts.push({ name: lname, kind: l.kind, content });
  }

  // Blog
  const blog = isObject(raw.blog) ? { title: String(raw.blog.title ?? ""), intro: String(raw.blog.intro ?? "") } : { title: "Blog", intro: "" };
  problems.push(...checkBlog(blog));
  const posts: Post[] = [];
  const rawPosts = Array.isArray(raw.posts) ? raw.posts : [];
  if (rawPosts.length > templateLimits.posts) problems.push(`The template has more than ${templateLimits.posts} blog posts.`);
  for (const p of rawPosts.slice(0, templateLimits.posts)) {
    const content = isObject(p) && isObject(p.puck) ? cleanBlocks(p.puck.content, blocks, count, templateLimits.blocks) : null;
    if (!isObject(p) || !content) {
      problems.push("A blog post in the template is damaged.");
      continue;
    }
    const post = { slug: p.slug, title: p.title, description: p.description, date: p.date, cover: p.cover ?? "", coverAlt: p.coverAlt ?? "", puck: { root: { props: {} }, content } };
    const postProblems = checkPost(post);
    if (postProblems.length) problems.push(...postProblems.map((m) => `Post “${String(p.title ?? "").slice(0, 60)}”: ${m}`));
    else posts.push(post as Post);
  }
  if (count.blocks > templateLimits.blocks) problems.push("The template has too many blocks.");

  // Photos: real images, with alt text, and every photo the template uses is in it.
  const media: TemplatePhoto[] = [];
  const rawMedia = Array.isArray(raw.media) ? raw.media : [];
  if (rawMedia.length > templateLimits.photos) problems.push(`The template has more than ${templateLimits.photos} photos.`);
  for (const m of rawMedia.slice(0, templateLimits.photos)) {
    const file = isObject(m) && typeof m.file === "string" && PHOTO_FILE.test(m.file) ? m.file : null;
    const label = file ? `The photo ${file}` : "A photo in the template";
    const alt = isObject(m) ? text(m.alt, mediaLimits.alt)?.trim() : null;
    const bytes = isObject(m) && typeof m.data === "string" ? decodeBase64(m.data) : null;
    const sniffed = bytes ? sniffImage(bytes) : null;
    if (!file || !bytes || !sniffed) problems.push(`${label} is damaged or isn't a JPG, PNG or WebP.`);
    else if (file.slice(file.lastIndexOf(".") + 1) !== sniffed.ext) problems.push(`${label} isn't the kind of image its name says.`);
    else if (bytes.length > mediaLimits.uploadBytes) problems.push(`${label} is bigger than ${mediaLimits.uploadBytes / 1024 / 1024} MB.`);
    else if (sniffed.width > MAX_EDGE || sniffed.height > MAX_EDGE) problems.push(`${label} is bigger than ${MAX_EDGE} pixels.`);
    else if (!alt) problems.push(`${label} needs a description (alt text).`);
    else if (media.some((x) => x.file === file)) problems.push(`${label} is in the template twice.`);
    else media.push({ file, alt, width: sniffed.width, height: sniffed.height, data: m.data as string });
  }

  if (header && footer && tokens) {
    const source = { chrome: { header, footer }, pages, sections, layouts, posts };
    const have = new Set(media.map((m) => m.file));
    for (const file of photosUsed(source)) if (!have.has(file)) problems.push(`The photo ${file} is used but isn't in the template.`);
    const used = new Set<string>();
    for (const part of [...pages.map((p) => p.puck), ...posts.map((p) => p.puck), ...layouts.map((l) => l.content)]) for (const id of linkedSectionIds(part)) used.add(id);
    for (const id of used) if (!sectionIds.has(id)) problems.push(`The linked section “${id}” is used but isn't in the template.`);
  }

  if (problems.length || !tokens || !header || !footer || !language) return { template: null, problems: [...new Set(problems)] };
  return {
    template: {
      format: TEMPLATE_FORMAT,
      version: TEMPLATE_VERSION,
      name,
      description,
      exportedAt: text(raw.exportedAt, 40) ?? "",
      site: { name: siteName, language },
      tokens,
      header,
      footer,
      pages,
      sections,
      layouts,
      blog,
      posts,
      media,
    },
    problems: [],
  };
}

/** For the photo's MIME type when it's turned back into a file. */
export const photoType = (file: string) => mediaTypes[file.slice(file.lastIndexOf(".") + 1) as MediaExt];

/**
 * Start from a template (F048). The builder reads and checks the template
 * file first (readTemplate); here every part is checked again, the way the
 * other endpoints check what they save, before anything is written.
 *
 * Applying is one commit, so history shows the whole switch as one step and
 * undo can put back exactly what it changed. Photos go first, a few per
 * request (they're big, and Cloudflare limits how much one request can
 * do); they join the photo library and stay there after an undo.
 */
import { SECTIONS_FOLDER, checkSectionContent, checkSectionName, isValidSectionId, sectionFileFor, type LinkedSectionFile } from "@crust/blocks/linked-sections";
import { MEDIA_FOLDER, MEDIA_INDEX, mediaLimits, parseMediaIndex, type MediaItem } from "@crust/blocks/media";
import { BLOG_FILE, POSTS_FOLDER, checkBlog, checkPost, postFileFor, type BlogSettings, type Post } from "@crust/blocks/posts";
import { readTemplatePhoto, type TemplatePage } from "@crust/blocks/template";
import type { Page, SavedLayout, Site } from "@crust/blocks";
import { fail, gate, githubConfig, githubFailure, json, type Env } from "./api";
import {
  LAYOUTS_FOLDER,
  REDIRECTS_FILE,
  checkLayout,
  checkPage,
  checkSite,
  layoutFileFor,
  layoutIdFor,
  layoutIdForFile,
  pageFileFor,
  parseRedirects,
  serialize,
} from "./content";
import { commitChanges, commitFiles, filesAt, listFolder, readFile, recentCommits, type FileChange, type GitHubConfig } from "./github";

/** The parts of a template the apply step writes; photos were sent before. */
export interface TemplateContent {
  name: string;
  site: Pick<Site, "language" | "tokens" | "header" | "footer">;
  pages: TemplatePage[];
  sections: Pick<LinkedSectionFile, "id" | "name" | "content">[];
  layouts: Pick<SavedLayout, "name" | "kind" | "content">[];
  blog: BlogSettings;
  posts: Post[];
  /** Photo files the template uses; they must be in the library by now. */
  photos: string[];
}

export const APPLY_SUBJECT = /^Start from template "(.*)"$/;
export const UNDO_SUBJECT = /^Bring back the site from before template "(.*)"$/;
const PAGES_FOLDER = "content/pages";
/** Without photos a template is small; this is generous. */
const MAX_APPLY_REQUEST = 5 * 1024 * 1024;
/** A few photos per request, base64. */
export const MAX_PHOTOS_REQUEST = 12 * 1024 * 1024;
const MAX_NAME = 60;

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const text = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;
const subject = (message: string) => message.split("\n")[0] ?? "";
const cleanName = (name: unknown) => (typeof name === "string" ? name.replace(/["\n\r]/g, "").trim().slice(0, MAX_NAME) : "");

async function readJson(request: Request, max: number): Promise<Record<string, unknown> | Response> {
  const body = await request.text();
  if (body.length > max) return fail(413, "This template is too large to send in one go.");
  try {
    const value = JSON.parse(body) as unknown;
    return isObject(value) ? value : fail(400, "Nothing to do.");
  } catch {
    return fail(400, "The data sent wasn't valid JSON.");
  }
}

/** Everything wrong with the template's parts, checked like the save endpoints check them. */
export function checkTemplateContent(t: unknown): string[] {
  if (!isObject(t)) return ["The template is missing."];
  const problems: string[] = [];
  if (!cleanName(t.name)) problems.push("The template needs a name.");
  const pages = Array.isArray(t.pages) ? t.pages : [];
  if (!pages.length) problems.push("The template has no pages.");
  const paths = new Set<string>();
  for (const p of pages) {
    const label = isObject(p) && typeof p.title === "string" ? `Page “${p.title.slice(0, 60)}”: ` : "A page: ";
    problems.push(...checkPage(p).map((m) => label + m));
    if (isObject(p) && typeof p.path === "string") {
      if (paths.has(p.path)) problems.push(`Two pages use the address ${p.path}.`);
      paths.add(p.path);
    }
  }
  if (pages.length && !paths.has("/")) problems.push("The template needs a Home page (address /).");
  const sections = Array.isArray(t.sections) ? t.sections : [];
  const ids = new Set<string>();
  for (const s of sections) {
    if (!isObject(s) || !isValidSectionId(s.id) || ids.has(s.id)) {
      problems.push("A linked section in the template is damaged.");
      continue;
    }
    ids.add(s.id);
    problems.push(...checkSectionName(s.name), ...checkSectionContent(s.content));
  }
  for (const l of Array.isArray(t.layouts) ? t.layouts : []) problems.push(...checkLayout(l));
  problems.push(...checkBlog(t.blog));
  const slugs = new Set<string>();
  for (const p of Array.isArray(t.posts) ? t.posts : []) {
    problems.push(...checkPost(p));
    if (isObject(p) && typeof p.slug === "string") {
      if (slugs.has(p.slug)) problems.push(`Two posts use the address /blog/${p.slug}.`);
      slugs.add(p.slug);
    }
  }
  if (!Array.isArray(t.photos) || !t.photos.every((f) => typeof f === "string")) problems.push("The template's photo list is damaged.");
  if (!isObject(t.site)) problems.push("The template's style, header and footer are missing.");
  return problems;
}

/**
 * The commit that switches the site to the template: every page, linked
 * section and post that isn't in the template is deleted, the template's
 * are written, and Site settings take its style, header, footer and
 * language. The site's name and address stay. Saved layouts are added.
 * Redirects to pages that no longer exist are dropped.
 */
export function applyChanges(
  t: TemplateContent,
  current: { site: Site; pageFiles: string[]; sectionFiles: string[]; postFiles: string[]; layoutIds: string[]; redirects: string | null },
  now: Date,
): FileChange[] {
  const changes: FileChange[] = [];
  const write = new Set<string>();
  const put = (path: string, content: string) => {
    write.add(path);
    changes.push({ path, content });
  };
  const site: Site = { ...current.site, language: t.site.language, tokens: t.site.tokens, header: t.site.header, footer: t.site.footer };
  put("content/site.json", serialize(site));
  for (const p of t.pages) {
    const page: Page = { path: p.path, title: p.title, description: p.description, ...(p.seo ? { seo: p.seo } : {}), puck: p.puck };
    put(pageFileFor(p.path), serialize(page));
  }
  const savedAt = now.toISOString();
  for (const s of t.sections) put(sectionFileFor(s.id), text({ id: s.id, name: s.name.trim(), savedAt, content: s.content }));
  put(BLOG_FILE, text(t.blog));
  for (const p of t.posts) put(postFileFor(p.slug), text(p));
  for (const path of [...current.pageFiles, ...current.sectionFiles, ...current.postFiles]) if (!write.has(path)) changes.push({ path, content: null });
  const taken = [...current.layoutIds];
  for (const l of t.layouts) {
    const id = layoutIdFor(l.name, taken);
    taken.push(id);
    put(layoutFileFor(id), serialize({ id, name: l.name.trim(), kind: l.kind, savedAt, content: l.content }));
  }
  if (current.redirects !== null) {
    const before = parseRedirects(current.redirects);
    const paths = new Set(t.pages.map((p) => p.path));
    const after = before.filter((r) => paths.has(r.to));
    if (after.length !== before.length) put(REDIRECTS_FILE, serialize(after));
  }
  return changes;
}

/** "Replaced 3 pages…": the commit body, so history says what happened in words. */
function applyMessage(t: TemplateContent, current: { pageFiles: string[]; sectionFiles: string[]; postFiles: string[] }, email: string): string {
  const n = (count: number, one: string, many = `${one}s`) => `${count} ${count === 1 ? one : many}`;
  return [
    `Start from template "${cleanName(t.name)}"`,
    "",
    `Replaced ${n(current.pageFiles.length, "page")}, ${n(current.sectionFiles.length, "linked section")} and ${n(current.postFiles.length, "blog post")},`,
    "and the site's style, header and footer.",
    `Added ${n(t.pages.length, "page")}, ${n(t.sections.length, "linked section")}, ${n(t.posts.length, "blog post")} and ${n(t.layouts.length, "saved layout")}.`,
    "",
    `Applied by ${email}`,
  ].join("\n");
}

const jsonFiles = (files: { path: string }[], folder: string) => files.map((f) => f.path).filter((p) => p.startsWith(`${folder}/`) && p.endsWith(".json"));

/** The latest template switch still in place, or null (an undo after it, or none). */
export async function lastApplied(cfg: GitHubConfig, fetchFn: typeof fetch): Promise<{ commit: string; name: string; date: string } | null> {
  for (const c of await recentCommits(cfg, "content", fetchFn, 30)) {
    const s = subject(c.message);
    if (UNDO_SUBJECT.test(s)) return null;
    const m = APPLY_SUBJECT.exec(s);
    if (m) return { commit: c.sha, name: m[1]!, date: c.date };
  }
  return null;
}

/**
 * GET /api/template: the template switch that can be undone, if any.
 * POST /api/template
 *   { action: "photos", name, photos: [{ file, alt, data }] }  (first, a few at a time)
 *   { action: "apply", template: TemplateContent }
 *   { action: "undo", commit }
 */
export async function handleTemplate(request: Request, env: Env, fetchFn: typeof fetch = fetch): Promise<Response> {
  const write = request.method === "POST";
  const user = await gate(request, env, fetchFn, write);
  if (user instanceof Response) return user;
  const cfg = githubConfig(env);

  if (!write) {
    try {
      return json(200, { ok: true, last: await lastApplied(cfg, fetchFn) });
    } catch (e) {
      return githubFailure(e);
    }
  }

  const peek = request.headers.get("Content-Length");
  if (peek && Number(peek) > MAX_PHOTOS_REQUEST) return fail(413, "This template is too large to send in one go.");
  const body = await readJson(request, MAX_PHOTOS_REQUEST);
  if (body instanceof Response) return body;

  try {
    if (body.action === "photos") {
      const name = cleanName(body.name);
      const list = Array.isArray(body.photos) ? body.photos : [];
      if (!name || !list.length) return fail(400, "No photos were sent.");
      const photos = [];
      for (const raw of list) {
        const photo = readTemplatePhoto(raw);
        if (typeof photo === "string") return fail(422, `Not added. ${photo}`);
        photos.push(photo);
      }
      const items = parseMediaIndex(await readFile(cfg, MEDIA_INDEX, fetchFn));
      const incoming = new Set(photos.map((p) => p.file));
      const kept = items.filter((i) => !incoming.has(i.file));
      if (kept.length + photos.length > mediaLimits.photos) return fail(422, `The photo library would be over ${mediaLimits.photos} photos. Delete photos you no longer use.`);
      const uploadedAt = new Date().toISOString();
      const added: MediaItem[] = photos.map((p) => ({ file: p.file, alt: p.alt, width: p.width, height: p.height, bytes: Math.floor((p.data.length * 3) / 4), uploadedAt }));
      const result = await commitFiles(
        cfg,
        [
          ...photos.map((p) => ({ path: `${MEDIA_FOLDER}/${p.file}`, content: "", base64: p.data })),
          { path: MEDIA_INDEX, content: `${JSON.stringify([...kept, ...added], null, 2)}\n` },
        ],
        `Add photos from template "${name}"\n\n${photos.map((p) => p.file).join(", ")}\n\nAdded by ${user.email}`,
        fetchFn,
      );
      return json(200, { ok: true, files: photos.map((p) => p.file), commit: result.commit });
    }

    if (body.action === "apply") {
      if (JSON.stringify(body.template ?? null).length > MAX_APPLY_REQUEST) return fail(413, "This template is too large to apply.");
      const problems = checkTemplateContent(body.template);
      if (problems.length) return fail(422, `Not applied. ${[...new Set(problems)].slice(0, 8).join(" ")}`);
      const t = body.template as TemplateContent;
      const [siteText, mediaText, pageList, sectionList, postList, layoutList, redirects] = await Promise.all([
        readFile(cfg, "content/site.json", fetchFn),
        readFile(cfg, MEDIA_INDEX, fetchFn),
        listFolder(cfg, PAGES_FOLDER, fetchFn),
        listFolder(cfg, SECTIONS_FOLDER, fetchFn),
        listFolder(cfg, POSTS_FOLDER, fetchFn),
        listFolder(cfg, LAYOUTS_FOLDER, fetchFn),
        readFile(cfg, REDIRECTS_FILE, fetchFn),
      ]);
      if (!siteText) return fail(409, "Couldn't read your Site settings, so nothing was changed.");
      const site = { ...(JSON.parse(siteText) as Site), language: t.site.language, tokens: t.site.tokens, header: t.site.header, footer: t.site.footer };
      const siteProblems = checkSite(site);
      if (siteProblems.length) return fail(422, `Not applied. ${siteProblems.join(" ")}`);
      const library = new Set(parseMediaIndex(mediaText).map((m) => m.file));
      const missing = t.photos.filter((f) => !library.has(f));
      if (missing.length) return fail(409, `Not applied. These photos didn't arrive in the library: ${missing.join(", ")}. Try again.`);
      const current = {
        site: JSON.parse(siteText) as Site,
        pageFiles: jsonFiles(pageList, PAGES_FOLDER),
        sectionFiles: jsonFiles(sectionList, SECTIONS_FOLDER),
        postFiles: jsonFiles(postList, POSTS_FOLDER),
        layoutIds: layoutList.map((f) => layoutIdForFile(f.path)).filter((id): id is string => id !== null),
        redirects,
      };
      const result = await commitFiles(cfg, applyChanges(t, current, new Date()), applyMessage(t, current, user.email), fetchFn);
      return json(200, { ok: true, commit: result.commit, url: result.url, site });
    }

    if (body.action === "undo") {
      const commit = typeof body.commit === "string" && /^[0-9a-f]{7,40}$/i.test(body.commit) ? body.commit : null;
      const last = await lastApplied(cfg, fetchFn);
      if (!commit || !last || last.commit !== commit) return fail(404, "There's no template switch to undo in the recent history.");
      const { parent, files } = await commitChanges(cfg, commit, fetchFn);
      if (!parent) return fail(404, "There's no earlier site to bring back.");
      const before = await filesAt(cfg, parent, "content", fetchFn);
      const changes: FileChange[] = files
        .filter((f) => f.path.startsWith("content/"))
        .map((f) => {
          const sha = before.get(f.path);
          return sha ? { path: f.path, content: "", sha } : { path: f.path, content: null };
        });
      const result = await commitFiles(
        cfg,
        changes,
        `Bring back the site from before template "${last.name}"\n\nUndoes ${commit}.\n\nBrought back by ${user.email}`,
        fetchFn,
      );
      const siteText = await readFile(cfg, "content/site.json", fetchFn, parent);
      return json(200, { ok: true, commit: result.commit, site: siteText ? (JSON.parse(siteText) as Site) : null });
    }
    return fail(400, "Nothing to do.");
  } catch (e) {
    return githubFailure(e);
  }
}

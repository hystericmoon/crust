/**
 * The admin's server side (Cloudflare Pages Functions). Every endpoint:
 *  1. refuses unless Cloudflare Access and the GitHub token are configured,
 *  2. refuses requests that could come from another site (CSRF),
 *  3. refuses unless the request carries a valid Access sign-in.
 */
import type { Page, SavedLayout, Site } from "@crust/blocks/content";
import { countChromeLinks, countLinks, relinkChrome, relinkPage } from "@crust/blocks/links";
import { isBlogPath, isSearchPath, parsePost, postPath, POSTS_FOLDER, slugForFile, type Post } from "@crust/blocks/posts";
import { parseLinkedSection, sectionFileFor, sectionIdForFile } from "@crust/blocks/linked-sections";
import { countPlaceholders } from "@crust/blocks/placeholders";
import { AccessError, verifyAccessJwt, type AccessUser } from "./access";
import { readSections } from "./sections";
import {
  checkLayout,
  checkLayoutName,
  checkPage,
  checkSite,
  isValidLayoutId,
  layoutFileFor,
  layoutIdFor,
  layoutIdForFile,
  LAYOUTS_FOLDER,
  parseLayout,
  isValidPagePath,
  MAX_BYTES,
  pageFileFor,
  pagePathForFile,
  parseRedirects,
  REDIRECTS_FILE,
  redirectsAfterDelete,
  redirectsAfterRestore,
  redirectsAfterRename,
  serialize,
} from "./content";
import {
  GitHubError,
  type GitHubConfig,
  changedFiles,
  commitFiles,
  type FileChange,
  dispatchWorkflow,
  lastCommitDate,
  lastSuccessfulRun,
  latestRuns,
  liveAddress,
  listFolder,
  putFile,
  readFile,
  recentCommits,
} from "./github";
import { StoreError } from "./local-store";
import type { ContentStore, Repo } from "./store";

export interface Env {
  GITHUB_TOKEN?: string;
  GITHUB_REPO?: string;
  CONTENT_BRANCH?: string;
  ACCESS_TEAM_DOMAIN?: string;
  ACCESS_AUD?: string;
  /**
   * F054: keep content in this store instead of GitHub (the desktop app's
   * local folder). There's no Cloudflare Access then: the app runs on the
   * person's own computer, for them alone.
   */
  store?: ContentStore;
  /** Who the history says made a change, with a store. */
  localUser?: string;
}

export const DEFAULT_REPO = "hystericmoon/crust";
export const PUBLISH_WORKFLOW = "publish.yml";

export const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });

export const fail = (status: number, error: string, extra: Record<string, unknown> = {}) => json(status, { ok: false, error, ...extra });

/** Which settings are missing, in the owner's words. Empty when ready. */
export function missingSetup(env: Env): string[] {
  const missing: string[] = [];
  if (!env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD) missing.push("Cloudflare Access");
  if (!env.GITHUB_TOKEN) missing.push("the GitHub token");
  return missing;
}

/** Where this request's content lives (F054): the app's store, or GitHub. */
export const repoFor = (env: Env): Repo => env.store ?? githubConfig(env);

export const githubConfig = (env: Env): GitHubConfig => ({
  token: env.GITHUB_TOKEN!,
  repo: env.GITHUB_REPO || DEFAULT_REPO,
  branch: env.CONTENT_BRANCH || "main",
});

/** Shared gate. Returns the signed-in user, or the Response to send instead. */
export async function gate(request: Request, env: Env, fetchFn: typeof fetch, write: boolean): Promise<AccessUser | Response> {
  const missing = env.store ? [] : missingSetup(env);
  if (missing.length) {
    return fail(503, `Saving to GitHub isn't switched on yet: ${missing.join(" and ")} still need setting up.`, { notConfigured: true });
  }
  if (write) {
    // A custom header forces a CORS preflight, which other sites can't pass.
    if (request.headers.get("X-Crust") !== "1" || !request.headers.get("Content-Type")?.startsWith("application/json")) {
      return fail(400, "This request didn't come from the Crust admin.");
    }
    const origin = request.headers.get("Origin");
    if (origin && origin !== new URL(request.url).origin) return fail(403, "This request came from another site.");
  }
  if (env.store) return { email: env.localUser || "you" };
  try {
    return await verifyAccessJwt(
      request.headers.get("Cf-Access-Jwt-Assertion"),
      { teamDomain: env.ACCESS_TEAM_DOMAIN!, aud: env.ACCESS_AUD! },
      fetchFn,
    );
  } catch (e) {
    return fail(401, e instanceof AccessError ? e.message : "Couldn't check your sign-in.");
  }
}

export async function readBody(request: Request): Promise<unknown | Response> {
  const text = await request.text();
  if (new TextEncoder().encode(text).length > MAX_BYTES) return fail(413, "This page is too large to save (over 512 KB).");
  try {
    return JSON.parse(text);
  } catch {
    return fail(400, "The data sent wasn't valid JSON.");
  }
}

/** Where content is kept, for messages: "on GitHub", or "in this site" with the app's store (F054). */
export const keptIn = (env: Env) => (env.store ? "in this site" : "on GitHub");

export const githubFailure = (e: unknown) =>
  e instanceof StoreError
    ? fail(e.status === 409 ? 409 : e.status === 404 ? 404 : e.status === 422 ? 422 : 500, e.message)
    : e instanceof GitHubError ? fail(e.status === 409 ? 409 : 502, e.message) : fail(502, "Couldn't reach GitHub. Try again in a minute.");

/** GET /api/status: is saving switched on, and who is signed in. */
export async function handleStatus(request: Request, env: Env, fetchFn: typeof fetch = fetch): Promise<Response> {
  const missing = env.store ? [] : missingSetup(env);
  if (missing.length) return json(200, { ok: true, configured: false, missing });
  const user = await gate(request, env, fetchFn, false);
  if (user instanceof Response) return user;
  return json(200, { ok: true, configured: true, email: user.email });
}

/** POST /api/save  { kind: "page", page } | { kind: "site", site } */
export async function handleSave(request: Request, env: Env, fetchFn: typeof fetch = fetch): Promise<Response> {
  const user = await gate(request, env, fetchFn, true);
  if (user instanceof Response) return user;
  const body = await readBody(request);
  if (body instanceof Response) return body;
  const { kind, page, site } = (body ?? {}) as { kind?: string; page?: unknown; site?: unknown };

  let path: string;
  let content: string;
  let message: string;
  if (kind === "page") {
    const problems = checkPage(page);
    if (problems.length) return fail(422, `Not saved. ${problems.join(" ")}`);
    const p = page as Page;
    path = pageFileFor(p.path);
    content = serialize(p);
    message = `Save page ${p.path} ("${p.title}") from the builder`;
  } else if (kind === "site") {
    const problems = checkSite(site);
    if (problems.length) return fail(422, `Not saved. ${problems.join(" ")}`);
    path = "content/site.json";
    content = serialize(site as Site);
    message = "Save Site settings from the builder";
  } else {
    return fail(400, "Nothing to save.");
  }

  try {
    const result = await putFile(repoFor(env), path, content, `${message}\n\nSaved by ${user.email}`, fetchFn);
    return json(200, { ok: true, path, commit: result.commit, url: result.url });
  } catch (e) {
    return githubFailure(e);
  }
}

export interface PageSummary {
  path: string;
  title: string;
  file: string;
  lastEdited: string | null;
  /** F046: sample content from a template still to replace; left out when none. */
  placeholders?: number;
}

/** GET /api/pages: every page with its title and when it last changed (F007). */
export async function handlePages(request: Request, env: Env, fetchFn: typeof fetch = fetch): Promise<Response> {
  const user = await gate(request, env, fetchFn, false);
  if (user instanceof Response) return user;
  const cfg = repoFor(env);
  try {
    const files = (await listFolder(cfg, "content/pages", fetchFn)).filter((f) => f.name.endsWith(".json"));
    const pages = await Promise.all(
      files.map(async (f): Promise<PageSummary | null> => {
        const text = await readFile(cfg, f.path, fetchFn);
        if (!text) return null;
        try {
          const page = JSON.parse(text) as Page;
          const placeholders = countPlaceholders(page.puck?.content);
          return { path: page.path, title: page.title, file: f.path, lastEdited: await lastCommitDate(cfg, f.path, fetchFn), ...(placeholders ? { placeholders } : {}) };
        } catch {
          return null;
        }
      }),
    );
    return json(200, { ok: true, pages: pages.filter((p): p is PageSummary => p !== null).sort((a, b) => a.path.localeCompare(b.path)) });
  } catch (e) {
    return githubFailure(e);
  }
}

/** Every page file with its content; unreadable files are skipped. */
export async function readPages(cfg: Repo, fetchFn: typeof fetch): Promise<{ file: string; page: Page }[]> {
  const files = (await listFolder(cfg, "content/pages", fetchFn)).filter((f) => f.name.endsWith(".json"));
  const pages = await Promise.all(
    files.map(async (f) => {
      const text = await readFile(cfg, f.path, fetchFn);
      try {
        return text ? { file: f.path, page: JSON.parse(text) as Page } : null;
      } catch {
        return null;
      }
    }),
  );
  return pages.filter((p): p is { file: string; page: Page } => p !== null && Array.isArray(p.page.puck?.content));
}

const SITE_FILE = "content/site.json";
/** F069: what the site header and footer are called in the owner's messages. */
export const CHROME_LINKS_TITLE = "Site header and footer";

/** Every blog post with its file (F035); damaged files are left out. */
async function readPosts(cfg: Repo, fetchFn: typeof fetch): Promise<{ file: string; post: Post }[]> {
  const files = (await listFolder(cfg, POSTS_FOLDER, fetchFn)).filter((f) => slugForFile(f.path));
  const posts = await Promise.all(
    files.map(async (f) => {
      const post = parsePost(await readFile(cfg, f.path, fetchFn));
      return post ? { file: f.path, post } : null;
    }),
  );
  return posts.filter((p): p is { file: string; post: Post } => p !== null);
}

/** site.json as an object, or null when it's missing or damaged. */
const parseSite = (text: string | null): Record<string, unknown> | null => {
  try {
    const v = text ? (JSON.parse(text) as unknown) : null;
    return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
};

/** GET /api/links?path=/about: which other pages link to a page, for the rename dialog (F018). */
export async function handleLinks(request: Request, env: Env, fetchFn: typeof fetch = fetch): Promise<Response> {
  const user = await gate(request, env, fetchFn, false);
  if (user instanceof Response) return user;
  const path = new URL(request.url).searchParams.get("path");
  if (!isValidPagePath(path)) return fail(400, "That isn't a valid page address.");
  try {
    const cfg = repoFor(env);
    const [all, siteText, posts] = await Promise.all([readPages(cfg, fetchFn), readFile(cfg, SITE_FILE, fetchFn), readPosts(cfg, fetchFn)]);
    const pages = all
      .filter((p) => p.page.path !== path)
      .map((p) => ({ path: p.page.path, title: p.page.title, count: countLinks(p.page.puck, path) }))
      .filter((p) => p.count > 0)
      .sort((a, b) => a.path.localeCompare(b.path));
    // F069: the header, footer and blog posts are updated on rename too, so they're listed.
    const site = parseSite(siteText);
    const chrome = site ? countChromeLinks(site, path) : 0;
    const inPosts = posts
      .map(({ post }) => ({ path: postPath(post.slug), title: post.title, count: countLinks(post.puck, path) }))
      .filter((p) => p.count > 0)
      .sort((a, b) => a.path.localeCompare(b.path));
    return json(200, { ok: true, pages: [...(chrome ? [{ path: SITE_FILE, title: CHROME_LINKS_TITLE, count: chrome }] : []), ...pages, ...inPosts] });
  } catch (e) {
    return githubFailure(e);
  }
}

/** GET /api/page?path=/about: one page's full content (F007). */
export async function handlePage(request: Request, env: Env, fetchFn: typeof fetch = fetch): Promise<Response> {
  const user = await gate(request, env, fetchFn, false);
  if (user instanceof Response) return user;
  const path = new URL(request.url).searchParams.get("path");
  if (!isValidPagePath(path)) return fail(400, "That isn't a valid page address.");
  try {
    const text = await readFile(repoFor(env), pageFileFor(path), fetchFn);
    if (text === null) return fail(404, `There's no page at ${path}.`);
    return json(200, { ok: true, page: JSON.parse(text) as Page });
  } catch (e) {
    return githubFailure(e);
  }
}

/** POST /api/publish: starts the publish workflow (F008). GET: latest runs. */
export async function handlePublish(request: Request, env: Env, fetchFn: typeof fetch = fetch): Promise<Response> {
  const write = request.method === "POST";
  const user = await gate(request, env, fetchFn, write);
  if (user instanceof Response) return user;
  // Publishing from the desktop app runs on the computer (F056), not through GitHub.
  if (env.store) return fail(501, "Publishing from the app isn't available yet.", { notConfigured: true });
  const cfg = githubConfig(env);
  try {
    if (write) {
      await dispatchWorkflow(cfg, PUBLISH_WORKFLOW, fetchFn);
      return json(202, { ok: true });
    }
    const [runs, last] = await Promise.all([latestRuns(cfg, PUBLISH_WORKFLOW, fetchFn), lastSuccessfulRun(cfg, PUBLISH_WORKFLOW, fetchFn)]);
    // Where the site is live (F017): null until the first successful publish.
    const live = last ? await liveAddress(cfg, last.id, fetchFn) : null;
    // F044: notConnected names the owner's domain while publishing still uses the free address.
    return json(200, { ok: true, runs, liveUrl: live?.url ?? null, notConnected: live?.notConnected ?? null });
  } catch (e) {
    return githubFailure(e);
  }
}

/** POST /api/rename  { from: "/about", to: "/about-us" }  (F015) */
export async function handleRename(request: Request, env: Env, fetchFn: typeof fetch = fetch): Promise<Response> {
  const user = await gate(request, env, fetchFn, true);
  if (user instanceof Response) return user;
  const body = await readBody(request);
  if (body instanceof Response) return body;
  const { from, to } = (body ?? {}) as { from?: unknown; to?: unknown };
  if (!isValidPagePath(from) || !isValidPagePath(to)) return fail(400, "The page address must look like /about (lowercase letters, numbers and dashes).");
  if (from === "/" || to === "/") return fail(400, "The Home page always lives at /, so it can't be renamed.");
  if (from === to) return fail(400, "That's already this page's address.");
  if (isBlogPath(to)) return fail(400, "Addresses starting with /blog are where your posts are published. Choose another address.");
  if (isSearchPath(to)) return fail(400, "/search is where site search lives. Choose another address.");

  const cfg = repoFor(env);
  try {
    const [text, clash, redirectsText] = await Promise.all([
      readFile(cfg, pageFileFor(from), fetchFn),
      readFile(cfg, pageFileFor(to), fetchFn),
      readFile(cfg, REDIRECTS_FILE, fetchFn),
    ]);
    if (text === null) return fail(404, `There's no page at ${from} ${keptIn(env)}.`);
    if (clash !== null) return fail(409, `There's already a page at ${to}.`);
    // Links on the page itself (e.g. a "back to top" button) follow it too.
    const own = JSON.parse(text) as Page;
    const self = relinkPage(own.puck, from, to);
    const page = { ...own, path: to, puck: self.puck };
    const redirects = redirectsAfterRename(parseRedirects(redirectsText), from, to);
    // F018: links on other pages point at the new address, in the same commit.
    const others = (await readPages(cfg, fetchFn)).filter((p) => p.page.path !== from);
    const relinkChanges: FileChange[] = [];
    const relinked: { path: string; title: string; count: number }[] = self.count ? [{ path: to, title: page.title, count: self.count }] : [];
    for (const other of others) {
      const { puck, count } = relinkPage(other.page.puck, from, to);
      if (!count) continue;
      relinkChanges.push({ path: other.file, content: serialize({ ...other.page, puck }) });
      relinked.push({ path: other.page.path, title: other.page.title, count });
    }
    // F043: links inside linked sections follow too; they show on many pages.
    for (const section of await readSections(cfg, fetchFn)) {
      const { puck, count } = relinkPage({ root: { props: {} }, content: section.content } as Page["puck"], from, to);
      if (!count) continue;
      relinkChanges.push({ path: sectionFileFor(section.id), content: `${JSON.stringify({ ...section, content: puck.content }, null, 2)}\n` });
      relinked.push({ path: `linked section: ${section.name}`, title: section.name, count });
    }
    // F069: the site header and footer (site.json) and blog posts too.
    const [siteText, posts] = await Promise.all([readFile(cfg, SITE_FILE, fetchFn), readPosts(cfg, fetchFn)]);
    const site = parseSite(siteText);
    if (site) {
      const chrome = relinkChrome(site, from, to);
      if (chrome.count) {
        relinkChanges.push({ path: SITE_FILE, content: serialize(chrome.site as unknown as Site) });
        relinked.push({ path: SITE_FILE, title: CHROME_LINKS_TITLE, count: chrome.count });
      }
    }
    for (const { file, post } of posts) {
      const { puck, count } = relinkPage(post.puck as Page["puck"], from, to);
      if (!count) continue;
      relinkChanges.push({ path: file, content: `${JSON.stringify({ ...post, puck }, null, 2)}\n` });
      relinked.push({ path: postPath(post.slug), title: post.title, count });
    }
    const links = relinked.reduce((n, r) => n + r.count, 0);
    const result = await commitFiles(
      cfg,
      [
        { path: pageFileFor(to), content: serialize(page) },
        { path: pageFileFor(from), content: null },
        { path: REDIRECTS_FILE, content: serialize(redirects) },
        ...relinkChanges,
      ],
      `Rename page ${from} to ${to} from the builder\n\nVisitors to ${from} are sent to ${to}.${links ? `\nUpdated ${links} link${links === 1 ? "" : "s"} to the new address.` : ""}\nRenamed by ${user.email}`,
      fetchFn,
    );
    return json(200, { ok: true, page, relinked, commit: result.commit, url: result.url });
  } catch (e) {
    return githubFailure(e);
  }
}

/** POST /api/delete  { path: "/about" }  (F015) */
export async function handleDelete(request: Request, env: Env, fetchFn: typeof fetch = fetch): Promise<Response> {
  const user = await gate(request, env, fetchFn, true);
  if (user instanceof Response) return user;
  const body = await readBody(request);
  if (body instanceof Response) return body;
  const { path } = (body ?? {}) as { path?: unknown };
  if (!isValidPagePath(path)) return fail(400, "That isn't a valid page address.");
  if (path === "/") return fail(400, "The Home page can't be deleted. Every site needs one.");

  const cfg = repoFor(env);
  try {
    const [text, redirectsText] = await Promise.all([readFile(cfg, pageFileFor(path), fetchFn), readFile(cfg, REDIRECTS_FILE, fetchFn)]);
    if (text === null) return fail(404, `There's no page at ${path} ${keptIn(env)}.`);
    const before = parseRedirects(redirectsText);
    const after = redirectsAfterDelete(before, path);
    const result = await commitFiles(
      cfg,
      [
        { path: pageFileFor(path), content: null },
        ...(after.length !== before.length ? [{ path: REDIRECTS_FILE, content: serialize(after) }] : []),
      ],
      `Delete page ${path} from the builder\n\nDeleted by ${user.email}`,
      fetchFn,
    );
    return json(200, { ok: true, commit: result.commit, url: result.url });
  } catch (e) {
    return githubFailure(e);
  }
}

export interface PendingChanges {
  /** The last successful publish, or null if the site was never published. */
  lastPublish: { at: string; url: string } | null;
  /** Pages on GitHub that aren't live in their current form. */
  pages: { path: string; change: "new" | "edited" }[];
  /** Live pages that the next publish takes down. */
  removed: string[];
  /** Live pages whose address changed: the old one redirects to the new one (F015). */
  moved: { from: string; to: string }[];
  site: boolean;
  redirects: boolean;
  /** Linked sections saved since (F043); each changes every page that shows it. */
  sections?: { id: string; name: string; change: "new" | "edited" | "removed" }[];
}

/** GET /api/changes: what the next publish will change (F016). */
export async function handleChanges(request: Request, env: Env, fetchFn: typeof fetch = fetch): Promise<Response> {
  const user = await gate(request, env, fetchFn, false);
  if (user instanceof Response) return user;
  const cfg = repoFor(env);
  try {
    const last = await lastSuccessfulRun(cfg, PUBLISH_WORKFLOW, fetchFn);
    if (!last) {
      // Never published: every page is new.
      const files = await listFolder(cfg, "content/pages", fetchFn);
      const pages = files.map((f) => pagePathForFile(f.path)).filter((p): p is string => p !== null);
      const changes: PendingChanges = { lastPublish: null, pages: pages.sort().map((path) => ({ path, change: "new" })), removed: [], moved: [], site: true, redirects: false };
      return json(200, { ok: true, ...changes });
    }
    const changes: PendingChanges = { lastPublish: { at: last.createdAt, url: last.url }, pages: [], removed: [], moved: [], site: false, redirects: false };
    for (const f of await changedFiles(cfg, last.sha, fetchFn)) {
      if (f.path === "content/site.json") changes.site = true;
      else if (f.path === REDIRECTS_FILE) changes.redirects = true;
      const sectionId = sectionIdForFile(f.path);
      if (sectionId) {
        const change = f.status === "removed" ? "removed" : f.status === "added" ? "new" : "edited";
        const name = change === "removed" ? sectionId : (parseLinkedSection(await readFile(cfg, f.path, fetchFn), sectionId)?.name ?? sectionId);
        (changes.sections ??= []).push({ id: sectionId, name, change });
      }
      const path = pagePathForFile(f.path);
      if (!path) continue;
      if (f.status === "removed") changes.removed.push(path);
      else changes.pages.push({ path, change: f.status === "added" ? "new" : "edited" });
    }
    // A removed page that now redirects was renamed, not taken down.
    if (changes.redirects && changes.removed.length) {
      const redirects = parseRedirects(await readFile(cfg, REDIRECTS_FILE, fetchFn));
      changes.moved = redirects.filter((r) => changes.removed.includes(r.from));
      changes.removed = changes.removed.filter((path) => !changes.moved.some((m) => m.from === path));
    }
    changes.pages.sort((a, b) => a.path.localeCompare(b.path));
    changes.removed.sort();
    return json(200, { ok: true, ...changes });
  } catch (e) {
    return githubFailure(e);
  }
}

/** First line of the commit handleDelete makes. */
const DELETE_COMMIT = /^Delete page (\S+) from the builder$/;

export interface DeletedPage {
  path: string;
  title: string;
  deletedAt: string;
  /** The deleting commit; the page is restored from its parent. */
  commit: string;
}

/** GET /api/deleted: pages deleted from the builder that could come back (F019). */
export async function handleDeleted(request: Request, env: Env, fetchFn: typeof fetch = fetch): Promise<Response> {
  const user = await gate(request, env, fetchFn, false);
  if (user instanceof Response) return user;
  const cfg = repoFor(env);
  try {
    const [commits, files] = await Promise.all([recentCommits(cfg, "content/pages", fetchFn), listFolder(cfg, "content/pages", fetchFn)]);
    const existing = new Set(files.map((f) => pagePathForFile(f.path)));
    const seen = new Set<string>();
    const found: { path: string; deletedAt: string; commit: string; parent: string }[] = [];
    for (const c of commits) {
      const path = DELETE_COMMIT.exec(c.message.split("\n")[0]!)?.[1];
      // Newest deletion per address only, and not if a page lives there again.
      if (!path || !c.parent || !isValidPagePath(path) || seen.has(path) || existing.has(path)) continue;
      seen.add(path);
      found.push({ path, deletedAt: c.date, commit: c.sha, parent: c.parent });
      if (found.length === 10) break;
    }
    const pages = await Promise.all(
      found.map(async (d): Promise<DeletedPage | null> => {
        const text = await readFile(cfg, pageFileFor(d.path), fetchFn, d.parent);
        if (!text) return null;
        try {
          return { path: d.path, title: (JSON.parse(text) as Page).title || d.path, deletedAt: d.deletedAt, commit: d.commit };
        } catch {
          return null;
        }
      }),
    );
    return json(200, { ok: true, pages: pages.filter((p): p is DeletedPage => p !== null) });
  } catch (e) {
    return githubFailure(e);
  }
}

/** POST /api/restore  { path, commit }: brings a deleted page back as it was (F019). */
export async function handleRestore(request: Request, env: Env, fetchFn: typeof fetch = fetch): Promise<Response> {
  const user = await gate(request, env, fetchFn, true);
  if (user instanceof Response) return user;
  const body = await readBody(request);
  if (body instanceof Response) return body;
  const { path, commit } = (body ?? {}) as { path?: unknown; commit?: unknown };
  if (!isValidPagePath(path) || typeof commit !== "string" || !/^[0-9a-f]{7,40}$/i.test(commit)) return fail(400, "That isn't a page that can be restored.");
  const cfg = repoFor(env);
  try {
    // Only a deletion made by the builder, found in the recent history, can be undone here.
    const deletion = (await recentCommits(cfg, "content/pages", fetchFn)).find((c) => c.sha === commit);
    if (!deletion?.parent || DELETE_COMMIT.exec(deletion.message.split("\n")[0]!)?.[1] !== path) {
      return fail(404, `Couldn't find the deleted page ${path} in the recent history.`);
    }
    if ((await readFile(cfg, pageFileFor(path), fetchFn)) !== null) return fail(409, `There's already a page at ${path}.`);
    const text = await readFile(cfg, pageFileFor(path), fetchFn, deletion.parent);
    if (text === null) return fail(404, `Couldn't find the deleted page ${path} in the recent history.`);
    const page = JSON.parse(text) as Page;
    const problems = checkPage(page);
    if (problems.length) return fail(422, `Not restored. ${problems.join(" ")}`);
    // F040: redirects the deletion removed come back with the page.
    const [redirectsText, redirectsBefore, files] = await Promise.all([
      readFile(cfg, REDIRECTS_FILE, fetchFn),
      readFile(cfg, REDIRECTS_FILE, fetchFn, deletion.parent),
      listFolder(cfg, "content/pages", fetchFn),
    ]);
    const current = parseRedirects(redirectsText);
    const pages = new Set(files.map((f) => pagePathForFile(f.path)).filter((p): p is string => p !== null));
    const redirects = redirectsAfterRestore(current, parseRedirects(redirectsBefore), path, pages);
    const back = redirects.filter((r) => r.to === path && !current.some((c) => c.from === r.from)).map((r) => r.from);
    const changed = back.length > 0 || current.some((r) => r.from === path);
    const result = await commitFiles(
      cfg,
      [{ path: pageFileFor(path), content: serialize(page) }, ...(changed ? [{ path: REDIRECTS_FILE, content: serialize(redirects) }] : [])],
      `Restore page ${path} ("${page.title}") from the builder\n\n${back.length ? `Visitors to ${back.join(", ")} are sent to ${path} again.\n` : ""}Restored by ${user.email}`,
      fetchFn,
    );
    return json(200, { ok: true, page, redirects: back, commit: result.commit, url: result.url });
  } catch (e) {
    return githubFailure(e);
  }
}

// --- My layouts (F027) ---------------------------------------------------------------

/** Every saved layout, newest first; unreadable files are skipped. */
async function readLayouts(cfg: Repo, fetchFn: typeof fetch): Promise<SavedLayout[]> {
  const files = await listFolder(cfg, LAYOUTS_FOLDER, fetchFn);
  const layouts = await Promise.all(
    files.map(async (f) => {
      const id = layoutIdForFile(f.path);
      return id ? parseLayout(await readFile(cfg, f.path, fetchFn), id) : null;
    }),
  );
  return layouts.filter((l): l is SavedLayout => l !== null).sort((a, b) => b.savedAt.localeCompare(a.savedAt) || a.name.localeCompare(b.name));
}

/**
 * GET /api/layouts: the owner's saved layouts.
 * POST /api/layouts
 *   { action: "save", layout: { name, kind, content } }
 *   { action: "rename", id, name }
 *   { action: "delete", id }
 */
export async function handleLayouts(request: Request, env: Env, fetchFn: typeof fetch = fetch): Promise<Response> {
  const write = request.method === "POST";
  const user = await gate(request, env, fetchFn, write);
  if (user instanceof Response) return user;
  const cfg = repoFor(env);
  if (!write) {
    try {
      return json(200, { ok: true, layouts: await readLayouts(cfg, fetchFn) });
    } catch (e) {
      return githubFailure(e);
    }
  }

  const body = await readBody(request);
  if (body instanceof Response) return body;
  const { action, layout, id, name } = (body ?? {}) as { action?: string; layout?: unknown; id?: unknown; name?: unknown };
  try {
    if (action === "save") {
      const problems = checkLayout(layout);
      if (problems.length) return fail(422, `Not saved. ${problems.join(" ")}`);
      const l = layout as Pick<SavedLayout, "name" | "kind" | "content">;
      const taken = (await listFolder(cfg, LAYOUTS_FOLDER, fetchFn)).map((f) => layoutIdForFile(f.path)).filter((x): x is string => x !== null);
      const saved: SavedLayout = { id: layoutIdFor(l.name, taken), name: l.name.trim(), kind: l.kind, savedAt: new Date().toISOString(), content: l.content };
      const result = await commitFiles(
        cfg,
        [{ path: layoutFileFor(saved.id), content: serialize(saved) }],
        `Save layout "${saved.name}" from the builder\n\nSaved by ${user.email}`,
        fetchFn,
      );
      return json(200, { ok: true, layout: saved, commit: result.commit });
    }

    if (!isValidLayoutId(id)) return fail(400, "That isn't one of your layouts.");
    const current = parseLayout(await readFile(cfg, layoutFileFor(id), fetchFn), id);
    if (!current) return fail(404, `That layout isn't ${keptIn(env)} any more. It may have been deleted.`);

    if (action === "rename") {
      const problems = checkLayoutName(name);
      if (problems.length) return fail(422, `Not renamed. ${problems.join(" ")}`);
      // The id (file name) stays, so nothing else needs to change.
      const renamed: SavedLayout = { ...current, name: (name as string).trim() };
      const result = await commitFiles(
        cfg,
        [{ path: layoutFileFor(id), content: serialize(renamed) }],
        `Rename layout "${current.name}" to "${renamed.name}" from the builder\n\nRenamed by ${user.email}`,
        fetchFn,
      );
      return json(200, { ok: true, layout: renamed, commit: result.commit });
    }

    if (action === "delete") {
      const result = await commitFiles(
        cfg,
        [{ path: layoutFileFor(id), content: null }],
        `Delete layout "${current.name}" from the builder\n\nPages that used it keep their copy.\nDeleted by ${user.email}`,
        fetchFn,
      );
      return json(200, { ok: true, commit: result.commit });
    }
    return fail(400, "Nothing to do.");
  } catch (e) {
    return githubFailure(e);
  }
}

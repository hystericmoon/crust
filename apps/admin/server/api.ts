/**
 * The admin's server side (Cloudflare Pages Functions). Every endpoint:
 *  1. refuses unless Cloudflare Access and the GitHub token are configured,
 *  2. refuses requests that could come from another site (CSRF),
 *  3. refuses unless the request carries a valid Access sign-in.
 */
import type { Page, Site } from "@crust/blocks/content";
import { AccessError, verifyAccessJwt, type AccessUser } from "./access";
import {
  checkPage,
  checkSite,
  isValidPagePath,
  MAX_BYTES,
  pageFileFor,
  pagePathForFile,
  parseRedirects,
  REDIRECTS_FILE,
  redirectsAfterDelete,
  redirectsAfterRename,
  serialize,
} from "./content";
import {
  GitHubError,
  type GitHubConfig,
  changedFiles,
  commitFiles,
  dispatchWorkflow,
  lastCommitDate,
  lastSuccessfulRun,
  latestRuns,
  liveAddress,
  listFolder,
  putFile,
  readFile,
} from "./github";

export interface Env {
  GITHUB_TOKEN?: string;
  GITHUB_REPO?: string;
  CONTENT_BRANCH?: string;
  ACCESS_TEAM_DOMAIN?: string;
  ACCESS_AUD?: string;
}

export const DEFAULT_REPO = "hystericmoon/crust";
export const PUBLISH_WORKFLOW = "publish.yml";

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });

const fail = (status: number, error: string, extra: Record<string, unknown> = {}) => json(status, { ok: false, error, ...extra });

/** Which settings are missing, in the owner's words. Empty when ready. */
export function missingSetup(env: Env): string[] {
  const missing: string[] = [];
  if (!env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD) missing.push("Cloudflare Access");
  if (!env.GITHUB_TOKEN) missing.push("the GitHub token");
  return missing;
}

const githubConfig = (env: Env): GitHubConfig => ({
  token: env.GITHUB_TOKEN!,
  repo: env.GITHUB_REPO || DEFAULT_REPO,
  branch: env.CONTENT_BRANCH || "main",
});

/** Shared gate. Returns the signed-in user, or the Response to send instead. */
export async function gate(request: Request, env: Env, fetchFn: typeof fetch, write: boolean): Promise<AccessUser | Response> {
  const missing = missingSetup(env);
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

async function readBody(request: Request): Promise<unknown | Response> {
  const text = await request.text();
  if (new TextEncoder().encode(text).length > MAX_BYTES) return fail(413, "This page is too large to save (over 512 KB).");
  try {
    return JSON.parse(text);
  } catch {
    return fail(400, "The data sent wasn't valid JSON.");
  }
}

const githubFailure = (e: unknown) =>
  e instanceof GitHubError ? fail(e.status === 409 ? 409 : 502, e.message) : fail(502, "Couldn't reach GitHub. Try again in a minute.");

/** GET /api/status: is saving switched on, and who is signed in. */
export async function handleStatus(request: Request, env: Env, fetchFn: typeof fetch = fetch): Promise<Response> {
  const missing = missingSetup(env);
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
    const result = await putFile(githubConfig(env), path, content, `${message}\n\nSaved by ${user.email}`, fetchFn);
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
}

/** GET /api/pages: every page with its title and when it last changed (F007). */
export async function handlePages(request: Request, env: Env, fetchFn: typeof fetch = fetch): Promise<Response> {
  const user = await gate(request, env, fetchFn, false);
  if (user instanceof Response) return user;
  const cfg = githubConfig(env);
  try {
    const files = (await listFolder(cfg, "content/pages", fetchFn)).filter((f) => f.name.endsWith(".json"));
    const pages = await Promise.all(
      files.map(async (f): Promise<PageSummary | null> => {
        const text = await readFile(cfg, f.path, fetchFn);
        if (!text) return null;
        try {
          const page = JSON.parse(text) as Page;
          return { path: page.path, title: page.title, file: f.path, lastEdited: await lastCommitDate(cfg, f.path, fetchFn) };
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

/** GET /api/page?path=/about: one page's full content (F007). */
export async function handlePage(request: Request, env: Env, fetchFn: typeof fetch = fetch): Promise<Response> {
  const user = await gate(request, env, fetchFn, false);
  if (user instanceof Response) return user;
  const path = new URL(request.url).searchParams.get("path");
  if (!isValidPagePath(path)) return fail(400, "That isn't a valid page address.");
  try {
    const text = await readFile(githubConfig(env), pageFileFor(path), fetchFn);
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
  const cfg = githubConfig(env);
  try {
    if (write) {
      await dispatchWorkflow(cfg, PUBLISH_WORKFLOW, fetchFn);
      return json(202, { ok: true });
    }
    const [runs, last] = await Promise.all([latestRuns(cfg, PUBLISH_WORKFLOW, fetchFn), lastSuccessfulRun(cfg, PUBLISH_WORKFLOW, fetchFn)]);
    // Where the site is live (F017): null until the first successful publish.
    const liveUrl = last ? await liveAddress(cfg, last.id, fetchFn) : null;
    return json(200, { ok: true, runs, liveUrl });
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

  const cfg = githubConfig(env);
  try {
    const [text, clash, redirectsText] = await Promise.all([
      readFile(cfg, pageFileFor(from), fetchFn),
      readFile(cfg, pageFileFor(to), fetchFn),
      readFile(cfg, REDIRECTS_FILE, fetchFn),
    ]);
    if (text === null) return fail(404, `There's no page at ${from} on GitHub.`);
    if (clash !== null) return fail(409, `There's already a page at ${to}.`);
    const page = { ...(JSON.parse(text) as Page), path: to };
    const redirects = redirectsAfterRename(parseRedirects(redirectsText), from, to);
    const result = await commitFiles(
      cfg,
      [
        { path: pageFileFor(to), content: serialize(page) },
        { path: pageFileFor(from), content: null },
        { path: REDIRECTS_FILE, content: serialize(redirects) },
      ],
      `Rename page ${from} to ${to} from the builder\n\nVisitors to ${from} are sent to ${to}.\nRenamed by ${user.email}`,
      fetchFn,
    );
    return json(200, { ok: true, page, commit: result.commit, url: result.url });
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

  const cfg = githubConfig(env);
  try {
    const [text, redirectsText] = await Promise.all([readFile(cfg, pageFileFor(path), fetchFn), readFile(cfg, REDIRECTS_FILE, fetchFn)]);
    if (text === null) return fail(404, `There's no page at ${path} on GitHub.`);
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
}

/** GET /api/changes: what the next publish will change (F016). */
export async function handleChanges(request: Request, env: Env, fetchFn: typeof fetch = fetch): Promise<Response> {
  const user = await gate(request, env, fetchFn, false);
  if (user instanceof Response) return user;
  const cfg = githubConfig(env);
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

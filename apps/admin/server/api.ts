/**
 * The admin's server side (Cloudflare Pages Functions). Every endpoint:
 *  1. refuses unless Cloudflare Access and the GitHub token are configured,
 *  2. refuses requests that could come from another site (CSRF),
 *  3. refuses unless the request carries a valid Access sign-in.
 */
import type { Page, Site } from "@crust/blocks/content";
import { AccessError, verifyAccessJwt, type AccessUser } from "./access";
import { checkPage, checkSite, isValidPagePath, MAX_BYTES, pageFileFor, serialize } from "./content";
import { GitHubError, type GitHubConfig, dispatchWorkflow, lastCommitDate, latestRuns, listFolder, putFile, readFile } from "./github";

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
    return json(200, { ok: true, runs: await latestRuns(cfg, PUBLISH_WORKFLOW, fetchFn) });
  } catch (e) {
    return githubFailure(e);
  }
}

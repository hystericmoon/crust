import { defaultTokens, type Page, type Site } from "@crust/blocks";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { clearAccessKeyCache, verifyAccessJwt } from "./access";
import { handleChanges, handleDelete, handleDeleted, handleLinks, handleRestore, handlePage, handlePages, handlePublish, handleRename, handleSave, handleStatus, type Env } from "./api";
import { checkPage, isValidPagePath, pageFileFor, pagePathForFile, parseRedirects, redirectsAfterDelete, redirectsAfterRename } from "./content";
import { fromBase64, toBase64 } from "./github";

// --- A fake Cloudflare Access: real RS256 keys, tokens signed in the test ---

const TEAM = "crust-team.cloudflareaccess.com";
const AUD = "aud-123";
let keys: CryptoKeyPair;
let jwk: JsonWebKey & { kid: string };

const b64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const enc = (o: unknown) => b64url(new TextEncoder().encode(JSON.stringify(o)));

async function token(claims: Record<string, unknown> = {}, kid = "k1", key = keys.privateKey) {
  const now = Math.floor(Date.now() / 1000);
  const head = enc({ alg: "RS256", kid });
  const body = enc({ iss: `https://${TEAM}`, aud: [AUD], email: "hosni@example.com", exp: now + 600, iat: now, ...claims });
  const sig = new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(`${head}.${body}`)));
  return `${head}.${body}.${b64url(sig)}`;
}

beforeAll(async () => {
  keys = (await crypto.subtle.generateKey(
    { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
    true,
    ["sign", "verify"],
  )) as CryptoKeyPair;
  jwk = { ...(await crypto.subtle.exportKey("jwk", keys.publicKey)), kid: "k1" };
});

// --- A fake GitHub: an in-memory repo behind the contents API ---

let files: Map<string, { content: string; sha: string }>;
let commits: { path: string; message: string; branch: string }[];
let dispatched: string[];
let githubStatus: number | null;
let shaCounter: number;
// Git data API state (F015): multi-file commits land in `files` when the branch moves.
let head: string;
let trees: Map<string, { path: string; content?: string; sha?: null }[]>;
let gitCommits: Map<string, { message: string; tree: string; parents: string[] }>;
let multiCommits: { message: string; paths: string[] }[];
let raceOnUpdate: boolean;
// Publish history (F016)
let successRuns: { id?: number; head_sha: string; created_at: string; html_url: string }[];
// Commit history and old file versions (F019).
let history: { sha: string; parents: { sha: string }[]; commit: { message: string; committer: { date: string } } }[];
let filesAt: Map<string, Map<string, string>>;
let runJobs: { steps: { name: string; conclusion: string | null }[] }[];
let jobsAsked: string[];
let compareBase: string | null;
let compareFiles: { filename: string; status: string; previous_filename?: string }[];

const respond = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });

const fakeFetch: typeof fetch = async (input, init) => {
  const url = new URL(String(input));
  if (url.host === TEAM) return respond(200, { keys: [jwk] });
  if (url.host !== "api.github.com") return respond(404, {});
  if (githubStatus) return respond(githubStatus, {});
  expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer gh-token");
  const m = url.pathname.match(/^\/repos\/hystericmoon\/crust\/contents\/(.+)$/);
  if (m) {
    const path = decodeURIComponent(m[1]!);
    if (init?.method === "PUT") {
      const body = JSON.parse(String(init.body)) as { message: string; content: string; branch: string; sha?: string };
      const existing = files.get(path);
      if (existing && body.sha !== existing.sha) return respond(409, {});
      const sha = `blob${++shaCounter}`;
      files.set(path, { content: fromBase64(body.content), sha });
      commits.push({ path, message: body.message, branch: body.branch });
      return respond(200, { commit: { sha: `commit${shaCounter}`, html_url: `https://github.com/c/${shaCounter}` } });
    }
    if (path === "content/pages") {
      const list = [...files.keys()].filter((p) => p.startsWith("content/pages/"));
      return respond(200, list.map((p) => ({ type: "file", name: p.split("/").pop(), path: p, sha: files.get(p)!.sha })));
    }
    const old = filesAt.get(url.searchParams.get("ref") ?? "");
    if (old) return old.has(path) ? respond(200, { sha: "old", content: toBase64(old.get(path)!) }) : respond(404, {});
    const f = files.get(path);
    return f ? respond(200, { sha: f.sha, content: toBase64(f.content) }) : respond(404, {});
  }
  const git = url.pathname.match(/^\/repos\/hystericmoon\/crust\/git\/(.+)$/);
  if (git) {
    const [what, rest] = [git[1]!.split("/")[0], git[1]!.split("/").slice(1).join("/")];
    const body = init?.body ? JSON.parse(String(init.body)) : null;
    if (what === "ref" && rest === "heads/main") return respond(200, { object: { sha: head } });
    if (what === "commits" && (init?.method ?? "GET") === "GET") return respond(200, { tree: { sha: `tree-of-${rest}` } });
    if (what === "trees" && init?.method === "POST") {
      const sha = `tree${++shaCounter}`;
      trees.set(sha, body.tree);
      return respond(201, { sha });
    }
    if (what === "commits" && init?.method === "POST") {
      const sha = `commit${++shaCounter}`;
      gitCommits.set(sha, body);
      return respond(201, { sha, html_url: `https://github.com/c/${sha}` });
    }
    if (what === "refs" && rest === "heads/main" && init?.method === "PATCH") {
      const commit = gitCommits.get(body.sha)!;
      if (raceOnUpdate || commit.parents[0] !== head || body.force) return respond(422, {});
      for (const entry of trees.get(commit.tree)!) {
        if (entry.sha === null) {
          if (!files.delete(entry.path)) return respond(422, {});
        } else files.set(entry.path, { content: entry.content!, sha: `blob${++shaCounter}` });
      }
      multiCommits.push({ message: commit.message, paths: trees.get(commit.tree)!.map((e) => e.path) });
      head = body.sha;
      return respond(200, { object: { sha: head } });
    }
    return respond(404, {});
  }
  if (url.pathname.startsWith("/repos/hystericmoon/crust/compare/")) {
    compareBase = decodeURIComponent(url.pathname.split("/compare/")[1]!);
    return respond(200, { files: compareFiles });
  }
  if (url.pathname === "/repos/hystericmoon/crust/commits" && url.searchParams.get("path") === "content/pages") return respond(200, history);
  if (url.pathname === "/repos/hystericmoon/crust/commits") return respond(200, [{ commit: { committer: { date: "2026-10-28T10:00:00Z" } } }]);
  if (url.pathname.endsWith("/dispatches")) {
    dispatched.push(url.pathname);
    return new Response(null, { status: 204 });
  }
  if (url.pathname.endsWith("/jobs")) {
    jobsAsked.push(url.pathname);
    return respond(200, { jobs: runJobs });
  }
  if (url.pathname.endsWith("/runs") && url.searchParams.get("status") === "success") {
    return respond(200, { workflow_runs: successRuns });
  }
  if (url.pathname.endsWith("/runs")) {
    return respond(200, { workflow_runs: [{ id: 7, status: "completed", conclusion: "success", created_at: "2026-10-28T10:00:00Z", html_url: "https://x/7" }] });
  }
  return respond(404, {});
};

const env: Env = { GITHUB_TOKEN: "gh-token", ACCESS_TEAM_DOMAIN: TEAM, ACCESS_AUD: AUD };
const ORIGIN = "https://crust-admin.pages.dev";

async function post(path: string, body: unknown, opts: { jwt?: string | null; headers?: Record<string, string> } = {}) {
  const jwt = opts.jwt === undefined ? await token() : opts.jwt;
  return new Request(`${ORIGIN}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Crust": "1",
      Origin: ORIGIN,
      ...(jwt ? { "Cf-Access-Jwt-Assertion": jwt } : {}),
      ...opts.headers,
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}
const get = async (path: string, jwt: string | null = null) =>
  new Request(`${ORIGIN}${path}`, { headers: jwt ? { "Cf-Access-Jwt-Assertion": jwt } : {} });

const page = (over: Partial<Page> = {}): Page => ({
  path: "/about",
  title: "About us",
  description: "Who we are",
  puck: { root: { props: {} }, content: [{ type: "Heading", props: { id: "h", text: "Héllo ✨", level: "h1", align: "left" } }] },
  ...over,
});
const site = (): Site => ({ name: "Demo", baseUrl: "https://demo.pages.dev", language: "en", tokens: defaultTokens });

beforeEach(() => {
  files = new Map([["content/pages/index.json", { content: "{}", sha: "blob0" }]]);
  commits = [];
  dispatched = [];
  githubStatus = null;
  shaCounter = 0;
  head = "commit0";
  trees = new Map();
  gitCommits = new Map();
  multiCommits = [];
  raceOnUpdate = false;
  successRuns = [];
  runJobs = [];
  jobsAsked = [];
  history = [];
  filesAt = new Map();
  compareBase = null;
  compareFiles = [];
  clearAccessKeyCache();
});

describe("save-api: switched off until set up", () => {
  it("refuses with a plain message when Access or the token is missing", async () => {
    const res = await handleSave(await post("/api/save", { kind: "page", page: page() }), {}, fakeFetch);
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({
      ok: false,
      notConfigured: true,
      error: "Saving to GitHub isn't switched on yet: Cloudflare Access and the GitHub token still need setting up.",
    });
    const status = await handleStatus(await get("/api/status"), { GITHUB_TOKEN: "x" }, fakeFetch);
    expect(await status.json()).toEqual({ ok: true, configured: false, missing: ["Cloudflare Access"] });
  });
});

describe("save-api: Cloudflare Access sign-in", () => {
  it("accepts a valid token and reports who is signed in", async () => {
    const res = await handleStatus(await get("/api/status", await token()), env, fakeFetch);
    expect(await res.json()).toEqual({ ok: true, configured: true, email: "hosni@example.com" });
  });

  it.each([
    ["no token", null, "Not signed in through Cloudflare Access."],
    ["garbage", "abc", "Malformed Access token."],
  ])("refuses %s", async (_, jwt, message) => {
    const res = await handleSave(await post("/api/save", { kind: "page", page: page() }, { jwt }), env, fakeFetch);
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe(message);
    expect(commits).toEqual([]);
  });

  it("refuses expired, wrong-audience, wrong-team and forged tokens", async () => {
    const config = { teamDomain: TEAM, aud: AUD };
    await expect(verifyAccessJwt(await token({ exp: 1 }), config, fakeFetch)).rejects.toThrow(/expired/);
    await expect(verifyAccessJwt(await token({ aud: ["other"] }), config, fakeFetch)).rejects.toThrow(/different application/);
    await expect(verifyAccessJwt(await token({ iss: "https://evil.cloudflareaccess.com" }), config, fakeFetch)).rejects.toThrow(/different team/);
    await expect(verifyAccessJwt(await token({}, "k2"), config, fakeFetch)).rejects.toThrow(/unknown key/);
    const other = (await crypto.subtle.generateKey(
      { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
      true,
      ["sign", "verify"],
    )) as CryptoKeyPair;
    await expect(verifyAccessJwt(await token({}, "k1", other.privateKey), config, fakeFetch)).rejects.toThrow(/signature is invalid/);
    // A team domain written with https:// still works.
    await expect(verifyAccessJwt(await token(), { teamDomain: `https://${TEAM}/`, aud: AUD }, fakeFetch)).resolves.toEqual({ email: "hosni@example.com" });
  });
});

describe("save-api: requests from other sites", () => {
  it("needs the admin's own header and JSON", async () => {
    const res = await handleSave(await post("/api/save", { kind: "page", page: page() }, { headers: { "X-Crust": "" } }), env, fakeFetch);
    expect(res.status).toBe(400);
    const form = await handleSave(await post("/api/save", "kind=page", { headers: { "Content-Type": "text/plain" } }), env, fakeFetch);
    expect(form.status).toBe(400);
  });

  it("refuses another origin", async () => {
    const res = await handleSave(await post("/api/save", { kind: "page", page: page() }, { headers: { Origin: "https://evil.example" } }), env, fakeFetch);
    expect(res.status).toBe(403);
    expect(commits).toEqual([]);
  });
});

describe("save-api: saving", () => {
  it("commits a page to content/pages with a readable message", async () => {
    const res = await handleSave(await post("/api/save", { kind: "page", page: page() }), env, fakeFetch);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, path: "content/pages/about.json", commit: "commit1" });
    expect(commits).toEqual([
      { path: "content/pages/about.json", branch: "main", message: 'Save page /about ("About us") from the builder\n\nSaved by hosni@example.com' },
    ]);
    // UTF-8 survives the base64 round trip, formatted with a trailing newline.
    const saved = files.get("content/pages/about.json")!.content;
    expect(JSON.parse(saved)).toEqual(page());
    expect(saved.endsWith("}\n")).toBe(true);
  });

  it("updates an existing file (sends its current sha)", async () => {
    const res = await handleSave(await post("/api/save", { kind: "page", page: page({ path: "/" }) }), env, fakeFetch);
    expect(res.status).toBe(200);
    expect(commits[0]?.path).toBe("content/pages/index.json");
  });

  it("commits Site settings to content/site.json", async () => {
    const res = await handleSave(await post("/api/save", { kind: "site", site: site() }), env, fakeFetch);
    expect(res.status).toBe(200);
    expect(commits[0]).toMatchObject({ path: "content/site.json", message: expect.stringMatching(/^Save Site settings/) });
  });

  it("checks content on the server too", async () => {
    const res = await handleSave(await post("/api/save", { kind: "page", page: page({ path: "/About Us", title: "" }) }), env, fakeFetch);
    expect(res.status).toBe(422);
    expect((await res.json()).error).toBe(
      "Not saved. The page address must look like /about (lowercase letters, numbers and dashes). The page needs a title.",
    );
    const badSite = { ...site(), tokens: { ...defaultTokens, colors: { ...defaultTokens.colors, primary: "red; }" } } };
    const res2 = await handleSave(await post("/api/save", { kind: "site", site: badSite }), env, fakeFetch);
    expect((await res2.json()).error).toBe("Not saved. Primary: use a hex colour like #4338CA.");
    expect((await (await handleSave(await post("/api/save", "{nope"), env, fakeFetch)).json()).error).toBe("The data sent wasn't valid JSON.");
    expect((await handleSave(await post("/api/save", { kind: "other" }), env, fakeFetch)).status).toBe(400);
    expect(commits).toEqual([]);
  });

  it("refuses oversized pages", async () => {
    const huge = page({ description: "x".repeat(10), puck: { root: { props: {} }, content: [{ type: "Text", props: { id: "t", text: "x".repeat(600_000) } }] } });
    const res = await handleSave(await post("/api/save", { kind: "page", page: huge }), env, fakeFetch);
    expect(res.status).toBe(413);
  });

  it("explains GitHub errors in plain words", async () => {
    githubStatus = 401;
    const res = await handleSave(await post("/api/save", { kind: "page", page: page() }), env, fakeFetch);
    expect(res.status).toBe(502);
    expect((await res.json()).error).toBe("GitHub didn't accept the token. It may have expired; create a new one.");
  });
});

describe("save-api: reading pages and publishing (F007, F008)", () => {
  it("lists pages with titles and last-edited dates", async () => {
    files.set("content/pages/index.json", { content: JSON.stringify(page({ path: "/", title: "Home" })), sha: "a" });
    files.set("content/pages/about.json", { content: JSON.stringify(page()), sha: "b" });
    const res = await handlePages(await get("/api/pages", await token()), env, fakeFetch);
    expect(await res.json()).toEqual({
      ok: true,
      pages: [
        { path: "/", title: "Home", file: "content/pages/index.json", lastEdited: "2026-10-28T10:00:00Z" },
        { path: "/about", title: "About us", file: "content/pages/about.json", lastEdited: "2026-10-28T10:00:00Z" },
      ],
    });
  });

  it("reads one page", async () => {
    files.set("content/pages/about.json", { content: JSON.stringify(page()), sha: "b" });
    const res = await handlePage(await get("/api/page?path=/about", await token()), env, fakeFetch);
    expect((await res.json()).page.title).toBe("About us");
    const missing = await handlePage(await get("/api/page?path=/nope", await token()), env, fakeFetch);
    expect(missing.status).toBe(404);
    const bad = await handlePage(await get("/api/page?path=../x", await token()), env, fakeFetch);
    expect(bad.status).toBe(400);
  });

  it("starts the publish workflow and reports its runs", async () => {
    const res = await handlePublish(await post("/api/publish", {}), env, fakeFetch);
    expect(res.status).toBe(202);
    expect(dispatched).toEqual(["/repos/hystericmoon/crust/actions/workflows/publish.yml/dispatches"]);
    const runs = await handlePublish(await get("/api/publish", await token()), env, fakeFetch);
    expect((await runs.json()).runs[0]).toEqual({ id: 7, status: "completed", conclusion: "success", createdAt: "2026-10-28T10:00:00Z", url: "https://x/7" });
  });
});

describe("save-api: page addresses", () => {
  it("validates paths and maps them to files", () => {
    expect(isValidPagePath("/")).toBe(true);
    expect(isValidPagePath("/blog/first-post")).toBe(true);
    for (const bad of ["", "about", "/About", "/a b", "/../x", "/a//b", "/-x", 3]) expect(isValidPagePath(bad), String(bad)).toBe(false);
    expect(pageFileFor("/")).toBe("content/pages/index.json");
    expect(pageFileFor("/blog/first-post/")).toBe("content/pages/blog__first-post.json");
    expect(checkPage(null)).toEqual(["The page is missing."]);
  });
});

// --- F015: rename and delete pages --------------------------------------------

const pageFile = (path: string, title = "About us") => ({ content: JSON.stringify(page({ path, title })), sha: "x" });
const redirectsIn = () => JSON.parse(files.get("content/redirects.json")?.content ?? "[]");

describe("save-api: redirect rules", () => {
  it("points the old address at the new one, without chains", () => {
    expect(redirectsAfterRename([], "/about", "/about-us")).toEqual([{ from: "/about", to: "/about-us" }]);
    // /team was renamed to /about earlier; renaming /about again keeps /team pointing at the live page.
    expect(redirectsAfterRename([{ from: "/team", to: "/about" }], "/about", "/about-us")).toEqual([
      { from: "/about", to: "/about-us" },
      { from: "/team", to: "/about-us" },
    ]);
    // Renaming back to an old address: the page wins, and nothing loops.
    expect(redirectsAfterRename([{ from: "/about", to: "/about-us" }], "/about-us", "/about")).toEqual([{ from: "/about-us", to: "/about" }]);
  });

  it("drops redirects to a deleted page and ignores damaged files", () => {
    expect(redirectsAfterDelete([{ from: "/a", to: "/b" }, { from: "/c", to: "/d" }], "/b")).toEqual([{ from: "/c", to: "/d" }]);
    expect(parseRedirects("{nope")).toEqual([]);
    expect(parseRedirects(JSON.stringify([{ from: "/a", to: "/b" }, { from: "a", to: "/b" }, 3]))).toEqual([{ from: "/a", to: "/b" }]);
    expect(parseRedirects(null)).toEqual([]);
  });

  it("maps page files back to addresses", () => {
    expect(pagePathForFile("content/pages/index.json")).toBe("/");
    expect(pagePathForFile("content/pages/blog__first-post.json")).toBe("/blog/first-post");
    expect(pagePathForFile("content/site.json")).toBeNull();
    expect(pagePathForFile("content/pages/Bad Name.json")).toBeNull();
  });
});

describe("save-api: renaming a page (F015)", () => {
  it("moves the page file, sets its new address and adds a redirect, in one commit", async () => {
    files.set("content/pages/about.json", pageFile("/about"));
    const res = await handleRename(await post("/api/rename", { from: "/about", to: "/about-us" }), env, fakeFetch);
    expect(res.status).toBe(200);
    expect((await res.json()).page).toMatchObject({ path: "/about-us", title: "About us" });
    expect(files.has("content/pages/about.json")).toBe(false);
    expect(JSON.parse(files.get("content/pages/about-us.json")!.content).path).toBe("/about-us");
    expect(redirectsIn()).toEqual([{ from: "/about", to: "/about-us" }]);
    expect(multiCommits).toEqual([
      {
        message: "Rename page /about to /about-us from the builder\n\nVisitors to /about are sent to /about-us.\nRenamed by hosni@example.com",
        paths: ["content/pages/about-us.json", "content/pages/about.json", "content/redirects.json"],
      },
    ]);
  });

  it("refuses the Home page, taken addresses, missing pages and bad input", async () => {
    files.set("content/pages/about.json", pageFile("/about"));
    files.set("content/pages/contact.json", pageFile("/contact"));
    const cases: [unknown, number, string][] = [
      [{ from: "/", to: "/home" }, 400, "The Home page always lives at /, so it can't be renamed."],
      [{ from: "/about", to: "/" }, 400, "The Home page always lives at /, so it can't be renamed."],
      [{ from: "/about", to: "/contact" }, 409, "There's already a page at /contact."],
      [{ from: "/nope", to: "/new" }, 404, "There's no page at /nope on GitHub."],
      [{ from: "/about", to: "/about" }, 400, "That's already this page's address."],
      [{ from: "/about", to: "About Us" }, 400, "The page address must look like /about (lowercase letters, numbers and dashes)."],
    ];
    for (const [body, status, error] of cases) {
      const res = await handleRename(await post("/api/rename", body), env, fakeFetch);
      expect([res.status, (await res.json()).error]).toEqual([status, error]);
    }
    expect(multiCommits).toEqual([]);
  });

  it("says so when someone else saved at the same moment", async () => {
    files.set("content/pages/about.json", pageFile("/about"));
    raceOnUpdate = true;
    const res = await handleRename(await post("/api/rename", { from: "/about", to: "/team" }), env, fakeFetch);
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe("Someone else changed this file at the same moment. Reload and save again.");
    expect(files.has("content/pages/about.json")).toBe(true);
  });

  it("is behind the same sign-in and cross-site checks as saving", async () => {
    files.set("content/pages/about.json", pageFile("/about"));
    expect((await handleRename(await post("/api/rename", { from: "/about", to: "/x" }, { jwt: null }), env, fakeFetch)).status).toBe(401);
    expect((await handleRename(await post("/api/rename", { from: "/about", to: "/x" }, { headers: { Origin: "https://evil.example" } }), env, fakeFetch)).status).toBe(403);
    expect((await handleDelete(await post("/api/delete", { path: "/about" }, { headers: { "X-Crust": "" } }), env, fakeFetch)).status).toBe(400);
    expect((await handleRename(await post("/api/rename", { from: "/about", to: "/x" }), {}, fakeFetch)).status).toBe(503);
    expect(files.has("content/pages/about.json")).toBe(true);
  });
});

describe("save-api: deleting a page (F015)", () => {
  it("removes the page file and any redirects to it", async () => {
    files.set("content/pages/about.json", pageFile("/about"));
    files.set("content/redirects.json", { content: JSON.stringify([{ from: "/team", to: "/about" }, { from: "/old", to: "/" }]), sha: "r" });
    const res = await handleDelete(await post("/api/delete", { path: "/about" }), env, fakeFetch);
    expect(res.status).toBe(200);
    expect(files.has("content/pages/about.json")).toBe(false);
    expect(redirectsIn()).toEqual([{ from: "/old", to: "/" }]);
    expect(multiCommits[0]!.message).toBe("Delete page /about from the builder\n\nDeleted by hosni@example.com");
  });

  it("leaves redirects.json alone when nothing pointed to the page", async () => {
    files.set("content/pages/about.json", pageFile("/about"));
    await handleDelete(await post("/api/delete", { path: "/about" }), env, fakeFetch);
    expect(multiCommits[0]!.paths).toEqual(["content/pages/about.json"]);
    expect(files.has("content/redirects.json")).toBe(false);
  });

  it("refuses the Home page and missing pages", async () => {
    const home = await handleDelete(await post("/api/delete", { path: "/" }), env, fakeFetch);
    expect((await home.json()).error).toBe("The Home page can't be deleted. Every site needs one.");
    const missing = await handleDelete(await post("/api/delete", { path: "/nope" }), env, fakeFetch);
    expect(missing.status).toBe(404);
    expect(files.has("content/pages/index.json")).toBe(true);
  });
});

// --- F016: what the next publish changes --------------------------------------

describe("save-api: changes since the last publish (F016)", () => {
  it("compares the branch with the commit that last went live", async () => {
    files.set("content/redirects.json", { content: JSON.stringify([{ from: "/people", to: "/team" }, { from: "/x", to: "/" }]), sha: "r" });
    successRuns = [{ head_sha: "live123", created_at: "2026-10-28T09:00:00Z", html_url: "https://x/run/5" }];
    compareFiles = [
      { filename: "content/pages/about.json", status: "modified" },
      { filename: "content/pages/blog__first-post.json", status: "added" },
      { filename: "content/pages/old.json", status: "removed" },
      { filename: "content/pages/team.json", status: "renamed", previous_filename: "content/pages/people.json" },
      { filename: "content/site.json", status: "modified" },
      { filename: "content/redirects.json", status: "added" },
      { filename: "apps/admin/src/App.tsx", status: "modified" },
    ];
    const res = await handleChanges(await get("/api/changes", await token()), env, fakeFetch);
    expect(compareBase).toBe("live123...main");
    expect(await res.json()).toEqual({
      ok: true,
      lastPublish: { at: "2026-10-28T09:00:00Z", url: "https://x/run/5" },
      pages: [
        { path: "/about", change: "edited" },
        { path: "/blog/first-post", change: "new" },
        { path: "/team", change: "new" },
      ],
      removed: ["/old"],
      moved: [{ from: "/people", to: "/team" }],
      site: true,
      redirects: true,
    });
  });

  it("reports nothing waiting when the branch matches what's live", async () => {
    successRuns = [{ head_sha: "live123", created_at: "2026-10-28T09:00:00Z", html_url: "https://x/run/5" }];
    const res = await handleChanges(await get("/api/changes", await token()), env, fakeFetch);
    expect(await res.json()).toMatchObject({ pages: [], removed: [], site: false, redirects: false });
  });

  it("treats every page as new before the first publish", async () => {
    files.set("content/pages/about.json", pageFile("/about"));
    const res = await handleChanges(await get("/api/changes", await token()), env, fakeFetch);
    expect(await res.json()).toEqual({
      ok: true,
      lastPublish: null,
      pages: [
        { path: "/", change: "new" },
        { path: "/about", change: "new" },
      ],
      removed: [],
      moved: [],
      site: true,
      redirects: false,
    });
    expect(compareBase).toBeNull();
  });

  it("needs a sign-in", async () => {
    const res = await handleChanges(await get("/api/changes"), env, fakeFetch);
    expect(res.status).toBe(401);
  });
});

// --- F017: where the site is live -----------------------------------------------

describe("save-api: live address (F017)", () => {
  const steps = (...names: [string, string | null][]) => [{ steps: names.map(([name, conclusion]) => ({ name, conclusion })) }];

  it("reads it from the last successful publish's \"Live at\" step", async () => {
    successRuns = [{ id: 42, head_sha: "s", created_at: "2026-10-28T09:00:00Z", html_url: "https://x/run/42" }];
    runJobs = steps(["Deploy to Cloudflare Pages", "success"], ["Live at https://crust-site-3x9.pages.dev", "success"]);
    const res = await handlePublish(await get("/api/publish", await token()), env, fakeFetch);
    expect((await res.json()).liveUrl).toBe("https://crust-site-3x9.pages.dev");
    expect(jobsAsked).toEqual(["/repos/hystericmoon/crust/actions/runs/42/jobs"]);
  });

  it("is null before the first publish, or when the step is missing, skipped or odd", async () => {
    let res = await handlePublish(await get("/api/publish", await token()), env, fakeFetch);
    expect((await res.json()).liveUrl).toBeNull();
    expect(jobsAsked).toEqual([]);

    successRuns = [{ id: 42, head_sha: "s", created_at: "2026-10-28T09:00:00Z", html_url: "https://x/run/42" }];
    for (const jobs of [
      steps(["Deploy to Cloudflare Pages", "success"]),
      steps(["Live at https://crust-site.pages.dev", "skipped"]),
      steps(["Live at javascript:alert(1)", "success"]),
      steps(["Live at http://crust-site.pages.dev", "success"]),
      steps(["Live at https://a.dev <script>", "success"]),
    ]) {
      runJobs = jobs;
      res = await handlePublish(await get("/api/publish", await token()), env, fakeFetch);
      expect((await res.json()).liveUrl).toBeNull();
    }
  });
});

// --- F018: links to a renamed page --------------------------------------------

describe("save-api: links to a renamed page (F018)", () => {
  const linking = (path: string, title: string, hrefs: string[]) => ({
    content: JSON.stringify(
      page({
        path,
        title,
        puck: {
          root: { props: {} },
          content: hrefs.map((href, i) => ({ type: "Button", props: { id: `b${i}`, label: "Go", href, variant: "primary" } })),
        },
      }),
    ),
    sha: "x",
  });

  it("lists the pages that link to a page", async () => {
    files.set("content/pages/about.json", pageFile("/about"));
    files.set("content/pages/index.json", linking("/", "Home", ["/about", "/about#team", "/contact"]));
    files.set("content/pages/contact.json", linking("/contact", "Contact", ["/"]));
    const res = await handleLinks(await get("/api/links?path=/about", await token()), env, fakeFetch);
    expect(await res.json()).toEqual({ ok: true, pages: [{ path: "/", title: "Home", count: 2 }] });
    expect((await handleLinks(await get("/api/links?path=nope", await token()), env, fakeFetch)).status).toBe(400);
    expect((await handleLinks(await get("/api/links?path=/about"), env, fakeFetch)).status).toBe(401);
  });

  it("updates them in the same commit as the rename", async () => {
    files.set("content/pages/about.json", linking("/about", "About us", ["/about#top"]));
    files.set("content/pages/index.json", linking("/", "Home", ["/about", "/contact"]));
    files.set("content/pages/contact.json", linking("/contact", "Contact", ["/"]));
    const res = await handleRename(await post("/api/rename", { from: "/about", to: "/team" }), env, fakeFetch);
    const body = await res.json();
    expect(body.relinked).toEqual([
      { path: "/team", title: "About us", count: 1 },
      { path: "/", title: "Home", count: 1 },
    ]);
    const hrefs = (file: string) => JSON.parse(files.get(file)!.content).puck.content.map((b: { props: { href: string } }) => b.props.href);
    expect(hrefs("content/pages/index.json")).toEqual(["/team", "/contact"]);
    expect(hrefs("content/pages/team.json")).toEqual(["/team#top"]);
    expect(multiCommits).toHaveLength(1);
    expect(multiCommits[0]!.paths).toEqual(["content/pages/team.json", "content/pages/about.json", "content/redirects.json", "content/pages/index.json"]);
    expect(multiCommits[0]!.message).toContain("Updated 2 links to the new address.");
    // Pages without links to it are left alone.
    expect(multiCommits[0]!.paths).not.toContain("content/pages/contact.json");
  });
});

// --- F019: restore deleted pages ------------------------------------------------

describe("save-api: restoring deleted pages (F019)", () => {
  const commit = (sha: string, message: string, date = "2026-10-29T10:00:00Z") => ({
    sha,
    parents: [{ sha: `${sha}-parent` }],
    commit: { message, committer: { date } },
  });
  const before = (sha: string, path: string, title: string) =>
    filesAt.set(`${sha}-parent`, new Map([[pageFileFor(path), JSON.stringify(page({ path, title }))]]));

  beforeEach(() => {
    history = [
      commit("aaa1111", "Delete page /about from the builder\n\nDeleted by h@x.id", "2026-10-29T12:00:00Z"),
      commit("bbb2222", "Save page /contact (\"Contact\") from the builder"),
      commit("ccc3333", "Delete page /contact from the builder"),
      commit("ddd4444", "Delete page /about from the builder", "2026-10-29T08:00:00Z"),
      commit("eee5555", "Rename page /team to /people from the builder"),
    ];
    before("aaa1111", "/about", "About us");
    before("ccc3333", "/contact", "Contact");
    before("ddd4444", "/about", "Old about");
    files.set("content/pages/contact.json", pageFile("/contact", "Contact"));
  });

  it("lists the latest deletion of each address that has no page now", async () => {
    const res = await handleDeleted(await get("/api/deleted", await token()), env, fakeFetch);
    expect(await res.json()).toEqual({ ok: true, pages: [{ path: "/about", title: "About us", deletedAt: "2026-10-29T12:00:00Z", commit: "aaa1111" }] });
  });

  it("brings the page back as it was before the deletion", async () => {
    const res = await handleRestore(await post("/api/restore", { path: "/about", commit: "aaa1111" }), env, fakeFetch);
    expect(res.status).toBe(200);
    expect(JSON.parse(files.get("content/pages/about.json")!.content).title).toBe("About us");
    expect(multiCommits[0]!.message).toBe('Restore page /about ("About us") from the builder\n\nRestored by hosni@example.com');
    const list = await handleDeleted(await get("/api/deleted", await token()), env, fakeFetch);
    expect((await list.json()).pages).toEqual([]);
  });

  it("refuses anything that isn't a builder deletion of that page, or a taken address", async () => {
    const cases: [unknown, number][] = [
      [{ path: "/about", commit: "bbb2222" }, 404],
      [{ path: "/team", commit: "aaa1111" }, 404],
      [{ path: "/about", commit: "fff9999" }, 404],
      [{ path: "/contact", commit: "ccc3333" }, 409],
      [{ path: "/about", commit: "not a sha" }, 400],
    ];
    for (const [body, status] of cases) {
      expect((await handleRestore(await post("/api/restore", body), env, fakeFetch)).status, JSON.stringify(body)).toBe(status);
    }
    expect(multiCommits).toEqual([]);
    expect((await handleRestore(await post("/api/restore", { path: "/about", commit: "aaa1111" }, { jwt: null }), env, fakeFetch)).status).toBe(401);
  });
});

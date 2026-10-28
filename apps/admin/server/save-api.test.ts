import { defaultTokens, type Page, type Site } from "@crust/blocks";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { clearAccessKeyCache, verifyAccessJwt } from "./access";
import { handlePage, handlePages, handlePublish, handleSave, handleStatus, type Env } from "./api";
import { checkPage, isValidPagePath, pageFileFor } from "./content";
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
    const f = files.get(path);
    return f ? respond(200, { sha: f.sha, content: toBase64(f.content) }) : respond(404, {});
  }
  if (url.pathname === "/repos/hystericmoon/crust/commits") return respond(200, [{ commit: { committer: { date: "2026-10-28T10:00:00Z" } } }]);
  if (url.pathname.endsWith("/dispatches")) {
    dispatched.push(url.pathname);
    return new Response(null, { status: 204 });
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

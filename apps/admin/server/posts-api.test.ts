import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Env } from "./api";
import { handlePosts } from "./posts";
import { handleSave } from "./api";
import { newPost } from "@crust/blocks/posts";
import { toBase64 } from "./github";

// Sign-in is covered by save-api.test.ts; here everyone is signed in.
vi.mock("./access", async (orig) => ({
  ...(await orig<typeof import("./access")>()),
  verifyAccessJwt: async () => ({ email: "hosni@example.com" }),
}));

// --- A small in-memory GitHub: contents API reads, Git data API commits ---------

/** Text files as strings, photos as base64 (prefixed "b64:"). */
let files: Map<string, string>;
let commits: { message: string; paths: string[] }[];
let blobs: Map<string, string>;
let trees: Map<string, { path: string; content?: string; sha?: string | null }[]>;
let pending: Map<string, { message: string; tree: string }>;

const respond = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });

const fakeFetch: typeof fetch = async (input, init) => {
  const url = new URL(String(input));
  const method = init?.method ?? "GET";
  const accept = new Headers(init?.headers).get("Accept") ?? "";
  const contents = url.pathname.match(/^\/repos\/hystericmoon\/crust\/contents\/(.+)$/);
  if (contents) {
    const path = decodeURIComponent(contents[1]!);
    if (path === "content/pages" || path === "content/posts") {
      const list = [...files.keys()].filter((p) => p.startsWith(`${path}/`));
      return respond(200, list.map((p) => ({ type: "file", name: p.split("/").pop(), path: p, sha: "s" })));
    }
    const stored = files.get(path);
    if (stored === undefined) return respond(404, {});
    if (accept.includes("raw")) {
      const bin = atob(stored.slice(4));
      return new Response(Uint8Array.from(bin, (c) => c.charCodeAt(0)), { status: 200 });
    }
    return respond(200, { sha: "s", content: toBase64(stored) });
  }
  const git = url.pathname.match(/^\/repos\/hystericmoon\/crust\/git\/([a-z]+)\/?(.*)$/);
  if (!git) return respond(404, {});
  const [, what, rest] = git;
  const body = init?.body ? JSON.parse(String(init.body)) : null;
  if (what === "ref") return respond(200, { object: { sha: "c1" } });
  if (what === "commits" && method === "GET") return respond(200, { tree: { sha: `t-${rest}` } });
  if (what === "blobs") {
    expect(body.encoding).toBe("base64");
    const sha = `blob${blobs.size}`;
    blobs.set(sha, body.content);
    return respond(201, { sha });
  }
  if (what === "trees") {
    const sha = `tree${trees.size}`;
    trees.set(sha, body.tree);
    return respond(201, { sha });
  }
  if (what === "commits") {
    const sha = `new${pending.size}`;
    pending.set(sha, body);
    return respond(201, { sha, html_url: `https://github.com/c/${sha}` });
  }
  if (what === "refs" && method === "PATCH") {
    const commit = pending.get(body.sha)!;
    const entries = trees.get(commit.tree)!;
    for (const e of entries) {
      if (e.sha === null) files.delete(e.path);
      else if (e.sha) files.set(e.path, `b64:${blobs.get(e.sha)}`);
      else files.set(e.path, e.content!);
    }
    commits.push({ message: commit.message, paths: entries.map((e) => e.path) });
    return respond(200, {});
  }
  return respond(404, {});
};

const env: Env = { GITHUB_TOKEN: "gh-token", ACCESS_TEAM_DOMAIN: "team.cloudflareaccess.com", ACCESS_AUD: "aud" };
const ORIGIN = "https://crust-admin.pages.dev";
const headers = { "Content-Type": "application/json", "X-Crust": "1", Origin: ORIGIN, "Cf-Access-Jwt-Assertion": "jwt" };
const post = (body: unknown) => handlePosts(new Request(`${ORIGIN}/api/posts`, { method: "POST", headers, body: JSON.stringify(body) }), env, fakeFetch);
const get = (query = "") => handlePosts(new Request(`${ORIGIN}/api/posts${query}`, { headers: { "Cf-Access-Jwt-Assertion": "jwt" } }), env, fakeFetch);

beforeEach(() => {
  files = new Map();
  commits = [];
  blobs = new Map();
  trees = new Map();
  pending = new Map();
});

describe("posts API (F035)", () => {
  it("saves a post as content/posts/<slug>.json, with only the known fields", async () => {
    const p = { ...newPost(" Opening day ", "opening-day", "2026-10-01"), extra: "dropped" };
    const res = await post({ action: "save", post: p });
    expect(res.status).toBe(200);
    expect(commits[0]!.paths).toEqual(["content/posts/opening-day.json"]);
    expect(commits[0]!.message).toContain('Save post "Opening day"');
    const saved = JSON.parse(files.get("content/posts/opening-day.json")!);
    expect(Object.keys(saved)).toEqual(["slug", "title", "description", "date", "cover", "coverAlt", "puck"]);
    expect(saved.title).toBe("Opening day");
  });

  it("refuses a post with problems, listing them", async () => {
    const res = await post({ action: "save", post: { ...newPost("", "x", "2026-02-30"), cover: "/media/a.jpg" } });
    expect(res.status).toBe(422);
    const { error } = await res.json();
    expect(error).toContain("The post needs a title.");
    expect(error).toContain("The post date must be a real date.");
    expect(error).toContain("The cover photo needs alt text.");
    expect(commits).toHaveLength(0);
  });

  it("lists posts newest first without their blocks, with the blog settings", async () => {
    await post({ action: "save", post: newPost("Old", "old", "2026-01-01") });
    await post({ action: "save", post: newPost("New", "new", "2026-10-30") });
    files.set("content/posts/broken.json", "{");
    files.set("content/blog.json", JSON.stringify({ title: "News", intro: "" }));
    const body = await (await get()).json();
    expect(body.posts.map((p: { slug: string }) => p.slug)).toEqual(["new", "old"]);
    expect(body.posts[0].puck).toBeUndefined();
    expect(body.blog).toEqual({ title: "News", intro: "" });
    const one = await (await get("?slug=old")).json();
    expect(one.post.puck.content).toHaveLength(1);
    expect((await get("?slug=missing")).status).toBe(404);
    expect((await get("?slug=../site")).status).toBe(400);
  });

  it("deletes a post", async () => {
    await post({ action: "save", post: newPost("Old", "old", "2026-01-01") });
    expect((await post({ action: "delete", slug: "old" })).status).toBe(200);
    expect(files.has("content/posts/old.json")).toBe(false);
    expect((await post({ action: "delete", slug: "old" })).status).toBe(404);
  });

  it("saves the blog page's title and intro", async () => {
    expect((await post({ action: "blog", blog: { title: " News ", intro: "Hi" } })).status).toBe(200);
    expect(JSON.parse(files.get("content/blog.json")!)).toEqual({ title: "News", intro: "Hi" });
    expect((await post({ action: "blog", blog: { title: "", intro: "" } })).status).toBe(422);
  });

  it("keeps pages away from /blog", async () => {
    const page = { path: "/blog", title: "Blog", description: "", puck: { root: { props: {} }, content: [] } };
    const res = await handleSave(new Request(`${ORIGIN}/api/save`, { method: "POST", headers, body: JSON.stringify({ kind: "page", page }) }), env, fakeFetch);
    expect(res.status).toBe(422);
    expect((await res.json()).error).toContain("where your posts are published");
  });
});

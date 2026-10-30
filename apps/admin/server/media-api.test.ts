import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Env } from "./api";
import { handleMedia, handleMediaFile } from "./media";
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
    if (path === "content/pages") {
      const list = [...files.keys()].filter((p) => p.startsWith("content/pages/"));
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
const post = (body: unknown) => handleMedia(new Request(`${ORIGIN}/api/media`, { method: "POST", headers, body: JSON.stringify(body) }), env, fakeFetch);
const list = () => handleMedia(new Request(`${ORIGIN}/api/media`, { headers: { "Cf-Access-Jwt-Assertion": "jwt" } }), env, fakeFetch);

/** A real 3×2 PNG header (enough for sniffing). */
function png(width: number, height: number): Uint8Array {
  const b = new Uint8Array(33);
  b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
  new DataView(b.buffer).setUint32(16, width);
  new DataView(b.buffer).setUint32(20, height);
  return b;
}
const b64 = (bytes: Uint8Array) => Buffer.from(bytes).toString("base64");
const index = () => JSON.parse(files.get("content/media.json") ?? "[]") as { file: string; alt: string; width: number }[];
const page = (path: string, title: string, src: string) =>
  JSON.stringify({ path, title, description: "", puck: { root: { props: {} }, content: [{ type: "Image", props: { id: "i", src, alt: "x", caption: "" } }] } });

beforeEach(() => {
  files = new Map();
  commits = [];
  blobs = new Map();
  trees = new Map();
  pending = new Map();
});

describe("media library API (F034)", () => {
  it("uploads a photo and its details in one commit, reading the size from the file", async () => {
    const res = await post({ action: "upload", name: "Harbour at Dawn.PNG", data: b64(png(1600, 900)), alt: " Boats at dawn " });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.item).toMatchObject({ file: "harbour-at-dawn.png", alt: "Boats at dawn", width: 1600, height: 900, bytes: 33 });
    expect(commits).toHaveLength(1);
    expect(commits[0]!.paths).toEqual(["content/media/harbour-at-dawn.png", "content/media.json"]);
    expect(commits[0]!.message).toContain("Uploaded by hosni@example.com");
    expect(index()).toHaveLength(1);
    expect(files.get("content/media/harbour-at-dawn.png")).toBe(`b64:${b64(png(1600, 900))}`);
  });

  it("never overwrites a photo with the same name", async () => {
    await post({ action: "upload", name: "a.png", data: b64(png(10, 10)), alt: "" });
    const res = await post({ action: "upload", name: "a.png", data: b64(png(20, 20)), alt: "" });
    expect((await res.json()).item.file).toBe("a-2.png");
    expect(index().map((i) => i.file)).toEqual(["a.png", "a-2.png"]);
  });

  it("refuses files that aren't JPG, PNG or WebP, whatever their name says", async () => {
    const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
    const res = await post({ action: "upload", name: "logo.png", data: b64(svg), alt: "" });
    expect(res.status).toBe(415);
    expect((await res.json()).error).toMatch(/Only JPG, PNG and WebP/);
    expect(commits).toHaveLength(0);
  });

  it("refuses photos that are too large and overly long alt text", async () => {
    const big = new Uint8Array(9 * 1024 * 1024);
    big.set(png(10, 10));
    expect((await post({ action: "upload", name: "big.png", data: b64(big), alt: "" })).status).toBe(413);
    expect((await post({ action: "upload", name: "a.png", data: b64(png(1, 1)), alt: "x".repeat(251) })).status).toBe(422);
    expect(commits).toHaveLength(0);
  });

  it("lists photos newest first, with the pages and header that use them", async () => {
    files.set("content/media.json", JSON.stringify([
      { file: "old.jpg", alt: "Old", width: 800, height: 600, bytes: 1, uploadedAt: "2026-10-01T00:00:00Z" },
      { file: "new.jpg", alt: "", width: 800, height: 600, bytes: 1, uploadedAt: "2026-10-30T00:00:00Z" },
    ]));
    files.set("content/pages/index.json", page("/", "Home", "/media/old.jpg"));
    files.set("content/pages/about.json", page("/about", "About", "/media/old.jpg"));
    files.set("content/site.json", JSON.stringify({ header: { logo: { imageSrc: "/media/new.jpg" } } }));
    const body = await (await list()).json();
    expect(body.items.map((i: { file: string }) => i.file)).toEqual(["new.jpg", "old.jpg"]);
    expect(body.usage["old.jpg"]).toEqual([{ path: "/", title: "Home" }, { path: "/about", title: "About" }]);
    expect(body.usage["new.jpg"]).toEqual([{ path: "site", title: "Site header" }]);
  });

  it("saves a photo's alt text", async () => {
    await post({ action: "upload", name: "a.png", data: b64(png(10, 10)), alt: "" });
    const res = await post({ action: "alt", file: "a.png", alt: "A red door" });
    expect((await res.json()).item.alt).toBe("A red door");
    expect(index()[0]!.alt).toBe("A red door");
    expect((await post({ action: "alt", file: "missing.png", alt: "x" })).status).toBe(404);
    expect((await post({ action: "alt", file: "../site.json", alt: "x" })).status).toBe(400);
  });

  it("deletes an unused photo, and refuses while a page still uses it", async () => {
    await post({ action: "upload", name: "a.png", data: b64(png(10, 10)), alt: "" });
    files.set("content/pages/index.json", page("/", "Home", "/media/a.png"));
    const refused = await post({ action: "delete", file: "a.png" });
    expect(refused.status).toBe(409);
    expect((await refused.json()).error).toMatch(/still used on Home/);

    files.delete("content/pages/index.json");
    expect((await post({ action: "delete", file: "a.png" })).status).toBe(200);
    expect(files.has("content/media/a.png")).toBe(false);
    expect(index()).toEqual([]);
  });

  it("serves a photo to the builder at its public address", async () => {
    await post({ action: "upload", name: "a.png", data: b64(png(10, 10)), alt: "" });
    const res = await handleMediaFile(new Request(`${ORIGIN}/media/a.png`, { headers: { "Cf-Access-Jwt-Assertion": "jwt" } }), env, "a.png", fakeFetch);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/png");
    expect(res.headers.get("Cache-Control")).toMatch(/^private/);
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(png(10, 10));
    const bad = await handleMediaFile(new Request(`${ORIGIN}/media/x`, { headers: { "Cf-Access-Jwt-Assertion": "jwt" } }), env, "../site.json", fakeFetch);
    expect(bad.status).toBe(404);
  });

  it("needs the admin's own requests to change anything", async () => {
    const res = await handleMedia(new Request(`${ORIGIN}/api/media`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }), env, fakeFetch);
    expect(res.status).toBe(400);
  });
});

describe("upload size", () => {
  it("counts base64 bytes without decoding, and refuses text that isn't base64", async () => {
    const { base64Size } = await import("./media");
    expect(base64Size(Buffer.from("abcd").toString("base64"))).toBe(4);
    expect(base64Size(Buffer.from("abcde").toString("base64"))).toBe(5);
    expect(base64Size("not base64!")).toBeNull();
    expect((await post({ action: "upload", name: "a.png", data: "%%%%", alt: "" })).status).toBe(400);
  });
});

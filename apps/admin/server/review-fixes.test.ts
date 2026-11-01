// F069 fix 8: renaming a page also updates the header menu, footer links and blog posts (F018).
import { beforeEach, describe, expect, it, vi } from "vitest";
import { handleLinks, handleRename, type Env } from "./api";
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
    if (path === "content/pages" || path === "content/posts" || path === "content/sections") {
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
const pageWith = (path: string, title: string, content: unknown[]) => JSON.stringify({ path, title, description: "", puck: { root: { props: {} }, content } });
const button = (href: string) => ({ type: "Button", props: { id: `b-${href}`, label: "Go", href } });
const site = {
  name: "Bakery",
  baseUrl: "https://example.pages.dev",
  language: "en",
  tokens: {},
  header: { menu: [{ label: "Home", href: "/" }, { label: "Menu", href: "/menu" }], cta: { label: "Order", href: "/menu#order" }, sticky: false, extra: "kept" },
  footer: { columns: [{ title: "Visit", links: [{ label: "Our menu", href: "/menu/" }, { label: "Shop", href: "https://shop.example" }] }], copyright: "© {year}" },
};
const postFile = (slug: string, href: string) =>
  JSON.stringify({ slug, title: "Opening day", description: "", date: "2026-10-30", cover: "", coverAlt: "", puck: { root: { props: {} }, content: [{ type: "Section", props: { id: "s", background: "background", content: [button(href)] } }] } });

beforeEach(() => {
  files = new Map();
  commits = [];
  blobs = new Map();
  trees = new Map();
  pending = new Map();
  files.set("content/site.json", JSON.stringify(site));
  files.set("content/pages/index.json", pageWith("/", "Home", [button("/menu")]));
  files.set("content/pages/menu.json", pageWith("/menu", "Menu", []));
  files.set("content/posts/opening-day.json", postFile("opening-day", "/menu?x=1"));
  files.set("content/posts/other.json", postFile("other", "/contact"));
});

describe("review-fixes 8: rename updates header, footer and post links (F018)", () => {
  it("updates them in the same commit and reports each place", async () => {
    const res = await handleRename(new Request(`${ORIGIN}/api/rename`, { method: "POST", headers, body: JSON.stringify({ from: "/menu", to: "/food" }) }), env, fakeFetch);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(commits).toHaveLength(1);
    expect(commits[0]!.paths).toEqual(expect.arrayContaining(["content/site.json", "content/posts/opening-day.json", "content/pages/index.json"]));
    expect(commits[0]!.paths).not.toContain("content/posts/other.json");
    expect(commits[0]!.message).toContain("Updated 5 links to the new address.");
    const saved = JSON.parse(files.get("content/site.json")!);
    expect(saved.header.menu[1]).toEqual({ label: "Menu", href: "/food" });
    expect(saved.header.cta.href).toBe("/food#order");
    expect(saved.header.extra).toBe("kept");
    expect(saved.footer.columns[0].links).toEqual([{ label: "Our menu", href: "/food/" }, { label: "Shop", href: "https://shop.example" }]);
    expect(saved.footer.copyright).toBe("© {year}");
    expect(JSON.parse(files.get("content/posts/opening-day.json")!).puck.content[0].props.content[0].props.href).toBe("/food?x=1");
    expect(body.relinked).toEqual([
      { path: "/", title: "Home", count: 1 },
      { path: "content/site.json", title: "Site header and footer", count: 3 },
      { path: "/blog/opening-day", title: "Opening day", count: 1 },
    ]);
  });

  it("leaves site.json alone when nothing in it links to the page", async () => {
    files.set("content/site.json", JSON.stringify({ ...site, header: { menu: [] }, footer: { columns: [] } }));
    const before = files.get("content/site.json");
    await handleRename(new Request(`${ORIGIN}/api/rename`, { method: "POST", headers, body: JSON.stringify({ from: "/menu", to: "/food" }) }), env, fakeFetch);
    expect(commits[0]!.paths).not.toContain("content/site.json");
    expect(files.get("content/site.json")).toBe(before);
  });

  it("the rename dialog lists the header, footer and posts too", async () => {
    const res = await handleLinks(new Request(`${ORIGIN}/api/links?path=/menu`, { headers: { "Cf-Access-Jwt-Assertion": "jwt" } }), env, fakeFetch);
    expect((await res.json()).pages).toEqual([
      { path: "content/site.json", title: "Site header and footer", count: 3 },
      { path: "/", title: "Home", count: 1 },
      { path: "/blog/opening-day", title: "Opening day", count: 1 },
    ]);
  });
});

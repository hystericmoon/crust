import { beforeEach, describe, expect, it, vi } from "vitest";
import { linkedBlock } from "@crust/blocks";
import { handleRename, type Env } from "./api";
import { toBase64 } from "./github";
import { handleSections } from "./sections";

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
const post = (body: unknown) => handleSections(new Request(`${ORIGIN}/api/sections`, { method: "POST", headers, body: JSON.stringify(body) }), env, fakeFetch);
const get = () => handleSections(new Request(`${ORIGIN}/api/sections`, { headers: { "Cf-Access-Jwt-Assertion": "jwt" } }), env, fakeFetch);

const section = (heading = "Questions? Call us.", level = "h1") => [
  { type: "Section", props: { id: "s1", background: "dark", content: [{ type: "Heading", props: { id: "h", text: heading, level, align: "left" } }, { type: "Button", props: { id: "b", label: "Our menu", href: "/menu" } }] } },
];
const pageWith = (path: string, title: string, content: unknown[]) => JSON.stringify({ path, title, description: "", puck: { root: { props: {} }, content } });

beforeEach(() => {
  files = new Map();
  commits = [];
  blobs = new Map();
  trees = new Map();
  pending = new Map();
});

describe("linked-sections API (F043)", () => {
  it("makes a linked section from a section, with a readable id and no h1", async () => {
    const res = await post({ action: "create", name: " Contact strip ", content: section() });
    expect(res.status).toBe(200);
    const { section: made } = await res.json();
    expect(made.id).toBe("contact-strip");
    expect(commits[0]).toEqual({ message: 'Make linked section "Contact strip" from the builder\n\nMade by hosni@example.com', paths: ["content/sections/contact-strip.json"] });
    const saved = JSON.parse(files.get("content/sections/contact-strip.json")!);
    expect(saved.content[0].props.content[0].props.level).toBe("h2");
    // A second one with the same name gets its own file.
    expect((await (await post({ action: "create", name: "Contact strip", content: section() })).json()).section.id).toBe("contact-strip-2");
  });

  it("refuses damaged content, links inside links, and unsafe links in text", async () => {
    expect((await post({ action: "create", name: "", content: section() })).status).toBe(422);
    expect((await post({ action: "create", name: "X", content: [] })).status).toBe(422);
    expect((await post({ action: "create", name: "X", content: [linkedBlock("other")] })).status).toBe(422);
    const bad = [{ type: "Text", props: { id: "t", text: { rich: 1, blocks: [{ type: "p", children: [{ text: "x", href: "javascript:x" }] }] } } }];
    expect((await (await post({ action: "create", name: "X", content: bad })).json()).error).toMatch(/A link in a Text block can't be used/);
    expect(commits).toEqual([]);
  });

  it("lists sections with the pages that use them, and saves an edit for all of them", async () => {
    await post({ action: "create", name: "Contact strip", content: section() });
    files.set("content/pages/index.json", pageWith("/", "Home", [linkedBlock("contact-strip")]));
    files.set("content/pages/about.json", pageWith("/about", "About", [linkedBlock("contact-strip")]));
    files.set("content/pages/menu.json", pageWith("/menu", "Menu", []));
    const list = await (await get()).json();
    expect(list.sections.map((s: { id: string }) => s.id)).toEqual(["contact-strip"]);
    expect(list.usage["contact-strip"]).toEqual([
      { path: "/", title: "Home" },
      { path: "/about", title: "About" },
    ]);
    const res = await post({ action: "update", id: "contact-strip", content: section("Write to us instead.") });
    expect((await res.json()).usedOn).toHaveLength(2);
    expect(commits.at(-1)!.message).toContain("Shown on 2 pages.");
    expect(files.get("content/sections/contact-strip.json")).toContain("Write to us instead.");
  });

  it("won't delete a section that a page still uses, and names the page", async () => {
    await post({ action: "create", name: "Contact strip", content: section() });
    files.set("content/pages/about.json", pageWith("/about", "About", [linkedBlock("contact-strip")]));
    const res = await post({ action: "delete", id: "contact-strip" });
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe("“Contact strip” is still on a page: About (/about). Unlink or remove it there first.");
    files.delete("content/pages/about.json");
    expect((await post({ action: "delete", id: "contact-strip" })).status).toBe(200);
    expect(files.has("content/sections/contact-strip.json")).toBe(false);
  });

  it("renames, and refuses ids that aren't one of yours", async () => {
    await post({ action: "create", name: "Contact strip", content: section() });
    expect((await (await post({ action: "rename", id: "contact-strip", name: "Call us" })).json()).section.name).toBe("Call us");
    expect((await post({ action: "rename", id: "../etc", name: "x" })).status).toBe(400);
    expect((await post({ action: "update", id: "missing", content: section() })).status).toBe(404);
  });

  it("renaming a page updates links inside linked sections, in the same commit", async () => {
    await post({ action: "create", name: "Contact strip", content: section() });
    files.set("content/pages/menu.json", pageWith("/menu", "Menu", []));
    const req = new Request(`${ORIGIN}/api/rename`, { method: "POST", headers, body: JSON.stringify({ from: "/menu", to: "/food" }) });
    const res = await handleRename(req, env, fakeFetch);
    expect(res.status).toBe(200);
    expect(commits.at(-1)!.paths).toContain("content/sections/contact-strip.json");
    expect(files.get("content/sections/contact-strip.json")).toContain('"href": "/food"');
  });
});

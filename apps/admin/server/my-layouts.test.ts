import { beforeEach, describe, expect, it, vi } from "vitest";
import { handleLayouts, type Env } from "./api";
import { checkLayout, layoutIdFor, layoutIdForFile, parseLayout } from "./content";
import { fromBase64, toBase64 } from "./github";

// Sign-in is covered by save-api.test.ts; here everyone is signed in.
vi.mock("./access", async (orig) => ({
  ...(await orig<typeof import("./access")>()),
  verifyAccessJwt: async () => ({ email: "hosni@example.com" }),
}));

// --- A small in-memory GitHub: contents API reads, Git data API commits ---------

let files: Map<string, string>;
let commits: { message: string; paths: string[] }[];
let head: number;
let trees: Map<string, { path: string; content?: string; sha?: null }[]>;
let pending: Map<string, { message: string; tree: string }>;

const respond = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });

const fakeFetch: typeof fetch = async (input, init) => {
  const url = new URL(String(input));
  const method = init?.method ?? "GET";
  const contents = url.pathname.match(/^\/repos\/hystericmoon\/crust\/contents\/(.+)$/);
  if (contents) {
    const path = decodeURIComponent(contents[1]!);
    if (path === "content/layouts") {
      const list = [...files.keys()].filter((p) => p.startsWith("content/layouts/"));
      return list.length ? respond(200, list.map((p) => ({ type: "file", name: p.split("/").pop(), path: p, sha: "s" }))) : respond(404, {});
    }
    const text = files.get(path);
    return text === undefined ? respond(404, {}) : respond(200, { sha: "s", content: toBase64(text) });
  }
  const git = url.pathname.match(/^\/repos\/hystericmoon\/crust\/git\/([a-z]+)\/?(.*)$/);
  if (!git) return respond(404, {});
  const [, what, rest] = git;
  const body = init?.body ? JSON.parse(String(init.body)) : null;
  if (what === "ref") return respond(200, { object: { sha: `c${head}` } });
  if (what === "commits" && method === "GET") return respond(200, { tree: { sha: `t-${rest}` } });
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
      else files.set(e.path, e.content!);
    }
    commits.push({ message: commit.message, paths: entries.map((e) => e.path) });
    head++;
    return respond(200, {});
  }
  return respond(404, {});
};

const env: Env = { GITHUB_TOKEN: "gh-token", ACCESS_TEAM_DOMAIN: "team.cloudflareaccess.com", ACCESS_AUD: "aud" };
const ORIGIN = "https://crust-admin.pages.dev";
const headers = { "Content-Type": "application/json", "X-Crust": "1", Origin: ORIGIN, "Cf-Access-Jwt-Assertion": "jwt" };
const post = (body: unknown) => handleLayouts(new Request(`${ORIGIN}/api/layouts`, { method: "POST", headers, body: JSON.stringify(body) }), env, fakeFetch);
const list = () => handleLayouts(new Request(`${ORIGIN}/api/layouts`, { headers: { "Cf-Access-Jwt-Assertion": "jwt" } }), env, fakeFetch);

const section = (heading = "How it works") => ({
  type: "Section",
  props: { id: "s1", background: "surface", content: [{ type: "Heading", props: { id: "h1", text: heading, level: "h2", align: "left" } }] },
});
const saved = (id: string, name: string, savedAt = "2026-10-29T10:00:00.000Z") =>
  `${JSON.stringify({ id, name, kind: "section", savedAt, content: [section(name)] }, null, 2)}\n`;

beforeEach(() => {
  files = new Map();
  commits = [];
  head = 0;
  trees = new Map();
  pending = new Map();
});

describe("my-layouts: file names and checks", () => {
  it("makes a readable, free file name from the layout name", () => {
    expect(layoutIdFor("Studio intro!", [])).toBe("studio-intro");
    expect(layoutIdFor("Café Ñandú", [])).toBe("cafe-nandu");
    expect(layoutIdFor("Studio intro", ["studio-intro", "studio-intro-2"])).toBe("studio-intro-3");
    expect(layoutIdFor("✨✨", [])).toBe("layout");
    expect(layoutIdFor("a".repeat(80), []).length).toBeLessThanOrEqual(50);
  });

  it("only reads files in content/layouts", () => {
    expect(layoutIdForFile("content/layouts/hero.json")).toBe("hero");
    expect(layoutIdForFile("content/pages/hero.json")).toBeNull();
    expect(layoutIdForFile("content/layouts/../x.json")).toBeNull();
  });

  it("needs a name, a kind and real blocks", () => {
    expect(checkLayout({ name: "Hero", kind: "section", content: [section()] })).toEqual([]);
    expect(checkLayout({ name: " ", kind: "section", content: [section()] })).toEqual(["The layout needs a name."]);
    expect(checkLayout({ name: "x".repeat(61), kind: "page", content: [section()] })[0]).toMatch(/longer than 60/);
    expect(checkLayout({ name: "Hero", kind: "column", content: [section()] })).toEqual(["A layout is either a section or a whole page."]);
    expect(checkLayout({ name: "Hero", kind: "section", content: [] })).toEqual(["The layout's blocks are missing or damaged."]);
    expect(checkLayout({ name: "Hero", kind: "section", content: [{ type: "<script>", props: {} }] })).toEqual(["The layout's blocks are missing or damaged."]);
    expect(parseLayout("not json", "x")).toBeNull();
  });
});

describe("my-layouts: API", () => {
  it("lists saved layouts, newest first, skipping damaged files", async () => {
    files.set("content/layouts/old.json", saved("old", "Old one", "2026-10-01T00:00:00.000Z"));
    files.set("content/layouts/new.json", saved("new", "New one", "2026-10-29T00:00:00.000Z"));
    files.set("content/layouts/broken.json", "{");
    const res = (await (await list()).json()) as { ok: boolean; layouts: { id: string; name: string }[] };
    expect(res.ok).toBe(true);
    expect(res.layouts.map((l) => l.id)).toEqual(["new", "old"]);
  });

  it("lists nothing before the first save (no folder yet)", async () => {
    expect(await (await list()).json()).toEqual({ ok: true, layouts: [] });
  });

  it("saves a layout as its own file in one commit, with a free name", async () => {
    files.set("content/layouts/how-it-works.json", saved("how-it-works", "How it works"));
    const res = (await (await post({ action: "save", layout: { name: "  How it works ", kind: "section", content: [section()] } })).json()) as {
      ok: boolean;
      layout: { id: string; name: string; savedAt: string };
    };
    expect(res.ok).toBe(true);
    expect(res.layout.id).toBe("how-it-works-2");
    expect(res.layout.name).toBe("How it works");
    expect(commits).toEqual([{ message: expect.stringMatching(/^Save layout "How it works" from the builder\n\nSaved by hosni@example.com$/), paths: ["content/layouts/how-it-works-2.json"] }]);
    const file = JSON.parse(files.get("content/layouts/how-it-works-2.json")!);
    expect(file).toMatchObject({ id: "how-it-works-2", name: "How it works", kind: "section" });
    expect(file.content[0].type).toBe("Section");
    expect(files.get("content/layouts/how-it-works-2.json")!.endsWith("}\n")).toBe(true);
  });

  it("refuses to save without a name or blocks", async () => {
    const res = await post({ action: "save", layout: { name: "", kind: "section", content: [section()] } });
    expect(res.status).toBe(422);
    expect(await res.json()).toEqual({ ok: false, error: "Not saved. The layout needs a name." });
    expect(commits).toEqual([]);
  });

  it("renames in place: the file name stays, so nothing else changes", async () => {
    files.set("content/layouts/hero.json", saved("hero", "Hero"));
    const res = (await (await post({ action: "rename", id: "hero", name: "Big hero" })).json()) as { ok: boolean; layout: { id: string; name: string } };
    expect(res.layout).toMatchObject({ id: "hero", name: "Big hero" });
    expect(commits[0]!.paths).toEqual(["content/layouts/hero.json"]);
    expect(JSON.parse(files.get("content/layouts/hero.json")!).name).toBe("Big hero");
  });

  it("deletes the layout's file only", async () => {
    files.set("content/layouts/hero.json", saved("hero", "Hero"));
    files.set("content/pages/index.json", "{}");
    const res = await post({ action: "delete", id: "hero" });
    expect((await res.json()).ok).toBe(true);
    expect(files.has("content/layouts/hero.json")).toBe(false);
    expect(files.has("content/pages/index.json")).toBe(true);
    expect(commits[0]!.message).toMatch(/^Delete layout "Hero" from the builder\n\nPages that used it keep their copy\./);
  });

  it("refuses ids that aren't layout files, and layouts that are gone", async () => {
    expect((await post({ action: "delete", id: "../pages/index" })).status).toBe(400);
    expect((await post({ action: "rename", id: "Hero", name: "x" })).status).toBe(400);
    const gone = await post({ action: "delete", id: "missing" });
    expect(gone.status).toBe(404);
    expect(commits).toEqual([]);
  });

  it("refuses writes that didn't come from the admin", async () => {
    const res = await handleLayouts(
      new Request(`${ORIGIN}/api/layouts`, { method: "POST", headers: { ...headers, "X-Crust": "" }, body: JSON.stringify({ action: "delete", id: "hero" }) }),
      env,
      fakeFetch,
    );
    expect(res.status).toBe(400);
  });

  it("is switched off until saving is set up", async () => {
    const res = await handleLayouts(new Request(`${ORIGIN}/api/layouts`), {}, fakeFetch);
    expect(res.status).toBe(503);
    expect(((await res.json()) as { notConfigured: boolean }).notConfigured).toBe(true);
  });

  it("round-trips through base64 with non-ASCII names", async () => {
    await post({ action: "save", layout: { name: "Héllo ✨", kind: "section", content: [section("Héllo ✨")] } });
    const id = [...files.keys()][0]!;
    expect(fromBase64(toBase64(files.get(id)!))).toContain("Héllo ✨");
    const res = (await (await list()).json()) as { layouts: { name: string }[] };
    expect(res.layouts[0]!.name).toBe("Héllo ✨");
  });
});

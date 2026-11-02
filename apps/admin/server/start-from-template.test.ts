import { defaultTokens, migrateChrome, type Site } from "@crust/blocks";
import { currentDesign } from "@crust/blocks";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fromBase64, toBase64 } from "./github";
import { applyChanges, checkTemplateContent, handleTemplate, type TemplateContent } from "./template";

// Sign-in is covered by save-api.test.ts; here everyone is signed in.
vi.mock("./access", async (orig) => ({
  ...(await orig<typeof import("./access")>()),
  verifyAccessJwt: async () => ({ email: "hosni@example.com" }),
}));

// --- A small in-memory GitHub with history: every commit keeps a snapshot -----------

/** Blob sha → text (photos as "b64:<data>"). */
let blobStore: Map<string, string>;
let log: { sha: string; parent: string | null; message: string; date: string; files: Map<string, string>; changed: { filename: string; status: string }[] }[];
let trees: Map<string, { path: string; content?: string; sha?: string | null }[]>;
let pending: Map<string, { message: string; tree: string }>;
let requests: number;

const respond = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });
const headOf = () => log.at(-1)!;
let blobCounter = 0;
const store = (value: string) => {
  const sha = `b${++blobCounter}`;
  blobStore.set(sha, value);
  return sha;
};

function seed(files: Record<string, string>) {
  blobStore = new Map();
  const map = new Map<string, string>();
  for (const [path, value] of Object.entries(files)) map.set(path, store(value));
  log = [{ sha: "c0", parent: null, message: "Initial", date: "2026-10-01T00:00:00Z", files: map, changed: [] }];
}

const fakeFetch: typeof fetch = async (input, init) => {
  requests++;
  const url = new URL(String(input));
  const method = init?.method ?? "GET";
  const body = init?.body ? JSON.parse(String(init.body)) : null;
  const repo = "/repos/hystericmoon/crust";
  const at = (ref: string | null) => (ref && ref !== "main" ? log.find((c) => c.sha === ref)! : headOf());

  const contents = url.pathname.match(new RegExp(`^${repo}/contents/(.+)$`));
  if (contents) {
    const path = decodeURIComponent(contents[1]!);
    const files = at(url.searchParams.get("ref")).files;
    if (!path.endsWith(".json")) {
      const list = [...files.keys()].filter((p) => p.startsWith(`${path}/`));
      return respond(200, list.map((p) => ({ type: "file", name: p.split("/").pop(), path: p, sha: files.get(p) })));
    }
    const sha = files.get(path);
    return sha ? respond(200, { sha, content: toBase64(blobStore.get(sha)!) }) : respond(404, {});
  }
  if (url.pathname === `${repo}/commits` && method === "GET") {
    const path = url.searchParams.get("path")!;
    const touching = [...log].reverse().filter((c) => c.changed.some((f) => f.filename.startsWith(`${path}/`) || f.filename === path));
    return respond(200, touching.map((c) => ({ sha: c.sha, parents: c.parent ? [{ sha: c.parent }] : [], commit: { message: c.message, committer: { date: c.date } } })));
  }
  const one = url.pathname.match(new RegExp(`^${repo}/commits/([a-z0-9]+)$`));
  if (one) {
    const c = log.find((x) => x.sha === one[1]);
    return c ? respond(200, { sha: c.sha, parents: c.parent ? [{ sha: c.parent }] : [], files: c.changed }) : respond(404, {});
  }
  const git = url.pathname.match(new RegExp(`^${repo}/git/([a-z]+)/?(.*)$`));
  if (!git) return respond(404, {});
  const [, what, rest] = git;
  if (what === "ref") return respond(200, { object: { sha: headOf().sha } });
  if (what === "commits" && method === "GET") return respond(200, { tree: { sha: `t-${rest}` } });
  if (what === "trees" && method === "GET") {
    const c = log.find((x) => x.sha === decodeURIComponent(rest!));
    if (!c) return respond(404, {});
    return respond(200, { tree: [...c.files].map(([path, sha]) => ({ path, type: "blob", sha })) });
  }
  if (what === "blobs") return respond(201, { sha: store(`b64:${body.content}`) });
  if (what === "trees") {
    const sha = `tree${trees.size}`;
    trees.set(sha, body.tree);
    return respond(201, { sha });
  }
  if (what === "commits") {
    const sha = `aaaaaa${pending.size}`;
    pending.set(sha, body);
    return respond(201, { sha, html_url: `https://github.com/c/${sha}` });
  }
  if (what === "refs" && method === "PATCH") {
    const commit = pending.get(body.sha)!;
    const before = headOf();
    const files = new Map(before.files);
    const changed: { filename: string; status: string }[] = [];
    for (const e of trees.get(commit.tree)!) {
      const existed = files.has(e.path);
      if (e.sha === null) files.delete(e.path);
      else if (e.sha) files.set(e.path, e.sha);
      else files.set(e.path, store(e.content!));
      changed.push({ filename: e.path, status: e.sha === null ? "removed" : existed ? "modified" : "added" });
    }
    log.push({ sha: body.sha, parent: before.sha, message: commit.message, date: `2026-10-30T10:0${log.length}:00Z`, files, changed });
    return respond(200, {});
  }
  return respond(404, {});
};

const env = { GITHUB_TOKEN: "gh-token", ACCESS_TEAM_DOMAIN: "team.cloudflareaccess.com", ACCESS_AUD: "aud" };
const ORIGIN = "https://crust-admin.pages.dev";
const headers = { "Content-Type": "application/json", "X-Crust": "1", Origin: ORIGIN, "Cf-Access-Jwt-Assertion": "jwt" };
const post = (body: unknown) => handleTemplate(new Request(`${ORIGIN}/api/template`, { method: "POST", headers, body: JSON.stringify(body) }), env, fakeFetch);
const get = () => handleTemplate(new Request(`${ORIGIN}/api/template`, { headers: { "Cf-Access-Jwt-Assertion": "jwt" } }), env, fakeFetch);
const file = (path: string) => {
  const sha = headOf().files.get(path);
  return sha ? blobStore.get(sha)! : undefined;
};

function pngBase64(width: number, height: number) {
  const b = new Uint8Array(33);
  b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
  new DataView(b.buffer).setUint32(16, width);
  new DataView(b.buffer).setUint32(20, height);
  return btoa(String.fromCharCode(...b));
}

const heading = (text: string) => ({ type: "Heading", props: { id: `h-${text}`, text, level: "h1", align: "left" } });
const page = (path: string, title: string) => ({ path, title, description: `${title}.`, puck: { root: { props: {} }, content: [heading(title)] } });
const json = (v: unknown) => `${JSON.stringify(v, null, 2)}\n`;

const mySite: Site = { name: "Bakery", baseUrl: "https://bakery.com", language: "en", tokens: defaultTokens };

function harbour(over: Partial<TemplateContent> = {}): TemplateContent {
  const chrome = migrateChrome({ name: "Harbour" }, [{ path: "/", title: "Home" }]);
  return {
    name: "Harbour",
    site: { language: "id", tokens: { ...defaultTokens, fonts: { ...defaultTokens.fonts } }, header: chrome.header, footer: chrome.footer },
    pages: [page("/", "Harbour home"), page("/work", "Work")],
    sections: [{ id: "contact-strip", name: "Contact strip", content: [{ type: "Section", props: { id: "s", background: "dark", content: [heading("Call")].map((h) => ({ ...h, props: { ...h.props, level: "h2" } })) } }] as never }],
    layouts: [{ name: "Studio intro", kind: "section", content: [{ type: "Section", props: { id: "l", background: "surface", content: [] } }] as never }],
    blog: { title: "Journal", intro: "" },
    posts: [{ slug: "opening-day", title: "Opening day", description: "We opened.", date: "2026-10-30", cover: "", coverAlt: "", puck: { root: { props: {} }, content: [] } }],
    photos: [],
    ...over,
  };
}

beforeEach(() => {
  seed({
    "content/site.json": json(mySite),
    "content/pages/index.json": json(page("/", "Bakery home")),
    "content/pages/menu.json": json(page("/menu", "Menu")),
    "content/posts/new-oven.json": json({ slug: "new-oven", title: "New oven", description: "", date: "2026-09-01", cover: "", coverAlt: "", puck: { root: { props: {} }, content: [] } }),
    "content/layouts/studio-intro.json": json({ id: "studio-intro", name: "Studio intro", kind: "section", savedAt: "", content: [] }),
    "content/redirects.json": json([{ from: "/food", to: "/menu" }, { from: "/start", to: "/" }]),
    "content/media.json": json([{ file: "bread.png", alt: "Bread", width: 10, height: 10, bytes: 33, uploadedAt: "" }]),
  });
  trees = new Map();
  pending = new Map();
  requests = 0;
});

describe("start from a template: the server (F048)", () => {
  it("replaces pages, sections, posts and the style in one commit; keeps the site's name and address", async () => {
    const res = await post({ action: "apply", template: harbour() });
    expect(res.status).toBe(200);
    expect(log).toHaveLength(2);
    const commit = log[1]!;
    expect(commit.message.split("\n")[0]).toBe('Start from template "Harbour"');
    expect(commit.message).toContain("Replaced 2 pages, 0 linked sections and 1 blog post");
    expect(commit.message).toContain("Applied by hosni@example.com");
    const site = JSON.parse(file("content/site.json")!) as Site;
    expect(site.name).toBe("Bakery");
    expect(site.baseUrl).toBe("https://bakery.com");
    expect(site.language).toBe("id");
    expect(site.header?.logo?.text).toBe("Harbour");
    expect(file("content/pages/menu.json")).toBeUndefined();
    expect(JSON.parse(file("content/pages/index.json")!).title).toBe("Harbour home");
    expect(file("content/pages/work.json")).toBeDefined();
    expect(file("content/posts/new-oven.json")).toBeUndefined();
    expect(file("content/posts/opening-day.json")).toBeDefined();
    expect(JSON.parse(file("content/blog.json")!).title).toBe("Journal");
    expect(file("content/sections/contact-strip.json")).toBeDefined();
    // Saved layouts are added next to yours, never over them.
    expect(file("content/layouts/studio-intro.json")).toContain('"content": []');
    expect(file("content/layouts/studio-intro-2.json")).toContain("Studio intro");
    // A redirect to a page that's gone is dropped; one to Home stays.
    expect(JSON.parse(file("content/redirects.json")!)).toEqual([{ from: "/start", to: "/" }]);
    // The photo library isn't touched.
    expect(file("content/media.json")).toContain("bread.png");
  });

  it("keeps Replace me marks: the template's sample content stays marked", () => {
    const marked = harbour({ pages: [{ ...page("/", "Home"), puck: { root: { props: {} }, content: [{ ...heading("Studio"), props: { ...heading("Studio").props, placeholder: ["text"] } }] } }] });
    const changes = applyChanges(marked, { site: mySite, pageFiles: [], sectionFiles: [], postFiles: [], layoutIds: [], redirects: null }, new Date("2026-10-30T00:00:00Z"));
    expect(changes.find((c) => c.path === "content/pages/index.json")!.content).toContain('"placeholder"');
  });

  it("F082: the template's designs replace the site's; one it doesn't have goes back to the built-in look", () => {
    const blog = { kind: "blog" as const, content: currentDesign("blog") };
    const t = harbour({ designs: [blog] });
    expect(checkTemplateContent(t)).toEqual([]);
    const changes = applyChanges(t, { site: mySite, pageFiles: [], sectionFiles: [], postFiles: [], layoutIds: [], redirects: null, designFiles: ["content/designs/post.json", "content/designs/blog.json"] }, new Date("2026-10-30T00:00:00Z"));
    expect(JSON.parse(changes.find((c) => c.path === "content/designs/blog.json")!.content!)).toMatchObject({ kind: "blog", savedAt: "2026-10-30T00:00:00.000Z" });
    expect(changes.find((c) => c.path === "content/designs/post.json")!.content).toBeNull();
    expect(checkTemplateContent(harbour({ designs: [{ kind: "post", content: [] }] }))[0]).toMatch(/needs a “Post content” block/);
    expect(checkTemplateContent(harbour({ designs: [blog, blog] }))).toContain("The template has two Blog page designs.");
  });

  it("refuses a damaged template and writes nothing", async () => {
    expect(checkTemplateContent(harbour({ pages: [page("/work", "Work")] }))).toContain("The template needs a Home page (address /).");
    expect(checkTemplateContent(harbour({ pages: [page("/", "Home"), page("/blog/x", "X")] })).join(" ")).toMatch(/blog/);
    const res = await post({ action: "apply", template: harbour({ pages: [] }) });
    expect(res.status).toBe(422);
    expect((await res.json()).error).toMatch(/^Not applied\. The template has no pages\./);
    expect(log).toHaveLength(1);
  });

  it("adds the template's photos to the library first, a few at a time", async () => {
    const photos = [{ file: "harbour.png", alt: "Boats in the harbour", data: pngBase64(1600, 900) }, { file: "bread.png", alt: "Sourdough", data: pngBase64(20, 20) }];
    const res = await post({ action: "photos", name: "Harbour", photos });
    expect(res.status).toBe(200);
    expect(log[1]!.message.split("\n")[0]).toBe('Add photos from template "Harbour"');
    const library = JSON.parse(file("content/media.json")!);
    // Same file name: the template's photo replaces it (the confirm question says so).
    expect(library.map((m: { file: string; alt: string }) => `${m.file}:${m.alt}`)).toEqual(["harbour.png:Boats in the harbour", "bread.png:Sourdough"]);
    expect(file("content/media/harbour.png")).toBe(`b64:${pngBase64(1600, 900)}`);
    // Then the apply step finds them there; a missing one stops it.
    expect((await post({ action: "apply", template: harbour({ photos: ["harbour.png"] }) })).status).toBe(200);
    const missing = await post({ action: "apply", template: harbour({ photos: ["door.jpg"] }) });
    expect(missing.status).toBe(409);
    expect((await missing.json()).error).toContain("door.jpg");
  });

  it("refuses photos that aren't photos, or have no description", async () => {
    expect((await post({ action: "photos", name: "Harbour", photos: [{ file: "x.png", alt: "X", data: btoa("<svg/>") }] })).status).toBe(422);
    const res = await post({ action: "photos", name: "Harbour", photos: [{ file: "x.png", alt: " ", data: pngBase64(5, 5) }] });
    expect((await res.json()).error).toBe("Not added. The photo x.png needs a description (alt text).");
    expect(log).toHaveLength(1);
  });

  it("brings back the site from before, exactly the files the switch changed", async () => {
    const before = new Map(headOf().files);
    await post({ action: "apply", template: harbour() });
    expect(await (await get()).json()).toEqual({ ok: true, last: { commit: "aaaaaa0", name: "Harbour", date: expect.any(String) } });
    const res = await post({ action: "undo", commit: "aaaaaa0" });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.site.name).toBe("Bakery");
    expect(body.site.language).toBe("en");
    expect(log.at(-1)!.message).toMatch(/^Bring back the site from before template "Harbour"\n\nUndoes aaaaaa0\./);
    expect(new Map(headOf().files)).toEqual(before);
    // Nothing left to undo.
    expect(await (await get()).json()).toEqual({ ok: true, last: null });
    expect((await post({ action: "undo", commit: "aaaaaa0" })).status).toBe(404);
  });

  it("only undoes the latest template switch", async () => {
    await post({ action: "apply", template: harbour() });
    await post({ action: "apply", template: harbour({ name: "Second" }) });
    expect((await post({ action: "undo", commit: "aaaaaa0" })).status).toBe(404);
    expect((await post({ action: "undo", commit: "../x" })).status).toBe(404);
    expect((await post({ action: "undo", commit: "aaaaaa1" })).status).toBe(200);
    expect(JSON.parse(file("content/site.json")!).language).toBe("id");
  });

  it("stays well inside Cloudflare's limit on requests to GitHub", async () => {
    await post({ action: "apply", template: harbour() });
    expect(requests).toBeLessThan(25);
    requests = 0;
    await post({ action: "undo", commit: "aaaaaa0" });
    expect(requests).toBeLessThan(25);
  });

  it("needs a write sign-in for changes", async () => {
    const res = await handleTemplate(new Request(`${ORIGIN}/api/template`, { method: "POST", headers: { "Content-Type": "application/json", "Cf-Access-Jwt-Assertion": "jwt" }, body: "{}" }), env, fakeFetch);
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(fromBase64(toBase64("ok"))).toBe("ok");
  });
});

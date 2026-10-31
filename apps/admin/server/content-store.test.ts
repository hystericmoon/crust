/**
 * F054: the content store. The LocalStore keeps a site in a folder with its
 * own history, and every admin API handler works against it the way it
 * works against GitHub (the GitHub side keeps its own tests).
 */
import { defaultTokens, migrateChrome, type Page, type Site } from "@crust/blocks";
import { newPost } from "@crust/blocks/posts";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  handleChanges,
  handleDelete,
  handleDeleted,
  handleLayouts,
  handleLinks,
  handlePage,
  handlePages,
  handlePublish,
  handleRename,
  handleRestore,
  handleSave,
  handleStatus,
  type Env,
} from "./api";
import { listFolder, readFile as repoRead } from "./github";
import { blobSha, LocalStore, memoryFolder, type Folder } from "./local-store";
import { handleMedia, handleMediaFile } from "./media";
import { nodeFolder } from "./node-folder";
import { handlePosts } from "./posts";
import { handleSections } from "./sections";
import { handleTemplate, type TemplateContent } from "./template";

const json = (v: unknown) => `${JSON.stringify(v, null, 2)}\n`;
const heading = (text: string, level = "h1") => ({ type: "Heading", props: { id: `h-${text}`, text, level, align: "left" } });
const button = (href: string) => ({ type: "Button", props: { id: `b-${href}`, label: "Go", href, variant: "primary", align: "left" } });
const page = (path: string, title: string, extra: unknown[] = []): Page =>
  ({ path, title, description: `${title}.`, puck: { root: { props: {} }, content: [heading(title), ...extra] } }) as Page;
const site: Site = { name: "Bakery", baseUrl: "https://example.pages.dev", language: "en", tokens: defaultTokens };

/** A clock that moves a minute per tick, so history has an order. */
function clock() {
  let n = 0;
  return () => new Date(Date.UTC(2026, 9, 31, 10, n++));
}

describe("LocalStore: files and history (F054)", () => {
  let folder: ReturnType<typeof memoryFolder>;
  let store: LocalStore;
  beforeEach(() => {
    folder = memoryFolder();
    store = new LocalStore(folder, undefined, clock());
  });

  it("writes files where the repository would have them, and reads them back", async () => {
    const { commit, url } = await store.commitFiles([{ path: "content/site.json", content: json(site) }], "Save Site settings");
    expect(commit).toMatch(/^[0-9a-f]{40}$/);
    expect(url).toBe("");
    expect(new TextDecoder().decode(folder.files.get("content/site.json")!)).toBe(json(site));
    expect(await store.readFile("content/site.json")).toBe(json(site));
    expect(await store.readFile("content/missing.json")).toBeNull();
    expect(await store.head()).toBe(commit);
  });

  it("keeps every version: old versions read back by commit", async () => {
    const first = await store.commitFiles([{ path: "content/pages/index.json", content: "one" }], "First");
    await store.commitFiles([{ path: "content/pages/index.json", content: "two" }], "Second");
    expect(await store.readFile("content/pages/index.json")).toBe("two");
    expect(await store.readFile("content/pages/index.json", first.commit)).toBe("one");
  });

  it("names file versions like Git blobs and stores a version once", async () => {
    expect(await blobSha(new TextEncoder().encode("hello\n"))).toBe("ce013625030ba8dba906f756967f9e9ca394464a");
    await store.commitFiles([{ path: "content/a.json", content: "same" }, { path: "content/b.json", content: "same" }], "Two");
    const objects = [...folder.files.keys()].filter((p) => p.startsWith(".crust/objects/"));
    expect(objects).toHaveLength(1);
    const files = await store.listFolder("content");
    expect(files.map((f) => f.name)).toEqual(["a.json", "b.json"]);
    expect(files[0]!.sha).toBe(files[1]!.sha);
  });

  it("lists one folder level only", async () => {
    await store.commitFiles(
      [
        { path: "content/site.json", content: "{}" },
        { path: "content/pages/index.json", content: "{}" },
      ],
      "Two",
    );
    expect((await store.listFolder("content")).map((f) => f.path)).toEqual(["content/site.json"]);
    expect((await store.listFolder("content/pages")).map((f) => f.path)).toEqual(["content/pages/index.json"]);
    expect(await store.listFolder("content/posts")).toEqual([]);
  });

  it("deletes, saves binary files, and puts back an earlier version by its sha", async () => {
    const photo = btoa(String.fromCharCode(0x89, 0x50, 0x4e, 0x47, 0, 255));
    const first = await store.commitFiles(
      [
        { path: "content/media/a.png", content: "", base64: photo },
        { path: "content/pages/menu.json", content: "menu" },
      ],
      "Add",
    );
    expect([...(await folder.read("content/media/a.png"))!]).toEqual([0x89, 0x50, 0x4e, 0x47, 0, 255]);
    await store.commitFiles([{ path: "content/pages/menu.json", content: null }], "Delete");
    expect(await store.readFile("content/pages/menu.json")).toBeNull();
    expect(folder.files.has("content/pages/menu.json")).toBe(false);
    const sha = (await store.filesAt(first.commit, "content/pages")).get("content/pages/menu.json")!;
    await store.commitFiles([{ path: "content/pages/menu.json", content: null, sha }], "Bring back");
    expect(await store.readFile("content/pages/menu.json")).toBe("menu");
  });

  it("answers history questions: when a file changed, recent commits, what a commit changed, what changed since", async () => {
    const a = await store.commitFiles([{ path: "content/pages/index.json", content: "1" }, { path: "content/site.json", content: "s" }], "One");
    const b = await store.commitFiles([{ path: "content/site.json", content: "s2" }], "Two");
    const c = await store.commitFiles([{ path: "content/pages/menu.json", content: "m" }, { path: "content/pages/index.json", content: null }], "Three");
    expect(await store.lastCommitDate("content/site.json")).toBe("2026-10-31T10:01:00.000Z");
    expect(await store.lastCommitDate("content/pages/menu.json")).toBe("2026-10-31T10:02:00.000Z");
    expect((await store.recentCommits("content/pages")).map((x) => x.message)).toEqual(["Three", "One"]);
    expect((await store.recentCommits("content")).map((x) => [x.sha, x.parent])).toEqual([
      [c.commit, b.commit],
      [b.commit, a.commit],
      [a.commit, null],
    ]);
    expect(await store.commitChanges(c.commit)).toEqual({
      parent: b.commit,
      files: [
        { path: "content/pages/index.json", status: "removed" },
        { path: "content/pages/menu.json", status: "added" },
      ],
    });
    expect(await store.changedFiles(a.commit)).toEqual([
      { path: "content/pages/index.json", status: "removed" },
      { path: "content/pages/menu.json", status: "added" },
      { path: "content/site.json", status: "modified" },
    ]);
  });

  it("remembers the last publish", async () => {
    expect(await store.lastPublished()).toBeNull();
    const { commit } = await store.commitFiles([{ path: "content/site.json", content: "{}" }], "One");
    await store.markPublished();
    expect(await store.lastPublished()).toEqual({ sha: commit, at: "2026-10-31T10:01:00.000Z" });
  });

  it("starts the history of a folder that already has a site", async () => {
    const existing = memoryFolder({ "content/site.json": "{}", "content/pages/index.json": "home", "notes.txt": "not content" });
    const s = new LocalStore(existing);
    const first = await s.init();
    expect(first).toMatch(/^[0-9a-f]{40}$/);
    expect(await s.init()).toBeNull();
    expect((await s.listFolder("content/pages")).map((f) => f.name)).toEqual(["index.json"]);
    expect(await s.readFile("notes.txt")).toBeNull();
    expect((await s.recentCommits("content"))[0]!.message).toBe("Start the site's history");
  });

  it("refuses paths outside the site's content, and versions it doesn't have", async () => {
    await expect(store.commitFiles([{ path: "content/../x.json", content: "x" }], "x")).rejects.toThrow(/Can't save/);
    await expect(store.commitFiles([{ path: ".crust/HEAD", content: "x" }], "x")).rejects.toThrow(/Can't save/);
    await expect(store.commitFiles([{ path: "content/a.json", content: null, sha: "0".repeat(40) }], "x")).rejects.toThrow(/history/);
    await expect(store.readFile("content/a.json", "nope")).rejects.toThrow(/version/);
    expect(await store.head()).toBeNull();
  });

  it("makes one change at a time when saves arrive together", async () => {
    await Promise.all(Array.from({ length: 5 }, (_, i) => store.commitFiles([{ path: `content/pages/p${i}.json`, content: `${i}` }], `Save ${i}`)));
    expect(await store.listFolder("content/pages")).toHaveLength(5);
    expect(await store.recentCommits("content")).toHaveLength(5);
  });

  it("is what the content operations use when given one", async () => {
    await store.commitFiles([{ path: "content/site.json", content: "{}" }], "One");
    expect(await repoRead(store, "content/site.json")).toBe("{}");
    expect((await listFolder(store, "content")).map((f) => f.name)).toEqual(["site.json"]);
  });
});

describe("LocalStore on disk (F054)", () => {
  let dir: string;
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "crust-store-"));
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("keeps the site's files as plain files, the history in .crust", async () => {
    const store = new LocalStore(nodeFolder(dir));
    const first = await store.commitFiles([{ path: "content/pages/index.json", content: "home" }], "One");
    await store.commitFiles([{ path: "content/pages/index.json", content: "home 2" }], "Two");
    expect(await readFile(join(dir, "content/pages/index.json"), "utf8")).toBe("home 2");
    expect((await readFile(join(dir, ".crust/HEAD"), "utf8")).trim()).toMatch(/^[0-9a-f]{40}$/);
    // A second store on the same folder (the app restarted) sees the same history.
    const again = new LocalStore(nodeFolder(dir));
    expect(await again.readFile("content/pages/index.json", first.commit)).toBe("home");
    expect(await again.recentCommits("content")).toHaveLength(2);
  });

  it("never reaches outside the site folder", async () => {
    const folder: Folder = nodeFolder(dir);
    await expect(folder.read("../outside.json")).rejects.toThrow(/outside the site folder/);
  });
});

// --- Every handler, against a local folder -------------------------------------------------

const ORIGIN = "http://crust.localhost";
const headers = { "Content-Type": "application/json", "X-Crust": "1", Origin: ORIGIN };
const noFetch: typeof fetch = async () => {
  throw new Error("A local site must not call the network.");
};

describe("the admin API on a local folder (F054)", () => {
  let store: LocalStore;
  let env: Env;
  const post = (path: string, handler: (r: Request, e: Env, f: typeof fetch) => Promise<Response>, body: unknown) =>
    handler(new Request(`${ORIGIN}${path}`, { method: "POST", headers, body: JSON.stringify(body) }), env, noFetch);
  const get = (path: string, handler: (r: Request, e: Env, f: typeof fetch) => Promise<Response>) => handler(new Request(`${ORIGIN}${path}`), env, noFetch);
  const read = async (path: string) => JSON.parse((await store.readFile(path))!) as Record<string, unknown>;

  beforeEach(async () => {
    store = new LocalStore(memoryFolder({ "content/site.json": json(site), "content/pages/index.json": json(page("/", "Home")) }), undefined, clock());
    await store.init();
    env = { store, localUser: "Hosni" };
  });

  it("is switched on without GitHub or Cloudflare Access", async () => {
    expect(await (await get("/api/status", handleStatus)).json()).toEqual({ ok: true, configured: true, email: "Hosni" });
  });

  it("still refuses writes that didn't come from the builder", async () => {
    const res = await handleSave(new Request(`${ORIGIN}/api/save`, { method: "POST", body: "{}" }), env, noFetch);
    expect(res.status).toBe(400);
  });

  it("saves, lists and opens pages; the history names who saved", async () => {
    expect((await post("/api/save", handleSave, { kind: "page", page: page("/menu", "Menu") })).status).toBe(200);
    expect((await post("/api/save", handleSave, { kind: "site", site: { ...site, name: "Bakery 2" } })).status).toBe(200);
    expect((await read("content/site.json")).name).toBe("Bakery 2");
    const { pages } = (await (await get("/api/pages", handlePages)).json()) as { pages: { path: string; lastEdited: string }[] };
    expect(pages.map((p) => p.path)).toEqual(["/", "/menu"]);
    expect(pages[1]!.lastEdited).toMatch(/^2026-10-31T10:/);
    expect(((await (await get("/api/page?path=/menu", handlePage)).json()) as { page: Page }).page.title).toBe("Menu");
    expect((await get("/api/page?path=/nope", handlePage)).status).toBe(404);
    expect((await store.recentCommits("content/pages"))[0]!.message).toContain("Saved by Hosni");
  });

  it("renames a page with its redirect and links, and finds links first", async () => {
    await post("/api/save", handleSave, { kind: "page", page: page("/menu", "Menu") });
    await post("/api/save", handleSave, { kind: "page", page: page("/", "Home", [button("/menu")]) });
    const links = (await (await get("/api/links?path=/menu", handleLinks)).json()) as { pages: { path: string; count: number }[] };
    expect(links.pages).toEqual([{ path: "/", title: "Home", count: 1 }]);
    const res = await post("/api/rename", handleRename, { from: "/menu", to: "/food" });
    expect(res.status).toBe(200);
    expect(await store.readFile("content/pages/menu.json")).toBeNull();
    expect((await read("content/pages/food.json")).path).toBe("/food");
    expect(JSON.parse((await store.readFile("content/redirects.json"))!)).toEqual([{ from: "/menu", to: "/food" }]);
    expect(await store.readFile("content/pages/index.json")).toContain('"href": "/food"');
    expect((await post("/api/rename", handleRename, { from: "/gone", to: "/x" })).status).toBe(404);
    expect(((await (await post("/api/rename", handleRename, { from: "/gone", to: "/x" })).json()) as { error: string }).error).toContain("in this site");
  });

  it("deletes a page, lists it as deleted, and brings it back", async () => {
    await post("/api/save", handleSave, { kind: "page", page: page("/menu", "Menu") });
    expect((await post("/api/delete", handleDelete, { path: "/menu" })).status).toBe(200);
    const { pages } = (await (await get("/api/deleted", handleDeleted)).json()) as { pages: { path: string; title: string; commit: string }[] };
    expect(pages.map((p) => [p.path, p.title])).toEqual([["/menu", "Menu"]]);
    expect((await post("/api/restore", handleRestore, { path: "/menu", commit: pages[0]!.commit })).status).toBe(200);
    expect((await read("content/pages/menu.json")).title).toBe("Menu");
  });

  it("knows what the next publish changes, and that publishing isn't here yet", async () => {
    const never = (await (await get("/api/changes", handleChanges)).json()) as { lastPublish: unknown; pages: { path: string }[] };
    expect(never.lastPublish).toBeNull();
    expect(never.pages.map((p) => p.path)).toEqual(["/"]);
    await store.markPublished();
    await post("/api/save", handleSave, { kind: "page", page: page("/menu", "Menu") });
    const since = (await (await get("/api/changes", handleChanges)).json()) as { lastPublish: { at: string }; pages: unknown[] };
    expect(since.lastPublish.at).toMatch(/^2026-10-31/);
    expect(since.pages).toEqual([{ path: "/menu", change: "new" }]);
    const res = await post("/api/publish", handlePublish, {});
    expect(res.status).toBe(501);
    expect(await res.json()).toMatchObject({ ok: false, notConfigured: true });
  });

  it("saves, renames and deletes layouts", async () => {
    const section = [{ type: "Section", props: { id: "s", background: "surface", content: [heading("Intro", "h2")] } }];
    const saved = (await (await post("/api/layouts", handleLayouts, { action: "save", layout: { name: "Intro", kind: "section", content: section } })).json()) as {
      layout: { id: string };
    };
    expect(saved.layout.id).toBe("intro");
    expect((await post("/api/layouts", handleLayouts, { action: "rename", id: "intro", name: "Opening" })).status).toBe(200);
    expect(((await (await get("/api/layouts", handleLayouts)).json()) as { layouts: { name: string }[] }).layouts.map((l) => l.name)).toEqual(["Opening"]);
    expect((await post("/api/layouts", handleLayouts, { action: "delete", id: "intro" })).status).toBe(200);
    expect(await store.listFolder("content/layouts")).toEqual([]);
  });

  it("handles linked sections", async () => {
    const content = [{ type: "Section", props: { id: "s", background: "dark", content: [heading("Call us", "h2")] } }];
    expect((await post("/api/sections", handleSections, { action: "create", name: "Contact strip", content })).status).toBe(200);
    expect((await read("content/sections/contact-strip.json")).name).toBe("Contact strip");
    expect((await post("/api/sections", handleSections, { action: "delete", id: "contact-strip" })).status).toBe(200);
    expect((await post("/api/sections", handleSections, { action: "update", id: "contact-strip", content })).status).toBe(404);
  });

  it("handles blog posts", async () => {
    expect((await post("/api/posts", handlePosts, { action: "save", post: newPost("Opening day", "opening-day", "2026-10-01") })).status).toBe(200);
    expect((await read("content/posts/opening-day.json")).title).toBe("Opening day");
    expect((await get("/api/posts?slug=opening-day", handlePosts)).status).toBe(200);
  });

  it("uploads photos and serves them back", async () => {
    const png = new Uint8Array(33);
    png.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
    new DataView(png.buffer).setUint32(16, 1200);
    new DataView(png.buffer).setUint32(20, 800);
    const res = await post("/api/media", handleMedia, { action: "upload", name: "Bread.png", data: Buffer.from(png).toString("base64"), alt: "Bread" });
    expect(res.status).toBe(200);
    const served = await handleMediaFile(new Request(`${ORIGIN}/media/bread.png`), env, "bread.png", noFetch);
    expect(served.status).toBe(200);
    expect(new Uint8Array(await served.arrayBuffer())).toEqual(png);
  });

  it("starts from a template and brings the previous site back", async () => {
    const chrome = migrateChrome({ name: "Harbour" }, [{ path: "/", title: "Home" }]);
    const template: TemplateContent = {
      name: "Harbour",
      site: { language: "en", tokens: defaultTokens, header: chrome.header, footer: chrome.footer },
      pages: [page("/", "Harbour home"), page("/work", "Work")],
      sections: [],
      layouts: [],
      blog: { title: "Journal", intro: "" },
      posts: [],
      photos: [],
    } as TemplateContent;
    expect((await post("/api/template", handleTemplate, { action: "apply", template })).status).toBe(200);
    expect((await read("content/pages/index.json")).title).toBe("Harbour home");
    const { last } = (await (await get("/api/template", handleTemplate)).json()) as { last: { commit: string } };
    expect((await post("/api/template", handleTemplate, { action: "undo", commit: last.commit })).status).toBe(200);
    expect((await read("content/pages/index.json")).title).toBe("Home");
    expect(await store.readFile("content/pages/work.json")).toBeNull();
  });
});

// @vitest-environment happy-dom
/**
 * F055: the desktop app's side of the builder. The site folder is opened
 * (a new site when empty), the builder's API requests are answered in the
 * window by the same handlers as the web admin's server, and files go
 * through the app's commands.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LocalStore, memoryFolder } from "../../server/local-store";
import { desktopContent, setDesktopContent } from "./content";
import { isDesktop, newSiteFiles, openSite, startDesktop } from "./desktop";
import { isLocalAddress, localApi, routedFetch, routes } from "./local-api";
import { NOT_FOUND, PATH_HEADER, tauriFolder, type Invoke } from "./tauri-folder";

const decode = (bytes: Uint8Array | undefined) => (bytes ? new TextDecoder().decode(bytes) : null);

/** A clock that moves a minute per tick, so history has an order. */
function clock() {
  let n = 0;
  return () => new Date(Date.UTC(2026, 10, 1, 9, n++));
}

/** The app's four file commands, over a folder in memory (as crust_desktop does on disk). */
function fakeApp(folder = memoryFolder()) {
  const calls: { cmd: string; args: unknown; headers?: Record<string, string> }[] = [];
  const invoke: Invoke = async (cmd, args, options) => {
    calls.push({ cmd, args, headers: options?.headers });
    const a = args as Record<string, string>;
    switch (cmd) {
      case "site_read": {
        const bytes = await folder.read(a.path!);
        if (!bytes) throw NOT_FOUND;
        return bytes.slice().buffer;
      }
      case "site_write":
        return folder.write(decodeURIComponent(options!.headers[PATH_HEADER]!), args as Uint8Array);
      case "site_remove":
        return folder.remove(a.path!);
      case "site_list":
        return folder.list(a.dir!);
      case "site_info":
        return { folder: "/Users/hosni/Documents/Crust/My site" };
      default:
        throw `unknown command ${cmd}`;
    }
  };
  return { folder, invoke, calls };
}

const post = (path: string, body: unknown) =>
  new Request(`http://crust.app${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Crust": "1" },
    body: JSON.stringify(body),
  });
const get = (path: string) => new Request(`http://crust.app${path}`);

describe("the builder's server, in the window (F055)", () => {
  it("answers every address the web admin's server has, with the same methods", () => {
    const dir = join(__dirname, "../../functions/api");
    const files = readdirSync(dir).filter((f) => f.endsWith(".ts"));
    expect(Object.keys(routes).sort()).toEqual(files.map((f) => `/api/${f.replace(/\.ts$/, "")}`).sort());
    const methods = (f: string) => {
      const source = readFileSync(join(dir, f), "utf8");
      return [...source.matchAll(/onRequest(Get|Post)/g)].map((m) => m[1]!.toUpperCase()).sort();
    };
    for (const f of files) expect(Object.keys(routes[`/api/${f.replace(/\.ts$/, "")}`]!).sort(), f).toEqual(methods(f));
  });

  it("saves and lists pages in the site folder, with history", async () => {
    const folder = memoryFolder();
    const store = new LocalStore(folder, undefined, clock());
    await openSite(store);
    const api = localApi({ store, localUser: "you" });

    const status = await (await api(get("/api/status"))).json();
    expect(status).toEqual({ ok: true, configured: true, email: "you" });

    const about = {
      path: "/about",
      title: "About",
      description: "About us.",
      puck: { root: { props: {} }, content: [{ type: "Heading", props: { id: "h", text: "About", level: "h1", align: "left" } }] },
    };
    const saved = await api(post("/api/save", { kind: "page", page: about }));
    expect(saved.status).toBe(200);
    expect(JSON.parse(decode(folder.files.get("content/pages/about.json"))!).title).toBe("About");

    const { pages } = await (await api(get("/api/pages"))).json();
    expect(pages.map((p: { path: string }) => p.path).sort()).toEqual(["/", "/about"]);
    const history = await store.recentCommits("content");
    expect(history).toHaveLength(2);
    expect(history[1]!.message).toBe("Start a new site");
  });

  it("refuses writes that didn't come from the builder", async () => {
    const store = new LocalStore(memoryFolder(), undefined, clock());
    await openSite(store);
    const api = localApi({ store });
    const res = await api(new Request("http://crust.app/api/save", { method: "POST", body: "{}" }));
    expect(res.status).toBe(400);
  });

  it("shows the site's photos at /media/<file>", async () => {
    const photo = new Uint8Array([0xff, 0xd8, 0xff, 1, 2, 3]);
    const store = new LocalStore(memoryFolder({ "content/media/door.jpg": photo }), undefined, clock());
    await openSite(store);
    const api = localApi({ store });
    const res = await api(get("/media/door.jpg"));
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/jpeg");
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(photo);
    expect((await api(get("/media/missing.jpg"))).status).toBe(404);
    expect((await api(get("/media/..%2Fsite.json"))).status).toBe(404);
  });

  it("says when an address or method doesn't exist", async () => {
    const store = new LocalStore(memoryFolder(), undefined, clock());
    const api = localApi({ store });
    expect((await api(get("/api/nothing"))).status).toBe(404);
    expect((await api(get("/api/save"))).status).toBe(405);
  });

  it("doesn't go online: publishing says it isn't available in the app yet", async () => {
    const store = new LocalStore(memoryFolder(), undefined, clock());
    await openSite(store);
    const api = localApi({ store });
    const res = await api(post("/api/publish", {}));
    const body = await res.json();
    expect(body.ok).toBe(false);
  });
});

describe("opening the site folder (F055)", () => {
  it("starts a new site in an empty folder, once", async () => {
    const folder = memoryFolder();
    const store = new LocalStore(folder, undefined, clock());
    const opened = await openSite(store);
    expect(opened.site.name).toBe("My site");
    expect(opened.pages.map((p) => p.path)).toEqual(["/"]);
    expect(opened.posts).toEqual([]);
    expect(decode(folder.files.get("content/site.json"))).toBe(newSiteFiles()[0]!.content);
    expect((await store.recentCommits("content")).map((c) => c.message)).toEqual(["Start a new site"]);

    await openSite(new LocalStore(folder, undefined, clock()));
    expect(await store.recentCommits("content")).toHaveLength(1);
  });

  it("the new site's Home page has one h1 and passes the page checks", async () => {
    const { checkPage } = await import("../../server/content");
    const home = JSON.parse(newSiteFiles("Bakery")[1]!.content);
    expect(home.puck.content[0].props.content[0].props).toMatchObject({ level: "h1", text: "Bakery" });
    expect(checkPage(home)).toEqual([]);
  });

  it("keeps a site that was copied in, and starts its history", async () => {
    const site = { name: "Harbour", baseUrl: "https://example.pages.dev", language: "en", tokens: JSON.parse(newSiteFiles()[0]!.content).tokens };
    const page = { path: "/", title: "Harbour", description: "x", puck: { root: { props: {} }, content: [] } };
    const post = { slug: "opening", title: "Opening", description: "x", date: "2026-10-30", cover: "", coverAlt: "", puck: { root: { props: {} }, content: [] } };
    const folder = memoryFolder({
      "content/site.json": JSON.stringify(site),
      "content/pages/index.json": JSON.stringify(page),
      "content/pages/notes.txt": "not a page",
      "content/posts/opening.json": JSON.stringify(post),
    });
    const store = new LocalStore(folder, undefined, clock());
    const opened = await openSite(store);
    expect(opened.site.name).toBe("Harbour");
    expect(opened.pages.map((p) => p.title)).toEqual(["Harbour"]);
    expect(opened.posts.map((p) => p.slug)).toEqual(["opening"]);
    expect((await store.recentCommits("content")).map((c) => c.message)).toEqual(["Start the site's history"]);
  });
});

describe("the app's file commands (F055)", () => {
  it("reads, writes, lists and removes through the app", async () => {
    const app = fakeApp();
    const folder = tauriFolder(app.invoke);
    expect(await folder.read("content/site.json")).toBeNull();
    await folder.write("content/media/café.jpg", new Uint8Array([1, 2, 3]));
    const write = app.calls.find((c) => c.cmd === "site_write")!;
    expect(write.headers).toEqual({ [PATH_HEADER]: "content%2Fmedia%2Fcaf%C3%A9.jpg" });
    expect(write.args).toEqual(new Uint8Array([1, 2, 3]));
    expect(await folder.read("content/media/café.jpg")).toEqual(new Uint8Array([1, 2, 3]));
    expect(await folder.list("content/media")).toEqual(["café.jpg"]);
    await folder.remove("content/media/café.jpg");
    expect(await folder.list("content/media")).toEqual([]);
  });

  it("turns the app's refusals into errors with its words", async () => {
    const folder = tauriFolder(async () => {
      throw "../x is outside the site folder.";
    });
    await expect(folder.read("../x")).rejects.toThrow("../x is outside the site folder.");
    await expect(folder.write("../x", new Uint8Array())).rejects.toThrow("outside the site folder");
    await expect(folder.list("..")).rejects.toThrow("outside the site folder");
    await expect(folder.remove("../x")).rejects.toThrow("outside the site folder");
  });
});

describe("the builder's requests in the window (F055)", () => {
  const answered: string[] = [];
  const answer = async (r: Request) => {
    answered.push(`${r.method} ${new URL(r.url).pathname}${new URL(r.url).search}`);
    return new Response("{}");
  };
  const passed: string[] = [];
  const original = (async (input: RequestInfo | URL) => {
    passed.push(String(input instanceof Request ? input.url : input));
    return new Response("online");
  }) as typeof fetch;
  beforeEach(() => {
    answered.length = 0;
    passed.length = 0;
  });

  for (const here of ["tauri://localhost/", "http://tauri.localhost/#/edit?path=/"]) {
    it(`answers /api and /media itself at ${here}, and lets the rest through`, async () => {
      const routed = routedFetch(original, answer, here);
      await routed("/api/page?path=%2Fabout");
      await routed("/media/door.jpg");
      await routed("/api/save", { method: "POST", body: "{}", headers: { "X-Crust": "1" } });
      await routed("/assets/index.js");
      await routed("https://fonts.googleapis.com/css2?family=Inter");
      await routed("https://example.com/api/save");
      expect(answered).toEqual(["GET /api/page?path=%2Fabout", "GET /media/door.jpg", "POST /api/save"]);
      expect(passed).toEqual(["/assets/index.js", "https://fonts.googleapis.com/css2?family=Inter", "https://example.com/api/save"]);
    });
  }

  it("keeps the body and headers of a request", async () => {
    let seen: Request | null = null;
    const routed = routedFetch(original, async (r) => ((seen = r), new Response("{}")), "tauri://localhost/");
    await routed("/api/save", { method: "POST", body: '{"kind":"page"}', headers: { "X-Crust": "1", "Content-Type": "application/json" } });
    expect(seen!.headers.get("X-Crust")).toBe("1");
    expect(await seen!.text()).toBe('{"kind":"page"}');
  });

  it("turns a crash into an error the builder can show", async () => {
    const routed = routedFetch(original, async () => {
      throw new Error("The disk is full.");
    }, "tauri://localhost/");
    const res = await routed("/api/save", { method: "POST" });
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ ok: false, error: "The disk is full." });
  });

  it("knows its own addresses", () => {
    expect(isLocalAddress("/api/pages")).toBe(true);
    expect(isLocalAddress("/media/a.jpg")).toBe(true);
    expect(isLocalAddress("/assets/a.js")).toBe(false);
    expect(isLocalAddress("/")).toBe(false);
  });
});

describe("starting the app (F055)", () => {
  const realFetch = window.fetch;
  afterEach(() => {
    window.fetch = realFetch;
    setDesktopContent(null);
    delete (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__;
  });

  it("is the web admin unless Tauri is there", () => {
    expect(isDesktop()).toBe(false);
    (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__ = {};
    expect(isDesktop()).toBe(true);
  });

  it("opens the site, names the window, and answers the builder's requests", async () => {
    const app = fakeApp();
    const content = await startDesktop(app.invoke);
    expect(content.folder).toBe("/Users/hosni/Documents/Crust/My site");
    expect(desktopContent()?.site.name).toBe("My site");
    expect(document.title).toBe("My site · Crust");
    const res = await window.fetch("/api/pages");
    const { pages } = await res.json();
    expect(pages.map((p: { path: string }) => p.path)).toEqual(["/"]);
    expect(decode(app.folder.files.get(".crust/HEAD"))).toMatch(/^[0-9a-f]{40}/);
  });
});

describe("words in the app (F055)", () => {
  afterEach(() => setDesktopContent(null));
  const content = { site: JSON.parse(newSiteFiles()[0]!.content), pages: [], posts: [], folder: "/x" };

  it("has no Sign out: the app is the person's own", async () => {
    const { renderToStaticMarkup } = await import("react-dom/server");
    const { createElement } = await import("react");
    const { SignOutLink } = await import("../sign-out");
    expect(renderToStaticMarkup(createElement(SignOutLink))).toContain("Sign out");
    setDesktopContent(content);
    expect(renderToStaticMarkup(createElement(SignOutLink))).toBe("");
  });

  it("says a save went to the site, not GitHub", async () => {
    const { saveMessage } = await import("../App");
    setDesktopContent(content);
    expect(saveMessage({ ok: true, data: {} } as never, true, "Page")).toBe("Page saved. Visitors see it after you publish.");
    expect(saveMessage({ ok: false, error: "The disk is full." } as never, true, "Page")).toBe("Page not saved: The disk is full.");
    setDesktopContent(null);
    expect(saveMessage({ ok: true, data: {} } as never, true, "Page")).toContain("saved to GitHub");
  });
});

// @vitest-environment happy-dom
/**
 * F060: the first time the app opens. A fake app (the same rules as
 * crates/crust-desktop/src/sites.rs, over folders in memory) checks when
 * the welcome screen shows, what "Make my site" writes, and the screen
 * itself with the keyboard.
 */
import { config, defaultTokens, makeTemplate, migrateChrome, readTemplate, type Template, type TemplateSource } from "@crust/blocks";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { LocalStore } from "../../server/local-store";
import { launchDesktop } from "../desktop/desktop";
import { setDesktopContent } from "../desktop/content";
import { tauriFolder, type Invoke } from "../desktop/tauri-folder";
import { fakeApp } from "../sites/fake-app";
import { setSitesInvoke } from "../sites/sites";
import type { GallerySource } from "../templates/sources";
import { takeOpenToReplace, wantsOpenToReplace } from "./arrival";
import { BLANK_NAME, firstRunContext, isFirstRun, makeFirstSite, setFirstRunContext, starterOrder, stepText, suggestedName, type FirstRunContext } from "./first-run";
import { FirstRun, starterSources } from "./FirstRun";

const realFetch = window.fetch;
beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});
afterEach(() => {
  cleanup();
  window.fetch = realFetch;
  setDesktopContent(null);
  setSitesInvoke(null);
  setFirstRunContext(null);
  localStorage.clear();
  sessionStorage.clear();
});

const decode = (bytes: Uint8Array | null | undefined) => (bytes ? new TextDecoder().decode(bytes) : null);
const flush = () => act(async () => {});
const settings = (app: ReturnType<typeof fakeApp>, id: string) => JSON.parse(decode(app.sites.get(id)!.files.get("content/site.json"))!) as { name: string; tokens: unknown };
const history = async (app: ReturnType<typeof fakeApp>, id: string, path = "content/site.json") =>
  (await new LocalStore(tauriFolder(app.invoke, id)).recentCommits(path)).map((c) => c.message);

function pngBase64(width: number, height: number) {
  const b = new Uint8Array(33);
  b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
  new DataView(b.buffer).setUint32(16, width);
  new DataView(b.buffer).setUint32(20, height);
  return btoa(String.fromCharCode(...b));
}

/** A small starter with sample words and a photo, like Harbour. */
async function starter(name = "Harbour", siteName = "Harbour Studio"): Promise<Template> {
  const site = { name: siteName, language: "en" };
  const heading = { type: "Heading", props: { id: "h", text: "Quiet rooms, made well", level: "h1", align: "left", placeholder: ["text"] } };
  const image = { type: "Image", props: { id: "i", src: "/media/harbour.png", alt: "Boats", caption: "", aspect: "auto" } };
  const source: TemplateSource = {
    site,
    tokens: { ...defaultTokens, colors: { ...defaultTokens.colors, primary: "#1f4d3a" } },
    chrome: migrateChrome({ ...site }, [{ path: "/", title: "Home" }]),
    pages: [{ path: "/", title: "Home", description: "Welcome.", puck: { root: { props: {} }, content: [heading, image] } }],
    sections: [],
    layouts: [],
    blog: { title: "Journal", intro: "" },
    posts: [],
    media: [{ file: "harbour.png", alt: "Boats in the harbour", width: 1600, height: 900 }],
  };
  const { template } = await makeTemplate({ name, description: "Calm and editorial." }, source, async () => pngBase64(1600, 900));
  const read = readTemplate(JSON.stringify(template), config.components);
  expect(read.problems).toEqual([]);
  return read.template!;
}

const sourceOf = (id: string, t: Template | null): GallerySource => ({ id, load: async () => (t ? { template: t, problems: [] } : { template: null, problems: ["Broken."] }) });

/** A disk that fills up while photos are added, until `full.on` is false. */
function fillingApp() {
  const app = fakeApp();
  const full = { on: true };
  const invoke: typeof app.invoke = async (cmd, args, options) => {
    if (full.on && cmd === "site_write" && decodeURIComponent(options?.headers["x-crust-path"] ?? "").startsWith("content/media/")) throw "The disk is full.";
    return app.invoke(cmd, args, options);
  };
  return { ...app, invoke, full };
}

async function launchFresh(app: ReturnType<typeof fakeApp> = fakeApp()) {
  const launched = await launchDesktop(app.invoke);
  if (!("firstRun" in launched)) throw new Error("expected the welcome screen");
  return { app, context: launched.firstRun };
}

describe("first run: when it shows", () => {
  const site = (id: string, pages = 0) => ({ id, name: id, pages, edited: null, open: true });

  it("only for a brand new Crust", () => {
    expect(isFirstRun(false, "My site", [site("My site")], [])).toBe(true);
    // The site already has settings, or pages, or there are other sites, or something was deleted.
    expect(isFirstRun(true, "My site", [site("My site")], [])).toBe(false);
    expect(isFirstRun(false, "My site", [site("My site", 1)], [])).toBe(false);
    expect(isFirstRun(false, "My site", [site("My site"), site("Bakery", 3)], [])).toBe(false);
    expect(isFirstRun(false, "My site", [site("My site")], [{ id: "Old", name: "Old", deletedAt: 1, removedAt: 2 }])).toBe(false);
    expect(isFirstRun(false, "My site", [site("Other")], [])).toBe(false);
  });

  it("opens the welcome screen and leaves the empty site untouched", async () => {
    const { app, context } = await launchFresh();
    expect(context.id).toBe("My site");
    expect(context.folder).toBe("/Users/hosni/Documents/Crust/My site");
    expect(firstRunContext()).toBe(context);
    expect(app.sites.get("My site")!.files.size).toBe(0);
    // The builder's requests are answered already, so a template can be applied.
    const status = await (await window.fetch("/api/status")).json();
    expect(status.configured).toBe(true);
  });

  it("opens the site as before once it exists, or when there are other sites", async () => {
    const app = fakeApp();
    await makeFirstSite({ invoke: app.invoke, store: new LocalStore(tauriFolder(app.invoke)), id: "My site", folder: "/x" }, "My site", null);
    const launched = await launchDesktop(app.invoke);
    expect("content" in launched && launched.content.site.name).toBe("My site");

    const two = fakeApp();
    await two.invoke("sites_create", { name: "Bakery" });
    const again = await launchDesktop(two.invoke);
    expect("content" in again).toBe(true);
  });

  it("starts blank, as before, when the app can't list its sites", async () => {
    const app = fakeApp();
    const invoke: Invoke = async (cmd, args, options) => {
      if (cmd === "sites_list") throw "unknown command";
      return app.invoke(cmd, args, options);
    };
    const launched = await launchDesktop(invoke);
    expect("content" in launched && launched.content.site.name).toBe("My site");
  });
});

describe("first run: making the site", () => {
  it("starts blank under the chosen name, its folder renamed to match", async () => {
    const { app, context } = await launchFresh();
    const steps: string[] = [];
    expect(await makeFirstSite(context, "  Bakery   Lumière ", null, (s) => steps.push(stepText(s)))).toBeNull();
    expect(context.id).toBe("Bakery Lumière");
    expect(app.sites.has("My site")).toBe(false);
    expect(app.open()).toBe("Bakery Lumière");
    expect(settings(app, "Bakery Lumière").name).toBe("Bakery Lumière");
    expect(app.sites.get("Bakery Lumière")!.files.has("content/pages/index.json")).toBe(true);
    expect(await history(app, "Bakery Lumière")).toEqual(["Start a new site"]);
    expect(steps).toEqual(["Making your site…"]);
  });

  it("keeps the folder when the name is the folder's", async () => {
    const { app, context } = await launchFresh();
    expect(await makeFirstSite(context, BLANK_NAME, null)).toBeNull();
    expect([...app.sites.keys()]).toEqual(["My site"]);
  });

  it("refuses a missing or too long name, and writes nothing", async () => {
    const { app, context } = await launchFresh();
    expect(await makeFirstSite(context, "   ", null)).toBe("Give the site a name.");
    expect(await makeFirstSite(context, "x".repeat(81), null)).toMatch(/at most 80/);
    expect(app.sites.get("My site")!.files.size).toBe(0);
  });

  it("applies a starter template: its pages, look and photos, sample content still marked", async () => {
    const { app, context } = await launchFresh();
    const steps: string[] = [];
    expect(await makeFirstSite(context, "Harbour Studio", await starter(), (s) => steps.push(stepText(s)))).toBeNull();
    const folder = app.sites.get("Harbour Studio")!;
    const site = settings(app, "Harbour Studio");
    expect(site.name).toBe("Harbour Studio");
    expect(JSON.stringify(site.tokens)).toContain("#1f4d3a");
    const home = JSON.parse(decode(folder.files.get("content/pages/index.json"))!) as { puck: { content: { props: { placeholder?: string[] } }[] } };
    expect(home.puck.content[0]!.props.placeholder).toEqual(["text"]);
    expect(folder.files.has("content/media/harbour.png")).toBe(true);
    // The look lives in the site's settings, not in a working copy other sites would share.
    expect(localStorage.getItem("crust:draft:tokens")).toBeNull();
    expect(localStorage.getItem("crust:draft:chrome")).toBeNull();
    expect(steps).toEqual(["Making your site…", "Adding photos (0 of 1)…", "Adding the template's pages…"]);
    // Two saved changes: the blank start, then the template on top.
    expect((await history(app, "Harbour Studio", "content/pages/index.json")).length).toBe(2);
  });

  it("says what went wrong, and can be tried again", async () => {
    const disk = fillingApp();
    const { app, context } = await launchFresh(disk);
    const failed = await makeFirstSite(context, "Harbour Studio", await starter());
    expect(failed).toMatch(/The disk is full\..* Try again, or start blank\.$/);
    expect(failed).not.toMatch(/Nothing was replaced/);
    disk.full.on = false;
    expect(await makeFirstSite(context, "Harbour Studio", await starter())).toBeNull();
    expect([...app.sites.keys()]).toEqual(["Harbour Studio"]);
    expect(app.sites.get("Harbour Studio")!.files.has("content/media/harbour.png")).toBe(true);
  });
});

describe("first run: small rules", () => {
  it("lists the starters Harbour, Signal, Corner, then others; without the sample site", () => {
    expect(["corner", "zebra", "harbour", "signal"].sort(starterOrder)).toEqual(["harbour", "signal", "corner", "zebra"]);
    const ids = starterSources().map((s) => s.id);
    expect(ids.slice(0, 3)).toEqual(["harbour", "signal", "corner"]);
    expect(ids).not.toContain("sample-site");
  });

  it("suggests the template's own site name, or My site", async () => {
    expect(suggestedName(await starter())).toBe("Harbour Studio");
    expect(suggestedName(null)).toBe("My site");
  });

  it("asks the builder to open To replace once", () => {
    expect(wantsOpenToReplace()).toBe(false);
    sessionStorage.setItem("crust:open-to-replace", "1");
    expect(wantsOpenToReplace()).toBe(true);
    expect(takeOpenToReplace()).toBe(true);
    expect(takeOpenToReplace()).toBe(false);
  });
});

describe("first run: the welcome screen", () => {
  async function show(sources: GallerySource[], context?: FirstRunContext, app?: ReturnType<typeof fakeApp>) {
    const fresh = context ? null : await launchFresh(app);
    const ctx = context ?? fresh!.context;
    const onDone = vi.fn();
    render(<FirstRun context={ctx} sources={sources} onDone={onDone} />);
    await flush();
    await flush();
    return { onDone, app: fresh?.app, context: ctx };
  }

  it("greets, with focus on the heading, and offers the starters and Blank as one radio group", async () => {
    await show([sourceOf("harbour", await starter()), sourceOf("signal", await starter("Signal", "Signal & Co"))]);
    const heading = screen.getByRole("heading", { level: 1, name: "Welcome to Crust" });
    expect(document.activeElement).toBe(heading);
    expect(document.title).toBe("Welcome · Crust");
    const group = screen.getByRole("group", { name: "1. Start from" });
    const radios = within(group).getAllByRole("radio");
    expect(radios.map((r) => r.closest("label")!.querySelector("strong")!.textContent)).toEqual(["Harbour", "Signal", "Blank"]);
    // Each option says what's in it.
    expect(radios[0]!.closest("label")!.textContent).toContain("1 page, 1 photo");
    expect((radios[0] as HTMLInputElement).checked).toBe(true);
    expect(radios.every((r) => (r as HTMLInputElement).name === (radios[0] as HTMLInputElement).name)).toBe(true);
    expect((screen.getByLabelText("2. Your site’s name") as HTMLInputElement).value).toBe("Harbour Studio");
    expect(screen.getByText(/Sites are kept in \/Users\/hosni\/Documents\/Crust on this computer\./)).toBeTruthy();
  });

  it("leaves out a starter that won't load", async () => {
    await show([sourceOf("harbour", await starter()), sourceOf("broken", null)]);
    expect(within(screen.getByRole("group", { name: "1. Start from" })).getAllByRole("radio")).toHaveLength(2);
  });

  it("the name follows the pick until you type one", async () => {
    await show([sourceOf("harbour", await starter()), sourceOf("signal", await starter("Signal", "Signal & Co"))]);
    const name = screen.getByLabelText("2. Your site’s name") as HTMLInputElement;
    fireEvent.click(screen.getByRole("radio", { name: /Signal/ }));
    expect(name.value).toBe("Signal & Co");
    fireEvent.click(screen.getByRole("radio", { name: /Blank/ }));
    expect(name.value).toBe("My site");
    fireEvent.change(name, { target: { value: "Rina's bakery" } });
    fireEvent.click(screen.getByRole("radio", { name: /Harbour/ }));
    expect(name.value).toBe("Rina's bakery");
  });

  it("says what's wrong with the name, under the field, and keeps focus there", async () => {
    const { app } = await show([sourceOf("harbour", await starter())]);
    const name = screen.getByLabelText("2. Your site’s name") as HTMLInputElement;
    fireEvent.change(name, { target: { value: "  " } });
    fireEvent.click(screen.getByRole("button", { name: "Make my site" }));
    await flush();
    expect(name.getAttribute("aria-invalid")).toBe("true");
    expect(document.getElementById(name.getAttribute("aria-describedby")!)!.textContent).toBe("Give the site a name.");
    expect(document.activeElement).toBe(name);
    expect(app!.sites.get("My site")!.files.size).toBe(0);
  });

  it("makes a blank site with Enter in the name field", async () => {
    const { onDone, app } = await show([sourceOf("harbour", await starter())]);
    fireEvent.click(screen.getByRole("radio", { name: /Blank/ }));
    const name = screen.getByLabelText("2. Your site’s name");
    fireEvent.change(name, { target: { value: "Bakery" } });
    await act(async () => {
      fireEvent.submit(name.closest("form")!);
    });
    await waitFor(() => expect(onDone).toHaveBeenCalledWith(false));
    expect(settings(app!, "Bakery").name).toBe("Bakery");
  });

  it("makes the site from the chosen starter and lands with To replace open", async () => {
    const { onDone, app } = await show([sourceOf("harbour", await starter())]);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Make my site" }));
    });
    await waitFor(() => expect(onDone).toHaveBeenCalledWith(true));
    expect(app!.sites.get("Harbour Studio")!.files.has("content/media/harbour.png")).toBe(true);
  });

  it("shows a failure as an alert and gives the button back", async () => {
    const { onDone } = await show([sourceOf("harbour", await starter())], undefined, fillingApp());
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Make my site" }));
    });
    await waitFor(() => expect(screen.getByRole("alert").textContent).toMatch(/The disk is full\./));
    expect(onDone).not.toHaveBeenCalled();
    expect((screen.getByRole("button", { name: "Make my site" }) as HTMLButtonElement).disabled).toBe(false);
  });
});

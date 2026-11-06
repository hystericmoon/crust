// @vitest-environment happy-dom
/**
 * F057: several sites in the desktop app. The app's Rust side (tested in
 * crates/crust-desktop/src/sites.rs) moves the folders; here a fake app
 * with the same rules, over folders in memory, checks what the builder
 * does: the API (names, history, copies) and the Sites screen.
 */
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LocalStore, memoryFolder } from "../../server/local-store";
import { startDesktop } from "../desktop/desktop";
import { desktopContent, setDesktopContent } from "../desktop/content";
import { NOT_FOUND, PATH_HEADER, SITE_HEADER, tauriFolder, type Invoke } from "../desktop/tauri-folder";
import { PageList } from "../pages/PageList";
import { parseRoute } from "../App";
import { copyName, setSitesInvoke, siteNameProblem, sitesApi, sitesInvoke, tidyName, type DeletedSite, type SiteSummary, type SitesApi } from "./sites";
import { SitesScreen } from "./SitesScreen";

import { fakeApp } from "./fake-app";

afterEach(() => {
  cleanup();
  setDesktopContent(null);
  setSitesInvoke(null);
});

const decode = (bytes: Uint8Array | null | undefined) => (bytes ? new TextDecoder().decode(bytes) : null);
const flush = () => act(async () => {});
const tick = () => act(() => new Promise((ok) => setTimeout(ok, 0)));


const settings = (app: ReturnType<typeof fakeApp>, id: string) => JSON.parse(decode(app.sites.get(id)!.files.get("content/site.json"))!) as { name: string; baseUrl: string };
const history = async (app: ReturnType<typeof fakeApp>, id: string) => (await new LocalStore(tauriFolder(app.invoke, id)).recentCommits("content/site.json")).map((c) => c.message);

describe("sites: names", () => {
  it("tidies names and says what's wrong with them", () => {
    expect(tidyName("  Bakery   Lumière ")).toBe("Bakery Lumière");
    expect(siteNameProblem(" ", [])).toBe("Give the site a name.");
    expect(siteNameProblem("x".repeat(81), [])).toMatch(/at most 80/);
    expect(siteNameProblem("harbour", ["Harbour"])).toBe("You already have a site called “harbour”. Pick another name.");
    expect(siteNameProblem("Harbour 2", ["Harbour"])).toBeNull();
  });

  it("names a copy after its original, with a free name", () => {
    expect(copyName("Harbour", ["Harbour"])).toBe("Harbour copy");
    expect(copyName("Harbour", ["Harbour", "Harbour copy"])).toBe("Harbour copy 2");
    expect([...copyName("x".repeat(80), [])].length).toBeLessThanOrEqual(80);
  });

  it("only the desktop app has a Sites screen route", () => {
    expect(parseRoute("#/sites")).toEqual({ name: "sites" });
  });
});

describe("sites: what the builder does", () => {
  it("starts the open site with its folder's name and remembers the app", async () => {
    const app = fakeApp();
    app.sites.set("Bakery Lumière", memoryFolder());
    await app.invoke("sites_open", { id: "Bakery Lumière" });
    const original = window.fetch;
    try {
      const content = await startDesktop(app.invoke);
      expect(content.site.name).toBe("Bakery Lumière");
      expect(content.siteId).toBe("Bakery Lumière");
      expect(desktopContent()?.siteId).toBe("Bakery Lumière");
      expect(sitesInvoke()).toBe(app.invoke);
    } finally {
      window.fetch = original;
    }
  });

  it("creates a site with a Home page, in its own history", async () => {
    const app = fakeApp();
    const api = sitesApi(app.invoke, vi.fn());
    const id = await api.create("  Bakery   Lumière ");
    expect(id).toBe("Bakery Lumière");
    expect(settings(app, id).name).toBe("Bakery Lumière");
    expect(app.sites.get(id)!.files.has("content/pages/index.json")).toBe(true);
    expect(await history(app, id)).toEqual(["Start a new site"]);
    // The open site wasn't touched.
    expect(app.sites.get("My site")!.files.size).toBe(0);
  });

  it("renames a site's settings (a saved change) and its folder", async () => {
    const app = fakeApp();
    const api = sitesApi(app.invoke, vi.fn());
    const id = await api.create("Harbour");
    const site = (await api.list()).find((s) => s.id === id)!;
    const renamed = await api.rename(site, "Harbour Studio");
    expect(renamed).toBe("Harbour Studio");
    expect(app.sites.has("Harbour")).toBe(false);
    expect(settings(app, renamed).name).toBe("Harbour Studio");
    expect(await history(app, renamed)).toEqual(["Rename the site to “Harbour Studio”", "Start a new site"]);
  });

  it("duplicates a site with a new name and no site address", async () => {
    const app = fakeApp();
    const api = sitesApi(app.invoke, vi.fn());
    const id = await api.create("Harbour");
    const store = new LocalStore(tauriFolder(app.invoke, id));
    const s = JSON.parse((await store.readFile("content/site.json"))!);
    await store.commitFiles([{ path: "content/site.json", content: JSON.stringify({ ...s, baseUrl: "https://harbour.studio" }) }], "Set address");
    await store.markPublished();
    const site = (await api.list()).find((x) => x.id === id)!;
    const copy = await api.duplicate(site, "Harbour copy");
    expect(settings(app, copy)).toMatchObject({ name: "Harbour copy", baseUrl: "https://example.pages.dev" });
    expect(settings(app, id)).toMatchObject({ name: "Harbour", baseUrl: "https://harbour.studio" });
    // The copy carries the history, plus its own first change; not where the original was published.
    expect(await history(app, copy)).toEqual(["Copy of “Harbour”", "Set address", "Start a new site"]);
    expect(await new LocalStore(tauriFolder(app.invoke, copy)).lastPublished()).toBeNull();
  });

  it("deletes, restores and opens through the app", async () => {
    const app = fakeApp();
    const reload = vi.fn();
    const api = sitesApi(app.invoke, reload);
    const id = await api.create("Bakery");
    const bakery = (await api.list()).find((x) => x.id === id)!;
    expect(await api.remove(bakery)).toBe("My site");
    expect((await api.deleted()).map((d) => d.name)).toEqual(["Bakery"]);
    const [gone] = await api.deleted();
    expect(await api.restore(gone!)).toBe("Bakery");
    await api.open("Bakery");
    expect(app.open()).toBe("Bakery");
    expect(reload).toHaveBeenCalledOnce();
    await expect(api.open("Nope")).rejects.toThrow("isn't in the Crust folder");
  });
});

/** A Sites API over plain lists, to drive the screen. */
function fakeApi(over: Partial<SitesApi> = {}) {
  let sites: SiteSummary[] = [
    { id: "Harbour", name: "Harbour Studio", pages: 8, edited: Date.UTC(2026, 10, 1, 9, 26), open: true },
    { id: "Bakery", name: "Bakery Lumière", pages: 1, edited: Date.UTC(2026, 9, 30), open: false },
  ];
  let deleted: DeletedSite[] = [];
  const api: SitesApi = {
    list: vi.fn(async () => sites),
    deleted: vi.fn(async () => deleted),
    create: vi.fn(async (name: string) => {
      sites = [...sites, { id: name, name, pages: 1, edited: null, open: false }];
      return name;
    }),
    rename: vi.fn(async (site: SiteSummary, name: string) => {
      sites = sites.map((s) => (s.id === site.id ? { ...s, id: name, name } : s));
      return name;
    }),
    duplicate: vi.fn(async (_site: SiteSummary, name: string) => {
      sites = [...sites, { id: name, name, pages: 1, edited: 1, open: false }];
      return name;
    }),
    remove: vi.fn(async (site: SiteSummary) => {
      sites = sites.filter((s) => s.id !== site.id);
      deleted = [{ id: site.id, name: site.name, deletedAt: Date.UTC(2026, 10, 1), removedAt: Date.UTC(2026, 11, 1) }];
      return "Harbour";
    }),
    restore: vi.fn(async (d: DeletedSite) => {
      deleted = [];
      sites = [...sites, { id: d.id, name: d.name, pages: 1, edited: 1, open: false }];
      return d.id;
    }),
    open: vi.fn(async () => {}),
    ...over,
  };
  return api;
}

const showScreen = async (api = fakeApi()) => {
  render(<SitesScreen api={api} openName="Harbour Studio" />);
  await flush();
  return api;
};

describe("sites: the Sites screen", () => {
  it("lists the sites in a table, the open one marked in words", async () => {
    await showScreen();
    expect(screen.getByRole("heading", { level: 1, name: "Your sites" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Harbour Studio" }).getAttribute("href")).toBe("#/");
    const [, harbour, bakery] = within(screen.getByRole("table")).getAllByRole("row");
    expect(within(harbour!).getByText("Open")).toBeTruthy();
    expect(within(harbour!).getByText("8 pages")).toBeTruthy();
    expect(within(bakery!).getByText("1 page")).toBeTruthy();
    expect(within(bakery!).queryByText("Open")).toBeNull();
    for (const action of ["Rename", "Duplicate", "Delete"]) expect(within(bakery!).getByRole("button", { name: `${action} Bakery Lumière` })).toBeTruthy();
    // Nothing deleted: no Recently deleted.
    expect(screen.queryByRole("button", { name: /Recently deleted/ })).toBeNull();
  });

  it("opens another site; the open one just goes back to its pages", async () => {
    const api = await showScreen();
    location.hash = "#/sites";
    fireEvent.click(screen.getByRole("button", { name: "Harbour Studio" }));
    expect(location.hash).toBe("#/");
    expect(api.open).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Bakery Lumière" }));
    await flush();
    expect(api.open).toHaveBeenCalledWith("Bakery");
  });

  it("says why a site couldn't open", async () => {
    await showScreen(fakeApi({ open: vi.fn(async () => Promise.reject(new Error("The folder is gone."))) }));
    fireEvent.click(screen.getByRole("button", { name: "Bakery Lumière" }));
    await flush();
    expect(screen.getByRole("alert").textContent).toBe("Couldn't open “Bakery Lumière”: The folder is gone.");
  });

  it("makes a new site and opens it, after checking the name", async () => {
    const api = await showScreen();
    fireEvent.click(screen.getByRole("button", { name: "New site" }));
    const dialog = screen.getByRole("dialog", { name: "New site" });
    const field = within(dialog).getByLabelText("Site name");
    expect(document.activeElement).toBe(field);
    fireEvent.change(field, { target: { value: "bakery lumière" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Create site" }));
    await flush();
    expect(within(dialog).getByRole("alert").textContent).toBe("You already have a site called “bakery lumière”. Pick another name.");
    expect(field.getAttribute("aria-invalid")).toBe("true");
    fireEvent.change(field, { target: { value: "Rina's portfolio" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Create site" }));
    await flush();
    expect(api.create).toHaveBeenCalledWith("Rina's portfolio");
    expect(api.open).toHaveBeenCalledWith("Rina's portfolio");
  });

  it("Cancel and Escape give focus back to the button that opened the dialog", async () => {
    await showScreen();
    const rename = screen.getByRole("button", { name: "Rename Bakery Lumière" });
    rename.focus();
    fireEvent.click(rename);
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Cancel" }));
    await tick();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Rename Bakery Lumière" }));
  });

  it("renames another site in place and announces it", async () => {
    const api = await showScreen();
    fireEvent.click(screen.getByRole("button", { name: "Rename Bakery Lumière" }));
    const field = within(screen.getByRole("dialog")).getByLabelText("New name");
    expect((field as HTMLInputElement).value).toBe("Bakery Lumière");
    fireEvent.change(field, { target: { value: "Lumière Bakery" } });
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Rename" }));
    await flush();
    await tick();
    expect(api.rename).toHaveBeenCalledWith(expect.objectContaining({ id: "Bakery" }), "Lumière Bakery");
    expect(api.open).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("status").textContent).toBe("Renamed “Bakery Lumière” to “Lumière Bakery”.");
    expect(document.activeElement?.textContent).toBe("Lumière Bakery");
  });

  it("renaming the open site starts the builder again with its new name", async () => {
    const api = await showScreen();
    fireEvent.click(screen.getByRole("button", { name: "Rename Harbour Studio" }));
    fireEvent.change(within(screen.getByRole("dialog")).getByLabelText("New name"), { target: { value: "Harbour Jakarta" } });
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Rename" }));
    await flush();
    expect(api.open).toHaveBeenCalledWith("Harbour Jakarta");
  });

  it("keeping the same name changes nothing", async () => {
    const api = await showScreen();
    fireEvent.click(screen.getByRole("button", { name: "Rename Bakery Lumière" }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Rename" }));
    await flush();
    expect(api.rename).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("duplicates with a suggested name", async () => {
    const api = await showScreen();
    fireEvent.click(screen.getByRole("button", { name: "Duplicate Harbour Studio" }));
    const dialog = screen.getByRole("dialog", { name: "Duplicate “Harbour Studio”" });
    expect((within(dialog).getByLabelText("Name of the copy") as HTMLInputElement).value).toBe("Harbour Studio copy");
    expect(dialog.textContent).toContain("never publishes over the original");
    fireEvent.click(within(dialog).getByRole("button", { name: "Duplicate" }));
    await flush();
    await tick();
    expect(api.duplicate).toHaveBeenCalledWith(expect.objectContaining({ id: "Harbour" }), "Harbour Studio copy");
    expect(screen.getByRole("status").textContent).toBe("Made “Harbour Studio copy”, a copy of “Harbour Studio”.");
    expect(within(screen.getByRole("table")).getAllByRole("row")).toHaveLength(4);
  });

  it("shows the app's reason when a change fails, and keeps the dialog", async () => {
    await showScreen(fakeApi({ duplicate: vi.fn(async () => Promise.reject("Couldn't copy “Harbour”: disk full.")) }));
    fireEvent.click(screen.getByRole("button", { name: "Duplicate Harbour Studio" }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Duplicate" }));
    await flush();
    expect(within(screen.getByRole("dialog")).getByRole("alert").textContent).toBe("Couldn't copy “Harbour”: disk full.");
  });

  it("deletes after asking (focus on Keep site), then restores from Recently deleted", async () => {
    const api = await showScreen();
    fireEvent.click(screen.getByRole("button", { name: "Delete Bakery Lumière" }));
    const dialog = screen.getByRole("dialog", { name: "Delete “Bakery Lumière”?" });
    expect(document.activeElement).toBe(within(dialog).getByRole("button", { name: "Keep site" }));
    expect(dialog.textContent).toContain("restore it for 30 days");
    expect(dialog.textContent).toContain("live website isn't touched");
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete site" }));
    await flush();
    await tick();
    expect(api.remove).toHaveBeenCalledWith(expect.objectContaining({ id: "Bakery" }));
    expect(screen.getByRole("status").textContent).toBe("Moved “Bakery Lumière” to Recently deleted. You can restore it for 30 days.");
    expect(within(screen.getByRole("table")).getAllByRole("row")).toHaveLength(2);
    const disclosure = screen.getByRole("button", { name: "Recently deleted (1)" });
    expect(disclosure.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(disclosure);
    expect(screen.getByText(/removed for good on/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Restore Bakery Lumière" }));
    await flush();
    await tick();
    expect(api.restore).toHaveBeenCalled();
    expect(screen.getByRole("status").textContent).toBe("Restored “Bakery Lumière”.");
    expect(screen.queryByRole("button", { name: /Recently deleted/ })).toBeNull();
  });

  it("deleting the open site says another opens, and opens it", async () => {
    const api = await showScreen();
    fireEvent.click(screen.getByRole("button", { name: "Delete Harbour Studio" }));
    expect(screen.getByRole("dialog").textContent).toContain("opens your most recently edited other site");
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Delete site" }));
    await flush();
    expect(api.open).toHaveBeenCalledWith("Harbour");
  });

  it("says when the sites can't be read, with Try again", async () => {
    const list = vi.fn().mockRejectedValueOnce(new Error("The Crust folder is locked.")).mockResolvedValue([]);
    await showScreen(fakeApi({ list }));
    expect(screen.getByRole("alert").textContent).toContain("Couldn't read your sites: The Crust folder is locked.");
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await flush();
    expect(screen.queryByRole("alert")).toBeNull();
  });
});

describe("sites: the Pages screen", () => {
  // F086: All sites is the first item of the site menu, at the start of the top bar.
  it("leads with All sites in the app, and not on the web", () => {
    const { unmount } = render(<PageList allSites siteName="Harbour" rows={[]} sourceNote="" onCreate={() => {}} />);
    const menu = screen.getByRole("button", { name: /^Harbour\s*, site menu$/ });
    expect(menu.compareDocumentPosition(screen.getByRole("heading", { level: 1 })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    fireEvent.click(menu);
    const link = screen.getAllByRole("link")[0]!;
    expect(link.textContent).toBe("All sites");
    expect(link.getAttribute("href")).toBe("#/sites");
    unmount();
    render(<PageList siteName="Harbour" rows={[]} sourceNote="" onCreate={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /^Harbour\s*, site menu$/ }));
    expect(screen.queryByRole("link", { name: "All sites" })).toBeNull();
  });
});

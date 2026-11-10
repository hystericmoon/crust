// @vitest-environment happy-dom
/** F086: one app frame and top bar, the left icon bar, and saving on its own. */
import { readFileSync } from "node:fs";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "../App";
import { AppTopBar, PublishButton, setAppFrame, SiteMenu } from "./AppTopBar";
import { autosaveDelay, BROWSER_DELAY, createAutosaver, DESKTOP_DELAY, useAutosave, type SavePhase } from "./autosave";
import { statusText, statusTone } from "./status";
import { railPlugins } from "./rail";

vi.mock("../api-client", async (orig) => ({
  ...(await orig<typeof import("../api-client")>()),
  getStatus: async () => ({ ok: false, notConfigured: true, error: "Not switched on yet." }),
}));
vi.stubGlobal("fetch", async () => new Response("{}", { status: 404 }));

beforeEach(() => setAppFrame({ siteName: "Harbour Studio", desktop: false, pending: null }));
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  document.body.innerHTML = "";
  location.hash = "";
});

describe("app frame: saving on its own", () => {
  it("groups a burst of changes into one save once editing pauses", () => {
    vi.useFakeTimers();
    const save = vi.fn();
    const saver = createAutosaver<string>(save, 3000);
    saver.schedule("H");
    vi.advanceTimersByTime(1000);
    saver.schedule("He");
    vi.advanceTimersByTime(1000);
    saver.schedule("Hello");
    expect(saver.pending()).toBe(true);
    vi.advanceTimersByTime(2999);
    expect(save).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith("Hello");
    expect(saver.pending()).toBe(false);
  });

  it("saves what's waiting straight away on flush, and nothing when nothing waits", () => {
    vi.useFakeTimers();
    const save = vi.fn();
    const saver = createAutosaver<number>(save, 3000);
    saver.flush();
    expect(save).not.toHaveBeenCalled();
    saver.schedule(1);
    saver.flush();
    expect(save).toHaveBeenCalledWith(1);
    vi.advanceTimersByTime(5000);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it("waits longer in the browser (one GitHub save) than on the computer", () => {
    expect(BROWSER_DELAY).toBeGreaterThan(DESKTOP_DELAY);
    expect(autosaveDelay()).toBe(BROWSER_DELAY);
  });

  function Editor({ save, initial }: { save: (v: string) => Promise<SavePhase>; initial: string }) {
    const a = useAutosave<string>(save, (v) => v, initial);
    return (
      <>
        <input aria-label="Words" defaultValue={initial} onChange={(e) => a.schedule(e.currentTarget.value)} />
        <p data-testid="phase">{a.phase}</p>
      </>
    );
  }

  it("skips content that didn't change, saves on Ctrl+S and when the editor closes", async () => {
    vi.useFakeTimers();
    const save = vi.fn(async () => "saved" as const);
    const { unmount } = render(<Editor save={save} initial="Hi" />);
    const box = screen.getByRole("textbox", { name: "Words" });
    // Opening the page reports a "change" to the same content: no save.
    fireEvent.change(box, { target: { value: "Hi" } });
    vi.advanceTimersByTime(BROWSER_DELAY);
    expect(save).not.toHaveBeenCalled();

    fireEvent.change(box, { target: { value: "Hi there" } });
    expect(screen.getByTestId("phase").textContent).toBe("saving");
    fireEvent.keyDown(window, { key: "s", ctrlKey: true });
    expect(save).toHaveBeenCalledWith("Hi there");
    await act(async () => {});
    expect(screen.getByTestId("phase").textContent).toBe("saved");

    fireEvent.change(box, { target: { value: "Hi there!" } });
    unmount();
    expect(save).toHaveBeenLastCalledWith("Hi there!");
    expect(save).toHaveBeenCalledTimes(2);
  });
});

describe("app frame: the status line", () => {
  it("says where saving stands and what isn't live yet", () => {
    expect(statusText("saving", 3)).toBe("Saving…");
    expect(statusText("saved", 3)).toBe("Saved · 3 changes not live");
    expect(statusText("saved", 1)).toBe("Saved · 1 change not live");
    expect(statusText("saved", 0)).toBe("Saved · all live");
    expect(statusText("saved", null)).toBe("Saved");
    expect(statusText("local", null)).toBe("Kept in this browser");
    expect(statusText("held", null)).toBe("Kept in this browser");
    expect(statusText("failed", 3)).toBe("Not saved");
    // Screens that don't edit only say what's live.
    expect(statusText(null, 2)).toBe("2 changes not live");
    expect(statusText(null, 0)).toBe("All live");
    expect(statusText(null, null)).toBe("");
    expect(statusTone("failed", 0)).toBe("danger");
    expect(statusTone("saved", 2)).toBe("warn");
    expect(statusTone("saved", 0)).toBe("ok");
  });
});

describe("app frame: the top bar", () => {
  it("has the site menu first and Publish, with its count, as the one primary button", () => {
    setAppFrame({ pending: 3 });
    render(<AppTopBar where={<h1>Pages</h1>} tools={<button type="button">New page</button>} />);
    const bar = screen.getByRole("banner");
    const buttons = within(bar).getAllByRole("button");
    expect(buttons[0]).toBe(within(bar).getByRole("button", { name: /^Harbour Studio\s*, site menu$/ }));
    const publish = within(bar).getByRole("link", { name: /^Publish.*3 changes waiting$/ });
    expect(publish.getAttribute("href")).toBe("#/?focus=publish");
    expect(bar.querySelectorAll(".af-publish")).toHaveLength(1);
    expect(within(bar).getByText("3 changes not live")).toBeTruthy();
  });

  it("Publish can be a button that goes to the Publish panel on the same screen", () => {
    const go = vi.fn();
    render(<PublishButton onClick={go} />);
    fireEvent.click(screen.getByRole("button", { name: "Publish" }));
    expect(go).toHaveBeenCalled();
  });

  it("site menu: opens and closes with the keyboard, focus goes back to its button", () => {
    render(<SiteMenu />);
    const button = screen.getByRole("button", { name: /^Harbour Studio\s*, site menu$/ });
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("link", { name: "Site settings" })).toBeNull();
    fireEvent.click(button);
    expect(button.getAttribute("aria-expanded")).toBe("true");
    const names = screen.getAllByRole("link").map((l) => l.textContent);
    expect(names).toEqual(["Pages", "Posts", "Site settings", "Start from a template", "Sign out"]);
    fireEvent.keyDown(screen.getByRole("link", { name: "Posts" }), { key: "Escape" });
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(button);
  });

  it("site menu in the desktop app: All sites first, and no signing out", () => {
    setAppFrame({ desktop: true });
    render(<SiteMenu />);
    fireEvent.click(screen.getByRole("button", { name: /site menu/ }));
    const names = screen.getAllByRole("link").map((l) => l.textContent);
    expect(names[0]).toBe("All sites");
    expect(names).not.toContain("Sign out");
  });

  it("is on the Pages, Posts, Site settings and Templates screens", () => {
    for (const file of ["pages/PageList.tsx", "posts/PostList.tsx", "settings/SiteSettings.tsx", "templates/TemplatesScreen.tsx"]) {
      expect(readFileSync(`apps/admin/src/${file}`, "utf8"), file).toContain("<AppTopBar");
    }
  });
});

describe("app frame: the left icon bar", () => {
  it("offers Add, Layers, Pages, Styles, Media, Blog, Site and Help, in that order", () => {
    const plugins = railPlugins({ pages: () => [], hrefFor: (p) => p });
    expect(plugins.map((p) => p.label)).toEqual(["Add", "Layers", "Pages", "Styles", "Media", "Blog", "Site", "Help"]);
    // Add and Layers are Puck's block list and outline, so they replace Puck's own Blocks and Outline.
    expect(plugins.slice(0, 2).map((p) => p.name)).toEqual(["blocks", "outline"]);
  });

  it("the Pages panel links to each page in the builder", () => {
    const pages = railPlugins({ pages: () => [{ path: "/", title: "Home" }, { path: "/about", title: "About" }], hrefFor: (p) => `#/edit?path=${p}` });
    const Render = pages.find((p) => p.name === "pages")!.render!;
    render(<Render />);
    expect(screen.getByRole("link", { name: /About/ }).getAttribute("href")).toBe("#/edit?path=/about");
    expect(screen.getByRole("link", { name: "Manage pages" }).getAttribute("href")).toBe("#/");
  });
});

describe("app frame: the builder", () => {
  it("has the frame's top bar and no Save draft", async () => {
    location.hash = "#/edit?path=/";
    render(<App />);
    const undo = await screen.findByRole("button", { name: "Undo" }, { timeout: 5000 });
    const bar = undo.closest("header")!;
    expect(within(bar).getByRole("button", { name: /site menu/ })).toBeTruthy();
    expect(within(bar).getByRole("combobox", { name: "Page" })).toBeTruthy();
    expect(within(bar).getByRole("button", { name: "Redo" })).toBeTruthy();
    expect(within(bar).getByRole("button", { name: "Preview" }).getAttribute("aria-pressed")).toBe("false");
    expect(within(bar).getByRole("link", { name: /^Publish/ })).toBeTruthy();
    const widths = within(within(bar).getByRole("group", { name: "Page width" })).getAllByRole("button");
    expect(widths.map((b) => b.getAttribute("aria-label"))).toEqual(["Desktop width", "Tablet width", "Phone width"]);
    // Puck picks the width closest to the window; the test page has no size, so at most one is on.
    expect(widths.filter((b) => b.getAttribute("aria-pressed") === "true").length).toBeLessThanOrEqual(1);
    // Saving isn't on here: the browser keeps it.
    expect(within(bar).getByRole("status").textContent).toBe("Kept in this browser");
    expect(screen.queryByRole("button", { name: "Save draft" })).toBeNull();
  });

  it("presses Preview, the settings panel and a device width", async () => {
    location.hash = "#/edit?path=/";
    render(<App />);
    const preview = await screen.findByRole("button", { name: "Preview" }, { timeout: 5000 });
    fireEvent.click(preview);
    expect(preview.getAttribute("aria-pressed")).toBe("true");
    // F087: with nothing selected the panel starts closed; the button opens the page's settings.
    const panel = screen.getByRole("button", { name: "Settings panel" });
    expect(panel.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(panel);
    expect(panel.getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(panel);
    expect(panel.getAttribute("aria-pressed")).toBe("false");
    const phone = screen.getByRole("button", { name: "Phone width" });
    fireEvent.click(phone);
    expect(phone.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "Desktop width" }).getAttribute("aria-pressed")).toBe("false");
  });

  it("no builder offers Save draft any more", () => {
    expect(readFileSync("apps/admin/src/App.tsx", "utf8")).not.toMatch(/>\s*Save draft\s*</);
  });
});

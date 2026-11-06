// @vitest-environment happy-dom
/** F087 Page first: open on Home at fit width, a right panel that follows the selection, Next steps. */
import { readFileSync } from "node:fs";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App, parseRoute } from "../App";
import { setAppFrame } from "../app-frame/AppTopBar";
import { railPlugins } from "../app-frame/rail";
import { HOME_HREF, reloadBuilder } from "../sites/sites";
import {
  DESKTOP_MIN,
  fitWidth,
  isDesktopWidth,
  markNewSite,
  nextSteps,
  panelMode,
  resetPageFirst,
  setStepDone,
  skipNextSteps,
  startNextSteps,
} from "./store";

vi.mock("../api-client", async (orig) => ({
  ...(await orig<typeof import("../api-client")>()),
  getStatus: async () => ({ ok: false, notConfigured: true, error: "Not switched on yet." }),
}));
vi.stubGlobal("fetch", async () => new Response("{}", { status: 404 }));

beforeEach(() => {
  localStorage.clear();
  resetPageFirst();
  setAppFrame({ siteName: "Harbour Studio", desktop: false, pending: null });
});
afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
  location.hash = "";
});

describe("page first: opening a site", () => {
  it("lands on the Home page in the editor", () => {
    expect(parseRoute("")).toEqual({ name: "edit", path: "/" });
    expect(parseRoute("#")).toEqual({ name: "edit", path: "/" });
    expect(parseRoute(HOME_HREF)).toEqual({ name: "edit", path: "/" });
    // The pages list keeps its own address.
    expect(parseRoute("#/")).toEqual({ name: "pages" });
  });

  it("opening a site in the desktop app goes to its Home page, not the pages list", () => {
    const reload = vi.spyOn(window.location, "reload").mockImplementation(() => {});
    reloadBuilder();
    expect(location.hash).toBe(HOME_HREF);
    reload.mockRestore();
    expect(readFileSync("apps/admin/src/sites/SitesScreen.tsx", "utf8")).toMatch(/window\.location\.hash = HOME_HREF/);
  });

  it("the welcome screen marks the new site for Next steps", () => {
    expect(readFileSync("apps/admin/src/first-run/first-run.ts", "utf8")).toMatch(/markNewSite\(\);\s*window\.location\.hash = "#\/edit\?path=%2F"/);
  });
});

describe("page first: fit width", () => {
  it("draws the page as wide as the canvas, never narrower than a desktop", () => {
    expect(fitWidth(1180.6)).toBe(1180);
    expect(fitWidth(700)).toBe(DESKTOP_MIN);
    // So the page shows at 100% whenever the canvas is desktop-wide (no 57% default).
    expect(Math.min(1180 / fitWidth(1180), 1)).toBe(1);
  });

  it("any desktop width counts as Desktop; tablet and phone don't", () => {
    expect(isDesktopWidth(1180)).toBe(true);
    expect(isDesktopWidth(1024)).toBe(true);
    expect(isDesktopWidth(768)).toBe(false);
    expect(isDesktopWidth(375)).toBe(false);
    expect(isDesktopWidth("100%")).toBe(false);
  });
});

describe("page first: Next steps", () => {
  it("shows once for a new site, ticks per site, and Skip puts it away", () => {
    expect(startNextSteps("Harbour").show).toBe(false);
    markNewSite();
    expect(startNextSteps("Harbour").show).toBe(true);
    // The "new site" mark is used up.
    expect(startNextSteps("Other").show).toBe(false);
    setStepDone("Harbour", "phone", true);
    setStepDone("Harbour", "phone", true);
    expect(nextSteps("Harbour").done).toEqual(["phone"]);
    skipNextSteps("Harbour");
    resetPageFirst();
    expect(nextSteps("Harbour")).toEqual({ show: false, done: ["phone"] });
  });
});

const openBuilder = async () => {
  location.hash = "#/edit?path=/";
  render(<App />);
  return screen.findByRole("button", { name: "Page settings" }, { timeout: 5000 });
};
const panelShown = () => screen.getByRole("button", { name: "Settings panel" }).getAttribute("aria-pressed") === "true";

describe("page first: the right panel", () => {
  it("is closed with nothing selected; Page settings opens the title and search settings", async () => {
    const settings = await openBuilder();
    expect(panelShown()).toBe(false);
    fireEvent.click(settings);
    await waitFor(() => expect(panelShown()).toBe(true));
    expect(settings.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getAllByText("Page title").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Search title/).length).toBeGreaterThan(0);
    // Pressed again, it closes.
    fireEvent.click(settings);
    await waitFor(() => expect(panelShown()).toBe(false));
  });

  it("a new site opens with Next steps; Skip closes it and Help brings it back", async () => {
    markNewSite();
    await openBuilder();
    const heading = await screen.findByRole("heading", { name: "Next steps" });
    expect(heading).toBeTruthy();
    expect(panelShown()).toBe(true);
    const boxes = screen.getAllByRole("checkbox");
    expect(boxes.length).toBe(4);
    // Nothing marked "Replace me" on this page: that step is already ticked.
    await waitFor(() => expect((screen.getByRole("checkbox", { name: "Replace the sample words and photos" }) as HTMLInputElement).checked).toBe(true));
    // Steps are real checkboxes with labels, ticked by hand too.
    const publish = screen.getByRole("checkbox", { name: "Publish when you're ready" });
    fireEvent.click(publish);
    expect((publish as HTMLInputElement).checked).toBe(true);
    // "See it on a phone" ticks itself at phone width.
    fireEvent.click(screen.getByRole("button", { name: "Switch to phone width" }));
    await waitFor(() => expect((screen.getByRole("checkbox", { name: "See it on a phone" }) as HTMLInputElement).checked).toBe(true));

    fireEvent.click(screen.getByRole("button", { name: "Skip" }));
    await waitFor(() => expect(panelShown()).toBe(false));
    expect(screen.queryByRole("heading", { name: "Next steps" })).toBeNull();
    expect(panelMode()).toBe(null);

    // Help → "Next steps for a new site".
    fireEvent.click(screen.getByRole("button", { name: "Help" }));
    fireEvent.click(await screen.findByRole("button", { name: "Next steps for a new site" }));
    expect(await screen.findByRole("heading", { name: "Next steps" })).toBeTruthy();
    await act(async () => {});
    expect(panelShown()).toBe(true);
  });

  it("an older site opens with no list and no panel", async () => {
    await openBuilder();
    expect(screen.queryByRole("heading", { name: "Next steps" })).toBeNull();
    expect(panelShown()).toBe(false);
  });
});

describe("page first: blocks live in the Add panel", () => {
  it("the first icon on the left is Add, holding layouts and the block list", () => {
    const [add] = railPlugins({ pages: () => [], hrefFor: (p) => p });
    expect(add?.label).toBe("Add");
  });

  it("the page's settings say whose they are", () => {
    const src = readFileSync("apps/admin/src/App.tsx", "utf8");
    expect(src).toMatch(/withSettingsLabel\(withSeoEditing\(editorConfig\), "Page settings"\)/);
    expect(src).toMatch(/withSettingsLabel\(withPostEditing\(editorConfig\), "Post settings"\)/);
  });
});

// @vitest-environment happy-dom
import { readFileSync } from "node:fs";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App, SIGN_OUT_URL, SignOutLink } from "./App";
import { CANVAS_TITLE, fixPuckChrome, installPuckChromeFixes, LOADING_LABEL, ZOOM_LABEL } from "./keyboard/puck-chrome";

// Offline, like a preview link before GitHub is switched on.
vi.mock("./api-client", async (orig) => ({
  ...(await orig<typeof import("./api-client")>()),
  getStatus: async () => ({ ok: false, notConfigured: true, error: "Not switched on yet." }),
}));
// Nothing else reaches a server either.
vi.stubGlobal("fetch", async () => new Response("{}", { status: 404 }));

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
  location.hash = "";
});

describe("tidy-up: Sign out (F040)", () => {
  it("links to Cloudflare Access's sign-out address", () => {
    render(<SignOutLink />);
    const link = screen.getByRole("link", { name: "Sign out" });
    expect(link.getAttribute("href")).toBe("/cdn-cgi/access/logout");
    expect(SIGN_OUT_URL).toBe("/cdn-cgi/access/logout");
  });

  // F086: in the site menu of the builder's top bar.
  it("is in the page builder's top bar", async () => {
    location.hash = "#/edit?path=/";
    render(<App />);
    fireEvent.click(await screen.findByRole("button", { name: /site menu/ }, { timeout: 5000 }));
    const link = await screen.findByRole("link", { name: "Sign out" });
    expect(link.getAttribute("href")).toBe(SIGN_OUT_URL);
  });

  // F069 moved it after New page, past a divider, so a slip doesn't sign out.
  // F086: in the site menu, as its last item after a divider, away from New page.
  it("is on the Pages screen, in the site menu, away from New page", async () => {
    location.hash = "#/";
    render(<App />);
    const newPage = await screen.findByRole("button", { name: "New page" }, { timeout: 5000 });
    fireEvent.click(screen.getByRole("button", { name: /site menu/ }));
    const link = screen.getByRole("link", { name: "Sign out" });
    expect(link.getAttribute("href")).toBe(SIGN_OUT_URL);
    expect(link.closest("li")?.className).toBe("af-menu-end");
    expect(newPage.closest(".af-menu")).toBeNull();
  });

  it("is in the post builder's top bar too", () => {
    const source = readFileSync("apps/admin/src/App.tsx", "utf8");
    const postBuilder = source.slice(source.indexOf("function PostBuilder"), source.indexOf("function QuickEditScreen"));
    expect(postBuilder).toContain("header: EditorBar");
  });
});

/** Puck's chrome as it renders it (0.23), before our fixes. */
const puckChrome = `
  <div class="Puck">
    <div class="_ViewportControls-zoom_v26yb_79"><select class="_ViewportControls-zoomSelect_v26yb_79"><option value="1">100%</option></select></div>
    <div class="_PuckCanvas-loader_zw9iy_73"><span class="_Loader_1w5zn_13" aria-label="loading"></span></div>
    <iframe id="preview-frame"></iframe>
  </div>`;

describe("tidy-up: Puck's builder chrome (F040)", () => {
  it("names the canvas, the zoom menu and the loading spinner", () => {
    document.body.innerHTML = puckChrome;
    fixPuckChrome(document);
    expect(document.querySelector("iframe")!.getAttribute("title")).toBe(CANVAS_TITLE);
    expect(document.querySelector("select")!.getAttribute("aria-label")).toBe(ZOOM_LABEL);
    const loader = document.querySelector("[class*='_Loader_']")!;
    expect(loader.getAttribute("role")).toBe("progressbar");
    expect(loader.getAttribute("aria-label")).toBe(LOADING_LABEL);
  });

  it("keeps names Puck (or a later version) already gives", () => {
    document.body.innerHTML = puckChrome.replace("<iframe ", '<iframe title="Preview" ').replace("<select ", '<select aria-label="Zoom level" ');
    fixPuckChrome(document);
    expect(document.querySelector("iframe")!.getAttribute("title")).toBe("Preview");
    expect(document.querySelector("select")!.getAttribute("aria-label")).toBe("Zoom level");
  });

  it("fixes chrome Puck renders later", async () => {
    const remove = installPuckChromeFixes(document);
    await act(async () => {
      document.body.innerHTML = puckChrome;
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(document.querySelector("iframe")!.getAttribute("title")).toBe(CANVAS_TITLE);
    remove();
    document.body.innerHTML = puckChrome;
    await new Promise((r) => setTimeout(r, 0));
    expect(document.querySelector("iframe")!.getAttribute("title")).toBeNull();
  });

  it("gives the block-list headings readable contrast", () => {
    const css = readFileSync("apps/admin/src/keyboard/keyboard.css", "utf8");
    expect(css).toMatch(/\.Puck \[class\*="_ComponentList-title_"\] \{ color: var\(--app-mute\); \}/);
  });

  it("runs the builder's own axe check with the published-page checks", () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf8")) as { scripts: Record<string, string> };
    expect(pkg.scripts["check:a11y"]).toContain("check:builder");
    expect(pkg.scripts["check:builder"]).toBe("node scripts/check-builder-a11y.mjs");
    const ci = readFileSync(".github/workflows/ci.yml", "utf8");
    expect(ci.indexOf("run: npm run build", ci.indexOf("site-checks:"))).toBeLessThan(ci.indexOf("run: npm run check:a11y"));
  });
});

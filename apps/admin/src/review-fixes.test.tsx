// @vitest-environment happy-dom
// F069: fixes from Claude's review of 48 features (DECISIONS.md, Proposals, "From the review").
import { config } from "@crust/blocks";
import type { Config } from "@puckeditor/core";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PendingChanges } from "./api-client";
import { KeyboardCanvas, KeyboardRoot, skipToPage } from "./keyboard/KeyboardEditing";
import { fixPuckChrome, installPuckChromeFixes } from "./keyboard/puck-chrome";
import { Dialog } from "./pages/PageActions";
import { withoutDraftPages } from "./publish/changes";
import { PublishPanel } from "./publish/PublishPanel";
import { SaveStatus, useSaveStatus } from "./save-status";

vi.mock("@puckeditor/core", async (orig) => ({
  ...(await orig<typeof import("@puckeditor/core")>()),
  useGetPuck: () => () => ({ config: config as unknown as Config, appState: { data: { root: { props: {} }, content: [] } }, getItemById: () => undefined }),
}));

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const tick = () => new Promise((r) => setTimeout(r, 0));

// Puck's left rail, as it renders it: <li> with a clickable <div> and no tab stop.
const rail = `
  <nav><ul>
    <li class="_NavItem_vll2r_39 _NavItem--active_vll2r_100"><div class="_NavItem-link_vll2r_39"><span>Blocks</span></div></li>
    <li class="_NavItem_vll2r_39"><div class="_NavItem-link_vll2r_39"><span>Outline</span></div></li>
  </ul></nav>`;

describe("review-fixes 1: Blocks / Outline and Skip to page (F005)", () => {
  it("makes the rail items toggle buttons that say which view shows", () => {
    document.body.innerHTML = rail;
    fixPuckChrome(document);
    const [blocks, outline] = [...document.querySelectorAll<HTMLElement>("[class*='_NavItem-link_']")];
    for (const item of [blocks!, outline!]) {
      expect(item.getAttribute("role")).toBe("button");
      expect(item.tabIndex).toBe(0);
    }
    expect(blocks!.getAttribute("aria-pressed")).toBe("true");
    expect(outline!.getAttribute("aria-pressed")).toBe("false");
  });

  it("presses a rail item with Enter or Space, and updates which is pressed", async () => {
    document.body.innerHTML = rail;
    const remove = installPuckChromeFixes(document);
    const [blocks, outline] = [...document.querySelectorAll<HTMLElement>("[class*='_NavItem-link_']")];
    const clicked = vi.fn(() => {
      // What Puck does: move the active class.
      blocks!.parentElement!.className = "_NavItem_vll2r_39";
      outline!.parentElement!.className = "_NavItem_vll2r_39 _NavItem--active_vll2r_100";
    });
    outline!.addEventListener("click", clicked);
    const enter = new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true });
    outline!.dispatchEvent(enter);
    expect(clicked).toHaveBeenCalledTimes(1);
    expect(enter.defaultPrevented).toBe(true);
    outline!.dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true, cancelable: true }));
    expect(clicked).toHaveBeenCalledTimes(2);
    // Other keys are left alone.
    outline!.dispatchEvent(new KeyboardEvent("keydown", { key: "a", bubbles: true }));
    expect(clicked).toHaveBeenCalledTimes(2);
    await act(async () => tick());
    expect(outline!.getAttribute("aria-pressed")).toBe("true");
    expect(blocks!.getAttribute("aria-pressed")).toBe("false");
    remove();
  });

  it("puts a Skip to page link first in the builder, which focuses the first block", async () => {
    document.body.innerHTML = "";
    render(
      <KeyboardRoot>
        <button type="button">Pages</button>
        <KeyboardCanvas document={document}>
          <div data-puck-component="heading-1" tabIndex={0}>
            Heading
          </div>
          <div data-puck-component="text-1" tabIndex={0}>
            Text
          </div>
        </KeyboardCanvas>
      </KeyboardRoot>,
    );
    const skip = screen.getByRole("link", { name: "Skip to page" });
    // First thing Tab reaches.
    const focusable = document.querySelectorAll("a[href], button, [tabindex='0']");
    expect(focusable[0]).toBe(skip);
    fireEvent.click(skip);
    expect(document.activeElement?.getAttribute("data-puck-component")).toBe("heading-1");
  });

  it("focuses the canvas itself when the page is empty", () => {
    document.body.innerHTML = `<iframe id="preview-frame" title="Page preview"></iframe>`;
    expect(skipToPage()).toBe(true);
    expect(document.activeElement?.id).toBe("preview-frame");
  });

  it("is visible when it has focus", () => {
    const css = readFileSync("apps/admin/src/keyboard/keyboard.css", "utf8");
    expect(css).toMatch(/\.kb-skip:focus \{ transform: none;/);
  });
});

describe("review-fixes 2: focus returns when a dialog closes (F022, F015, F013)", () => {
  function Opener() {
    const [open, setOpen] = useState(false);
    return (
      <>
        <button type="button" onClick={() => setOpen(true)}>
          Open it
        </button>
        {open ? (
          <Dialog labelledBy="d-h" onClose={() => setOpen(false)}>
            <h2 id="d-h">A question</h2>
            <button type="button" autoFocus onClick={() => setOpen(false)}>
              Close it
            </button>
          </Dialog>
        ) : null}
      </>
    );
  }

  it("puts focus back on the button that opened it", async () => {
    render(<Opener />);
    const opener = screen.getByRole("button", { name: "Open it" });
    opener.focus();
    await act(async () => opener.click());
    const close = screen.getByRole("button", { name: "Close it" });
    close.focus();
    await act(async () => close.click());
    await act(async () => tick());
    expect(document.activeElement).toBe(opener);
  });

  it("returns to Publish after Cancel on the publish-drafts question", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ ok: true, runs: [], liveUrl: null }), { headers: { "Content-Type": "application/json" } })));
    const changes: PendingChanges = { lastPublish: { at: "2026-10-28T09:00:00Z", url: "#" }, pages: [], removed: [], moved: [], site: false, redirects: false };
    render(<PublishPanel githubOn siteUrl="https://example.pages.dev" changes={changes} drafts={[{ path: "/", title: "Home" }]} onSaveDrafts={vi.fn(async () => null)} />);
    await act(async () => {});
    const publish = screen.getByRole("button", { name: "Publish 1 change" });
    publish.focus();
    await act(async () => publish.click());
    await act(async () => within(screen.getByRole("dialog")).getByRole("button", { name: "Cancel" }).click());
    await act(async () => tick());
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(publish);
  });

  it("moves focus to the current preset (or the heading) after Undo preset", () => {
    const source = readFileSync("apps/admin/src/settings/SiteSettings.tsx", "utf8");
    const undo = source.slice(source.indexOf("Undid ${beforePreset.name}"), source.indexOf("Undo preset ({beforePreset.name})"));
    expect(undo).toContain(`#presets .st-preset[aria-pressed='true']`);
    expect(undo).toContain(`document.getElementById("presets-h")`);
  });
});

describe("review-fixes 6: failed saves and publishes (F006, F008)", () => {
  function Harness({ failed, retry }: { failed: boolean; retry?: () => void }) {
    const status = useSaveStatus();
    return (
      <>
        <button type="button" onClick={() => status.show(failed ? "Page not saved to GitHub: offline." : "Page saved to GitHub.", failed, retry)}>
          Save
        </button>
        <SaveStatus note={status.note} onDismiss={status.clear} />
      </>
    );
  }

  it("keeps a failed save on screen as an alert with Try again", async () => {
    vi.useFakeTimers();
    const retry = vi.fn();
    render(<Harness failed retry={retry} />);
    act(() => screen.getByRole("button", { name: "Save" }).click());
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("Page not saved to GitHub: offline.");
    act(() => vi.advanceTimersByTime(60_000));
    expect(screen.getByRole("alert")).toBe(alert);
    act(() => within(alert).getByRole("button", { name: "Try again" }).click());
    expect(retry).toHaveBeenCalledTimes(1);
    act(() => within(alert).getByRole("button", { name: "Dismiss" }).click());
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("lets a successful save go after 10 seconds", () => {
    vi.useFakeTimers();
    render(<Harness failed={false} />);
    act(() => screen.getByRole("button", { name: "Save" }).click());
    expect(screen.getByRole("status").textContent).toBe("Page saved to GitHub.");
    expect(screen.queryByRole("alert")).toBeNull();
    act(() => vi.advanceTimersByTime(10_000));
    expect(screen.getByRole("status").textContent).toBe("");
  });

  it("builders use it, and only GitHub problems count as failed", async () => {
    const { saveFailed } = await import("./App");
    expect(saveFailed({ ok: false, error: "x" })).toBe(true);
    expect(saveFailed({ ok: false, notConfigured: true, error: "x" })).toBe(false);
    expect(saveFailed({ ok: true } as never)).toBe(false);
    const app = readFileSync("apps/admin/src/App.tsx", "utf8");
    expect(app.match(/<SaveStatus note=\{status\.note\}/g)?.length).toBe(2);
    expect(readFileSync("apps/admin/src/linked/SectionEditor.tsx", "utf8")).toContain("<SaveStatus note={status.note}");
  });

  const runsFetch = (runs: unknown[]) =>
    vi.fn(async (_url: string, init?: RequestInit) =>
      init?.method === "POST"
        ? new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } })
        : new Response(JSON.stringify({ ok: true, runs, liveUrl: null }), { headers: { "Content-Type": "application/json" } }),
    );
  const run = (status: string, conclusion: string | null) => ({ id: 7, status, conclusion, createdAt: "2026-11-01T09:00:00Z", url: "https://github.com/x/actions/runs/7" });

  it("clears 'Publishing started' when the run ends, and offers Try again on a failed run", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const fetchMock = runsFetch([]);
    vi.stubGlobal("fetch", fetchMock);
    render(<PublishPanel githubOn siteUrl="https://example.pages.dev" />);
    await act(async () => {});
    await act(async () => screen.getByRole("button", { name: "Publish site" }).click());
    expect(screen.getByText(/Publishing started/)).toBeTruthy();
    // The run shows up, then fails.
    fetchMock.mockImplementation(runsFetch([run("in_progress", null)]));
    await act(async () => vi.advanceTimersByTime(4000));
    await act(async () => {});
    expect(screen.getByText(/Publishing started/)).toBeTruthy();
    fetchMock.mockImplementation(runsFetch([run("completed", "failure")]));
    await act(async () => vi.advanceTimersByTime(10_000));
    await act(async () => {});
    expect(screen.getByText("Failed. Nothing changed on the live site.")).toBeTruthy();
    expect(screen.queryByText(/Publishing started/)).toBeNull();
    const again = screen.getByRole("button", { name: "Try again" });
    fetchMock.mockClear();
    await act(async () => again.click());
    expect(fetchMock.mock.calls.some(([, init]) => (init as RequestInit | undefined)?.method === "POST")).toBe(true);
  });

  it("offers Try again when publishing couldn't start", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init?: RequestInit) =>
        init?.method === "POST"
          ? new Response(JSON.stringify({ ok: false, error: "GitHub is down." }), { status: 502, headers: { "Content-Type": "application/json" } })
          : new Response(JSON.stringify({ ok: true, runs: [] }), { headers: { "Content-Type": "application/json" } }),
      ),
    );
    render(<PublishPanel githubOn siteUrl="https://example.pages.dev" />);
    await act(async () => {});
    await act(async () => screen.getByRole("button", { name: "Publish site" }).click());
    await act(async () => {});
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("GitHub is down.");
    expect(within(alert).getByRole("button", { name: "Try again" })).toBeTruthy();
  });
});

describe("review-fixes 10: polish", () => {
  it("counts a page with a browser draft once in Publish (F022)", async () => {
    const changes: PendingChanges = {
      lastPublish: { at: "2026-10-28T09:00:00Z", url: "#" },
      pages: [
        { path: "/about", change: "edited" },
        { path: "/team", change: "new" },
      ],
      removed: [],
      moved: [],
      site: false,
      redirects: false,
    };
    expect(withoutDraftPages(changes, ["/about"]).pages).toEqual([{ path: "/team", change: "new" }]);
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ ok: true, runs: [], liveUrl: null }), { headers: { "Content-Type": "application/json" } })));
    render(
      <PublishPanel
        githubOn
        siteUrl="https://example.pages.dev"
        changes={changes}
        titles={new Map([["/about", "About us"], ["/team", "Team"]])}
        drafts={[{ path: "/about", title: "About us" }]}
        onSaveDrafts={vi.fn(async () => null)}
      />,
    );
    await act(async () => {});
    expect(screen.getByRole("button", { name: "Publish 2 changes" })).toBeTruthy();
    const items = screen.getAllByRole("listitem").map((li) => li.textContent);
    expect(items).toEqual(["About us (/about): changes in this browser, saved when you publish", "Team (/team): new page"]);
  });

  it("puts Sign out last in the builders' top bars, after a divider (F040)", () => {
    const app = readFileSync("apps/admin/src/App.tsx", "utf8");
    for (const name of ["function Builder(", "function PostBuilder("]) {
      const part = app.slice(app.indexOf(name));
      const bar = part.slice(part.indexOf("headerActions"), part.indexOf("puck: BuilderRoot"));
      expect(bar.indexOf("<SignOutLink />")).toBeGreaterThan(bar.indexOf("<SaveDraftButton"));
    }
    const signOut = readFileSync("apps/admin/src/sign-out.tsx", "utf8");
    expect(signOut).toContain(`className="crust-signout-divider" aria-hidden="true"`);
  });
});

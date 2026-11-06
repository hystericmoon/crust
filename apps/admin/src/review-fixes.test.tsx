// @vitest-environment happy-dom
// F069: fixes from Claude's review of 48 features (DECISIONS.md, Proposals, "From the review").
import { config } from "@crust/blocks";
import type { Config } from "@puckeditor/core";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PendingChanges } from "./api-client";
import { fillAltText, withMediaFields } from "./media/fields";
import { resetMediaStore } from "./media/store";
import { QuickEdit } from "./quick/QuickEdit";
import { fitActionBars, KeyboardCanvas, KeyboardRoot, skipToPage } from "./keyboard/KeyboardEditing";
import { planInsert, ROOT_ZONE } from "./keyboard/moves";
import { fixPuckChrome, installPuckChromeFixes } from "./keyboard/puck-chrome";
import { Dialog } from "./pages/PageActions";
import { breakablePath, PageList, relinkedNote } from "./pages/PageList";
import { roleForElement } from "./settings/pick";
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

  it("moves focus to the current look (or the heading) after Undo style", () => {
    // F072: the Style library replaced the presets; the focus rule stays.
    const source = readFileSync("apps/admin/src/settings/SiteSettings.tsx", "utf8");
    const undo = source.slice(source.indexOf("Undid ${beforePreset.name}"), source.indexOf("Undo style ({beforePreset.name})"));
    expect(undo).toContain(`#presets .st-look[aria-pressed='true']`);
    expect(undo).toContain(`document.getElementById("presets-h")`);
  });

  it("puts Undo style above the 12 looks, next to the message that mentions it (F072 review)", () => {
    const source = readFileSync("apps/admin/src/settings/SiteSettings.tsx", "utf8");
    expect(source.indexOf("Undo style ({beforePreset.name})")).toBeLessThan(source.indexOf("<StyleLibrary\n"));
  });
});

describe("review-fixes 5: no sideways canvas jump (F025, F027, F043)", () => {
  it("caps the action bar at the room left of its right edge, in unscaled pixels", () => {
    document.body.innerHTML = `<div class="_DraggableComponent-actions_1627v_89" style="transform: scale(1.75); right: 0px"><div class="_ActionBar_5vdfr_1"></div></div>`;
    const bar = document.querySelector<HTMLElement>("[class*='_DraggableComponent-actions_']")!;
    bar.getBoundingClientRect = () => ({ right: 1184, left: -237 }) as DOMRect;
    Object.defineProperty(document.documentElement, "clientWidth", { configurable: true, value: 1280 });
    fitActionBars(document);
    // (1184 - 8) / 1.75 = 672
    expect(bar.style.maxWidth).toBe("672px");
  });

  it("puts a canvas that was scrolled sideways back", () => {
    const scrollTo = vi.fn();
    Object.defineProperty(window, "scrollX", { configurable: true, value: 950 });
    vi.stubGlobal("scrollTo", scrollTo);
    window.scrollTo = scrollTo;
    fitActionBars(document);
    expect(scrollTo).toHaveBeenCalledWith({ left: 0, top: window.scrollY });
    Object.defineProperty(window, "scrollX", { configurable: true, value: 0 });
  });

  it("lets the action bar wrap onto more rows", () => {
    const css = readFileSync("apps/admin/src/sections/sections.css", "utf8");
    expect(css).toContain(`[class*="_DraggableComponent-actions_"] > [class*="_ActionBar_"] { flex-wrap: wrap;`);
    expect(css).toContain(`[class*="_DraggableComponent-actions_"] [class*="_ActionBar-group_"] { height: auto;`);
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

describe("review-fixes 8: the rename message says how many links changed (F018)", () => {
  it("counts the links and names where they were", () => {
    expect(relinkedNote([])).toBe("");
    expect(relinkedNote([{ path: "/", title: "Home", count: 1 }])).toBe(" It also updated 1 link to the new address: Home (1).");
    expect(
      relinkedNote([
        { path: "/", title: "Home", count: 2 },
        { path: "content/site.json", title: "Site header and footer", count: 1 },
      ]),
    ).toBe(" It also updated 3 links to the new address: Home (2), Site header and footer (1).");
  });

  it("shows it after a rename", async () => {
    const rows = [
      { path: "/", title: "Home", lastEdited: null, localChanges: false, inRepo: true },
      { path: "/menu", title: "Menu", lastEdited: null, localChanges: false, inRepo: true },
    ];
    const onRename = vi.fn(async () => ({ relinked: [{ path: "content/site.json", title: "Site header and footer", count: 2 }] }));
    render(<PageList siteName="Bakery" rows={rows} githubOn onRename={onRename} onDelete={vi.fn(async () => null)} sourceNote="" onCreate={vi.fn()} />);
    await act(async () => screen.getByRole("button", { name: "Rename Menu" }).click());
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("New address"), { target: { value: "food" } });
    await act(async () => within(dialog).getByRole("button", { name: "Change address" }).click());
    expect(onRename).toHaveBeenCalledWith(rows[1], "/food");
    expect(document.body.textContent).toContain(
      "Changed the address of “Menu” to /food. Once you publish, /menu sends visitors there. It also updated 2 links to the new address: Site header and footer (2).",
    );
  });
});

describe("review-fixes 9: a library photo's description on a new Image block (F034)", () => {
  const library = [{ file: "mugs.jpg", alt: "Clay mugs on a shelf", width: 2400, height: 1600, bytes: 1, uploadedAt: "2026-10-30T00:00:00Z" }];
  const pairs: [string, string][] = [["src", "alt"]];

  it("fills an empty alt text even when Puck has no earlier version of the block", () => {
    resetMediaStore({ status: "ready", items: library });
    expect(fillAltText({ src: "/media/mugs.jpg", alt: "" }, null, pairs)).toEqual({ src: "/media/mugs.jpg", alt: "Clay mugs on a shelf" });
    // The owner's own words stay; so does a block with no photo yet.
    const mine = { src: "/media/mugs.jpg", alt: "Our mugs" };
    expect(fillAltText(mine, null, pairs)).toBe(mine);
    const empty = { src: "", alt: "" };
    expect(fillAltText(empty, null, pairs)).toBe(empty);
  });

  it("works through the Image block's resolveData on its first pick", async () => {
    resetMediaStore({ status: "ready", items: library });
    const cfg = withMediaFields(config as never) as unknown as Config;
    const resolve = cfg.components.Image!.resolveData as unknown as (d: unknown, p: unknown) => Promise<{ props: Record<string, unknown> }>;
    const out = await resolve({ props: { id: "Image-new", src: "/media/mugs.jpg", alt: "" } }, { lastData: null, changed: { src: true } });
    expect(out.props.alt).toBe("Clay mugs on a shelf");
  });

  it("names the block in the phone picker, not 'part 6'", () => {
    resetMediaStore({ status: "ready", items: library });
    const page = {
      path: "/",
      title: "Home",
      description: "Welcome",
      puck: { root: { props: {} }, content: [{ type: "Image", props: { id: "i1", src: "/media/mugs.jpg", alt: "Mugs", caption: "" } }] },
    };
    render(<QuickEdit page={page as never} githubOn={false} saveMessage={() => ""} />);
    expect(document.body.textContent).toContain(", Image, block 1");
    expect(document.body.textContent).not.toContain("part 1");
  });
});

describe("review-fixes 10: polish", () => {
  it("adds a block with nothing selected at the end of the last Section, not outside it (F032)", () => {
    const cfg = config as unknown as Config;
    const section = (id: string, content: unknown[] = []) => ({ type: "Section", props: { ...cfg.components.Section!.defaultProps, id, content } });
    const data = { root: { props: {} }, content: [section("a"), section("b", [{ type: "Heading", props: { id: "h", text: "Hi", level: "h2" } }])] } as never;
    const plan = planInsert(data, cfg, "Accordion", null, "acc-1");
    expect(plan?.action).toMatchObject({ destinationZone: "b:content", destinationIndex: 1 });
    expect(plan?.announcement).toMatch(/ added to Section, position 2 of 2\./);
    // A Section itself still goes on the page, and so does anything when the page doesn't end with a Section.
    expect(planInsert(data, cfg, "Section", null, "s-new")?.action).toMatchObject({ destinationZone: ROOT_ZONE, destinationIndex: 2 });
    const endsWithText = { root: { props: {} }, content: [section("a"), { type: "Text", props: { id: "t", text: "x" } }] } as never;
    expect(planInsert(endsWithText, cfg, "Image", null, "i")?.action).toMatchObject({ destinationZone: ROOT_ZONE, destinationIndex: 2 });
  });

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

  it("breaks addresses in the page list only after a / or - (F007, F021)", () => {
    const rows = [
      { path: "/", title: "Home", lastEdited: null, localChanges: false, inRepo: true },
      { path: "/opening-hours", title: "Hours", lastEdited: null, localChanges: false, inRepo: true },
    ];
    render(<PageList siteName="Bakery" rows={rows} sourceNote="" onCreate={vi.fn()} />);
    const cell = document.querySelectorAll("td.pg-path-cell")[1]!;
    expect(cell.textContent).toBe("/opening-hours");
    expect(cell.innerHTML).toBe("/<wbr>opening-<wbr>hours");
    render(<p data-testid="p">{breakablePath("/a")}</p>);
    expect(screen.getByTestId("p").innerHTML).toBe("/<wbr>a");
    const css = readFileSync("apps/admin/src/pages/pages.css", "utf8");
    expect(css).toContain(".pg-table .pg-path-cell { overflow-wrap: normal; word-break: normal; }");
  });

  it("the Site header label sits above the header, not on its links (F029, F004)", () => {
    const css = readFileSync("apps/admin/src/chrome-canvas.css", "utf8");
    expect(css).toMatch(/\.cc-chrome::before \{\s*content: attr\(data-part\); display: block;/);
    expect(css).not.toContain("position: absolute; right: 8px; top: 8px");
  });

  it("click-to-colour: header links and footer links are Text, the copyright is Muted (F014)", () => {
    document.body.innerHTML = `
      <header class="cr-site-header cr-style-background"><a class="cr-logo" href="/">Bakery</a><nav><ul class="cr-menu"><li><a id="m" href="/menu">Menu</a></li></ul><a class="cr-header-search" href="/search/">Search</a><a class="cr-button cr-header-cta" href="/order">Order</a></nav></header>
      <section class="cr-section cr-bg-background"><p>Hi <a id="link" href="/x">there</a></p></section>
      <footer class="cr-site-footer cr-style-surface"><ul class="cr-menu"><li><a id="f" href="/menu">Menu</a></li></ul><p class="cr-footer-copy">© 2026</p></footer>
      <header class="cr-site-header cr-style-primary" id="hp"><a class="cr-logo" href="/">Bakery</a></header>`;
    const pick = (sel: string) => roleForElement(document.querySelector(sel)!);
    expect(pick(".cr-logo")).toBe("text");
    expect(pick("#m")).toBe("text");
    expect(pick(".cr-header-search")).toBe("text");
    expect(pick("#f")).toBe("text");
    expect(pick(".cr-footer-copy")).toBe("muted");
    expect(pick("#hp .cr-logo")).toBe("onPrimary");
    // Unchanged: buttons and links in the page.
    expect(pick(".cr-header-cta")).toBe("primary");
    expect(pick("#link")).toBe("primary");
  });

  it("the rich text field fits the side panel, with its focus ring inside it (F042)", () => {
    const css = readFileSync("apps/admin/src/rich-text/rich-text.css", "utf8");
    expect(css).toContain(".rt-field:focus-within { outline: 3px solid var(--app-acc); outline-offset: -1px; }");
    expect(css).toContain(".rt-field, .rt-link { min-width: 0; max-width: 100%; box-sizing: border-box; }");
    expect(readFileSync("apps/admin/src/keyboard/keyboard.css", "utf8")).toContain('.Puck [class*="_Sidebar_"] { scrollbar-gutter: stable; }');
  });

  it("Replace me tags sit above the outline, not over the words (F046)", () => {
    const css = readFileSync("apps/admin/src/placeholders/placeholders.css", "utf8");
    const tag = css.slice(css.indexOf(".cr-show[data-replace]::after {"));
    expect(tag).toMatch(/^\.cr-show\[data-replace\]::after \{[^}]*bottom: calc\(100% \+ 2px\);/);
  });

  it("says '1 layout', not '1 of your layout' (F027)", () => {
    const src = readFileSync("apps/admin/src/layouts/LayoutGallery.tsx", "utf8");
    expect(src).not.toContain("of your layout${");
    expect(src).toContain('`${items.length === 1 ? "1 layout" : `${items.length} layouts`}`');
  });

  it("Puck's field labels look like Crust's (F030)", () => {
    const css = readFileSync("apps/admin/src/keyboard/keyboard.css", "utf8");
    expect(css).toContain("--puck-field-label-color-text: var(--app-ink);");
    expect(css).toContain("--puck-field-label-font-weight: 600;");
    expect(css).toContain('.Puck [class*="_Input-labelIcon_"] { display: none; }');
  });
});

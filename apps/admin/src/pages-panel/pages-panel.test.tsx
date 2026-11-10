// @vitest-environment happy-dom
/** F091: the Pages panel: groups from the header menu, reordering by keys, menu and drag, the status in words. */
import type { MenuLink } from "@crust/blocks";
import { act, cleanup, createEvent, fireEvent, render, screen, within } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PageRow } from "../pages/store";
import { addPage, groupPages, moveBefore, moveStep, takeOut } from "./model";
import { PagesPanel } from "./PagesPanel";
import { parseRoute } from "../App";
import { settingsHref } from "./format";

afterEach(cleanup);

const row = (path: string, title: string, over: Partial<PageRow> = {}): PageRow => ({ path, title, lastEdited: null, localChanges: false, inRepo: true, ...over });
const rows = [row("/", "Home"), row("/about", "About"), row("/contact", "Contact"), row("/thanks", "Thank you", { inRepo: false, localChanges: true })];
const link = (href: string, label = href): MenuLink => ({ label, href });
const menu = [link("/", "Home"), link("https://example.com", "Shop"), link("/about", "About"), link("/contact", "Contact")];
const isPage = (href: string) => rows.some((r) => r.path === href);

describe("pages-panel: the rules", () => {
  it("puts the pages the menu links to first, in menu order, and the rest by address", () => {
    const g = groupPages(rows, menu);
    expect(g.inMenu.map((e) => e.row.path)).toEqual(["/", "/about", "/contact"]);
    expect(g.notInMenu.map((r) => r.path)).toEqual(["/thanks"]);
  });

  it("counts a page inside a dropdown as in the menu, with its dropdown named", () => {
    const g = groupPages(rows, [link("/"), { label: "More", href: "", children: [link("/about")] }]);
    expect(g.inMenu.map((e) => [e.row.path, e.under])).toEqual([["/", undefined], ["/about", "More"]]);
  });

  it("moves a page one step, jumping over links that are not pages", () => {
    const next = moveStep(menu, [2], -1, isPage)!;
    expect(next.map((l) => l.href)).toEqual(["/about", "/", "https://example.com", "/contact"]);
    expect(moveStep(menu, [0], -1, isPage)).toBeNull();
    expect(moveStep(menu, [3], 1, isPage)).toBeNull();
  });

  it("moves inside a dropdown only among its own links", () => {
    const m = [{ label: "More", href: "", children: [link("/about"), link("/contact")] }];
    const next = moveStep(m, [0, 0], 1, isPage)!;
    expect(next[0]!.children!.map((c) => c.href)).toEqual(["/contact", "/about"]);
  });

  it("moves before another item for drag and drop", () => {
    expect(moveBefore(menu, [3], [0])!.map((l) => l.href)).toEqual(["/contact", "/", "https://example.com", "/about"]);
    expect(moveBefore(menu, [0], [0])).toBeNull();
    expect(moveBefore(menu, [0], null)!.map((l) => l.href)).toEqual(["https://example.com", "/about", "/contact", "/"]);
  });

  it("adds a page by its title, once, and not past the menu's limit", () => {
    expect(addPage(menu, rows[3]!)!.at(-1)).toEqual({ label: "Thank you", href: "/thanks" });
    expect(addPage(menu, rows[1]!)).toBeNull();
    const full = Array.from({ length: 8 }, (_, i) => link(`/p${i}`));
    expect(addPage(full, rows[3]!)).toBeNull();
  });

  it("takes a page out and leaves the other links alone", () => {
    expect(takeOut(menu, [2]).map((l) => l.href)).toEqual(["/", "https://example.com", "/contact"]);
  });
});

describe("pages-panel: the panel", () => {
  const show = (props: Partial<React.ComponentProps<typeof PagesPanel>> = {}) => {
    const onMenuChange = vi.fn();
    render(<PagesPanel rows={rows} menu={menu} onMenuChange={onMenuChange} githubOn liveKnown {...props} />);
    return onMenuChange;
  };
  const group = (name: string) => screen.getByRole("region", { name });
  const names = (name: string) => within(group(name)).getAllByRole("link").map((a) => a.textContent);
  const opened = (title: string) => {
    act(() => screen.getByRole("button", { name: `More for ${title}` }).click());
    return screen.getByRole("list", { name: title });
  };

  it("shows the two groups", () => {
    show();
    expect(names("In the menu")).toEqual(["Home", "About", "Contact"]);
    expect(names("Not in the menu")).toEqual(["Thank you"]);
  });

  it("says each status in words next to its dot", () => {
    show();
    const item = (path: string) => document.querySelector(`[data-item="${path}"]`)!;
    expect(item("/").querySelector(".pp-status")!.textContent).toBe("Live");
    expect(item("/thanks").querySelector(".pp-status")!.textContent).toBe("Only in this browser");
    expect(document.querySelector(".pp-dot")!.getAttribute("aria-hidden")).toBe("true");
  });

  it("moves a page with the arrow keys on its grip, and says so", () => {
    const onMenuChange = show();
    const grip = screen.getByRole("button", { name: /^Reorder Contact\. Number 3 of 3 in the menu/ });
    fireEvent.keyDown(grip, { key: "ArrowUp" });
    expect(onMenuChange).toHaveBeenCalledTimes(1);
    expect(onMenuChange.mock.calls[0]![0].map((l: MenuLink) => l.href)).toEqual(["/", "https://example.com", "/contact", "/about"]);
    expect(screen.getByText(/Moved Contact up\. Position 2 of 3 in the menu\./)).toBeTruthy();
  });

  it("says when a page is already at the end instead of doing nothing", () => {
    const onMenuChange = show();
    fireEvent.keyDown(screen.getByRole("button", { name: /^Reorder Home/ }), { key: "ArrowUp" });
    expect(onMenuChange).not.toHaveBeenCalled();
    expect(screen.getByText("Home is already first in the menu.")).toBeTruthy();
  });

  it("has Move up, Move down, Add to menu and Take out of menu in each page's menu", () => {
    const onMenuChange = show();
    {
      const menu = opened("About");
      act(() => within(menu).getByRole("button", { name: "Move down" }).click());
    }
    expect(onMenuChange.mock.calls[0]![0].map((l: MenuLink) => l.href)).toEqual(["/", "https://example.com", "/contact", "/about"]);
    {
      const menu = opened("Contact");
      act(() => within(menu).getByRole("button", { name: "Take out of menu" }).click());
    }
    expect(onMenuChange.mock.calls[1]![0].map((l: MenuLink) => l.href)).toEqual(["/", "https://example.com", "/about"]);
    {
      const menu = opened("Thank you");
      act(() => within(menu).getByRole("button", { name: "Add to menu" }).click());
    }
    expect(onMenuChange.mock.calls[2]![0].at(-1)).toEqual({ label: "Thank you", href: "/thanks" });
  });

  it("says why a page can't be added when the menu is full", () => {
    const full = Array.from({ length: 8 }, (_, i) => link(`/p${i}`));
    const onMenuChange = show({ menu: full });
    {
      const menu = opened("Thank you");
      act(() => within(menu).getByRole("button", { name: "Add to menu" }).click());
    }
    expect(onMenuChange).not.toHaveBeenCalled();
    expect(screen.getByText(/The menu is full\./)).toBeTruthy();
  });

  it("reorders by dragging a row onto another, and adds or removes by dragging between groups", () => {
    const onMenuChange = show();
    const item = (path: string) => document.querySelector(`[data-item="${path}"]`)!;
    const dragOnto = (from: string, to: Element) => {
      fireEvent.dragStart(item(from).querySelector(".pp-row")!);
      fireEvent.dragOver(to);
      fireEvent.drop(to);
    };
    dragOnto("/contact", item("/"));
    expect(onMenuChange.mock.calls[0]![0].map((l: MenuLink) => l.href)).toEqual(["/contact", "/", "https://example.com", "/about"]);
    dragOnto("/thanks", group("In the menu").querySelector(".pp-list")!);
    expect(onMenuChange.mock.calls[1]![0].at(-1).href).toBe("/thanks");
    dragOnto("/about", group("Not in the menu").querySelector(".pp-list")!);
    expect(onMenuChange.mock.calls[2]![0].map((l: MenuLink) => l.href)).toEqual(["/", "https://example.com", "/contact"]);
  });

  it("keeps drag out of a panel that can't save the menu", () => {
    show({ onMenuChange: undefined });
    expect(document.querySelector(".pp-row[draggable='true']")).toBeNull();
    expect((screen.getByRole("button", { name: /^Reorder Home/ }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("puts a page's settings behind its menu: a link to the page with settings open, or the panel itself for the current page", () => {
    const onOpenSettings = vi.fn();
    show({ currentPath: "/about", onOpenSettings });
    const contact = opened("Contact");
    expect(within(contact).getByRole("link", { name: "Page settings" }).getAttribute("href")).toBe(settingsHref("/contact"));
    {
      const menu = opened("About");
      act(() => within(menu).getByRole("button", { name: "Page settings" }).click());
    }
    expect(onOpenSettings).toHaveBeenCalledWith(expect.objectContaining({ path: "/about" }));
    expect(screen.getByRole("link", { name: "About" }).getAttribute("aria-current")).toBe("page");
  });

  it("offers Duplicate and announces it", async () => {
    const onDuplicate = vi.fn(async () => null);
    show({ onDuplicate });
    const menu = opened("About");
    await act(async () => within(menu).getByRole("button", { name: "Duplicate" }).click());
    expect(onDuplicate).toHaveBeenCalledWith(expect.objectContaining({ path: "/about" }));
    expect(screen.getByText(/Made a copy of “About”/)).toBeTruthy();
  });

  it("closes a menu with Escape and puts focus back on its button", () => {
    show();
    const button = screen.getByRole("button", { name: "More for About" });
    act(() => button.click());
    fireEvent.keyDown(screen.getByRole("list", { name: "About" }), { key: "Escape" });
    expect(screen.queryByRole("list", { name: "About" })).toBeNull();
    expect(document.activeElement).toBe(button);
  });

  it("escapes page titles", () => {
    show({ rows: [row("/x", "<img src=x onerror=alert(1)>")], menu: [] });
    expect(document.querySelector(".pp-name img")).toBeNull();
    expect(screen.getByText("<img src=x onerror=alert(1)>")).toBeTruthy();
  });

  it("has its own New page in the editor's panel", () => {
    const onCreate = vi.fn();
    show({ variant: "rail", onCreate });
    const toggle = screen.getByRole("button", { name: "New page" });
    act(() => toggle.click());
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Gallery" } });
    act(() => screen.getByRole("button", { name: "Create and open" }).click());
    expect(onCreate).toHaveBeenCalledWith(expect.objectContaining({ path: "/gallery", title: "Gallery" }));
  });

  it("uses only the app's colour tokens", () => {
    const css = readFileSync("apps/admin/src/pages-panel/pages-panel.css", "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b|\brgba?\(|\bhsla?\(/i);
  });
});

describe("pages-panel: Page settings for another page", () => {
  it("opens that page in the editor, with the settings link still a normal edit address", () => {
    expect(parseRoute(settingsHref("/about"))).toEqual({ name: "edit", path: "/about" });
    expect(settingsHref("/about")).toBe("#/edit?path=%2Fabout&settings=1");
  });
});

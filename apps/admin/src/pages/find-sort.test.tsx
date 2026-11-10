// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { matchesQuery, sortRows } from "./list-view";
import { PageList } from "./PageList";
import type { PageRow } from "./store";

afterEach(() => {
  cleanup();
  localStorage.clear();
});

const row = (path: string, title: string, lastEdited: string | null = null): PageRow => ({ path, title, lastEdited, localChanges: false, inRepo: true });
const rows = [
  row("/", "Home", "2026-10-20T10:00:00Z"),
  row("/about", "About us", "2026-10-28T10:00:00Z"),
  row("/blog/cafe", "Café opening", "2026-10-25T10:00:00Z"),
  row("/contact", "Contact"),
  row("/services", "Services", "2026-10-29T10:00:00Z"),
  row("/team", "Our team", "2026-10-21T10:00:00Z"),
];
// The pages only: "Page not found" (F082) has a row of its own after them.
const titles = () =>
  Array.from(document.querySelectorAll(".pp-name a"))
    .filter((a) => !a.closest(".pp-builtin"))
    .map((a) => a.textContent);

describe("find-sort: rules", () => {
  it("matches every word in the title or address, ignoring case and accents", () => {
    expect(matchesQuery(rows[2]!, "cafe")).toBe(true);
    expect(matchesQuery(rows[2]!, "BLOG open")).toBe(true);
    expect(matchesQuery(rows[2]!, "blog team")).toBe(false);
    expect(matchesQuery(rows[1]!, "")).toBe(true);
  });

  it("sorts by newest edit (undated last) or by address with Home first", () => {
    expect(sortRows(rows, "recent").map((r) => r.path)).toEqual(["/services", "/about", "/blog/cafe", "/team", "/", "/contact"]);
    expect(sortRows(rows, "address").map((r) => r.path)).toEqual(["/", "/about", "/blog/cafe", "/contact", "/services", "/team"]);
  });
});

describe("find-sort: page list", () => {
  it("is hidden for short lists", () => {
    render(<PageList siteName="Demo" rows={rows.slice(0, 3)} sourceNote="" onCreate={() => {}} />);
    expect(screen.queryByLabelText("Find a page")).toBeNull();
  });

  it("filters, announces the count, and offers a way back from no matches", () => {
    render(<PageList siteName="Demo" rows={rows} sourceNote="" onCreate={() => {}} />);
    expect(titles()).toEqual(["Home", "About us", "Café opening", "Contact", "Services", "Our team"]);
    const find = screen.getByLabelText("Find a page");
    act(() => {
      fireEvent.change(find, { target: { value: "us" } });
    });
    expect(titles()).toEqual(["About us"]);
    expect(screen.getByText("1 of 6 pages").getAttribute("role")).toBe("status");
    act(() => {
      fireEvent.change(find, { target: { value: "zzz" } });
    });
    expect(screen.getByText("No pages match “zzz”.")).toBeTruthy();
    act(() => screen.getByRole("button", { name: "Clear search" }).click());
    expect(titles()).toHaveLength(6);
  });

  it("lists the pages in the menu first, in menu order, then the others by address", () => {
    const menu = [{ label: "Contact", href: "/contact" }, { label: "Elsewhere", href: "https://example.com" }, { label: "About", href: "/about" }];
    render(<PageList siteName="Demo" rows={rows} menu={menu} sourceNote="" onCreate={() => {}} />);
    expect(titles()).toEqual(["Contact", "About us", "Home", "Café opening", "Services", "Our team"]);
    const inMenu = screen.getByRole("region", { name: "In the menu" });
    expect(within(inMenu).getAllByRole("link").map((a) => a.textContent)).toEqual(["Contact", "About us"]);
  });
});

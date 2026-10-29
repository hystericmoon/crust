// @vitest-environment happy-dom
import { act, cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PageList } from "./PageList";
import type { PageRow } from "./store";

afterEach(cleanup);

const rows: PageRow[] = [{ path: "/", title: "Home", lastEdited: null, localChanges: false, inRepo: true }];
const deleted = [
  { path: "/about", title: "About us", deletedAt: "2026-10-29T12:00:00Z", commit: "aaa1111" },
  { path: "/team", title: "Team", deletedAt: "2026-10-29T10:00:00Z", commit: "bbb2222" },
];
const tick = () => act(() => new Promise((ok) => setTimeout(ok, 0)));

describe("restore: recently deleted", () => {
  it("starts collapsed behind a labelled disclosure button", () => {
    render(<PageList siteName="Demo" rows={rows} sourceNote="" githubOn onCreate={() => {}} deleted={deleted} onRestore={vi.fn()} />);
    const toggle = screen.getByRole("button", { name: "Recently deleted (2)" });
    expect(screen.getByRole("heading", { name: "Recently deleted (2)" })).toBeTruthy();
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("button", { name: "Restore About us" })).toBeNull();
    act(() => toggle.click());
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByRole("button", { name: "Restore About us" })).toBeTruthy();
    expect(within(screen.getByRole("list")).getAllByRole("listitem")).toHaveLength(2);
  });

  it("restores a page and announces it", async () => {
    const onRestore = vi.fn(async () => null);
    render(<PageList siteName="Demo" rows={rows} sourceNote="" githubOn onCreate={() => {}} deleted={deleted} onRestore={onRestore} />);
    act(() => screen.getByRole("button", { name: "Recently deleted (2)" }).click());
    await act(async () => screen.getByRole("button", { name: "Restore Team" }).click());
    await tick();
    expect(onRestore).toHaveBeenCalledWith(deleted[1]);
    expect(screen.getByText("Restored “Team” at /team. It goes live again the next time you publish.")).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Pages" }));
  });

  it("shows why a restore didn't work", async () => {
    const onRestore = vi.fn(async () => "Not restored: There's already a page at /about.");
    render(<PageList siteName="Demo" rows={rows} sourceNote="" githubOn onCreate={() => {}} deleted={deleted} onRestore={onRestore} />);
    act(() => screen.getByRole("button", { name: "Recently deleted (2)" }).click());
    await act(async () => screen.getByRole("button", { name: "Restore About us" }).click());
    expect(screen.getByRole("alert").textContent).toBe("Not restored: There's already a page at /about.");
  });

  it("is hidden when nothing was deleted", () => {
    render(<PageList siteName="Demo" rows={rows} sourceNote="" githubOn onCreate={() => {}} deleted={[]} onRestore={vi.fn()} />);
    expect(screen.queryByRole("button", { name: /Recently deleted/ })).toBeNull();
  });
});

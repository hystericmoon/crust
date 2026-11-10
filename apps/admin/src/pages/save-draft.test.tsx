// @vitest-environment happy-dom
import { act, cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PageList } from "./PageList";
import type { PageRow } from "./store";

afterEach(cleanup);

const row = (over: Partial<PageRow>): PageRow => ({ path: "/about", title: "About", lastEdited: null, localChanges: false, inRepo: true, ...over });
const rows = [row({ path: "/", title: "Home", localChanges: true }), row({}), row({ path: "/draft", title: "Draft idea", inRepo: false, localChanges: true })];
const openMenu = (title: string) => act(() => screen.getByRole("button", { name: `More for ${title}` }).click());
const tick = () => act(() => new Promise((ok) => setTimeout(ok, 0)));

describe("save-draft: page list", () => {
  it("offers Save to GitHub only on pages with a browser draft, Home included", () => {
    render(<PageList siteName="Demo" rows={rows} sourceNote="" githubOn onCreate={() => {}} onRename={vi.fn()} onDelete={vi.fn()} onSaveDraft={vi.fn()} />);
    openMenu("Home");
    expect(screen.getByRole("button", { name: "Save to GitHub" })).toBeTruthy();
    openMenu("About");
    expect(within(screen.getByRole("list", { name: "About" })).queryByRole("button", { name: "Save to GitHub" })).toBeNull();
    openMenu("Draft idea");
    expect(within(screen.getByRole("list", { name: "Draft idea" })).getByRole("button", { name: "Save to GitHub" })).toBeTruthy();
  });

  it("isn't offered before saving to GitHub is switched on", () => {
    render(<PageList siteName="Demo" rows={rows} sourceNote="" onCreate={() => {}} onRename={vi.fn()} onDelete={vi.fn()} onSaveDraft={vi.fn()} />);
    expect(screen.queryByRole("button", { name: /Save to GitHub/ })).toBeNull();
  });

  it("saves, then announces it and moves focus to the list heading", async () => {
    const onSaveDraft = vi.fn(async () => null);
    render(<PageList siteName="Demo" rows={rows} sourceNote="" githubOn onCreate={() => {}} onSaveDraft={onSaveDraft} />);
    openMenu("Home");
    await act(async () => screen.getByRole("button", { name: "Save to GitHub" }).click());
    await tick();
    expect(onSaveDraft).toHaveBeenCalledWith(expect.objectContaining({ path: "/" }));
    expect(screen.getByText("Saved “Home” to GitHub. Visitors see it after you publish.")).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Pages" }));
  });

  it("shows the reason when saving fails", async () => {
    const onSaveDraft = vi.fn(async () => "Not saved to GitHub: The page needs a title. The draft is still safe in this browser.");
    render(<PageList siteName="Demo" rows={rows} sourceNote="" githubOn onCreate={() => {}} onSaveDraft={onSaveDraft} />);
    openMenu("Draft idea");
    await act(async () => screen.getByRole("button", { name: "Save to GitHub" }).click());
    expect(screen.getByRole("alert").textContent).toBe("Not saved to GitHub: The page needs a title. The draft is still safe in this browser.");
  });
});

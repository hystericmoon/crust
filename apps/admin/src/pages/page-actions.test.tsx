// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { checkAddress, createPage, toPath } from "./new-page";
import { PageList } from "./PageList";
import { getLocalDraft, moveLocalDraft, removeLocalDraft, saveLocalDraft, type PageRow } from "./store";

afterEach(() => {
  cleanup();
  localStorage.clear();
});

const row = (over: Partial<PageRow>): PageRow => ({ path: "/about", title: "About", lastEdited: null, localChanges: false, inRepo: true, ...over });
const rows = [row({ path: "/", title: "Home" }), row({}), row({ path: "/draft", title: "Draft idea", inRepo: false, localChanges: true })];

const flush = () => act(async () => {});
// Focus moves on the next tick, once the dialog has closed.
const tick = () => act(() => new Promise((ok) => setTimeout(ok, 0)));

describe("page-actions: rules", () => {
  it("checks a new address the same way as New page", () => {
    expect(checkAddress("about-us", ["/about"])).toBeNull();
    expect(checkAddress("about", ["/about"])).toBe("There's already a page at /about.");
    expect(checkAddress("About Us", [])).toMatch(/^Use lowercase letters/);
    expect(checkAddress("", [])).toBe("Add an address, like about or contact.");
    expect(toPath(" /team/ ")).toBe("/team");
  });

  it("moves and removes browser drafts", () => {
    const page = createPage({ title: "About", address: "about", description: "" });
    saveLocalDraft(page, false);
    expect(moveLocalDraft("/about", "/team")).toBe(true);
    expect(getLocalDraft("/about")).toBeNull();
    expect(getLocalDraft("/team")?.page.path).toBe("/team");
    expect(moveLocalDraft("/nothing", "/else")).toBe(true);
    removeLocalDraft("/team");
    expect(getLocalDraft("/team")).toBeNull();
  });
});

describe("page-actions: page list", () => {
  it("offers rename and delete for every page but Home, named for screen readers", () => {
    render(<PageList siteName="Demo" rows={rows} sourceNote="" githubOn onCreate={() => {}} onRename={vi.fn()} onDelete={vi.fn()} />);
    const [, home, about] = within(screen.getByRole("table")).getAllByRole("row");
    expect(within(home!).queryByRole("button")).toBeNull();
    expect(within(about!).getByRole("button", { name: "Rename About" })).toBeTruthy();
    expect(within(about!).getByRole("button", { name: "Delete About" })).toBeTruthy();
  });

  it("without GitHub, only pages that live in this browser can change", () => {
    render(<PageList siteName="Demo" rows={rows} sourceNote="" onCreate={() => {}} onRename={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Rename About" })).toBeNull();
    expect(screen.getByRole("button", { name: "Rename Draft idea" })).toBeTruthy();
  });

  it("shows no actions column when nothing can change", () => {
    render(<PageList siteName="Demo" rows={rows.slice(0, 2)} sourceNote="" onCreate={() => {}} onRename={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getAllByRole("columnheader")).toHaveLength(3);
  });

  it("renames: checks the address, explains the redirect, then announces the result", async () => {
    const onRename = vi.fn(async () => null);
    render(<PageList siteName="Demo" rows={rows} sourceNote="" githubOn onCreate={() => {}} onRename={onRename} onDelete={vi.fn()} />);
    act(() => screen.getByRole("button", { name: "Rename About" }).click());

    const dialog = screen.getByRole("dialog", { name: "Change the address of “About”" });
    const input = within(dialog).getByLabelText("New address") as HTMLInputElement;
    expect(document.activeElement).toBe(input);
    expect(input.value).toBe("about");
    expect(dialog.textContent).toContain("Links to /about from other websites keep working");

    // Same address, a taken one, then a good one.
    await act(async () => within(dialog).getByRole("button", { name: "Change address" }).click());
    expect(within(dialog).getByRole("alert").textContent).toBe("That's already this page's address.");
    act(() => {
      fireEvent.change(input, { target: { value: "draft" } });
    });
    await act(async () => within(dialog).getByRole("button", { name: "Change address" }).click());
    expect(within(dialog).getByRole("alert").textContent).toBe("There's already a page at /draft.");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(onRename).not.toHaveBeenCalled();

    act(() => {
      fireEvent.change(input, { target: { value: "about-us" } });
    });
    await act(async () => within(dialog).getByRole("button", { name: "Change address" }).click());
    await flush();
    expect(onRename).toHaveBeenCalledWith(expect.objectContaining({ path: "/about" }), "/about-us");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByText(/Changed the address of “About” to \/about-us\. Once you publish, \/about sends visitors there\./)).toBeTruthy();
    await tick();
    expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Pages" }));
  });

  it("keeps the dialog open with the reason when a rename fails", async () => {
    const onRename = vi.fn(async () => "Not renamed: There's already a page at /team.");
    render(<PageList siteName="Demo" rows={rows} sourceNote="" githubOn onCreate={() => {}} onRename={onRename} onDelete={vi.fn()} />);
    act(() => screen.getByRole("button", { name: "Rename About" }).click());
    const dialog = screen.getByRole("dialog");
    act(() => {
      fireEvent.change(within(dialog).getByLabelText("New address"), { target: { value: "team" } });
    });
    await act(async () => within(dialog).getByRole("button", { name: "Change address" }).click());
    await flush();
    expect(within(dialog).getByRole("alert").textContent).toBe("Not renamed: There's already a page at /team.");
  });

  it("cancel and Esc close the dialog and return focus to the button", async () => {
    render(<PageList siteName="Demo" rows={rows} sourceNote="" githubOn onCreate={() => {}} onRename={vi.fn()} onDelete={vi.fn()} />);
    const rename = screen.getByRole("button", { name: "Rename About" });
    act(() => rename.click());
    act(() => within(screen.getByRole("dialog")).getByRole("button", { name: "Cancel" }).click());
    expect(screen.queryByRole("dialog")).toBeNull();
    await tick();
    expect(document.activeElement).toBe(rename);

    const del = screen.getByRole("button", { name: "Delete About" });
    act(() => del.click());
    act(() => {
      fireEvent(screen.getByRole("dialog"), new Event("cancel", { cancelable: true }));
    });
    expect(screen.queryByRole("dialog")).toBeNull();
    await tick();
    expect(document.activeElement).toBe(del);
  });

  it("deletes after a confirmation that starts on Keep page", async () => {
    const onDelete = vi.fn(async () => null);
    render(
      <PageList
        siteName="Demo"
        rows={[rows[0]!, row({ localChanges: true })]}
        sourceNote=""
        githubOn
        onCreate={() => {}}
        onRename={vi.fn()}
        onDelete={onDelete}
      />,
    );
    act(() => screen.getByRole("button", { name: "Delete About" }).click());
    const dialog = screen.getByRole("dialog", { name: "Delete “About”?" });
    expect(document.activeElement).toBe(within(dialog).getByRole("button", { name: "Keep page" }));
    expect(dialog.getAttribute("aria-describedby")).toBeTruthy();
    expect(dialog.textContent).toContain("from the live site the next time you publish");
    expect(dialog.textContent).toContain("Changes you haven't saved to GitHub yet are deleted too.");

    await act(async () => within(dialog).getByRole("button", { name: "Delete page" }).click());
    await flush();
    expect(onDelete).toHaveBeenCalledWith(expect.objectContaining({ path: "/about" }));
    expect(screen.getByText("Deleted “About”. It leaves the live site the next time you publish.")).toBeTruthy();
  });

  it("says plainly when a page only lives in this browser", () => {
    render(<PageList siteName="Demo" rows={rows} sourceNote="" onCreate={() => {}} onRename={vi.fn()} onDelete={vi.fn()} />);
    act(() => screen.getByRole("button", { name: "Delete Draft idea" }).click());
    expect(screen.getByRole("dialog").textContent).toContain("This page is only in this browser, so deleting it removes it for good.");
  });
});

// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { parseRoute } from "../App";
import { checkNewPage, createPage, slugify } from "./new-page";
import { PageList } from "./PageList";
import { bundledPages, fromPuckData, getLocalDraft, localDrafts, mergePageRows, saveLocalDraft, toPuckData } from "./store";

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe("pages: new page rules", () => {
  it("turns titles into addresses", () => {
    expect(slugify("About Us & Team!")).toBe("about-us-and-team");
    expect(slugify("  Café Déjà-vu  ")).toBe("cafe-deja-vu");
    expect(slugify("2026 — Plans")).toBe("2026-plans");
    expect(slugify("***")).toBe("");
  });

  it("explains each problem plainly", () => {
    expect(checkNewPage({ title: "", address: "", description: "" }, [])).toEqual({
      title: "Give the page a title.",
      address: "Add an address, like about or contact.",
    });
    expect(checkNewPage({ title: "A", address: "About Us", description: "" }, []).address).toMatch(/^Use lowercase letters/);
    expect(checkNewPage({ title: "A", address: "-x", description: "" }, []).address).toMatch(/^Use lowercase letters/);
    expect(checkNewPage({ title: "A", address: "a/b/c/d/e", description: "" }, []).address).toMatch(/at most 4 levels/);
    expect(checkNewPage({ title: "A", address: "/about/", description: "" }, ["/about"]).address).toBe("There's already a page at /about.");
    expect(checkNewPage({ title: "x".repeat(121), address: "a", description: "y".repeat(301) }, [])).toEqual({
      title: "Keep the title under 120 characters.",
      description: "Keep the description under 300 characters.",
    });
    expect(checkNewPage({ title: "Blog post", address: "blog/first-post", description: "" }, ["/"])).toEqual({});
  });

  it("starts a new page with its H1, so it passes the publish checks", () => {
    const page = createPage({ title: " Contact ", address: "/contact/", description: " Reach us " });
    expect(page).toMatchObject({ path: "/contact", title: "Contact", description: "Reach us" });
    const section = page.puck.content[0]!;
    expect(section.type).toBe("Section");
    expect((section.props.content as { type: string; props: Record<string, unknown> }[])[0]).toMatchObject({
      type: "Heading",
      props: { text: "Contact", level: "h1" },
    });
  });
});

describe("pages: where pages come from", () => {
  it("bundles the pages from content/pages", () => {
    expect(bundledPages().map((p) => p.path)).toContain("/");
  });

  it("keeps drafts per page in this browser", () => {
    const page = createPage({ title: "About", address: "about", description: "" });
    expect(saveLocalDraft(page, false, new Date("2026-10-28T10:00:00Z"))).toBe(true);
    expect(getLocalDraft("/about")).toEqual({ page, updatedAt: "2026-10-28T10:00:00.000Z", savedToGitHub: false });
    expect(localDrafts()).toHaveLength(1);
  });

  it("moves the old single Home draft into the new format", () => {
    const puck = { root: { props: {} }, content: [] };
    localStorage.setItem("crust:draft:index", JSON.stringify(puck));
    expect(getLocalDraft("/")?.page.puck).toEqual(puck);
    expect(localStorage.getItem("crust:draft:index")).toBeNull();
  });

  it("merges GitHub pages with browser drafts and flags unsaved ones", () => {
    const about = createPage({ title: "About (new)", address: "about", description: "" });
    const rows = mergePageRows(
      [
        { path: "/about", title: "About", lastEdited: "2026-10-27T10:00:00Z" },
        { path: "/", title: "Home", lastEdited: null },
        { path: "/contact", title: "Contact", lastEdited: "2026-10-26T10:00:00Z" },
      ],
      [{ page: about, updatedAt: "2026-10-28T10:00:00Z", savedToGitHub: false }],
    );
    expect(rows).toEqual([
      { path: "/", title: "Home", lastEdited: null, localChanges: false, inRepo: true },
      { path: "/about", title: "About (new)", lastEdited: "2026-10-28T10:00:00Z", localChanges: true, inRepo: true },
      { path: "/contact", title: "Contact", lastEdited: "2026-10-26T10:00:00Z", localChanges: false, inRepo: true },
    ]);
  });

  it("moves title and description in and out of Puck's root fields", () => {
    const page = createPage({ title: "About", address: "about", description: "Who" });
    const data = toPuckData(page);
    expect(data.root.props).toEqual({ title: "About", description: "Who" });
    const edited = { ...data, root: { props: { title: "About us", description: "Who we are" } } };
    const back = fromPuckData("/about", edited);
    expect(back).toMatchObject({ path: "/about", title: "About us", description: "Who we are" });
    expect(back.puck.root.props).toEqual({});
  });
});

describe("pages: routes", () => {
  it("parses the admin's addresses", () => {
    expect(parseRoute("")).toEqual({ name: "pages" });
    expect(parseRoute("#/")).toEqual({ name: "pages" });
    expect(parseRoute("#/settings/contrast")).toEqual({ name: "settings" });
    expect(parseRoute("#/edit?path=%2Fabout")).toEqual({ name: "edit", path: "/about" });
    expect(parseRoute("#/edit")).toEqual({ name: "pages" });
  });
});

describe("pages: list screen", () => {
  const rows = [
    { path: "/", title: "Home", lastEdited: "2026-10-28T10:00:00Z", localChanges: false, inRepo: true },
    { path: "/about", title: "About", lastEdited: null, localChanges: true, inRepo: false },
  ];

  it("lists title, address and last edited, with links to the builder", () => {
    render(<PageList siteName="Demo" rows={rows} sourceNote="From GitHub." onCreate={() => {}} />);
    const table = screen.getByRole("table");
    const [, home, about] = within(table).getAllByRole("row");
    expect(within(home!).getByRole("link", { name: "Home" }).getAttribute("href")).toBe("#/edit?path=%2F");
    expect(about!.textContent).toContain("Draft in this browser");
    expect(about!.textContent).toContain("Not recorded yet");
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Demo: pages");
  });

  it("shows loading and empty states", () => {
    const { rerender } = render(<PageList siteName="Demo" rows={null} sourceNote="" onCreate={() => {}} />);
    expect(screen.getByText("Loading pages…").getAttribute("role")).toBe("status");
    rerender(<PageList siteName="Demo" rows={[]} sourceNote="" onCreate={() => {}} />);
    expect(screen.getByText(/No pages yet/)).toBeTruthy();
  });

  it("creates a page: errors on the fields, address follows the title, then onCreate", () => {
    const onCreate = vi.fn();
    render(<PageList siteName="Demo" rows={rows} sourceNote="" onCreate={onCreate} />);
    const toggle = screen.getByRole("button", { name: "New page" });
    act(() => toggle.click());
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    const title = screen.getByLabelText("Title") as HTMLInputElement;
    expect(document.activeElement).toBe(title);

    act(() => screen.getByRole("button", { name: "Create and open" }).click());
    expect(title.getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByText("Give the page a title.")).toBeTruthy();
    expect(onCreate).not.toHaveBeenCalled();

    act(() => {
      fireEvent.change(title, { target: { value: "About" } });
    });
    const address = screen.getByLabelText("Address") as HTMLInputElement;
    expect(address.value).toBe("about");
    act(() => screen.getByRole("button", { name: "Create and open" }).click());
    expect(screen.getByText("There's already a page at /about.")).toBeTruthy();
    expect(document.activeElement).toBe(address);

    act(() => {
      fireEvent.change(address, { target: { value: "about-us" } });
    });
    act(() => screen.getByRole("button", { name: "Create and open" }).click());
    expect(onCreate).toHaveBeenCalledWith(expect.objectContaining({ path: "/about-us", title: "About" }));
  });
});

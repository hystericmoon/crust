// @vitest-environment happy-dom
import { countLinks, relinkHref, relinkPage } from "@crust/blocks/links";
import type { Data } from "@puckeditor/core";
import { act, cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PageList } from "./PageList";
import type { PageRow } from "./store";

afterEach(cleanup);

describe("relink: which links point at a page", () => {
  it("matches the page with or without a slash, anchor or query", () => {
    expect(relinkHref("/about", "/about", "/team")).toBe("/team");
    expect(relinkHref("/about/", "/about", "/team")).toBe("/team/");
    expect(relinkHref("/about#people", "/about", "/team")).toBe("/team#people");
    expect(relinkHref(" /about?x=1#y ", "/about", "/team")).toBe("/team?x=1#y");
    expect(relinkHref("/about/", "/about", "/")).toBe("/");
  });

  it("leaves other links alone", () => {
    for (const href of ["/about-us", "/about/team", "/aboutx", "about", "#about", "//about", "https://site.dev/about", "mailto:a@b.c", ""]) {
      expect(relinkHref(href, "/about", "/team"), href).toBeNull();
    }
  });
});

const button = (id: string, href: string) => ({ type: "Button", props: { id, label: "Go", href, variant: "primary" } });
const card = (id: string, linkHref: string) => ({ type: "Card", props: { id, title: "T", linkLabel: "More", linkHref } });
const puck = (): Data =>
  ({
    root: { props: {} },
    content: [
      button("b1", "/about"),
      { type: "Section", props: { id: "s", content: [button("b2", "/about#x"), button("b3", "/contact")] } },
      { type: "Columns", props: { id: "c", column1: [card("c1", "/about/")], column2: [{ type: "Text", props: { id: "t", text: "/about" } }] } },
    ],
  }) as unknown as Data;

describe("relink: block trees", () => {
  it("updates Button and Card links anywhere in the page, and counts them", () => {
    const { puck: next, count } = relinkPage(puck(), "/about", "/team");
    expect(count).toBe(3);
    const json = JSON.stringify(next);
    expect(json).toContain('"href":"/team"');
    expect(json).toContain('"href":"/team#x"');
    expect(json).toContain('"linkHref":"/team/"');
    expect(json).toContain('"href":"/contact"');
    // Text that merely mentions the address isn't a link.
    expect(json).toContain('"text":"/about"');
    expect(countLinks(puck(), "/about")).toBe(3);
  });

  it("returns the same page untouched when nothing links there", () => {
    const original = puck();
    expect(relinkPage(original, "/nowhere", "/x")).toEqual({ puck: original, count: 0 });
  });
});

describe("relink: rename dialog", () => {
  const rows: PageRow[] = [
    { path: "/", title: "Home", lastEdited: null, localChanges: false, inRepo: true },
    { path: "/about", title: "About", lastEdited: null, localChanges: false, inRepo: true },
  ];

  it("names the pages whose links will be updated", async () => {
    const findLinks = vi.fn(async () => [
      { path: "/", title: "Home", count: 2 },
      { path: "/contact", title: "Contact", count: 1 },
    ]);
    render(<PageList siteName="Demo" rows={rows} sourceNote="" githubOn onCreate={() => {}} onRename={vi.fn()} onDelete={vi.fn()} findLinks={findLinks} />);
    await act(async () => screen.getByRole("button", { name: "Rename About" }).click());
    const dialog = screen.getByRole("dialog");
    expect(dialog.textContent).toContain("Links on other pages are updated to the new address too: Home (2 links), Contact (1 link).");
    expect(within(dialog).getByLabelText("New address").getAttribute("aria-describedby")).toMatch(/-links/);
    expect(findLinks).toHaveBeenCalledTimes(1);
  });

  it("says nothing extra when no page links there", async () => {
    render(<PageList siteName="Demo" rows={rows} sourceNote="" githubOn onCreate={() => {}} onRename={vi.fn()} onDelete={vi.fn()} findLinks={async () => []} />);
    await act(async () => screen.getByRole("button", { name: "Rename About" }).click());
    expect(screen.getByRole("dialog").textContent).not.toContain("Links on other pages");
  });
});

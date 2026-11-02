// @vitest-environment happy-dom
import { defaultFooter, defaultHeader, type MenuLink, type SiteChrome } from "@crust/blocks";
import { defaultTokens } from "@crust/blocks";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FooterOptions, HeaderOptions, LayoutPicker } from "./ChromeGroups";
import { indentItem, MenuEditor, moveItem, outdentItem, removeItem } from "./MenuEditor";

afterEach(() => cleanup());
const pages = [
  { path: "/", title: "Home" },
  { path: "/studio", title: "Studio" },
  { path: "/team", title: "Team" },
];
const menu: MenuLink[] = [
  { label: "Home", href: "/" },
  { label: "Studio", href: "/studio" },
  { label: "Team", href: "/team" },
];

describe("F076 menu: dropdowns made with buttons", () => {
  it("puts an item under the one above, takes it out again, and keeps one level", () => {
    const nested = indentItem(menu, 2)!;
    expect(nested).toEqual([
      { label: "Home", href: "/" },
      { label: "Studio", href: "/studio", children: [{ label: "Team", href: "/team" }] },
    ]);
    expect(indentItem(nested, 1)).toBeNull(); // Studio has a dropdown: it can't go under Home.
    expect(indentItem(menu, 0)).toBeNull();
    expect(outdentItem(nested, 1, 0)).toEqual(menu);
  });

  it("moves within its own list and removes cleanly (an empty dropdown becomes a plain link)", () => {
    const nested: MenuLink[] = [{ label: "Studio", href: "/studio", children: [{ label: "A", href: "/a" }, { label: "B", href: "/b" }] }];
    expect(moveItem(nested, [0, 0], 1)![0]!.children!.map((c) => c.label)).toEqual(["B", "A"]);
    expect(moveItem(nested, [0, 1], 1)).toBeNull();
    expect(removeItem(removeItem(nested, [0, 0]), [0, 0])).toEqual([{ label: "Studio", href: "/studio" }]);
  });

  it("every action is a named button, and the result is announced", () => {
    let current = menu;
    const { rerender } = render(<MenuEditor menu={current} pages={pages} onChange={(m) => (current = m)} />);
    fireEvent.click(screen.getByRole("button", { name: "Put Team under Studio" }));
    expect(current[1]!.children).toEqual([{ label: "Team", href: "/team" }]);
    expect(screen.getByRole("status").textContent).toBe("Team is now in the Studio dropdown.");
    rerender(<MenuEditor menu={current} pages={pages} onChange={(m) => (current = m)} />);
    expect(screen.getByRole("list", { name: "Dropdown under Studio" })).toBeTruthy();
    expect(screen.getByLabelText("Dropdown Studio, link 1: label")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Take out" }));
    expect(current).toEqual(menu);
  });
});

describe("F076 Site settings: header", () => {
  it("offers six layouts as pictures with spoken names", () => {
    const onChange = vi.fn();
    render(<LayoutPicker value="classic" onChange={onChange} />);
    expect(screen.getAllByRole("radio")).toHaveLength(6);
    fireEvent.click(screen.getByRole("radio", { name: /^Split: / }));
    expect(onChange).toHaveBeenCalledWith("split");
  });

  it("has the hero and top bar switches", () => {
    let chrome: SiteChrome = { header: defaultHeader("Atelier", pages), footer: defaultFooter };
    const { rerender } = render(<HeaderOptions chrome={chrome} onChange={(c) => (chrome = c)} tokens={defaultTokens} pages={pages} />);
    fireEvent.click(screen.getByRole("checkbox", { name: "Clear on a hero photo" }));
    expect(chrome.header.overHero).toBe(true);
    fireEvent.click(screen.getByRole("checkbox", { name: "Show a thin bar above the header" }));
    expect(chrome.header.topBar?.show).toBe(true);
    rerender(<HeaderOptions chrome={chrome} onChange={(c) => (chrome = c)} tokens={defaultTokens} pages={pages} />);
    expect(screen.getByLabelText("Phone or email (optional)")).toBeTruthy();
    expect(screen.getByText("Top bar: write a short message, a link or a phone number or email, or turn it off.")).toBeTruthy();
  });
});

describe("F076 Site settings: footer", () => {
  it("switches to blocks, asks for the linked section and keeps the simple columns aside", () => {
    let chrome: SiteChrome = { header: defaultHeader("Atelier", pages), footer: { ...defaultFooter, text: "Hello" } };
    const { rerender } = render(<FooterOptions chrome={chrome} onChange={(c) => (chrome = c)} tokens={defaultTokens} pages={pages} />);
    expect(screen.getByLabelText("Short text (optional)")).toBeTruthy();
    fireEvent.click(screen.getByRole("radio", { name: /^Built from blocks/ }));
    expect(chrome.footer.kind).toBe("blocks");
    rerender(<FooterOptions chrome={chrome} onChange={(c) => (chrome = c)} tokens={defaultTokens} pages={pages} />);
    expect(screen.queryByLabelText("Short text (optional)")).toBeNull();
    expect(chrome.footer.text).toBe("Hello");
    expect(screen.getByLabelText("Linked section to use")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Make one from my simple footer" })).toBeTruthy();
    expect(screen.getByText("Footer: pick the linked section to use as the footer, or go back to Simple.")).toBeTruthy();
    expect(screen.getByLabelText("Copyright line")).toBeTruthy();
  });
});

// @vitest-environment happy-dom
import { config } from "@crust/blocks";
import type { ComponentData, Config, Data } from "@puckeditor/core";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { findById } from "../keyboard/moves";
import { matchesStyle, SavedStyles, styleKeys, styleOf, stylesFor, withStyle } from "../tabs/element-styles";
import { tabOf } from "../tabs/tabs";
import { MyLayoutsProvider } from "./mine";

const cfg = config as unknown as Config;
let data: Data;
let selected = "b1";
const dispatch = vi.fn((a: { type: string; destinationIndex?: number; data?: ComponentData }) => {
  if (a.type === "replace" && a.data) data = { ...data, content: data.content.map((c, i) => (i === a.destinationIndex ? a.data! : c)) };
});
const fake = {
  get appState() {
    return { data };
  },
  config: cfg,
  dispatch,
  getItemById: (id: string) => findById(data, id)?.item,
  getSelectorForId: (id: string) => {
    const at = findById(data, id);
    return at ? { index: at.index, zone: at.zone } : undefined;
  },
};
vi.mock("@puckeditor/core", async (orig) => ({
  ...(await orig<typeof import("@puckeditor/core")>()),
  useGetPuck: () => () => fake,
  createUsePuck: () => (selector: (s: unknown) => unknown) => selector({ appState: { data }, selectedItem: findById(data, selected)?.item ?? null }),
}));

const button = (id: string, props: Record<string, unknown>): ComponentData => ({
  type: "Button",
  props: { id, label: "Book a table", href: "/book", variant: "primary", align: "left", icon: "", iconAt: "before", ...props },
});
const buttonKeys = () => styleKeys(Object.keys(cfg.components.Button!.fields ?? {}), (k) => tabOf("Button", k) === "style");

beforeEach(() => {
  localStorage.clear();
  selected = "b1";
  data = { root: { props: {} }, content: [button("b1", { variant: "soft", icon: "arrow-right", iconAt: "after", align: "center" }), button("b2", {})] };
});
afterEach(() => {
  cleanup();
  dispatch.mockClear();
});

describe("saved element styles (F080): what a style holds", () => {
  it("holds only Style-tab settings: never words, links or photos", () => {
    const keys = buttonKeys();
    expect(keys).toEqual(expect.arrayContaining(["variant", "align", "iconAt"]));
    expect(keys).not.toContain("label");
    expect(keys).not.toContain("href");
    const sectionKeys = styleKeys(Object.keys(cfg.components.Section!.fields ?? {}), (k) => tabOf("Section", k) === "style");
    expect(sectionKeys).toContain("background");
    for (const k of ["imageSrc", "videoSrc", "focus", "content"]) expect(sectionKeys).not.toContain(k);
  });

  it("copies the style in, leaving the words and link alone", () => {
    const keys = buttonKeys();
    const style = styleOf(data.content[0]!.props, keys);
    expect(style).not.toHaveProperty("label");
    const applied = withStyle(data.content[1]!.props, style, keys);
    expect(applied).toMatchObject({ id: "b2", label: "Book a table", href: "/book", variant: "soft", iconAt: "after", align: "center" });
    expect(matchesStyle(applied, style, keys)).toBe(true);
    expect(matchesStyle(data.content[1]!.props, style, keys)).toBe(false);
  });

  it("lists only the styles saved from the same kind of block", () => {
    const saved = [
      { id: "a", name: "A", kind: "element" as const, savedAt: "", content: [{ type: "Button", props: {} } as ComponentData] },
      { id: "b", name: "B", kind: "element" as const, savedAt: "", content: [{ type: "Card", props: {} } as ComponentData] },
      { id: "c", name: "C", kind: "section" as const, savedAt: "", content: [{ type: "Button", props: {} } as ComponentData] },
    ];
    expect(stylesFor(saved, "Button").map((s) => s.id)).toEqual(["a"]);
  });
});

describe("saved element styles (F080): in the Style tab", () => {
  const ui = () =>
    render(
      <MyLayoutsProvider githubOn={false}>
        <SavedStyles component="Button" label="Button" keys={buttonKeys()} />
      </MyLayoutsProvider>,
    );

  it("saves the selected button's style under a name, then applies it to another button as one undo step", async () => {
    const { rerender } = ui();
    expect(screen.getByText(/save its style to use it on other buttons/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Save this button's style…" }));
    const name = screen.getByRole("textbox", { name: "Style name" });
    expect((name as HTMLInputElement).value).toBe("Button style");
    fireEvent.change(name, { target: { value: "Soft with arrow" } });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Save style" })));
    const saved = JSON.parse(localStorage.getItem("crust:my-layouts")!) as { kind: string; content: ComponentData[] }[];
    expect(saved[0]!.kind).toBe("element");
    expect(saved[0]!.content[0]!.props).not.toHaveProperty("label");
    // It's in use on the button it came from.
    expect(screen.getByRole("button", { name: /^Soft with arrow/ }).getAttribute("aria-pressed")).toBe("true");

    selected = "b2";
    rerender(
      <MyLayoutsProvider githubOn={false}>
        <SavedStyles component="Button" label="Button" keys={buttonKeys()} />
      </MyLayoutsProvider>,
    );
    const apply = screen.getByRole("button", { name: /^Soft with arrow/ });
    expect(apply.getAttribute("aria-pressed")).toBe("false");
    await act(async () => fireEvent.click(apply));
    const call = dispatch.mock.calls.find(([a]) => a.type === "replace")![0] as unknown as { recordHistory: boolean; data: ComponentData };
    expect(call.recordHistory).toBe(true);
    expect(call.data.props).toMatchObject({ id: "b2", label: "Book a table", variant: "soft", align: "center" });
  });

  it("renames and deletes from the same list, asking before deleting", async () => {
    localStorage.setItem(
      "crust:my-layouts",
      JSON.stringify([{ id: "local-1", name: "Quiet outline", kind: "element", savedAt: "2026-11-03", content: [{ type: "Button", props: { variant: "secondary" } }] }]),
    );
    ui();
    fireEvent.click(screen.getByRole("button", { name: "Rename Quiet outline" }));
    fireEvent.change(screen.getByRole("textbox", { name: "New name" }), { target: { value: "Outline" } });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Rename" })));
    expect(screen.getByRole("button", { name: /^Outline/ })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Delete Outline" }));
    expect(screen.getByRole("alert").textContent).toMatch(/Blocks that use it keep their look/);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Delete" })));
    expect(screen.queryByRole("button", { name: /^Outline/ })).toBeNull();
  });

  it("isn't shown for a block of another kind", () => {
    render(
      <MyLayoutsProvider githubOn={false}>
        <SavedStyles component="Card" label="Card" keys={["background"]} />
      </MyLayoutsProvider>,
    );
    expect(screen.queryByText("Saved styles")).toBeNull();
  });
});

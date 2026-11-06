// @vitest-environment happy-dom
/** F088: Add section, by picture: the Add panel. */
import { config } from "@crust/blocks";
import type { ComponentData, Config, Data } from "@puckeditor/core";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { findById } from "../keyboard/moves";
import { AddSectionPanel } from "./AddSectionPanel";
import { LayoutInserters } from "./LayoutGallery";
import { getAddAt, openLayoutGallery, registerGalleryOpener, setAddAt } from "./library";

vi.mock("@puckeditor/core", async (orig) => ({
  ...(await orig<typeof import("@puckeditor/core")>()),
  useGetPuck: () => () => fake,
  createUsePuck: () => (selector: (s: unknown) => unknown) => selector({ appState: { data }, config: cfg, selectedItem: fake.selectedItem }),
}));

const cfg = config as unknown as Config;
const block = (type: string, id: string): ComponentData => ({ type, props: { ...(cfg.components[type]?.defaultProps ?? {}), id } });
let data: Data;
let selected: string | null;
const dispatch = vi.fn();
const fake = {
  get appState() {
    return { data };
  },
  config: cfg,
  dispatch,
  get selectedItem() {
    return selected ? (findById(data, selected)?.item ?? null) : null;
  },
  getItemById: (id: string) => findById(data, id)?.item,
  getSelectorForId: (id: string) => {
    const at = findById(data, id);
    return at ? { index: at.index, zone: at.zone } : undefined;
  },
};

beforeEach(() => {
  data = { root: { props: {} }, content: [block("Section", "hero"), block("Section", "about")] };
  selected = null;
  dispatch.mockReset();
  setAddAt(null);
});
afterEach(() => cleanup());

const inserted = () => dispatch.mock.calls.find(([a]) => a.type === "setData")?.[0] as { data: Data; recordHistory: boolean } | undefined;

describe("add section panel", () => {
  it("shows pictures of sections as buttons, with the spot in words", () => {
    render(<AddSectionPanel />);
    expect(screen.getByRole("heading", { name: "Add section" })).toBeTruthy();
    expect(screen.getByRole("status").textContent).toMatch(/end of the page|after/i);
    expect(document.querySelectorAll(".lg-card .lg-thumb[aria-hidden='true']").length).toBeGreaterThan(5);
    expect(document.querySelectorAll("button.lg-card-button").length).toBeGreaterThan(5);
  });

  it("adds after the selected section in one undo step", () => {
    selected = "hero";
    render(<AddSectionPanel />);
    fireEvent.click(document.querySelector("button.lg-card-button")!);
    const set = inserted()!;
    expect(set.recordHistory).toBe(true);
    expect(set.data.content[0]!.props.id).toBe("hero");
    expect(set.data.content.length).toBeGreaterThan(2);
    expect(set.data.content[set.data.content.length - 1]!.props.id).toBe("about");
  });

  it("adds at the spot a + bar chose, then forgets it", () => {
    setAddAt(0);
    render(<AddSectionPanel />);
    fireEvent.click(document.querySelector("button.lg-card-button")!);
    expect(inserted()!.data.content.at(-1)!.props.id).toBe("about");
    expect(inserted()!.data.content[inserted()!.data.content.length - 2]!.props.id).toBe("hero");
    expect(getAddAt()).toBeNull();
  });

  it("filters by search and by category", () => {
    render(<AddSectionPanel />);
    const chip = within(screen.getByRole("list", { name: "Categories" })).getAllByRole("button")[1]!;
    fireEvent.click(chip);
    expect(chip.getAttribute("aria-pressed")).toBe("true");
    const metas = [...document.querySelectorAll(".lg-card-meta")].map((m) => m.textContent);
    expect(metas.length).toBeGreaterThan(0);
    expect(new Set(metas)).toEqual(new Set([chip.textContent]));
    fireEvent.change(screen.getByLabelText("Search layouts"), { target: { value: "zzzzzz" } });
    expect(screen.getByText(/No layouts match/)).toBeTruthy();
  });

  it("draws the first pictures and keeps the rest behind Show more", () => {
    render(<AddSectionPanel />);
    expect(document.querySelectorAll("button.lg-card-button")).toHaveLength(8);
    fireEvent.click(screen.getByRole("button", { name: /Show \d+ more layouts/ }));
    expect(document.querySelectorAll("button.lg-card-button").length).toBeGreaterThan(8);
  });

  it("keeps single blocks under 'Add an element', and a way to the large gallery", () => {
    const opener = vi.fn();
    const off = registerGalleryOpener(opener);
    render(<AddSectionPanel elements={<p>Blocks here</p>} />);
    expect(screen.getByText("Add an element").closest("details")!.textContent).toContain("Blocks here");
    fireEvent.click(screen.getByRole("button", { name: /See larger/ }));
    expect(opener).toHaveBeenCalledWith(expect.any(Number));
    off();
    openLayoutGallery(null);
  });

  it("a + bar picks the spot and opens the Add panel", async () => {
    document.body.innerHTML = `<div data-puck-dropzone="root:default-zone"><div data-puck-component="Section"></div><div data-puck-component="Section"></div></div>`;
    render(<LayoutInserters document={document} />);
    await act(async () => new Promise<void>((r) => requestAnimationFrame(() => r())));
    fireEvent.click(document.querySelectorAll<HTMLButtonElement>(".lg-insert")[1]!);
    expect(getAddAt()).toBe(1);
    expect(dispatch.mock.calls.some(([a]) => a.type === "setUi" && a.ui.plugin.current === "blocks")).toBe(true);
  });
});

// @vitest-environment happy-dom
/** F098: one full-screen gallery to add sections from (replaces the F088 Add panel). */
import { config } from "@crust/blocks";
import type { ComponentData, Config, Data } from "@puckeditor/core";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { findById } from "../keyboard/moves";
import { LayoutGallery, LayoutInserters } from "./LayoutGallery";
import { openLayoutGallery } from "./library";

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
});
afterEach(() => cleanup());

const inserted = () => dispatch.mock.calls.find(([a]) => a.type === "setData")?.[0] as { data: Data; recordHistory: boolean } | undefined;

describe("one gallery to add sections from", () => {
  const openAt = async (index: number | null) => {
    render(<LayoutGallery />);
    await act(async () => openLayoutGallery(index));
  };
  const pickFirst = () => fireEvent.click(document.querySelector("button.lg-card-button")!);
  const addButton = () => screen.getByRole("button", { name: "Add" }) as HTMLButtonElement;

  it("is full screen, with tabs Layouts and Mine, search and Type / Topic filters", async () => {
    await openAt(null);
    expect(screen.getByRole("heading", { name: "Add a section" })).toBeTruthy();
    expect(screen.getByRole("radio", { name: "Layouts" }).getAttribute("aria-checked")).toBe("true");
    expect(screen.getByRole("radio", { name: /^Mine/ })).toBeTruthy();
    expect(screen.getByRole("searchbox", { name: "Search layouts" })).toBeTruthy();
    expect(screen.getByRole("combobox", { name: "Type" })).toBeTruthy();
    expect(screen.getByRole("combobox", { name: "Topic" })).toBeTruthy();
    expect(document.querySelectorAll(".lg-card .lg-thumb[aria-hidden='true']").length).toBeGreaterThan(5);
  });

  it("choosing a picture does not add it: Add stays off until one is chosen", async () => {
    await openAt(null);
    expect(addButton().disabled).toBe(true);
    pickFirst();
    expect(dispatch.mock.calls.some(([a]) => a.type === "setData")).toBe(false);
    expect(document.querySelector("button.lg-card-button")!.getAttribute("aria-pressed")).toBe("true");
    expect(addButton().disabled).toBe(false);
    expect(screen.getByText(/^Chosen: /)).toBeTruthy();
  });

  it("starts after the selected section and offers every other place in 'Insert'", async () => {
    selected = "hero";
    await openAt(null);
    const where = screen.getByRole("combobox", { name: "Insert" }) as HTMLSelectElement;
    expect(where.value).toBe("1");
    expect([...where.options].map((o) => o.value)).toEqual(["0", "1", "2"]);
    expect(where.options[0]!.textContent).toMatch(/^At the top/);
    expect(where.options[1]!.textContent).toMatch(/^After /);
  });

  it("Add puts it after the chosen section in one undo step, selects it and closes", async () => {
    selected = "hero";
    await openAt(null);
    pickFirst();
    fireEvent.click(addButton());
    const set = inserted()!;
    expect(set.recordHistory).toBe(true);
    expect(set.data.content[0]!.props.id).toBe("hero");
    expect(set.data.content.length).toBeGreaterThan(2);
    expect(set.data.content[set.data.content.length - 1]!.props.id).toBe("about");
    expect(dispatch.mock.calls.some(([a]) => a.type === "setUi")).toBe(true);
    expect(document.querySelector(".lg-dialog")!.hasAttribute("open")).toBe(false);
  });

  it("changing 'Insert' moves where it lands", async () => {
    await openAt(null);
    fireEvent.change(screen.getByRole("combobox", { name: "Insert" }), { target: { value: "0" } });
    pickFirst();
    fireEvent.click(addButton());
    const content = inserted()!.data.content;
    expect(content.at(-2)!.props.id).toBe("hero");
    expect(content.at(-1)!.props.id).toBe("about");
    expect(content[0]!.props.id).not.toBe("hero");
  });

  it("filters by Topic and by search", async () => {
    await openAt(null);
    const topic = screen.getByRole("combobox", { name: "Topic" }) as HTMLSelectElement;
    fireEvent.change(topic, { target: { value: topic.options[1]!.value } });
    const metas = [...document.querySelectorAll(".lg-card-meta")].map((m) => m.textContent);
    expect(metas.length).toBeGreaterThan(0);
    expect(new Set(metas)).toEqual(new Set([topic.options[1]!.value]));
    fireEvent.change(screen.getByLabelText("Search layouts"), { target: { value: "zzzzzz" } });
    expect(screen.getByText(/No layouts match/)).toBeTruthy();
  });

  it("Type switches to whole pages; Topic only shows for sections", async () => {
    await openAt(null);
    fireEvent.change(screen.getByRole("combobox", { name: "Type" }), { target: { value: "page" } });
    expect(screen.queryByRole("combobox", { name: "Topic" })).toBeNull();
    expect(screen.getByText(/adds all its sections at once/)).toBeTruthy();
  });

  it("the Mine tab says what to do when nothing is saved", async () => {
    await openAt(null);
    fireEvent.click(screen.getByRole("radio", { name: /^Mine/ }));
    expect(screen.queryByRole("combobox", { name: "Type" })).toBeNull();
    expect(document.querySelector(".lg-dialog")!.textContent).toMatch(/Loading your layouts|Nothing saved yet|Try again/);
  });

  it("a + bar opens the gallery at its spot", async () => {
    document.body.innerHTML = `<div data-puck-dropzone="root:default-zone"><div data-puck-component="Section"></div><div data-puck-component="Section"></div></div>`;
    const dlg = document.createElement("div");
    document.body.append(dlg);
    render(<LayoutInserters document={document} />);
    render(<LayoutGallery />, { container: dlg });
    await act(async () => new Promise<void>((r) => requestAnimationFrame(() => r())));
    await act(async () => fireEvent.click(document.querySelectorAll<HTMLButtonElement>(".lg-insert")[1]!));
    expect((screen.getByRole("combobox", { name: "Insert" }) as HTMLSelectElement).value).toBe("1");
    expect(document.getElementById("lg-where")!.textContent).toMatch(/^Adds between /);
  });
});

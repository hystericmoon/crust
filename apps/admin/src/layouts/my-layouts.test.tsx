// @vitest-environment happy-dom
import { config, type SavedLayout } from "@crust/blocks";
import type { ComponentData, Config, Data } from "@puckeditor/core";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { findById } from "../keyboard/moves";
import { LayoutGallery } from "./LayoutGallery";
import { filterLayouts, freshIds, openLayoutGallery, planLayoutInsert } from "./library";
import { MyLayoutsProvider, nameProblem, readLocalLayouts, useMyLayouts } from "./mine";
import { SaveLayoutAction } from "./SaveLayoutAction";

const api = vi.hoisted(() => ({
  listLayouts: vi.fn(),
  saveLayout: vi.fn(),
  renameLayout: vi.fn(),
  deleteLayout: vi.fn(),
}));
vi.mock("../api-client", async (orig) => ({ ...(await orig<typeof import("../api-client")>()), ...api }));

vi.mock("@puckeditor/core", async (orig) => {
  const real = await orig<typeof import("@puckeditor/core")>();
  const Group = ({ children }: { children: unknown }) => children;
  return {
    ...real,
    ActionBar: Object.assign(({ children }: { children: unknown }) => children, { Group }),
    useGetPuck: () => () => fake,
    createUsePuck: () => (selector: (s: unknown) => unknown) => selector({ appState: { data }, config: cfg, selectedItem: fake.selectedItem }),
  };
});

const cfg = config as unknown as Config;
const block = (type: string, id: string, props: Record<string, unknown> = {}): ComponentData => ({
  type,
  props: { ...(cfg.components[type]?.defaultProps ?? {}), ...props, id },
});

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
    return selected ? findById(data, selected)?.item ?? null : null;
  },
  getItemById: (id: string) => findById(data, id)?.item,
  getSelectorForId: (id: string) => {
    const at = findById(data, id);
    return at ? { index: at.index, zone: at.zone } : undefined;
  },
};

const hero = () => block("Section", "hero", { content: [block("Heading", "h1", { text: "Welcome", level: "h1" })] });
const how = () => block("Section", "how", { content: [block("Heading", "h2", { text: "How it works", level: "h2" }), block("Text", "t")] });
const savedLayout = (over: Partial<SavedLayout> = {}): SavedLayout => ({
  id: "kept",
  name: "Kept section",
  kind: "section",
  savedAt: "2026-10-29T10:00:00.000Z",
  content: [how()],
  ...over,
});

beforeEach(() => {
  data = { root: { props: { title: "Home page" } }, content: [hero(), how()] };
  selected = null;
  dispatch.mockReset();
  Object.values(api).forEach((f) => f.mockReset());
  localStorage.clear();
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
});
afterEach(() => cleanup());

/** Renders the gallery inside the provider and opens it on My layouts. */
async function openMine(githubOn = false) {
  render(
    <MyLayoutsProvider githubOn={githubOn}>
      <LayoutGallery />
    </MyLayoutsProvider>,
  );
  await act(async () => openLayoutGallery(null));
  fireEvent.click(screen.getByRole("radio", { name: /My layouts/ }));
}

describe("my-layouts: the pieces", () => {
  it("asks for a usable name", () => {
    expect(nameProblem("  ")).toBe("Give the layout a name.");
    expect(nameProblem("x".repeat(61))).toMatch(/under 60/);
    expect(nameProblem("Hero")).toBeNull();
  });

  it("inserts a copy with new ids all the way down, every time", () => {
    const [a] = freshIds([how()]);
    const [b] = freshIds([how()]);
    expect(a!.props.id).not.toBe("how");
    expect(a!.props.id).not.toBe(b!.props.id);
    const inner = (a!.props.content as ComponentData[])[0]!;
    expect(inner.props.id).not.toBe("h2");
    expect(inner.props.text).toBe("How it works");
  });

  it("filters saved layouts by name, and inserts them with one h1", () => {
    const mine = [savedLayout(), savedLayout({ id: "p", name: "Landing", kind: "page", content: [hero(), how()] })];
    expect(filterLayouts("mine", "All", "landing", mine).map((i) => i.layout.id)).toEqual(["p"]);
    expect(filterLayouts("mine", "All", "", mine)).toHaveLength(2);
    const plan = planLayoutInsert(data, filterLayouts("mine", "All", "landing", mine)[0]!, 2)!;
    expect(plan.data.content).toHaveLength(4);
    const levels = JSON.stringify(plan.data.content).match(/"level":"h1"/g);
    expect(levels).toHaveLength(1);
    expect(plan.announcement).toBe("Added your layout “Landing”: 2 sections.");
  });
});

describe("my-layouts: saving in this browser (GitHub off)", () => {
  function Probe({ run }: { run: (m: ReturnType<typeof useMyLayouts>) => void }) {
    run(useMyLayouts());
    return null;
  }

  it("saves, renames and deletes, and keeps them across reloads", async () => {
    let mine!: ReturnType<typeof useMyLayouts>;
    render(
      <MyLayoutsProvider githubOn={false}>
        <Probe run={(m) => (mine = m)} />
      </MyLayoutsProvider>,
    );
    await waitFor(() => expect(mine.layouts).toEqual([]));
    expect(mine.where).toBe("this browser");
    await act(async () => expect(await mine.save("  Kept  ", "section", [how()])).toBeNull());
    expect(readLocalLayouts().map((l) => l.name)).toEqual(["Kept"]);
    expect(screen.getByText("Saved “Kept” to My layouts.")).toBeTruthy();
    const id = mine.layouts![0]!.id;
    await act(async () => expect(await mine.rename(id, "Kept again")).toBeNull());
    expect(readLocalLayouts()[0]!.name).toBe("Kept again");
    await act(async () => expect(await mine.save("", "section", [how()])).toBe("Give the layout a name."));
    await act(async () => expect(await mine.remove(id)).toBeNull());
    expect(readLocalLayouts()).toEqual([]);
    expect(screen.getByText("Deleted “Kept again”. Pages that use it are unchanged.")).toBeTruthy();
  });
});

describe("my-layouts: saving to GitHub", () => {
  it("loads from GitHub and says so when it can't", async () => {
    api.listLayouts.mockResolvedValueOnce({ ok: false, error: "GitHub is down." });
    await openMine(true);
    expect(await screen.findByText("Couldn't load your layouts from GitHub: GitHub is down.")).toBeTruthy();
    api.listLayouts.mockResolvedValueOnce({ ok: true, layouts: [savedLayout()] });
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("button", { name: /^Kept section/ })).toBeTruthy();
  });

  it("keeps the form open with the reason when a save fails", async () => {
    api.listLayouts.mockResolvedValue({ ok: true, layouts: [] });
    api.saveLayout.mockResolvedValue({ ok: false, error: "Someone else saved at the same time." });
    await openMine(true);
    await screen.findByText(/Nothing saved yet/);
    fireEvent.click(screen.getByRole("button", { name: "Save this page as a layout" }));
    const input = screen.getByLabelText("Name for this page layout") as HTMLInputElement;
    expect(input.value).toBe("Home page");
    await act(async () => fireEvent.submit(input.form!));
    expect(api.saveLayout).toHaveBeenCalledWith({ name: "Home page", kind: "page", content: data.content });
    expect(screen.getByRole("alert").textContent).toBe("Not saved: Someone else saved at the same time.");
    expect(input.getAttribute("aria-invalid")).toBe("true");
  });
});

describe("my-layouts: the gallery tab", () => {
  it("shows an empty state that says how to save", async () => {
    await openMine();
    expect(screen.getByText(/Nothing saved yet\./)).toBeTruthy();
    expect(screen.getByText(/kept in this browser/)).toBeTruthy();
  });

  it("inserts a saved layout as one undo step, with fresh ids", async () => {
    localStorage.setItem("crust:my-layouts", JSON.stringify([savedLayout()]));
    await openMine();
    expect(screen.getByRole("radio", { name: "My layouts (1)" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /^Kept section/ }));
    const set = dispatch.mock.calls.find(([a]) => a.type === "setData")![0];
    expect(set.recordHistory).toBe(true);
    expect(set.data.content).toHaveLength(3);
    expect(set.data.content[2].props.id).not.toBe("how");
  });

  it("renames and deletes from the card's menu, with a confirmation", async () => {
    localStorage.setItem("crust:my-layouts", JSON.stringify([savedLayout()]));
    await openMine();
    const more = screen.getByRole("button", { name: "More for Kept section" });
    fireEvent.click(more);
    expect(more.getAttribute("aria-expanded")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Rename" }));
    const input = screen.getByLabelText("New name") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "Renamed" } });
    await act(async () => fireEvent.submit(input.form!));
    expect(screen.getByRole("button", { name: /^Renamed/ })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "More for Renamed" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(screen.getByText("Delete “Renamed”? Pages that already use it keep their copy.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Keep it" }));
    expect(screen.getByRole("button", { name: /^Renamed/ })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "More for Renamed" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Delete layout" })));
    expect(screen.queryByRole("button", { name: /^Renamed/ })).toBeNull();
    expect(readLocalLayouts()).toEqual([]);
  });

  it("Escape closes the card's menu, not the gallery", async () => {
    localStorage.setItem("crust:my-layouts", JSON.stringify([savedLayout()]));
    await openMine();
    fireEvent.click(screen.getByRole("button", { name: "More for Kept section" }));
    const rename = screen.getByRole("button", { name: "Rename" });
    const esc = new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true });
    act(() => {
      rename.dispatchEvent(esc);
    });
    expect(esc.defaultPrevented).toBe(true);
    expect(screen.queryByRole("button", { name: "Rename" })).toBeNull();
  });
});

describe("my-layouts: Save as layout on the section toolbar", () => {
  it("only shows for a selected section", () => {
    selected = "h1";
    const { container } = render(<SaveLayoutAction />);
    expect(container.textContent).toBe("");
  });

  it("saves the selected section, named after its heading", async () => {
    selected = "how";
    let mine!: ReturnType<typeof useMyLayouts>;
    function Probe() {
      mine = useMyLayouts();
      return null;
    }
    render(
      <MyLayoutsProvider githubOn={false}>
        <SaveLayoutAction />
        <Probe />
      </MyLayoutsProvider>,
    );
    const button = screen.getByRole("button", { name: "Save as layout" });
    fireEvent.click(button);
    expect(button.getAttribute("aria-expanded")).toBe("true");
    const input = screen.getByLabelText("Layout name") as HTMLInputElement;
    expect(input.value).toBe("How it works");
    await act(async () => fireEvent.submit(input.form!));
    expect(mine.layouts!.map((l) => [l.name, l.kind, l.content[0]!.props.id])).toEqual([["How it works", "section", "how"]]);
    expect(screen.queryByLabelText("Layout name")).toBeNull();
  });
});

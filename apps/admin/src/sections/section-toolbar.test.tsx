// @vitest-environment happy-dom
// F089: the one-row section toolbar (Section, Style, Layout, Move, More).
import { config, defaultTokens } from "@crust/blocks";
import type { ComponentData, Config, Data } from "@puckeditor/core";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { findById } from "../keyboard/moves";
import { MyLayoutsProvider } from "../layouts/mine";
import { SectionToolbar, setScope } from "./editing";
import { SiteStyleContext, type SiteStyle } from "./site-style";

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

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});
beforeEach(() => {
  data = {
    root: { props: { title: "Home" } },
    content: [
      block("Section", "a", { background: "surface", content: [block("Heading", "h", { text: "Plans", level: "h2" })] }),
      block("Section", "b", { background: "surface" }),
      block("Section", "c", { background: "dark" }),
    ],
  };
  selected = "a";
  dispatch.mockReset();
  setScope("local");
});
afterEach(() => {
  cleanup();
  localStorage.clear();
});

const site: SiteStyle = { tokens: defaultTokens, setTokens: () => undefined, dirty: false, save: async () => "Saved", discard: () => undefined };
const bar = () =>
  render(
    <SiteStyleContext.Provider value={site}>
      <MyLayoutsProvider githubOn={false}>
        <SectionToolbar moves={<button type="button">Move down</button>} />
      </MyLayoutsProvider>
    </SiteStyleContext.Provider>,
  );
const row = () => screen.getByRole("toolbar", { name: "Section" });
const names = () => within(row()).getAllByRole("button").map((b) => b.textContent!.replace(/[▾⋯]/g, "").trim());

describe("section toolbar", () => {
  it("is one row: Section, Style, Layout, Move, More", () => {
    bar();
    expect(names()).toEqual(["Section", "Style", "Layout", "Move down", "More"]);
  });

  it("shows nothing when no section is selected", () => {
    selected = null;
    const { container } = bar();
    expect(container.textContent).toBe("");
  });

  it("Style lists four named colours and changes this section only", () => {
    bar();
    fireEvent.click(screen.getByRole("button", { name: /Style/ }));
    const group = screen.getByRole("radiogroup", { name: "Section style" });
    expect(within(group).getAllByRole("radio")).toHaveLength(4);
    expect(group.textContent).toMatch(/Page.*Muted.*Brand.*Dark|Page.*Muted.*Primary.*Dark/);
    fireEvent.click(within(group).getByRole("radio", { name: /Dark style/ }));
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch.mock.calls[0]![0].data.props.background).toBe("dark");
    expect(screen.getByText("Changes this section only.")).toBeTruthy();
  });

  it("Layout sets the height", () => {
    bar();
    fireEvent.click(screen.getByRole("button", { name: /Layout/ }));
    fireEvent.click(screen.getByRole("radio", { name: "Full screen" }));
    expect(dispatch.mock.calls[0]![0].data.props.height).toBe("full");
  });

  it("opens one menu at a time and Escape closes it and returns focus", () => {
    bar();
    const style = screen.getByRole("button", { name: /Style/ });
    const layout = screen.getByRole("button", { name: /Layout/ });
    fireEvent.click(style);
    fireEvent.click(layout);
    expect(style.getAttribute("aria-expanded")).toBe("false");
    expect(layout.getAttribute("aria-expanded")).toBe("true");
    fireEvent.keyDown(layout, { key: "Escape" });
    expect(layout.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(layout);
  });

  it("arrow keys move along the row, wrapping round", () => {
    bar();
    const section = screen.getByRole("button", { name: /^Section/ });
    section.focus();
    fireEvent.keyDown(section, { key: "ArrowRight" });
    expect(document.activeElement).toBe(screen.getByRole("button", { name: /Style/ }));
    fireEvent.keyDown(document.activeElement!, { key: "ArrowLeft" });
    fireEvent.keyDown(document.activeElement!, { key: "ArrowLeft" });
    expect(document.activeElement).toBe(screen.getByRole("button", { name: /More/ }));
  });

  it("keeps the site-wide actions under More", () => {
    bar();
    expect(screen.queryByRole("button", { name: /everywhere/ })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /More/ }));
    expect(screen.getByRole("button", { name: /Change “Muted” everywhere/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Make linked/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Save as layout/ })).toBeTruthy();
  });

  it("asks before changing a style everywhere, and says how many sections", () => {
    bar();
    fireEvent.click(screen.getByRole("button", { name: /More/ }));
    fireEvent.click(screen.getByRole("button", { name: /Change “Muted” everywhere/ }));
    expect(screen.getByText("Change “Muted” everywhere?")).toBeTruthy();
    expect(screen.getByText(/changes 2 sections on this page/i)).toBeTruthy();
    expect(screen.queryByRole("group", { name: /for the whole site/ })).toBeNull();
    // Cancel goes back to the menu without changing anything.
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByRole("button", { name: /Save as layout/ })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Change “Muted” everywhere/ }));
    act(() => fireEvent.click(screen.getByRole("button", { name: "Change everywhere" })));
    expect(screen.getByRole("group", { name: /Edit the Muted style for the whole site/ })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Done editing everywhere" }));
    expect(screen.queryByRole("group", { name: /for the whole site/ })).toBeNull();
  });

  it("Save as layout and Make linked open their forms from More", () => {
    bar();
    fireEvent.click(screen.getByRole("button", { name: /More/ }));
    fireEvent.click(screen.getByRole("button", { name: /Save as layout/ }));
    expect((screen.getByLabelText("Layout name") as HTMLInputElement).value).toBe("Plans");
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByLabelText("Layout name")).toBeNull();
  });
});

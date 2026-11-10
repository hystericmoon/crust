// @vitest-environment happy-dom
import { config } from "@crust/blocks";
import type { ComponentData, Config, Data } from "@puckeditor/core";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { stopInlineEdit } from "../inline-text/store";
import { findById } from "./moves";
import { handleKey, openKeyboardHelp, KeyboardRoot } from "./KeyboardEditing";

vi.mock("@puckeditor/core", async (orig) => ({
  ...(await orig<typeof import("@puckeditor/core")>()),
  useGetPuck: () => () => fake,
}));

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
const getPuck = () => fake as never;

beforeEach(() => {
  data = {
    root: { props: {} },
    content: [block("Section", "s", { content: [block("Heading", "h", { text: "Hi" }), block("Text", "t")] })],
  };
  selected = null;
  stopInlineEdit();
  dispatch.mockReset();
  document.body.innerHTML = `
    <div data-puck-component="h" tabindex="0"></div>
    <div data-puck-component="t" tabindex="0"></div>
    <div data-puck-drawer-item data-testid="drawer-item:Image" tabindex="0"></div>
    <input id="field">`;
  vi.useFakeTimers();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const press = (selector: string, key: string, mods: Partial<KeyboardEventInit> = {}) => {
  const el = document.querySelector(selector)!;
  const e = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, ...mods });
  Object.defineProperty(e, "target", { value: el });
  handleKey(e, getPuck);
  return e;
};

describe("keyboard editing: key handling", () => {
  it("Enter selects the focused block", () => {
    const e = press('[data-puck-component="t"]', "Enter");
    expect(e.defaultPrevented).toBe(true);
    expect(dispatch).toHaveBeenCalledWith({ type: "setUi", ui: { itemSelector: { index: 1, zone: "s:content" } } });
  });

  it("Alt+ArrowUp moves the focused block up, then keeps it selected", () => {
    press('[data-puck-component="t"]', "ArrowUp", { altKey: true });
    expect(dispatch.mock.calls[0]?.[0]).toEqual({ type: "reorder", sourceIndex: 1, destinationIndex: 0, destinationZone: "s:content" });
    expect(dispatch.mock.calls[1]?.[0]).toMatchObject({ type: "setUi" });
  });

  it("Alt+ArrowLeft moves out; Alt+Shift+ArrowLeft asks for the previous column", () => {
    press('[data-puck-component="h"]', "ArrowLeft", { altKey: true });
    expect(dispatch.mock.calls[0]?.[0]).toMatchObject({ type: "move", destinationZone: "root:default-zone", destinationIndex: 1 });
    dispatch.mockReset();
    // Not in a multi-column block: nothing to do, nothing dispatched.
    press('[data-puck-component="h"]', "ArrowLeft", { altKey: true, shiftKey: true });
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("moves the selected block when focus is elsewhere, e.g. on its action bar", () => {
    selected = "t";
    document.body.insertAdjacentHTML("beforeend", '<button id="bar">x</button>');
    press("#bar", "ArrowUp", { altKey: true });
    expect(dispatch.mock.calls[0]?.[0]).toMatchObject({ type: "reorder", sourceIndex: 1, destinationIndex: 0 });
  });

  it("ignores shortcuts while typing in a field", () => {
    selected = "t";
    const e = press("#field", "ArrowUp", { altKey: true });
    expect(e.defaultPrevented).toBe(false);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("Enter on a block in the list adds it after the selected block", () => {
    selected = "h";
    press("[data-puck-drawer-item]", "Enter");
    expect(dispatch.mock.calls[0]?.[0]).toMatchObject({
      type: "insert",
      componentType: "Image",
      destinationIndex: 1,
      destinationZone: "s:content",
    });
  });

  it("Escape deselects", () => {
    selected = "h";
    press('[data-puck-component="h"]', "Escape");
    expect(dispatch).toHaveBeenCalledWith({ type: "setUi", ui: { itemSelector: null } });
  });

  it("announces moves in a polite live region", () => {
    render(
      <KeyboardRoot>
        <p>editor</p>
      </KeyboardRoot>,
    );
    press('[data-puck-component="t"]', "ArrowUp", { altKey: true });
    act(() => vi.advanceTimersByTime(100));
    const live = screen.getByRole("status");
    expect(live.getAttribute("aria-live")).toBe("polite");
    expect(live.textContent).toBe("Text moved up in Section, position 1 of 2.");
    press('[data-puck-component="h"]', "ArrowUp", { altKey: true });
    act(() => vi.advanceTimersByTime(100));
    expect(live.textContent).toBe("Heading can't move up from here.");
  });

  it("? opens the keyboard help", () => {
    render(
      <KeyboardRoot>
        <p>editor</p>
      </KeyboardRoot>,
    );
    const dialog = document.querySelector("dialog")!;
    dialog.showModal = vi.fn(() => dialog.setAttribute("open", ""));
    press('[data-puck-component="t"]', "?");
    expect(dialog.hasAttribute("open")).toBe(true);
    expect(screen.getByRole("heading", { name: "Keyboard shortcuts" })).toBeTruthy();
    expect(typeof openKeyboardHelp).toBe("function");
  });
});

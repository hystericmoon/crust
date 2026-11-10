import type React from "react";
// @vitest-environment happy-dom
import { config } from "@crust/blocks";
import type { ComponentData, Config, Data } from "@puckeditor/core";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { findById } from "../keyboard/moves";
import { handleKey } from "../keyboard/KeyboardEditing";
import { withInlineText } from "./InlineText";
import { editingId, isInlineType, startInlineEdit, stopInlineEdit } from "./store";

let data: Data;
let selected: string | null;
const dispatch = vi.fn();
const fake = {
  get appState() {
    return { data };
  },
  config: config as unknown as Config,
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
vi.mock("@puckeditor/core", async (orig) => ({
  ...(await orig<typeof import("@puckeditor/core")>()),
  useGetPuck: () => () => fake,
  createUsePuck: () => (sel: (s: unknown) => unknown) => sel(fake),
}));

const cfg = config as unknown as Config;
const inline = withInlineText(cfg as never) as unknown as Config;
const block = (type: string, id: string, props: Record<string, unknown> = {}): ComponentData => ({
  type,
  props: { ...(cfg.components[type]?.defaultProps ?? {}), ...props, id },
});
const draw = (item: ComponentData, isEditing = true) => {
  const Render = inline.components[item.type]!.render as (p: Record<string, unknown>) => React.ReactElement;
  return render(<Render {...item.props} puck={{ isEditing }} />);
};

beforeEach(() => {
  data = { root: { props: {} }, content: [block("Heading", "h", { text: "Hello <b>there</b>", level: "h2" }), block("Text", "t")] };
  selected = "h";
  dispatch.mockReset();
  stopInlineEdit();
});
afterEach(() => {
  cleanup();
  stopInlineEdit();
});

describe("inline text (F090): heading", () => {
  it("looks like the published heading until it is clicked, then types in place", () => {
    const { container } = draw(data.content[0]!);
    expect(container.querySelector("h2")?.textContent).toBe("Hello <b>there</b>");
    expect(screen.queryByRole("textbox")).toBeNull();
    fireEvent.click(container.querySelector("h2")!);
    expect(editingId()).toBe("h");
  });

  it("a real click lands on Puck's block wrapper (it switches off pointer events inside), and still types", async () => {
    const wrapper = document.createElement("div");
    wrapper.setAttribute("data-puck-component", "h");
    document.body.appendChild(wrapper);
    const Render = inline.components.Heading!.render as (p: Record<string, unknown>) => React.ReactElement;
    render(<Render {...data.content[0]!.props} puck={{ isEditing: true }} />, { container: wrapper });
    expect(editingId()).toBeNull();
    fireEvent.click(wrapper); // the wrapper itself, as in the browser
    await new Promise((r) => setTimeout(r, 5));
    expect(editingId()).toBe("h");
    wrapper.remove();
  });

  it("shows nothing extra on the published page or in preview", () => {
    const { container } = draw(data.content[0]!, false);
    expect(container.querySelector(".it-hit")).toBeNull();
    startInlineEdit("h");
    expect(container.querySelector("[contenteditable]")).toBeNull();
  });

  it("opens a labelled text box with a Heading options bar", () => {
    startInlineEdit("h");
    const { container } = draw(data.content[0]!);
    const box = screen.getByRole("textbox", { name: "Heading text" });
    expect(box.textContent).toBe("Hello <b>there</b>");
    expect(container.querySelector("b")).toBeNull();
    expect(screen.getByRole("toolbar", { name: "Heading options" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "H2" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("typing changes the heading in one undoable replace, keeping the other props", () => {
    startInlineEdit("h");
    draw(data.content[0]!);
    const box = screen.getByRole("textbox", { name: "Heading text" });
    box.textContent = "New words";
    fireEvent.input(box);
    expect(dispatch).toHaveBeenCalledTimes(1);
    const action = dispatch.mock.calls[0]![0];
    expect(action.type).toBe("replace");
    expect(action.data.props).toMatchObject({ id: "h", text: "New words", level: "h2" });
  });

  it("the level buttons change the level", () => {
    startInlineEdit("h");
    draw(data.content[0]!);
    fireEvent.click(screen.getByRole("button", { name: "H3" }));
    expect(dispatch.mock.calls[0]![0].data.props.level).toBe("h3");
  });

  it("Escape leaves, and Enter leaves too (no line breaks in a heading)", () => {
    startInlineEdit("h");
    draw(data.content[0]!);
    const box = screen.getByRole("textbox", { name: "Heading text" });
    fireEvent.keyDown(box, { key: "Escape" });
    expect(editingId()).toBeNull();
    act(() => startInlineEdit("h"));
    fireEvent.keyDown(screen.getByRole("textbox", { name: "Heading text" }), { key: "Enter" });
    expect(editingId()).toBeNull();
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("Done leaves", () => {
    startInlineEdit("h");
    draw(data.content[0]!);
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(editingId()).toBeNull();
  });

  it("picking another block ends it", () => {
    startInlineEdit("h");
    const { rerender } = draw(data.content[0]!);
    selected = "t";
    const Render = inline.components.Heading!.render as (p: Record<string, unknown>) => React.ReactElement;
    rerender(<Render {...data.content[0]!.props} puck={{ isEditing: true }} />);
    expect(editingId()).toBeNull();
  });

  it("a click on the page outside it ends it", () => {
    startInlineEdit("h");
    draw(data.content[0]!);
    fireEvent.pointerDown(document.body);
    expect(editingId()).toBeNull();
  });
});

describe("inline text (F090): text block", () => {
  it("opens the rich text editor floating over the text, with a Done button", async () => {
    selected = "t";
    startInlineEdit("t");
    const { container } = draw(data.content[1]!);
    expect(await screen.findByRole("textbox", { name: "Text" })).toBeTruthy();
    expect(screen.getByRole("toolbar", { name: "Format text" })).toBeTruthy();
    expect(container.querySelector(".rt-floating")).toBeTruthy();
    fireEvent.keyDown(screen.getByRole("textbox", { name: "Text" }), { key: "Escape" });
    expect(editingId()).toBeNull();
  });
});

describe("inline text (F090): keyboard", () => {
  const press = (key: string) => {
    document.body.innerHTML = `<div data-puck-component="h" tabindex="0"></div><div data-puck-component="t" tabindex="0"></div>`;
    const el = document.querySelector('[data-puck-component="h"]')!;
    const e = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true });
    Object.defineProperty(e, "target", { value: el });
    handleKey(e, () => fake as never);
    return e;
  };

  it("Enter on a selected heading starts typing on the page", () => {
    press("Enter");
    expect(editingId()).toBe("h");
  });

  it("other keys are left to the typing while it is open", () => {
    startInlineEdit("h");
    press("Escape");
    expect(editingId()).toBe("h");
  });

  it("only headings and text can be typed in", () => {
    expect(["Heading", "Text", "Button", "Image"].filter(isInlineType)).toEqual(["Heading", "Text"]);
  });
});

describe("inline text (F090): looks", () => {
  it("uses the app's tokens, never a raw colour", () => {
    const css = readFileSync("apps/admin/src/inline-text/inline-text.css", "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b|\brgba?\(|\bhsla?\(/i);
    expect(css).toContain("var(--app-acc)");
  });
});

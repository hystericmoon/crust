// @vitest-environment happy-dom
import { config } from "@crust/blocks";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { itemNoun, ItemsField, withItemEditing, type ItemsFieldDef } from "./items";

beforeAll(() => {
  globalThis.requestAnimationFrame ??= ((cb: FrameRequestCallback) => setTimeout(() => cb(0), 0)) as unknown as typeof requestAnimationFrame;
});
afterEach(cleanup);

const faq = (config.components.Accordion.fields as Record<string, ItemsFieldDef>).items!;

function setup(field: ItemsFieldDef, initial: Record<string, unknown>[]) {
  let latest = initial;
  function Harness() {
    const [items, setItems] = useState(initial);
    latest = items;
    return <ItemsField field={field} value={items} onChange={setItems} />;
  }
  render(<Harness />);
  return () => latest;
}
const start = [
  { question: "First?", answer: "One." },
  { question: "Second?", answer: "Two." },
];
const click = (name: string | RegExp) => act(() => fireEvent.click(screen.getByRole("button", { name })));

describe("block item lists: keyboard alternative to dragging", () => {
  it("is a labelled group listing each item by its summary", () => {
    setup(faq, start);
    expect(screen.getByRole("group", { name: "Questions" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "First?" }).getAttribute("aria-expanded")).toBe("false");
  });

  it("moves an item with buttons and announces where it went", () => {
    const items = setup(faq, start);
    expect((screen.getByRole("button", { name: "Move First? up" }) as HTMLButtonElement).disabled).toBe(true);
    click("Move First? down");
    expect(items().map((i) => i.question)).toEqual(["Second?", "First?"]);
    expect(screen.getByRole("status").textContent).toBe("First? moved to position 2 of 2.");
  });

  it("opens an item to edit its fields, each labelled with the item number", () => {
    const items = setup(faq, start);
    click("Second?");
    act(() => fireEvent.change(screen.getByLabelText("Answer (shown when opened), Question 2"), { target: { value: "Yes." } }));
    expect(items()[1]).toEqual({ question: "Second?", answer: "Yes." });
  });

  it("adds a new item with the block's defaults, opened, and removes one", () => {
    const items = setup(faq, start);
    click("Add a question");
    expect(items()[2]).toEqual({ question: "A question people ask", answer: "The answer." });
    expect(screen.getByRole("button", { name: "A question people ask" }).getAttribute("aria-expanded")).toBe("true");
    click("Remove First?");
    expect(items().map((i) => i.question)).toEqual(["Second?", "A question people ask"]);
    expect(screen.getByRole("status").textContent).toBe("First? removed.");
  });

  it("stops adding at the block's limit", () => {
    setup({ ...faq, max: 2 }, start);
    expect((screen.getByRole("button", { name: "Add a question" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText("That's the most this block can hold (2).")).toBeTruthy();
  });

  it("names items sensibly", () => {
    expect(itemNoun("Photos")).toBe("photo");
    expect(itemNoun("Cards")).toBe("card");
    expect(itemNoun("Whatever")).toBe("item");
  });
});

describe("block item lists in the builder config", () => {
  it("replaces every list field in the blocks with the keyboard-friendly one", () => {
    const edited = withItemEditing(config);
    for (const [name, comp] of Object.entries(edited.components)) {
      for (const [key, f] of Object.entries(comp.fields ?? {})) {
        expect((f as { type: string }).type, `${name}.${key}`).not.toBe("array");
      }
    }
    expect((edited.components.Gallery.fields as Record<string, { type: string; label: string }>).images).toMatchObject({ type: "custom", label: "Photos" });
  });
});

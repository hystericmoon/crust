// @vitest-environment happy-dom
import { config, type Components } from "@crust/blocks";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { Config } from "@puckeditor/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { IconPicker, PICKER_COLUMNS } from "./IconPicker";
import { withIconFields } from "./fields";
import { ItemsField, type ItemsFieldDef } from "../items/items";
import { tabOf } from "../tabs/tabs";

afterEach(() => cleanup());
const cell = (name: string) => screen.getByRole("button", { name });
const grid = () => screen.getByRole("group", { name: /^Icons, \d+$/ });
const cells = () => Array.from(grid().querySelectorAll<HTMLButtonElement>("button"));

describe("F077 icon picker", () => {
  it("shows the picked icon and picks another on click", () => {
    const onChange = vi.fn();
    render(<IconPicker label="Icon" value="truck" onChange={onChange} />);
    expect(screen.getByText("Truck", { selector: ".ic-picked" })).toBeTruthy();
    expect(cell("Truck").getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(cell("Phone"));
    expect(onChange).toHaveBeenCalledWith("phone");
  });

  it("searches by meaning", () => {
    render(<IconPicker label="Icon" value="" onChange={() => {}} />);
    fireEvent.change(screen.getByRole("searchbox", { name: "Search icons" }), { target: { value: "food" } });
    const names = cells().map((b) => b.getAttribute("aria-label"));
    expect(names).toContain("Utensils");
    expect(names).toContain("Pizza");
    expect(names).not.toContain("Phone");
    fireEvent.change(screen.getByRole("searchbox", { name: "Search icons" }), { target: { value: "qqqq" } });
    expect(screen.getByRole("status").textContent).toContain("No icon matches “qqqq”");
  });

  it("filters by category", () => {
    render(<IconPicker label="Icon" value="" onChange={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Arrows" }));
    expect(screen.getByRole("button", { name: "Arrows" }).getAttribute("aria-pressed")).toBe("true");
    const names = cells().map((b) => b.getAttribute("aria-label"));
    expect(names[0]).toBe("Arrow right");
    expect(names).not.toContain("Pizza");
  });

  it("has one Tab stop; arrow keys move by one and by a row, Enter picks", () => {
    const onChange = vi.fn();
    render(<IconPicker label="Icon" value="phone" onChange={onChange} />);
    const all = cells();
    expect(all.filter((b) => b.tabIndex === 0).map((b) => b.getAttribute("aria-label"))).toEqual(["Phone"]);
    const at = all.findIndex((b) => b.getAttribute("aria-label") === "Phone");
    fireEvent.keyDown(all[at]!, { key: "ArrowRight" });
    expect(document.activeElement).toBe(all[at + 1]);
    fireEvent.keyDown(all[at + 1]!, { key: "ArrowDown" });
    expect(document.activeElement).toBe(all[at + 1 + PICKER_COLUMNS]);
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.click(document.activeElement!);
    expect(onChange).toHaveBeenCalledWith(all[at + 1 + PICKER_COLUMNS]!.getAttribute("aria-label")!.toLowerCase().replace(/ /g, "-"));
    fireEvent.keyDown(document.activeElement!, { key: "Home" });
    expect(document.activeElement).toBe(all[0]);
  });

  it("offers No icon where it's optional, and the classic list marks for lists", () => {
    const onChange = vi.fn();
    render(<IconPicker label="Icon for every line" value="check" onChange={onChange} optional classic />);
    expect(screen.getByRole("button", { name: "List marks" }).getAttribute("aria-pressed")).toBe("true");
    expect(cells().map((b) => b.getAttribute("aria-label"))).toEqual(["No icon", "Check (list mark)", "Arrow (list mark)", "Star (list mark)", "Dot (list mark)", "Plus (list mark)", "Heart (list mark)"]);
    fireEvent.click(cell("No icon"));
    expect(onChange).toHaveBeenCalledWith("");
  });
});

describe("F077 builder fields", () => {
  const builder = withIconFields(config as Config<Components>);
  it("swaps the icon fields for the picker", () => {
    for (const name of ["Icon", "Card", "Button", "IconList"] as const) {
      expect((builder.components[name].fields as Record<string, { type: string }>).icon!.type).toBe("custom");
    }
    const items = (builder.components.IconList.fields as unknown as Record<string, ItemsFieldDef>).items!;
    expect(items.arrayFields.icon).toEqual({ type: "icon", label: "Own icon (optional)", classic: true });
  });

  it("puts a list line's own icon picker in the list editor", () => {
    const items = (builder.components.IconList.fields as unknown as Record<string, ItemsFieldDef>).items!;
    const onChange = vi.fn();
    render(<ItemsField field={items} value={[{ text: "Fast", icon: "" }]} onChange={onChange} />);
    fireEvent.click(screen.getAllByRole("button", { name: /Fast/ })[0]!);
    fireEvent.click(screen.getByRole("button", { name: "Star (list mark)" }));
    expect(onChange).toHaveBeenCalledWith([{ text: "Fast", icon: "star" }]);
  });

  it("keeps the Icon block's icon in Content and looks in Style", () => {
    expect(tabOf("Icon", "icon")).toBe("content");
    expect(tabOf("IconList", "icon")).toBe("style");
    expect(tabOf("Icon", "look")).toBe("style");
    expect(tabOf("Button", "iconAt")).toBe("style");
    expect(tabOf("SocialLinks", "show")).toBe("style");
    expect(tabOf("Divider", "space")).toBe("style");
  });
});

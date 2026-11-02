// @vitest-environment happy-dom
import { defaultTokens, type ColumnBox, type ColumnHighlight } from "@crust/blocks";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BoxPicker, HighlightPicker, PhoneOrderField, StickyPicker } from "./columns-v2-fields";

afterEach(() => cleanup());
const radio = (name: string | RegExp) => screen.getByRole("radio", { name });

describe("F074 column boxes", () => {
  it("starts with no box, then offers padding and corners once a style is picked", () => {
    let box: ColumnBox | undefined;
    const { rerender } = render(<BoxPicker tokens={defaultTokens} value={undefined} onChange={(b) => (box = b)} />);
    expect(radio("None").getAttribute("aria-checked")).toBe("true");
    expect(screen.queryByRole("radiogroup", { name: "Box padding" })).toBeNull();
    fireEvent.click(radio("Muted"));
    expect(box).toEqual({ style: "surface", padding: "md", rounded: true });
    rerender(<BoxPicker tokens={defaultTokens} value={box} onChange={(b) => (box = b)} />);
    fireEvent.click(radio("L"));
    expect(box?.padding).toBe("lg");
    fireEvent.click(screen.getByLabelText("Rounded corners"));
    expect(box?.rounded).toBe(false);
  });

  it("moves through styles with arrow keys", () => {
    const onChange = vi.fn();
    render(<BoxPicker tokens={defaultTokens} value={{ style: "surface", padding: "md", rounded: true }} onChange={onChange} />);
    fireEvent.keyDown(radio("Muted"), { key: "ArrowRight" });
    expect(onChange).toHaveBeenCalledWith({ style: "primary", padding: "md", rounded: true });
  });
});

describe("F074 highlight", () => {
  it("offers only columns that exist, then a style without None", () => {
    let h: ColumnHighlight | undefined;
    const { rerender } = render(<HighlightPicker tokens={defaultTokens} count={3} value={undefined} onChange={(v) => (h = v)} />);
    expect(screen.queryByRole("radio", { name: "Column 4" })).toBeNull();
    fireEvent.click(radio("Column 2"));
    expect(h).toEqual({ column: 2, style: "primary" });
    rerender(<HighlightPicker tokens={defaultTokens} count={3} value={h} onChange={(v) => (h = v)} />);
    expect(screen.getByRole("radiogroup", { name: "Column 2 style" })).toBeTruthy();
    fireEvent.click(radio("Dark"));
    expect(h).toEqual({ column: 2, style: "dark" });
    fireEvent.click(radio("None"));
    expect(h).toBeUndefined();
  });
});

describe("F074 phone order and sticky", () => {
  it("explains reading order, and warns when two columns have links", () => {
    const { rerender } = render(<PhoneOrderField value="reverse" onChange={() => undefined} warn={false} />);
    expect(screen.getByText(/still follow the written order/)).toBeTruthy();
    rerender(<PhoneOrderField value="reverse" onChange={() => undefined} warn />);
    expect(screen.getByText(/Tab key will reach them in written order/)).toBeTruthy();
  });

  it("offers None and each column", () => {
    const onChange = vi.fn();
    render(<StickyPicker count={2} value={undefined} onChange={onChange} />);
    expect(radio("None").getAttribute("aria-checked")).toBe("true");
    expect(screen.getAllByRole("radio")).toHaveLength(3);
    fireEvent.click(radio("Column 1"));
    expect(onChange).toHaveBeenCalledWith(1);
  });
});

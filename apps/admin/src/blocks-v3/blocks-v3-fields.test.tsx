// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { addColumn, addRow, isMultiCell, moveRow, normalise, parsePasted, pasteInto, removeColumn, removeRow, setCell, type Cells } from "./table-edit";
import { TableField } from "./TableField";
import { blockFieldShown, videoNotes } from "./fields";
import { IconPicker } from "../icons/IconPicker";
import { tabOf } from "../tabs/tabs";

afterEach(() => cleanup());

describe("F078 blocks-v3 table editing", () => {
  const g: Cells = [
    ["Day", "Studio"],
    ["Sat", "10–16"],
  ];
  it("normalises any value to an even grid of at least one cell", () => {
    expect(normalise(undefined)).toEqual([[""]]);
    expect(normalise([["a"], ["b", "c"], "x"])).toEqual([["a", ""], ["b", "c"], ["", ""]]);
  });
  it("adds, removes and moves rows and columns", () => {
    expect(addRow(g, 0)).toEqual([["Day", "Studio"], ["", ""], ["Sat", "10–16"]]);
    expect(addColumn(g, 0)).toEqual([["Day", "", "Studio"], ["Sat", "", "10–16"]]);
    expect(removeRow(g, 0)).toEqual([["Sat", "10–16"]]);
    expect(removeColumn(g, 1)).toEqual([["Day"], ["Sat"]]);
    expect(moveRow(g, 1, -1)).toEqual([["Sat", "10–16"], ["Day", "Studio"]]);
    expect(moveRow(g, 0, -1)).toBe(g);
    expect(removeRow([["x"]], 0)).toEqual([["x"]]);
    expect(setCell(g, 1, 1, "Closed")[1]).toEqual(["Sat", "Closed"]);
  });
  it("stays within the limits", () => {
    const wide = [Array.from({ length: 8 }, () => "x")];
    expect(addColumn(wide)).toBe(wide);
    const tall = Array.from({ length: 50 }, () => ["x"]);
    expect(addRow(tall)).toBe(tall);
  });
  it("reads cells copied from a spreadsheet, quoted cells included", () => {
    expect(parsePasted("Day\tStudio\r\nSat\t10–16\r\n")).toEqual([["Day", "Studio"], ["Sat", "10–16"]]);
    expect(parsePasted('"Tab\there"\t"Say ""hi"""\n"two\nlines"\tx')).toEqual([["Tab here", 'Say "hi"'], ["two lines", "x"]]);
    expect(isMultiCell("one cell\n")).toBe(false);
    expect(isMultiCell("a\tb")).toBe(true);
  });
  it("pastes from the chosen cell, growing the grid", () => {
    const out = pasteInto(g, 1, 1, [["a", "b"], ["c", "d"]]);
    expect(out.cells).toEqual([["Day", "Studio", ""], ["Sat", "a", "b"], ["", "c", "d"]]);
    expect([out.rows, out.columns]).toEqual([2, 2]);
  });
});

function Harness({ start, onChange }: { start: Cells; onChange?: (c: Cells) => void }) {
  const [cells, setCells] = useState<Cells>(start);
  return (
    <TableField
      value={cells}
      headers="both"
      onChange={(c) => {
        setCells(c);
        onChange?.(c);
      }}
    />
  );
}

describe("F078 blocks-v3 table field", () => {
  it("names every cell by row and column, marking headers", () => {
    render(<Harness start={[["Day", "Studio"], ["Sat", "10–16"]]} />);
    expect(screen.getByRole("textbox", { name: "Row 1, column 2 (header)" })).toBeTruthy();
    expect(screen.getByRole("textbox", { name: "Row 2, column 1 (header)" })).toBeTruthy();
    expect((screen.getByRole("textbox", { name: "Row 2, column 2" }) as HTMLInputElement).value).toBe("10–16");
  });
  it("edits, adds and removes with buttons, announcing each change", () => {
    const onChange = vi.fn();
    render(<Harness start={[["Day", "Studio"], ["Sat", "10–16"]]} onChange={onChange} />);
    fireEvent.change(screen.getByRole("textbox", { name: "Row 2, column 2" }), { target: { value: "Closed" } });
    expect(onChange).toHaveBeenLastCalledWith([["Day", "Studio"], ["Sat", "Closed"]]);
    fireEvent.focus(screen.getByRole("textbox", { name: "Row 2, column 2" }));
    fireEvent.click(screen.getByRole("button", { name: "Add row below" }));
    expect(onChange).toHaveBeenLastCalledWith([["Day", "Studio"], ["Sat", "Closed"], ["", ""]]);
    expect(screen.getByRole("status").textContent).toBe("Row added below row 2.");
    fireEvent.click(screen.getByRole("button", { name: "Add column right" }));
    expect(screen.getAllByRole("textbox")).toHaveLength(9);
    expect(screen.getByRole("button", { name: /^Remove row \d$/ })).toBeTruthy();
  });
  it("Enter in the last row starts a new row", () => {
    const onChange = vi.fn();
    render(<Harness start={[["a"]]} onChange={onChange} />);
    fireEvent.keyDown(screen.getByRole("textbox", { name: "Row 1, column 1 (header)" }), { key: "Enter" });
    expect(onChange).toHaveBeenLastCalledWith([["a"], [""]]);
  });
  it("pasting several cells fills the grid", () => {
    const onChange = vi.fn();
    render(<Harness start={[["", ""]]} onChange={onChange} />);
    const cell = screen.getByRole("textbox", { name: "Row 1, column 1 (header)" });
    fireEvent.paste(cell, { clipboardData: { getData: () => "Day\tStudio\nSat\t10–16" } });
    expect(onChange).toHaveBeenLastCalledWith([["Day", "Studio"], ["Sat", "10–16"]]);
    expect(screen.getByRole("status").textContent).toBe("Pasted 2 rows of 2 cells.");
  });
});

describe("F078 blocks-v3 fields shown and notes", () => {
  it("shows a field only when it matters", () => {
    expect(blockFieldShown("IconList", "numberStyle", { icon: "check" })).toBe(false);
    expect(blockFieldShown("IconList", "numberStyle", { icon: "numbers" })).toBe(true);
    expect(blockFieldShown("Pricing", "badge", { highlight: "none" })).toBe(false);
    expect(blockFieldShown("Pricing", "highlightStyle", { highlight: "2" })).toBe(true);
    expect(blockFieldShown("Video", "captionsSrc", { src: "https://youtu.be/aqz-KE-bpKQ" })).toBe(false);
    expect(blockFieldShown("Video", "captionsSrc", { src: "/media/a.mp4" })).toBe(true);
    expect(blockFieldShown("Heading", "text", {})).toBe(true);
  });
  it("says what was found under a video's address, and what's missing", () => {
    expect(videoNotes({ src: "https://youtu.be/aqz-KE-bpKQ", title: "Bakery", imageSrc: "/a.jpg" })).toEqual([
      { text: "YouTube video found. Nothing loads from YouTube until a visitor presses play; captions show when the video has them." },
    ]);
    const file = videoNotes({ src: "/media/a.mp4", title: "" });
    expect(file.filter((n) => n.warning).map((n) => n.text.slice(0, 20))).toEqual(["Does it have speech?", "Say what the video i"]);
    expect(videoNotes({ src: "https://example.com" })[0]!.warning).toBe(true);
  });
  it("puts looks in the Style tab and words in Content", () => {
    expect(tabOf("IconList", "numberStyle")).toBe("style");
    expect(tabOf("Pricing", "planStyle")).toBe("style");
    expect(tabOf("Pricing", "highlight")).toBe("style");
    expect(tabOf("Pricing", "plans")).toBe("content");
    expect(tabOf("Stats", "look")).toBe("style");
    expect(tabOf("Video", "ratio")).toBe("style");
    expect(tabOf("Table", "rows")).toBe("content");
    expect(tabOf("Table", "headers")).toBe("content");
  });
});

describe("F078 blocks-v3 numbers in the icon picker", () => {
  it("offers Numbers first among the list marks, and finds it by search", () => {
    const onChange = vi.fn();
    render(<IconPicker label="Icon for every line" value="check" onChange={onChange} classic numbers />);
    const first = screen.getByRole("group", { name: /^Icons, \d+$/ }).querySelector("button")!;
    expect(first.getAttribute("aria-label")).toBe("Numbers 1, 2, 3 (numbered list)");
    fireEvent.click(first);
    expect(onChange).toHaveBeenCalledWith("numbers");
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "steps" } });
    expect(screen.getByRole("button", { name: "Numbers 1, 2, 3 (numbered list)" })).toBeTruthy();
  });
  it("isn't offered for a line's own icon", () => {
    render(<IconPicker label="Own icon" value="" onChange={() => {}} classic optional />);
    expect(screen.queryByRole("button", { name: "Numbers 1, 2, 3 (numbered list)" })).toBeNull();
  });
});

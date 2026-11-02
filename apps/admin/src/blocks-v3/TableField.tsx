/**
 * The Table block's cells (F078, direction A of
 * https://claude.ai/artifact/X3bMNKoE6MCU7EqbLJx2mk): a grid of text boxes
 * that looks like the table it makes. Buttons add, remove and move rows and
 * columns (no dragging); Tab, Enter and the Up/Down arrows move between
 * cells; cells copied from a spreadsheet fill the grid when pasted.
 *
 * Why a grid: you see and change the table as a table (recognition over
 * recall), and a column is added once instead of in every row.
 */
import { blocksV3Limits } from "@crust/blocks";
import { useId, useRef, useState, type ClipboardEvent, type KeyboardEvent } from "react";
import { addColumn, addRow, isMultiCell, moveRow, normalise, parsePasted, pasteInto, removeColumn, removeRow, setCell, width, type Cells } from "./table-edit";

export interface TableFieldProps {
  value: unknown;
  onChange: (cells: Cells) => void;
  /** Which cells are headers, so the grid can mark them. */
  headers: "top" | "both" | "none";
}

export function TableField({ value, onChange, headers }: TableFieldProps) {
  const id = useId();
  const cells = normalise(value);
  const cols = width(cells);
  const [at, setAt] = useState<[number, number]>([0, 0]);
  const [message, setMessage] = useState("");
  const grid = useRef<HTMLDivElement>(null);
  const [r, c] = [Math.min(at[0], cells.length - 1), Math.min(at[1], cols - 1)];

  const cellId = (row: number, col: number) => `${id}-r${row}c${col}`;
  const focus = (row: number, col: number) => requestAnimationFrame(() => document.getElementById(cellId(row, col))?.focus());
  const change = (next: Cells, say: string, focusAt?: [number, number]) => {
    onChange(next);
    setMessage(say);
    if (focusAt) {
      setAt(focusAt);
      focus(...focusAt);
    }
  };
  const isHeader = (row: number, col: number) => (headers !== "none" && row === 0) || (headers === "both" && col === 0);
  const nameOf = (row: number, col: number) => `Row ${row + 1}, column ${col + 1}${isHeader(row, col) ? " (header)" : ""}`;

  const onKey = (e: KeyboardEvent<HTMLInputElement>, row: number, col: number) => {
    if (e.key === "ArrowUp" && row > 0) {
      e.preventDefault();
      focus(row - 1, col);
    } else if ((e.key === "ArrowDown" || e.key === "Enter") && row < cells.length - 1) {
      e.preventDefault();
      focus(row + 1, col);
    } else if (e.key === "Enter" && cells.length < blocksV3Limits.tableRows) {
      // Enter in the last row starts a new one, as in a spreadsheet.
      e.preventDefault();
      change(addRow(cells), `Row ${cells.length + 1} added.`, [row + 1, col]);
    }
  };
  const onPaste = (e: ClipboardEvent<HTMLInputElement>, row: number, col: number) => {
    const text = e.clipboardData.getData("text/plain");
    if (!isMultiCell(text)) return;
    e.preventDefault();
    const pasted = pasteInto(cells, row, col, parsePasted(text));
    change(pasted.cells, `Pasted ${pasted.rows} ${pasted.rows === 1 ? "row" : "rows"} of ${pasted.columns} ${pasted.columns === 1 ? "cell" : "cells"}.`);
  };

  const full = { rows: cells.length >= blocksV3Limits.tableRows, cols: cols >= blocksV3Limits.tableColumns };
  return (
    <div className="tv-table" role="group" aria-labelledby={`${id}-label`}>
      <div className="tv-head">
        <span className="tv-label" id={`${id}-label`}>
          Cells
        </span>
        <span className="tv-size">
          {cells.length} × {cols}
        </span>
      </div>
      <div className="tv-scroll">
        <div className="tv-grid" ref={grid} style={{ gridTemplateColumns: `repeat(${cols}, minmax(7.5rem, 1fr))` }}>
          {cells.map((row, i) =>
            row.map((text, j) => (
              <input
                key={`${i}-${j}`}
                id={cellId(i, j)}
                className={`tv-cell${isHeader(i, j) ? " is-header" : ""}${i === r && j === c ? " is-current" : ""}`}
                aria-label={nameOf(i, j)}
                value={text}
                maxLength={blocksV3Limits.tableCell}
                onFocus={() => setAt([i, j])}
                onChange={(e) => onChange(setCell(cells, i, j, e.target.value))}
                onKeyDown={(e) => onKey(e, i, j)}
                onPaste={(e) => onPaste(e, i, j)}
              />
            )),
          )}
        </div>
      </div>
      <div className="tv-actions" role="group" aria-label="Rows and columns">
        <button type="button" className="tv-btn" disabled={full.rows} onClick={() => change(addRow(cells, r), `Row added below row ${r + 1}.`, [r + 1, c])}>
          Add row below
        </button>
        <button type="button" className="tv-btn" disabled={full.cols} onClick={() => change(addColumn(cells, c), `Column added right of column ${c + 1}.`, [r, c + 1])}>
          Add column right
        </button>
        <button type="button" className="tv-btn" disabled={r === 0} onClick={() => change(moveRow(cells, r, -1), `Row moved up to row ${r}.`, [r - 1, c])}>
          Move row up
        </button>
        <button type="button" className="tv-btn" disabled={r >= cells.length - 1} onClick={() => change(moveRow(cells, r, 1), `Row moved down to row ${r + 2}.`, [r + 1, c])}>
          Move row down
        </button>
        <button type="button" className="tv-btn" disabled={cells.length <= 1} onClick={() => change(removeRow(cells, r), `Row ${r + 1} removed.`, [Math.max(0, r - 1), c])}>
          Remove row {r + 1}
        </button>
        <button type="button" className="tv-btn" disabled={cols <= 1} onClick={() => change(removeColumn(cells, c), `Column ${c + 1} removed.`, [r, Math.max(0, c - 1)])}>
          Remove column {c + 1}
        </button>
      </div>
      <p className="tv-hint">
        The buttons work on the cell you were last in (row {r + 1}, column {c + 1}). Paste cells copied from Numbers, Excel or Google Sheets into any cell to fill the grid. Up to {blocksV3Limits.tableRows}{" "}
        rows and {blocksV3Limits.tableColumns} columns.
      </p>
      <p className="tv-sr" role="status" aria-live="polite">
        {message}
      </p>
    </div>
  );
}

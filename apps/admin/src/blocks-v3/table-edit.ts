/**
 * Changes to a Table block's cells (F078), kept apart from the editor so
 * they can be tested: add, remove and move rows and columns, and paste cells
 * copied from a spreadsheet. Every result stays within the block's limits.
 */
import { blocksV3Limits } from "@crust/blocks";

export type Cells = string[][];
const { tableRows, tableColumns, tableCell } = blocksV3Limits;

/** The grid as edited: at least 1×1, every row the same width. */
export function normalise(value: unknown): Cells {
  const rows = (Array.isArray(value) ? value : []).slice(0, tableRows).map((r) => (Array.isArray(r) ? r : []).slice(0, tableColumns).map((c) => (typeof c === "string" ? c : "")));
  const width = Math.max(1, ...rows.map((r) => r.length));
  const grid = rows.map((r) => [...r, ...Array<string>(width - r.length).fill("")]);
  return grid.length ? grid : [Array<string>(width).fill("")];
}

export const width = (cells: Cells) => cells[0]?.length ?? 0;

export const setCell = (cells: Cells, r: number, c: number, text: string): Cells =>
  cells.map((row, i) => (i === r ? row.map((v, j) => (j === c ? text.slice(0, tableCell) : v)) : row));

/** A new empty row below `after` (at the end when -1 or past it). */
export function addRow(cells: Cells, after = cells.length - 1): Cells {
  if (cells.length >= tableRows) return cells;
  const at = after < 0 || after >= cells.length ? cells.length : after + 1;
  return [...cells.slice(0, at), Array<string>(width(cells)).fill(""), ...cells.slice(at)];
}

/** A new empty column right of `after`. */
export function addColumn(cells: Cells, after = width(cells) - 1): Cells {
  if (width(cells) >= tableColumns) return cells;
  const at = after < 0 || after >= width(cells) ? width(cells) : after + 1;
  return cells.map((row) => [...row.slice(0, at), "", ...row.slice(at)]);
}

export const removeRow = (cells: Cells, r: number): Cells => (cells.length <= 1 ? cells : cells.filter((_, i) => i !== r));
export const removeColumn = (cells: Cells, c: number): Cells => (width(cells) <= 1 ? cells : cells.map((row) => row.filter((_, j) => j !== c)));

export function moveRow(cells: Cells, r: number, by: -1 | 1): Cells {
  const to = r + by;
  if (to < 0 || to >= cells.length) return cells;
  const next = [...cells];
  [next[r], next[to]] = [next[to]!, next[r]!];
  return next;
}

/**
 * Cells copied from Numbers, Excel or Google Sheets: tab between cells, a
 * new line between rows, and "quoted" cells that hold a tab, line break or
 * quote. Comma-separated text isn't split (commas are normal in prices).
 */
export function parsePasted(text: string): Cells {
  const rows: Cells = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const src = text.replace(/\r\n?/g, "\n").replace(/\n$/, "");
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]!;
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"' && cell === "") quoted = true;
    else if (ch === "\t") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  row.push(cell);
  rows.push(row);
  return rows.map((r) => r.map((c) => c.replace(/\s+/g, " ").trim()));
}

/** Whether pasted text is more than one cell (else the browser pastes it as usual). */
export const isMultiCell = (text: string) => /[\t\n]/.test(text.replace(/\r?\n$/, ""));

/** `pasted` written into the grid from row `r`, column `c`, growing it within the limits. */
export function pasteInto(cells: Cells, r: number, c: number, pasted: Cells): { cells: Cells; rows: number; columns: number } {
  const pw = Math.max(0, ...pasted.map((p) => p.length));
  const needRows = Math.min(tableRows, Math.max(cells.length, r + pasted.length));
  const needCols = Math.min(tableColumns, Math.max(width(cells), c + pw));
  const grid: Cells = Array.from({ length: needRows }, (_, i) => Array.from({ length: needCols }, (_, j) => cells[i]?.[j] ?? ""));
  let rows = 0;
  let columns = 0;
  pasted.forEach((p, i) => {
    if (r + i >= needRows) return;
    rows++;
    p.forEach((v, j) => {
      if (c + j >= needCols) return;
      columns = Math.max(columns, j + 1);
      grid[r + i]![c + j] = v.slice(0, tableCell);
    });
  });
  return { cells: grid, rows, columns };
}

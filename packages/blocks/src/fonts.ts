/**
 * Curated font stacks. They use fonts already installed on the visitor's
 * device: no downloads, no cost, no tracking. Each looks slightly different
 * on Mac, Windows and phones, but keeps the same character.
 */
export interface FontStack {
  id: string;
  label: string;
  stack: string;
}

export const fontStacks: FontStack[] = [
  { id: "system", label: "System sans", stack: "system-ui, -apple-system, 'Segoe UI', sans-serif" },
  { id: "humanist", label: "Humanist sans", stack: "Seravek, 'Gill Sans Nova', Ubuntu, Calibri, 'DejaVu Sans', sans-serif" },
  { id: "geometric", label: "Geometric sans", stack: "Avenir, Montserrat, Corbel, 'URW Gothic', sans-serif" },
  { id: "transitional", label: "Transitional serif", stack: "Charter, 'Bitstream Charter', 'Sitka Text', Cambria, serif" },
  { id: "oldstyle", label: "Old-style serif", stack: "'Iowan Old Style', 'Palatino Linotype', 'URW Palladio L', P052, serif" },
  { id: "mono", label: "Monospace", stack: "ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, Consolas, monospace" },
];

/** The curated stack matching `stack`, or undefined for a custom one. */
export function findFontStack(stack: string): FontStack | undefined {
  const norm = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();
  return fontStacks.find((f) => norm(f.stack) === norm(stack));
}

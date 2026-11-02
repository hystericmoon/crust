/**
 * Rows and columns v2 (F074): boxes behind columns (one look for all, plus
 * an optional highlighted column), vertical alignment, a gap between rows,
 * dividers, photo-first on phones and a sticky column. Every prop is
 * optional; a Columns block without them publishes exactly as before.
 * The DOM order of columns never changes, so reading and Tab order stay as
 * written.
 */
import { devices, resolveWidths, widthOptions, type ColumnWidths, type Device } from "./responsive";
import { sectionStyleIds, type SectionStyleId } from "./section-styles";
import { spacingSteps, type SpacingStep } from "./tokens";

export const columnAligns = ["top", "middle", "bottom"] as const;
export type ColumnAlign = (typeof columnAligns)[number];
export const columnAlignNames: Record<ColumnAlign, string> = { top: "Top", middle: "Middle", bottom: "Bottom" };

export const boxPaddings = ["sm", "md", "lg"] as const satisfies readonly SpacingStep[];
export type BoxPadding = (typeof boxPaddings)[number];
export const boxPaddingNames: Record<BoxPadding, string> = { sm: "S", md: "M", lg: "L" };

export interface ColumnBox {
  /** A site section style, or "none" for no box. */
  style: SectionStyleId | "none";
  padding: BoxPadding;
  rounded: boolean;
}

export interface ColumnHighlight {
  /** 1-based column number. */
  column: number;
  style: SectionStyleId;
}

const isStyle = (v: unknown): v is SectionStyleId => sectionStyleIds.includes(v as SectionStyleId);

export function cleanBox(value: unknown): ColumnBox | null {
  if (!value || typeof value !== "object") return null;
  const b = value as Record<string, unknown>;
  if (!isStyle(b.style)) return null;
  return {
    style: b.style,
    padding: boxPaddings.includes(b.padding as BoxPadding) ? (b.padding as BoxPadding) : "md",
    rounded: b.rounded !== false,
  };
}

export function cleanHighlight(value: unknown, count: number): ColumnHighlight | null {
  if (!value || typeof value !== "object") return null;
  const h = value as Record<string, unknown>;
  const column = typeof h.column === "number" ? Math.round(h.column) : 0;
  if (column < 1 || column > count || !isStyle(h.style)) return null;
  return { column, style: h.style };
}

/** The sticky column (1-based), when it exists in this row. */
export function cleanSticky(value: unknown, count: number): number | null {
  const n = typeof value === "number" ? Math.round(value) : 0;
  return n >= 1 && n <= count ? n : null;
}

export const isSpacing = (v: unknown): v is SpacingStep => spacingSteps.includes(v as SpacingStep);

const prefix: Record<Device, string> = { desktop: "d", tablet: "t", phone: "p" };

/**
 * How dividers draw on each screen: "v" lines between side-by-side
 * columns, "h" lines between stacked ones, none where columns wrap 2 + 1
 * (a line across half a row looks broken).
 */
export function dividerModes(count: number, widths?: ColumnWidths | null): Record<Device, "v" | "h" | null> {
  const w = resolveWidths(count, widths);
  return Object.fromEntries(
    devices.map((d) => {
      const option = widthOptions(count).find((o) => o.id === w[d]);
      return [d, option?.ratios ? "v" : option?.wrap ? null : "h"];
    }),
  ) as Record<Device, "v" | "h" | null>;
}

export interface ColumnsV2Props {
  count: string;
  widths?: ColumnWidths;
  valign?: unknown;
  box?: unknown;
  highlight?: unknown;
  rowGap?: unknown;
  dividers?: unknown;
  phoneOrder?: unknown;
  sticky?: unknown;
}

/** Extra classes and CSS variables on the row. Empty for rows saved before F074. */
export function rowExtras(p: ColumnsV2Props): { classes: string[]; vars: Record<string, string> } {
  const count = Number(p.count);
  const classes: string[] = [];
  const vars: Record<string, string> = {};
  if (p.valign === "middle" || p.valign === "bottom") classes.push(`cr-line-${p.valign}`);
  if (isSpacing(p.rowGap)) vars["--cr-columns-row-gap"] = `var(--cr-space-${p.rowGap})`;
  if (p.dividers === true) {
    classes.push("cr-dividers");
    const modes = dividerModes(count, p.widths);
    for (const d of devices) if (modes[d]) classes.push(`cr-div-${prefix[d]}-${modes[d]}`);
  }
  if (p.phoneOrder === "reverse") classes.push("cr-phone-reverse");
  const sticky = cleanSticky(p.sticky, count);
  if (sticky) classes.push(`cr-sticky-col-${sticky}`);
  return { classes, vars };
}

/** Classes and CSS variables on one column (1-based `n`). */
export function columnExtras(p: ColumnsV2Props, n: number): { classes: string[]; vars: Record<string, string> } {
  const count = Number(p.count);
  const box = cleanBox(p.box);
  const highlight = cleanHighlight(p.highlight, count);
  const style = highlight?.column === n ? highlight.style : box && box.style !== "none" ? box.style : null;
  if (!style) return { classes: [], vars: {} };
  const classes = ["cr-column-box", `cr-style-${style}`];
  if (box?.rounded !== false) classes.push("cr-column-rounded");
  return { classes, vars: { "--cr-column-pad": `var(--cr-space-${box?.padding ?? "md"})` } };
}

/**
 * Whether a phone-reversed column holds links or buttons that the Tab key
 * would reach in a different order than they're seen (WCAG 2.4.3).
 */
export function reversedFocusWarning(columns: unknown[], count: number): boolean {
  const interactive = (v: unknown): boolean => {
    if (Array.isArray(v)) return v.some(interactive);
    if (!v || typeof v !== "object") return false;
    const o = v as Record<string, unknown>;
    if (o.type === "Button" || o.type === "ContactForm") return true;
    if (o.type === "Card" && typeof (o.props as Record<string, unknown>)?.linkHref === "string" && ((o.props as Record<string, unknown>).linkHref as string).trim()) return true;
    if (typeof o.href === "string" && o.href.trim()) return true;
    return Object.values(o).some(interactive);
  };
  // With two or more columns that each hold something to Tab to, reversing swaps their order.
  return columns.slice(0, count).filter(interactive).length >= 2;
}

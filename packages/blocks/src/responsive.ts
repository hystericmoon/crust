/**
 * Per-device layout (F029): column widths for desktop, tablet and phone, and
 * hiding any block on some devices. Plain CSS classes and media queries in
 * styles.css; no JavaScript on the published site.
 *
 * Devices match the builder's canvas widths and the old Columns breakpoints:
 * phone below 640px, tablet 640–1023px, desktop from 1024px.
 */
export const devices = ["desktop", "tablet", "phone"] as const;
export type Device = (typeof devices)[number];
export const deviceNames: Record<Device, string> = { desktop: "Desktop", tablet: "Tablet", phone: "Phone" };
const prefix: Record<Device, string> = { desktop: "d", tablet: "t", phone: "p" };

export interface WidthOption {
  id: string;
  label: string;
  /** Relative widths, one per column; null when columns stack or wrap. */
  ratios: number[] | null;
  /** Two per row; with 3 columns the last one takes the whole row. */
  wrap?: boolean;
}

const stack: WidthOption = { id: "stack", label: "Stacked", ratios: null };

export function widthOptions(count: number): WidthOption[] {
  if (count === 2) {
    return [
      { id: "equal", label: "1/2 + 1/2", ratios: [1, 1] },
      { id: "two-one", label: "2/3 + 1/3", ratios: [2, 1] },
      { id: "one-two", label: "1/3 + 2/3", ratios: [1, 2] },
      { id: "three-one", label: "3/4 + 1/4", ratios: [3, 1] },
      { id: "one-three", label: "1/4 + 3/4", ratios: [1, 3] },
      stack,
    ];
  }
  if (count === 3) {
    return [
      { id: "equal", label: "Equal", ratios: [1, 1, 1] },
      { id: "wide-first", label: "1/2 + 1/4 + 1/4", ratios: [2, 1, 1] },
      { id: "wide-middle", label: "1/4 + 1/2 + 1/4", ratios: [1, 2, 1] },
      { id: "wide-last", label: "1/4 + 1/4 + 1/2", ratios: [1, 1, 2] },
      { id: "wrap", label: "2, then 1", ratios: null, wrap: true },
      stack,
    ];
  }
  return [{ id: "equal", label: "Equal", ratios: [1, 1, 1, 1] }, { id: "wrap", label: "2 + 2", ratios: null, wrap: true }, stack];
}

/** What Columns did before F029: equal on desktop, two per row on tablet, stacked on phones. */
export function defaultWidths(count: number): Record<Device, string> {
  return { desktop: "equal", tablet: count === 2 ? "equal" : "wrap", phone: "stack" };
}

export type ColumnWidths = Partial<Record<Device, string>>;

/** Every device's width, valid for this many columns (unknown or stale choices fall back to the default). */
export function resolveWidths(count: number, widths?: ColumnWidths | null): Record<Device, string> {
  const ids = widthOptions(count).map((o) => o.id);
  const fallback = defaultWidths(count);
  return Object.fromEntries(devices.map((d) => [d, widths?.[d] && ids.includes(widths[d]!) ? widths[d]! : fallback[d]])) as Record<Device, string>;
}

/**
 * Extra classes for a Columns block. None when widths were never set, so
 * pages saved before F029 render exactly as before.
 */
export function columnClasses(count: number, widths?: ColumnWidths | null): string {
  if (!widths || !devices.some((d) => widths[d])) return "";
  const w = resolveWidths(count, widths);
  return devices.map((d) => `cr-${prefix[d]}-${w[d]}`).join(" ");
}

export type HideOn = Device[];

/** Cleans a stored hideOn list: known devices only, each once. */
export function cleanHideOn(value: unknown): HideOn {
  return Array.isArray(value) ? devices.filter((d) => value.includes(d)) : [];
}

/** Classes for the wrapper around a block hidden on some devices; "" when it shows everywhere. */
export function hideClasses(hideOn: unknown): string {
  return cleanHideOn(hideOn)
    .map((d) => `cr-hide-${d}`)
    .join(" ");
}

/** "Hidden on phone and tablet" for the builder's label; "" when shown everywhere. */
export function hiddenLabel(hideOn: unknown): string {
  const list = cleanHideOn(hideOn).map((d) => deviceNames[d].toLowerCase());
  if (!list.length) return "";
  if (list.length === 3) return "Hidden on every device";
  return `Hidden on ${list.join(" and ")}`;
}

// --- CSS ------------------------------------------------------------------------------

const media: Record<Device, string | null> = { phone: null, tablet: "(min-width: 640px)", desktop: "(min-width: 1024px)" };
/** Exactly one device each, for hiding. */
const range: Record<Device, string> = { phone: "(max-width: 639.98px)", tablet: "(min-width: 640px) and (max-width: 1023.98px)", desktop: "(min-width: 1024px)" };

/**
 * The width rules, phone first so tablet and desktop rules (same
 * specificity, later) win at their sizes. Written into styles.css by
 * `npm run gen:responsive-css`; a test keeps the two in step.
 */
export function responsiveCss(): string {
  const out: string[] = [];
  for (const d of ["phone", "tablet", "desktop"] as const) {
    const p = prefix[d];
    const rules: string[] = [];
    for (const count of [2, 3, 4]) {
      for (const o of widthOptions(count)) {
        const sel = `.cr-columns-${count}.cr-${p}-${o.id}`;
        const cols = o.ratios ? o.ratios.map((r) => `minmax(0, ${r}fr)`).join(" ") : o.wrap ? "repeat(2, minmax(0, 1fr))" : "minmax(0, 1fr)";
        rules.push(`${sel} { grid-template-columns: ${cols}; }`);
        if (o.wrap && count === 3) rules.push(`${sel} > .cr-column:nth-child(3) { grid-column: 1 / -1; }`);
        else if (count === 3) rules.push(`${sel} > .cr-column:nth-child(3) { grid-column: auto; }`);
      }
    }
    out.push(media[d] ? `@media ${media[d]} {\n  ${rules.join("\n  ")}\n}` : rules.join("\n"));
  }
  // Hiding: the wrapper takes no space of its own (display: contents) except on the devices it hides on.
  const hide = devices.map((d) => `@media ${range[d]} {\n  .cr-hide-${d} { display: none; }\n}`);
  return [...out, `.cr-show { display: contents; }`, ...hide].join("\n");
}

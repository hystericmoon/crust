import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { cleanBox, cleanHighlight, cleanSticky, columnExtras, dividerModes, reversedFocusWarning, rowExtras } from "./columns-v2";
import { config } from "./config";

type Props = Record<string, unknown>;
const Columns = config.components.Columns;
const slot = () => null;
const draw = (props: Props) =>
  renderToStaticMarkup(
    (Columns.render as unknown as (p: Props) => ReactElement)({
      ...Columns.defaultProps,
      ...props,
      column1: slot,
      column2: slot,
      column3: slot,
      column4: slot,
      id: "c",
      puck: { isEditing: false },
    }),
  );

describe("columns v2: old rows", () => {
  it("publishes a row without F074 props exactly as before", () => {
    expect(draw({ count: "3", gap: "lg" })).toBe(
      '<div class="cr-columns cr-columns-3" style="--cr-columns-gap:var(--cr-space-lg)">' +
        '<div class="cr-column"></div><div class="cr-column"></div><div class="cr-column"></div></div>',
    );
  });
});

describe("columns v2: boxes and highlight", () => {
  it("gives every column a box in the chosen style, padding and corners", () => {
    const html = draw({ count: "2", box: { style: "surface", padding: "lg", rounded: true } });
    expect(html.match(/class="cr-column cr-column-box cr-style-surface cr-column-rounded" style="--cr-column-pad:var\(--cr-space-lg\)"/g)).toHaveLength(2);
  });

  it("square corners and no box", () => {
    expect(draw({ count: "2", box: { style: "dark", padding: "sm", rounded: false } })).not.toContain("cr-column-rounded");
    expect(draw({ count: "2", box: { style: "none", padding: "md", rounded: true } })).not.toContain("cr-column-box");
  });

  it("highlights one column in another style, with or without boxes", () => {
    const html = draw({ count: "3", box: { style: "surface", padding: "md", rounded: true }, highlight: { column: 2, style: "primary" } });
    const cols = html.match(/class="cr-column(?: [^"]*)?"/g)!;
    expect(cols[0]).toContain("cr-style-surface");
    expect(cols[1]).toContain("cr-style-primary");
    expect(cols[2]).toContain("cr-style-surface");
    const alone = draw({ count: "3", highlight: { column: 3, style: "dark" } }).match(/class="cr-column(?: [^"]*)?"/g)!;
    expect(alone[0]).toBe('class="cr-column"');
    expect(alone[2]).toContain("cr-style-dark cr-column-rounded");
  });

  it("ignores bad values", () => {
    expect(cleanBox({ style: "pink" })).toBeNull();
    expect(cleanBox({ style: "surface", padding: "xl" })).toEqual({ style: "surface", padding: "md", rounded: true });
    expect(cleanHighlight({ column: 4, style: "dark" }, 3)).toBeNull();
    expect(cleanHighlight({ column: 0, style: "dark" }, 3)).toBeNull();
    expect(cleanHighlight({ column: 1, style: "x" }, 3)).toBeNull();
    expect(columnExtras({ count: "2", box: "surface" }, 1)).toEqual({ classes: [], vars: {} });
  });
});

describe("columns v2: alignment, gaps, order, sticky", () => {
  it("lines columns up in the middle or at the bottom", () => {
    expect(draw({ valign: "middle" })).toContain("cr-line-middle");
    expect(draw({ valign: "bottom" })).toContain("cr-line-bottom");
    expect(draw({ valign: "top" })).not.toContain("cr-line");
  });

  it("sets a separate gap between rows", () => {
    expect(draw({ rowGap: "xl" })).toContain("--cr-columns-row-gap:var(--cr-space-xl)");
    expect(draw({ rowGap: "huge" })).not.toContain("row-gap");
  });

  it("reverses on phones by class only: the HTML order stays as written", () => {
    const html = draw({ phoneOrder: "reverse" });
    expect(html).toContain("cr-phone-reverse");
    expect(draw({ phoneOrder: "normal" })).not.toContain("reverse");
  });

  it("keeps an existing column in view", () => {
    expect(draw({ count: "2", sticky: 2 })).toContain("cr-sticky-col-2");
    expect(cleanSticky(3, 2)).toBeNull();
    expect(cleanSticky(0, 2)).toBeNull();
    expect(rowExtras({ count: "2", sticky: "1" }).classes).toEqual([]);
  });
});

describe("columns v2: dividers", () => {
  it("draws lines beside side-by-side columns and above stacked ones, none for 2 + 1", () => {
    expect(dividerModes(3)).toEqual({ desktop: "v", tablet: null, phone: "h" });
    expect(dividerModes(2, { desktop: "two-one", tablet: "stack", phone: "equal" })).toEqual({ desktop: "v", tablet: "h", phone: "v" });
    const html = draw({ count: "3", dividers: true });
    expect(html).toContain("cr-dividers cr-div-d-v cr-div-p-h");
    expect(html).not.toContain("cr-div-t");
  });
});

describe("columns v2: reading order warning", () => {
  const button = { type: "Button", props: { label: "Go", href: "/go" } };
  const text = { type: "Heading", props: { text: "Hi" } };
  it("warns only when two or more columns hold something to Tab to", () => {
    expect(reversedFocusWarning([[button], [text]], 2)).toBe(false);
    expect(reversedFocusWarning([[button], [button]], 2)).toBe(true);
    expect(reversedFocusWarning([[{ type: "Text", props: { text: { rich: 1, blocks: [{ type: "p", children: [{ text: "a", href: "/a" }] }] } } }], [button]], 2)).toBe(true);
    expect(reversedFocusWarning([[button], [text], [button]], 2)).toBe(false);
  });
});

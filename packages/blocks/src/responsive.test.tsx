import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { config } from "./config";
import { columnClasses, defaultWidths, hiddenLabel, hideClasses, resolveWidths, responsiveCss, widthOptions } from "./responsive";

const styles = readFileSync(join(__dirname, "styles.css"), "utf8");

type Render = (p: Record<string, unknown>) => React.ReactNode;
const slots = { column1: () => null, column2: () => null, column3: () => null, column4: () => null };
const render = (type: keyof typeof config.components, props: Record<string, unknown>, editing = false) =>
  renderToStaticMarkup(
    <>{(config.components[type].render as unknown as Render)({ ...config.components[type].defaultProps, ...(type === "Columns" ? slots : {}), ...props, puck: { isEditing: editing } })}</>,
  );
const heading = renderToStaticMarkup(<>{(config.components.Heading.render as unknown as Render)({ text: "Hi", level: "h2", align: "left", puck: { isEditing: false } })}</>);

describe("responsive: column widths", () => {
  it("offers widths that fit the number of columns", () => {
    expect(widthOptions(2).map((o) => o.id)).toEqual(["equal", "two-one", "one-two", "three-one", "one-three", "stack"]);
    expect(widthOptions(3).map((o) => o.id)).toEqual(["equal", "wide-first", "wide-middle", "wide-last", "wrap", "stack"]);
    expect(widthOptions(4).map((o) => o.id)).toEqual(["equal", "wrap", "stack"]);
    for (const n of [2, 3, 4]) for (const o of widthOptions(n)) if (o.ratios) expect(o.ratios).toHaveLength(n);
  });

  it("defaults to the old behaviour: equal, two per row on tablet, stacked on phones", () => {
    expect(defaultWidths(2)).toEqual({ desktop: "equal", tablet: "equal", phone: "stack" });
    expect(defaultWidths(3)).toEqual({ desktop: "equal", tablet: "wrap", phone: "stack" });
  });

  it("falls back when a choice doesn't fit the column count any more", () => {
    expect(resolveWidths(4, { desktop: "two-one" })).toEqual({ desktop: "equal", tablet: "wrap", phone: "stack" });
    expect(resolveWidths(2, { phone: "equal" })).toEqual({ desktop: "equal", tablet: "equal", phone: "equal" });
  });

  it("adds no classes to Columns saved before F029", () => {
    expect(columnClasses(3, undefined)).toBe("");
    expect(columnClasses(3, {})).toBe("");
    expect(render("Columns", { count: "3" })).toContain('class="cr-columns cr-columns-3"');
  });

  it("writes all three devices once any width is set", () => {
    expect(columnClasses(2, { desktop: "two-one" })).toBe("cr-d-two-one cr-t-equal cr-p-stack");
    expect(render("Columns", { count: "2", widths: { desktop: "two-one" } })).toContain('class="cr-columns cr-columns-2 cr-d-two-one cr-t-equal cr-p-stack"');
  });

  it("has a CSS rule for every option on every device, phone first", () => {
    const css = responsiveCss();
    for (const n of [2, 3, 4]) for (const o of widthOptions(n)) for (const p of ["d", "t", "p"]) expect(css).toContain(`.cr-columns-${n}.cr-${p}-${o.id} {`);
    expect(css.indexOf(".cr-p-")).toBeLessThan(css.indexOf(".cr-t-"));
    expect(css.indexOf(".cr-t-")).toBeLessThan(css.indexOf(".cr-d-"));
    expect(css).toContain(".cr-columns-2.cr-d-two-one { grid-template-columns: minmax(0, 2fr) minmax(0, 1fr); }");
  });

  it("styles.css carries the generated rules (run npm run gen:responsive-css after changing them)", () => {
    expect(styles).toContain(responsiveCss());
  });
});

describe("responsive: show on", () => {
  it("names hidden devices for the builder", () => {
    expect(hideClasses(["phone", "bogus", "tablet"])).toBe("cr-hide-tablet cr-hide-phone");
    expect(hideClasses(undefined)).toBe("");
    expect(hiddenLabel(["phone"])).toBe("Hidden on phone");
    expect(hiddenLabel(["tablet", "phone"])).toBe("Hidden on tablet and phone");
    expect(hiddenLabel(["desktop", "tablet", "phone"])).toBe("Hidden on every device");
  });

  it("blocks shown everywhere render exactly as before (no wrapper)", () => {
    expect(heading.startsWith("<h2")).toBe(true);
    expect(render("Heading", { text: "Hi", level: "h2", align: "left", hideOn: [] })).toBe(heading);
  });

  it("a hidden block gets a wrapper; the label is only in the builder", () => {
    const published = render("Heading", { text: "Hi", level: "h2", align: "left", hideOn: ["phone"] });
    expect(published).toBe(`<div class="cr-show cr-hide-phone">${heading}</div>`);
    expect(render("Heading", { text: "Hi", level: "h2", align: "left", hideOn: ["phone"] }, true)).toContain('data-hidden="Hidden on phone"');
  });

  it("hides with exact device ranges, without JavaScript", () => {
    expect(styles).toContain(".cr-show { display: contents; }");
    expect(styles).toMatch(/@media \(max-width: 639\.98px\) \{\s*\.cr-hide-phone \{ display: none; \}/);
    expect(styles).toMatch(/@media \(min-width: 640px\) and \(max-width: 1023\.98px\) \{\s*\.cr-hide-tablet \{ display: none; \}/);
    expect(styles).toMatch(/@media \(min-width: 1024px\) \{\s*\.cr-hide-desktop \{ display: none; \}/);
  });
});

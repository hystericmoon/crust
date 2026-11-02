// @vitest-environment happy-dom
import { cleanAnchor, config, type Components } from "@crust/blocks";
import { renderBody } from "@crust/render";
import type { ComponentData, Config, Data, Fields } from "@puckeditor/core";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { findById } from "../keyboard/moves";
import { withResponsiveEditing } from "../responsive/fields";
import { withSectionEditing } from "../sections/editing";
import { AnchorField, getTab, setTab, TabBar, tabOf, withSettingsTabs } from "./tabs";

let data: Data;
let selected: string | null;
const dispatch = vi.fn();
const fake = {
  get appState() {
    return { data };
  },
  dispatch,
  get selectedItem() {
    return selected ? findById(data, selected)?.item ?? null : null;
  },
  getSelectorForId: (id: string) => {
    const at = findById(data, id);
    return at ? { index: at.index, zone: at.zone } : undefined;
  },
};
vi.mock("@puckeditor/core", async (orig) => ({
  ...(await orig<typeof import("@puckeditor/core")>()),
  useGetPuck: () => () => fake,
  createUsePuck: () => (selector: (s: unknown) => unknown) => selector({ appState: { data }, selectedItem: fake.selectedItem }),
}));

const heading = (id: string, anchor?: string): ComponentData => ({ type: "Heading", props: { id, text: "Hi", level: "h2", align: "left", ...(anchor ? { anchor } : {}) } });

beforeEach(() => {
  data = { root: { props: {} }, content: [heading("a", "team"), heading("b")] };
  selected = "b";
  dispatch.mockReset();
  setTab("content");
});
afterEach(() => cleanup());

const builder = withSettingsTabs(withResponsiveEditing(withSectionEditing(config as Config<Components>)));
type Resolve = (data?: unknown, params?: unknown) => Fields;
const shown = (type: keyof Components, data?: unknown, params?: unknown) =>
  Object.keys((builder.components[type] as unknown as { resolveFields: Resolve }).resolveFields(data, params));
/** F073: a Section's background fields follow its kind, and "Header sits on this section" needs the first block. */
const sectionVariants = (["colour", "gradient", "photo", "video"] as const).map((bgKind) => {
  const props = { id: "s", bgKind, imageSrc: "/media/a.jpg" };
  return [{ props }, { appState: { data: { content: [{ type: "Section", props }] } }, parent: null }] as const;
});

/** F078: fields that show only with another setting (number look with Numbers, badge with a highlighted plan). */
const blockVariants: Record<string, Record<string, unknown>[]> = { IconList: [{ icon: "numbers" }], Pricing: [{ highlight: "2" }], Slideshow: [{ autoplay: "yes" }] };

describe("settings-tabs: where each setting lives", () => {
  it("puts wording and links in Content, looks in Style, and spacing, visibility and anchors in Advanced", () => {
    expect(tabOf("Heading", "text")).toBe("content");
    expect(tabOf("Heading", "align")).toBe("style");
    expect(tabOf("Button", "variant")).toBe("style");
    expect(tabOf("Card", "imageSrc")).toBe("content");
    expect(tabOf("Section", "imageSrc")).toBe("style");
    expect(tabOf("Section", "paddingY")).toBe("advanced");
    expect(tabOf("Columns", "gap")).toBe("advanced");
    expect(tabOf("Columns", "widths")).toBe("style");
    expect(tabOf("Image", "hideOn")).toBe("advanced");
  });

  it("every block has Advanced settings, and every field is reachable in some tab", () => {
    for (const [name, comp] of Object.entries(builder.components)) {
      const all = new Set<string>();
      for (const t of ["content", "style", "advanced"] as const) {
        setTab(t);
        for (const k of shown(name as keyof Components)) all.add(k);
        if (name === "Section") for (const [d, p] of sectionVariants) for (const k of shown("Section", d, p)) all.add(k);
        for (const props of blockVariants[name] ?? []) for (const k of shown(name as keyof Components, { props })) all.add(k);
      }
      for (const k of Object.keys(comp.fields ?? {})) if (k !== "_empty") expect(all, `${name}.${k}`).toContain(k);
      setTab("advanced");
      expect(shown(name as keyof Components)).toEqual(expect.arrayContaining(["hideOn", "anchor"]));
    }
  });

  it("shows only the current tab's fields, always with the switch and the slots", () => {
    setTab("content");
    expect(shown("Heading")).toEqual(["_tabs", "text", "level", "eyebrow"]);
    setTab("style");
    expect(shown("Heading")).toEqual(["_tabs", "align", "size"]);
    setTab("advanced");
    expect(shown("Columns")).toEqual(["_tabs", "gap", "rowGap", "column1", "column2", "column3", "column4", "hideOn", "anchor"]);
  });

  it("says so when a tab has nothing for this block", () => {
    setTab("content");
    expect(shown("Section")).toEqual(["_tabs", "content", "_empty"]);
    setTab("content");
    expect(shown("Spacer")).toEqual(["_tabs", "_empty"]);
  });
});

describe("settings-tabs: the switch", () => {
  it("is a labelled group with arrow keys, and switching isn't an undo step", () => {
    render(<TabBar />);
    const group = screen.getByRole("radiogroup", { name: "Settings to show" });
    expect(within(group).getAllByRole("radio").map((r) => r.textContent)).toEqual(["Content", "Style", "Advanced"]);
    act(() => fireEvent.keyDown(within(group).getByRole("radio", { name: "Content" }), { key: "ArrowRight" }));
    expect(getTab()).toBe("style");
    expect(within(group).getByRole("radio", { name: "Style" }).getAttribute("aria-checked")).toBe("true");
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: "replace", recordHistory: false, destinationIndex: 1 }));
    expect(dispatch.mock.calls[0]![0].data).toEqual(data.content[1]);
  });

  it("keeps the chosen tab for the next block", () => {
    setTab("advanced");
    selected = "a";
    expect(getTab()).toBe("advanced");
  });
});

describe("settings-tabs: anchor names", () => {
  it("cleans what's typed into a link name", () => {
    expect(cleanAnchor("Our Team!")).toBe("our-team");
    expect(cleanAnchor("  Café Ñ  ")).toBe("cafe-n");
    expect(cleanAnchor("!!")).toBe("");
    expect(cleanAnchor(42)).toBe("");
  });

  it("shows the link to use, and warns about a name used on this page", () => {
    const onChange = vi.fn();
    render(<AnchorField value="" onChange={onChange} />);
    const input = screen.getByLabelText("Anchor name");
    act(() => fireEvent.change(input, { target: { value: "Prices" } }));
    expect(onChange).toHaveBeenLastCalledWith("prices");
    expect(screen.getByText(/Link to it with #prices/)).toBeTruthy();
    act(() => fireEvent.change(input, { target: { value: "Team" } }));
    expect(screen.getByRole("alert").textContent).toMatch(/already called #team/);
    expect(input.getAttribute("aria-invalid")).toBe("true");
  });

  it("publishes an anchor as an empty target before the block, and nothing for blocks without one", () => {
    const html = renderBody({ root: { props: {} }, content: [heading("x", "Our Team"), heading("y")] });
    expect(html).toContain('<div class="cr-show"><span class="cr-anchor" id="our-team"></span><h2');
    expect(html.match(/cr-show/g)).toHaveLength(1);
  });
});

describe("settings-tabs: Section v2 fields (F073)", () => {
  const style = (props: Record<string, unknown>, first = true) => {
    setTab("style");
    const p = { id: "s", ...props };
    return shown("Section", { props: p }, { appState: { data: { content: [{ type: "Section", props: first ? p : { id: "other" } }] } }, parent: null });
  };
  afterEach(() => setTab("content"));

  it("shows only the chosen background's fields", () => {
    expect(style({ bgKind: "colour" })).not.toEqual(expect.arrayContaining(["gradient"]));
    expect(style({ bgKind: "colour" })).not.toContain("imageSrc");
    expect(style({ bgKind: "gradient" })).toContain("gradient");
    expect(style({ bgKind: "photo" })).toEqual(expect.arrayContaining(["imageSrc", "tint"]));
    expect(style({ bgKind: "photo" })).not.toContain("focus");
    expect(style({ bgKind: "photo", imageSrc: "/media/a.jpg" })).toContain("focus");
    expect(style({ bgKind: "video" })).toEqual(expect.arrayContaining(["imageSrc", "videoSrc"]));
    // Sections saved before F073: a photo means the Photo kind.
    expect(style({ imageSrc: "/media/a.jpg" })).toContain("imageSrc");
  });

  it("offers the header only on the page's first section", () => {
    expect(style({})).toContain("headerOver");
    expect(style({}, false)).not.toContain("headerOver");
    expect(style({})).toEqual(expect.arrayContaining(["width", "bgKind", "overlap"]));
  });
});

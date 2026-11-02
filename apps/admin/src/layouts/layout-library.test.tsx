// @vitest-environment happy-dom
import { config, pageLayouts, sectionLayouts } from "@crust/blocks";
import type { ComponentData, Config, Data } from "@puckeditor/core";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { findById } from "../keyboard/moves";
import { LayoutGallery, LayoutInserters, LayoutsButton, insertSpots } from "./LayoutGallery";
import {
  describeInsertion,
  filterLayouts,
  insertionPoint,
  openLayoutGallery,
  planLayoutInsert,
  topLevelIndexOf,
} from "./library";

vi.mock("@puckeditor/core", async (orig) => ({
  ...(await orig<typeof import("@puckeditor/core")>()),
  useGetPuck: () => () => fake,
  createUsePuck: () => (selector: (s: unknown) => unknown) => selector({ appState: { data }, config: cfg }),
}));

const cfg = config as unknown as Config;
const block = (type: string, id: string, props: Record<string, unknown> = {}): ComponentData => ({
  type,
  props: { ...(cfg.components[type]?.defaultProps ?? {}), ...props, id },
});

let data: Data;
let selected: string | null;
const dispatch = vi.fn();
const fake = {
  get appState() {
    return { data };
  },
  config: cfg,
  dispatch,
  get selectedItem() {
    return selected ? findById(data, selected)?.item ?? null : null;
  },
  getItemById: (id: string) => findById(data, id)?.item,
  getSelectorForId: (id: string) => {
    const at = findById(data, id);
    return at ? { index: at.index, zone: at.zone } : undefined;
  },
};

const page = (): Data => ({
  root: { props: {} },
  content: [
    block("Section", "hero", { content: [block("Heading", "h1", { text: "Welcome", level: "h1" })] }),
    block("Section", "about", { content: [block("Heading", "h2", { text: "About us", level: "h2" }), block("Text", "t")] }),
  ],
});

const headingLevels = (items: ComponentData[]): string[] =>
  items.flatMap((i) => [
    ...(i.type === "Heading" ? [String(i.props.level)] : []),
    ...Object.values(i.props).flatMap((v) => (Array.isArray(v) && v.every((x) => x && typeof x === "object" && "type" in x) ? headingLevels(v as ComponentData[]) : [])),
  ]);

beforeEach(() => {
  data = page();
  selected = null;
  dispatch.mockReset();
  // happy-dom's dialog is enough for open/close; make showModal set `open` like a browser.
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
});
afterEach(() => cleanup());

describe("layout-library: choosing layouts", () => {
  it("lists every section, or one category", () => {
    expect(filterLayouts("section", "All", "")).toHaveLength(sectionLayouts.length);
    const heroes = filterLayouts("section", "Hero", "");
    expect(heroes.length).toBeGreaterThan(0);
    expect(heroes.every((i) => i.kind === "section" && i.layout.category === "Hero")).toBe(true);
  });

  it("searches names, categories and descriptions, every word, ignoring case and accents", () => {
    expect(filterLayouts("section", "All", "PRICING").map((i) => i.layout.id)).toContain("pricing-3");
    expect(filterLayouts("section", "All", "questions two").every((i) => i.kind === "section" && i.layout.category === "FAQ")).toBe(true);
    expect(filterLayouts("section", "All", "centréd hero").map((i) => i.layout.id)).toContain("hero-centered");
    // F080: the first library's layouts are found with "simple" too.
    expect(filterLayouts("section", "All", "centréd hero simple").map((i) => i.layout.id)).toEqual(["hero-centered"]);
    expect(filterLayouts("section", "All", "zebra")).toEqual([]);
  });

  it("lists whole pages on their own tab", () => {
    expect(filterLayouts("page", "All", "").map((i) => i.layout.id)).toEqual(pageLayouts.map((l) => l.id));
    expect(filterLayouts("page", "All", "contact").map((i) => i.layout.id)).toEqual(["page-contact-v2", "page-contact"]);
  });
});

describe("layout-library: where a layout lands", () => {
  it("finds the top-level section that holds a nested block", () => {
    expect(topLevelIndexOf(data.content, "t")).toBe(1);
    expect(topLevelIndexOf(data.content, "hero")).toBe(0);
    expect(topLevelIndexOf(data.content, "nope")).toBeNull();
    expect(topLevelIndexOf(data.content, null)).toBeNull();
  });

  it("adds after the selected section, or at the end", () => {
    expect(insertionPoint(data.content, "h1")).toBe(1);
    expect(insertionPoint(data.content, null)).toBe(2);
  });

  it("says where in plain words", () => {
    expect(describeInsertion(cfg, data.content, 0)).toBe("Adds at the top, above “Welcome”.");
    expect(describeInsertion(cfg, data.content, 1)).toBe("Adds between “Welcome” and “About us”.");
    expect(describeInsertion(cfg, data.content, 2)).toBe("Adds at the end, after “About us”.");
    expect(describeInsertion(cfg, [], 0)).toBe("Adds to this empty page.");
    expect(describeInsertion(cfg, [block("Spacer", "s")], 1)).toBe("Adds at the end, after Spacer.");
  });
});

describe("layout-library: inserting", () => {
  it("inserts a hero into a page with an h1 as h2, keeping one h1", () => {
    const hero = filterLayouts("section", "All", "centered hero")[0]!;
    const plan = planLayoutInsert(data, hero, 1)!;
    expect(plan.data.content).toHaveLength(3);
    expect(plan.data.content[0]!.props.id).toBe("hero");
    expect(plan.data.content[1]!.props.id).toBe(plan.firstId);
    expect(headingLevels(plan.data.content).filter((l) => l === "h1")).toHaveLength(1);
    expect(plan.announcement).toBe("Added Centered hero. It uses your site style.");
  });

  it("inserts every section of a whole page, with fresh ids each time", () => {
    const about = filterLayouts("page", "All", "about simple")[0]!;
    const a = planLayoutInsert({ root: { props: {} }, content: [] }, about, 0)!;
    const b = planLayoutInsert({ root: { props: {} }, content: [] }, about, 0)!;
    expect(a.data.content).toHaveLength(about.kind === "page" ? about.layout.sections.length : 0);
    expect(a.firstId).not.toBe(b.firstId);
    expect(headingLevels(a.data.content).filter((l) => l === "h1")).toHaveLength(1);
    expect(a.announcement).toMatch(/About page layout: 4 sections/);
  });

  it("clamps the position to the page", () => {
    const item = filterLayouts("section", "All", "")[0]!;
    expect(planLayoutInsert(data, item, 99)!.index).toBe(2);
    expect(planLayoutInsert(data, item, -3)!.index).toBe(0);
  });
});

describe("layout-library: gallery", () => {
  const openAt = async (index: number | null) => {
    render(<LayoutGallery />);
    await act(async () => openLayoutGallery(index));
  };

  it("opens with Sections, categories, search and where it will add", async () => {
    await openAt(1);
    expect(screen.getByRole("heading", { name: "Add a layout" })).toBeTruthy();
    expect(screen.getByText("Adds between “Welcome” and “About us”.")).toBeTruthy();
    expect(screen.getByRole("radio", { name: "Sections" }).getAttribute("aria-checked")).toBe("true");
    expect(screen.getAllByRole("button", { name: /^Hero/ }).length).toBeGreaterThan(0);
    expect(screen.getByRole("status").textContent).toBe(`${sectionLayouts.length} sections`);
  });

  it("previews are pictures: hidden from screen readers and out of the tab order", async () => {
    await openAt(null);
    const thumb = document.querySelector(".lg-thumb")!;
    expect(thumb.getAttribute("aria-hidden")).toBe("true");
    expect(thumb.hasAttribute("inert")).toBe(true);
    expect(thumb.querySelector(".cr-section")).toBeTruthy();
  });

  it("filters by category and search, with a way back from no results", async () => {
    await openAt(null);
    fireEvent.click(screen.getByRole("button", { name: /^Pricing/ }));
    expect(screen.getByRole("status").textContent).toMatch(/in Pricing$/);
    fireEvent.change(screen.getByRole("searchbox", { name: "Search layouts" }), { target: { value: "zebra" } });
    expect(screen.getByText(/No layouts match “zebra” in Pricing/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Show all layouts" }));
    expect(screen.getByRole("status").textContent).toBe(`${sectionLayouts.length} sections`);
  });

  it("inserts the picked layout as one undoable step, selects it and closes", async () => {
    await openAt(1);
    fireEvent.click(screen.getByRole("button", { name: /^Three plans Pricing/ }));
    const set = dispatch.mock.calls.find(([a]) => a.type === "setData")![0];
    expect(set.recordHistory).toBe(true);
    expect(set.data.content).toHaveLength(3);
    expect(set.data.content[1].type).toBe("Section");
    expect(dispatch.mock.calls.some(([a]) => a.type === "setUi")).toBe(true);
    expect(document.querySelector(".lg-dialog")!.hasAttribute("open")).toBe(false);
  });

  it("whole pages tab inserts every section", async () => {
    await openAt(0);
    fireEvent.click(screen.getByRole("radio", { name: "Whole pages" }));
    expect(screen.queryByRole("button", { name: /^Hero/ })).toBeNull();
    // F080: the first library's pages are listed under "Simple", after the new ones.
    fireEvent.click(within(screen.getByRole("list", { name: /^Simple/ })).getByRole("button", { name: /^Services/ }));
    const set = dispatch.mock.calls.find(([a]) => a.type === "setData")![0];
    expect(set.data.content).toHaveLength(2 + pageLayouts.find((p) => p.id === "page-services")!.sections.length);
  });

  it("the Layouts button adds after the selected section", async () => {
    selected = "h1";
    render(
      <>
        <LayoutsButton />
        <LayoutGallery />
      </>,
    );
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Layouts" })));
    expect(screen.getByText("Adds between “Welcome” and “About us”.")).toBeTruthy();
  });
});

describe("layout-library: + buttons on the canvas", () => {
  const rect = (top: number, height: number) => ({ top, bottom: top + height, left: 0, right: 800, width: 800, height, x: 0, y: top, toJSON: () => ({}) });

  it("puts one above, one between each pair and one below the sections", () => {
    document.body.innerHTML = `<div data-puck-dropzone="root:default-zone"><div data-puck-component="a"></div><div data-puck-component="b"></div></div>`;
    const [a, b] = document.querySelectorAll<HTMLElement>("[data-puck-component]");
    document.querySelector<HTMLElement>("[data-puck-dropzone]")!.getBoundingClientRect = () => rect(0, 600) as DOMRect;
    a!.getBoundingClientRect = () => rect(100, 200) as DOMRect;
    b!.getBoundingClientRect = () => rect(300, 300) as DOMRect;
    const { spots } = insertSpots(document);
    expect(spots.map((s) => [s.index, s.top])).toEqual([
      [0, 100],
      [1, 300],
      [2, 600],
    ]);
    expect(spots.every((s) => s.left === 400)).toBe(true);
  });

  it("shows a real 'Add a layout' button on an empty page", async () => {
    data = { root: { props: {} }, content: [] };
    document.body.innerHTML = `<div data-puck-dropzone="root:default-zone"></div>`;
    render(
      <>
        <LayoutInserters document={document} />
        <LayoutGallery />
      </>,
    );
    await act(async () => new Promise<void>((r) => requestAnimationFrame(() => r())));
    const add = await screen.findByRole("button", { name: /Add a layout/ });
    expect(add.tabIndex).toBe(0);
    await act(async () => fireEvent.click(add));
    expect(screen.getByText("Adds to this empty page.")).toBeTruthy();
  });

  it("between sections, the + buttons are pointer shortcuts with a tooltip", async () => {
    document.body.innerHTML = `<div data-puck-dropzone="root:default-zone"><div data-puck-component="hero"></div><div data-puck-component="about"></div></div>`;
    render(<LayoutInserters document={document} />);
    await act(async () => new Promise<void>((r) => requestAnimationFrame(() => r())));
    const plus = document.querySelectorAll<HTMLButtonElement>(".lg-insert");
    expect(plus).toHaveLength(3);
    expect([...plus].every((b) => b.tabIndex === -1 && b.getAttribute("aria-hidden") === "true")).toBe(true);
    expect(plus[0]!.dataset.tip).toBe("Add a layout at the top");
    expect(plus[2]!.dataset.tip).toBe("Add a layout at the end");
  });
});

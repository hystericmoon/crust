// @vitest-environment happy-dom
import {
  applyLook,
  config,
  defaultTokens,
  fitHeadings,
  layoutPhotoSrcs,
  layoutPhotos,
  LAYOUT_PHOTO_PREFIX,
  pageLayoutsV2,
  sectionLayoutsV2,
  styleLooks,
  type MediaItem,
  type Page,
  type SavedLayout,
} from "@crust/blocks";
import { renderBody } from "@crust/render";
import type { ComponentData, Config, Data } from "@puckeditor/core";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { checkLayout, checkPage } from "../../server/content";
import { findById } from "../keyboard/moves";
import { LayoutGallery } from "./LayoutGallery";
import { buildItem, filterLayouts, openLayoutGallery, planLayoutInsert, splitSimple } from "./library";
import { adoptLayoutPhotos, LayoutPhotoWatcher, type AdoptDeps } from "./photos";

let data: Data = { root: { props: {} }, content: [] };
const dispatch = vi.fn((a: { type: string; data?: Data }) => {
  if (a.type === "setData" && a.data) data = a.data;
});
const cfg = config as unknown as Config;
const fake = {
  get appState() {
    return { data };
  },
  config: cfg,
  dispatch,
  selectedItem: null,
  getItemById: (id: string) => findById(data, id)?.item,
  getSelectorForId: (id: string) => {
    const at = findById(data, id);
    return at ? { index: at.index, zone: at.zone } : undefined;
  },
};
vi.mock("@puckeditor/core", async (orig) => ({
  ...(await orig<typeof import("@puckeditor/core")>()),
  useGetPuck: () => () => fake,
  createUsePuck: () => (selector: (s: unknown) => unknown) => selector({ appState: { data }, config: cfg }),
}));

afterEach(() => {
  cleanup();
  dispatch.mockClear();
  data = { root: { props: {} }, content: [] };
});

const isTree = (v: unknown): v is ComponentData[] => Array.isArray(v) && v.length > 0 && v.every((x) => x && typeof x === "object" && "type" in x);
const all = (items: ComponentData[]): ComponentData[] => items.flatMap((i) => [i, ...Object.values(i.props).flatMap((v) => (isTree(v) ? all(v) : []))]);

const asPage = (content: ComponentData[]): Page => ({
  path: "/check",
  title: "Check",
  description: "A page made from layouts.",
  puck: { root: { props: {} }, content: fitHeadings(content, false) },
});

describe("layouts v2 (F080): every layout is a valid page", () => {
  it.each(sectionLayoutsV2.map((l) => [l.id, l] as const))("%s passes the page check and renders", (_id, l) => {
    const content = l.build();
    expect(checkPage(asPage(content))).toEqual([]);
    const html = renderBody({ root: { props: {} }, content });
    // Sample photos are marked for the publish check until replaced.
    if (layoutPhotoSrcs(content).length) expect(html).toContain("data-crust-placeholder");
  });

  it.each(pageLayoutsV2.map((p) => [p.id, p] as const))("whole page %s passes the page check", (_id, p) => {
    const item = filterLayouts("page", "All", "").find((i) => i.layout.id === p.id)!;
    expect(checkPage(asPage(buildItem(item)))).toEqual([]);
  });
});

describe("layouts v2 (F080): the gallery", () => {
  it("lists the new layouts first and the first library's under Simple", () => {
    const { main, simple } = splitSimple(filterLayouts("section", "Hero", ""));
    expect(main.length).toBe(8);
    expect(simple.map((i) => i.layout.id)).toContain("hero-centered");
  });

  it("shows a 'Simple' group after the new layouts, named for screen readers", async () => {
    render(<LayoutGallery />);
    await act(async () => openLayoutGallery(null));
    fireEvent.click(within(screen.getByRole("navigation", { name: "Categories" })).getByRole("button", { name: /^Hero/ }));
    const simple = screen.getByRole("list", { name: /^Simple/ });
    expect(within(simple).getByRole("button", { name: /^Centered hero/ })).toBeTruthy();
    expect(screen.getByRole("heading", { name: /^Simple/ })).toBeTruthy();
    // New ones come before the group.
    const lists = screen.getAllByRole("list").filter((l) => l.classList.contains("lg-grid"));
    expect(within(lists[0]!).getByRole("button", { name: /^Full photo hero/ })).toBeTruthy();
  });

  it("fits gradients to the site's colours when inserting", () => {
    const item = filterLayouts("section", "All", "gradient call").find((i) => i.layout.id === "cta-gradient")!;
    for (const look of styleLooks) {
      const tokens = applyLook(defaultTokens, look);
      const plan = planLayoutInsert({ root: { props: {} }, content: [] }, item, 0, tokens)!;
      const s = plan.data.content[0]!;
      expect(["gradient", "colour"], look.id).toContain(s.props.bgKind);
    }
  });
});

describe("layouts v2 (F080): sample photos into the Media library", () => {
  const pool = `${LAYOUT_PHOTO_PREFIX}${layoutPhotos.pool.file}`;
  const office = `${LAYOUT_PHOTO_PREFIX}${layoutPhotos.office.file}`;
  const item = (file: string): MediaItem => ({ file, alt: "x", width: 1600, height: 1000, bytes: 1, uploadedAt: "" });
  const deps = (have: string[] = [], fail = false) => {
    const uploads: { name: string; alt: string }[] = [];
    const d: AdoptDeps = {
      library: async () => ({ ok: true, items: have.map(item) }),
      read: async () => "AAAA",
      upload: async (p) => {
        uploads.push({ name: p.name, alt: p.alt });
        return fail ? { ok: false, error: "GitHub said no." } : { ok: true, item: item(p.name) };
      },
    };
    return { d, uploads };
  };

  it("uploads each sample once, with its description, and reuses one already there", async () => {
    const { d, uploads } = deps([layoutPhotos.office.file]);
    const res = await adoptLayoutPhotos([pool, office, "/media/mine.jpg"], d);
    expect(uploads).toEqual([{ name: layoutPhotos.pool.file, alt: layoutPhotos.pool.alt }]);
    expect(res.uploaded).toBe(1);
    expect(res.map.get(pool)).toBe(`/media/${layoutPhotos.pool.file}`);
    expect(res.map.get(office)).toBe(`/media/${layoutPhotos.office.file}`);
    expect(res.map.has("/media/mine.jpg")).toBe(false);
  });

  it("says why when the library can't take them, and leaves the samples as they are", async () => {
    const { d } = deps([], true);
    const res = await adoptLayoutPhotos([pool], d);
    expect(res.map.size).toBe(0);
    expect(res.error).toBe("GitHub said no.");
    const off = await adoptLayoutPhotos([pool], { ...d, library: async () => ({ ok: false }) });
    expect(off.error).toMatch(/Media library isn't available/);
  });

  it("swaps the page's sample addresses once copied, keeping the 'to replace' mark", async () => {
    const hero = sectionLayoutsV2.find((l) => l.id === "hero-photo-full")!.build();
    data = { root: { props: {} }, content: hero };
    const { d } = deps();
    render(<LayoutPhotoWatcher deps={d} />);
    await act(async () => new Promise((r) => setTimeout(r, 0)));
    const set = dispatch.mock.calls.find(([a]) => a.type === "setData")![0] as unknown as { data: Data; recordHistory: boolean };
    expect(set.recordHistory).toBe(false);
    expect(layoutPhotoSrcs(set.data)).toEqual([]);
    const section = set.data.content[0]!;
    expect(section.props.imageSrc).toBe(`/media/${layoutPhotos.stair.file}`);
    expect(section.props.placeholder).toEqual(["imageSrc"]);
  });
});

describe("saved element styles (F080): stored with My layouts", () => {
  const style = (props: Record<string, unknown>): Pick<SavedLayout, "name" | "kind" | "content"> => ({ name: "Soft with arrow", kind: "element", content: [{ type: "Button", props } as ComponentData] });

  it("accepts one block as a saved style, and nothing else", () => {
    expect(checkLayout(style({ variant: "soft", icon: "arrow-right", iconAt: "after" }))).toEqual([]);
    expect(checkLayout({ ...style({}), content: [] })).not.toEqual([]);
    const two = { ...style({}), content: [{ type: "Button", props: {} }, { type: "Button", props: {} }] };
    expect(checkLayout(two)).toEqual(["A saved style holds one block."]);
  });

  it("never shows up as a layout in the gallery", () => {
    const saved: SavedLayout[] = [
      { id: "soft", savedAt: "2026-11-03", ...style({ variant: "soft" }) },
      { id: "intro", name: "Intro", kind: "section", savedAt: "2026-11-03", content: [{ type: "Section", props: { id: "s", content: [] } } as ComponentData] },
    ];
    expect(filterLayouts("mine", "All", "", saved).map((i) => i.layout.id)).toEqual(["intro"]);
  });

  it("leaves every v2 photo block's words to the owner (only photos are marked)", () => {
    for (const l of sectionLayoutsV2) {
      for (const b of all(l.build())) {
        const marks = (b.props.placeholder as string[] | undefined) ?? [];
        for (const m of marks) expect(["imageSrc", "src", "images", "slides", "items", "logos", "place", "address"], `${l.id}: ${b.type}.${m}`).toContain(m);
      }
    }
  });
});

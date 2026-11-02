// @vitest-environment happy-dom
/** F082: designing the post page, blog page and "Page not found" in the builder. */
import { config, currentDesign, designLayoutsFor, type Components } from "@crust/blocks";
import type { ComponentData, Config, Data } from "@puckeditor/core";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { handleDesigns } from "../../server/designs";
import { LocalStore, memoryFolder } from "../../server/local-store";
import type { Env } from "../../server/api";
import { filterLayouts, planLayoutInsert } from "../layouts/library";
import { withSettingsTabs } from "../tabs/tabs";
import { DesignCard } from "./DesignLinks";
import { withDesignEditing } from "./DesignEditor";
import { forgetDesign, getDesignsState, loadDesigns, resetDesignsStore, storeDesign } from "./store";

const api = vi.hoisted(() => ({ listDesigns: vi.fn(), saveDesign: vi.fn(), resetDesign: vi.fn() }));
vi.mock("../api-client", async (orig) => ({ ...(await orig<typeof import("../api-client")>()), ...api }));

const offline = { ok: false as const, error: "Saving to GitHub isn't available here yet.", notConfigured: true };

beforeEach(() => {
  Object.values(api).forEach((f) => f.mockReset());
  localStorage.clear();
  resetDesignsStore();
});
afterEach(() => cleanup());

type Comp = { fields?: Record<string, { type: string; disallow?: string[] }>; resolveFields?: (...a: unknown[]) => Promise<Record<string, { type: string; disallow?: string[] }>> };
const comps = (c: Config<Components>) => c.components as unknown as Record<string, Comp>;
const cats = (c: Config<Components>) => c.categories as Record<string, { visible?: boolean; components?: string[] }>;

describe("the design editor's blocks (F082)", () => {
  it("lists each design's own blocks, and keeps whole-section blocks out of sections and columns", async () => {
    const post = withDesignEditing(withSettingsTabs(config), "post");
    expect(cats(post).post).toMatchObject({ visible: true });
    expect(cats(post).post!.components).toContain("PostContent");
    expect(cats(post).blog).toMatchObject({ visible: false });
    const blog = withDesignEditing(config, "blog");
    expect(cats(blog).blog!.components).toEqual(["BlogTitle", "BlogIntro", "PostList"]);
    expect(cats(blog).post).toMatchObject({ visible: false });
    const nf = withDesignEditing(config, "notFound");
    expect(cats(nf).post!.visible).toBe(false);
    expect(cats(nf).blog!.visible).toBe(false);
    expect(Object.keys(nf.root!.fields ?? {})).toEqual(["title"]);
    expect(Object.keys(post.root!.fields ?? {})).toEqual([]);
    // Slots refuse "Post content" and "Cover with title", also in the fields the settings tabs work out.
    const section = comps(post).Section!;
    expect(section.fields!.content!.disallow).toEqual(expect.arrayContaining(["PostContent", "PostHero"]));
    const resolved = await section.resolveFields!({ props: {} }, {});
    expect(resolved.content!.disallow).toEqual(expect.arrayContaining(["PostContent"]));
    expect(comps(post).Columns!.fields!.column1!.disallow).toEqual(expect.arrayContaining(["Section", "Columns", "PostContent"]));
  });

  it("the layout gallery's whole pages become the design's three starting designs; picking one replaces the design", () => {
    const items = filterLayouts("page", "All", "", [], [], "blog");
    expect(items.map((i) => (i.kind === "design" ? i.layout.id : ""))).toEqual(["blog-cards", "blog-list", "blog-featured"]);
    expect(filterLayouts("page", "All", "featured", [], [], "blog")).toHaveLength(1);
    // Pages still get page layouts.
    expect(filterLayouts("page", "All", "", [], [], null)[0]!.kind).toBe("page");
    const data: Data = { root: { props: {} }, content: currentDesign("blog") };
    const plan = planLayoutInsert(data, items[1]!, 3)!;
    expect(plan.data.content).toHaveLength(1);
    expect(JSON.stringify(plan.data.content)).toContain('"look":"list"');
    expect(plan.announcement).toBe("The design is now “List”. Undo brings back the one before.");
  });
});

describe("saving designs (F082)", () => {
  const content = (): ComponentData[] => designLayoutsFor("post")[1]!.build();

  it("stops a design that can't be published, with the reason", async () => {
    const res = await storeDesign("post", [{ type: "PostTitle", props: { id: "t" } }] as ComponentData[]);
    expect(res).toEqual({ problems: ["The post page design needs a “Post content” block, where each post's own blocks go."] });
    expect(api.saveDesign).not.toHaveBeenCalled();
  });

  it("without saving switched on, keeps it in this browser, and it's there on the next visit", async () => {
    api.saveDesign.mockResolvedValue(offline);
    const res = await storeDesign("post", content());
    expect(res).toMatchObject({ result: { notConfigured: true }, local: true });
    expect(getDesignsState().unsaved).toEqual(["post"]);
    resetDesignsStore();
    api.listDesigns.mockResolvedValue(offline);
    await loadDesigns();
    expect(getDesignsState()).toMatchObject({ status: "ready", offline: true, unsaved: ["post"] });
    expect(getDesignsState().designs.post!.content).toHaveLength(2);
  });

  it("saved: the server's copy counts; the 404's title comes along; going back to the built-in look forgets it", async () => {
    api.saveDesign.mockImplementation(async (d: { kind: string; content: ComponentData[]; title?: string }) => ({ ok: true, design: { ...d, savedAt: "2026-11-03" }, commit: "c" }));
    await storeDesign("notFound", designLayoutsFor("notFound")[1]!.build(), "  Oops  ");
    expect(api.saveDesign.mock.calls[0]![0]).toMatchObject({ kind: "notFound", title: "Oops" });
    expect(getDesignsState().unsaved).toEqual([]);
    api.resetDesign.mockResolvedValue({ ok: true, commit: "d" });
    await forgetDesign("notFound");
    expect(getDesignsState().designs.notFound).toBeUndefined();
    expect(localStorage.getItem("crust:design:notFound")).toBeNull();
  });

  it("the Posts screen says which look each page has, and links to its design", async () => {
    api.listDesigns.mockResolvedValue({ ok: true, designs: { blog: { kind: "blog", savedAt: "", content: currentDesign("blog") } } });
    await act(async () => {
      render(
        <>
          <DesignCard kind="blog" text="The list." />
          <DesignCard kind="post" text="Every post." />
        </>,
      );
    });
    await waitFor(() => expect(screen.getAllByText(/Now:/)[0]!.textContent).toBe("Now: Your design"));
    expect(screen.getAllByText(/Now:/)[1]!.textContent).toBe("Now: Built-in look");
    expect(screen.getByRole("link", { name: "Design the blog page" }).getAttribute("href")).toBe("#/design?kind=blog");
    expect(screen.getByRole("heading", { name: "Post page design" })).toBeTruthy();
  });
});

describe("/api/designs (F082)", () => {
  const ORIGIN = "http://crust.localhost";
  const headers = { "Content-Type": "application/json", "X-Crust": "1", Origin: ORIGIN };
  const noFetch: typeof fetch = async () => {
    throw new Error("no network");
  };
  let store: LocalStore;
  let env: Env;
  const post = (body: unknown) => handleDesigns(new Request(`${ORIGIN}/api/designs`, { method: "POST", headers, body: JSON.stringify(body) }), env, noFetch);
  const get = async () => (await (await handleDesigns(new Request(`${ORIGIN}/api/designs`), env, noFetch)).json()) as { designs: Record<string, unknown> };

  beforeEach(async () => {
    store = new LocalStore(memoryFolder({ "content/site.json": "{}" }));
    await store.init();
    env = { store, localUser: "Hosni" };
  });

  it("saves only good designs, only known fields, and goes back to the built-in look", async () => {
    expect(await get()).toEqual({ ok: true, designs: {} });
    const bad = await post({ action: "save", design: { kind: "blog", content: [{ type: "BlogTitle", props: { id: "t" } }] } });
    expect(bad.status).toBe(422);
    expect((await bad.json()).error).toMatch(/^Not saved\. The blog page design needs a “Post list” block\./);
    const ok = await post({ action: "save", design: { kind: "blog", content: currentDesign("blog"), title: "dropped", extra: 1 } });
    expect(ok.status).toBe(200);
    const file = JSON.parse((await store.readFile("content/designs/blog.json"))!) as Record<string, unknown>;
    expect(Object.keys(file).sort()).toEqual(["content", "kind", "savedAt"]);
    expect(Object.keys((await get()).designs)).toEqual(["blog"]);
    expect((await post({ action: "reset", kind: "blog" })).status).toBe(200);
    expect(await store.readFile("content/designs/blog.json")).toBeNull();
    expect((await post({ action: "reset", kind: "page" })).status).toBe(400);
    // Rich text links are checked like on pages.
    const unsafe = [{ type: "Section", props: { id: "s", content: [{ type: "Text", props: { id: "x", text: { rich: 1, blocks: [{ type: "p", children: [{ text: "x", href: "javascript:alert(1)" }] }] } } }] } }];
    expect((await post({ action: "save", design: { kind: "notFound", content: unsafe } })).status).toBe(422);
  });
});

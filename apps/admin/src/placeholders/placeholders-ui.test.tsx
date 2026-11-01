// @vitest-environment happy-dom
import { config, findPlaceholders } from "@crust/blocks";
import type { ComponentData, Config, Data } from "@puckeditor/core";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { findById } from "../keyboard/moves";
import { mergePageRows } from "../pages/store";
import { PublishPanel } from "../publish/PublishPanel";
import { tabOf } from "../tabs/tabs";
import { PlaceholderChecklist, PlaceholderWatcher } from "./Checklist";
import { ReplaceMeField, withPlaceholderEditing } from "./fields";

vi.mock("@puckeditor/core", async (orig) => {
  const real = await orig<typeof import("@puckeditor/core")>();
  return {
    ...real,
    useGetPuck: () => () => fake,
    createUsePuck: () => (selector: (s: unknown) => unknown) => selector({ appState: { data } }),
  };
});

const cfg = config as unknown as Config;
const block = (type: string, id: string, props: Record<string, unknown> = {}): ComponentData => ({
  type,
  props: { ...(cfg.components[type]?.defaultProps ?? {}), ...props, id },
});

let data: Data;
const dispatch = vi.fn((action: { type: string; data?: Data }) => {
  if (action.type === "setData" && action.data) data = action.data;
});
const fake = {
  get appState() {
    return { data };
  },
  dispatch,
  getSelectorForId: (id: string) => {
    const at = findById(data, id);
    return at ? { index: at.index, zone: at.zone } : undefined;
  },
};

const page = (): Data => ({
  root: { props: {} },
  content: [
    block("Heading", "h", { text: "Your studio name", level: "h1", placeholder: ["text"] }),
    block("Section", "s", { content: [block("Card", "c", { title: "Service", imageSrc: "/media/desk.jpg", placeholder: ["title", "imageSrc"] })] }),
  ],
});

beforeEach(() => {
  data = page();
  dispatch.mockClear();
});
afterEach(cleanup);

describe("placeholders: the Replace me field", () => {
  it("is in the Advanced tab of blocks with words or photos only", () => {
    const c = withPlaceholderEditing(config).components as unknown as Config["components"];
    expect(c.Heading!.fields).toHaveProperty("placeholder");
    expect(c.Spacer!.fields).not.toHaveProperty("placeholder");
    expect(tabOf("Heading", "placeholder")).toBe("advanced");
  });

  it("ticks fields on and off", () => {
    const onChange = vi.fn();
    const { rerender } = render(<ReplaceMeField type="Card" value={undefined} onChange={onChange} />);
    expect(screen.getByRole("group", { name: "Replace me" })).toBeTruthy();
    fireEvent.click(screen.getByRole("checkbox", { name: "Photo" }));
    expect(onChange).toHaveBeenLastCalledWith(["imageSrc"]);
    rerender(<ReplaceMeField type="Card" value={["imageSrc"]} onChange={onChange} />);
    fireEvent.click(screen.getByRole("checkbox", { name: "Title" }));
    expect(onChange).toHaveBeenLastCalledWith(["title", "imageSrc"]);
    fireEvent.click(screen.getByRole("checkbox", { name: "Photo" }));
    expect(onChange).toHaveBeenLastCalledWith(undefined);
  });
});

describe("placeholders: the To replace list", () => {
  it("counts what's left and lists each block", () => {
    render(<PlaceholderChecklist />);
    const button = screen.getByRole("button", { name: "To replace 3" });
    expect(button.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(button);
    const panel = screen.getByRole("region", { name: "3 things to replace" });
    const items = within(panel).getAllByRole("listitem");
    expect(items.map((li) => li.querySelector("strong")!.textContent)).toEqual(["Heading “Your studio name”", "Card “Service”"]);
    expect(within(items[1]!).getByText("Title, Photo")).toBeTruthy();
  });

  it("selects a block with Show", () => {
    render(<PlaceholderChecklist />);
    fireEvent.click(screen.getByRole("button", { name: "To replace 3" }));
    fireEvent.click(screen.getByRole("button", { name: "Show Card “Service”" }));
    expect(dispatch).toHaveBeenCalledWith({ type: "setUi", ui: { itemSelector: { index: 0, zone: "s:content" } } });
  });

  it("keeps a block as is, as one undo step", () => {
    const { rerender } = render(<PlaceholderChecklist />);
    fireEvent.click(screen.getByRole("button", { name: "To replace 3" }));
    fireEvent.click(screen.getByRole("button", { name: "Keep as is: Heading “Your studio name”" }));
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: "setData", recordHistory: true }));
    expect(findPlaceholders(data.content).map((p) => p.id)).toEqual(["c"]);
    rerender(<PlaceholderChecklist />);
    expect(screen.getByRole("region", { name: "2 things to replace" })).toBeTruthy();
  });

  it("says when everything is replaced, and is hidden on pages without any", () => {
    const { rerender } = render(<PlaceholderChecklist />);
    fireEvent.click(screen.getByRole("button", { name: "To replace 3" }));
    data = { ...data, content: [block("Heading", "h", { text: "Studio Rivera", level: "h1" })] };
    rerender(<PlaceholderChecklist />);
    act(() => {});
    expect(screen.getByRole("status").textContent).toContain("Nothing from the template is left on this page.");
    cleanup();
    render(<PlaceholderChecklist />);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("closes with Escape and returns focus to its button", () => {
    render(<PlaceholderChecklist />);
    const button = screen.getByRole("button", { name: "To replace 3" });
    fireEvent.click(button);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("region")).toBeNull();
    expect(document.activeElement).toBe(button);
  });
});

describe("placeholders: arriving from the first run (F060)", () => {
  afterEach(() => {
    sessionStorage.clear();
    vi.useRealTimers();
  });

  it("starts open once, with focus on the list's heading", () => {
    vi.useFakeTimers();
    sessionStorage.setItem("crust:open-to-replace", "1");
    render(<PlaceholderChecklist />);
    expect(screen.getByRole("button", { name: "To replace 3" }).getAttribute("aria-expanded")).toBe("true");
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(document.activeElement).toBe(screen.getByRole("heading", { name: "3 things to replace" }));
    expect(sessionStorage.getItem("crust:open-to-replace")).toBeNull();
    cleanup();
    render(<PlaceholderChecklist />);
    expect(screen.getByRole("button", { name: "To replace 3" }).getAttribute("aria-expanded")).toBe("false");
  });

  it("stays closed on a page with nothing to replace", () => {
    sessionStorage.setItem("crust:open-to-replace", "1");
    data = { ...data, content: [block("Heading", "h", { text: "Bakery", level: "h1" })] };
    render(<PlaceholderChecklist />);
    expect(screen.queryByRole("button")).toBeNull();
  });
});

describe("placeholders: replacing clears the mark", () => {
  it("drops the mark of a heading once its words change", () => {
    const { rerender } = render(<PlaceholderWatcher />);
    const edited = page();
    edited.content[0]!.props.text = "Studio Rivera";
    data = edited;
    rerender(<PlaceholderWatcher />);
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(findPlaceholders(data.content).map((p) => p.id)).toEqual(["c"]);
  });

  it("does nothing for edits elsewhere", () => {
    const { rerender } = render(<PlaceholderWatcher />);
    data = { ...data, content: [...data.content, block("Spacer", "sp")] };
    rerender(<PlaceholderWatcher />);
    expect(dispatch).not.toHaveBeenCalled();
  });
});

describe("placeholders: Pages and Publish", () => {
  it("counts placeholders in drafts kept in this browser", () => {
    const rows = mergePageRows([{ path: "/", title: "Home", lastEdited: null, placeholders: 0 }], [
      { page: { path: "/", title: "Home", description: "", puck: page() as never }, updatedAt: "2026-10-30T10:00:00Z", savedToGitHub: false },
    ]);
    expect(rows[0]!.placeholders).toBe(3);
  });

  it("holds publishing and names the pages", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ ok: true, runs: [], liveUrl: null }), { headers: { "Content-Type": "application/json" } })));
    render(<PublishPanel githubOn siteUrl="https://example.pages.dev" placeholders={[{ path: "/", title: "Home", count: 3 }, { path: "/about", title: "About", count: 1 }]} />);
    await act(async () => {});
    expect(document.getElementById("placeholders-h")!.textContent).toBe(
      "Not ready to publish yet: 4 things to replace from the template, so visitors don't see sample words or photos.",
    );
    expect(screen.getByRole("link", { name: "Home" }).getAttribute("href")).toBe("#/edit?path=%2F");
    const publish = screen.getByRole("button", { name: "Publish site" });
    expect(publish.getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(publish);
    await act(async () => {});
    const posts = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls.filter(([, init]) => (init as RequestInit | undefined)?.method === "POST");
    expect(posts).toEqual([]);
    expect(document.activeElement?.id).toBe("placeholders-h");
    vi.unstubAllGlobals();
  });
});

// @vitest-environment happy-dom
import type { Page } from "@crust/blocks";
import type { Data } from "@puckeditor/core";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { saveMessage } from "../App";
import { getLocalDraft } from "../pages/store";
import { applyQuickEdit, prefersQuickEdit, quickGroups } from "./quick";
import { QuickEdit } from "./QuickEdit";

const api = vi.hoisted(() => ({ saveContent: vi.fn(), startPublish: vi.fn(), listMedia: vi.fn() }));
vi.mock("../api-client", async (orig) => ({ ...(await orig<typeof import("../api-client")>()), ...api }));

const data = {
  root: { props: { title: "Home", description: "Welcome" } },
  content: [
    {
      type: "Section",
      props: {
        id: "s1",
        imageSrc: "",
        content: [
          { type: "Heading", props: { id: "h1", text: "Fresh bread", level: "h1", align: "left" } },
          {
            type: "Columns",
            props: {
              id: "c1",
              count: "2",
              column1: [{ type: "Button", props: { id: "b1", label: "Order now", href: "/order" } }],
              column2: [{ type: "Image", props: { id: "i1", src: "/media/loaf.jpg", alt: "A loaf", caption: "" } }],
            },
          },
        ],
      },
    },
    { type: "Gallery", props: { id: "g1", images: [{ src: "/a.jpg", alt: "A", caption: "" }, { src: "/b.jpg", alt: "B", caption: "" }] } },
    { type: "Spacer", props: { id: "sp", size: "md" } },
  ],
} as Data;
const page: Page = { path: "/", title: "Home", description: "Welcome", puck: { root: { props: {} }, content: data.content } };

beforeEach(() => {
  Object.values(api).forEach((f) => f.mockReset());
  api.listMedia.mockResolvedValue({ ok: false, error: "off", notConfigured: true });
  localStorage.clear();
});
afterEach(() => cleanup());

describe("quick edit model (F038)", () => {
  it("lists words, labels and photos in reading order, inside sections and columns", () => {
    const groups = quickGroups(data);
    expect(groups.map((g) => g.title)).toEqual(["Heading", "Button", "Image", "Photo 1 of 2 · Gallery", "Photo 2 of 2 · Gallery"]);
    expect(groups[2]!.fields.map((f) => [f.label, f.kind, f.value])).toEqual([
      ["Photo", "image", "/media/loaf.jpg"],
      ["Alt text", "text", "A loaf"],
      ["Caption", "text", ""],
    ]);
    // A section without a background photo has nothing to change here.
    expect(groups.some((g) => g.title === "Section")).toBe(false);
  });

  it("changes only the one value, everywhere else untouched", () => {
    const button = quickGroups(data)[1]!.fields[0]!;
    const next = applyQuickEdit(data, button, "Order today");
    const columns = (next.content[0]!.props.content as Data["content"])[1]!;
    expect((columns.props.column1 as Data["content"])[0]!.props).toEqual({ id: "b1", label: "Order today", href: "/order" });
    expect(next.content[1]).toBe(data.content[1]);
    expect((columns.props.column2 as Data["content"])[0]).toBe(((data.content[0]!.props.content as Data["content"])[1]!.props.column2 as Data["content"])[0]);
    // The original is never changed.
    expect(JSON.stringify(data)).toContain("Order now");
  });

  it("swaps a photo in a list with its alt text", () => {
    const photo = quickGroups(data)[4]!.fields[0]!;
    const next = applyQuickEdit(data, photo, "/media/new.jpg", { alt: "New" });
    expect(next.content[1]!.props.images).toEqual([{ src: "/a.jpg", alt: "A", caption: "" }, { src: "/media/new.jpg", alt: "New", caption: "" }]);
  });

  it("opens on phones, unless the full builder is asked for", () => {
    expect(prefersQuickEdit(390, "#/edit?path=/")).toBe(true);
    expect(prefersQuickEdit(390, "#/edit?path=/&mode=full")).toBe(false);
    expect(prefersQuickEdit(1440, "#/edit?path=/")).toBe(false);
    expect(prefersQuickEdit(1440, "#/edit?path=/&mode=quick")).toBe(true);
  });
});

describe("Quick edit screen (F038)", () => {
  it("edits a heading, keeps it in the browser, and saves to GitHub", async () => {
    api.saveContent.mockResolvedValue({ ok: true, path: "content/pages/index.json", commit: "c", url: "u" });
    render(<QuickEdit page={page} githubOn saveMessage={saveMessage} />);
    expect(screen.getByRole("heading", { level: 1, name: "Quick edit" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Full builder" }).getAttribute("href")).toBe("#/edit?path=%2F&mode=full");
    act(() => fireEvent.change(screen.getByRole("textbox", { name: "Heading, part 1" }), { target: { value: "Warm bread" } }));
    expect(getLocalDraft("/")?.savedToGitHub).toBe(false);
    expect(JSON.stringify(getLocalDraft("/")?.page)).toContain("Warm bread");
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Save" })));
    const saved = api.saveContent.mock.calls[0]![0];
    expect(saved.kind).toBe("page");
    expect(saved.page.title).toBe("Home");
    expect(JSON.stringify(saved.page.puck)).toContain("Warm bread");
    expect(screen.getByRole("status").textContent).toContain("saved");
    expect(getLocalDraft("/")?.savedToGitHub).toBe(true);
  });

  it("saves and publishes in one go", async () => {
    api.saveContent.mockResolvedValue({ ok: true, path: "p", commit: "c", url: "u" });
    api.startPublish.mockResolvedValue({ ok: true });
    render(<QuickEdit page={page} githubOn saveMessage={saveMessage} />);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Save and publish" })));
    expect(api.startPublish).toHaveBeenCalled();
    expect(screen.getByRole("status").textContent).toContain("Saved and publishing");
  });

  it("won't publish when saving failed", async () => {
    api.saveContent.mockResolvedValue({ ok: false, error: "GitHub is down." });
    render(<QuickEdit page={page} githubOn saveMessage={saveMessage} />);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Save and publish" })));
    expect(api.startPublish).not.toHaveBeenCalled();
    expect(screen.getByRole("status").textContent).toContain("GitHub is down.");
  });

  it("needs a page title", async () => {
    render(<QuickEdit page={page} githubOn saveMessage={saveMessage} />);
    act(() => fireEvent.change(screen.getByLabelText("Page title"), { target: { value: " " } }));
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Save" })));
    expect(api.saveContent).not.toHaveBeenCalled();
    expect(document.activeElement?.id).toBe("qe-title");
  });

  it("each photo has its own labelled group", () => {
    render(<QuickEdit page={page} githubOn={false} saveMessage={saveMessage} />);
    expect(screen.getByRole("region", { name: "5 Photo 2 of 2 · Gallery" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Save and publish" })).toBeNull();
  });
});

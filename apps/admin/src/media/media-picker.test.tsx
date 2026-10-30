// @vitest-environment happy-dom
import { config, type MediaItem } from "@crust/blocks";
import type { Config } from "@puckeditor/core";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ItemsField, type ItemsFieldDef } from "../items/items";
import { fillAltText, imageLabel, withMediaFields } from "./fields";
import { ImageField, imageName } from "./ImageField";
import { filterMedia, MediaPicker } from "./MediaPicker";
import { checkPickedFile, outputType } from "./shrink";
import { resetMediaStore } from "./store";

const api = vi.hoisted(() => ({
  listMedia: vi.fn(),
  uploadMedia: vi.fn(),
  setMediaAlt: vi.fn(),
  deleteMedia: vi.fn(),
}));
vi.mock("../api-client", async (orig) => ({ ...(await orig<typeof import("../api-client")>()), ...api }));
// Resizing needs a real browser canvas; here the file goes through as it is.
vi.mock("./shrink", async (orig) => ({
  ...(await orig<typeof import("./shrink")>()),
  prepareUpload: async (file: File) => ({ ok: true, name: file.name, base64: "AAAA", width: 10, height: 10 }),
}));

const photo = (file: string, alt: string, uploadedAt = "2026-10-30T00:00:00Z"): MediaItem => ({ file, alt, width: 2400, height: 1600, bytes: 512000, uploadedAt });
const library = [photo("harbour.jpg", "Boats in the harbour at dawn"), photo("mugs.jpg", "Clay mugs on a shelf"), photo("workshop.jpg", "")];

beforeEach(() => {
  Object.values(api).forEach((f) => f.mockReset());
  api.listMedia.mockResolvedValue({ ok: true, items: library, usage: { "harbour.jpg": [{ path: "/", title: "Home" }] } });
  resetMediaStore();
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
});
afterEach(() => cleanup());

/** An image field with the picker, like in the builder. */
function setup(initial = "") {
  const changes: string[] = [];
  const picks: [string, string][] = [];
  function Field() {
    return (
      <>
        <ImageField
          label="Image"
          value={changes.at(-1) ?? initial}
          onChange={(v) => changes.push(v)}
          onPick={(src, alt) => {
            picks.push([src, alt]);
            changes.push(src);
          }}
        />
        <MediaPicker />
      </>
    );
  }
  const view = render(<Field />);
  return { changes, picks, view };
}

async function openPicker(initial = "") {
  const ctx = setup(initial);
  await act(async () => fireEvent.click(screen.getByRole("button", { name: /Choose image|Change image/ })));
  await waitFor(() => expect(screen.getByRole("radiogroup", { name: /Photos/ })).toBeTruthy());
  return ctx;
}

describe("image field (F034)", () => {
  it("shows the chosen photo, and keeps web addresses working", async () => {
    setup("https://example.com/a/photo.jpg?w=1");
    expect(screen.getByText("photo.jpg")).toBeTruthy();
    expect(screen.getByText("Web address")).toBeTruthy();
    expect((screen.getByLabelText("Web address for image") as HTMLInputElement).value).toBe("https://example.com/a/photo.jpg?w=1");
    expect(screen.getByRole("button", { name: "Change image" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Remove image" })).toBeTruthy();
  });

  it("names images briefly", () => {
    expect(imageName("/media/harbour.jpg")).toBe("harbour.jpg");
    expect(imageName("https://x.dev/a/b.png#top")).toBe("b.png");
  });
});

describe("Choose an image (F034)", () => {
  it("opens on the field's current photo with its details", async () => {
    await openPicker("/media/harbour.jpg");
    const dialog = screen.getByRole("dialog", { name: "Choose an image" });
    expect(within(dialog).getByText("For: Image")).toBeTruthy();
    const current = screen.getByRole("radio", { name: "Boats in the harbour at dawn" });
    expect(current.getAttribute("aria-checked")).toBe("true");
    expect(current.tabIndex).toBe(0);
    expect((screen.getByLabelText(/Alt text/) as HTMLTextAreaElement).value).toBe("Boats in the harbour at dawn");
    expect(screen.getByText("2400 × 1600 px · 500 KB")).toBeTruthy();
    expect(screen.getByText("Home")).toBeTruthy();
    // A photo in use can't be deleted.
    expect(screen.getByText(/choose another one on that page first/)).toBeTruthy();
  });

  it("is one tab stop; arrow keys move between photos", async () => {
    await openPicker("/media/harbour.jpg");
    const grid = screen.getByRole("radiogroup");
    expect(grid.querySelectorAll('[tabindex="0"]')).toHaveLength(1);
    await act(async () => fireEvent.keyDown(grid, { key: "ArrowRight" }));
    expect(screen.getByRole("radio", { name: "Clay mugs on a shelf" }).getAttribute("aria-checked")).toBe("true");
    // The alt text box always shows the selected photo's own text.
    expect((screen.getByLabelText(/Alt text/) as HTMLTextAreaElement).value).toBe("Clay mugs on a shelf");
    await act(async () => fireEvent.keyDown(grid, { key: "End" }));
    expect((screen.getByLabelText(/Alt text/) as HTMLTextAreaElement).value).toBe("");
    expect(screen.getByRole("radio", { name: "workshop.jpg (needs alt text)" }).getAttribute("aria-checked")).toBe("true");
    await act(async () => fireEvent.keyDown(grid, { key: "Home" }));
    expect(screen.getByRole("radio", { name: "Boats in the harbour at dawn" }).tabIndex).toBe(0);
  });

  it("uses a photo: the field gets its address and alt text, and focus goes back", async () => {
    const { picks } = await openPicker();
    await act(async () => fireEvent.click(screen.getByRole("radio", { name: "Clay mugs on a shelf" })));
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Use this photo" })));
    expect(picks).toEqual([["/media/mugs.jpg", "Clay mugs on a shelf"]]);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(api.setMediaAlt).not.toHaveBeenCalled();
  });

  it("won't use a photo without alt text, and saves new alt text first", async () => {
    const { picks } = await openPicker();
    await act(async () => fireEvent.click(screen.getByRole("radio", { name: "workshop.jpg (needs alt text)" })));
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Use this photo" })));
    expect(picks).toEqual([]);
    const alt = screen.getByLabelText(/Alt text/) as HTMLTextAreaElement;
    expect(alt.getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByText("Add alt text before using this photo.")).toBeTruthy();
    expect(alt.getAttribute("aria-describedby")).toContain("alt-error");

    api.setMediaAlt.mockResolvedValue({ ok: true, item: photo("workshop.jpg", "People at the pottery wheel") });
    act(() => fireEvent.change(alt, { target: { value: " People at the pottery wheel " } }));
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Use this photo" })));
    expect(api.setMediaAlt).toHaveBeenCalledWith("workshop.jpg", "People at the pottery wheel");
    expect(picks).toEqual([["/media/workshop.jpg", "People at the pottery wheel"]]);
  });

  it("searches by alt text and file name", async () => {
    await openPicker();
    act(() => fireEvent.change(screen.getByRole("searchbox", { name: "Search photos" }), { target: { value: "clay" } }));
    expect(screen.getAllByRole("radio")).toHaveLength(1);
    act(() => fireEvent.change(screen.getByRole("searchbox", { name: "Search photos" }), { target: { value: "nothing here" } }));
    expect(screen.getByText('No photos match "nothing here".')).toBeTruthy();
    expect(filterMedia(library, "WORKSHOP").map((p) => p.file)).toEqual(["workshop.jpg"]);
  });

  it("uploads photos, selects the new one and asks for its alt text", async () => {
    await openPicker();
    api.uploadMedia.mockResolvedValue({ ok: true, item: photo("terrace.jpg", "", "2026-10-31T00:00:00Z") });
    const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;
    expect(input.accept).toBe("image/jpeg,image/png,image/webp");
    const file = new File(["x"], "Terrace.jpg", { type: "image/jpeg" });
    await act(async () => fireEvent.change(input, { target: { files: [file] } }));
    await waitFor(() => expect(screen.getByRole("radio", { name: "terrace.jpg (needs alt text)" }).getAttribute("aria-checked")).toBe("true"));
    expect(api.uploadMedia).toHaveBeenCalledWith({ name: "Terrace.jpg", data: "AAAA", alt: "" });
    expect(screen.getByRole("status").textContent).toBe("Uploaded terrace.jpg. Describe it in Alt text.");
    await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText(/Alt text/)));
  });

  it("lists every file that couldn't be uploaded", async () => {
    await openPicker();
    api.uploadMedia.mockResolvedValue({ ok: false, error: "GitHub returned an error (500). Try again in a minute." });
    const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;
    await act(async () => fireEvent.change(input, { target: { files: [new File(["x"], "a.jpg", { type: "image/jpeg" })] } }));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("a.jpg: GitHub returned an error"));
  });

  it("deletes an unused photo after asking", async () => {
    await openPicker();
    api.deleteMedia.mockResolvedValue({ ok: true });
    await act(async () => fireEvent.click(screen.getByRole("radio", { name: "Clay mugs on a shelf" })));
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Delete from library…" })));
    expect(screen.getByText(/Its history stays on GitHub/)).toBeTruthy();
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Delete photo" })));
    expect(api.deleteMedia).toHaveBeenCalledWith("mugs.jpg");
    expect(screen.queryByRole("radio", { name: "Clay mugs on a shelf" })).toBeNull();
  });

  it("explains when the library isn't available (no saving to GitHub here)", async () => {
    api.listMedia.mockResolvedValue({ ok: false, error: "Saving to GitHub isn't available here yet.", notConfigured: true });
    setup();
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Choose image" })));
    await waitFor(() => expect(screen.getByText(/The photo library needs saving to GitHub/)).toBeTruthy());
    expect((screen.getByRole("button", { name: "Upload photos" }) as HTMLButtonElement).disabled).toBe(true);
  });
});

describe("picking files", () => {
  it("accepts JPG, PNG and WebP up to 20 MB, with a tip for iPhone photos", () => {
    expect(checkPickedFile({ name: "a.jpg", type: "image/jpeg", size: 1000 })).toBeNull();
    expect(checkPickedFile({ name: "a.gif", type: "image/gif", size: 1000 })).toMatch(/only JPG, PNG and WebP/);
    expect(checkPickedFile({ name: "IMG_1.HEIC", type: "image/heic", size: 1000 })).toMatch(/Most Compatible/);
    expect(checkPickedFile({ name: "big.jpg", type: "image/jpeg", size: 21 * 1024 * 1024 })).toMatch(/over 20 MB/);
    expect(outputType("png")).toBe("image/png");
    expect(outputType("jpg")).toBe("image/jpeg");
  });
});

describe("every image field gets the library (F034)", () => {
  const cfg = withMediaFields(config) as unknown as Config;
  const fieldsOf = (name: string) => cfg.components[name]!.fields as Record<string, { type: string; label?: string; arrayFields?: Record<string, { type: string; altKey?: string }> }>;

  it("swaps address fields for image fields, in blocks and in lists", () => {
    expect(fieldsOf("Image").src!.type).toBe("custom");
    expect(fieldsOf("Image").src!.label).toBe("Image");
    expect(fieldsOf("Section").imageSrc!.label).toBe("Background image (optional)");
    expect(fieldsOf("Card").imageSrc!.type).toBe("custom");
    expect(fieldsOf("Quote").imageSrc!.label).toBe("Photo (optional)");
    expect(fieldsOf("ImageOverlay").imageSrc!.type).toBe("custom");
    expect(fieldsOf("Gallery").images!.arrayFields!.src).toEqual({ type: "image", label: "Image", altKey: "alt" });
    expect(fieldsOf("LogoRow").logos!.arrayFields!.src).toMatchObject({ type: "image", label: "Logo image", altKey: "alt" });
    expect(fieldsOf("Grid").items!.arrayFields!.imageSrc).toMatchObject({ type: "image", altKey: "imageAlt" });
    // Alt text fields stay as they are.
    expect(fieldsOf("Image").alt!.type).toBe("text");
    expect(imageLabel("Logo image URL")).toBe("Logo image");
  });

  it("fills a block's alt text from the library when a new photo is picked", async () => {
    resetMediaStore({ status: "ready", items: library });
    const pairs: [string, string][] = [["src", "alt"]];
    expect(fillAltText({ src: "/media/mugs.jpg", alt: "old" }, { src: "/media/harbour.jpg", alt: "old" }, pairs)).toEqual({ src: "/media/mugs.jpg", alt: "Clay mugs on a shelf" });
    // Same photo, a typed address, or first load: alt text is left alone.
    const same = { src: "/media/mugs.jpg", alt: "mine" };
    expect(fillAltText(same, { ...same }, pairs)).toBe(same);
    const typed = { src: "https://x.dev/a.jpg", alt: "mine" };
    expect(fillAltText(typed, { src: "", alt: "mine" }, pairs)).toBe(typed);
    expect(fillAltText(same, null, pairs)).toBe(same);

    const resolve = cfg.components.Image!.resolveData as unknown as (d: unknown, p: unknown) => Promise<{ props: Record<string, unknown> }>;
    const out = await resolve({ props: { id: "i", src: "/media/harbour.jpg", alt: "", caption: "" } }, { lastData: { props: { id: "i", src: "", alt: "", caption: "" } }, changed: { src: true } });
    expect(out.props.alt).toBe("Boats in the harbour at dawn");
  });

  it("a photo picked in a list item sets its address and alt text together", async () => {
    const field = fieldsOf("Gallery").images as unknown as ItemsFieldDef;
    let items: Record<string, unknown>[] = [{ src: "", alt: "", caption: "" }];
    function List() {
      return (
        <>
          <ItemsField field={field} value={items} onChange={(next) => (items = next)} />
          <MediaPicker />
        </>
      );
    }
    const view = render(<List />);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Photo" })));
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Choose image" })));
    await waitFor(() => expect(screen.getByRole("radiogroup")).toBeTruthy());
    expect(screen.getByText("For: Image, Photo 1")).toBeTruthy();
    await act(async () => fireEvent.click(screen.getByRole("radio", { name: "Clay mugs on a shelf" })));
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Use this photo" })));
    expect(items).toEqual([{ src: "/media/mugs.jpg", alt: "Clay mugs on a shelf", caption: "" }]);
    view.unmount();
  });
});

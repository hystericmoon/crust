// @vitest-environment happy-dom
/** F081: picking a photo's focal point in the media library. */
import { Img, type MediaItem } from "@crust/blocks";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { describeFocus, MediaFocusProvider, movedFocus } from "./FocusPicker";
import { MediaPicker, openMediaPicker } from "./MediaPicker";
import { resetMediaStore } from "./store";

const api = vi.hoisted(() => ({
  listMedia: vi.fn(),
  setMediaAlt: vi.fn(),
  setMediaDetails: vi.fn(),
}));
vi.mock("../api-client", async (orig) => ({ ...(await orig<typeof import("../api-client")>()), ...api }));

const photo = (file: string, alt: string, focus?: { x: number; y: number }): MediaItem => ({ file, alt, width: 2400, height: 1600, bytes: 1, uploadedAt: "", ...(focus ? { focus } : {}) });
const library = [photo("stage.jpg", "The band on stage", { x: 20, y: 40 }), photo("door.jpg", "")];

beforeEach(() => {
  Object.values(api).forEach((f) => f.mockReset());
  api.listMedia.mockResolvedValue({ ok: true, items: library, usage: {} });
  resetMediaStore();
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    this.removeAttribute("open");
  };
});
afterEach(() => cleanup());

async function open(current: string) {
  const picks: string[] = [];
  render(<MediaPicker />);
  await act(async () => {
    openMediaPicker({ fieldLabel: "Image", current, onPick: (src) => picks.push(src) });
  });
  await waitFor(() => expect(screen.getByRole("application", { name: /Focal point/ })).toBeTruthy());
  return { picks, picker: () => screen.getByRole("application", { name: /Focal point/ }) };
}

describe("focal point picker (F081)", () => {
  it("moves by 5% with the arrows, 20% with Shift, and stays on the photo", () => {
    expect(movedFocus({ x: 50, y: 50 }, "ArrowLeft", false)).toEqual({ x: 45, y: 50 });
    expect(movedFocus({ x: 50, y: 90 }, "ArrowDown", true)).toEqual({ x: 50, y: 100 });
    expect(movedFocus({ x: 3, y: 50 }, "ArrowLeft", true)).toEqual({ x: 0, y: 50 });
    expect(movedFocus({ x: 50, y: 50 }, "Enter", false)).toBeNull();
    expect(describeFocus({ x: 50, y: 50 })).toBe("the middle");
    expect(describeFocus({ x: 18, y: 45 })).toBe("18% from the left, 45% from the top");
  });

  it("shows the saved point, reads it out, and saves a new one with the alt text", async () => {
    const { picker } = await open("/media/stage.jpg");
    expect(picker().getAttribute("aria-label")).toBe("Focal point: 20% from the left, 40% from the top");
    expect(picker().tabIndex).toBe(0);
    // The three crops follow the point.
    const crops = document.querySelectorAll<HTMLImageElement>(".mp-crops img");
    expect(crops).toHaveLength(3);
    expect(crops[0]!.style.objectPosition).toBe("20% 40%");

    act(() => fireEvent.keyDown(picker(), { key: "ArrowRight" }));
    expect(picker().getAttribute("aria-label")).toBe("Focal point: 25% from the left, 40% from the top");
    expect(screen.getByText("Focal point at 25% from the left, 40% from the top.")).toBeTruthy();

    api.setMediaDetails.mockResolvedValue({ ok: true, item: photo("stage.jpg", "The band on stage", { x: 25, y: 40 }) });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Save changes" })));
    expect(api.setMediaDetails).toHaveBeenCalledWith("stage.jpg", "The band on stage", { x: 25, y: 40 });
    expect(screen.getByText("Focal point saved.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Save changes" })).toBeNull();
  });

  it("a press puts the point where it lands on the photo", async () => {
    const { picker } = await open("/media/stage.jpg");
    const img = picker().querySelector("img")!;
    img.getBoundingClientRect = () => ({ left: 100, top: 50, width: 400, height: 200, right: 500, bottom: 250, x: 100, y: 50, toJSON: () => ({}) });
    act(() => fireEvent.pointerDown(picker(), { button: 0, clientX: 172, clientY: 140, pointerId: 1 }));
    expect(picker().getAttribute("aria-label")).toBe("Focal point: 18% from the left, 45% from the top");
  });

  it("Centre clears it, and a photo without alt text can still get a point", async () => {
    await open("/media/door.jpg");
    expect(screen.getByRole("button", { name: "Centre" }).hasAttribute("disabled")).toBe(true);
    act(() => fireEvent.keyDown(screen.getByRole("application", { name: /Focal point/ }), { key: "ArrowUp", shiftKey: true }));
    api.setMediaDetails.mockResolvedValue({ ok: true, item: photo("door.jpg", "", { x: 50, y: 30 }) });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Save changes" })));
    expect(api.setMediaDetails).toHaveBeenCalledWith("door.jpg", "", { x: 50, y: 30 });

    act(() => fireEvent.click(screen.getByRole("button", { name: "Centre" })));
    api.setMediaDetails.mockResolvedValue({ ok: true, item: photo("door.jpg", "") });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Save changes" })));
    expect(api.setMediaDetails).toHaveBeenLastCalledWith("door.jpg", "", null);
  });

  it("Use this photo saves a changed point first", async () => {
    const { picks, picker } = await open("/media/stage.jpg");
    act(() => fireEvent.keyDown(picker(), { key: "ArrowDown" }));
    api.setMediaDetails.mockResolvedValue({ ok: true, item: photo("stage.jpg", "The band on stage", { x: 20, y: 45 }) });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Use this photo" })));
    expect(api.setMediaDetails).toHaveBeenCalledWith("stage.jpg", "The band on stage", { x: 20, y: 45 });
    expect(picks).toEqual(["/media/stage.jpg"]);
  });
});

describe("builder canvas (F081)", () => {
  it("crops library photos around their focal points", async () => {
    render(
      <MediaFocusProvider>
        <Img src="/media/stage.jpg" alt="The band" loading="lazy" />
        <Img src="/media/door.jpg" alt="Door" loading="lazy" />
      </MediaFocusProvider>,
    );
    await waitFor(() => expect(screen.getByAltText("The band").style.objectPosition).toBe("20% 40%"));
    expect(screen.getByAltText("Door").style.objectPosition).toBe("");
  });
});

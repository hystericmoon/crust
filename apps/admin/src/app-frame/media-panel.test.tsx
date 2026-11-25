// @vitest-environment happy-dom
import type { MediaItem } from "@crust/blocks";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetMediaStore } from "../media/store";
import { MediaPanel } from "./rail";

const api = vi.hoisted(() => ({
  listMedia: vi.fn(),
  uploadMedia: vi.fn(),
  setMediaAlt: vi.fn(),
  deleteMedia: vi.fn(),
}));
vi.mock("../api-client", async (orig) => ({ ...(await orig<typeof import("../api-client")>()), ...api }));
vi.mock("../media/shrink", async (orig) => ({
  ...(await orig<typeof import("../media/shrink")>()),
  prepareUpload: async (file: File) => ({ ok: true, name: file.name, base64: "AAAA", width: 10, height: 10 }),
}));

const photo = (file: string, alt: string): MediaItem => ({ file, alt, width: 2400, height: 1600, bytes: 512000, uploadedAt: "2026-10-30T00:00:00Z" });
const library = [photo("harbour.jpg", "Boats in the harbour at dawn"), photo("mugs.jpg", "Clay mugs on a shelf"), photo("workshop.jpg", "")];

beforeEach(() => {
  Object.values(api).forEach((f) => f.mockReset());
  api.listMedia.mockResolvedValue({ ok: true, items: library, usage: { "harbour.jpg": [{ path: "/", title: "Home" }] } });
  resetMediaStore();
});
afterEach(() => cleanup());

describe("Media panel in the rail (audit A103)", () => {
  it("lists every photo as a named, keyboard-reachable choice", async () => {
    render(<MediaPanel />);
    const photos = await screen.findAllByRole("radio");
    expect(photos.map((p) => p.getAttribute("aria-label"))).toEqual(["Boats in the harbour at dawn", "Clay mugs on a shelf", "workshop.jpg (needs alt text)"]);
    expect(photos.filter((p) => p.tabIndex === 0)).toHaveLength(1);
    // With nothing picked, the first arrow picks the focused photo; the next moves on.
    fireEvent.keyDown(photos[0]!, { key: "ArrowRight" });
    fireEvent.keyDown(photos[0]!, { key: "ArrowRight" });
    expect(photos[1]!.getAttribute("aria-checked")).toBe("true");
  });

  it("searches by alt text or file name", async () => {
    render(<MediaPanel />);
    await screen.findAllByRole("radio");
    fireEvent.change(screen.getByRole("searchbox", { name: "Search photos" }), { target: { value: "mugs" } });
    expect(screen.getAllByRole("radio")).toHaveLength(1);
    fireEvent.change(screen.getByRole("searchbox", { name: "Search photos" }), { target: { value: "zzz" } });
    expect(screen.getByText(/No photos match/)).toBeTruthy();
  });

  it("refuses to delete a photo that is used on a page, and deletes one that is not", async () => {
    api.deleteMedia.mockResolvedValue({ ok: true });
    render(<MediaPanel />);
    const photos = await screen.findAllByRole("radio");
    fireEvent.click(photos[0]!);
    expect(screen.getByText(/choose another one on that page first/)).toBeTruthy();
    expect(screen.queryByText("Delete from library…")).toBeNull();
    fireEvent.click(photos[1]!);
    fireEvent.click(screen.getByText("Delete from library…"));
    fireEvent.click(screen.getByText("Delete photo"));
    await waitFor(() => expect(api.deleteMedia).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByRole("status").textContent).toContain("Deleted mugs.jpg"));
  });

  it("uploads photos", async () => {
    api.uploadMedia.mockResolvedValue({ ok: true, item: photo("new.jpg", "") });
    const { container } = render(<MediaPanel />);
    await screen.findAllByRole("radio");
    const input = container.querySelector<HTMLInputElement>('input[type="file"]')!;
    fireEvent.change(input, { target: { files: [new File(["x"], "new.jpg", { type: "image/jpeg" })] } });
    await waitFor(() => expect(api.uploadMedia).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByRole("status").textContent).toContain("Uploaded new.jpg"));
  });
});

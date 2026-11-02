// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { tabOf } from "../tabs/tabs";
import { interactiveFieldShown } from "./fields";
import { findAddress } from "./geocode";
import { MapPinField } from "./MapPinField";

afterEach(() => cleanup());

function Harness({ address, find }: { address: string; find: (a: string) => Promise<{ pin: { lat: number; lng: number }; label: string } | null> }) {
  const [pin, setPin] = useState<unknown>(null);
  return (
    <>
      <MapPinField value={pin} onChange={setPin} address={address} find={find} />
      <div data-testid="pin">{JSON.stringify(pin)}</div>
    </>
  );
}

describe("F079 interactive builder fields", () => {
  it("puts the new settings in the Style tab and shows the speed only when the slideshow plays on its own", () => {
    for (const [block, field] of [["Slideshow", "autoplay"], ["Slideshow", "speed"], ["Slideshow", "ratio"], ["CardSlider", "visible"], ["Map", "zoom"], ["Gallery", "lightbox"], ["Tabs", "look"]] as const)
      expect(tabOf(block, field)).toBe("style");
    expect(tabOf("Map", "pin")).toBe("content");
    expect(tabOf("Tabs", "tabs")).toBe("content");
    expect(interactiveFieldShown("Slideshow", "speed", { autoplay: "no" })).toBe(false);
    expect(interactiveFieldShown("Slideshow", "speed", { autoplay: "yes" })).toBe(true);
    expect(interactiveFieldShown("Map", "zoom", {})).toBe(true);
  });

  it("asks OpenStreetMap for the address and reads its answer", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify([{ lat: "-6.2607", lon: "106.8136", display_name: "Kemang, Jakarta" }]), { status: 200 }));
    expect(await findAddress("  Jl. Kemang Raya 12,\n Jakarta ", fetcher as unknown as typeof fetch)).toEqual({ pin: { lat: -6.2607, lng: 106.8136 }, label: "Kemang, Jakarta" });
    expect((fetcher.mock.calls[0] as unknown[])[0]).toBe("https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=Jl.%20Kemang%20Raya%2012%2C%20Jakarta");
    const none = vi.fn(async () => new Response("[]", { status: 200 }));
    expect(await findAddress("nowhere", none as unknown as typeof fetch)).toBeNull();
    const down = vi.fn(async () => new Response("", { status: 503 }));
    await expect(findAddress("x", down as unknown as typeof fetch)).rejects.toThrow("503");
    expect(await findAddress(" ", fetcher as unknown as typeof fetch)).toBeNull();
  });

  it("Find on the map places the pin and says what was found, with a link to check it", async () => {
    const find = vi.fn(async () => ({ pin: { lat: 1.5, lng: 2.5 }, label: "Main street 1, Town" }));
    render(<Harness address="Main street 1" find={find} />);
    expect(screen.getByText(/No pin yet/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Find on the map" }));
    await waitFor(() => expect(screen.getByTestId("pin").textContent).toBe('{"lat":1.5,"lng":2.5}'));
    expect(find).toHaveBeenCalledWith("Main street 1");
    expect(screen.getByRole("status").textContent).toContain("Found: Main street 1, Town");
    expect(screen.getByRole("link", { name: /Check on OpenStreetMap/ }).getAttribute("href")).toBe("https://www.openstreetmap.org/?mlat=1.5&mlon=2.5#map=17/1.5/2.5");
    fireEvent.click(screen.getByRole("button", { name: "Remove pin" }));
    expect(screen.getByTestId("pin").textContent).toBe("null");
  });

  it("says so when nothing is found, when the search is down, or when there's no address", async () => {
    render(<Harness address="" find={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Find on the map" }));
    expect(screen.getByRole("status").textContent).toBe("Type the address above first.");
    cleanup();
    render(<Harness address="x" find={async () => null} />);
    fireEvent.click(screen.getByRole("button", { name: "Find on the map" }));
    await waitFor(() => expect(screen.getByRole("status").textContent).toContain("couldn't find this address"));
    cleanup();
    render(<Harness address="x" find={async () => Promise.reject(new Error("offline"))} />);
    fireEvent.click(screen.getByRole("button", { name: "Find on the map" }));
    await waitFor(() => expect(screen.getByRole("status").textContent).toContain("can't be reached"));
  });

  it("a pasted Google Maps link or coordinates place the pin; anything else explains what to paste", () => {
    render(<Harness address="" find={vi.fn()} />);
    const input = screen.getByLabelText("Or paste a Google Maps link or coordinates");
    fireEvent.change(input, { target: { value: "https://maps.app.goo.gl/AbC" } });
    fireEvent.click(screen.getByRole("button", { name: "Use this" }));
    expect(screen.getByRole("status").textContent).toContain("press Share");
    fireEvent.change(input, { target: { value: "https://www.google.com/maps/@52.3731,4.8922,15z" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(screen.getByTestId("pin").textContent).toBe('{"lat":52.3731,"lng":4.8922}');
    expect(screen.getByText("Pin at 52.3731, 4.8922.")).toBeTruthy();
  });
});

// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { installTooltips, tipFor } from "./tooltips";

let remove: () => void = () => undefined;
afterEach(() => {
  remove();
  document.body.innerHTML = "";
  vi.useRealTimers();
});

const tooltip = () => document.querySelector<HTMLElement>(".crust-tooltip")!;
const button = (html: string) => {
  document.body.insertAdjacentHTML("beforeend", html);
  return document.body.lastElementChild as HTMLElement;
};

describe("tooltips", () => {
  it("names icon-only buttons, not buttons that already show their name", () => {
    expect(tipFor(button('<button title="Duplicate"><svg></svg></button>'))).toBe("Duplicate");
    expect(tipFor(button('<button aria-label="Dark style"><span></span></button>'))).toBe("Dark style");
    expect(tipFor(button('<button aria-label="Save">Save draft</button>'))).toBeNull();
  });

  it("shows on keyboard focus, takes over the native title, and closes with Escape", () => {
    remove = installTooltips(document);
    const del = button('<button title="Delete"><svg></svg></button>');
    del.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
    expect(tooltip().hidden).toBe(false);
    expect(tooltip().getAttribute("role")).toBe("tooltip");
    expect(tooltip().textContent).toBe("Delete");
    expect(del.hasAttribute("title")).toBe(false);
    expect(del.getAttribute("aria-label")).toBe("Delete");

    const later = vi.fn();
    document.addEventListener("keydown", later);
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(tooltip().hidden).toBe(true);
    // The first Escape only closes the tooltip.
    expect(later).not.toHaveBeenCalled();
    document.removeEventListener("keydown", later);
  });

  it("shows on hover after a short delay and hides when the pointer leaves", () => {
    vi.useFakeTimers();
    remove = installTooltips(document);
    const up = button('<button title="Move up (Alt+↑)"><svg></svg></button>');
    up.dispatchEvent(new PointerEvent("pointerover", { bubbles: true }));
    expect(tooltip().hidden).toBe(true);
    vi.advanceTimersByTime(350);
    expect(tooltip().textContent).toBe("Move up (Alt+↑)");
    up.dispatchEvent(new PointerEvent("pointerout", { bubbles: true, relatedTarget: document.body }));
    expect(tooltip().hidden).toBe(true);
  });

  it("removes itself cleanly", () => {
    remove = installTooltips(document);
    remove();
    remove = () => undefined;
    expect(document.querySelector(".crust-tooltip")).toBeNull();
  });
});

// @vitest-environment happy-dom
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeToggle } from "./ThemeToggle";
import { appThemeBootScript, applyTheme, currentTheme, resolveTheme, setTheme, storedTheme, systemTheme, THEME_KEY, toggleTheme } from "./theme";

/** A stand-in localStorage. */
function memoryStore(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
    data,
  };
}
const throwing = {
  getItem: () => {
    throw new Error("blocked");
  },
  setItem: () => {
    throw new Error("blocked");
  },
  removeItem: () => {
    throw new Error("blocked");
  },
};
const media = (dark: boolean) => (q: string) => ({ matches: dark && q.includes("dark") });

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-app-theme");
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("app-theme helper", () => {
  it("follows the computer when nothing is remembered", () => {
    expect(resolveTheme(storedTheme(memoryStore()), systemTheme(media(true)))).toBe("dark");
    expect(resolveTheme(storedTheme(memoryStore()), systemTheme(media(false)))).toBe("light");
  });

  it("a remembered choice wins over the computer", () => {
    expect(resolveTheme(storedTheme(memoryStore({ [THEME_KEY]: "light" })), systemTheme(media(true)))).toBe("light");
    expect(resolveTheme(storedTheme(memoryStore({ [THEME_KEY]: "dark" })), systemTheme(media(false)))).toBe("dark");
  });

  it("ignores a stored value that isn't light or dark", () => {
    expect(storedTheme(memoryStore({ [THEME_KEY]: "purple" }))).toBeNull();
    expect(resolveTheme(storedTheme(memoryStore({ [THEME_KEY]: "" })), "dark")).toBe("dark");
  });

  it("the switch remembers the other look, and forgets it when that's the computer's look", () => {
    const store = memoryStore();
    expect(toggleTheme("light", "light", store)).toBe("dark");
    expect(store.data.get(THEME_KEY)).toBe("dark");
    // Back to the computer's own look: follow the computer again.
    expect(toggleTheme("dark", "light", store)).toBe("light");
    expect(store.data.has(THEME_KEY)).toBe(false);
  });

  it("keeps working when storage throws (private windows, blocked site data)", () => {
    expect(storedTheme(throwing)).toBeNull();
    expect(() => toggleTheme("light", "light", throwing)).not.toThrow();
    expect(toggleTheme("light", "light", throwing)).toBe("dark");
    expect(systemTheme(() => {
      throw new Error("no matchMedia");
    })).toBe("light");
  });

  it("puts the look on <html> and the colour scheme for native controls", () => {
    applyTheme("dark");
    expect(document.documentElement.getAttribute("data-app-theme")).toBe("dark");
    expect(document.querySelector<HTMLMetaElement>('meta[name="color-scheme"]')?.content).toBe("dark");
    expect(currentTheme()).toBe("dark");
    applyTheme("light");
    expect(currentTheme()).toBe("light");
    expect(document.querySelectorAll('meta[name="color-scheme"]')).toHaveLength(1);
  });
});

describe("app-theme boot script in index.html", () => {
  const html = readFileSync("apps/admin/index.html", "utf8");

  it("index.html runs exactly the helper's script in <head>, before the app", () => {
    const head = html.slice(0, html.indexOf("</head>"));
    expect(head).toContain(`<script>${appThemeBootScript}</script>`);
    expect(head).toContain('<meta name="color-scheme"');
    expect(html.indexOf(appThemeBootScript)).toBeLessThan(html.indexOf("/src/main.tsx"));
  });

  /** Runs the boot script against a fake page; returns the look it set. */
  function boot(stored: string | null | "throw", dark: boolean) {
    const attrs: Record<string, string> = {};
    const meta = { content: "light dark" };
    runInNewContext(appThemeBootScript, {
      localStorage: {
        getItem: () => {
          if (stored === "throw") throw new Error("blocked");
          return stored;
        },
      },
      matchMedia: media(dark),
      document: { documentElement: { setAttribute: (k: string, v: string) => (attrs[k] = v) }, querySelector: () => meta },
    });
    return { theme: attrs["data-app-theme"], scheme: meta.content };
  }

  it("follows the computer, lets a stored choice win, ignores junk and blocked storage", () => {
    expect(boot(null, true)).toEqual({ theme: "dark", scheme: "dark" });
    expect(boot(null, false)).toEqual({ theme: "light", scheme: "light" });
    expect(boot("light", true).theme).toBe("light");
    expect(boot("dark", false).theme).toBe("dark");
    expect(boot("purple", true).theme).toBe("dark");
    expect(boot("throw", true).theme).toBe("dark");
  });
});

describe("ThemeToggle", () => {
  it("is a named, pressable button that switches and remembers the look", () => {
    vi.stubGlobal("matchMedia", media(false));
    applyTheme("light");
    render(<ThemeToggle />);
    const button = screen.getByRole("button", { name: "Light or dark" });
    expect(button.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(button);
    expect(currentTheme()).toBe("dark");
    expect(button.getAttribute("aria-pressed")).toBe("true");
    expect(localStorage.getItem(THEME_KEY)).toBe("dark");
    fireEvent.click(button);
    expect(currentTheme()).toBe("light");
    // Light is this computer's look, so the choice is forgotten.
    expect(localStorage.getItem(THEME_KEY)).toBeNull();
  });

  it("every switch on screen shows a change made elsewhere", () => {
    applyTheme("light");
    render(
      <>
        <ThemeToggle />
        <ThemeToggle />
      </>,
    );
    act(() => setTheme("dark"));
    for (const b of screen.getAllByRole("button", { name: "Light or dark" })) expect(b.getAttribute("aria-pressed")).toBe("true");
  });
});

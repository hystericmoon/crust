// @vitest-environment happy-dom
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { defaultTokens, type Page, type Site, type SiteTokens } from "@crust/blocks";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { SiteSettings } from "./SiteSettings";
import { loadSavedTokens, saveTokens, TOKENS_KEY } from "../tokens-store";

const site: Site = { name: "Test", baseUrl: "https://t.dev", language: "en", tokens: defaultTokens };
const page: Page = {
  path: "/",
  title: "Home",
  description: "d",
  puck: { root: { props: {} }, content: [{ type: "Heading", props: { id: "h", text: "Hello", level: "h1", align: "left" } }] },
};

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});
afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
});

/** Renders the screen with real state, like App does. */
function setup(initial: SiteTokens = defaultTokens) {
  const onSave = vi.fn(async (_tokens: SiteTokens) => "Saved to GitHub.");
  function Harness() {
    const [saved, setSaved] = useState(initial);
    const [draft, setDraft] = useState(initial);
    return (
      <SiteSettings
        site={site}
        page={page}
        saved={saved}
        draft={draft}
        onChange={setDraft}
        onSave={(t) => {
          setSaved(t);
          return onSave(t);
        }}
        onDiscard={() => setDraft(saved)}
      />
    );
  }
  render(<Harness />);
  return { onSave };
}

/** Fields only: the Header and Footer style tiles reuse colour names like "Primary". */
const notTile = "input:not([type=radio]), textarea, select";
const field = (label: string | RegExp) => screen.getByLabelText(label, { selector: notTile });
const type = (label: string | RegExp, value: string) =>
  act(() => {
    fireEvent.change(field(label), { target: { value } });
  });

describe("Site settings screen", () => {
  it("has one h1, every group and a labelled field for each token", () => {
    setup();
    expect(screen.getAllByRole("heading", { level: 1 }).map((h) => h.textContent)).toEqual(["Site settings"]);
    // F028 direction A: one group shown at a time; the others stay in the page, hidden.
    expect(screen.getAllByRole("heading", { level: 2, hidden: true }).map((h) => h.textContent)).toEqual([
      "Styles",
      "Colours",
      "Contrast checks",
      "Buttons",
      "Cards",
      "Links",
      "Motion",
      "Section styles",
      "Header & menu",
      "Footer",
      "Typography",
      "Spacing",
      "Shape & layout",
      "Theme pack",
      "Save as template",
      "Site address",
    ]);
    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual(["Styles"]);
    for (const name of ["Page", "Surface", "Text", "Muted text", "Primary", "Text on primary"]) {
      expect(screen.getByLabelText(name, { selector: "input:not([type=color])" })).toBeTruthy();
      expect(screen.getByLabelText(`Pick ${name} colour`)).toBeTruthy();
    }
    for (const label of ["Heading font", "Body font", "XS in rem", "XL in rem", "Corner radius in px", "Page width in px"]) {
      expect(screen.getByLabelText(label)).toBeTruthy();
    }
    expect(screen.getByText("All changes saved")).toBeTruthy();
  });

  it("reports failing contrast pairs and fixes them in one click", () => {
    setup();
    act(() => screen.getByRole("button", { name: "Colours" }).click());
    type("Muted text", "#A1A1AA");
    const panel = screen.getByRole("region", { name: "Contrast checks" });
    expect(within(panel).getByText(/2 of 7 pairs fail AA/)).toBeTruthy();
    expect(within(panel).getByText("Muted text on Surface").parentElement?.textContent).toContain("2.33:1");
    // The muted field explains the problem.
    expect(field("Muted text").getAttribute("aria-describedby")).toContain("color-muted-contrast");
    expect(screen.getByText(/Unsaved changes/)).toBeTruthy();

    act(() => within(panel).getAllByRole("button", { name: /^Use #[0-9A-F]{6} for Muted text$/ })[0]!.click());
    expect(within(panel).getByText(/All 7 pairs pass AA/)).toBeTruthy();
    expect((field("Muted text") as HTMLInputElement).value).toBe("#6F6F7B");
    expect(screen.getByRole("status").textContent).toBe("Muted text set to #6F6F7B.");
  });

  it("explains when no shade of the text colour can work", () => {
    setup({ ...defaultTokens, colors: { ...defaultTokens.colors, background: "#333333", muted: "#A1A1AA" } });
    expect(screen.getByText(/No shade of Muted text works here\. Change Surface instead\./)).toBeTruthy();
  });

  it("rejects an invalid hex without changing the site, and won't save", () => {
    const { onSave } = setup();
    type("Primary", "blue");
    const input = field("Primary");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByText("Use a hex colour like #4338CA.")).toBeTruthy();
    // The draft keeps the last valid value, so nothing is "unsaved".
    expect(screen.getByText("All changes saved")).toBeTruthy();
    act(() => screen.getByRole("button", { name: "Save" }).click());
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByRole("status").textContent).toBe("Not saved. Fix the field marked in red first.");
  });

  it("saves valid changes", async () => {
    const { onSave } = setup();
    type("Primary", "#0f766e");
    await act(async () => screen.getByRole("button", { name: "Save" }).click());
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ colors: expect.objectContaining({ primary: "#0F766E" }) }));
    expect(screen.getByRole("status").textContent).toBe("Saved to GitHub.");
    expect(screen.getByText("All changes saved")).toBeTruthy();
  });

  it("discards changes after confirming", () => {
    setup();
    type("Primary", "#0F766E");
    window.confirm = vi.fn().mockReturnValueOnce(false).mockReturnValueOnce(true);
    act(() => screen.getByRole("button", { name: "Discard" }).click());
    expect((field("Primary") as HTMLInputElement).value).toBe("#0F766E");
    act(() => screen.getByRole("button", { name: "Discard" }).click());
    expect((field("Primary") as HTMLInputElement).value.toUpperCase()).toBe("#4338CA");
    expect(screen.getByRole("status").textContent).toBe("Changes discarded.");
  });

  it("checks number ranges and warns about spacing that doesn't increase", () => {
    setup();
    type("Corner radius in px", "200");
    expect(screen.getByText("Use a number from 0 to 64 px.")).toBeTruthy();
    type("MD in rem", "0.25");
    expect(screen.getByText(/Each step should be larger than the one before/)).toBeTruthy();
  });

  it("switches fonts from the curated list and shows the font list", () => {
    setup();
    type("Heading font", "stack:transitional");
    expect(screen.getAllByText(/Font list: Charter/)).toHaveLength(1);
  });

  it("previews the Home page with the draft tokens", () => {
    setup();
    type("Primary", "#0F766E");
    const frame = screen.getByTitle("Home page preview") as HTMLIFrameElement;
    const html = frame.getAttribute("srcdoc") ?? "";
    expect(html).toContain("--cr-color-primary: #0F766E;");
    expect(html).toContain(">Hello</h1>");
    expect(frame.getAttribute("sandbox")).toBe("allow-same-origin");
    // Width buttons match the builder's viewports.
    const group = screen.getByRole("group", { name: "Preview width" });
    expect(within(group).getAllByRole("button").map((b) => b.textContent)).toEqual(["Desktop", "Tablet", "Mobile"]);
  });

  it("lets the preview collapse on small screens", () => {
    setup();
    const toggle = screen.getByRole("button", { name: "Hide preview" });
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    act(() => toggle.click());
    expect(screen.getByRole("button", { name: "Show preview" }).getAttribute("aria-expanded")).toBe("false");
  });
});

describe("style library (settings, F072)", () => {
  it("marks no look on a site that doesn't match one", () => {
    setup();
    expect(screen.getAllByRole("button", { pressed: true }).filter((b) => b.classList.contains("st-look"))).toHaveLength(0);
  });

  it("applies a look's colours, fonts and corners, and undoes it in one step", () => {
    setup({ ...defaultTokens, radius: 3 });
    act(() => screen.getByRole("button", { name: /^Clinic/ }).click());
    expect((field("Primary") as HTMLInputElement).value).toBe("#1559D6");
    expect((screen.getByLabelText("Corner radius in px") as HTMLInputElement).value).toBe("12");
    expect(screen.getByRole("button", { name: /^Clinic/ }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("status").textContent).toMatch(/^Clinic, Clear applied/);
    expect(screen.getByText("Unsaved changes")).toBeTruthy();

    act(() => screen.getByRole("button", { name: "Undo style (Clinic Clear)" }).click());
    expect((field("Primary") as HTMLInputElement).value.toUpperCase()).toBe("#4338CA");
    expect((screen.getByLabelText("Corner radius in px") as HTMLInputElement).value).toBe("3");
    expect(screen.queryByRole("button", { name: /Undo style/ })).toBeNull();
    expect(screen.getByRole("status").textContent).toMatch(/^Undid Clinic Clear/);
  });

  it("one Undo goes back past several looks tried in a row", () => {
    setup();
    act(() => screen.getByRole("button", { name: /^Clinic/ }).click());
    act(() => screen.getByRole("button", { name: /^Journal/ }).click());
    act(() => screen.getByRole("button", { name: "Undo style (Journal Newsprint)" }).click());
    expect((field("Primary") as HTMLInputElement).value.toUpperCase()).toBe("#4338CA");
  });
});

describe("saved tokens (settings)", () => {
  it("round-trips through browser storage and ignores invalid data", () => {
    expect(loadSavedTokens(defaultTokens)).toBe(defaultTokens);
    const custom = { ...defaultTokens, radius: 2 };
    expect(saveTokens(custom)).toBe(true);
    expect(loadSavedTokens(defaultTokens)).toEqual(custom);
    localStorage.setItem(TOKENS_KEY, JSON.stringify({ ...defaultTokens, radius: "x" }));
    expect(loadSavedTokens(defaultTokens)).toBe(defaultTokens);
    localStorage.setItem(TOKENS_KEY, "{not json");
    expect(loadSavedTokens(defaultTokens)).toBe(defaultTokens);
  });
});

describe("audit fixes (F072)", () => {
  it("starts the preview collapsed on a phone-width screen", () => {
    vi.stubGlobal("matchMedia", (q: string) => ({ matches: q.includes("599px"), media: q, addEventListener() {}, removeEventListener() {} }));
    try {
      setup();
      expect(screen.getByRole("button", { name: "Show preview" }).getAttribute("aria-expanded")).toBe("false");
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("gives the colourway dots a 44px tall tap area on narrow screens", () => {
    const css = readFileSync(join(__dirname, "settings.css"), "utf8");
    expect(css).toMatch(/@media \(max-width: 899px\) \{ \.st-cw::after \{[^}]*inset: -10px -4px/);
  });
});

// @vitest-environment happy-dom
import { bundledStack, defaultTokens, findBundledFont, fontPairs, pairFonts, type Page, type Site, type SiteTokens } from "@crust/blocks";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { fontWeightNote, SiteSettings } from "./SiteSettings";

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
  document.querySelectorAll("style[data-crust-font-previews]").forEach((s) => s.remove());
});

let latest: SiteTokens = defaultTokens;
function setup(initial: SiteTokens = defaultTokens) {
  latest = initial;
  function Harness() {
    const [draft, setDraft] = useState(initial);
    return (
      <SiteSettings site={site} page={page} saved={initial} draft={draft}
        onChange={(t) => { latest = t; setDraft(t); }} onSave={async () => "Saved."} onDiscard={() => setDraft(initial)} />
    );
  }
  render(<Harness />);
  act(() => {
    fireEvent.click(screen.getByRole("button", { name: "Typography" }));
  });
  return within(document.getElementById("typography")!);
}
const select = (label: string) => screen.getByLabelText(label, { selector: "select" }) as HTMLSelectElement;

describe("fonts picker (F070, direction A)", () => {
  it("shows 12 pairs and System as buttons, each named with its fonts", () => {
    const card = setup();
    const list = card.getByRole("heading", { name: "Font pairs" }).nextElementSibling as HTMLElement;
    const buttons = within(list).getAllByRole("button");
    expect(buttons).toHaveLength(13);
    // The visible name and fonts are the spoken name (WCAG 2.5.3); the samples are hidden from screen readers.
    expect(buttons[0]!.textContent).toContain("Calm rooms");
    expect(within(list).getByRole("button", { name: "Editorial Fraunces and Inter Tight" })).toBe(buttons[0]);
    expect(within(list).getByRole("button", { name: "Studio Geist" })).toBe(buttons[1]);
    // A site on system fonts has System pressed.
    expect(within(list).getAllByRole("button", { pressed: true })).toEqual([
      within(list).getByRole("button", { name: "System Fonts on visitors' devices, nothing to download" }),
    ]);
  });

  it("sets both fonts when a pair is pressed, and says how much it adds", () => {
    const card = setup();
    act(() => {
      fireEvent.click(card.getByRole("button", { name: "Luxury Bodoni Moda and Hanken Grotesk" }));
    });
    expect(latest.fonts).toEqual(pairFonts(fontPairs.find((p) => p.id === "luxury")!));
    expect(card.getByRole("button", { name: /^Luxury/ }).getAttribute("aria-pressed")).toBe("true");
    expect(card.getByText(/^Adds about \d+ KB, downloaded once per visitor/)).toBeTruthy();
    expect(select("Heading font").value).toBe("font:bodoni-moda");
  });

  it("changes one font from the grouped list; System brings back device fonts", () => {
    const card = setup({ ...defaultTokens, fonts: pairFonts(fontPairs[0]!) });
    act(() => {
      fireEvent.change(select("Body font"), { target: { value: "font:dm-sans" } });
    });
    expect(latest.fonts.body).toBe(bundledStack(findBundledFont("dm-sans")!));
    expect(card.queryAllByRole("button", { pressed: true })).toHaveLength(0);
    expect(card.getByText("DM Sans, published with your site (sans serif).")).toBeTruthy();
    act(() => {
      fireEvent.click(card.getByRole("button", { name: /^System / }));
    });
    expect(card.getByText("These fonts are already on your visitors' devices: nothing to download.")).toBeTruthy();
  });

  it("groups the lists, and keeps headings-only fonts out of the body list", () => {
    setup();
    const groups = (s: HTMLSelectElement) => Array.from(s.querySelectorAll("optgroup")).map((g) => g.label);
    expect(groups(select("Heading font"))).toEqual(["Serif", "Sans serif", "Monospace", "On the visitor's device (no download)"]);
    const body = Array.from(select("Body font").options).map((o) => o.value);
    const heading = Array.from(select("Heading font").options).map((o) => o.value);
    expect(heading).toContain("font:bodoni-moda");
    expect(body).not.toContain("font:bodoni-moda");
    expect(body).toContain("font:lora");
    expect(body).toContain("stack:humanist");
  });

  it("loads the preview fonts once, from the app itself", () => {
    setup();
    const styles = document.querySelectorAll("style[data-crust-font-previews]");
    expect(styles).toHaveLength(1);
    expect(styles[0]!.textContent).toContain("url(/fonts/fraunces-latin.woff2)");
  });

  it("words the download note", () => {
    expect(fontWeightNote(defaultTokens.fonts)).toMatch(/nothing to download/);
    expect(fontWeightNote(pairFonts(fontPairs[1]!))).toMatch(/^Adds about \d+ KB/);
  });
});

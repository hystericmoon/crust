// @vitest-environment happy-dom
import { defaultTokens, type Page, type Site, type SiteTokens } from "@crust/blocks";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { SiteSettings } from "./SiteSettings";

const site: Site = { name: "Test", baseUrl: "https://t.dev", language: "en", tokens: defaultTokens };
const page: Page = { path: "/", title: "Home", description: "d", puck: { root: { props: {} }, content: [] } };

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
const pick = (card: ReturnType<typeof setup>, group: string, option: string) =>
  act(() => {
    fireEvent.click(within(card.getByRole("radiogroup", { name: group })).getByRole("radio", { name: option }));
  });

describe("type-styles in Site settings (F071)", () => {
  it("offers Light to Heavy and the new tighter spacings for headings", () => {
    const card = setup();
    const names = (group: string) => within(card.getByRole("radiogroup", { name: group })).getAllByRole("radio").map((r) => r.getAttribute("aria-label") ?? r.textContent);
    expect(names("Heading weight").join(" ")).toMatch(/Light.*Regular.*Medium.*Semibold.*Bold.*Heavy/);
    expect(names("Heading letter spacing").join(" ")).toMatch(/Tightest.*Tighter.*Tight.*Snug.*Normal.*Wide/);
  });

  it("sets the Display weight and spacing; unset, they show the heading's", () => {
    const card = setup({ ...defaultTokens, style: { headingWeight: 600 } });
    const checked = (group: string) => within(card.getByRole("radiogroup", { name: group })).getByRole("radio", { checked: true });
    expect(checked("Display heading weight").textContent).toContain("Semibold");
    pick(card, "Display heading weight", "Light");
    pick(card, "Display heading letter spacing", "Tightest");
    expect(latest.style).toMatchObject({ headingWeight: 600, displayWeight: 300, displayTracking: "tightest" });
  });

  it("picks how small labels look", () => {
    const card = setup();
    pick(card, "Small labels", "Chip");
    expect(latest.style?.labelStyle).toBe("chip");
    expect(card.getByText(/Mono and Chip use Geist Mono/)).toBeTruthy();
  });
});

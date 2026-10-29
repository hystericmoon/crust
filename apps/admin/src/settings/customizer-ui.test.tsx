// @vitest-environment happy-dom
import { applyPreset, defaultTokens, themePresets, type Page, type Site, type SiteTokens } from "@crust/blocks";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { groupForElement, groupOfField, SiteSettings } from "./SiteSettings";

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
  vi.restoreAllMocks();
});

let latest: SiteTokens;
function setup(initial: SiteTokens = defaultTokens) {
  const onSave = vi.fn(async (_t: SiteTokens) => "Saved to GitHub.");
  function Harness() {
    const [draft, setDraft] = useState(initial);
    latest = draft;
    return <SiteSettings site={site} page={page} saved={initial} draft={draft} onChange={setDraft} onSave={onSave} onDiscard={() => setDraft(initial)} />;
  }
  render(<Harness />);
  return { onSave };
}

const openGroup = (name: string) => act(() => fireEvent.click(within(screen.getByRole("navigation", { name: "Style groups" })).getByRole("button", { name: new RegExp(`^${name}`) })));

describe("customizer: one group at a time", () => {
  it("lists the groups and shows only the current one", () => {
    setup();
    const nav = screen.getByRole("navigation", { name: "Style groups" });
    expect(within(nav).getAllByRole("button").map((b) => b.textContent)).toEqual([
      "Presets",
      "Colours",
      "Typography",
      "Buttons",
      "Cards",
      "Links",
      "Section styles",
      "Header & menu",
      "Footer",
      "Spacing",
      "Shape & layout",
    ]);
    expect(within(nav).getByRole("button", { name: "Presets" }).getAttribute("aria-current")).toBe("true");
    openGroup("Buttons");
    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual(["Buttons"]);
    expect(within(nav).getByRole("button", { name: "Buttons" }).getAttribute("aria-current")).toBe("true");
    expect(document.activeElement?.textContent).toBe("Buttons");
  });

  it("knows where each field and each part of the page lives", () => {
    expect(groupOfField("color-muted")).toBe("colours");
    expect(groupOfField("spacing-lg")).toBe("spacing");
    expect(groupOfField("maxWidth")).toBe("shape");
    document.body.innerHTML = `<a class="cr-button"><span id="b">Go</span></a><div class="cr-card"><p id="c">x</p><a class="cr-card-link" id="l">More</a></div><h2 class="cr-heading" id="h">Hi</h2><p id="p">t</p>`;
    expect(groupForElement(document.getElementById("b")!)).toBe("buttons");
    expect(groupForElement(document.getElementById("c")!)).toBe("cards");
    expect(groupForElement(document.getElementById("l")!)).toBe("links");
    expect(groupForElement(document.getElementById("h")!)).toBe("typography");
    expect(groupForElement(document.getElementById("p")!)).toBeNull();
    document.body.innerHTML = "";
  });

  it("a field marked in red in another group opens that group when you save", async () => {
    setup();
    openGroup("Spacing");
    fireEvent.change(screen.getByLabelText("XS in rem"), { target: { value: "99" } });
    openGroup("Buttons");
    expect(screen.getByRole("button", { name: /Spacing \(fix\)/ })).toBeTruthy();
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Save" })));
    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual(["Spacing"]);
    expect(screen.getByRole("status").textContent).toMatch(/Fix the field marked in red/);
  });
});

describe("customizer: the new options", () => {
  it("sets heading sizes, weight and spacing", () => {
    setup();
    openGroup("Typography");
    const sizes = screen.getByRole("radiogroup", { name: "Heading sizes" });
    expect(within(sizes).getByRole("radio", { name: "Balanced" }).getAttribute("aria-checked")).toBe("true");
    act(() => fireEvent.click(within(sizes).getByRole("radio", { name: "Dramatic" })));
    act(() => fireEvent.click(within(screen.getByRole("radiogroup", { name: "Heading weight" })).getByRole("radio", { name: "Heavy" })));
    act(() => fireEvent.click(within(screen.getByRole("radiogroup", { name: "Heading letter spacing" })).getByRole("radio", { name: "Tight" })));
    expect(latest.style).toEqual({ typeScale: "dramatic", headingWeight: 800, headingTracking: "tight" });
  });

  it("arrow keys move between choices", () => {
    setup();
    openGroup("Cards");
    const group = screen.getByRole("radiogroup", { name: "Card style" });
    act(() => fireEvent.keyDown(within(group).getByRole("radio", { name: "Flat" }), { key: "ArrowRight" }));
    expect(latest.style?.cardStyle).toBe("outline");
  });

  it("Main button sets Page and Muted sections together; Primary and Dark keep theirs", () => {
    setup();
    openGroup("Buttons");
    act(() => fireEvent.click(within(screen.getByRole("radiogroup", { name: "Button shape" })).getByRole("radio", { name: "Pill" })));
    act(() => fireEvent.click(within(screen.getByRole("radiogroup", { name: "Main button" })).getByRole("radio", { name: "Soft" })));
    expect(latest.style?.buttonShape).toBe("pill");
    expect(latest.sectionStyles).toMatchObject({ background: { button: "soft" }, surface: { button: "soft" }, primary: { button: "inverse" }, dark: { button: "inverse" } });
  });

  it("says when Page and Muted differ, and keeps the choice reachable by Tab", () => {
    setup({ ...defaultTokens, sectionStyles: { background: { bg: "background", button: "solid" }, surface: { bg: "surface", button: "outline" }, primary: { bg: "primary", button: "inverse" }, dark: { bg: "text", button: "inverse" } } });
    openGroup("Buttons");
    expect(screen.getByText(/use different button looks now/)).toBeTruthy();
    const radios = within(screen.getByRole("radiogroup", { name: "Main button" })).getAllByRole("radio");
    expect(radios.map((r) => r.getAttribute("aria-checked"))).toEqual(["false", "false", "false"]);
    expect(radios.map((r) => r.tabIndex)).toEqual([0, -1, -1]);
  });

  it("links stay underlined: the help says why", () => {
    setup();
    openGroup("Links");
    expect(screen.getByText(/never rely on colour alone/)).toBeTruthy();
    act(() => fireEvent.click(screen.getByRole("radio", { name: "Highlight" })));
    expect(latest.style?.linkStyle).toBe("highlight");
  });
});

describe("customizer: presets", () => {
  it("applies the whole look and one Undo takes it all back", () => {
    setup();
    act(() => fireEvent.click(screen.getByRole("button", { name: /^Studio/ })));
    expect(latest.style?.buttonShape).toBe("pill");
    expect(latest.colors.primary).toBe("#6D28D9");
    expect(screen.getByRole("button", { name: /^Studio/ }).getAttribute("aria-pressed")).toBe("true");
    act(() => fireEvent.click(screen.getByRole("button", { name: "Undo preset (Studio)" })));
    expect(latest.colors).toEqual(defaultTokens.colors);
    expect(latest.style).toBeUndefined();
    expect(latest.sectionStyles).toBeUndefined();
  });

  it("shows all 9 presets", () => {
    setup(applyPreset(defaultTokens, themePresets.at(-1)!));
    const list = screen.getByRole("region", { name: "Presets" });
    expect(within(list).getAllByRole("button").filter((b) => b.hasAttribute("aria-pressed"))).toHaveLength(9);
    expect(within(list).getByRole("button", { name: /^Night/ }).getAttribute("aria-pressed")).toBe("true");
  });
});

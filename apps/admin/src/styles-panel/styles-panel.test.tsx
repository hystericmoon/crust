// @vitest-environment happy-dom
/** F092: the Styles panel and the Site settings sheet: order, nothing lost from Site settings, the dialog's behaviour. */
import { defaultTokens, migrateChrome, type SiteChrome } from "@crust/blocks";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { railPlugins } from "../app-frame/rail";
import { MyLayoutsProvider } from "../layouts/mine";
import { LinkedSectionsProvider } from "../linked/store";
import { SiteStyleContext, type SiteStyle } from "../sections/site-style";
import { groups } from "../settings/SiteSettings";
import { bundledLoader } from "../templates/collect";
import { StylesPanelContext, type StylesPanelState } from "./context";
import { SiteSettingsButton } from "./SiteSettingsSheet";
import { StylesPanel } from "./StylesPanel";

beforeEach(() => void vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 404 }))));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const chrome: SiteChrome = migrateChrome({ name: "Studio" } as never, []);
function setup(over: Partial<StylesPanelState> = {}, style: Partial<SiteStyle> = {}, ui: React.ReactElement = <StylesPanel />) {
  const s: SiteStyle = { tokens: defaultTokens, setTokens: vi.fn(), dirty: false, save: async () => "", discard: vi.fn(), ...style };
  const p: StylesPanelState = {
    site: { name: "Studio <b>Nine</b>", language: "en" },
    chrome,
    onChromeChange: vi.fn(),
    chromeDirty: false,
    pages: [],
    address: "https://example.com",
    onAddressChange: vi.fn(),
    addressDirty: false,
    templateLoader: bundledLoader,
    githubOn: false,
    save: vi.fn(async () => "Site settings saved."),
    discard: vi.fn(),
    ...over,
  };
  render(
    <MyLayoutsProvider githubOn={false}>
      <LinkedSectionsProvider githubOn={false}>
        <SiteStyleContext.Provider value={s}>
          <StylesPanelContext.Provider value={p}>{ui}</StylesPanelContext.Provider>
        </SiteStyleContext.Provider>
      </LinkedSectionsProvider>
    </MyLayoutsProvider>,
  );
  return { s, p };
}
const open = (name: RegExp | string) => fireEvent.click(screen.getByRole("button", { name }));

describe("styles-panel: the panel", () => {
  it("shows Styles cards first, then Fine-tune, then Header & footer", () => {
    setup();
    const heads = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(heads).toEqual(["Styles", "Fine-tune", "Header & footer"]);
    const order = (a: string, b: string) =>
      screen.getByRole("heading", { level: 3, name: a }).compareDocumentPosition(screen.getByRole("heading", { level: 3, name: b })) & Node.DOCUMENT_POSITION_FOLLOWING;
    expect(order("Styles", "Fine-tune")).toBeTruthy();
    expect(order("Fine-tune", "Header & footer")).toBeTruthy();
  });

  it("lists every Fine-tune group and the header and footer, one open at a time", () => {
    setup();
    for (const n of ["Colours", "Type", "Buttons", "Cards", "Links", "Spacing and shape", "Motion", "Section styles", "Header and menu", "Footer"]) {
      expect(screen.getByRole("button", { name: new RegExp(`^${n}`) }).getAttribute("aria-expanded")).toBe("false");
    }
    open(/^Colours/);
    expect(screen.getByRole("button", { name: /^Colours/ }).getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByLabelText("Pick Primary colour")).toBeTruthy();
    open(/^Motion/);
    expect(screen.getByRole("button", { name: /^Colours/ }).getAttribute("aria-expanded")).toBe("false");
    expect(screen.getByRole("radio", { name: "Subtle" })).toBeTruthy();
  });

  it("keeps the old controls: colours edit tokens, spacing and radius are there, header and footer edit the chrome", () => {
    const { s } = setup();
    open(/^Colours/);
    fireEvent.change(document.getElementById("color-primary") as HTMLInputElement, { target: { value: "#112233" } });
    expect(s.setTokens).toHaveBeenCalled();
    open(/^Spacing and shape/);
    expect(document.getElementById("radius")).toBeTruthy();
    expect(document.getElementById("maxWidth")).toBeTruthy();
    expect(document.getElementById("spacing-md")).toBeTruthy();
    open(/^Header and menu/);
    expect(screen.getByText(/Shown at the top of every page/)).toBeTruthy();
    open(/^Footer/);
    expect(screen.getByText(/Shown at the bottom of every page/)).toBeTruthy();
  });

  it("applies a style card and offers Undo", () => {
    const { s } = setup();
    const card = document.querySelectorAll<HTMLElement>(".st-look")[1]!;
    fireEvent.click(card);
    expect(s.setTokens).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: /^Undo style/ })).toBeTruthy();
  });

  it("saves and discards through the screen's own functions; Save is blocked on a bad field", async () => {
    const { p } = setup({}, { dirty: true });
    expect(screen.getByText("Unsaved changes")).toBeTruthy();
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Save" })));
    expect(p.save).toHaveBeenCalledTimes(1);
    window.confirm = vi.fn(() => true);
    fireEvent.click(screen.getByRole("button", { name: "Discard" }));
    expect(p.discard).toHaveBeenCalled();
    open(/^Spacing and shape/);
    fireEvent.change(document.getElementById("radius") as HTMLInputElement, { target: { value: "9999" } });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Save" })));
    expect(p.save).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/Fix the field marked in red/)).toBeTruthy();
  });
});

describe("styles-panel: the Site settings sheet", () => {
  const sheet = () => document.querySelector("dialog") as HTMLDialogElement;

  it("opens as a labelled dialog with every site detail, with headings in order", () => {
    setup({}, {}, <SiteSettingsButton />);
    expect(sheet()).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Site settings" }));
    const d = within(sheet());
    expect(sheet().getAttribute("aria-labelledby")).toBe(d.getByRole("heading", { level: 2, name: "Site settings" }).id);
    const mine = ["Site address", "Search defaults", "Where to publish", "Theme pack", "Save as template"];
    expect(d.getAllByRole("heading", { level: 3 }).map((h) => h.textContent).filter((t) => mine.includes(t!))).toEqual(["Site address", "Search defaults", "Where to publish", "Theme pack", "Save as template"]);
    expect(d.getByLabelText("Domain")).toBeTruthy();
    expect(d.getByRole("link", { name: "Open Publish" }).getAttribute("href")).toBe("#/?focus=publish");
  });

  it("escapes the site name instead of reading it as markup", () => {
    setup({}, {}, <SiteSettingsButton />);
    fireEvent.click(screen.getByRole("button", { name: "Site settings" }));
    expect(sheet().querySelector("b")).toBeNull();
    expect(sheet().textContent).toContain("Studio <b>Nine</b>");
  });

  it("closes with Escape and with Close, and focus returns to the button", () => {
    setup({}, {}, <SiteSettingsButton />);
    const button = screen.getByRole("button", { name: "Site settings" });
    button.focus();
    fireEvent.click(button);
    fireEvent(sheet(), new Event("cancel", { cancelable: true }));
    expect(sheet()).toBeNull();
    vi.useFakeTimers();
    fireEvent.click(button);
    fireEvent.click(within(sheet()).getByRole("button", { name: "Close" }));
    expect(sheet()).toBeNull();
    act(() => void vi.runAllTimers());
    vi.useRealTimers();
    expect(document.activeElement).toBe(button);
  });

  it("changes the address through the screen's own state", () => {
    const { p } = setup({}, {}, <SiteSettingsButton />);
    fireEvent.click(screen.getByRole("button", { name: "Site settings" }));
    fireEvent.change(within(sheet()).getByLabelText("Domain"), { target: { value: "studio.com" } });
    expect(p.onAddressChange).toHaveBeenCalledWith("https://studio.com");
  });
});

describe("styles-panel: nothing from Site settings is lost", () => {
  it("every old group is in the panel or the sheet", () => {
    const inPanel = ["presets", "colours", "typography", "buttons", "cards", "links", "motion", "section-styles", "header", "footer", "spacing", "shape"];
    const inSheet = ["theme-pack", "template", "address"];
    expect(groups.map((g) => g.id).sort()).toEqual([...inPanel, ...inSheet].sort());
  });

  it("the left bar's Styles icon shows the panel, and the Site icon the sheet button", () => {
    const plugins = railPlugins({ pages: () => [], hrefFor: () => "#", stylesPanel: () => <p>STYLES</p>, siteSettings: () => <p>SHEET</p> });
    render(<>{plugins.find((p) => p.name === "styles")!.render!()}{plugins.find((p) => p.name === "site")!.render!()}</>);
    expect(screen.getByText("STYLES")).toBeTruthy();
    expect(screen.getByText("SHEET")).toBeTruthy();
    expect(screen.queryByText("Open styles")).toBeNull();
  });

  it("uses only app tokens for colour", () => {
    const css = readFileSync("apps/admin/src/styles-panel/styles-panel.css", "utf8");
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(/);
  });
});

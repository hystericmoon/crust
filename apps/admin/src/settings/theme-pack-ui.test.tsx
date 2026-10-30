// @vitest-environment happy-dom
import { defaultTokens, makeThemePack, migrateChrome, type Page, type Site, type SiteChrome, type SiteTokens } from "@crust/blocks";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { MyLayoutsProvider, readLocalLayouts } from "../layouts/mine";
import { SiteSettings } from "./SiteSettings";

const site: Site = { name: "Haho", baseUrl: "https://t.dev", language: "en", tokens: defaultTokens };
const page: Page = {
  path: "/",
  title: "Home",
  description: "d",
  puck: { root: { props: {} }, content: [{ type: "Heading", props: { id: "h", text: "Hello", level: "h1", align: "left" } }] },
};
const pages = [{ path: "/", title: "Home" }];

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

function setup() {
  const chrome0 = migrateChrome(site, pages);
  let latest: { tokens: SiteTokens; chrome: SiteChrome } = { tokens: defaultTokens, chrome: chrome0 };
  function Harness() {
    const [draft, setDraft] = useState(defaultTokens);
    const [chrome, setChrome] = useState(chrome0);
    latest = { tokens: draft, chrome };
    return (
      <MyLayoutsProvider githubOn={false}>
        <SiteSettings
          site={site}
          page={page}
          saved={defaultTokens}
          draft={draft}
          onChange={setDraft}
          onSave={async () => "Saved."}
          onDiscard={() => undefined}
          chrome={chrome}
          onChromeChange={setChrome}
          chromeDirty={JSON.stringify(chrome) !== JSON.stringify(chrome0)}
          pages={pages}
        />
      </MyLayoutsProvider>
    );
  }
  render(<Harness />);
  act(() => fireEvent.click(within(screen.getByRole("navigation", { name: "Style groups" })).getByRole("button", { name: "Theme pack" })));
  return () => latest;
}

const previewHtml = () => (screen.getByTitle("Home page preview") as HTMLIFrameElement).getAttribute("srcdoc") ?? "";

async function choose(content: string) {
  const input = screen.getByLabelText("Choose a .crust file") as HTMLInputElement;
  const file = new File([content], "look.crust", { type: "application/json" });
  await act(async () => {
    fireEvent.change(input, { target: { files: [file] } });
    await new Promise((r) => setTimeout(r, 0));
  });
}

const otherLook = { ...defaultTokens, colors: { ...defaultTokens.colors, primary: "#0F766E" } };
const goodPack = () =>
  JSON.stringify(
    makeThemePack(
      "Forest look",
      { tokens: true, chrome: true, layouts: true },
      {
        tokens: otherLook,
        chrome: { header: { style: "dark", sticky: true }, footer: { style: "dark" } },
        layouts: [{ name: "FAQ", kind: "section", content: [{ type: "Accordion", props: { id: "a", items: [{ question: "Q?", answer: "A." }], firstOpen: "no", oneAtATime: "no" } }] }],
      },
    ),
  );

describe("theme pack: Site settings", () => {
  it("downloads this site's look as a .crust file", () => {
    setup();
    const blobs: Blob[] = [];
    URL.createObjectURL = vi.fn((b: Blob) => {
      blobs.push(b);
      return "blob:x";
    }) as typeof URL.createObjectURL;
    URL.revokeObjectURL = vi.fn();
    const clicked = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    act(() => fireEvent.change(screen.getByLabelText("Theme name"), { target: { value: "Haho Studio" } }));
    act(() => fireEvent.click(screen.getByRole("button", { name: "Download theme pack" })));
    expect(clicked).toHaveBeenCalled();
    expect(blobs).toHaveLength(1);
    expect(screen.getByText(/Downloaded haho-studio\.crust/)).toBeTruthy();
    // "My layouts" can't be ticked with none saved.
    expect((screen.getByLabelText("My layouts (none saved yet)") as HTMLInputElement).disabled).toBe(true);
  });

  it("refuses a bad file, says why, and changes nothing", async () => {
    const latest = setup();
    await choose(JSON.stringify({ ...JSON.parse(goodPack()), version: 9 }));
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("Nothing was changed. This file can't be used:");
    expect(alert.textContent).toContain("newer Crust");
    expect(latest().tokens).toBe(defaultTokens);
    expect(screen.queryByRole("button", { name: "Use this theme" })).toBeNull();
  });

  it("leaves out a style that's hard to read, and offers the rest", async () => {
    const latest = setup();
    const pale = JSON.parse(goodPack());
    pale.tokens.colors.text = "#dddddd";
    await choose(JSON.stringify(pale));
    expect(screen.getByRole("alert").textContent).toContain("The style was left out because it's hard to read:");
    const card = screen.getByRole("region", { name: "Previewing “Forest look”" });
    expect(within(card).queryByLabelText(/^Style:/)).toBeNull();
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Use this theme" })));
    expect(latest().tokens).toBe(defaultTokens);
    expect(readLocalLayouts().map((l) => l.name)).toEqual(["FAQ"]);
  });

  it("previews a good pack first, and Cancel leaves everything as it was", async () => {
    const latest = setup();
    await choose(goodPack());
    expect(screen.getByRole("heading", { name: "Previewing “Forest look”" })).toBeTruthy();
    expect(screen.getByRole("list", { name: "Its colours" }).textContent).toContain("Primary #0F766E");
    expect(previewHtml()).toContain("--cr-color-primary: #0F766E;");
    expect(previewHtml()).toContain("cr-site-header cr-style-dark cr-sticky");
    expect(latest().tokens).toBe(defaultTokens);
    act(() => fireEvent.click(screen.getByRole("button", { name: "Cancel" })));
    expect(previewHtml()).toContain("--cr-color-primary: #4338ca;");
    expect(screen.getByText("“Forest look” wasn't used. Nothing changed.")).toBeTruthy();
  });

  it("only previews while its group is open", async () => {
    setup();
    await choose(goodPack());
    act(() => fireEvent.click(within(screen.getByRole("navigation", { name: "Style groups" })).getByRole("button", { name: "Colours" })));
    expect(previewHtml()).toContain("--cr-color-primary: #4338ca;");
  });

  it("uses the ticked parts: style and header look into the draft (unsaved), layouts into My layouts", async () => {
    const latest = setup();
    await choose(goodPack());
    act(() => fireEvent.click(screen.getByLabelText(/^Header and footer look: Dark header/)));
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Use this theme" })));
    expect(latest().tokens.colors.primary).toBe("#0F766E");
    expect(latest().chrome.header.style).toBe("background");
    expect(screen.getByText("Unsaved changes")).toBeTruthy();
    expect(readLocalLayouts().map((l) => l.name)).toEqual(["FAQ"]);
    expect(screen.getByText(/Used “Forest look”\. The style is in place: Save to keep it, or Discard to undo it\. Added 1 layout to My layouts\./)).toBeTruthy();
  });

  it("adds layouts beside yours without replacing them", async () => {
    setup();
    await choose(goodPack());
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Use this theme" })));
    await choose(goodPack());
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Use this theme" })));
    expect(readLocalLayouts().map((l) => l.name).sort()).toEqual(["FAQ", "FAQ (2)"]);
  });
});

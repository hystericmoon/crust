// @vitest-environment happy-dom
import { defaultTokens, migrateChrome, type MenuLink, type Page, type Site, type SiteChrome, type SiteTokens } from "@crust/blocks";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { CHROME_KEY, loadSavedChrome, saveChrome, siteToSave } from "../chrome-store";
import { LinkListEditor } from "./ChromeGroups";
import { SiteSettings } from "./SiteSettings";

const pages = [
  { path: "/", title: "Welcome" },
  { path: "/about", title: "About" },
  { path: "/work", title: "Work" },
];
const site: Site = { name: "Haho", baseUrl: "https://t.dev", language: "en", tokens: defaultTokens };
const page: Page = { path: "/", title: "Home", description: "d", puck: { root: { props: {} }, content: [] } };

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  globalThis.requestAnimationFrame ??= ((cb: FrameRequestCallback) => setTimeout(() => cb(0), 0)) as unknown as typeof requestAnimationFrame;
});
afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
});

function editor(initial: MenuLink[]) {
  let latest = initial;
  function Harness() {
    const [links, setLinks] = useState(initial);
    latest = links;
    return <LinkListEditor name="Menu" links={links} onChange={setLinks} max={3} pages={pages} />;
  }
  render(<Harness />);
  return () => latest;
}

describe("header menu editor (keyboard alternative to dragging)", () => {
  const start = [
    { label: "Home", href: "/" },
    { label: "About", href: "/about" },
  ];

  it("moves links up and down with buttons and announces it", () => {
    const links = editor(start);
    expect((screen.getByRole("button", { name: "Move Home up" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "Move About down" }) as HTMLButtonElement).disabled).toBe(true);
    act(() => fireEvent.click(screen.getByRole("button", { name: "Move About up" })));
    expect(links().map((l) => l.label)).toEqual(["About", "Home"]);
    expect(screen.getByRole("status").textContent).toBe("About moved to position 1 of 2.");
  });

  it("edits a link's label and address through labelled fields", () => {
    const links = editor(start);
    act(() => fireEvent.change(screen.getByLabelText("Menu link 2: label"), { target: { value: "Studio" } }));
    act(() => fireEvent.change(screen.getByLabelText("Menu link 2: address"), { target: { value: "/studio" } }));
    expect(links()[1]).toEqual({ label: "Studio", href: "/studio" });
  });

  it("adds a page not in the list yet, adds a blank link, and stops at the limit", () => {
    const links = editor(start);
    const pick = screen.getByLabelText("Page to add to Menu") as HTMLSelectElement;
    expect([...pick.options].map((o) => o.value)).toEqual(["", "/work"]);
    act(() => fireEvent.change(pick, { target: { value: "/work" } }));
    act(() => fireEvent.click(screen.getByRole("button", { name: "Add page" })));
    expect(links()[2]).toEqual({ label: "Work", href: "/work" });
    expect((screen.getByRole("button", { name: "Add a link" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText("That's the most this list can hold (3).")).toBeTruthy();
  });

  it("removes a link", () => {
    const links = editor(start);
    act(() => fireEvent.click(screen.getByRole("button", { name: "Remove Home" })));
    expect(links()).toEqual([{ label: "About", href: "/about" }]);
    expect(screen.getByRole("status").textContent).toBe("Home removed.");
  });
});

function settings() {
  const chrome0 = migrateChrome(site, pages);
  const onSave = vi.fn(async (_t: SiteTokens) => "Saved to GitHub.");
  let latest: SiteChrome = chrome0;
  function Harness() {
    const [draft, setDraft] = useState(defaultTokens);
    const [chrome, setChrome] = useState(chrome0);
    latest = chrome;
    return (
      <SiteSettings
        site={site}
        page={page}
        saved={defaultTokens}
        draft={draft}
        onChange={setDraft}
        onSave={onSave}
        onDiscard={() => setChrome(chrome0)}
        chrome={chrome}
        onChromeChange={setChrome}
        chromeDirty={JSON.stringify(chrome) !== JSON.stringify(chrome0)}
        pages={pages}
      />
    );
  }
  render(<Harness />);
  return { onSave, chrome: () => latest };
}
const openGroup = (name: string) =>
  act(() => fireEvent.click(within(screen.getByRole("navigation", { name: "Style groups" })).getByRole("button", { name: new RegExp(`^${name}`) })));

describe("Site settings: Header & menu and Footer", () => {
  it("edits the header, counts as unsaved, and saves", async () => {
    const { onSave, chrome } = settings();
    openGroup("Header & menu");
    expect(screen.getByRole("heading", { level: 2, name: "Header & menu" })).toBeTruthy();
    act(() => fireEvent.click(screen.getByLabelText("Keep the header at the top while scrolling")));
    expect(chrome().header.sticky).toBe(true);
    expect(screen.getByText("Unsaved changes")).toBeTruthy();
    // The style tiles are a named radio group, not "Section style".
    act(() => fireEvent.click(within(screen.getByRole("radiogroup", { name: "Header style" })).getByRole("radio", { name: /Dark/ })));
    expect(chrome().header.style).toBe("dark");
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Save" })));
    expect(onSave).toHaveBeenCalled();
  });

  it("won't save a logo image without a description, and marks the group to fix", async () => {
    const { onSave } = settings();
    openGroup("Header & menu");
    act(() => fireEvent.change(screen.getByLabelText("Web address for logo image (optional)"), { target: { value: "/logo.svg" } }));
    expect(within(screen.getByRole("navigation", { name: "Style groups" })).getByRole("button", { name: /^Header & menu \(fix\)/ })).toBeTruthy();
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Save" })));
    expect(onSave).not.toHaveBeenCalled();
    expect(document.querySelector(".st-status")!.textContent).toContain("the logo image needs a description");
    act(() => fireEvent.change(screen.getByLabelText("Logo description"), { target: { value: "Haho" } }));
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Save" })));
    expect(onSave).toHaveBeenCalled();
  });

  it("adds a footer column and edits the copyright line", () => {
    const { chrome } = settings();
    openGroup("Footer");
    act(() => fireEvent.click(screen.getByRole("button", { name: "Add a column of links" })));
    act(() => fireEvent.change(screen.getByLabelText("Column title"), { target: { value: "Studio" } }));
    act(() => fireEvent.change(screen.getByLabelText("Copyright line"), { target: { value: "© {year} Haho Studio" } }));
    expect(chrome().footer.columns).toEqual([{ title: "Studio", links: [] }]);
    expect(chrome().footer.copyright).toBe("© {year} Haho Studio");
  });
});

describe("saving header and footer", () => {
  it("puts edited ones in site.json next to the tokens", () => {
    const defaults = migrateChrome(site, pages);
    const chrome = { ...defaults, header: { ...defaults.header, sticky: true } };
    const saved = siteToSave(site, defaultTokens, chrome, defaults);
    expect(saved.header).toEqual(chrome.header);
    expect(saved.name).toBe("Haho");
    // The footer is still at its defaults: left out, like before.
    expect("footer" in saved).toBe(false);
  });

  it("leaves untouched defaults out, so the menu keeps following the pages", () => {
    const defaults = migrateChrome(site, pages);
    const saved = siteToSave(site, defaultTokens, defaults, defaults);
    expect("header" in saved).toBe(false);
    expect("footer" in saved).toBe(false);
    // Once saved, a header stays saved even if it matches the defaults again.
    expect(siteToSave({ ...site, header: defaults.header }, defaultTokens, defaults, defaults).header).toEqual(defaults.header);
  });

  it("keeps a browser copy, and ignores a damaged one", () => {
    const fallback = migrateChrome(site, pages);
    const sticky = { ...fallback, header: { ...fallback.header, sticky: true } };
    expect(saveChrome(sticky)).toBe(true);
    expect(loadSavedChrome(fallback).header.sticky).toBe(true);
    localStorage.setItem(CHROME_KEY, JSON.stringify({ ...sticky, header: { ...sticky.header, menu: [{ label: "", href: "" }] } }));
    expect(loadSavedChrome(fallback)).toBe(fallback);
  });
});

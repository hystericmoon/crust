// @vitest-environment happy-dom
import { defaultTokens, migrateChrome, type Page, type Site, type SiteTokens } from "@crust/blocks";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { ADDRESS_KEY, loadSavedAddress, saveAddress, siteToSave } from "../chrome-store";
import { PublishPanel } from "../publish/PublishPanel";
import { addressNote } from "../publish/live-url";
import { SiteSettings } from "./SiteSettings";

const site: Site = { name: "Test", baseUrl: "https://example.pages.dev", language: "en", tokens: defaultTokens };
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
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

let address = "";
function setup(saved = site.baseUrl) {
  const onSave = vi.fn(async (_t: SiteTokens) => "Saved to GitHub.");
  function Harness() {
    const [draft, setDraft] = useState(saved);
    address = draft;
    return (
      <SiteSettings
        site={site}
        page={page}
        saved={defaultTokens}
        draft={defaultTokens}
        onChange={() => undefined}
        onSave={onSave}
        onDiscard={() => setDraft(saved)}
        address={draft}
        onAddressChange={setDraft}
        addressDirty={draft !== saved}
      />
    );
  }
  render(<Harness />);
  act(() => fireEvent.click(within(screen.getByRole("navigation", { name: "Style groups" })).getByRole("button", { name: /^Site address/ })));
  return { onSave, field: () => screen.getByLabelText("Domain") as HTMLInputElement };
}

describe("custom domain: Site settings → Site address (F044)", () => {
  it("starts empty while the site uses its free address", () => {
    const { field } = setup();
    expect(screen.getByRole("heading", { level: 2, name: "Site address" })).toBeTruthy();
    expect(field().value).toBe("");
    expect(screen.getByText(/stays at its free .pages.dev address/)).toBeTruthy();
    expect(screen.getByRole("link", { name: /custom domain guide/ }).getAttribute("href")).toContain("docs/setup-custom-domain.md");
    expect(screen.getByText("All changes saved")).toBeTruthy();
  });

  it("turns what's typed into the site's address and shows an example page", () => {
    const { field } = setup();
    act(() => fireEvent.change(field(), { target: { value: "https://Studio.com/" } }));
    expect(address).toBe("https://studio.com");
    expect(screen.getByText("https://studio.com/about")).toBeTruthy();
    expect(screen.getByText("Unsaved changes")).toBeTruthy();
    act(() => fireEvent.blur(field()));
    expect(field().value).toBe("studio.com");
  });

  it("explains a mistake and won't save until it's fixed", async () => {
    const { field, onSave } = setup();
    act(() => fireEvent.change(field(), { target: { value: "studio.com/about" } }));
    expect(field().getAttribute("aria-invalid")).toBe("true");
    expect(field().getAttribute("aria-describedby")).toContain("site-address-error");
    expect(screen.getByText(/without a page address after it/)).toBeTruthy();
    expect(within(screen.getByRole("navigation", { name: "Style groups" })).getByRole("button", { name: "Site address (fix)" })).toBeTruthy();
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Save" })));
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText(/Not saved. Fix the field marked in red first./)).toBeTruthy();
  });

  it("clearing the field goes back to the free address; Discard restores the saved one", () => {
    const { field } = setup("https://studio.com");
    expect(field().value).toBe("studio.com");
    act(() => fireEvent.change(field(), { target: { value: "" } }));
    expect(address).toBe("https://example.pages.dev");
    window.confirm = vi.fn(() => true);
    act(() => fireEvent.click(screen.getByRole("button", { name: "Discard" })));
    expect(field().value).toBe("studio.com");
  });

  it("is saved into site.json and remembered in this browser", () => {
    const chrome = migrateChrome(site, []);
    expect(siteToSave(site, defaultTokens, chrome, chrome, "https://studio.com").baseUrl).toBe("https://studio.com");
    expect(siteToSave(site, defaultTokens, chrome, chrome).baseUrl).toBe("https://example.pages.dev");
    expect(loadSavedAddress(site.baseUrl)).toBe(site.baseUrl);
    saveAddress("https://studio.com");
    expect(loadSavedAddress(site.baseUrl)).toBe("https://studio.com");
    localStorage.setItem(ADDRESS_KEY, "javascript:alert(1)");
    expect(loadSavedAddress(site.baseUrl)).toBe(site.baseUrl);
  });
});

describe("custom domain: Publish panel (F044)", () => {
  it("says nothing when the site is live at its own address, or none is set", () => {
    expect(addressNote("https://studio.com", "https://studio.com", null)).toBeNull();
    expect(addressNote("https://crust-site.pages.dev", "https://example.pages.dev", null)).toBeNull();
    expect(addressNote(null, "https://studio.com", null)).toBeNull();
  });

  it("says a new address takes effect at the next publish", () => {
    expect(addressNote("https://crust-site.pages.dev", "https://studio.com", null)).toBe("Your site's address is set to studio.com. Publish to start using it.");
  });

  it("says when the domain isn't connected yet, and what to do", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ ok: true, runs: [], liveUrl: "https://crust-site.pages.dev", notConnected: "studio.com" }), {
            headers: { "Content-Type": "application/json" },
          }),
      ),
    );
    render(<PublishPanel githubOn siteUrl="https://studio.com" />);
    await act(async () => {});
    expect(screen.getByRole("link", { name: /Open live site/ }).getAttribute("href")).toBe("https://crust-site.pages.dev");
    expect(screen.getByText(/studio.com isn't connected to your site yet, so the last publish used crust-site.pages.dev/)).toBeTruthy();
  });
});

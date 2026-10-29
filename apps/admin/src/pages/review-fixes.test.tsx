// @vitest-environment happy-dom
// Fixes from the Impeccable review of the Pages screen (2026-10-29).
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PendingChanges } from "../api-client";
import { PublishPanel } from "../publish/PublishPanel";
import { PageList } from "./PageList";
import type { PageRow } from "./store";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const rows: PageRow[] = [
  { path: "/", title: "Home", lastEdited: null, localChanges: false, inRepo: true },
  { path: "/about", title: "About", lastEdited: null, localChanges: false, inRepo: true },
];
const changes = (over: Partial<PendingChanges> = {}): PendingChanges => ({
  lastPublish: { at: "2026-10-28T09:00:00Z", url: "#" },
  pages: [],
  removed: [],
  moved: [],
  site: false,
  redirects: false,
  ...over,
});
const noRuns = () =>
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ ok: true, runs: [], liveUrl: null }), { headers: { "Content-Type": "application/json" } })));

describe("review fixes: Publish button", () => {
  it("says how many changes it will publish", async () => {
    noRuns();
    render(<PublishPanel githubOn siteUrl="https://example.pages.dev" changes={changes({ pages: [{ path: "/about", change: "edited" }], site: true })} />);
    await act(async () => {});
    const button = screen.getByRole("button", { name: "Publish 2 changes" });
    expect(button.className).toContain("st-button-primary");
  });

  it("steps back to a secondary Publish again when everything is live", async () => {
    noRuns();
    render(<PublishPanel githubOn siteUrl="https://example.pages.dev" changes={changes()} />);
    await act(async () => {});
    expect(screen.getByRole("button", { name: "Publish again" }).className).not.toContain("st-button-primary");
  });

  it("shows the first six waiting changes, then all on request", async () => {
    noRuns();
    const pages = Array.from({ length: 9 }, (_, i) => ({ path: `/p${i}`, change: "new" as const }));
    render(<PublishPanel githubOn siteUrl="https://example.pages.dev" changes={changes({ pages })} />);
    await act(async () => {});
    expect(screen.getAllByRole("listitem")).toHaveLength(6);
    const more = screen.getByRole("button", { name: "Show all 9" });
    expect(more.getAttribute("aria-expanded")).toBe("false");
    act(() => more.click());
    expect(screen.getAllByRole("listitem")).toHaveLength(9);
    expect(screen.getByRole("button", { name: "Show fewer" }).getAttribute("aria-expanded")).toBe("true");
  });
});

describe("review fixes: page list", () => {
  it("keeps what was typed in New page when the form is closed and opened again", () => {
    render(<PageList siteName="Demo" rows={rows} sourceNote="" onCreate={() => {}} />);
    const toggle = screen.getByRole("button", { name: "New page" });
    act(() => toggle.click());
    act(() => {
      fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Contact us" } });
    });
    act(() => toggle.click());
    act(() => toggle.click());
    expect((screen.getByLabelText("Title") as HTMLInputElement).value).toBe("Contact us");
  });

  it("returns focus to New page after Cancel", () => {
    render(<PageList siteName="Demo" rows={rows} sourceNote="" onCreate={() => {}} />);
    const toggle = screen.getByRole("button", { name: "New page" });
    act(() => toggle.click());
    act(() => screen.getByRole("button", { name: "Cancel" }).click());
    expect(document.activeElement).toBe(toggle);
  });

  it("offers Try again when the list couldn't load", () => {
    const onRetry = vi.fn();
    render(<PageList siteName="Demo" rows={rows} sourceNote="" loadError="Couldn't load your pages from GitHub." onRetry={onRetry} onCreate={() => {}} />);
    act(() => screen.getByRole("button", { name: "Try again" }).click());
    expect(onRetry).toHaveBeenCalled();
  });

  it("explains why Home has no Rename or Delete", () => {
    render(<PageList siteName="Demo" rows={rows} sourceNote="" githubOn onCreate={() => {}} onRename={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText("Always at /")).toBeTruthy();
  });

  it("puts the Publish panel before the page list", () => {
    render(
      <PageList siteName="Demo" rows={rows} sourceNote="" onCreate={() => {}}>
        <section aria-label="Publish panel" />
      </PageList>,
    );
    const publish = screen.getByRole("region", { name: "Publish panel" });
    const pages = screen.getByRole("heading", { name: "Pages" });
    expect(publish.compareDocumentPosition(pages) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});

// @vitest-environment happy-dom
import { act, cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PendingChanges } from "../api-client";
import { PageList } from "../pages/PageList";
import type { PageRow } from "../pages/store";
import { describeChanges, markUnpublished } from "./changes";
import { PublishPanel } from "./PublishPanel";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const row = (over: Partial<PageRow>): PageRow => ({ path: "/about", title: "About", lastEdited: null, localChanges: false, inRepo: true, ...over });
const changes = (over: Partial<PendingChanges> = {}): PendingChanges => ({
  lastPublish: { at: "2026-10-28T09:00:00Z", url: "https://gh/run/5" },
  pages: [],
  removed: [],
  moved: [],
  site: false,
  redirects: false,
  ...over,
});

describe("changes: marking pages", () => {
  it("marks new and edited pages that are on GitHub", () => {
    const rows = [row({ path: "/", title: "Home" }), row({}), row({ path: "/draft", inRepo: false })];
    const marked = markUnpublished(
      rows,
      changes({
        pages: [
          { path: "/about", change: "edited" },
          { path: "/draft", change: "new" },
        ],
      }),
    );
    expect(marked.map((r) => r.unpublished)).toEqual([undefined, "edited", undefined]);
    expect(markUnpublished(rows, null)).toBe(rows);
  });

  it("shows the marks as text in the list", () => {
    render(
      <PageList
        siteName="Demo"
        rows={[row({ unpublished: "edited" }), row({ path: "/contact", title: "Contact", unpublished: "new" })]}
        sourceNote=""
        githubOn
        liveKnown
        onCreate={() => {}}
      />,
    );
    const item = (path: string) => Array.from(document.querySelectorAll(".pp-item[data-item]")).find((i) => i.getAttribute("data-item") === path)!;
    expect(item("/about").textContent).toContain("Edits not live yet");
    expect(item("/contact").textContent).toContain("Saved, not live yet");
  });
});

describe("changes: what the next publish does", () => {
  const titles = new Map([["/about", "About"]]);

  it("lists each change in plain words", () => {
    expect(
      describeChanges(
        changes({ pages: [{ path: "/about", change: "edited" }, { path: "/contact", change: "new" }], removed: ["/old"], site: true, redirects: true }),
        titles,
      ),
    ).toEqual({
      summary: "5 changes waiting to go live:",
      items: ["About (/about): edited", "/contact: new page", "/old: removed", "Site settings", "Redirects from old page addresses"],
    });
    expect(describeChanges(changes({ site: true }), titles).summary).toBe("1 change waiting to go live:");
    // A rename reads as a move, and its redirect needs no line of its own.
    expect(describeChanges(changes({ moved: [{ from: "/team", to: "/about" }], redirects: true }), titles).items).toEqual(["/team: moved to /about"]);
  });

  it("says when everything is live, or nothing ever was", () => {
    expect(describeChanges(changes(), titles)).toEqual({ summary: "Everything saved to GitHub is live.", items: [] });
    expect(describeChanges(changes({ lastPublish: null, site: true }), titles).summary).toBe(
      "The site hasn't been published yet, so publishing puts every saved page live.",
    );
  });
});

describe("changes: Publish panel", () => {
  const json = (body: unknown) => new Response(JSON.stringify(body), { headers: { "Content-Type": "application/json" } });
  const run = (status: string, conclusion: string | null) => ({ id: 9, status, conclusion, createdAt: "2026-10-28T10:00:00Z", url: "https://gh/run/9" });

  it("shows what's waiting above the Publish button", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json({ ok: true, runs: [] })));
    render(<PublishPanel githubOn siteUrl="https://site.dev" changes={changes({ pages: [{ path: "/about", change: "edited" }] })} titles={new Map([["/about", "About"]])} />);
    await act(async () => {});
    expect(screen.getByText("1 change waiting to go live:")).toBeTruthy();
    expect(screen.getByRole("listitem").textContent).toBe("About (/about): edited");
  });

  it("asks for a fresh list once a publish it watched finishes", async () => {
    let runs = [run("in_progress", null)];
    vi.stubGlobal("fetch", vi.fn(async () => json({ ok: true, runs })));
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const onFinished = vi.fn();
    render(<PublishPanel githubOn siteUrl="https://site.dev" changes={changes()} onFinished={onFinished} />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });
    expect(onFinished).not.toHaveBeenCalled();
    runs = [run("completed", "success")];
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    expect(onFinished).toHaveBeenCalledTimes(1);
  });
});

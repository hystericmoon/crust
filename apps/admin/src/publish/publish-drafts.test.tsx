// @vitest-environment happy-dom
import { act, cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PendingChanges } from "../api-client";
import { PublishPanel } from "./PublishPanel";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const changes: PendingChanges = { lastPublish: { at: "2026-10-28T09:00:00Z", url: "#" }, pages: [{ path: "/about", change: "edited" }], removed: [], moved: [], site: false, redirects: false };
const drafts = [
  { path: "/", title: "Home" },
  { path: "/team", title: "Team" },
];

function stubApi() {
  const posts: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      if (init?.method === "POST") posts.push(url);
      return new Response(JSON.stringify({ ok: true, runs: [], liveUrl: null }), { headers: { "Content-Type": "application/json" } });
    }),
  );
  return posts;
}

describe("publish-drafts: browser drafts and Publish", () => {
  it("lists drafts as waiting changes and counts them", async () => {
    stubApi();
    render(<PublishPanel githubOn siteUrl="https://example.pages.dev" changes={changes} titles={new Map([["/about", "About"]])} drafts={drafts} onSaveDrafts={vi.fn()} />);
    await act(async () => {});
    expect(screen.getByText("3 changes waiting to go live:")).toBeTruthy();
    expect(screen.getAllByRole("listitem")[0]!.textContent).toBe("Home (/): changes in this browser, saved when you publish");
    expect(screen.getByRole("button", { name: "Publish 3 changes" })).toBeTruthy();
  });

  it("asks first, then saves and publishes", async () => {
    const posts = stubApi();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const onSaveDrafts = vi.fn(async () => null);
    render(<PublishPanel githubOn siteUrl="https://example.pages.dev" changes={changes} drafts={drafts} onSaveDrafts={onSaveDrafts} />);
    await act(async () => {});
    await act(async () => screen.getByRole("button", { name: "Publish 3 changes" }).click());
    const dialog = screen.getByRole("dialog", { name: "Save 2 pages first?" });
    expect(dialog.textContent).toContain("changes only in this browser: Home, Team.");
    expect(document.activeElement).toBe(within(dialog).getByRole("button", { name: "Save and publish" }));
    expect(posts).toEqual([]);
    await act(async () => within(dialog).getByRole("button", { name: "Save and publish" }).click());
    await act(async () => {});
    expect(onSaveDrafts).toHaveBeenCalledTimes(1);
    expect(posts).toEqual(["/api/publish"]);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("can publish without the drafts, or cancel", async () => {
    const posts = stubApi();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const onSaveDrafts = vi.fn(async () => null);
    render(<PublishPanel githubOn siteUrl="https://example.pages.dev" changes={changes} drafts={drafts.slice(0, 1)} onSaveDrafts={onSaveDrafts} />);
    await act(async () => {});
    await act(async () => screen.getByRole("button", { name: "Publish 2 changes" }).click());
    await act(async () => within(screen.getByRole("dialog")).getByRole("button", { name: "Cancel" }).click());
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(posts).toEqual([]);
    await act(async () => screen.getByRole("button", { name: "Publish 2 changes" }).click());
    await act(async () => within(screen.getByRole("dialog", { name: "Save 1 page first?" })).getByRole("button", { name: "Publish without it" }).click());
    await act(async () => {});
    expect(onSaveDrafts).not.toHaveBeenCalled();
    expect(posts).toEqual(["/api/publish"]);
  });

  it("stops and explains when a draft can't be saved", async () => {
    const posts = stubApi();
    const onSaveDrafts = vi.fn(async () => "“Team”: Not saved: The page needs a title. The draft is still kept in this browser.");
    render(<PublishPanel githubOn siteUrl="https://example.pages.dev" changes={changes} drafts={drafts} onSaveDrafts={onSaveDrafts} />);
    await act(async () => {});
    await act(async () => screen.getByRole("button", { name: "Publish 3 changes" }).click());
    await act(async () => within(screen.getByRole("dialog")).getByRole("button", { name: "Save and publish" }).click());
    expect(within(screen.getByRole("dialog")).getByRole("alert").textContent).toContain("The page needs a title.");
    expect(posts).toEqual([]);
  });
});

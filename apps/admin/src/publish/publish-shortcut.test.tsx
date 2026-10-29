// @vitest-environment happy-dom
import { act, cleanup, render, renderHook, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { parseRoute } from "../App";
import { PUBLISH_HREF, PublishShortcut, usePendingCount } from "./shortcut";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe("publish-shortcut", () => {
  it("lands on the page list with focus on Publish", () => {
    expect(PUBLISH_HREF).toBe("#/?focus=publish");
    expect(parseRoute(PUBLISH_HREF)).toEqual({ name: "pages", focus: "publish" });
    expect(parseRoute("#/")).toEqual({ name: "pages" });
  });

  it("shows the waiting count, spelled out for screen readers", () => {
    render(<PublishShortcut count={3} className="x" />);
    const link = screen.getByRole("link", { name: /^Publish\s*,\s*3 changes waiting$/ });
    expect(link.getAttribute("href")).toBe("#/?focus=publish");
    cleanup();
    render(<PublishShortcut count={null} className="x" />);
    expect(screen.getByRole("link", { name: "Publish" })).toBeTruthy();
  });

  it("counts waiting changes plus browser drafts", async () => {
    localStorage.setItem(
      "crust:page:/team",
      JSON.stringify({ page: { path: "/team", title: "Team", description: "", puck: { root: { props: {} }, content: [] } }, updatedAt: "x", savedToGitHub: false }),
    );
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({ ok: true, lastPublish: { at: "x", url: "#" }, pages: [{ path: "/about", change: "edited" }], removed: [], moved: [], site: true, redirects: false }),
            { headers: { "Content-Type": "application/json" } },
          ),
      ),
    );
    const { result } = renderHook(() => usePendingCount(true, "edit"));
    await act(async () => {});
    expect(result.current).toBe(3);
  });

  it("stays quiet before saving to GitHub is on", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const { result } = renderHook(() => usePendingCount(false));
    await act(async () => {});
    expect(result.current).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

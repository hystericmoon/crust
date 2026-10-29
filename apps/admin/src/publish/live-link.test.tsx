// @vitest-environment happy-dom
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { chooseLiveUrl, isPlaceholderAddress } from "./live-url";
import { PublishPanel } from "./PublishPanel";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("live-link: choosing the address", () => {
  it("ignores the example placeholder from site.json", () => {
    expect(isPlaceholderAddress("https://example.pages.dev")).toBe(true);
    expect(isPlaceholderAddress("https://www.example.com")).toBe(true);
    expect(isPlaceholderAddress("")).toBe(true);
    expect(isPlaceholderAddress("https://hosni.id")).toBe(false);
    expect(isPlaceholderAddress("https://myexample.com")).toBe(false);
  });

  it("prefers the address the last publish reported, then a real site.json address", () => {
    expect(chooseLiveUrl("https://crust-site.pages.dev", "https://example.pages.dev")).toBe("https://crust-site.pages.dev");
    expect(chooseLiveUrl("https://crust-site.pages.dev", "https://hosni.id")).toBe("https://crust-site.pages.dev");
    expect(chooseLiveUrl(null, "https://hosni.id")).toBe("https://hosni.id");
    expect(chooseLiveUrl(null, "https://example.pages.dev")).toBeNull();
    expect(chooseLiveUrl("javascript:alert(1)", "https://example.pages.dev")).toBeNull();
  });
});

describe("live-link: Publish panel", () => {
  const stub = (liveUrl: string | null) =>
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ ok: true, runs: [], liveUrl }), { headers: { "Content-Type": "application/json" } })),
    );

  it("links to where the site went live, and shows the address", async () => {
    stub("https://crust-site-3x9.pages.dev");
    render(<PublishPanel githubOn siteUrl="https://example.pages.dev" />);
    await act(async () => {});
    const link = screen.getByRole("link", { name: "Open live site (opens in a new tab)" });
    expect(link.getAttribute("href")).toBe("https://crust-site-3x9.pages.dev");
    expect(screen.getByText("crust-site-3x9.pages.dev")).toBeTruthy();
  });

  it("explains where the link appears before the first publish", async () => {
    stub(null);
    render(<PublishPanel githubOn siteUrl="https://example.pages.dev" />);
    await act(async () => {});
    expect(screen.queryByRole("link", { name: /Open live site/ })).toBeNull();
    expect(screen.getByText("The link to your live site appears here after your first publish.")).toBeTruthy();
  });
});

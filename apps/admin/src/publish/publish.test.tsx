// @vitest-environment happy-dom
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { describeRun, PublishPanel } from "./PublishPanel";

const run = (status: string, conclusion: string | null) => ({ id: 1, status, conclusion, createdAt: "2026-10-28T10:00:00Z", url: "https://gh/run/1" });

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("publish status in plain words", () => {
  it("describes each state", () => {
    expect(describeRun(undefined)).toEqual({ label: "Not published yet.", tone: "idle" });
    expect(describeRun(run("queued", null))).toEqual({ label: "Waiting to start…", tone: "busy" });
    expect(describeRun(run("in_progress", null))).toEqual({ label: "Publishing…", tone: "busy" });
    expect(describeRun(run("completed", "success"))).toEqual({ label: "Live.", tone: "ok" });
    expect(describeRun(run("completed", "failure"))).toEqual({ label: "Failed. Nothing changed on the live site.", tone: "error" });
    expect(describeRun(run("completed", "cancelled")).tone).toBe("error");
  });
});

describe("publish panel", () => {
  it("explains that publishing needs GitHub switched on", () => {
    render(<PublishPanel githubOn={false} siteUrl="https://site.dev" />);
    expect(screen.getByText(/switches on together with saving to GitHub/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Publish site" })).toBeNull();
  });

  it("starts a publish and shows progress", async () => {
    const calls: string[] = [];
    let runs = [run("completed", "success")];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        calls.push(`${init?.method ?? "GET"} ${url}`);
        if (init?.method === "POST") {
          runs = [run("in_progress", null), ...runs];
          return new Response(JSON.stringify({ ok: true }), { status: 202, headers: { "Content-Type": "application/json" } });
        }
        return new Response(JSON.stringify({ ok: true, runs }), { headers: { "Content-Type": "application/json" } });
      }),
    );
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(<PublishPanel githubOn siteUrl="https://site.dev" />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });
    expect(screen.getByText("Live.")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Open live site (opens in a new tab)" }).getAttribute("href")).toBe("https://site.dev");

    await act(async () => {
      screen.getByRole("button", { name: "Publish site" }).click();
      await vi.advanceTimersByTimeAsync(10);
    });
    expect(calls).toContain("POST /api/publish");
    expect(screen.getByRole("status").textContent).toMatch(/^Publishing started/);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4100);
    });
    expect(screen.getByText("Publishing…", { selector: "strong" })).toBeTruthy();
  });

  it("shows why publishing couldn't start", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init?: RequestInit) =>
        init?.method === "POST"
          ? new Response(JSON.stringify({ ok: false, error: "The GitHub token isn't allowed to change this repository's contents." }), {
              status: 502,
              headers: { "Content-Type": "application/json" },
            })
          : new Response(JSON.stringify({ ok: true, runs: [] }), { headers: { "Content-Type": "application/json" } }),
      ),
    );
    render(<PublishPanel githubOn siteUrl="https://site.dev" />);
    await act(async () => {
      screen.getByRole("button", { name: "Publish site" }).click();
    });
    await act(async () => {});
    // A failure to start is an alert, not a quiet status line.
    // F069: with a "Try again" button inside it.
    expect(screen.getByRole("alert").querySelector("p")!.textContent).toBe(
      "Couldn't start publishing: The GitHub token isn't allowed to change this repository's contents. Nothing changed on the live site; try again in a minute.",
    );
  });
});

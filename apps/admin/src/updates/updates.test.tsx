// @vitest-environment happy-dom
/**
 * F061: updates built in. The Rust side (crates/crust-desktop/src/updates.rs,
 * tested there with a fake downloads site and signed files) finds,
 * downloads and checks updates; here a fake app checks when Crust looks,
 * what it says, and the banner and Crust card.
 */
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CHECK_EVERY,
  dueForCheck,
  FIRST_CHECK_DELAY,
  hasUnsavedChanges,
  phaseLine,
  releaseDate,
  startUpdates,
  Updater,
  updatesApi,
  type UpdateCheck,
  type UpdateProgress,
  type UpdatesApi,
  type UpdateStatus,
} from "./updates";
import { AboutCrust, UpdateBanner } from "./UpdateNotice";

const flush = () => act(async () => {});
/** The Crust card's line (a polite live region). */
const line = () => document.querySelector(".up-line")?.textContent;

const AVAILABLE: UpdateCheck = { state: "available", current: "0.1.0", version: "0.2.0", notes: ["Updates arrive by themselves.", "Faster publishing."], date: "2026-11-02" };

/** A fake app: answers the update commands, records what was asked. */
function fakeApi(over: Partial<{ status: UpdateStatus; check: () => Promise<UpdateCheck>; download: (p: (x: UpdateProgress) => void) => Promise<string> }> = {}) {
  const calls: string[] = [];
  const api: UpdatesApi = {
    async status() {
      calls.push("status");
      return over.status ?? { current: "0.1.0", enabled: true, ready: null };
    },
    async check() {
      calls.push("check");
      return over.check ? over.check() : AVAILABLE;
    },
    async download(onProgress) {
      calls.push("download");
      if (over.download) return over.download(onProgress);
      onProgress({ downloaded: 50, total: 200 });
      onProgress({ downloaded: 200, total: 200 });
      return "0.2.0";
    },
    async restart() {
      calls.push("restart");
    },
  };
  return { api, calls };
}

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("updates: when Crust looks", () => {
  it("looks at most once a day", () => {
    const now = Date.UTC(2026, 10, 2, 9);
    expect(dueForCheck(null, now)).toBe(true);
    expect(dueForCheck(now - 60_000, now)).toBe(false);
    expect(dueForCheck(now - CHECK_EVERY, now)).toBe(true);
    expect(dueForCheck(Number.NaN, now)).toBe(true);
    // A clock that went backwards doesn't stop updates for good.
    expect(dueForCheck(now + CHECK_EVERY, now)).toBe(true);
  });

  it("looks a little after opening, only in a copy that updates itself", async () => {
    vi.useFakeTimers();
    const on = fakeApi();
    startUpdates(new Updater(on.api), window);
    await vi.advanceTimersByTimeAsync(FIRST_CHECK_DELAY - 1000);
    expect(on.calls).toEqual(["status"]);
    await vi.advanceTimersByTimeAsync(1000);
    expect(on.calls).toEqual(["status", "check", "download"]);
    // Not again the same day, even though it keeps an eye out every hour.
    await vi.advanceTimersByTimeAsync(2 * 60 * 60 * 1000);
    expect(on.calls.filter((c) => c === "check")).toHaveLength(1);

    const off = fakeApi({ status: { current: "0.1.0", enabled: false, ready: null } });
    startUpdates(new Updater(off.api), window);
    await vi.advanceTimersByTimeAsync(FIRST_CHECK_DELAY * 2);
    expect(off.calls).toEqual(["status"]);
  });

  it("remembers the last look between openings", async () => {
    const first = fakeApi({ check: async () => ({ state: "upToDate", current: "0.1.0" }) });
    await new Updater(first.api).checkIfDue();
    const second = fakeApi();
    await new Updater(second.api).checkIfDue();
    expect(second.calls).toEqual([]);
    // A day later it looks again.
    const later = fakeApi();
    await new Updater(later.api, () => Date.now() + CHECK_EVERY + 1).checkIfDue();
    expect(later.calls).toEqual(["check", "download"]);
  });
});

describe("updates: the state", () => {
  it("downloads a newer version and waits for a restart", async () => {
    const { api } = fakeApi();
    const updater = new Updater(api);
    const seen: string[] = [];
    updater.subscribe((p) => seen.push(p.kind === "downloading" ? `downloading ${p.percent}` : p.kind));
    await updater.check(false);
    expect(seen).toEqual(["downloading null", "downloading 25", "downloading 100", "ready"]);
    expect(updater.phase).toEqual({ kind: "ready", version: "0.2.0", notes: AVAILABLE.notes, date: "2026-11-02" });
  });

  it("says every outcome when asked, and stays quiet by itself", async () => {
    const upToDate = new Updater(fakeApi({ check: async () => ({ state: "upToDate", current: "0.1.0" }) }).api);
    await upToDate.check(true);
    expect(upToDate.phase).toEqual({ kind: "upToDate", current: "0.1.0" });

    const offline = () => Promise.reject(new Error("Crust couldn't reach its update site."));
    const asked = new Updater(fakeApi({ check: offline }).api);
    await asked.check(true);
    expect(asked.phase).toEqual({ kind: "failed", message: "Crust couldn't reach its update site." });
    const quiet = new Updater(fakeApi({ check: offline }).api);
    await quiet.check(false);
    expect(quiet.phase).toEqual({ kind: "idle" });

    const off = new Updater(fakeApi({ check: async () => ({ state: "off", current: "0.1.0" }) }).api);
    await off.check(true);
    expect(off.phase).toEqual({ kind: "off", current: "0.1.0" });

    const badDownload = new Updater(fakeApi({ download: () => Promise.reject(new Error("The update didn't pass Crust's safety check.")) }).api);
    await badDownload.check(true);
    expect(badDownload.phase).toEqual({ kind: "failed", message: "The update didn't pass Crust's safety check." });
  });

  it("asks once at a time, and doesn't look again once one is ready", async () => {
    const { api, calls } = fakeApi();
    const updater = new Updater(api);
    await Promise.all([updater.check(false), updater.check(true)]);
    expect(calls.filter((c) => c === "check")).toHaveLength(1);
    await updater.check(false);
    expect(calls.filter((c) => c === "check")).toHaveLength(1);
  });

  it("picks up an update already waiting", async () => {
    const updater = new Updater(fakeApi({ status: { current: "0.1.0", enabled: true, ready: "0.2.0" } }).api);
    await updater.start();
    expect(updater.current).toBe("0.1.0");
    expect(updater.phase).toMatchObject({ kind: "ready", version: "0.2.0" });
  });

  it("talks to the app's commands, listening to progress only while downloading", async () => {
    const asked: string[] = [];
    let handler: ((p: UpdateProgress) => void) | null = null;
    const invoke = async (cmd: string) => {
      asked.push(cmd);
      if (cmd === "update_download") {
        handler?.({ downloaded: 1, total: 2 });
        return "0.2.0";
      }
      if (cmd === "update_check") throw "Crust couldn't reach its update site.";
      return null;
    };
    const listen = async <T,>(event: string, h: (p: T) => void) => {
      expect(event).toBe("update-progress");
      handler = h as (p: UpdateProgress) => void;
      return () => {
        handler = null;
      };
    };
    const api = updatesApi(invoke, listen);
    const progress: UpdateProgress[] = [];
    expect(await api.download((p) => progress.push(p))).toBe("0.2.0");
    expect(progress).toEqual([{ downloaded: 1, total: 2 }]);
    expect(handler).toBeNull();
    await expect(api.check()).rejects.toThrow("couldn't reach");
    await api.restart();
    await api.status();
    expect(asked).toEqual(["update_download", "update_check", "update_restart", "update_status"]);
  });
});

describe("updates: words", () => {
  it("says what's happening in plain words", () => {
    expect(phaseLine({ kind: "idle" }, "0.1.0")).toBe("You have Crust 0.1.0.");
    expect(phaseLine({ kind: "checking" }, "0.1.0")).toBe("Checking for updates…");
    expect(phaseLine({ kind: "upToDate", current: "0.1.0" }, "0.1.0")).toBe("Crust 0.1.0 is the newest version.");
    expect(phaseLine({ kind: "off", current: "0.1.0" }, "0.1.0")).toMatch(/doesn't update itself/);
    expect(phaseLine({ kind: "downloading", version: "0.2.0", notes: [], date: null, percent: 40 }, "0.1.0")).toBe("Downloading Crust 0.2.0… 40%");
    expect(phaseLine({ kind: "ready", version: "0.2.0", notes: [], date: null }, "0.1.0")).toMatch(/installed the next time Crust opens/);
    expect(phaseLine({ kind: "failed", message: "No internet." }, "0.1.0")).toBe("Couldn't update: No internet.");
    expect(releaseDate("2026-11-02")).toBe("2 November 2026");
    expect(releaseDate("2026-13-02")).toBeNull();
    expect(releaseDate(null)).toBeNull();
    expect(releaseDate("soon")).toBeNull();
  });

  it("knows when a restart would lose unsaved changes", () => {
    expect(hasUnsavedChanges()).toBe(false);
    const warn = (e: Event) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    expect(hasUnsavedChanges()).toBe(true);
    window.removeEventListener("beforeunload", warn);
  });
});

describe("updates: the screens", () => {
  async function ready() {
    const fake = fakeApi();
    const updater = new Updater(fake.api);
    await updater.check(false);
    return { updater, calls: fake.calls };
  }

  it("shows nothing on the web, or until an update is ready", async () => {
    const { container } = render(
      <>
        <UpdateBanner updater={null} />
        <AboutCrust updater={null} />
        <UpdateBanner updater={new Updater(fakeApi().api)} />
        {/* Before the app has said which version it is (or an app without updates). */}
        <AboutCrust updater={new Updater(fakeApi().api)} />
      </>,
    );
    expect(container.innerHTML).toBe("");
  });

  it("offers a ready update: what's new, restart now, or later", async () => {
    const { updater, calls } = await ready();
    render(<UpdateBanner updater={updater} />);
    expect(screen.getByRole("heading", { name: "Crust 0.2.0 is ready" })).toBeTruthy();
    expect(screen.getByText(/installed the next time Crust opens/)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "What's new" }));
    expect(screen.getByRole("heading", { name: "What's new in Crust 0.2.0" })).toBeTruthy();
    expect(screen.getByText("Released 2 November 2026")).toBeTruthy();
    expect(screen.getAllByRole("listitem").map((li) => li.textContent)).toEqual(AVAILABLE.notes);
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("heading", { name: /What's new in/ })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Restart now" }));
    await flush();
    expect(calls).toContain("restart");

    fireEvent.click(screen.getByRole("button", { name: "Later" }));
    expect(screen.queryByRole("heading", { name: /is ready/ })).toBeNull();
  });

  it("warns before a restart would lose unsaved Site settings", async () => {
    const { updater, calls } = await ready();
    const warn = (e: Event) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    try {
      render(<UpdateBanner updater={updater} />);
      fireEvent.click(screen.getByRole("button", { name: "Restart now" }));
      expect(screen.getByRole("alert").textContent).toMatch(/unsaved changes in Site settings/);
      expect(calls).not.toContain("restart");
      fireEvent.click(screen.getByRole("button", { name: "Restart anyway" }));
      await flush();
      expect(calls).toContain("restart");
    } finally {
      window.removeEventListener("beforeunload", warn);
    }
  });

  it("checks for updates from the Crust card", async () => {
    let answer: UpdateCheck = { state: "upToDate", current: "0.1.0" };
    const fake = fakeApi({ check: async () => answer });
    const updater = new Updater(fake.api);
    await updater.start();
    render(<AboutCrust updater={updater} />);
    expect(screen.getByRole("heading", { name: "Crust" })).toBeTruthy();
    expect(line()).toBe("You have Crust 0.1.0.");

    fireEvent.click(screen.getByRole("button", { name: "Check for updates" }));
    await flush();
    expect(line()).toBe("Crust 0.1.0 is the newest version.");

    answer = AVAILABLE;
    fireEvent.click(screen.getByRole("button", { name: "Check for updates" }));
    await flush();
    expect(line()).toMatch(/Crust 0.2.0 is ready/);
    // The banner offers Restart now until it's put away with Later; then the card does.
    expect(screen.queryByRole("button", { name: "Restart now" })).toBeNull();
    act(() => updater.dismiss());
    expect(screen.getByRole("button", { name: "Restart now" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "What's new" }));
    expect(screen.getByRole("heading", { name: "What's new in Crust 0.2.0" })).toBeTruthy();
  });

  it("says why an update failed and offers to try again", async () => {
    const updater = new Updater(fakeApi({ check: () => Promise.reject(new Error("Crust couldn't reach its update site.")) }).api);
    await updater.start();
    render(<AboutCrust updater={updater} />);
    fireEvent.click(screen.getByRole("button", { name: "Check for updates" }));
    await flush();
    expect(line()).toBe("Couldn't update: Crust couldn't reach its update site.");
    expect(screen.getByRole("button", { name: "Try again" })).toBeTruthy();
  });

  it("shows download progress", async () => {
    let finish: (v: string) => void = () => {};
    let report: (p: UpdateProgress) => void = () => {};
    const updater = new Updater(
      fakeApi({
        download: (p) => {
          report = p;
          return new Promise((ok) => (finish = ok));
        },
      }).api,
    );
    await updater.start();
    render(<AboutCrust updater={updater} />);
    fireEvent.click(screen.getByRole("button", { name: "Check for updates" }));
    await flush();
    act(() => report({ downloaded: 30, total: 100 }));
    expect(line()).toBe("Downloading Crust 0.2.0… 30%");
    expect(screen.getByRole("progressbar", { name: "Downloading Crust 0.2.0" }).getAttribute("value")).toBe("30");
    expect(screen.getByRole("button", { name: "Check for updates" }).getAttribute("aria-disabled")).toBe("true");
    await act(async () => finish("0.2.0"));
    expect(line()).toMatch(/is ready/);
  });
});

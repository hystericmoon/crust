/**
 * F061: updates built in. The app's Rust side (crates/crust-desktop/src/
 * updates.rs) asks Crust's downloads site for a newer version, downloads it
 * and checks its signature; it's installed when Crust quits, or right away
 * with "Restart now". This side decides when to look (at most once a day,
 * a little after opening, or when asked) and says what's happening.
 */
import type { Invoke } from "../desktop/tauri-folder";
import type { Listen } from "../publish/hosts";

export type UpdateCheck =
  | { state: "off"; current: string }
  | { state: "upToDate"; current: string }
  | { state: "available"; current: string; version: string; notes: string[]; date: string | null };

export interface UpdateStatus {
  current: string;
  enabled: boolean;
  /** A downloaded update waiting for a restart. */
  ready: string | null;
}

export interface UpdateProgress {
  downloaded: number;
  total: number | null;
}

/** The app's update commands. */
export interface UpdatesApi {
  status(): Promise<UpdateStatus>;
  check(): Promise<UpdateCheck>;
  download(onProgress: (p: UpdateProgress) => void): Promise<string>;
  restart(): Promise<void>;
}

const asError = (e: unknown) => (e instanceof Error ? e : new Error(String(e)));

export function updatesApi(invoke: Invoke, listen: Listen): UpdatesApi {
  const call = async <T>(cmd: string): Promise<T> => {
    try {
      return (await invoke(cmd)) as T;
    } catch (e) {
      throw asError(e);
    }
  };
  return {
    status: () => call<UpdateStatus>("update_status"),
    check: () => call<UpdateCheck>("update_check"),
    async download(onProgress) {
      const stop = await listen<UpdateProgress>("update-progress", onProgress);
      try {
        return await call<string>("update_download");
      } finally {
        stop();
      }
    },
    restart: () => call<void>("update_restart"),
  };
}

// ------------------------------------------------------------- when to look

/** How long after opening Crust looks, so it doesn't slow the start. */
export const FIRST_CHECK_DELAY = 15_000;
/** Crust looks at most this often by itself. */
export const CHECK_EVERY = 24 * 60 * 60 * 1000;
const LAST_CHECK_KEY = "crust:update-last-check";

/** Whether it's time to look by itself, given when it last looked. */
export function dueForCheck(lastCheck: number | null, now: number): boolean {
  if (lastCheck === null || !Number.isFinite(lastCheck)) return true;
  // A clock set back (lastCheck in the future) shouldn't stop updates for good.
  return now - lastCheck >= CHECK_EVERY || lastCheck > now;
}

function readLastCheck(): number | null {
  try {
    const value = window.localStorage.getItem(LAST_CHECK_KEY);
    return value === null ? null : Number(value);
  } catch {
    return null;
  }
}

function writeLastCheck(now: number) {
  try {
    window.localStorage.setItem(LAST_CHECK_KEY, String(now));
  } catch {
    // Without storage it simply looks again next time.
  }
}

// ----------------------------------------------------------------- the state

export type UpdatePhase =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "off"; current: string }
  | { kind: "upToDate"; current: string }
  | { kind: "downloading"; version: string; notes: string[]; date: string | null; percent: number | null }
  | { kind: "ready"; version: string; notes: string[]; date: string | null }
  | { kind: "failed"; message: string };

type Listener = (phase: UpdatePhase) => void;

/** What the app is doing about updates, shared by every screen that shows it. */
export class Updater {
  phase: UpdatePhase = { kind: "idle" };
  current = "";
  /** The notice was put away with "Later" (it comes back next time Crust opens). */
  dismissed = false;
  private listeners = new Set<Listener>();
  private busy: Promise<void> | null = null;

  constructor(
    private api: UpdatesApi,
    private now: () => number = Date.now,
  ) {}

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private set(phase: UpdatePhase) {
    this.phase = phase;
    for (const l of this.listeners) l(phase);
  }

  /** Reads the version and any update already waiting. */
  async start(): Promise<UpdateStatus | null> {
    try {
      const status = await this.api.status();
      this.current = status.current;
      this.set(status.ready ? { kind: "ready", version: status.ready, notes: [], date: null } : this.phase);
      return status;
    } catch {
      return null;
    }
  }

  /**
   * Looks for an update and downloads it. Asked for by a person (`manual`),
   * every outcome is shown; by itself, a failure stays quiet (no internet
   * is normal) and "up to date" isn't announced.
   */
  check(manual: boolean): Promise<void> {
    if (this.busy) return this.busy;
    if (!manual && this.phase.kind === "ready") return Promise.resolve();
    this.busy = this.run(manual).finally(() => {
      this.busy = null;
    });
    return this.busy;
  }

  private async run(manual: boolean) {
    const before = this.phase;
    if (manual) this.set({ kind: "checking" });
    let found: UpdateCheck;
    try {
      found = await this.api.check();
      writeLastCheck(this.now());
    } catch (e) {
      this.set(manual ? { kind: "failed", message: asError(e).message } : before);
      return;
    }
    this.current = found.current;
    if (found.state !== "available") {
      if (manual) this.set(found.state === "off" ? { kind: "off", current: found.current } : { kind: "upToDate", current: found.current });
      else if (before.kind === "checking") this.set({ kind: "idle" });
      return;
    }
    const { version, notes, date } = found;
    this.dismissed = false;
    this.set({ kind: "downloading", version, notes, date, percent: null });
    try {
      await this.api.download((p) => {
        const percent = p.total ? Math.min(100, Math.floor((p.downloaded / p.total) * 100)) : null;
        if (this.phase.kind === "downloading" && this.phase.percent !== percent) this.set({ ...this.phase, percent });
      });
      this.set({ kind: "ready", version, notes, date });
    } catch (e) {
      this.set(manual ? { kind: "failed", message: asError(e).message } : { kind: "idle" });
    }
  }

  /** Looks by itself if it hasn't today. */
  checkIfDue(): Promise<void> {
    if (!dueForCheck(readLastCheck(), this.now())) return Promise.resolve();
    return this.check(false);
  }

  dismiss() {
    this.dismissed = true;
    this.set(this.phase);
  }

  /** Installs the waiting update and opens Crust again. */
  async restart(): Promise<void> {
    try {
      await this.api.restart();
    } catch (e) {
      this.set({ kind: "failed", message: asError(e).message });
    }
  }
}

let current: Updater | null = null;

/** The desktop app's updates; null on the web. */
export const desktopUpdates = (): Updater | null => current;

export function setDesktopUpdates(updater: Updater | null) {
  current = updater;
}

/** Starts looking: a little after opening, then once a day while Crust is open. */
export function startUpdates(updater: Updater, timers: { setTimeout: typeof setTimeout; setInterval: typeof setInterval } = window): void {
  void updater.start().then((status) => {
    if (!status?.enabled) return;
    timers.setTimeout(() => void updater.checkIfDue(), FIRST_CHECK_DELAY);
    timers.setInterval(() => void updater.checkIfDue(), 60 * 60 * 1000);
  });
}

// ------------------------------------------------------------------- words

/** Whether a screen has changes that a restart would lose (Site settings warns on leaving). */
export function hasUnsavedChanges(): boolean {
  const event = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(event);
  return event.defaultPrevented;
}

/** "2 November 2026" from "2026-11-02". */
export function releaseDate(date: string | null): string | null {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const month = months[m - 1];
  return month && d >= 1 && d <= 31 ? `${d} ${month} ${y}` : null;
}

/** The one line the About card shows for a phase. */
export function phaseLine(phase: UpdatePhase, current: string): string {
  switch (phase.kind) {
    case "idle":
      return current ? `You have Crust ${current}.` : "";
    case "checking":
      return "Checking for updates…";
    case "off":
      return `You have Crust ${phase.current}. This copy of Crust doesn't update itself (it's a test copy).`;
    case "upToDate":
      return `Crust ${phase.current} is the newest version.`;
    case "downloading":
      return phase.percent === null ? `Downloading Crust ${phase.version}…` : `Downloading Crust ${phase.version}… ${phase.percent}%`;
    case "ready":
      return `Crust ${phase.version} is ready. It's installed the next time Crust opens.`;
    case "failed":
      return `Couldn't update: ${phase.message}`;
  }
}

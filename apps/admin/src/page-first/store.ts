/**
 * F087 Page first: what the right panel shows when nothing is selected,
 * and the "Next steps" list for a new site (kept per site, in this browser).
 */
import { useSyncExternalStore } from "react";

/** The page is drawn at least this wide on Desktop, so desktop layouts show. */
export const DESKTOP_MIN = 1024;

/** Desktop width: the canvas's own width ("fit width"), never narrower than a desktop. */
export function fitWidth(frameWidth: number): number {
  return Math.max(DESKTOP_MIN, Math.floor(frameWidth));
}

/** Any width from a desktop up is "Desktop" (fit width changes with the window). */
export function isDesktopWidth(width: unknown): boolean {
  return typeof width === "number" && width >= DESKTOP_MIN;
}

// --- The right panel, with nothing selected ---

/** "next": Next steps; "page": the page's (or post's) settings; null: no panel. */
export type PanelMode = "next" | "page" | null;

let mode: PanelMode = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function panelMode(): PanelMode {
  return mode;
}

export function setPanelMode(next: PanelMode) {
  if (next === mode) return;
  mode = next;
  emit();
}

export function usePanelMode(): PanelMode {
  return useSyncExternalStore(subscribe, panelMode, panelMode);
}

// --- Next steps ---

export type StepId = "words" | "page" | "phone" | "publish";

export interface NextStepsState {
  show: boolean;
  done: StepId[];
}

const NEW_KEY = "crust:next-steps:new";
const keyFor = (site: string) => `crust:next-steps:${site}`;
const NONE: NextStepsState = { show: false, done: [] };

let cache: { site: string; state: NextStepsState } | null = null;

function read(site: string): NextStepsState {
  if (cache?.site === site) return cache.state;
  let state = NONE;
  try {
    const raw = localStorage.getItem(keyFor(site));
    if (raw) {
      const v = JSON.parse(raw) as Partial<NextStepsState>;
      state = { show: v.show === true, done: Array.isArray(v.done) ? (v.done.filter((d) => typeof d === "string") as StepId[]) : [] };
    }
  } catch {
    // No storage: no list.
  }
  cache = { site, state };
  return state;
}

function write(site: string, state: NextStepsState) {
  cache = { site, state };
  try {
    localStorage.setItem(keyFor(site), JSON.stringify(state));
  } catch {
    // Kept for this window only.
  }
  emit();
}

/** The welcome screen made a new site: the builder shows Next steps once it opens. */
export function markNewSite() {
  try {
    localStorage.setItem(NEW_KEY, "1");
  } catch {
    // Without storage there's no list; nothing else changes.
  }
}

/** On opening the builder: a just-made site gets its list. Returns the site's state. */
export function startNextSteps(site: string): NextStepsState {
  let isNew = false;
  try {
    isNew = localStorage.getItem(NEW_KEY) === "1";
    localStorage.removeItem(NEW_KEY);
  } catch {
    // No storage.
  }
  if (isNew) write(site, { show: true, done: [] });
  return read(site);
}

export function nextSteps(site: string): NextStepsState {
  return read(site);
}

export function useNextSteps(site: string): NextStepsState {
  return useSyncExternalStore(
    subscribe,
    () => read(site),
    () => read(site),
  );
}

export function setStepDone(site: string, id: StepId, done: boolean) {
  const s = read(site);
  if (s.done.includes(id) === done) return;
  write(site, { ...s, done: done ? [...s.done, id] : s.done.filter((d) => d !== id) });
}

/** Skip: the list goes away for this site (Help brings it back). */
export function skipNextSteps(site: string) {
  write(site, { ...read(site), show: false });
}

export function showNextSteps(site: string) {
  write(site, { ...read(site), show: true });
}

/** Tests only. */
export function resetPageFirst() {
  mode = null;
  cache = null;
  emit();
}

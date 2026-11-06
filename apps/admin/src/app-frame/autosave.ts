/**
 * F086: changes save on their own. Every edit is kept in this browser at
 * once (as before); the save to GitHub, or to the site folder in the
 * desktop app, waits until the editing pauses, so a burst of typing is one
 * save (one commit), not one per key.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { desktopContent } from "../desktop/content";

/** Quiet time before a save: the browser groups more, the computer's disk is cheap. */
export const BROWSER_DELAY = 3000;
export const DESKTOP_DELAY = 1000;
export const autosaveDelay = () => (desktopContent() ? DESKTOP_DELAY : BROWSER_DELAY);

export interface Autosaver<T> {
  /** A change happened: save `value` once things are quiet. */
  schedule(value: T): void;
  /** Save what's waiting now (leaving the page, Ctrl+S). */
  flush(): void;
  /** True while a change waits for its save. */
  pending(): boolean;
  cancel(): void;
}

/** The timer behind autosave, without React (tested with fake timers). */
export function createAutosaver<T>(save: (value: T) => void, delay: number): Autosaver<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let waiting: { value: T } | null = null;
  const run = () => {
    if (timer) clearTimeout(timer);
    timer = null;
    const next = waiting;
    waiting = null;
    if (next) save(next.value);
  };
  return {
    schedule(value) {
      waiting = { value };
      if (timer) clearTimeout(timer);
      timer = setTimeout(run, delay);
    },
    flush: run,
    pending: () => waiting !== null,
    cancel() {
      if (timer) clearTimeout(timer);
      timer = null;
      waiting = null;
    },
  };
}

/** Where saving stands, for the top bar. */
export type SavePhase = "saved" | "saving" | "local" | "held" | "failed";

/**
 * Autosave for one builder. `save` does the real work and returns the phase
 * it ended in. Saves of content that didn't change are skipped (Puck reports
 * a change when a page opens), and whatever waits is saved when the builder
 * closes, on Ctrl/Cmd+S, and before the tab goes away.
 */
export function useAutosave<T>(save: (value: T) => Promise<SavePhase>, key: (value: T) => string, initial: T | null) {
  const [phase, setPhase] = useState<SavePhase>("saved");
  const last = useRef<string | null>(null);
  if (last.current === null && initial !== null) last.current = key(initial);
  const saveRef = useRef(save);
  saveRef.current = save;
  const keyRef = useRef(key);
  keyRef.current = key;

  const saver = useMemo(
    () =>
      createAutosaver<T>((value) => {
        const k = keyRef.current(value);
        if (k === last.current) {
          setPhase((p) => (p === "saving" ? p : "saved"));
          return;
        }
        last.current = k;
        setPhase("saving");
        void saveRef.current(value).then(setPhase, () => setPhase("failed"));
      }, autosaveDelay()),
    [],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.altKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        saver.flush();
      }
    };
    const onLeave = () => saver.flush();
    window.addEventListener("keydown", onKey);
    window.addEventListener("pagehide", onLeave);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pagehide", onLeave);
      // Leaving the builder: save what's waiting.
      saver.flush();
    };
  }, [saver]);

  const schedule = useCallback(
    (value: T) => {
      if (keyRef.current(value) === last.current) return;
      setPhase("saving");
      saver.schedule(value);
    },
    [saver],
  );
  /** Try again after a failure: the same content, now. */
  const retry = useCallback(
    (value: T) => {
      last.current = null;
      saver.schedule(value);
      saver.flush();
    },
    [saver],
  );
  return { phase, schedule, flush: saver.flush, retry, setPhase };
}

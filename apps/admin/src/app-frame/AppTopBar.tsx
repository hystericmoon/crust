/**
 * F086: one top bar on every screen (take A, design/f086-app-frame-v1.html).
 * Left: where you are (F100: the site menu moved to the left menu, SiteNav). Right: that screen's own buttons,
 * the status ("Saved · 3 changes not live") and Publish, always in the same
 * place and always the one primary button.
 */
import { useSyncExternalStore, type ReactNode } from "react";
import { PUBLISH_HREF } from "../publish/shortcut";
import { ThemeToggle } from "../app-theme/ThemeToggle";
import { statusText, statusTone } from "./status";
import type { SavePhase } from "./autosave";

export interface AppFrame {
  siteName: string;
  /** The desktop app keeps several sites: the menu offers All sites, and there's no signing out. */
  desktop: boolean;
  /** Changes not live yet; null when unknown (saving to GitHub off, or never published). */
  pending: number | null;
}

// One frame for the whole app, set by App (the site, and the count after each save).
let frame: AppFrame = { siteName: "Your site", desktop: false, pending: null };
const listeners = new Set<() => void>();
export function setAppFrame(patch: Partial<AppFrame>) {
  const next = { ...frame, ...patch };
  if (next.siteName === frame.siteName && next.desktop === frame.desktop && next.pending === frame.pending) return;
  frame = next;
  for (const l of listeners) l();
}
export function useAppFrame(): AppFrame {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => frame,
  );
}

/** "Saved · 3 changes not live": a polite live region, so saving is spoken but keystrokes aren't. */
export function FrameStatus({ phase, pending }: { phase: SavePhase | null; pending?: number | null }) {
  const frame = useAppFrame();
  const count = pending === undefined ? frame.pending : pending;
  const text = statusText(phase, count);
  return (
    // Only screens that save are a live region; elsewhere the screen's own status line speaks.
    <span className={`af-status af-status-${statusTone(phase, count)}`} title={text || undefined} {...(phase === null ? {} : { role: "status", "aria-live": "polite" as const })}>
      {text ? <span className="af-dot" aria-hidden="true" /> : null}
      <span className="af-status-text">{text}</span>
    </span>
  );
}

/** Publish: the one primary button, with the number of changes waiting. */
export function PublishButton({ onClick }: { onClick?: () => void }) {
  const { pending } = useAppFrame();
  const label = (
    <>
      Publish
      {pending ? (
        <>
          <span className="af-count" aria-hidden="true">
            {pending}
          </span>
          <span className="pg-sr">, {pending === 1 ? "1 change" : `${pending} changes`} waiting</span>
        </>
      ) : null}
    </>
  );
  // On the pages screen the Publish panel is right there: go to it instead of reloading.
  if (onClick) {
    return (
      <button type="button" className="af-publish af-hero" onClick={onClick}>
        {label}
      </button>
    );
  }
  return (
    <a className="af-publish af-hero" href={PUBLISH_HREF}>
      {label}
    </a>
  );
}

export interface AppTopBarProps {
  /** Overrides the frame's site name (screens rendered on their own in tests). */
  siteName?: string;
  /** Overrides the frame's "desktop app" (All sites in the menu, no Sign out). */
  allSites?: boolean;
  /** Where you are: the screen's name (an h1) or the page switcher. */
  where?: ReactNode;
  /** In the middle-right: the screen's own tools (device toggle, undo, New page…). */
  tools?: ReactNode;
  /** F093: the screen's h1, spoken only (screens with their own visible h1 leave it out). */
  heading?: string;
  /** Where saving stands; null on screens that don't edit (they only say what's live). */
  phase?: SavePhase | null;
  /** Just before Publish (Preview in the builder). */
  beforePublish?: ReactNode;
  onPublish?: () => void;
  /** No Publish button (a screen that has its own, like Site settings' Save). */
  publish?: boolean;
  /** A007: false when a parent (Puck's header) already is the page's banner; ours is then a named group. */
  landmark?: boolean;
}

export function AppTopBar({ siteName, allSites, where, heading, tools, phase = null, beforePublish, onPublish, publish = true, landmark = true }: AppTopBarProps) {
  const Bar = landmark ? "header" : "div";
  return (
    <Bar className="af-top" {...(landmark ? {} : { role: "group", "aria-label": "Site and publishing" })}>
      {heading ? <h1 className="af-sr">{heading}</h1> : null}
      {where ? <div className="af-where">{where}</div> : null}
      <span className="af-grow" />
      {tools ? <div className="af-tools">{tools}</div> : null}
      <FrameStatus phase={phase} />
      {beforePublish}
      {publish ? <PublishButton onClick={onPublish} /> : null}
      <ThemeToggle className="af-theme" />
    </Bar>
  );
}

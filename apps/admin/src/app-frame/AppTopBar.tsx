/**
 * F086: one top bar on every screen (take A, design/f086-app-frame-v1.html).
 * Left: the site menu and where you are. Right: that screen's own buttons,
 * the status ("Saved · 3 changes not live") and Publish, always in the same
 * place and always the one primary button.
 */
import { useEffect, useId, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { PUBLISH_HREF } from "../publish/shortcut";
import { SIGN_OUT_URL } from "../sign-out";
import { ThemeToggle } from "../app-theme/ThemeToggle";
import { FrameIcon } from "./icons";
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

/** The site's name with a menu of the app's screens (and All sites in the desktop app). */
export function SiteMenu({ siteName, allSites }: { siteName?: string; allSites?: boolean }) {
  const frame = useAppFrame();
  const desktop = allSites ?? frame.desktop;
  const name = siteName ?? frame.siteName;
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  const close = () => {
    setOpen(false);
    button.current?.focus();
  };

  return (
    <div
      className="af-site"
      ref={box}
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) {
          e.stopPropagation();
          close();
        }
      }}
      onBlur={(e) => {
        if (open && !box.current?.contains(e.relatedTarget as Node | null) && e.relatedTarget) setOpen(false);
      }}
    >
      <button
        ref={button}
        type="button"
        className="af-site-button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="af-logo" aria-hidden="true">
          {name.trim().charAt(0).toUpperCase() || "C"}
        </span>
        {/* The visible name starts the spoken one (WCAG 2.5.3), so voice control can say it. */}
        <span className="af-site-name">{name}</span>
        <span className="pg-sr">, site menu</span>
        <FrameIcon name="down" size={14} />
      </button>
      <div id={id} className="af-menu" hidden={!open}>
        <ul>
          {desktop ? (
            <li>
              <a href="#/sites" onClick={() => setOpen(false)}>
                All sites
              </a>
            </li>
          ) : null}
          <li>
            <a href="#/" onClick={() => setOpen(false)}>
              Pages
            </a>
          </li>
          <li>
            <a href="#/posts" onClick={() => setOpen(false)}>
              Posts
            </a>
          </li>
          <li>
            <a href="#/settings" onClick={() => setOpen(false)}>
              Site settings
            </a>
          </li>
          <li>
            <a href="#/templates" onClick={() => setOpen(false)}>
              Start from a template
            </a>
          </li>
          {desktop ? null : (
            // F069: last, after a divider, so a slip doesn't sign the owner out.
            <li className="af-menu-end">
              <a href={SIGN_OUT_URL}>Sign out</a>
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}

/** "Saved · 3 changes not live": a polite live region, so saving is spoken but keystrokes aren't. */
export function FrameStatus({ phase, pending }: { phase: SavePhase | null; pending?: number | null }) {
  const frame = useAppFrame();
  const count = pending === undefined ? frame.pending : pending;
  const text = statusText(phase, count);
  return (
    // Only screens that save are a live region; elsewhere the screen's own status line speaks.
    <span className={`af-status af-status-${statusTone(phase, count)}`} {...(phase === null ? {} : { role: "status", "aria-live": "polite" as const })}>
      {text ? <span className="af-dot" aria-hidden="true" /> : null}
      {text}
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
      <button type="button" className="af-publish" onClick={onClick}>
        {label}
      </button>
    );
  }
  return (
    <a className="af-publish" href={PUBLISH_HREF}>
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
}

export function AppTopBar({ siteName, allSites, where, heading, tools, phase = null, beforePublish, onPublish, publish = true }: AppTopBarProps) {
  return (
    <header className="af-top">
      {heading ? <h1 className="af-sr">{heading}</h1> : null}
      <SiteMenu siteName={siteName} allSites={allSites} />
      {where ? <div className="af-where">{where}</div> : null}
      <span className="af-grow" />
      {tools ? <div className="af-tools">{tools}</div> : null}
      <FrameStatus phase={phase} />
      {beforePublish}
      {publish ? <PublishButton onClick={onPublish} /> : null}
      <ThemeToggle className="af-theme" />
    </header>
  );
}

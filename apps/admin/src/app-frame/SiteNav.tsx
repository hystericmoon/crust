/**
 * F100: the left menu inside a site (level 2 of the two-level menu,
 * DECISIONS 2026-11-25). It replaces the top-left site dropdown: "← All sites"
 * (desktop app only), then Pages, Posts, Layout, Styles, Media, Settings.
 * One nav landmark named "Site". Wide: a 196 px sidebar with labels. In the
 * page editor: a 72 px rail with labels under the icons. On a phone: a bottom
 * bar (Pages, Posts, Layout, Styles, More; More holds Media, Settings, All sites).
 */
import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { SIGN_OUT_URL } from "../sign-out";
import { FrameIcon, type FrameIconName } from "./icons";
import { statusText, statusTone } from "./status";
import { useAppFrame } from "./AppTopBar";

export type NavId = "pages" | "posts" | "layout" | "styles" | "media" | "settings";
export type NavMode = "list" | "rail" | "all";
export type AllId = "sites" | "templates" | "settings";

interface Item {
  id: NavId;
  label: string;
  href: string;
  icon: FrameIconName;
  /** On a phone these sit behind "More". */
  more?: boolean;
}

export const NAV_ITEMS: Item[] = [
  { id: "pages", label: "Pages", href: "#/", icon: "pages" },
  { id: "posts", label: "Posts", href: "#/posts", icon: "blog" },
  { id: "layout", label: "Layout", href: "#/settings?group=header", icon: "layout" },
  { id: "styles", label: "Styles", href: "#/settings?group=presets", icon: "brush" },
  { id: "media", label: "Media", href: "#/media", icon: "media", more: true },
  { id: "settings", label: "Settings", href: "#/settings?group=address", icon: "site", more: true },
];

/** Which menu item a screen belongs to (null: none, like the all-sites screen). */
export function navCurrent(hash: string): NavId | null {
  const h = hash || "#/";
  if (h.startsWith("#/sites")) return null;
  if (h.startsWith("#/posts") || h.startsWith("#/post?")) return "posts";
  if (h.startsWith("#/media")) return "media";
  if (h.startsWith("#/design?")) {
    const kind = new URLSearchParams(h.split("?")[1] ?? "").get("kind");
    return kind === "notFound" ? "pages" : "posts";
  }
  if (h.startsWith("#/settings")) {
    const group = new URLSearchParams(h.split("?")[1] ?? "").get("group") ?? "presets";
    if (group === "header" || group === "footer") return "layout";
    if (group === "address" || group === "template") return "settings";
    return "styles";
  }
  // Pages, the page editor, a linked section and Start from a template all live under Pages.
  return "pages";
}

/** The menu has two shapes: the editor gets the narrow rail, everything else the sidebar. */
export function navMode(hash: string, desktop = false): NavMode | null {
  const h = hash || "#/";
  // F101: level 1 (all sites) only exists in the desktop app; the web version edits one site.
  if (h.startsWith("#/sites")) return desktop ? "all" : "list";
  if (h.startsWith("#/edit") || h.startsWith("#/post?") || h.startsWith("#/section?") || h.startsWith("#/design?")) return "rail";
  return "list";
}

/** F101: level 1 of the menu. */
export const ALL_ITEMS: { id: AllId; label: string; href: string; icon: FrameIconName }[] = [
  { id: "sites", label: "Sites", href: "#/sites", icon: "layers" },
  { id: "templates", label: "Templates", href: "#/sites?view=templates", icon: "layout" },
  { id: "settings", label: "Settings", href: "#/sites?view=settings", icon: "site" },
];
export function allCurrent(hash: string): AllId {
  const view = new URLSearchParams(hash.split("?")[1] ?? "").get("view");
  return view === "templates" || view === "settings" ? view : "sites";
}

function subscribeHash(l: () => void) {
  window.addEventListener("hashchange", l);
  return () => window.removeEventListener("hashchange", l);
}
export function useHash(): string {
  return useSyncExternalStore(subscribeHash, () => location.hash, () => "");
}

/** Set when the menu was used, so the new screen's heading gets focus (a level change is announced). */
let focusHeadingNext = false;
export function takeFocusHeading(): boolean {
  const v = focusHeadingNext;
  focusHeadingNext = false;
  return v;
}
export function focusScreenHeading(): boolean {
  const h = document.querySelector<HTMLElement>("main h1, h1:not(.af-sr)") ?? document.querySelector<HTMLElement>("h1");
  if (!h) return false;
  h.setAttribute("tabindex", "-1");
  h.focus({ preventScroll: true });
  return true;
}

/** Level 1: Sites, Templates, Settings. Choosing a site on the Sites screen drills into level 2. */
export function AllSitesNav({ hash }: { hash?: string }) {
  const live = useHash();
  const here = allCurrent(hash ?? live);
  const frame = useAppFrame();
  return (
    <nav className="sn sn-mode-list sn-mode-all" aria-label="Crust">
      <button
        type="button"
        className="sn-skip"
        onClick={() => {
          const main = document.querySelector<HTMLElement>("main");
          if (main) {
            main.setAttribute("tabindex", "-1");
            main.focus();
          } else focusScreenHeading();
        }}
      >
        Skip to content
      </button>
      <ul className="sn-items">
        <li className="sn-site" aria-hidden="true">
          <span className="af-logo">C</span>
          <span className="sn-site-name">Crust</span>
        </li>
        {ALL_ITEMS.map((i) => (
          <li key={i.id} className="sn-item">
            <a className="sn-link" href={i.href} aria-current={here === i.id ? "page" : undefined} onClick={() => (focusHeadingNext = true)}>
              <FrameIcon name={i.icon} size={18} />
              <span className="sn-label">{i.label}</span>
            </a>
          </li>
        ))}
      </ul>
      <div className="sn-foot">
        <a className="sn-link sn-open-site" href="#/" onClick={() => (focusHeadingNext = true)}>
          <FrameIcon name="next" size={18} />
          <span className="sn-label">Back to {frame.siteName}</span>
        </a>
      </div>
    </nav>
  );
}

export function SiteNav({ mode, hash, desktop, siteName }: { mode: NavMode; hash?: string; desktop?: boolean; siteName?: string }) {
  const live = useHash();
  const frame = useAppFrame();
  const here = navCurrent(hash ?? live);
  const isDesktop = desktop ?? frame.desktop;
  const name = siteName ?? frame.siteName;
  const [more, setMore] = useState(false);
  const moreId = useId();
  const box = useRef<HTMLElement>(null);

  // The phone's More sheet closes on Escape and on any move.
  useEffect(() => setMore(false), [live]);
  useEffect(() => {
    if (!more) return;
    const onDown = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setMore(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [more]);

  const text = statusText(null, frame.pending);
  const moreHasCurrent = NAV_ITEMS.some((i) => i.more && i.id === here);

  return (
    <nav
      ref={box}
      className={`sn sn-mode-${mode}${more ? " sn-more-open" : ""}`}
      aria-label="Site"
      onKeyDown={(e) => {
        if (e.key === "Escape" && more) {
          e.stopPropagation();
          setMore(false);
        }
      }}
    >
      {/* A button, not a "#main" link: the address is the router's (#/…), so a fragment link would change the screen. */}
      <button
        type="button"
        className="sn-skip"
        onClick={() => {
          const main = document.querySelector<HTMLElement>("main") ?? document.querySelector<HTMLElement>("[role=main]");
          if (main) {
            main.setAttribute("tabindex", "-1");
            main.focus();
          } else focusScreenHeading();
        }}
      >
        Skip to content
      </button>
      <ul className="sn-items">
        {isDesktop ? (
          <li className="sn-all">
            <a className="sn-link" href="#/sites" onClick={() => (focusHeadingNext = true)}>
              <FrameIcon name="back" size={18} />
              <span className="sn-label">All sites</span>
            </a>
          </li>
        ) : null}
        <li className="sn-site" aria-hidden="true">
          <span className="af-logo">{name.trim().charAt(0).toUpperCase() || "C"}</span>
          <span className="sn-site-name">{name}</span>
        </li>
        {NAV_ITEMS.map((i) => (
          <li key={i.id} className={i.more ? "sn-item sn-item-more" : "sn-item"}>
            <a className="sn-link" href={i.href} aria-current={here === i.id ? "page" : undefined} onClick={() => (focusHeadingNext = true)}>
              <FrameIcon name={i.icon} size={18} />
              <span className="sn-label">{i.label}</span>
            </a>
          </li>
        ))}
        <li className="sn-item sn-more-button">
          <button type="button" className="sn-link" aria-expanded={more} aria-controls={moreId} aria-current={moreHasCurrent && !more ? "true" : undefined} onClick={() => setMore((m) => !m)}>
            <FrameIcon name="more" size={18} />
            <span className="sn-label">More</span>
          </button>
        </li>
      </ul>
      {/* Phone only: Media, Settings and All sites, shown by More. */}
      <div id={moreId} className="sn-sheet" hidden={!more}>
        <ul>
          {NAV_ITEMS.filter((i) => i.more).map((i) => (
            <li key={i.id}>
              <a className="sn-link" href={i.href} aria-current={here === i.id ? "page" : undefined} onClick={() => (focusHeadingNext = true)}>
                <FrameIcon name={i.icon} size={18} />
                <span className="sn-label">{i.label}</span>
              </a>
            </li>
          ))}
          {isDesktop ? (
            <li>
              <a className="sn-link" href="#/sites" onClick={() => (focusHeadingNext = true)}>
                <FrameIcon name="back" size={18} />
                <span className="sn-label">All sites</span>
              </a>
            </li>
          ) : (
            <li>
              <a className="sn-link" href={SIGN_OUT_URL}>
                <span className="sn-label">Sign out</span>
              </a>
            </li>
          )}
        </ul>
      </div>
      <div className="sn-foot">
        {text ? (
          <p className={`sn-status af-status-${statusTone(null, frame.pending)}`}>
            <span className="af-dot" aria-hidden="true" />
            {text}
          </p>
        ) : null}
        {isDesktop ? null : (
          // F069: last, after a divider, so a slip doesn't sign the owner out.
          <a className="sn-signout" href={SIGN_OUT_URL}>
            Sign out
          </a>
        )}
      </div>
    </nav>
  );
}

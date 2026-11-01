/**
 * Accessibility fixes for Puck's own builder chrome (F040), found by axe:
 * - the canvas iframe has no title;
 * - the zoom menu (a <select>) has no label;
 * - the loading spinner is a <span> with aria-label but no role, so the
 *   label isn't allowed (and isn't read).
 * The fourth issue, low-contrast "Layout"/"Content" headings in the block
 * list, is fixed in keyboard.css.
 *
 * F069: the left rail's "Blocks / Outline" switch is a <div> with a click
 * handler and no tab stop, so it was mouse-only (WCAG 2.1.1). It becomes a
 * toggle button: Tab reaches it, Enter or Space presses it, and
 * aria-pressed says which view is showing.
 *
 * Puck renders and re-renders these itself, so we label them as they
 * appear rather than replacing Puck's components.
 */

export const CANVAS_TITLE = "Page preview";
export const ZOOM_LABEL = "Zoom";
export const LOADING_LABEL = "Loading the preview";

const setIfMissing = (el: Element, name: string, value: string) => {
  if (!el.getAttribute(name)?.trim()) el.setAttribute(name, value);
};

/** Labels Puck's chrome under `root`. Safe to call again; only adds what's missing. */
export function fixPuckChrome(root: ParentNode): void {
  for (const frame of root.querySelectorAll("iframe#preview-frame")) setIfMissing(frame, "title", CANVAS_TITLE);
  for (const select of root.querySelectorAll("select[class*='ViewportControls-zoomSelect']")) {
    setIfMissing(select, "aria-label", ZOOM_LABEL);
  }
  for (const loader of root.querySelectorAll("[class*='_Loader_'][aria-label]:not([role])")) {
    // An indeterminate progress bar: a spinner with a name screen readers can use.
    loader.setAttribute("role", "progressbar");
    loader.setAttribute("aria-label", LOADING_LABEL);
  }
  for (const link of root.querySelectorAll<HTMLElement>(NAV_LINK)) {
    if (link.getAttribute("role") !== "button") link.setAttribute("role", "button");
    if (link.getAttribute("tabindex") !== "0") link.setAttribute("tabindex", "0");
    const pressed = String(/_NavItem--active_/.test(link.parentElement?.className ?? ""));
    if (link.getAttribute("aria-pressed") !== pressed) link.setAttribute("aria-pressed", pressed);
  }
}

/** Puck's left-rail items ("Blocks", "Outline"). */
const NAV_LINK = "[class*='_NavItem-link_']";

/** Enter or Space on a rail item presses it, like a real button. */
export function pressNavItem(e: KeyboardEvent): void {
  if (e.key !== "Enter" && e.key !== " ") return;
  const target = e.target as Element | null;
  const link = typeof target?.closest === "function" ? target.closest<HTMLElement>(NAV_LINK) : null;
  if (!link || link !== target) return;
  e.preventDefault();
  link.click();
}

/** Keeps fixing the chrome as Puck renders it; returns the uninstaller. */
export function installPuckChromeFixes(doc: Document): () => void {
  fixPuckChrome(doc);
  doc.addEventListener("keydown", pressNavItem);
  const view = doc.defaultView;
  if (!view?.MutationObserver) return () => doc.removeEventListener("keydown", pressNavItem);
  let queued = false;
  const observer = new view.MutationObserver(() => {
    if (queued) return;
    queued = true;
    // One pass per frame, however many nodes Puck changed.
    queueMicrotask(() => {
      queued = false;
      fixPuckChrome(doc);
    });
  });
  // Class changes too: the active rail item is only marked by its class.
  observer.observe(doc.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
  return () => {
    observer.disconnect();
    doc.removeEventListener("keydown", pressNavItem);
  };
}

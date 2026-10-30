/**
 * Accessibility fixes for Puck's own builder chrome (F040), found by axe:
 * - the canvas iframe has no title;
 * - the zoom menu (a <select>) has no label;
 * - the loading spinner is a <span> with aria-label but no role, so the
 *   label isn't allowed (and isn't read).
 * The fourth issue, low-contrast "Layout"/"Content" headings in the block
 * list, is fixed in keyboard.css.
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
}

/** Keeps fixing the chrome as Puck renders it; returns the uninstaller. */
export function installPuckChromeFixes(doc: Document): () => void {
  fixPuckChrome(doc);
  const view = doc.defaultView;
  if (!view?.MutationObserver) return () => {};
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
  observer.observe(doc.body, { childList: true, subtree: true });
  return () => observer.disconnect();
}

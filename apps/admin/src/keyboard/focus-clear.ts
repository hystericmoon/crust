/**
 * F093 (WCAG 2.4.11 Focus Not Obscured): the builder's floating bars (the
 * block's action bar, the typing bar and the text toolbar on the page, the
 * save message) can sit on top of whatever has keyboard focus. When focus
 * lands under one, the page scrolls so the focused thing is clear of it.
 * A little scroll padding does the same for anything the browser scrolls to.
 */

/** The floating bars, in the canvas and in the app. */
export const FLOATING_BARS = [
  "[class*='_DraggableComponent-actions_']",
  ".it-bar",
  ".rt-floating .rt-toolbar",
  ".rt-floating .rt-link",
  ".crust-status",
].join(",");

type Box = { top: number; bottom: number; left: number; right: number };

/** Mostly covered (half or more of `a`'s area): the line between "touching" and "hidden". */
const overlaps = (a: Box, b: Box) => {
  const across = Math.min(a.right, b.right) - Math.max(a.left, b.left);
  const down = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
  return across > 0 && down > 0 && (across * down) / Math.max(1, (a.right - a.left) * (a.bottom - a.top)) >= 0.5;
};

/**
 * The scrollBy distance (negative = up, so the thing moves down) that
 * puts `target` clear of every bar that covers it; 0 when nothing covers it.
 */
export function scrollToClear(target: Box, bars: Box[], viewHeight: number, gap = 8): number {
  const covering = bars.filter((b) => overlaps(target, b));
  if (!covering.length) return 0;
  // A bar over the top edge: push the target down below it; one over the bottom: pull it up above it.
  const above = covering.filter((b) => (b.top + b.bottom) / 2 <= (target.top + target.bottom) / 2);
  if (above.length) {
    const need = Math.max(...above.map((b) => b.bottom)) - target.top + gap;
    return target.bottom + need <= viewHeight ? -need : 0;
  }
  const need = target.bottom - Math.min(...covering.map((b) => b.top)) + gap;
  return target.top - need >= 0 ? need : 0;
}

/** Keeps focus clear of the floating bars in `doc`; returns the uninstaller. */
export function installFocusClear(doc: Document): () => void {
  const root = doc.documentElement;
  root.style.scrollPaddingTop = "72px";
  root.style.scrollPaddingBottom = "72px";
  let frame = 0;
  const view = doc.defaultView;
  const check = (target: Element) => {
    if (!view) return;
    const bars = [...doc.querySelectorAll<HTMLElement>(FLOATING_BARS)].filter((b) => !b.contains(target) && !target.contains(b));
    const r = target.getBoundingClientRect();
    const dy = scrollToClear(r, bars.map((b) => b.getBoundingClientRect()), view.innerHeight);
    if (dy) view.scrollBy({ top: dy });
  };
  const onFocus = (e: FocusEvent) => {
    const t = e.target;
    if (!(t instanceof (view?.Element ?? Element))) return;
    cancelAnimationFrame(frame);
    // After the browser's own scroll to the focused thing.
    frame = requestAnimationFrame(() => check(t));
  };
  doc.addEventListener("focusin", onFocus);
  return () => {
    doc.removeEventListener("focusin", onFocus);
    cancelAnimationFrame(frame);
    root.style.scrollPaddingTop = "";
    root.style.scrollPaddingBottom = "";
  };
}

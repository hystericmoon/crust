/**
 * Tooltips for icon-only buttons in the builder: Puck's action bar (Select
 * parent, Duplicate, Delete, the move buttons), the section toolbar's style
 * dots, and icon buttons in the panels.
 *
 * Puck only sets a native `title`, which shows late, only on hover, and never
 * for keyboard users. These show on hover (after a short delay) and right
 * away on keyboard focus, stay while the pointer is over the button or the
 * tooltip, and close with Escape (WCAG 1.4.13).
 */

const TARGET = "button, [role='radio']";
const HOVER_DELAY = 300;

/** The text to show for an element, or null when it already shows its name. */
export function tipFor(el: Element): string | null {
  const tip = el.getAttribute("data-tip") ?? el.getAttribute("title");
  if (tip?.trim()) return tip.trim();
  // Icon-only: an accessible name but no visible text.
  const label = el.getAttribute("aria-label");
  if (label?.trim() && !el.textContent?.trim()) return label.trim();
  return null;
}

/** Installs tooltips on a document (the main page or the canvas iframe); returns the uninstaller. */
export function installTooltips(doc: Document): () => void {
  const tip = doc.createElement("div");
  tip.className = "crust-tooltip";
  tip.setAttribute("role", "tooltip");
  tip.id = "crust-tooltip";
  tip.hidden = true;
  doc.body.appendChild(tip);

  let owner: HTMLElement | null = null;
  // Focus from the keyboard shows a tooltip; a mouse click also focuses the button, and shouldn't.
  let keyboard = true;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const asElement = (t: EventTarget | null): Element | null =>
    t && typeof (t as Element).closest === "function" ? (t as Element) : null;

  const findTarget = (t: EventTarget | null): HTMLElement | null => {
    const el = asElement(t)?.closest<HTMLElement>(TARGET) ?? null;
    if (!el || el === (tip as Element)) return null;
    // Move a native title into data-tip, so the browser's own tooltip doesn't show twice.
    const title = el.getAttribute("title");
    if (title) {
      el.setAttribute("data-tip", title);
      el.removeAttribute("title");
      if (!el.getAttribute("aria-label") && !el.textContent?.trim()) el.setAttribute("aria-label", title);
    }
    return tipFor(el) ? el : null;
  };

  const show = (el: HTMLElement) => {
    clearTimeout(timer);
    owner = el;
    tip.textContent = tipFor(el);
    tip.hidden = false;
    tip.style.transform = "";
    const view = doc.defaultView;
    // The canvas iframe is shown zoomed out; undo that so the tooltip reads at normal size.
    const frame = view?.frameElement as HTMLElement | null | undefined;
    const zoom = frame && view ? frame.getBoundingClientRect().width / view.innerWidth || 1 : 1;
    const inv = zoom > 0 && zoom < 1 ? 1 / zoom : 1;
    const r = el.getBoundingClientRect();
    const width = view?.innerWidth ?? 1024;
    const box = tip.getBoundingClientRect();
    const [w, h] = [box.width * inv, box.height * inv];
    // Below the button; above it when there's no room.
    const gap = 6 * inv;
    const below = r.bottom + gap + h <= (view?.innerHeight ?? 768);
    tip.style.top = `${below ? r.bottom + gap : r.top - gap - h}px`;
    tip.style.left = `${Math.max(4, Math.min(r.left + r.width / 2 - w / 2, width - w - 4))}px`;
    tip.style.transformOrigin = "top left";
    if (inv !== 1) tip.style.transform = `scale(${inv})`;
  };
  const hide = () => {
    clearTimeout(timer);
    owner = null;
    tip.hidden = true;
  };

  const onOver = (e: Event) => {
    const el = findTarget(e.target);
    if (!el || el === owner) return;
    clearTimeout(timer);
    timer = setTimeout(() => show(el), HOVER_DELAY);
  };
  const onOut = (e: Event) => {
    const to = (e as PointerEvent).relatedTarget as Node | null;
    // Staying on the button or moving onto the tooltip keeps it open.
    if (to && (tip.contains(to) || owner?.contains(to))) return;
    if (asElement(e.target)?.closest(TARGET) === owner || !owner) hide();
  };
  const onFocus = (e: Event) => {
    const el = findTarget(e.target);
    if (el && keyboard) show(el);
    else hide();
  };
  const onKey = (e: Event) => {
    keyboard = true;
    if ((e as KeyboardEvent).key === "Escape" && !tip.hidden) {
      // Only close the tooltip; a second Escape does the usual thing (deselect, close).
      e.stopImmediatePropagation();
      e.preventDefault();
      hide();
    }
  };
  const onLeaveTip = (e: Event) => {
    const to = (e as PointerEvent).relatedTarget as Node | null;
    if (!to || !owner?.contains(to)) hide();
  };

  doc.addEventListener("pointerover", onOver);
  doc.addEventListener("pointerout", onOut);
  doc.addEventListener("focusin", onFocus);
  doc.addEventListener("focusout", hide);
  const onDown = () => {
    keyboard = false;
    hide();
  };
  doc.addEventListener("pointerdown", onDown);
  doc.addEventListener("keydown", onKey, true);
  tip.addEventListener("pointerleave", onLeaveTip);
  doc.defaultView?.addEventListener("scroll", hide, true);

  return () => {
    hide();
    doc.removeEventListener("pointerover", onOver);
    doc.removeEventListener("pointerout", onOut);
    doc.removeEventListener("focusin", onFocus);
    doc.removeEventListener("focusout", hide);
    doc.removeEventListener("pointerdown", onDown);
    doc.removeEventListener("keydown", onKey, true);
    doc.defaultView?.removeEventListener("scroll", hide, true);
    tip.remove();
  };
}

/** F095: the faint spotlight that follows the cursor over cards. It only sets two CSS variables; app-look.css draws it. */
export const SPOTLIGHT_CARDS = ".lg-card, .tp-card";

/** Starts following the cursor once. Does nothing when the visitor asked for less motion. Returns a function that stops it. */
export function installSpotlight(doc: Document = document): () => void {
  const win = doc.defaultView;
  if (!win || win.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return () => undefined;
  const move = (e: PointerEvent): void => {
    const target = e.target;
    if (!(target instanceof win.Element)) return;
    const card = target.closest<HTMLElement>(SPOTLIGHT_CARDS);
    if (!card) return;
    const box = card.getBoundingClientRect();
    card.style.setProperty("--mx", `${Math.round(e.clientX - box.left)}px`);
    card.style.setProperty("--my", `${Math.round(e.clientY - box.top)}px`);
  };
  doc.addEventListener("pointermove", move, { passive: true });
  return () => doc.removeEventListener("pointermove", move);
}

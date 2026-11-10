/**
 * F093: spoken drag status. The drag library announces "Picked up draggable
 * item Hero-3f2a9c" and marks items with aria-grabbed (retired, and screen
 * readers ignore it). We turn its announcements into plain words (the block's
 * name, where it is) and read them in our own polite live region, and switch
 * the library's own region off so nothing is said twice.
 */

/** A readable name for what a drag id points at: a block ("Hero"), a place ("the page", "inside Columns"). */
export type NameOf = (id: string) => string;

const PICKED = /^Picked up draggable item (.+)\.$/;
const OVER = /^Draggable item (.+) was moved over droppable target (.+)\.$/;
const AWAY = /^Draggable item (.+) is no longer over a droppable target\.$/;
const CANCELLED = /^Dragging was cancelled\. Draggable item (.+) was dropped\.$/;
const DROPPED_ON = /^Draggable item (.+) was dropped over droppable target (.+)$/;
const DROPPED = /^Draggable item (.+) was dropped\.$/;

/** The sentence to say for one library announcement; null when it isn't one we know. */
export function spokenDrag(raw: string, name: NameOf): string | null {
  const nameOf = (id: string | undefined) => name(id ?? "");
  let m: RegExpExecArray | null;
  if ((m = PICKED.exec(raw))) return `Picked up ${nameOf(m[1])}. Use the arrow keys to move it, Space to drop it, Escape to cancel.`;
  if ((m = OVER.exec(raw))) return `${nameOf(m[1])} is over ${nameOf(m[2])}.`;
  if ((m = AWAY.exec(raw))) return `${nameOf(m[1])} is not over a place it can go.`;
  if ((m = CANCELLED.exec(raw))) return `Cancelled. ${nameOf(m[1])} stays where it was.`;
  if ((m = DROPPED_ON.exec(raw))) return `Dropped ${nameOf(m[1])} in ${nameOf(m[2])}.`;
  if ((m = DROPPED.exec(raw))) return `Dropped ${nameOf(m[1])}.`;
  return null;
}

/**
 * Watches the library's announcement region in `doc`, says each one in plain
 * words through `say`, and returns the uninstaller.
 */
export function installDragStatus(doc: Document, nameOf: NameOf, say: (text: string) => void): () => void {
  const view = doc.defaultView;
  if (!view?.MutationObserver) return () => undefined;
  let last = "";
  const region = () => doc.querySelector<HTMLElement>("[id^='dnd-kit-announcement']");
  const read = () => {
    const el = region();
    if (!el) return;
    if (el.getAttribute("aria-live") !== "off") el.setAttribute("aria-live", "off");
    const raw = el.textContent ?? "";
    if (!raw || raw === last) return;
    last = raw;
    const text = spokenDrag(raw, nameOf);
    if (text) say(text);
  };
  const observer = new view.MutationObserver(read);
  observer.observe(doc.body, { childList: true, subtree: true, characterData: true });
  read();
  return () => observer.disconnect();
}

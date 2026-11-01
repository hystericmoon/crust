/**
 * Keyboard editing for the builder (F005). Every drag action has a key:
 *
 *   Enter            select the focused block (fields open on the right)
 *   Alt+↑ / Alt+↓    move the block up / down
 *   Alt+←            move it out of its section or column
 *   Alt+→            move it into the section or columns above it
 *   Alt+Shift+← / →  move it to the previous / next column
 *   Enter on a block in the list   add it after the selected block
 *   Escape           deselect
 *   ?                keyboard help
 *
 * The same moves are buttons on the selected block's action bar. Results are
 * announced in a polite live region.
 */
import { ActionBar, createUsePuck, useGetPuck, type ComponentData, type Config, type Data } from "@puckeditor/core";
import { useEffect, useRef, useSyncExternalStore, type ReactNode } from "react";
import { SaveLayoutAction } from "../layouts/SaveLayoutAction";
import { MakeLinkedAction } from "../linked/fields";
import { SectionToolbar } from "../sections/editing";
import { availableMoves, planInsert, planMove, type MoveKind } from "./moves";
import { installPuckChromeFixes } from "./puck-chrome";
import { installTooltips } from "./tooltips";

type PuckApi = ReturnType<ReturnType<typeof useGetPuck>>;
const usePuckSelector = createUsePuck();

// --- Announcements --------------------------------------------------------

let message = "";
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
export function announce(text: string) {
  // Clear first so the same text twice is still read out.
  message = "";
  emit();
  setTimeout(() => {
    message = text;
    emit();
  }, 50);
}
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

// --- Help dialog ----------------------------------------------------------

let helpOpener: (() => void) | null = null;
export const openKeyboardHelp = () => helpOpener?.();

const shortcuts: [string, string][] = [
  ["Tab", "Move between blocks on the page"],
  ["Enter", "Select the block and edit it in the panel on the right"],
  ["Alt + ↑ / ↓", "Move the block up or down"],
  ["Alt + ←", "Move the block out of its section or column"],
  ["Alt + →", "Move the block into the section or columns above it"],
  ["Alt + Shift + ← / →", "Move the block to the previous or next column"],
  ["Enter", "In the block list: add that block after the selected one (or at the end of the last section)"],
  ["Layouts", "Top-bar button: add a designed section or a whole page after the selected section (or at the end)"],
  ["Escape", "Deselect"],
  ["?", "Show these shortcuts"],
];

function KeyboardHelp() {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    helpOpener = () => ref.current?.showModal();
    return () => {
      helpOpener = null;
    };
  }, []);
  return (
    <dialog ref={ref} className="kb-help" aria-labelledby="kb-help-title">
      <h2 id="kb-help-title">Keyboard shortcuts</h2>
      <p>On a Mac, Alt is the Option key. The same moves are buttons on the selected block.</p>
      <table>
        <tbody>
          {shortcuts.map(([keys, what]) => (
            <tr key={keys + what}>
              <th scope="row">
                <kbd>{keys}</kbd>
              </th>
              <td>{what}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <form method="dialog">
        <button className="kb-help-close" autoFocus>
          Close
        </button>
      </form>
    </dialog>
  );
}

// --- Actions ----------------------------------------------------------------

let canvasDoc: Document | null = null;

const labelOf = (config: Config, item: ComponentData) => config.components[item.type]?.label ?? item.type;

export function focusBlock(id: string) {
  // Wait for Puck to re-render the canvas before moving focus back.
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      const el = canvasDoc?.querySelector<HTMLElement>(`[data-puck-component="${CSS.escape(id)}"]`);
      el?.focus({ preventScroll: false });
      el?.scrollIntoView({ block: "nearest" });
    }),
  );
}

/**
 * "Skip to page" (F069, WCAG 2.4.1): straight to the first block on the
 * canvas, past the top bar and the block list (33 Tab presses before).
 * An empty page focuses the canvas itself.
 */
export function skipToPage(): boolean {
  const first = canvasDoc?.querySelector<HTMLElement>("[data-puck-component]");
  if (first) {
    first.focus();
    first.scrollIntoView({ block: "nearest" });
    return true;
  }
  const frame = document.querySelector<HTMLIFrameElement>("iframe#preview-frame");
  frame?.focus();
  return !!frame;
}

/** Takes the getter, not a snapshot: right after a move the snapshot's positions are stale. */
export function select(getPuck: () => PuckApi, id: string | null) {
  const puck = getPuck();
  puck.dispatch({ type: "setUi", ui: { itemSelector: id ? (puck.getSelectorForId(id) ?? null) : null } });
}

const moveNames: Record<MoveKind, string> = {
  up: "up",
  down: "down",
  out: "out of its container",
  into: "into the block above",
  prevSlot: "to the previous column",
  nextSlot: "to the next column",
};

export function runMove(getPuck: () => PuckApi, id: string, kind: MoveKind) {
  const puck = getPuck();
  const data = puck.appState.data as Data;
  const plan = planMove(data, puck.config, id, kind);
  const item = puck.getItemById(id);
  if (!plan) {
    if (item) announce(`${labelOf(puck.config, item)} can't move ${moveNames[kind]} from here.`);
    return;
  }
  puck.dispatch(plan.action);
  select(getPuck, id);
  focusBlock(id);
  announce(plan.announcement);
}

function runInsert(getPuck: () => PuckApi, type: string) {
  const puck = getPuck();
  const selected = puck.selectedItem?.props.id as string | undefined;
  const newId = `${type}-${crypto.randomUUID()}`;
  const plan = planInsert(puck.appState.data as Data, puck.config, type, selected ?? null, newId);
  if (!plan) return;
  puck.dispatch(plan.action);
  select(getPuck, newId);
  focusBlock(newId);
  announce(plan.announcement);
}

// Canvas nodes come from the iframe's own window, so `instanceof Element`
// is false for them; check for the method instead.
const asElement = (t: EventTarget | null): Element | null =>
  t && typeof (t as Element).closest === "function" ? (t as Element) : null;

const isTyping = (t: EventTarget | null) =>
  asElement(t)?.closest("input, textarea, select, [contenteditable=''], [contenteditable='true']") != null;

const arrowMoves: Record<string, [MoveKind, MoveKind | null]> = {
  ArrowUp: ["up", null],
  ArrowDown: ["down", null],
  ArrowLeft: ["out", "prevSlot"],
  ArrowRight: ["into", "nextSlot"],
};

/** One handler for the main page and the canvas iframe. */
export function handleKey(e: KeyboardEvent, getPuck: () => PuckApi) {
  if (e.defaultPrevented || isTyping(e.target)) return;
  const target = asElement(e.target);
  const puck = getPuck();

  // Add a block from the list.
  const drawerItem = target?.closest<HTMLElement>("[data-puck-drawer-item]");
  if (drawerItem && (e.key === "Enter" || e.key === " ")) {
    const type = drawerItem.dataset.testid?.replace(/^drawer-item:/, "");
    if (type) {
      e.preventDefault();
      e.stopPropagation();
      runInsert(getPuck, type);
    }
    return;
  }

  if (e.key === "?" && !e.altKey && !e.ctrlKey && !e.metaKey) {
    e.preventDefault();
    openKeyboardHelp();
    return;
  }

  const block = target?.closest<HTMLElement>("[data-puck-component]");
  const focusedId = block?.dataset.puckComponent;

  if (e.key === "Enter" && block && target === block) {
    e.preventDefault();
    select(getPuck, focusedId!);
    const item = puck.getItemById(focusedId!);
    if (item) announce(`${labelOf(puck.config, item)} selected. Edit it in the panel on the right; Alt and the arrow keys move it.`);
    return;
  }

  if (e.key === "Escape" && puck.selectedItem && !target?.closest("dialog")) {
    select(getPuck, null);
    announce("Nothing selected.");
    return;
  }

  const arrow = arrowMoves[e.key];
  if (arrow && e.altKey && !e.ctrlKey && !e.metaKey) {
    const id = focusedId ?? (puck.selectedItem?.props.id as string | undefined);
    if (!id) return;
    const kind = e.shiftKey ? arrow[1] : arrow[0];
    if (!kind) return;
    e.preventDefault();
    e.stopPropagation();
    runMove(getPuck, id, kind);
  }
}

// --- Screen-reader labels on canvas blocks --------------------------------

const HELP_ID = "crust-block-help";

function summary(item: ComponentData): string {
  const text = ["text", "title", "label", "alt"].map((k) => item.props[k]).find((v) => typeof v === "string" && v.trim());
  if (typeof text !== "string") return "";
  const one = text.replace(/\s+/g, " ").trim();
  return one.length > 50 ? `${one.slice(0, 49)}…` : one;
}

function labelBlocks(doc: Document, puck: PuckApi) {
  if (!doc.getElementById(HELP_ID)) {
    const help = doc.createElement("p");
    help.id = HELP_ID;
    help.hidden = true;
    help.textContent = "Enter to select and edit. Alt and arrow keys to move. Question mark for all shortcuts.";
    doc.body.appendChild(help);
  }
  const set = (el: Element, name: string, value: string) => {
    if (el.getAttribute(name) !== value) el.setAttribute(name, value);
  };
  for (const el of doc.querySelectorAll<HTMLElement>("[data-puck-component]")) {
    const item = puck.getItemById(el.dataset.puckComponent ?? "");
    if (!item) continue;
    const text = summary(item);
    set(el, "aria-label", text ? `${labelOf(puck.config, item)}: ${text}` : labelOf(puck.config, item));
    set(el, "aria-roledescription", "block");
    set(el, "aria-describedby", HELP_ID);
    set(el, "aria-keyshortcuts", "Enter Alt+ArrowUp Alt+ArrowDown Alt+ArrowLeft Alt+ArrowRight");
  }
}

// --- Puck overrides ---------------------------------------------------------

/** overrides.puck: listens on the main page and hosts the live region and help. */
export function KeyboardRoot({ children }: { children: ReactNode }) {
  const getPuck = useGetPuck();
  const live = useSyncExternalStore(subscribe, () => message);
  useEffect(() => {
    // Tooltips first, so Escape closes an open tooltip before it deselects.
    const removeTooltips = installTooltips(document);
    const removeChromeFixes = installPuckChromeFixes(document);
    const onKey = (e: KeyboardEvent) => handleKey(e, getPuck);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      removeChromeFixes();
      removeTooltips();
    };
  }, [getPuck]);
  return (
    <>
      <a
        className="kb-skip"
        href="#preview-frame"
        onClick={(e) => {
          e.preventDefault();
          skipToPage();
        }}
      >
        Skip to page
      </a>
      {children}
      <div className="kb-live" role="status" aria-live="polite">
        {live}
      </div>
      <KeyboardHelp />
    </>
  );
}

/** overrides.iframe: the canvas lives in its own document. */
export function KeyboardCanvas({ children, document: doc }: { children: ReactNode; document?: Document }) {
  const getPuck = useGetPuck();
  useEffect(() => {
    if (!doc) return;
    canvasDoc = doc;
    const removeTooltips = installTooltips(doc);
    const onKey = (e: KeyboardEvent) => handleKey(e, getPuck);
    doc.addEventListener("keydown", onKey, true);
    let frame = 0;
    const relabel = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => labelBlocks(doc, getPuck()));
    };
    const observer = new MutationObserver(relabel);
    observer.observe(doc.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["aria-roledescription", "aria-describedby"] });
    relabel();
    return () => {
      doc.removeEventListener("keydown", onKey, true);
      removeTooltips();
      observer.disconnect();
      cancelAnimationFrame(frame);
      if (canvasDoc === doc) canvasDoc = null;
    };
  }, [doc, getPuck]);
  return <>{children}</>;
}

const icons: Record<MoveKind, string> = {
  up: "M12 19V5M6 11l6-6 6 6",
  down: "M12 5v14M6 13l6 6 6-6",
  out: "M9 6l-6 6 6 6M3 12h12M21 4v16",
  into: "M15 6l6 6-6 6M21 12H9M3 4v16",
  prevSlot: "M10 6l-6 6 6 6M4 12h16",
  nextSlot: "M14 6l6 6-6 6M20 12H4",
};
const actionLabels: Record<MoveKind, string> = {
  up: "Move up (Alt+↑)",
  down: "Move down (Alt+↓)",
  out: "Move out of container (Alt+←)",
  into: "Move into block above (Alt+→)",
  prevSlot: "Move to previous column (Alt+Shift+←)",
  nextSlot: "Move to next column (Alt+Shift+→)",
};

/** overrides.actionBar: Puck's bar plus the keyboard moves as labelled buttons. */
export function KeyboardActionBar({
  label,
  children,
  parentAction,
}: {
  label?: string;
  children: ReactNode;
  parentAction: ReactNode;
}) {
  const getPuck = useGetPuck();
  // Subscribe, so the buttons update after each move.
  const data = usePuckSelector((s) => s.appState.data) as Data;
  const config = usePuckSelector((s) => s.config);
  const id = usePuckSelector((s) => s.selectedItem?.props.id) as string | undefined;
  const moves = id ? availableMoves(data, config, id) : [];
  return (
    <ActionBar>
      <ActionBar.Group>
        {parentAction}
        {label ? <ActionBar.Label label={label} /> : null}
      </ActionBar.Group>
      {moves.length ? (
        <ActionBar.Group>
          {moves.map((kind) => (
            <ActionBar.Action key={kind} label={actionLabels[kind]} aria-label={actionLabels[kind]} onClick={() => runMove(getPuck, id!, kind)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
                <path d={icons[kind]} />
              </svg>
            </ActionBar.Action>
          ))}
        </ActionBar.Group>
      ) : null}
      <ActionBar.Group>{children}</ActionBar.Group>
      {/* F025: style, height and image for a selected Section. */}
      <SectionToolbar />
      {/* F027: keep this section to reuse from the layout library. */}
      <SaveLayoutAction />
      {/* F043: show it on many pages, edited in one place. */}
      <MakeLinkedAction />
    </ActionBar>
  );
}

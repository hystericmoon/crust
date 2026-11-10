/**
 * F090 Type on the page (direction A of design/f090-inline-text-v1.html):
 * click a heading or a text block on the canvas and type right there, with
 * a small bar floating above it. Escape (or Done, or clicking elsewhere)
 * leaves. The words go through the same undoable step as the side panel,
 * so undo works the same whichever way they were typed. The page file's
 * shape does not change.
 *
 * Keyboard: select the block, then Enter (or the "Type on the page" button
 * in the block's bar); Escape leaves and puts focus back on the block.
 */
import type { Components } from "@crust/blocks";
import { createUsePuck, useGetPuck, type ComponentData, type Config } from "@puckeditor/core";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ClipboardEvent, type KeyboardEvent, type ReactNode } from "react";
import { RichTextEditor } from "../rich-text/RichTextEditor";
import { startInlineEdit, stopInlineEdit, useEditingId } from "./store";
import "./inline-text.css";

type Getter = ReturnType<typeof useGetPuck>;
const usePuckSelector = createUsePuck();

/** Changes some props of one block in a single undoable step. */
export function patchBlock(getPuck: Getter, id: string, patch: Record<string, unknown>) {
  const puck = getPuck();
  const item = puck.getItemById(id) as ComponentData | undefined;
  const selector = puck.getSelectorForId(id);
  if (!item || !selector) return;
  puck.dispatch({
    type: "replace",
    destinationIndex: selector.index,
    destinationZone: selector.zone,
    data: { ...item, props: { ...item.props, ...patch } },
  });
}

const isElement = (t: EventTarget | null): t is Element => !!t && typeof (t as Element).closest === "function";

/**
 * Puck switches off pointer events on everything inside a block (`[data-puck-component] *`), so a real click
 * lands on the block's wrapper, never on the words. The click is therefore listened for on the page, in the
 * capture phase (the wrapper does not pass it on), and matched to the block's wrapper when it comes.
 * It waits a tick so Puck has selected the block first (typing ends when another block is the selected one).
 */
function useClickToType(id: string) {
  return useCallback(
    (hit: HTMLElement | null) => {
      const doc = hit?.ownerDocument;
      if (!hit || !doc) return;
      const onClick = (e: MouseEvent) => {
        if (!isElement(e.target) || e.target.closest("[data-puck-overlay-portal], [data-inline-editing]")) return;
        const wrapper = hit.closest("[data-puck-component]");
        if (wrapper && wrapper.contains(e.target)) setTimeout(() => startInlineEdit(id), 0);
      };
      doc.addEventListener("click", onClick, true);
      return () => doc.removeEventListener("click", onClick, true);
    },
    [id],
  );
}

/** Where focus goes when typing ends: the block itself, so the keyboard carries on from there. */
function focusBlockSoon(id: string, from: Element | null) {
  const doc = from?.ownerDocument;
  requestAnimationFrame(() => doc?.querySelector<HTMLElement>(`[data-puck-component="${CSS.escape(id)}"]`)?.focus({ preventScroll: true }));
}

/** The frame around the block while it's being typed in: leaves on Escape, on a click elsewhere, or when another block is picked. */
function EditFrame({ id, rich, bar, children }: { id: string; rich?: boolean; bar: (done: () => void) => ReactNode; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [below, setBelow] = useState(false);
  const selected = usePuckSelector((s) => (s.selectedItem?.props.id as string | undefined) ?? null);

  const done = useCallback(() => {
    focusBlockSoon(id, ref.current);
    stopInlineEdit();
  }, [id]);

  // A bar that would be cut off at the top of the canvas drops below the text instead.
  useLayoutEffect(() => {
    const el = ref.current;
    if (el) setBelow(el.getBoundingClientRect().top < 64);
  }, []);

  useEffect(() => {
    if (selected !== id) stopInlineEdit();
  }, [selected, id]);

  useEffect(() => {
    const doc = ref.current?.ownerDocument;
    if (!doc) return;
    const onDown = (e: Event) => {
      if (isElement(e.target) && !ref.current?.contains(e.target)) stopInlineEdit();
    };
    doc.addEventListener("pointerdown", onDown, true);
    return () => doc.removeEventListener("pointerdown", onDown, true);
  }, []);

  const onKeyDown = (e: KeyboardEvent) => {
    // Shortcuts typed here belong to the text: Puck's own undo would otherwise undo the page.
    if ((e.metaKey || e.ctrlKey) && !["Meta", "Control", "Shift", "Alt"].includes(e.key)) e.stopPropagation();
    if (e.key === "Escape" && !e.defaultPrevented) {
      e.preventDefault();
      e.stopPropagation();
      done();
    }
  };
  // Dragging to select words must not pick the block up.
  const stop = (e: { stopPropagation: () => void }) => e.stopPropagation();
  return (
    <div
      ref={ref}
      className={`it-frame${below ? " is-below" : ""}${rich ? " it-rich" : ""}`}
      data-inline-editing=""
      onKeyDown={onKeyDown}
      onPointerDown={stop}
      onMouseDown={stop}
      onTouchStart={stop}
      onClick={stop}
    >
      <div className="it-bar-slot">{bar(done)}</div>
      {children}
    </div>
  );
}

function DoneButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="it-btn it-done" onClick={onClick}>
      Done
    </button>
  );
}

// --- Heading ---------------------------------------------------------------------------

const levels = ["h1", "h2", "h3", "h4"] as const;

/** One line of plain words, typed in place. */
function PlainEditable({ value, label, onChange, onEnter }: { value: string; label: string; onChange: (v: string) => void; onEnter: () => void }) {
  const ref = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.textContent = value;
    el.focus();
    const sel = el.ownerDocument.getSelection();
    if (sel) {
      const range = el.ownerDocument.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // Undo or another way of typing changed the words while this is open.
  useEffect(() => {
    const el = ref.current;
    if (el && el.textContent !== value && el.ownerDocument.activeElement !== el) el.textContent = value;
  }, [value]);
  const read = () => (ref.current?.textContent ?? "").replace(/\s*\n\s*/g, " ");
  const onPaste = (e: ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain").replace(/\s*\n\s*/g, " ");
    ref.current?.ownerDocument.execCommand("insertText", false, text);
  };
  return (
    <span
      ref={ref}
      className="it-plain"
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      aria-label={label}
      aria-multiline="false"
      spellCheck
      onInput={() => onChange(read())}
      onPaste={onPaste}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          e.stopPropagation();
          onEnter();
        }
      }}
    />
  );
}

/** The heading's own markup (as in packages/blocks Heading), with the words replaced by the text box. */
function EditingHeading({ props, level, children }: { props: Record<string, any>; level: string; children: ReactNode }) { // eslint-disable-line @typescript-eslint/no-explicit-any
  const Tag = level as "h1" | "h2" | "h3" | "h4";
  const display = props.size === "display" ? " cr-display" : "";
  const label = typeof props.eyebrow === "string" ? props.eyebrow.trim() : "";
  const heading = <Tag className={`cr-heading cr-${Tag}${display} cr-align-${props.align}`}>{children}</Tag>;
  if (!label) return heading;
  return (
    <hgroup className={`cr-hgroup cr-align-${props.align}`}>
      <p className="cr-eyebrow">{label}</p>
      {heading}
    </hgroup>
  );
}

type Render = (props: any) => ReactNode; // eslint-disable-line @typescript-eslint/no-explicit-any

function InlineHeading({ base, props }: { base: Render; props: Record<string, any> }) { // eslint-disable-line @typescript-eslint/no-explicit-any
  const getPuck = useGetPuck();
  const current = useEditingId();
  const id = props.id as string;
  const hitRef = useClickToType(id);
  const editing = props.puck?.isEditing && current === id;
  if (!props.puck?.isEditing) return <>{base(props)}</>;
  if (!editing) {
    return (
      <div ref={hitRef} className="it-hit" data-inline-type="Heading" onClick={() => startInlineEdit(id)}>
        {base(props)}
      </div>
    );
  }
  const level = (levels as readonly string[]).includes(props.level) ? props.level : "h2";
  const set = (patch: Record<string, unknown>) => patchBlock(getPuck, id, patch);
  return (
    <EditFrame
      id={id}
      bar={(done) => (
        <div className="it-bar" role="toolbar" aria-label="Heading options">
          <span className="it-bar-label" id={`${id}-lv`}>
            Level
          </span>
          <span role="group" aria-labelledby={`${id}-lv`} className="it-levels">
            {levels.map((l) => (
              <button key={l} type="button" className="it-btn it-level" aria-pressed={l === level} onClick={() => set({ level: l })}>
                {l.toUpperCase()}
              </button>
            ))}
          </span>
          <DoneButton onClick={done} />
        </div>
      )}
    >
      <EditingHeading props={props} level={level}>
        <PlainEditable value={String(props.text ?? "")} label="Heading text" onChange={(v) => set({ text: v })} onEnter={() => { focusBlockSoon(id, null); stopInlineEdit(); }} />
      </EditingHeading>
    </EditFrame>
  );
}

// --- Text ------------------------------------------------------------------------------

function InlineTextBlock({ base, props }: { base: Render; props: Record<string, any> }) { // eslint-disable-line @typescript-eslint/no-explicit-any
  const getPuck = useGetPuck();
  const current = useEditingId();
  const id = props.id as string;
  const hitRef = useClickToType(id);
  if (!props.puck?.isEditing) return <>{base(props)}</>;
  if (current !== id) {
    return (
      <div ref={hitRef} className="it-hit" data-inline-type="Text" onClick={() => startInlineEdit(id)}>
        {base(props)}
      </div>
    );
  }
  return (
    <EditFrame id={id} rich bar={(done) => <DoneButton onClick={done} />}>
      <div className={`cr-text cr-rich cr-align-${props.align} cr-tone-${props.tone}`}>
        <RichTextEditor floating autoFocus label="Text" value={props.text} onChange={(v) => patchBlock(getPuck, id, { text: v })} />
      </div>
    </EditFrame>
  );
}

/** The builder's config: Heading and Text can be typed in on the page. */
export function withInlineText(config: Config<Components>): Config<Components> {
  const heading = config.components.Heading;
  const text = config.components.Text;
  const headingRender = heading.render as Render;
  const textRender = text.render as Render;
  return {
    ...config,
    components: {
      ...config.components,
      Heading: { ...heading, render: (props: any) => <InlineHeading base={headingRender} props={props} /> }, // eslint-disable-line @typescript-eslint/no-explicit-any
      Text: { ...text, render: (props: any) => <InlineTextBlock base={textRender} props={props} /> }, // eslint-disable-line @typescript-eslint/no-explicit-any
    },
  } as Config<Components>;
}

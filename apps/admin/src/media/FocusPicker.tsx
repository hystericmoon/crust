/**
 * F081: a photo's focal point, picked in the media library (design snapshot
 * option A, design/f081-images-v1.html). Press the part of the photo that
 * must stay in view; arrow keys move the point (Shift: further). Three small
 * crops show what a wide, square and tall block will keep.
 *
 * Also `MediaFocusProvider`: gives the builder's canvas the library's focal
 * points, so its crops match the published page.
 */
import { MediaFocusContext, mediaSrc, type MediaItem } from "@crust/blocks";
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { loadMedia, useMedia } from "./store";

export interface Focus {
  x: number;
  y: number;
}

export const CENTRE: Focus = { x: 50, y: 50 };
const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)));
export const sameFocus = (a: Focus | null | undefined, b: Focus | null | undefined) => (a ?? CENTRE).x === (b ?? CENTRE).x && (a ?? CENTRE).y === (b ?? CENTRE).y;

/** "18% from the left, 45% from the top", or "the middle". */
export function describeFocus(f: Focus): string {
  if (f.x === 50 && f.y === 50) return "the middle";
  return `${f.x}% from the left, ${f.y}% from the top`;
}

/** Where an arrow key moves the point; null for other keys. */
export function movedFocus(f: Focus, key: string, far: boolean): Focus | null {
  const step = far ? 20 : 5;
  const by: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
  const d = by[key];
  return d ? { x: clamp(f.x + d[0]), y: clamp(f.y + d[1]) } : null;
}

export function FocusPicker({ item, focus, onChange }: { item: MediaItem; focus: Focus; onChange: (f: Focus) => void }) {
  const id = useId();
  const img = useRef<HTMLImageElement>(null);
  const pressed = useRef(false);
  const [said, setSaid] = useState("");
  const position = `${focus.x}% ${focus.y}%`;

  const at = (e: PointerEvent) => {
    const r = img.current?.getBoundingClientRect();
    if (!r || !r.width || !r.height) return;
    onChange({ x: clamp(((e.clientX - r.left) / r.width) * 100), y: clamp(((e.clientY - r.top) / r.height) * 100) });
  };
  const onKey = (e: KeyboardEvent) => {
    const next = movedFocus(focus, e.key, e.shiftKey);
    if (!next) return;
    e.preventDefault();
    onChange(next);
    // Read out where it went; the label alone isn't re-read while focused.
    setSaid(`Focal point at ${describeFocus(next)}.`);
  };

  return (
    <div className="mp-field">
      <span className="mp-label" id={`${id}-label`}>
        Focal point
      </span>
      <div
        className="mp-focus"
        tabIndex={0}
        role="application"
        aria-roledescription="focal point picker"
        aria-label={`Focal point: ${describeFocus(focus)}`}
        aria-describedby={`${id}-hint`}
        onKeyDown={onKey}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          pressed.current = true;
          e.currentTarget.setPointerCapture?.(e.pointerId);
          at(e);
        }}
        onPointerMove={(e) => pressed.current && at(e)}
        onPointerUp={() => (pressed.current = false)}
        onPointerCancel={() => (pressed.current = false)}
      >
        <img ref={img} className="mp-preview" src={mediaSrc(item.file)} alt="" draggable={false} />
        <span className="mp-dot" style={{ left: `${focus.x}%`, top: `${focus.y}%` }} aria-hidden="true" />
      </div>
      <p className="mp-hint" id={`${id}-hint`}>
        Press the part that must stay in view when a block crops the photo. Arrow keys move the point; Shift moves it further.
      </p>
      <div className="mp-crops" aria-hidden="true">
        {(["wide", "square", "tall"] as const).map((shape) => (
          <span key={shape} className="mp-crop">
            <img className={`mp-crop-${shape}`} src={mediaSrc(item.file)} alt="" style={{ objectPosition: position }} draggable={false} />
            <span>{shape === "wide" ? "Wide" : shape === "square" ? "Square" : "Tall"}</span>
          </span>
        ))}
      </div>
      <div className="mp-actions">
        <button type="button" className="mp-button" disabled={sameFocus(focus, CENTRE)} onClick={() => onChange(CENTRE)}>
          Centre
        </button>
      </div>
      <p className="mp-sr" aria-live="polite">
        {said}
      </p>
    </div>
  );
}

/** Gives the canvas every library photo's focal point (loads the library once). */
export function MediaFocusProvider({ children }: { children: ReactNode }) {
  const media = useMedia();
  useEffect(() => {
    void loadMedia();
  }, []);
  const focuses = useMemo(() => new Map(media.items.flatMap((m) => (m.focus ? [[m.file, m.focus] as const] : []))), [media.items]);
  return <MediaFocusContext.Provider value={focuses}>{children}</MediaFocusContext.Provider>;
}

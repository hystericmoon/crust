/**
 * The grid of photos, shared by the "Choose an image" dialog and the Media
 * panel in the rail. One tab stop for the whole grid; arrow keys, Home and
 * End move between photos (radio group pattern).
 */
import { mediaSrc, type MediaItem } from "@crust/blocks";
import type { KeyboardEvent, RefObject } from "react";

/** Columns in a CSS grid, for arrow keys up and down. */
const columnsOf = (el: HTMLElement | null) => (el ? getComputedStyle(el).gridTemplateColumns.split(" ").filter(Boolean).length || 1 : 1);

export function PhotoGrid({
  items,
  selected,
  gridRef,
  onSelect,
  onEnter,
  onActivate,
}: {
  items: MediaItem[];
  selected: string | null;
  gridRef: RefObject<HTMLDivElement | null>;
  /** `focus` is true when an arrow key moved here, so focus should follow. */
  onSelect: (file: string, focus?: boolean) => void;
  /** Enter on a picked photo. */
  onEnter?: () => void;
  /** Double click on a photo that has alt text. */
  onActivate?: () => void;
}) {
  const onGridKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = items.findIndex((p) => p.file === selected);
    const cols = columnsOf(gridRef.current);
    const step: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: cols, ArrowUp: -cols };
    let next: number | null = null;
    // With nothing picked yet, any arrow picks the photo that has focus (the first).
    if (e.key in step) next = i < 0 ? 0 : Math.min(items.length - 1, Math.max(0, i + step[e.key]!));
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = items.length - 1;
    else if (e.key === "Enter" && selected && onEnter) {
      e.preventDefault();
      onEnter();
      return;
    }
    const target = next === null ? undefined : items[next];
    if (!target) return;
    e.preventDefault();
    onSelect(target.file, true);
  };

  const tabStop = items.some((p) => p.file === selected) ? selected : (items[0]?.file ?? null);

  return (
    <div ref={gridRef} className="mp-grid" role="radiogroup" aria-label={`Photos (${items.length})`} onKeyDown={onGridKey}>
      {items.map((p) => (
        <button
          key={p.file}
          type="button"
          role="radio"
          data-file={p.file}
          className="mp-photo"
          aria-checked={p.file === selected}
          tabIndex={p.file === tabStop ? 0 : -1}
          aria-label={p.alt ? p.alt : `${p.file} (needs alt text)`}
          onClick={() => onSelect(p.file)}
          onDoubleClick={() => p.alt && onActivate?.()}
        >
          <img src={mediaSrc(p.file)} alt="" loading="lazy" decoding="async" />
          {!p.alt ? (
            <span className="mp-badge" aria-hidden="true">
              Needs alt
            </span>
          ) : null}
        </button>
      ))}
    </div>
  );
}

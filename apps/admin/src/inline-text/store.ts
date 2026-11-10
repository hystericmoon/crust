/**
 * F090: which block is being typed in on the page, if any. One at a time;
 * module-level so the canvas (its own document), the action bar and the
 * keyboard handler all see the same answer.
 */
import { useSyncExternalStore } from "react";

let editing: string | null = null;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());

export const editingId = () => editing;
export const isInlineEditing = () => editing !== null;

export function startInlineEdit(id: string) {
  if (editing === id) return;
  editing = id;
  emit();
}

export function stopInlineEdit() {
  if (editing === null) return;
  editing = null;
  emit();
}

export function useEditingId(): string | null {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => editing,
    () => null,
  );
}

/** Blocks that can be typed in on the page. */
export const inlineTypes = ["Heading", "Text"] as const;
export const isInlineType = (type: string | undefined): boolean => !!type && (inlineTypes as readonly string[]).includes(type);

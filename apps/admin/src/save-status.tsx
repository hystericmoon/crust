/**
 * Save feedback in the builders (F006, reworked in F069). Success is a
 * toast that goes away after 10 seconds; screen readers have heard it. A
 * failure stays until it's dismissed or saving works, looks different
 * (warning colours, "Not saved" first) and offers "Try again".
 */
import { useCallback, useEffect, useState } from "react";

export interface SaveNote {
  text: string;
  /** Not saved: stays on screen, announced as an alert. */
  failed?: boolean;
  /** Saves the same content again. */
  retry?: () => void;
}

const SAVING = "Saving…";

export function useSaveStatus() {
  const [note, setNote] = useState<SaveNote | null>(null);
  // Let a success go after a while; a failure stays (WCAG 2.2.1: no time limit on reading it).
  useEffect(() => {
    if (!note || note.failed || note.text === SAVING) return;
    const t = setTimeout(() => setNote(null), 10_000);
    return () => clearTimeout(t);
  }, [note]);
  const show = useCallback((text: string, failed = false, retry?: () => void) => setNote({ text, failed, retry }), []);
  const saving = useCallback(() => setNote({ text: SAVING }), []);
  const clear = useCallback(() => setNote(null), []);
  return { note, show, saving, clear };
}

export function SaveStatus({ note, onDismiss }: { note: SaveNote | null; onDismiss: () => void }) {
  return (
    <>
      <div role="status" aria-live="polite" className="crust-status">
        {note && !note.failed ? note.text : ""}
      </div>
      {note?.failed ? (
        <div role="alert" className="crust-status crust-status-error">
          <p>{note.text}</p>
          <div className="crust-status-actions">
            {note.retry ? (
              <button type="button" className="crust-status-retry" onClick={note.retry}>
                Try again
              </button>
            ) : null}
            <button type="button" className="crust-status-dismiss" onClick={onDismiss}>
              Dismiss
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}

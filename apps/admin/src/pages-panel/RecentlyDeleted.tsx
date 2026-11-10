import type { DeletedPage } from "../api-client";
import { useState } from "react";
import type { PageAction } from "../pages/PageActions";
import { formatDate } from "./format";

/**
 * F019: a quiet, collapsed list. Restoring is rare and safe (the page comes
 * back exactly as it was, nothing is overwritten), so no confirmation step.
 */
export function RecentlyDeleted({ pages, onRestore }: { pages: DeletedPage[]; onRestore: (page: DeletedPage) => PageAction }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const restore = async (d: DeletedPage) => {
    if (busy) return;
    setBusy(d.path);
    setError(null);
    const failed = await onRestore(d);
    setBusy(null);
    if (failed) setError(failed);
  };

  return (
    <section className="st-card pg-deleted" aria-labelledby="deleted-h">
      <h2 id="deleted-h">
        <button type="button" className="pg-disclosure" aria-expanded={open} aria-controls="deleted-list" onClick={() => setOpen((o) => !o)}>
          <svg className="pg-chevron" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
            <path d="M6 3.5 10.5 8 6 12.5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Recently deleted ({pages.length})
        </button>
      </h2>
      <div id="deleted-list" hidden={!open}>
        <p className="st-lede">Pages deleted from the builder. Restoring brings a page back at its old address, as it was.</p>
        {error ? (
          <p className="st-error" role="alert">
            {error}
          </p>
        ) : null}
        <ul className="pg-deleted-list">
          {pages.map((d) => (
            <li key={d.path}>
              <span className="pg-deleted-name">
                <strong>{d.title}</strong> <span className="pg-path">{d.path}</span>
                <span className="st-help">Deleted {formatDate(d.deletedAt)}</span>
              </span>
              <button type="button" className="st-button pg-small" onClick={() => restore(d)} aria-disabled={busy !== null || undefined}>
                {busy === d.path ? "Restoring…" : "Restore"}
                <span className="pg-sr"> {d.title}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}


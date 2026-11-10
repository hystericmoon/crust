/**
 * Rename and delete for one page (F015). Each opens a modal <dialog>: the
 * browser traps focus inside it and Esc closes it. Focus starts on the
 * address field (rename) or on "Keep page" (delete), the least risky choice.
 */
import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { checkAddress, toPath } from "./new-page";
import type { PageRow } from "./store";

/** Resolves to null when it worked, or a plain-language problem to show. */
export type PageAction = Promise<string | null>;

/** Another page whose buttons or card links point at a page (F018). */
export interface LinkingPage {
  path: string;
  title: string;
  count: number;
}

export interface PageActionsProps {
  row: PageRow;
  /** Every other page's address, so a rename can't take one. */
  otherPaths: string[];
  onRename: (row: PageRow, to: string) => PageAction;
  onDelete: (row: PageRow) => PageAction;
  /** Pages that link to this one; null when unknown (F018). */
  findLinks?: (row: PageRow) => Promise<LinkingPage[] | null>;
}

/**
 * While a modal dialog is open the rest of the page can't take focus, so
 * focus moves only after React has removed (and closed) the dialog.
 */
export function focusAfterDialog(target: () => HTMLElement | null) {
  setTimeout(() => target()?.focus(), 0);
}

export function PageActions({ row, otherPaths, onRename, onDelete, findLinks }: PageActionsProps) {
  const [open, setOpen] = useState<"rename" | "delete" | null>(null);
  const renameRef = useRef<HTMLButtonElement>(null);
  const deleteRef = useRef<HTMLButtonElement>(null);

  // Cancel: back to the button that opened the dialog. After a change the
  // page list moves focus itself (the row may be gone), so onDone doesn't.
  const close = (from: "rename" | "delete") => {
    setOpen(null);
    focusAfterDialog(() => (from === "rename" ? renameRef : deleteRef).current);
  };

  return (
    <>
      <button ref={renameRef} type="button" className="st-button pg-small" onClick={() => setOpen("rename")}>
        Rename<span className="pg-sr"> {row.title}</span>
      </button>
      <button ref={deleteRef} type="button" className="st-button pg-small" onClick={() => setOpen("delete")}>
        Delete<span className="pg-sr"> {row.title}</span>
      </button>
      {open === "rename" ? (
        <RenameDialog
          row={row}
          otherPaths={otherPaths}
          onRename={onRename}
          findLinks={findLinks}
          onClose={() => close("rename")}
          onDone={() => setOpen(null)}
        />
      ) : null}
      {open === "delete" ? <DeleteDialog row={row} onDelete={onDelete} onClose={() => close("delete")} onDone={() => setOpen(null)} /> : null}
    </>
  );
}

/** A native modal dialog: the browser traps focus inside and Esc closes it. Shared with the Publish panel (F022). */
export function Dialog({
  labelledBy,
  describedBy,
  onClose,
  children,
}: {
  labelledBy: string;
  describedBy?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  // F069 (WCAG 2.4.3): the button that opened the dialog, read while rendering,
  // before anything inside the dialog takes focus.
  const [opener] = useState(() => (typeof document === "undefined" ? null : document.activeElement));
  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal?.();
    return () => {
      dialog?.close?.();
      // React removes the dialog before the browser can hand focus back, so it
      // would land on <body>. Return it to the opener, unless the screen has
      // already moved focus somewhere on purpose (a heading after a rename).
      focusAfterDialog(() => {
        const now = document.activeElement;
        const lost = !now || now === document.body;
        return lost && opener instanceof HTMLElement && opener.isConnected ? opener : null;
      });
    };
  }, [opener]);
  return (
    <dialog
      ref={ref}
      className="pg-dialog"
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      // Esc: the browser fires "cancel"; let React own the closing.
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      {children}
    </dialog>
  );
}

export function RenameDialog({
  row,
  otherPaths,
  onRename,
  findLinks,
  onClose,
  onDone,
}: {
  row: PageRow;
  otherPaths: string[];
  onRename: (row: PageRow, to: string) => PageAction;
  findLinks?: (row: PageRow) => Promise<LinkingPage[] | null>;
  onClose: () => void;
  onDone: () => void;
}) {
  const id = useId();
  const [address, setAddress] = useState(row.path.slice(1));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [links, setLinks] = useState<LinkingPage[] | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  // Asked once, when the dialog opens.
  const ask = useRef(() => findLinks?.(row));
  useEffect(() => {
    let live = true;
    void ask.current()?.then((found) => live && setLinks(found));
    return () => {
      live = false;
    };
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const to = toPath(address);
    const problem = to === row.path ? "That's already this page's address." : checkAddress(address, otherPaths);
    if (problem) {
      setError(problem);
      inputRef.current?.focus();
      return;
    }
    setBusy(true);
    setError(null);
    const failed = await onRename(row, to);
    setBusy(false);
    if (!failed) return onDone();
    setError(failed);
    inputRef.current?.focus();
  };

  return (
    <Dialog labelledBy={`${id}-h`} onClose={onClose}>
      <form className="pg-form" onSubmit={submit} noValidate>
        <h2 id={`${id}-h`}>New address for “{row.title}”</h2>
        <div className="pg-field">
          <label className="st-field-label" htmlFor={`${id}-address`}>
            New address
          </label>
          <span className="pg-address">
            <span className="pg-prefix" aria-hidden="true">
              /
            </span>
            <input
              ref={inputRef}
              id={`${id}-address`}
              className="st-input"
              value={address}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              aria-invalid={error ? true : undefined}
              aria-describedby={[`${id}-hint`, links?.length ? `${id}-links` : null, error ? `${id}-error` : null].filter(Boolean).join(" ")}
              onChange={(e) => {
                setAddress(e.target.value);
                if (error) setError(null);
              }}
            />
          </span>
          <p className="st-help" id={`${id}-hint`}>
            {row.inRepo
              ? `Links to ${row.path} from other websites keep working: after you publish, visitors who go there are sent to the new address.`
              : "This page is only in this browser so far, so nothing else changes."}
          </p>
          {links?.length ? (
            <p className="st-help" id={`${id}-links`}>
              Links elsewhere on your site are updated to the new address too:{" "}
              {links.map((l) => `${l.title} (${l.count === 1 ? "1 link" : `${l.count} links`})`).join(", ")}.
            </p>
          ) : null}
          {error ? (
            <p className="st-error" id={`${id}-error`} role="alert">
              {error}
            </p>
          ) : null}
        </div>
        <div className="pg-form-actions">
          <button type="submit" className="st-button st-button-primary" aria-disabled={busy || undefined}>
            {busy ? "Changing…" : "Change address"}
          </button>
          <button type="button" className="st-button" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </Dialog>
  );
}

export function DeleteDialog({
  row,
  onDelete,
  onClose,
  onDone,
}: {
  row: PageRow;
  onDelete: (row: PageRow) => PageAction;
  onClose: () => void;
  onDone: () => void;
}) {
  const id = useId();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const keepRef = useRef<HTMLButtonElement>(null);

  useEffect(() => keepRef.current?.focus(), []);

  const confirm = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    const failed = await onDelete(row);
    setBusy(false);
    if (!failed) return onDone();
    setError(failed);
  };

  return (
    <Dialog labelledBy={`${id}-h`} describedBy={`${id}-body`} onClose={onClose}>
      <div className="pg-form">
        <h2 id={`${id}-h`}>Delete “{row.title}”?</h2>
        <div className="pg-dialog-body" id={`${id}-body`}>
          {row.inRepo ? (
            <p>
              The page is removed from GitHub now, and from the live site the next time you publish. Links to {row.path} will
              stop working. You can bring it back from “Recently deleted” on this screen.
            </p>
          ) : (
            <p>This page is only in this browser, so deleting it removes it for good.</p>
          )}
          {row.inRepo && row.localChanges ? <p>Changes you haven't saved to GitHub yet are deleted too.</p> : null}
        </div>
        {error ? (
          <p className="st-error" role="alert">
            {error}
          </p>
        ) : null}
        <div className="pg-form-actions">
          <button ref={keepRef} type="button" className="st-button" onClick={onClose}>
            Keep page
          </button>
          <button type="button" className="st-button pg-danger" onClick={confirm} aria-disabled={busy || undefined}>
            {busy ? "Deleting…" : "Delete page"}
          </button>
        </div>
      </div>
    </Dialog>
  );
}

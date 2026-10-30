import type { Page } from "@crust/blocks";
import type { DeletedPage } from "../api-client";
import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { checkNewPage, createPage, slugify, type NewPageErrors, type NewPageInput } from "./new-page";
import { FIND_FROM, loadSort, matchesQuery, pageStatus, saveSort, SORT_LABELS, sortRows, type SortKey } from "./list-view";
import { focusAfterDialog, PageActions, type LinkingPage, type PageAction } from "./PageActions";
import type { PageRow } from "./store";

export interface PageListProps {
  siteName: string;
  /** null while loading. */
  rows: PageRow[] | null;
  /** Where the list came from, said plainly under the heading. */
  sourceNote: string;
  loadError?: string;
  /** Loads the list again after a load error. */
  onRetry?: () => void;
  onCreate: (page: Page) => void;
  /**
   * Rename and delete (F015). Pages on GitHub need saving to GitHub switched
   * on (githubOn); pages only in this browser can always be changed.
   */
  githubOn?: boolean;
  onRename?: (row: PageRow, to: string) => PageAction;
  onDelete?: (row: PageRow) => PageAction;
  /** Other pages linking to a page, shown in the rename dialog (F018). */
  findLinks?: (row: PageRow) => Promise<LinkingPage[] | null>;
  /** Pages deleted from GitHub that can come back (F019); null or empty hides the section. */
  deleted?: DeletedPage[] | null;
  onRestore?: (page: DeletedPage) => PageAction;
  /** Saves a page's browser draft to GitHub without opening it (F020). */
  onSaveDraft?: (row: PageRow) => PageAction;
  /** True once we know what the last publish contained, so a page can be called "Live" (F021). */
  liveKnown?: boolean;
  /** Shown above the list (the Publish panel). */
  children?: ReactNode;
}

const formatDate = (iso: string | null) =>
  iso ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso)) : "Not recorded yet";

export const editHref = (path: string) => `#/edit?path=${encodeURIComponent(path)}`;

export function PageList({ siteName, rows, sourceNote, loadError, onRetry, onCreate, githubOn = false, onRename, onDelete, findLinks, deleted, onRestore, onSaveDraft, liveKnown = false, children }: PageListProps) {
  const [creating, setCreating] = useState(false);
  // F023: find and sort.
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>(loadSort);
  const findId = useId();
  const [done, setDone] = useState("");
  const headingRef = useRef<HTMLHeadingElement>(null);
  const newPageRef = useRef<HTMLButtonElement>(null);

  // Let the confirmation go after a while; screen readers have already heard it.
  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => setDone(""), 10_000);
    return () => clearTimeout(t);
  }, [done]);

  const canChange = (row: PageRow) => row.path !== "/" && (githubOn || !row.inRepo) && !!onRename && !!onDelete;
  const showTools = (rows?.length ?? 0) >= FIND_FROM;
  const visible = rows ? sortRows(showTools && query.trim() ? rows.filter((r) => matchesQuery(r, query)) : rows, sort) : null;

  const canSave = (row: PageRow) => githubOn && row.localChanges && !!onSaveDraft;
  const anyActions = rows?.some((r) => canChange(r) || canSave(r)) ?? false;
  const [saving, setSaving] = useState<string | null>(null);
  const [failure, setFailure] = useState("");

  const saveDraft = async (row: PageRow) => {
    if (saving) return;
    setSaving(row.path);
    setFailure("");
    const failed = await after(onSaveDraft!(row), `Saved “${row.title}” to GitHub. Visitors see it after you publish.`);
    setSaving(null);
    if (failed) setFailure(failed);
  };

  // After a change the row may be gone, so focus goes to the list heading and the result is announced.
  const after = (action: PageAction, message: string): PageAction =>
    action.then((failed) => {
      if (!failed) {
        setDone(message);
        focusAfterDialog(() => headingRef.current);
      }
      return failed;
    });

  const rename = (row: PageRow, to: string) =>
    after(
      onRename!(row, to),
      row.inRepo
        ? `Changed the address of “${row.title}” to ${to}. Once you publish, ${row.path} sends visitors there.`
        : `Changed the address of “${row.title}” to ${to}.`,
    );
  const remove = (row: PageRow) =>
    after(onDelete!(row), row.inRepo ? `Deleted “${row.title}”. It leaves the live site the next time you publish.` : `Deleted “${row.title}”.`);
  return (
    <div className="st">
      <header className="st-header">
        <h1 className="st-title">{siteName}: pages</h1>
        <div className="st-actions">
          <a className="st-button st-link-button" href="#/posts">
            Posts
          </a>
          <a className="st-button st-link-button" href="#/settings">
            Site settings
          </a>
          <button
            ref={newPageRef}
            type="button"
            className="st-button st-button-primary"
            aria-expanded={creating}
            aria-controls="new-page"
            onClick={() => setCreating((c) => !c)}
          >
            New page
          </button>
        </div>
      </header>

      <main className="pg">
        <NewPageForm open={creating} existing={rows?.map((r) => r.path) ?? []} onCancel={() => {
            setCreating(false);
            newPageRef.current?.focus();
          }}
          onCreate={onCreate}
        />
        {/* What's live and the Publish button come first: it's the screen's main question and action, also on a phone. */}
        {children}

        <section className="st-card" aria-labelledby="pages-h">
          <h2 id="pages-h" ref={headingRef} tabIndex={-1}>
            Pages
          </h2>
          <p className="st-lede">{sourceNote}</p>
          {loadError ? (
            <div className="pg-load-error">
              <p className="st-error" role="alert">
                {loadError}
              </p>
              {onRetry ? (
                <button type="button" className="st-button pg-small" onClick={onRetry}>
                  Try again
                </button>
              ) : null}
            </div>
          ) : null}
          <p className="st-status-inline" role="status">
            {done}
          </p>
          {failure ? (
            <p className="st-error" role="alert">
              {failure}
            </p>
          ) : null}
          {rows === null ? (
            <p role="status">Loading pages…</p>
          ) : rows.length === 0 ? (
            <p>No pages yet. Use "New page" to make the first one.</p>
          ) : (
            <>
            {showTools ? (
              <div className="pg-tools">
                <div className="pg-field">
                  <label className="st-field-label" htmlFor={`${findId}-find`}>
                    Find a page
                  </label>
                  <input
                    id={`${findId}-find`}
                    className="st-input"
                    type="search"
                    value={query}
                    placeholder="Title or address"
                    autoComplete="off"
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
                <div className="pg-field">
                  <label className="st-field-label" htmlFor={`${findId}-sort`}>
                    Sort by
                  </label>
                  <select
                    id={`${findId}-sort`}
                    className="st-input"
                    value={sort}
                    onChange={(e) => {
                      const next = e.target.value as SortKey;
                      setSort(next);
                      saveSort(next);
                    }}
                  >
                    {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
                      <option key={k} value={k}>
                        {SORT_LABELS[k]}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="pg-sr" role="status">
                  {query.trim() ? `${visible!.length} of ${rows.length} pages` : ""}
                </p>
              </div>
            ) : null}
            {visible!.length === 0 ? (
              <div className="pg-no-match">
                <p>No pages match “{query.trim()}”.</p>
                <button type="button" className="st-button pg-small" onClick={() => setQuery("")}>
                  Clear search
                </button>
              </div>
            ) : (
            <table className="pg-table">
              <thead>
                <tr>
                  <th scope="col">Title</th>
                  <th scope="col">Status</th>
                  <th scope="col">Address</th>
                  <th scope="col">Last edited</th>
                  {anyActions ? (
                    <th scope="col">
                      <span className="pg-sr">Actions</span>
                    </th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {visible!.map((row) => {
                  const status = pageStatus(row, githubOn, liveKnown);
                  return (
                  <tr key={row.path}>
                    <th scope="row">
                      <a href={editHref(row.path)}>{row.title}</a>
                    </th>
                    <td data-label="Status">
                      <span className={`pg-status is-${status.key}`}>
                        <span className="pg-dot" aria-hidden="true" />
                        {status.label}
                      </span>
                    </td>
                    <td className="pg-path" data-label="Address">
                      {row.path}
                    </td>
                    <td className="pg-date" data-label="Last edited">
                      {formatDate(row.lastEdited)}
                    </td>
                    {anyActions ? (
                      <td className="pg-actions-cell">
                        <div className="pg-row-actions">
                          {canSave(row) ? (
                            <button
                              type="button"
                              className="st-button pg-small"
                              onClick={() => saveDraft(row)}
                              aria-disabled={saving !== null || undefined}
                            >
                              {saving === row.path ? "Saving…" : "Save to GitHub"}
                              <span className="pg-sr"> {row.title}</span>
                            </button>
                          ) : null}
                          {row.path === "/" && !canSave(row) ? <span className="pg-home-note">Always at /</span> : null}
                          {canChange(row) ? (
                            <PageActions
                              row={row}
                              otherPaths={rows.filter((r) => r.path !== row.path).map((r) => r.path)}
                              onRename={rename}
                              onDelete={remove}
                              findLinks={findLinks}
                            />
                          ) : null}
                        </div>
                      </td>
                    ) : null}
                  </tr>
                  );
                })}
              </tbody>
            </table>
            )}
            </>
          )}
        </section>
        {deleted?.length && onRestore ? (
          <RecentlyDeleted
            pages={deleted}
            onRestore={(d) =>
              after(onRestore(d), `Restored “${d.title}” at ${d.path}. It goes live again the next time you publish.`)
            }
          />
        ) : null}
      </main>
    </div>
  );
}

/**
 * F019: a quiet, collapsed list. Restoring is rare and safe (the page comes
 * back exactly as it was, nothing is overwritten), so no confirmation step.
 */
function RecentlyDeleted({ pages, onRestore }: { pages: DeletedPage[]; onRestore: (page: DeletedPage) => PageAction }) {
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

function NewPageForm({
  open,
  existing,
  onCancel,
  onCreate,
}: {
  open: boolean;
  existing: string[];
  onCancel: () => void;
  onCreate: (page: Page) => void;
}) {
  const id = useId();
  const [input, setInput] = useState<NewPageInput>({ title: "", address: "", description: "" });
  // The address follows the title until the owner edits it.
  const [addressTouched, setAddressTouched] = useState(false);
  const [errors, setErrors] = useState<NewPageErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (open) titleRef.current?.focus();
  }, [open]);

  const update = (next: NewPageInput) => {
    setInput(next);
    if (submitted) setErrors(checkNewPage(next, existing));
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    const found = checkNewPage(input, existing);
    setErrors(found);
    const first = (["title", "address", "description"] as const).find((k) => found[k]);
    if (first) {
      formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      return;
    }
    onCreate(createPage(input));
  };

  const field = (name: keyof NewPageInput) => ({
    id: `${id}-${name}`,
    name,
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": [`${id}-${name}-hint`, errors[name] ? `${id}-${name}-error` : null].filter(Boolean).join(" "),
  });

  return (
    <section className="st-card" id="new-page" aria-labelledby={`${id}-h`} hidden={!open}>
      <h2 id={`${id}-h`}>New page</h2>
      <form ref={formRef} className="pg-form" onSubmit={submit} noValidate>
        <div className="pg-field">
          <label className="st-field-label" htmlFor={`${id}-title`}>
            Title
          </label>
          <input
            ref={titleRef}
            className="st-input"
            {...field("title")}
            value={input.title}
            maxLength={140}
            onChange={(e) =>
              update({ ...input, title: e.target.value, address: addressTouched ? input.address : slugify(e.target.value) })
            }
          />
          <p className="st-help" id={`${id}-title-hint`}>
            Shown in the browser tab and in search results.
          </p>
          {errors.title ? (
            <p className="st-error" id={`${id}-title-error`}>
              {errors.title}
            </p>
          ) : null}
        </div>

        <div className="pg-field">
          <label className="st-field-label" htmlFor={`${id}-address`}>
            Address
          </label>
          <span className="pg-address">
            <span className="pg-prefix" aria-hidden="true">
              /
            </span>
            <input
              className="st-input"
              {...field("address")}
              value={input.address}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              onChange={(e) => {
                setAddressTouched(true);
                update({ ...input, address: e.target.value });
              }}
            />
          </span>
          <p className="st-help" id={`${id}-address-hint`}>
            Lowercase letters, numbers and dashes. The page will live at /{input.address || "your-address"}.
          </p>
          {errors.address ? (
            <p className="st-error" id={`${id}-address-error`}>
              {errors.address}
            </p>
          ) : null}
        </div>

        <div className="pg-field">
          <label className="st-field-label" htmlFor={`${id}-description`}>
            Description <span className="st-help">(optional, add it before publishing)</span>
          </label>
          <textarea
            className="st-input pg-textarea"
            {...field("description")}
            value={input.description}
            rows={2}
            onChange={(e) => update({ ...input, description: e.target.value })}
          />
          <p className="st-help" id={`${id}-description-hint`}>
            One or two sentences search engines show under the title.
          </p>
          {errors.description ? (
            <p className="st-error" id={`${id}-description-error`}>
              {errors.description}
            </p>
          ) : null}
        </div>

        <div className="pg-form-actions">
          <button type="submit" className="st-button st-button-primary">
            Create and open
          </button>
          <button type="button" className="st-button" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </form>
    </section>
  );
}

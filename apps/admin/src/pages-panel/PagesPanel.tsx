/**
 * F091 Pages panel (direction A of https://claude.ai/artifact/Py2BWv56W8cCrUw7FVYmy2):
 * every page in two groups, "In the menu" (in menu order) and "Not in the
 * menu". Reorder by dragging a row, or with the Up and Down arrow keys on its
 * grip, or with Move up / Move down in its menu. The dot is always paired with
 * words. Each page's menu holds its settings (title, search and sharing),
 * address, duplicate and delete. The same panel is the left bar's Pages panel
 * in the editor and the list on the home screen.
 */
import { placeholderSummary, type MenuLink, type Page } from "@crust/blocks";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import type { DeletedPage } from "../api-client";
import { designHref, useDesignStatus } from "../designs/DesignLinks";
import { DeleteDialog, focusAfterDialog, RenameDialog, type LinkingPage, type PageAction } from "../pages/PageActions";
import { FIND_FROM, matchesQuery, pageStatus } from "../pages/list-view";
import type { PageRow } from "../pages/store";
import { breakablePath, editHref, relinkedNote, settingsHref } from "./format";
import { addPage, atKey, groupPages, moveBefore, moveStep, positionOf, sameAt, takeOut, type MenuEntry, type MenuPath } from "./model";
import { NewPageForm } from "./NewPageForm";
import { RecentlyDeleted } from "./RecentlyDeleted";

export interface PagesPanelProps {
  /** "rail": the editor's left panel. "screen": the card on the home screen. */
  variant?: "rail" | "screen";
  /** null while loading. */
  rows: PageRow[] | null;
  /** The header menu; the pages it links to are "In the menu". */
  menu: MenuLink[];
  /** Saves a changed menu. Without it the panel only shows the groups. */
  onMenuChange?: (menu: MenuLink[]) => void;
  /** The page being edited, marked in the list. */
  currentPath?: string;
  /** For the page being edited, "Page settings" opens the panel here instead of following a link. */
  onOpenSettings?: (row: PageRow) => void;
  sourceNote?: string;
  loadError?: string;
  onRetry?: () => void;
  githubOn?: boolean;
  liveKnown?: boolean;
  onRename?: (row: PageRow, to: string) => Promise<string | null | { relinked: LinkingPage[] }>;
  onDelete?: (row: PageRow) => PageAction;
  findLinks?: (row: PageRow) => Promise<LinkingPage[] | null>;
  onSaveDraft?: (row: PageRow) => PageAction;
  onDuplicate?: (row: PageRow) => PageAction;
  deleted?: DeletedPage[] | null;
  onRestore?: (page: DeletedPage) => PageAction;
  /** With a create handler the panel has its own "New page" button (the editor's panel). */
  onCreate?: (page: Page) => void;
}

type Drag = { kind: "in"; at: MenuPath } | { kind: "out"; row: PageRow };

export function PagesPanel({
  variant = "screen",
  rows,
  menu,
  onMenuChange,
  currentPath,
  onOpenSettings,
  sourceNote,
  loadError,
  onRetry,
  githubOn = false,
  liveKnown = false,
  onRename,
  onDelete,
  findLinks,
  onSaveDraft,
  onDuplicate,
  deleted,
  onRestore,
  onCreate,
}: PagesPanelProps) {
  const id = useId();
  const [query, setQuery] = useState("");
  const [done, setDone] = useState("");
  const [failure, setFailure] = useState("");
  const [moved, setMoved] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [dialog, setDialog] = useState<{ kind: "rename" | "delete"; row: PageRow } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const newRef = useRef<HTMLButtonElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const focusGrip = useRef<string | null>(null);

  const find = (attr: string, value: string) =>
    Array.from(rootRef.current?.querySelectorAll<HTMLElement>(`[${attr}]`) ?? []).find((el) => el.getAttribute(attr) === value) ?? null;

  // Let the confirmation go after a while; screen readers have already heard it.
  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => setDone(""), 10_000);
    return () => clearTimeout(t);
  }, [done]);

  // A menu closes on a click elsewhere.
  useEffect(() => {
    if (open === null) return;
    const away = (e: MouseEvent) => {
      if (!(e.target instanceof Node) || !find("data-item", open)?.contains(e.target)) setOpen(null);
    };
    document.addEventListener("mousedown", away);
    return () => document.removeEventListener("mousedown", away);
  }, [open]);

  // After a move, the grip that was used keeps focus.
  useEffect(() => {
    if (!focusGrip.current) return;
    const key = focusGrip.current;
    focusGrip.current = null;
    find("data-grip", key)?.focus();
  });

  const all = rows ?? [];
  const isPage = (href: string) => all.some((r) => r.path === href);
  const full = groupPages(all, menu);
  const showTools = all.length >= FIND_FROM;
  const shown = showTools && query.trim() ? all.filter((r) => matchesQuery(r, query)) : all;
  const groups = groupPages(shown, menu);
  const canMenu = !!onMenuChange;
  const canChange = (row: PageRow) => row.path !== "/" && (githubOn || !row.inRepo) && !!onRename && !!onDelete;
  const canSave = (row: PageRow) => githubOn && row.localChanges && !!onSaveDraft;

  const commit = (next: MenuLink[] | null, said: string, grip?: string) => {
    if (!next) return false;
    onMenuChange!(next);
    setMoved(said);
    if (grip) focusGrip.current = grip;
    return true;
  };
  const gripKeyFor = (menuNext: MenuLink[], row: PageRow) => {
    const e = groupPages(all, menuNext).inMenu.find((x) => x.row.path === row.path);
    return e ? atKey(e.at) : undefined;
  };
  const placeSaid = (menuNext: MenuLink[], row: PageRow) => {
    const g = groupPages(all, menuNext).inMenu;
    return `Position ${positionOf(g, g.find((x) => x.row.path === row.path)?.at ?? [0])} of ${g.length} in the menu.`;
  };

  const step = (entry: MenuEntry, by: -1 | 1) => {
    const next = moveStep(menu, entry.at, by, isPage);
    if (!next) {
      setMoved(`${entry.row.title} is already ${by < 0 ? "first" : "last"} in the menu.`);
      return;
    }
    commit(next, `Moved ${entry.row.title} ${by < 0 ? "up" : "down"}. ${placeSaid(next, entry.row)}`, gripKeyFor(next, entry.row));
  };
  const add = (row: PageRow, before: MenuPath | null = null) => {
    const next = addPage(menu, row, before);
    if (!next) {
      setMoved(`The menu is full. Take a page out first to add ${row.title}.`);
      return;
    }
    commit(next, `Added ${row.title} to the menu. ${placeSaid(next, row)}`, gripKeyFor(next, row));
  };
  const out = (entry: MenuEntry) => {
    commit(takeOut(menu, entry.at), `Took ${entry.row.title} out of the menu.`);
  };

  const gripKey = (entry: MenuEntry, e: KeyboardEvent) => {
    if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
    e.preventDefault();
    step(entry, e.key === "ArrowUp" ? -1 : 1);
  };

  // --- drag and drop (the keyboard has the grip's arrows and the menu) ---
  const startDrag = (d: Drag) => (e: React.DragEvent) => {
    drag.current = d;
    e.dataTransfer?.setData("text/plain", d.kind === "in" ? atKey(d.at) : d.row.path);
    if (e.dataTransfer) e.dataTransfer.effectAllowed = "move";
  };
  const endDrag = () => {
    drag.current = null;
    setOver(null);
  };
  const allow = (key: string) => (e: React.DragEvent) => {
    if (!drag.current || !canMenu) return;
    e.preventDefault();
    setOver(key);
  };
  const dropOnMenu = (before: MenuPath | null) => (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const d = drag.current;
    endDrag();
    if (!d || !canMenu) return;
    if (d.kind === "in") {
      const next = moveBefore(menu, d.at, before);
      const row = full.inMenu.find((x) => sameAt(x.at, d.at))?.row;
      if (next && row) commit(next, `Moved ${row.title}. ${placeSaid(next, row)}`, gripKeyFor(next, row));
    } else add(d.row, before);
  };
  const dropOut = (e: React.DragEvent) => {
    e.preventDefault();
    const d = drag.current;
    endDrag();
    if (!d || !canMenu || d.kind !== "in") return;
    const entry = full.inMenu.find((x) => sameAt(x.at, d.at));
    if (entry) out(entry);
  };

  // --- changes that go through the screen's handlers ---
  const after = (action: PageAction, message: string | (() => string)): PageAction =>
    action.then((failed) => {
      if (!failed) {
        setDone(typeof message === "string" ? message : message());
        focusAfterDialog(() => headingRef.current);
      }
      return failed;
    });
  const rename = (row: PageRow, to: string) => {
    let relinked: LinkingPage[] = [];
    const action = onRename!(row, to).then((r) => {
      if (r && typeof r === "object") {
        relinked = r.relinked;
        return null;
      }
      return r;
    });
    return after(action, () =>
      (row.inRepo
        ? `Changed the address of “${row.title}” to ${to}. Once you publish, ${row.path} sends visitors there.`
        : `Changed the address of “${row.title}” to ${to}.`) + relinkedNote(relinked),
    );
  };
  const remove = (row: PageRow) =>
    after(onDelete!(row), row.inRepo ? `Deleted “${row.title}”. It leaves the live site the next time you publish.` : `Deleted “${row.title}”.`);
  const run = async (key: string, action: PageAction | undefined) => {
    if (busy || !action) return;
    setBusy(key);
    setFailure("");
    const failed = await action;
    setBusy(null);
    if (failed) setFailure(failed);
  };
  const saveDraft = (row: PageRow) =>
    run(row.path, after(onSaveDraft!(row), `Saved “${row.title}” to GitHub. Visitors see it after you publish.`));
  const duplicate = (row: PageRow) =>
    run(row.path, after(onDuplicate!(row), `Made a copy of “${row.title}”. It is in “Not in the menu”, only in this browser until you save it.`));

  const moreRef = (row: PageRow) => () => find("data-more", row.path);

  const renderRow = (row: PageRow, entry?: MenuEntry) => {
    const status = pageStatus(row, githubOn, liveKnown);
    const key = entry ? `in-${atKey(entry.at)}` : `out-${row.path}`;
    const menuId = `${id}-m-${row.path}`;
    const isOpen = open === row.path;
    const top = entry && entry.at.length === 1;
    const settingsHere = onOpenSettings && row.path === currentPath;
    const choose = (fn: () => void) => () => {
      setOpen(null);
      fn();
    };
    return (
      <li
        key={key}
        className={`pp-item${over === key ? " is-over" : ""}`}
        data-item={row.path}
        onDragOver={top ? allow(key) : undefined}
        onDragLeave={() => setOver((o) => (o === key ? null : o))}
        onDrop={top ? dropOnMenu(entry.at) : undefined}
      >
        <div
          className={`pp-row${row.path === currentPath ? " is-current" : ""}`}
          draggable={canMenu && !!(top || !entry)}
          onDragStart={canMenu ? startDrag(entry ? { kind: "in", at: entry.at } : { kind: "out", row }) : undefined}
          onDragEnd={endDrag}
        >
          {entry ? (
            <button
              type="button"
              className="pp-grip"
              data-grip={atKey(entry.at)}
              disabled={!canMenu}
              aria-label={`Reorder ${row.title}. Number ${positionOf(full.inMenu, entry.at)} of ${full.inMenu.length} in the menu. Press the up or down arrow key to move it.`}
              onKeyDown={(e) => gripKey(entry, e)}
            >
              <svg width="12" height="16" viewBox="0 0 12 16" aria-hidden="true" focusable="false">
                <path d="M3 3h.01M9 3h.01M3 8h.01M9 8h.01M3 13h.01M9 13h.01" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
              </svg>
            </button>
          ) : null}
          <span className={`pp-dot is-${status.key}`} aria-hidden="true" />
          <span className="pp-name">
            <a href={editHref(row.path)} aria-current={row.path === currentPath ? "page" : undefined}>
              {row.title || row.path}
            </a>
            <small>
              {breakablePath(row.path)}
              {entry?.under ? ` · in the “${entry.under}” dropdown` : ""}
            </small>
            {row.placeholders ? <span className="pp-replace">{placeholderSummary(row.placeholders)}</span> : null}
          </span>
          <span className="pp-status">{status.label}</span>
          <button
            type="button"
            className="pp-more"
            data-more={row.path}
            aria-label={`More for ${row.title}`}
            aria-expanded={isOpen}
            aria-controls={isOpen ? menuId : undefined}
            onClick={() => setOpen(isOpen ? null : row.path)}
          >
            <span aria-hidden="true">⋯</span>
          </button>
        </div>
        {isOpen ? (
          <ul
            className="pp-menu"
            id={menuId}
            aria-label={`${row.title}`}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.stopPropagation();
                setOpen(null);
                moreRef(row)()?.focus();
              }
            }}
          >
            <li>
              {settingsHere ? (
                <button type="button" onClick={choose(() => onOpenSettings(row))}>
                  Page settings
                </button>
              ) : (
                <a href={settingsHref(row.path)}>Page settings</a>
              )}
            </li>
            {entry ? (
              <>
                <li>
                  <button type="button" onClick={choose(() => step(entry, -1))}>
                    Move up
                  </button>
                </li>
                <li>
                  <button type="button" onClick={choose(() => step(entry, 1))}>
                    Move down
                  </button>
                </li>
              </>
            ) : null}
            {canMenu ? (
              <li>
                {entry ? (
                  <button type="button" onClick={choose(() => out(entry))}>
                    Take out of menu
                  </button>
                ) : (
                  <button type="button" onClick={choose(() => add(row))}>
                    Add to menu
                  </button>
                )}
              </li>
            ) : null}
            {canChange(row) ? (
              <li>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(null);
                    setDialog({ kind: "rename", row });
                  }}
                >
                  Change address
                </button>
              </li>
            ) : null}
            {canSave(row) ? (
              <li>
                <button type="button" aria-disabled={busy !== null || undefined} onClick={choose(() => void saveDraft(row))}>
                  {busy === row.path ? "Saving…" : "Save to GitHub"}
                </button>
              </li>
            ) : null}
            {onDuplicate ? (
              <li>
                <button type="button" aria-disabled={busy !== null || undefined} onClick={choose(() => void duplicate(row))}>
                  Duplicate
                </button>
              </li>
            ) : null}
            {canChange(row) ? (
              <li>
                <button
                  type="button"
                  className="pp-danger"
                  onClick={() => {
                    setOpen(null);
                    setDialog({ kind: "delete", row });
                  }}
                >
                  Delete
                </button>
              </li>
            ) : null}
            {row.path === "/" ? <li className="pp-note">Home always lives at /</li> : null}
          </ul>
        ) : null}
      </li>
    );
  };

  const closeDialog = () => {
    const row = dialog?.row;
    setDialog(null);
    if (row) focusAfterDialog(moreRef(row));
  };

  return (
    <div ref={rootRef} className={`pp pp-${variant}`}>
      <div className="pp-head">
        <h2 id={`${id}-h`} ref={headingRef} tabIndex={-1} className={variant === "rail" ? "af-panel-title" : undefined}>
          Pages
        </h2>
        {onCreate ? (
          <button
            ref={newRef}
            type="button"
            className="pp-new"
            aria-expanded={creating}
            aria-controls={`${id}-new`}
            onClick={() => setCreating((c) => !c)}
          >
            New page
          </button>
        ) : null}
      </div>
      {onCreate ? (
        <div id={`${id}-new`} hidden={!creating}>
          <NewPageForm
            open={creating}
            existing={all.map((r) => r.path)}
            onCancel={() => {
              setCreating(false);
              newRef.current?.focus();
            }}
            onCreate={onCreate}
          />
        </div>
      ) : null}
      {sourceNote ? <p className="st-lede pp-lede">{sourceNote}</p> : null}
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
      <p className="pg-sr" role="status">
        {moved}
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
            <div className="pp-find">
              <label className="st-field-label" htmlFor={`${id}-find`}>
                Find a page
              </label>
              <input
                id={`${id}-find`}
                className="st-input"
                type="search"
                value={query}
                placeholder="Title or address"
                autoComplete="off"
                onChange={(e) => setQuery(e.target.value)}
              />
              <p className="pg-sr" role="status">
                {query.trim() ? `${shown.length} of ${all.length} pages` : ""}
              </p>
            </div>
          ) : null}
          {shown.length === 0 ? (
            <div className="pg-no-match">
              <p>No pages match “{query.trim()}”.</p>
              <button type="button" className="st-button pg-small" onClick={() => setQuery("")}>
                Clear search
              </button>
            </div>
          ) : (
            <>
              <section aria-labelledby={`${id}-in`} className="pp-group">
                <h3 id={`${id}-in`} className="pp-group-title">
                  In the menu
                </h3>
                <ul
                  className={`pp-list${over === "in-end" ? " is-over" : ""}`}
                  onDragOver={allow("in-end")}
                  onDragLeave={() => setOver((o) => (o === "in-end" ? null : o))}
                  onDrop={dropOnMenu(null)}
                >
                  {groups.inMenu.map((e) => renderRow(e.row, e))}
                  {groups.inMenu.length === 0 ? (
                    <li className="pp-empty">{query.trim() ? "None of these." : "No pages in the menu yet. Drag one here, or use “Add to menu” in its menu."}</li>
                  ) : null}
                </ul>
              </section>
              <section aria-labelledby={`${id}-out`} className="pp-group">
                <h3 id={`${id}-out`} className="pp-group-title">
                  Not in the menu
                </h3>
                <ul
                  className={`pp-list${over === "out" ? " is-over" : ""}`}
                  onDragOver={allow("out")}
                  onDragLeave={() => setOver((o) => (o === "out" ? null : o))}
                  onDrop={dropOut}
                >
                  {groups.notInMenu.map((r) => renderRow(r))}
                  {groups.notInMenu.length === 0 ? (
                    <li className="pp-empty">{query.trim() ? "None of these." : "Every page is in the menu."}</li>
                  ) : null}
                </ul>
              </section>
              {/* F082: the page visitors see at an address with no page, designed like the others. */}
              {query.trim() ? null : (
                <ul className="pp-list pp-builtin-list">
                  <NotFoundItem />
                </ul>
              )}
            </>
          )}
        </>
      )}
      {deleted?.length && onRestore ? (
        <RecentlyDeleted
          pages={deleted}
          onRestore={(d) => after(onRestore(d), `Restored “${d.title}” at ${d.path}. It goes live again the next time you publish.`)}
        />
      ) : null}
      {dialog?.kind === "rename" ? (
        <RenameDialog
          row={dialog.row}
          otherPaths={all.filter((r) => r.path !== dialog.row.path).map((r) => r.path)}
          onRename={rename}
          findLinks={findLinks}
          onClose={closeDialog}
          onDone={() => setDialog(null)}
        />
      ) : null}
      {dialog?.kind === "delete" ? <DeleteDialog row={dialog.row} onDelete={remove} onClose={closeDialog} onDone={() => setDialog(null)} /> : null}
    </div>
  );
}

function NotFoundItem() {
  const status = useDesignStatus("notFound");
  return (
    <li className="pp-item pp-builtin">
      <div className="pp-row">
        <span className="pp-dot is-builtin" aria-hidden="true" />
        <span className="pp-name">
          <a href={designHref("notFound")}>Page not found</a>
          <small>Shown for addresses with no page</small>
        </span>
        <span className="pp-status">{status}</span>
      </div>
    </li>
  );
}

/**
 * F057: the Sites screen of the desktop app (design snapshot
 * design/f057-several-sites-v1.html, direction A). Built like the Pages
 * screen: a table of sites, a dialog per action, and "Recently deleted".
 */
import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Dialog, focusAfterDialog } from "../pages/PageActions";
import { AboutCrust, UpdateBanner } from "../updates/UpdateNotice";
import { Icon } from "../settings/icons";
import { copyName, siteNameProblem, tidyName, type DeletedSite, type SiteSummary, type SitesApi } from "./sites";
import { ThemeToggle } from "../app-theme/ThemeToggle";

const formatDate = (ms: number | null) =>
  ms === null ? "Not saved yet" : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(ms));
const formatDay = (ms: number) => new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(ms));
const pagesLabel = (n: number) => (n === 1 ? "1 page" : `${n} pages`);
const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

type Action = { kind: "new" } | { kind: "rename" | "duplicate" | "delete"; site: SiteSummary };

export interface SitesScreenProps {
  api: SitesApi;
  /** The open site's name, for the link back to its pages. */
  openName: string;
}

export function SitesScreen({ api, openName }: SitesScreenProps) {
  const [sites, setSites] = useState<SiteSummary[] | null>(null);
  const [deleted, setDeleted] = useState<DeletedSite[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [action, setAction] = useState<Action | null>(null);
  const [opening, setOpening] = useState<string | null>(null);
  const [openError, setOpenError] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const newRef = useRef<HTMLButtonElement>(null);

  const load = useCallback(async () => {
    try {
      const [list, gone] = await Promise.all([api.list(), api.deleted()]);
      setSites(list);
      setDeleted(gone);
      setLoadError(null);
      return list;
    } catch (e) {
      setLoadError(message(e));
      return null;
    }
  }, [api]);

  useEffect(() => {
    void load();
  }, [load]);

  const names = (except?: SiteSummary) => (sites ?? []).filter((s) => s.id !== except?.id).map((s) => s.name);

  /** After a change: reload the list, say what happened, and move focus to the site's row (or the heading). */
  const after = async (said: string, focusId?: string) => {
    await load();
    setStatus(said);
    focusAfterDialog(() => (focusId ? document.getElementById(rowLinkId(focusId)) : null) ?? headingRef.current);
  };

  const open = async (site: SiteSummary) => {
    if (opening) return;
    if (site.open) {
      window.location.hash = "#/";
      return;
    }
    setOpening(site.id);
    setOpenError(null);
    try {
      await api.open(site.id);
    } catch (e) {
      setOpening(null);
      setOpenError(`Couldn't open “${site.name}”: ${message(e)}`);
    }
  };

  return (
    <div className="st">
      <header className="st-header">
        <a className="st-back" href="#/">
          <Icon name="back" /> {openName}
        </a>
        <h1 className="st-title">Your sites</h1>
        <div className="st-actions">
          <button ref={newRef} type="button" className="st-button st-button-primary" onClick={() => setAction({ kind: "new" })}>
            New site
          </button>
        </div>
        <ThemeToggle />
      </header>

      <main className="pg sites">
        <p className="pg-sr" role="status">
          {status}
        </p>
        <UpdateBanner />
        <section className="st-card" aria-labelledby="sites-h">
          <h2 id="sites-h" ref={headingRef} tabIndex={-1}>
            Sites
          </h2>
          <p className="st-lede">Each site is a folder in Documents/Crust, with its own pages, history and publish settings.</p>
          {openError ? (
            <p className="st-error" role="alert">
              {openError}
            </p>
          ) : null}
          {loadError ? (
            <div className="pg-load-error" role="alert">
              <p>Couldn't read your sites: {loadError}</p>
              <button type="button" className="st-button" onClick={() => void load()}>
                Try again
              </button>
            </div>
          ) : sites === null ? (
            <p role="status">Loading your sites…</p>
          ) : (
            <table className="pg-table sites-table">
              <caption className="pg-sr">Your sites, most recently edited first</caption>
              <thead>
                <tr>
                  <th scope="col">Site</th>
                  <th scope="col">Last edited</th>
                  <th scope="col">
                    <span className="pg-sr">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sites.map((site) => (
                  <tr key={site.id}>
                    <th scope="row" className="sites-name">
                      <button id={rowLinkId(site.id)} type="button" className="sites-open" onClick={() => void open(site)} aria-disabled={opening !== null || undefined}>
                        {opening === site.id ? `Opening ${site.name}…` : site.name}
                      </button>
                      {site.open ? <span className="sites-here">Open</span> : null}
                      <span className="st-help sites-meta">{pagesLabel(site.pages)}</span>
                    </th>
                    <td className="pg-date" data-label="Last edited">
                      {formatDate(site.edited)}
                    </td>
                    <td className="pg-actions-cell">
                      <div className="pg-row-actions">
                        {site.open ? null : (
                          <button type="button" className="st-button pg-small" data-site-action={`open:${site.id}`} onClick={() => void open(site)} aria-disabled={opening !== null || undefined}>
                            Open site<span className="pg-sr">: {site.name}</span>
                          </button>
                        )}
                        {(["rename", "duplicate", "delete"] as const).map((kind) => (
                          <button key={kind} type="button" className={`st-button pg-small${kind === "delete" ? " sites-delete" : ""}`} data-site-action={`${kind}:${site.id}`} onClick={() => setAction({ kind, site })}>
                            {kind === "rename" ? "Rename" : kind === "duplicate" ? "Duplicate" : "Delete"}
                            <span className="pg-sr"> {site.name}</span>
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {deleted.length ? (
          <RecentlyDeletedSites
            sites={deleted}
            onRestore={async (d) => {
              const id = await api.restore(d);
              await after(`Restored “${d.name}”.`, id);
            }}
          />
        ) : null}

        <AboutCrust />
      </main>

      {action?.kind === "new" ? (
        <NameDialog
          title="New site"
          label="Site name"
          hint="Also the name of its folder in Documents/Crust. You can change it later."
          initial=""
          submitLabel="Create site"
          busyLabel="Creating…"
          others={names()}
          onClose={() => {
            setAction(null);
            focusAfterDialog(() => newRef.current);
          }}
          onSubmit={async (name) => {
            const id = await api.create(name);
            // A new site opens straight away, ready for "Start from a template".
            await api.open(id);
          }}
        />
      ) : null}
      {action?.kind === "rename" ? (
        <NameDialog
          title={`Rename “${action.site.name}”`}
          label="New name"
          hint="Changes the name in the site's header and browser tab, and its folder's name. It's saved in the site's history."
          initial={action.site.name}
          submitLabel="Rename"
          busyLabel="Renaming…"
          others={names(action.site)}
          same={action.site.name}
          onClose={() => closeTo(setAction, action.site, "rename")}
          onSubmit={async (name) => {
            const id = await api.rename(action.site, name);
            setAction(null);
            // The open site's name is everywhere in the builder: start it again.
            if (action.site.open) return api.open(id);
            await after(`Renamed “${action.site.name}” to “${tidyName(name)}”.`, id);
          }}
        />
      ) : null}
      {action?.kind === "duplicate" ? (
        <NameDialog
          title={`Duplicate “${action.site.name}”`}
          label="Name of the copy"
          hint="Same pages, photos and history. Its site address and publish settings start empty, so it never publishes over the original."
          initial={copyName(action.site.name, names())}
          submitLabel="Duplicate"
          busyLabel="Copying…"
          others={names()}
          onClose={() => closeTo(setAction, action.site, "duplicate")}
          onSubmit={async (name) => {
            const id = await api.duplicate(action.site, name);
            setAction(null);
            await after(`Made “${tidyName(name)}”, a copy of “${action.site.name}”.`, id);
          }}
        />
      ) : null}
      {action?.kind === "delete" ? (
        <DeleteSiteDialog
          site={action.site}
          onClose={() => closeTo(setAction, action.site, "delete")}
          onDelete={async () => {
            const nowOpen = await api.remove(action.site);
            setAction(null);
            // The open site went: the builder starts again with the next one.
            if (action.site.open) return api.open(nowOpen);
            await after(`Moved “${action.site.name}” to Recently deleted. You can restore it for 30 days.`);
          }}
        />
      ) : null}
    </div>
  );
}

const rowLinkId = (id: string) => `site-${encodeURIComponent(id).replace(/%/g, "_")}`;

/** Cancel: focus goes back to the button that opened the dialog. */
function closeTo(setAction: (a: Action | null) => void, site: SiteSummary, kind: string) {
  setAction(null);
  focusAfterDialog(() => document.querySelector<HTMLElement>(`[data-site-action="${CSS.escape(`${kind}:${site.id}`)}"]`));
}

function NameDialog({
  title,
  label,
  hint,
  initial,
  submitLabel,
  busyLabel,
  others,
  same,
  onClose,
  onSubmit,
}: {
  title: string;
  label: string;
  hint: string;
  initial: string;
  submitLabel: string;
  busyLabel: string;
  others: string[];
  /** The current name, for a rename: keeping it changes nothing. */
  same?: string;
  onClose: () => void;
  onSubmit: (name: string) => Promise<unknown>;
}) {
  const id = useId();
  const [name, setName] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (same !== undefined && tidyName(name) === same) return onClose();
    const problem = siteNameProblem(name, others);
    if (problem) {
      setError(problem);
      inputRef.current?.focus();
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onSubmit(name);
    } catch (err) {
      setBusy(false);
      setError(message(err));
      inputRef.current?.focus();
    }
  };

  return (
    <Dialog labelledBy={`${id}-h`} onClose={onClose}>
      <form className="pg-form" onSubmit={submit} noValidate>
        <h2 id={`${id}-h`}>{title}</h2>
        <div className="pg-field">
          <label className="st-field-label" htmlFor={`${id}-name`}>
            {label}
          </label>
          <input
            ref={inputRef}
            id={`${id}-name`}
            className="st-input"
            value={name}
            autoComplete="off"
            aria-invalid={error ? true : undefined}
            aria-describedby={[`${id}-hint`, error ? `${id}-error` : null].filter(Boolean).join(" ")}
            onChange={(e) => {
              setName(e.target.value);
              if (error) setError(null);
            }}
          />
          <p className="st-help" id={`${id}-hint`}>
            {hint}
          </p>
          {error ? (
            <p className="st-error" id={`${id}-error`} role="alert">
              {error}
            </p>
          ) : null}
        </div>
        <div className="pg-form-actions">
          <button type="submit" className="st-button st-button-primary" aria-disabled={busy || undefined}>
            {busy ? busyLabel : submitLabel}
          </button>
          <button type="button" className="st-button" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </Dialog>
  );
}

function DeleteSiteDialog({ site, onClose, onDelete }: { site: SiteSummary; onClose: () => void; onDelete: () => Promise<unknown> }) {
  const id = useId();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const keepRef = useRef<HTMLButtonElement>(null);

  useEffect(() => keepRef.current?.focus(), []);

  const confirm = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await onDelete();
    } catch (e) {
      setBusy(false);
      setError(message(e));
    }
  };

  return (
    <Dialog labelledBy={`${id}-h`} describedBy={`${id}-body`} onClose={onClose}>
      <div className="pg-form">
        <h2 id={`${id}-h`}>Delete “{site.name}”?</h2>
        <div className="pg-dialog-body" id={`${id}-body`}>
          <p>It moves to Recently deleted on this screen. You can restore it for 30 days; after that it's removed from your computer.</p>
          <p>Your live website isn't touched.{site.open ? " Crust opens your most recently edited other site." : ""}</p>
        </div>
        {error ? (
          <p className="st-error" role="alert">
            {error}
          </p>
        ) : null}
        <div className="pg-form-actions">
          <button ref={keepRef} type="button" className="st-button" onClick={onClose}>
            Keep site
          </button>
          <button type="button" className="st-button pg-danger" onClick={confirm} aria-disabled={busy || undefined}>
            {busy ? "Deleting…" : "Delete site"}
          </button>
        </div>
      </div>
    </Dialog>
  );
}

function RecentlyDeletedSites({ sites, onRestore }: { sites: DeletedSite[]; onRestore: (site: DeletedSite) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const restore = async (d: DeletedSite) => {
    if (busy) return;
    setBusy(d.id);
    setError(null);
    try {
      await onRestore(d);
    } catch (e) {
      setError(`Couldn't restore “${d.name}”: ${message(e)}`);
    }
    setBusy(null);
  };

  return (
    <section className="st-card pg-deleted" aria-labelledby="deleted-sites-h">
      <h2 id="deleted-sites-h">
        <button type="button" className="pg-disclosure" aria-expanded={open} aria-controls="deleted-sites-list" onClick={() => setOpen((o) => !o)}>
          <svg className="pg-chevron" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
            <path d="M6 3.5 10.5 8 6 12.5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Recently deleted ({sites.length})
        </button>
      </h2>
      <div id="deleted-sites-list" hidden={!open}>
        <p className="st-lede">Deleted sites wait here for 30 days. Restoring brings a site back as it was, with its history.</p>
        {error ? (
          <p className="st-error" role="alert">
            {error}
          </p>
        ) : null}
        <ul className="pg-deleted-list">
          {sites.map((d) => (
            <li key={d.id}>
              <span className="pg-deleted-name">
                <strong>{d.name}</strong>
                <span className="st-help">
                  Deleted {formatDay(d.deletedAt)} · removed for good on {formatDay(d.removedAt)}
                </span>
              </span>
              <button type="button" className="st-button pg-small" onClick={() => void restore(d)} aria-disabled={busy !== null || undefined}>
                {busy === d.id ? "Restoring…" : "Restore"}
                <span className="pg-sr"> {d.name}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

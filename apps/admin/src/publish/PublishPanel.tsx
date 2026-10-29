import { useCallback, useEffect, useRef, useState } from "react";
import { publishRuns, startPublish, type PendingChanges, type PublishRun } from "../api-client";
import { Dialog } from "../pages/PageActions";
import { describeChanges } from "./changes";
import { chooseLiveUrl } from "./live-url";

export interface PublishPanelProps {
  /** Publishing runs on GitHub, so it needs the GitHub connection. */
  githubOn: boolean;
  /** site.json's baseUrl; may still be the example placeholder. */
  siteUrl: string;
  /** What the next publish changes (F016); null while unknown. */
  changes?: PendingChanges | null;
  /** Page titles by address, to name pages in the list of changes. */
  titles?: Map<string, string>;
  /** Pages with changes only in this browser (F022): offered for saving before publishing. */
  drafts?: { path: string; title: string }[];
  /** Saves those drafts to GitHub; resolves to null or a plain-language problem. */
  onSaveDrafts?: () => Promise<string | null>;
  /** Called when a publish this panel watched finishes. */
  onFinished?: () => void;
}

/** The latest publish, in the owner's words. */
export function describeRun(run: PublishRun | undefined): { label: string; tone: "idle" | "busy" | "ok" | "error" } {
  if (!run) return { label: "Not published yet.", tone: "idle" };
  if (run.status !== "completed") return { label: run.status === "queued" ? "Waiting to start…" : "Publishing…", tone: "busy" };
  if (run.conclusion === "success") return { label: "Live.", tone: "ok" };
  if (run.conclusion === "cancelled") return { label: "Cancelled.", tone: "error" };
  return { label: "Failed. Nothing changed on the live site.", tone: "error" };
}

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));

export function PublishPanel({ githubOn, siteUrl, changes = null, titles = new Map(), drafts = [], onSaveDrafts, onFinished }: PublishPanelProps) {
  const [runs, setRuns] = useState<PublishRun[] | null>(null);
  const [message, setMessage] = useState("");
  const [failure, setFailure] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [asking, setAsking] = useState(false);
  const [starting, setStarting] = useState(false);
  const [reportedUrl, setReportedUrl] = useState<string | null>(null);
  // The run seen in progress, so its finish can refresh what's waiting.
  const watching = useRef<number | null>(null);
  const finished = useRef(onFinished);
  finished.current = onFinished;

  const refresh = useCallback(async () => {
    const res = await publishRuns();
    if (!res.ok) return;
    setRuns(res.runs);
    if (res.liveUrl !== undefined) setReportedUrl(res.liveUrl);
    const latest = res.runs[0];
    if (latest && latest.status !== "completed") watching.current = latest.id;
    else if (latest && watching.current === latest.id) {
      watching.current = null;
      finished.current?.();
    }
  }, []);

  useEffect(() => {
    if (githubOn) void refresh();
  }, [githubOn, refresh]);

  const latest = runs?.[0];
  const busy = starting || (latest !== undefined && latest.status !== "completed");

  // While a publish runs, check every 10 seconds.
  useEffect(() => {
    if (!githubOn || !busy) return;
    const t = setInterval(() => void refresh(), 10_000);
    return () => clearInterval(t);
  }, [githubOn, busy, refresh]);

  // F022: drafts only in this browser would be left out, so ask first.
  const requestPublish = () => {
    if (busy) return;
    if (drafts.length && onSaveDrafts) setAsking(true);
    else void publish();
  };

  const publish = async () => {
    if (busy) return;
    setStarting(true);
    setFailure("");
    setMessage("Starting…");
    const res = await startPublish();
    if (res.ok) {
      setMessage("Publishing started. It usually takes 2 to 3 minutes; this panel updates by itself.");
      // GitHub needs a moment before the new run shows up.
      setTimeout(() => {
        void refresh().finally(() => setStarting(false));
      }, 4000);
    } else {
      setMessage("");
      setFailure(`Couldn't start publishing: ${res.error} Nothing changed on the live site; try again in a minute.`);
      setStarting(false);
    }
  };

  const state = describeRun(latest);
  const pending = changes ? describeChanges(changes, titles) : null;
  const liveUrl = chooseLiveUrl(reportedUrl, siteUrl);
  // The button says how much it will change; with nothing waiting it steps back to a secondary "Publish again".
  const draftItems = drafts.map((d) => `${d.title} (${d.path}): changes in this browser, saved when you publish`);
  const allItems = [...draftItems, ...(pending?.items ?? [])];
  const waiting = allItems.length;
  const nothingNew = changes?.lastPublish != null && waiting === 0;
  // Before the first publish the summary already says everything goes live.
  const summary =
    pending && draftItems.length && changes?.lastPublish
      ? waiting === 1
        ? "1 change waiting to go live:"
        : `${waiting} changes waiting to go live:`
      : pending?.summary;
  const publishLabel = busy
    ? "Publishing…"
    : nothingNew
      ? "Publish again"
      : waiting > 0
        ? `Publish ${waiting === 1 ? "1 change" : `${waiting} changes`}`
        : "Publish site";
  const LIMIT = 6;
  const shownItems = showAll ? allItems : allItems.slice(0, LIMIT);

  return (
    <section className="st-card pg-publish" aria-labelledby="publish-h">
      <h2 id="publish-h">Publish</h2>
      {githubOn ? (
        <>
          <p className="st-lede">
            Publishing turns your saved pages into the live site. Only what's saved to GitHub goes live; drafts kept in this
            browser don't.
          </p>
          <p className={`pg-run is-${state.tone}`}>
            <strong aria-live="polite">{state.label}</strong>
            {latest ? (
              <>
                {" "}
                Last publish started {formatDate(latest.createdAt)}.{" "}
                <a href={latest.url} target="_blank" rel="noreferrer">
                  Details on GitHub
                </a>
              </>
            ) : null}
          </p>
          {pending || draftItems.length ? (
            <div className="pg-pending">
              {summary ? <p>{summary}</p> : null}
              {allItems.length ? (
                <ul id="pending-list">
                  {shownItems.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              ) : null}
              {allItems.length > LIMIT ? (
                <button type="button" className="pg-pending-more" aria-expanded={showAll} aria-controls="pending-list" onClick={() => setShowAll((v) => !v)}>
                  {showAll ? "Show fewer" : `Show all ${allItems.length}`}
                </button>
              ) : null}
            </div>
          ) : null}
          <div className="pg-form-actions">
            <button
              type="button"
              className={`st-button${nothingNew && !busy ? "" : " st-button-primary"}`}
              onClick={requestPublish}
              aria-disabled={busy || undefined}
            >
              {publishLabel}
            </button>
            {liveUrl ? (
              <a className="st-button st-link-button" href={liveUrl} target="_blank" rel="noreferrer">
                Open live site<span className="pg-sr"> (opens in a new tab)</span>
              </a>
            ) : null}
          </div>
          {liveUrl ? (
            <p className="st-help pg-live-url">
              Live at <span className="pg-path">{liveUrl.replace(/^https?:\/\//, "")}</span>
            </p>
          ) : runs !== null ? (
            <p className="st-help pg-live-url">The link to your live site appears here after your first publish.</p>
          ) : null}
          <p className="st-status-inline" role="status">
            {message}
          </p>
          {failure ? (
            <p className="st-warning" role="alert">
              {failure}
            </p>
          ) : null}
          {asking && onSaveDrafts ? (
            <SaveDraftsDialog
              drafts={drafts}
              onSave={onSaveDrafts}
              onPublish={() => {
                setAsking(false);
                void publish();
              }}
              onClose={() => setAsking(false)}
            />
          ) : null}
        </>
      ) : (
        <p className="st-lede">
          Publishing from here switches on together with saving to GitHub, after the one-time setup in docs/setup-saving.md.
          Until then the live site doesn't change.
        </p>
      )}
    </section>
  );
}

/** F022: drafts only in this browser don't go live, so offer to save them first. */
function SaveDraftsDialog({
  drafts,
  onSave,
  onPublish,
  onClose,
}: {
  drafts: { path: string; title: string }[];
  onSave: () => Promise<string | null>;
  onPublish: () => void;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const saveRef = useRef<HTMLButtonElement>(null);
  useEffect(() => saveRef.current?.focus(), []);
  const n = drafts.length;

  const saveAndPublish = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    const failed = await onSave();
    setBusy(false);
    if (failed) setError(failed);
    else onPublish();
  };

  return (
    <Dialog labelledBy="save-drafts-h" describedBy="save-drafts-body" onClose={onClose}>
      <div className="pg-form">
        <h2 id="save-drafts-h">{n === 1 ? "Save 1 page first?" : `Save ${n} pages first?`}</h2>
        <div className="pg-dialog-body" id="save-drafts-body">
          <p>
            {n === 1 ? "This page has" : "These pages have"} changes only in this browser:{" "}
            {drafts.map((d) => d.title).join(", ")}. Publishing puts only what's saved on GitHub live.
          </p>
        </div>
        {error ? (
          <p className="st-error" role="alert">
            {error}
          </p>
        ) : null}
        <div className="pg-form-actions">
          <button ref={saveRef} type="button" className="st-button st-button-primary" onClick={saveAndPublish} aria-disabled={busy || undefined}>
            {busy ? "Saving…" : "Save and publish"}
          </button>
          <button type="button" className="st-button" onClick={onPublish}>
            Publish without {n === 1 ? "it" : "them"}
          </button>
          <button type="button" className="st-button" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </Dialog>
  );
}

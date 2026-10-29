import { useCallback, useEffect, useRef, useState } from "react";
import { publishRuns, startPublish, type PendingChanges, type PublishRun } from "../api-client";
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

export function PublishPanel({ githubOn, siteUrl, changes = null, titles = new Map(), onFinished }: PublishPanelProps) {
  const [runs, setRuns] = useState<PublishRun[] | null>(null);
  const [message, setMessage] = useState("");
  const [failure, setFailure] = useState("");
  const [showAll, setShowAll] = useState(false);
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
  const waiting = pending?.items.length ?? 0;
  const nothingNew = changes?.lastPublish != null && waiting === 0;
  const publishLabel = busy
    ? "Publishing…"
    : nothingNew
      ? "Publish again"
      : waiting > 0
        ? `Publish ${waiting === 1 ? "1 change" : `${waiting} changes`}`
        : "Publish site";
  const LIMIT = 6;
  const shownItems = pending && !showAll ? pending.items.slice(0, LIMIT) : (pending?.items ?? []);

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
          {pending ? (
            <div className="pg-pending">
              <p>{pending.summary}</p>
              {pending.items.length ? (
                <ul id="pending-list">
                  {shownItems.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              ) : null}
              {pending.items.length > LIMIT ? (
                <button type="button" className="pg-pending-more" aria-expanded={showAll} aria-controls="pending-list" onClick={() => setShowAll((v) => !v)}>
                  {showAll ? "Show fewer" : `Show all ${pending.items.length}`}
                </button>
              ) : null}
            </div>
          ) : null}
          <div className="pg-form-actions">
            <button
              type="button"
              className={`st-button${nothingNew && !busy ? "" : " st-button-primary"}`}
              onClick={publish}
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

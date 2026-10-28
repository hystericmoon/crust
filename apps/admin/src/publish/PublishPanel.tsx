import { useCallback, useEffect, useState } from "react";
import { publishRuns, startPublish, type PublishRun } from "../api-client";

export interface PublishPanelProps {
  /** Publishing runs on GitHub, so it needs the GitHub connection. */
  githubOn: boolean;
  liveUrl: string;
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

export function PublishPanel({ githubOn, liveUrl }: PublishPanelProps) {
  const [runs, setRuns] = useState<PublishRun[] | null>(null);
  const [message, setMessage] = useState("");
  const [starting, setStarting] = useState(false);

  const refresh = useCallback(async () => {
    const res = await publishRuns();
    if (res.ok) setRuns(res.runs);
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
    setMessage("Starting…");
    const res = await startPublish();
    if (res.ok) {
      setMessage("Publishing started. It usually takes 2 to 3 minutes; this panel updates by itself.");
      // GitHub needs a moment before the new run shows up.
      setTimeout(() => {
        void refresh().finally(() => setStarting(false));
      }, 4000);
    } else {
      setMessage(`Couldn't start publishing: ${res.error}`);
      setStarting(false);
    }
  };

  const state = describeRun(latest);

  return (
    <section className="st-card pg-publish" aria-labelledby="publish-h">
      <h2 id="publish-h">Publish</h2>
      {githubOn ? (
        <>
          <p className="st-lede">
            Publishing turns your saved pages into the live site. Only what's saved to GitHub goes live; drafts kept in this
            browser don't.
          </p>
          <p className={`pg-run is-${state.tone}`} aria-live="polite">
            <strong>{state.label}</strong>
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
          <div className="pg-form-actions">
            <button type="button" className="st-button st-button-primary" onClick={publish} aria-disabled={busy || undefined}>
              {busy ? "Publishing…" : "Publish site"}
            </button>
            <a className="st-button st-link-button" href={liveUrl} target="_blank" rel="noreferrer">
              Open live site
            </a>
          </div>
          <p className="st-status-inline" role="status">
            {message}
          </p>
        </>
      ) : (
        <p className="st-lede">
          Publishing from here switches on together with saving to GitHub. Until then the live site doesn't change.
        </p>
      )}
    </section>
  );
}

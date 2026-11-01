/**
 * F061: what the screens show about updates. A ready update gets a calm
 * banner on the Pages and Sites screens (not over the builder, so it never
 * covers what someone is working on); it installs when Crust quits anyway,
 * so "Restart now" is only a shortcut. The Sites screen also has a card with
 * the version and "Check for updates".
 */
import { useEffect, useId, useState } from "react";
import { Dialog } from "../pages/PageActions";
import { desktopUpdates, hasUnsavedChanges, phaseLine, releaseDate, type Updater, type UpdatePhase } from "./updates";

function usePhase(updater: Updater | null): UpdatePhase {
  const [phase, setPhase] = useState<UpdatePhase>(updater?.phase ?? { kind: "idle" });
  useEffect(() => {
    if (!updater) return;
    setPhase(updater.phase);
    // A new object each time, so "Later" (same phase) re-renders too.
    return updater.subscribe((p) => setPhase({ ...p }));
  }, [updater]);
  return phase;
}

function WhatsNew({ version, notes, date, onClose }: { version: string; notes: string[]; date: string | null; onClose: () => void }) {
  const id = useId();
  const when = releaseDate(date);
  return (
    <Dialog labelledBy={`${id}-h`} onClose={onClose}>
      <div className="pg-form">
        <div className="pg-dialog-body">
          <h2 id={`${id}-h`}>What's new in Crust {version}</h2>
          {when ? <p className="st-help">Released {when}</p> : null}
          {notes.length ? (
            <ul className="up-notes">
              {notes.map((note, i) => (
                <li key={i}>{note}</li>
              ))}
            </ul>
          ) : (
            <p>Fixes and improvements.</p>
          )}
        </div>
        <div className="pg-form-actions">
          <button type="button" className="st-button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </Dialog>
  );
}

/** "Restart now", asking first if a restart would lose unsaved changes. */
function RestartButton({ updater }: { updater: Updater }) {
  const [asking, setAsking] = useState(false);
  const restart = () => {
    if (!asking && hasUnsavedChanges()) {
      setAsking(true);
      return;
    }
    void updater.restart();
  };
  return (
    <>
      <button type="button" className="st-button st-button-primary" onClick={restart}>
        {asking ? "Restart anyway" : "Restart now"}
      </button>
      {asking ? (
        <p className="st-error up-warning" role="alert">
          You have unsaved changes in Site settings. Save them first, or they'll be lost when Crust restarts.
        </p>
      ) : null}
    </>
  );
}

/** The banner shown when an update is ready. Nothing on the web. */
export function UpdateBanner({ updater = desktopUpdates() }: { updater?: Updater | null }) {
  const phase = usePhase(updater);
  const [reading, setReading] = useState(false);
  const id = useId();
  if (!updater || phase.kind !== "ready" || updater.dismissed) return null;
  return (
    <section className="st-card up-banner" aria-labelledby={`${id}-h`}>
      <h2 id={`${id}-h`} className="up-title">
        Crust {phase.version} is ready
      </h2>
      <p className="st-help">It's installed the next time Crust opens. Your sites aren't touched.</p>
      <div className="up-actions">
        <RestartButton updater={updater} />
        <button type="button" className="st-button" onClick={() => setReading(true)}>
          What's new
        </button>
        <button type="button" className="st-button" onClick={() => updater.dismiss()}>
          Later
        </button>
      </div>
      {reading ? <WhatsNew version={phase.version} notes={phase.notes} date={phase.date} onClose={() => setReading(false)} /> : null}
    </section>
  );
}

/** The Sites screen's card: the version, and "Check for updates". */
export function AboutCrust({ updater = desktopUpdates() }: { updater?: Updater | null }) {
  const phase = usePhase(updater);
  const [reading, setReading] = useState(false);
  // Shown once the app has said which version it is.
  if (!updater || !updater.current) return null;
  const busy = phase.kind === "checking" || phase.kind === "downloading";
  return (
    <section className="st-card up-about" aria-labelledby="about-crust-h">
      <h2 id="about-crust-h">Crust</h2>
      {/* Announced politely; the screen's own status line stays the one "status". */}
      <p className="up-line" aria-live="polite">
        {phaseLine(phase, updater.current)}
      </p>
      {phase.kind === "downloading" && phase.percent !== null ? (
        <progress className="up-progress" max={100} value={phase.percent} aria-label={`Downloading Crust ${phase.version}`} />
      ) : null}
      <div className="up-actions">
        {phase.kind === "ready" ? (
          // The banner above offers these until it's put away with "Later".
          updater.dismissed ? (
            <>
              <RestartButton updater={updater} />
              <button type="button" className="st-button" onClick={() => setReading(true)}>
                What's new
              </button>
            </>
          ) : null
        ) : (
          <button type="button" className="st-button" aria-disabled={busy || undefined} onClick={() => (busy ? undefined : void updater.check(true))}>
            {phase.kind === "failed" ? "Try again" : "Check for updates"}
          </button>
        )}
      </div>
      {reading && phase.kind === "ready" ? <WhatsNew version={phase.version} notes={phase.notes} date={phase.date} onClose={() => setReading(false)} /> : null}
    </section>
  );
}

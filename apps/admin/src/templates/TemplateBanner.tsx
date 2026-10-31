/**
 * F048 on the Pages screen: after "Start from a template", says so and
 * offers "Bring back my previous site" (asked first, like applying).
 */
import { useEffect, useId, useRef, useState } from "react";
import { lastTemplate } from "../api-client";
import { Dialog, focusAfterDialog } from "../pages/PageActions";
import { beforeTemplate, forgetBrowserSite, setJustApplied, takeJustApplied } from "./local-site";
import { bringBack } from "./start";
import "./templates.css";

interface Switch {
  name: string;
  /** null: applied in this browser only. */
  commit: string | null;
}

const reload = () => {
  location.hash = "#/";
  location.reload();
};

export function TemplateBanner({ githubOn, onDone = reload }: { githubOn: boolean | null; onDone?: () => void }) {
  const [just] = useState(takeJustApplied);
  const [last, setLast] = useState<Switch | null>(null);
  const [asking, setAsking] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (githubOn === null) return;
    const kept = beforeTemplate();
    if (!githubOn) {
      setLast(kept && kept.commit === null ? { name: kept.name, commit: null } : null);
      return;
    }
    void lastTemplate().then((res) => {
      const found = res.ok ? res.last : null;
      // The kept-aside copy belongs to one switch; once that isn't the latest, it can't come back.
      if (res.ok && kept?.commit && kept.commit !== found?.commit) forgetBrowserSite();
      setLast(found ? { name: found.name, commit: found.commit } : null);
    });
  }, [githubOn]);

  useEffect(() => {
    if (just) headingRef.current?.focus();
  }, [just, last]);

  if (!last && !just) return null;
  return (
    <section className="st-card tp-banner" aria-labelledby="template-banner-h">
      <h2 id="template-banner-h" ref={headingRef} tabIndex={-1}>
        {last ? `Your site uses the “${last.name}” template` : "Your previous site is back"}
      </h2>
      <p role="status">{just}</p>
      {last ? (
        <>
          <p>Pages with sample text or photos say how many are left to replace. Publishing waits until none are left.</p>
          <div>
            <button ref={buttonRef} type="button" className="st-button" onClick={() => setAsking(true)}>
              Bring back my previous site
            </button>
          </div>
        </>
      ) : null}
      {asking && last ? (
        <BringBackDialog
          last={last}
          onClose={() => {
            setAsking(false);
            focusAfterDialog(() => buttonRef.current);
          }}
          onDone={onDone}
        />
      ) : null}
    </section>
  );
}

function BringBackDialog({ last, onClose, onDone }: { last: Switch; onClose: () => void; onDone: () => void }) {
  const id = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirm = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    const failed = await bringBack(last.commit);
    if (failed) {
      setBusy(false);
      setError(failed);
      return;
    }
    setJustApplied(last.commit ? "Your previous site is back. It's saved to GitHub; visitors see it after you publish." : "Your previous site is back in this browser.");
    onDone();
  };

  return (
    <Dialog labelledBy={`${id}-h`} describedBy={`${id}-body`} onClose={busy ? () => undefined : onClose}>
      <div className="pg-form">
        <h2 id={`${id}-h`}>Bring back the site you had before “{last.name}”?</h2>
        <div className="pg-dialog-body" id={`${id}-body`}>
          <p>
            Your pages, blog posts, linked sections, style, header and footer go back to how they were before you started from the
            template. Changes you made to them since then are replaced too.
          </p>
          <p>
            Saved layouts the template added are removed again.
            {last.commit ? " Photos it added stay in your photo library." : ""}
          </p>
        </div>
        {error ? (
          <p className="st-error" role="alert">
            {error}
          </p>
        ) : null}
        <div className="pg-form-actions">
          <button type="button" className="st-button" onClick={onClose} disabled={busy} autoFocus>
            Cancel
          </button>
          <button type="button" className="st-button st-button-primary" onClick={confirm} aria-disabled={busy || undefined}>
            {busy ? "Bringing it back…" : "Bring back my previous site"}
          </button>
        </div>
      </div>
    </Dialog>
  );
}

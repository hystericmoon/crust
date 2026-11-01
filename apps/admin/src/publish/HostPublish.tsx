/**
 * F058: the "publish to a host" part of the app's Publish card, and its
 * connect dialog (design/f058-publish-to-host-v1.html, direction A).
 * Before connecting: two host buttons. After: where the site goes, one
 * Publish button, and when it last went there.
 */
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Dialog, focusAfterDialog } from "../pages/PageActions";
import { describeBuild } from "./DesktopPublishPanel";
import {
  addressProblem,
  asHostFailure,
  describeProgress,
  HOSTS,
  tidyAddress,
  whenPublished,
  type HostAccount,
  type HostConnection,
  type HostFailure,
  type HostKind,
  type HostProgress,
  type HostsApi,
  type HostStatus,
} from "./hosts";
import type { BuildReport } from "../desktop/local-publish";

type Run =
  | { kind: "idle" }
  | { kind: "busy"; progress: HostProgress | null }
  | { kind: "live"; url: string; report: BuildReport; uploaded: number }
  | { kind: "failed"; failure: HostFailure };

type Open = { mode: "connect"; host: HostKind } | { mode: "token" } | { mode: "change" } | null;

/** The publish check's "Nothing was published. Fix …:\n  - …" split into a sentence and a list. */
export function problemList(message: string): { lead: string; items: string[] } {
  const [first = "", ...rest] = message.split("\n");
  return { lead: first, items: rest.map((l) => l.replace(/^\s*-\s*/, "").trim()).filter(Boolean) };
}

export function HostPublish({
  hosts,
  busyElsewhere,
  onBusy,
  onConnection,
}: {
  hosts: HostsApi;
  busyElsewhere?: boolean;
  onBusy?: (busy: boolean) => void;
  /** Tells the card where the site is published (null: nowhere yet). */
  onConnection?: (url: string | null) => void;
}) {
  const [status, setStatus] = useState<HostStatus | null>(null);
  const [run, setRun] = useState<Run>({ kind: "idle" });
  const [open, setOpen] = useState<Open>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const publishRef = useRef<HTMLButtonElement>(null);
  const firstHostRef = useRef<HTMLButtonElement>(null);
  const busy = run.kind === "busy";

  useEffect(() => {
    let live = true;
    hosts
      .status()
      .then((s) => live && setStatus(s))
      .catch((e) => live && setLoadError(asHostFailure(e).message));
    return () => {
      live = false;
    };
  }, [hosts]);

  const connection = status?.connection ?? null;
  const url = connection?.url ?? null;
  useEffect(() => {
    onConnection?.(url);
  }, [url, onConnection]);

  const publish = async () => {
    if (busy || busyElsewhere) return;
    setRun({ kind: "busy", progress: null });
    onBusy?.(true);
    try {
      const { published, report } = await hosts.publish((progress) => setRun({ kind: "busy", progress }));
      setRun({ kind: "live", url: published.url, report, uploaded: published.uploaded });
      setStatus((s) => (s?.connection ? { ...s, connection: { ...s.connection, lastPublished: Date.now() } } : s));
    } catch (e) {
      setRun({ kind: "failed", failure: asHostFailure(e) });
    } finally {
      onBusy?.(false);
    }
  };

  const closeDialog = (focus: () => HTMLElement | null) => {
    setOpen(null);
    focusAfterDialog(focus);
  };

  const connected = (c: HostConnection) => {
    setStatus((s) => ({ suggestedName: s?.suggestedName ?? c.project, connection: c }));
    setRun({ kind: "idle" });
    closeDialog(() => publishRef.current);
  };

  const disconnect = async () => {
    try {
      await hosts.disconnect();
      setStatus((s) => ({ suggestedName: s?.suggestedName ?? "", connection: null }));
      setRun({ kind: "idle" });
      closeDialog(() => firstHostRef.current);
    } catch (e) {
      setRun({ kind: "failed", failure: asHostFailure(e) });
      closeDialog(() => publishRef.current);
    }
  };

  if (loadError) {
    return (
      <p className="st-error" role="alert">
        {loadError}
      </p>
    );
  }
  if (!status) return <p className="st-help">Checking where this site is published…</p>;

  const product = connection ? HOSTS[connection.host].product : "";
  const failure = run.kind === "failed" ? run.failure : null;

  return (
    <div className="hp">
      {connection ? (
        <>
          <p className="hp-where">
            <span className="hp-dot" aria-hidden="true" />
            <span>
              {product}
              {connection.accountName ? <span className="hp-account"> · {connection.accountName}</span> : null}
            </span>
            <span className="pg-path">{connection.url.replace(/^https:\/\//, "")}</span>
          </p>
          <div className="pg-form-actions">
            <button ref={publishRef} type="button" className="st-button st-button-primary" onClick={publish} aria-disabled={busy || busyElsewhere || undefined}>
              Publish
            </button>
          </div>
          <p className="st-help dp-help">
            {connection.lastPublished ? `Last published ${whenPublished(connection.lastPublished)}.` : "Not published here yet."}{" "}
            <button type="button" className="hp-link" onClick={() => setOpen({ mode: "change" })}>
              Change or disconnect
            </button>
          </p>
          {!connection.hasToken && run.kind !== "failed" ? (
            <div className="dp-box dp-warn">
              <p>
                <strong>This computer's keychain no longer has the {HOSTS[connection.host].name} token.</strong> Paste it again to publish.
              </p>
              <div className="pg-form-actions">
                <button type="button" className="st-button" onClick={() => setOpen({ mode: "token" })}>
                  Paste a new token
                </button>
              </div>
            </div>
          ) : null}
        </>
      ) : (
        <>
          <p className="st-help hp-intro">Put your site online with a free host. You need an account there.</p>
          <div className="hp-hosts">
            {(["cloudflare", "netlify"] as const).map((host, i) => (
              <button key={host} ref={i === 0 ? firstHostRef : undefined} type="button" className="hp-host" onClick={() => setOpen({ mode: "connect", host })}>
                <strong>{HOSTS[host].product}</strong>
                <span>Connect…</span>
              </button>
            ))}
          </div>
        </>
      )}

      <div role="status" className="dp-status">
        {run.kind === "busy" ? (
          <>
            <p>
              <span className="dp-spin" aria-hidden="true" />
              {describeProgress(run.progress)}
            </p>
            {run.progress && run.progress.total > 0 ? (
              <progress className="hp-progress" max={run.progress.total} value={run.progress.done} aria-label="Upload progress" />
            ) : null}
            {run.progress ? <p className="st-help">Only changed files are sent; the rest are already there.</p> : null}
          </>
        ) : run.kind === "live" ? (
          <div className="dp-box dp-done">
            <p>
              <strong>Your site is live.</strong> {describeBuild(run.report)}
            </p>
            <p className="pg-path">{run.url}</p>
            <div className="pg-form-actions">
              <button type="button" className="st-button" onClick={() => void hosts.openSite().catch((e) => setRun({ kind: "failed", failure: asHostFailure(e) }))}>
                Open the site<span className="pg-sr"> (opens your web browser)</span>
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {failure ? <Failure failure={failure} onToken={() => setOpen({ mode: "token" })} onReconnect={() => connection && setOpen({ mode: "connect", host: connection.host })} /> : null}

      {open?.mode === "connect" ? (
        <ConnectDialog
          hosts={hosts}
          host={open.host}
          suggestedName={connection?.project ?? status.suggestedName}
          onClose={() => closeDialog(() => (connection ? publishRef.current : firstHostRef.current))}
          onConnected={connected}
        />
      ) : open?.mode === "token" && connection ? (
        <ConnectDialog hosts={hosts} host={connection.host} replace onClose={() => closeDialog(() => publishRef.current)} onConnected={connected} />
      ) : open?.mode === "change" && connection ? (
        <ChangeDialog
          connection={connection}
          onOther={(host) => setOpen({ mode: "connect", host })}
          onDisconnect={disconnect}
          onClose={() => closeDialog(() => publishRef.current)}
        />
      ) : null}
    </div>
  );
}

function Failure({ failure, onToken, onReconnect }: { failure: HostFailure; onToken: () => void; onReconnect: () => void }) {
  if (failure.kind === "offline") {
    return (
      <div className="dp-box dp-warn" role="alert">
        <p>
          <strong>{failure.message.replace(/ \(.*\)$/, "")}</strong> Nothing on the live site changed.
        </p>
      </div>
    );
  }
  const { lead, items } = failure.kind === "problems" ? problemList(failure.message) : { lead: failure.message, items: [] };
  const nothing = failure.kind === "problems" || lead.startsWith("Nothing was") ? "" : "Nothing was published. ";
  return (
    <div className="dp-box dp-failed" role="alert">
      <p>
        <strong>
          {nothing}
          {lead}
        </strong>
      </p>
      {items.length ? (
        <ul>
          {items.map((p, i) => (
            <li key={i}>{p}</li>
          ))}
        </ul>
      ) : null}
      {failure.kind === "token" ? (
        <div className="pg-form-actions">
          <button type="button" className="st-button st-button-primary" onClick={onToken}>
            Paste a new token
          </button>
        </div>
      ) : failure.kind === "gone" ? (
        <div className="pg-form-actions">
          <button type="button" className="st-button st-button-primary" onClick={onReconnect}>
            Connect again
          </button>
        </div>
      ) : null}
    </div>
  );
}

/** Step 1: make and paste a token. Step 2: pick the address (and the account, if several). */
function ConnectDialog({
  hosts,
  host,
  suggestedName = "",
  replace = false,
  onClose,
  onConnected,
}: {
  hosts: HostsApi;
  host: HostKind;
  suggestedName?: string;
  /** "Paste a new token" for the connected site: only step 1. */
  replace?: boolean;
  onClose: () => void;
  onConnected: (c: HostConnection) => void;
}) {
  const id = useId();
  const info = HOSTS[host];
  const [step, setStep] = useState<"token" | "address">("token");
  const [token, setToken] = useState("");
  const [accounts, setAccounts] = useState<HostAccount[]>([]);
  const [account, setAccount] = useState(0);
  const [name, setName] = useState(suggestedName);
  const [error, setError] = useState<{ message: string; suggestion?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const tokenRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (step === "token" ? tokenRef : nameRef).current?.focus();
  }, [step]);

  const fail = (message: string, ref: React.RefObject<HTMLInputElement | null>, suggestion?: string) => {
    setError({ message, suggestion });
    ref.current?.focus();
  };

  const checkToken = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (!token.trim()) return fail("Paste the token first.", tokenRef);
    setBusy(true);
    setError(null);
    try {
      if (replace) {
        onConnected(await hosts.replaceToken(token));
        return;
      }
      const found = await hosts.checkToken(host, token);
      setAccounts(found);
      setAccount(0);
      setStep("address");
    } catch (err) {
      fail(asHostFailure(err).message, tokenRef);
    } finally {
      setBusy(false);
    }
  };

  const connect = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const problem = addressProblem(host, name);
    if (problem) return fail(problem, nameRef);
    setBusy(true);
    setError(null);
    try {
      onConnected(await hosts.connect(host, token, accounts[account] ?? { id: "", name: "" }, name));
    } catch (err) {
      const f = asHostFailure(err);
      if (f.kind === "token") {
        setStep("token");
        setError({ message: f.message });
      } else fail(f.message, nameRef, f.suggestion);
    } finally {
      setBusy(false);
    }
  };

  const title = replace ? `Paste a new ${info.name} token` : `Connect ${info.product}`;
  const errorId = `${id}-error`;

  return (
    <Dialog labelledBy={`${id}-h`} onClose={onClose}>
      {step === "token" ? (
        <form className="pg-form" onSubmit={checkToken} noValidate>
          {replace ? null : <Steps step={1} />}
          <h2 id={`${id}-h`}>{title}</h2>
          <ol className="hp-how" id={`${id}-how`}>
            {info.steps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
          <div className="pg-form-actions">
            <button type="button" className="st-button" onClick={() => void hosts.openTokenPage(host).catch((err) => setError({ message: asHostFailure(err).message }))}>
              Open {info.name} token page<span aria-hidden="true"> ↗</span>
              <span className="pg-sr"> (opens your web browser)</span>
            </button>
          </div>
          <div className="pg-field">
            <label className="st-field-label" htmlFor={`${id}-token`}>
              Paste the token
            </label>
            <input
              ref={tokenRef}
              id={`${id}-token`}
              className="st-input hp-token"
              type="password"
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              value={token}
              aria-invalid={error ? true : undefined}
              aria-describedby={[`${id}-lock`, error ? errorId : null].filter(Boolean).join(" ")}
              onChange={(e) => {
                setToken(e.target.value);
                if (error) setError(null);
              }}
            />
            <p className="st-help" id={`${id}-lock`}>
              Kept in this computer's keychain, not in the site folder.
            </p>
            {error ? (
              <p className="st-error" id={errorId} role="alert">
                {error.message}
              </p>
            ) : null}
          </div>
          <div className="pg-form-actions">
            <button type="submit" className="st-button st-button-primary" aria-disabled={busy || undefined}>
              {busy ? "Checking…" : replace ? "Check and save" : "Check token"}
            </button>
            <button type="button" className="st-button" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <form className="pg-form" onSubmit={connect} noValidate>
          <Steps step={2} />
          <h2 id={`${id}-h`}>Where should this site live?</h2>
          {accounts.length > 1 ? (
            <fieldset className="hp-accounts">
              <legend className="st-field-label">Which {info.name} account?</legend>
              {accounts.map((a, i) => (
                <label key={a.id} className="hp-account-choice">
                  <input type="radio" name={`${id}-account`} checked={i === account} onChange={() => setAccount(i)} /> {a.name || a.id}
                </label>
              ))}
            </fieldset>
          ) : null}
          <div className="pg-field">
            <label className="st-field-label" htmlFor={`${id}-name`}>
              Address
            </label>
            <span className="pg-address">
              <input
                ref={nameRef}
                id={`${id}-name`}
                className="st-input"
                value={name}
                maxLength={info.maxName}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                aria-invalid={error ? true : undefined}
                aria-describedby={[`${id}-domain`, `${id}-hint`, error ? errorId : null].filter(Boolean).join(" ")}
                onChange={(e) => {
                  setName(tidyAddress(e.target.value));
                  if (error) setError(null);
                }}
              />
              <span className="pg-prefix" id={`${id}-domain`}>
                {info.domain}
              </span>
            </span>
            <p className="st-help" id={`${id}-hint`}>
              Lowercase letters, numbers and dashes. Already have a {host === "cloudflare" ? "project" : "site"} there? Type its name to publish into it.
            </p>
            {error ? (
              <div id={errorId} role="alert">
                <p className="st-error">{error.message}</p>
                {error.suggestion ? (
                  <button
                    type="button"
                    className="st-button"
                    onClick={() => {
                      setName(error.suggestion!);
                      setError(null);
                      nameRef.current?.focus();
                    }}
                  >
                    Use “{error.suggestion}”
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
          <div className="pg-form-actions">
            <button type="submit" className="st-button st-button-primary" aria-disabled={busy || undefined}>
              {busy ? "Connecting…" : "Connect"}
            </button>
            <button
              type="button"
              className="st-button"
              onClick={() => {
                setError(null);
                setStep("token");
              }}
            >
              Back
            </button>
          </div>
        </form>
      )}
    </Dialog>
  );
}

function Steps({ step }: { step: 1 | 2 }) {
  return (
    <ol className="hp-steps" aria-label="Steps">
      <li className={step === 1 ? "hp-on" : "hp-done"} aria-current={step === 1 ? "step" : undefined}>
        {step === 1 ? "1 · Token" : "✓ Token"}
      </li>
      <li className={step === 2 ? "hp-on" : undefined} aria-current={step === 2 ? "step" : undefined}>
        2 · Address
      </li>
    </ol>
  );
}

function ChangeDialog({
  connection,
  onOther,
  onDisconnect,
  onClose,
}: {
  connection: HostConnection;
  onOther: (host: HostKind) => void;
  onDisconnect: () => void;
  onClose: () => void;
}) {
  const id = useId();
  const other: HostKind = connection.host === "cloudflare" ? "netlify" : "cloudflare";
  return (
    <Dialog labelledBy={`${id}-h`} describedBy={`${id}-body`} onClose={onClose}>
      <div className="pg-form">
        <h2 id={`${id}-h`}>Where this site is published</h2>
        <p className="pg-dialog-body" id={`${id}-body`}>
          Now: {HOSTS[connection.host].product}, <span className="pg-path">{connection.url.replace(/^https:\/\//, "")}</span>. Disconnecting
          only forgets it here: the live site stays online until you remove it on {HOSTS[connection.host].name}.
        </p>
        <div className="pg-form-actions hp-change">
          <button type="button" className="st-button" onClick={() => onOther(connection.host)}>
            Use another address on {HOSTS[connection.host].name}
          </button>
          <button type="button" className="st-button" onClick={() => onOther(other)}>
            Move to {HOSTS[other].product}
          </button>
          <button type="button" className="st-button" onClick={onDisconnect}>
            Disconnect
          </button>
          <button type="button" className="st-button" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </Dialog>
  );
}

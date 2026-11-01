/**
 * F056: the Publish card in the desktop app. There's no GitHub here: the
 * site is built on the computer, then shown in the browser or exported
 * to a folder (design/f056-publish-on-computer-v1.html, direction A).
 */
import { useRef, useState } from "react";
import type { BuildReport, LocalPublisher } from "../desktop/local-publish";
import { Dialog, focusAfterDialog } from "../pages/PageActions";
import { HostPublish } from "./HostPublish";
import type { HostsApi } from "./hosts";

export interface DesktopPublishPanelProps {
  publisher: LocalPublisher;
  /** site.json's baseUrl; may still be the example placeholder. */
  siteUrl: string;
  /** F058: publishing to Cloudflare Pages or Netlify. */
  hosts?: HostsApi | null;
}

const EXAMPLE_ADDRESS = "https://example.pages.dev";
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** "8 pages, 10 photos, search on 9 pages." */
export function describeBuild(r: BuildReport): string {
  const parts = [plural(r.pages, "page")];
  if (r.photos) parts.push(plural(r.photos, "photo"));
  if (r.searchable) parts.push(`search on ${plural(r.searchable, "page")}`);
  return `${parts.join(", ")}.`;
}

/**
 * The app's "Nothing was published. Fix … and publish again:\n  - Page …"
 * in this card's words, split into the sentence and the list of problems.
 */
export function splitProblems(message: string): { lead: string; items: string[] } {
  const [first = "", ...rest] = message.split("\n");
  const lead = first.replace(/^Nothing was published\./, "Nothing was exported.").replace(/publish again:$/, "export again:");
  const items = rest.map((l) => l.replace(/^\s*-\s*/, "").trim()).filter(Boolean);
  return { lead, items };
}

type State =
  | { kind: "idle" }
  | { kind: "busy"; what: "preview" | "export" }
  | { kind: "previewed"; report: BuildReport }
  | { kind: "exported"; report: BuildReport | null; folder: string }
  | { kind: "failed"; lead: string; items: string[] };

export function DesktopPublishPanel({ publisher, siteUrl, hosts }: DesktopPublishPanelProps) {
  const [state, setState] = useState<State>({ kind: "idle" });
  const [replace, setReplace] = useState<{ folder: string; report: BuildReport } | null>(null);
  const exportRef = useRef<HTMLButtonElement>(null);
  const [hostBusy, setHostBusy] = useState(false);
  const [hostUrl, setHostUrl] = useState<string | null>(null);
  const busy = state.kind === "busy" || hostBusy;

  const fail = (e: unknown) => setState({ kind: "failed", ...splitProblems(e instanceof Error ? e.message : String(e)) });

  const preview = async () => {
    if (busy) return;
    setState({ kind: "busy", what: "preview" });
    try {
      const { report } = await publisher.preview();
      setState({ kind: "previewed", report });
    } catch (e) {
      fail(e);
    }
  };

  const exportSite = async () => {
    if (busy) return;
    setState({ kind: "busy", what: "export" });
    try {
      const { result, report } = await publisher.exportSite();
      if (result.status === "done") setState({ kind: "exported", report, folder: result.folder });
      else if (result.status === "exists") {
        setState({ kind: "idle" });
        setReplace({ folder: result.folder, report });
      } else setState({ kind: "idle" });
    } catch (e) {
      fail(e);
    }
  };

  const confirmReplace = async () => {
    const pending = replace;
    setReplace(null);
    focusAfterDialog(() => exportRef.current);
    if (!pending) return;
    setState({ kind: "busy", what: "export" });
    try {
      const result = await publisher.replaceExport();
      setState({ kind: "exported", report: pending.report, folder: result.folder });
    } catch (e) {
      fail(e);
    }
  };

  const folderName = (path: string) => path.split(/[\\/]/).filter(Boolean).pop() ?? path;

  return (
    <section className="st-card pg-publish" aria-labelledby="publish-h">
      <h2 id="publish-h" tabIndex={-1}>
        Publish
      </h2>
      {hosts ? (
        <>
          <p className="st-lede">Crust turns your saved pages into a finished website on your computer, then puts it online.</p>
          <HostPublish hosts={hosts} busyElsewhere={state.kind === "busy"} onBusy={setHostBusy} onConnection={setHostUrl} />
          <h3 className="hp-sub">Or keep it on this computer</h3>
        </>
      ) : (
        <p className="st-lede">
          Crust turns your saved pages into a finished website, right here on your computer. Publishing it to a web host comes in a later
          update.
        </p>
      )}
      <div className="pg-form-actions">
        <button ref={exportRef} type="button" className={hosts ? "st-button" : "st-button st-button-primary"} onClick={exportSite} aria-disabled={busy || undefined}>
          Export site folder
        </button>
        <button type="button" className="st-button" onClick={preview} aria-disabled={busy || undefined}>
          Preview in browser<span className="pg-sr"> (opens your web browser)</span>
        </button>
      </div>
      <p className="st-help dp-help">Both check every page first: titles, headings, photo descriptions.</p>

      <div role="status" className="dp-status">
        {state.kind === "busy" ? (
          <p>
            <span className="dp-spin" aria-hidden="true" />
            {state.what === "export" ? "Building your site to export: pages, photos, search…" : "Building your site: pages, photos, search…"}
          </p>
        ) : state.kind === "previewed" ? (
          <>
            <p>
              <strong className="dp-ok">Opened in your browser.</strong> {describeBuild(state.report)}
            </p>
            {state.report.problems.length ? (
              <div className="dp-box dp-warn">
                <p>
                  <strong>
                    {state.report.problems.length === 1 ? "1 thing to fix before you export:" : `${state.report.problems.length} things to fix before you export:`}
                  </strong>
                </p>
                <ul>
                  {state.report.problems.map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            <p className="st-help">Changed something? Press Preview in browser again, then reload the browser tab.</p>
          </>
        ) : state.kind === "exported" ? (
          <div className="dp-box dp-done">
            <p>
              <strong>Exported.</strong> {state.report ? describeBuild(state.report) : ""} They're in the folder{" "}
              <span className="pg-path dp-path">{state.folder}</span>
            </p>
            <p className="st-help">Upload everything in “{folderName(state.folder)}” to any web host.</p>
            <div className="pg-form-actions">
              <button type="button" className="st-button" onClick={() => void publisher.showExport().catch(fail)}>
                Show the folder
              </button>
            </div>
          </div>
        ) : null}
      </div>
      {state.kind === "failed" ? (
        <div className="dp-box dp-failed" role="alert">
          <p>
            <strong>{state.lead}</strong>
          </p>
          {state.items.length ? (
            <ul>
              {state.items.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
      {siteUrl.replace(/\/+$/, "") === EXAMPLE_ADDRESS ? (
        <p className="st-help dp-help">
          {hostUrl
            ? `Your site's own address isn't set, so links shared from it and the sitemap use ${hostUrl.replace(/^https:\/\//, "")}, where it's published. Using your own domain? Set it in `
            : "Your site's address isn't set yet, so links shared from it and the sitemap use example.pages.dev. Set it in "}
          <a href="#/settings">Site settings → Site address</a>.
        </p>
      ) : null}

      {replace ? (
        <Dialog
          labelledBy="replace-export-h"
          describedBy="replace-export-body"
          onClose={() => {
            setReplace(null);
            focusAfterDialog(() => exportRef.current);
          }}
        >
          <ReplaceExport folder={folderName(replace.folder)} onReplace={confirmReplace} onCancel={() => {
            setReplace(null);
            focusAfterDialog(() => exportRef.current);
          }} />
        </Dialog>
      ) : null}
    </section>
  );
}

function ReplaceExport({ folder, onReplace, onCancel }: { folder: string; onReplace: () => void; onCancel: () => void }) {
  return (
    <div className="pg-form">
      <h2 id="replace-export-h">Replace “{folder}”?</h2>
      <div className="pg-dialog-body" id="replace-export-body">
        <p>There's already a folder with this name there. Replacing it puts the newest version of your site in it; nothing else in that place changes.</p>
      </div>
      <div className="pg-form-actions">
        <button type="button" className="st-button st-button-primary" onClick={onReplace} autoFocus>
          Replace
        </button>
        <button type="button" className="st-button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

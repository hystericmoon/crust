/**
 * Site settings → Save as template (F045): the whole site as one .crust
 * file. The file is read back with the template reader before it's
 * offered, so what downloads always opens again.
 */
import { templateFileName, templateLimits, templateSummary, type PackLayout, type SiteChrome, type SiteTokens } from "@crust/blocks";
import { useId, useState } from "react";
import { useMyLayouts } from "../layouts/mine";
import { collectTemplate, type CollectStep, type TemplateLoader } from "../templates/collect";

const stepLabels: Record<CollectStep, string> = {
  pages: "Collecting pages…",
  sections: "Collecting linked sections…",
  blog: "Collecting the blog…",
  photos: "Adding photos…",
  checking: "Checking the template…",
};

export function downloadText(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const megabytes = (chars: number) => (chars < 1024 * 1024 ? `${Math.max(1, Math.round(chars / 1024))} KB` : `${(chars / 1024 / 1024).toFixed(1)} MB`);

export function TemplateGroup({
  site,
  tokens,
  chrome,
  canSave,
  loader,
  connected,
  onDownload = downloadText,
}: {
  site: { name: string; language: string };
  tokens: SiteTokens;
  chrome: SiteChrome;
  /** False while a Site settings field is invalid. */
  canSave: boolean;
  loader: TemplateLoader;
  /** True when the site comes from GitHub; false on preview links (the sample site). */
  connected: boolean;
  onDownload?: (fileName: string, text: string) => void;
}) {
  const id = useId();
  const mine = useMyLayouts();
  const [name, setName] = useState(site.name);
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [problems, setProblems] = useState<string[]>([]);
  const [summary, setSummary] = useState<string[]>([]);

  const save = async () => {
    if (busy) return;
    setProblems([]);
    setSummary([]);
    if (!canSave) {
      setStatus("Fix the fields marked in red first: the template would carry the mistake.");
      return;
    }
    setBusy(true);
    try {
      const layouts: PackLayout[] = (mine.layouts ?? []).map(({ name, kind, content }) => ({ name, kind, content: content as PackLayout["content"] }));
      const result = await collectTemplate({ name, description }, { ...site, tokens, chrome, layouts }, loader, (step) => setStatus(stepLabels[step]));
      if (!result.text || !result.template) {
        setStatus("Not saved. This site can't be a template yet:");
        setProblems(result.problems);
        return;
      }
      const file = templateFileName(result.template.name);
      onDownload(file, result.text);
      setSummary(templateSummary(result.template));
      setStatus(`Saved ${file} (${megabytes(result.text.length)}). It's in your Downloads folder.`);
    } catch (e) {
      setStatus(`Not saved. ${e instanceof Error ? e.message : "Something went wrong."} Try again in a minute.`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <p className="st-lede">
        Save this whole site as one template file: its pages, linked sections, saved layouts, blog and the photos they use, with
        the style, header and footer. Later you can start new sites from it.
      </p>
      {connected ? null : (
        <p className="st-help">
          This preview isn't connected to GitHub, so the template holds the sample site that comes with the builder.
        </p>
      )}
      <div className="tp-fields">
        <div className="tp-field">
          <label className="st-field-label" htmlFor={`${id}-name`}>
            Template name
          </label>
          <input
            id={`${id}-name`}
            className="st-input"
            value={name}
            maxLength={templateLimits.name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="tp-field">
          <label className="st-field-label" htmlFor={`${id}-desc`}>
            Description <span className="st-help">(optional)</span>
          </label>
          <textarea
            id={`${id}-desc`}
            className="st-input tp-textarea"
            rows={3}
            value={description}
            maxLength={templateLimits.description}
            aria-describedby={`${id}-desc-hint`}
            onChange={(e) => setDescription(e.target.value)}
          />
          <p className="st-help" id={`${id}-desc-hint`}>
            One or two lines about who it's for, shown when picking a template. {templateLimits.description - description.length} characters left.
          </p>
        </div>
      </div>
      <p className="st-help">What you see in Site settings goes in, saved or not. Page edits kept only in this browser don't.</p>
      <button type="button" className="st-button st-button-primary" onClick={save} aria-disabled={busy || undefined}>
        {busy ? "Saving template…" : "Save as template"}
      </button>
      <p className="st-status-inline" role="status" aria-live="polite">
        {status}
      </p>
      {problems.length ? (
        <ul className="st-warning tp-problems">
          {problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      ) : null}
      {summary.length ? (
        <div className="tp-summary">
          <h3>In the template</h3>
          <ul>
            {summary.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </>
  );
}

/**
 * Phone quick edit (F038): the page's words, button labels and photos as a
 * simple form, then Save, or Save and publish. No layout editing; a link
 * opens the full builder.
 */
import type { Page, RichText } from "@crust/blocks";
import type { Data } from "@puckeditor/core";
import { useEffect, useId, useMemo, useState } from "react";
import { saveContent, startPublish, type ApiResult } from "../api-client";
import { ImageField } from "../media/ImageField";
import { fromPuckData, saveLocalDraft, toPuckData } from "../pages/store";
import { RichTextEditor } from "../rich-text/RichTextEditor";
import { applyQuickEdit, quickGroups, type QuickField } from "./quick";
import { ThemeToggle } from "../app-theme/ThemeToggle";

export const fullBuilderHref = (path: string) => `#/edit?path=${encodeURIComponent(path)}&mode=full`;

interface Props {
  page: Page;
  githubOn: boolean;
  /** Same wording as the builder's Save draft (App.saveMessage). */
  saveMessage: (result: ApiResult<unknown>, savedLocally: boolean, what: string) => string;
}

/** `part` tells same-named fields apart for screen readers ("Heading, part 4"). */
function TextInput({ field, part, onChange }: { field: QuickField; part: number; onChange: (v: string) => void }) {
  const id = useId();
  // Starts with the visible label, so voice control ("click Heading") still works.
  const name = `${field.label}, part ${part}`;
  return (
    <div className="qe-field">
      <label className="qe-label" htmlFor={id}>
        {field.label}
      </label>
      {field.kind === "textarea" ? (
        <textarea id={id} aria-label={name} className="qe-input" rows={Math.min(8, Math.max(3, Math.ceil(field.value.length / 40)))} value={field.value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input id={id} aria-label={name} className="qe-input" value={field.value} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  );
}

export function QuickEdit({ page: initial, githubOn, saveMessage }: Props) {
  const [data, setData] = useState<Data>(() => toPuckData(initial));
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const groups = useMemo(() => quickGroups(data), [data]);
  const page = fromPuckData(initial.path, data);
  const root = (data.root.props ?? {}) as { title?: string; description?: string };

  // Every change is kept in this browser right away, like the builder.
  useEffect(() => {
    if (dirty) saveLocalDraft(page, false);
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  const change = (field: QuickField, value: string | RichText, extra?: Record<string, string>) => {
    setData((d) => applyQuickEdit(d, field, value, extra));
    setDirty(true);
  };
  const setRoot = (key: "title" | "description", value: string) => {
    setData((d) => ({ ...d, root: { ...d.root, props: { ...(d.root.props ?? {}), [key]: value } } }));
    setDirty(true);
  };

  const save = async (): Promise<boolean> => {
    if (!page.title.trim()) {
      setStatus("The page needs a title before it can be saved.");
      document.getElementById("qe-title")?.focus();
      return false;
    }
    setBusy(true);
    setStatus("Saving…");
    const local = saveLocalDraft(page, false);
    const result = await saveContent({ kind: "page", page });
    if (result.ok) {
      saveLocalDraft(page, true);
      setDirty(false);
    }
    setStatus(saveMessage(result, local, "Page"));
    setBusy(false);
    return result.ok;
  };

  const saveAndPublish = async () => {
    if (!(await save())) return;
    setBusy(true);
    setStatus("Saved. Starting publish…");
    const res = await startPublish();
    setStatus(
      res.ok
        ? "Saved and publishing. The live site updates in about 2 to 3 minutes; see progress on the Pages screen."
        : `Saved, but publishing didn't start: ${res.error} Try Publish on the Pages screen.`,
    );
    setBusy(false);
  };

  return (
    <div className="qe">
      <header className="qe-bar">
        <a className="qe-back" href="#/">
          <span aria-hidden="true">← </span>Pages
        </a>
        <h1 className="qe-title">Quick edit</h1>
        <a className="qe-full" href={fullBuilderHref(initial.path)}>
          Full builder
        </a>
        <ThemeToggle />
      </header>

      <main className="qe-main">
        <p className="qe-intro">
          Change the words and photos on <strong>{page.title || initial.path}</strong> ({initial.path}). To move, add or remove blocks, use the{" "}
          <a href={fullBuilderHref(initial.path)}>full builder</a>, best on a computer.
        </p>

        <section className="qe-group" aria-labelledby="qe-page-h">
          <h2 id="qe-page-h" className="qe-group-title">
            Page
          </h2>
          <div className="qe-field">
            <label className="qe-label" htmlFor="qe-title">
              Page title
            </label>
            <input id="qe-title" className="qe-input" value={root.title ?? ""} onChange={(e) => setRoot("title", e.target.value)} />
          </div>
          <div className="qe-field">
            <label className="qe-label" htmlFor="qe-description">
              Description (shown in search results)
            </label>
            <textarea id="qe-description" className="qe-input" rows={3} value={root.description ?? ""} onChange={(e) => setRoot("description", e.target.value)} />
          </div>
        </section>

        {groups.length === 0 ? <p className="qe-intro">This page has no words or photos to change yet.</p> : null}
        {groups.map((g, gi) => (
          <section key={`${g.blockId}-${gi}`} className="qe-group" aria-labelledby={`qe-g${gi}`}>
            <h2 id={`qe-g${gi}`} className="qe-group-title">
              <span className="qe-part">{gi + 1}</span> {g.title}
            </h2>
            {g.fields.map((f) =>
              f.kind === "image" ? (
                <ImageField
                  key={f.id}
                  label={f.label}
                  // F069: the picker names the block ("For: Photo, Gallery, block 6"), not "part 6".
                  context={`${g.title}, block ${gi + 1}`}
                  value={f.value}
                  onChange={(v) => change(f, v)}
                  onPick={(src, alt) => change(f, src, f.altKey ? { [f.altKey]: alt } : undefined)}
                />
              ) : f.kind === "rich" ? (
                <div key={f.id} className="qe-field">
                  <RichTextEditor label={f.label} labelSuffix={`, part ${gi + 1}`} value={f.rich} onChange={(v) => change(f, v)} />
                </div>
              ) : (
                <TextInput key={f.id} field={f} part={gi + 1} onChange={(v) => change(f, v)} />
              ),
            )}
          </section>
        ))}
      </main>

      <footer className="qe-foot">
        <p className="qe-status" role="status" aria-live="polite">
          {status || (dirty ? "Changes are kept in this browser. Save to put them on GitHub." : "")}
        </p>
        <div className="qe-actions">
          <button type="button" className={githubOn ? "qe-button" : "qe-button qe-primary"} disabled={busy} onClick={() => void save()}>
            Save
          </button>
          {githubOn ? (
            <button type="button" className="qe-button qe-primary" disabled={busy} onClick={() => void saveAndPublish()}>
              Save and publish
            </button>
          ) : null}
        </div>
      </footer>
    </div>
  );
}

import type { Page } from "@crust/blocks";
import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { checkNewPage, createPage, slugify, type NewPageErrors, type NewPageInput } from "./new-page";
import type { PageRow } from "./store";

export interface PageListProps {
  siteName: string;
  /** null while loading. */
  rows: PageRow[] | null;
  /** Where the list came from, said plainly under the heading. */
  sourceNote: string;
  loadError?: string;
  onCreate: (page: Page) => void;
  /** Shown below the list (the Publish panel). */
  children?: ReactNode;
}

const formatDate = (iso: string | null) =>
  iso ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso)) : "Not recorded yet";

export const editHref = (path: string) => `#/edit?path=${encodeURIComponent(path)}`;

export function PageList({ siteName, rows, sourceNote, loadError, onCreate, children }: PageListProps) {
  const [creating, setCreating] = useState(false);
  return (
    <div className="st">
      <header className="st-header">
        <h1 className="st-title">{siteName}: pages</h1>
        <div className="st-actions">
          <a className="st-button st-link-button" href="#/settings">
            Site settings
          </a>
          <button
            type="button"
            className="st-button st-button-primary"
            aria-expanded={creating}
            aria-controls="new-page"
            onClick={() => setCreating((c) => !c)}
          >
            New page
          </button>
        </div>
      </header>

      <main className="pg">
        {creating ? (
          <NewPageForm existing={rows?.map((r) => r.path) ?? []} onCancel={() => setCreating(false)} onCreate={onCreate} />
        ) : null}

        <section className="st-card" aria-labelledby="pages-h">
          <h2 id="pages-h">Pages</h2>
          <p className="st-lede">{sourceNote}</p>
          {loadError ? (
            <p className="st-error" role="alert">
              {loadError}
            </p>
          ) : null}
          {rows === null ? (
            <p role="status">Loading pages…</p>
          ) : rows.length === 0 ? (
            <p>No pages yet. Use "New page" to make the first one.</p>
          ) : (
            <table className="pg-table">
              <thead>
                <tr>
                  <th scope="col">Title</th>
                  <th scope="col">Address</th>
                  <th scope="col">Last edited</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.path}>
                    <th scope="row">
                      <a href={editHref(row.path)}>{row.title}</a>
                      {row.localChanges ? <span className="pg-badge">Draft in this browser</span> : null}
                    </th>
                    <td className="pg-path" data-label="Address">
                      {row.path}
                    </td>
                    <td data-label="Last edited">{formatDate(row.lastEdited)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
        {children}
      </main>
    </div>
  );
}

function NewPageForm({
  existing,
  onCancel,
  onCreate,
}: {
  existing: string[];
  onCancel: () => void;
  onCreate: (page: Page) => void;
}) {
  const id = useId();
  const [input, setInput] = useState<NewPageInput>({ title: "", address: "", description: "" });
  // The address follows the title until the owner edits it.
  const [addressTouched, setAddressTouched] = useState(false);
  const [errors, setErrors] = useState<NewPageErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => titleRef.current?.focus(), []);

  const update = (next: NewPageInput) => {
    setInput(next);
    if (submitted) setErrors(checkNewPage(next, existing));
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    const found = checkNewPage(input, existing);
    setErrors(found);
    const first = (["title", "address", "description"] as const).find((k) => found[k]);
    if (first) {
      formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      return;
    }
    onCreate(createPage(input));
  };

  const field = (name: keyof NewPageInput) => ({
    id: `${id}-${name}`,
    name,
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": [`${id}-${name}-hint`, errors[name] ? `${id}-${name}-error` : null].filter(Boolean).join(" "),
  });

  return (
    <section className="st-card" id="new-page" aria-labelledby={`${id}-h`}>
      <h2 id={`${id}-h`}>New page</h2>
      <form ref={formRef} className="pg-form" onSubmit={submit} noValidate>
        <div className="pg-field">
          <label className="st-field-label" htmlFor={`${id}-title`}>
            Title
          </label>
          <input
            ref={titleRef}
            className="st-input"
            {...field("title")}
            value={input.title}
            maxLength={140}
            onChange={(e) =>
              update({ ...input, title: e.target.value, address: addressTouched ? input.address : slugify(e.target.value) })
            }
          />
          <p className="st-help" id={`${id}-title-hint`}>
            Shown in the browser tab and in search results.
          </p>
          {errors.title ? (
            <p className="st-error" id={`${id}-title-error`}>
              {errors.title}
            </p>
          ) : null}
        </div>

        <div className="pg-field">
          <label className="st-field-label" htmlFor={`${id}-address`}>
            Address
          </label>
          <span className="pg-address">
            <span className="pg-prefix" aria-hidden="true">
              /
            </span>
            <input
              className="st-input"
              {...field("address")}
              value={input.address}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              onChange={(e) => {
                setAddressTouched(true);
                update({ ...input, address: e.target.value });
              }}
            />
          </span>
          <p className="st-help" id={`${id}-address-hint`}>
            Lowercase letters, numbers and dashes. The page will live at /{input.address || "your-address"}.
          </p>
          {errors.address ? (
            <p className="st-error" id={`${id}-address-error`}>
              {errors.address}
            </p>
          ) : null}
        </div>

        <div className="pg-field">
          <label className="st-field-label" htmlFor={`${id}-description`}>
            Description <span className="st-help">(optional, add it before publishing)</span>
          </label>
          <textarea
            className="st-input pg-textarea"
            {...field("description")}
            value={input.description}
            rows={2}
            onChange={(e) => update({ ...input, description: e.target.value })}
          />
          <p className="st-help" id={`${id}-description-hint`}>
            One or two sentences search engines show under the title.
          </p>
          {errors.description ? (
            <p className="st-error" id={`${id}-description-error`}>
              {errors.description}
            </p>
          ) : null}
        </div>

        <div className="pg-form-actions">
          <button type="submit" className="st-button st-button-primary">
            Create and open
          </button>
          <button type="button" className="st-button" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </form>
    </section>
  );
}

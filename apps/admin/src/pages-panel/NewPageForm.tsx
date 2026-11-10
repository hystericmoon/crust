import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import type { Page } from "@crust/blocks";
import { checkNewPage, createPage, slugify, type NewPageErrors, type NewPageInput } from "../pages/new-page";

export function NewPageForm({
  open,
  existing,
  onCancel,
  onCreate,
}: {
  open: boolean;
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

  useEffect(() => {
    if (open) titleRef.current?.focus();
  }, [open]);

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
    <section className="st-card" id="new-page" aria-labelledby={`${id}-h`} hidden={!open}>
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

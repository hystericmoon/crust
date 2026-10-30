/**
 * Contact form block (F037). A plain HTML form that posts to the contact
 * Worker (packages/contact), so it works without JavaScript; only the
 * Turnstile spam check needs it. After sending, the Worker sends the
 * visitor back to the page with "#<form>-sent" or "#<form>-error" in the
 * address, and CSS (:target) shows the matching message: no script needed.
 *
 * Where the form posts and the Turnstile site key come from the publish
 * step (FormsContext). Without them the form shows, but can't be sent.
 */
import type { ComponentConfig } from "@puckeditor/core";
import { createContext, useContext } from "react";

export interface FormsSetup {
  /** The contact Worker's address, e.g. https://crust-contact.example.workers.dev */
  endpoint: string;
  /** Cloudflare Turnstile site key (public). */
  siteKey: string;
  /** The page's address, so the Worker can send the visitor back. */
  path: string;
}

export const FormsContext = createContext<FormsSetup | null>(null);

export type ExtraField = { label: string; kind: "text" | "tel" | "textarea"; required: "yes" | "no" };

export type ContactFormProps = {
  nameLabel: string;
  emailLabel: string;
  messageLabel: string;
  fields: ExtraField[];
  submitLabel: string;
  successMessage: string;
};

export const contactLimits = { fields: 6, name: 200, email: 254, message: 5000, extra: 1000, label: 60 };

/** Ids and form names: letters, numbers and dashes only. */
export const formIdFor = (id: string | undefined) => `cf-${(id ?? "form").toLowerCase().replace(/[^a-z0-9-]+/g, "-").slice(0, 60)}`;

/** The name an extra field is sent with; the Worker reads its label from it. */
export const extraName = (label: string) => `extra:${label.trim().slice(0, contactLimits.label)}`;

const kinds = [
  { label: "Short text", value: "text" },
  { label: "Phone number", value: "tel" },
  { label: "Long text", value: "textarea" },
];

function Field({ id, label, name, kind, required, autoComplete, maxLength }: { id: string; label: string; name: string; kind: "text" | "email" | "tel" | "textarea"; required: boolean; autoComplete?: string; maxLength: number }) {
  return (
    <div className="cr-form-field">
      <label htmlFor={id}>
        {label}
        {required ? null : <span className="cr-form-optional"> (optional)</span>}
      </label>
      {kind === "textarea" ? (
        <textarea id={id} name={name} rows={6} required={required} maxLength={maxLength} />
      ) : (
        <input id={id} name={name} type={kind} required={required} autoComplete={autoComplete} maxLength={maxLength} {...(kind === "email" ? { spellCheck: false } : {})} />
      )}
    </div>
  );
}

export const ContactForm: ComponentConfig<ContactFormProps> = {
  label: "Contact form",
  fields: {
    nameLabel: { type: "text", label: "Name field label" },
    emailLabel: { type: "text", label: "Email field label" },
    fields: {
      type: "array",
      label: "Extra fields",
      max: contactLimits.fields,
      getItemSummary: (item) => item.label || "Field",
      defaultItemProps: { label: "Phone", kind: "tel", required: "no" },
      arrayFields: {
        label: { type: "text", label: "Label" },
        kind: { type: "select", label: "Kind", options: kinds },
        required: {
          type: "radio",
          label: "Required",
          options: [
            { label: "Yes", value: "yes" },
            { label: "No", value: "no" },
          ],
        },
      },
    },
    messageLabel: { type: "text", label: "Message field label" },
    submitLabel: { type: "text", label: "Button label" },
    successMessage: { type: "textarea", label: "Thank-you message" },
  },
  defaultProps: {
    nameLabel: "Name",
    emailLabel: "Email",
    fields: [],
    messageLabel: "Message",
    submitLabel: "Send message",
    successMessage: "Thank you! Your message is on its way. We'll reply by email.",
  },
  render: function Render({ id, nameLabel, emailLabel, messageLabel, fields, submitLabel, successMessage, puck }: ContactFormProps & { id?: string; puck?: { isEditing?: boolean } }) {
    const setup = useContext(FormsContext);
    const form = formIdFor(id);
    const connected = !!setup?.endpoint;
    const extras = (fields ?? []).filter((f) => f.label?.trim());
    return (
      <div className="cr-form-wrap">
        {/* Shown by CSS when the Worker sends the visitor back to "#<form>-sent" / "#<form>-error". */}
        <div id={`${form}-sent`} className="cr-form-done" tabIndex={-1}>
          <p>{successMessage}</p>
        </div>
        <div id={`${form}-error`} className="cr-form-failed" tabIndex={-1}>
          <p>Sorry, your message couldn't be sent. Please check the form and try again; if it keeps happening, email us instead.</p>
        </div>
        <form
          className="cr-form"
          id={form}
          action={connected ? setup.endpoint : undefined}
          method="post"
          // In the builder (and before it's connected) pressing Send does nothing.
          onSubmit={puck?.isEditing || !connected ? (e) => e.preventDefault() : undefined}
        >
          {!connected ? (
            <p className="cr-form-off">{puck?.isEditing ? "Preview: this form can send messages once it's connected (see the setup steps)." : "This form isn't connected yet. Please contact us another way."}</p>
          ) : null}
          <fieldset className="cr-form-fields" disabled={!connected && !puck?.isEditing}>
            <legend className="cr-form-legend">All fields are required unless marked optional.</legend>
            <input type="hidden" name="form" value={form} />
            <input type="hidden" name="page" value={setup?.path ?? ""} />
            {/* A field people don't see; spam robots fill it in. */}
            <div className="cr-form-trap" aria-hidden="true">
              <label htmlFor={`${form}-website`}>Leave this empty</label>
              <input id={`${form}-website`} name="website" type="text" tabIndex={-1} autoComplete="off" />
            </div>
            <Field id={`${form}-name`} label={nameLabel || "Name"} name="name" kind="text" required autoComplete="name" maxLength={contactLimits.name} />
            <Field id={`${form}-email`} label={emailLabel || "Email"} name="email" kind="email" required autoComplete="email" maxLength={contactLimits.email} />
            {extras.map((f, i) => (
              <Field
                key={i}
                id={`${form}-x${i}`}
                label={f.label.trim()}
                name={extraName(f.label)}
                kind={f.kind === "tel" || f.kind === "textarea" ? f.kind : "text"}
                required={f.required === "yes"}
                autoComplete={f.kind === "tel" ? "tel" : undefined}
                maxLength={contactLimits.extra}
              />
            ))}
            <Field id={`${form}-message`} label={messageLabel || "Message"} name="message" kind="textarea" required maxLength={contactLimits.message} />
            {connected && setup.siteKey ? <div className="cf-turnstile" data-sitekey={setup.siteKey} data-theme="light" /> : null}
            <button type="submit" className="cr-button cr-button-primary">
              {submitLabel || "Send message"}
            </button>
          </fieldset>
        </form>
      </div>
    );
  },
};

/** True when a page has a contact form (it then loads the Turnstile script). */
export function hasContactForm(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(hasContactForm);
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  if (v.type === "ContactForm") return true;
  return Object.values(v).some(hasContactForm);
}

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { config } from "./config";
import { ContactForm, FormsContext, formIdFor, hasContactForm, type ContactFormProps } from "./contact-form";

const props = (over: Partial<ContactFormProps> = {}) => ({ ...(ContactForm.defaultProps as ContactFormProps), ...over, id: "ContactForm-1" });
const Render = ContactForm.render as unknown as (p: Record<string, unknown>) => React.ReactElement;
const html = (p = props(), setup: { endpoint: string; siteKey: string; path: string } | null = { endpoint: "https://w.dev/", siteKey: "site-key", path: "/contact/" }) =>
  renderToStaticMarkup(<FormsContext.Provider value={setup}>{<Render {...p} />}</FormsContext.Provider>);

describe("Contact form block (F037)", () => {
  it("is in the block list, under Forms", () => {
    expect(config.components.ContactForm).toBeTruthy();
    expect(config.categories?.forms?.components).toEqual(["ContactForm"]);
  });

  it("is a plain form posting to the Worker, with labelled fields and autocomplete", () => {
    const out = html(props({ fields: [{ label: "Phone", kind: "tel", required: "no" }] }));
    expect(out).toContain('<form class="cr-form" id="cf-contactform-1" action="https://w.dev/" method="post">');
    expect(out).toContain('<input type="hidden" name="page" value="/contact/"/>');
    expect(out).toContain('<label for="cf-contactform-1-name">Name</label><input id="cf-contactform-1-name" type="text" required="" autoComplete="name" maxLength="200" name="name"/>');
    expect(out).toMatch(/<input id="cf-contactform-1-email" type="email" required="" autoComplete="email"[^>]*name="email"/);
    expect(out).toContain('<label for="cf-contactform-1-x0">Phone<span class="cr-form-optional"> (optional)</span></label><input id="cf-contactform-1-x0" type="tel" autoComplete="tel" maxLength="1000" name="extra:Phone"/>');
    expect(out).toContain('<textarea id="cf-contactform-1-message" name="message" rows="6" required=""');
    expect(out).toContain('<div class="cf-turnstile" data-sitekey="site-key" data-theme="light"></div>');
    expect(out).toContain("All fields are required unless marked optional.");
    expect(out).toContain('<button type="submit" class="cr-button cr-button-primary">Send message</button>');
  });

  it("has a spam trap people never see or reach", () => {
    expect(html()).toContain('<div class="cr-form-trap" aria-hidden="true"><label for="cf-contactform-1-website">Leave this empty</label><input id="cf-contactform-1-website" type="text" tabindex="-1" autoComplete="off" name="website"/></div>');
  });

  it("has the thank-you and error messages the Worker sends visitors back to", () => {
    const out = html(props({ successMessage: "Thanks!" }));
    expect(out).toContain('<div id="cf-contactform-1-sent" class="cr-form-done" tabindex="-1"><p>Thanks!</p></div>');
    expect(out).toContain('<div id="cf-contactform-1-error" class="cr-form-failed" tabindex="-1">');
  });

  it("says so, and can't be sent, before it's connected", () => {
    const out = html(props(), null);
    expect(out).toContain("This form isn&#x27;t connected yet.");
    expect(out).toContain('<fieldset class="cr-form-fields" disabled="">');
    expect(out).not.toContain("action=");
    expect(out).not.toContain("cf-turnstile");
  });

  it("finds forms anywhere on a page", () => {
    expect(hasContactForm({ content: [{ type: "Section", props: { content: [{ type: "ContactForm", props: {} }] } }] })).toBe(true);
    expect(hasContactForm({ content: [{ type: "Text", props: {} }] })).toBe(false);
    expect(formIdFor("Contact Form#2")).toBe("cf-contact-form-2");
  });
});

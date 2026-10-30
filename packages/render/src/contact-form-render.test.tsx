import { defaultTokens, type Page, type Site } from "@crust/blocks";
import { describe, expect, it } from "vitest";
import { renderPage } from "./render";

const site: Site = { name: "Haho", baseUrl: "https://haho.test", language: "en", tokens: defaultTokens };
const page = (content: Page["puck"]["content"]): Page => ({ path: "/contact", title: "Contact", description: "Say hi", puck: { root: { props: {} }, content } });
const form = { type: "ContactForm", props: { id: "ContactForm-1", nameLabel: "Name", emailLabel: "Email", messageLabel: "Message", fields: [], submitLabel: "Send", successMessage: "Thanks" } };

describe("published contact forms (F037)", () => {
  it("posts to the Worker, comes back to this page and loads Turnstile only here", () => {
    const html = renderPage(site, page([form]), "", { forms: { endpoint: "https://w.dev/", siteKey: "k" } });
    expect(html).toContain('action="https://w.dev/"');
    expect(html).toContain('<input type="hidden" name="page" value="/contact/"/>');
    expect(html).toContain('<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>');
    const other = renderPage(site, page([]), "", { forms: { endpoint: "https://w.dev/", siteKey: "k" } });
    expect(other).not.toContain("turnstile");
  });

  it("without the setup, the form says it isn't connected and no script loads", () => {
    const html = renderPage(site, page([form]), "");
    expect(html).toContain("This form isn&#x27;t connected yet.");
    expect(html).not.toContain("<script");
  });
});

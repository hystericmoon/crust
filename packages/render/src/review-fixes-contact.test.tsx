// @vitest-environment happy-dom
// F069 fix 7: a failed contact form send keeps what the visitor typed and names the field to fix (F037).
import { CONTACT_FORM_SCRIPT, defaultTokens, type Page, type Site } from "@crust/blocks";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderPage } from "./render";

const site: Site = { name: "Haho", baseUrl: "https://haho.test", language: "en", tokens: defaultTokens };
const form = { type: "ContactForm", props: { id: "ContactForm-1", nameLabel: "Your name", emailLabel: "Your email", messageLabel: "Message", fields: [], submitLabel: "Send", successMessage: "Thanks" } };
const page: Page = { path: "/contact", title: "Contact", description: "Say hi", puck: { root: { props: {} }, content: [form] } as never };
const html = renderPage(site, page, "", { forms: { endpoint: "https://w.dev/", siteKey: "k" } });

afterEach(() => {
  document.body.innerHTML = "";
  location.hash = "";
  vi.unstubAllGlobals();
});

/** The published form in this document, with the page's own script running. */
function publish(answer: unknown) {
  document.body.innerHTML = html.slice(html.indexOf("<body"), html.lastIndexOf("</body>")).replace(/^<body[^>]*>/, "");
  const fetchMock = vi.fn(async () => new Response(JSON.stringify(answer), { headers: { "Content-Type": "application/json" } }));
  vi.stubGlobal("fetch", fetchMock);
  new Function(`return (async () => {${CONTACT_FORM_SCRIPT}})()`)();
  const el = document.querySelector<HTMLFormElement>("form.cr-form")!;
  const type = (name: string, value: string) => ((el.elements.namedItem(name) as HTMLInputElement).value = value);
  type("name", "Ana");
  type("email", "ana@example");
  type("message", "A long message I don't want to type again.");
  return { el, fetchMock };
}
const submit = async (el: HTMLFormElement) => {
  el.dispatchEvent(new Event("submit", { cancelable: true }));
  for (let i = 0; i < 5; i++) await new Promise((r) => setTimeout(r, 0));
};

describe("review-fixes 7: contact form errors (F037)", () => {
  it("publishes one message per problem, naming the field by its label", () => {
    expect(html).toContain('id="cf-contactform-1-error-email"');
    expect(html).toContain("“Your email” doesn&#x27;t look like a complete email address.");
    expect(html).toContain('id="cf-contactform-1-error-name"');
    expect(html).toContain("Please fill in “Your name”.");
    expect(html).toContain('id="cf-contactform-1-error-check"');
    expect(html).toContain('id="cf-contactform-1-error-send"');
    // The old general message stays for links that still use it.
    expect(html).toContain('id="cf-contactform-1-error"');
    // Without JavaScript the form still posts to the Worker.
    expect(html).toContain('<form class="cr-form" id="cf-contactform-1" action="https://w.dev/" method="post">');
    expect(html).toContain('<script type="module">');
  });

  it("sends in place: what was typed stays, the message shows and focus goes to the field", async () => {
    const { el, fetchMock } = publish({ ok: false, problem: "email", field: "email" });
    await submit(el);
    expect(fetchMock).toHaveBeenCalledWith("https://w.dev/", expect.objectContaining({ method: "POST", headers: { Accept: "application/json" } }));
    expect(location.hash).toBe("#cf-contactform-1-error-email");
    const email = el.elements.namedItem("email") as HTMLInputElement;
    expect(document.activeElement).toBe(email);
    expect(email.getAttribute("aria-invalid")).toBe("true");
    expect(email.getAttribute("aria-describedby")).toBe("cf-contactform-1-error-email");
    expect((el.elements.namedItem("message") as HTMLTextAreaElement).value).toBe("A long message I don't want to type again.");
    expect(document.querySelector(".cr-form-wrap")!.classList.contains("cr-form-js")).toBe(true);
  });

  it("a failed spam check or send focuses the message itself; success shows the thank-you", async () => {
    const failed = publish({ ok: false, problem: "check" });
    await submit(failed.el);
    expect(location.hash).toBe("#cf-contactform-1-error-check");
    expect(document.activeElement?.id).toBe("cf-contactform-1-error-check");
    expect((failed.el.elements.namedItem("name") as HTMLInputElement).value).toBe("Ana");

    const sent = publish({ ok: true });
    await submit(sent.el);
    expect(location.hash).toBe("#cf-contactform-1-sent");
    expect((sent.el.elements.namedItem("name") as HTMLInputElement).value).toBe("");
  });

  it("a network failure is a send problem, and the typing stays", async () => {
    const { el } = publish({});
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new Error("offline"))));
    await submit(el);
    expect(location.hash).toBe("#cf-contactform-1-error-send");
    expect((el.elements.namedItem("message") as HTMLTextAreaElement).value).toContain("A long message");
  });
});

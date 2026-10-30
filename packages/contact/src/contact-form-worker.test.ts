import { describe, expect, it, vi } from "vitest";
import { emailFor, handleContact, readForm, type Env } from "./worker";

const env: Env = { SITE_ORIGIN: "https://haho.pages.dev", TURNSTILE_SECRET: "ts", RESEND_API_KEY: "rk", TO_EMAIL: "owner@example.com", SITE_NAME: "Haho" };

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [k, v] of Object.entries(fields)) data.set(k, v);
  return data;
};
const good = { form: "cf-contact-1", page: "/contact/", name: "Ana", email: "ana@example.com", message: "Hello there", "extra:Phone": "+62 812", "cf-turnstile-response": "token" };

function services(turnstile = true, mail = true) {
  const sent: { url: string; body: unknown }[] = [];
  const fetchFn = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    const u = String(url);
    if (u.includes("turnstile")) {
      const body = init!.body as FormData;
      sent.push({ url: u, body: Object.fromEntries(body.entries()) });
      return new Response(JSON.stringify({ success: turnstile }));
    }
    sent.push({ url: u, body: JSON.parse(String(init!.body)) });
    return new Response("{}", { status: mail ? 200 : 500 });
  }) as unknown as typeof fetch;
  return { fetchFn, sent };
}

const post = (fields: Record<string, string>, fetchFn: typeof fetch, headers: Record<string, string> = { Origin: "https://haho.pages.dev" }) =>
  handleContact(new Request("https://crust-contact.x.workers.dev/", { method: "POST", body: form(fields), headers }), env, fetchFn);

describe("contact form Worker (F037)", () => {
  it("checks Turnstile, emails the owner and sends the visitor back to the thank-you", async () => {
    const { fetchFn, sent } = services();
    const res = await post(good, fetchFn);
    expect(res.status).toBe(303);
    expect(res.headers.get("Location")).toBe("https://haho.pages.dev/contact/#cf-contact-1-sent");
    expect(sent[0]).toMatchObject({ url: "https://challenges.cloudflare.com/turnstile/v0/siteverify", body: { secret: "ts", response: "token" } });
    expect(sent[1]!.url).toBe("https://api.resend.com/emails");
    expect(sent[1]!.body).toMatchObject({ to: ["owner@example.com"], reply_to: "ana@example.com", subject: "Contact form: Ana" });
    expect((sent[1]!.body as { text: string }).text).toContain("Phone: +62 812");
  });

  it("failed spam checks and failed emails go back to the error message", async () => {
    expect((await post(good, services(false).fetchFn)).headers.get("Location")).toBe("https://haho.pages.dev/contact/#cf-contact-1-error");
    expect((await post(good, services(true, false).fetchFn)).headers.get("Location")).toBe("https://haho.pages.dev/contact/#cf-contact-1-error");
    const { fetchFn, sent } = services();
    const { "cf-turnstile-response": _t, ...noToken } = good;
    expect((await post(noToken, fetchFn)).headers.get("Location")).toContain("-error");
    expect(sent).toHaveLength(0);
  });

  it("robots that fill the hidden field see the thank-you, and nothing is sent", async () => {
    const { fetchFn, sent } = services();
    const res = await post({ ...good, website: "http://spam" }, fetchFn);
    expect(res.headers.get("Location")).toContain("#cf-contact-1-sent");
    expect(sent).toHaveLength(0);
  });

  it("checks every field", () => {
    expect(readForm(form(good)).ok).toBe(true);
    for (const bad of [{ name: "" }, { email: "not-an-email" }, { message: "" }, { message: "x".repeat(5001) }, { form: "evil" }]) {
      expect(readForm(form({ ...good, ...bad })).ok, JSON.stringify(bad)).toBe(false);
    }
  });

  it("never sends visitors to another site", async () => {
    const res = await post({ ...good, page: "//evil.example/" }, services().fetchFn);
    expect(res.headers.get("Location")).toBe("https://haho.pages.dev/#cf-contact-1-sent");
    expect((await post(good, services().fetchFn, { Origin: "https://evil.example" })).status).toBe(403);
  });

  it("keeps line breaks out of the subject", () => {
    expect(emailFor({ form: "cf-a", page: "/", name: "Ana\r\nBcc: x@y.z", email: "a@b.co", message: "Hi", extras: [] }, "Haho").subject).toBe("Contact form: Ana Bcc: x@y.z");
  });

  it("explains when it isn't set up, and only takes form posts", async () => {
    const res = await handleContact(new Request("https://w.dev/", { method: "POST", body: form(good) }), { SITE_ORIGIN: "" }, services().fetchFn);
    expect(res.status).toBe(503);
    expect((await handleContact(new Request("https://w.dev/"), env)).status).toBe(405);
  });
});

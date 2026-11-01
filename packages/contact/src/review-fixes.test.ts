// F069 fix 7: the Worker names what went wrong, and answers the block's script with JSON (F037).
import { describe, expect, it, vi } from "vitest";
import { handleContact, readForm, type Env } from "./worker";

const env: Env = { SITE_ORIGIN: "https://haho.pages.dev", TURNSTILE_SECRET: "ts", RESEND_API_KEY: "rk", TO_EMAIL: "owner@example.com" };
const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [k, v] of Object.entries(fields)) data.set(k, v);
  return data;
};
const good = { form: "cf-contact-1", page: "/contact/", name: "Ana", email: "ana@example.com", message: "Hello", "cf-turnstile-response": "token" };
const services = (turnstile = true, mail = true) =>
  vi.fn(async (url: string | URL | Request) =>
    String(url).includes("turnstile") ? new Response(JSON.stringify({ success: turnstile })) : new Response("{}", { status: mail ? 200 : 500 }),
  ) as unknown as typeof fetch;
const post = (fields: Record<string, string>, fetchFn: typeof fetch, json = false) =>
  handleContact(
    new Request("https://w.dev/", { method: "POST", body: form(fields), headers: { Origin: "https://haho.pages.dev", ...(json ? { Accept: "application/json" } : {}) } }),
    env,
    fetchFn,
  );

describe("review-fixes 7: the contact Worker names the problem", () => {
  it("finds the first wrong field, in the form's order", () => {
    expect(readForm(form({ ...good, name: "", email: "x" }))).toMatchObject({ ok: false, problem: "name", field: "name" });
    expect(readForm(form({ ...good, email: "ana@example" }))).toMatchObject({ ok: false, problem: "email", field: "email" });
    expect(readForm(form({ ...good, "extra:Phone": "1".repeat(1001) }))).toMatchObject({ ok: false, problem: "extra", field: "extra:Phone" });
    expect(readForm(form({ ...good, message: "" }))).toMatchObject({ ok: false, problem: "message", field: "message" });
  });

  it("without JavaScript, sends the visitor back to the message for that problem", async () => {
    const res = await post({ ...good, email: "nope" }, services());
    expect(res.status).toBe(303);
    expect(res.headers.get("Location")).toBe("https://haho.pages.dev/contact/#cf-contact-1-error-email");
  });

  it("answers the block's script with JSON the site can read", async () => {
    const bad = await post({ ...good, email: "nope" }, services(), true);
    expect(bad.status).toBe(200);
    expect(bad.headers.get("Access-Control-Allow-Origin")).toBe("https://haho.pages.dev");
    expect(await bad.json()).toEqual({ ok: false, problem: "email", field: "email" });
    expect(await (await post(good, services(false), true)).json()).toEqual({ ok: false, problem: "check" });
    expect(await (await post(good, services(true, false), true)).json()).toEqual({ ok: false, problem: "send" });
    expect(await (await post(good, services(), true)).json()).toEqual({ ok: true });
    // Robots still learn nothing.
    expect(await (await post({ ...good, website: "x" }, services(), true)).json()).toEqual({ ok: true });
  });
});

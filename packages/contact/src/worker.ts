/**
 * Contact form Worker (F037). Receives the Contact form block's plain HTML
 * form post, checks it (spam trap, Turnstile, lengths), emails it to the
 * owner through Resend, and sends the visitor back to the page with
 * "#<form>-sent" or "#<form>-error-<problem>", where the block shows a
 * message that says what went wrong (F069).
 *
 * F069: the block's small script sends the form with fetch (Accept:
 * application/json) so the visitor's words stay on the page; it gets JSON
 * back ({ ok, problem, field }) instead of the redirect. Without
 * JavaScript the redirect works as before.
 *
 * Secrets (set by the deploy workflow from GitHub secrets, never in the repo):
 * TURNSTILE_SECRET, RESEND_API_KEY, TO_EMAIL. FROM_EMAIL is optional.
 */

export interface Env {
  SITE_ORIGIN: string;
  TURNSTILE_SECRET?: string;
  RESEND_API_KEY?: string;
  TO_EMAIL?: string;
  /** Defaults to Resend's shared sender, which can mail the account's own address with no domain set up. */
  FROM_EMAIL?: string;
  SITE_NAME?: string;
}

export const limits = { name: 200, email: 254, message: 5000, extra: 1000, extras: 6, label: 60, body: 64 * 1024 };

const FORM_ID = /^cf-[a-z0-9-]{1,60}$/;
const PAGE = /^\/(?:[a-z0-9][a-z0-9-]*\/)*$/;
const EMAIL = /^[^\s@<>()",;:]+@[^\s@<>()",;:]+\.[^\s@<>()",;:]{2,}$/;

export interface Message {
  form: string;
  page: string;
  name: string;
  email: string;
  message: string;
  extras: { label: string; value: string }[];
}

/**
 * What went wrong, for the visitor (F069): a field ("name", "email",
 * "message", "extra"), the spam check ("check") or sending ("send").
 */
export type Problem = "name" | "email" | "message" | "extra" | "check" | "send";

export type Checked =
  | { ok: true; message: Message }
  | { ok: false; reason: "spam" | "invalid"; form: string; page: string; problem?: Problem; field?: string };

/** Reads and checks the posted fields. The form and page are needed to send the visitor back. */
export function readForm(data: FormData): Checked {
  const get = (k: string) => {
    const v = data.get(k);
    return typeof v === "string" ? v.trim() : "";
  };
  const form = FORM_ID.test(get("form")) ? get("form") : "";
  const page = PAGE.test(get("page")) ? get("page") : "/";
  if (get("website")) return { ok: false, reason: "spam", form, page };
  const name = get("name");
  const email = get("email");
  const message = get("message");
  const extras: { label: string; value: string }[] = [];
  for (const [key, value] of data.entries()) {
    if (!key.startsWith("extra:") || typeof value !== "string") continue;
    const label = key.slice(6).trim().slice(0, limits.label);
    if (label && value.trim()) extras.push({ label, value: value.trim() });
  }
  // The first wrong field, in the order the form shows them (F069).
  const longExtra = extras.find((x) => x.value.length > limits.extra);
  const wrong: [Problem, string] | null =
    !name || name.length > limits.name
      ? ["name", "name"]
      : !EMAIL.test(email) || email.length > limits.email
        ? ["email", "email"]
        : longExtra
          ? ["extra", `extra:${longExtra.label}`]
          : extras.length > limits.extras
            ? ["extra", ""]
            : !message || message.length > limits.message
              ? ["message", "message"]
              : null;
  if (!form) return { ok: false, reason: "invalid", form, page };
  if (wrong) return { ok: false, reason: "invalid", form, page, problem: wrong[0], ...(wrong[1] ? { field: wrong[1] } : {}) };
  return { ok: true, message: { form, page, name, email, message, extras } };
}

/** Asks Cloudflare whether the visitor passed the Turnstile check. */
export async function passedTurnstile(token: string, secret: string, ip: string | null, fetchFn: typeof fetch = fetch): Promise<boolean> {
  if (!token) return false;
  const body = new FormData();
  body.set("secret", secret);
  body.set("response", token);
  if (ip) body.set("remoteip", ip);
  try {
    const res = await fetchFn("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body });
    const out = (await res.json()) as { success?: boolean };
    return out.success === true;
  } catch {
    return false;
  }
}

/** The email the owner gets: plain text, the visitor's address as Reply-To. */
export function emailFor(m: Message, siteName: string) {
  const lines = [`New message from the contact form on ${siteName} (page ${m.page}).`, "", `Name: ${m.name}`, `Email: ${m.email}`];
  for (const x of m.extras) lines.push(`${x.label}: ${x.value}`);
  lines.push("", "Message:", m.message, "", "Reply to this email to answer.");
  // Line breaks in the subject would let a visitor add mail headers.
  const subject = `Contact form: ${m.name}`.replace(/[\r\n]+/g, " ").slice(0, 120);
  return { subject, text: lines.join("\n") };
}

async function sendEmail(env: Env, m: Message, fetchFn: typeof fetch): Promise<boolean> {
  const { subject, text } = emailFor(m, env.SITE_NAME || new URL(env.SITE_ORIGIN).host);
  try {
    const res = await fetchFn("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: env.FROM_EMAIL || "Crust contact form <onboarding@resend.dev>", to: [env.TO_EMAIL], reply_to: m.email, subject, text }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

const back = (env: Env, page: string, target: string) =>
  new Response(null, { status: 303, headers: { Location: `${env.SITE_ORIGIN.replace(/\/+$/, "")}${page}#${target}`, "Cache-Control": "no-store" } });

/** F069: the answer for the block's script, readable by the site's own pages only. */
const answer = (env: Env, body: { ok: boolean; problem?: Problem; field?: string }) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", "Access-Control-Allow-Origin": new URL(env.SITE_ORIGIN).origin, Vary: "Origin" },
  });

export async function handleContact(request: Request, env: Env, fetchFn: typeof fetch = fetch): Promise<Response> {
  if (request.method !== "POST") return new Response("This address only receives the contact form.", { status: 405, headers: { Allow: "POST" } });
  if (!env.SITE_ORIGIN || !env.TURNSTILE_SECRET || !env.RESEND_API_KEY || !env.TO_EMAIL) {
    return new Response("The contact form isn't set up yet.", { status: 503 });
  }
  // Only the site's own pages may post here.
  const origin = request.headers.get("Origin");
  if (origin && origin !== new URL(env.SITE_ORIGIN).origin) return new Response("Not allowed.", { status: 403 });
  const length = Number(request.headers.get("Content-Length") ?? "0");
  if (length > limits.body) return new Response("Too large.", { status: 413 });

  let data: FormData;
  try {
    data = await request.formData();
  } catch {
    return new Response("Not a form.", { status: 400 });
  }
  const wantsJson = (request.headers.get("Accept") ?? "").includes("application/json");
  // Back to the page: the thank-you, or a message that names the problem.
  const reply = (form: string, page: string, problem?: Problem, field?: string) =>
    wantsJson
      ? answer(env, problem ? { ok: false, problem, ...(field ? { field } : {}) } : { ok: true })
      : back(env, page, problem ? `${form || "cf-form"}-error-${problem}` : `${form || "cf-form"}-sent`);
  const checked = readForm(data);
  if (!checked.ok) {
    // Robots get the thank-you, so they learn nothing; nothing is sent.
    if (checked.reason === "spam") return reply(checked.form, checked.page);
    if (!checked.problem) return wantsJson ? answer(env, { ok: false, problem: "send" }) : back(env, checked.page, `${checked.form || "cf-form"}-error`);
    return reply(checked.form, checked.page, checked.problem, checked.field);
  }
  const m = checked.message;
  const token = data.get("cf-turnstile-response");
  if (!(await passedTurnstile(typeof token === "string" ? token : "", env.TURNSTILE_SECRET, request.headers.get("CF-Connecting-IP"), fetchFn))) {
    return reply(m.form, m.page, "check");
  }
  return (await sendEmail(env, m, fetchFn)) ? reply(m.form, m.page) : reply(m.form, m.page, "send");
}

export default { fetch: (request: Request, env: Env) => handleContact(request, env) };

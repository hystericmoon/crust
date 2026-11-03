// F067: delivery Worker. The payment company (Polar or Lemon Squeezy, F066)
// sends a signed "order paid" message; the Worker checks the signature,
// makes a personal download link, emails it to the buyer (Resend) and serves
// the template's newest release from Workers KV. No accounts, no database:
// three kinds of KV keys (see `keys`). Deployed by
// .github/workflows/delivery-worker.yml; files uploaded by Publish store
// (scripts/store/delivery-kv.ts). Setup: docs/setup-delivery.md.

/** The few Workers KV calls used (text values only: template files are JSON). */
export interface KV {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface Env {
  FILES: KV;
  /** "polar" or "lemonsqueezy", from store/list.json at deploy. */
  PROVIDER: string;
  /** "test" or "live", from store/list.json at deploy. */
  MODE: string;
  /** The company's webhook signing secret. */
  WEBHOOK_SECRET: string;
  RESEND_API_KEY: string;
  FROM_EMAIL?: string;
  /** The store's address, for "Download Crust" and "Help". */
  STORE_URL: string;
}

/** What Publish store puts in KV for each priced template (`template:<id>`). */
export interface TemplateRecord {
  id: string;
  name: string;
  release: number;
  changes: string[];
}

/** One paid order, as the Worker keeps it (`order:<provider>:<order id>`). */
interface OrderRecord {
  token: string;
  emailed: boolean;
}

/** A personal download link (`link:<token>`). */
export interface LinkRecord {
  template: string;
  provider: string;
  order: string;
  test: boolean;
  at: string;
}

export const keys = {
  template: (id: string) => `template:${id}`,
  file: (id: string) => `file:${id}`,
  order: (provider: string, order: string) => `order:${provider}:${order}`,
  link: (token: string) => `link:${token}`,
};

const TEMPLATE_ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const TOKEN = /^[A-Za-z0-9_-]{43}$/;
/** Messages older or newer than this are refused (replays). */
export const TOLERANCE_SECONDS = 5 * 60;
const MAX_BODY = 256 * 1024;

// ------------------------------------------------------------ signatures

const enc = new TextEncoder();

function fromBase64(text: string): Uint8Array<ArrayBuffer> {
  const bin = atob(text);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

function toBase64(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

async function hmac(key: Uint8Array<ArrayBuffer>, text: string): Promise<Uint8Array> {
  const k = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", k, enc.encode(text)));
}

/** Compares without stopping at the first difference. */
function sameText(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Standard Webhooks key bytes. A `whsec_…` secret is base64 after the
 * prefix; Polar's dashboard secret is used as its own bytes (its SDKs
 * base64-encode it before handing it to Standard Webhooks).
 */
export function standardKey(secret: string): Uint8Array<ArrayBuffer> {
  return secret.startsWith("whsec_") ? fromBase64(secret.slice(6)) : enc.encode(secret);
}

/** Standard Webhooks (Polar): `webhook-id`, `webhook-timestamp`, `webhook-signature: v1,<base64> …`. */
export async function standardSigned(headers: Headers, body: string, secret: string, now: number): Promise<boolean> {
  const id = headers.get("webhook-id");
  const stamp = headers.get("webhook-timestamp");
  const sigs = headers.get("webhook-signature");
  if (!id || !stamp || !sigs || !/^\d{1,12}$/.test(stamp)) return false;
  if (Math.abs(now - Number(stamp)) > TOLERANCE_SECONDS) return false;
  const expected = toBase64(await hmac(standardKey(secret), `${id}.${stamp}.${body}`));
  return sigs.split(" ").some((part) => part.startsWith("v1,") && sameText(part.slice(3), expected));
}

/** Lemon Squeezy: `X-Signature` is the hex HMAC-SHA256 of the body. */
export async function lemonSigned(headers: Headers, body: string, secret: string): Promise<boolean> {
  const sig = headers.get("x-signature");
  if (!sig) return false;
  const expected = [...(await hmac(enc.encode(secret), body))].map((b) => b.toString(16).padStart(2, "0")).join("");
  return sameText(sig.toLowerCase(), expected);
}

// ------------------------------------------------------------ messages

/** What a signed message means for delivery. */
export type Event =
  | { kind: "paid"; order: string; email: string; template: string | null }
  | { kind: "refunded"; order: string }
  | { kind: "other" };

type Json = Record<string, unknown>;
const obj = (v: unknown): Json => (v && typeof v === "object" && !Array.isArray(v) ? (v as Json) : {});
const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
const tpl = (v: unknown): string | null => {
  const s = str(v);
  return s && TEMPLATE_ID.test(s) ? s : null;
};

/** Reads a provider's message. Only fully paid orders and full refunds matter. */
export function readEvent(provider: string, payload: unknown): Event | null {
  const p = obj(payload);
  if (provider === "polar") {
    // Polar: { type: "order.paid" | "order.refunded" | …, data: Order }.
    const type = str(p.type);
    const data = obj(p.data);
    const order = str(data.id);
    if (!type) return null;
    if (type === "order.paid") {
      const email = str(obj(data.customer).email);
      if (!order || !email) return null;
      return { kind: "paid", order, email, template: tpl(obj(data.metadata).reference_id) };
    }
    if (type === "order.refunded") {
      if (!order) return null;
      return data.status === "refunded" ? { kind: "refunded", order } : { kind: "other" };
    }
    return { kind: "other" };
  }
  if (provider === "lemonsqueezy") {
    // Lemon Squeezy: { meta: { event_name, custom_data }, data: { id, attributes } }.
    const meta = obj(p.meta);
    const event = str(meta.event_name);
    const data = obj(p.data);
    const attrs = obj(data.attributes);
    const order = str(data.id) ?? (typeof data.id === "number" ? String(data.id) : null);
    if (!event) return null;
    if (event === "order_created") {
      if (attrs.status !== "paid") return { kind: "other" };
      const email = str(attrs.user_email);
      if (!order || !email) return null;
      return { kind: "paid", order, email, template: tpl(obj(meta.custom_data).template) };
    }
    if (event === "order_refunded") {
      if (!order) return null;
      return attrs.status === "refunded" ? { kind: "refunded", order } : { kind: "other" };
    }
    return { kind: "other" };
  }
  return null;
}

// ------------------------------------------------------------ links and email

/** 32 random bytes as URL-safe base64 (43 characters): unguessable. */
export function newToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return toBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

const isTest = (env: Env) => env.MODE !== "live";

export function deliveryEmail(t: TemplateRecord, link: string, env: Env): { subject: string; text: string } {
  const test = isTest(env);
  const subject = `${test ? "Test order: " : ""}Your ${t.name} template`;
  const text = [
    ...(test ? ["This was a test order: no money was taken.", ""] : []),
    "Hello,",
    "",
    `Thank you for buying ${t.name}. Your personal download page:`,
    "",
    link,
    "",
    `The link keeps working. When ${t.name} gets an update, Crust tells you, and this page always has the newest version.`,
    "Please keep the link to yourself: anyone who has it can download the template.",
    "",
    "To use it: open Crust, choose Pages → Start from a template → Open a file, and pick the file you downloaded.",
    "",
    `Don't have Crust yet? It's free: ${env.STORE_URL}/download/`,
  ].join("\n");
  return { subject, text };
}

async function sendEmail(to: string, mail: { subject: string; text: string }, env: Env, fetchFn: typeof fetch): Promise<boolean> {
  try {
    const res = await fetchFn("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: env.FROM_EMAIL || "Crust templates <onboarding@resend.dev>", to: [to], subject: mail.subject, text: mail.text }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function readJson<T>(kv: KV, key: string): Promise<T | null> {
  const text = await kv.get(key);
  if (text === null) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

// ------------------------------------------------------------ webhook

const plain = (status: number, text: string) => new Response(text, { status, headers: { "Content-Type": "text/plain; charset=utf-8" } });

/**
 * POST /webhook. Answers 2xx once the message is handled (or isn't about
 * delivery), so the company stops retrying; 5xx when the email didn't go,
 * so it retries and the same link is sent again.
 */
export async function handleWebhook(request: Request, env: Env, fetchFn: typeof fetch = fetch, now = Math.floor(Date.now() / 1000)): Promise<Response> {
  const provider = env.PROVIDER;
  if ((provider !== "polar" && provider !== "lemonsqueezy") || !env.WEBHOOK_SECRET) return plain(503, "Delivery is not set up.");
  const length = Number(request.headers.get("content-length") ?? "0");
  if (length > MAX_BODY) return plain(413, "Too large.");
  const body = await request.text();
  if (body.length > MAX_BODY) return plain(413, "Too large.");

  const signed = provider === "polar" ? await standardSigned(request.headers, body, env.WEBHOOK_SECRET, now) : await lemonSigned(request.headers, body, env.WEBHOOK_SECRET);
  if (!signed) return plain(401, "Signature doesn't match.");

  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return plain(400, "Not JSON.");
  }
  const event = readEvent(provider, payload);
  if (!event) return plain(400, "Message is missing the order, email or event.");
  if (event.kind === "other") return plain(202, "Not about delivery.");

  const orderKey = keys.order(provider, event.order);
  if (event.kind === "refunded") {
    const known = await readJson<OrderRecord>(env.FILES, orderKey);
    if (known) await env.FILES.delete(keys.link(known.token));
    return plain(200, "Download link switched off.");
  }

  // A paid order. The template must be one Publish store uploaded.
  if (!event.template) return plain(422, "The order doesn't name a template (reference_id).");
  const template = await readJson<TemplateRecord>(env.FILES, keys.template(event.template));
  if (!template) return plain(422, `No template “${event.template}” to deliver.`);

  // The company may send the same message more than once: one link per order, one email once it went.
  let record = await readJson<OrderRecord>(env.FILES, orderKey);
  if (record?.emailed) return plain(200, "Already sent.");
  if (!record) {
    record = { token: newToken(), emailed: false };
    const link: LinkRecord = { template: template.id, provider, order: event.order, test: isTest(env), at: new Date(now * 1000).toISOString() };
    await env.FILES.put(keys.link(record.token), JSON.stringify(link));
    await env.FILES.put(orderKey, JSON.stringify(record));
  }
  const url = `${new URL(request.url).origin}/d/${record.token}`;
  if (!(await sendEmail(event.email, deliveryEmail(template, url, env), env, fetchFn))) return plain(502, "The email didn't go; please retry.");
  await env.FILES.put(orderKey, JSON.stringify({ ...record, emailed: true }));
  return plain(200, "Sent.");
}

// ------------------------------------------------------------ download page

export const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const PAGE_HEADERS = {
  "Content-Type": "text/html; charset=utf-8",
  "Cache-Control": "private, no-store",
  // The link is the key: never pass it on, never index it.
  "Referrer-Policy": "no-referrer",
  "X-Robots-Tag": "noindex, nofollow",
  "X-Content-Type-Options": "nosniff",
  "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
};

const STYLE = `
:root{--bg:#f7f5f1;--card:#fff;--ink:#1d1b18;--muted:#5c574f;--line:#dcd6cc;--accent:#1d1b18;--on-accent:#fff;--note:#fff4d6;--note-ink:#4a3700;--focus:#2a5bd7}
@media (prefers-color-scheme:dark){:root{--bg:#161512;--card:#201e1b;--ink:#f2efe9;--muted:#b9b2a7;--line:#3a3631;--accent:#f2efe9;--on-accent:#161512;--note:#3a2f0f;--note-ink:#ffe6a3;--focus:#8fb0ff}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.55 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
main{max-width:36rem;margin:0 auto;padding:48px 16px 64px}
.card{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:28px}
.eyebrow{margin:0 0 6px;font-size:.8125rem;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}
h1{margin:0 0 8px;font-size:2rem;line-height:1.15;letter-spacing:-.02em}
h2{margin:28px 0 8px;font-size:1.125rem}
p{margin:0 0 12px}
.muted{color:var(--muted)}
.button{display:inline-block;margin:12px 0 4px;padding:14px 22px;min-height:48px;border-radius:999px;background:var(--accent);color:var(--on-accent);font-weight:600;text-decoration:none}
.button:hover{opacity:.9}
a{color:inherit}
a:focus-visible{outline:3px solid var(--focus);outline-offset:3px}
ol,ul{margin:0 0 12px;padding-left:1.4em}
li{margin:4px 0}
.note{background:var(--note);color:var(--note-ink);border-radius:10px;padding:12px 14px;margin:0 0 20px}
footer{margin-top:24px;font-size:.875rem}
`;

function page(title: string, body: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, nofollow"><title>${escapeHtml(title)}</title><style>${STYLE}</style></head><body><main>${body}</main></body></html>`;
}

export const fileName = (t: TemplateRecord) => `${t.id}-release-${t.release}.crust`;

export function downloadPage(t: TemplateRecord, token: string, link: LinkRecord, env: Env): string {
  const store = env.STORE_URL.replace(/\/$/, "");
  const changes = t.changes.length ? `<h2>What's new in release ${t.release}</h2><ul>${t.changes.map((c) => `<li>${escapeHtml(c)}</li>`).join("")}</ul>` : "";
  const note = link.test ? `<p class="note"><strong>Test order.</strong> No money was taken. Buyers see this page once they've paid.</p>` : "";
  return page(
    `${t.name}: your download`,
    `<div class="card">${note}<p class="eyebrow">Your template</p><h1>${escapeHtml(t.name)}</h1>
<p class="muted">Release ${t.release}. This page always has the newest release, so come back here when Crust says there's an update.</p>
<a class="button" href="/d/${token}/file" download="${escapeHtml(fileName(t))}">Download ${escapeHtml(t.name)}, release ${t.release}</a>
${changes}
<h2>Open it in Crust</h2>
<ol><li>Open Crust and choose Pages → Start from a template → Open a file.</li><li>Pick the file you downloaded.</li><li>Replace the words and photos with your own, then publish.</li></ol>
<p class="muted">Keep this page to yourself: anyone with the link can download the template.</p></div>
<footer class="muted"><a href="${escapeHtml(store)}/download/">Download Crust (free)</a> · <a href="${escapeHtml(store)}/help/">Help</a></footer>`,
  );
}

function notFoundPage(env: Env): string {
  const store = escapeHtml(env.STORE_URL.replace(/\/$/, ""));
  return page(
    "Download link not found",
    `<div class="card"><h1>This download link doesn't work</h1><p>Check that the whole link from your email was copied. If the order was refunded, the link was switched off.</p><p><a href="${store}/help/">Get help</a></p></div>`,
  );
}

/** GET /d/<token> (the page) and /d/<token>/file (the template). */
export async function handleDownload(request: Request, env: Env): Promise<Response> {
  const parts = new URL(request.url).pathname.split("/").filter(Boolean);
  const token = parts[1] ?? "";
  const wantsFile = parts.length === 3 && parts[2] === "file";
  const missing = () => new Response(notFoundPage(env), { status: 404, headers: PAGE_HEADERS });
  if (!TOKEN.test(token) || !(parts.length === 2 || wantsFile)) return missing();
  const link = await readJson<LinkRecord>(env.FILES, keys.link(token));
  if (!link) return missing();
  const template = await readJson<TemplateRecord>(env.FILES, keys.template(link.template));
  if (!template) return missing();
  if (!wantsFile) return new Response(request.method === "HEAD" ? null : downloadPage(template, token, link, env), { headers: PAGE_HEADERS });
  const file = await env.FILES.get(keys.file(template.id));
  if (file === null) return missing();
  return new Response(request.method === "HEAD" ? null : file, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${fileName(template)}"`,
      "Cache-Control": "private, no-store",
      "Referrer-Policy": "no-referrer",
      "X-Robots-Tag": "noindex",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function handle(request: Request, env: Env, fetchFn: typeof fetch = fetch): Promise<Response> {
  const { pathname } = new URL(request.url);
  if (pathname === "/webhook") return request.method === "POST" ? handleWebhook(request, env, fetchFn) : plain(405, "POST only.");
  if (pathname.startsWith("/d/")) return request.method === "GET" || request.method === "HEAD" ? handleDownload(request, env) : plain(405, "GET only.");
  return plain(404, "Not found.");
}

export default { fetch: (request: Request, env: Env) => handle(request, env) };

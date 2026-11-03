import { afterAll, describe, expect, it, vi } from "vitest";
import {
  deliveryEmail,
  downloadPage,
  handle,
  keys,
  lemonSigned,
  newToken,
  readEvent,
  standardKey,
  standardSigned,
  TOLERANCE_SECONDS,
  type Env,
  type KV,
  type LinkRecord,
  type TemplateRecord,
} from "./worker";

const SECRET = "polar_whs_test_secret";
const NOW = 1_793_700_000;
const ORIGIN = "https://crust-delivery.x.workers.dev";
const harbour: TemplateRecord = { id: "harbour", name: "Harbour", release: 3, changes: ["New Journal page", "Bigger <b>photos</b>"] };

class MemoryKV implements KV {
  map = new Map<string, string>();
  async get(key: string) {
    return this.map.get(key) ?? null;
  }
  async put(key: string, value: string) {
    this.map.set(key, value);
  }
  async delete(key: string) {
    this.map.delete(key);
  }
}

function setup(over: Partial<Env> = {}) {
  const kv = new MemoryKV();
  kv.map.set(keys.template("harbour"), JSON.stringify(harbour));
  kv.map.set(keys.file("harbour"), '{"format":"crust-template"}');
  const env: Env = { FILES: kv, PROVIDER: "polar", MODE: "live", WEBHOOK_SECRET: SECRET, RESEND_API_KEY: "rk", STORE_URL: "https://crust-store.pages.dev", ...over };
  return { kv, env };
}

function mailer(ok = true) {
  const sent: { to: string[]; subject: string; text: string; from: string }[] = [];
  const fetchFn = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
    sent.push(JSON.parse(String(init!.body)));
    return new Response("{}", { status: ok ? 200 : 500 });
  }) as unknown as typeof fetch;
  return { fetchFn, sent };
}

const b64 = (bytes: ArrayBuffer) => Buffer.from(bytes).toString("base64");
async function hmac(key: Uint8Array<ArrayBuffer>, text: string) {
  const k = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return crypto.subtle.sign("HMAC", k, new TextEncoder().encode(text));
}

/** Signs like Polar (Standard Webhooks). */
async function polarRequest(payload: unknown, opts: { id?: string; at?: number; secret?: string } = {}) {
  const body = JSON.stringify(payload);
  const id = opts.id ?? "msg_1";
  const at = String(opts.at ?? NOW);
  const sig = b64(await hmac(standardKey(opts.secret ?? SECRET), `${id}.${at}.${body}`));
  return new Request(`${ORIGIN}/webhook`, { method: "POST", body, headers: { "webhook-id": id, "webhook-timestamp": at, "webhook-signature": `v1,${sig}`, "content-type": "application/json" } });
}

const paid = (over: Record<string, unknown> = {}) => ({
  type: "order.paid",
  data: { id: "ord_1", status: "paid", customer: { email: "ana@example.com" }, metadata: { reference_id: "harbour" }, ...over },
});

const send = (env: Env, req: Request, fetchFn: typeof fetch) => {
  vi.setSystemTime(NOW * 1000);
  return handle(req, env, fetchFn);
};

afterAll(() => vi.useRealTimers());

const tokenFrom = (text: string) => text.match(/\/d\/([A-Za-z0-9_-]{43})/)![1]!;

describe("delivery Worker (F067): signatures", () => {
  it("accepts a Standard Webhooks signature, with or without the whsec_ form", async () => {
    const body = '{"a":1}';
    const sig = b64(await hmac(new TextEncoder().encode(SECRET), `m.${NOW}.${body}`));
    const h = new Headers({ "webhook-id": "m", "webhook-timestamp": String(NOW), "webhook-signature": `v0,zzz v1,${sig}` });
    expect(await standardSigned(h, body, SECRET, NOW)).toBe(true);
    const whsec = `whsec_${Buffer.from(SECRET).toString("base64")}`;
    expect(await standardSigned(h, body, whsec, NOW)).toBe(true);
  });

  it("refuses a wrong secret, a changed body, missing headers and old or future messages", async () => {
    const body = '{"a":1}';
    const sig = b64(await hmac(new TextEncoder().encode(SECRET), `m.${NOW}.${body}`));
    const h = new Headers({ "webhook-id": "m", "webhook-timestamp": String(NOW), "webhook-signature": `v1,${sig}` });
    expect(await standardSigned(h, body, "other", NOW)).toBe(false);
    expect(await standardSigned(h, '{"a":2}', SECRET, NOW)).toBe(false);
    expect(await standardSigned(new Headers(), body, SECRET, NOW)).toBe(false);
    expect(await standardSigned(h, body, SECRET, NOW + TOLERANCE_SECONDS + 1)).toBe(false);
    expect(await standardSigned(h, body, SECRET, NOW - TOLERANCE_SECONDS - 1)).toBe(false);
  });

  it("checks Lemon Squeezy's hex X-Signature", async () => {
    const body = '{"a":1}';
    const hex = Buffer.from(await hmac(new TextEncoder().encode("ls"), body)).toString("hex");
    expect(await lemonSigned(new Headers({ "x-signature": hex }), body, "ls")).toBe(true);
    expect(await lemonSigned(new Headers({ "x-signature": hex }), body + " ", "ls")).toBe(false);
    expect(await lemonSigned(new Headers(), body, "ls")).toBe(false);
  });
});

describe("delivery Worker (F067): messages", () => {
  it("reads Polar's paid order with the template from reference_id", () => {
    expect(readEvent("polar", paid())).toEqual({ kind: "paid", order: "ord_1", email: "ana@example.com", template: "harbour" });
    expect(readEvent("polar", paid({ metadata: {} }))).toMatchObject({ kind: "paid", template: null });
    expect(readEvent("polar", paid({ metadata: { reference_id: "../x" } }))).toMatchObject({ template: null });
    expect(readEvent("polar", paid({ customer: {} }))).toBeNull();
    expect(readEvent("polar", { type: "order.created", data: {} })).toEqual({ kind: "other" });
  });

  it("only a full refund switches a link off", () => {
    expect(readEvent("polar", { type: "order.refunded", data: { id: "ord_1", status: "refunded" } })).toEqual({ kind: "refunded", order: "ord_1" });
    expect(readEvent("polar", { type: "order.refunded", data: { id: "ord_1", status: "partially_refunded" } })).toEqual({ kind: "other" });
  });

  it("reads Lemon Squeezy's order_created and order_refunded", () => {
    const ls = (event: string, status: string) => ({ meta: { event_name: event, custom_data: { template: "harbour" } }, data: { id: 42, attributes: { status, user_email: "ana@example.com" } } });
    expect(readEvent("lemonsqueezy", ls("order_created", "paid"))).toEqual({ kind: "paid", order: "42", email: "ana@example.com", template: "harbour" });
    expect(readEvent("lemonsqueezy", ls("order_created", "pending"))).toEqual({ kind: "other" });
    expect(readEvent("lemonsqueezy", ls("order_refunded", "refunded"))).toEqual({ kind: "refunded", order: "42" });
  });

  it("makes long, unguessable, URL-safe links", () => {
    const a = newToken();
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(newToken()).not.toBe(a);
  });
});

describe("delivery Worker (F067): a paid order", () => {
  it("emails the buyer one personal link and serves the page and the file from it", async () => {
    const { env, kv } = setup();
    const { fetchFn, sent } = mailer();
    const res = await send(env, await polarRequest(paid()), fetchFn);
    expect(res.status).toBe(200);
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ to: ["ana@example.com"], subject: "Your Harbour template", from: "Crust templates <onboarding@resend.dev>" });
    const token = tokenFrom(sent[0]!.text);
    expect(sent[0]!.text).toContain(`${ORIGIN}/d/${token}`);
    expect(JSON.parse(kv.map.get(keys.link(token))!)).toMatchObject({ template: "harbour", order: "ord_1", provider: "polar", test: false });
    expect(JSON.stringify([...kv.map.values()])).not.toContain("ana@example.com");

    const pageRes = await handle(new Request(`${ORIGIN}/d/${token}`), env);
    expect(pageRes.status).toBe(200);
    expect(pageRes.headers.get("Referrer-Policy")).toBe("no-referrer");
    expect(pageRes.headers.get("Cache-Control")).toContain("no-store");
    const html = await pageRes.text();
    expect(html).toContain(`href="/d/${token}/file"`);
    expect(html).toContain("Release 3");

    const fileRes = await handle(new Request(`${ORIGIN}/d/${token}/file`), env);
    expect(fileRes.status).toBe(200);
    expect(fileRes.headers.get("Content-Disposition")).toBe('attachment; filename="harbour-release-3.crust"');
    expect(await fileRes.text()).toBe('{"format":"crust-template"}');
  });

  it("a repeated message sends nothing new; an update is served from the same link", async () => {
    const { env, kv } = setup();
    const { fetchFn, sent } = mailer();
    await send(env, await polarRequest(paid()), fetchFn);
    const again = await send(env, await polarRequest(paid(), { id: "msg_2" }), fetchFn);
    expect(again.status).toBe(200);
    expect(sent).toHaveLength(1);

    const token = tokenFrom(sent[0]!.text);
    kv.map.set(keys.template("harbour"), JSON.stringify({ ...harbour, release: 4, changes: ["Shop page"] }));
    kv.map.set(keys.file("harbour"), "release 4");
    expect(await (await handle(new Request(`${ORIGIN}/d/${token}`), env)).text()).toContain("Release 4");
    const file = await handle(new Request(`${ORIGIN}/d/${token}/file`), env);
    expect(file.headers.get("Content-Disposition")).toContain("harbour-release-4.crust");
    expect(await file.text()).toBe("release 4");
  });

  it("when the email fails it asks for a retry and sends the same link next time", async () => {
    const { env } = setup();
    const down = mailer(false);
    expect((await send(env, await polarRequest(paid()), down.fetchFn)).status).toBe(502);
    const up = mailer();
    expect((await send(env, await polarRequest(paid(), { id: "msg_2" }), up.fetchFn)).status).toBe(200);
    expect(tokenFrom(up.sent[0]!.text)).toBe(tokenFrom(down.sent[0]!.text));
  });

  it("refuses unsigned or forged messages and sends nothing", async () => {
    const { env, kv } = setup();
    const { fetchFn, sent } = mailer();
    const forged = await polarRequest(paid(), { secret: "guess" });
    expect((await send(env, forged, fetchFn)).status).toBe(401);
    const unsigned = new Request(`${ORIGIN}/webhook`, { method: "POST", body: JSON.stringify(paid()) });
    expect((await send(env, unsigned, fetchFn)).status).toBe(401);
    const replay = await polarRequest(paid(), { at: NOW - 3600 });
    expect((await send(env, replay, fetchFn)).status).toBe(401);
    expect(sent).toHaveLength(0);
    expect([...kv.map.keys()].some((k) => k.startsWith("order:"))).toBe(false);
  });

  it("an order for an unknown or missing template is refused so the company shows it as failed", async () => {
    const { env } = setup();
    const { fetchFn, sent } = mailer();
    expect((await send(env, await polarRequest(paid({ metadata: { reference_id: "nope" } })), fetchFn)).status).toBe(422);
    expect((await send(env, await polarRequest(paid({ metadata: {} })), fetchFn)).status).toBe(422);
    expect(sent).toHaveLength(0);
  });

  it("other events are acknowledged and ignored", async () => {
    const { env } = setup();
    const { fetchFn, sent } = mailer();
    expect((await send(env, await polarRequest({ type: "checkout.created", data: {} }), fetchFn)).status).toBe(202);
    expect(sent).toHaveLength(0);
  });

  it("a full refund switches the link off", async () => {
    const { env } = setup();
    const { fetchFn, sent } = mailer();
    await send(env, await polarRequest(paid()), fetchFn);
    const token = tokenFrom(sent[0]!.text);
    const refund = await polarRequest({ type: "order.refunded", data: { id: "ord_1", status: "refunded" } }, { id: "msg_3" });
    expect((await send(env, refund, fetchFn)).status).toBe(200);
    const gone = await handle(new Request(`${ORIGIN}/d/${token}`), env);
    expect(gone.status).toBe(404);
    expect(await gone.text()).toContain("This download link doesn't work");
    expect((await handle(new Request(`${ORIGIN}/d/${token}/file`), env)).status).toBe(404);
  });

  it("works the same with Lemon Squeezy", async () => {
    const { env } = setup({ PROVIDER: "lemonsqueezy", WEBHOOK_SECRET: "ls" });
    const { fetchFn, sent } = mailer();
    const body = JSON.stringify({ meta: { event_name: "order_created", custom_data: { template: "harbour" } }, data: { id: 7, attributes: { status: "paid", user_email: "ana@example.com" } } });
    const sig = Buffer.from(await hmac(new TextEncoder().encode("ls"), body)).toString("hex");
    const res = await send(env, new Request(`${ORIGIN}/webhook`, { method: "POST", body, headers: { "x-signature": sig } }), fetchFn);
    expect(res.status).toBe(200);
    expect(sent[0]!.to).toEqual(["ana@example.com"]);
  });

  it("isn't set up until the company and secret are there", async () => {
    const { env } = setup({ PROVIDER: "" });
    expect((await send(env, await polarRequest(paid()), mailer().fetchFn)).status).toBe(503);
  });
});

describe("delivery Worker (F067): pages and email", () => {
  const env = setup().env;
  const link: LinkRecord = { template: "harbour", provider: "polar", order: "ord_1", test: false, at: "" };

  it("the email says how to open the file and that the link keeps working", () => {
    const mail = deliveryEmail(harbour, `${ORIGIN}/d/abc`, env);
    expect(mail.text).toContain("Pages → Start from a template → Open a file");
    expect(mail.text).toContain("this page always has the newest version");
    expect(mail.text).toContain("https://crust-store.pages.dev/download/");
    expect(mail.text).not.toContain("test order");
  });

  it("test mode says so in the email and on the page", () => {
    const test = setup({ MODE: "test" }).env;
    const mail = deliveryEmail(harbour, "x", test);
    expect(mail.subject).toBe("Test order: Your Harbour template");
    expect(mail.text).toContain("no money was taken");
    expect(downloadPage(harbour, "t", { ...link, test: true }, test)).toContain("<strong>Test order.</strong>");
  });

  it("the page escapes the template's words and is accessible by structure", () => {
    const html = downloadPage(harbour, "t", link, env);
    expect(html).toContain("Bigger &lt;b&gt;photos&lt;/b&gt;");
    expect(html).not.toContain("<b>photos");
    expect(html).toContain('<html lang="en">');
    expect(html.match(/<h1>/g)).toHaveLength(1);
    expect(html.indexOf("<h1>")).toBeLessThan(html.indexOf("<h2>"));
    expect(html).toContain("<main>");
    expect(html).toContain('name="robots" content="noindex, nofollow"');
  });

  it("bad links, wrong paths and wrong methods are refused", async () => {
    const { env: e } = setup();
    expect((await handle(new Request(`${ORIGIN}/d/short`), e)).status).toBe(404);
    expect((await handle(new Request(`${ORIGIN}/d/${"a".repeat(43)}`), e)).status).toBe(404);
    expect((await handle(new Request(`${ORIGIN}/d/${"a".repeat(43)}/other`), e)).status).toBe(404);
    expect((await handle(new Request(`${ORIGIN}/webhook`), e)).status).toBe(405);
    expect((await handle(new Request(`${ORIGIN}/d/x`, { method: "POST" }), e)).status).toBe(405);
    expect((await handle(new Request(`${ORIGIN}/`), e)).status).toBe(404);
  });
});

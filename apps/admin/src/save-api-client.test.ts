import { afterEach, describe, expect, it, vi } from "vitest";
import { getStatus, saveContent } from "./api-client";
import { saveMessage } from "./App";

const respond = (body: unknown, type = "application/json", status = 200) =>
  vi.fn(async () => new Response(typeof body === "string" ? body : JSON.stringify(body), { status, headers: { "Content-Type": type } }));

afterEach(() => vi.unstubAllGlobals());

describe("save-api client", () => {
  it("posts JSON with the admin's own header", async () => {
    const fetchMock = respond({ ok: true, path: "content/site.json", commit: "c", url: "u" });
    vi.stubGlobal("fetch", fetchMock);
    const result = await saveContent({ kind: "site", site: { name: "x", baseUrl: "https://x.dev", language: "en", tokens: {} as never } });
    expect(result).toEqual({ ok: true, path: "content/site.json", commit: "c", url: "u" });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/save");
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({ "Content-Type": "application/json", "X-Crust": "1" });
  });

  it("treats a missing server (the app page comes back) as not switched on", async () => {
    vi.stubGlobal("fetch", respond("<!doctype html>", "text/html"));
    expect(await getStatus()).toEqual({ ok: false, error: "Saving to GitHub isn't available here yet.", notConfigured: true });
  });

  it("never throws on network errors", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("offline"))));
    expect(await getStatus()).toEqual({ ok: false, error: "Couldn't reach the server. Check your connection and try again." });
  });

  it("passes server errors through", async () => {
    vi.stubGlobal("fetch", respond({ ok: false, error: "Not signed in through Cloudflare Access." }, "application/json; charset=utf-8", 401));
    expect(await getStatus()).toEqual({ ok: false, error: "Not signed in through Cloudflare Access." });
  });
});

describe("save-api messages", () => {
  it("tells the owner where the save went", () => {
    expect(saveMessage({ ok: true }, true, "Page")).toBe("Page saved to GitHub. Visitors see it after you publish.");
    expect(saveMessage({ ok: false, error: "x", notConfigured: true }, true, "Page")).toBe(
      "Page saved in this browser. Saving to GitHub isn't switched on yet.",
    );
    expect(saveMessage({ ok: false, error: "GitHub didn't accept the token." }, true, "Site settings")).toBe(
      "Site settings not saved to GitHub: GitHub didn't accept the token. A copy is safe in this browser.",
    );
    expect(saveMessage({ ok: false, error: "Oops." }, false, "Page")).toBe("Page not saved to GitHub: Oops.");
  });
});

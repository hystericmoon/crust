import { describe, expect, it, vi } from "vitest";
import { batches, deliveryPairs, namespaceId, upload } from "./delivery";
import type { StoreTemplate } from "./model";

const item = (id: string, price: string, extra: Record<string, unknown> = {}) =>
  ({ item: { id, file: `templates/${id}.crust`, kind: "k", price, show: ["/"], ...extra }, template: { name: id[0]!.toUpperCase() + id.slice(1), release: 2 } }) as unknown as StoreTemplate;

describe("delivery files for Publish store (F067)", () => {
  it("puts a record and the file for each priced template, and nothing for free ones", () => {
    const pairs = deliveryPairs([item("harbour", "US$49", { changes: ["New page"] }), item("corner", "Free")], (p) => `file of ${p}`);
    expect(pairs).toEqual([
      { key: "template:harbour", value: JSON.stringify({ id: "harbour", name: "Harbour", release: 2, changes: ["New page"] }) },
      { key: "file:harbour", value: "file of templates/harbour.crust" },
    ]);
    expect(deliveryPairs([item("corner", "Free")], () => "x")).toEqual([]);
  });

  it("stops on a missing file", () => {
    expect(() => deliveryPairs([item("harbour", "US$49")], () => null)).toThrow("templates/harbour.crust isn't there");
  });

  it("splits uploads by size and sends files before the records that point at them", () => {
    const pairs = [
      { key: "template:a", value: "r" },
      { key: "file:a", value: "x".repeat(60) },
      { key: "template:b", value: "r" },
      { key: "file:b", value: "x".repeat(60) },
    ];
    const groups = batches(pairs, 120);
    expect(groups.flat().map((p) => p.key)).toEqual(["file:a", "file:b", "template:a", "template:b"]);
    expect(groups.length).toBeGreaterThan(1);
  });

  it("finds or creates the namespace and uploads in bulk", async () => {
    const calls: { method: string; url: string; body?: unknown }[] = [];
    const fetchFn = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({ method: init!.method!, url: String(url), body: init!.body ? JSON.parse(String(init!.body)) : undefined });
      if (init!.method === "GET") return Response.json({ success: true, result: [{ id: "other", title: "x" }] });
      if (init!.method === "POST") return Response.json({ success: true, result: { id: "ns1" } });
      return Response.json({ success: true, result: null });
    }) as unknown as typeof fetch;
    const cf = { accountId: "acc", token: "t", fetch: fetchFn };
    const id = await namespaceId(cf);
    expect(id).toBe("ns1");
    expect(calls[1]).toMatchObject({ method: "POST", body: { title: "crust-delivery" } });
    await upload(cf, id, [{ key: "file:a", value: "x" }]);
    expect(calls[2]).toMatchObject({ method: "PUT", url: "https://api.cloudflare.com/client/v4/accounts/acc/storage/kv/namespaces/ns1/bulk", body: [{ key: "file:a", value: "x" }] });
  });

  it("explains a missing token permission", async () => {
    const fetchFn = (async () => Response.json({ success: false, errors: [{ message: "Authentication error" }] }, { status: 403 })) as unknown as typeof fetch;
    await expect(namespaceId({ accountId: "a", token: "t", fetch: fetchFn })).rejects.toThrow("Workers KV Storage: Edit");
  });
});

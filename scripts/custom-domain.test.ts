import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { pickAddress, readDomains } from "./site-address.mjs";

type Step = { name?: string; run?: string; if?: string; env?: Record<string, string> };
const wf = parse(readFileSync(".github/workflows/publish.yml", "utf8"));
const steps: Step[] = wf.jobs.publish.steps;
const names = steps.map((s) => s.name ?? "");

describe("which address a publish uses (F044)", () => {
  const subdomain = "crust-site.pages.dev";

  it("uses the free address until a real one is set", () => {
    expect(pickAddress({ base: "https://example.pages.dev", subdomain })).toEqual({ url: "https://crust-site.pages.dev" });
    expect(pickAddress({ base: "", subdomain })).toEqual({ url: "https://crust-site.pages.dev" });
    expect(pickAddress({ base: "not an address", subdomain })).toEqual({ url: "https://crust-site.pages.dev" });
  });

  it("uses the owner's domain once Cloudflare says it's active", () => {
    const domains = [{ name: "studio.com", status: "active" }];
    expect(pickAddress({ base: "https://studio.com/", subdomain, domains })).toEqual({ url: "https://studio.com" });
  });

  it("falls back, and says why, while the domain isn't connected", () => {
    expect(pickAddress({ base: "https://studio.com", subdomain, domains: [{ name: "studio.com", status: "pending" }] })).toEqual({
      url: "https://crust-site.pages.dev",
      wanted: "studio.com",
      wantedStatus: "pending",
    });
    expect(pickAddress({ base: "https://studio.com", subdomain, domains: [{ name: "www.studio.com", status: "active" }] })).toEqual({
      url: "https://crust-site.pages.dev",
      wanted: "studio.com",
      wantedStatus: "not added",
    });
  });

  it("a .pages.dev address needs no connecting", () => {
    expect(pickAddress({ base: "https://other.pages.dev", subdomain })).toEqual({ url: "https://other.pages.dev" });
  });

  it("reads Cloudflare's list, and treats an error as an empty list", () => {
    expect(readDomains('{"success":true,"result":[{"name":"studio.com","status":"active"}]}')).toEqual([{ name: "studio.com", status: "active" }]);
    expect(readDomains('{"success":false,"errors":[{"code":10000}]}')).toEqual([]);
    expect(readDomains("not json")).toEqual([]);
  });

  it("the publish workflow asks Cloudflare and reports a domain that isn't connected", () => {
    const site = steps.find((s) => s.name === "Work out the site address")!;
    expect(site.run).toContain("/pages/projects/$SITE_PROJECT/domains");
    expect(site.run).toContain('node scripts/site-address.mjs "$base" "$SUBDOMAIN" domains.json');
    expect(names.indexOf("Work out the site address")).toBeLessThan(names.indexOf("Render pages"));
    // The admin reads this step's name (F017 style), so keep the prefix.
    const note = steps.find((s) => s.name === "Not connected yet ${{ steps.site.outputs.wanted }}")!;
    expect(note.if).toBe("steps.site.outputs.wanted != ''");
    expect(names.indexOf("Live at ${{ steps.site.outputs.url }}")).toBeLessThan(names.indexOf("Not connected yet ${{ steps.site.outputs.wanted }}"));
    for (const s of steps) expect(s.run ?? "").not.toMatch(/\$\{\{/);
  });
});

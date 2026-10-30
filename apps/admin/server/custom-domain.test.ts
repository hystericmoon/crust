import { defaultTokens, type Site } from "@crust/blocks";
import { describe, expect, it, vi } from "vitest";
import { checkSite } from "./content";
import { liveAddress } from "./github";

const cfg = { token: "t", repo: "hystericmoon/crust", branch: "main" };
const jobs = (...steps: [string, string | null][]) =>
  vi.fn(async () => new Response(JSON.stringify({ jobs: [{ steps: steps.map(([name, conclusion]) => ({ name, conclusion })) }] }))) as unknown as typeof fetch;

describe("custom domain: what the last publish reports (F044)", () => {
  it("reads the live address and a domain that isn't connected yet", async () => {
    const found = await liveAddress(cfg, 7, jobs(["Live at https://crust-site.pages.dev", "success"], ["Not connected yet Studio.com", "success"]));
    expect(found).toEqual({ url: "https://crust-site.pages.dev", notConnected: "studio.com" });
  });

  it("ignores the note when the step was skipped (the domain is connected)", async () => {
    const found = await liveAddress(cfg, 7, jobs(["Live at https://studio.com", "success"], ["Not connected yet ", "skipped"]));
    expect(found).toEqual({ url: "https://studio.com", notConnected: null });
  });

  it("ignores anything that isn't a plain domain", async () => {
    const found = await liveAddress(cfg, 7, jobs(["Not connected yet <script>.com", "success"], ["Not connected yet a.com/x", "success"]));
    expect(found.notConnected).toBeNull();
  });
});

describe("custom domain: saving site.json (F044)", () => {
  const site: Site = { name: "Studio", baseUrl: "https://studio.com", language: "en", tokens: defaultTokens };
  it("accepts the domain alone, or the placeholder", () => {
    expect(checkSite(site)).toEqual([]);
    expect(checkSite({ ...site, baseUrl: "https://example.pages.dev" })).toEqual([]);
  });
  it("refuses an address with a page after it, or http", () => {
    for (const baseUrl of ["https://studio.com/blog", "http://studio.com", "studio.com", ""]) {
      expect(checkSite({ ...site, baseUrl }), baseUrl).toEqual([expect.stringContaining("site address")]);
    }
  });
});

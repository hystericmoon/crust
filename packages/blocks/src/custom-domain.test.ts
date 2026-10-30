import { describe, expect, it } from "vitest";
import { isPlaceholderAddress, isValidSiteAddress, normalizeSiteAddress, PLACEHOLDER_BASE_URL, siteHost } from "./site-address";

describe("site address (F044)", () => {
  it("accepts a domain however it's typed", () => {
    for (const typed of ["studio.com", " Studio.COM ", "https://studio.com", "https://studio.com/", "HTTPS://studio.com//"]) {
      expect(normalizeSiteAddress(typed)).toEqual({ ok: true, url: "https://studio.com" });
    }
    expect(normalizeSiteAddress("www.hosni-studio.co.id")).toEqual({ ok: true, url: "https://www.hosni-studio.co.id" });
    expect(normalizeSiteAddress("crust-site.pages.dev")).toEqual({ ok: true, url: "https://crust-site.pages.dev" });
  });

  it("empty or an example address means the free address", () => {
    expect(normalizeSiteAddress("")).toEqual({ ok: true, url: PLACEHOLDER_BASE_URL });
    expect(normalizeSiteAddress("   ")).toEqual({ ok: true, url: PLACEHOLDER_BASE_URL });
    expect(normalizeSiteAddress("example.com")).toEqual({ ok: true, url: PLACEHOLDER_BASE_URL });
    expect(isPlaceholderAddress(PLACEHOLDER_BASE_URL)).toBe(true);
    expect(isPlaceholderAddress("https://myexample.com")).toBe(false);
  });

  it("refuses what would break links, in plain words", () => {
    const refused = (typed: string) => {
      const r = normalizeSiteAddress(typed);
      expect(r.ok, typed).toBe(false);
      return r.ok ? "" : r.message;
    };
    expect(refused("http://studio.com")).toMatch(/https/);
    expect(refused("studio.com/blog")).toMatch(/just the domain/);
    expect(refused("studio.com?x=1")).toMatch(/just the domain/);
    expect(refused("studio.com:8080")).toMatch(/port/);
    for (const bad of ["studio", "stu dio.com", "-studio.com", "studio.c", "javascript:alert(1)", "<b>.com", "studio..com"]) refused(bad);
  });

  it("knows which saved addresses are valid", () => {
    expect(isValidSiteAddress("https://studio.com")).toBe(true);
    expect(isValidSiteAddress(PLACEHOLDER_BASE_URL)).toBe(true);
    expect(isValidSiteAddress("https://Studio.com/")).toBe(false);
    expect(isValidSiteAddress("https://studio.com/blog")).toBe(false);
    expect(isValidSiteAddress("http://studio.com")).toBe(false);
    expect(isValidSiteAddress(42)).toBe(false);
  });

  it("shows the domain alone, or nothing while unset", () => {
    expect(siteHost("https://studio.com")).toBe("studio.com");
    expect(siteHost(PLACEHOLDER_BASE_URL)).toBe("");
  });
});

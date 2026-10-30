import { describe, expect, it } from "vitest";
import { checkSeo, cleanSeo, displayUrl, shorten } from "./seo";

describe("search and sharing settings (F036)", () => {
  it("keeps only what's set, so old pages stay as they were", () => {
    expect(cleanSeo({ title: " ", image: "", imageAlt: "x", noindex: false })).toBeUndefined();
    expect(cleanSeo({ title: " Visit us ", image: "/media/a.jpg", imageAlt: " A door ", noindex: true })).toEqual({ title: "Visit us", image: "/media/a.jpg", imageAlt: "A door", noindex: true });
    // Alt text without an image means nothing.
    expect(cleanSeo({ imageAlt: "x" })).toBeUndefined();
  });

  it("checks the settings before saving", () => {
    expect(checkSeo(undefined)).toEqual([]);
    expect(checkSeo({ title: "Hi" })).toEqual([]);
    expect(checkSeo({ image: "/media/a.jpg" })).toEqual(["The social image needs a description (alt text)."]);
    expect(checkSeo({ title: "x".repeat(121) })).toEqual(["The search title is longer than 120 characters."]);
    expect(checkSeo({ noindex: "yes" })).toEqual(["The search and sharing settings are damaged."]);
    expect(checkSeo("nope")).toEqual(["The search and sharing settings are damaged."]);
  });

  it("writes addresses and text the way search results show them", () => {
    expect(displayUrl("https://haho.studio", "/about/team")).toBe("haho.studio › about › team");
    expect(displayUrl("https://haho.studio/", "/")).toBe("haho.studio");
    expect(shorten("A short one", 60)).toBe("A short one");
    expect(shorten("Fresh bread every morning, and soup on Fridays, all year", 30)).toBe("Fresh bread every morning…");
  });
});

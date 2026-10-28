import { describe, expect, it } from "vitest";
import { config } from "./config";
import { defaultTokens, tokensToCss } from "./tokens";
import { safeUrl } from "./url";

describe("safeUrl", () => {
  it.each([
    ["https://example.com", "https://example.com"],
    ["/about", "/about"],
    ["#section", "#section"],
    ["mailto:a@b.co", "mailto:a@b.co"],
    ["tel:+62123", "tel:+62123"],
    ["about", "about"],
    ["javascript:alert(1)", "#"],
    [" JavaScript:alert(1)", "#"],
    ["data:text/html,hi", "#"],
    ["//evil.example", "#"],
    ["", "#"],
  ])("%s -> %s", (input, expected) => {
    expect(safeUrl(input)).toBe(expected);
  });
});

describe("tokensToCss", () => {
  it("emits one variable per token", () => {
    const css = tokensToCss(defaultTokens);
    expect(css).toContain("--cr-color-background: #ffffff;");
    expect(css).toContain("--cr-space-lg: 4rem;");
    expect(css).toContain("--cr-radius: 8px;");
  });
  it("rejects values that could inject CSS", () => {
    const bad = { ...defaultTokens, colors: { ...defaultTokens.colors, primary: "red; } body { display:none" } };
    expect(() => tokensToCss(bad)).toThrow(/Unsafe token value/);
  });
});

describe("block config", () => {
  it("every block has a label, fields and default props", () => {
    for (const [name, block] of Object.entries(config.components)) {
      expect(block.label, name).toBeTruthy();
      expect(block.fields, name).toBeTruthy();
      expect(block.defaultProps, name).toBeTruthy();
    }
  });
  it("every block is in a category", () => {
    const categorised = Object.values(config.categories ?? {}).flatMap((c) => c.components ?? []);
    expect(new Set(categorised)).toEqual(new Set(Object.keys(config.components)));
  });
});

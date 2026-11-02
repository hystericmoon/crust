import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { minifyCss } from "./render";

describe("minifyCss (published pages' inline CSS)", () => {
  it("drops comments and spare whitespace, keeping strings, calc() and selectors", () => {
    const css = `/* note */\n.a > .b ,\n.c:has(+ .d > .e) {\n  content: "  two  spaces ";\n  width: calc(100% - 2px);\n  font-family: 'Instrument Serif', serif;\n}\n@media (min-width: 640px) and (max-width: 1023px) { .x .y { color: red; } }`;
    expect(minifyCss(css)).toBe(
      `.a>.b,.c:has(+ .d>.e){content: "  two  spaces ";width: calc(100% - 2px);font-family: 'Instrument Serif',serif}@media (min-width: 640px) and (max-width: 1023px){.x .y{color: red}}`,
    );
  });

  it("removes a comment even when it holds quotes or apostrophes", () => {
    expect(minifyCss(`/* the "Muted" style, doesn't it's */ .a { color: red; }`)).toBe(".a{color: red}");
  });

  it("shrinks the real block styles by a good part and keeps every rule", () => {
    const css = readFileSync(new URL("../../blocks/src/styles.css", import.meta.url), "utf8");
    const out = minifyCss(css);
    expect(out.length).toBeLessThan(css.length * 0.85);
    const count = (s: string, ch: string) => s.split(ch).length - 1;
    expect(count(out, "{")).toBe(count(out, "}"));
    expect(count(out, "{")).toBe(count(css.replace(/\/\*[\s\S]*?\*\//g, ""), "{"));
  });
});

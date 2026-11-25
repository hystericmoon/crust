import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const templates = readFileSync("apps/admin/src/templates/TemplatesScreen.tsx", "utf8");
const css = readFileSync("apps/admin/src/templates/templates.css", "utf8");

describe("audit A111: premium sidebar file picker", () => {
  it("is a normal 44px button with the native input hidden but still in the page", () => {
    expect(templates).toContain('className="st-button tp-bought-button"');
    expect(templates).toContain('className="tp-bought-input"');
    expect(css).toMatch(/\.tp-bought-button \{[^}]*min-height: 44px/);
    expect(css).toMatch(/\.tp-bought-input \{ position: absolute;/);
    expect(css).toMatch(/\.tp-bought:has\(\.tp-bought-input:focus-visible\)/);
  });
});

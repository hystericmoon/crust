import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const templates = readFileSync("apps/admin/src/templates/TemplatesScreen.tsx", "utf8");
const css = readFileSync("apps/admin/src/templates/templates.css", "utf8");

describe("audit A113: template preview first on a phone", () => {
  it("puts the preview before the page list and offers only Phone on narrow screens", () => {
    const detail = templates.slice(templates.indexOf("function TemplateDetail("));
    expect(detail.indexOf('className="tp-stage"')).toBeLessThan(detail.indexOf('className="tp-pages"'));
    expect(detail).toContain('narrow() ? widths.filter((w) => w.id === "phone") : widths');
    expect(css).toMatch(/grid-template-areas: "pages stage"/);
    expect(css).toMatch(/grid-template-areas: "stage" "pages"/);
  });
});

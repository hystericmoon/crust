import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("apps/admin/src/pages/pages.css", "utf8");

describe("audit A208: FTP dialog scroll cue", () => {
  it("fades the field list above the fixed button bar", () => {
    expect(css).toMatch(/\.hp-ftp > \.pg-form-actions::before \{[^}]*linear-gradient/);
    expect(css).toMatch(/\.hp-ftp > \.pg-form-actions \{ position: sticky;/);
  });
});

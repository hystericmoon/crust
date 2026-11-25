// @vitest-environment happy-dom
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const src = (p: string) => readFileSync(`apps/admin/src/${p}`, "utf8");

describe("audit: accessibility batch", () => {
  it("A003: the visible word 'Move into' matches the accessible name", () => {
    const k = src("keyboard/KeyboardEditing.tsx");
    expect(k).toContain('into: "Move into",');
    expect(k).toContain('into: "Move into block above (Alt+→)"');
  });
});

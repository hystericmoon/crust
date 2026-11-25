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
  it("A007: the editor top bar is a named group, not a second banner", () => {
    const bar = src("app-frame/AppTopBar.tsx");
    expect(bar).toContain("landmark = true");
    expect(bar).toContain('role: "group", "aria-label": "Site and publishing"');
    expect(src("app-frame/EditorBar.tsx")).toContain("landmark={false}");
  });
});

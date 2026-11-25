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
  it("A112: Styles panel has one heading, one intro and a clear settings link", () => {
    const p = src("styles-panel/StylesPanel.tsx");
    expect(p.match(/>Styles<\//g)).toHaveLength(1);
    expect(p).not.toContain("A complete look in one tap");
    expect(p).toContain('label="Open all site settings"');
    expect(src("styles-panel/SiteSettingsSheet.tsx")).toContain('label = "Site settings"');
  });
  it("A306: design editor has an h1 and a 'Back to' link", () => {
    const d = src("designs/DesignEditor.tsx");
    expect(d).toContain('<h1 className="af-sr">Design editor: {name}</h1>');
    expect(d).toContain("Back to {back.label}");
  });
});

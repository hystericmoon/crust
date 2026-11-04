// @vitest-environment happy-dom
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { oneLine } from "./first-run/FirstRun";

const pages = readFileSync("apps/admin/src/pages/pages.css", "utf8");
const first = readFileSync("apps/admin/src/first-run/first-run.css", "utf8");
const host = readFileSync("apps/admin/src/publish/HostPublish.tsx", "utf8");
const sites = readFileSync("apps/admin/src/sites/SitesScreen.tsx", "utf8");

describe("audit-desktop: small polish (F056-F060)", () => {
  it("F056: the Publish heading gets no full-width focus box", () => {
    expect(pages).toMatch(/#publish-h:focus \{ outline: none; \}/);
    expect(pages).toMatch(/#publish-h:focus-visible \{[^}]*box-shadow: inset/);
  });
  it("F058: Change or disconnect is a 44px button; step pills are plain labels", () => {
    expect(host).toContain('className="st-button pg-small hp-link"');
    expect(pages).toMatch(/\.st-button\.hp-link \{ min-height: 44px;/);
    expect(pages).toMatch(/\.hp-steps li \{ padding: 0; border: 0;/);
  });
  it("F059: FTP dialog scrolls, keeps actions in view, has 20px radios with 44px rows, persistent warning", () => {
    expect(pages).toMatch(/\.pg-dialog:has\(\.hp-ftp\) \{[^}]*overflow-y: auto/);
    expect(pages).toMatch(/\.hp-ftp > \.pg-form-actions \{ position: sticky;/);
    expect(pages).toMatch(/input\[type="radio"\] \{ width: 20px; height: 20px;/);
    expect(pages).toMatch(/\.hp-ftp \.hp-account-choice \{ min-height: 44px;/);
    expect(host).toContain("Warning, not encrypted.");
  });
  it("F057: Delete has a danger colour and each other site has an Open button", () => {
    expect(pages).toMatch(/\.sites-delete \{ color: var\(--st-danger\);/);
    expect(sites).toContain("data-site-action={`open:${site.id}`}");
    expect(sites).toContain('Open site<span className="pg-sr">: {site.name}</span>');
  });
  it("F060: descriptions shrink to one short line; the grid is 2 columns at 800px", () => {
    expect(oneLine("Calm and editorial. Geist with mono labels, long text.")).toBe("Calm and editorial.");
    expect(oneLine("x".repeat(40) + " " + "y".repeat(80)).length).toBeLessThanOrEqual(80);
    expect(first).toMatch(/max-width: 1000px\) \{ \.fr-grid \{ grid-template-columns: repeat\(2/);
  });
});

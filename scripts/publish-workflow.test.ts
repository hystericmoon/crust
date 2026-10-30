import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";

type Step = { name?: string; run?: string; env?: Record<string, string> };
const wf = parse(readFileSync(".github/workflows/publish.yml", "utf8"));
const steps: Step[] = wf.jobs.publish.steps;
const step = (name: string) => steps.find((s) => s.name === name)!;

describe("publish workflow (F008)", () => {
  it("only runs when started, never on push", () => {
    expect(Object.keys(wf.on)).toEqual(["workflow_dispatch"]);
    expect(wf.concurrency).toEqual({ group: "publish-site", "cancel-in-progress": false });
  });

  it("renders, checks with crust-publish, then deploys the result", () => {
    const names = steps.map((s) => s.name).filter(Boolean);
    expect(names.indexOf("Render pages")).toBeLessThan(names.indexOf("Check and finish the site (crust-publish)"));
    expect(names.indexOf("Check and finish the site (crust-publish)")).toBeLessThan(
      names.indexOf("Accessibility check (stops the publish on serious issues)"),
    );
    expect(names.indexOf("Accessibility check (stops the publish on serious issues)")).toBeLessThan(names.indexOf("Deploy to Cloudflare Pages"));
    expect(step("Render pages").run).toBe("npm run render");
    expect(step("Check and finish the site (crust-publish)").run).toContain("crust-publish -- dist/site");
    expect(step("Check and finish the site (crust-publish)").run).toContain("--redirects content/redirects.json");
    expect(step("Check and finish the site (crust-publish)").run).toContain("--media content/media");
    expect(step("Deploy to Cloudflare Pages").run).toContain("pages deploy dist/site");
  });

  it("deploys to its own Pages project as production", () => {
    expect(wf.env.SITE_PROJECT).toBe("crust-site");
    expect(step("Deploy to Cloudflare Pages").run).toContain('--branch="$PRODUCTION_BRANCH"');
  });

  it("checks the live site and keeps secrets out of scripts", () => {
    expect(step("Check the live site").run).toContain("sitemap.xml");
    // F017: the admin finds the live address in this step's name.
    const names = steps.map((s) => s.name).filter(Boolean);
    expect(names).toContain("Live at ${{ steps.site.outputs.url }}");
    expect(names.indexOf("Check the live site")).toBeLessThan(names.indexOf("Live at ${{ steps.site.outputs.url }}"));
    for (const s of steps) expect(s.run ?? "").not.toMatch(/\$\{\{/);
    expect(wf.permissions).toEqual({ contents: "read" });
  });
});

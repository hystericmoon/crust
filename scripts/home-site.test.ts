/**
 * The Crust home page (home/content, built with Crust itself) and the workflow
 * that publishes it to its own free Pages project.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";

const STORE = "https://crust-store.pages.dev";
const DOWNLOADS = "https://crust-downloads.pages.dev";

const site = JSON.parse(readFileSync("home/content/site.json", "utf8"));
const page = JSON.parse(readFileSync("home/content/pages/index.json", "utf8"));
const media = JSON.parse(readFileSync("home/content/media.json", "utf8")) as { file: string; alt: string }[];

/** Every value of a given key anywhere in the page. */
const collect = (node: unknown, key: string, out: string[] = []): string[] => {
  if (Array.isArray(node)) node.forEach((n) => collect(n, key, out));
  else if (node && typeof node === "object") {
    for (const [k, v] of Object.entries(node)) {
      if (k === key && typeof v === "string") out.push(v);
      else collect(v, key, out);
    }
  }
  return out;
};

describe("home page: content", () => {
  it("is the one page, with one h1 and the Download button going to the downloads site", () => {
    expect(page.path).toBe("/");
    const h1s = JSON.stringify(page).match(/"level":\s*"h1"/g) ?? [];
    expect(h1s).toHaveLength(1);
    expect(site.header.cta).toEqual({ label: "Download Crust", href: DOWNLOADS });
    expect(collect(page, "href")).toContain(DOWNLOADS);
  });

  it("only links to the store, the downloads site and its own pictures", () => {
    const links = [...collect(page, "href"), ...collect(page, "linkHref"), ...collect(site, "href")];
    expect(links.length).toBeGreaterThan(8);
    for (const href of links) expect(href.startsWith(STORE) || href.startsWith(DOWNLOADS), href).toBe(true);
  });

  it("has every picture it shows, with the text that describes it", () => {
    const sources = collect(page, "imageSrc").filter(Boolean);
    expect(sources).toHaveLength(3);
    for (const src of sources) {
      expect(existsSync(join("home/content", src)), src).toBe(true);
      expect(media.find((m) => `/media/${m.file}` === src)?.alt.length, src).toBeGreaterThan(10);
    }
    for (const alt of collect(page, "imageAlt")) expect(alt.length).toBeGreaterThan(10);
  });
});

describe("home page: published as a site", () => {
  it("renders to one page with its words and links", () => {
    const out = mkdtempSync(join(tmpdir(), "crust-home-"));
    const run = spawnSync("npx", ["tsx", "packages/render/src/cli.ts", "home/content", out], { encoding: "utf8", env: { ...process.env, BASE_URL: "https://crust-home.pages.dev" } });
    expect(run.status, run.stderr).toBe(0);
    const html = readFileSync(join(out, "index.html"), "utf8");
    expect(html).toContain("Design the site. Keep the files.");
    expect(html).toContain(`href="${DOWNLOADS}"`);
    expect(html).toContain(`href="${STORE}/templates/corner"`);
  }, 30_000);
});

describe("home page: the Publish home workflow", () => {
  const workflow = parse(readFileSync(".github/workflows/publish-home.yml", "utf8"));
  const steps: { name?: string; run?: string; env?: Record<string, string> }[] = workflow.jobs.publish.steps;

  it("is started by hand only, and read-only on the repository", () => {
    expect(Object.keys(workflow.on)).toEqual(["workflow_dispatch"]);
    expect(workflow.permissions).toEqual({ contents: "read" });
  });

  it("takes the page's address from the project, runs the accessibility check, then deploys", () => {
    const names = steps.map((s) => s.name);
    expect(names.indexOf("Create Pages project if missing")).toBeLessThan(names.indexOf("Render pages"));
    expect(names.indexOf("Accessibility check (stops the publish on serious issues)")).toBeLessThan(names.indexOf("Deploy to Cloudflare Pages"));
    expect(steps.find((s) => s.name === "Render pages")?.env?.BASE_URL).toBe("${{ steps.project.outputs.url }}");
    for (const s of steps) expect(s.run ?? "").not.toMatch(/\$\{\{/);
  });

  it("is the same publish the local script runs", () => {
    const scripts = JSON.parse(readFileSync("package.json", "utf8")).scripts as Record<string, string>;
    expect(scripts["publish:home"]).toContain("home/content");
    expect(scripts["publish:home"]).toContain("crust-publish");
  });
});

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";

type Step = { name?: string; uses?: string; run?: string; if?: string; env?: Record<string, string> };

const preview = parse(readFileSync(".github/workflows/preview.yml", "utf8"));
const deploy = preview.jobs.deploy;
const steps: Step[] = deploy.steps;
const step = (name: string) => {
  const found = steps.find((s) => s.name === name);
  if (!found) throw new Error(`missing step: ${name}`);
  return found;
};

describe("preview deploy workflow (F010)", () => {
  it("runs on every branch push, new pull requests and by hand", () => {
    expect(preview.on.push.branches).toEqual(["**"]);
    expect(preview.on.pull_request.types).toEqual(["opened", "reopened"]);
    expect(preview.on).toHaveProperty("workflow_dispatch");
  });

  it("deploys the admin build with main as the production branch", () => {
    expect(preview.env.PRODUCTION_BRANCH).toBe("main");
    expect(step("Build admin").run).toBe("npm run build");
    const deploy = step("Deploy to Cloudflare Pages") as Step & { "working-directory"?: string };
    // From apps/admin, so the server functions in apps/admin/functions deploy too.
    expect(deploy["working-directory"]).toBe("apps/admin");
    expect(deploy.run).toContain("pages deploy dist");
  });

  it("pins the wrangler version", () => {
    expect(preview.env.WRANGLER_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("asks only for the permissions it needs", () => {
    expect(preview.permissions).toEqual({ contents: "read", "pull-requests": "write" });
  });

  it("never puts secrets or branch names straight into shell scripts", () => {
    for (const s of steps) {
      expect(s.run ?? "").not.toMatch(/\$\{\{/);
    }
    expect(deploy.env.CLOUDFLARE_API_TOKEN).toBe("${{ secrets.CLOUDFLARE_API_TOKEN }}");
  });

  it("skips Cloudflare steps cleanly when the secrets are missing", () => {
    const gated = steps.slice(steps.indexOf(step("Check Cloudflare secrets")) + 1);
    expect(gated.length).toBeGreaterThan(0);
    for (const s of gated) {
      expect(s.if).toBe("steps.secrets.outputs.ready == 'true'");
    }
  });

  it("checks the live preview, writes a summary and comments on the PR", () => {
    expect(step("Check the preview loads").run).toContain("<title>Crust builder</title>");
    // Once Cloudflare Access protects the admin, a redirect to its sign-in page counts as deployed.
    expect(step("Check the preview loads").run).toContain(".cloudflareaccess.com");
    expect(step("Write job summary").run).toContain("GITHUB_STEP_SUMMARY");
    expect(step("Comment on the pull request").run).toContain("crust-preview-deploy");
  });
});

describe("CI", () => {
  it("runs the accessibility and performance checks (F009)", () => {
    const ci = parse(readFileSync(".github/workflows/ci.yml", "utf8"));
    const runs = ci.jobs["site-checks"].steps.map((s: Step) => s.run);
    expect(runs).toContain("npm run check:a11y");
    expect(runs).toContain("npm run check:perf");
  });

  it("lints the workflow files", () => {
    const ci = parse(readFileSync(".github/workflows/ci.yml", "utf8"));
    const runs = ci.jobs["workflow-lint"].steps.map((s: Step) => s.run);
    expect(runs).toContain("npm run lint:workflows");
  });
});

describe("contact form Worker workflow (F037)", () => {
  const wf = parse(readFileSync(".github/workflows/contact-worker.yml", "utf8"));
  const steps: Step[] = wf.jobs.deploy.steps;
  it("deploys only from main or by hand, and skips until the setup is done", () => {
    expect(wf.on.push.branches).toEqual(["main"]);
    expect(wf.on).toHaveProperty("workflow_dispatch");
    expect(wf.permissions).toEqual({ contents: "read" });
    for (const s of steps.filter((s) => s.name?.startsWith("Deploy") || s.name?.startsWith("Give"))) {
      expect(s.if).toBe("steps.secrets.outputs.ready == 'true'");
    }
  });
  it("never puts secrets straight into shell scripts", () => {
    for (const s of steps) expect(s.run ?? "").not.toMatch(/\$\{\{\s*secrets\./);
  });
});

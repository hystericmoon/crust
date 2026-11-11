/**
 * F061: the downloads site the app updates from (scripts/updates-site.ts)
 * and the "Desktop installers" workflow that builds and publishes it.
 */
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { builtFiles, DOWNLOADS_URL, releaseFor, updatesSite, type BuiltFile } from "./updates-site";

const RELEASE = { version: "0.2.0", date: "2026-11-02", notes: ["Faster publishing.", "Photos <b>fixed</b> & tidier."] };
const MAC: BuiltFile = { path: "/b/macos/Crust.app.tar.gz", name: "Crust.app.tar.gz", signature: "c2lnLW1hYw==" };
const DMG: BuiltFile = { path: "/b/dmg/Crust_0.2.0_universal.dmg", name: "Crust_0.2.0_universal.dmg" };
const WIN: BuiltFile = { path: "/b/nsis/Crust_0.2.0_x64-setup.exe", name: "Crust_0.2.0_x64-setup.exe", signature: "c2lnLXdpbg==" };

describe("updates site: what's new", () => {
  it("needs notes for the version being released", () => {
    expect(releaseFor([RELEASE], "0.2.0")).toEqual(RELEASE);
    expect(() => releaseFor([RELEASE], "0.3.0")).toThrow("nothing for version 0.3.0");
    expect(() => releaseFor({}, "0.2.0")).toThrow("list of releases");
    expect(() => releaseFor([{ ...RELEASE, date: "soon" }], "0.2.0")).toThrow("date like");
    expect(() => releaseFor([{ ...RELEASE, notes: [] }], "0.2.0")).toThrow("at least one line");
    expect(() => releaseFor([{ ...RELEASE, notes: [" "] }], "0.2.0")).toThrow("at least one line");
  });

  it("has notes for the app's own version", () => {
    const conf = JSON.parse(readFileSync("crates/crust-desktop/tauri.conf.json", "utf8")) as { version: string };
    const release = releaseFor(JSON.parse(readFileSync("crates/crust-desktop/whats-new.json", "utf8")), conf.version);
    expect(release.notes.length).toBeGreaterThan(0);
  });
});

describe("updates site: the feed", () => {
  it("offers the signed update to each kind of computer", () => {
    const site = updatesSite([MAC, DMG, WIN], RELEASE);
    expect(site.latest).toEqual({
      version: "0.2.0",
      notes: "- Faster publishing.\n- Photos <b>fixed</b> & tidier.",
      pub_date: "2026-11-02T00:00:00Z",
      platforms: {
        "darwin-aarch64": { url: `${DOWNLOADS_URL}/0.2.0/Crust.app.tar.gz`, signature: "c2lnLW1hYw==" },
        "darwin-x86_64": { url: `${DOWNLOADS_URL}/0.2.0/Crust.app.tar.gz`, signature: "c2lnLW1hYw==" },
        "windows-x86_64": { url: `${DOWNLOADS_URL}/0.2.0/Crust_0.2.0_x64-setup.exe`, signature: "c2lnLXdpbg==" },
      },
    });
    expect(site.copies.map((c) => c.to).sort()).toEqual(["0.2.0/Crust.app.tar.gz", "0.2.0/Crust_0.2.0_universal.dmg", "0.2.0/Crust_0.2.0_x64-setup.exe"]);
    expect(site.downloads.map((d) => d.label)).toEqual(["Mac (Apple chip or Intel, macOS 11 or later)", "Windows (10 and 11)"]);
  });

  it("still offers installers built without the update key, just not as updates", () => {
    const site = updatesSite([DMG, { ...WIN, signature: undefined }], RELEASE, "https://crust-downloads-x1.pages.dev/");
    expect(site.latest.platforms).toEqual({});
    expect(site.downloads).toHaveLength(2);
    expect(() => updatesSite([{ ...MAC, signature: undefined }, DMG], RELEASE)).toThrow("no signature");
    expect(() => updatesSite([], RELEASE)).toThrow("No installers");
  });

  it("writes a download page that escapes what's new", () => {
    const { index } = updatesSite([MAC, DMG, WIN], RELEASE);
    expect(index).toContain('<html lang="en">');
    expect(index).toContain("<title>Download Crust</title>");
    expect(index).toContain('href="0.2.0/Crust_0.2.0_universal.dmg"');
    expect(index).toContain("Photos &lt;b&gt;fixed&lt;/b&gt; &amp; tidier.");
    expect(index).not.toContain("<b>fixed</b>");
    // One h1, then h2: headings in order.
    expect(index.match(/<h1/g)).toHaveLength(1);
  });

  it("finds the built files and their signatures, and writes the site", () => {
    const dir = mkdtempSync(join(tmpdir(), "crust-updates-"));
    const built = join(dir, "built");
    mkdirSync(join(built, "crust-mac/macos"), { recursive: true });
    mkdirSync(join(built, "crust-mac/dmg"), { recursive: true });
    writeFileSync(join(built, "crust-mac/macos/Crust.app.tar.gz"), "mac update");
    writeFileSync(join(built, "crust-mac/macos/Crust.app.tar.gz.sig"), "c2ln\n");
    writeFileSync(join(built, "crust-mac/dmg/Crust_0.1.0_universal.dmg"), "mac installer");
    return builtFiles(built).then((files) => {
      const mac = files.find((f) => f.name === "Crust.app.tar.gz");
      expect(mac?.signature).toBe("c2ln");
      expect(files.map((f) => f.name).sort()).toEqual(["Crust.app.tar.gz", "Crust_0.1.0_universal.dmg"]);

      const out = join(dir, "out");
      const run = spawnSync("npx", ["tsx", "scripts/updates-site.ts", built, out], { encoding: "utf8" });
      expect(run.status, run.stderr).toBe(0);
      const latest = JSON.parse(readFileSync(join(out, "updates/latest.json"), "utf8"));
      // The tool reads the app's own version, so the test does too (it changes with every release).
      const { version } = JSON.parse(readFileSync("crates/crust-desktop/tauri.conf.json", "utf8")) as { version: string };
      expect(latest.platforms["darwin-aarch64"].url).toBe(`${DOWNLOADS_URL}/${version}/Crust.app.tar.gz`);
      expect(readFileSync(join(out, `${version}/Crust.app.tar.gz`), "utf8")).toBe("mac update");
      expect(readFileSync(join(out, "_headers"), "utf8")).toContain("Cache-Control: no-cache");
      expect(readFileSync(join(out, "index.html"), "utf8")).toContain("Download Crust");
    });
  }, 30_000);
});

type Step = { name?: string; run?: string; if?: string; env?: Record<string, string>; uses?: string; with?: Record<string, unknown> };
const release = parse(readFileSync(".github/workflows/desktop-release.yml", "utf8"));
const buildSteps: Step[] = release.jobs.build.steps;
const downloadSteps: Step[] = release.jobs.downloads.steps;
const find = (steps: Step[], name: string) => {
  const s = steps.find((x) => x.name === name);
  if (!s) throw new Error(`missing step: ${name}`);
  return s;
};

describe("updates site: the Desktop installers workflow", () => {
  it("is still started by hand only", () => {
    expect(Object.keys(release.on)).toEqual(["workflow_dispatch"]);
    expect(release.on.workflow_dispatch.inputs.downloads.type).toBe("boolean");
    expect(release.on.workflow_dispatch.inputs.downloads.default).toBe(false);
  });

  it("signs updates with the owner's key, from secrets, and builds the public half in", () => {
    const build = find(buildSteps, "Build the installer");
    expect(build.env?.TAURI_SIGNING_PRIVATE_KEY).toBe("${{ secrets.TAURI_SIGNING_PRIVATE_KEY }}");
    expect(build.env?.TAURI_SIGNING_PRIVATE_KEY_PASSWORD).toBe("${{ secrets.TAURI_SIGNING_PRIVATE_KEY_PASSWORD }}");
    expect(build.env?.CRUST_UPDATE_PUBKEY).toBe("${{ vars.CRUST_UPDATE_PUBKEY }}");
    expect(build.run).toContain("createUpdaterArtifacts");
    // A key without its public half (or the other way round) stops the build.
    expect(find(buildSteps, "Check the update key").run).toContain("exit 1");
  });

  it("never puts secrets or inputs straight into shell scripts", () => {
    for (const s of [...buildSteps, ...downloadSteps]) expect(s.run ?? "").not.toMatch(/\$\{\{/);
  });

  it("puts the downloads site up only when asked, after the installers", () => {
    expect(release.jobs.downloads.needs).toBe("build");
    expect(release.jobs.downloads.if).toContain("inputs.downloads");
    expect(find(downloadSteps, "Put together the downloads site").run).toContain("scripts/updates-site.ts");
    const deploy = find(downloadSteps, "Upload to Cloudflare Pages");
    expect(deploy.run).toContain("pages deploy");
    expect(deploy.run).toContain("$DOWNLOADS_PROJECT");
    expect(release.env.DOWNLOADS_PROJECT).toBe("crust-downloads");
    expect(release.env.WRANGLER_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});

describe("updates site: the Make update key workflow", () => {
  const keyFlow = parse(readFileSync(".github/workflows/update-key.yml", "utf8"));
  const steps: Step[] = keyFlow.jobs.key.steps;

  it("is started by hand only, after typing a confirmation", () => {
    expect(Object.keys(keyFlow.on)).toEqual(["workflow_dispatch"]);
    expect(find(steps, "Check the confirmation").run).toContain('"make a new key"');
    expect(keyFlow.permissions).toEqual({ contents: "read" });
  });

  it("hands over the key as a download that disappears after a day, never in the logs", () => {
    const make = find(steps, "Make the key");
    expect(make.run).toContain("::add-mask::");
    expect(make.run).toContain("> /dev/null");
    const keep = find(steps, "Keep the key for a day");
    expect(keep.with?.["retention-days"]).toBe(1);
    // Only the public half goes in the summary.
    expect(find(steps, "Write job summary").env?.PUBLIC_KEY).toBe("${{ steps.key.outputs.public }}");
    for (const s of steps) expect(s.run ?? "").not.toMatch(/\$\{\{/);
    // The same tool version as the app's build.
    const lock = JSON.parse(readFileSync("package-lock.json", "utf8"));
    expect(keyFlow.env.TAURI_CLI_VERSION).toBe(lock.packages["node_modules/@tauri-apps/cli"].version);
  });
});

/**
 * F047: the template quality check.
 *
 *   npm run check:template                  every templates/*.crust, or the sample site in content/ when there are none
 *   npm run check:template -- my.crust      one or more template files
 *
 * For each template: opens it like the builder does, checks contrast in
 * every section style, publishes it into dist/template-check/<name>/ (with
 * the Replace me marks taken off, as a buyer would first publish it) so
 * crust-publish checks headings, photo descriptions and titles, runs axe at
 * desktop, tablet and phone widths on every page and saved layout, and
 * Lighthouse on the home page. Writes dist/template-check/index.html, a
 * readable report, and exits 1 if any check failed.
 */
import { config, readTemplate, templateFileName } from "@crust/blocks";
import { spawnSync } from "node:child_process";
import { appendFile, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { templateFromContent } from "../packages/render/src/content-template";
import {
  CHECK_BASE_URL,
  axeGroup,
  contrastGroup,
  cropsGroup,
  fileGroup,
  AWAITING_REBUILD,
  excuseUntilRebuilt,
  gradientGroup,
  placeholderGroup,
  publishGroup,
  renderLayouts,
  reportFails,
  reportHtml,
  reportText,
  slotsGroup,
  speedGroup,
  unpackTemplate,
  varietyGroup,
  type CheckGroup,
  type TemplateReport,
} from "../packages/render/src/template-check";
import { axeSite, lighthouseHome, MIN_PERFORMANCE } from "./site-audit.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(root, "dist/template-check");
const baseCss = await readFile(join(root, "packages/blocks/src/styles.css"), "utf8");
const allSizes = ["desktop", "tablet", "phone"] as const;

function run(cmd: string, args: string[]): { ok: boolean; output: string } {
  const r = spawnSync(cmd, args, { cwd: root, encoding: "utf8" });
  return { ok: r.status === 0, output: `${r.stdout ?? ""}${r.stderr ?? ""}${r.error ? String(r.error) : ""}` };
}

async function writeFiles(dir: string, files: Map<string, string | Uint8Array>) {
  for (const [path, body] of files) {
    await mkdir(dirname(join(dir, path)), { recursive: true });
    await writeFile(join(dir, path), body);
  }
}

async function check(text: string, source: string, missing: string[] = []): Promise<TemplateReport> {
  const read = readTemplate(text, config.components);
  const t = read.template;
  if (!t) return { name: basename(source), source, groups: [fileGroup(read.problems, missing)] };
  console.log(`\nChecking ${t.name} (${source})`);
  const groups: CheckGroup[] = [fileGroup([], missing), contrastGroup(t)];

  const dir = join(OUT, templateFileName(t.name).replace(/\.crust$/, ""));
  const contentDir = join(dir, "content");
  const siteDir = join(dir, "site");
  await rm(dir, { recursive: true, force: true });
  await writeFiles(contentDir, unpackTemplate(t));

  // Publish it like the publish workflow does: render, then crust-publish (headings, alt text, titles).
  const render = run(join(root, "node_modules/.bin/tsx"), ["packages/render/src/cli.ts", contentDir, siteDir]);
  if (!render.ok) {
    groups.push(publishGroup(false, render.output));
  } else {
    const media = t.media.length ? ["--media", join(contentDir, "media")] : [];
    const publish = run("cargo", ["run", "-q", "-p", "crust-publish", "--", siteDir, "--base-url", CHECK_BASE_URL, ...media, "--fonts", join(root, "packages/blocks/fonts")]);
    groups.push(publishGroup(publish.ok, publish.output));
    run(join(root, "node_modules/.bin/pagefind"), ["--site", siteDir, "--silent"]);
    console.log("  axe on every page at three widths…");
    groups.push(axeGroup(await axeSite(siteDir, [...allSizes])));
    console.log("  Lighthouse on the home page…");
    groups.push(speedGroup(await lighthouseHome(siteDir).catch((e: unknown) => ({ error: e instanceof Error ? e.message : String(e) })), MIN_PERFORMANCE));
  }

  const layouts = renderLayouts(t, baseCss);
  groups.push(layouts.group);
  if (layouts.pages.length) {
    const layoutDir = join(dir, "layouts");
    await writeFiles(layoutDir, new Map(layouts.pages.map((p) => [`${p.slug}/index.html`, p.html])));
    console.log("  axe on the saved layouts…");
    groups.push(axeGroup(await axeSite(layoutDir, [...allSizes]), "layout"));
  }
  const strict = [slotsGroup(t), cropsGroup(t), varietyGroup(t), gradientGroup(t)];
  groups.push(placeholderGroup(t), ...(AWAITING_REBUILD.includes(t.name) ? strict.map(excuseUntilRebuilt) : strict));
  return { name: t.name, source, groups };
}

const args = process.argv.slice(2);
const files = args.length
  ? args
  : (await readdir(join(root, "templates")).catch(() => [] as string[])).filter((f) => f.endsWith(".crust")).sort().map((f) => join("templates", f));

await mkdir(OUT, { recursive: true });
const reports: TemplateReport[] = [];
if (files.length) {
  for (const file of files) {
    const text = await readFile(resolve(root, file), "utf8").catch(() => null);
    reports.push(text === null ? { name: basename(file), source: basename(file), groups: [fileGroup(["Couldn't read this file. Check its name and folder."])] } : await check(text, basename(file)));
  }
} else {
  const { template, missing } = await templateFromContent(join(root, "content"));
  reports.push(await check(JSON.stringify(template), "the sample site in content/", missing));
}

const report = join(OUT, "index.html");
await writeFile(report, reportHtml(reports, new Date()));
console.log(`\n${reportText(reports)}\n\nReport: ${report}`);
if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, `## Template check\n\n${reportText(reports, true)}\n\nThe full report is in the **template-check-report** download below.\n`);
if (reports.some(reportFails)) {
  console.log("\nTemplate check failed.");
  process.exit(1);
}
console.log("\nTemplate check passed.");

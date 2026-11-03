/**
 * F064: npm run publish:store calls this after the store itself is published.
 * Usage: tsx scripts/store/demos-build.ts <store site folder>
 * Publishes every listed template as its own site (marks off, like a buyer's
 * first publish), builds its search index, and puts it in <folder>/demos/<id>/.
 */
import { spawnSync } from "node:child_process";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { CHECK_BASE_URL, unpackTemplate } from "../../packages/render/src/template-check";
import { demoFiles, DEMOS_DIR } from "./demos";
import { loadStore, ROOT } from "./load";

const [siteDir = "dist/store"] = process.argv.slice(2);
const run = (cmd: string, args: string[]) => {
  const r = spawnSync(cmd, args, { cwd: ROOT, encoding: "utf8" });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(" ")} failed:\n${r.stdout}${r.stderr}`);
};
const walk = async (dir: string): Promise<string[]> =>
  (await readdir(dir, { withFileTypes: true, recursive: true })).filter((e) => e.isFile()).map((e) => relative(dir, join(e.parentPath ?? (e as unknown as { path: string }).path, e.name)).split("\\").join("/"));

const work = join(ROOT, "dist/store-demos");
await rm(work, { recursive: true, force: true });
await rm(join(ROOT, siteDir, DEMOS_DIR), { recursive: true, force: true });
for (const { item, template } of loadStore().templates) {
  const content = join(work, item.id, "content");
  const site = join(work, item.id, "site");
  for (const [path, body] of unpackTemplate(template)) {
    await mkdir(dirname(join(content, path)), { recursive: true });
    await writeFile(join(content, path), body);
  }
  const env = { ...process.env, BASE_URL: CHECK_BASE_URL };
  const render = spawnSync(join(ROOT, "node_modules/.bin/tsx"), ["packages/render/src/cli.ts", content, site], { cwd: ROOT, encoding: "utf8", env });
  if (render.status !== 0) throw new Error(`${template.name} didn't render:\n${render.stdout}${render.stderr}`);
  run("cargo", ["run", "-q", "-p", "crust-publish", "--", site, "--base-url", CHECK_BASE_URL, "--media", join(content, "media"), "--photo-cache", join(ROOT, ".crust-cache/photos"), "--fonts", join(ROOT, "packages/blocks/fonts")]);
  run(join(ROOT, "node_modules/.bin/pagefind"), ["--site", site, "--silent"]);
  const files = new Map<string, string | Uint8Array>();
  for (const path of await walk(site)) {
    const bytes = await readFile(join(site, path));
    files.set(path, /\.(html|css|js|mjs|xml)$/i.test(path) && !path.startsWith("pagefind/") ? bytes.toString("utf8") : bytes);
  }
  const out = demoFiles(files, { id: item.id, name: template.name, price: item.price }, CHECK_BASE_URL);
  for (const [path, body] of out) {
    const target = join(ROOT, siteDir, DEMOS_DIR, item.id, path);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, body);
  }
  console.log(`✓ demo ${template.name}: ${out.size} files at /${DEMOS_DIR}/${item.id}/`);
}

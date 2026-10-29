/**
 * Usage: tsx packages/render/src/cli.ts <contentDir> <outDir>
 * Renders every page in <contentDir>/pages to static HTML in <outDir>.
 */
import type { Page, Site } from "@crust/blocks";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { outputFileFor, renderNotFound, renderPage } from "./render";

const [contentDir = "content", outDir = "dist/site"] = process.argv.slice(2);
const stylesPath = join(dirname(fileURLToPath(import.meta.url)), "../../blocks/src/styles.css");

const readJson = async <T>(path: string): Promise<T> => JSON.parse(await readFile(path, "utf8")) as T;

const site = await readJson<Site>(join(contentDir, "site.json"));
const baseCss = await readFile(stylesPath, "utf8");
const pageFiles = (await readdir(join(contentDir, "pages"))).filter((f) => f.endsWith(".json")).sort();

await rm(outDir, { recursive: true, force: true });
const seen = new Map<string, string>();
for (const file of pageFiles) {
  const page = await readJson<Page>(join(contentDir, "pages", file));
  const target = outputFileFor(page.path);
  const previous = seen.get(target);
  if (previous) throw new Error(`Pages ${previous} and ${file} both use the URL "${page.path}".`);
  seen.set(target, file);
  const html = renderPage(site, page, baseCss);
  await mkdir(dirname(join(outDir, target)), { recursive: true });
  await writeFile(join(outDir, target), html);
  console.log(`rendered ${page.path} -> ${target}`);
}
await mkdir(outDir, { recursive: true });
await writeFile(join(outDir, "404.html"), renderNotFound(site, baseCss));
console.log(`render: ${pageFiles.length} page(s) written to ${outDir}`);

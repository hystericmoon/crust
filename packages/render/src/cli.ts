/**
 * Usage: tsx packages/render/src/cli.ts <contentDir> <outDir>
 * Renders every page in <contentDir>/pages to static HTML in <outDir>.
 * The rendering itself is renderSite (site.ts), which the desktop app
 * uses too (F056), so both publish the same pages.
 */
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readSiteContent, renderSite, type ContentSource } from "./site";

const [contentDir = "content", outDir = "dist/site"] = process.argv.slice(2);
const stylesPath = join(dirname(fileURLToPath(import.meta.url)), "../../blocks/src/styles.css");

/** content/ on disk. */
const folderSource = (dir: string): ContentSource => ({
  read: (path) => readFile(join(dir, path), "utf8").catch(() => null),
  list: (sub) => readdir(join(dir, sub)).catch(() => [] as string[]),
});

const content = await readSiteContent(folderSource(contentDir));
const baseCss = await readFile(stylesPath, "utf8");
// The publish workflow passes the live address; locally the one in site.json is used.
const baseUrl = process.env.BASE_URL || content.site.baseUrl;
// F037: set by the publish workflow once the contact form service is set up (BLOCKED.md).
const forms = process.env.CONTACT_FORM_URL ? { endpoint: process.env.CONTACT_FORM_URL, siteKey: process.env.TURNSTILE_SITE_KEY ?? "" } : undefined;
const files = renderSite(content, baseCss, { baseUrl, forms });

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });
for (const file of files) {
  await mkdir(dirname(join(outDir, file.path)), { recursive: true });
  await writeFile(join(outDir, file.path), file.content);
}
for (const { page } of content.pages) console.log(`rendered ${page.path}`);
if (content.posts.length) console.log(`rendered ${content.posts.length} post(s), /blog/ and /blog/feed.xml`);
console.log(`render: ${content.pages.length} page(s) written to ${outDir}`);

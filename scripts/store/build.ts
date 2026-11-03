/**
 * F063: npm run build:store writes the store's content folder
 * (store/content/site.json and pages/) from store/list.json and the template
 * files. The pictures come from npm run store:pictures. The store test fails
 * when the committed files are out of date.
 */
import { mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { loadStore, ROOT, storeContentFiles } from "./load";

const store = loadStore();
const files = storeContentFiles(store.templates, store.checkout);
const dir = join(ROOT, "store/content");
await mkdir(join(dir, "pages"), { recursive: true });
for (const old of await readdir(join(dir, "pages"))) await rm(join(dir, "pages", old));
for (const [path, text] of files) await writeFile(join(dir, path), text);
console.log(`✓ store/content: site.json and ${files.size - 1} pages`);

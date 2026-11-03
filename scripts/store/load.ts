/** F063: reading the store's list and template files from the repository. */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { pageFileName, readStoreList, readStoreTemplates, storePages, storeSite, type StoreTemplate } from "./model";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const read = (path: string) => {
  try {
    return readFileSync(join(ROOT, path), "utf8");
  } catch {
    return null;
  }
};

/** store/list.json with its template files; throws with every problem in plain words. */
export function loadStore(): { templates: StoreTemplate[] } {
  const { list, problems } = readStoreList(read("store/list.json") ?? "");
  if (!list) throw new Error(problems.join("\n"));
  const { templates, problems: more } = readStoreTemplates(list, read);
  if (more.length) throw new Error(more.join("\n"));
  return { templates };
}

const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;

/** store/content files that build.ts writes: path in store/content → text. */
export function storeContentFiles(templates: StoreTemplate[]): Map<string, string> {
  const files = new Map<string, string>([["site.json", json(storeSite(templates))]]);
  for (const p of storePages(templates)) files.set(`pages/${pageFileName(p)}`, json(p));
  return files;
}

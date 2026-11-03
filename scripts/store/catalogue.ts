/**
 * F063: writes catalogue.json into the published store (the file the app's
 * gallery reads, F062). Usage: tsx scripts/store/catalogue.ts <site folder>
 * The publish workflow passes the store's live address in BASE_URL.
 */
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { loadStore } from "./load";
import { CATALOGUE_FILE, STORE_URL, storeCatalogue } from "./model";

const [siteDir = "dist/store"] = process.argv.slice(2);
const catalogue = storeCatalogue(loadStore().templates, process.env.BASE_URL || STORE_URL);
await writeFile(join(siteDir, CATALOGUE_FILE), `${JSON.stringify(catalogue, null, 2)}\n`);
console.log(`✓ ${CATALOGUE_FILE}: ${catalogue.templates.length} priced template(s) for the app's gallery`);

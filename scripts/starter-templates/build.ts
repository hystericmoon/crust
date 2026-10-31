/**
 * npm run build:starters: writes templates/<id>.crust for every starter
 * template (F049–F051), read back with the template reader first.
 */
import { config, readTemplate } from "@crust/blocks";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildStarter, starters } from "./starter";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
await mkdir(join(root, "templates"), { recursive: true });
for (const s of starters) {
  const text = `${JSON.stringify(await buildStarter(s))}\n`;
  const read = readTemplate(text, config.components);
  if (!read.template) {
    console.error(`✗ ${s.name}: ${read.problems.join(" ")}`);
    process.exit(1);
  }
  await writeFile(join(root, "templates", `${s.id}.crust`), text);
  console.log(`✓ templates/${s.id}.crust (${Math.round(text.length / 1024)} KB)`);
}

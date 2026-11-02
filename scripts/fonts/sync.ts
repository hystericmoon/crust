/**
 * F070: copies the bundled fonts from the @fontsource packages into
 * packages/blocks/fonts/, named as fontFiles() expects, with each font's
 * licence. Run after changing the font list or updating the packages:
 *
 *   npm run fonts:sync
 */
import { bundledFonts, fontFiles } from "@crust/blocks";
import { copyFile, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const out = join(root, "packages/blocks/fonts");
/** Optical sizing is worth its extra weight only for these display serifs. */
const opsz = new Set(["fraunces", "bodoni-moda"]);

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
const licences: string[] = [];
let bytes = 0;
for (const font of bundledFonts) {
  const pkg = join(root, "node_modules", font.variable ? "@fontsource-variable" : "@fontsource", font.id);
  for (const f of fontFiles(font)) {
    const axis = font.variable ? (opsz.has(font.id) ? "opsz" : "wght") : f.weight;
    const from = join(pkg, "files", `${font.id}-${f.subset}-${axis}-${f.style}.woff2`);
    if (!existsSync(from)) throw new Error(`Missing ${from}. Is ${font.variable ? "@fontsource-variable" : "@fontsource"}/${font.id} installed?`);
    await copyFile(from, join(out, f.file));
    bytes += (await readFile(from)).length;
  }
  const meta = JSON.parse(await readFile(join(pkg, "metadata.json"), "utf8")) as { license?: { type?: string; attribution?: string } };
  if (meta.license?.type !== "OFL-1.1") throw new Error(`${font.family} isn't under OFL-1.1 (${meta.license?.type}).`);
  licences.push(`${font.family}: ${meta.license.attribution ?? ""}`.trim());
}
const licence = await readFile(join(root, "node_modules/@fontsource-variable/fraunces/LICENSE"), "utf8");
// The licence text itself, without Fraunces' copyright line above it.
const ofl = licence.slice(licence.indexOf("This Font Software"));
await writeFile(
  join(out, "LICENSE.txt"),
  `The fonts in this folder are licensed under the SIL Open Font License, Version 1.1.\nThey ship with Crust and are published with sites that use them.\n\n${licences.join("\n\n")}\n\n---\n\n${ofl}`,
);
// The download size of each font's main file (Latin, upright), for "Adds about … KB".
const sizes: Record<string, number> = {};
for (const font of bundledFonts) {
  const main = fontFiles(font).find((x) => x.subset === "latin" && x.style === "normal" && (font.variable || x.weight === "400"))!;
  sizes[font.id] = (await readFile(join(out, main.file))).length;
}
await writeFile(
  join(root, "packages/blocks/src/font-sizes.ts"),
  `// Made by \`npm run fonts:sync\` (scripts/fonts/sync.ts). Bytes of each bundled font's Latin, upright file.\nexport const fontMainBytes: Record<string, number> = ${JSON.stringify(sizes, null, 2)};\n`,
);
const count = (await readdir(out)).filter((f) => f.endsWith(".woff2")).length;
console.log(`fonts: ${bundledFonts.length} families, ${count} files, ${Math.round(bytes / 1024)} KB in packages/blocks/fonts/`);

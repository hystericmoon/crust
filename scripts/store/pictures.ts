/**
 * F063: npm run store:pictures takes the store's pictures of each listed
 * template: its shown pages at computer, tablet and phone width, published
 * exactly as a buyer would first publish them (marks off). Writes
 * store/content/media/<id>-<page>-<width>.jpg and store/content/media.json.
 * Run it after a template changes (needs Chromium and cargo), then
 * npm run build:store.
 */
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { mkdir, readdir, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { CHECK_BASE_URL, unpackTemplate } from "../../packages/render/src/template-check";
import { serve } from "../serve-static.mjs";
import { loadStore, ROOT } from "./load";
import { PICTURE_SIZES, picturesNeeded } from "./model";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright-core") as typeof import("playwright-core");

const run = (cmd: string, args: string[]) => {
  const r = spawnSync(cmd, args, { cwd: ROOT, encoding: "utf8" });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(" ")} failed:\n${r.stdout}${r.stderr}`);
};

const { templates } = loadStore();
const needed = picturesNeeded(templates);
const work = join(ROOT, "dist/store-pictures");
const mediaDir = join(ROOT, "store/content/media");
await rm(work, { recursive: true, force: true });
await mkdir(mediaDir, { recursive: true });
for (const old of await readdir(mediaDir)) if (!needed.some((p) => p.file === old)) await rm(join(mediaDir, old));

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || "/opt/pw-browsers/chromium" });
try {
  for (const { item, template } of templates) {
    console.log(`${template.name}: publishing…`);
    const content = join(work, item.id, "content");
    const site = join(work, item.id, "site");
    for (const [path, body] of unpackTemplate(template)) {
      await mkdir(dirname(join(content, path)), { recursive: true });
      await writeFile(join(content, path), body);
    }
    run(join(ROOT, "node_modules/.bin/tsx"), ["packages/render/src/cli.ts", content, site]);
    run("cargo", ["run", "-q", "-p", "crust-publish", "--", site, "--base-url", CHECK_BASE_URL, "--media", join(content, "media"), "--fonts", join(ROOT, "packages/blocks/fonts")]);
    const server = await serve(site);
    try {
      for (const pic of needed.filter((p) => p.id === item.id)) {
        const size = PICTURE_SIZES[pic.widthName];
        // Motion off, so every section is in its resting place.
        const page = await browser.newPage({ viewport: { width: size.width, height: size.screen }, reducedMotion: "reduce", deviceScaleFactor: size.scale });
        await page.goto(`${server.url}${pic.path === "/" ? "/" : `${pic.path}/`}`, { waitUntil: "networkidle" });
        // Scroll through the part pictured, so lazy photos load, then back to the top.
        for (let y = 0; y < size.height; y += size.screen / 2) {
          await page.evaluate((top) => window.scrollTo(0, top), y);
          await page.waitForTimeout(150);
        }
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.waitForLoadState("networkidle");
        await page.evaluate(() => document.fonts.ready);
        await page.waitForTimeout(300);
        await writeFile(join(mediaDir, pic.file), await page.screenshot({ type: "jpeg", quality: 72, fullPage: true, clip: { x: 0, y: 0, width: size.width, height: size.height } }));
        await page.close();
        console.log(`  ✓ ${pic.file}`);
      }
    } finally {
      await server.close();
    }
  }
} finally {
  await browser.close();
}

const index = [];
for (const { id: _id, path: _path, widthName: _w, ...m } of needed) index.push({ ...m, bytes: (await stat(join(mediaDir, m.file))).size });
await writeFile(join(ROOT, "store/content/media.json"), `${JSON.stringify(index, null, 2)}\n`);
console.log(`✓ ${index.length} pictures in store/content/media/`);

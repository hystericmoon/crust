// F062: makes the example catalogue (apps/admin/public/sample-catalogue/),
// shown at #/templates?examples so the Premium group can be tried before the
// Crust store exists. Its pictures are of the free starters, at desktop,
// tablet and phone width, taken from the gallery's own preview.
//
//   npm run build && node scripts/sample-catalogue.mjs
import { createRequire } from "node:module";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { serve } from "./serve-static.mjs";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright-core");
const out = new URL("../apps/admin/public/sample-catalogue/", import.meta.url);
const widths = { desktop: 1280, tablet: 768, phone: 375 };
// Two of the starters, dressed as examples; two pages each.
const examples = [
  { card: "Harbour", id: "example-studio", name: "Example: Studio", kind: "Architect or designer", price: "US$49", description: "Calm and editorial. An example of how a premium template shows here.", pages: ["Home", "About"] },
  { card: "Corner", id: "example-shop", name: "Example: Shop", kind: "Shop or café", price: "US$39", description: "Warm and local. An example of how a premium template shows here.", pages: ["Home", "Services"] },
];

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
const server = await serve(new URL("../apps/admin/dist", import.meta.url).pathname);
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || "/opt/pw-browsers/chromium" });
const templates = [];
try {
  for (const ex of examples) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(`${server.url}/#/templates`);
    await page.locator(`.tp-card:has-text("${ex.card}")`).first().click();
    await page.waitForSelector(".tp-frame iframe");
    const pages = [];
    for (const title of ex.pages) {
      await page.locator(`.tp-pages button:has-text("${title}")`).first().click();
      await page.waitForTimeout(500);
      const html = await page.locator(".tp-frame iframe").getAttribute("srcdoc");
      const path = (await page.locator(`.tp-pages button[aria-current="page"] .tp-path`).textContent()).trim();
      const pictures = [];
      for (const [width, px] of Object.entries(widths)) {
        const shot = await browser.newPage({ viewport: { width: px, height: 900 } });
        await shot.setContent(html, { waitUntil: "load" });
        await shot.waitForTimeout(300);
        const height = Math.min(await shot.evaluate(() => document.documentElement.scrollHeight), px * 3);
        const file = `${ex.id}${path === "/" ? "-home" : path.replace(/\//g, "-")}-${width}.jpg`;
        await writeFile(new URL(file, out), await shot.screenshot({ type: "jpeg", quality: 60, clip: { x: 0, y: 0, width: px, height } }));
        await shot.close();
        pictures.push({ width, src: file, alt: `${ex.name}, ${title} page at ${width} width` });
      }
      pages.push({ title, path, pictures });
    }
    await page.close();
    templates.push({ id: ex.id, name: ex.name, description: ex.description, kind: ex.kind, price: ex.price, url: "store.html", pages });
  }
} finally {
  await browser.close();
  await server.close();
}
await writeFile(new URL("catalogue.json", out), `${JSON.stringify({ format: "crust-catalogue", version: 1, templates }, null, 2)}\n`);
await writeFile(
  new URL("store.html", out),
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Crust store</title>
<style>body{margin:0;font:16px/1.5 system-ui,sans-serif;background:#f6f6f7;color:#18181b}main{max-width:40rem;margin:0 auto;padding:48px 16px}</style></head>
<body><main><h1>The Crust store isn't open yet</h1><p>This is where “Get this template” will take you to buy a premium template. The templates in the gallery are examples for now.</p></main></body></html>
`,
);
console.log(`Example catalogue: ${templates.length} templates in apps/admin/public/sample-catalogue/`);

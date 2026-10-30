// F040: runs axe on the builder itself (Puck's chrome and our own controls),
// at desktop width, after the canvas has loaded. Fails on any "serious" or
// "critical" issue. Needs the built admin: npm run build first.
// Usage: node scripts/check-builder-a11y.mjs [apps/admin/dist]
import { readFile, stat } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";
import { chromium } from "playwright-core";
import { serve } from "./serve-static.mjs";

const require = createRequire(import.meta.url);
const axeSource = await readFile(require.resolve("axe-core/axe.min.js"), "utf8");
const distDir = process.argv[2] ?? "apps/admin/dist";

if (!(await stat(join(distDir, "index.html")).catch(() => null))) {
  console.log(`No builder in ${distDir}. Run npm run build first.`);
  process.exit(1);
}

// The post builder needs a post; offline, posts come from the browser's drafts.
const samplePost = {
  slug: "check-post",
  title: "Opening day",
  description: "We open on Saturday.",
  date: "2026-10-30",
  cover: "",
  coverAlt: "",
  puck: { root: { props: {} }, content: [{ type: "Text", props: { id: "t1", text: "Come and say hello." } }] },
};
// [label, address, post to seed, block to select first (F042: the rich text editor)]
const screens = [
  ["page builder", "/#/edit?path=/", null, null],
  ["page builder, Text block selected", "/#/edit?path=/", null, '[data-puck-component^="Text"]'],
  ["post builder", "/#/post?slug=check-post", samplePost, null],
];

const server = await serve(distDir);
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
let failures = 0;
try {
  for (const [label, hash, post, select] of screens) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    if (post) {
      await page.addInitScript((p) => {
        localStorage.setItem(`crust:post:${p.slug}`, JSON.stringify({ post: p, updatedAt: new Date().toISOString(), savedToGitHub: false }));
      }, post);
    }
    await page.goto(server.url + hash, { waitUntil: "load" });
    // Wait for Puck's canvas and the blocks inside it.
    await page.waitForSelector("iframe", { timeout: 20_000 });
    await page.waitForTimeout(1500);
    if (select) {
      await page.frameLocator("#preview-frame").locator(select).first().click();
      await page.waitForSelector(".rt-editor", { state: "attached", timeout: 10_000 });
      await page.waitForTimeout(500);
    }
    await page.addScriptTag({ content: axeSource });
    const results = await page.evaluate(() =>
      // eslint-disable-next-line no-undef
      axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"] } }),
    );
    const bad = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    const minor = results.violations.filter((v) => !bad.includes(v));
    if (bad.length) {
      failures += bad.length;
      console.log(`✗ ${label}: ${bad.length} serious issue(s)`);
      for (const v of bad) {
        console.log(`   - ${v.help} [${v.id}, ${v.impact}]`);
        for (const n of v.nodes.slice(0, 3)) console.log(`       at ${n.target.join(" ")}`);
      }
    } else {
      console.log(`✓ ${label}: no serious issues${minor.length ? ` (${minor.length} minor, not blocking)` : ""}`);
    }
    for (const v of minor) console.log(`   · minor: ${v.help} [${v.id}] at ${v.nodes[0]?.target.join(" ")}`);
    await page.close();
  }
} finally {
  await browser.close();
  await server.close();
}
if (failures) {
  console.log(`\nBuilder accessibility check failed: ${failures} serious issue(s).`);
  process.exit(1);
}
console.log("\nBuilder accessibility check passed.");

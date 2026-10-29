// F009: runs axe on every published page, at desktop and phone widths.
// Fails on any "serious" or "critical" issue. Usage: node scripts/check-a11y.mjs [dist/site]
import { readdir, readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join, relative } from "node:path";
import { chromium } from "playwright-core";
import { serve } from "./serve-static.mjs";

const require = createRequire(import.meta.url);
const axeSource = await readFile(require.resolve("axe-core/axe.min.js"), "utf8");
const siteDir = process.argv[2] ?? "dist/site";

async function pages(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true, recursive: true })) {
    if (entry.isFile() && entry.name.endsWith(".html")) {
      const rel = relative(siteDir, join(entry.parentPath ?? entry.path, entry.name)).split("\\").join("/");
      out.push("/" + rel.replace(/index\.html$/, ""));
    }
  }
  return out.sort();
}

const server = await serve(siteDir);
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
let failures = 0;
try {
  const paths = await pages(siteDir);
  if (paths.length === 0) throw new Error(`No pages in ${siteDir}. Run npm run publish:local first.`);
  for (const path of paths) {
    for (const [label, width] of [["desktop", 1280], ["phone", 375]]) {
      const page = await browser.newPage({ viewport: { width, height: 900 }, javaScriptEnabled: true });
      await page.goto(server.url + path, { waitUntil: "load" });
      await page.addScriptTag({ content: axeSource });
      const results = await page.evaluate(() =>
        // eslint-disable-next-line no-undef
        axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"] } }),
      );
      const bad = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
      const minor = results.violations.length - bad.length;
      if (bad.length) {
        failures += bad.length;
        console.log(`✗ ${path} (${label}): ${bad.length} serious issue(s)`);
        for (const v of bad) {
          console.log(`   - ${v.help} [${v.id}, ${v.impact}]`);
          for (const n of v.nodes.slice(0, 3)) console.log(`       at ${n.target.join(" ")}`);
        }
      } else {
        console.log(`✓ ${path} (${label}): no serious issues${minor ? ` (${minor} minor, not blocking)` : ""}`);
      }
      await page.close();
    }
  }
} finally {
  await browser.close();
  await server.close();
}
if (failures) {
  console.log(`\nAccessibility check failed: ${failures} serious issue(s).`);
  process.exit(1);
}
console.log("\nAccessibility check passed.");

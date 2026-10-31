// Shared by check-a11y (F009), check-perf (F009) and check-template (F047):
// axe on every page of a rendered site, and Lighthouse on its home page.
import { readdir, readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join, relative } from "node:path";
import lighthouse from "lighthouse";
import * as chromeLauncher from "chrome-launcher";
import { chromium } from "playwright-core";
import { serve } from "./serve-static.mjs";

const require = createRequire(import.meta.url);

export const widths = { desktop: 1280, tablet: 768, phone: 375 };
export const MIN_PERFORMANCE = 95;

/** Every page of a rendered site, as paths ("/", "/about/"). */
export async function sitePages(siteDir) {
  const out = [];
  for (const entry of await readdir(siteDir, { withFileTypes: true, recursive: true })) {
    if (entry.isFile() && entry.name.endsWith(".html")) {
      const rel = relative(siteDir, join(entry.parentPath ?? entry.path, entry.name)).split("\\").join("/");
      out.push("/" + rel.replace(/index\.html$/, ""));
    }
  }
  return out.sort();
}

/**
 * Runs axe on every page at each width. Returns one result per page and
 * width: the serious and critical issues (which fail a check) and how many
 * minor ones there were (which don't).
 */
export async function axeSite(siteDir, sizes = ["desktop", "phone"]) {
  const axeSource = await readFile(require.resolve("axe-core/axe.min.js"), "utf8");
  const server = await serve(siteDir);
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
  const results = [];
  try {
    const paths = await sitePages(siteDir);
    if (paths.length === 0) throw new Error(`No pages in ${siteDir}. Run npm run publish:local first.`);
    for (const path of paths) {
      for (const size of sizes) {
        const page = await browser.newPage({ viewport: { width: widths[size], height: 900 }, javaScriptEnabled: true });
        await page.goto(server.url + path, { waitUntil: "load" });
        await page.addScriptTag({ content: axeSource });
        const run = await page.evaluate(() =>
          // eslint-disable-next-line no-undef
          axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"] } }),
        );
        const serious = run.violations
          .filter((v) => v.impact === "serious" || v.impact === "critical")
          .map((v) => ({ id: v.id, help: v.help, impact: v.impact, targets: v.nodes.slice(0, 3).map((n) => n.target.join(" ")) }));
        results.push({ path, size, serious, minor: run.violations.length - serious.length });
        await page.close();
      }
    }
  } finally {
    await browser.close();
    await server.close();
  }
  return results;
}

/** Lighthouse on the site's home page: the four scores (0–100) and what slows it down. */
export async function lighthouseHome(siteDir) {
  const server = await serve(siteDir);
  const chrome = await chromeLauncher.launch({
    chromePath: process.env.CHROME_PATH || chromium.executablePath(),
    chromeFlags: ["--headless=new", "--no-sandbox", "--disable-gpu"],
  });
  try {
    const result = await lighthouse(`${server.url}/`, {
      port: chrome.port,
      output: "json",
      logLevel: "error",
      onlyCategories: ["performance", "accessibility", "seo", "best-practices"],
    });
    const cats = result.lhr.categories;
    const score = (c) => Math.round((c?.score ?? 0) * 100);
    return {
      performance: score(cats.performance),
      accessibility: score(cats.accessibility),
      seo: score(cats.seo),
      bestPractices: score(cats["best-practices"]),
      slow: Object.values(result.lhr.audits)
        .filter((a) => a.score !== null && a.score < 0.9 && a.details?.type === "opportunity")
        .map((a) => a.title),
    };
  } finally {
    chrome.kill();
    await server.close();
  }
}

// F009: Lighthouse on the sample (Home) page. Performance must be 95 or more
// (spec, Milestone 1). Usage: node scripts/check-perf.mjs [dist/site]
import lighthouse from "lighthouse";
import * as chromeLauncher from "chrome-launcher";
import { chromium } from "playwright-core";
import { serve } from "./serve-static.mjs";

const siteDir = process.argv[2] ?? "dist/site";
const MIN = 95;

const server = await serve(siteDir);
const chrome = await chromeLauncher.launch({
  chromePath: process.env.CHROME_PATH || chromium.executablePath(),
  chromeFlags: ["--headless=new", "--no-sandbox", "--disable-gpu"],
});
let ok = false;
try {
  const result = await lighthouse(`${server.url}/`, {
    port: chrome.port,
    output: "json",
    logLevel: "error",
    onlyCategories: ["performance", "accessibility", "seo", "best-practices"],
  });
  const cats = result.lhr.categories;
  const score = (c) => Math.round((c?.score ?? 0) * 100);
  console.log(`Performance:    ${score(cats.performance)} (needs ${MIN})`);
  console.log(`Accessibility:  ${score(cats.accessibility)}`);
  console.log(`SEO:            ${score(cats.seo)}`);
  console.log(`Best practices: ${score(cats["best-practices"])}`);
  ok = score(cats.performance) >= MIN;
  if (!ok) {
    const audits = Object.values(result.lhr.audits)
      .filter((a) => a.score !== null && a.score < 0.9 && a.details?.type === "opportunity")
      .map((a) => `  - ${a.title}`);
    if (audits.length) console.log(`\nWhat slows it down:\n${audits.join("\n")}`);
  }
} finally {
  chrome.kill();
  await server.close();
}
if (!ok) {
  console.log("\nPerformance check failed.");
  process.exit(1);
}
console.log("\nPerformance check passed.");

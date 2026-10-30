// F009: Lighthouse on the sample (Home) page. Performance must be 95 or more
// (spec, Milestone 1). Usage: node scripts/check-perf.mjs [dist/site]
import { lighthouseHome, MIN_PERFORMANCE } from "./site-audit.mjs";

const siteDir = process.argv[2] ?? "dist/site";
const s = await lighthouseHome(siteDir);
console.log(`Performance:    ${s.performance} (needs ${MIN_PERFORMANCE})`);
console.log(`Accessibility:  ${s.accessibility}`);
console.log(`SEO:            ${s.seo}`);
console.log(`Best practices: ${s.bestPractices}`);
if (s.performance < MIN_PERFORMANCE) {
  if (s.slow.length) console.log(`\nWhat slows it down:\n${s.slow.map((t) => `  - ${t}`).join("\n")}`);
  console.log("\nPerformance check failed.");
  process.exit(1);
}
console.log("\nPerformance check passed.");

// F009: runs axe on every published page, at desktop and phone widths.
// Fails on any "serious" or "critical" issue. Usage: node scripts/check-a11y.mjs [dist/site]
import { axeSite } from "./site-audit.mjs";

const siteDir = process.argv[2] ?? "dist/site";
let failures = 0;
for (const r of await axeSite(siteDir)) {
  if (r.serious.length) {
    failures += r.serious.length;
    console.log(`✗ ${r.path} (${r.size}): ${r.serious.length} serious issue(s)`);
    for (const v of r.serious) {
      console.log(`   - ${v.help} [${v.id}, ${v.impact}]`);
      for (const t of v.targets) console.log(`       at ${t}`);
    }
  } else {
    console.log(`✓ ${r.path} (${r.size}): no serious issues${r.minor ? ` (${r.minor} minor, not blocking)` : ""}`);
  }
}
if (failures) {
  console.log(`\nAccessibility check failed: ${failures} serious issue(s).`);
  process.exit(1);
}
console.log("\nAccessibility check passed.");

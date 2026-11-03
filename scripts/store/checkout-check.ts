/**
 * F066: the Publish store workflow's checkout gate. Stops the publish when a
 * priced template has no checkout setting, or when the setting and the
 * owner's "Take real payments" switch (CRUST_REAL_PAYMENTS=yes) disagree.
 */
import { checkoutGate, PROVIDERS } from "./checkout";
import { loadStore } from "./load";
import { isPriced } from "./model";

const { templates, checkout } = loadStore();
const priced = templates.filter(({ item }) => isPriced(item)).length;
const problems = checkoutGate(priced, checkout, process.env.CRUST_REAL_PAYMENTS === "yes");
if (problems.length) {
  for (const p of problems) console.error(`::error::${p}`);
  process.exit(1);
}
console.log(
  priced && checkout
    ? `✓ checkout: ${PROVIDERS[checkout.provider].name}, ${checkout.mode === "live" ? "real payments" : "test mode (no real payments)"}, ${priced} priced template${priced === 1 ? "" : "s"}`
    : "✓ checkout: nothing for sale yet",
);

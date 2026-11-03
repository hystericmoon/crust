/**
 * F067: run by the workflows with CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID.
 *   delivery-kv.ts namespace  prints the delivery KV namespace id (creates it)
 *   delivery-kv.ts upload     puts every priced template into it (Publish store)
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { deliveryPairs, namespaceId, upload, type Cloudflare } from "./delivery";
import { loadStore, ROOT } from "./load";

const cf: Cloudflare = { accountId: process.env.CLOUDFLARE_ACCOUNT_ID ?? "", token: process.env.CLOUDFLARE_API_TOKEN ?? "" };
const command = process.argv[2];

async function main() {
  if (command === "namespace") {
    console.log(await namespaceId(cf));
    return;
  }
  if (command === "upload") {
    const { templates } = loadStore();
    const pairs = deliveryPairs(templates, (path) => {
      try {
        return readFileSync(join(ROOT, path), "utf8");
      } catch {
        return null;
      }
    });
    if (!pairs.length) {
      console.log("✓ delivery: nothing for sale yet, no files to upload");
      return;
    }
    const count = pairs.length / 2;
    await upload(cf, await namespaceId(cf), pairs);
    console.log(`✓ delivery: ${count} priced template${count === 1 ? "" : "s"} ready for download pages`);
    return;
  }
  throw new Error("Use: delivery-kv.ts namespace | upload");
}

main().catch((err: Error) => {
  console.error(`::error::${err.message}`);
  process.exit(1);
});

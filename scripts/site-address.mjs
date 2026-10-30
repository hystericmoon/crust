// F044: which address the publish uses. Called by publish.yml's "Work out
// the site address" step:
//   node scripts/site-address.mjs <baseUrl> <pages-subdomain> [domains.json]
// domains.json is Cloudflare's list of the Pages project's custom domains.
// Prints `url=…` (and `wanted=…`, `wanted_status=…` when the owner's own
// address isn't connected yet) for $GITHUB_OUTPUT.
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

/** Same rule as isPlaceholderAddress in packages/blocks/src/site-address.ts. */
const isPlaceholder = (url) => !url.trim() || /(^|\/\/|\.)example\./i.test(url);

/**
 * The site's own address wins once Cloudflare reports its domain as active
 * on the Pages project. Until then the free Pages address is used, so the
 * sitemap, canonical and sharing links never point at a domain that
 * doesn't answer yet.
 */
export function pickAddress({ base, subdomain, domains }) {
  const free = `https://${subdomain}`;
  const url = (base ?? "").trim().replace(/\/+$/, "");
  if (isPlaceholder(url) || !/^https:\/\/[^/\s]+$/i.test(url)) return { url: free };
  const host = url.slice("https://".length).toLowerCase();
  if (host.endsWith(".pages.dev")) return { url: `https://${host}` };
  const domain = (domains ?? []).find((d) => d && typeof d.name === "string" && d.name.toLowerCase() === host);
  if (domain?.status === "active") return { url: `https://${host}` };
  return { url: free, wanted: host, wantedStatus: domain ? String(domain.status ?? "pending") : "not added" };
}

/** Cloudflare's `{ result: [{ name, status }] }`, or [] when it can't be read. */
export function readDomains(text) {
  try {
    const body = JSON.parse(text);
    return Array.isArray(body?.result) ? body.result : [];
  } catch {
    return [];
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const [base = "", subdomain = "", file] = process.argv.slice(2);
  if (!subdomain) {
    console.error("usage: site-address.mjs <baseUrl> <pages-subdomain> [domains.json]");
    process.exit(2);
  }
  let domains = [];
  if (file) {
    try {
      domains = readDomains(readFileSync(file, "utf8"));
    } catch {
      domains = [];
    }
  }
  const pick = pickAddress({ base, subdomain, domains });
  console.log(`url=${pick.url}`);
  if (pick.wanted) {
    console.log(`wanted=${pick.wanted}`);
    console.log(`wanted_status=${pick.wantedStatus}`);
  }
}

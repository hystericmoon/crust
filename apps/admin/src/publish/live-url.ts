/** Where the published site lives, for the "Open live site" button (F017). */
import { safeUrl } from "@crust/blocks";

/** site.json starts with an example address; the publish workflow ignores it, and so do we. */
export const isPlaceholderAddress = (url: string) => !url.trim() || /(^|\/\/|\.)example\./i.test(url);

/**
 * The address the last publish reported wins; otherwise site.json's baseUrl
 * if it's a real address (that's where the workflow publishes to). Null
 * before the first publish. Only http(s) addresses are used.
 */
export function chooseLiveUrl(reported: string | null | undefined, configured: string): string | null {
  for (const url of [reported, isPlaceholderAddress(configured) ? null : configured]) {
    if (url && /^https?:\/\//i.test(url) && safeUrl(url) === url) return url;
  }
  return null;
}

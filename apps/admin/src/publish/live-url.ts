/** Where the published site lives, for the "Open live site" button (F017). */
import { isPlaceholderAddress, safeUrl, siteHost } from "@crust/blocks";

/** site.json starts with an example address; the publish workflow ignores it, and so do we. */
export { isPlaceholderAddress };

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

/**
 * F044: what to say about the site's own address under "Live at", or null.
 * - The last publish found the domain not connected: say so, and what to do.
 * - The address in Site settings differs from where the site is live: it
 *   takes effect at the next publish.
 */
export function addressNote(reported: string | null | undefined, configured: string, notConnected: string | null | undefined): string | null {
  const wanted = siteHost(configured);
  if (!wanted || !reported) return null;
  const live = siteHost(reported);
  if (live === wanted) return null;
  if (notConnected === wanted) {
    return `${wanted} isn't connected to your site yet, so the last publish used ${live}. Finish the steps in the custom domain guide, then publish again.`;
  }
  return `Your site's address is set to ${wanted}. Publish to start using it.`;
}

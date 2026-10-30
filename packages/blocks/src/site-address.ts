/**
 * The site's own address (F044): site.json's baseUrl, edited in Site
 * settings. Until the owner sets one, baseUrl holds the example placeholder
 * and publishing uses the free Cloudflare Pages address instead.
 */

/** What site.json holds while no address is set (the publish workflow skips it). */
export const PLACEHOLDER_BASE_URL = "https://example.pages.dev";

/** An empty or example address means "not set yet" (same rule as publish.yml). */
export const isPlaceholderAddress = (url: string) => !url.trim() || /(^|\/\/|\.)example\./i.test(url);

const HOST = /^(?=.{4,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

export type AddressResult = { ok: true; url: string } | { ok: false; message: string };

/**
 * Turns what the owner typed into the address baseUrl stores: `https://`
 * plus the domain, lowercase, no trailing slash. "studio.com",
 * "https://www.studio.com/" and "Studio.com" all work. Empty means "use the
 * free address" (the placeholder). The site lives at the domain's root, so
 * a path, port or http:// address is refused with a plain explanation.
 */
export function normalizeSiteAddress(input: string): AddressResult {
  let text = input.trim();
  if (!text) return { ok: true, url: PLACEHOLDER_BASE_URL };
  if (/^http:\/\//i.test(text)) return { ok: false, message: "Use https:// — Cloudflare gives every site a free secure (https) address." };
  text = text.replace(/^https:\/\//i, "").replace(/\/+$/, "");
  if (/[/?#]/.test(text)) return { ok: false, message: "Enter just the domain, like studio.com, without a page address after it." };
  if (/:/.test(text)) return { ok: false, message: "Enter just the domain, like studio.com, without a port number." };
  const host = text.toLowerCase();
  if (!HOST.test(host)) return { ok: false, message: "That doesn't look like a domain. It should look like studio.com or www.studio.com." };
  if (isPlaceholderAddress(`https://${host}`)) return { ok: true, url: PLACEHOLDER_BASE_URL };
  return { ok: true, url: `https://${host}` };
}

/** True for an address Site settings would save as-is (the placeholder included). */
export const isValidSiteAddress = (url: unknown): url is string => {
  if (typeof url !== "string") return false;
  const result = normalizeSiteAddress(url);
  return result.ok && result.url === url;
};

/** The domain alone ("studio.com"), or "" while no address is set. */
export const siteHost = (url: string) => (isPlaceholderAddress(url) ? "" : url.replace(/^https?:\/\//i, "").replace(/\/.*$/, ""));

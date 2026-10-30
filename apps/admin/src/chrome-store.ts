import { isValidSiteAddress, validateChrome, type Site, type SiteChrome, type SiteTokens } from "@crust/blocks";

/** Saved header and footer (F031), kept in this browser like the tokens until GitHub has them. */
export const CHROME_KEY = "crust:draft:chrome";

export function loadSavedChrome(fallback: SiteChrome): SiteChrome {
  try {
    const raw = localStorage.getItem(CHROME_KEY);
    if (raw) {
      const chrome = JSON.parse(raw) as SiteChrome;
      if (chrome.header && chrome.footer && validateChrome(chrome).length === 0) {
        return { header: { ...fallback.header, ...chrome.header }, footer: { ...fallback.footer, ...chrome.footer } };
      }
    }
  } catch {
    // Storage unavailable or corrupt: use the site's own.
  }
  return fallback;
}

/** Returns false when the browser refuses to store it. */
export function saveChrome(chrome: SiteChrome): boolean {
  try {
    localStorage.setItem(CHROME_KEY, JSON.stringify(chrome));
    return true;
  } catch {
    return false;
  }
}

/** The site's own address (F044), kept in this browser like the header and footer. */
export const ADDRESS_KEY = "crust:draft:address";

export function loadSavedAddress(fallback: string): string {
  try {
    const raw = localStorage.getItem(ADDRESS_KEY);
    if (raw && isValidSiteAddress(raw)) return raw;
  } catch {
    // Storage unavailable: use the site's own.
  }
  return fallback;
}

/** Returns false when the browser refuses to store it. */
export function saveAddress(baseUrl: string): boolean {
  try {
    localStorage.setItem(ADDRESS_KEY, baseUrl);
    return true;
  } catch {
    return false;
  }
}

export const sameChrome = (a: SiteChrome, b: SiteChrome) => JSON.stringify(a) === JSON.stringify(b);

/**
 * site.json as Site settings saves it: the tokens, the header and
 * footer, and the site's address (F044). A header or footer still at its defaults isn't written, so a site
 * that never edited its menu keeps getting it from its pages at publish
 * time (new, renamed and deleted pages included).
 */
export function siteToSave(site: Site, tokens: SiteTokens, chrome: SiteChrome, defaults: SiteChrome, baseUrl = site.baseUrl): Site {
  const keep = <T,>(part: T, fallback: T, saved: unknown) => (saved === undefined && JSON.stringify(part) === JSON.stringify(fallback) ? undefined : part);
  const next: Site = { ...site, baseUrl, tokens, header: keep(chrome.header, defaults.header, site.header), footer: keep(chrome.footer, defaults.footer, site.footer) };
  if (next.header === undefined) delete next.header;
  if (next.footer === undefined) delete next.footer;
  return next;
}

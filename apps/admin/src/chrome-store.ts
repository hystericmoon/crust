import { validateChrome, type Site, type SiteChrome, type SiteTokens } from "@crust/blocks";

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

export const sameChrome = (a: SiteChrome, b: SiteChrome) => JSON.stringify(a) === JSON.stringify(b);

/** site.json as Site settings saves it: the tokens plus the header and footer. */
export const siteToSave = (site: Site, tokens: SiteTokens, chrome: SiteChrome): Site => ({ ...site, tokens, header: chrome.header, footer: chrome.footer });

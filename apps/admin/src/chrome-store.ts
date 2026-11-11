import { checkSiteSeo, cleanSiteSeo, isValidSiteAddress, validateChrome, type Site, type SiteChrome, type SiteSeo, type SiteTokens } from "@crust/blocks";

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

/** F094: the site's name, language and search defaults, kept in this browser like the address until they are saved to the site. */
export const DETAILS_KEY = "crust:draft:details";
export interface SiteDetails {
  name: string;
  language: string;
  seo: SiteSeo;
}
export const detailsOf = (site: Pick<Site, "name" | "language" | "seo">): SiteDetails => ({ name: site.name, language: site.language, seo: { ...site.seo } });
export const sameDetails = (a: SiteDetails, b: SiteDetails) => JSON.stringify(cleanedDetails(a)) === JSON.stringify(cleanedDetails(b));
const cleanedDetails = (d: SiteDetails) => ({ name: d.name.trim(), language: d.language.trim(), seo: cleanSiteSeo(d.seo) ?? null });

export function loadSavedDetails(fallback: SiteDetails): SiteDetails {
  try {
    const raw = localStorage.getItem(DETAILS_KEY);
    if (raw) {
      const d = JSON.parse(raw) as SiteDetails;
      if (typeof d.name === "string" && d.name.trim() && typeof d.language === "string" && /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/.test(d.language) && checkSiteSeo(d.seo).length === 0) {
        return { name: d.name, language: d.language, seo: d.seo ?? {} };
      }
    }
  } catch {
    // Storage unavailable or corrupt: use the site's own.
  }
  return fallback;
}

/** Returns false when the browser refuses to store it. */
export function saveDetails(details: SiteDetails): boolean {
  try {
    localStorage.setItem(DETAILS_KEY, JSON.stringify(details));
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
export function siteToSave(site: Site, tokens: SiteTokens, chrome: SiteChrome, defaults: SiteChrome, baseUrl = site.baseUrl, details?: SiteDetails): Site {
  const keep = <T,>(part: T, fallback: T, saved: unknown) => (saved === undefined && JSON.stringify(part) === JSON.stringify(fallback) ? undefined : part);
  const next: Site = { ...site, baseUrl, tokens, header: keep(chrome.header, defaults.header, site.header), footer: keep(chrome.footer, defaults.footer, site.footer) };
  // F094: name, language and search defaults. Empty defaults aren't written, so an untouched site file stays as it was.
  if (details) {
    next.name = details.name.trim() || site.name;
    next.language = details.language.trim() || site.language;
    const seo = cleanSiteSeo(details.seo);
    if (seo) next.seo = seo;
    else delete next.seo;
  }
  if (next.header === undefined) delete next.header;
  if (next.footer === undefined) delete next.footer;
  return next;
}

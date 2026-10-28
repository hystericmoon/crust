import { validateTokens, type SiteTokens } from "@crust/blocks";

/** Saved tokens live in this browser until F006 (Save to GitHub). */
export const TOKENS_KEY = "crust:draft:tokens";

export function loadSavedTokens(fallback: SiteTokens): SiteTokens {
  try {
    const raw = localStorage.getItem(TOKENS_KEY);
    if (raw) {
      const tokens = JSON.parse(raw) as SiteTokens;
      if (validateTokens(tokens).length === 0) return tokens;
    }
  } catch {
    // Storage unavailable or corrupt: use the site's tokens.
  }
  return fallback;
}

/** Returns false when the browser refuses to store it. */
export function saveTokens(tokens: SiteTokens): boolean {
  try {
    localStorage.setItem(TOKENS_KEY, JSON.stringify(tokens));
    return true;
  } catch {
    return false;
  }
}

export const sameTokens = (a: SiteTokens, b: SiteTokens) => JSON.stringify(a) === JSON.stringify(b);

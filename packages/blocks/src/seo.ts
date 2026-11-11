/**
 * Search and sharing settings per page (F036). Optional `seo` in a page
 * file; pages without it publish as before (title and description only).
 *
 * Deep-importable (no React) so the server functions can use it.
 */

export interface PageSeo {
  /** Title in search results and when shared; the page title when empty. */
  title?: string;
  /** Picture shown when the link is shared (any image address). */
  image?: string;
  imageAlt?: string;
  /** Keep this page out of search engines (and out of sitemap.xml). */
  noindex?: boolean;
}

export const seoLimits = { title: 120, imageAlt: 250 };
/** Roughly what search engines and chat apps show before cutting a line. */
export const seoAdvice = { title: 60, description: 160 };

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** Problems with a page's `seo`, in the owner's words. Missing `seo` is fine. */
export function checkSeo(seo: unknown): string[] {
  if (seo === undefined) return [];
  if (!isObject(seo)) return ["The search and sharing settings are damaged."];
  const problems: string[] = [];
  const text = (v: unknown) => v === undefined || typeof v === "string";
  if (!text(seo.title) || !text(seo.image) || !text(seo.imageAlt) || !(seo.noindex === undefined || typeof seo.noindex === "boolean")) {
    return ["The search and sharing settings are damaged."];
  }
  if (((seo.title as string | undefined)?.length ?? 0) > seoLimits.title) problems.push(`The search title is longer than ${seoLimits.title} characters.`);
  if (((seo.imageAlt as string | undefined)?.length ?? 0) > seoLimits.imageAlt) problems.push(`The social image description is longer than ${seoLimits.imageAlt} characters.`);
  if ((seo.image as string | undefined)?.trim() && !(seo.imageAlt as string | undefined)?.trim()) problems.push("The social image needs a description (alt text).");
  return problems;
}

/** Only set values, trimmed; undefined when nothing is set (so old pages stay as they were). */
export function cleanSeo(seo: PageSeo | undefined | null): PageSeo | undefined {
  if (!seo) return undefined;
  const out: PageSeo = {};
  if (seo.title?.trim()) out.title = seo.title.trim();
  if (seo.image?.trim()) out.image = seo.image.trim();
  if (seo.image?.trim() && seo.imageAlt?.trim()) out.imageAlt = seo.imageAlt.trim();
  if (seo.noindex) out.noindex = true;
  return Object.keys(out).length ? out : undefined;
}

/** "https://haho.studio/about/" → "haho.studio › about", as search results show it. */
export function displayUrl(baseUrl: string, path: string): string {
  const host = baseUrl.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  const parts = path.split("/").filter(Boolean);
  return [host, ...parts].join(" › ");
}

/** Cuts text at a word to about `max` characters, with "…". */
export function shorten(text: string, max: number): string {
  const t = text.trim().replace(/\s+/g, " ");
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,.;:!?-]+$/, "")}…`;
}

/**
 * Site-wide search and sharing defaults (F094): `seo` in site.json. A page
 * with no description of its own uses `description`; a page with no sharing
 * picture uses `image`. Optional: sites without it publish as before.
 */
export interface SiteSeo {
  description?: string;
  image?: string;
  imageAlt?: string;
}

export const siteSeoLimits = { description: 300, imageAlt: 250 };

/** Problems with the site's `seo`, in the owner's words. Missing `seo` is fine. */
export function checkSiteSeo(seo: unknown): string[] {
  if (seo === undefined) return [];
  if (!isObject(seo)) return ["The site's search and sharing defaults are damaged."];
  const text = (v: unknown) => v === undefined || typeof v === "string";
  if (!text(seo.description) || !text(seo.image) || !text(seo.imageAlt)) return ["The site's search and sharing defaults are damaged."];
  const problems: string[] = [];
  if (((seo.description as string | undefined)?.length ?? 0) > siteSeoLimits.description) problems.push(`The default description is longer than ${siteSeoLimits.description} characters.`);
  if (((seo.imageAlt as string | undefined)?.length ?? 0) > siteSeoLimits.imageAlt) problems.push(`The default sharing picture description is longer than ${siteSeoLimits.imageAlt} characters.`);
  if ((seo.image as string | undefined)?.trim() && !(seo.imageAlt as string | undefined)?.trim()) problems.push("The default sharing picture needs a description (alt text).");
  return problems;
}

/** Only set values, trimmed; undefined when nothing is set (so the site file stays as it was). */
export function cleanSiteSeo(seo: SiteSeo | undefined | null): SiteSeo | undefined {
  if (!seo) return undefined;
  const out: SiteSeo = {};
  if (seo.description?.trim()) out.description = seo.description.trim();
  if (seo.image?.trim()) out.image = seo.image.trim();
  if (seo.image?.trim() && seo.imageAlt?.trim()) out.imageAlt = seo.imageAlt.trim();
  return Object.keys(out).length ? out : undefined;
}

/**
 * Links between pages inside the block tree (F018). No React here: the
 * admin's server code imports this to update links when a page is renamed.
 */
import type { Data } from "@puckeditor/core";
import { mapRichLinks } from "./rich-text";

/** Which prop holds a page link, per block type. */
export const LINK_PROPS: Record<string, string> = { Button: "href", Card: "linkHref", ImageOverlay: "linkHref", Icon: "href" };

/** Blocks whose rich text can hold links (F042): block type → text prop. */
export const RICH_TEXT_PROPS: Record<string, string> = { Text: "text" };

/** Lists of items with a link in each (F032): block type → [list prop, link prop]. */
export const ITEM_LINK_PROPS: Record<string, [string, string]> = { Grid: ["items", "linkHref"], LogoRow: ["logos", "href"], Pricing: ["plans", "buttonHref"] };

/**
 * The new link if `href` points at the page `from` ("/about", "/about/",
 * "/about#team", "/about?x=1"), else null. Only same-site paths count;
 * full addresses (https://…) are left to the redirect.
 */
export function relinkHref(href: string, from: string, to: string): string | null {
  const link = href.trim();
  if (!link.startsWith("/") || link.startsWith("//")) return null;
  const cut = link.search(/[?#]/);
  const pathPart = cut === -1 ? link : link.slice(0, cut);
  const suffix = cut === -1 ? "" : link.slice(cut);
  const trailingSlash = pathPart.length > 1 && pathPart.endsWith("/");
  const path = trailingSlash ? pathPart.slice(0, -1) : pathPart;
  if (path !== from) return null;
  return `${to}${trailingSlash && to !== "/" ? "/" : ""}${suffix}`;
}

type Block = { type: string; props: Record<string, unknown> };
const isBlock = (v: unknown): v is Block =>
  typeof v === "object" && v !== null && typeof (v as Block).type === "string" && typeof (v as Block).props === "object" && (v as Block).props !== null;

function walk(blocks: unknown, from: string, to: string, counter: { n: number }): unknown {
  if (!Array.isArray(blocks)) return blocks;
  return blocks.map((b) => {
    if (!isBlock(b)) return b;
    const props: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(b.props)) {
      if (key === LINK_PROPS[b.type] && typeof value === "string") {
        const next = relinkHref(value, from, to);
        if (next !== null) {
          counter.n++;
          props[key] = next;
          continue;
        }
      }
      if (key === RICH_TEXT_PROPS[b.type]) {
        const next = mapRichLinks(value, (href) => relinkHref(href, from, to));
        counter.n += next.count;
        props[key] = next.value;
        continue;
      }
      const items = ITEM_LINK_PROPS[b.type];
      if (items && key === items[0] && Array.isArray(value)) {
        props[key] = value.map((item: unknown) => {
          const href = (item as Record<string, unknown> | null)?.[items[1]];
          if (typeof href !== "string") return item;
          const next = relinkHref(href, from, to);
          if (next === null) return item;
          counter.n++;
          return { ...(item as object), [items[1]]: next };
        });
        continue;
      }
      // Slots (Section content, Columns) hold more blocks.
      props[key] = Array.isArray(value) ? walk(value, from, to, counter) : value;
    }
    return { ...b, props };
  });
}

/** The page's blocks with links to `from` pointing at `to`, and how many changed. */
export function relinkPage(puck: Data, from: string, to: string): { puck: Data; count: number } {
  const counter = { n: 0 };
  const content = walk(puck.content, from, to, counter) as Data["content"];
  let zones = puck.zones;
  if (zones) zones = Object.fromEntries(Object.entries(zones).map(([k, v]) => [k, walk(v, from, to, counter)])) as Data["zones"];
  if (counter.n === 0) return { puck, count: 0 };
  return { puck: { ...puck, content, ...(zones ? { zones } : {}) }, count: counter.n };
}

/** How many links in a page point at `path`. */
export const countLinks = (puck: Data, path: string) => relinkPage(puck, path, path).count;

type Link = { label?: unknown; href?: unknown };
const relinkList = (list: unknown, from: string, to: string, counter: { n: number }): unknown =>
  Array.isArray(list)
    ? list.map((link: Link) => {
        if (typeof link?.href !== "string") return link;
        const next = relinkHref(link.href, from, to);
        if (next === null) return link;
        counter.n++;
        return { ...link, href: next };
      })
    : list;

/**
 * F069: the site header's menu and button and the footer's link columns
 * (site.json, F031) with links to `from` pointing at `to`. Only what
 * site.json spells out: a menu made from the pages follows by itself.
 * Unknown fields are kept as they are.
 */
export function relinkChrome<S extends { header?: unknown; footer?: unknown }>(site: S, from: string, to: string): { site: S; count: number } {
  const counter = { n: 0 };
  const header = site.header as { menu?: unknown; cta?: Link } | undefined;
  const footer = site.footer as { columns?: unknown } | undefined;
  let nextHeader = header;
  if (header && typeof header === "object") {
    const menu = relinkList(header.menu, from, to, counter);
    const cta = relinkList(header.cta ? [header.cta] : [], from, to, counter) as Link[];
    nextHeader = { ...header, ...(header.menu !== undefined ? { menu } : {}), ...(header.cta ? { cta: cta[0] } : {}) };
  }
  let nextFooter = footer;
  if (footer && typeof footer === "object" && Array.isArray(footer.columns)) {
    const columns = footer.columns.map((c: { links?: unknown } | null) => (c && typeof c === "object" ? { ...c, links: relinkList(c.links, from, to, counter) } : c));
    nextFooter = { ...footer, columns };
  }
  if (counter.n === 0) return { site, count: 0 };
  return { site: { ...site, ...(nextHeader ? { header: nextHeader } : {}), ...(nextFooter ? { footer: nextFooter } : {}) }, count: counter.n };
}

/** How many header and footer links point at `path`. */
export const countChromeLinks = (site: { header?: unknown; footer?: unknown }, path: string) => relinkChrome(site, path, path).count;

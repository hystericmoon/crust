/**
 * Links between pages inside the block tree (F018). No React here: the
 * admin's server code imports this to update links when a page is renamed.
 */
import type { Data } from "@puckeditor/core";

/** Which prop holds a page link, per block type. */
export const LINK_PROPS: Record<string, string> = { Button: "href", Card: "linkHref" };

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

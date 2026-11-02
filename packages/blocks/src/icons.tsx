/**
 * Icons (F077, direction A of https://claude.ai/artifact/8o1uPhHmTBd9hgkzmx1pU2):
 * a curated set of Lucide icons in six categories, found by meaning, and
 * Tabler's social network icons. Icons are drawn into the page as SVG in
 * the text colour; no icon font, nothing extra to download.
 *
 * Icons next to words are decoration (hidden from screen readers). An icon
 * that stands alone or is a link needs a name: see `iconA11y`.
 */
import { iconData, socialIconData } from "./icons-data";

export const iconCategories = ["contact", "places", "food", "services", "shapes", "arrows"] as const;
export type IconCategory = (typeof iconCategories)[number];
export const iconCategoryNames: Record<IconCategory, string> = {
  contact: "Contact",
  places: "Places & time",
  food: "Food & drink",
  services: "Services",
  shapes: "Shapes & marks",
  arrows: "Arrows",
};

/** Every icon's name, in the curated order (by category). */
export const iconNames: readonly string[] = Object.keys(iconData);

export const isIconName = (name: unknown): name is string => typeof name === "string" && Object.prototype.hasOwnProperty.call(iconData, name);

/** "map-pin" → "Map pin": the name shown and read out in the picker. */
export function iconLabel(name: string): string {
  const words = name.replace(/-\d+$/, "").replace(/-/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export const iconCategoryOf = (name: string): IconCategory | null => (isIconName(name) ? (iconData[name]!.category as IconCategory) : null);

/**
 * Icons matching a search, best first: the icon's own name, then the words
 * it's known by ("food" finds utensils, coffee and pizza). Every word typed
 * must match the start of a name part or a known word. Empty search: all
 * icons of the category (or all).
 */
export function searchIcons(query: string, category: IconCategory | "all" = "all"): string[] {
  const inCategory = iconNames.filter((n) => category === "all" || iconData[n]!.category === category);
  const terms = query.toLowerCase().split(/[\s,]+/).filter(Boolean);
  if (!terms.length) return inCategory;
  const scored: [string, number][] = [];
  for (const name of inCategory) {
    const parts = name.split("-");
    const words = iconData[name]!.words.flatMap((w) => w.split(/\s+/));
    let score = 0;
    let all = true;
    for (const t of terms) {
      if (name === t || parts.includes(t)) score += 3;
      else if (parts.some((p) => p.startsWith(t))) score += 2;
      else if (words.some((w) => w.startsWith(t))) score += 1;
      else {
        all = false;
        break;
      }
    }
    if (all) scored.push([name, score]);
  }
  return scored.sort((a, b) => b[1] - a[1]).map(([n]) => n);
}

type SvgProps = { name: string; className?: string; size?: number };

/** An icon from the set; nothing for an unknown name. Always decoration: names go on what holds it. */
export function IconSvg({ name, className = "cr-svg", size = 24 }: SvgProps) {
  if (!isIconName(name)) return null;
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      dangerouslySetInnerHTML={{ __html: iconData[name]!.svg }}
    />
  );
}

// --- Social networks ------------------------------------------------------------

export const socialNetworks = [
  "instagram",
  "facebook",
  "linkedin",
  "youtube",
  "x",
  "tiktok",
  "pinterest",
  "threads",
  "bluesky",
  "mastodon",
  "whatsapp",
  "github",
  "dribbble",
  "behance",
  "spotify",
  "vimeo",
] as const;
export type SocialNetwork = (typeof socialNetworks)[number];

export const socialNetworkNames: Record<SocialNetwork, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  linkedin: "LinkedIn",
  youtube: "YouTube",
  x: "X",
  tiktok: "TikTok",
  pinterest: "Pinterest",
  threads: "Threads",
  bluesky: "Bluesky",
  mastodon: "Mastodon",
  whatsapp: "WhatsApp",
  github: "GitHub",
  dribbble: "Dribbble",
  behance: "Behance",
  spotify: "Spotify",
  vimeo: "Vimeo",
};

/** The sites each network lives on (www., m. and similar are ignored). */
const networkHosts: Record<SocialNetwork, string[]> = {
  instagram: ["instagram.com", "instagr.am"],
  facebook: ["facebook.com", "fb.com", "fb.me"],
  linkedin: ["linkedin.com", "lnkd.in"],
  youtube: ["youtube.com", "youtu.be"],
  x: ["x.com", "twitter.com"],
  tiktok: ["tiktok.com"],
  pinterest: ["pinterest.com", "pin.it"],
  threads: ["threads.net", "threads.com"],
  bluesky: ["bsky.app"],
  mastodon: ["mastodon.social", "mastodon.online", "mstdn.social"],
  whatsapp: ["wa.me", "whatsapp.com"],
  github: ["github.com"],
  dribbble: ["dribbble.com"],
  behance: ["behance.net"],
  spotify: ["spotify.com"],
  vimeo: ["vimeo.com"],
};

export interface SocialLink {
  /** The network, or null for a site Crust doesn't know (shown with a globe). */
  network: SocialNetwork | null;
  /** "Instagram", or the site's address for an unknown one ("example.com"). */
  name: string;
}

/**
 * Which network a profile address belongs to, from its host. Only https://
 * addresses count. Mastodon servers have many names, so any address whose
 * path starts with "/@" (https://example.social/@atelier) is Mastodon
 * unless the host is a known network (Threads and TikTok use "/@" too).
 */
export function socialLinkOf(href: string): SocialLink | null {
  let url: URL;
  try {
    url = new URL(href.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  const host = url.hostname.toLowerCase().replace(/^(www|m|mobile|web)\./, "");
  for (const network of socialNetworks) {
    if (networkHosts[network].some((h) => host === h || host.endsWith(`.${h}`))) return { network, name: socialNetworkNames[network] };
  }
  if (url.pathname.startsWith("/@")) return { network: "mastodon", name: socialNetworkNames.mastodon };
  return { network: null, name: host };
}

/** "Atelier on Instagram", or just "Instagram" when no owner name is set. */
export function socialLabel(link: SocialLink, who: string): string {
  const owner = who.trim();
  return owner ? `${owner} on ${link.name}` : link.name;
}

/** A network's icon (a globe for unknown sites). Decoration: the link carries the name. */
export function SocialSvg({ network, className = "cr-svg", size = 24 }: { network: SocialNetwork | null; className?: string; size?: number }) {
  if (!network) return <IconSvg name="globe" className={className} size={size} />;
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      dangerouslySetInnerHTML={{ __html: socialIconData[network] ?? "" }}
    />
  );
}

// --- Names for screen readers ------------------------------------------------------

/**
 * How an icon on its own is announced. With a link it's the link's name
 * (required: an unnamed link is announced as just "link"); with a name and
 * no link it's an image; with neither it's decoration and hidden.
 */
export function iconA11y(label: string, href: string): { kind: "link" | "image" | "decoration"; name: string; missingName: boolean } {
  const name = label.trim();
  if (href.trim()) return { kind: "link", name, missingName: !name };
  return { kind: name ? "image" : "decoration", name, missingName: false };
}

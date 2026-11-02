/**
 * F080: sample photos for the layout library. Public domain (CC0) photos
 * from Crust's own templates (scripts/starter-templates/photos/CREDITS.md),
 * resized, plus five made-up logos drawn for Crust. The builder serves them
 * at /layout-photos/<file>; inserting a layout copies the ones it uses into
 * the site's Media library and points the blocks at /media/<file>, marked
 * "to replace" (F046), so a sample photo never goes live by accident.
 */
export const LAYOUT_PHOTO_PREFIX = "/layout-photos/";

export interface LayoutPhoto {
  file: string;
  alt: string;
  width: number;
  height: number;
}

const wide = (file: string, alt: string, height = 1000): LayoutPhoto => ({ file, alt, width: 1600, height });
const tall = (file: string, alt: string): LayoutPhoto => ({ file, alt, width: 1080, height: 1350 });

export const layoutPhotos = {
  terraces: wide("sample-terraces.jpg", "White concrete terraces and an open stair under a blue sky, one small figure on the walkway", 1067),
  balconies: tall("sample-balconies.jpg", "White apartment tower with curving balconies, seen from below"),
  angles: wide("sample-angles.jpg", "White angled ceiling beams receding into daylight"),
  spiral: wide("sample-wood-spiral.jpg", "Wooden spiral staircase seen from above"),
  office: wide("sample-home-office.jpg", "Bright white studio with a desk, a lamp, a plant and a leather chair", 1066),
  shadows: wide("sample-shadows.jpg", "Shadow of a window frame and plants on a linen curtain", 1033),
  tree: wide("sample-window-tree.jpg", "Young tree in front of a white wall with a tall window"),
  pool: wide("sample-pool-house.jpg", "Terrace of a modern house with an infinity pool above a wooded valley"),
  pottery: wide("sample-pottery-wheel.jpg", "Hands shaping wet clay on a turning pottery wheel, seen from above", 1067),
  tools: wide("sample-tool-wall.jpg", "A workshop wall of chisels, saws and hand planes in neat rows", 1067),
  bottles: wide("sample-ceramic-bottles.jpg", "Rows of glazed ceramic bottles in sage green and pale blue", 1067),
  breakfast: wide("sample-moka-breakfast.jpg", "A moka pot, croissants and a bag of coffee on a wooden table, seen from above", 1067),
  lounge: wide("sample-studio-lounge.jpg", "A person at a window bar in a studio lounge with a red floor and leather chairs"),
  atrium: tall("sample-atrium.jpg", "A long vaulted atrium of steel and glass with one person walking through it"),
  stair: wide("sample-copper-stair.jpg", "A man in silhouette on a curving copper-coloured staircase beside tall windows"),
} satisfies Record<string, LayoutPhoto>;
export type LayoutPhotoId = keyof typeof layoutPhotos;

/** Made-up company logos, for logo rows. */
export const layoutLogos: LayoutPhoto[] = [
  { file: "sample-logo-northfield.png", alt: "Northfield", width: 405, height: 79 },
  { file: "sample-logo-lumen.png", alt: "Lumen & Co", width: 684, height: 82 },
  { file: "sample-logo-atlas.png", alt: "Atlas", width: 220, height: 84 },
  { file: "sample-logo-kestrel.png", alt: "Kestrel", width: 270, height: 78 },
  { file: "sample-logo-orbit.png", alt: "Orbit", width: 315, height: 82 },
];

const all = [...Object.values(layoutPhotos), ...layoutLogos];

/** The address a layout uses for a sample photo. */
export const layoutPhotoSrc = (p: LayoutPhoto) => `${LAYOUT_PHOTO_PREFIX}${p.file}`;

/** The sample photo an address points to, or undefined. */
export function layoutPhotoOf(src: unknown): LayoutPhoto | undefined {
  if (typeof src !== "string" || !src.startsWith(LAYOUT_PHOTO_PREFIX)) return undefined;
  const file = src.slice(LAYOUT_PHOTO_PREFIX.length);
  return all.find((p) => p.file === file);
}

/** Every sample photo address used anywhere in a value (blocks, props, lists), once each. */
export function layoutPhotoSrcs(value: unknown): string[] {
  const found = new Set<string>();
  const walk = (v: unknown) => {
    if (typeof v === "string") {
      if (v.startsWith(LAYOUT_PHOTO_PREFIX)) found.add(v);
    } else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") Object.values(v).forEach(walk);
  };
  walk(value);
  return [...found];
}

/** A copy of a value with every sample photo address swapped by `map` (addresses not in it stay). */
export function swapLayoutPhotos<T>(value: T, map: ReadonlyMap<string, string>): T {
  const walk = (v: unknown): unknown => {
    if (typeof v === "string") return map.get(v) ?? v;
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)]));
    return v;
  };
  return walk(value) as T;
}

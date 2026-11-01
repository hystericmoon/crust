/**
 * The photos in the photo-led starter templates. All CC0, credited in
 * photos/CREDITS.md. The descriptions are real; every use is still marked
 * Replace me.
 */
export interface Photo {
  /** Under photos/; the template file only keeps the base name, so names are unique across templates. */
  path: string;
  file: string;
  alt: string;
  width: number;
  height: number;
}

/**
 * Harbour's photos (F052): CC0, credited in photos/CREDITS.md. The
 * descriptions are real; every use is still marked Replace me.
 */
export const harbourPhotos: Photo[] = ([
  { file: "terraces.jpg", alt: "White concrete terraces and an open stair under a blue sky, one small figure on the walkway", width: 1920, height: 1280 },
  { file: "balconies.jpg", alt: "White apartment tower with curving balconies, seen from below", width: 1280, height: 1600 },
  { file: "angles.jpg", alt: "White angled ceiling beams receding into daylight", width: 1920, height: 1200 },
  { file: "wood-spiral.jpg", alt: "Wooden spiral staircase seen from above", width: 1920, height: 1200 },
  { file: "white-stair.jpg", alt: "A thin stair climbing a tall white ribbed wall", width: 1280, height: 1600 },
  { file: "pool-house.jpg", alt: "Terrace of a modern house with an infinity pool above a wooded valley", width: 1920, height: 1200 },
  { file: "window-tree.jpg", alt: "Young tree in front of a white wall with a tall window", width: 1920, height: 1200 },
  { file: "grid.jpg", alt: "White grid facade against a blue sky", width: 1920, height: 1200 },
  { file: "home-office.jpg", alt: "Bright white studio with a desk, a lamp, a plant and a leather chair", width: 1920, height: 1279 },
  { file: "shadows.jpg", alt: "Shadow of a window frame and plants on a linen curtain", width: 1600, height: 1033 },
] as Omit<Photo, "path">[]).map((p) => ({ ...p, path: p.file }));

const inDir = (dir: string, list: Omit<Photo, "path">[]): Photo[] => list.map((p) => ({ ...p, path: `${dir}/${p.file}` }));
const WIDE = { width: 1920, height: 1200 };
const HERO = { width: 1920, height: 1280 };
const TALL = { width: 1280, height: 1600 };

/** Signal's photos (F053): night, stage light and hard architecture. */
export const signalPhotos: Photo[] = inDir("signal", [
  { file: "stage-crowd.jpg", alt: "A crowd with raised hands in front of a stage lit in amber, beams of light above", ...HERO },
  { file: "copper-stair.jpg", alt: "A man in silhouette on a curving copper-coloured staircase beside tall windows", ...WIDE },
  { file: "stair-lights.jpg", alt: "A dark concrete stairwell rising towards bars of white light", ...WIDE },
  { file: "guitarist.jpg", alt: "A guitarist in silhouette leaping on a smoky stage in warm light", ...WIDE },
  { file: "red-stage.jpg", alt: "Hands raised in a crowd against a red stage glow", ...WIDE },
  { file: "concrete-tower.jpg", alt: "A concrete tower seen straight up from below, in black and white", ...TALL },
  { file: "atrium.jpg", alt: "A long vaulted atrium of steel and glass with one person walking through it", ...TALL },
  { file: "studio-lounge.jpg", alt: "A person at a window bar in a studio lounge with a red floor and leather chairs", ...WIDE },
  { file: "dark-desk.jpg", alt: "A computer on a desk in a dark room, a window behind it", ...WIDE },
  { file: "spiral-amber.jpg", alt: "A spiral staircase seen from above in amber light", ...WIDE },
]);

/** Corner's photos (F053): bread, coffee, flowers and hands at work. */
export const cornerPhotos: Photo[] = inDir("corner", [
  { file: "bread-hands.jpg", alt: "Two hands holding a round loaf of bread in a linen cloth", width: 1280, height: 1280 },
  { file: "moka-breakfast.jpg", alt: "A moka pot, croissants and a bag of coffee on a wooden table, seen from above", ...HERO },
  { file: "loaves.jpg", alt: "Dark-crusted sourdough loaves beside a vase of yellow flowers", ...HERO },
  { file: "pottery-wheel.jpg", alt: "Hands shaping a clay bowl on a turning pottery wheel, seen from above", ...HERO },
  { file: "tool-wall.jpg", alt: "A workshop wall of chisels, saws and hand planes in neat rows", ...HERO },
  { file: "pouring-coffee.jpg", alt: "Coffee poured from a small jug into a white cup on a worn wooden counter", ...TALL },
  { file: "carnations.jpg", alt: "Pink and orange carnations wrapped in brown paper on white linen", ...TALL },
  { file: "ceramic-bottles.jpg", alt: "Rows of glazed ceramic bottles in sage green and pale blue", ...HERO },
  { file: "flower-shop.jpg", alt: "A small flower shop front with buckets of flowers and wooden crates on the pavement", ...HERO },
  { file: "lemon-loaf.jpg", alt: "An iced lemon and lavender loaf on a cooling rack, with lemons beside it", ...HERO },
  { file: "moka-pour.jpg", alt: "Coffee pouring from a moka pot into a blue-striped cup", ...HERO },
]);

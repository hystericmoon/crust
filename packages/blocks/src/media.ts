/**
 * Media library (F034). Uploaded photos live in content/media/<file>; their
 * details (alt text, size) in content/media.json. Pages refer to a photo by
 * its public address, "/media/<file>", so image fields still take any web
 * address as before.
 *
 * Deep-importable (no React) so the server functions can use it.
 */

/** One photo in content/media.json. */
export interface MediaItem {
  /** File name in content/media/, e.g. "harbour-at-dawn.jpg". Never changes. */
  file: string;
  /** The library's description of the photo; filled into alt fields when it's picked. */
  alt: string;
  width: number;
  height: number;
  bytes: number;
  /** ISO date. */
  uploadedAt: string;
}

export const MEDIA_FOLDER = "content/media";
export const MEDIA_INDEX = "content/media.json";
/** Public address prefix of an uploaded photo. */
export const MEDIA_PREFIX = "/media/";

/** Photos are shrunk to this many pixels on the long side before upload. */
export const MAX_EDGE = 2400;
/** Widths of the resized copies made at publish time (only those smaller than the photo). */
export const VARIANT_WIDTHS = [480, 960, 1440] as const;

export const mediaLimits = {
  /** Before shrinking, in the browser. */
  pickBytes: 20 * 1024 * 1024,
  /** After shrinking, what the server accepts. */
  uploadBytes: 8 * 1024 * 1024,
  alt: 250,
  photos: 2000,
};

export const mediaTypes = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
} as const;
export type MediaExt = keyof typeof mediaTypes;

const FILE = /^[a-z0-9][a-z0-9-]{0,79}\.(jpg|png|webp)$/;
export const isMediaFile = (file: unknown): file is string => typeof file === "string" && FILE.test(file);

/** "/media/harbour.jpg" → "harbour.jpg"; null for any other address. */
export function mediaFileOf(src: string | undefined | null): string | null {
  const s = (src ?? "").trim();
  if (!s.startsWith(MEDIA_PREFIX)) return null;
  const file = s.slice(MEDIA_PREFIX.length);
  return isMediaFile(file) ? file : null;
}

export const mediaSrc = (file: string) => `${MEDIA_PREFIX}${file}`;

/** "harbour.jpg", 480 → "harbour-480w.jpg" (the publish step makes these). */
export function variantFile(file: string, width: number): string {
  const dot = file.lastIndexOf(".");
  return `${file.slice(0, dot)}-${width}w${file.slice(dot)}`;
}

/** The resized copies a photo of this width gets, smallest first. */
export const variantWidths = (width: number): number[] => VARIANT_WIDTHS.filter((w) => w < width);

/** "IMG_2041 (1).JPG" → "img-2041-1", free among `taken` file names ("img-2041-1-2.jpg"). */
export function mediaFileFor(name: string, ext: MediaExt, taken: Iterable<string>): string {
  const base =
    name
      .replace(/\.[a-z0-9]+$/i, "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60)
      .replace(/-+$/, "")
      // Names ending like a resized copy ("-480w") would clash with one.
      .replace(/-\d+w$/, (m) => m.replace("w", "")) || "photo";
  const used = new Set(taken);
  if (!used.has(`${base}.${ext}`)) return `${base}.${ext}`;
  let n = 2;
  while (used.has(`${base}-${n}.${ext}`)) n++;
  return `${base}-${n}.${ext}`;
}

/** Width and height that fit within `max` on the long side, never enlarged. */
export function fitWithin(width: number, height: number, max = MAX_EDGE): { width: number; height: number } {
  const long = Math.max(width, height);
  if (long <= max) return { width, height };
  const scale = max / long;
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

/**
 * Reads the type and pixel size from the first bytes of a JPEG, PNG or WebP
 * file; null for anything else. The server uses it so media.json never
 * trusts the browser about what a file is.
 */
export function sniffImage(bytes: Uint8Array): { ext: MediaExt; width: number; height: number } | null {
  const b = bytes;
  const u16be = (i: number) => (b[i]! << 8) | b[i + 1]!;
  const u16le = (i: number) => b[i]! | (b[i + 1]! << 8);
  const u24le = (i: number) => b[i]! | (b[i + 1]! << 8) | (b[i + 2]! << 16);
  const u32be = (i: number) => ((b[i]! << 24) >>> 0) + ((b[i + 1]! << 16) | (b[i + 2]! << 8) | b[i + 3]!);
  const ok = (r: { ext: MediaExt; width: number; height: number }) => (r.width > 0 && r.height > 0 ? r : null);

  if (b.length >= 24 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[12] === 0x49 && b[13] === 0x48 && b[14] === 0x44 && b[15] === 0x52) {
    return ok({ ext: "png", width: u32be(16), height: u32be(20) });
  }
  if (b.length >= 4 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) {
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) return null;
      const marker = b[i + 1]!;
      if (marker === 0xff) {
        i++;
        continue;
      }
      // Start-of-frame markers (not DHT C4, JPG C8, DAC CC) carry the size.
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return ok({ ext: "jpg", width: u16be(i + 7), height: u16be(i + 5) });
      }
      if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) {
        i += 2;
        continue;
      }
      i += 2 + u16be(i + 2);
    }
    return null;
  }
  const ascii = (i: number, s: string) => [...s].every((c, k) => b[i + k] === c.charCodeAt(0));
  if (b.length >= 30 && ascii(0, "RIFF") && ascii(8, "WEBP")) {
    if (ascii(12, "VP8 ")) return ok({ ext: "webp", width: u16le(26) & 0x3fff, height: u16le(28) & 0x3fff });
    if (ascii(12, "VP8L") && b[20] === 0x2f) {
      const bits = b[21]! | (b[22]! << 8) | (b[23]! << 16) | (b[24]! << 24);
      return ok({ ext: "webp", width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 });
    }
    if (ascii(12, "VP8X")) return ok({ ext: "webp", width: u24le(24) + 1, height: u24le(27) + 1 });
  }
  return null;
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** Reads content/media.json; anything unreadable is left out. */
export function parseMediaIndex(text: string | null | undefined): MediaItem[] {
  if (!text) return [];
  try {
    const list = JSON.parse(text) as unknown;
    if (!Array.isArray(list)) return [];
    const seen = new Set<string>();
    return list.flatMap((m): MediaItem[] => {
      if (!isObject(m) || !isMediaFile(m.file) || seen.has(m.file)) return [];
      const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v > 0 ? Math.round(v) : 0);
      if (!n(m.width) || !n(m.height)) return [];
      seen.add(m.file);
      return [
        {
          file: m.file,
          alt: typeof m.alt === "string" ? m.alt.slice(0, mediaLimits.alt) : "",
          width: n(m.width),
          height: n(m.height),
          bytes: n(m.bytes),
          uploadedAt: typeof m.uploadedAt === "string" ? m.uploadedAt : "",
        },
      ];
    });
  } catch {
    return [];
  }
}

/** Every "/media/<file>" a page or site file refers to (any field, any depth). */
export function mediaUsedIn(value: unknown, found = new Set<string>()): Set<string> {
  if (typeof value === "string") {
    const file = mediaFileOf(value);
    if (file) found.add(file);
  } else if (Array.isArray(value)) {
    for (const v of value) mediaUsedIn(v, found);
  } else if (isObject(value)) {
    for (const v of Object.values(value)) mediaUsedIn(v, found);
  }
  return found;
}

/** "1.2 MB", "640 KB". */
export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

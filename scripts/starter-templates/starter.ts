/**
 * The starter templates: Harbour, Signal and Corner. First made in F049–F053;
 * rebuilt in F084 on the Milestone 8 layer (Style library looks, bundled
 * fonts, display headings and labels, sections v2, the new blocks, post /
 * blog / 404 designs, header and footer v2) with full-length pages and
 * finished copy for a made-up business each. Snapshot:
 * design/f084-starter-rebuild-v1.html.
 *
 * Photos are the owner's picks (F052/F053, CC0, credited in
 * photos/CREDITS.md). Every made-up word, figure, price and photo is marked
 * "to replace" (F046), so a buyer can't publish it by accident.
 *
 * `npm run build:starters` writes templates/<id>.crust from this file; the
 * starter-template test fails if a committed file is out of date.
 */
import { applyLook, defaultTokens, findLook, makeTemplate, type SiteTokens, type Template, type TemplateSource } from "@crust/blocks";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { cornerParts } from "./corner";
import { harbourParts } from "./harbour";
import type { StarterParts } from "./parts";
import { cornerPhotos, harbourPhotos, signalLogos, signalPhotos, type Photo } from "./photo-sets";
import { signalParts } from "./signal";
import { toBase64 } from "./standins";

export interface StarterSpec {
  /** File name: templates/<id>.crust */
  id: string;
  name: string;
  description: string;
  siteName: string;
  /** The Style library look (F072) and colour variation the template uses. */
  look: { id: string; variation: string };
  motion: "off" | "subtle" | "lively";
  photos: Photo[];
  parts: StarterParts;
}

/** A Style library look applied to the default tokens, with the template's motion. */
export function lookTokens(s: Pick<StarterSpec, "look" | "motion">): SiteTokens {
  const look = findLook(s.look.id);
  const variation = look?.variations.find((v) => v.id === s.look.variation);
  if (!look || !variation) throw new Error(`No look ${s.look.id} · ${s.look.variation}`);
  const tokens = applyLook(defaultTokens, look, variation);
  return { ...tokens, style: { ...tokens.style!, motion: s.motion } };
}

export const harbour: StarterSpec = {
  id: "harbour",
  name: "Harbour",
  description: "Calm and editorial, for architects, interior designers and studios: a photo opening, a project slider, prices and a journal. Fraunces on warm stone, deep green.",
  siteName: "Harbour Studio",
  look: { id: "atelier", variation: "stone" },
  motion: "subtle",
  photos: harbourPhotos,
  parts: harbourParts,
};

export const signal: StarterSpec = {
  id: "signal",
  name: "Signal",
  description: "Dark and confident, for agencies, product studios and events: a stage photo, client logos, named work tiles, services as tabs and fixed prices. Geist with mono labels and one hot accent.",
  siteName: "Signal & Co",
  look: { id: "studio", variation: "signal" },
  motion: "lively",
  photos: [...signalPhotos, ...signalLogos],
  parts: signalParts,
};

export const corner: StarterSpec = {
  id: "corner",
  name: "Corner",
  description: "Warm and local, for bakeries, cafés, shops and makers: a menu with prices, workshops, opening hours and ordering ahead. Young Serif, navy on cream.",
  siteName: "Corner Workshop",
  look: { id: "bistro", variation: "cream" },
  motion: "subtle",
  photos: cornerPhotos,
  parts: cornerParts,
};

export const starters: StarterSpec[] = [harbour, signal, corner];

const photoDir = join(dirname(fileURLToPath(import.meta.url)), "photos");

/** The template's source, as the builder would collect it from a site. */
export function starterSource(s: StarterSpec): TemplateSource {
  return {
    site: { name: s.siteName, language: "en" },
    tokens: lookTokens(s),
    chrome: s.parts.chrome(),
    pages: s.parts.pages(),
    sections: s.parts.sections(),
    layouts: [],
    blog: s.parts.blog,
    posts: s.parts.posts(),
    designs: s.parts.designs(),
    media: s.photos.map(({ file, alt, width, height, focus }) => ({ file, alt, width, height, ...(focus ? { focus } : {}) })),
  };
}

/** The finished template. The date is fixed so a rebuilt file is identical. */
export async function buildStarter(s: StarterSpec): Promise<Template> {
  const { template, missing } = await makeTemplate({ name: s.name, description: s.description }, starterSource(s), async (file) => {
    const p = s.photos.find((x) => x.file === file);
    return p ? toBase64(await readFile(join(photoDir, p.path))) : null;
  }, new Date("2026-11-03T00:00:00Z"));
  if (missing.length) throw new Error(`Missing images: ${missing.join(", ")}`);
  return template;
}

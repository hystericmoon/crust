#!/usr/bin/env node
/**
 * Writes packages/blocks/src/icons-data.ts (F077): Crust's curated icons.
 *
 * Everyday icons come from Lucide (lucide-static, ISC); social networks
 * from Tabler Icons (@tabler/icons, MIT), because Lucide dropped brand
 * logos in version 1. Both are downloaded with `npm pack` into a temp
 * folder, so nothing is added to package.json and pages never load an
 * icon font: each icon's SVG is drawn into the page.
 *
 * Run: node scripts/sync-icons.mjs   (then commit icons-data.ts)
 * To add an icon: add a line to CURATED below and run it again.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const LUCIDE = "lucide-static@1.66.0";
const TABLER = "@tabler/icons@3.50.0";
const OUT = new URL("../packages/blocks/src/icons-data.ts", import.meta.url);

/** [Lucide name, category, extra search words]. Categories are in icons.ts. */
const CURATED = [
  // Contact
  ["phone", "contact", "call telephone number"],
  ["phone-call", "contact", "call ring"],
  ["smartphone", "contact", "mobile app"],
  ["mail", "contact", "email envelope letter"],
  ["send", "contact", "message submit"],
  ["message-circle", "contact", "chat talk whatsapp"],
  ["message-square", "contact", "chat comment"],
  ["at-sign", "contact", "email address"],
  ["globe", "contact", "website web world language"],
  ["link", "contact", "url web"],
  ["contact", "contact", "card person address book"],
  ["headphones", "contact", "support help desk"],
  ["mic", "contact", "podcast speak"],
  ["users", "contact", "team people group"],
  ["user", "contact", "person profile account"],
  ["handshake", "contact", "deal partner agreement"],
  // Places and time
  ["map-pin", "places", "location address where"],
  ["map", "places", "directions area"],
  ["navigation", "places", "directions route"],
  ["compass", "places", "explore direction"],
  ["house", "places", "home"],
  ["building", "places", "office"],
  ["building-2", "places", "office company"],
  ["store", "places", "shop retail"],
  ["hotel", "places", "stay rooms"],
  ["landmark", "places", "museum bank"],
  ["car", "places", "drive parking"],
  ["bus", "places", "transport"],
  ["train-front", "places", "rail transport"],
  ["plane", "places", "flight travel"],
  ["bike", "places", "cycle bicycle"],
  ["ship", "places", "boat ferry"],
  ["tent", "places", "camping outdoor"],
  ["trees", "places", "park nature garden"],
  ["waves", "places", "sea beach water pool"],
  ["clock", "places", "time hours opening"],
  ["calendar", "places", "date event schedule booking"],
  ["calendar-check", "places", "booking reservation appointment"],
  ["timer", "places", "time duration fast"],
  ["hourglass", "places", "time waiting"],
  ["sun", "places", "day weather summer"],
  ["moon", "places", "night evening late"],
  // Food and drink
  ["utensils", "food", "food restaurant meal eat cutlery"],
  ["utensils-crossed", "food", "food restaurant menu"],
  ["chef-hat", "food", "food cook kitchen"],
  ["coffee", "food", "food drink cafe tea"],
  ["cup-soda", "food", "food drink"],
  ["wine", "food", "food drink bar"],
  ["beer", "food", "food drink bar pub"],
  ["pizza", "food", "food"],
  ["sandwich", "food", "food lunch"],
  ["croissant", "food", "food bakery breakfast bread"],
  ["wheat", "food", "food bread bakery grain"],
  ["cake", "food", "food dessert birthday"],
  ["cookie", "food", "food sweet"],
  ["ice-cream-cone", "food", "food dessert"],
  ["salad", "food", "food healthy vegetarian"],
  ["soup", "food", "food bowl"],
  ["fish", "food", "food seafood"],
  ["beef", "food", "food meat"],
  ["egg", "food", "food breakfast"],
  ["apple", "food", "food fruit healthy"],
  ["carrot", "food", "food vegetable"],
  ["leaf", "food", "organic vegan green nature"],
  // Business and services
  ["briefcase", "services", "work business job"],
  ["shopping-bag", "services", "shop buy"],
  ["shopping-cart", "services", "shop buy basket"],
  ["credit-card", "services", "pay payment"],
  ["wallet", "services", "pay money price"],
  ["receipt", "services", "invoice bill"],
  ["tag", "services", "price label sale"],
  ["gift", "services", "present voucher"],
  ["package", "services", "box parcel shipping"],
  ["truck", "services", "delivery shipping transport"],
  ["scissors", "services", "hair salon cut craft"],
  ["wrench", "services", "repair fix tools"],
  ["hammer", "services", "build repair"],
  ["paintbrush", "services", "paint decorate art"],
  ["palette", "services", "art design colour"],
  ["camera", "services", "photo photography"],
  ["video", "services", "film movie"],
  ["music", "services", "song audio"],
  ["book-open", "services", "read learn guide"],
  ["graduation-cap", "services", "school learn course education"],
  ["stethoscope", "services", "doctor health medical"],
  ["heart-pulse", "services", "health care"],
  ["pill", "services", "pharmacy medicine"],
  ["baby", "services", "child family"],
  ["paw-print", "services", "pet animal dog cat"],
  ["dumbbell", "services", "gym fitness sport"],
  ["shirt", "services", "clothes fashion"],
  ["flower-2", "services", "florist garden flower"],
  ["bed", "services", "sleep room stay"],
  ["wifi", "services", "internet"],
  ["laptop", "services", "computer work online"],
  ["code", "services", "developer software"],
  ["chart-line", "services", "growth results graph"],
  ["lightbulb", "services", "idea tip"],
  ["rocket", "services", "launch fast start"],
  ["target", "services", "goal aim"],
  ["file-text", "services", "document page"],
  ["clipboard-list", "services", "checklist plan"],
  ["lock", "services", "secure private"],
  ["shield-check", "services", "safe secure trust guarantee"],
  ["key", "services", "access rent"],
  ["award", "services", "prize quality"],
  ["trophy", "services", "win prize"],
  ["badge-check", "services", "verified quality certified"],
  // Shapes and marks
  ["check", "shapes", "tick done yes"],
  ["circle-check", "shapes", "tick done yes"],
  ["check-check", "shapes", "done double"],
  ["x", "shapes", "close no cross"],
  ["plus", "shapes", "add more"],
  ["minus", "shapes", "remove less"],
  ["info", "shapes", "information about"],
  ["circle-help", "shapes", "question help faq"],
  ["triangle-alert", "shapes", "warning caution"],
  ["star", "shapes", "rating favourite review"],
  ["heart", "shapes", "love like favourite"],
  ["thumbs-up", "shapes", "like good"],
  ["smile", "shapes", "happy face"],
  ["quote", "shapes", "testimonial review"],
  ["sparkles", "shapes", "new magic clean"],
  ["zap", "shapes", "fast energy power"],
  ["flame", "shapes", "hot popular fire"],
  ["droplet", "shapes", "water"],
  ["recycle", "shapes", "eco sustainable green"],
  ["infinity", "shapes", "unlimited"],
  ["bell", "shapes", "notification alert"],
  ["bookmark", "shapes", "save"],
  ["flag", "shapes", "report goal"],
  ["circle", "shapes", "dot round"],
  ["square", "shapes", "box"],
  ["diamond", "shapes", "premium"],
  ["hexagon", "shapes", "shape"],
  // Arrows and actions
  ["arrow-right", "arrows", "next forward"],
  ["arrow-left", "arrows", "back previous"],
  ["arrow-up", "arrows", "top"],
  ["arrow-down", "arrows", "bottom"],
  ["arrow-up-right", "arrows", "external out"],
  ["chevron-right", "arrows", "next more"],
  ["chevron-down", "arrows", "more open"],
  ["move-right", "arrows", "long arrow next"],
  ["external-link", "arrows", "open new"],
  ["download", "arrows", "save get"],
  ["upload", "arrows", "send"],
  ["play", "arrows", "video start"],
  ["refresh-cw", "arrows", "repeat again"],
  ["search", "arrows", "find look"],
  ["eye", "arrows", "see view"],
  ["share-2", "arrows", "share social"],
];

/** Social networks: [id, Tabler file]. Names and addresses are in icons.ts. */
const SOCIAL = [
  ["instagram", "brand-instagram"],
  ["facebook", "brand-facebook"],
  ["linkedin", "brand-linkedin"],
  ["youtube", "brand-youtube"],
  ["x", "brand-x"],
  ["tiktok", "brand-tiktok"],
  ["pinterest", "brand-pinterest"],
  ["threads", "brand-threads"],
  ["bluesky", "brand-bluesky"],
  ["mastodon", "brand-mastodon"],
  ["whatsapp", "brand-whatsapp"],
  ["github", "brand-github"],
  ["dribbble", "brand-dribbble"],
  ["behance", "brand-behance"],
  ["spotify", "brand-spotify"],
  ["vimeo", "brand-vimeo"],
];

/** The drawing inside <svg>…</svg>, on one line, without Tabler's empty frame path. */
export function innerSvg(file) {
  const body = file.replace(/<!--[\s\S]*?-->/g, "").match(/<svg[^>]*>([\s\S]*)<\/svg>/)?.[1];
  if (!body) throw new Error("not an SVG");
  return body
    .replace(/<path stroke="none" d="M0 0h24v24H0z" fill="none"\s*\/>/g, "")
    .replace(/\s+/g, " ")
    .replace(/\s*\/>/g, "/>")
    .replace(/>\s+</g, "><")
    .trim();
}

function unpack(spec, dir) {
  const name = execFileSync("npm", ["pack", spec, "--silent", "--pack-destination", dir], { encoding: "utf8" }).trim().split("\n").pop();
  const target = join(dir, name.replace(/\.tgz$/, ""));
  execFileSync("mkdir", ["-p", target]);
  execFileSync("tar", ["-xzf", join(dir, name), "-C", target]);
  return join(target, "package");
}

function main() {
  const dir = mkdtempSync(join(tmpdir(), "crust-icons-"));
  try {
    const lucide = unpack(LUCIDE, dir);
    const tabler = unpack(TABLER, dir);
    const tags = JSON.parse(readFileSync(join(lucide, "tags.json"), "utf8"));
    const seen = new Set();
    const icons = CURATED.map(([name, category, extra]) => {
      if (seen.has(name)) throw new Error(`${name} is listed twice`);
      seen.add(name);
      const words = [...new Set([...extra.split(" "), ...(tags[name] ?? [])].map((w) => w.toLowerCase()))].filter((w) => w && w !== name);
      return { name, category, words, svg: innerSvg(readFileSync(join(lucide, "icons", `${name}.svg`), "utf8")) };
    });
    const social = SOCIAL.map(([id, file]) => ({ id, svg: innerSvg(readFileSync(join(tabler, "icons", "outline", `${file}.svg`), "utf8")) }));
    const q = (s) => JSON.stringify(s);
    const out = [
      "/**",
      " * Crust's icons (F077). Written by scripts/sync-icons.mjs; don't edit by hand.",
      " *",
      ` * Everyday icons: Lucide (${LUCIDE}), ISC licence,`,
      " * Copyright (c) for portions of Lucide are held by Cole Bemis 2013-2022 as",
      " * part of Feather (MIT). All other copyright (c) for Lucide are held by",
      " * Lucide Contributors 2022. https://lucide.dev/license",
      ` * Social networks: Tabler Icons (${TABLER}), MIT licence,`,
      " * Copyright (c) 2020-2024 Paweł Kuna. https://tabler.io/icons",
      " * Each entry is the drawing inside a 24×24 <svg> with stroke=currentColor.",
      " */",
      "",
      "export type IconEntry = { category: string; words: string[]; svg: string };",
      "",
      "export const iconData: Record<string, IconEntry> = {",
      ...icons.map((i) => `  ${q(i.name)}: { category: ${q(i.category)}, words: ${q(i.words)}, svg: ${q(i.svg)} },`),
      "};",
      "",
      "export const socialIconData: Record<string, string> = {",
      ...social.map((s) => `  ${q(s.id)}: ${q(s.svg)},`),
      "};",
      "",
    ].join("\n");
    writeFileSync(OUT, out);
    console.log(`Wrote ${icons.length} icons and ${social.length} social icons.`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

if (import.meta.url === `file://${process.argv[1]}`) main();

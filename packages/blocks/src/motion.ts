/**
 * Motion (F075, direction A of https://claude.ai/artifact/MnHuVJQob5bY9H1qnd3jDe):
 * one site-wide level (`tokens.style.motion`: off, subtle, lively), with a
 * few choices per block: a Section's `entrance` and `parallax`, a Logo
 * row's `moving`.
 *
 * CSS only. Entrances and parallax use scroll-linked animation
 * (`animation-timeline: view()`); a browser without it shows the page
 * still. Text is never made see-through (see `entrances`). Everything sits inside `prefers-reduced-motion: no-preference`.
 * The CSS is added to published pages (and Site settings' preview) only
 * when motion is on; the builder canvas never gets it, so blocks don't
 * move while being edited.
 */
import type { SiteTokens } from "./tokens";

export const motionLevels = ["off", "subtle", "lively"] as const;
export type MotionLevel = (typeof motionLevels)[number];
export const motionLevelNames: Record<MotionLevel, string> = { off: "Off", subtle: "Subtle", lively: "Lively" };
export const motionLevelHelp: Record<MotionLevel, string> = {
  off: "Still, like before",
  subtle: "Sections rise in, cards lift",
  lively: "Bigger moves, photos zoom on cards",
};

/**
 * How blocks come in. Words never fade: a scroll-linked fade leaves text
 * half see-through (and below contrast) when a visitor stops scrolling with
 * it near the foot of the screen. Blocks move into place at full strength;
 * only photos fade in.
 */
export const entrances = ["rise", "zoom", "slide", "none"] as const;
export type Entrance = (typeof entrances)[number];
export const entranceNames: Record<Entrance, string> = { rise: "Rise", zoom: "Zoom", slide: "Slide in", none: "None" };

export const isEntrance = (v: unknown): v is Entrance => typeof v === "string" && (entrances as readonly string[]).includes(v);

/** The site's motion level; missing means Off, so sites made before F075 stay still. */
export function motionOf(tokens: Pick<SiteTokens, "style">): MotionLevel {
  const m = tokens.style?.motion;
  return m && (motionLevels as readonly string[]).includes(m) ? m : "off";
}

/** Section classes for its motion props; none for a section without them. */
export function sectionMotionClasses(props: { entrance?: unknown; parallax?: unknown }, hasPhoto: boolean): string[] {
  const out: string[] = [];
  if (isEntrance(props.entrance) && props.entrance !== "rise") out.push(`cr-enter-${props.entrance}`);
  if (props.parallax === true && hasPhoto) out.push("cr-parallax");
  return out;
}

/** A moving logo row repeats its logos until each half holds at least this many, so the strip never shows a gap. */
export const MARQUEE_MIN = 8;

/** How many times the logos repeat in each half of a moving row. */
export const marqueeRepeat = (count: number): number => (count <= 0 ? 0 : Math.ceil(MARQUEE_MIN / count));

const levels = {
  subtle: { rise: "24px", zoom: "0.96", reach: 30, step: 4, lift: "-3px", button: "-2px", photo: "", time: 3.5 },
  lively: { rise: "56px", zoom: "0.9", reach: 40, step: 6, lift: "-6px", button: "-3px", photo: "1.05", time: 2.5 },
} as const;

/**
 * The motion CSS for a site, or "" when motion is off. Selectors match the
 * block markup in config.tsx and more-blocks.tsx.
 */
export function motionCss(tokens: Pick<SiteTokens, "style">): string {
  const level = motionOf(tokens);
  if (level === "off") return "";
  const l = levels[level];
  // What enters: each block in a section, except rows of things, whose items enter one by one instead.
  const groups = ".cr-columns, .cr-grid, .cr-gallery";
  const items = [
    `.cr-section > .cr-container > :not(${groups}, :has(> .cr-columns, > .cr-grid, > .cr-gallery))`,
    `.cr-columns > :not(:has(${groups}))`,
    ".cr-grid > li",
    ".cr-gallery > *",
  ].join(",\n  ");
  const ease = "cubic-bezier(0.2, 0.7, 0.2, 1)";
  return `/* Motion (F075): ${level} */
@media (prefers-reduced-motion: no-preference) {
@keyframes cr-enter-rise { from { translate: 0 ${l.rise}; } }
@keyframes cr-enter-zoom { from { scale: ${l.zoom}; } }
@keyframes cr-enter-slide { from { translate: calc(-1 * ${l.rise}) 0; } }
@keyframes cr-photo-in { from { opacity: 0; } }
@keyframes cr-parallax { from { transform: translateY(-6%) scale(1.16); } to { transform: translateY(6%) scale(1.16); } }
@keyframes cr-marquee { to { transform: translateX(-50%); } }
@supports (animation-timeline: view()) {
  .cr-section { --cr-enter: cr-enter-rise; --cr-photo: cr-photo-in; }
  .cr-enter-zoom { --cr-enter: cr-enter-zoom; }
  .cr-enter-slide { --cr-enter: cr-enter-slide; }
  .cr-enter-none { --cr-enter: none; --cr-photo: none; }
  /* The first section is on screen when the page opens: it never waits. */
  #content > section.cr-section:first-of-type, #content > :first-child > section.cr-section { --cr-enter: none; --cr-photo: none; }
  ${items} {
    animation: var(--cr-enter) both ${ease};
    animation-timeline: view();
    view-timeline: --cr-item block;
    animation-range: cover calc(var(--cr-i, 0) * ${l.step}vh) cover calc(${l.reach}vh + var(--cr-i, 0) * ${l.step}vh);
  }
  /* Photos fade in (words never do), timed by the block they're in: a card clips its photo, which would hide the scroll from it. Background photos and logos stay put. */
  .cr-section img:not(.cr-section-media, .cr-logos img) {
    animation: var(--cr-photo) both ease-out;
    animation-timeline: --cr-item;
    animation-range: cover calc(var(--cr-i, 0) * ${l.step}vh) cover calc(${l.reach}vh + var(--cr-i, 0) * ${l.step}vh);
  }
  /* Rows of things come in one after another, left to right. */
  .cr-columns > :nth-child(4n+2), .cr-grid > :nth-child(4n+2), .cr-gallery > :nth-child(4n+2) { --cr-i: 1; }
  .cr-columns > :nth-child(4n+3), .cr-grid > :nth-child(4n+3), .cr-gallery > :nth-child(4n+3) { --cr-i: 2; }
  .cr-columns > :nth-child(4n+4), .cr-grid > :nth-child(4n+4), .cr-gallery > :nth-child(4n+4) { --cr-i: 3; }
  /* Light parallax: the photo moves a little slower than the page; the words don't move. */
  .cr-parallax > .cr-section-media, .cr-parallax > .cr-picture > .cr-section-media { animation: cr-parallax linear both; animation-timeline: view(); animation-range: cover; }
}
/* Hover lift: only cards and buttons that link somewhere, so it tells what can be pressed. */
.cr-card:has(a[href]) { transition: transform 0.25s ${ease}, box-shadow 0.25s ease; }
.cr-card:has(a[href]):focus-within { transform: translateY(${l.lift}); box-shadow: 0 12px 32px rgb(0 0 0 / 0.14); }
a.cr-button:not(.cr-button-arrow) { transition: transform 0.2s ${ease}, filter 0.15s ease; }
a.cr-button:not(.cr-button-arrow):focus-visible { transform: translateY(${l.button}); }
@media (hover: hover) {
  .cr-card:has(a[href]):hover { transform: translateY(${l.lift}); box-shadow: 0 12px 32px rgb(0 0 0 / 0.14); }
  a.cr-button:not(.cr-button-arrow):hover { transform: translateY(${l.button}); }
}
${
  l.photo
    ? `.cr-card:has(a[href]) .cr-card-media { transition: transform 0.6s ${ease}; }
.cr-card:has(a[href]):focus-within .cr-card-media { transform: scale(${l.photo}); }
@media (hover: hover) { .cr-card:has(a[href]):hover .cr-card-media { transform: scale(${l.photo}); } }
`
    : ""
}/* Moving logo row: the copies and the pause switch exist only while it moves. */
.cr-marquee { display: grid; gap: var(--cr-space-xs); margin: 0 0 var(--cr-space-sm); }
.cr-marquee-window { overflow: hidden; mask-image: linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent); }
.cr-marquee-track { display: flex; width: max-content; animation: cr-marquee calc(var(--cr-marquee-n, 8) * ${l.time}s) linear infinite; }
.cr-marquee-track > .cr-logos { flex-wrap: nowrap; justify-content: flex-start; margin: 0; padding-right: var(--cr-space-md); flex: none; }
.cr-marquee-track > .cr-logos[hidden] { display: flex; }
.cr-marquee-track li[hidden] { display: block; }
.cr-marquee .cr-marquee-pause[hidden] { display: inline-flex; }
.cr-marquee-pause { justify-self: end; position: relative; width: 44px; height: 44px; align-items: center; justify-content: center; border: 1.5px solid currentColor; border-radius: 50%; cursor: pointer; }
.cr-marquee-pause input { position: absolute; inset: 0; margin: 0; opacity: 0; cursor: pointer; }
.cr-marquee-pause > span { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
.cr-marquee-pause::before { content: ""; width: 10px; height: 12px; border-inline: 3px solid currentColor; box-sizing: border-box; }
.cr-marquee-pause:has(input:checked)::before { width: 0; height: 0; border-style: solid; border-width: 6px 0 6px 10px; border-color: transparent transparent transparent currentColor; margin-left: 3px; }
.cr-marquee-pause:has(input:focus-visible) { outline: 3px solid currentColor; outline-offset: 2px; }
.cr-marquee:hover .cr-marquee-track, .cr-marquee:focus-within .cr-marquee-track, .cr-marquee:has(.cr-marquee-pause input:checked) .cr-marquee-track { animation-play-state: paused; }
}
`;
}

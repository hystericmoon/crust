/**
 * Sections v2 (F073): width, gradient and video backgrounds, a focal point
 * for the background photo, pulling up over the section above, and the site
 * header sitting on the first section. Every prop is optional; a Section
 * without them publishes exactly as before.
 */
import { AA, contrastRatio } from "./contrast";
import { mixHex, resolveSectionStyle, type SectionStyleId } from "./section-styles";
import { colorRoles, type ColorRole, type SiteTokens } from "./tokens";
import { safeUrl } from "./url";

// --- Width --------------------------------------------------------------------------------

export const sectionWidths = ["narrow", "normal", "wide", "full", "left", "right"] as const;
export type SectionWidth = (typeof sectionWidths)[number];
export const sectionWidthNames: Record<SectionWidth, string> = {
  narrow: "Narrow",
  normal: "Normal",
  wide: "Wide",
  full: "Full",
  left: "Left edge",
  right: "Right edge",
};
export const sectionWidthHelp: Record<SectionWidth, string> = {
  narrow: "For reading: about 70 characters a line.",
  normal: "The site's page width.",
  wide: "A quarter wider than the page width.",
  full: "The whole screen, with a small gutter.",
  left: "Text on the page grid; the content runs on to the left edge of the screen.",
  right: "Text on the page grid; the content runs on to the right edge of the screen.",
};
export const isSectionWidth = (v: unknown): v is SectionWidth => sectionWidths.includes(v as SectionWidth);

// --- Background kind ----------------------------------------------------------------------

export const backgroundKinds = ["colour", "gradient", "photo", "video"] as const;
export type BackgroundKind = (typeof backgroundKinds)[number];
export const backgroundKindNames: Record<BackgroundKind, string> = { colour: "Colour", gradient: "Gradient", photo: "Photo", video: "Video" };

/** What a Section shows behind its content. Sections saved before F073 have no kind: a photo if they have one. */
export function backgroundKindOf(props: { bgKind?: unknown; imageSrc?: unknown }): BackgroundKind {
  if (backgroundKinds.includes(props.bgKind as BackgroundKind)) return props.bgKind as BackgroundKind;
  return typeof props.imageSrc === "string" && props.imageSrc.trim() ? "photo" : "colour";
}

// --- Gradient -----------------------------------------------------------------------------

export const gradientDirections = ["down", "diagonal", "across", "glow"] as const;
export type GradientDirection = (typeof gradientDirections)[number];
export const gradientDirectionNames: Record<GradientDirection, string> = { down: "Down", diagonal: "Diagonal", across: "Across", glow: "Glow" };

export interface SectionGradient {
  /** The site colour the gradient ends in; it starts in the section style's colour. */
  to: ColorRole;
  direction: GradientDirection;
}

/** Points along the gradient where text must still read: the two ends and the colours between. */
const SAMPLES = [0, 0.25, 0.5, 0.75, 1];

/**
 * Whether the section's text, muted text and links keep AA contrast all
 * along a gradient from the style's colour to `to`, and a solid button stays
 * visible (3:1). Mixing two colours can be darker or lighter in the middle
 * than at either end, so the colours between are checked too.
 */
export function gradientReads(tokens: SiteTokens, style: SectionStyleId, to: ColorRole): boolean {
  const s = resolveSectionStyle(tokens, style);
  const end = tokens.colors[to];
  return SAMPLES.every((t) => {
    const c = mixHex(end, s.bg, t);
    if (contrastRatio(s.ink, c) < AA || contrastRatio(s.muted, c) < AA || contrastRatio(s.accent, c) < AA) return false;
    return s.button.look !== "solid" || contrastRatio(s.button.bg, c) >= 3;
  });
}

/** Site colours a gradient may end in: those that differ from the style's colour and keep the text readable. */
export function gradientColours(tokens: SiteTokens, style: SectionStyleId): ColorRole[] {
  const start = resolveSectionStyle(tokens, style).bg.toUpperCase();
  return colorRoles.filter((r) => tokens.colors[r].toUpperCase() !== start && gradientReads(tokens, style, r));
}

export function cleanGradient(value: unknown): SectionGradient | null {
  if (!value || typeof value !== "object") return null;
  const g = value as Record<string, unknown>;
  if (!colorRoles.includes(g.to as ColorRole)) return null;
  const direction = gradientDirections.includes(g.direction as GradientDirection) ? (g.direction as GradientDirection) : "down";
  return { to: g.to as ColorRole, direction };
}

/** The CSS background for a gradient; colours are CSS variables, so a colour change in Site settings follows. */
export function gradientCss(g: SectionGradient): string {
  const end = `var(--cr-color-${g.to})`;
  switch (g.direction) {
    case "across":
      return `linear-gradient(90deg, var(--cr-sec-bg) 0%, ${end} 100%)`;
    case "diagonal":
      return `linear-gradient(135deg, var(--cr-sec-bg) 0%, ${end} 100%)`;
    case "glow":
      return `radial-gradient(120% 90% at 50% 0%, ${end} 0%, var(--cr-sec-bg) 70%)`;
    default:
      return `linear-gradient(180deg, var(--cr-sec-bg) 0%, ${end} 100%)`;
  }
}

// --- Focal point --------------------------------------------------------------------------

export interface FocalPoint {
  /** 0 = left edge, 100 = right edge. */
  x: number;
  /** 0 = top, 100 = bottom. */
  y: number;
}

const pct = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? Math.min(100, Math.max(0, Math.round(v))) : null);

export function cleanFocus(value: unknown): FocalPoint | null {
  if (!value || typeof value !== "object") return null;
  const f = value as Record<string, unknown>;
  const x = pct(f.x);
  const y = pct(f.y);
  return x === null || y === null ? null : { x, y };
}

/** `object-position` for a focal point; undefined for the middle (the browser's default). */
export function focusPosition(value: unknown): string | undefined {
  const f = cleanFocus(value);
  return f && (f.x !== 50 || f.y !== 50) ? `${f.x}% ${f.y}%` : undefined;
}

// --- Video --------------------------------------------------------------------------------

/**
 * A background video's address: https or a site path, ending in .mp4 or
 * .webm (query strings allowed). Anything else is no video.
 */
export function videoAddress(src: unknown): string | null {
  if (typeof src !== "string" || !src.trim()) return null;
  const url = safeUrl(src.trim());
  if (url === "#" || !(url.startsWith("https://") || (url.startsWith("/") && !url.startsWith("//")))) return null;
  return /\.(mp4|webm)(?:[?#].*)?$/i.test(url) ? url : null;
}

export const videoType = (url: string) => (/\.webm(?:[?#].*)?$/i.test(url) ? "video/webm" : "video/mp4");

/** Whether a page's blocks hold a Section that plays a video, so the page needs VIDEO_SCRIPT. */
export function hasBackgroundVideo(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(hasBackgroundVideo);
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  if (v.type === "Section" && v.props && typeof v.props === "object") {
    const p = v.props as Record<string, unknown>;
    if (backgroundKindOf(p) === "video" && videoAddress(p.videoSrc) && typeof p.imageSrc === "string" && p.imageSrc.trim()) return true;
  }
  return Object.values(v).some(hasBackgroundVideo);
}

/**
 * Starts background videos, only when the visitor allows motion, and wires
 * the pause button (WCAG 2.2.2). Without this script (or with Reduce motion)
 * the video stays hidden and never downloads; the still photo shows.
 */
export const VIDEO_SCRIPT = `const still=matchMedia("(prefers-reduced-motion: reduce)");
const label=(b,v)=>{b.classList.toggle("cr-is-paused",v.paused);b.querySelector("span").textContent=v.paused?"Play background video":"Pause background video";};
for(const v of document.querySelectorAll("video[data-cr-video]")){
const b=v.parentElement.querySelector(".cr-video-toggle");if(!b)continue;
let stopped=false;
const show=()=>{if(still.matches)return;v.hidden=false;b.hidden=false;if(!stopped)v.play().catch(()=>{});label(b,v);};
const hide=()=>{v.pause();v.hidden=true;b.hidden=true;};
b.addEventListener("click",()=>{if(v.paused){stopped=false;v.play().catch(()=>{});}else{stopped=true;v.pause();}label(b,v);});
v.addEventListener("play",()=>label(b,v));v.addEventListener("pause",()=>label(b,v));
still.addEventListener("change",()=>still.matches?hide():show());
show();}`;

// --- Pull up, header on top ---------------------------------------------------------------

export const overlapSizes = ["none", "sm", "md", "lg"] as const;
export type OverlapSize = (typeof overlapSizes)[number];
export const overlapNames: Record<OverlapSize, string> = { none: "No", sm: "A little", md: "Half", lg: "A lot" };

/**
 * The page's first block, when it's a Section that asks the header to sit on
 * it: the header then takes that section's style. Only the first block can.
 */
export function headerOverStyle(content: unknown): SectionStyleId | null {
  if (!Array.isArray(content)) return null;
  const first = content[0] as { type?: unknown; props?: Record<string, unknown> } | undefined;
  if (first?.type !== "Section" || first.props?.headerOver !== true) return null;
  const hide = first.props.hideOn;
  // Hidden on some screens: the header would sit on whatever comes next there.
  if (Array.isArray(hide) && hide.length) return null;
  return (first.props.background as SectionStyleId) ?? "background";
}

/**
 * F076: the style of a page's first section when it has a photo or video
 * background (and shows on every screen), for "Clear on a hero photo".
 * The section's tint keeps the header's words readable, as for its own.
 */
export function heroStyle(content: unknown): SectionStyleId | null {
  if (!Array.isArray(content)) return null;
  const first = content[0] as { type?: unknown; props?: Record<string, unknown> } | undefined;
  if (first?.type !== "Section" || !first.props) return null;
  const hide = first.props.hideOn;
  if (Array.isArray(hide) && hide.length) return null;
  const kind = backgroundKindOf(first.props as { bgKind?: BackgroundKind; imageSrc?: string });
  if ((kind !== "photo" && kind !== "video") || typeof first.props.imageSrc !== "string" || !first.props.imageSrc.trim()) return null;
  return (first.props.background as SectionStyleId) ?? "background";
}

/** Only a page's first block may carry the header; the flag is dropped from any other (e.g. a section moved down). */
export function onlyFirstHeaderOver<T extends { props?: Record<string, unknown> }>(content: T[]): T[] {
  return content.map((b, i) => (i > 0 && b.props?.headerOver === true ? { ...b, props: { ...b.props, headerOver: false } } : b));
}

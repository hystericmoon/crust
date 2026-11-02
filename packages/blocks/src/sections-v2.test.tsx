import { describe, expect, it } from "vitest";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { config } from "./config";
import { contrastRatio } from "./contrast";
import { mixHex, resolveSectionStyle, sectionStyleIds } from "./section-styles";
import {
  backgroundKindOf,
  cleanFocus,
  cleanGradient,
  focusPosition,
  gradientColours,
  gradientCss,
  gradientReads,
  hasBackgroundVideo,
  headerOverStyle,
  onlyFirstHeaderOver,
  videoAddress,
} from "./sections-v2";
import { styleLooks, applyLook } from "./style-library";
import { defaultTokens } from "./tokens";

type Props = Record<string, unknown>;
const Section = config.components.Section;
const draw = (props: Props) =>
  renderToStaticMarkup(
    (Section.render as unknown as (p: Props) => ReactElement)({
      ...Section.defaultProps,
      ...props,
      content: () => null,
      id: "s",
      puck: { isEditing: false },
    }),
  );

describe("sections v2: old sections", () => {
  it("publishes a Section without F073 props exactly as before", () => {
    // React hoists a preload hint for the photo; the section itself is what matters.
    const html = draw({ background: "surface", imageSrc: "/media/a.jpg", tint: "strong" }).replace(/^<link [^>]*>/, "");
    expect(html).toBe(
      '<section class="cr-section cr-style-surface cr-height-auto cr-valign-center" style="--cr-section-pad:var(--cr-space-lg)">' +
        '<img class="cr-section-media" src="/media/a.jpg" alt="" decoding="async"/>' +
        '<div class="cr-section-tint cr-tint-strong" aria-hidden="true"></div><div class="cr-container"></div></section>',
    );
  });

  it("reads the background kind of old sections from their photo", () => {
    expect(backgroundKindOf({ imageSrc: "/media/a.jpg" })).toBe("photo");
    expect(backgroundKindOf({ imageSrc: "  " })).toBe("colour");
    expect(backgroundKindOf({})).toBe("colour");
    expect(backgroundKindOf({ bgKind: "video", imageSrc: "" })).toBe("video");
    expect(backgroundKindOf({ bgKind: "sparkles", imageSrc: "/a.jpg" })).toBe("photo");
  });
});

describe("sections v2: width", () => {
  it("adds a width class, except for Normal", () => {
    expect(draw({ width: "narrow" })).toContain("cr-width-narrow");
    expect(draw({ width: "right" })).toContain("cr-width-right");
    expect(draw({ width: "normal" })).not.toContain("cr-width");
    expect(draw({ width: "huge" })).not.toContain("cr-width");
  });
});

describe("sections v2: gradient", () => {
  it("draws a gradient only when the kind is Gradient", () => {
    const g = { to: "surface", direction: "diagonal" };
    const html = draw({ bgKind: "gradient", gradient: g });
    expect(html).toContain("cr-has-gradient");
    expect(html).toContain("--cr-section-gradient:linear-gradient(135deg, var(--cr-sec-bg) 0%, var(--cr-color-surface) 100%)");
    expect(draw({ bgKind: "colour", gradient: g })).not.toContain("gradient");
  });

  it("ignores a gradient with an unknown colour, and defaults the direction", () => {
    expect(cleanGradient({ to: "pink" })).toBeNull();
    expect(cleanGradient({ to: "primary", direction: "spiral" })).toEqual({ to: "primary", direction: "down" });
    expect(draw({ bgKind: "gradient", gradient: { to: "red; background:url(x)" } })).not.toContain("gradient");
  });

  it("writes each direction", () => {
    expect(gradientCss({ to: "primary", direction: "down" })).toContain("180deg");
    expect(gradientCss({ to: "primary", direction: "across" })).toContain("90deg");
    expect(gradientCss({ to: "primary", direction: "glow" })).toMatch(/^radial-gradient/);
  });

  it("offers only colours that keep the text readable along the whole gradient", () => {
    const offered = gradientColours(defaultTokens, "background");
    expect(offered).toContain("surface");
    expect(offered).not.toContain("primary");
    expect(offered).not.toContain("text");
    // The style's own colour is no gradient.
    expect(offered).not.toContain("background");
  });

  it("checks the colours between the ends, not only the ends", () => {
    // Red to green: each end is lighter than the middle.
    const tokens = { ...defaultTokens, colors: { ...defaultTokens.colors, background: "#FF0000", surface: "#00B000", text: "#000000", muted: "#000000", primary: "#000000" } };
    const s = resolveSectionStyle(tokens, "background");
    const mid = mixHex("#00B000", "#FF0000", 0.5);
    expect(contrastRatio(s.ink, mid)).toBeLessThan(Math.min(contrastRatio(s.ink, "#FF0000"), contrastRatio(s.ink, "#00B000")));
  });

  it("every offered colour passes in all 36 colourways of the style library", () => {
    for (const look of styleLooks)
      for (const v of look.variations) {
        const tokens = applyLook(defaultTokens, look, v);
        for (const id of sectionStyleIds) for (const to of gradientColours(tokens, id)) expect(gradientReads(tokens, id, to)).toBe(true);
      }
  });
});

describe("sections v2: focal point", () => {
  it("cleans and clamps the point", () => {
    expect(cleanFocus({ x: 120, y: -4 })).toEqual({ x: 100, y: 0 });
    expect(cleanFocus({ x: "10", y: 5 })).toBeNull();
    expect(focusPosition({ x: 50, y: 50 })).toBeUndefined();
    expect(focusPosition({ x: 30.4, y: 70 })).toBe("30% 70%");
  });

  it("positions the background photo on its focal point", () => {
    const html = draw({ imageSrc: "/media/a.jpg", focus: { x: 20, y: 80 } });
    expect(html).toContain('style="object-position:20% 80%"');
  });
});

describe("sections v2: video", () => {
  const video = { bgKind: "video", imageSrc: "/media/still.jpg", videoSrc: "https://cdn.example.com/loop.mp4" };

  it("accepts only https or site addresses of mp4 and webm files", () => {
    expect(videoAddress("https://a.test/v.mp4?x=1")).toBe("https://a.test/v.mp4?x=1");
    expect(videoAddress("/media/v.webm")).toBe("/media/v.webm");
    expect(videoAddress("http://a.test/v.mp4")).toBeNull();
    expect(videoAddress("javascript:alert(1)//.mp4")).toBeNull();
    expect(videoAddress("https://a.test/v.mov")).toBeNull();
    expect(videoAddress("//evil.test/v.mp4")).toBeNull();
  });

  it("renders a hidden, muted, looping video over the still photo, and a hidden pause button", () => {
    const html = draw(video);
    expect(html).toContain('<img class="cr-section-media" src="/media/still.jpg"');
    expect(html).toMatch(/<video class="cr-section-media cr-section-video" data-cr-video="" muted="" loop="" playsInline="" preload="none" aria-hidden="true" tabindex="-1" hidden="">/);
    expect(html).toContain('<source src="https://cdn.example.com/loop.mp4" type="video/mp4"/>');
    expect(html).toContain('<button class="cr-video-toggle" type="button" aria-pressed="false" hidden=""><span>Pause background video</span></button>');
    expect(html).not.toContain("autoplay");
  });

  it("needs the still photo: no photo, no video", () => {
    const html = draw({ ...video, imageSrc: "" });
    expect(html).not.toContain("<video");
    expect(html).not.toContain("cr-video-toggle");
    expect(hasBackgroundVideo([{ type: "Section", props: { ...video, imageSrc: "" } }])).toBe(false);
  });

  it("finds a video section anywhere in a page", () => {
    expect(hasBackgroundVideo([{ type: "Section", props: { content: [{ type: "Section", props: video }] } }])).toBe(true);
    expect(hasBackgroundVideo([{ type: "Section", props: { ...video, bgKind: "photo" } }])).toBe(false);
  });
});

describe("sections v2: pull up and header on top", () => {
  it("adds the overlap and under-header classes", () => {
    expect(draw({ overlap: "md" })).toContain("cr-overlap-md");
    expect(draw({ overlap: "none" })).not.toContain("cr-overlap");
    expect(draw({ overlap: "xxl" })).not.toContain("cr-overlap");
    expect(draw({ headerOver: true })).toContain("cr-under-header");
  });

  it("lets only the first block carry the header", () => {
    const first = { type: "Section", props: { background: "dark", headerOver: true } };
    expect(headerOverStyle([first])).toBe("dark");
    expect(headerOverStyle([{ type: "Heading", props: {} }, first])).toBeNull();
    expect(headerOverStyle([{ ...first, props: { ...first.props, hideOn: ["phone"] } }])).toBeNull();
    expect(headerOverStyle([{ type: "Section", props: { background: "dark" } }])).toBeNull();
    const fixed = onlyFirstHeaderOver([first, first]);
    expect(fixed[0]!.props.headerOver).toBe(true);
    expect(fixed[1]!.props.headerOver).toBe(false);
  });
});

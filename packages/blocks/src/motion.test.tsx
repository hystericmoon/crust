import { describe, expect, it } from "vitest";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { config } from "./config";
import { marqueeRepeat, MARQUEE_MIN, motionCss, motionOf, sectionMotionClasses } from "./motion";
import { applyPreset, themePresets } from "./presets";
import { applyLook, matchingLook, styleLooks } from "./style-library";
import { validateStyleOptions } from "./style-options";
import { defaultTokens, type SiteTokens } from "./tokens";

type Props = Record<string, unknown>;
type Render = (p: Props) => ReactElement;
const draw = (name: "Section" | "LogoRow", props: Props, isEditing = false) => {
  const block = config.components[name];
  return renderToStaticMarkup(
    <>{(block.render as unknown as Render)({ ...block.defaultProps, ...props, content: () => null, id: `${name}-1`, puck: { isEditing } })}</>,
  ).replace(/<link [^>]*>/g, "");
};
const withMotion = (motion: string): SiteTokens => ({ ...defaultTokens, style: { motion } as SiteTokens["style"] });

describe("motion: the site setting", () => {
  it("is Off when missing or unknown, so sites made before stay still", () => {
    expect(motionOf(defaultTokens)).toBe("off");
    expect(motionOf(withMotion("wobbly"))).toBe("off");
    expect(motionCss(defaultTokens)).toBe("");
    expect(motionCss(withMotion("off"))).toBe("");
    expect(motionOf(withMotion("lively"))).toBe("lively");
  });

  it("is checked like the other style options", () => {
    expect(validateStyleOptions(withMotion("subtle"))).toEqual([]);
    expect(validateStyleOptions(withMotion("fast"))).toEqual([{ path: "style.motion", message: "Motion: pick one of Off, Subtle, Lively." }]);
  });

  it("survives picking a look or a preset, and the look is still recognised", () => {
    const look = styleLooks[0]!;
    const picked = applyLook(withMotion("lively"), look);
    expect(picked.style?.motion).toBe("lively");
    expect(matchingLook(picked)?.look.id).toBe(look.id);
    expect(applyLook(defaultTokens, look).style).not.toHaveProperty("motion");
    expect(applyPreset(withMotion("subtle"), themePresets[1]!).style?.motion).toBe("subtle");
  });
});

describe("motion: the CSS", () => {
  const subtle = motionCss(withMotion("subtle"));
  const lively = motionCss(withMotion("lively"));

  it("does nothing for visitors who ask for reduced motion", () => {
    for (const css of [subtle, lively]) {
      const open = css.indexOf("@media (prefers-reduced-motion: no-preference) {");
      expect(open).toBeGreaterThan(-1);
      // Every rule is inside that block: nothing before it but the comment, and it closes at the very end.
      expect(css.slice(0, open).trim()).toMatch(/^\/\* Motion \(F075\): \w+ \*\/$/);
      expect(css.trim().endsWith("}")).toBe(true);
      let depth = 0;
      for (const ch of css.slice(open)) {
        if (ch === "{") depth++;
        if (ch === "}") depth--;
        expect(depth).toBeGreaterThanOrEqual(0);
      }
      expect(depth).toBe(0);
    }
  });

  it("links entrances and parallax to scrolling, only where the browser can (content never waits hidden)", () => {
    const supports = subtle.indexOf("@supports (animation-timeline: view())");
    expect(supports).toBeGreaterThan(-1);
    for (const rule of ["animation-timeline: view()", "--cr-enter: cr-enter-rise; --cr-photo: cr-photo-in", ".cr-parallax > .cr-section-media"]) {
      expect(subtle.indexOf(rule)).toBeGreaterThan(supports);
    }
    // No time-based entrance: nothing starts hidden and waits for a timer or a script.
    expect(subtle).not.toMatch(/animation:[^;]*cr-enter[^;]*\d+(\.\d+)?m?s/);
    // Words never fade, so text keeps its contrast wherever a visitor stops scrolling; only photos do.
    for (const css of [subtle, lively]) {
      const enters = css.match(/@keyframes cr-enter-\w+ \{[^}]*\}/g)!;
      expect(enters).toHaveLength(3);
      for (const k of enters) expect(k).not.toContain("opacity");
      expect(css).toContain("@keyframes cr-photo-in { from { opacity: 0; } }");
      expect(css).toContain(".cr-section img:not(.cr-section-media, .cr-logos img)");
    }
  });

  it("never makes the first section wait", () => {
    expect(subtle).toContain("#content > section.cr-section:first-of-type, #content > :first-child > section.cr-section { --cr-enter: none; --cr-photo: none; }");
  });

  it("staggers rows of columns, cards and photos", () => {
    for (const n of [1, 2, 3]) expect(subtle).toContain(`.cr-grid > :nth-child(4n+${n + 1})`);
    expect(subtle).toContain(".cr-gallery > *");
  });

  it("lifts only cards and buttons that link somewhere, on hover and keyboard focus", () => {
    expect(subtle).toContain(".cr-card:has(a[href]):focus-within { transform: translateY(-3px)");
    expect(subtle).toContain("@media (hover: hover)");
    expect(subtle).toContain("a.cr-button:not(.cr-button-arrow):focus-visible");
    expect(subtle).not.toContain(".cr-card-media { transition");
    expect(lively).toContain(".cr-card:has(a[href]):focus-within { transform: translateY(-6px)");
    expect(lively).toContain(".cr-card-media { transform: scale(1.05); }");
  });

  it("moving logos stop on hover, on keyboard focus and with the pause switch", () => {
    expect(subtle).toContain(".cr-marquee:hover .cr-marquee-track, .cr-marquee:focus-within .cr-marquee-track, .cr-marquee:has(.cr-marquee-pause input:checked) .cr-marquee-track { animation-play-state: paused; }");
    expect(subtle).toMatch(/\.cr-marquee-pause \{[^}]*width: 44px; height: 44px;/);
  });
});

describe("motion: Section", () => {
  it("publishes a Section without F075 props exactly as before", () => {
    const before = draw("Section", { imageSrc: "/media/a.jpg" });
    expect(draw("Section", { imageSrc: "/media/a.jpg", entrance: "rise", parallax: false })).toBe(before);
    expect(before).not.toMatch(/cr-enter|cr-parallax/);
  });

  it("marks another entrance, and parallax only with a photo", () => {
    expect(draw("Section", { entrance: "slide" })).toContain("cr-enter-slide");
    expect(draw("Section", { entrance: "none" })).toContain("cr-enter-none");
    expect(draw("Section", { entrance: "spin" })).not.toContain("cr-enter");
    expect(draw("Section", { imageSrc: "/media/a.jpg", parallax: true })).toContain("cr-parallax");
    expect(draw("Section", { parallax: true })).not.toContain("cr-parallax");
    expect(draw("Section", { bgKind: "gradient", imageSrc: "/media/a.jpg", parallax: true })).not.toContain("cr-parallax");
    expect(sectionMotionClasses({ parallax: "yes" }, true)).toEqual([]);
  });
});

describe("motion: Logo row", () => {
  const logos = [
    { src: "/media/a.svg", alt: "Alba", href: "/about" },
    { src: "/media/b.svg", alt: "Kestrel", href: "" },
    { src: "/media/c.svg", alt: "Lumen", href: "" },
  ];

  it("publishes a still row exactly as before", () => {
    const before = draw("LogoRow", { logos });
    expect(draw("LogoRow", { logos, moving: "no" })).toBe(before);
    expect(before).not.toContain("hidden");
  });

  it("repeats the logos so the strip never shows a gap", () => {
    expect(marqueeRepeat(3)).toBe(3);
    expect(marqueeRepeat(8)).toBe(1);
    expect(marqueeRepeat(0)).toBe(0);
    for (const n of [1, 2, 5, 9]) expect(n * marqueeRepeat(n)).toBeGreaterThanOrEqual(MARQUEE_MIN);
  });

  it("moving: screen readers and the Tab key meet each logo once; the pause switch is a real control", () => {
    const html = draw("LogoRow", { logos, moving: "yes" });
    expect(html).toContain('style="--cr-marquee-n:9"');
    const [real, copy] = html.split('<ul class="cr-logos cr-logos-medium cr-align-center cr-logos-grey" role="list"').slice(1);
    // The real list: three logos read, six repeats hidden from everyone until the row moves.
    expect(real!.match(/<li>/g)).toHaveLength(3);
    expect(real!.match(/<li hidden="" aria-hidden="true">/g)).toHaveLength(6);
    expect(real!.match(/<a href="\/about">/g)).toHaveLength(1);
    expect(real!.match(/<a href="\/about" tabindex="-1">/g)).toHaveLength(2);
    // The copy: hidden from screen readers as a whole, its links out of the Tab order.
    expect(copy!.startsWith(' aria-hidden="true" hidden="">')).toBe(true);
    expect(copy!.match(/<a href="\/about" tabindex="-1">/g)).toHaveLength(3);
    expect(html).toContain('<label class="cr-marquee-pause" hidden=""><input type="checkbox"/><span>Pause the moving logos</span></label>');
  });

  it("stays still in the builder", () => {
    expect(draw("LogoRow", { logos, moving: "yes" }, true)).toBe(draw("LogoRow", { logos }, true));
  });
});

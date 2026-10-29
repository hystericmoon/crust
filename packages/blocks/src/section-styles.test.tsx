import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { config } from "./config";
import { AA, contrastRatio } from "./contrast";
import {
  defaultSectionStyles,
  effectiveTint,
  imageContrast,
  minimumTint,
  resolveSectionStyle,
  sectionStyleIds,
  sectionStylesCss,
  sectionStylesOf,
  sectionStyleWarnings,
  tintLevels,
  weakestReadableTint,
} from "./section-styles";
import { defaultTokens, tokensToCss, validateTokens, type SiteTokens } from "./tokens";

const withStyles = (patch: Partial<NonNullable<SiteTokens["sectionStyles"]>>): SiteTokens => ({
  ...defaultTokens,
  sectionStyles: { ...defaultSectionStyles, ...patch },
});

describe("section styles: defaults", () => {
  it("gives sites saved before F025 the default styles", () => {
    expect(defaultTokens.sectionStyles).toBeUndefined();
    expect(sectionStylesOf(defaultTokens)).toEqual(defaultSectionStyles);
  });

  it("keeps the pre-F025 look of Page, Surface and Primary sections", () => {
    const c = defaultTokens.colors;
    const page = resolveSectionStyle(defaultTokens, "background");
    expect([page.bg, page.ink, page.muted, page.accent]).toEqual([c.background, c.text, c.muted, c.primary]);
    expect(page.button).toMatchObject({ bg: c.primary, fg: c.onPrimary, look: "solid" });

    const surface = resolveSectionStyle(defaultTokens, "surface");
    expect([surface.bg, surface.ink]).toEqual([c.surface, c.text]);

    const primary = resolveSectionStyle(defaultTokens, "primary");
    expect(primary.bg).toBe(c.primary);
    expect(primary.ink.toLowerCase()).toBe(c.onPrimary.toLowerCase());
    expect(primary.button).toMatchObject({ bg: primary.ink, fg: c.primary, look: "inverse" });
  });

  it("makes Dark a dark background with light text", () => {
    const dark = resolveSectionStyle(defaultTokens, "dark");
    expect(dark.bg).toBe(defaultTokens.colors.text);
    expect(dark.ink.toLowerCase()).toBe(defaultTokens.colors.background.toLowerCase());
  });
});

describe("section styles: contrast", () => {
  const backgrounds = ["background", "surface", "text", "primary", "muted", "#F3EAD8", "#0F172A", "#FFD400", "#7A7A7A"];

  it.each(backgrounds)("text, muted text and links pass AA on %s", (bg) => {
    const s = resolveSectionStyle(withStyles({ surface: { bg, button: "solid" } }), "surface");
    if (s.inkRatio < AA) return; // reported by sectionStyleWarnings instead
    expect(contrastRatio(s.ink, s.bg)).toBeGreaterThanOrEqual(AA);
    expect(contrastRatio(s.muted, s.bg)).toBeGreaterThanOrEqual(AA);
    expect(contrastRatio(s.accent, s.bg)).toBeGreaterThanOrEqual(AA);
    if (s.button.look !== "outline") expect(contrastRatio(s.button.fg, s.button.bg)).toBeGreaterThanOrEqual(AA);
  });

  it("turns a solid button inverse when it would vanish into the section", () => {
    const s = resolveSectionStyle(withStyles({ primary: { bg: "primary", button: "solid" } }), "primary");
    expect(s.button.look).toBe("inverse");
  });

  it("uses the text colour for links when Primary doesn't read on the background", () => {
    const s = resolveSectionStyle(defaultTokens, "dark");
    expect(s.accent).toBe(s.ink);
  });

  it("warns when no site colour reads on a style's background", () => {
    const grey = withStyles({ dark: { bg: "#7A7A7A", button: "inverse" } });
    const warnings = sectionStyleWarnings(grey);
    expect(warnings.map((w) => w.id)).toEqual(["dark"]);
    expect(warnings[0]!.message).toMatch(/Text on Dark sections is hard to read/);
    expect(sectionStyleWarnings(defaultTokens)).toEqual([]);
  });
});

describe("section styles: image tint", () => {
  it("never lets text drop below AA on any photo", () => {
    for (const id of sectionStyleIds) {
      const s = resolveSectionStyle(defaultTokens, id);
      for (const level of tintLevels) {
        const { opacity } = effectiveTint(s, level);
        expect(imageContrast(s.ink, s.bg, opacity)).toBeGreaterThanOrEqual(AA);
      }
    }
  });

  it("raises a tint that is too faint and says so", () => {
    const page = resolveSectionStyle(defaultTokens, "background");
    const min = minimumTint(page.ink, page.bg);
    expect(min).toBeGreaterThan(0.45);
    expect(effectiveTint(page, "light")).toEqual({ opacity: min, raised: true });
    expect(effectiveTint(page, "strong")).toEqual({ opacity: 0.82, raised: false });
    expect(weakestReadableTint(page)).not.toBe("light");
  });

  it("writes the raised opacity into the CSS", () => {
    const page = resolveSectionStyle(defaultTokens, "background");
    const css = sectionStylesCss(defaultTokens);
    expect(css).toContain(`.cr-style-background > .cr-tint-light { opacity: ${effectiveTint(page, "light").opacity}; }`);
  });
});

describe("section styles: CSS and validation", () => {
  it("adds one rule per style to the token CSS, scoped like the tokens", () => {
    const css = tokensToCss(defaultTokens);
    for (const id of sectionStyleIds) expect(css).toContain(`.cr-style-${id} {`);
    expect(tokensToCss(defaultTokens, ".preview")).toContain(".preview .cr-style-dark {");
  });

  it("follows a site-wide change everywhere the style is used", () => {
    const sand = withStyles({ surface: { bg: "#F3EAD8", button: "outline" } });
    expect(sectionStylesCss(sand)).toMatch(/\.cr-style-surface \{\n {2}--cr-sec-bg: #F3EAD8;/);
  });

  it("rejects unknown colours and button looks", () => {
    const bad = withStyles({ surface: { bg: "red; x", button: "huge" as never } });
    expect(validateTokens(bad).map((p) => p.path)).toEqual(["sectionStyles.surface.bg", "sectionStyles.surface.button"]);
    expect(validateTokens(withStyles({}))).toEqual([]);
  });
});

describe("section block", () => {
  const render = (props: Record<string, unknown>) =>
    renderToStaticMarkup(
      config.components.Section.render({
        ...config.components.Section.defaultProps,
        ...props,
        content: () => null,
        id: "s",
        puck: { isEditing: false },
      } as never),
    );

  it("renders style, height and position as classes", () => {
    expect(render({ background: "dark", height: "full", valign: "bottom" })).toMatch(
      /^<section class="cr-section cr-style-dark cr-height-full cr-valign-bottom"/,
    );
  });

  it("renders a background image as decoration with a tint", () => {
    const html = render({ imageSrc: "https://example.com/a.jpg", tint: "strong" });
    expect(html).toContain('<img class="cr-section-media" src="https://example.com/a.jpg" alt=""');
    expect(html).toContain('<div class="cr-section-tint cr-tint-strong" aria-hidden="true"></div>');
  });

  it("refuses unsafe image addresses", () => {
    const html = render({ imageSrc: "javascript:alert(1)" });
    expect(html).not.toContain("javascript:");
    expect(html).not.toContain("cr-section-media");
  });
});

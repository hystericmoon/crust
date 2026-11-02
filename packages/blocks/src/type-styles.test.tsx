import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { config, type Components } from "./config";
import { cleanPlaceholder, markableFields } from "./placeholders";
import { displaySize, headingSizes, labelsUseMono, styleOptionsCss, validateStyleOptions } from "./style-options";
import { defaultTokens, tokensToCss, type SiteTokens } from "./tokens";

type Render = (props: Record<string, unknown>) => ReactNode;
function html(name: keyof Components, props: Record<string, unknown> = {}) {
  const block = config.components[name];
  return renderToStaticMarkup(<>{(block.render as unknown as Render)({ id: `${name}-1`, ...block.defaultProps, ...props, puck: { isEditing: false } })}</>);
}
const withStyle = (style: SiteTokens["style"]): SiteTokens => ({ ...defaultTokens, style });

describe("type-styles: headings", () => {
  it("renders a heading exactly as before unless Display or a label is set", () => {
    expect(html("Heading", { text: "Hi", level: "h2", align: "left", size: undefined, eyebrow: undefined })).toBe('<h2 class="cr-heading cr-h2 cr-align-left">Hi</h2>');
    expect(html("Heading", { text: "Hi" })).toBe('<h2 class="cr-heading cr-h2 cr-align-left">Hi</h2>');
  });

  it("Display adds a class and keeps the chosen level", () => {
    expect(html("Heading", { text: "Calm", level: "h1", size: "display" })).toBe('<h1 class="cr-heading cr-h1 cr-display cr-align-left">Calm</h1>');
  });

  it("puts the small label and the heading in one hgroup, label first, as a paragraph", () => {
    const out = html("Heading", { text: "Calm rooms", level: "h2", align: "center", eyebrow: " Architecture studio " });
    expect(out).toBe('<hgroup class="cr-hgroup cr-align-center"><p class="cr-eyebrow">Architecture studio</p><h2 class="cr-heading cr-h2 cr-align-center">Calm rooms</h2></hgroup>');
    expect(html("Heading", { eyebrow: "   " })).not.toContain("hgroup");
  });

  it("escapes the label like any user text", () => {
    expect(html("Heading", { eyebrow: "<img src=x onerror=alert(1)>" })).toContain("&lt;img src=x onerror=alert(1)&gt;");
  });

  it("lets a template mark the label as sample content", () => {
    expect(markableFields.Heading!.map((f) => f.field)).toEqual(["text", "eyebrow"]);
    expect(cleanPlaceholder("Heading", ["eyebrow", "bogus"])).toEqual(["eyebrow"]);
  });
});

describe("type-styles: buttons", () => {
  it("names Secondary 'Outline' without changing saved pages", () => {
    const options = (config.components.Button.fields!.variant as { options: { label: string; value: string }[] }).options;
    expect(options).toEqual([
      { label: "Primary", value: "primary" },
      { label: "Outline", value: "secondary" },
      { label: "Soft", value: "soft" },
      { label: "Text with arrow", value: "arrow" },
    ]);
    expect(html("Button", { variant: "secondary" })).toContain('class="cr-button cr-button-secondary"');
  });

  it("adds Soft and Text with arrow; the arrow is hidden from screen readers", () => {
    expect(html("Button", { variant: "soft", label: "Our process" })).toContain('class="cr-button cr-button-soft"');
    const arrow = html("Button", { variant: "arrow", label: "Contact", href: "/contact" });
    expect(arrow).toBe('<div class="cr-button-row cr-align-left"><a class="cr-button cr-button-arrow" href="/contact">Contact<span class="cr-arrow" aria-hidden="true">→</span></a></div>');
    expect(html("Button", { variant: "primary" })).not.toContain("cr-arrow");
  });
});

describe("type-styles: cards", () => {
  const photo = { imageSrc: "/media/door.jpg", imageAlt: "A green door", title: "Harbourside Library" };
  it("'Photo fills the card' puts the words over the photo", () => {
    const out = html("Card", { ...photo, layout: "cover" });
    expect(out).toContain('<article class="cr-card cr-card-cover">');
    expect(out).toContain('alt="A green door"');
    expect(out).not.toContain("cr-bg-");
  });

  it("falls back to stacked without a photo, and stays stacked by default", () => {
    expect(html("Card", { layout: "cover", imageSrc: "" })).toContain('class="cr-card cr-bg-surface"');
    expect(html("Card", photo)).toContain('class="cr-card cr-bg-surface"');
  });
});

describe("type-styles: site options", () => {
  it("keeps sites that never set the new options as they were", () => {
    expect(styleOptionsCss(defaultTokens)).toBe("");
    expect(tokensToCss(defaultTokens)).not.toContain("--cr-display");
    expect(tokensToCss(defaultTokens)).not.toContain("--cr-font-label");
  });

  it("accepts Light and Regular weights and the two tighter spacings", () => {
    expect(validateStyleOptions(withStyle({ headingWeight: 300, headingTracking: "tightest", displayWeight: 400, displayTracking: "tighter", labelStyle: "chip" }))).toEqual([]);
    expect(validateStyleOptions(withStyle({ labelStyle: "neon" as never }))).toEqual([{ path: "style.labelStyle", message: "Small labels: pick one of Plain, Caps, Mono, Chip." }]);
    expect(validateStyleOptions(withStyle({ displayWeight: 250 as never }))[0]!.path).toBe("style.displayWeight");
  });

  it("writes Display variables, following the heading look when unset", () => {
    const css = styleOptionsCss(withStyle({ headingWeight: 600, headingTracking: "snug" }));
    expect(css).toContain(`--cr-display-size: ${displaySize("balanced")};`);
    expect(css).toContain("--cr-display-weight: 600;");
    expect(css).toContain("--cr-display-track: -0.02em;");
    const set = styleOptionsCss(withStyle({ displayWeight: 300, displayTracking: "tightest" }));
    expect(set).toContain("--cr-display-weight: 300;");
    expect(set).toContain("--cr-display-track: -0.05em;");
  });

  it("makes Display bigger than H1 on every scale", () => {
    for (const scale of ["subtle", "balanced", "bold", "dramatic"] as const) {
      const h1 = Number(headingSizes(scale)[0].match(/([\d.]+)rem\)$/)![1]);
      const display = Number(displaySize(scale).match(/([\d.]+)rem\)$/)![1]);
      expect(display, scale).toBeGreaterThan(h1);
    }
  });

  it("Mono and Chip labels bring in Geist Mono, and only then", () => {
    expect(labelsUseMono(withStyle({ labelStyle: "caps" }))).toBe(false);
    expect(tokensToCss(withStyle({ labelStyle: "caps" }))).not.toContain("Geist Mono");
    const chip = tokensToCss(withStyle({ labelStyle: "chip" }));
    expect(chip).toContain("--cr-font-label: 'Geist Mono'");
    expect(chip).toContain("url(/fonts/geist-mono-latin.woff2)");
    expect(chip).toContain(".cr-hgroup .cr-eyebrow::before");
    // More specific than the base .cr-eyebrow rule, which the page puts after these.
    expect(tokensToCss(withStyle({ labelStyle: "mono" }))).toContain(".cr-hgroup .cr-eyebrow { font-family: var(--cr-font-label);");
  });

  it("Plain labels drop the capitals", () => {
    expect(styleOptionsCss(withStyle({ labelStyle: "plain" }))).toContain("text-transform: none");
  });
});

describe("type-styles: published CSS rules", () => {
  const css = (async () => (await import("node:fs")).readFileSync(new URL("./styles.css", import.meta.url), "utf8"))();
  it("keeps H3 and H4 at Medium or heavier, and labels at 12px or more", async () => {
    const s = await css;
    expect(s).toContain(".cr-h3, .cr-h4 { font-weight: max(500, var(--cr-heading-weight, 700)); }");
    expect(s).toMatch(/\.cr-eyebrow \{[^}]*font-size: 0\.75rem;/);
  });

  it("puts photo-card words on a dark scrim and turns motion off when asked", async () => {
    const s = await css;
    expect(s).toContain(".cr-card-cover::after");
    expect(s).toContain("rgb(0 0 0 / 0.72)");
    expect(s).toContain("@media (prefers-reduced-motion: reduce) { .cr-button-arrow .cr-arrow { transition: none; } }");
  });
});

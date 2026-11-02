import type { Data } from "@puckeditor/core";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { config, type Components } from "./config";
import { relinkPage } from "./links";
import { itemLimits } from "./more-blocks";

type Name = keyof Components;
type Render = (props: Record<string, unknown>) => ReactNode;
const newBlocks: Name[] = ["Grid", "Gallery", "Accordion", "IconList", "LogoRow", "Quote", "ImageOverlay"];

function html(name: Name, props: Record<string, unknown> = {}, isEditing = false) {
  const block = config.components[name];
  const render = block.render as unknown as Render;
  return renderToStaticMarkup(<>{render({ id: `${name}-1`, ...block.defaultProps, ...props, puck: { isEditing } })}</>);
}

describe("more blocks: in the builder", () => {
  it("are all in the block list, under Layout, Content or Media", () => {
    const listed = Object.values(config.categories ?? {}).flatMap((c) => c.components ?? []);
    for (const name of newBlocks) expect(listed).toContain(name);
    // F078 added Video.
    expect(config.categories?.media?.components).toEqual(["Gallery", "Video", "ImageOverlay", "LogoRow"]);
  });

  it("render with their defaults, with no script and no inline handlers", () => {
    for (const name of newBlocks) {
      const out = html(name, {}, true);
      expect(out.length).toBeGreaterThan(20);
      expect(out).not.toMatch(/<script|on[a-z]+=/i);
    }
  });

  it("cap how many items each list holds", () => {
    const max = (name: Name, field: string) => (config.components[name].fields as Record<string, { max?: number }>)[field]!.max;
    expect(max("Grid", "items")).toBe(itemLimits.grid);
    expect(max("Gallery", "images")).toBe(itemLimits.gallery);
    expect(max("Accordion", "items")).toBe(itemLimits.accordion);
    expect(max("IconList", "items")).toBe(itemLimits.iconList);
    expect(max("LogoRow", "logos")).toBe(itemLimits.logos);
  });
});

describe("Grid of cards", () => {
  it("is a real list of cards with the chosen title level and columns", () => {
    const out = html("Grid", { columns: "4", titleLevel: "h4" });
    expect(out).toMatch(/^<ul class="cr-grid cr-grid-4" role="list"><li><article class="cr-card cr-bg-surface">/);
    expect(out.match(/<li>/g)).toHaveLength(3);
    expect(out).toContain('<h4 class="cr-heading cr-card-title">Plan</h4>');
  });

  it("leaves alt out when it's empty (so publishing flags it), and makes unsafe links harmless", () => {
    const out = html("Grid", { items: [{ title: "A", text: "", imageSrc: "/a.jpg", imageAlt: "", linkLabel: "Go", linkHref: "javascript:alert(1)" }] });
    expect(out).toContain('<img class="cr-card-media" src="/a.jpg" loading="lazy" decoding="async"/>');
    expect(out).toContain('<a class="cr-card-link" href="#">Go</a>');
  });
});

describe("Gallery", () => {
  const images = [
    { src: "/a.jpg", alt: "A desk", caption: "Our desk" },
    { src: "", alt: "", caption: "" },
  ];
  it("publishes only photos with an address, as figures with captions", () => {
    const out = html("Gallery", { images, shape: "wide" });
    expect(out).toContain('class="cr-gallery cr-grid-3 cr-shape-wide" role="list"');
    expect(out).toContain('<figure class="cr-gallery-item"><img src="/a.jpg" alt="A desk" loading="lazy" decoding="async"/><figcaption>Our desk</figcaption></figure>');
    expect(out.match(/<li>/g)).toHaveLength(1);
  });
  it("shows a placeholder for an empty photo in the builder", () => {
    expect(html("Gallery", { images }, true)).toContain("Add an image URL");
  });
});

describe("Accordion / FAQ", () => {
  it("uses <details> so it opens without JavaScript", () => {
    const out = html("Accordion");
    expect(out.match(/<details class="cr-accordion-item">/g)).toHaveLength(2);
    expect(out).toContain("<summary>How long does a project take?</summary>");
    expect(out).toContain('<div class="cr-accordion-body cr-text"><p>Most sites are ready in two to four weeks.</p></div>');
  });
  it("can open the first one, and keep only one open at a time (named group)", () => {
    const out = html("Accordion", { firstOpen: "yes", oneAtATime: "yes" });
    expect(out).toContain('<details class="cr-accordion-item" open="" name="acc-Accordion-1">');
    expect(out.match(/name="acc-Accordion-1"/g)).toHaveLength(2);
  });
});

describe("Icon list", () => {
  it("is a list whose icons are hidden from screen readers", () => {
    const out = html("IconList", { icon: "star", iconColor: "text" });
    expect(out).toMatch(/^<ul class="cr-icon-list cr-icon-text" role="list"><li><svg class="cr-list-icon"[^>]*aria-hidden="true" focusable="false">/);
    expect(out).toContain("<span>Accessible by default</span>");
  });
});

describe("Logo row", () => {
  it("names each logo by its alt text, links it when asked, and skips empty ones", () => {
    const logos = [
      { src: "/acme.svg", alt: "Acme", href: "https://acme.test" },
      { src: "/globex.svg", alt: "Globex", href: "" },
      { src: "", alt: "", href: "" },
    ];
    const out = html("LogoRow", { logos });
    expect(out).toContain('class="cr-logos cr-logos-medium cr-align-center cr-logos-grey" role="list"');
    expect(out).toContain('<li><a href="https://acme.test"><img src="/acme.svg" alt="Acme" loading="lazy" decoding="async"/></a></li>');
    expect(out).toContain('<li><img src="/globex.svg" alt="Globex" loading="lazy" decoding="async"/></li>');
    expect(out.match(/<li>/g)).toHaveLength(2);
  });
});

describe("Quote", () => {
  it("is a figure with a blockquote and who said it; the photo is decoration", () => {
    const out = html("Quote", { imageSrc: "/alex.jpg", size: "large", align: "center" });
    expect(out).toMatch(/^<figure class="cr-quote cr-quote-large cr-align-center"><blockquote class="cr-quote-text"><p>/);
    expect(out).toContain('<img class="cr-quote-photo" src="/alex.jpg" alt=""');
    expect(out).toContain('<span class="cr-quote-name">Alex Rivera</span><span class="cr-quote-role">Studio Rivera</span>');
  });
  it("leaves out the caption when nobody is named", () => {
    expect(html("Quote", { name: "", role: "" })).not.toContain("figcaption");
  });
});

describe("Image overlay", () => {
  it("puts text on the image over a tint from a section style", () => {
    const out = html("ImageOverlay", { imageSrc: "/p.jpg", imageAlt: "A street", linkLabel: "See", linkHref: "/work", tint: "strong" });
    expect(out).toMatch(/^<div class="cr-overlay cr-style-dark cr-overlay-bottom-left cr-overlay-medium">/);
    expect(out).toContain('<img class="cr-section-media" src="/p.jpg" alt="A street"');
    expect(out).toContain('<div class="cr-section-tint cr-tint-strong" aria-hidden="true"></div>');
    expect(out).toContain('<h2 class="cr-heading cr-overlay-title">A title on a photo</h2>');
    expect(out).toContain('<a class="cr-button cr-button-primary" href="/work">See</a>');
  });
  it("works without an image (the style's own background)", () => {
    expect(html("ImageOverlay")).not.toContain("<img");
  });
});

describe("renaming a page updates links inside the new blocks", () => {
  it("rewrites Grid card links, Logo links and the Image overlay link", () => {
    const puck: Data = {
      root: { props: {} },
      content: [
        { type: "Grid", props: { id: "g", items: [{ title: "A", linkHref: "/about#team" }, { title: "B", linkHref: "/other" }] } },
        { type: "LogoRow", props: { id: "l", logos: [{ src: "/a.svg", alt: "A", href: "/about" }] } },
        { type: "ImageOverlay", props: { id: "o", linkHref: "/about/" } },
      ],
    };
    const { puck: next, count } = relinkPage(puck, "/about", "/studio");
    expect(count).toBe(3);
    const [grid, logos, overlay] = next.content as { props: Record<string, unknown> }[];
    expect((grid!.props.items as { linkHref: string }[]).map((i) => i.linkHref)).toEqual(["/studio#team", "/other"]);
    expect((logos!.props.logos as { href: string }[])[0]!.href).toBe("/studio");
    expect(overlay!.props.linkHref).toBe("/studio/");
  });
});

describe("published tags and styles come only from known values", () => {
  it("never turns a stored level into another tag, or a spacing value into CSS", () => {
    const heading = config.components.Heading.render as unknown as Render;
    expect(renderToStaticMarkup(<>{heading({ text: "x", level: "script", align: "left" })}</>)).toBe('<h2 class="cr-heading cr-h2 cr-align-left">x</h2>');
    expect(html("Grid", { titleLevel: "style" })).toContain('<h3 class="cr-heading cr-card-title">Plan</h3>');
    expect(html("ImageOverlay", { titleLevel: "script" })).toContain('<h2 class="cr-heading cr-overlay-title">');
    const spacer = config.components.Spacer.render as unknown as Render;
    expect(renderToStaticMarkup(<>{spacer({ size: "x);position:fixed" })}</>)).toContain('style="height:var(--cr-space-none)"');
  });
});

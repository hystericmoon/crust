/**
 * F081: AVIF and WebP copies offered in a <picture>, and focal points used
 * wherever a library photo is cropped.
 */
import { renderToStaticMarkup } from "react-dom/server";
import type { ReactElement, ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { config } from "./config";
import { mediaFocus, modernFile, modernFormats, parseMediaIndex, type MediaItem } from "./media";
import { Img, MediaContext, MediaFocusContext } from "./media-img";
import { readTemplatePhoto } from "./template";

/** A 1600 × 900 PNG header, enough for the template's photo check. */
function pngBase64(width: number, height: number) {
  const b = new Uint8Array(33);
  b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
  new DataView(b.buffer).setUint32(16, width);
  new DataView(b.buffer).setUint32(20, height);
  return btoa(String.fromCharCode(...b));
}

const harbour: MediaItem = { file: "harbour.jpg", alt: "Boats", width: 2400, height: 1600, bytes: 1, uploadedAt: "", focus: { x: 20, y: 40 } };
const sea: MediaItem = { file: "sea.webp", alt: "Sea", width: 1000, height: 600, bytes: 1, uploadedAt: "" };
const library = new Map([harbour, sea].map((m) => [m.file, m]));
const published = (node: ReactNode) => renderToStaticMarkup(<MediaContext.Provider value={library}>{node}</MediaContext.Provider>);

describe("AVIF and WebP copies (F081)", () => {
  it("names copies like crust-publish: the original's name plus the format", () => {
    expect(modernFile("harbour-480w.jpg", "avif")).toBe("harbour-480w.jpg.avif");
    expect(modernFormats("a.jpg").map((f) => f.ext)).toEqual(["avif", "webp"]);
    expect(modernFormats("a.png").map((f) => f.type)).toEqual(["image/avif", "image/webp"]);
    expect(modernFormats("a.webp").map((f) => f.ext)).toEqual(["avif"]);
  });

  it("offers AVIF first, then WebP, then the original, each with the resized copies", () => {
    const html = published(<Img src="/media/harbour.jpg" alt="Boats" size="half" />);
    const avif = html.indexOf('type="image/avif"');
    const webp = html.indexOf('type="image/webp"');
    const img = html.indexOf("<img");
    expect(html.startsWith('<picture class="cr-picture">')).toBe(true);
    expect(avif).toBeGreaterThan(0);
    expect(webp).toBeGreaterThan(avif);
    expect(img).toBeGreaterThan(webp);
    expect(html).toContain(
      'srcSet="/media/harbour-480w.jpg.avif 480w, /media/harbour-960w.jpg.avif 960w, /media/harbour-1440w.jpg.avif 1440w, /media/harbour.jpg.avif 2400w" sizes="(min-width: 48rem) 50vw, 100vw"',
    );
    expect(html).toContain('/media/harbour-480w.jpg.webp 480w');
    // The <img> stays the fallback with the original's srcset, size and alt.
    expect(html).toContain('<img src="/media/harbour.jpg" srcSet="/media/harbour-480w.jpg 480w');
    expect(html).toContain('width="2400" height="1600"');
  });

  it("a WebP photo is offered only as AVIF", () => {
    const html = published(<Img src="/media/sea.webp" alt="Sea" />);
    expect(html).toContain('<source type="image/avif" srcSet="/media/sea-480w.webp.avif 480w, /media/sea-960w.webp.avif 960w, /media/sea.webp.avif 1000w"');
    expect(html).not.toContain("image/webp");
  });

  it("web addresses and the builder get a plain <img>", () => {
    expect(published(<Img src="https://x.dev/a.jpg" alt="A" loading="lazy" />)).toBe('<img src="https://x.dev/a.jpg" alt="A" loading="lazy"/>');
    expect(renderToStaticMarkup(<Img src="/media/harbour.jpg" alt="A" loading="lazy" />)).not.toContain("<picture");
  });
});

describe("focal points (F081)", () => {
  it("are read from media.json; the middle and bad values aren't kept", () => {
    const items = parseMediaIndex(
      JSON.stringify([
        { file: "a.jpg", alt: "", width: 10, height: 10, focus: { x: 12.4, y: 80 } },
        { file: "b.jpg", alt: "", width: 10, height: 10, focus: { x: 50, y: 50 } },
        { file: "c.jpg", alt: "", width: 10, height: 10, focus: { x: "left", y: 3 } },
        { file: "d.jpg", alt: "", width: 10, height: 10, focus: { x: 140, y: -5 } },
      ]),
    );
    expect(items.map((i) => i.focus)).toEqual([{ x: 12, y: 80 }, undefined, undefined, { x: 100, y: 0 }]);
    expect(mediaFocus({ x: 50, y: 50 })).toBeNull();
  });

  it("crop a published photo around its point", () => {
    expect(published(<Img src="/media/harbour.jpg" alt="Boats" />)).toContain('style="object-position:20% 40%"');
    expect(published(<Img src="/media/sea.webp" alt="Sea" />)).not.toContain("object-position");
  });

  it("show in the builder too, from the library's focal points", () => {
    const focuses = new Map([["harbour.jpg", { x: 70, y: 10 }]]);
    const html = renderToStaticMarkup(
      <MediaFocusContext.Provider value={focuses}>
        <Img src="/media/harbour.jpg" alt="Boats" loading="lazy" />
      </MediaFocusContext.Provider>,
    );
    expect(html).toBe('<img src="/media/harbour.jpg" style="object-position:70% 10%" alt="Boats" loading="lazy"/>');
  });

  it("a Section's own focus wins over the photo's", () => {
    const Section = config.components.Section.render as (p: Record<string, unknown>) => ReactElement;
    const props = { background: "dark", paddingY: "lg", height: "auto", valign: "center", imageSrc: "/media/harbour.jpg", tint: "medium", content: () => null };
    expect(published(<Section {...props} />)).toContain("object-position:20% 40%");
    expect(published(<Section {...props} focus={{ x: 90, y: 90 }} />)).toContain("object-position:90% 90%");
    expect(published(<Section {...props} focus={{ x: 90, y: 90 }} />)).not.toContain("20% 40%");
  });

  it("cards, galleries and the other cropped photos use it", () => {
    const Card = config.components.Card.render as (p: Record<string, unknown>) => ReactElement;
    const html = published(<Card layout="stacked" title="Boats" titleLevel="h3" text="" imageSrc="/media/harbour.jpg" imageAlt="Boats" linkLabel="" linkHref="" background="surface" />);
    expect(html).toMatch(/class="cr-card-media"[^>]*style="object-position:20% 40%"/);
  });
});

describe("focal points in template files (F081)", () => {
  it("travel with the photo; bad ones are dropped, the photo kept", () => {
    const data = pngBase64(1600, 900);
    expect(readTemplatePhoto({ file: "a.png", alt: "A", data, focus: { x: 18, y: 45 } })).toMatchObject({ focus: { x: 18, y: 45 } });
    expect(readTemplatePhoto({ file: "a.png", alt: "A", data, focus: "left" })).not.toHaveProperty("focus");
    expect(readTemplatePhoto({ file: "a.png", alt: "A", data })).not.toHaveProperty("focus");
  });
});

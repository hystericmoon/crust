import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { fitWithin, formatBytes, mediaFileFor, mediaFileOf, mediaUsedIn, parseMediaIndex, sniffImage, variantFile, variantWidths, type MediaItem } from "./media";
import { Img, MediaContext } from "./media-img";

function png(width: number, height: number) {
  const b = new Uint8Array(33);
  b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
  new DataView(b.buffer).setUint32(16, width);
  new DataView(b.buffer).setUint32(20, height);
  return b;
}

/** SOI, an APP0 segment, then a baseline SOF0 with the size. */
function jpeg(width: number, height: number, sof = 0xc0) {
  return new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 4, 0, 0, 0xff, sof, 0, 11, 8, height >> 8, height & 255, width >> 8, width & 255, 3, 0, 0, 0]);
}

function webp(kind: "VP8X" | "VP8L" | "VP8 ", width: number, height: number) {
  const b = new Uint8Array(40);
  b.set([..."RIFF"].map((c) => c.charCodeAt(0)), 0);
  b.set([..."WEBP"].map((c) => c.charCodeAt(0)), 8);
  b.set([...kind].map((c) => c.charCodeAt(0)), 12);
  const v = new DataView(b.buffer);
  if (kind === "VP8X") {
    v.setUint16(24, (width - 1) & 0xffff, true);
    b[26] = ((width - 1) >> 16) & 255;
    v.setUint16(27, (height - 1) & 0xffff, true);
    b[29] = ((height - 1) >> 16) & 255;
  } else if (kind === "VP8L") {
    b[20] = 0x2f;
    v.setUint32(21, ((width - 1) | ((height - 1) << 14)) >>> 0, true);
  } else {
    v.setUint16(26, width, true);
    v.setUint16(28, height, true);
  }
  return b;
}

describe("media library helpers (F034)", () => {
  it("reads the type and size from the file itself", () => {
    expect(sniffImage(png(1600, 900))).toEqual({ ext: "png", width: 1600, height: 900 });
    expect(sniffImage(jpeg(2400, 1600))).toEqual({ ext: "jpg", width: 2400, height: 1600 });
    expect(sniffImage(jpeg(800, 600, 0xc2))).toEqual({ ext: "jpg", width: 800, height: 600 });
    expect(sniffImage(webp("VP8X", 1200, 800))).toEqual({ ext: "webp", width: 1200, height: 800 });
    expect(sniffImage(webp("VP8L", 300, 200))).toEqual({ ext: "webp", width: 300, height: 200 });
    expect(sniffImage(webp("VP8 ", 640, 480))).toEqual({ ext: "webp", width: 640, height: 480 });
    expect(sniffImage(new TextEncoder().encode("<svg xmlns='http://www.w3.org/2000/svg'></svg>"))).toBeNull();
    expect(sniffImage(new TextEncoder().encode("GIF89a......"))).toBeNull();
    expect(sniffImage(png(0, 10))).toBeNull();
  });

  it("names uploads safely and never reuses a name", () => {
    expect(mediaFileFor("IMG_2041 (1).JPG", "jpg", [])).toBe("img-2041-1.jpg");
    expect(mediaFileFor("Café terrace.jpeg", "jpg", ["cafe-terrace.jpg"])).toBe("cafe-terrace-2.jpg");
    expect(mediaFileFor("???.png", "png", [])).toBe("photo.png");
    // A name that looks like a resized copy would clash with one.
    expect(mediaFileFor("hero-480w.jpg", "jpg", [])).toBe("hero-480.jpg");
  });

  it("only treats library addresses as library photos", () => {
    expect(mediaFileOf("/media/harbour.jpg")).toBe("harbour.jpg");
    expect(mediaFileOf(" /media/harbour.jpg ")).toBe("harbour.jpg");
    expect(mediaFileOf("/media/../site.json")).toBeNull();
    expect(mediaFileOf("https://x.dev/media/a.jpg")).toBeNull();
    expect(mediaFileOf("")).toBeNull();
  });

  it("shrinks to 2400 px on the long side, never enlarges", () => {
    expect(fitWithin(4032, 3024)).toEqual({ width: 2400, height: 1800 });
    expect(fitWithin(3024, 4032)).toEqual({ width: 1800, height: 2400 });
    expect(fitWithin(1200, 800)).toEqual({ width: 1200, height: 800 });
  });

  it("plans resized copies smaller than the photo", () => {
    expect(variantWidths(2400)).toEqual([480, 960, 1440]);
    expect(variantWidths(1000)).toEqual([480, 960]);
    expect(variantWidths(480)).toEqual([]);
    expect(variantFile("harbour.jpg", 480)).toBe("harbour-480w.jpg");
  });

  it("reads media.json, leaving out damaged entries", () => {
    const items = parseMediaIndex(
      JSON.stringify([
        { file: "a.jpg", alt: "A", width: 800, height: 600, bytes: 1000, uploadedAt: "2026-10-30" },
        { file: "a.jpg", alt: "dup", width: 1, height: 1 },
        { file: "../x.jpg", width: 1, height: 1 },
        { file: "b.png", width: 0, height: 1 },
        "nope",
      ]),
    );
    expect(items.map((i) => i.file)).toEqual(["a.jpg"]);
    expect(parseMediaIndex("{broken")).toEqual([]);
    expect(parseMediaIndex(null)).toEqual([]);
  });

  it("finds every library photo a page uses, at any depth", () => {
    const used = mediaUsedIn({ content: [{ props: { src: "/media/a.jpg", images: [{ src: "/media/b.png" }, { src: "https://x/c.jpg" }] } }] });
    expect([...used].sort()).toEqual(["a.jpg", "b.png"]);
  });

  it("formats sizes", () => {
    expect(formatBytes(1536 * 1024)).toBe("1.5 MB");
    expect(formatBytes(640 * 1024)).toBe("640 KB");
  });
});

describe("published images (F034)", () => {
  const item: MediaItem = { file: "harbour.jpg", alt: "Boats", width: 2400, height: 1600, bytes: 1, uploadedAt: "" };
  const library = new Map([[item.file, item]]);
  const render = (node: React.ReactNode) => renderToStaticMarkup(<MediaContext.Provider value={library}>{node}</MediaContext.Provider>);

  it("gives library photos their size and a srcset of the resized copies", () => {
    const html = render(<Img src="/media/harbour.jpg" alt="Boats" size="third" loading="lazy" />);
    expect(html).toContain('src="/media/harbour.jpg"');
    // React writes "srcSet"; HTML attribute names aren't case-sensitive.
    expect(html).toContain('srcSet="/media/harbour-480w.jpg 480w, /media/harbour-960w.jpg 960w, /media/harbour-1440w.jpg 1440w, /media/harbour.jpg 2400w"');
    expect(html).toContain('sizes="(min-width: 64rem) 33vw, (min-width: 40rem) 50vw, 100vw"');
    expect(html).toContain('width="2400" height="1600"');
  });

  it("leaves web addresses, unknown photos and the builder (no library) as they are", () => {
    expect(render(<Img src="https://x.dev/a.jpg" alt="A" loading="lazy" />)).toBe('<img src="https://x.dev/a.jpg" alt="A" loading="lazy"/>');
    expect(render(<Img src="/media/other.jpg" alt="A" loading="lazy" />)).toBe('<img src="/media/other.jpg" alt="A" loading="lazy"/>');
    expect(renderToStaticMarkup(<Img src="/media/harbour.jpg" alt="A" loading="lazy" />)).toBe('<img src="/media/harbour.jpg" alt="A" loading="lazy"/>');
    expect(render(<Img src="javascript:alert(1)" alt="A" loading="lazy" />)).toBe('<img src="#" alt="A" loading="lazy"/>');
  });

  it("small photos get no srcset, only their size (and, F081, their AVIF/WebP copies)", () => {
    const small = new Map([["s.png", { ...item, file: "s.png", width: 300, height: 100 }]]);
    const html = renderToStaticMarkup(
      <MediaContext.Provider value={small}>
        <Img src="/media/s.png" alt="Logo" loading="lazy" />
      </MediaContext.Provider>,
    );
    expect(html).toBe(
      '<picture class="cr-picture"><source type="image/avif" srcSet="/media/s.png.avif"/><source type="image/webp" srcSet="/media/s.png.webp"/>' +
        '<img src="/media/s.png" width="300" height="100" alt="Logo" loading="lazy"/></picture>',
    );
  });
});

/**
 * Images on published pages (F034). The renderer passes in the media library;
 * an uploaded photo then gets its size (no layout shift) and a `srcset` of the
 * resized copies the publish step makes, so phones download small files.
 * F081: it's also offered as AVIF and WebP (a `<picture>`), and a photo with a
 * focal point is cropped around it (`object-position`).
 * In the builder there's no library here, and photos show as they are, but
 * the builder passes the focal points (`MediaFocusContext`) so crops match.
 */
import { createContext, useContext, type CSSProperties, type ImgHTMLAttributes } from "react";
import { mediaFileOf, modernFile, modernFormats, variantFile, variantWidths, type MediaItem } from "./media";
import type { FocalPoint } from "./sections-v2";
import { safeUrl } from "./url";

export const MediaContext = createContext<ReadonlyMap<string, MediaItem> | null>(null);
/** F081: focal points by file name, for the builder (which has no MediaContext). */
export const MediaFocusContext = createContext<ReadonlyMap<string, FocalPoint> | null>(null);

/** How wide an image shows, for the browser to pick a copy. */
export const imageSizes = {
  full: "(min-width: 75rem) 75rem, 100vw",
  wide: "100vw",
  half: "(min-width: 48rem) 50vw, 100vw",
  third: "(min-width: 64rem) 33vw, (min-width: 40rem) 50vw, 100vw",
  small: "12rem",
} as const;

type ImgProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "srcSet" | "sizes"> & {
  src: string;
  size?: keyof typeof imageSizes;
};

/** `srcset` of a library photo's copies in one format ("" = the photo's own). */
function srcSetOf(item: MediaItem, ext: string): string | undefined {
  const name = (file: string) => `/media/${ext ? modernFile(file, ext) : file}`;
  const widths = variantWidths(item.width);
  if (!widths.length) return ext ? name(item.file) : undefined;
  return [...widths.map((w) => `${name(variantFile(item.file, w))} ${w}w`), `${name(item.file)} ${item.width}w`].join(", ");
}

/**
 * An <img> with a safe address. A library photo gets srcset/width/height and,
 * F081, AVIF/WebP sources and its focal point. A `style` passed in (a
 * Section's own focus) wins over the library's focal point.
 */
export function Img({ src, size = "full", className, style, ...rest }: ImgProps) {
  const library = useContext(MediaContext);
  const focuses = useContext(MediaFocusContext);
  const file = mediaFileOf(src);
  const item = file ? library?.get(file) : undefined;
  const focus = item ? item.focus : file ? focuses?.get(file) : undefined;
  const merged: CSSProperties | undefined = focus ? { objectPosition: `${focus.x}% ${focus.y}%`, ...style } : style;
  if (!item) return <img className={className} src={safeUrl(src)} style={merged} {...rest} />;
  const srcSet = srcSetOf(item, "");
  const sizes = variantWidths(item.width).length ? imageSizes[size] : undefined;
  return (
    // display: contents (styles.css), so the <img> lays out as before.
    <picture className="cr-picture">
      {modernFormats(item.file).map((f) => (
        <source key={f.ext} type={f.type} srcSet={srcSetOf(item, f.ext)} sizes={sizes} />
      ))}
      <img
        className={className}
        src={`/media/${item.file}`}
        {...(srcSet ? { srcSet, sizes } : {})}
        width={item.width}
        height={item.height}
        style={merged}
        {...rest}
      />
    </picture>
  );
}

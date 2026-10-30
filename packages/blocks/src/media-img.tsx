/**
 * Images on published pages (F034). The renderer passes in the media library;
 * an uploaded photo then gets its size (no layout shift) and a `srcset` of the
 * resized copies the publish step makes, so phones download small files.
 * In the builder there's no library here, and photos show as they are.
 */
import { createContext, useContext, type ImgHTMLAttributes } from "react";
import { mediaFileOf, variantFile, variantWidths, type MediaItem } from "./media";
import { safeUrl } from "./url";

export const MediaContext = createContext<ReadonlyMap<string, MediaItem> | null>(null);

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

/** An <img> with a safe address, plus srcset/width/height for library photos. */
export function Img({ src, size = "full", className, ...rest }: ImgProps) {
  const library = useContext(MediaContext);
  const file = mediaFileOf(src);
  const item = file ? library?.get(file) : undefined;
  if (!item) return <img className={className} src={safeUrl(src)} {...rest} />;
  const widths = variantWidths(item.width);
  const srcSet = widths.length
    ? [...widths.map((w) => `/media/${variantFile(item.file, w)} ${w}w`), `/media/${item.file} ${item.width}w`].join(", ")
    : undefined;
  return (
    <img
      className={className}
      src={`/media/${item.file}`}
      {...(srcSet ? { srcSet, sizes: imageSizes[size] } : {})}
      width={item.width}
      height={item.height}
      {...rest}
    />
  );
}

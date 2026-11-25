/**
 * A picture that can't load, in the design editor's preview (audit A307).
 * The browser would draw its broken-picture icon with the alt text spilled
 * beside it, which looks like the design is damaged. Instead the picture
 * becomes a calm, empty box. It stays an <img> with its alt text, so a
 * screen reader still hears what the picture is.
 */

/** A 1x1 transparent picture: it loads, so the browser draws no icon and no spilled text. */
const BLANK = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

/** Turns one picture that failed into the empty box (once). */
export function tidyBrokenPicture(img: HTMLImageElement): void {
  if (img.dataset.loadFailed === "true") return;
  img.dataset.loadFailed = "true";
  img.removeAttribute("srcset");
  img.removeAttribute("sizes");
  img.src = BLANK;
  // The same soft box a post without a cover shows on the live site.
  img.style.display = "block";
  img.style.width = "100%";
  img.style.minHeight = "8rem";
  img.style.objectFit = "none";
  img.style.background = "color-mix(in srgb, currentColor 8%, transparent)";
}

/** Watches a document for pictures that fail; returns the clean-up. */
export function installBrokenPictureGuard(doc: Document): () => void {
  const onError = (e: Event) => {
    // The canvas is another document, so its pictures aren't instances of this window's class.
    const t = e.target as HTMLElement | null;
    if (t?.tagName === "IMG") tidyBrokenPicture(t as HTMLImageElement);
  };
  // `error` doesn't bubble, so listen while it travels down.
  doc.addEventListener("error", onError, true);
  // Pictures that already failed before this started listening. Lazy pictures that haven't
  // started and SVGs without a size also report a width of 0, so they are left alone.
  for (const img of doc.querySelectorAll("img")) {
    const src = img.currentSrc || "";
    if (img.loading !== "lazy" && img.complete && img.naturalWidth === 0 && src && !/\.svg(\?|#|$)/i.test(src)) tidyBrokenPicture(img);
  }
  return () => doc.removeEventListener("error", onError, true);
}

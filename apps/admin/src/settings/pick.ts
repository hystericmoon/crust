import type { ColorRole } from "@crust/blocks";

/**
 * Which colour token styles the clicked part of the preview (F014).
 * Mirrors packages/blocks/src/styles.css: text on a Primary section uses
 * "Text on primary", and so do buttons and links there.
 */
export function roleForElement(el: Element): ColorRole {
  const onPrimary = el.closest(".cr-bg-primary, .cr-site-header.cr-style-primary, .cr-site-footer.cr-style-primary") !== null;
  // F069: the site header's logo, menu and Search link, and the footer's
  // links, take the text colour (color: inherit), not the link colour; the
  // copyright line is muted text.
  if (el.closest(".cr-footer-copy")) return onPrimary ? "onPrimary" : "muted";
  if (el.closest(".cr-logo, .cr-menu a, .cr-header-search, .cr-nav-phone > summary")) return onPrimary ? "onPrimary" : "text";
  if (el.closest(".cr-button, .cr-card-link, a")) return onPrimary ? "onPrimary" : "primary";
  if (el.closest(".cr-tone-muted, figcaption")) return onPrimary ? "onPrimary" : "muted";
  if (el.closest("h1, h2, h3, h4, h5, h6, p, li")) return onPrimary ? "onPrimary" : "text";
  const surface = el.closest(".cr-bg-background, .cr-bg-surface, .cr-bg-primary");
  if (surface?.classList.contains("cr-bg-surface")) return "surface";
  if (surface?.classList.contains("cr-bg-primary")) return "primary";
  return "background";
}

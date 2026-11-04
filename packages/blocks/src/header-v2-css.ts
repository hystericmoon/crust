/**
 * Header and footer v2 CSS (F076): layouts, dropdowns, the side panel,
 * the top bar and the footer built from blocks. Published pages get it
 * only when the site uses one of these (`needsHeaderV2Css`), so sites
 * with the classic header carry no extra CSS (Lighthouse "unused CSS").
 * The builder always has it.
 */
import type { SiteFooter, SiteHeader } from "./chrome-model";
import { layoutOf } from "./chrome-model";

export const needsHeaderV2Css = (header: SiteHeader, footer: SiteFooter): boolean =>
  (header.show && (layoutOf(header) !== "classic" || header.menu.some((l) => !!l.children?.length) || !!header.topBar?.show)) ||
  (footer.show && footer.kind === "blocks");

export const HEADER_V2_CSS = `/* Header and footer v2 (F076) */
/* Layouts. Classic is the header above. */
.cr-header-centred .cr-nav-wide, .cr-header-left .cr-nav-wide { flex: 1; }
.cr-header-centred .cr-nav-wide > .cr-menu { margin-inline: auto; }
.cr-header-left .cr-logo { margin-right: var(--cr-space-sm); }
.cr-header-left .cr-nav-wide > .cr-menu { margin-right: auto; }
.cr-header-stacked .cr-header-inner { flex-direction: column; justify-content: center; gap: 0; padding-block: var(--cr-space-xs); }
.cr-header-stacked .cr-logo { margin-right: 0; }
/* Split: the two halves of the menu grow equally, so the logo sits near the middle; search and the button close the row. */
.cr-header-split .cr-nav-wide { flex: 1; }
.cr-header-split .cr-nav-wide > .cr-menu { flex: 1 1 0; flex-wrap: nowrap; }
.cr-header-split .cr-nav-wide > .cr-menu:first-child { justify-content: flex-end; }
.cr-logo-split { margin: 0 var(--cr-space-md); flex: none; }
.cr-header-split .cr-logo-phone { display: none; }
.cr-header-button .cr-header-inner > .cr-header-cta { margin-left: auto; }
.cr-header-button .cr-nav-phone { display: block; }
.cr-header-button .cr-logo, .cr-header-button .cr-header-inner > .cr-header-cta + .cr-nav-phone { margin-right: 0; }
@media (max-width: 767.98px) {
  .cr-header-split .cr-logo-phone { display: inline-flex; }
  .cr-header-stacked .cr-header-inner { flex-direction: row; padding-block: 0; }
  .cr-header-stacked .cr-logo { margin-right: auto; }
  .cr-header-button .cr-header-inner > .cr-header-cta { display: none; }
}
/* Dropdowns: a disclosure button; one open at a time (details name). */
.cr-has-dropdown { position: relative; }
.cr-dropdown > summary {
  display: inline-flex; align-items: center; gap: 6px; min-height: 44px; padding: 0 2px;
  cursor: pointer; list-style: none; text-underline-offset: 0.3em;
}
.cr-dropdown > summary::-webkit-details-marker { display: none; }
.cr-dropdown > summary::after { content: ""; width: 6px; height: 6px; border: solid currentColor; border-width: 0 1.5px 1.5px 0; transform: translateY(-2px) rotate(45deg); }
.cr-dropdown[open] > summary::after { transform: translateY(1px) rotate(-135deg); }
.cr-dropdown > summary:hover, .cr-dropdown > summary.cr-current { text-decoration: underline; }
.cr-dropdown > summary.cr-current { font-weight: 600; text-decoration-thickness: 2px; }
.cr-dropdown > summary:focus-visible, .cr-site-header summary:focus-visible { outline: 3px solid currentColor; outline-offset: 2px; border-radius: 2px; }
.cr-dropdown > .cr-submenu {
  position: absolute; top: 100%; left: -12px; z-index: 60; min-width: 13rem;
  list-style: none; margin: 0; padding: 6px 12px;
  background: var(--cr-sec-bg, var(--cr-color-background)); color: var(--cr-sec-ink, var(--cr-color-text));
  border: 1px solid color-mix(in srgb, currentColor 16%, transparent); border-radius: var(--cr-radius);
  box-shadow: 0 10px 28px rgb(0 0 0 / 0.14);
}
.cr-header-over .cr-dropdown > .cr-submenu { background: var(--cr-color-background); color: var(--cr-color-text); }
.cr-submenu a { display: flex; align-items: center; min-height: 40px; color: inherit; text-decoration: none; text-underline-offset: 0.3em; }
.cr-submenu a:hover { text-decoration: underline; }
.cr-submenu a[aria-current="page"] { font-weight: 600; text-decoration: underline; text-decoration-thickness: 2px; }
.cr-submenu a:focus-visible { outline: 3px solid currentColor; outline-offset: 2px; border-radius: 2px; }
/* In the phone menu: the group's name, then its links, indented. */
.cr-menu-group { display: flex; align-items: center; min-height: 44px; font-weight: 600; }
.cr-nav-phone .cr-submenu { list-style: none; margin: 0 0 var(--cr-space-xs); padding: 0 0 0 var(--cr-space-sm); border-left: 2px solid color-mix(in srgb, currentColor 20%, transparent); }
/* The phone menu as a panel from the right; the open button covers the page behind it, so a click outside closes it. */
.cr-nav-panel > summary > .cr-menu-close { display: none; }
.cr-nav-panel[open] > summary > .cr-menu-open { display: none; }
.cr-nav-panel[open] > summary > .cr-menu-close { display: inline; }
/* Open: the button's ::before dims the page (a click there is a click on the button, so it closes); its Close label sits above the panel. */
.cr-nav-panel[open] > summary { border-color: transparent; padding: 0; }
.cr-nav-panel[open] > summary::after { display: none; }
.cr-nav-panel[open] > summary::before { content: ""; position: fixed; inset: 0; z-index: 90; background: rgb(0 0 0 / 0.45); cursor: default; }
.cr-nav-panel[open] > summary > .cr-menu-close {
  position: fixed; top: var(--cr-space-xs); right: var(--cr-space-sm); z-index: 93; min-height: 44px; padding: 0 14px;
  display: inline-flex; align-items: center; cursor: pointer; font-weight: 600;
  background: var(--cr-sec-bg, var(--cr-color-background)); color: var(--cr-sec-ink, var(--cr-color-text));
  border: 2px solid currentColor; border-radius: var(--cr-button-radius, var(--cr-radius));
}
.cr-nav-panel[open] > summary:focus-visible { outline: none; }
.cr-nav-panel[open] > summary:focus-visible > .cr-menu-close { outline: 3px solid currentColor; outline-offset: 2px; }
.cr-nav-panel > .cr-nav, .cr-nav-panel > .cr-nav[class] {
  position: fixed; top: 0; right: 0; bottom: 0; left: auto; z-index: 91; width: min(22rem, 86vw); overflow-y: auto;
  display: flex; flex-direction: column; align-items: stretch; gap: var(--cr-space-xs);
  padding: calc(44px + var(--cr-space-sm) * 2) var(--cr-space-sm) var(--cr-space-md);
  background: var(--cr-sec-bg, var(--cr-color-background)); color: var(--cr-sec-ink, var(--cr-color-text));
  box-shadow: -12px 0 32px rgb(0 0 0 / 0.2);
}
.cr-header-over .cr-nav-panel > .cr-nav { background: var(--cr-color-background); color: var(--cr-color-text); }
.cr-header-over .cr-nav-panel[open] > summary > .cr-menu-close { background: var(--cr-color-background); color: var(--cr-color-text); }
.cr-nav-panel .cr-menu { flex-direction: column; flex-wrap: nowrap; }
.cr-nav-panel .cr-header-cta { margin-left: 0; align-self: flex-start; }
@media (prefers-reduced-motion: no-preference) {
  .cr-nav-panel[open] > .cr-nav { transition: translate 0.25s cubic-bezier(0.2, 0.7, 0.2, 1); }
  @starting-style { .cr-nav-panel[open] > .cr-nav { translate: 100% 0; } }
}
/* Top bar */
.cr-topbar { background: var(--cr-sec-bg); color: var(--cr-sec-ink); font-size: 0.875rem; }
.cr-topbar-inner { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 0 var(--cr-space-sm); min-height: 36px; }
.cr-topbar-text { margin: 0; }
/* F084 review: a sticky header on a phone would carry this bar on every screen (about 90px), so there it is left out. */
@media (max-width: 40rem) { .cr-sticky .cr-topbar { display: none; } }
.cr-topbar a { color: inherit; text-decoration: underline; text-underline-offset: 0.2em; display: inline-flex; align-items: center; min-height: 24px; }
.cr-topbar a:focus-visible { outline: 3px solid currentColor; outline-offset: 2px; border-radius: 2px; }
.cr-topbar-contact { margin-left: auto; }
.cr-header-over .cr-topbar { position: relative; }
/* Footer built from blocks: the linked section's own sections, then the copyright line. */
.cr-footer-blocks { padding-block: 0; background: none; }
.cr-footer-blocks > .cr-footer-end { background: var(--cr-sec-bg, var(--cr-color-surface)); padding-block: var(--cr-space-sm); }
`;

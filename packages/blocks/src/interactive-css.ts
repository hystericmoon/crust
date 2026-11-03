/**
 * CSS for the F079 blocks: Slideshow, Card slider, Tabs, Map and the
 * Gallery's lightbox. Published pages get it only when they use one
 * (`needsInteractiveCss`, checked on the rendered HTML); the builder always
 * has it. Colours come from the section the block sits in, like F078; the
 * lightbox has its own fixed dark colours (snapshot choice 3, A).
 */

/** Whether rendered page HTML uses any F079 class (whole class names only). */
export const needsInteractiveCss = (html: string): boolean => /class="(?:[^"]*\s)?cr-(?:slider|tabs|map|gallery-lightbox)(?=["\s])/.test(html);

export const INTERACTIVE_CSS = `/* --- F079: Slideshow, Card slider, Tabs, Map, lightbox ---------------------------- */
.cr-vh {
  position: absolute !important; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0 0 0 0); clip-path: inset(50%); white-space: nowrap; border: 0;
}
.cr-slider [hidden], .cr-tabs [hidden], .cr-lightbox [hidden] { display: none !important; }

/* Sliders: a row that scrolls and snaps (works without the script; swipe on phones). */
.cr-slider { display: flex; flex-direction: column; margin: 0 0 var(--cr-space-sm); min-width: 0; }
.cr-slider-track {
  position: relative; display: flex; gap: var(--cr-space-sm); list-style: none; margin: 0; padding: 0;
  overflow-x: auto; overscroll-behavior-x: contain; scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
}
.cr-slider-track:focus-visible { outline: 3px solid var(--cr-sec-ink, var(--cr-color-text)); outline-offset: 3px; border-radius: var(--cr-radius); }
.cr-slider-ready .cr-slider-track { scrollbar-width: none; }
.cr-slider-ready .cr-slider-track::-webkit-scrollbar { display: none; }
.cr-slide { flex: 0 0 100%; min-width: 0; scroll-snap-align: start; }
.cr-slider-controls { display: flex; align-items: center; gap: 0.5rem; margin-top: var(--cr-space-xs); }
.cr-slider-btn {
  display: inline-grid; place-items: center; flex: none; width: 44px; height: 44px; padding: 0;
  border-radius: 50%; border: 1.5px solid color-mix(in srgb, currentColor 45%, transparent);
  background: transparent; color: inherit; cursor: pointer;
}
.cr-slider-btn:hover { background: color-mix(in srgb, currentColor 10%, transparent); }
.cr-slider-btn:focus-visible { outline: 3px solid currentColor; outline-offset: 2px; }
.cr-slider-btn[aria-disabled="true"] { opacity: 0.4; cursor: default; background: transparent; }
.cr-slider-play-icon, .cr-slider-pause.cr-is-paused .cr-slider-pause-icon { display: none; }
.cr-slider-pause.cr-is-paused .cr-slider-play-icon { display: block; }
.cr-slider-count { margin: 0 0 0 0.25rem; font-size: 0.9375rem; font-variant-numeric: tabular-nums; }

/* Slideshow: one photo at a time, the control row under it (snapshot choice 1, A). */
.cr-slide-figure { margin: 0; }
.cr-slide-img {
  display: block; width: 100%; height: auto; aspect-ratio: var(--cr-slide-ratio, 16 / 9);
  object-fit: cover; border-radius: var(--cr-radius);
}
.cr-slide-caption { display: grid; gap: 0.25rem; margin-top: var(--cr-space-xs); }
.cr-slide-title { margin: 0; font-size: 1.25rem; }
.cr-slide-text { margin: 0; color: var(--cr-sec-muted, var(--cr-color-muted)); }
/* Outside a card, links take the section's accent colour (checked per section style), like text links. */
.cr-slide-link, .cr-map-directions { color: var(--cr-sec-accent, var(--cr-color-primary)); }
.cr-slide-link { margin-top: 0; padding-top: 0.25rem; }

/* Card slider: 1 card and a peek on phones, 2 on tablets, the chosen count on desktops;
   the buttons sit above the row, on the right (snapshot choice 2, A). */
.cr-card-slider { --cr-v: 1; }
@media (min-width: 640px) { .cr-card-slider { --cr-v: min(var(--cr-slider-visible, 3), 2); } }
@media (min-width: 1024px) { .cr-card-slider { --cr-v: var(--cr-slider-visible, 3); } }
.cr-card-slider .cr-slider-track { gap: var(--cr-space-md); }
.cr-card-slider .cr-slide {
  display: flex; flex-basis: calc((100% - var(--cr-space-md) * (var(--cr-v) - 1)) / (var(--cr-v) + 0.2));
}
.cr-card-slider .cr-slide > .cr-card { flex-grow: 1; margin: 0; }
.cr-card-slider .cr-slider-controls { align-self: flex-end; margin: 0 0 var(--cr-space-xs); }

/* Tabs. Without the script every text shows under its heading. */
.cr-tabs { margin: 0 0 var(--cr-space-sm); min-width: 0; }
.cr-tab-title { margin: 0 0 var(--cr-space-xs); font-size: 1.25rem; }
.cr-tab-panel + .cr-tab-panel { margin-top: var(--cr-space-md); }
.cr-tab-panel:focus-visible { outline: 3px solid currentColor; outline-offset: 4px; border-radius: 2px; }
.cr-tab-panel .cr-text p:last-child { margin-bottom: 0; }
.cr-tab-list { display: flex; gap: 0.25rem 1.5rem; margin: 0 0 var(--cr-space-sm); overflow-x: auto; scrollbar-width: thin; }
.cr-tab {
  appearance: none; flex: none; min-height: 44px; margin: 0; padding: 0.5rem 0.125rem;
  border: 0; background: none; font: inherit; font-weight: 600; white-space: nowrap;
  color: var(--cr-sec-muted, var(--cr-color-muted)); cursor: pointer;
}
.cr-tab[aria-selected="true"] { color: var(--cr-sec-ink, var(--cr-color-text)); }
.cr-tab:focus-visible { outline: 3px solid currentColor; outline-offset: -3px; border-radius: 4px; }
.cr-tabs-underline .cr-tab-list, .cr-tabs-side .cr-tab-list { border-bottom: 1px solid color-mix(in srgb, currentColor 22%, transparent); }
.cr-tabs-underline .cr-tab[aria-selected="true"], .cr-tabs-side .cr-tab[aria-selected="true"] { box-shadow: inset 0 -3px 0 var(--cr-sec-accent, var(--cr-color-primary)); }
.cr-bg-primary .cr-tab[aria-selected="true"] { box-shadow: inset 0 -3px 0 currentColor; }
.cr-tabs-pills .cr-tab-list {
  gap: 0.25rem; width: max-content; max-width: 100%; padding: 0.25rem; border-radius: 999px;
  background: color-mix(in srgb, currentColor 7%, transparent);
}
.cr-tabs-pills .cr-tab { padding: 0.5rem 1rem; border-radius: 999px; color: inherit; }
.cr-tabs-pills .cr-tab[aria-selected="true"] { background: var(--cr-btn-bg, var(--cr-color-primary)); color: var(--cr-btn-fg, var(--cr-color-onPrimary)); }
.cr-bg-primary .cr-tabs-pills .cr-tab[aria-selected="true"] { background: var(--cr-color-onPrimary); color: var(--cr-color-primary); }
@media (min-width: 768px) {
  .cr-tabs-side.cr-tabs-ready { display: grid; grid-template-columns: minmax(9rem, 14rem) minmax(0, 1fr); gap: var(--cr-space-md); align-items: start; }
  .cr-tabs-side .cr-tab-list { flex-direction: column; gap: 0; margin: 0; overflow: visible; border-bottom: 0; border-left: 1px solid color-mix(in srgb, currentColor 22%, transparent); }
  .cr-tabs-side .cr-tab { padding: 0.5rem 1rem; text-align: left; white-space: normal; }
  .cr-tabs-side .cr-tab[aria-selected="true"], .cr-bg-primary .cr-tabs-side .cr-tab[aria-selected="true"] { box-shadow: inset 3px 0 0 var(--cr-sec-accent, var(--cr-color-primary)); }
  .cr-bg-primary .cr-tabs-side .cr-tab[aria-selected="true"] { box-shadow: inset 3px 0 0 currentColor; }
}

/* Gallery lightbox: the photo is a link to itself until the script opens it in a dialog. */
.cr-gallery-open { display: block; border-radius: var(--cr-radius); cursor: zoom-in; }
.cr-gallery-open:hover img { filter: brightness(0.94); }
.cr-gallery-open:focus-visible { outline: 3px solid var(--cr-sec-ink, var(--cr-color-text)); outline-offset: 3px; }
.cr-lightbox {
  position: fixed; inset: 0; width: 100%; height: 100%; max-width: none; max-height: none; margin: 0; border: 0;
  padding: max(12px, env(safe-area-inset-top, 0px)) max(12px, env(safe-area-inset-right, 0px)) max(12px, env(safe-area-inset-bottom, 0px)) max(12px, env(safe-area-inset-left, 0px));
  background: #141614; color: #EDEFEC; font-family: var(--cr-font-body);
}
.cr-lightbox[open] { display: grid; grid-template-rows: auto minmax(0, 1fr); gap: 8px; }
.cr-lightbox::backdrop { background: #141614; }
html:has(.cr-lightbox[open]) { overflow: hidden; }
.cr-lightbox-bar { display: flex; justify-content: space-between; align-items: center; gap: 1rem; }
.cr-lightbox-count { margin: 0; font-size: 0.9375rem; font-variant-numeric: tabular-nums; }
.cr-lightbox-figure { display: grid; grid-template-rows: minmax(0, 1fr) auto; justify-items: center; gap: 8px; min-height: 0; margin: 0; padding: 0 60px; }
.cr-lightbox-figure img { min-height: 0; max-width: 100%; max-height: 100%; object-fit: contain; align-self: center; }
.cr-lightbox-figure figcaption { max-width: 60ch; text-align: center; font-size: 0.9375rem; }
.cr-lightbox-btn {
  display: grid; place-items: center; width: 44px; height: 44px; padding: 0; border-radius: 50%;
  border: 1px solid rgba(237, 239, 236, 0.45); background: rgba(20, 22, 20, 0.72); color: #EDEFEC; cursor: pointer;
}
.cr-lightbox-btn:hover { background: rgba(237, 239, 236, 0.14); }
.cr-lightbox-btn:focus-visible { outline: 3px solid #EDEFEC; outline-offset: 2px; }
.cr-lightbox-prev, .cr-lightbox-next { position: absolute; top: 50%; transform: translateY(-50%); }
.cr-lightbox-prev { left: max(12px, env(safe-area-inset-left, 0px)); }
.cr-lightbox-next { right: max(12px, env(safe-area-inset-right, 0px)); }
@media (max-width: 639px) { .cr-lightbox-figure { padding: 0; } .cr-lightbox-prev, .cr-lightbox-next { top: auto; bottom: max(12px, env(safe-area-inset-bottom, 0px)); transform: none; } .cr-lightbox-figure figcaption { padding-inline: 52px; } }

/* Map: the address in words, a drawn map (or a photo) and "Show map" until it's pressed (snapshot choice 4, A). */
.cr-map { margin: 0 0 var(--cr-space-sm); }
.cr-map-frame {
  position: relative; display: grid; place-items: center; aspect-ratio: var(--cr-map-ratio, 16 / 9);
  border-radius: var(--cr-radius); overflow: hidden;
  background: color-mix(in srgb, currentColor 6%, var(--cr-sec-bg, var(--cr-color-background)));
}
.cr-map-drawn {
  background:
    linear-gradient(90deg, transparent calc(46% - 6px), color-mix(in srgb, currentColor 13%, transparent) calc(46% - 6px) calc(46% + 6px), transparent 0),
    linear-gradient(0deg, transparent calc(60% - 5px), color-mix(in srgb, currentColor 13%, transparent) calc(60% - 5px) calc(60% + 5px), transparent 0),
    linear-gradient(118deg, transparent calc(32% - 3px), color-mix(in srgb, currentColor 9%, transparent) calc(32% - 3px) calc(32% + 3px), transparent 0),
    repeating-linear-gradient(0deg, transparent 0 47px, color-mix(in srgb, currentColor 6%, transparent) 47px 48px),
    repeating-linear-gradient(90deg, transparent 0 47px, color-mix(in srgb, currentColor 6%, transparent) 47px 48px),
    color-mix(in srgb, currentColor 5%, var(--cr-sec-bg, var(--cr-color-background)));
}
.cr-map-pin { color: var(--cr-sec-accent, var(--cr-color-primary)); transform: translateY(-18px); }
.cr-map-pin circle { fill: var(--cr-sec-bg, var(--cr-color-background)); }
.cr-bg-primary .cr-map-pin { color: currentColor; }
.cr-map-cover { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.cr-map-show { position: absolute; left: 1rem; bottom: 1rem; }
.cr-map-player { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; }
.cr-map-missing { max-width: 28ch; padding: 1rem; text-align: center; font-size: 0.875rem; }
.cr-map-info { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: flex-start; gap: 0.5rem 1.5rem; margin-top: var(--cr-space-xs); }
.cr-map-address { display: grid; gap: 0.125rem; font-style: normal; }
.cr-map-place { font-weight: 600; }
.cr-map-directions { margin-top: 0; padding-top: 0; }

@media (prefers-reduced-motion: reduce) { .cr-gallery-open:hover img { filter: none; } }
`;

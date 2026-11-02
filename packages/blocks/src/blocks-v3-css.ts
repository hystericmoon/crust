/**
 * CSS for the F078 blocks (Stats, Video, Table, Pricing) and the Icon list's
 * numbers. Published pages get it only when they use one
 * (`needsBlocksV3Css`, checked on the rendered HTML); the builder always has
 * it. Colours come from the section style the block sits in, so contrast is
 * checked once, at the section.
 */

/** Whether rendered page HTML uses any F078 class (whole class names only). */
export const needsBlocksV3Css = (html: string): boolean => /class="(?:[^"]*\s)?cr-(?:stats|video|table-wrap|pricing|numbered)(?=["\s])/.test(html);

export const BLOCKS_V3_CSS = `/* --- F078: Stats, Video, Table, Pricing, numbered list ------------------------------ */
.cr-stats {
  list-style: none; margin: 0 0 var(--cr-space-sm); padding: 0;
  display: grid; gap: var(--cr-space-md) 0;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
@media (min-width: 768px) { .cr-stats { grid-template-columns: repeat(min(var(--cr-stats-count), 4), minmax(0, 1fr)); } }
@media (min-width: 1024px) { .cr-stats { grid-template-columns: repeat(var(--cr-stats-count), minmax(0, 1fr)); } }
.cr-stat { display: flex; flex-direction: column; gap: 0.25rem; padding-inline: var(--cr-space-sm); min-width: 0; }
.cr-stats.cr-align-center .cr-stat { align-items: center; text-align: center; }
.cr-stats.cr-align-right .cr-stat { align-items: flex-end; text-align: right; }
.cr-stat-value {
  font-family: var(--cr-font-heading); font-weight: var(--cr-display-weight, var(--cr-heading-weight, 700));
  letter-spacing: var(--cr-display-track, -0.02em); line-height: 1; font-size: clamp(2.25rem, 5vw, 3rem);
  font-variant-numeric: lining-nums; overflow-wrap: anywhere;
}
.cr-stats-lg .cr-stat-value { font-size: clamp(2.75rem, 7vw, 4.25rem); }
.cr-stats-colour-primary .cr-stat-value { color: var(--cr-sec-accent, var(--cr-color-primary)); }
.cr-bg-primary .cr-stats-colour-primary .cr-stat-value { color: inherit; }
.cr-stat-label { font-weight: 500; }
.cr-stat-detail { font-size: 0.875rem; color: var(--cr-sec-muted, var(--cr-color-muted)); }
.cr-stats-lines .cr-stat { border-left: 1px solid color-mix(in srgb, currentColor 25%, transparent); }
/* No line before the first figure of a row (2 a row on phones, all in one row from tablets). */
.cr-stats-lines .cr-stat:first-child, .cr-stats-lines .cr-stat:nth-child(2n+1) { border-left: 0; }
@media (min-width: 768px) { .cr-stats-lines .cr-stat:nth-child(2n+1) { border-left: 1px solid color-mix(in srgb, currentColor 25%, transparent); } .cr-stats-lines .cr-stat:first-child { border-left: 0; } }
.cr-stats-lines.cr-align-left .cr-stat:first-child, .cr-stats-plain.cr-align-left .cr-stat:first-child { padding-left: 0; }
.cr-stats-boxes { gap: var(--cr-space-sm); }
.cr-stats-boxes .cr-stat {
  padding: var(--cr-space-sm); border-radius: var(--cr-radius);
  background: color-mix(in srgb, currentColor 6%, transparent);
}
.cr-stats-boxes .cr-stat-detail { color: inherit; }

.cr-video { margin: 0 0 var(--cr-space-sm); }
.cr-video-frame {
  position: relative; aspect-ratio: var(--cr-video-ratio, 16 / 9); max-width: 100%;
  border-radius: var(--cr-radius); overflow: hidden;
  background: color-mix(in srgb, currentColor 10%, var(--cr-sec-bg, var(--cr-color-background)));
}
.cr-video-frame > video, .cr-video-player { display: block; width: 100%; height: 100%; border: 0; object-fit: cover; background: #000; }
.cr-video-play { position: absolute; inset: 0; display: grid; place-items: center; color: inherit; text-decoration: none; cursor: pointer; }
.cr-video-cover { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.cr-video-button {
  position: relative; display: grid; place-items: center; width: 72px; height: 72px; border-radius: 50%;
  background: #fff; color: #111; box-shadow: 0 6px 24px rgba(0, 0, 0, 0.28); padding-left: 4px;
  transition: transform 0.15s ease;
}
.cr-video-play:hover .cr-video-button { transform: scale(1.06); }
/* Words on a photo sit on their own dark plate, so they read on any cover (4.5:1 or more). */
.cr-video-label {
  position: absolute; left: var(--cr-space-xs, 0.5rem); bottom: var(--cr-space-xs, 0.5rem); max-width: calc(100% - 1rem);
  background: rgba(0, 0, 0, 0.78); color: #fff; padding: 0.375rem 0.75rem; border-radius: 6px;
  font-size: 0.875rem; font-weight: 600; line-height: 1.3;
}
.cr-video-service { font-weight: 400; }
.cr-video-play:focus-visible { outline: 3px solid var(--cr-sec-ink, var(--cr-color-text)); outline-offset: 3px; }
.cr-video-play:focus-visible .cr-video-button { outline: 3px solid #fff; outline-offset: 3px; }
.cr-video-empty { display: grid; place-items: center; padding: var(--cr-space-sm); text-align: center; color: var(--cr-color-muted); border: 1px dashed var(--cr-color-muted); }
.cr-video figcaption { margin-top: var(--cr-space-xs); font-size: 0.875rem; color: var(--cr-sec-muted, var(--cr-color-muted)); }
@media (prefers-reduced-motion: reduce) { .cr-video-button { transition: none; } }

.cr-table-wrap { margin: 0 0 var(--cr-space-sm); max-width: 100%; overflow-x: auto; }
.cr-table-wrap:focus-visible { outline: 3px solid var(--cr-sec-ink, var(--cr-color-text)); outline-offset: 2px; }
.cr-table { width: 100%; border-collapse: collapse; font-variant-numeric: tabular-nums; }
.cr-table caption { text-align: left; font-family: var(--cr-font-heading); font-weight: var(--cr-heading-weight, 700); font-size: 1.125rem; padding-bottom: var(--cr-space-xs); }
.cr-table th, .cr-table td { text-align: left; vertical-align: top; padding: 0.625rem 0.875rem; border-bottom: 1px solid color-mix(in srgb, currentColor 22%, transparent); min-width: 6rem; }
.cr-table th:first-child, .cr-table td:first-child { padding-left: 0; }
.cr-table thead th { font-weight: 600; border-bottom: 2px solid currentColor; vertical-align: bottom; }
.cr-table tbody th { font-weight: 600; }
.cr-table .cr-num { text-align: right; }
.cr-table-stripes th:first-child, .cr-table-stripes td:first-child { padding-left: 0.875rem; }
.cr-table-stripes tbody tr:nth-child(odd) > * { background-image: linear-gradient(color-mix(in srgb, currentColor 6%, transparent), color-mix(in srgb, currentColor 6%, transparent)); }
.cr-table-stripes th, .cr-table-stripes td { border-bottom: 0; }
/* The first column stays in view while the rest scrolls. */
.cr-table-headers-both tbody th { position: sticky; left: 0; z-index: 1; background-color: var(--cr-sec-bg, var(--cr-color-background)); }
.cr-table-empty { padding: var(--cr-space-sm); color: var(--cr-color-muted); border: 1px dashed var(--cr-color-muted); border-radius: var(--cr-radius); }

.cr-pricing {
  list-style: none; margin: 0 0 var(--cr-space-sm); padding: 0;
  display: grid; gap: var(--cr-space-sm); grid-template-columns: minmax(0, 1fr); align-items: stretch;
}
@media (min-width: 768px) { .cr-pricing-n2, .cr-pricing-n3, .cr-pricing-n4 { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (min-width: 1024px) {
  .cr-pricing-n3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .cr-pricing-n4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
}
.cr-plan {
  display: flex; flex-direction: column; gap: var(--cr-space-xs); min-width: 0;
  padding: calc(var(--cr-space-sm) * 1.5); border-radius: var(--cr-radius);
  background: var(--cr-sec-bg); color: var(--cr-sec-ink);
  border: 1px solid color-mix(in srgb, currentColor 18%, transparent);
}
.cr-plan-highlight { box-shadow: 0 12px 32px rgba(0, 0, 0, 0.14); border-color: transparent; }
.cr-plan-name { margin: 0; font-family: var(--cr-font-heading); font-weight: var(--cr-heading-weight, 700); font-size: 1.25rem; line-height: 1.2; }
.cr-plan-badge {
  order: -1; align-self: flex-start; margin: 0; padding: 0.25rem 0.625rem; border-radius: 999px;
  background: var(--cr-btn-bg, var(--cr-color-primary)); color: var(--cr-btn-fg, var(--cr-color-onPrimary));
  font-size: 0.75rem; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase;
}
.cr-plan-price { margin: var(--cr-space-xs) 0 0; display: flex; flex-wrap: wrap; align-items: baseline; gap: 0 0.375rem; }
.cr-plan-amount {
  font-family: var(--cr-font-heading); font-weight: var(--cr-display-weight, var(--cr-heading-weight, 700));
  letter-spacing: var(--cr-display-track, -0.02em); font-size: clamp(2.25rem, 5vw, 2.75rem); line-height: 1;
}
.cr-plan-period { color: var(--cr-sec-muted, var(--cr-color-muted)); font-size: 0.9375rem; }
.cr-plan-desc { margin: 0; color: var(--cr-sec-muted, var(--cr-color-muted)); }
.cr-plan-features { list-style: none; margin: var(--cr-space-xs) 0 0; padding: 0; display: grid; gap: 0.5rem; }
.cr-plan-features li { display: flex; gap: 0.5rem; align-items: flex-start; }
.cr-plan-check { flex: none; margin-top: 0.15em; color: var(--cr-sec-accent, var(--cr-color-primary)); }
.cr-plan-button { margin-top: auto; align-self: stretch; }
.cr-plan-features { margin-bottom: var(--cr-space-sm); }

.cr-numbered > li { align-items: center; }
.cr-list-number { flex: none; font-variant-numeric: tabular-nums; font-weight: 600; }
.cr-numbers-circle .cr-list-number {
  display: inline-grid; place-items: center; width: 2rem; height: 2rem; border-radius: 50%; font-size: 0.875rem;
  background: var(--cr-btn-bg, var(--cr-color-primary)); color: var(--cr-btn-fg, var(--cr-color-onPrimary));
}
.cr-numbers-circle.cr-icon-text .cr-list-number { background: color-mix(in srgb, currentColor 10%, transparent); color: inherit; }
.cr-bg-primary .cr-numbers-circle .cr-list-number { background: var(--cr-color-onPrimary); color: var(--cr-color-primary); }
.cr-numbers-large .cr-list-number {
  min-width: 2.75ch; font-family: var(--cr-font-heading); font-weight: var(--cr-display-weight, var(--cr-heading-weight, 700));
  font-size: 2rem; line-height: 1; letter-spacing: -0.02em;
}
.cr-numbers-large.cr-icon-primary .cr-list-number, .cr-numbers-plain.cr-icon-primary .cr-list-number { color: var(--cr-sec-accent, var(--cr-color-primary)); }
.cr-bg-primary .cr-numbered.cr-icon-primary .cr-list-number { color: inherit; }
.cr-bg-primary .cr-numbers-circle.cr-icon-primary .cr-list-number { color: var(--cr-color-primary); }
.cr-numbers-plain .cr-list-number { min-width: 1.75ch; }
.cr-numbers-plain > li { align-items: flex-start; }
`;

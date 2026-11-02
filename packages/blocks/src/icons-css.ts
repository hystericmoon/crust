/**
 * CSS for the F077 blocks (Icon, Divider, Social links) and icons in lists,
 * cards and buttons. Published pages get it only when they use one
 * (`needsIconCss`, checked on the rendered HTML), so pages without icons
 * stay as light as before; the builder always has it.
 */

/**
 * Whether rendered page HTML uses any F077 class (whole class names only:
 * the older Icon list's `cr-icon-list` doesn't count, and its icons use the
 * base CSS).
 */
export const needsIconCss = (html: string): boolean => /class="(?:[^"]*\s)?cr-(?:svg|icon-block|icon|divider|social|card-icon|has-icon|button-icon)(?=["\s])/.test(html);

export const ICONS_CSS = `/* --- F077: Icons, Divider, Social links ------------------------------------------ */
.cr-svg { display: block; flex: none; }
.cr-icon-block { margin: 0 0 var(--cr-space-sm); display: flex; }
.cr-icon-block.cr-align-center { justify-content: center; }
.cr-icon-block.cr-align-right { justify-content: flex-end; }
.cr-icon { display: inline-grid; place-items: center; flex: none; }
/* Icons are graphics: accent or text colour of the section, checked at 3:1 (WCAG 1.4.11). */
.cr-icon-colour-primary { color: var(--cr-sec-accent, var(--cr-color-primary)); }
.cr-icon-colour-text { color: inherit; }
.cr-bg-primary .cr-icon-colour-primary { color: inherit; }
/* Badges use the section's button colours, which are already contrast-checked. */
.cr-icon-look-circle, .cr-icon-look-square {
  background: var(--cr-btn-bg, var(--cr-color-primary)); color: var(--cr-btn-fg, var(--cr-color-onPrimary));
  padding: calc(var(--cr-icon-px, 32px) * 0.45);
}
.cr-icon-look-circle { border-radius: 50%; }
.cr-icon-look-square { border-radius: var(--cr-button-radius, var(--cr-radius)); }
.cr-icon-look-circle.cr-icon-colour-text, .cr-icon-look-square.cr-icon-colour-text {
  background: color-mix(in srgb, currentColor 10%, transparent); color: inherit;
}
.cr-bg-primary .cr-icon-look-circle, .cr-bg-primary .cr-icon-look-square { background: var(--cr-color-onPrimary); color: var(--cr-color-primary); }
.cr-icon-size-sm { --cr-icon-px: 24px; }
.cr-icon-size-md { --cr-icon-px: 32px; }
.cr-icon-size-lg { --cr-icon-px: 48px; }
.cr-icon-size-sm.cr-icon-look-circle, .cr-icon-size-sm.cr-icon-look-square { padding: 10px; }
.cr-icon-link { display: inline-flex; min-width: 44px; min-height: 44px; align-items: center; justify-content: center; border-radius: 6px; color: inherit; }
.cr-icon-link:focus-visible { outline: 3px solid var(--cr-sec-ink, var(--cr-color-text)); outline-offset: 3px; }
.cr-icon-link:hover .cr-icon { filter: brightness(1.08); }
.cr-icon-named { display: inline-flex; }
.cr-card-icon { padding: var(--cr-space-sm) var(--cr-space-sm) 0; }
.cr-card-cover .cr-card-icon { display: none; }
.cr-button.cr-has-icon { gap: 0.5em; }
.cr-button-icon { flex: none; }

.cr-divider { margin-block: var(--cr-divider-space, var(--cr-space-md)); display: flex; align-items: center; gap: 1rem; color: var(--cr-sec-muted, var(--cr-color-muted)); }
.cr-divider-short { max-width: 6rem; }
.cr-divider-medium { max-width: 24rem; }
.cr-divider.cr-align-center { margin-inline: auto; justify-content: center; }
.cr-divider.cr-align-right { margin-left: auto; justify-content: flex-end; }
.cr-divider-line { border-top: 1px solid color-mix(in srgb, currentColor 45%, transparent); }
.cr-divider-accent { height: 4px; border-radius: 2px; background: var(--cr-sec-accent, var(--cr-color-primary)); max-width: 4rem; }
.cr-divider-accent.cr-divider-full { max-width: none; height: 2px; }
.cr-divider-label::before, .cr-divider-label::after { content: ""; flex: 1; border-top: 1px solid color-mix(in srgb, currentColor 45%, transparent); }
.cr-divider-text { font-size: 0.75rem; letter-spacing: 0.12em; text-transform: uppercase; font-weight: 600; color: var(--cr-sec-muted, var(--cr-color-muted)); white-space: nowrap; }
.cr-divider-dots { gap: 0.75rem; }
.cr-divider-dots i { width: 5px; height: 5px; border-radius: 50%; background: currentColor; }

.cr-social { list-style: none; margin: 0 0 var(--cr-space-sm); padding: 0; display: flex; flex-wrap: wrap; gap: 0.25rem 0.5rem; }
.cr-social.cr-align-center { justify-content: center; }
.cr-social.cr-align-right { justify-content: flex-end; }
.cr-social-link {
  display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem;
  min-width: 44px; min-height: 44px; padding: 0 0.25rem; border-radius: 999px;
  color: inherit; text-decoration: none; font-weight: 500;
}
.cr-social-names .cr-social-link { padding: 0 0.75rem 0 0.25rem; }
.cr-social-link:hover { color: var(--cr-sec-accent, var(--cr-color-primary)); }
.cr-bg-primary .cr-social-link:hover { color: inherit; text-decoration: underline; }
.cr-social-link:focus-visible { outline: 3px solid var(--cr-sec-ink, var(--cr-color-text)); outline-offset: 2px; }
.cr-social-mark { display: inline-grid; place-items: center; }
.cr-social-circle .cr-social-mark { width: 40px; height: 40px; border-radius: 50%; border: 1.5px solid currentColor; }
`;

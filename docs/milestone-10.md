# Milestone 10 (proposed): an easier editor

**Status: proposal.** Nothing here is in features.json until the owner says "add them" (CLAUDE.md: scope is the owner's).

The owner (2026-11-24) finds the editor "hard to use" (adding a section; knowing where things are) and likes how YOOtheme looks and works.
He does not want YOOtheme's builder itself (paid, closed software tied to WordPress/Joomla; DECISIONS 2026-11-24): he wants its look and its
way of working, and asked for more improvement than copying. Ideas only: no code, icons, names or pictures.

Design snapshot (direction B, refined): https://claude.ai/artifact/HPvK6t2a4bLW97MwfkAGzy (first version: https://claude.ai/artifact/3SHVDpiz7maCa6JKafr2kP).
Not checked: the live YOOtheme product beyond its public demo (builder, library, one element's settings).

## What already exists (code survey, 2026-11-24; Puck 0.23.0)

- The left rail is Puck's plugin nav, built by `railPlugins()` in `app-frame/rail.tsx:82`. Eight items: Add, Layers, Pages, Styles, Media, Blog, Site, Help.
- **Canvas "+" bars already exist**: `LayoutInserters` (`layouts/LayoutGallery.tsx:647`, drawn inside `overrides.iframe`); they call `openAddPanel(index)`.
- **Add by picture already exists** (F088): `layouts/AddSectionPanel.tsx`, data from `filterLayouts`, insert with `insertLayout` (`LayoutGallery.tsx:389`, a `setData` dispatch), and a gallery dialog (`openLayoutGallery`).
- Layers is Puck's stock `outlinePlugin`. `overrides.outline`, `componentOverlay` and `drawer` exist in Puck 0.23 and are not used yet. `actionBar` is used (`keyboard/KeyboardEditing.tsx`).
- The right sidebar is hidden by default (`ui.rightSideBarVisible: false`); settings use Puck's fields panel wrapped by `SettingsPanel` (`page-first/PageFirst.tsx:266`).
- So the trouble is findability and joining up, not missing features. Do not rebuild what exists.

## Proposed stages (one PR each, Sonnet, each needs the owner's review)

1. **Two places: This page and Your site.** Two rail places instead of eight icons. This page: the outline drawn as small layouts (custom
   `overrides.outline` or a plugin panel) with "+ Add section". Your site: Pages, Blog, Media, Look (Styles), Site settings, Help, each opening in
   the same panel with a back arrow that names where you came from (one panel at a time). Words follow F093 (no "GitHub" in screen text).
   Tests to update: `review-fixes.test.tsx`, `app-frame.test.tsx`, `add-section.test.tsx`, `layout-library.test.tsx`, `styles-panel.test.tsx`,
   `page-first.test.tsx`, `keyboard/puck-chrome.ts` (selector for the nav links), `scripts/check-builder-a11y.mjs` (clicks rail items by label).
2. **Add a section where you look.** The existing "+" bars become labelled ("Add section here"), always visible on touch and reachable by Tab; the
   selected section's toolbar (Puck `actionBar`) gets words (Move, Duplicate, Delete) next to the icons; "+ Add section" in the outline opens the same flow.
3. **One gallery to add sections from.** Merge the Add panel and the gallery dialog into one full-screen gallery: tabs Layouts / Mine, search and
   filters (type, topic), and an "Insert after <section>" choice with an Add button. The new section lands selected and is announced.
4. **A section's settings in the left panel (spike first).** Click a section, get its settings in the left panel under "← Outline", in plain
   fields (no code boxes). Not verified: whether Puck 0.23 exports a reusable fields component for a left plugin; the first step is a short spike
   and a note in DECISIONS. If it does not work cleanly, keep settings on the right and say so.

Every stage keeps: a keyboard alternative for every action (no dragging needed), visible names on every button, 24px targets, focus returning
after dialogs, motion off under reduce-motion, and `npm run check:builder` passing in light and dark.

# Milestone 8 — Premium design layer

Approved by the owner on 2026-11-02 ("Let's go A") from the gap page
https://claude.ai/artifact/ULmnd4JZEKpGvyUHFg1Kpo
(`design/yootheme-gap-v1.html`). Started from his feedback that our
templates don't feel premium next to eliras, zorven and
labzzy.webflow.io (`design/premium-gap-v1.html`,
https://claude.ai/artifact/FMb9QuLomsLCvQC9aZscf3).

## Goal

Give Crust what premium sites are made of, at the level of YOOtheme Pro
where it matters for the look, then remake Harbour, Signal and Corner on
it. Static output, accessibility enforced and $0 running cost stay.

## Why this order

The look first (fonts, type, styles), because that is most of the gap the
owner saw. Then sections, columns and motion; header and footer; icons
and new blocks; then content: the layout library, images, post and blog
designs, and a stricter template check. The template rebuild comes last so
it can use everything. The store (F063–F068) resumes after this
milestone; F063 now depends on F084.

## Features (in order)

| Feature | Notes |
|---|---|
| F070 Fonts | Bundled open-licence typefaces in tested pairs, served from the site itself, only the weights and characters used |
| F071 Type and detail styles | Display/headline styles, tracking to −0.05 em, eyebrow and mono labels, chips, button and card styles, radius and shadow scales |
| F072 Style library | About 12 complete looks with colour variations |
| F073 Sections v2 | Widths, colour/gradient backgrounds, muted video, focal point, overlap, transparent header |
| F074 Rows and columns v2 | Column backgrounds, padding, radius, alignment, gaps, phone order, dividers, sticky column |
| F075 Motion | Entrance effects with stagger, light parallax, hover lifts, marquee; CSS only |
| F076 Header and footer v2 | Six layouts, transparent, dropdowns, slide-in phone menu, top bar, footer from blocks |
| F077 Icons, Divider, Social | Lucide icons (ISC) inlined as SVG |
| F078 Stats, Video, Table and Pricing, Numbered list | Video loads only when pressed |
| F079 Slideshow, Card slider, Tabs, Lightbox, Map | A little JavaScript, only on pages that use them |
| F080 Layout library v2 | About 60 sections and 10 page layouts on the new layer |
| F081 Images: WebP, AVIF, focal point | At publish, in crust-publish |
| F082 Post, blog and 404 designs | Designed in the builder |
| F083 Stricter template check | Filler text, empty slots, mismatched crops, too few section types |
| F084 Rebuild Harbour, Signal and Corner | Full-length pages, finished copy |

## Rules for every feature

- Visual features start from a design snapshot (2–3 directions); Claude
  builds the recommended one unless the owner picks.
- Learn principles from premium references; never copy another
  designer's layouts, copy or photos.
- Shape changes to page JSON or site.json need a migration and a
  DECISIONS entry; sites made before keep looking the same.
- Accessibility (WCAG 2.2 AA): labels at least 12 px with 4.5:1
  contrast; text on photos and video gets a scrim; motion never hides
  content and stops under Reduce motion; nothing moves or plays sound on
  its own without a pause; sliders, tabs, menus and lightboxes work by
  keyboard and screen reader.
- Speed: Lighthouse performance stays at 95 or more; no JavaScript on
  pages that don't use an interactive block.
- Free and open-source only. Fonts are mostly under the SIL Open Font
  License (OFL 1.1), which is not in CLAUDE.md's licence list: F070
  may use them: the owner said yes on 2026-11-02.

## Not in Milestone 8

Free positioning (option C), collections such as Projects or Team (a
follow-up proposal), photo search (needs an API key), multilingual sites,
custom code.

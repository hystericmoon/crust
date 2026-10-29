# Milestone 2 — YOOtheme-style building

Approved by the owner on 2026-10-29 ("approve 1 2 3"). Visual explainer:
`design/m2-yootheme-vision.html` (also https://claude.ai/artifact/KwZuLhu69wGV3RLmxksESH).

## Goal

Build sites the way YOOtheme does (Section → Row → Column → Element, a
layout library, a deep style customizer) while keeping what Crust already
does better: static output with no server, accessibility checked before
publishing, $0 running cost, every save a version in Git.

## User stories

1. I insert a designed section from a library and it already matches my
   site style.
2. I give a section a background image, a height and a style (Page,
   Muted, Primary, Dark); text stays readable and contrast is checked.
3. I save a section I designed and reuse it on other pages.
4. I tune type, buttons and cards once and every page follows.
5. I set different column widths for desktop, tablet and phone, and hide
   blocks per device.
6. Settings are split into Content, Style and Advanced so simple edits
   stay simple.
7. My site has a header with a menu (also on phones, without JavaScript)
   and a footer.
8. I have more elements to build with: grid of cards, gallery, FAQ, icon
   list, logo row, quote, image overlay.
9. I export my style and layouts as one file and import it into another
   Crust site.

## Steps and features

| Step | Features |
|---|---|
| 1 · Look great fast | F025 Section styles, F026 Layout library, F027 My layouts |
| 2 · Design deeper | F028 Style customizer v2, F029 Per-device columns, F030 Content/Style/Advanced tabs |
| 3 · Full sites | F031 Header, footer and menu, F032 More elements, F033 Theme pack |

## Rules that carry over

- Blocks only: no raw HTML, no custom CSS in content. Layouts and theme
  packs are Crust JSON, never code.
- Interactive pieces work without JavaScript where possible (details/
  summary for FAQ and the phone menu); any JS is small, keyboard
  accessible and respects reduced motion.
- Shape changes to page JSON or site.json come with a migration and a
  DECISIONS.md entry.
- Visual features start from a design snapshot in `design/` that the
  owner picks a direction from, as F003 did.

## Not in Milestone 2

Slider/carousel (proposal: later, accessibility first), dynamic content
templates (blog, collections), HTML/CSS template import, media uploads.

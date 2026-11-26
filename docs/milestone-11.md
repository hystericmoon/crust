# Milestone 11 (proposed): a 2030 look

**Status: proposal.** The owner chose direction C on 2026-11-26 ("I choose your recommendation"). Nothing is in features.json until he says
"add them" (CLAUDE.md: scope is the owner's).

Goal: sites made with Crust can look like current Framer/Webflow work: big photography, large type, lots of space, calm motion tied to scrolling.
Ideas only; no code, names or pictures copied from those products.

Direction page (private): https://claude.ai/artifact/C93V5H6BpNAWySF4iJRyva

## What already exists

Motion level (Off / Subtle / Lively), section entrances (rise, zoom, slide), photo parallax, moving logo row, hover lift (`packages/blocks/src/motion.ts`):
CSS only, scroll-linked (`animation-timeline: view()`), inside `prefers-reduced-motion: no-preference`, text never fades. Do not rebuild this.

## Proposed stages (one PR each, Sonnet, each needs the owner's review; show a design snapshot before each visual stage)

1. **"Matte" look.** A new look in Style: large serif or grotesk headlines, wide margins, muted palette, text on photos with an automatic dark
   overlay that keeps WCAG AA contrast. Uses today's blocks. The owner judges it alone before anything else is built.
2. **Hero and reveal blocks.** Full-screen hero (photo, optional short video with a still fallback), image reveal on scroll, giant moving text line.
3. **Sideways gallery and pinned story.** Horizontal gallery that moves with vertical scroll; a pinned picture whose words change as you scroll.
   Each has a keyboard route and a no-motion version (stacked, normal flow).
4. **Flagship template ("showcase").** One finished template using the look and blocks. The template file ships only CC0 photos or neutral
   placeholders with clear "replace this photo" slots (the template check rejects missing photos, audit A100).
5. **Showcase site.** A hosted demo (like `home/content`) with striking photos, for the home page and screenshots. Photos are credited and kept in
   the hosted site only, not as loose files in the public repo and not in the downloadable template.

## Rules

- Free, open-source dependencies only; CSS first, no animation library unless a stage proves it needs one.
- Every effect: Reduce motion version, readable text over photos (WCAG 2.2 AA), keyboard access, no motion that hides content at rest.
- Photos: CC0 sources first (see DECISIONS 2026-11-04 photo notes). Pexels allowed under its licence for the hosted demo (owner, earlier decision).
  Unsplash stays out. pexels.com refuses this environment (403): the demo needs the owner's free Pexels API key or photo links he picks.
- Browsers without scroll-linked animation show the page still; that is accepted.

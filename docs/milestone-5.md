# Milestone 5 — Templates

Approved by the owner on 2026-10-30 ("Approve"). Proposal text:
DECISIONS.md, Proposals. Long-term roadmap:
https://claude.ai/artifact/4eHUDzJ3tDeeaNPBf4T4ii

## Goal

Milestone 4 made building real sites comfortable. Milestone 5 makes a
template a real, checkable thing: a complete site the owner designs in
Crust, saves as one file, checks automatically, and starts new sites
from. Selling templates comes later (Milestones 6–7).

## User stories

1. I save my whole site as one template file.
2. I mark sample text and photos as "replace me"; whoever uses the
   template sees what to replace, and can't publish until it's done.
3. I run one check that tells me whether a template is good enough to
   offer: accessible, readable, fast, with nothing left to replace.
4. I start a site from a template after previewing it at three widths,
   knowing exactly what it will replace.
5. Crust ships with a first starter template we designed together.

## Features (in order)

| Feature | Notes |
|---|---|
| F045 Save a site as a template | New file format (spec + DECISIONS entry); builds on theme packs (F033) |
| F046 Placeholder content | Publish check stops on leftovers |
| F047 Template quality check | `npm run check:template`, CI job, report page |
| F048 Start from a template | Design snapshot first; asks before replacing; undo via Git history |
| F049 First starter template | Design snapshot with 2–3 directions; the owner picks. Owner (2026-10-31): "All three": F049 is A Harbour |
| F050 Second starter template: Signal | Direction B of the F049 snapshot (added 2026-10-31) |
| F051 Third starter template: Corner | Direction C of the F049 snapshot (added 2026-10-31) |

Fixes from the owner's review of Milestones 2–4 are added as rework items
only when the owner asks (CLAUDE.md).

## Rules that carry over

- Free and open-source only; $0 running cost.
- Visual features start from a design snapshot in `design/`.
- Format changes come with a migration and a DECISIONS.md entry.
- Accessibility (WCAG 2.2 AA) and the publish checks stay required.

## Not in Milestone 5

Selling, licences, accounts and the desktop app (Milestones 6–7); the
gallery lightbox (still a proposal).

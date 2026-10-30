# Milestone 4 — Daily use

Approved by the owner on 2026-10-30 ("Approve"). Proposal text:
DECISIONS.md, Proposals. Long-term roadmap:
https://claude.ai/artifact/4eHUDzJ3tDeeaNPBf4T4ii

## Goal

Milestones 1–3 made the builder work. Milestone 4 makes it comfortable for
building real sites every day, before the owner designs templates in Crust
(Milestone 5). Templates will lean on rich text and linked sections.

## User stories

1. I sign out from the builder, and the builder itself passes the
   accessibility checks.
2. I add a ready-made FAQ, gallery, logo strip, features, testimonial or
   contact section in one click.
3. I write text with bold, italic, links and lists, using a toolbar or
   keyboard shortcuts.
4. I make a section once (say, a contact strip), use it on many pages, and
   edit it in one place.
5. My site lives at my own domain, and every link Crust makes uses it.

## Features (in order)

| Feature | Notes |
|---|---|
| F040 Builder tidy-up | Sign out, Puck chrome axe fixes, redirect back on restore |
| F041 Layouts for the new blocks | Layout library additions; layout a11y check |
| F042 Rich text in Text blocks | Design snapshot first; format change (migration + DECISIONS entry); free editor only |
| F043 Linked sections | Design snapshot first; format change (migration + DECISIONS entry) |
| F044 Custom domain | Buying the domain is the owner's step (BLOCKED.md) |

Fixes from the owner's review of Milestones 2–3 are added as rework items
only when the owner asks (CLAUDE.md).

## Rules that carry over

- Free and open-source only; $0 running cost (the domain itself is the
  owner's cost and choice).
- Visual features start from a design snapshot in `design/`.
- Format changes come with a migration and a DECISIONS.md entry.
- Accessibility (WCAG 2.2 AA) and the publish checks stay required.

## Not in Milestone 4

Gallery lightbox (still a proposal), full-site templates (Milestone 5),
anything for other users (Milestone 6), the store (Milestone 7).

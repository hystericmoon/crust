---
name: crust-audit
description: Run the Crust UI/UX audit end to end - inventory, automated capture and checks, heuristic review, triage, and the owner's visual report. Use when the owner asks for an audit, a UX review of the whole app, or a re-check after a milestone.
---

# Crust UI/UX audit

An audit finds problems and proposes fixes. It does NOT change the app and it
does NOT add items to `features.json` (scope is the owner's). Findings go to
`docs/audit/findings.json`; proposals to `DECISIONS.md` under "Proposals".
Plan, budget and status: `docs/audit/PLAN.md`. Screens: `docs/audit/inventory.md`.

## Who does what (token rule)

| Work | Model | Why |
|---|---|---|
| Inventory, screenshots, axe runs, contrast maths, touch-target and tab-order measurement, file moves | **Haiku** (Agent `model: "haiku"`) | mechanical, no judgement; output is data |
| Reading captures, applying the rubric, writing findings, alternatives | **Sonnet** (this session or a Sonnet agent) | judgement, but bounded by the rubric |
| Contested severity, information-architecture calls, conflicts between two heuristics | **Opus**, max 3 calls per audit, one batched question each | expensive; ask only when Sonnet can't settle it |

Give Opus the evidence (screenshot paths, the two options, the rubric lines in
tension), never the whole conversation. Record each Opus call in PLAN.md
"Opus budget". Haiku never decides severity; it reports numbers.

## Steps

1. **Inventory** (Haiku) - `docs/audit/inventory.md`: every screen, state, journey.
2. **Capture** (Haiku, scripts in `scripts/audit/`) - per screen, desktop 1440x900,
   tablet 820x1100, phone 390x800, light and dark: screenshot, axe-core result,
   list of interactive elements under 24x24 CSS px (WCAG 2.5.8) or under 44x44 on
   touch, a Tab-key walk (order, visible focus, traps), contrast of text pairs
   against the tokens. Output to the scratchpad `audit/<screen-id>/`, never into git.
   Reuse `scripts/check-builder-a11y.mjs` and `scripts/check-a11y.mjs`; do not rewrite.
3. **Review** (Sonnet), one journey at a time, using the rubric below on the captures.
4. **Triage** - dedupe, severity (S1 blocks a task or fails WCAG A/AA, S2 slows or
   confuses, S3 polish), effort (S/M/L). Escalate only per the table above.
5. **Report** (Sonnet) - a visual page for the owner (`artifact-design` skill):
   per decision, before/after drawn as UI, 2-3 alternatives, the recommendation
   marked, then a short chat summary. The owner is a visual thinker; no text-only
   option lists.
6. **Record** - `findings.json`, "Proposals" in `DECISIONS.md`, one-line status in
   PROGRESS.md. Fix work only when the owner says which findings to take.

## Rubric (what the reviewer checks on every screen)

**Usability (explain the reasoning in each finding; the owner is mid-level in UX)**
- Nielsen's 10 heuristics: status visibility (save state, publish progress),
  match with real-world words (no jargon: "section", not "component"), user
  control (undo, Esc, Back), consistency, error prevention, recognition over
  recall, flexibility (shortcuts), minimal design, helpful error messages, help.
- Onboarding: time to first success, what an empty state says and offers, one
  clear next step, skippable and recoverable.
- Forms: labels above fields, inline validation timing, required marks, defaults,
  error text says how to fix it.
- Dense lists/tables: scan order, sort/filter, row actions, bulk actions, empty
  and zero-result states, long names truncating.
- Settings: grouping, scope ("this page" vs "whole site") is always visible,
  destructive actions confirmed and reversible where possible.
- Navigation: where am I, how do I get back, the two places model (This page / Your site).
- Mobile: thumb reach, Quick edit scope, no hover-only controls.
- Writing: plain language for a non-developer, consistent verbs, no dead ends.

**Accessibility (WCAG 2.2 AA; always flag)**
- Contrast 4.5:1 text, 3:1 large text and UI components and focus rings, both themes.
- Target size >= 24x24 (2.5.8), prefer 44 on touch; spacing between targets.
- Keyboard: every action reachable, a keyboard alternative to every drag (2.5.7),
  visible focus not obscured (2.4.11), logical order, no traps, Esc closes.
- Names and roles: buttons vs links, labels, alt text, heading order, landmarks,
  dialogs (focus in, focus back), live regions for async results, no nested interactives.
- Motion and zoom: reduced motion honoured, reflow at 320px and 200% zoom, no
  horizontal scroll, text spacing overrides survive.
- Errors: not colour alone, announced, linked to the field (3.3.1, 3.3.3).

**Visual (peer-level, brief)** - hierarchy, spacing rhythm, type scale, token
use (no stray hex), state coverage (hover, focus, active, disabled, loading).

## Finding format (`findings.json`, one object each)

`id` (A001...), `screen` (S-id), `journey`, `title`, `severity` (S1-S3), `effort`
(S/M/L), `principle` (heuristic or WCAG number), `evidence` (capture path or
measurement), `why` (the user impact in one or two sentences), `options` (2-3,
each with a one-line trade-off), `recommended` (index), `status` ("open").

## Rules

- Evidence first: no finding without a capture, a measurement or a code line.
- Say what works too; the report opens with strengths.
- Quiet output: write results to files, return a summary of counts and the paths.
- Never print or open secrets or `.env` files; never publish or deploy from an audit.

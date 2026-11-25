# UI/UX audit plan

Status: **Gate 2 done, five decisions fixed (2026-11-25).** Owner picked the recommended option on all five; merged as PRs #103 to #107 (decision 4 as a variant, see DECISIONS). 7 findings fixed, 40 open (none S1). A100/A106 need a live check on the owner's Mac. Report: https://claude.ai/artifact/3z5gZQ86svBbzgMBoriYF3.
Visual plan for the owner: https://claude.ai/artifact/QkWLECje1aAKrrYsh7K3ay (private).
Method, checklist and model rules: `.claude/skills/crust-audit/SKILL.md`.
Screens (104) and 10 journeys: `docs/audit/inventory.md` (Haiku, read from code; rows marked "(inferred)" were not seen on screen).

## Steps
1. Inventory (Haiku): **done**.
2. Capture and measure (Haiku): screenshots 1440 / 820 / 390, light and dark; axe; targets under 24 px; Tab walk; contrast.
3. Review (Sonnet): one journey at a time against the rubric.
4. Triage (Sonnet; Opus for contested calls).
5. Report as pictures for the owner (before/after, 2-3 alternatives, recommendation marked).
6. Record: `findings.json`, "Proposals" in DECISIONS.md. The audit changes no code and adds nothing to features.json.

## Gates
- Gate 1: after a pilot of First run (area 1) and Page editor (area 3), the owner sees findings and real token cost.
- Gate 2: the owner picks which findings to take.

## Decided
Scope **B**: pilot First run (area 1) and Page editor (area 3), then the other 10 areas after Gate 1. No humans in any test (owner). Opus: max 3 calls (assumed, as the owner said). Plugins: Anthropic Design and Deque Axe, awaiting the owner's enable tap; community skills are not installed, their checklists are borrowed.

## No-people stand-ins
Naive-agent journey run (pilot: 3 journeys), cognitive walkthrough with four lenses, refute-each-S1 pass, scripted time/clicks/dead ends, label and message collection, accessibility beyond axe (tree, zoom, reflow, forced colours, reduced motion), stray-style scan, baseline screenshots. Every finding gets `confidence`: measured, reproduced or judged.

## Opus budget
Max 3 calls, one batched question each, evidence only. Used so far: 0.

## Token estimates (before running; actuals reported at Gate 1)
Haiku ~0.5-1M, Sonnet ~1-2M, Opus ~50-100k. Stop and ask if the pilot costs more than double.

## Pilot result (Gate 1)
Capture v1 was discarded after a spot-check found two script artifacts; v2 (scripts/audit/capture.mjs) was verified. Haiku about 340k tokens (measured). Opus used: 0 of 3. Not yet run: naive-agent journey run, four-lens walkthrough, wording review of collected labels; 4 screens not reachable (S04, S26, S28, S29). Report page: see the owner's Gate 1 artifact.

## Result (Gate 2)
Areas 2 and 4-12 reviewed by three Sonnet reviewers on capture v2 extended (39 screens reached); naive run in `docs/audit/naive-run.md`; Haiku about 200k tokens for the script work, Sonnet about 320k for review. Opus used: 0 of 3. A100 and A106 may be capture artifacts: check on the Mac. Not done: live-app checks, phone captures of S45/S76/S77, Opus calls (no S1, nothing to settle).

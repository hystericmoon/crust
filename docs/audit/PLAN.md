# UI/UX audit plan

Status: **plan awaiting the owner's answers** (2026-11-25). Nothing past step 1 has run.
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

## Open questions for the owner
Scope (A all, B pilot then scale, recommended, C editor and first run only); plugins (Anthropic Design + Deque Axe, or borrow checklists only); Opus limit (max 3 calls).

## Opus budget
Max 3 calls, one batched question each, evidence only. Used so far: 0.

## Token estimates (before running; actuals reported at Gate 1)
Haiku ~0.5-1M, Sonnet ~1-2M, Opus ~50-100k. Stop and ask if the pilot costs more than double.

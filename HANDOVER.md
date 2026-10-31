# Handover

The one file a new Crust session reads to pick up the work. Keep it
current: update "Where things stand" and "Next" every time a feature is
finished and before a session ends. Details live in the files linked
below; this file says where to look and what to do.

Last updated: 2026-10-31, after F048 (session "Crust: Milestone 5 — F048
onward").

## How sessions work (owner's rule, 2026-10-30)

The owner said: work in a single session; when a task is finished or the
session is getting full, start a new session and close the previous one;
always write the information down somewhere. So:

1. **One session at a time.** Only the newest Crust session works. When a
   session starts, it archives the session that created it
   (`archive_session`, the parent named in the handover prompt) and any
   other idle Crust session still open. Never archive sessions of other
   projects (Adwam, Whittle, OpenRef, Smol).
   **Limit found 2026-10-31:** a chain of sessions, each started by the
   one before, stops at depth 8. The F048 session was at the limit, so
   it could not start the next session or set reminders (send_later). If
   `create_session` is refused, tell the owner to start a fresh Claude
   Code session on the crust repo with the prompt from step 2; that
   resets the chain.
2. **Write first, then move.** After each finished feature (or when the
   context is getting long): commit and push, update this file,
   PROGRESS.md and CHANGELOG.md, then create the next session
   (`create_session`) with a short prompt that says "Read HANDOVER.md on
   branch <branch> and continue", plus anything not yet written here.
3. **Tell the owner** in plain language what was finished, what he can
   try, and that a new session took over (with its title).
4. Never stop without doing 2 and 3. "Keep on continuing, don't stop."

## The owner

Hosni (GitHub `hystericmoon`), senior product designer, not a developer.
Tests as a user from a browser (office Mac, phone); never runs commands.
Write to him in plain language, from a user's point of view. Peer-level on
visual design; explain the reasoning behind UX choices (heuristics,
research). Always flag accessibility.

Standing instructions:
- "Keep on continuing, don't stop": keep building the current milestone
  without waiting for him.
- Don't merge feature PRs to main, and don't press Publish on the live
  site, unless he says so in his own words.
- Scope is his: never add items to features.json. Proposals go in
  DECISIONS.md → Proposals.
- Design snapshots (Artifacts with 2–3 directions) before visual features;
  build Claude's recommended direction unless the feature says the owner
  must pick first.

## Rules that always apply

CLAUDE.md (session protocol, decision policy, engineering rules) and
docs/spec.md (the product and the content format). In short: one feature
at a time, tests for everything, its `done_check` must exit 0 before
`passes: true`, WCAG 2.2 AA, free open-source dependencies only, no
secrets in code or chat, work on branches, no force-push.

Start of every session: `scripts/init.sh`, then read this file,
PROGRESS.md, features.json, `git log --oneline -20`.

Before every push: `npm test`, `npm run typecheck`, `cargo test`,
`cargo clippy -- -D warnings`.

## Where things stand

- **Live site** https://crust-site.pages.dev: last published at
  Milestone 1. Only the owner decides when to publish.
- **Admin** https://crust-admin.pages.dev: main, Milestones 1–4
  (F001–F044) merged.
- **Milestone 5 "Templates"** (docs/milestone-5.md), F045–F049:

| Feature | Status | Branch / PR |
|---|---|---|
| F045 Save a site as a template | built, passes, CI green | `f045-template-file`, draft PR #33 (base main) |
| F046 Placeholder content | built, passes, CI green | `f046-placeholders`, draft PR #34 (stacked on #33) |
| F047 Template quality check | built, passes, CI green | `f047-template-check`, draft PR #35 (stacked on #34) |
| F048 Start from a template | built, passes | `f048-start-from-template`, draft PR #36 (stacked on #35) |
| F049 First starter template: Harbour | built, passes | `f049-starter-template`, draft PR #37 (stacked on #36) |
| F050 Second starter template: Signal | next | owner chose "All three" (2026-10-31) |
| F051 Third starter template: Corner | after F050 | |

- **Merge order when the owner says so:** #33, then #34, then #35, then #36 (GitHub
  retargets each to main as the one below merges), then the rest in
  feature order. Each later PR is stacked
  on the one before it.
- **Waiting on the owner:** see PROGRESS.md "Waiting on the owner"
  (preview links to try, F034–F046 still need `reviewed: true`), and
  BLOCKED.md (F037 contact form email setup, F044 buying a domain).
- **Design snapshots so far:** roadmap
  https://claude.ai/artifact/4eHUDzJ3tDeeaNPBf4T4ii, F042
  https://claude.ai/artifact/1d1Ujx7ENSrGCef6CWfg9Z, F043
  https://claude.ai/artifact/DSXzme9pbKie3guoRpSizj (A built for both), F048
  https://claude.ai/artifact/JQoY8bbRJ9U58jZawRx2kV (A built).

## Next

1. On start: subscribe_pr_activity to #33–#36 and fix any red CI
   (reproduce locally first). All four were green at handover.
2. **F050 Signal, then F051 Corner.** Branch F050 from
   `f049-starter-template` (PR base it), F051 from F050. Add a
   `StarterSpec` to `scripts/starter-templates/starter.ts` (look,
   business name, headline, image colours from the snapshot
   https://claude.ai/artifact/JFfJLZ3Va9hoPNkdwUeFnH, direction B or C),
   add it to `starters`, run `npm run build:starters`, then the
   done_check `npm test -- starter-template && npm run check:template`.
   Signal has a dark opening section (heroStyle "dark"); its orange is
   closest to the contrast limit. If a local test can't see a new
   templates/ file, delete node_modules/.vitest-cache (stale cache).
3. When F045–F049 are all built: tell the owner what's waiting (preview
   links, snapshot choices, merge order #33 → #39).

Notes from F048 for whoever builds on it: templates in the gallery come
from `apps/admin/src/templates/sources.ts`; applying is
`apps/admin/server/template.ts` (`/api/template`); the builder a11y check
(`scripts/check-builder-a11y.mjs`) needs `npm run build` first, or it
tests a stale build.

## Where to find things

| What | File |
|---|---|
| Product, architecture, content format | docs/spec.md |
| Milestone plan | docs/milestone-5.md (earlier: docs/milestone-*.md) |
| Every feature, its done_check and status | features.json |
| What happened, what the owner should test | PROGRESS.md |
| Why things are the way they are | DECISIONS.md |
| What only the owner can do | BLOCKED.md |
| User-visible changes | CHANGELOG.md |
| Setup guides for the owner | docs/setup-*.md |

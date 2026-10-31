# Handover

The one file a new Crust session reads to pick up the work. Keep it
current: update "Where things stand" and "Next" every time a feature is
finished and before a session ends. Details live in the files linked
below; this file says where to look and what to do.

Last updated: 2026-10-31 night (Jakarta): live-site publish checked (run 3
succeeded); M6/M7 written (docs/milestone-6.md, -7.md, F054–F068); F053
photo hunts and the delegated review running. Branch
`claude/peaceful-shannon-x32vlp`, PR #42.

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

- **Live site** https://crust-site.pages.dev: published 2026-10-31
  (Milestones 1–5). Only the owner decides when to publish.
- **Admin** https://crust-admin.pages.dev: main, Milestones 1–5
  (F001–F051) merged (Milestone 5: PRs #33–#39, 2026-10-31).
- **Milestone 5 "Templates"** (docs/milestone-5.md), F045–F049:

| Feature | Status | Branch / PR |
|---|---|---|
| F045 Save a site as a template | built, passes, CI green | `f045-template-file`, draft PR #33 (base main) |
| F046 Placeholder content | built, passes, CI green | `f046-placeholders`, draft PR #34 (stacked on #33) |
| F047 Template quality check | built, passes, CI green | `f047-template-check`, draft PR #35 (stacked on #34) |
| F048 Start from a template | built, passes | `f048-start-from-template`, draft PR #36 (stacked on #35) |
| F049 First starter template: Harbour | built, passes | `f049-starter-template`, draft PR #37 (stacked on #36) |
| F050 Second starter template: Signal | built, passes | `f050-signal-template` (stacked on #37) |
| F051 Third starter template: Corner | built, passes | `f051-corner-template` (stacked on F050) |

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
  https://claude.ai/artifact/JQoY8bbRJ9U58jZawRx2kV (A built), F052
  https://claude.ai/artifact/FksfsnM6msMtjBu4v5YHDm (waiting).

## Next

The owner approved a lot on 2026-10-31 evening; see DECISIONS.md
"Free Crust, desktop app, M6 and M7 approved". In order:

1. **F053 Signal and Corner with real photos** (features.json). Same
   process as F052 (DECISIONS.md "F052 photos and snapshot"): CC0 photo
   picks (Wikimedia Commons API, NegativeSpace category pages,
   Skitterphoto: full size via its download form with the page's
   _token; StockSnap/Pexels refuse automated requests here), comparison
   page, design snapshot with directions per template, owner approves,
   build in `scripts/starter-templates/starter.ts` (generalise
   `photos` per spec; Harbour's `homeWithPhotos`/`workWithPhotos` are
   Harbour-shaped), `npm run build:starters`, done_check.
2. ~~Write Milestones 6 and 7~~ done 2026-10-31 (F054–F068; F054 depends
   on F048 so M6 can start while F053 waits for the owner). Next feature
   after F053's approval wait: **F054 Content store**.
3. ~~Review the 48 `needs_review` features~~ done 2026-10-31: all have
   `reviewed: true` + `review_note`; 12 fixes in DECISIONS.md
   Proposals "From the review"; page for the owner
   https://claude.ai/artifact/53YM8oVKV9XrECZJSNHo1J
   (`design/review-2026-10-31.html`). **Waiting for the owner: A (one
   fix batch 1–10 now, recommended), B (1–5 only) or C (later).** Only
   he adds the rework item to features.json.
4. ~~Live site publish~~ checked: run 3 succeeded, site up.

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

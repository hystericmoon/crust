# Handover

The one file a new Crust session reads to pick up the work. Keep it
current: update "Where things stand" and "Next" every time a feature is
finished and before a session ends. Details live in the files linked
below; this file says where to look and what to do.

Last updated: 2026-10-31, F052 photos and design snapshot done, waiting
for the owner's pick (session "F052 Harbour rework", branch
`claude/peaceful-shannon-x32vlp`, stacked on PR #40).

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

1. On start: archive the previous session (archive_session; it's named in
   the handover prompt). PR #40 is notes only; merge it only when the
   owner says so. The F052 branch `claude/peaceful-shannon-x32vlp` is
   stacked on it (its PR targets `m5-merged-notes`).
2. **F052 Harbour, premium-minimal rework**, in BLOCKED.md until the
   owner picks a direction in the snapshot
   https://claude.ai/artifact/FksfsnM6msMtjBu4v5YHDm
   (`design/f052-harbour-rework-v1.html`). Done so far:
   a. **Photos done:** ten CC0 photos from Wikimedia Commons, cropped
      (tall ones 4:5, wide ones 16:10) and in
      `scripts/starter-templates/photos/` with `CREDITS.md`. Why these and
      what was left out: DECISIONS.md "F052 photos and snapshot". `river.jpg`
      is only used by direction B; drop it if A is picked. `shadows.jpg`
      and `river.jpg` are ~650 KB (fine texture); try 1600 px if
      Lighthouse or the template size complains.
   b. **Snapshot done:** A Daylight (recommended) / B Shoreline.
   b2. **Round 2 photos** (owner asked to also search NegativeSpace,
      Skitterphoto; Pexels allowed but blocked here, needs an API key):
      comparison https://claude.ai/artifact/2hkW4FDzmjPcXuzjYG4FYS.
      Recommended swaps: vaults→balconies, grid→angles (grid moves to
      Work), spiral→wood-spiral, cubes→white-stair,
      lake-house→pool-house, studio-desk→home-office; B hero
      river→lake-pier. New files are already in `photos/`, credits in
      CREDITS.md "Round 2". Delete the losing files once the owner
      confirms.
   c. **To build after the pick** (in `scripts/starter-templates/starter.ts`,
      Harbour only; Signal and Corner keep their stand-ins):
      - `buildStarter` reads photos from `photos/` for Harbour instead
        of `standIn()`; media entries get real width/height and alt
        text that describes the photo (still `placeholder`-marked).
      - Home (A): hero Section `imageSrc` terraces, style background,
        tint light, height large, valign bottom; H1 + one line + a
        rich-text link "See the work". Statement band (h2, text only).
        "Recent work" h2 + link, then Columns equal: Image vaults |
        Images grid + spiral (no captions on home). Services as
        Columns 3 (h3 + one line + link "More on …"), not boxed cards.
        Journal cue: Columns one-two, Image shadows | eyebrow, post
        title h2, date, link. "Join us" line. Contact strip.
      - Work: text hero, mosaic (vaults | grid + spiral), statement
        line, mirrored mosaic (lake-house + window-tree | cubes).
      - About uses studio-desk; post cover = shadows.
      - The Replace me marks stay as in F049. Then `npm run
        build:starters`, the done_check, and tests for the photo
        wiring (credits listed for every Harbour photo file, alt text
        present, no stand-ins left in Harbour).
3. Proposals waiting for the owner: header over hero photo, latest posts
   block, highlight-link fix (DECISIONS.md → Proposals).

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

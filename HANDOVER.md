# Handover

The one file a new Crust session reads to pick up the work. Keep it
short (under ~150 lines): update "Where things stand" and "Next" when a
feature is finished, and move the finished feature's notes to
docs/archive/handover-history.md.

**Start of every session (and after every `/clear`):** the `crust-start`
skill (`.claude/skills/crust-start/SKILL.md`). While building:
`crust-lean`. Finishing: `crust-finish` (it holds the "Ready to clear"
message the owner asked for every time). Content JSON: `crust-content-format`.

## Checkpoint (2026-11-06, Mac app fix waiting for the owner's try)

Carry on from here instead of picking a feature.

- **Cause found (DECISIONS 2026-11-06 "Mac app won't open"):** the Mac
  installer's app was "not signed at all" as a bundle, so macOS knew it by a
  random name, and Crust touches Documents before its window opens. Owner:
  Apple chip, macOS 27.2, nothing blocked in Privacy & Security.
- **Fixed in d28ca57:** `bundle.macOS.signingIdentity: "-"` (free ad-hoc
  signature) and `open_sites_or_fallback` in crates/crust-desktop/src/lib.rs
  (sites go to the app's data folder if Documents can't be used). Tests added.
- **Launch test (desktop-smoke.yml, run 42158333443) passed:** a fresh
  download shows Apple's "Crust Not Opened" box (expected without a $99
  Developer ID, the owner's call); after "Open Anyway" the welcome screen
  shows and macOS names the app `app.crust.desktop`.
- **Mac installer for the owner:** desktop-release.yml run 42159771953
  (mac only, not on the downloads site), from this branch. Give him the
  run's artifact link and the "Open Anyway" steps; wait for his try.
- **Then:** remove the temporary `push` trigger from desktop-smoke.yml,
  CHANGELOG/PROGRESS, crust-finish. PR #81 carries all of it.
- **Review round two** (page: https://claude.ai/artifact/H27p62B6N3YTjLbLAz8Wxp,
  no answers stored there): still open F075 (his phone test) and F078 (his
  call: pass as is, tab stop only when the table overflows, or a "no speech"
  tick, which needs a migration). F055's "GitHub" wording (about 70 strings)
  waits until he has tried the app.

## Model plan (owner, 2026-11-03)

The owner picks the model per feature; `crust-start` checks it before
any work.

| Next feature | Model | Why |
|---|---|---|
| (none yet) | — | Milestone 7 is complete; the owner picks what's next |

Every row of the plan confirmed on 2026-11-03 (F063–F068) is built.
The message after every `/clear` stays the same: "Read HANDOVER.md on
branch <branch> and continue" (branch below, under "Last updated").

Last updated: 2026-11-05 (Jakarta), branch `ccr-d50f7e80-weuq18` (restarted
from main after PR #79). **Everything is merged to main** (PRs #70-#79; none
open). **The store launches free:** all three templates are Free, one short
Licence page, no Terms/Refunds/Draft banner (DECISIONS "Store launches
free"; the paid-store pages and the F068 gate stay in the code and return
when a template gets a price). Publish store was run on main with real
payments off (result in PROGRESS "Current"). **Owner's words:** "everything
free right now, later we do something about the paid template". Still open
for the owner: Passes for F055, F062, F063, F071, F075, F078, F080 (the
visual review); re-publishing the live site (only on his word); a
real-device try of the desktop app and real hosts. The F068 wording, seller
name and contact email are only needed once something is priced.
**Next: nothing unbuilt.** Ask the owner what comes next (Milestone 8 plan:
docs/milestone-8.md; `npm run next`).

## Where things stand

- **main** has everything, through PR #79 (2026-11-05). From now on:
  **one PR per feature**, the session branch restarted from main after each
  merge.
- **Live site** https://crust-site.pages.dev, published 2026-10-31. Only
  the owner publishes.
- **Admin** https://crust-admin.pages.dev (main). Preview of the session
  branch: https://ccr-d50f7e80-weuq18.crust-admin.pages.dev (can't save).
- **Store** (F063-F068) is free and was published from main on 2026-11-05
  (Publish store, real payments off) to https://crust-store.pages.dev; if
  that address doesn't load, check the run in Actions. Three free templates,
  one Licence page. Paid-store pages return when a template gets a price.
- **Repository is public** since 2026-11-03 (owner; free CI). Never commit
  paid template files while public; make CI lighter before it goes
  private again (DECISIONS "Repository public for now").
- **Desktop app** (F055–F062) built and tested in CI, never installed by
  the owner; installers cost ~150 Actions minutes (ask first).
- **Review round** for 26 features:
  https://claude.ai/artifact/C3czUd4fpf5Qz6t2WqAkwZ (PROGRESS.md
  "Waiting on the owner" says how to read the answers). Check it at the
  start of a session: record each `pass` as `reviewed: true` in
  features.json (with the owner's note as `review_note`), list each
  `fix` for the owner and ask before reworking.
- Owner-facing notes still open: Pagefind brings minicbor (BlueOak) and
  Tauri MPL-2.0 packages (allowed since 2026-11-02); F058/F059 never tried
  against a real host; F061 never tried with a real release.

## Next

**No unbuilt features.** Milestone 7 (store) is complete. Ask the owner
what to build next; scope is his. Waiting on him: the F068 wording
choices, the review round, and the store/delivery setup in BLOCKED.md.

## Where to find things

| What | File |
|---|---|
| Product, architecture, content format | docs/spec.md (skill `crust-content-format`) |
| Session routines | .claude/skills/crust-*/SKILL.md |
| Milestone plans | docs/milestone-7.md, docs/milestone-8.md (earlier: docs/milestone-*.md) |
| Next feature, model, review queue | `npm run next` (scripts/next-feature.ts) |
| Every feature, its done_check and status | features.json |
| Current state, what the owner should test | PROGRESS.md |
| Why things are the way they are | DECISIONS.md (search by feature id) |
| What only the owner can do | BLOCKED.md |
| User-visible changes | CHANGELOG.md |
| Older handover and progress notes | docs/archive/ |
| Setup guides for the owner | docs/setup-*.md |

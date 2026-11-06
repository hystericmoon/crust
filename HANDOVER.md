# Handover

The one file a new Crust session reads to pick up the work. Keep it
short (under ~150 lines): update "Where things stand" and "Next" when a
feature is finished, and move the finished feature's notes to
docs/archive/handover-history.md.

**Start of every session (and after every `/clear`):** the `crust-start`
skill (`.claude/skills/crust-start/SKILL.md`). While building:
`crust-lean`. Finishing: `crust-finish` (it holds the "Ready to clear"
message the owner asked for every time). Content JSON: `crust-content-format`.

## Model plan (owner, 2026-11-03)

The owner picks the model per feature; `crust-start` checks it before
any work.

| Next feature | Model | Why |
|---|---|---|
| F085 App look: dark and light themes | Opus | Design judgement; tokens for everything after |
| F086 One app frame and top bar | Opus | Autosave and the app shell |
| F087 Page first | Opus | Editor behaviour |
| F088 Add section, by picture | Sonnet | Reuses the layout gallery |
| F089 One-row section toolbar | Sonnet | Contained |
| F090 Type on the page | Opus | Hardest: inline editing in the canvas |
| F091 Pages panel | Sonnet | Contained |
| F092 Styles panel and Site settings sheet | Sonnet | Regrouping existing panels |
| F093 Words and accessibility sweep | Sonnet | Sweep |

Milestone 9 approved 2026-11-06 (docs/milestone-9.md); models are
Claude's recommendation, the owner can change any row.

Every row of the plan confirmed on 2026-11-03 (F063–F068) is built.
The message after every `/clear` stays the same: "Read HANDOVER.md on
branch <branch> and continue" (branch below, under "Last updated").

Last updated: 2026-11-06 (Jakarta), branch `ccr-d50f7e80-weuq18`. **PR #81
open** (review fixes, Mac launch test, Mac app fix); CI green; the owner
merges. **The Mac app opens on the owner's Mac** (Apple chip, macOS 27.2)
with the installer from desktop-release run 42159771953 (artifact
`crust-mac`, expires 2026-12-06): it was unsigned as a bundle and hung at
start-up; now ad-hoc signed, with a Documents fallback (DECISIONS
2026-11-06). **Owner's words (2026-11-06):** "the ui ux for the app itself
is not very nice and friendly. we need to see how squarespace, wix,
webflow made theirs. compare with us. use the best claude skills to
redesign ours." That is the next piece of work (see Next).

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
- **Desktop app** (F055–F062) installed and opened by the owner on
  2026-11-06. The welcome screen shows; a fresh download needs "Open
  Anyway" once (no Apple Developer ID; $99/year, his call). Mac launch
  test: Actions → Desktop launch test (by hand). Repo public, so installer
  runs are free; mac-only runs are quicker.
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

### Milestone 9 "Friendly app" (approved 2026-11-06)

Owner: "Go with your recommendation" + React Bits look with light and dark
mode. Features F085–F093 in features.json; plan in docs/milestone-9.md;
snapshot of the direction: https://claude.ai/artifact/EHnrnPwVaMRv9GRGpaXWLx.
React Bits code can't be used (MIT + Commons Clause): aesthetic only
(DECISIONS 2026-11-06). Next: F085, design snapshot first.
PR #81 (review fixes, Mac app fix, redesign research) is still open for
the owner to merge; after the merge, restart the branch from main.
Still waiting on him: F075 (phone test) and F078 (his call) from review
round two (https://claude.ai/artifact/H27p62B6N3YTjLbLAz8Wxp).

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

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
| (none yet) | — | Milestone 7 is complete; the owner picks what's next |

Every row of the plan confirmed on 2026-11-03 (F063–F068) is built.
The message after every `/clear` stays the same: "Read HANDOVER.md on
branch <branch> and continue" (branch below, under "Last updated").

Last updated: 2026-11-04 (Jakarta), branch `ccr-d50f7e80-weuq18` (restarted
from main after PR #75). **Review-round audit fixes are all merged to main**
(PRs #70–#75): Claude ran the impeccable and taste skills over all 27
features (pre-check page https://claude.ai/artifact/8dZtVHYbMurMgcgXhYauJb)
and fixed F071, F072, F073 (video button), F074, F078, F057, F056, F058,
F059, F060, F062, F063, F066, F068 (titles), F081, F084 (see DECISIONS
"review fixes"). Nothing is `reviewed: true` except F070; the owner still
Passes or flags each on the review round page. Left for the owner: F073 Full-
width heading alignment, F075 motion feel, F068 section-heading scale and
wording approval, thin Studio photos, F078 video poster field (needs a new
builder field), publishing the store (Actions → Publish store) and the site.
Earlier: 2026-11-03 ~23:45 (Jakarta), branch
`ccr-d50f7e80-weuq18` (restarted from main after PR #69 merged; F068
only). Last feature: **F068 Licence, terms and refunds built, passes,
wording is a draft** (DECISIONS "F068"). How it fits:
`scripts/store/legal.ts` (`LEGAL` settings: `approved`, `seller`,
`contact`, `refundDays`; `licencePage`/`termsPage`/`refundsPage`;
`buyLegalLine` under every buy button via `afterBuy` in model.ts;
`legalGate` in `checkout-check.ts` refuses live mode until approved);
footer column "Buying"; "Read the full licence" on template pages. Tests:
`scripts/store/store-legal.test.ts`. When the owner approves: set `LEGAL`
(date, seller, contact), run `npm run build:store`, commit the pages.
**Next: nothing unbuilt.** Ask the owner what comes next (Milestone 8
plan is docs/milestone-8.md; check `npm run next`).



## Where things stand

- **main** has everything through F067 (PR #69 merged 2026-11-03, owner's
  request; F068 is in its own PR). From now on: **one PR per feature**, new branch or the
  session branch restarted from main after each merge.
- **Live site** https://crust-site.pages.dev, published 2026-10-31. Only
  the owner publishes.
- **Admin** https://crust-admin.pages.dev (main). Preview of the session
  branch: https://ccr-d50f7e80-weuq18.crust-admin.pages.dev (can't save).
- **Store** (F063–F068) built, not online: the owner runs Actions →
  Publish store (BLOCKED.md). Licence/terms/refund wording is a draft
  until the owner approves it (snapshot
  https://claude.ai/artifact/DAmwsHC4W4CcGXzH4DDCij).
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

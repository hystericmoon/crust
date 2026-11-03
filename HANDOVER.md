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
| F063 Store site | Opus | Design snapshot, the public face of the store |
| F065 Template versions | Sonnet | Well-defined data and checks |
| F066 Checkout | Opus | Payments and security |
| F067 Delivery and updates | Opus | Licences, downloads, security |
| F068 Licence, terms and refunds | Opus | Legal wording for the owner to decide |

The owner confirmed all six rows as listed ("go ahead", 2026-11-03
10:50 Jakarta); they are no longer just suggestions.
The message after every `/clear` stays the same: "Read HANDOVER.md on
branch <branch> and continue" (branch below, under "Last updated").

Last updated: 2026-11-03 ~21:45 (Jakarta), branch
`ccr-d50f7e80-weuq18` (PR #69, F067 only; not merged). Last feature:
**F067 Delivery and updates built, passes** (DECISIONS "F067"). How it
fits: `packages/delivery/src/worker.ts` (`handle` routes `POST /webhook`,
`GET /d/<token>` page and `/d/<token>/file`; `standardSigned` (Polar,
Standard Webhooks) / `lemonSigned`; `readEvent`; KV `keys`: `template:`,
`file:`, `order:`, `link:`; `deliveryEmail`, `downloadPage`); Publish
store step `scripts/store/delivery-kv.ts upload` (`scripts/store/delivery.ts`
`deliveryPairs`, `batches`, `namespaceId`, `upload`); deploy workflow
`.github/workflows/delivery-worker.yml` (PROVIDER/MODE from
`store/list.json` checkout). Owner steps: docs/setup-delivery.md
(BLOCKED.md). Polar field names are from its docs, not tried against a
real sandbox yet. Tests: `packages/delivery/src/delivery.test.ts`,
`scripts/store/delivery.test.ts`. The FTPS test port fix shipped in the
same PR (`passive_range()` in crates/crust-desktop/src/ftp/tests.rs).
**Next: F068 Licence, terms and refunds** (Opus).



## Where things stand

- **main** has everything through F066 (PR #66 merged 2026-11-03, owner's
  request). From now on: **one PR per feature**, new branch or the
  session branch restarted from main after each merge.
- **Live site** https://crust-site.pages.dev, published 2026-10-31. Only
  the owner publishes.
- **Admin** https://crust-admin.pages.dev (main). Preview of the session
  branch: https://ccr-d50f7e80-weuq18.crust-admin.pages.dev (can't save).
- **Store** (F063–F067) built, not online: the owner runs Actions →
  Publish store (BLOCKED.md).
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

**F068 Licence, terms and refunds** (Opus; the last Milestone 7 feature).
Claude drafts plain-language licence (for example one site vs unlimited
sites for agencies), terms and refund pages for the store with options,
in a snapshot; the owner decides the wording and prices (BLOCKED.md).
Link them from checkout (`licence` in store/list.json, F063) and every
template page. The refund wording should match F067: a full refund
switches the download page off.

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

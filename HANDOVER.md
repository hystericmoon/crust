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

Last updated: 2026-11-03 ~17:30 (Jakarta), branch
`ccr-d50f7e80-weuq18` (restarted from main after PR #66 merged; PR #68
open). Latest round, at the owner's request ("do a, b and d" on
https://claude.ai/artifact/D2h2rdzR4iQU6dQv7TyWqV): session routines are
project skills in `.claude/skills/`, docs/spec.md no longer loads at
start, `scripts/verify.sh` gives short check output, checkpoint and
`/clear` at ~200k, unused skill packs hidden for this project
(DECISIONS "Token saving"). Earlier: PR #66 merged, start-up files
slimmed, review round page built. Last feature: **F066 Checkout built,
passes, test mode** (merged in PR #66; DECISIONS "F066"). Snapshot https://claude.ai/artifact/6QAvaWHcuU26fgCfCrZVdw (A
built: Polar; test note under the button). How it fits:
`scripts/store/checkout.ts` (`PROVIDERS` polar/lemonsqueezy with link
shapes per mode and how the template id is added, `readCheckout`,
`buyLinkProblem`, `checkoutUrl`, `testNote`, `checkoutLine`,
`checkoutGate`, `THANKS_PATH`), `store/list.json` `checkout` (Polar,
test), model.ts `readStoreList` checks links, `templatePage` `afterBuy`,
`thanksPage` (only with a priced template), `storePages(templates,
checkout)`, load.ts returns `checkout`; gate script
`scripts/store/checkout-check.ts`, run by Publish store before rendering
with input `real_payments` → `CRUST_REAL_PAYMENTS`. Tests:
`scripts/store/checkout.test.ts`. Polar link shapes are from its docs, not
tried against a real sandbox yet (no account): the first real link may
need a small fix in `PROVIDERS.polar.matches`. Needs `reviewed: true`.
**Next: F067 Delivery and updates** (Opus): Worker checks the provider's
signed "order paid" message (Polar uses Standard Webhooks signatures;
template id in `reference_id` metadata), emails a personal download page
(Resend), serves the file from Workers KV. Needs the owner's Polar account
for real tests; build and test against fakes first.



## Where things stand

- **main** has everything through F066 (PR #66 merged 2026-11-03, owner's
  request). From now on: **one PR per feature**, new branch or the
  session branch restarted from main after each merge.
- **Live site** https://crust-site.pages.dev, published 2026-10-31. Only
  the owner publishes.
- **Admin** https://crust-admin.pages.dev (main). Preview of the session
  branch: https://ccr-d50f7e80-weuq18.crust-admin.pages.dev (can't save).
- **Store** (F063–F066) built, not online: the owner runs Actions →
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

**F067 Delivery and updates** (Opus): a Worker checks the provider's
signed "order paid" message (Polar uses Standard Webhooks signatures;
the template id is in `reference_id` metadata), emails a personal
download page (Resend), serves the file from Workers KV. Build and test
against fakes; real tests need the owner's Polar account (BLOCKED.md).
Then **F068 Licence, terms and refunds** (Opus; drafts with options, the
owner decides the wording).

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

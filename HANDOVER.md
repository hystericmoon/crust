# Handover

The one file a new Crust session reads to pick up the work. Keep it
short (under ~150 lines): update "Where things stand" and "Next" when a
feature is finished, and move the finished feature's notes to
docs/archive/handover-history.md.

**Start of every session:** `scripts/init.sh`, read this file, run
`npm run next` (next feature, its model, done_check, BLOCKED notes,
review queue), read PROGRESS.md "Current", `git log --oneline -10`.
Don't read features.json, DECISIONS.md or the archive whole: search them
(`grep -n "F0xx"`) when a feature touches an older area.

## Model plan (owner, 2026-11-03)

The owner picks the model per feature. **First thing every session**,
before any work: find out which model you are (`get_session`, its
`session_context.model`) and compare it with the next feature's row. If
it doesn't match, do nothing else: tell the owner, in one line, "Switch to
<model>: type `/model`, pick <model>, then send the same message again."
**At the end of every feature, and whenever the owner says he wants to
clear**, after the usual handover, end the message with this reminder,
filled in (the owner asked for it every time, 2026-11-03):

> **Ready to clear.** Everything is saved and pushed.
> 1. `/clear`
> 2. `/model` → **<model for the next feature>** (next: <feature>)
> 3. Paste: `Read HANDOVER.md on branch <branch> and continue`

Never show it while work is uncommitted or unpushed; finish that first.

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

Last updated: 2026-11-03 ~14:30 (Jakarta), branch
`ccr-d50f7e80-weuq18` (restarted from main after PR #66 merged). This
round, at the owner's request: PR #66 merged, start-up files slimmed
(option B of https://claude.ai/artifact/XYA5nqaqQCfjb9oM6VuMq9), review
round page built (option A). Last feature: **F066 Checkout built,
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


## How sessions work (owner's rule, updated 2026-11-02)

The owner said (2026-11-02): "Let's use clear instead of creating new
sessions moving forward." So the work stays in **one Crust session**,
and its context is reset with `/clear` instead of starting new sessions:

1. **One session, cleared between features.** Don't call
   `create_session` to hand over, and don't archive the current session.
   (The old rule chained new sessions; the chain stopped at depth 8.)
2. **Write first, then clear.** After each finished feature (or when the
   context is getting long): commit and push, update this file,
   PROGRESS.md and CHANGELOG.md, so a cleared context can pick up from
   here. Then tell the owner it's ready for `/clear`.
3. **After a clear,** the owner sends "Read HANDOVER.md on branch
   <branch> and continue" in the same session; the session starts from
   this file as before.
4. **Tell the owner** in plain language what was finished and what he
   can try. Never stop without doing 2 and 4. "Keep on continuing,
   don't stop."

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

Start of every session: see the top of this file.

Before every push: `npm test`, `npm run typecheck`, `cargo test`,
`cargo clippy -- -D warnings`.


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
| Product, architecture, content format | docs/spec.md |
| Milestone plans | docs/milestone-7.md, docs/milestone-8.md (earlier: docs/milestone-*.md) |
| Next feature, model, review queue | `npm run next` (scripts/next-feature.ts) |
| Every feature, its done_check and status | features.json |
| Current state, what the owner should test | PROGRESS.md |
| Why things are the way they are | DECISIONS.md (search by feature id) |
| What only the owner can do | BLOCKED.md |
| User-visible changes | CHANGELOG.md |
| Older handover and progress notes | docs/archive/ |
| Setup guides for the owner | docs/setup-*.md |

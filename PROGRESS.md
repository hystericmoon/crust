# Progress

Read "Current" at the start of a session (`npm run next` gives the next
feature). Keep it short: when a feature is finished, move the previous
entry to docs/archive/progress-history.md. Add to "Log" only what a
later session must know; keep the newest 3 entries here.

## Current

- **2026-11-03: token saving A, B and D done** (owner's pick on
  https://claude.ai/artifact/D2h2rdzR4iQU6dQv7TyWqV; DECISIONS "Token
  saving"). Nothing changes in Crust itself; sessions carry less. Long
  features may now stop once for a checkpoint `/clear`.

- **2026-11-03: PR #66 merged** (owner's request): F084, F063, F064,
  F065, F066 are on main. Start-up files slimmed (history in
  `docs/archive/`, `npm run next`); one PR per feature from now on.

- **F066 Checkout: built, passes, test mode** (branch
  `ccr-d50f7e80-weuq18`, PR #66, merged 2026-11-03). Snapshot
  https://claude.ai/artifact/6QAvaWHcuU26fgCfCrZVdw (A built for both:
  Polar as the payment company; a "Test checkout" note under each buy
  button). done_check `npm test -- checkout` exit 0; `npm test`,
  typecheck, `cargo test` and clippy pass. A priced template's button is a
  plain link to the company's hosted checkout (works without JavaScript),
  tagged with the template's id for F067; test mode says so under the
  button with the test card; a "Thank you" page (`/thanks`) appears once
  something has a price; Publish store has a "Take real payments" switch
  (off) and refuses live links without it (DECISIONS "F066"). **To try:**
  nothing changes on the store yet (every template is free). Open the
  comparison page, decide on the company, and open the account
  (BLOCKED.md). Once you send a sandbox checkout link for a paid template,
  you can buy it with the test card on the store. Needs `reviewed: true`.
  **Next: F067 Delivery and updates** (Opus).


## Waiting on the owner

- **Review round:** 26 built features wait for `reviewed: true`. One
  page, in sittings, with what to try and Pass / Needs fixing:
  https://claude.ai/artifact/C3czUd4fpf5Qz6t2WqAkwZ
  (`design/review-2026-11-03.html`). Answers are stored in the page's
  database, collection `reviews` (doc id = feature id: `verdict`
  `pass`/`fix`, `note`); read them with ArtifactData `list`. Claude records the
  owner's `pass` as `reviewed: true`; a `fix` becomes a rework item only
  when the owner asks (CLAUDE.md).
- **Accounts and decisions:** BLOCKED.md.
- **Reminder:** the Cloudflare API token expires on the date the owner set
  (recommended 2027-01-26), and the GitHub token (crust-admin-save) after
  90 days, around 2027-01-27. Both fail with a clear error; make a new one
  and replace the secret.

## Known gaps

- A header menu or footer you've edited isn't updated when a page is
  renamed or deleted (the redirect still takes visitors there; a deleted
  page's link shows "Page not found"). Untouched menus follow the pages.
- Saving only works from crust-admin.pages.dev; preview links sign in
  but can't save (different Access app). Intended.


## Log

- 2026-11-03 (Jakarta) — CI on PR #65 went red after F081: the desktop
  app's link step died with "Bus error" (runner disk full with the new
  AVIF/WebP encoders). ci.yml now removes unused preinstalled toolkits
  (~25 GB) first. F082 built on the same branch.

- 2026-11-03 (Jakarta) — F081 built on `ccr-d50f7e80-weuq18`. The AVIF
  encoder took ~5 s a photo in `cargo run` builds (Rust compiles its
  generic code inside crust-publish); crust-publish is now optimised in
  dev builds too (~0.4 s). Photo copies are cached between publishes.

- 2026-11-02 (evening, Jakarta) — F079 built on `ccr-d50f7e80-weuq18`
  after F078 merged (PR #64). axe on the sample pages caught the slide
  link and Directions link using the card link colour on Dark sections;
  they now use the section's accent colour, like text links.

Older entries: docs/archive/progress-history.md.

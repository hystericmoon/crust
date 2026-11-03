# Progress

Read "Current" at the start of a session (`npm run next` gives the next
feature). Keep it short: when a feature is finished, move the previous
entry to docs/archive/progress-history.md. Add to "Log" only what a
later session must know; keep the newest 3 entries here.

## Current

- **F067 Delivery and updates: built, passes** (branch
  `ccr-d50f7e80-weuq18`, its own PR). done_check `npm test -- delivery`
  exit 0; `npm test`, typecheck, `cargo test` and clippy pass. After a
  paid order, the buyer gets an email with a personal download page
  (Download button, what's new, how to open it in Crust). The same page
  always has the newest release, so updates are free; a full refund
  switches it off. Fake "order paid" messages are refused (signature
  check). Also fixed: the desktop FTPS test that failed once on #68.
  **To try:** nothing visible yet: it needs the one-time setup in
  docs/setup-delivery.md (after the Polar account), then a test purchase
  with your own email address. **Next: F068 Licence, terms and refunds**
  (Opus).

- **2026-11-03: token saving A, B and D done** (owner's pick on
  https://claude.ai/artifact/D2h2rdzR4iQU6dQv7TyWqV; DECISIONS "Token
  saving"). Nothing changes in Crust itself; sessions carry less. Long
  features may now stop once for a checkpoint `/clear`.

- **2026-11-03: PR #66 merged** (owner's request): F084, F063, F064,
  F065, F066 are on main. Start-up files slimmed (history in
  `docs/archive/`, `npm run next`); one PR per feature from now on.

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

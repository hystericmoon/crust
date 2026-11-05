# Progress

Read "Current" at the start of a session (`npm run next` gives the next
feature). Keep it short: when a feature is finished, move the previous
entry to docs/archive/progress-history.md. Add to "Log" only what a
later session must know; keep the newest 3 entries here.

## Current

- **2026-11-05: store launches free.** Everything is free for now (owner:
  "later on we can do something about the paid template"). The store has
  three templates (Harbour, Signal, Corner), all Free; none was ever
  priced. With nothing for sale it shows one short **Licence** page (free
  to use, on as many sites as you like; don't resell the file) and a
  footer column "Licence"; the Terms and Refunds pages and the "Draft"
  banner are gone. The paid-store pages and the F068 live-payment check
  stay in the code and come back as soon as any template gets a price
  (PR #79; DECISIONS "Store launches free"). Publish store was run on
  main with real payments off. **To try:** open
  https://crust-store.pages.dev, a template page, and /licence; the
  "Download" buttons should open each template's file. The licence
  wording is plain and short, not lawyer-reviewed.

- **F068 Licence, terms and refunds: built, passes, wording is a draft**
  (branch `ccr-d50f7e80-weuq18`, its own PR). done_check `npm test --
  store-legal && npm run check:a11y` exit 0. Snapshot
  https://claude.ai/artifact/DAmwsHC4W4CcGXzH4DDCij (A built on all
  three: one price for unlimited sites; full refund within 14 days for
  any reason; three short pages). The store has Licence, Terms and
  Refunds pages, a "Buying" footer column, "Read the full licence" on
  every template page, and a line under every buy button linking all
  three. Each page says "Draft" until you approve the wording, and the
  store refuses real payments until then. **To try:** after Publish
  store, open https://crust-store.pages.dev/licence (and /terms,
  /refunds); read the wording; tell Claude your changes, the name to
  sell under and the contact email. **Milestone 7 is complete; no
  unbuilt features remain.**

- **2026-11-03: token saving A, B and D done** (owner's pick on
  https://claude.ai/artifact/D2h2rdzR4iQU6dQv7TyWqV; DECISIONS "Token
  saving"). Nothing changes in Crust itself; sessions carry less. Long
  features may now stop once for a checkpoint `/clear`.

- **2026-11-03: PR #66 merged** (owner's request): F084, F063, F064,
  F065, F066 are on main. Start-up files slimmed (history in
  `docs/archive/`, `npm run next`); one PR per feature from now on.

## Waiting on the owner

- **Review round:** 7 built features still wait for `reviewed: true` (F055, F062, F063, F071, F075, F078, F080); 20 are passed (the owner's word: follow the impeccable skill). One
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

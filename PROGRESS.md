# Progress

Read "Current" at the start of a session (`npm run next` gives the next
feature). Keep it short: when a feature is finished, move the previous
entry to docs/archive/progress-history.md. Add to "Log" only what a
later session must know; keep the newest 3 entries here.

## Current

- **2026-11-06: F085 the app in dark and light (built, waiting for your
  review).** The app itself (not your site) now has the React Bits-style
  "Violet night" look: violet-tinted near-black in dark mode, white in
  light mode, Geist font, thin borders, and violet only on what's
  selected or active. It follows your computer's light/dark setting; the
  sun/moon button at the top right of every screen switches it, and Crust
  remembers. Pressing it back to your computer's mode makes it follow the
  computer again. Your site on the canvas keeps its own colours in both.
  Every text colour passes the contrast check in both modes, and the
  builder accessibility check now runs in both. Snapshot:
  https://claude.ai/artifact/KE4fZPZSFQJE8keiH4DwsA. **To try:** open the
  preview https://ccr-d50f7e80-weuq18.crust-admin.pages.dev, press the
  sun/moon button on the pages list, the editor and Site settings; switch
  your Mac or phone to dark mode and reload. Next: F086 (one app frame and
  top bar, Opus). The screen layouts are still today's; they change in
  F086–F092.

- **2026-11-06: the Mac app opens.** The Mac installer's app wasn't
  signed as one app, so macOS couldn't tell it was Crust and it hung at
  start-up (long bounce, then nothing). It is now signed (free "ad-hoc"
  signature), and if Crust can't use the Documents folder it keeps sites
  in its own app folder instead of quitting. The owner tried the new
  installer on his Mac (Apple chip, macOS 27.2): the welcome screen shows.
  A fresh download still needs **Open Anyway** once in System Settings →
  Privacy & Security (only a $99/year Apple Developer ID removes that; the
  owner's call). The CI launch test (Actions → Desktop launch test) stays
  for future Mac checks.

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

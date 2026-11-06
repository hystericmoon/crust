# Progress

Read "Current" at the start of a session (`npm run next` gives the next
feature). Keep it short: when a feature is finished, move the previous
entry to docs/archive/progress-history.md. Add to "Log" only what a
later session must know; keep the newest 3 entries here.

## Current

- **2026-11-06: F086 one top bar and a left icon bar (built, waiting for
  your review).** Every screen now has the same top bar: your site's name
  on the left (press it for a menu: Pages, Posts, Site settings, Start
  from a template, and Sign out at the bottom; in the Mac app also All
  sites), then where you are. On the right: the status ("Saved · 3
  changes not live") and **Publish** with the number of changes, always
  in the same place. In the editor the bar also has the page switcher,
  Desktop/Tablet/Phone width, Undo and Redo, a button to show or hide
  the settings panel, and Preview. The slim bar on the left opens Add
  (layouts and blocks), Layers, Pages, Styles, Media, Blog, Site and
  Help. **"Save draft" is gone:** changes save on their own a few
  seconds after you stop typing (about 1 second in the Mac app), and
  Ctrl/⌘+S saves at once. Site settings keeps Save and Discard until
  F092. Snapshot: https://claude.ai/artifact/4yD6q3o3bHh3nogcJRhaRW.
  **To try:** open the preview
  https://ccr-d50f7e80-weuq18.crust-admin.pages.dev, open a page, change
  a heading and watch the status; press the site name for the menu; try
  each icon on the left; press Preview. (The preview link can't save to
  GitHub, so it says "Saved in this browser".) Next: F087 Page first.

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

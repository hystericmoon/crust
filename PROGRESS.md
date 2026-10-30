# Progress

Read this first in every session. Keep it short: replace "Current", append
to "Log".

## Current

- **Milestone:** 1 complete. F001–F025 merged; first real publish live at
  https://crust-site.pages.dev (2026-10-29).
- **Merged to main (2026-10-30, owner: "Both"):** Milestone 2, F026–F033
  (PRs #10–#17). Not published yet: the live site changes when the owner
  presses Publish.
- **Milestone 3 approved (2026-10-30):** F034–F039, docs/milestone-3.md.
  Now: F034 Media library. Design snapshot v1 on branch
  `f034-media-library`, `design/f034-media-library-v1.html`, also at
  https://claude.ai/artifact/9QoSJrHftHwJ6bWRJUuVNA. Waiting for the owner
  to pick A/B/C and where photos live (Claude recommends A + GitHub).
- **Waiting on the owner:**
  - Try https://crust-admin.pages.dev (main, now with Milestone 2) and set `reviewed: true`: F010, F004, F003,
    F005, F012, F013, F014, F007, F008, F015, F016, F017, F018, F019,
    F020, F021, F022, F023, F024, F025, F026, F027, F028, F029, F030,
    F031, F032, F033.
  - F027 and F028–F033 were built with Claude's recommendations (owner's
    instruction); the choices are in DECISIONS.md and can be changed.
  - Proposals waiting in DECISIONS.md (sign-out button, redirect on
    restore, Puck axe fixes, layouts using the new blocks, gallery
    lightbox, linked sections).
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
- Signing out needs the address
  crust-admin.pages.dev/cdn-cgi/access/logout (no button yet).

## Log

- 2026-10-28 — Repo created. Docs and workflow files set up (CLAUDE.md,
  spec, features.json, DECISIONS/BLOCKED/CHANGELOG, .claude/settings.json
  deny rules). F001 done: blocks package (Section, Heading, Text, Image,
  Button, Spacer), admin with Puck editor and responsive viewports (drafts
  saved in the browser for now), renderer to static HTML, Rust publish engine
  (sitemap.xml, robots.txt), CI. 23 JS tests + 7 Rust tests passing.
- 2026-10-28 — F010 workflow: `.github/workflows/preview.yml` builds the
  admin and deploys it to Cloudflare Pages (`crust-admin`) with wrangler on
  every branch push; main = production preview. Posts the link on the PR and
  in the job summary, and checks the page actually loads. Skips the deploy
  cleanly while secrets are missing. CI now lints workflows (actionlint).
  8 new tests. Not marked passing until a real deploy is green.
- 2026-10-28 — F010 passes: owner added the Cloudflare secrets; first real
  deploy (run 40722349309) created the `crust-admin` Pages project,
  deployed, loaded the page, and posted the link on PR #1. CI (incl.
  actionlint) and `npm run build` green.
- 2026-10-28 — F002 done: crust-publish checks every rendered page (alt
  text, exactly one H1 that comes first, no skipped heading levels, title
  and description) and stops the publish with a plain-language list of every
  problem. 10 unit + 2 integration tests; done_check passes. Nothing for the
  owner to test in the browser yet (publishing from the admin is F008).
- 2026-10-28 — F003 blocked: the Site settings design snapshot says not to
  build until the owner picks a direction. Logged in BLOCKED.md.
- 2026-10-28 — F004 done: Columns (2-4, stacks below 640px, 2 columns on
  tablet) and Card blocks, renderer support, sample page row of 3 cards,
  editor canvas uses page base styles. Checked in a headless browser at
  1280/768/375 and in the builder (no console errors). 15 new tests;
  done_check passes. Owner to review on the preview link.
- 2026-10-28 — F003 unblocked: owner chose direction A + B's contrast panel
  after an Impeccable critique (scores A 27, B 25, C 22 out of 40). Handoff
  spec in docs/f003-site-settings.md.
- 2026-10-28 — F003 done: Site settings screen (#/settings) with colours,
  7-pair contrast checks with one-click fixes, curated font stacks,
  spacing, radius, page width, and a live Home page preview from the
  publish renderer (desktop/tablet/mobile; collapsible strip on phones).
  Saved in the browser until F006. Checked in a headless browser at 1440
  and 390 (no overflow, no console errors, tab order, the fix flow, saved
  tokens reach the builder). Impeccable detector clean. 27 new tests;
  done_check passes.
- 2026-10-28 — F005 done: keyboard alternatives for every drag (move
  up/down, out of a container, into the one above, between columns, add
  from the list), labelled action-bar buttons, live announcements,
  screen-reader names on canvas blocks, help panel (?), focus rings. Puck's
  span-based Publish replaced by a real "Save draft" button. Checked in a
  headless browser: every shortcut, focus return, undo, no console errors.
  22 new tests; done_check passes.
- 2026-10-28 — PR #1 merged (owner approved). Owner approved Claude's
  proposals as F011–F014 and asked to finish everything overnight.
- 2026-10-28 — F011 (image URL check), F012 (button alignment), F013
  (presets with undo, all AA-checked), F014 (click preview to jump to a
  colour) done.
- 2026-10-28 — F006 done: /api/save etc. as Cloudflare Pages Functions,
  refusing until Access + token are configured, verifying the Access JWT,
  blocking cross-site requests, re-validating content. Deploy now ships
  functions. F007 done: page list, new page, per-page browser drafts,
  routing. F008 done: publish.yml + Publish panel. F009 done: axe on every
  page and Lighthouse 95+ (sample scores 100), in CI and before publishing.
  Owner setup guide: docs/setup-saving.md.
- 2026-10-28 — Owner approved both open proposals; added as F015 and F016.
  F015 done: Rename/Delete buttons on each page row (not Home) with modal
  confirmations. Renames are one GitHub commit (page file moved,
  content/redirects.json updated). crust-publish writes `_redirects` so old
  addresses keep working. Deletes drop redirects to the page. F016 done:
  /api/changes compares main with the last successful publish. The list
  shows "Not published yet" / "Edited since publish", and the Publish panel
  lists what's waiting (moved pages read as "moved to …"). Checked in
  Chromium at 1280 and 390: keyboard flow, focus on open/close, no
  overflow, axe clean with the dialog open, no console errors. 20 new JS
  tests, 6 new Rust tests; both done checks pass.
- 2026-10-28 — PR #3 merged (owner: "move forward"). Owner approved
  Claude's next four recommendations as F017–F020. F017 done: the publish
  workflow names its last step "Live at <address>"; /api/publish returns
  it, and the Publish panel links there (placeholder baseUrl ignored).
  Confirmed with a temporary CI step that GitHub reports the evaluated
  step name. 6 new tests; done check passes.
- 2026-10-29 — F018 done: renaming a page rewrites Button/Card links to it
  on every page in the same commit (shared `relinkPage` in
  packages/blocks/src/links.ts), and browser drafts follow. The rename
  dialog names the pages it will update (GET /api/links). 8 new tests; done
  check passes.
- 2026-10-29 — F019 done: "Recently deleted" (collapsed) lists builder
  deletions from the Git history (GET /api/deleted). Restore writes the
  page back as it was before deletion (POST /api/restore), refusing taken
  addresses or anything that isn't a builder deletion. 7 new tests; done
  check passes.
- 2026-10-29 — F020 done: "Save to GitHub" on rows with a browser draft
  (GitHub on), saving the draft as the builder would. Checked F017–F020
  together in Chromium at 1280 and 390: axe clean, no overflow, no console
  errors, save flow removes the badge. 4 new tests; done check passes.
- 2026-10-29 — PR #4 merged. Impeccable review of the Pages screen (owner
  request): design review 24/40, detector clean, axe clean, one WCAG 2.4.11
  failure (focus under the sticky header). Fixed that plus Publish placement
  and labels, error alerts and retry, link colour, dates, phone targets,
  chevron icon, Home note, New page keeps input. 8 new tests (219 total).
  Bigger ideas logged as proposals.
- 2026-10-29 — PR #5 merged. Owner: setup "done" and approved all four
  proposals. Redeployed main: settings still not visible to the admin
  (asked the owner to check). Fixed the deploy check (retry, Access
  sign-in counts as deployed). F021 status column, F022 save drafts before
  publishing, F023 find and sort, F024 Publish shortcut: 16 new tests (235
  total). Checked at 1280 and 390 px: axe clean, no console errors, the
  save-and-publish flow, and the shortcut lands focus on Publish.
- 2026-10-29 — Setup finished with the owner over screenshots: the Pages
  variables had never been saved and no Access app existed for
  crust-admin. Created both; redeployed (run 40825322380). /api/status:
  configured, signed in as the owner. Real save, rename, delete and
  restore of a test page all landed as commits on main. Test page
  deleted. First real Publish (run 40829434524) green; live at
  https://crust-site.pages.dev with title, description, sitemap and
  robots.txt. Found that unknown addresses served the home page with
  status 200 (no 404.html); fixed in the renderer, axe check now covers it.
- 2026-10-29 — Owner approved Milestone 2 ("approve 1 2 3") after a
  visual explainer comparing Crust and YOOtheme. Added F025–F033 to
  features.json, spec in docs/milestone-2.md, snapshot in design/.

- 2026-10-29 — F025 Section styles done (owner picked "A + C's toolbar"
  with a This section / Whole site switch). Site-wide styles in
  site.json, auto text colour, worst-case photo tint, picture tiles,
  height and tint pickers in the panel, a quick bar on the selected
  section, Section styles in Site settings. 33 new tests; checked in a
  real browser (toolbar, whole-site edit, image tint). done_check passes.

- 2026-10-29 — F026 started (owner: "go with your recommendations" = B).
  Layout data, heading fitting and the layout accessibility check are in;
  the builder UI is next (see Current). Session handed over here.
- 2026-10-29 — F026 Layout library done (direction B). Gallery dialog
  with Sections / Whole pages, categories, search and live-style
  previews; "+" between sections on the canvas; Layouts button in the top
  bar for the keyboard; "Add a layout" on empty pages. Insert is one undo
  step, selects the new section and announces it. 18 new tests (291
  total). Checked in Chromium at 1440 and 390: insert, whole-page insert
  keeps one h1, undo, empty page, Escape returns focus, axe clean with
  the gallery open, no console errors. done_check passes.
- 2026-10-29 — F027 design snapshot v1: three ways to save and find your
  own layouts (A save on the section + own tab, B all in the gallery,
  C mixed into categories). Same in all: copies not links, name from the
  heading, GitHub storage, delete confirms. Waiting for the owner's pick.
- 2026-10-29 — F027 My layouts done (direction A, chosen by Claude while
  the owner slept). "Save as layout" on the section toolbar, "Save this
  page" and a My layouts tab in the gallery with rename/delete, files in
  content/layouts/ through /api/layouts, browser copy when GitHub is off.
  25 new tests (316 total). Checked in Chromium at 1440 and 390: save,
  page save, rename, Escape, delete, insert with fresh ids, reload keeps
  them, axe clean. done_check passes; F026's still passes.
- 2026-10-29 — F028 design snapshot v1: three arrangements of the bigger
  Site settings (A grouped panel, B one long page, C preview first), with
  working controls and 9 presets (new: Ocean, Studio, Paper, Night; all
  AA). Found an overlap with F025's per-style button looks; asked the
  owner before building.
- 2026-10-29 — F029 design snapshot v1: width tiles per device (A all
  devices at once, B follows the canvas device, C drag on the canvas with
  arrow keys), plus "Show on" toggles per block.
- 2026-10-29 — F028 Style customizer v2 done (direction A, button
  proposal accepted). tokens.style options, Soft button look, 9 presets,
  grouped Site settings with preview-click jumps. 48 new tests (364
  total). Chromium at 1440 and 390: axe clean in every group, canvas
  picks up the styles, no console errors. done_check and check:a11y
  (45 themed pages) pass.
- 2026-10-29 — F029 Per-device columns done (direction A). Width tiles
  for all three devices, device names switch the canvas, "Show on" for
  every block (display: contents wrapper + media queries). Old pages
  render identically. 18 new tests (382 total). Checked in Chromium:
  canvas widths and the faded hidden block in the builder, and the
  published page at 375/800/1280. done_check passes.
- 2026-10-29 — F030 Content/Style/Advanced tabs done. resolveFields per
  tab (switching is not an undo step), anchor names with duplicate
  warning. 9 new tests (391 total). Chromium: tabs, focus, undo, anchor
  id on the canvas. Found 4 axe issues in Puck's own chrome (proposal in
  DECISIONS). done_check and check:a11y pass.
- 2026-10-29 — F031 done (new session after the handoff): header with
  logo, menu from your pages, optional button, sticky option and a phone
  Menu that opens without JavaScript; footer with text, link columns and
  a {year}/{name} copyright line. Edited in Site settings ("Header &
  menu", "Footer"), saved in site.json, checked again on the server.
  "Skip to content" on every page. Checked in Chromium at 1440 and 390
  with JavaScript off: menu opens, no overflow, axe clean. 26 new tests
  (417 total); done check passes. Owner to try: Site settings → Header &
  menu, change the menu, then look at the preview on desktop and phone.
- 2026-10-29 — F032 done: Grid of cards, Gallery, Accordion / FAQ, Icon
  list, Logo row, Quote, Image overlay. Repeating items edited in a
  keyboard-friendly list (arrow buttons, announcements) instead of
  Puck's drag-only list. Renaming a page updates links inside them. A
  sample page of all seven on every section style is axe-checked with
  all 9 presets. Checked in Chromium: list editor moves, adds and types
  into the canvas with the keyboard; axe clean. 23 new tests (440 total);
  done check passes. Owner to try: add an Accordion and a Gallery from
  the block list and edit their items.
- 2026-10-29 — Found and fixed: the F031 Header & menu and Footer
  settings had no styles (pushed to F031's branch, merged into F032 and
  F033). Checked at 1440 and 390: no overflow, axe clean.
- 2026-10-29 — F033 done: Site settings → Theme pack. Download the look
  as a .crust file (style, header/footer look, My layouts); bring one in
  with checks (format, safe values, contrast, known blocks), a preview,
  and "Use this theme" into the unsaved draft. Checked in Chromium at
  1440 and 390: download, import, preview, use; no overflow; axe clean.
  17 new tests (457 total); done check passes. Owner to try: download
  the pack, change a colour, then bring the pack back in.
- 2026-10-30 — Code review of F031–F033 (independent reviewer): fixed two
  security holes in theme-pack import (a heading level or spacing value
  could become a script tag or page-wide CSS on the published site),
  plus four smaller issues (frozen default menu, unsafe button/logo
  addresses, "$" in site names, a hard-to-read style blocking a whole
  pack). 463 tests; check:a11y passes. Milestone 3 proposal in
  DECISIONS.md, waiting for the owner.
- 2026-10-30 — Owner said "Both": merged PRs #10–#17 into main in order
  (merge commits, CI green on each), and approved Milestone 3. Added
  F034–F039 to features.json and docs/milestone-3.md.
- 2026-10-30 — F034 design snapshot v1: three layouts for the media
  library (picker dialog, sidebar tab, Media page) and the storage
  question (GitHub vs Cloudflare R2). Logged in BLOCKED.md.

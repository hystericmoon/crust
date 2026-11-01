# Progress

Read this first in every session. Keep it short: replace "Current", append
to "Log".

## Current

- **Milestone:** 1 complete. F001–F025 merged; first real publish live at
  https://crust-site.pages.dev (2026-10-29).
- **Merged to main (2026-10-30, owner: "Both"):** Milestone 2, F026–F033
  (PRs #10–#17).
- **Milestone 3 merged to main (2026-10-30, owner: "Merge them all in
  order"):** F034–F039 (PRs #18–#23), all passing, now on
  https://crust-admin.pages.dev. Uploads and "Save and publish" work there.
- **Not published yet:** Milestones 2–4 are on main, but the live site
  changes only when the owner presses Publish.
- **F037 email** still needs the owner's setup (BLOCKED.md,
  docs/setup-contact-form.md); until then the form shows but doesn't send.
- **F034–F039 still need `reviewed: true`** from the owner (steps below).
- **Milestone 4 "Daily use" merged to main (2026-10-30/31):** F040–F044,
  docs/milestone-4.md. F040 (PR #26, owner: "merge F040"); F041–F044
  (PRs #27–#30, owner: "Yes, merge all four in order", merged at 3am
  Jakarta as he asked). All on https://crust-admin.pages.dev. F042 and
  F043 are direction A of their design snapshots; the owner can still
  pick B (a rework item, only if he asks). Buying the domain is in
  BLOCKED.md.
- **Milestone 5 "Templates" merged to main (2026-10-31, owner: "Merge
  them all in order"):** F045–F051, PRs #33–#39, now on
  https://crust-admin.pages.dev. Start from a template offers Harbour,
  Signal and Corner. Not published: the live site changes only when the
  owner presses Publish. F045–F051 still need `reviewed: true`.
- **Milestone 5 "Templates" approved (2026-10-30, owner: "Approve"):**
  F045–F049, docs/milestone-5.md. **F045 Save a site as a template
  built** (branch `f045-template-file`, draft PR #33, not merged). **F046
  Placeholder content built** (branch `f046-placeholders`, draft PR #34,
  stacked on #33). **F047 Template quality check built** (branch
  `f047-template-check`, draft PR #35, stacked on #34). **F048 Start
  from a template built** (branch `f048-start-from-template`, draft PR
  #36, stacked on #35). **F049 Harbour built** (branch
  `f049-starter-template`, draft PR #37, stacked on #36). Owner chose
  "All three" starter templates: next F050 Signal, then F051 Corner. Sessions now hand
  over through HANDOVER.md (owner's rule, 2026-10-30).
- **Waiting on the owner** (all on crust-admin.pages.dev unless noted):
  - **F049:** on PR #37's preview link
    (https://f049-starter-template.crust-admin.pages.dev) press **Start
    from a template**: Harbour is first. Look through its pages at the
    three widths; dashed outlines are the sample content. Try **Use this
    template** (on the preview link it only changes your browser), open
    a page in the builder and see the **To replace** list.
  - **F048:** design snapshot https://claude.ai/artifact/JQoY8bbRJ9U58jZawRx2kV
    (A was built). On PR #36's preview link
    (https://f048-start-from-template.crust-admin.pages.dev) press
    **Start from a template** on the Pages screen. Open **Sample site**,
    switch pages and widths, press **Use this template**: the question
    lists your pages by name. Try Cancel, then Replace: the Pages screen
    says the site uses the template. Press **Bring back my previous
    site**. The preview link isn't connected to GitHub, so this happens in
    your browser only; on the real admin it's saved to GitHub (and
    nothing goes live until you publish). You can also open a .crust
    file you saved with Site settings → Template.
  - **F047:** nothing to click in the builder; it's a check that runs on
    every pull request. On PR #35, open **Checks** → **CI** → the
    **template-check** job: its summary lists each check, and the
    **template-check-report** download (bottom of the run page) is the
    readable report. Today it checks the sample site; with F049 it will
    check the starter template.
  - **F046:** on PR #34's preview link, open the home page in the
    builder, select the big heading, open its **Advanced** tab and tick
    **Replace me → Text**. A dashed amber outline and a label appear,
    and **To replace 1** shows in the top bar. Open it, try **Show**,
    then change the heading's words: the mark goes away by itself. Back
    on the Pages screen, a page with marks says "1 thing to replace" and
    the Publish panel explains why it's waiting.
  - **F045:** on the PR's preview link, open Site settings → Template
    (near the bottom). Add a description, press **Save as template**: a
    .crust file downloads, and the screen lists what's in it. The preview
    isn't connected to GitHub, so it holds the sample site; on
    crust-admin.pages.dev (once merged) it holds your real site.
  - **F044:** open Site settings → Site
    address (last in the list). Type a domain with a mistake (like
    studio.com/about), then a correct one; the example address below
    updates. Don't save a domain you don't own yet. On the Pages screen
    the Publish panel is unchanged until a domain is set.
  - **F043:** look at the design snapshot
    (https://claude.ai/artifact/DSXzme9pbKie3guoRpSizj; A was built). On
    crust-admin.pages.dev: select a section, press **Make linked**, name
    it. Add it to a second page from Layouts → Linked. Select it, press
    **Edit linked section**, change a word, save, go Back: both pages
    show it. Then try **Unlink here**.
  - **F041:** in the builder press **Layouts**: Features grid, Photo
    gallery, Logo strip, Testimonial, Questions to open and Contact
    form, plus the new Gallery and Logos categories. Insert one and
    fill in your own photos and words.
  - **F042:** look at the design snapshot
    (https://claude.ai/artifact/1d1Ujx7ENSrGCef6CWfg9Z; A was built). On
    crust-admin.pages.dev, select a Text block: make words bold, add a
    link with ⌘K, type "- " to start a list. Try a bad link like
    "javascript:x". Then try the same in Quick edit on your phone.
  - **F040:** open a page in the builder.
    The Pages screen and the builder's top bar have **Sign out** (after
    Site settings); on your phone the Pages buttons now wrap as whole
    buttons, with New page full width. In the builder the buttons now
    sit on one line, with the page name on the left. Press Sign out: you
    land on Cloudflare's "signed out" page, and signing back in brings
    your edits back. To see the redirect fix: rename a page, delete it, restore it from "Recently
    deleted", and the old address leads to it again.
  - **F034:** on crust-admin.pages.dev, select a Card or Image block and press "Choose image".
    Upload a photo from the Mac and one from the phone, describe them,
    use them, then Save draft. Uploading only works on
    crust-admin.pages.dev, not on preview links.
  - **F035:** on the Pages screen, open **Posts** → New post. Write a
    post with a cover photo, Save draft, then publish and open
    /blog/ on the live site. Add "/blog" to the menu in Site settings.
  - **F036:** open a page in the builder, click an empty spot on the
    canvas (or "Fields" on the phone) and scroll to Search title, Social
    image and "Hide from search engines"; watch the previews change.
    After publishing, paste a page link into a chat app to see the card.
  - **F037:** add a Contact form block to a Contact page and try it on
    crust-admin.pages.dev. To make it send email, follow
    docs/setup-contact-form.md (about 20 minutes, all free).
  - **F038:** on your phone, open crust-admin.pages.dev, tap a page, change a
    heading and swap a photo, then Save.
  - **F039:** after publishing, open /search/ on the live
    site and search for a word from a page. Switch on the header's
    Search link in Site settings → Header & menu.
  - Try https://crust-admin.pages.dev (main) and set `reviewed: true`: F010, F004, F003,
    F005, F012, F013, F014, F007, F008, F015, F016, F017, F018, F019,
    F020, F021, F022, F023, F024, F025, F026, F027, F028, F029, F030,
    F031, F032, F033.
  - F027 and F028–F033 were built with Claude's recommendations (owner's
    instruction); the choices are in DECISIONS.md and can be changed.
  - Proposals waiting in DECISIONS.md: gallery lightbox; the new
    layouts in the whole-page layouts.
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
- 2026-10-30 — Owner: "go with all your recommendations" → F034 is A + 1.
  Handed to a new session to build.
- 2026-10-30 — F034 done: media library. "Choose image" in every image
  field (incl. Gallery/Grid/Logo row items, section toolbar, header logo)
  opens a picker with upload (button or drop), search, a keyboard grid
  (arrows/Home/End/Enter) and a details pane (alt text required, size,
  used on, delete when unused). Photos shrink to 2400 px in the browser,
  are committed to content/media/ + content/media.json via /api/media,
  and shown in the builder via /media/<file>. Published pages get
  width/height + srcset; crust-publish (image crate) makes 480/960/1440
  copies and stops on missing photos. Checked in Chromium at 1440 and
  390 px with the keyboard and axe (no serious issues); found and fixed
  an alt-box mix-up when moving fast between photos. 37 media tests
  (JS 32, Rust 5 + unit); done_check exits 0.
- 2026-10-30 — F035 done: blog. Posts screen (#/posts: list, New post,
  delete, blog page title/intro), post builder (#/post?slug=…: post
  fields in the page settings, the post's top on the canvas), /api/posts,
  renderer for /blog/, /blog/<slug>/ and /blog/feed.xml (BASE_URL from
  the publish workflow). Pages can't use /blog. Sample blog pages added to
  check:layouts (axe, every preset). Checked in Chromium at 1440 and 390
  px (keyboard focus, axe: no issues). 26 new tests; done_check exits 0.
- 2026-10-30 — F036 done: search and sharing. Page settings get Search
  title (with length counter), Social image (media picker + alt), Hide
  from search engines, and live previews (search result, shared card).
  Optional `seo` in page files; renderer adds canonical, Open Graph and
  Twitter tags on every page (posts: cover, article); crust-publish
  leaves noindex pages out of sitemap.xml. Checked in Chromium at 1440
  and 390 px (keyboard, axe: no serious issues). 13 new tests;
  done_check exits 0.
- 2026-10-30 — F037 done: contact form. ContactForm block (Forms group;
  name/email/message + up to 6 extra fields; works without JS; :target
  thank-you/error), Worker in packages/contact (spam trap, Turnstile,
  Resend, origin and redirect checks), contact-worker.yml (skips until
  set up), renderer loads Turnstile only on form pages. Contact form
  pages in check:layouts (axe, every preset, connected and not).
  Checked in Chromium with JS off at 1440 and 390 px. Owner setup in
  BLOCKED.md. 24 new tests; done_check exits 0.
- 2026-10-30 — F038 done: phone quick edit. Pages open in Quick edit on
  screens ≤ 760 px (mode=full/quick in the address to switch; "Quick
  edit" link in the builder): page title/description and every text,
  label and photo in reading order, numbered parts, Save / Save and
  publish in a bottom bar. Found and fixed two fields with the same
  spoken name. Checked in Chromium at 390 (touch) and 1440 px: keyboard,
  axe none, no sideways scroll. 9 new tests; done_check exits 0.
- 2026-10-30 — F039 done: site search. Pagefind (MIT) indexes the
  finished site at publish (publish:local and publish.yml); renderer
  writes /search/ (labelled role=search form, live result count,
  excerpts with only <mark> kept, noindex) and marks main content with
  data-pagefind-body (not 404, blog list, hidden pages); optional header
  Search link (header.search); /search reserved. Checked in Chromium at
  1440 and 390 px: typed search with Enter, results, no-results, axe
  none, no sideways scroll. 7 new tests; done_check exits 0.
- 2026-10-30 — Merged Milestone 3 to main in order, owner's say-so: PRs
  #18–#23 (F034–F039), each with merge commits. Each stacked PR was
  retargeted to main and brought up to date with "Update branch" (merge
  commit, no rebase) so CI ran against main; all four checks green on
  every PR before merging. Not published.
- 2026-10-30 — Wrote the Milestone 4 proposal and the long-term direction
  (template business) in DECISIONS.md. Waiting for the owner.
- 2026-10-30 — Owner approved Milestone 4 ("Approve"): F040–F044 added to
  features.json, docs/milestone-4.md written.
- 2026-10-30 — F040 Builder tidy-up on branch f040-builder-tidy-up:
  Sign out link in both builders' top bars; Puck chrome labelled as it
  renders (canvas "Page preview", "Zoom" menu, spinner as a named
  progress bar) and darker block-list headings; new `check:builder` axe
  check on the page and post builders, part of check:a11y (CI builds the
  admin first). It found the 4 issues before the fix and none after.
  Restoring a deleted page brings back the redirects the deletion
  removed. Top bar re-laid out so the labels fit on one line from
  1100 px. 14 new tests; done_check exits 0.
- 2026-10-30 — F040, owner's request on the PR: Sign out on the Pages
  screen too (shared `SignOutLink`, apps/admin/src/sign-out.tsx). Phone
  header buttons wrap as whole buttons. 1 new test.
- 2026-10-30 — Merged F040 (PR #26), owner's say-so ("merge F040 and
  keep on continuing"). Not published.
- 2026-10-30 — F041 on branch f041-layouts: six section layouts from the
  F032/F037 blocks, Gallery and Logos categories, gallery cards preview
  empty photo slots (`renderPreview`). All pass the layout axe check.
  22 new tests; done_check exits 0.
- 2026-10-30 — F042 on branch f042-rich-text: design snapshot
  (design/f042-rich-text-v1.html, direction A built). Lexical editor on
  the Text field (builder and Quick edit); new rich text format in page
  JSON with migration (spec + DECISIONS); links checked on save, in theme
  packs and when rendering, and updated on rename. Builder axe check now
  covers the editor; block samples cover links on every section style.
  29 new tests; done_check exits 0.
- 2026-10-30 — F043 on branch f043-linked-sections (stacked on F041 and
  F042): design snapshot (design/f043-linked-sections-v1.html, direction
  A). content/sections/<id>.json + LinkedSection block (spec, DECISIONS);
  built into pages at publish; /api/sections (make, edit, rename, delete
  only when unused); Make linked, Layouts → Linked, panel with Edit and
  Unlink, its own editor screen; links follow renamed pages; Publish
  panel lists changed sections. 17 new tests; done_check exits 0.
- 2026-10-30 — F044 Custom domain: Site settings → Site address (domain
  field, tidied and checked, saved as site.json's baseUrl); the publish
  workflow asks Cloudflare whether the domain is active and otherwise
  keeps the free address, reporting "Not connected yet" to the Publish
  panel; guide docs/setup-custom-domain.md; BLOCKED.md entry for buying
  the domain. 26 new tests (custom-domain) + 1 Rust test. done_check
  passes.
- 2026-10-31 (3am Jakarta, 20:00–20:30 UTC Oct 30) — Merged F041–F044
  (PRs #27–#30) in order, owner's say-so ("Yes, merge all four in
  order"). Each branch brought up to date with merge commits; conflicts
  only in PROGRESS/CHANGELOG/DECISIONS and the shared export lists
  (packages/blocks index and package.json, server/content.ts imports,
  App.tsx providers), kept both sides. CI green on every head before
  merging. Not published.
- 2026-10-30 — Owner: "Go ahead merge and move to new milestone". M4 was
  already merged (#27–#31). Proposed Milestone 5 "Templates" (PR #32);
  owner approved; added F045–F049 and docs/milestone-5.md.
- 2026-10-30 — F045 Save a site as a template: `crust-template` format
  (packages/blocks/src/template.ts: make, read, summary), collected in the
  browser (apps/admin/src/templates/collect.ts), Site settings → Template.
  The file is read back before it downloads. 15 new tests (template-file).
  done_check passes.
- 2026-10-30 — F046 done (PR #34, stacked on #33): "Replace me" marks
  per field on blocks (`placeholder`), dashed outline + label on the
  canvas, "To replace" list in the builder (Show / Keep as is), marks
  clear when the field is edited (lists need Keep as is), counts on the
  Pages screen, Publish panel holds publishing, crust-publish refuses
  pages with `data-crust-placeholder`. 24 new tests (720 JS total).
  HANDOVER.md added at the owner's request; CLAUDE.md points to it.
- 2026-10-30 — F047 done (PR #35, stacked on #34): `npm run
  check:template` + CI job `template-check`. Unpacks a template into a
  content folder, runs the real render + crust-publish, axe at 3 widths
  on pages and saved layouts, Lighthouse on Home, contrast per section
  style, unmarked filler check; report at dist/template-check/index.html
  (CI download). check:a11y/check:perf share scripts/site-audit.mjs. 21
  new tests (741 JS total). New session took over from the F046 one.
- 2026-10-31 — F048 Start from a template (PR #36, stacked on #35):
  design snapshot (3 directions, A built), `#/templates` gallery with
  thumbnails, preview at 3 widths, confirm question (replaced / kept),
  apply as one commit after photo batches (/api/template), undo of
  exactly that commit, browser-only mode for preview links. Builder a11y
  check covers the 3 new screens. 25 new tests (766 JS total). Session
  paused overnight at the owner's request.
- 2026-10-31 — Owner: "All three" starter templates (F050, F051 added).
  F049 Harbour built (PR #37): pages from scripts/starter-templates,
  stand-in PNGs, templates/harbour.crust, passes check:template (axe at
  3 widths, contrast, headings, Lighthouse). 6 new tests (772 JS total).
- 2026-10-31 — F050 Signal built (branch f050-signal-template, PR
  stacked on #37): a second StarterSpec, templates/signal.crust, passes
  check:template. On dark sections buttons are white (orange on near
  black is 3.8:1, so Crust's section styles switch it).
- 2026-10-31 — F051 Corner built (branch f051-corner-template, PR
  stacked on F050's). Milestone 5 (F045–F051) is fully built; waiting on
  the owner's review and merge. Noticed: the "highlight" link style
  reads as a grey-beige block on yellow cards (Crust's shared style, not
  this template); flagged to the owner.
- 2026-10-31 — Milestone 5 merged to main in order (#33 → #39), owner:
  "Merge them all in order". All seven were green before merging.
- 2026-10-31 — Owner: Harbour should be as good as the YOOtheme Fuse demo
  at minimal; added F052 "Harbour, premium-minimal rework" (CC0 photos,
  best ones; design snapshot first). Two small proposals (header over
  hero photo, latest posts block) and the highlight-link fix are in
  DECISIONS → Proposals. Owner asked for a new session.
- 2026-10-31 — F052 started: ten CC0 photos picked and credited
  (scripts/starter-templates/photos), design snapshot with two
  directions published (https://claude.ai/artifact/FksfsnM6msMtjBu4v5YHDm,
  A recommended). Waiting for the owner's pick (BLOCKED.md); nothing
  built yet.
- 2026-10-31 — F052 photos round 2: 1,931 more CC0 candidates from
  NegativeSpace and Skitterphoto; six replace current picks, plus a new
  hero for direction B. Comparison:
  https://claude.ai/artifact/2hkW4FDzmjPcXuzjYG4FYS. Waiting for the
  owner (direction A/B and the photo set).
- 2026-10-31 — F052 built (owner: "A, photos as recommended"): Harbour
  uses the ten CC0 photos (photos/, CREDITS.md) and the photo-led
  layout of direction A: photo opening (light veil), statement band,
  tall-beside-two-wide mosaic, services as quiet links, journal cue
  with a hiring line; Work page has two mirrored mosaics, a statement
  line and a full-width photo; About uses the studio photo. Signal and
  Corner unchanged. done_check passes (starter tests + check:template:
  axe at 3 widths, contrast, headings, Lighthouse). 783 JS tests.
  **Owner to test:** Start from a template → Harbour on the PR preview
  link; needs `reviewed: true` after.
- 2026-10-31 (night, Jakarta) — Live-site publish checked (run 3 OK).
  Milestones 6 and 7 written (docs/milestone-6.md, -7.md, F054–F068,
  launch-only owner tasks in BLOCKED.md). F054 Content store done on
  branch `f054-content-store` (stacked on PR #42): the admin's server code
  runs on a local folder with its own history (`.crust/`); no visible
  change. Nothing for the owner to test yet. F053 photo picks and the
  delegated review are in progress.
- 2026-11-01 — Owner: "go with all your recommendations" (review option
  A). F069 Review fixes built (branch `f069-review-fixes`, stacked on
  F054): fixes 1–10 from the review, done_check exit 0. **Owner can try
  on the preview link:** Tab once in the builder ("Skip to page"); open
  and close Publish/Rename/Delete with the keyboard (focus comes back);
  a blog post (text in the column); Start from a template → Harbour (the
  headline is visible); select a Section and use "Make linked" (no
  sideways jump); rename a page that's in the menu (menu link follows).

- 2026-11-01 — F055 Desktop app shell built (branch `f055-desktop-shell`,
  from main). `crates/crust-desktop` (Tauri 2) opens the builder in a
  window; the site lives in Documents/Crust/My site with its own history
  (F054); the builder's server handlers run inside the window. CI now
  opens the real window on a virtual screen and checks saving, history,
  photos and the folder fence (8 checks, all pass). Mac/Windows
  installers: Actions → "Desktop installers" → Run (by hand, ~150 counted
  minutes, unsigned). done_check exit 0; 879 JS + 12 desktop Rust tests.
  **Owner can try:** nothing in the browser. If you want the app on your
  Mac now, say "build the Mac installer" and Claude starts the workflow
  (it uses about 150 of the 2,000 free minutes); open it with
  right-click → Open the first time. Window screenshot:
  design/f055-app-window.png. Next: F056 Publish on your computer.

- 2026-11-01 — F056 Publish on your computer built (branch
  `f056-publish-on-computer`, stacked on F055 / PR #46). In the app, the
  Publish card offers **Export site folder** and **Preview in browser**
  (design snapshot https://claude.ai/artifact/JdsQXqRu8kTu5KwQQ8qcb9,
  direction A built; screenshot design/f056-app-publish-card.png). The
  builder renders with the same code as the publish pipeline (byte-for-
  byte the same files on Harbour, Signal and Corner); the app checks,
  resizes photos and builds search with crust-publish and Pagefind as
  libraries. done_check exit 0; 898 JS + 24 desktop + 23 publish Rust
  tests; the window self-check (11 checks) now also builds, previews and
  exports. **Owner can try:** only in the app (Mac installer by hand,
  ~150 counted minutes; ask Claude). The web admin is unchanged.


- 2026-11-01 — F057 Several sites built (branch `f057-several-sites`,
  stacked on F056 / PR #47). The app keeps one folder per site in
  Documents/Crust and opens the one used last. A **Sites screen**
  (Pages → "All sites") lists them with Open, New site, Rename,
  Duplicate, Delete, and Recently deleted (30 days, then removed for
  good). Design snapshot https://claude.ai/artifact/7nKCuGhkAuhTJ5gMEXxfw3
  (direction A built); screenshot design/f057-sites-screen.png.
  done_check exit 0; 920 JS + 37 desktop Rust tests; the window
  self-check (14 checks) now also makes, renames, copies, deletes and
  restores a site. **Owner can try:** only in the app (Mac installer by
  hand, ~150 counted minutes; ask Claude). The web admin is unchanged
  (one site, no Sites screen).

- 2026-11-01 — F058 Publish to Cloudflare Pages or Netlify built (branch
  `f058-publish-to-host`, stacked on F057 / PR #48). In the app, the
  Publish card offers **Cloudflare Pages** and **Netlify**: a short
  dialog shows how to make a token on the host's site (with a button
  that opens that page), checks the pasted token straight away, then
  asks for the address (harbour-studio.pages.dev). After that the card
  has one **Publish** button, says where the site goes and when it last
  went there, and shows upload progress ("Uploading 14 of 38 files");
  only changed files are sent. The token is kept in the Mac Keychain
  (Windows: Credential Manager), never in the site folder. Clear
  messages for a wrong token, an expired token ("Paste a new token"), a
  taken address (offers a free one), a project deleted on the host, no
  internet, and page problems. Design snapshot
  https://claude.ai/artifact/DMXMZc8NdDTNRXSFEBBuah (direction A built);
  screenshots design/f058-*.png. done_check exit 0; 948 JS + 70 desktop
  Rust tests (the hosts are played by a fake server on the computer, so
  no real account is touched). CI's time limit raised from 35 to 45
  minutes (DECISIONS F058). **Owner can try:** only in the app (Mac
  installer by hand, ~150 counted minutes; ask Claude), with your own
  free Cloudflare or Netlify account. The web admin is unchanged.

- 2026-11-01 — F059 Publish by FTP or SFTP built (branch
  `f059-ftp-sftp`, stacked on F058 / PR #49). In the app, the Publish
  card offers a third choice, **Your own web host (FTP or SFTP)**. One
  form takes the details from the host's welcome email (SFTP
  recommended, FTPS, or FTP with a visible warning), signs in and
  checks it can write in the folder before saving anything. **Publish**
  then sends only new or changed files (photos first, pages last) and
  removes files it sent before that are gone; files it didn't send are
  never touched. Password in the keychain. SFTP remembers the server's
  key and stops if it changes. "Send every file next time" in the
  Change dialog. No snapshot (the feature doesn't ask for one);
  screenshots design/f059-*.png. done_check exit 0; 960 JS + 88 desktop
  Rust tests, 18 of them against real FTP, FTPS and SFTP servers started
  inside the tests. Builder accessibility check covers four new screens
  (no issues). **Owner can try:** only in the app, with your own web
  host's FTP or SFTP details (any shared hosting). Never tried against a
  real host here; if it fails, the message says what the server said.

- 2026-11-01 — F060 First run built (branch `f060-first-run`, stacked
  on F059 / PR #50). A brand new Crust app opens on a welcome screen:
  pick Harbour, Signal, Corner or Blank, name the site (suggested from
  the template), **Make my site**, and land in the builder on Home with
  **To replace** open and focus on its heading. Shown only when there is
  one empty site and nothing was ever deleted. Design snapshot
  https://claude.ai/artifact/Lx5SeC9B1GmSN3ztFebA3t (direction A built);
  screenshots design/f060-*.png. done_check exit 0. The app's window
  self-check in CI now goes through the welcome screen; tried by hand in
  the real window with Harbour too. Side fix: the app's own error words
  (e.g. "The disk is full.") now show instead of "Couldn't reach
  GitHub". Found, not fixed: unsaved colours and drafts are shared
  between sites in the app (DECISIONS Proposals, "Browser copies in the
  app"). **Owner can try:** only in the app, on a computer that never
  had Crust (or after moving the Documents/Crust folder away).

- 2026-11-02 — F061 Updates built in (branch `f061-updates`, stacked on
  F060 / PR #51). The app checks for a newer Crust 15 s after opening
  (then at most daily), downloads it in the background, checks its
  signature, and installs it when Crust quits; a banner on the Pages and
  Sites screens offers Restart now / What's new / Later, and the Sites
  screen's Crust card has Check for updates. Releases go to a free
  Cloudflare Pages site (`crust-downloads`) through the Desktop
  installers workflow ("Put on the downloads site", off by default).
  New "Make update key" workflow and owner guide `docs/setup-updates.md`
  (BLOCKED.md updated). No snapshot (not asked for); screenshots
  design/f061-*.png. done_check exit 0: 101 desktop Rust tests (11 for
  updates, against a fake downloads site, including a file signed by
  the real Tauri tool) and 28 JS tests for updates; builder
  accessibility check covers three new screens (no issues). **Owner can
  try:** nothing yet; it needs the update key (docs/setup-updates.md)
  and a release run, both your call.

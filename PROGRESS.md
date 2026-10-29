# Progress

Read this first in every session. Keep it short: replace "Current", append
to "Log".

## Current

- **Milestone:** 1 complete. F001–F024 pass; setup done; first real
  publish live at https://crust-site.pages.dev (2026-10-29).
- **Merged to main:** F001–F024 (PRs #1–#6).
- **Merged:** "Page not found" page (PR #7), live since the second publish.
- **Setup (done 2026-10-29):** Access app `crust-admin.pages.dev` ("Only
  me", one-time PIN); Pages "Restrict previews" app for
  `*.crust-admin.pages.dev`; GITHUB_TOKEN, ACCESS_TEAM_DOMAIN, ACCESS_AUD
  on crust-admin (Production). /api/status reports configured.
- **Next:** F026 Layout library (design snapshot first). F025 Section
  styles is done and waiting for the owner's review.
  Other proposals waiting in DECISIONS.md (sign-out button, restore
  brings back the redirect).
- **Waiting on the owner:**
  - Check the live site on his phone.
  - Review on the preview link and set `reviewed: true`: F010, F004, F003,
    F005, F012, F013, F014, F007, F008, F015, F016, F017, F018, F019, F020,
    F021, F022, F023, F024, F025.
- **Reminder:** the Cloudflare API token expires on the date the owner set
  (recommended 2027-01-26), and the GitHub token (crust-admin-save) after
  90 days, around 2027-01-27. Both fail with a clear error; make a new one
  and replace the secret.

## Known gaps

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

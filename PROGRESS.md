# Progress

Read this first in every session. Keep it short: replace "Current", append
to "Log".

## Current

- **Milestone:** 1 (first working slice)
- **Done:** F001, F010 Preview deploy, F002 Output validation, F004 Columns
  and Card, F003 Site settings. F010, F004 and F003 await owner review.
- **Next:** F005 Keyboard-accessible editing.
- **Waiting on the owner:** review F010, F004 and F003 on the preview link;
  merge PR #1 so `main` gets the stable production preview.
- **For the owner to test:** https://claude-f010-github-actions-d.crust-admin.pages.dev
- **Reminder:** the Cloudflare API token expires on the date the owner set
  (recommended 2027-01-26). Deploys fail with a clear error when it does;
  make a new token and replace the `CLOUDFLARE_API_TOKEN` secret.

## Known gaps

- An Image block with no URL publishes its placeholder text. Proposed fix
  in DECISIONS.md.
- The admin app is now deployed but hasn't been checked by a person in a
  real browser yet; the owner's first look is the F010 review.
- Button block has no alignment option, so it sits left in centred sections.
  Not part of F004's description; needs the owner's go-ahead.
- Focus outline on buttons uses the text colour, which is low-contrast on
  a Primary background. Fits F005 (visible focus).

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

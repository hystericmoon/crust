# Progress

Read this first in every session. Keep it short: replace "Current", append
to "Log".

## Current

- **Milestone:** 1 (first working slice)
- **Done:** F001 Project skeleton, F010 Preview deploy (awaiting owner
  review), F002 Output validation
- **Next:** F003 Design tokens and Site settings screen
- **Waiting on the owner:** review the F010 preview link; merge PR #1 so
  `main` gets the stable production preview.
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
  Candidate for F004.

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

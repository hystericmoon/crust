# Progress

Read this first in every session. Keep it short: replace "Current", append
to "Log".

## Current

- **Milestone:** 1 (first working slice)
- **Done:** F001 Project skeleton
- **In progress:** F010 Preview deploy (owner-added). Workflow built and
  linted; waiting on the Cloudflare secrets for the first real deploy.
- **Next:** F002 Output validation, once F010 passes.
- **Waiting on the owner:** Cloudflare API token + Account ID as GitHub
  secrets (see BLOCKED.md).
- **For the owner to test:** the preview link, once the first deploy runs.

## Known gaps

- The admin app builds, but hasn't been opened in a real browser yet (no
  browser in the cloud session). First browser check happens once Cloudflare
  gives it a preview link.
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

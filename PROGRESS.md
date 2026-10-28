# Progress

Read this first in every session. Keep it short: replace "Current", append
to "Log".

## Current

- **Milestone:** 1 (first working slice)
- **Done:** F001 Project skeleton
- **Next:** F002 Output validation (no owner input needed)
- **Waiting on the owner:** Cloudflare account (see BLOCKED.md), needed
  before the admin can get a preview link and before F006/F008.
- **For the owner to test:** nothing yet. The admin can't be opened until
  Cloudflare Pages is connected.

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

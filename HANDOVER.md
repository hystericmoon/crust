# Handover

The one file a new Crust session reads to pick up the work. Keep it
short (under ~150 lines): update "Where things stand" and "Next" when a
feature is finished, and move the finished feature's notes to
docs/archive/handover-history.md.

**Start of every session (and after every `/clear`):** the `crust-start`
skill (`.claude/skills/crust-start/SKILL.md`). While building:
`crust-lean`. Finishing: `crust-finish` (it holds the "Ready to clear"
message the owner asked for every time). Content JSON: `crust-content-format`.

## Model plan (owner, 2026-11-03)

The owner picks the model per feature; `crust-start` checks it before
any work.

| Next feature | Model | Why |
|---|---|---|
| App UX redesign: research + design snapshot (not in features.json yet) | Opus | Owner's request 2026-11-06; design judgement and wide research |

Every row of the plan confirmed on 2026-11-03 (F063–F068) is built.
The message after every `/clear` stays the same: "Read HANDOVER.md on
branch <branch> and continue" (branch below, under "Last updated").

Last updated: 2026-11-06 (Jakarta), branch `ccr-d50f7e80-weuq18`. **PR #81
open** (review fixes, Mac launch test, Mac app fix); CI green; the owner
merges. **The Mac app opens on the owner's Mac** (Apple chip, macOS 27.2)
with the installer from desktop-release run 42159771953 (artifact
`crust-mac`, expires 2026-12-06): it was unsigned as a bundle and hung at
start-up; now ad-hoc signed, with a Documents fallback (DECISIONS
2026-11-06). **Owner's words (2026-11-06):** "the ui ux for the app itself
is not very nice and friendly. we need to see how squarespace, wix,
webflow made theirs. compare with us. use the best claude skills to
redesign ours." That is the next piece of work (see Next).

## Where things stand

- **main** has everything, through PR #79 (2026-11-05). From now on:
  **one PR per feature**, the session branch restarted from main after each
  merge.
- **Live site** https://crust-site.pages.dev, published 2026-10-31. Only
  the owner publishes.
- **Admin** https://crust-admin.pages.dev (main). Preview of the session
  branch: https://ccr-d50f7e80-weuq18.crust-admin.pages.dev (can't save).
- **Store** (F063-F068) is free and was published from main on 2026-11-05
  (Publish store, real payments off) to https://crust-store.pages.dev; if
  that address doesn't load, check the run in Actions. Three free templates,
  one Licence page. Paid-store pages return when a template gets a price.
- **Repository is public** since 2026-11-03 (owner; free CI). Never commit
  paid template files while public; make CI lighter before it goes
  private again (DECISIONS "Repository public for now").
- **Desktop app** (F055–F062) installed and opened by the owner on
  2026-11-06. The welcome screen shows; a fresh download needs "Open
  Anyway" once (no Apple Developer ID; $99/year, his call). Mac launch
  test: Actions → Desktop launch test (by hand). Repo public, so installer
  runs are free; mac-only runs are quicker.
- **Review round** for 26 features:
  https://claude.ai/artifact/C3czUd4fpf5Qz6t2WqAkwZ (PROGRESS.md
  "Waiting on the owner" says how to read the answers). Check it at the
  start of a session: record each `pass` as `reviewed: true` in
  features.json (with the owner's note as `review_note`), list each
  `fix` for the owner and ask before reworking.
- Owner-facing notes still open: Pagefind brings minicbor (BlueOak) and
  Tauri MPL-2.0 packages (allowed since 2026-11-02); F058/F059 never tried
  against a real host; F061 never tried with a real release.

## Next

### Checkpoint (2026-11-06): App UX redesign, research done

Done:
- [x] Review pages checked: no new answers (F075, F078 still waiting).
- [x] Competitor research (Squarespace, Wix, Webflow) and Impeccable
  critique, Assessment A (design review, 24/40). Both condensed in
  `design/ux-audit/NOTES.md`, with three drafted directions (A "One
  studio" is Claude's pick).
- [x] Screenshots of today's screens: `design/ux-audit/*.png`. To retake:
  serve apps/admin/dist with scripts/serve-static.mjs, inject
  scripts/fake-tauri.js (`window.__FAKE_TAURI__ = {host:"connected"}`),
  playwright-core with executablePath /opt/pw-browsers/chromium (the
  pattern in scripts/check-builder-a11y.mjs).
Left:
- [ ] Impeccable critique Assessment B (detector) was stopped half way:
  rerun as a helper agent (`sh <impeccable skill>/scripts/impeccable
  detect --json apps/admin/src`, plus axe on #/, #/edit?path=/,
  #/settings, #/templates; run axe BEFORE injecting the overlay).
- [ ] Publish one Artifact (`design/app-redesign-v1.html`): the comparison
  screen by screen (Crust screenshot vs how the three do it), the
  critique, and directions A/B/C drawn as UI with before/after (editor and
  site home), A marked as the pick. Embed small JPEGs (ffmpeg scale=960,
  q 5; ~40-70KB each).
- [ ] Propose features in DECISIONS.md → Proposals; owner picks; build only
  after that. Short plain-language chat summary for the owner.

**App UX redesign (owner's request, 2026-11-06).** Not in features.json:
scope is his, so plan first, then he approves features.
1. Research how Squarespace, Wix and Webflow do the app itself: first run
   and onboarding, choosing a template, the editor (canvas, adding
   sections, editing text and images, settings panels), pages and site
   settings, preview/publish, empty states, help. Use helper agents for
   the wide web research (crust-lean).
2. Walk Crust's own admin the same way (preview
   https://ccr-d50f7e80-weuq18.crust-admin.pages.dev or `npm run dev`
   with Playwright screenshots) and compare, screen by screen.
3. Use the design skills (impeccable for the critique and audit,
   design-taste-frontend for app screens, emil-design-eng, ui-ux-pro-max)
   and publish one Artifact: the comparison, what to change, and 2–3
   redesign directions drawn as UI with Claude's pick marked
   (owner's preference: before/after mockups, short chat summary).
4. Propose the work as features in DECISIONS.md → Proposals; the owner
   adds them. Build only after he picks.
Still waiting on him: F075 (phone test) and F078 (his call) from review
round two (https://claude.ai/artifact/H27p62B6N3YTjLbLAz8Wxp); F055's
"GitHub" wording (about 70 strings) can fold into the redesign.

## Where to find things

| What | File |
|---|---|
| Product, architecture, content format | docs/spec.md (skill `crust-content-format`) |
| Session routines | .claude/skills/crust-*/SKILL.md |
| Milestone plans | docs/milestone-7.md, docs/milestone-8.md (earlier: docs/milestone-*.md) |
| Next feature, model, review queue | `npm run next` (scripts/next-feature.ts) |
| Every feature, its done_check and status | features.json |
| Current state, what the owner should test | PROGRESS.md |
| Why things are the way they are | DECISIONS.md (search by feature id) |
| What only the owner can do | BLOCKED.md |
| User-visible changes | CHANGELOG.md |
| Older handover and progress notes | docs/archive/ |
| Setup guides for the owner | docs/setup-*.md |

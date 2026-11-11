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

Every feature in features.json is built (F001 to F093); there is no next feature to start. The owner asked on
2026-11-10 for Sonnet and Haiku only ("Keep everything using sonnet and haiku"). Milestone 9 plan: docs/milestone-9.md.

Every row of the plan confirmed on 2026-11-03 (F063–F068) is built.
The message after every `/clear` stays the same: "Read HANDOVER.md on
branch <branch> and continue" (branch below, under "Last updated").

Last updated: 2026-11-11, F094 passed and merged (PR #82); branch `ccr-d50f7e80-weuq18` restarted from main.

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

**No unbuilt features are left** (`npm run next` says so) and nothing waits for the owner's review. 2026-11-11: F094 passed
and **PR #82 is merged** (main has everything). The branch was restarted from main; one PR per feature from now on.
Scope is the owner's: new ideas go to DECISIONS.md "Proposals", never into features.json. Use Sonnet (his rule).

Where things are (Milestone 9): tokens `apps/admin/src/app-theme/app-theme.css` (use `--app-*` for every colour; a guard test
fails on raw colours); `app-frame/` (top bar, `EditorBar`, `railPlugins`, `useAutosave`); `page-first/` (F087);
`layouts/AddSectionPanel` (F088); `inline-text/` (F090); `pages-panel/` (F091); `styles-panel/` (F092);
F093: `keyboard/puck-chrome.ts` (landmarks), `keyboard/drag-status.ts`, `keyboard/focus-clear.ts`,
`settings/heading.tsx`, test `app-words.test.tsx`, `scripts/check-builder-a11y.mjs` (now scans the page preview, Styles
panel and Site settings sheet). Details per feature in DECISIONS.md (search the id). Words: use "saved", "kept in this
browser", "publish", "your site"; never "GitHub" in screen text (the F093 test fails on it).

React Bits code can't be used (MIT + Commons Clause): aesthetic only (DECISIONS 2026-11-06).

Notes from 2026-11-10 (night run, all built with Sonnet on the owner's word "keep everything using sonnet and haiku"):
- F090 fix after F093 (commit 1c6c5c1): a real mouse click never opened typing (Puck sets `pointer-events: none`
  inside blocks); now a capture-phase listener (`useClickToType`). check:builder uses a real click.
- CI once failed `ftp::tests::ftps_connects_with_a_trusted_certificate` (crates/crust-desktop, "InvalidContentType")
  on abf9e15, a push with no Rust change; it passed locally and on every later push. If it fails again, root-cause the
  local FTPS test server rather than re-running.

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


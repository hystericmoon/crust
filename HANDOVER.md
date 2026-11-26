# Handover

The one file a new Crust session reads to pick up the work. Keep it
short (under ~150 lines): update "Where things stand" and "Next" when a
feature is finished, and move the finished feature's notes to
docs/archive/handover-history.md.

**Start of every session (and after every `/clear`):** the `crust-start`
skill (`.claude/skills/crust-start/SKILL.md`). While building:
`crust-lean`. Finishing: `crust-finish` (it holds the "Ready to clear"
message the owner asked for every time). Content JSON: `crust-content-format`.

## Checkpoint (2026-11-11, updated at the owner's request to clear): real-world tries and the home page

Done today (all on main, nothing open): automatic merge and publish (`automerge.yml`); contact form (F037 closed); site menu in the editor no
longer slides under the rail (PR #88); template preview now fills the screen (PR #90); release fixed in three steps (early key check,
the key passed into Tauri's config, installers on a GitHub release because Pages refuses files over 25 MiB; DECISIONS 2026-11-11).
- **Release 0.1.1 is live**: https://crust-downloads.pages.dev (feed there, files on GitHub release v0.1.1). **The owner installed it on his
  Mac and it opens.** He found "a couple of bugs" and will send them later (he could not share when he said it): ask him first thing.
- **Home page is live** (owner chose option B): https://crust-home.pages.dev, built with Crust (`home/content`), published by hand with
  Actions -> Publish home (`publish-home.yml`). He has not yet said what he thinks of it. It leaves out "Updates itself" until 0.1.2 proves it.
- Option pages (Claude artifacts, private): options https://claude.ai/artifact/GbFfvBCb95Qc2ZzZ2cuf7M, draft https://claude.ai/artifact/CEvDDzYVRAjxUCEUcPEtrE.

Next, in order:
00000. **Two-level left menu: step 1 (F100) and step 2 (F101, all-sites screen: Sites cards, Templates browse, Settings) are both built (2026-11-25), waiting for the owner's review.** F101 code: `app-frame/SiteNav.tsx` (`AllSitesNav`), `sites/AllSitesViews.tsx`, `sites/SitesScreen.tsx` (cards); DECISIONS "F101". Nothing is left to build in this item. Original notes for F100: F100/F101 are in features.json. Read DECISIONS "F100: a left menu inside each site" (where each item goes; Media is a new `#/media` screen; Site settings groups are addressable). Code: `app-frame/SiteNav.tsx`, `SiteShell.tsx`, `media/MediaScreen.tsx`; the old dropdown is gone. F101: `#/sites` (desktop) gets level 1 (Sites, Templates, Settings; sites as cards); drill into a site shows level 2 with "← All sites" back; focus to the new heading; web opens straight into level 2. Final screens (private): https://claude.ai/artifact/WAudsU5VLCm13PzYRmXt9V . Show him a browser preview after each step. Open question for him: Settings still shows its own group list beside the menu (two lists on that screen).
0000. **Audit fix queue (2026-11-25): done except six items.** Merged: A303, A209, A105, A110, A103, A006. **PR #118 merged** (16 fixes in one PR, owner allowed batching: A003, A004, A007, A008, A104, A109, A111, A112, A113, A203, A206, A208, A306, A307, A308, A309). The patch files are gone. **Left, all the owner's calls, do not build:** A005 (audit says leave), A205 (what should "view the page after Save" link to?), A310 (3 options in PROGRESS), A207 (Rust change, untested), A100/A106 (wait for his Mac check). Branch restarted from main (2026-11-25). Next session: ask him about the six. Tips: in a sandbox worktree, `node_modules` as a symlink makes vitest refuse `styles.css?raw`; use an untracked `vitest.nofs.config.ts` (mergeConfig of vitest.config with `server.fs.strict=false`) and never commit it. Four tests (local-publish x3, home-site) fail in the sandbox with "React is not defined" but pass in CI.
000. **UI/UX audit: Gate 2 done (2026-11-25).** Owner chose the recommended option on all five decisions; fixed in PRs #103 to #107 (merged; decision 4 built as a variant, DECISIONS 2026-11-25). 40 findings stay open in `docs/audit/findings.json` (none S1). **Owner, 2026-11-25: "after we clear, start on the open findings": work through them S2 first (A102, A103, A106, A108, A202 follow-ups, A203, A206, A207, A209 etc.; list with `status: open`), then S3, one PR per fix, one at a time (CI about 25 min each; wait for each merge before the next). Do not take A100/A106 until he confirms on his Mac; skip any that need a product call and list them for him.** Ask him whether A100 (broken "sample-site" template card) and A106 ("fields marked in red" with no red field) show on his Mac. Report https://claude.ai/artifact/3z5gZQ86svBbzgMBoriYF3. He said 2026-11-25: drop the 0.1.1 bugs item (do not ask again). Older notes: He asked for a full deep audit (Haiku for mechanical work, Sonnet for judging, Opus max 3 calls, **no humans in any test**). Method and rules: skill `crust-audit`; plan `docs/audit/PLAN.md`; 104 screens `docs/audit/inventory.md`; pilot (areas 1 and 3) findings `docs/audit/findings.json` (8, none S1); capture script `scripts/audit/capture.mjs` (v2, verified; v1 was discarded after a spot-check). Report: https://claude.ai/artifact/GeZQkwzeLFETvfLVQc3cLb ; plan page https://claude.ai/artifact/QkWLECje1aAKrrYsh7K3ay. **Ask him:** scale to the other 10 areas (recommended, plus the naive-agent run and four-lens walkthrough on first-run-to-published), fix the pilot findings first, or stop. Fixes need his pick (Gate 2); audit never edits features.json. Opus used 0 of 3. The Design and Axe plugin card was never enabled by him; the Design plugin's public checklists were borrowed into crust-audit. Spot-check any Haiku numbers before using them.
00. **Milestone 10 (an easier editor) is built and PASSED by the owner (F095 to F099, 2026-11-24)**; Puck's default Blocks/Outline/Fields rail icons are hidden (PR #99). Audit findings A001 ("Move down" label shown twice on the section toolbar) and A002 (a button named "root" in top-level section settings) come from F097/F099; fix only on his pick.
0. (done) F095 passed.
1. Ask the owner for the bugs he saw in 0.1.1 (app, home page or downloads page). Fix what he reports, one PR per fix (automatic merge).
2. **0.1.2 is built and on the downloads page** (Actions -> Desktop installers run 7, success, 2026-11-11 ~18:30 Jakarta; Mac, Windows, Linux).
   Waiting on the owner: does his installed 0.1.1 show "update ready"? Only he can see it. If yes, add the "Updates itself" point back to
   the home page (`home/content`) and run Actions -> Publish home; record F061 as tried in DECISIONS. If no, find out why.
3. F058: the owner tries Publish to Cloudflare Pages from the app with a TEST project `crust-app-test` (never `crust-site`, the live site) and a wrong token.
   F059: waiting to hear if he has an FTP/SFTP host; if not, note "no host to test with" and skip. Do not buy anything.
Record the results in DECISIONS.md (F058/F059/F061) and remove "never tried" from the notes.
Start of next session: PR #122 (finish-routine rule, crust-finish step 9) may still be open: check it, fix CI if red. Then reset the session branch from main (the last session was blocked from doing it).
Notes: `npm run check:builder` scans the last built admin: run `npm run build` first or it checks stale code (this hid a failure on F101). The pre-push hook (`scripts/hooks/pre-push.sh`) did not fire for pushes in the session that created it; check it fires now.
The Cloudflare token `crust-github-preview` expires 2027-01-26. A session cannot start new URL watches after 10 (artifact watch limit); not needed.

## Model plan (owner, 2026-11-03)

Every feature in features.json is built (F001 to F093); there is no next feature to start. The owner asked on
2026-11-10 for Sonnet and Haiku only ("Keep everything using sonnet and haiku"). Milestone 9 plan: docs/milestone-9.md.

Every row of the plan confirmed on 2026-11-03 (F063–F068) is built.
The message after every `/clear` stays the same: "Read HANDOVER.md on
branch <branch> and continue" (branch below, under "Last updated").

Last updated: 2026-11-25 (F101 built, see item 00000); branch `ccr-d50f7e80-weuq18`.

## Where things stand

- **main** has everything, through PR #79 (2026-11-05). From now on:
  **one PR per feature**, the session branch restarted from main after each
  merge.
- **Live site** https://crust-site.pages.dev, published 2026-10-31. Since 2026-11-11
  merge and publish are automatic (`automerge.yml`; label a PR `hold` to stop it).
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
**Free first (owner, 2026-11-11):** no budget for a domain, app signing or payments, so those rows are parked in BLOCKED.md
(DECISIONS "Free first"). Contact form email (F037) works since 2026-11-11 (owner got the test email; Worker crust-contact, page /contact, published by the automatic publish). The app update key (F061) was entered by the owner on 2026-11-11 from run #2 of Make update key (two secrets + CRUST_UPDATE_PUBKEY;
not yet proven by a real release, because he wasn't sure earlier values came from the same run, so all three were re-entered). Open for him: trying
F058, F059 and F061 once for real. Scope is the owner's: new ideas go to DECISIONS.md "Proposals", never into features.json. Use Sonnet (his rule).

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


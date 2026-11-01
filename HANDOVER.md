# Handover

The one file a new Crust session reads to pick up the work. Keep it
current: update "Where things stand" and "Next" every time a feature is
finished and before a session ends. Details live in the files linked
below; this file says where to look and what to do.

Last updated: 2026-11-02 (Jakarta): F062 Premium templates in the
gallery built and passing on branch `f062-premium-templates` (stacked
on `f061-updates` / PR #52), PR #53. Milestone 6 is complete (F055–F062).
F061 is PR #52 (on #51), F060 PR #51 (on #50), F059 PR #50 (on #49),
F058 PR #49 (on #48), F057 PR #48 (on #47), F056 PR #47 (on #46), F055
PR #46, F053 PR #45 (none merged; the owner merges). Next: F063 Store
site (Milestone 7, design snapshot first).
**The F061/F062 session was at the session-chain limit (depth 8)**, so
it couldn't start the next session: the owner starts a fresh one with
"Read HANDOVER.md on branch f062-premium-templates and continue." That
resets the chain. The new session archives the F061/F062 session once
it's idle and subscribes to PRs #45–#53.

## How sessions work (owner's rule, 2026-10-30)

The owner said: work in a single session; when a task is finished or the
session is getting full, start a new session and close the previous one;
always write the information down somewhere. So:

1. **One session at a time.** Only the newest Crust session works. When a
   session starts, it archives the session that created it
   (`archive_session`, the parent named in the handover prompt) and any
   other idle Crust session still open. Never archive sessions of other
   projects (Adwam, Whittle, OpenRef, Smol).
   **Limit found 2026-10-31:** a chain of sessions, each started by the
   one before, stops at depth 8. The F048 session was at the limit, so
   it could not start the next session or set reminders (send_later). If
   `create_session` is refused, tell the owner to start a fresh Claude
   Code session on the crust repo with the prompt from step 2; that
   resets the chain.
2. **Write first, then move.** After each finished feature (or when the
   context is getting long): commit and push, update this file,
   PROGRESS.md and CHANGELOG.md, then create the next session
   (`create_session`) with a short prompt that says "Read HANDOVER.md on
   branch <branch> and continue", plus anything not yet written here.
3. **Tell the owner** in plain language what was finished, what he can
   try, and that a new session took over (with its title).
4. Never stop without doing 2 and 3. "Keep on continuing, don't stop."

## The owner

Hosni (GitHub `hystericmoon`), senior product designer, not a developer.
Tests as a user from a browser (office Mac, phone); never runs commands.
Write to him in plain language, from a user's point of view. Peer-level on
visual design; explain the reasoning behind UX choices (heuristics,
research). Always flag accessibility.

Standing instructions:
- "Keep on continuing, don't stop": keep building the current milestone
  without waiting for him.
- Don't merge feature PRs to main, and don't press Publish on the live
  site, unless he says so in his own words.
- Scope is his: never add items to features.json. Proposals go in
  DECISIONS.md → Proposals.
- Design snapshots (Artifacts with 2–3 directions) before visual features;
  build Claude's recommended direction unless the feature says the owner
  must pick first.

## Rules that always apply

CLAUDE.md (session protocol, decision policy, engineering rules) and
docs/spec.md (the product and the content format). In short: one feature
at a time, tests for everything, its `done_check` must exit 0 before
`passes: true`, WCAG 2.2 AA, free open-source dependencies only, no
secrets in code or chat, work on branches, no force-push.

Start of every session: `scripts/init.sh`, then read this file,
PROGRESS.md, features.json, `git log --oneline -20`.

Before every push: `npm test`, `npm run typecheck`, `cargo test`,
`cargo clippy -- -D warnings`.

## Where things stand

- **Live site** https://crust-site.pages.dev: published 2026-10-31
  (Milestones 1–5). Only the owner decides when to publish.
- **Admin** https://crust-admin.pages.dev: main, Milestones 1–5
  (F001–F051) merged (Milestone 5: PRs #33–#39, 2026-10-31).
- **Milestone 5 "Templates"** (docs/milestone-5.md), F045–F049:

| Feature | Status | Branch / PR |
|---|---|---|
| F045 Save a site as a template | built, passes, CI green | `f045-template-file`, draft PR #33 (base main) |
| F046 Placeholder content | built, passes, CI green | `f046-placeholders`, draft PR #34 (stacked on #33) |
| F047 Template quality check | built, passes, CI green | `f047-template-check`, draft PR #35 (stacked on #34) |
| F048 Start from a template | built, passes | `f048-start-from-template`, draft PR #36 (stacked on #35) |
| F049 First starter template: Harbour | built, passes | `f049-starter-template`, draft PR #37 (stacked on #36) |
| F050 Second starter template: Signal | built, passes | `f050-signal-template` (stacked on #37) |
| F051 Third starter template: Corner | built, passes | `f051-corner-template` (stacked on F050) |
| F053 Signal and Corner with real photos | built, passes, CI green | `f053-signal-corner-photos`, PR #45 |
| F055 Desktop app shell (M6) | built, passes, CI green | `f055-desktop-shell`, PR #46 (base main) |
| F056 Publish on your computer | built, passes, CI green | `f056-publish-on-computer`, PR #47 (stacked on #46) |
| F057 Several sites | built, passes, CI green | `f057-several-sites`, PR #48 (stacked on #47) |
| F058 Publish to Cloudflare Pages or Netlify | built, passes, CI green | `f058-publish-to-host`, PR #49 (stacked on #48) |
| F059 Publish by FTP or SFTP | built, passes, CI green | `f059-ftp-sftp`, PR #50 (stacked on #49) |
| F060 First run | built, passes, CI green | `f060-first-run`, PR #51 (stacked on #50) |
| F061 Updates built in | built, passes, CI green | `f061-updates`, PR #52 (stacked on #51) |
| F062 Premium templates in the gallery | built, passes, needs owner review | `f062-premium-templates`, PR #53 (stacked on #52) |

- **Merge order when the owner says so:** #33, then #34, then #35, then #36 (GitHub
  retargets each to main as the one below merges), then the rest in
  feature order. Each later PR is stacked
  on the one before it.
- **Waiting on the owner:** see PROGRESS.md "Waiting on the owner"
  (preview links to try, F034–F046 still need `reviewed: true`), and
  BLOCKED.md (F037 contact form email setup, F044 buying a domain).
- **Design snapshots so far:** roadmap
  https://claude.ai/artifact/4eHUDzJ3tDeeaNPBf4T4ii, F042
  https://claude.ai/artifact/1d1Ujx7ENSrGCef6CWfg9Z, F043
  https://claude.ai/artifact/DSXzme9pbKie3guoRpSizj (A built for both), F048
  https://claude.ai/artifact/JQoY8bbRJ9U58jZawRx2kV (A built), F052
  https://claude.ai/artifact/FksfsnM6msMtjBu4v5YHDm (waiting), F053
  https://claude.ai/artifact/B3dfAGM3m15EcN1n83oooB (A built for both), F056
  https://claude.ai/artifact/JdsQXqRu8kTu5KwQQ8qcb9 (A built), F057
  https://claude.ai/artifact/7nKCuGhkAuhTJ5gMEXxfw3 (A built), F058
  https://claude.ai/artifact/DMXMZc8NdDTNRXSFEBBuah (A built). F059: no
  snapshot (screenshots design/f059-*.png). F060
  https://claude.ai/artifact/Lx5SeC9B1GmSN3ztFebA3t (A built). F061: no
  snapshot (screenshots design/f061-*.png). F062
  https://claude.ai/artifact/B53eSPBXNaCJmAL6DNUeQs (A, owner's pick).

## Next

The owner approved a lot on 2026-10-31 evening; see DECISIONS.md
"Free Crust, desktop app, M6 and M7 approved". In order:

1. ~~F053 Signal and Corner with real photos~~ **built, passes**
   (PR #45, branch `f053-signal-corner-photos`). Snapshot
   https://claude.ai/artifact/B3dfAGM3m15EcN1n83oooB
   (`design/f053-signal-corner-v1.html`); A built for both. If the owner
   says "B for Signal/Corner", rework on the same branch before merge.
   Photos live in `scripts/starter-templates/photos/{signal,corner}/`,
   layouts in `starter.ts` (`signalHome`, `cornerHome`, …), photo lists
   in `photo-sets.ts`. Commons rate-limits hard from here (429 for
   ~20 min): one request every ~30 s, back off to 5 min, never write a
   file before the download succeeds. Fixes 11 (template check sees
   layout, M) and 12 (Harbour polish, needs new photo hunt) did NOT ride
   along; still in DECISIONS Proposals.
   ~~F055 Desktop app shell~~ **built, passes, CI green** (PR #46,
   branch `f055-desktop-shell`, from main). See DECISIONS "F055". How it
   fits: `crates/crust-desktop` (Rust: four file commands fenced to the
   site folder, photos at /media via `set_assets`, `CRUST_SELF_CHECK=1`
   window self-check run in CI under xvfb); `apps/admin/src/desktop/`
   (opens the folder, routes /api to the server handlers in the window,
   `desktopContent()` replaces the built-in site.json/pages/posts).
   Building the crate needs `apps/admin/dist` (`npm run build` first)
   and the GTK/WebKit libraries (CI installs them; locally the same
   `apt-get install` line as ci.yml). CI's `check` job now takes ~23 of
   its 35 minutes. Installers: Actions → "Desktop installers" (by hand
   only, ~150 counted minutes; ask the owner first).
   ~~F056 Publish on your computer~~ **built, passes** (PR #47, branch
   `f056-publish-on-computer`, stacked on #46). See DECISIONS "F056".
   How it fits: `packages/render/src/site.ts` is the one render step
   (pipeline's cli.ts and the app both call it);
   `apps/admin/src/desktop/local-publish.ts` renders from the site
   folder and calls the app; `crates/crust-desktop/src/publish.rs`
   (finish with crust-publish, Pagefind via crust-publish's `search`
   feature, export) and `preview.rs` (127.0.0.1 server); card:
   `apps/admin/src/publish/DesktopPublishPanel.tsx`. Snapshot
   https://claude.ai/artifact/JdsQXqRu8kTu5KwQQ8qcb9 (A built).
   Building crust-desktop locally: `npm run build`, the ci.yml
   `apt-get` line, then `cargo build -p crust-desktop --features
   tauri/custom-protocol`; screenshot with `xvfb-run` + `import -window
   root` (how design/f056-app-publish-card.png was made).
   ~~F057 Several sites~~ **built, passes** (PR #48, branch
   `f057-several-sites`, stacked on #47). See DECISIONS "F057". How it
   fits: `crates/crust-desktop/src/sites.rs` (`Sites`: the Crust folder,
   the open site, create/rename/duplicate/delete/restore, Recently
   deleted in `Crust/.Recently deleted`, open site remembered in
   `Crust/.sites.json`); the file commands take an optional `site`
   (arg, or `x-crust-site` header for writes); `apps/admin/src/sites/`
   (`sites.ts` API, `SitesScreen.tsx`, route `#/sites`, desktop only;
   Pages header gets "All sites"). Per-site publish settings for F058
   go in the site's `.crust` folder (`.crust/hosts.json` is already
   left out of duplicates). Screenshots: design/f057-sites-screen.png
   (made with Playwright over `apps/admin/dist` and a fake
   `__TAURI_INTERNALS__`, quicker than the real window for a screen).
   **CI time warning:** on #48 the `check` job took 30 of its 35
   minutes (ci.yml `timeout-minutes`). If F058 adds much Rust (HTTP
   client, keychain), expect it to cross 35: either cache `target/`
   better or raise the limit, and log it in DECISIONS (it costs free
   minutes, so mention it to the owner).
   ~~F058 Publish to Cloudflare Pages or Netlify~~ **built, passes**
   (PR #49, branch `f058-publish-to-host`, stacked on #48). See
   DECISIONS "F058". How it fits: `crates/crust-desktop/src/hosts.rs`
   (`Client`: Cloudflare direct upload and Netlify digest deploy, base
   URLs overridable with `CRUST_CLOUDFLARE_API` / `CRUST_NETLIFY_API`;
   `HostService`: connect/replace token/disconnect/publish for a site;
   `Keychain` trait, `SystemKeychain` via keyring, `MemoryKeychain` for
   tests and the self-check); `.crust/hosts.json` holds the connection
   and the keychain entry's name; commands `host_*` in lib.rs (progress
   event "host-progress"). UI: `apps/admin/src/publish/hosts.ts`,
   `HostPublish.tsx`, inside `DesktopPublishPanel`. Tests use a fake
   host server on 127.0.0.1 (`src/hosts/tests.rs`). `scripts/fake-tauri.js`
   runs app-only screens in a plain browser (check:builder uses it; also
   handy for screenshots). CI `check` limit raised to 45 minutes; on #49
   it took 21 minutes (with a fresh Rust cache). Never tried against a real host (no account here):
   if the owner's first real publish fails, expect a small API detail.
   ~~F059 Publish by FTP or SFTP~~ **built, passes** (PR #50, branch
   `f059-ftp-sftp`, stacked on #49). See DECISIONS "F059". How it fits:
   `crates/crust-desktop/src/ftp.rs` (settings, `.crust/ftp-sent.json`
   memory, `plan`, `run`), `ftp/ftp_remote.rs` (suppaftp, FTP/FTPS),
   `ftp/sftp_remote.rs` (russh + russh-sftp; server key remembered in
   `FtpSettings.host_key`); `hosts.rs` has `HostKind::Ftp`,
   `Connection.ftp`, `connect_ftp`, `resend_all`; commands
   `host_connect_ftp`, `host_resend_all`. UI: `FtpDialog`,
   `PasswordDialog` in `HostPublish.tsx`. Tests start real FTP/FTPS
   (libunftp) and SFTP (russh server) servers in `ftp/tests.rs`.
   `scripts/fake-tauri.js` takes host "ftp" / "ftp-plain". Screenshots
   design/f059-*.png (made with Playwright + fake-tauri). CI `check`
   took 28 of its 45 minutes on #50 (FTP/SFTP crates added ~5 min).
   ~~F060 First run~~ **built, passes** (PR #51, branch
   `f060-first-run`, stacked on #50). See DECISIONS "F060". How it
   fits: `apps/admin/src/first-run/` (`first-run.ts`: `isFirstRun`,
   `makeFirstSite`, `landInBuilder`; `FirstRun.tsx` the screen;
   `arrival.ts` the one-time "open To replace" flag read by
   `placeholders/Checklist.tsx`); `desktop.ts` `launchDesktop` decides
   welcome screen or site, `main.tsx` renders one or the other. The
   fake app for tests moved to `sites/fake-app.ts`. `fake-tauri.js` takes
   `firstRun: true`. The window self-check (`self_check.js`) goes
   through the welcome screen first (Blank), so CI covers it; CI gives
   it its own Crust folder (`$RUNNER_TEMP/crust-home/crust-site`),
   because other folders beside the site count as sites.
   **CI time warning:** on #51 the `check` job took 41 of its 45
   minutes (a cold Rust cache after the FTPS fix; #50 took ~5 with a
   warm one). If F061 adds Rust (tauri-plugin-updater), expect it to
   cross 45: improve the `target/` cache or raise the limit, log it in
   DECISIONS and mention it to the owner (free minutes).
   **F059 CI fix (on #50):** FTPS connections that break off are tried
   up to three times (libunftp switches to TLS late); see DECISIONS
   F059, last bullet.
   ~~F061 Updates built in~~ **built, passes** (PR #52, branch
   `f061-updates`, stacked on #51). See DECISIONS "F061". How it fits:
   `crates/crust-desktop/src/updates.rs` (`Updates`: check/download/
   install_ready over tauri-plugin-updater; feed address and public key
   built in at release, `CRUST_UPDATE_URL`/`CRUST_UPDATE_PUBKEY` at start
   only in debug builds; installs on `RunEvent::Exit`), tests in
   `src/updates/tests.rs` (fake downloads site on 127.0.0.1, keys made
   with the `minisign` crate, plus one file signed by the real `tauri
   signer`). Window: `apps/admin/src/updates/` (`updates.ts`: API,
   `Updater` state, once-a-day timing; `UpdateNotice.tsx`: banner on the
   Pages and Sites screens, Crust card on Sites). Release:
   `scripts/updates-site.ts` (feed + download page), what's new in
   `crates/crust-desktop/whats-new.json` (bump with the version in
   tauri.conf.json), Desktop installers workflow "Put on the downloads
   site", new "Make update key" workflow, owner guide
   `docs/setup-updates.md`. `fake-tauri.js` takes `update: "available"`.
   The window self-check asks `update_status`/`update_check` (CI has no
   key, so "off"). Tests turn on tauri's `test` feature, so `cargo test`
   rebuilds the tauri crate once more than `cargo build` (~1 min of CI).
   ~~F062 Premium templates in the gallery~~ **built, passes** (PR #53,
   branch `f062-premium-templates`, stacked on #52). Owner picked A of
   https://claude.ai/artifact/B53eSPBXNaCJmAL6DNUeQs. See DECISIONS
   "F062". How it fits: `apps/admin/src/templates/catalogue.ts`
   (`readCatalogue`, `loadCatalogue`, `catalogueSource`;
   `STORE_CATALOGUE_URL` is null until the store exists: **F063 must set
   it** to the store's catalogue address); `TemplatesScreen.tsx`
   (`PremiumGroup`, `PremiumDetail`, `openInBrowser`); Rust command
   `open_link` (https only) in lib.rs. Catalogue format in docs/spec.md:
   **F063's store writes exactly this file.** Example catalogue in
   `apps/admin/public/sample-catalogue/` (regenerate with `npm run build
   && node scripts/sample-catalogue.mjs`), shown at
   `#/templates?examples`. check:builder covers three premium screens.
   **Next: F063 Store site** (Milestone 7, docs/milestone-7.md; design
   snapshot first; done_check `npm test -- store && npm run check:a11y
   && npm run check:perf`). It writes the catalogue file F062 reads. Open proposals worth
   raising: "App wording", "Browser copies in the app" (found with
   F060: unsaved colours/drafts are shared between sites in the app),
   `.htaccess` redirects for FTP hosts.
   Owner-facing notes still open: Pagefind brings minicbor
   (BlueOak-1.0.0) and Tauri brought MPL-2.0 packages (DECISIONS
   "F056"), owner told, no answer yet. F058/F059 never tried against a
   real host account. F061 never tried with a real release (needs the
   update key and a ~150-minute installers run; owner's call).
2. ~~Write Milestones 6 and 7~~ done 2026-10-31 (F054–F068; F054 depends
   on F048 so M6 can start while F053 waits for the owner).
   **F054 Content store done and merged** (PR #43). After F053:
   **F055 Desktop app shell** (Tauri 2; the app
   gives LocalStore a Folder backed by Tauri file commands; see
   `apps/admin/server/local-store.ts` and DECISIONS "F054").
3. ~~Review the 48 `needs_review` features~~ done 2026-10-31: all have
   `reviewed: true` + `review_note`; 12 fixes in DECISIONS.md
   Proposals "From the review"; page for the owner
   https://claude.ai/artifact/53YM8oVKV9XrECZJSNHo1J
   (`design/review-2026-10-31.html`). Owner chose A (2026-11-01, "go
   with all your recommendations"): **F069 Review fixes built and
   merged** (PR #44), done_check exit 0. Fixes 11–12
   ride with the next template work. Leftover: the "+" between sections
   overlaps the Section toolbar slightly (DECISIONS F069).
4. ~~Live site publish~~ checked: run 3 succeeded, site up.

## Where to find things

| What | File |
|---|---|
| Product, architecture, content format | docs/spec.md |
| Milestone plan | docs/milestone-5.md (earlier: docs/milestone-*.md) |
| Every feature, its done_check and status | features.json |
| What happened, what the owner should test | PROGRESS.md |
| Why things are the way they are | DECISIONS.md |
| What only the owner can do | BLOCKED.md |
| User-visible changes | CHANGELOG.md |
| Setup guides for the owner | docs/setup-*.md |

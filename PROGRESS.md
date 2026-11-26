# Progress

Read "Current" at the start of a session (`npm run next` gives the next
feature). Keep it short: when a feature is finished, move the previous
entry to docs/archive/progress-history.md. Add to "Log" only what a
later session must know; keep the newest 3 entries here.

## Current

- **2026-11-26 (night): you chose the 2030 look, direction C.** Plan in `docs/milestone-11.md` (Matte look, hero and reveal blocks, sideways gallery and pinned story, a flagship template, a showcase site). Nothing is built yet: say "add them" and I start with the Matte look. Photos for the showcase need your Pexels or Pixabay key, or photo links you pick.

- **2026-11-26 (night): the audit list is finished.** A template that can't be used no longer shows as a card in Templates, and the preview's "fields marked in red" message now reads correctly even when nothing is red. The phone first-run cards stay as they are. Still waiting for your review: F100 and F101 (the left menus).

- **2026-11-26: your three audit picks are built (A310 B, A205 A, A207 A), waiting for your check.** (1) The home page's browser tab now reads "Home | Crust demo", like the other pages. (2) On a phone, Quick edit shows **View this page** after you press Save; it opens the page in Preview. (3) Desktop app: "Open Cloudflare token page" now opens Cloudflare with the name and the permission already chosen; the dialog lists two steps instead of four. **To try:** Quick edit on a phone, change a word, Save, tap View this page; in the app, Publish, Cloudflare, Open token page (check that the permission "Cloudflare Pages · Edit" is already ticked). Accessibility: the link is a real link with a 44 px target; the saved message is announced as before. Still yours: A005, A100, A106 (A205/A207/A310 are done).

- **2026-11-25 (night): F101 built, waiting for your review: the all-sites screen (step 2 of 2).** In the desktop app, "← All sites" now leads to a screen with its own menu on the left: **Sites, Templates, Settings**. **Sites** shows your sites as cards (name, pages, last edited; Open, Rename, Duplicate, Delete); choosing one drops into the menu you already know (Pages, Posts, Layout...), and "← All sites" comes back. **Templates** only lets you browse the starting points; to use one you still open a site and choose Start from a template. **Settings** holds Light/Dark and Check for updates. A "Back to <site>" link sits at the foot. The web version is unchanged: it edits one site and opens straight inside it. **To try (desktop app):** All sites, open a card, come back, open Templates and Settings; on a phone the three items form the bottom bar. Accessibility: one nav named "Crust" on this level, current item marked, focus lands on the new screen's heading, 44 px targets; the browser check passes for the site screens (this level only exists in the desktop app, so it is covered by tests, not the browser check). Not done: the Settings screen inside a site still shows its own group list beside the menu (your call).

- **2026-11-25 (night): F100 built, waiting for your review: a left menu inside each site (step 1 of 2).** The "Crust demo ▾" dropdown is gone. In its place, a fixed menu on the left with **Pages, Posts, Layout, Styles, Media, Settings** (no Menus or Modules); the current one is highlighted; Sign out sits at the foot (web) and **← All sites** leads the menu in the desktop app. In the page editor it becomes a narrow rail with a label under each icon; on a phone it is a bottom bar (Pages, Posts, Layout, Styles, More; More holds Media, Settings, Sign out / All sites). **To try:** open Pages, click each item; open a page and look at the rail; narrow the window to a phone width and tap More. Where items go (no new screens were invented, DECISIONS 2026-11-25 F100): Layout opens Site settings on Header & menu, Styles on Styles, Settings on Site address, and **Media is a new screen** with the photo library. Accessibility: one navigation named "Site", current item marked, "Skip to content" first, 44 px targets, focus moves to the new screen's heading, the menu works with the keyboard; browser check in light and dark. Not done (step 2, F101): the all-sites screen as level 1 of the menu. Screenshots: see the review page.

- **2026-11-25 (night): you approved a new left menu; the drawings are ready.** Instead of the "Crust demo ▾" dropdown: first all your sites, then, inside a site, a fixed menu with Pages, Posts, Layout, Styles, Media, Settings (no Menus or Modules yet). Look: https://claude.ai/artifact/WAudsU5VLCm13PzYRmXt9V . Not built yet; You said to add the two steps to `features.json`; the next session does that first, then builds step 1.

- **2026-11-25 (evening): the audit fix queue is done except six items (PR #118, merged).** Sixteen small fixes went in one PR because you asked for speed (DECISIONS 2026-11-25). **What you can try:** on a phone, page names, the drag handle and the top-bar buttons are big enough to tap; in the builder the top section's toolbar no longer covers the site header's button; the left rail says **Photos** (not Media) and the photo picker says "section 7" and "Needs a description"; the New post form says "(required)" next to Title and Address; the Premium sidebar has a normal "Already bought it? Open the file" button; a template opens with the preview first on a phone; the FTP dialog shows a soft fade where more fields continue; the design editor has a clear way back ("← Back to Posts"). **Accessibility:** one banner in the builder, one "Styles" heading, the "Move into" button's name matches its words, no native control hidden without a focus ring. **Not built, your call:** A005 (phone first run: the audit itself says leave it), A205 (Quick edit has no page to check after Save: what should the link mean?), A310 (three options for the home page title), A207 (pre-filled Cloudflare token link, Rust change), A100 and A106 (waiting for your Mac check). Not run here: `cargo` (no Rust changed; CI runs it).

- **2026-11-25: The five audit fixes are in (PRs #103 to #107, merged).** Publish card reads "Step 1 of 3 · Pick a place" with free hosts marked; the light/dark button stays in the top row on a phone; Quick edit groups show their first words; Site settings shows Save and Discard only when something is unsaved (not autosave: there is no Undo there, see DECISIONS); Add section has a Linked tab and a clearer missing-section page. **To check on your Mac:** the "sample-site" template card (A100) and a "fields marked in red" message with no red field (A106) may only have shown in my test run. 40 smaller findings stay open; pick any you want fixed.

- **2026-11-25: Full UI/UX audit done, waiting for your picks (Gate 2).** All 12 areas, no people involved: nothing blocks a task. 47 findings (15 that slow or confuse, 32 polish). The big one: a newcomer would give up at Publish (a card points to a developer file, Cloudflare needs a token). Five decisions are drawn as before/after with my recommendation marked: https://claude.ai/artifact/3z5gZQ86svBbzgMBoriYF3. **Your call:** which to fix. Nothing in the app changed. Notes: `docs/audit/`.

- **2026-11-25: UI/UX audit, pilot done, waiting for your call (Gate 1).** I checked the first-run screens and the page editor with no people involved: nothing blocks a task. 8 small findings, the two that matter are the section toolbar showing each move label twice and a button called "root" in section settings. **Your call:** scale to the other 10 areas (recommended), fix these first, or stop. Report: https://claude.ai/artifact/GeZQkwzeLFETvfLVQc3cLb. Notes: `docs/audit/`.

- **2026-11-24: You passed F095–F099; the old Blocks / Outline / Fields icons are gone from the left rail.** Now only **This page** and **Your site** show. Nothing else changed. Next: ask you for the 0.1.1 bugs and whether your installed app shows "update ready".

- **2026-11-24: F099 a section's settings in the left panel. Built, waiting for your review.**
  Click a section (on the page or in the list) and the left panel switches to **"<Section> settings"** with **Back to Outline** at the top;
  Back returns to the sections list. The right panel no longer opens when you pick something; it is only for Page settings and Next steps.
  The spike worked: Puck lets the left panel reuse its own settings form, so every field behaves exactly as before.
  **To try:** open a page, click a section, change a field, press Back to Outline; click a section while Your site is open (it jumps to This page).
  Accessibility: Back is a real button naming its destination; focus lands on the settings heading; browser check passes in light and dark.
  Not done: the Outline is still a plain list and Puck's old Blocks/Outline/Fields icons still show in the rail. Not run here: `cargo`.
  Next: nothing unbuilt in Milestone 10; waiting for your review of F095–F099.

- **2026-11-24: F098 one gallery to add sections from. Built, waiting for your review.**
  Adding a section now always opens the same full-screen gallery, whether you press **Add section** in This page, a **+** between sections,
  or **Layouts** at the top. It has two tabs, **Layouts** and **Mine**, a search box, and **Type** (Sections, Whole pages, Linked) and
  **Topic** (Hero, Pricing, ...) lists. Click a picture to choose it (it gets a purple frame), then pick **Insert** (At the top, or After any
  section; it starts where you pressed) and press **Add**. The new section lands selected and is announced. Add stays off until you choose.
  **To try:** open a page, click This page, Add section; choose Topic > Pricing, click a picture, change Insert to "At the top", press Add;
  then press a "+" between two sections and see the gallery start there; try the Mine tab; press Esc to close.
  Also: the old small Add panel is gone; "Add an element" (single blocks) moved under the sections list in This page.
  Accessibility: a real dialog (Esc closes, focus goes to Search, comes back after); every choice is a button or a labelled list, 40px high;
  the Add result is announced. Also fixed: the sections list in This page had buttons nested inside a button (a screen-reader problem that
  the accessibility check had not been looking at); rows are now plain boxes with the two real buttons inside.
  Spotted, not touched (F096): Puck's own **Blocks, Outline and Fields** icons still show in the left rail beside This page / Your site.
  Not run here: `cargo`; no Rust changed.
  Next: F099 (a section's settings in the left panel, spike first).

- **2026-11-24: F097 add a section where you look. Built, waiting for your review.**
  The round "+" between sections on the page is now a labelled button: **Add section here** (or at the top / at the end). On a computer it
  grows into a pill with those words when you point at it or press Tab to it; on touch screens the words are always showing. It opens the
  same pictures in This page as before. A selected section's toolbar now has words beside the icons: **Move up / Move down**, **Duplicate**,
  **Delete**. **To try:** open a page, point between two sections and press the "+"; then Tab through the page and watch the bars appear;
  click a section and read its toolbar.
  Accessibility: the bars are real buttons, reachable by Tab, 32px, visible focus ring, words always visible on touch, no motion under
  reduce-motion. Not run here: `cargo` (this container lacks a Linux library); no Rust changed.
  Next: F098 (one gallery to add sections from).

- **2026-11-24: F096 the editor's left bar now has two places: This page and Your site. Built, waiting for your review.**
  Eight icons became two. **This page** shows your sections top to bottom with a clear "Add section" button; pressing it (or a "+" on the page)
  opens the pictures of sections in the same place, with "Back to This page" at the top. **Your site** lists Pages, Blog, Media, Look,
  Site settings and Help with a short line under each; open one and it replaces the list, with "Back to Your site" to return.
  **To try:** open the preview (link in the PR), click This page, Add section, pick a layout; then Your site, Look, Back, Site settings.
  Not done yet (honest note): the sections list is still Puck's own outline, not small drawings of each layout; I kept it so nothing breaks
  and will draw them with F097/F098 unless you want it first. Accessibility: both places are real buttons with visible names and a back
  button that names its destination; the browser accessibility check passes in light and dark. Not run here: `cargo` (this container lacks a
  Linux library); no Rust changed.

- **2026-11-11 (later): the app's first real release, and a home page for Crust.**
  **Release 0.1.1 is live** at https://crust-downloads.pages.dev (Mac and Windows). The owner installed it on his Mac and it opens; he has
  "a couple of bugs" to send. Next: release 0.1.2 so his 0.1.1 shows "update ready" (that proves automatic updates, F061).
  **The Crust home page is live** at https://crust-home.pages.dev (built with Crust; links to the store and the downloads page).
  Also fixed: the editor's site menu opened under the left bar; the template preview now fills the screen.
  **To try:** open the home page on a Mac and a phone; click Download, a template card, Help and Licence.

- **2026-11-11: F094 Edit site details in the Site settings sheet (passed and merged). Also done: a menu
  change that fails to save now says so.**
  In the editor, open **Site settings**. Each group is now a row that shows what it is set to; press **Edit** to change it
  in place (Done closes it). **Search defaults** lets you change the site name, language, a default description and a
  default sharing picture (with a description of the picture). Pages with no description or sharing picture of their own
  use these when you publish; pages that set their own keep them. **Where to publish** shows where your site goes; in the
  Mac app you connect or change the host right there, on the web it links to Publish. In the Pages panel, if moving a page
  in or out of the menu can't be saved, you now see a message with **Try again**.
  **To try:** open the preview https://ccr-d50f7e80-weuq18.crust-admin.pages.dev (it can't save), Site settings, Edit on
  Search defaults, type a description and watch the search preview; leave the picture without its description and see the
  message; Tab through it and press Done (focus returns to the Edit button).
  F094 passed (owner, 2026-11-11) and PR #82 is merged. Design: https://claude.ai/artifact/TGGKaS6cbZqCbf4XBioDDq (direction C). No unbuilt features are left.

## Waiting on the owner

- **Review round:** 7 built features still wait for `reviewed: true` (F055, F062, F063, F071, F075, F078, F080); 20 are passed (the owner's word: follow the impeccable skill). One
  page, in sittings, with what to try and Pass / Needs fixing:
  https://claude.ai/artifact/C3czUd4fpf5Qz6t2WqAkwZ
  (`design/review-2026-11-03.html`). Answers are stored in the page's
  database, collection `reviews` (doc id = feature id: `verdict`
  `pass`/`fix`, `note`); read them with ArtifactData `list`. Claude records the
  owner's `pass` as `reviewed: true`; a `fix` becomes a rework item only
  when the owner asks (CLAUDE.md).
- **Accounts and decisions:** BLOCKED.md.
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

- 2026-11-03 (Jakarta) — CI on PR #65 went red after F081: the desktop
  app's link step died with "Bus error" (runner disk full with the new
  AVIF/WebP encoders). ci.yml now removes unused preinstalled toolkits
  (~25 GB) first. F082 built on the same branch.

- 2026-11-03 (Jakarta) — F081 built on `ccr-d50f7e80-weuq18`. The AVIF
  encoder took ~5 s a photo in `cargo run` builds (Rust compiles its
  generic code inside crust-publish); crust-publish is now optimised in
  dev builds too (~0.4 s). Photo copies are cached between publishes.

- 2026-11-02 (evening, Jakarta) — F079 built on `ccr-d50f7e80-weuq18`
  after F078 merged (PR #64). axe on the sample pages caught the slide
  link and Directions link using the card link colour on Dark sections;
  they now use the section's accent colour, like text links.

Older entries: docs/archive/progress-history.md.

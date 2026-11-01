# Group A review: F003–F020 (16 features)

How I tested: I served the built admin (`apps/admin/dist`) on port 4301 and drove it in Chromium with Playwright at 1440, 768 and 390 px, using the keyboard wherever a mouse action exists. I ran axe (WCAG 2.0/2.1/2.2 A+AA tags) on Site settings, the builder, the page list and a rendered sample page. Offline there are no `/api/*` functions, so for the GitHub-backed screens (save, page list states, rename, delete, restore, publish) I **mocked the API in the browser** (`mock.cjs`, built from `api-client.ts` / `server/api.ts`) and used the real UI against it. Server behaviour (commit contents, relinking, the deleted-page history) was checked by reading `apps/admin/server/api.ts` and `github.ts`, not live. For publishing to the live site I used a page I rendered myself (`out/about/`: 2/3/4 Columns of Cards plus left/centre/right Buttons). F010 was checked against real GitHub Actions runs (`gh run view`).

Scripts: `/tmp/claude-0/-home-user-crust/096cbfe7-71b5-551a-af09-9311e51e84f4/scratchpad/review/A/*.cjs`. Screenshots: `/tmp/claude-0/-home-user-crust/096cbfe7-71b5-551a-af09-9311e51e84f4/scratchpad/review/A/shots/`. Every screenshot path below is relative to that `shots/` folder.

---

### F003 Design tokens and Site settings screen — PASS WITH NOTES
Checked: every group (Colours, Typography, Spacing, Shape & layout) at 1440/768/390. I typed a failing text colour (#BBBBBB), a malformed hex value (#12), used "Use #6F6F6F" to fix it, and tried Save offline. axe found 0 violations.
Note: colours, fonts, spacing, corner radius and page width can all be edited, the preview updates live, and a contrast failure shows up both on the field (linked with aria-describedby) and in a summary with a one-click fix, so this does what it says.
Fixes worth proposing:
- The Typography group prints a raw "Font list: Seravek, 'Gill Sans Nova', …" under each font picker. It is developer detail. Hide it or move it behind a "Which fonts?" disclosure (match between system and real world; S).
- The status bar ("Undid Ink…", "Showing Buttons…") appears above the whole layout and pushes everything down by about 45 px. Show it inline in the top bar next to "All changes saved" instead (layout stability, aesthetic; S).
Screenshots: settings-1440.png, settings-768.png, settings-390.png, settings-colours.png, settings-contrast-fail.png, settings-contrast-panel.png, settings-typography.png, settings-shape.png

### F004 Complete block library v1 — PASS WITH NOTES
Checked: I added Columns from the block list with the keyboard. In the builder I switched between the desktop, tablet and mobile canvases. On the published page I checked 2/3/4 Columns of Cards at 1440/768/390: 4 across on desktop, 2 across on tablet, stacked on phone. The only axe finding was a heading-order issue caused by my own test content.
Note: Columns and Card render correctly and stack on phones, and the editor has all three device widths.
Fixes worth proposing:
- The viewport buttons (Puck's) have no `aria-pressed`, so a screen reader can't tell which width is active. Only the blue icon shows it (WCAG 4.1.2 / 1.4.1; S, a small DOM patch like the existing puck-chrome fixes).
- On tablet, a 3-column row leaves one card alone with an empty half next to it (see f004-site-768.png). Consider "3 → 1 column on tablet" or letting the last card span both columns (S).
- Outside this group but very visible here: the purple "Site header · edit in Site settings" badge sits on top of the header's "Home" link (desktop) and "Menu" button (mobile canvas). Move the badge inside the header's left edge or above it (S).
Screenshots: f004-columns-added.png, f004-builder-tablet.png, f004-builder-mobile.png, f004-site-1440.png, f004-site-768.png, f004-site-390.png

### F005 Keyboard-accessible editing — PROBLEM (one gap; everything else is good)
Checked: I tabbed into the canvas, selected a block with Enter, and used Alt+↓, Alt+←, Alt+→, Esc and ?. The live region announced each move (e.g. "Heading moved down in Section, position 2 of 4."). The focus ring is 3 px dark plus a 5 px white halo. Pressing Enter on "Columns" in the block list added it ("Columns added to the page, position 3 of 3"). The action-bar buttons have labels ("Move up (Alt+↑)"). axe found 0 violations.
Note: moving blocks by keyboard works well and is clearly announced, but the left rail's "Blocks / Outline" switch can't be reached with the keyboard at all, so the Outline view is mouse-only.
Fixes worth proposing:
- Make Puck's left rail items (`_NavItem` `<li>`/`<div>`, tabindex -1) real buttons, or patch them to tabindex 0 + role="tab" + Enter/Space, in `keyboard/puck-chrome.ts` (WCAG 2.1.1 Keyboard; S).
- Reaching the first block takes 33 Tab presses (toolbar, then every block in the list). Add a "Skip to page" link or a shortcut that jumps focus to the canvas (WCAG 2.4.1 Bypass blocks; S).
- The screen-reader label of a Text block is just "Text". Headings and buttons get "Heading: Build fast…" because Text now holds rich text. Use its first words too (recognition over recall; S).
- Puck's floating action bar covers the line of text above the selected block (see f012-button-fields.png). It would be better placed outside the block (aesthetic; M, Puck styling).
Screenshots: builder-focus-block.png, builder-selected.png, builder-after-moves.png, builder-help.png, f005-drawer-focus.png

### F006 Save to GitHub — PASS WITH NOTES
Checked: in the builder, "Save draft" (Enter) against a mocked success and a mocked failure. The status shows "Saving…" and then "Page saved to GitHub. Visitors see it after you publish." On failure it says "Page not saved to GitHub: … A copy is safe in this browser." I read the server side (`server/api.ts`) and the save-api tests; I did not commit anything for real.
Note: saving works and gives clear feedback both ways, but an error looks the same as a success and disappears on its own after 10 seconds.
Fixes worth proposing:
- Style failures differently (warning colour and icon), and keep them on screen until dismissed, with a "Try again" button (visibility of status, error recovery; WCAG 2.2.1 for timed content; S).
- The wording differs: the button says "Save draft", the page list says "Save to GitHub", and the result says "saved to GitHub". Use one name, e.g. "Save" with the help text "saves to GitHub; not live until you publish" (consistency; S).
Screenshots: f006-save-ok.png, f006-save-fail.png

### F007 Page list and create page — PASS WITH NOTES
Checked: the page list at 1440/768/390 (it becomes cards on phones, buttons are 44 px tall). With the keyboard: "New page" puts focus on Title, and the address is suggested from the title ("Opening Hours & Prices" → `opening-hours-and-prices`). Errors were clear for "Menu" (format) and "menu" (already taken). Create opens the builder at `#/edit?path=/opening-hours`. axe found 0 violations.
Note: this works as described: title, status, address and last edited are shown, the address is checked as you type, and the new page opens straight in the builder.
Fixes worth proposing:
- At desktop width the Address column is so narrow that `/contact` breaks as "/contac / t" and the title "Crust demo" wraps (see pages-1440.png). Give the address `white-space: nowrap` or a minimum width (aesthetic; S).
Screenshots: pages-1440.png, pages-768.png, pages-390.png, f007-new-page.png, f007-new-page-error.png, f007-opened.png

### F008 Publish workflow — PASS WITH NOTES
Checked: the Publish panel against a mocked run in four cases: never published, start → running → success, start → failure, and failure to start. Keyboard Enter on the button, which changes to "Publishing…" with aria-disabled. I read `publish.yml` and the publish tests. The real pipeline has run green on GitHub (see F010's runs; I did not trigger a publish).
Note: publishing starts, shows progress, refreshes by itself and reports Live or Failed. One message goes stale, though.
Fixes worth proposing:
- "Publishing started. It usually takes 2 to 3 minutes…" stays on screen after the run ends, even right under "Failed." (see f008-failed.png). Clear it, or replace it with "Your changes are live" or "Publishing failed" when the run ends (visibility of system status, consistency; S).
- When a run fails, the only route offered is "Details on GitHub", which is a developer screen. Add a plain next step ("Try again"; "if it fails twice, send me the link") (help users recover from errors; S).
- For the first ~4 s after clicking, the status still says "Live." while the button says "Publishing…". Show "Starting…" in the status line right away (S).
- When saving to GitHub is off, the panel says "after the one-time setup in docs/setup-saving.md". That is a file path the owner never opens, so replace it with plain words (S).
Screenshots: f008-starting.png, f008-running.png, f008-done.png, f008-failed.png

### F010 Preview deploy via GitHub Actions — PASS WITH NOTES
Checked: I read `.github/workflows/preview.yml` and the latest real runs (`gh run list/view`). Run 41244570960 deployed with wrangler, logged "Preview is live and private (Cloudflare Access sign-in)", and wrote the job summary. PR #41 has the "Admin preview" comment with a branch link and a per-build link. That last run had no open PR, so it correctly skipped commenting.
Note: every push deploys the builder and the link appears in the PR and in the run summary, as described.
Fixes worth proposing:
- The "Check the preview loads" step counts an Access sign-in redirect as success, so behind Access it never checks that the builder itself loads. A broken build would still pass. Add a service-token request or fetch a static asset such as `/assets/index-*.js` that Access lets through (error prevention; M, needs a Cloudflare service token, so this is an owner decision).
Screenshots: none (CI only).

### F012 Button alignment — PASS
Checked: Button → Style tab → Alignment Left/Center/Right (native radios, so the arrow keys work). The canvas updated immediately. In the rendered output the three alignments are correct at 1440/768/390, and a button without `align` stays left.
Note: does exactly what it says.
Fixes worth proposing: none.
Screenshots: f012-style-tab.png, f012-right.png, f004-site-768.png (left/centre/right buttons at the bottom)

### F013 Theme presets in Site settings — PASS WITH NOTES
Checked: 9 presets, each with swatches, a name in its heading font, and a description. "Current" is shown by text plus a thicker border, not by colour alone. I applied Ink, then "Undo preset (Ink)" with Enter, and the status messages were announced. The contrast panel showed all pairs passing after each preset.
Note: presets apply in one click and undo in one step, but after Undo the keyboard focus is lost.
Fixes worth proposing:
- After "Undo preset" the button disappears and focus falls to `<body>`, so a keyboard or screen-reader user starts again from the top of the page. Move focus to the preset that is now current, or to the Presets heading (WCAG 2.4.3 Focus order; S).
Screenshots: settings-1440.png, settings-preset-applied.png

### F014 Click the Site settings preview to jump to a colour — PASS WITH NOTES
Checked: with Colours open, clicking the heading, button, card text, surface section, footer and header in the preview focused and selected the matching hex field. With another group open, a click opens that part's group instead (the F028 change in DECISIONS.md), and the status says what happened.
Note: it works, but two parts of the page point to the wrong colour.
Fixes worth proposing:
- Header links (logo, menu) are drawn in **Text** colour, but clicking them selects **Primary**. The footer copyright is drawn in **Muted text**, but clicking it selects **Text**. `roleForElement` treats every `<a>` as Primary and doesn't know `.cr-footer-copy`. Add header/footer rules, or read the computed colour and match it to a token (accuracy of feedback; S).
Screenshots: f014-colour-pick.png, pick-button-1440.png

### F015 Rename and delete pages — PASS WITH NOTES
Checked: everything with the keyboard at 1440 and 390. Rename: focus goes into the field; errors for "About Us!" (format), "menu" (taken) and "blog" (reserved); "Changing…" while it works; then focus moves to the Pages heading with "Changed the address of 'About us' to /about-us. Once you publish, /about sends visitors there." Delete: focus starts on "Keep page" (the safe choice), Esc returns focus to the Delete button, and the confirm message says it can be restored. Home has no buttons ("Always at /"). Buttons carry the page name for screen readers ("Rename About us"). axe found 0 violations.
Note: renaming and deleting are safe, clear and keyboard-friendly.
Fixes worth proposing:
- The delete question says "Links to /contact will stop working" but not where they are. Reuse the F018 link count ("Menu links here twice") so the owner knows what will break (error prevention; S).
- In the Publish list, one rename shows up as two changes: "About us (/about-us): new page" and "/about: moved to /about-us" (server reports both). Fold them into one line (S).
Screenshots: f015-rename-dialog.png, f015-rename-error.png, f015-after-rename.png, f015-delete-dialog.png, f015-rename-390.png, f015-delete-390.png

### F016 Show what is not published yet — PASS WITH NOTES
Checked: the page list marks "Only in this browser" (hollow grey), "Saved, not live yet" and "Edits not live yet" (hollow orange), and "Live" (filled green), always with words as well as dots. The Publish panel lists browser drafts, edited, new and removed pages and Site settings, with a "Show all" past 6 items. The button counts them ("Publish 5 changes"), and "Publish again" appears when nothing is waiting.
Note: it's always clear what is waiting to go live.
Fixes worth proposing:
- Removed pages show only their address ("/old-news: removed") although the title is known from Recently deleted. Show "Old news (/old-news): removed" like the other lines (recognition over recall; S).
Screenshots: pages-1440.png, pages-390.png

### F017 "Open live site" uses the real site address — PASS
Checked: before the first publish, the button is hidden and the panel says "The link to your live site appears here after your first publish." After a run, the button opens the address the server reported (`https://crust-site.pages.dev`, with "Live at crust-site.pages.dev" under it). The link says "(opens in a new tab)" to screen readers. The baseUrl/custom-domain choice was checked through `live-url.ts` and its tests, not live.
Note: does what it says.
Fixes worth proposing: none (optional: show a small "opens in a new tab" icon for sighted users too).
Screenshots: f017-never-published.png, f008-done.png

### F018 Update links to a renamed page — PASS WITH NOTES
Checked: the rename dialog said "Links on other pages are updated to the new address too: Menu (2 links)." from `/api/links`. I read the server rename (`api.ts` ~l.286): one commit updates Button, Card, ImageOverlay, Grid and LogoRow links and rich-text links on other pages, linked sections and the page itself.
Note: links inside pages are updated as promised, but **the header menu, footer links and blog posts are not**. They keep the old address and rely on the redirect.
Fixes worth proposing:
- Also relink `site.json` header menu/CTA, footer columns and `content/posts/*` in the same commit. The menu is the most-used internal link, and its "current page" highlight probably won't match after a rename (consistency, error prevention; M).
- The success message doesn't say how many links changed. Add "…and updated 2 links on Menu" from the `relinked` result, which `App.tsx` currently ignores (visibility of status; S).
Screenshots: f015-rename-dialog.png

### F019 Restore deleted pages — PASS WITH NOTES
Checked: "Recently deleted (n)" is a real disclosure button (aria-expanded). Each item shows the title, the address and when it was deleted. "Restore <title>" shows "Restoring…", then the message "Restored … It goes live again the next time you publish." and focus moves to the Pages heading. Done with the keyboard.
Note: deleted pages come back in one click.
Fixes worth proposing:
- If a new page now uses the old address, restore stops with "There's already a page at /x." and nothing else can be done. Offer "Restore at a different address" (help users recover from errors; M).
Screenshots: f019-recently-deleted.png, f019-after-restore.png

### F020 Save browser drafts from the page list — PASS
Checked: a seeded browser-only draft shows a "Save to GitHub" button (screen-reader name "Save to GitHub Our team"). It changes to "Saving…", then the row updates and the message reads "Saved 'Our team' to GitHub. Visitors see it after you publish." On a mocked failure an alert says "Not saved to GitHub: … The draft is still safe in this browser." and focus stays on the button so you can try again.
Note: works, with good wording in both cases.
Fixes worth proposing: none.
Screenshots: f020-saving.png, f020-after-save.png, f020-fail.png

---

## Summary
- PASS: 3 (F012, F017, F020). PASS WITH NOTES: 12 (F003, F004, F006, F007, F008, F010, F013, F014, F015, F016, F018, F019). PROBLEM: 1 (F005, because the Blocks/Outline rail can't be reached by keyboard).
- Top fix 1: make the builder's Blocks/Outline rail keyboard-reachable and add a "Skip to page" shortcut (F005, WCAG 2.1.1/2.4.1, S).
- Top fix 2: clear the stale "Publishing started…" message when a run ends, and give failed saves and publishes a distinct, persistent error with "Try again" (F008/F006, S).
- Top fix 3: on rename, also update header menu, footer and blog-post links, and say how many links changed (F018, M).

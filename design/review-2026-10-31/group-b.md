# Group B review: F021 to F036

Reviewer: Claude (group B). Date: 2026-10-31.

**How I tested.** The built builder (`apps/admin/dist`) ran on port 4302. A sample site ran on port 4312. It holds all 26 library sections, the 5 page layouts, every section style with and without a photo, per-device columns and hidden blocks, an anchor link, an image overlay, a gallery, 2 blog posts, an SEO page and a hidden page. I rendered it with `packages/render/src/cli.ts` and then ran the real `crust-publish` binary, which made the resized copies, the sitemap and the RSS feed.

There are no server functions offline. To check the GitHub-connected states anyway, I faked the admin API inside Playwright, in memory: 9 pages, a last publish, waiting changes, layouts, media and posts. Those screens show the real UI against made-up server answers. The real server code was not exercised; its tests cover it. I ran axe on every screen I checked (desktop, plus 390 px and 768 px for published pages) and tried the keyboard path for each pointer action. I did not run the `npm test` done_checks, because the brief forbids changing the repo and vitest writes cache files. features.json already lists every feature as passing.

All scripts are in `/tmp/claude-0/-home-user-crust/096cbfe7-71b5-551a-af09-9311e51e84f4/scratchpad/review/B/` (t1.js to t22.js, mock.js, build.ts). Screenshots are in `/tmp/claude-0/-home-user-crust/096cbfe7-71b5-551a-af09-9311e51e84f4/scratchpad/review/B/shots/`, shortened below to `shots/`.

---

### F021 One status per page in the page list — PASS WITH NOTES
Checked: Page list at 1440 and 390, offline and with the faked GitHub connection. All five statuses appeared ("Only in this browser", "Changes not saved", "Saved, not live yet", "Live", "Built into the app"). axe found no issues.
Note: Each page now has one clear status, with an icon shape as well as a word. On phones the table turns into readable cards. One thing to fix: at desktop width the Address column breaks addresses in the middle ("/galle ry", "/cater ing").
Fixes worth proposing:
- Stop the Address column breaking inside a word: no-wrap on short addresses, or a minimum column width (the action buttons squeeze it). Readability, polish. S
- "Only in this browser" and "Changes not saved" use the same grey ring icon. A slightly different shape would make the list easier to scan (recognition over recall). S
Screenshots: shots/F021-list-1440.png, shots/F021-list-390.png, shots/list-1440.png (offline)

### F022 Publish saves waiting browser drafts first — PASS WITH NOTES
Checked: With 2 browser drafts, Publish opens "Save 2 pages first?" with the right page names. Focus starts on "Save and publish". That button saved the draft (POST /api/save), then started the publish. Escape and Cancel both close the question. axe found no issues in the dialog.
Note: The question does what it says and the wording is clear. One accessibility problem: after the question closes, keyboard focus is lost and lands on the top of the page.
Fixes worth proposing:
- Return focus to the Publish button after Cancel or Esc, and to the status message after "Save and publish". Today focus lands on `<body>` every time. This is WCAG 2.4.3 Focus Order. Cause: the shared `Dialog` in `apps/admin/src/pages/PageActions.tsx` is removed from the page before `close()` runs, so the browser can't put focus back. The Rename and Delete dialogs use the same component and probably have the same problem. S
- When a page has both a browser draft and older saved edits, it is counted twice. The list showed "About us … changes in this browser" and "About us … edited", and the button said "Publish 4 changes" for 3 pages. Merge them into one line per page (consistency, accurate feedback). S
Screenshots: shots/F022-ask.png, shots/F022-after-save-publish.png

### F023 Find and sort pages — PASS
Checked: The tools appear from 6 pages up. Searching "team" shows 1 page and "zzz" shows none, and the count is announced ("1 of 9 pages", "0 of 9 pages"). With no matches you get "No pages match …" and a "Clear search" button. "Address (A–Z)" sorts correctly, and the choice is remembered. Phone layout and axe both clean.
Note: Works as described. Feedback is clear and there is an easy way back from an empty result.
Fixes worth proposing: none
Screenshots: shots/F023-find-team.png, shots/F023-nomatch.png, shots/F021-list-1440.png

### F024 Publish shortcut in the top bar — PASS
Checked: The builder and Site settings both show "Publish (3)". Screen readers hear "Publish, 3 changes waiting". Enter goes to `#/?focus=publish`, and focus lands on the "Publish" heading of the panel. On a phone the builder opens Quick edit, which has its own "Save and publish" button.
Note: Works as described, from the keyboard too, and the count matches the page list. That page list count has the double-counting noted under F022.
Fixes worth proposing: none (the count fix belongs to F022)
Screenshots: shots/F024-topbar-builder.png, shots/F024-topbar-settings.png, shots/F024-landed-builder.png, shots/F024-topbar-builder-390.png

### F025 Section styles — PASS WITH NOTES
Checked: In the builder: the section toolbar (style dots with names, Height, Image, This section or Whole site) and the Style tab (style cards with how many sections use each, height, content position, background photo and tint). In the published site: all 4 styles, each with and without a photo and with light, medium and strong tints, at 1440, 768 and 390. Text and buttons switch light or dark correctly and stay readable on the photo. axe found no issues on any of the 3 widths. Site settings → Section styles explains "Text colour picks itself".
Note: The published sections look right and stay readable on photos. One builder problem: the section toolbar is wider than the canvas, so it hangs off the right edge.
Fixes worth proposing:
- The toolbar on a selected Section runs past the right edge of the canvas. Its "Make linked" button is clipped, and the canvas gets a sideways scrollbar (page width 2230 px in a 1280 px canvas). After "Save as layout" the canvas was left scrolled sideways (see F027-save-dialog). Wrap the toolbar or move extra actions into a "More" menu. Polish, error prevention. M
- The "+" insert button sits on top of the toolbar's style dots when a section is selected. Polish. S
Screenshots: shots/pub-styles-1440.png, shots/pub-styles-390.png, shots/F030-section-Style.png, shots/F030-section-content.png, shots/F027-save-dialog.png, shots/F025-settings-section-styles.png

### F026 Layout library — PASS WITH NOTES
Checked: Opened "Layouts" with the keyboard; focus starts in the search box. The library has 26 sections in 12 categories and 5 page layouts. Typing "faq" announced "3 sections"; Tab then Enter added "Questions and answers" and announced "Added … It uses your site style". Ctrl+Z undid it. Escape returns focus to the Layouts button. I also published all 26 sections and all 5 page layouts: axe found no issues at 1440, 768 and 390, and crust-publish found no heading problems.
Note: Easy to use from the keyboard. Every layout passes the checks and matches the site style.
Fixes worth proposing:
- The 3-column card grid leaves large empty gaps when thumbnails differ in height (for example under "Centered hero"). Line up rows, or crop thumbnails to the same height. Polish. S
- Thumbnails are very small at 1440 and the text in them can't be read. One more step of zoom would help people recognise a layout (recognition over recall). S
Screenshots: shots/F026-library.png, shots/F026-library-faq.png, shots/F026-whole-pages.png, shots/pub-library-1440.png, shots/pub-page-landing-390.png

### F027 My layouts — PASS WITH NOTES
Checked (faked server): "Save as layout" on a section opens a small name box filled with the section's heading. Enter saves it, and you see "Saved 'My hero' to My layouts". It then shows under My layouts (1) with a preview. The "More for My hero" menu (32 px, keyboard OK) offers Rename (focus goes to the name field; the new name was saved) and Delete (focus goes to "Delete layout", which asks first). "Save this page as a layout" is there too, and the empty state explains what to do.
Note: Works as described, and it is clear that layouts are copies. One small wording mistake.
Fixes worth proposing:
- The count line reads "1 of your layout". It should say "1 of your layouts" or "1 layout". Clear wording. S
- After saving, the canvas was left scrolled sideways. That is the toolbar overflow from F025. Fixing F025 fixes this.
Screenshots: shots/F027-save-dialog.png, shots/F027-mine.png, shots/F027-more-menu.png, shots/F027-rename.png, shots/F027-delete.png, shots/F027-mine-empty.png

### F028 Style customizer v2 — PASS WITH NOTES
Checked: Site settings at 1440 and 390. I went through each panel: Presets (10, current one marked), Typography (fonts, 4 heading sizes, weights, letter spacing), Buttons (shape and fill), Cards (flat, outline, shadow), Links (underline, thick, highlight; the "always underlined" note is reassuring). I applied the "Night" preset: the preview went dark and readable, "Undo preset (Night)" appeared, and "Unsaved changes" showed. axe found no issues before and after.
Note: Full and well explained. The live preview makes choices easy to judge. A few details could be clearer.
Fixes worth proposing:
- The letter spacing samples ("Studio" in tiny type) look almost the same. Show them larger, or as a heading, so you can actually see the difference (recognition). S
- Under each font menu, "Font list: Seravek, 'Gill Sans Nova', …" is developer jargon. Hide it behind a "Details" toggle or remove it. Plain language. S
- In the option cards, the selected one differs mainly by its blue border. A check mark would make it clear without relying on colour (WCAG 1.4.1 is met by the border width change, but only just). S
Screenshots: shots/settings-1440-full.png, shots/settings-Typography.png, shots/settings-Buttons.png, shots/settings-Cards.png, shots/settings-Links.png, shots/F028-night.png, shots/settings-390-full.png

### F029 Per-device columns — PASS WITH NOTES
Checked: In the builder, the Columns Style tab has width pickers for Desktop, Tablet and Phone (radio groups, current choice marked). "Show on" uses toggle buttons with on/off state for screen readers, and turning one off explains "Hidden on phone…". In the published site with JavaScript off, a 2/3 + 1/3 column (1088 px vs 704 px, as rendered) stacked on phone. "Only desktop" and "Only phone" blocks showed and hid correctly at 1440, 768 and 390. axe found no issues.
Note: Works in the published site without JavaScript, as promised. One problem in the phone preview of the builder.
Fixes worth proposing:
- In the canvas at phone width, the purple "Site header · edit in Site settings" label covers the header's Menu button. Move the label inside the header's left edge, or show it only on hover. Polish. S
- Labels like "1/2 + 1/4 + 1/4" wrap onto 2 lines in the narrow width cards. The little diagram is enough; shorten the label or give the cards more room. S
Screenshots: shots/F029-columns-style.png, shots/F029-hide-phone-desktop-canvas.png, shots/F029-mobile-canvas.png, shots/pub-responsive-1440.png, shots/pub-responsive-390.png, shots/pub-responsive-768.png

### F030 Content, Style and Advanced tabs — PASS WITH NOTES
Checked: The tabs are a radio group named "Settings to show", with arrow keys and the chosen tab kept from block to block. Section: Content (a hint only), Style (style, height, position, photo), Advanced (padding, Show on, Replace me, anchor). Card, Columns, Accordion and the page settings all checked. The anchor works when published: a `#prices` button jumps to `id="prices"`.
Note: Clear split, and simple edits stay simple. Two details are inconsistent.
Fixes worth proposing:
- Some settings still use Puck's own grey labels with the "T" icon and its dropdowns (Card "Background", "Title level", "Vertical padding"). Others use Crust's bold labels and picture cards. Make them look the same (consistency). M
- For a Section, the Content tab shows only a hint, while the tab choice is kept from the last block. Consider opening on Style when a Section is selected and Content is empty. Efficiency. S
Screenshots: shots/F030-section-content.png, shots/F030-section-Style.png, shots/F030-section-Advanced.png, shots/F032-accordion-panel.png

### F031 Header, footer and menu — PASS
Checked: In Site settings: show or hide, logo name or image, menu links (move up, move down, remove, add a page, add a link, rebuild from pages), header button, sticky, Search link, 4 styles, and the footer (text, columns, copyright with {year}). In the published site with JavaScript off, at 390 the "Menu" button (88×44 px) opened with Enter and the next Tab reached "Home". The current page is marked (aria-current, underlined). There is a skip link. axe found no issues at all widths.
Note: Works without JavaScript and from the keyboard. The automatic menu takes the first 6 pages, which is sensible.
Fixes worth proposing:
- The menu link boxes (label, address) have no visible labels, only hidden screen-reader names. Small "Label" and "Address" headings above the rows would help (WCAG 3.3.2, nice to have). S
Screenshots: shots/settings-Header_menu.png, shots/settings-Footer.png, shots/F031-phone-menu-open.png, shots/pub-responsive-390.png

### F032 More elements — PASS WITH NOTES
Checked: I added Accordion, Icon list, Quote, Gallery, Image overlay, Logo row and Grid of cards from the block list with Enter. Each one was announced ("… added to the page, position 3 of 3"). Item lists have named buttons ("Move How long does a project take? up", "Remove …", "Add a question"). Published, with JavaScript off: the accordion uses native `<details>`, the gallery and overlay render correctly at all widths, and axe found no issues.
Note: All 7 blocks work without JavaScript and are keyboard-friendly. One layout trap: a block added with nothing selected lands at the very end of the page, outside any section.
Fixes worth proposing:
- A block added at page level, outside any Section, has no side margins: its text touches the edge of the canvas, and of the screen on a published phone page (seen on a post body). Either add new blocks inside the last section, or give page-level blocks the normal page gutter. Error prevention, polish. M
- Empty gallery tiles say "Add an image URL". With the media library, "Choose a photo" fits better (consistency). S
Screenshots: shots/F032-canvas-new-blocks.png, shots/F032-accordion-panel.png, shots/pub-responsive-1440.png, shots/pub-library-1440.png, shots/F035-pub-blog-opening-day-390.png

### F033 Theme pack export and import — PASS WITH NOTES
Checked: Download gave `crust-demo-look.crust` with format, version, tokens and chrome, plus a message saying where to bring it in. Import tests:
- A broken file: "Nothing was changed. This file can't be used…"
- A file with an unknown script block: refused ("blocks Crust doesn't know").
- A file with unreadable colours: style left out, contrast problems listed.
- A good file: colour preview, Use checkboxes, "Use this theme" and Cancel.
Messages are announced (role alert and status). axe found no issues.
Note: Safe and clear. Nothing changes until you confirm. The contrast error list is long and repeats itself.
Fixes worth proposing:
- For a low-contrast pack, the same problem is listed twice in two wordings with slightly different numbers ("text on the page is 1.35:1…" and "Text on Page sections is hard to read (1.36:1)"). Show one plain line per problem (aesthetic and minimalist design). S
- After choosing a file, focus stays on "Download theme pack", above the result. Move focus to the "Previewing …" heading so keyboard and screen-reader users land on the result (WCAG 2.4.3 helpfulness). S
Screenshots: shots/F033-panel.png, shots/F033-import-junk.png, shots/F033-import-bad.png, shots/F033-import-evil.png, shots/F033-import-good.png

### F034 Media library and image uploads — PASS WITH NOTES
Checked (faked server): "Choose image" opens the picker, with focus on the first photo (radio group, arrow keys). Photos without a description show a "Needs alt" badge. After an upload, focus goes to the "Alt text (required)" box, and trying to continue with it empty marks it invalid. Picking a library photo for an existing Card copied its description into the block's alt field. Published: crust-publish made `-480w` and `-960w` copies. axe found no issues. Phone layout is OK. Uploading to R2 or GitHub was not exercised offline; the server tests cover it.
Note: Works well, with one bug. On a block you have just added, picking a library photo does not copy its description into the alt field.
Fixes worth proposing:
- Bug: on a newly added Image block, the first library pick leaves "Alt text" empty, although the photo has a description. The saved draft has `"alt": ""`. It works on blocks that already existed. Cause: `fillAltText` in `apps/admin/src/media/fields.tsx` returns early when Puck has no previous data (`if (!lastProps) return props;`). Publishing still catches the missing alt, but this defeats the "describe once" promise. S
- The description is asked for after the upload, not as part of it, so a photo can enter the library undescribed (shown as "Needs alt"). That matches "asked for at upload" loosely. Consider stating "Add a description to finish" until it is saved (error prevention). S
- On a phone the picker says "For: Photo, part 6", which means nothing to an owner. Name the block instead ("For: Section background, Hero"). Clear wording. S
Screenshots: shots/F034-picker-1440.png, shots/F034-upload-step.png, shots/F034-upload-noalt.png, shots/F034-after-upload.png, shots/F034-use-noalt.png, shots/F034-picker-390.png

### F035 Blog and collections — PASS WITH NOTES
Checked (faked server): The Posts list shows title, date, address and Delete. "New post" opens title, address (made from the title), date and "Create and edit". Blog page title and intro are editable. Published 2 posts: `/blog/` (cover, title, date, summary), each post page (News · date, H1, summary, cover), and `feed.xml` (valid RSS 2.0, newest first). The feed is linked from the pages and the posts are in the sitemap. axe found no issues at 1440 and 390.
Note: The published blog and feed work well. The admin list is plainer than the page list, and its links look like default browser links.
Fixes worth proposing:
- On the Posts screen, the post titles and the "publish" link are bright default blue (#0000EE). Use the same link style as the Pages list (consistency). S
- The Posts list has no status per post. Pages have "Saved, not live yet" and "Live" (F021). Add the same so the owner knows whether a post is live (visibility of system status). M
- On `/blog/`, a post without a cover sits next to one with a cover, so titles don't line up. Use a plain placeholder block, or a list layout when covers are mixed. Polish. S
Screenshots: shots/F035-posts-1440.png, shots/F035-posts-390.png, shots/F035-new-post.png, shots/F035-pub-blog-1440.png, shots/F035-pub-blog-390.png, shots/F035-pub-blog-opening-day-1440.png, shots/F035-pub-blog-opening-day-390.png

### F036 Search and sharing settings per page — PASS
Checked: The Page panel has Search title (with a live count: "106 characters · search engines usually show about 60" in warning colour), Social image (library pick, and the alt was copied), Social image alt text, and "Hide from search engines" with a plain explanation. It also has two previews: "In search results" ("Hidden from search engines" when ticked) and "When shared", a card with the image, domain, shortened title and description. Published: `<title>`, canonical link, og:title, og:image and og:image:alt, twitter:card. The noindex page has `<meta name="robots" content="noindex">` and is left out of sitemap.xml.
Note: Works as described, and the share preview is a nice touch.
Fixes worth proposing:
- Optional: warn when "Hide from search engines" is ticked on the Home page (error prevention). S
Screenshots: shots/F036-panel.png, shots/F036-panel-bottom.png

---

## Summary
- PASS: 4 (F023, F024, F031, F036)
- PASS WITH NOTES: 12 (F021, F022, F025, F026, F027, F028, F029, F030, F032, F033, F034, F035)
- PROBLEM: 0
- Top 3 fixes by impact: (1) Return keyboard focus when a dialog closes. The shared `Dialog` sends focus to `<body>` after Publish, Cancel or Esc (WCAG 2.4.3). (2) The Section toolbar runs past the canvas edge and scrolls the canvas sideways (F025, F027). (3) A library photo's description is not copied into a newly added Image block (F034 `fillAltText`). Close behind: blocks added outside a Section have no side margins (F032).

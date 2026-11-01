# Group C review: F037 to F052

Reviewer: Claude (group C). Date: 2026-10-31.
Shots folder (S): `/tmp/claude-0/-home-user-crust/096cbfe7-71b5-551a-af09-9311e51e84f4/scratchpad/review/C/shots/`
How I tested: I served the built builder (`apps/admin/dist`) offline on port 4303. I unpacked each `templates/*.crust` with the repo's own `readTemplate` and `unpackTemplate`, rendered it with `packages/render/src/cli.ts`, and published it with the already-built `target/debug/crust-publish` plus Pagefind, all into my own folder (`tpl/<name>/site`). Then I looked at all 8 published pages per template (5 pages, the blog, the post, search) at 1440, 768 and 390 px: full-page screenshots after scrolling, so lazy-loaded photos had loaded, plus axe. I also ran a copy of `check-template.ts` whose output goes to my folder (`template-check/index.html`). Offline there are no `/api/*` server functions. For saving to GitHub, publishing, uploads and the publish block I read the tests and code, as noted per feature. I made no changes in /home/user/crust. Note: `git status` there shows uncommitted changes in `apps/admin/server/*` (api.ts, github.ts, media.ts, posts.ts, sections.ts, template.ts and new local-store.ts, node-folder.ts, store.ts). They are not mine and were made by another session.

---

## Problem that affects all three templates (root cause in the blog post renderer, F035)

**The body text of a blog post runs to the left edge of the screen with no margin.** This happens on every template (Harbour, Signal, Corner) and at every width. The post's title block sits in the normal centred column. The body (bare `Text` blocks at the top level of `post.puck.content`) comes out as `<div class="cr-text">` straight under `<article class="cr-post">`, with no `.cr-container`. The builder's own new-post sample is also a bare Text block, so the owner's own posts will look the same.
- Fix: in the post page renderer, wrap top-level non-Section blocks in the post's narrow container (`cr-container cr-post-narrow`), or add CSS for `.cr-post > :not(section, header)`. Size S. WCAG 1.4.10 (reflow) and plain visual quality.
- Screenshots: S/harbour-_blog_studio-news_-d.png, S/signal-_blog_studio-news_-t.png, S/corner-_blog_studio-news_-p.png
- The template check (F047) and axe both pass this page, so no automatic check catches it (see F047).

---

### F037 Contact form block — PASS WITH NOTES
Checked: Harbour's contact page rendered with and without `CONTACT_FORM_URL` (test Turnstile key). Phone and desktop. I opened the `#…-sent` and `#…-error` return states, pressed Submit on an empty form, ran axe (clean), and read `packages/contact/src/worker.ts` and its tests.
Note: The form is well built (real labels, autocomplete, honeypot, origin check, a thank-you and an error message that work without script). But when sending fails, the visitor is sent back to an empty form and loses what they typed.
Fixes worth proposing:
- Keep the visitor's words when sending fails. Turnstile needs JavaScript anyway, so when it is available, send with `fetch` and show the result in place; keep the current redirect only as the no-script fallback. Why: error recovery (Nielsen 9), WCAG 3.3.3 error suggestion. M
- Make the error message say what went wrong ("The email address looks incomplete" or "The spam check didn't finish, please try again") rather than "check the form". Why: WCAG 3.3.1/3.3.3. S
- When the form isn't connected yet, the published page shows a greyed-out form with a pale "Send message" button. It looks broken (S/harbour-_contact_-d.png). On the butter background of Corner, the "isn't connected" notice has no visible box at all (S/corner-_contact_-t.png). Hide the form and show the contact details instead, or at least give the notice a visible box in every theme. Why: visibility of status. S
Screenshots: S/cf-blank.png, S/cf-sent.png, S/cf-error.png, S/harbour-_contact_-d.png, S/corner-_contact_-t.png

### F038 Phone quick-edit mode — PASS WITH NOTES
Checked: Opened `#/edit?path=/` at 390 px (touch). Changed the heading, pressed Save, and confirmed the change in the full builder at 1440. Ran axe (clean) and an aria snapshot. Touch targets are at least 40 px. "Save and publish" only appears when GitHub is on, so I checked it through `quick-edit.test.tsx` (it saves, then publishes, and won't publish if saving failed).
Note: It does what it says: one calm form per block, a sticky Save button, clear "saved in this browser" feedback.
Fixes worth proposing:
- Screen readers hear field names like "Text , part 2" and "Heading, part 1": there is a stray space, and "part" is unclear. Use "Text, block 2" or the visible block number. Why: WCAG 2.5.3 (label in name) and clear wording. S
- "←Pages" in the top bar has no space after the arrow. Cosmetic. S
Screenshots: S/quick-p-top.png, S/quick-p-full.png, S/quick2-p-saved.png

### F039 Site search — PASS WITH NOTES
Checked: Published Harbour with Pagefind and searched "studio" (3 results) and "zzqx" (the "no results" message) at 1440 and 390, using only the keyboard (Skip link, then Tab to the field, then Enter). Ran axe (clean). Rendered a copy with `header.search: true` to see the header link at 768 and 390.
Note: Search works and reads well: a labelled field, a results count in a live region, the tab title updates, and there is a no-script message.
Fixes worth proposing:
- Result titles use the browser's default blue link colour, not the theme's link style (S/search-results-p.png). Style `.cr-search-results a` like other links. Why: consistency, visual quality. S
- After the search, the page reloads with focus at the top, and the count is put into the live region while the page loads, which many screen readers don't announce. Move focus to the results count (or the first result heading) once results are shown. Why: WCAG 4.1.3 status messages, feedback. S
Screenshots: S/search-results-d.png, S/search-results-p.png, S/search-none-p.png, S/hs-fold_about_-t.png

### F040 Builder tidy-up — PASS WITH NOTES
Checked: Ran axe on the page builder, a selected Text block, the layout library, the Make linked popover and the template screens: no issues. Sign out is on the Pages screen, the page builder, the post builder and the quick edit header. It links to `/cdn-cgi/access/logout`. Bringing back a renamed page's redirect on restore I checked through `apps/admin/server/tidy-up.test.ts` (offline there is no history).
Note: All four Puck accessibility issues are gone. Sign out is easy to find, a little too easy.
Fixes worth proposing:
- Sign out sits right before the main action ("New page" on the Pages screen, "Save draft" in the builder). A slip of the mouse signs you out mid-edit. Move it to the far end of the bar, after a divider, or into a small account menu. Why: error prevention (Nielsen 5). S
Screenshots: S/pages-d.png, S/pages-p.png, S/rt-builder.png

### F041 Layouts for the new blocks — PASS WITH NOTES
Checked: Opened Layouts in the builder at 1440 and went through the Gallery, Logos, FAQ, Testimonials and Contact categories. Ran axe (clean). The kinds are a radio group and the categories are buttons that show they're pressed. The done check also runs each layout through axe.
Note: All the promised layouts are there with plain names and one-line descriptions. The Gallery and Logo thumbnails are hard to judge because they show empty grey boxes.
Fixes worth proposing:
- Give the Gallery and Logos layouts small built-in sample pictures for their thumbnails (they need not be inserted), so the owner can see the shape before adding them. Why: recognition over recall. S to M
- Cards in the grid have uneven heights (for example "Full-screen dark hero" next to short cards), which leaves gaps. Give previews a fixed ratio. Why: visual order. S
Screenshots: S/lay-library.png, S/lay2-Gallery.png, S/lay2-Logos.png, S/lay2-FAQ.png, S/lay2-Contact.png

### F042 Rich text in Text blocks — PASS WITH NOTES
Checked: Selected a Text block in the builder (1440) and in quick edit (390). Used Ctrl+B, Ctrl+K with `/about`, a "- " list shortcut and Ctrl+Z. Tried `javascript:alert(1)` as a link. In the toolbar, Shift+Tab then the arrow keys move between buttons (roving tabindex). Escape returns focus to the text. Ran axe (clean).
Note: Formatting, links, lists and shortcuts all work. A bad link is refused with a clear message, and focus stays in the field (`aria-invalid` is set).
Fixes worth proposing:
- When the editor (or the link field) is focused in the builder's right panel, the panel content shifts about 10 px and the field's right edge and focus ring are cut off (S/rt-rt-link.png, S/rt2-bad-link.png). Let the panel keep its own scrollbar space, or make the field's width fit. Why: WCAG 2.4.7/2.4.11 focus visible (partly hidden), polish. S
- After a bold, linked word, pressing Enter keeps bold on for the new line or list item. That is Lexical's default; consider clearing formatting at a new paragraph. Why: predictability. S
Screenshots: S/rt-text-selected.png, S/rt-rt-link.png, S/rt2-bad-link.png, S/rt-canvas.png

### F043 Linked sections — PASS WITH NOTES
Checked: Selected a section, used Make linked (name prefilled, Enter), opened "Edit linked section" (its own editor, "on 1 page"), and looked at the Linked tab in Layouts (helpful empty state). Ran axe (clean). Saving and updating every page goes through the server, so I checked that by tests only.
Note: The idea is clear and the wording is good ("Edit opens it on its own… Unlink makes this page's copy a normal section"). But naming a new linked section makes the page jump sideways and stay there.
Fixes worth proposing:
- **High priority.** The "Make linked" name popover opens inside the canvas, past its right edge. The canvas page then scrolls about 950 px sideways, so the owner sees only the right-hand strip of the page. It **stays scrolled after Cancel/Escape** (measured: canvas `scrollX=950`, width 2230 vs 1280). Place the popover inside the visible canvas, or render it in the builder rather than the canvas frame. Reset the canvas scroll when it closes. "Save as layout" on the same toolbar probably has the same problem. Why: visibility of system status, user control. S to M
- The linked section's toolbar label is "Linked section", and the panel says "Linked section: How it works". The canvas tag "Linked section · How it works" is very small (about 7 px at 57 % zoom). Make it bigger. Why: legibility. S
Screenshots: S/lk3-1-selected.png, S/lk3-2-popover.png, S/lk4-after-esc.png, S/lk3-3-made.png, S/lk5-editor.png, S/lk-linked-tab.png

### F044 Custom domain — PASS WITH NOTES
Checked: Site settings, Site address at 1440. Typed `www.bakery.com` (preview "Your pages will be at https://www.bakery.com/about"), `http://bakery.com/shop` (refused) and `https://bakery.com` (accepted). The guide link opens `docs/setup-custom-domain.md` on GitHub, and the file exists. Ran axe (clean). Use in the sitemap, canonical link, RSS and live link is covered by `custom-domain.test.ts` (web and server).
Note: A very clear screen: the `https://` prefix is built in, there is a live example of the result, the steps are numbered, and it lists where the address is used.
Fixes worth proposing:
- For `http://bakery.com/shop` the message only talks about https. Also say that addresses can't have a path ("/shop"). Why: precise error messages (WCAG 3.3.3). S
Screenshots: S/set2-Site-address.png

### F045 Save a site as a template — PASS WITH NOTES
Checked: Site settings, Template: typed a description and pressed Save as template. The file `crust-demo.crust` (3 KB) downloaded, with the status "Saved … It's in your Downloads folder." I opened that file again through "Open a template file…" and its preview worked. I also opened a damaged copy (an unknown block): it was refused with a plain list in a `role="alert"` box. Ran axe (clean). Photos and linked sections from GitHub I checked by tests (`template-file`).
Note: Works end to end, with good wording.
Fixes worth proposing:
- A damaged file lists a follow-on problem as a second error ("Page 'Crust demo' has blocks Crust doesn't know" and then "The template needs a Home page"). Show the first cause only, or link the two. Why: clear error messages. S
- After opening a file that is refused, focus goes back to the page itself. Move focus to the error box so keyboard users land on it. Why: WCAG 3.3.1, focus order. S
Screenshots: S/set2-Template.png, S/set3-after-save.png, S/tp4-bad.png, S/tp4-good.png

### F046 Placeholder content — PASS WITH NOTES
Checked: Applied Harbour offline from the gallery. The Pages list shows "17 things to replace" on Home and so on. In the builder, "To replace 17" opens the checklist (Escape closes it, focus goes back). "Keep as is" lowered the count and moved focus to the new heading. Marked blocks have dashed outlines with "Replace me" tags. Ran axe (clean). The publish block I checked by code and tests: PublishPanel lists the pages and disables publishing, and crust-publish refuses `data-crust-placeholder`.
Note: Clear and reassuring ("Publishing waits until each is replaced… or kept on purpose").
Fixes worth proposing:
- The checklist isn't in page order: in Harbour, Landscape comes before Interiors before Architecture, and the work photos are reversed. List items in reading order. Why: match between system and the real world. S
- The orange "Replace me" tags sit on top of the first words they mark ("We take…", "Houses, studios…"). Place the tag above the outline. Why: legibility. S
- Item names like "Section terraces.jpg" use builder jargon. Use "Background photo (terraces.jpg)". Why: plain wording. S
Screenshots: S/ph-list.png, S/ph-builder.png, S/apply-after-apply.png

### F047 Template quality check — PASS WITH NOTES
Checked: Ran a copy of `scripts/check-template.ts` (output to my folder) on all three templates: every check passes (axe on 9 pages at three widths, contrast for every section style (lowest 4.70:1, Signal), Lighthouse 100/100/100/96). Opened the report at 1440 and 390: readable, with a plain "why" under every check.
Note: The check does its job and the report is easy to read. But it is blind to layout bugs: it passed all three templates with a visibly broken post page and the oversized preview hero (F048).
Fixes worth proposing:
- Add a "how it looks" section to the report: one small screenshot of every page at three widths (the tool already visits them for axe), and a simple check that no text block touches the screen edge (left padding at least 16 px). Why: would have caught the post-body bug. M
- "Every layout renders" isn't exercised: none of the three templates has saved layouts ("This template has no saved layouts"). Add one saved layout to a starter template, or a test fixture. S
Screenshots: S/f047-report.png, S/f047-report-p.png (report: `template-check/index.html` in my folder)

### F048 Start from a template — PROBLEM
Checked: Pages, Start from a template at 1440: gallery, Corner and Harbour previews at desktop, tablet and phone, the confirm dialog (focus on Cancel, Escape returns focus), Replace my site (offline, browser drafts), then "Bring back my previous site" with its own confirmation. Ran axe on every screen (clean).
Note: The flow and wording are excellent (a "Replaced / Kept" list, a safe default, a way back). But the live preview of Harbour, the flagship, shows only a blank sky: its opening section grows to 2244 px tall in the desktop preview and 5185 px in the phone preview.
Fixes worth proposing:
- **Preview hero is far too tall.** The preview frame is sized to its content, and a section with height "large" or "full" uses viewport units, so it keeps growing (measured inside the preview: viewport 2993 px, hero 2245 px). Give the preview frame a fixed viewport height (for example 900, 1024 or 844 px, scaled) and scroll inside it, or cap `vh` sections in preview CSS. Why: the preview must show what the site will look like; the headline isn't visible. S
- Show Harbour first (it is the flagship) rather than in alphabetical order. Why: guide the choice. S
- "Open a template file…" uses the browser's plain "Choose File" button, and the card's "Site settings →" arrow touches the border. Style it like the other buttons. Why: consistency. S
- After "Replace my site", focus goes back to the page itself. Move it to the "Your site uses the … template" heading. Why: WCAG 2.4.3 focus order, feedback. S
- After applying, template pages are labelled "Built into the app" in the Pages list (offline). Say "Kept in this browser". The preview legend "Dashed outlines: sample content to replace" also shows for templates that have none. S
Screenshots: S/tp-gallery.png, S/tp2-harbour-preview.png, S/tp-preview.png, S/tp-preview-Phone.png, S/tp-confirm.png, S/back-applied.png, S/back-confirm-back.png, S/back-restored.png

---

## Starter templates (F049 to F052): an art director's read

All three templates: every page has no axe issues at three widths, no sideways scrolling, no broken photos, and has one h1 with ordered headings. The shared blog post bug above applies to each. Short pages (blog list, post, search) end with the footer above the bottom of the window, which leaves a band of page colour under it. Make the footer reach the bottom on short pages (`min-height: 100dvh` flex column) (S).

### F049 First starter template (Harbour, superseded by F052) — PASS WITH NOTES
Checked: Same pages as F052 (Home, About, Services, Work, Contact, blog with one post, linked "contact strip" CTA on every page). Template check passes.
Note: The page set and linked contact strip work as the brief asked. The visual judgement is under F052, which reworked this template.
Fixes worth proposing: see F052 and the shared post-page bug.
Screenshots: see F052.

### F050 Second starter template: Signal — PASS WITH NOTES
Checked: All 8 pages at 1440, 768 and 390, full page, and axe.
Note: It has a confident voice: the tight, heavy sans, black opening and single burnt-orange accent are consistent, and the pill buttons and shadow cards match direction B. It is held back by its pictures and an empty hero.
Fixes worth proposing:
- The work pictures are flat orange shape illustrations (stand-ins). They read as clip-art and make the Work page look unfinished, even for a template. Use real CC0 photos, as Harbour now does, or bolder abstract art that is clearly meant as a placeholder. M
- The hero is type only, with the right half of the black block empty at desktop. Add an image, a large number or a statement graphic, or let the headline run wider and larger. S to M
- On phones, "Recent work" stays two across, with tiny pictures and captions breaking onto two lines (S/signal-_-p.png). Stack to one column on phone. S
- The testimonial floats on the left with empty space to the right. Centre it or give it a portrait or logo. S
Screenshots: S/signal-_-d.png, S/signal-_-p.png, S/signal-_work_-d.png, S/signal-_blog_studio-news_-t.png

### F051 Third starter template: Corner — PASS WITH NOTES
Checked: All 8 pages at 1440, 768 and 390, full page, and axe.
Note: It feels warm and local (serif and navy on butter). The "highlighter" links don't read as highlighter: they show as dull grey-beige blocks behind the text, which look like a selection or a disabled state.
Fixes worth proposing:
- Highlighter links: use a real marker treatment, for example a bright yellow stripe across the lower half of the text (`linear-gradient(transparent 55%, #ffe36e 55%)`), not a grey full-height block. Re-check contrast after the change. S
- The hero headline is small for an opening (about the size of a section title) and has no picture. Increase the size or add a shop or maker photo. S to M
- On the Contact page, the footer and the page share the same butter colour, so the footer has no edge (S/corner-_contact_-t.png). Add a rule or the surface colour. S
- Same flat stand-in pictures as Signal (navy shapes): same advice. M
Screenshots: S/corner-_-d.png, S/corner-_about_-p.png, S/corner-_contact_-t.png, S/tp-preview.png

### F052 Harbour, premium-minimal rework — PASS WITH NOTES
Checked: All 8 pages at 1440, 768 and 390 after loading every photo, plus a first-screen view at each width, and axe. I compared it with the brief: a photo behind the opening headline, real CC0 photos (10, credited in `scripts/starter-templates/photos/CREDITS.md`), a tall photo beside two wide ones, text-only statement bands, quiet "Learn more" links, latest journal and a "join us" line.
Note: By far the strongest of the three, and close to the Fuse bar in restraint. The Work page (mirrored mosaics around a statement band, then a full-width photo) is genuinely good. It is not yet at Fuse level in the first impression: the opening photo is too pale to carry the page.
Fixes worth proposing:
- The opening photo (white concrete with a light tint) reads as washed out, and the headline has little drama. On phones the crop shows mostly sky and blank wall; the stair and the figure are cropped out (S/harbour-fold_-p.png), and a strip of blue sky shows at the top on desktop. Choose a photo with more tonal contrast, or set a focal point for the phone crop, and consider a larger headline. M
- "What we do": the h2 sits too close to the three h3s under it, so the levels merge. Add space under the section title. S
- Journal teaser: the photo is small and not aligned with the text column, and "Read the post" comes before the hiring line, so the two messages run together. Put "Read the post" last, or split off the hiring line. S
- After each page's opening block (About, Services, Work) there is a gap of about 200 px (two section paddings back to back). It reads as a hole, not as air. Use smaller padding on one of the two. S
- Services still uses boxed cards, which conflicts with the quiet, unboxed style of the rest. At tablet width, 3 cards in 2 columns leaves one on its own. S
- The contact CTA band has less padding than the other bands and a boxed white button. Give it the same vertical rhythm. S
- Photo credits are kept in the repo, which is fine since CC0 needs none. The F052 brief said "credited in the template's notes", but the .crust file has no notes. Either add them to the description file, or note in DECISIONS.md that repo-only credits are intended. S
Screenshots: S/harbour-_-d.png, S/harbour-_-p.png, S/harbour-fold_-p.png, S/harbour-_work_-d.png, S/harbour-_about_-d.png, S/harbour-_services_-t.png, S/harbour-_contact_-d.png, S/harbour-_blog_studio-news_-d.png

---

## Summary
- Verdicts: PASS 0 · PASS WITH NOTES 15 (F037 to F047, F049 to F052) · PROBLEM 1 (F048). One more problem cuts across features: the blog post body has no side margin (renderer, F035), visible in every template.
- Top fix 1: put post body blocks inside the page container (every template's blog post is visibly broken). S
- Top fix 2: give the template gallery preview a fixed viewport height, so tall opening sections (Harbour) aren't stretched to 2000 to 5000 px. S
- Top fix 3: stop the "Make linked" popover (and probably "Save as layout") from scrolling the canvas sideways and leaving it stuck. S to M

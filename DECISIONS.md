# Decisions log

Newest at the top. Each entry: what we decided, and why.
Claude logs reversible low-impact choices here; the owner makes scope calls.

## Proposals

Features Claude suggests. They are not work until the owner adds them to
`features.json`.

- *(All proposals so far were approved by the owner on 2026-10-28: the
  first four are F011–F014, "rename and delete pages" is F015 and "show
  what's not published yet" is F016. Claude's next four recommendations
  were approved the same day as F017–F020. The four from the Impeccable
  review were approved on 2026-10-29 as F021–F024.)*
- **Sign out button in the builder.** Today the only way to sign out is
  to open `crust-admin.pages.dev/cdn-cgi/access/logout`. A "Sign out"
  item in the top bar would link there. Small.
- **Bring the redirect back when a renamed page is restored.** Deleting a
  renamed page removes its old-address redirect, and restoring it doesn't
  add the redirect back. Harmless today; matters once the site has
  visitors and bookmarks.
- **Fix the 4 axe issues in Puck's own builder chrome.** Found while
  checking F030: the canvas iframe has no title, the zoom menu has no
  label, the "Layout"/"Content" headings in the block list are low
  contrast, and a loading spinner has an aria-label it may not use. Small
  CSS and attribute fixes from our side; not visitors-facing.
- **Layouts that use the new blocks.** Add FAQ, gallery, logo strip and
  features-grid layouts to the Layout library (F026), so the new blocks
  are one click away. Small.
- **Gallery lightbox (opt-in).** Click a photo to see it large. Needs a
  little JavaScript on pages that use it; off by default.
- **Milestone 3 proposal: "Real content"** — *approved by the owner on
  2026-10-30 and added as F034–F039; see docs/milestone-3.md.* Milestone 2 made pages look good; the gaps that
  matter next are getting real content in and helping people find it.
  1. **Media library with uploads.** Drop images in, pick them from a grid,
     alt text asked at upload. Stored in Cloudflare R2 (free tier: 10 GB),
     and crust-publish makes resized WebP copies with `srcset`, so pages
     stay fast on phones. Biggest daily friction today: pasting image URLs.
  2. **Blog / collections.** A "Posts" list with a post template, an index
     page and an RSS feed. Most small sites need news or a portfolio.
  3. **SEO and sharing panel per page.** Social image, search title,
     preview of how the link looks when shared, `noindex` switch.
  4. **Contact form block.** Cloudflare Worker + Turnstile (free), messages
     emailed to the owner; keyboard- and screen-reader-friendly errors.
  5. **Phone quick-edit mode.** Edit text and swap images on the phone,
     then publish (the spec's "later" phone story).
  6. **Site search** with Pagefind, built at publish time, no server.
  Every item keeps $0 running cost; 1 and 4 need new Cloudflare setup the
  owner does (logged in BLOCKED.md when the time comes). Each visual one
  starts with a design snapshot, as before.
- **Linked sections ("global sections").** A saved layout is a copy. A
  linked section (for example a contact strip on every page) would update
  everywhere when edited once. Useful later; needs a page-format change.
- **Direction: a YOOtheme-style builder and a template business**
  (discussed with the owner on 2026-10-30; roadmap page:
  https://claude.ai/artifact/4eHUDzJ3tDeeaNPBf4T4ii). The aim is for
  people to buy complete Crust templates from us, as they buy themes on
  Envato. Proposed order: M4 Daily use → M5 Templates → M6 Crust for others
  → M7 Store → later a marketplace for other designers. Not approved as
  scope; three calls are the owner's: how buyers run Crust (Claude
  recommends a desktop app built with Tauri), what people pay for (Claude
  recommends a Crust licence with starter templates plus paid templates),
  and whether to sell plain-HTML exports early.
- **Milestone 4 proposal: "Daily use"** — *approved by the owner on
  2026-10-30 ("Approve") and added as F040–F044; see docs/milestone-4.md.* Milestones 1–3 made the builder work. Before designing
  templates in Crust (M5), the owner needs to build real sites in it
  comfortably every day, and templates will lean on these pieces.
  1. **Rich text in Text blocks.** Bold, italic, links, bulleted and
     numbered lists, inside a Text block, with keyboard shortcuts and a
     small toolbar. It's the biggest gap for writing real content today.
     Saved as structured text, never raw HTML; links go through `safeUrl`.
     Existing Text blocks keep working (a migration turns plain text into
     the new format). Free editor only: Lexical (MIT), as the spec planned,
     or the free part of Puck's own rich text field, whichever fits better
     with the canvas; logged here when chosen. Design snapshot first.
  2. **Custom domain for the live site.** A step-by-step guide plus a Site
     settings field, so the site, sitemap, sharing links and RSS use the
     owner's address. Buying a domain costs money and is the owner's step
     (BLOCKED.md); connecting it in Cloudflare is free.
  3. **Linked sections.** A section (for example a contact strip or a
     call-to-action) saved once and shown on many pages; edit it once and
     every page updates. Needs a page-format change (migration and an entry
     here). Templates need this: a template's shared sections must stay in
     step across its pages. Design snapshot first.
  4. **Layouts for the new blocks.** FAQ, gallery, logo strip, features
     grid, testimonial and contact layouts in the Layout library, so the
     Milestone 2–3 blocks are one click away. Small; also a first taste of
     template content.
  5. **Builder tidy-up.** A Sign out item in the top bar; fix the 4 axe
     issues in Puck's builder chrome; bring a renamed page's redirect back
     when it's restored. Three small proposals above, grouped.
  6. **Fixes from the owner's review of Milestones 2–3.** A placeholder:
     whatever the review of F026–F039 turns up, added as rework items only
     when the owner asks (CLAUDE.md).
  Order: 5 and 4 first (small, quick wins), then 1, 3 and 2. Everything
  stays free with $0 running cost, except the domain itself. Rough size:
  similar to Milestone 3. Left out on purpose: gallery lightbox (still a
  proposal above), and anything for other users (that's M6).

## 2026-10-30 — F044 Custom domain (Claude, reversible)

- **Where:** Site settings → **Site address**, a new last group. It's a
  site-level setting rather than a style, but Site settings is where the
  owner already sets things once for the whole site, and it saves with
  the rest (one Save, one commit to `site.json`).
- **The field takes just the domain** (`studio.com`), with `https://`
  shown in front. Whatever is typed ("https://Studio.com/") is tidied to
  `https://studio.com`. A page address after it, a port or `http://` is
  refused with a plain explanation, because the site lives at the
  domain's root and Cloudflare gives https for free. Empty means "use the
  free address" and stores the existing placeholder
  (`https://example.pages.dev`), so `site.json`'s shape doesn't change and
  no migration is needed. Saving now also refuses a malformed `baseUrl`
  on the server (same rule).
- **Publishing never points at a domain that doesn't answer yet.** Before
  rendering, the publish workflow asks Cloudflare for the Pages project's
  custom domains (the token's existing Pages permission is enough). The
  owner's domain is used only when Cloudflare reports it **active**;
  otherwise the publish uses the free address and says why
  (`scripts/site-address.mjs`). Why: a canonical link or sitemap pointing
  at a dead domain hurts search results, and the "Check the live site"
  step would fail the publish. Heuristic: error prevention (Nielsen #5)
  instead of an error message after the fact.
- **The Publish panel explains the gap.** The workflow adds a step named
  "Not connected yet <domain>" (read the same way as F017's "Live at"
  step), and the panel says "studio.com isn't connected to your site yet,
  so the last publish used crust-site.pages.dev…". If the address was
  just changed and not published yet, it says "Publish to start using it."
  Visibility of system status (Nielsen #1).
- **Connecting the domain stays a dashboard step** (the guide), not
  automated by the workflow. Adding a root domain through the API depends
  on how the domain's DNS is set up, and it's a one-time task; the guide
  is safer than a workflow that half-succeeds.
- **The guide link** opens `docs/setup-custom-domain.md` on GitHub.
- **Contact form:** its Worker accepts one site address
  (`CONTACT_SITE_ORIGIN`). The guide tells the owner to update it and
  Turnstile's hostnames. Not changed in code (F037 is finished).
- **Proposal (not built):** let the contact Worker accept both the free
  address and the custom domain automatically, so step 5 of the guide
  goes away.

## 2026-10-30 — F040 Builder tidy-up (Claude, reversible)

- **Sign out** is a plain link to `/cdn-cgi/access/logout` in the top bar
  of both builders (pages and posts), after Site settings and before
  Publish / Save draft, so the save action stays last. No "are you
  sure?": every edit is already kept in the browser as you type, so
  signing out loses nothing. On a preview link it signs you out of that
  link's Access app. **On the Pages screen too** (owner's request on the
  PR, 2026-10-30): after Site settings, before New page.
- **Pages screen on phones:** with four buttons each label wrapped onto
  two lines. Now whole buttons wrap instead (Posts, Site settings, Sign
  out on one row; New page full width below), labels on one line. Same
  rule for the Posts and Site settings headers, which still fit one row.
- **Top bar layout:** a seventh button made every label wrap onto two
  lines at 1440 px. Puck splits the bar into three equal-ish parts (panel
  toggles | title | buttons), so the buttons only got the right half.
  Now it's toggles | title (left-aligned, after the toggles) | buttons,
  the way Figma and Webflow lay it out, and labels stay on one line from
  1100 px. Below 1100 px they wrap as before, and at around 1024 px the
  page title is hidden for lack of room (it's still the browser tab's
  title). Phones get Quick edit, not this bar.
- **Puck's chrome:** we label Puck's own elements as they appear, rather
  than replacing Puck's components, so a Puck update can't silently
  undo the fix and names Puck adds itself are kept.
  - The canvas is named "Page preview", the zoom menu "Zoom".
  - The spinner becomes an indeterminate progress bar named "Loading the
    preview" (a `span` can't carry a label without a role).
  - The "Layout"/"Content" headings use the admin's muted grey #52525b
    (7.7:1 on white) instead of Puck's #767676.
- **New check:** `npm run check:builder` runs axe on the page and post
  builders (1440 px, after the canvas loads) and is part of
  `check:a11y`, so CI now builds the admin before that step. 3 minor
  best-practice notes remain (no `main` landmark or `h1` in Puck's
  layout); they don't block, as on published pages.
- **Redirects on restore:** restoring reads `redirects.json` as it was
  just before the deletion and brings back the redirects that pointed to
  the page, in the same commit. Skipped: an old address that is a page
  again, or that now redirects somewhere else (the newer choice wins). A
  redirect *from* the restored address is removed, so the page itself
  shows. The commit message names the addresses that came back. This
  replaces F019's "not restored" note.

## 2026-10-30 — F039 Site search (Claude's recommendations; owner: "go with all your recommendations")

- **Pagefind** (MIT, free) builds the search index when you publish,
  right after crust-publish; the index is static files in `/pagefind/`.
  No server, $0.
- **A search page at `/search/`**: a labelled search box (`role=search`)
  and a results list, in the site's own style. Results show the page
  title as a link and a short excerpt with the words found highlighted;
  the number of results is announced to screen readers. The address
  carries the words (`/search/?q=bread`), so Back works and searches can
  be shared. Our own small script instead of Pagefind's ready-made
  widget, so the markup, headings and focus match the rest of the site.
- **A "Search" link in the header** is optional: Site settings → Header &
  menu → "Show a Search link". Off for existing sites.
- **What's searchable:** every page's main content and every blog post.
  Not the header, footer, 404, the blog list (it repeats the posts) or
  pages hidden from search engines (F036). The search page itself is
  hidden from search engines too.
- **Search needs JavaScript in the visitor's browser** (Pagefind runs
  there). Without it, the page says so and points to the menu.
- **`/search` is reserved**, like `/blog`: pages can't use it.

## 2026-10-30 — F038 Phone quick edit (Claude's recommendations; owner: "go with all your recommendations")

- **Opens by itself on a phone** (screens up to 760 px wide): tapping a
  page opens Quick edit instead of the full builder. "Full builder" (top
  right) switches over; on a computer, the builder's new "Quick edit"
  link opens it too. No design snapshot was made: it's a plain form in
  the admin's existing style, built phone-first.
- **What can be changed:** page title and description, then every
  heading, text, button label, card, quote, image overlay, FAQ question
  and answer, icon-list line, and photo (Image, Card, Gallery, Logo row,
  Grid cards, section backgrounds), in the order they appear on the
  page. Photos use the media library picker (F034), so a new photo
  brings its alt text. Nothing can be moved, added or removed: that's
  the full builder's job.
- **Numbered parts:** each block is a card with a number ("3 · Heading").
  Screen readers hear the number with each field ("Heading, part 3"), so
  two headings never sound the same.
- **Save** keeps the page in the browser as you type (like the builder)
  and saves to GitHub; **Save and publish** saves, then starts the
  publish. Publish only starts if the save worked. Both are in a bar at
  the bottom, within thumb reach; fields use 16 px text so iPhones don't
  zoom in; every control is at least 44 px tall.
- **Posts** still open in the full builder on a phone for now.

## 2026-10-30 — F037 Contact form (Claude's recommendations; owner: "go with all your recommendations")

- **A "Contact form" block** in a new **Forms** group: Name, Email and
  Message are always there (labels editable); up to 6 extra fields
  (short text, phone number or long text, each required or optional);
  button label and thank-you message. Put a Heading above it for the
  title, like other blocks.
- **Works without JavaScript** (except the spam check): it's a plain
  HTML form with real labels, `autocomplete`, `required` and the
  browser's own error messages. After sending, the Worker sends the
  visitor back to the same page with `#…-sent` or `#…-error`; CSS shows
  the thank-you (in place of the form) or the error (above the form),
  and the browser moves focus there, so screen readers read it.
- **Spam:** Cloudflare Turnstile (free, "Managed" mode, usually no
  puzzle) plus a hidden trap field robots fill in; robots that fill it
  see the thank-you, and nothing is sent. Lengths and the email address
  are checked again in the Worker.
- **Email:** Resend's free plan (3,000 a month). Its shared sender can
  mail the account owner's own address with no domain, which suits a
  site on pages.dev. The visitor's address is the Reply-To, so "Reply"
  answers them. (MailChannels' free Workers sending ended in 2024;
  Cloudflare Email Routing needs a domain on Cloudflare.)
- **The Worker** lives in `packages/contact` and is installed by its own
  workflow (`contact-worker.yml`) from GitHub secrets; it only accepts
  posts from the site and only sends visitors back to it. Until the
  setup is done (BLOCKED.md), published forms say "This form isn't
  connected yet" and are disabled, so visitors never lose a message.
- **The form's address and Turnstile site key** are repository
  variables read at publish time, not page content: they're the same for
  every form and change only with the setup. No page format change.
- **Turnstile's script loads only on pages with a form.**

## 2026-10-30 — F036 Search and sharing settings (Claude's recommendations; owner: "go with all your recommendations")

- **Where:** in the page settings panel (shown when no block is
  selected; "Fields" on a phone), under Page title and Description:
  Search title, Social image (with the media library picker and its alt
  text), "Hide from search engines", and two live previews: a search
  result and a shared-link card. No design snapshot: these are form
  fields in the existing panel, with previews modelled on what Google
  and chat apps show.
- **Search title replaces the whole `<title>`** ("Page | Site" by
  default) and the shared title. A counter shows the length and warns
  past about 60 characters, but nothing is blocked below 120: the owner
  decides.
- **Every published page now gets** a canonical address, Open Graph tags
  (type, site name, title, description, address, image and its alt
  text) and a Twitter card (large image when there's a social image).
  Addresses use the live site address from the publish workflow.
- **Social image:** any image field value; library photos use their
  1440 px copy (good for link previews, still small). The image needs
  alt text, checked on save. Posts use their cover automatically and are
  marked as articles; posts don't have the extra fields yet.
- **"Hide from search engines"** adds `<meta name="robots"
  content="noindex">` and leaves the page out of sitemap.xml. The page
  is still published and links to it keep working.
- **Format:** optional `seo` in a page file (`docs/spec.md`). It's only
  written when something is set, so existing pages are unchanged: no
  migration.

## 2026-10-30 — F035 Blog and collections (Claude's recommendations; owner: "go with all your recommendations")

- **Where:** a **Posts** screen next to Pages (link in the Pages and Posts
  headers). It lists posts newest first, with "New post" (title, address
  made from the title, date defaulting to today) and the blog page's
  title and intro. Delete asks first, in place. No design snapshot was
  made: it reuses the Pages screen's look and the builder as it is.
- **Writing a post is the builder you know.** The same blocks and
  layouts; the post's details (title, summary, date, cover photo with
  alt text) are in the page settings panel, and the canvas shows the top
  of the post (blog name, date, title, summary, cover) exactly as
  published. Drafts are kept in the browser while you type, like pages.
- **Addresses:** posts are at `/blog/<address>/`, the list at `/blog/`,
  the feed at `/blog/feed.xml` (RSS 2.0, newest 20). Pages can no
  longer use `/blog` or anything under it (the New page and Rename
  checks, saving, and the renderer all refuse it). A post's address
  can't be changed yet; delete and recreate instead.
- **Only one collection, "Blog".** Its list page title is editable (e.g.
  "News", "Work"), so it can serve as a portfolio. Several collections
  can come later without changing post files.
- **The blog only appears once there's a post**, and isn't added to the
  menu automatically: add a "/blog" link in Site settings → Header &
  menu. Why: the menu is yours once edited (F031), and an empty blog
  page would look unfinished.
- **The list page:** a grid of cards (cover, title as a link, date,
  summary). The cover there has empty alt text, because the linked
  title right next to it already names the post. On the post itself the
  cover's alt text is required.
- **Dates** are shown in the site's language (`en` → "October 30, 2026",
  `id` → "30 Oktober 2026"). There are no scheduled or hidden posts:
  like pages, a saved post goes live with the next Publish.
- **Format:** `content/posts/<slug>.json` and `content/blog.json` are new
  files (see `docs/spec.md`). Pages are unchanged, so no migration.
- **Known gap:** "What changes when you publish" (F016) lists pages only;
  posts still go live with Publish.

## 2026-10-30 — F034 Media library (owner: "go with all your recommendations")

- **Direction A:** every image field gets "Choose image", which opens a
  large picker dialog with upload, search, a grid and a details pane
  (alt text required, file info, where the photo is used).
- **Storage 1:** uploaded photos live in the GitHub repo next to the pages
  (`content/media/`), saved through the same Pages Function and token as
  pages. No new accounts, $0, every upload in the Git history. Big photos
  are shrunk to 2400 px in the browser before upload; about 1 GB of
  photos fits. Can move to Cloudflare R2 later without changing the UI.
- **Published images:** resized copies (480–2400 px) with `srcset`.

### Built (2026-10-30, Claude's recommendations; owner: "go with all your recommendations")

- **Where the picker is:** every image field (Image, Card, Section
  background, Image overlay, Quote photo, and the photos/cards/logos in
  Gallery, Grid of cards and Logo row), the section toolbar's Image
  button, and the header logo in Site settings. Each shows the photo, its
  size, "Choose image" / "Change image", "Remove" and a folded "Use a web
  address instead", so pasted addresses keep working.
- **Alt text lives in the library and is copied into the block.** The
  library keeps one description per photo (required before "Use this
  photo"); picking a photo fills the block's own alt field, which can
  still be changed for that one use. Why: most photos mean the same thing
  wherever they're used, but a block-level override keeps WCAG 1.1.1
  context-specific when needed. Changing the library text later doesn't
  rewrite blocks that already use the photo.
- **Keyboard:** the grid is one Tab stop; arrow keys, Home and End move
  between photos (radio-group pattern), Enter uses the selected one.
  Escape or Close returns focus to the button that opened the dialog.
  Upload has a button; dropping files is only a shortcut.
- **After an upload** the new photo is selected and focus goes to its
  alt text box ("alt text asked for right away"). Several files can be
  uploaded at once; each failure is listed by name.
- **Formats:** JPG, PNG and WebP, up to 20 MB before shrinking. **SVG is
  refused**: an SVG can carry scripts, and the published site would serve
  it from its own address. **HEIC** (iPhone) is refused with a tip
  (Settings > Camera > Formats > Most Compatible), because only Safari can
  show it.
- **Every upload is redrawn in the browser** (shrunk to 2400 px when
  bigger, JPG quality 86): the photo is turned the right way up and
  hidden details such as where a phone photo was taken are left out.
  WebP becomes JPG (Safari can't write WebP); PNG stays PNG to keep
  transparency, and a small PNG is sent untouched.
- **The server never trusts the browser**: the type and pixel size are
  read from the file's first bytes; anything else is refused. Files are
  named from the original name (`img-2041.jpg`), never overwritten
  (`-2`), and limited to 8 MB after shrinking. Photos and `media.json`
  change in one commit.
- **Deleting** is in the details pane, after a confirmation, and only
  for photos no page or the header uses ("Used on" lists them). Saved
  layouts aren't counted: they're copies, and a publish with a missing
  photo stops with its name.
- **Resized copies:** 480, 960 and 1440 px wide (only those smaller than
  the photo), plus the photo itself as the largest, in the same format.
  Made by crust-publish at publish time (not stored in GitHub). Published
  `<img>` tags get `width`/`height` (no layout jumps) and `sizes` per
  block (full width, a third for Gallery and Grid, small for logos). No
  WebP conversion yet: the free Rust encoder only writes lossless WebP,
  which is bigger than JPG for photos.
- **The builder shows library photos** at the same address pages use
  (`/media/<file>`), served from GitHub by a Pages Function behind
  Cloudflare Access, so the preview matches the published page.
- **Publish check:** a page that shows a library photo that isn't there
  stops the publish, naming the photo and page.

## 2026-10-29 — F033 Theme pack export and import (Claude's recommendation, owner-approved overnight)

- **Where:** a "Theme pack" group at the end of Site settings, with two
  parts: "Download this site's look" and "Bring in a theme pack".
- **What a pack holds** (each part can be left out): the style (all
  design tokens: colours, fonts, spacing, section styles, buttons, cards,
  links), the header and footer *look* (their section styles and the
  sticky option, never the menu, links or text, which belong to one
  site), and My layouts. File: `<name>.crust`, plain JSON
  (`docs/spec.md`).
- **Exports what the preview shows**, including unsaved changes, so what
  you see is what you share. Refused while a field is invalid.
- **Import is checked before anything changes.** The whole file is
  refused, with every reason listed, if it isn't a pack, is from a newer
  Crust, is over 2 MB, has damaged or unsafe values (the same checks as
  saving), or a layout with blocks this Crust doesn't know or choice
  values a block doesn't offer (e.g. a heading level of "script"). Unknown
  fields are dropped, not copied. A style with any colour pair below 4.5:1
  or an unreadable section style is left out (with the reasons shown) and
  the rest of the pack can still be used: stricter than Site settings,
  which saves such a style with a warning, because the file comes from
  elsewhere.
- **Published pages only use known tag names and spacing values** (a
  heading level outside H1–H4 becomes H2/H3; an unknown spacing step
  becomes none), whatever a page file says. Found by a code review of
  F031–F033 (2026-10-30), with the fixes in F031: an untouched header or
  footer isn't written to site.json, so the menu keeps following the
  pages; header button and logo addresses get the safe-address check; a
  "$" in the site name no longer breaks the copyright line.
- **Preview first:** a good pack shows in the live preview (only while
  the Theme pack group is open), with its colours listed. Tick which
  parts to use. "Use this theme" puts the style and header/footer look
  into the unsaved draft (Save keeps it, Discard undoes it); layouts are
  added to My layouts right away, renamed "FAQ (2)" when a name is taken,
  so nothing of yours is replaced. Cancel changes nothing.
- **Also fixed:** the F031 Header & menu and Footer groups had no styles
  (their CSS was never written); fixed on the F031 branch and merged
  forward.

## 2026-10-29 — F032 More elements (Claude's recommendation, owner-approved overnight)

- **Seven new blocks**, in the block list under Layout (Grid of cards),
  Content (Icon list, Quote, Accordion / FAQ) and a new **Media** group
  (Gallery, Image overlay, Logo row). New block types only add to the page
  format; old pages are unchanged, so no migration.
- **Repeating items** (cards, photos, questions, lines, logos) are edited
  in a list in the settings panel with Move up / Move down / Remove
  buttons, an "Add a …" button and announcements, instead of Puck's own
  list, which can only be reordered by dragging (keyboard rule). Each item
  folds open to edit; a new one opens with its sample text selected.
  Limits: 12 cards, 24 photos, 20 questions, 20 lines, 12 logos.
- **No JavaScript on the site:** the accordion is `<details>`; "Only one
  open at a time" uses the browser's own grouping (`name`), which older
  browsers ignore by letting several stay open (harmless). No lightbox
  for the gallery: it would need JavaScript (could come later as an
  opt-in).
- **Accessibility:** lists are real lists (`role="list"` so Safari keeps
  them); photos and logos need alt text like the Image block (publishing
  flags any without); a quote's photo is decoration because the name sits
  next to it; icons are hidden from screen readers; the accordion's
  headers are 44px tall; card and overlay titles pick their heading level.
- **Image overlay** uses a section style for its text and the same tint as
  section background photos, so text stays readable on any photo (the
  tint is raised automatically when a style needs it). Default: Dark.
- **Grid of cards** uses the Card look (and the Card style option from
  F028); it stacks on phones and shows 2 per row on tablets.
- **Renaming a page** also updates links inside Grid cards, Logo rows and
  Image overlays.
- **Checked:** a sample page with every new block on every section style
  is rendered with all 9 presets in the accessibility check.

## 2026-10-29 — F031 Header, footer and menu (Claude's recommendation, owner-approved overnight)

- **Where it's edited:** two new groups in Site settings, "Header & menu"
  and "Footer", next to Section styles, using the same preview. Saved in
  `site.json` as `header` and `footer` with the tokens (one Save).
- **Older sites:** no `header`/`footer` → defaults: the site name as the
  logo, a menu of up to 6 pages (Home first), no button, not sticky, and
  a "© {year} {name}" footer. Missing fields are filled in, so nothing
  breaks. Turn either off with one checkbox.
- **Phone menu without JavaScript:** a `<details>` "Menu" button below
  768px; the desktop menu is hidden there (and vice versa), so screen
  readers only meet one "Main" navigation at a time. 44px tap target.
- **Accessibility:** "Skip to content" link first on every page; `<main>`
  is its target; the menu marks the current page (`aria-current`); a
  sticky header adds scroll room so focused things aren't hidden under it
  (WCAG 2.4.11); footer columns are labelled navigations with an `h2`
  title (fits the heading order, after the page content).
- **Menus are edited with buttons:** Move up / Move down / Remove per link,
  plus "Add page" from your pages, so no dragging is needed. Limits: 8
  menu links, 4 footer columns of 8 links.
- **Checks:** a logo image needs alt text; every link needs a label and an
  address Crust can link to (no `javascript:`). Checked in the browser
  and again when saving to GitHub.
- **Look:** header and footer pick one of the four section styles (default
  Page and Muted), so they follow your colours and contrast checks.
- **In the builder** the header and footer show on the canvas, labelled
  "edit in Site settings" and not clickable or focusable (`inert`), so the
  page reads as it will look without getting in the way of editing.

## 2026-10-29 — F030 Content, Style and Advanced tabs (Claude's recommendation, owner-approved overnight)

- **No snapshot:** the owner asked Claude to go with its recommendations
  and not wait. The design follows the panel's existing look.
- **Where things go:** Content = words, links, images and counts; Style =
  alignment, tone, button look, section style/height/position/background
  image/tint, spacer size, column widths; Advanced = Show on, anchor
  name, section padding and column gap ("spacing"). Anything new defaults
  to Content.
- **How:** Puck's `resolveFields` returns the current tab's fields (slot
  fields always stay, the canvas needs them). Puck only recalculates
  fields when the block changes, so switching tabs re-saves the same
  props with `recordHistory: false`: no undo step, no visible change.
- **The switch is a radio group** ("Settings to show"), not ARIA tabs:
  the fields aren't inside one panel element Crust controls, so a
  tablist without tabpanels would announce something that isn't there.
  Arrow keys work like every other choice in the panel. The chosen tab
  stays when you select another block.
- **Empty tab:** says so ("Spacer has no content settings"); a Section's
  Content tab points to the canvas and the + buttons.
- **Anchor name (additive):** `anchor` on any block, cleaned to
  lowercase letters, numbers and dashes. Published as
  `<span class="cr-anchor" id="…">` right before the block inside the
  F029 wrapper (an element with `display: contents` can't be scrolled
  to). The field shows "#name" to use in links and warns when another
  block on the page has the same name. `scroll-margin-top` leaves room
  for F031's sticky header.

## 2026-10-29 — F029 Per-device columns (direction A, owner-approved recommendation)

- **All three devices at once:** the Columns panel shows a row of width
  tiles for Desktop, Tablet and Phone (no hidden "current device" mode).
  Each device name is a button that switches the canvas to that width.
- **Widths are fixed fractions** per column count: 2 columns (1/2+1/2,
  2/3+1/3, 1/3+2/3, 3/4+1/4, 1/4+3/4, stacked), 3 (equal, one wide
  column in each position, "2, then 1", stacked), 4 (equal, 2+2, stacked).
  A choice that no longer fits after changing the count falls back to
  the default for that device.
- **Format (additive):** Columns `widths?: { desktop, tablet, phone }`;
  any block `hideOn?: ("desktop"|"tablet"|"phone")[]`. Columns without
  `widths` get no new classes and blocks without `hideOn` no wrapper, so
  old pages produce identical HTML. Once any width is set, all three
  devices are written (defaults fill the gaps) so the CSS order is
  always phone → tablet → desktop.
- **CSS, no JavaScript:** the rules are generated from `responsiveCss()`
  into styles.css (`npm run gen:responsive-css`); a test fails if they
  drift. Breakpoints stay 640 and 1024 px.
- **Hiding:** a hidden block sits in `<div class="cr-show cr-hide-…">`
  with `display: contents` (no layout change), and `display: none` within
  that device's exact range, so it's also gone for screen readers there.
  In the builder the admin CSS shows it faded, striped and labelled
  ("Hidden on phone") on that device so it can still be selected; the
  label attribute is only written while editing.
- **Known edge:** hiding the page's only h1 on a device leaves that device
  without a main heading. The publish check doesn't look per device yet.
- **"Show on" lives in each block's panel for now;** F030 moves it into
  the Advanced tab.

## 2026-10-29 — F028 Style customizer v2 (owner: "go with all your recommendations")

- **Direction A** from `design/f028-style-customizer-v1.html`: Site
  settings show one group at a time (Presets, Colours, Typography,
  Buttons, Cards, Links, Section styles, Spacing, Shape & layout) beside
  the live preview. Hidden groups stay in the page (`hidden`), so a
  half-typed value isn't lost and Save still sees fields marked in red;
  Save opens the group with the first one, and the list marks it "(fix)".
- **Preview clicks:** a button opens Buttons, a card Cards, a card link
  Links, a heading Typography. While Colours is open, a click still finds
  the colour (F014).
- **"Main button" (owner said OK to the proposal):** it edits the Page and
  Muted section styles' button look together; Primary and Dark keep their
  own (Inverse by default). "Soft" is a new section-style look: a 14% tint
  of the brand colour, with its label falling back to the text colour if
  the brand colour wouldn't read on it. If Page and Muted differ, no
  choice is selected and a note says so; the first option keeps the Tab
  stop (fixed in the shared RadioGroup).
- **Format (additive, no migration):** `tokens.style` with `typeScale`
  (subtle/balanced/bold/dramatic), `headingWeight` (500–800),
  `headingTracking` (tight/snug/normal/wide), `buttonShape`
  (square/rounded/pill), `cardStyle` (flat/outline/shadow), `linkStyle`
  (underline/thick/highlight). Defaults reproduce the old look exactly
  ("Balanced" = the old h1–h4 sizes, "Snug" = the old letter spacing), and
  a site without `style` gets no extra CSS at all.
- **Links stay underlined** in every style (WCAG 1.4.1).
- **Presets** now set colours, fonts, style options and the main button
  (spacing, corners and width stay). 9 presets: Crust, Ink, Forest,
  Sunset, Mono + Ocean, Studio, Paper, Night. Every one passes all colour
  pairs, every section style stays readable, and every button look reads
  in every section style (tested). Undo preset restores all of it.
- **Night** is a dark site; its "Dark" section style is therefore light
  (it uses the text colour). Readable, but the name is odd there; worth a
  look when the owner reviews.

## 2026-10-29 — F027 My layouts (direction A, chosen by Claude; owner can switch)

- **Who chose:** the owner went to bed and asked Claude to continue
  without him. Claude built its recommended direction **A** from
  `design/f027-my-layouts-v1.html` on the draft PR, so the owner can
  still ask for B or C before it merges. Nothing was merged or published.
- **Saving:** "Save as layout" on the selected section's toolbar (name
  starts as the section's heading); "Save this page as a layout" at the
  top of the gallery's My layouts tab (name starts as the page title).
- **Finding:** a third switch in the gallery, "My layouts (n)", with
  search; Rename and Delete behind each card's "More" button (a simple
  show/hide, not a menu widget, so Tab works as usual). Delete asks first
  and says pages keep their copy. Escape closes the menu or form only.
- **Copies, not links:** inserting gives every block new ids; renaming or
  deleting a layout never touches pages. (Linked "global sections" would
  be a separate feature; see Proposals.)
- **Format (additive, no migration):** `content/layouts/<id>.json`
  `{ id, name, kind: "section"|"page", savedAt, content }`. The id comes
  from the name ("Studio intro" → `studio-intro`, then `-2`…) and never
  changes, so a rename is one small commit. Only the builder reads these;
  the publish step only reads `content/pages/`.
- **API:** `GET /api/layouts` lists; `POST /api/layouts` with
  `action: save | rename | delete`. Same gate as every other endpoint
  (Access sign-in, admin-only header, same origin). The server checks the
  name, the kind and that content is real blocks.
- **Without GitHub:** layouts are kept in this browser (localStorage), and
  the gallery says where they're kept. With GitHub on, a failed save keeps
  the form open with the reason; nothing is silently kept only locally.
- **Colour:** teal (#0f766e) marks "yours" (save button, saved cards),
  separate from blue (add/selected) and orange (whole site).

## 2026-10-29 — F026 Layout library (owner chose direction B)

- **Direction B** from `design/f026-layout-library-v1.html`: a big gallery
  dialog opened from a "+" between top-level sections, with a
  Sections / Whole pages switch, categories on the left, and search.
- **The "+" buttons are pointer shortcuts** (out of the tab order, hidden
  from screen readers, with a tooltip). Keyboard and screen-reader users
  get the **Layouts** button in the top bar, which adds after the selected
  section (or at the end), and the gallery says where before you pick
  ("Adds between “Welcome” and “About us”"). Reason: the "+" buttons live
  at the end of the canvas document, so in the tab order they'd come
  after every block, far from the spot they add to.
- **An empty page shows a real "Add a layout" button** in the canvas: on a
  blank page the library is the obvious first step.
- **Thumbnails are the publish renderer's HTML** scaled down, styled by
  the site's current (even unsaved) tokens, so they match what gets
  published. They're `inert` and `aria-hidden`: pictures, not content.
- **One undo step:** inserting dispatches Puck `setData` with
  `recordHistory: true` (Puck leaves `setData` out of history otherwise).
  The first inserted section is selected and focused, and the result is
  announced.
- **Headings:** a layout's h1 becomes h2 when the page already has one
  (`fitHeadings`). Known edge: inserting a hero *above* the page's h1
  leaves the new heading an h2 above the h1; the publish check names it.
  Not rewriting the owner's existing heading was the safer default.
- **The gallery remembers its tab and category** between openings, and
  clears the search each time.
- No change to the page JSON format: layouts are ordinary blocks.

## 2026-10-29 — F025 Section styles (owner chose "A + C's toolbar", plus site-wide editing)

- **Direction:** the visual side panel (A) plus the on-canvas toolbar (C),
  from snapshots `design/f025-section-styles-v1.html` and `-v2.html`.
- **Two scopes, one toolbar:** "This section" (blue) changes the selected
  section; "Whole site" (orange) edits the style itself, like YOOtheme's
  global style settings. Affected count is shown before any change. The
  side panel's "Edit everywhere" and Site settings → Section styles edit
  the same thing. Whole-site edits change the same draft as Site
  settings and are saved with "Save site style" (or Save in Site settings).
- **Format (additive, no migration needed):**
  - `site.json` tokens get optional `sectionStyles`
    (`{ background|surface|primary|dark: { bg, button } }`); `bg` is a
    colour role or a hex colour, `button` is solid, outline or inverse.
    Sites without it use defaults that match the old look.
  - Section `background` keeps its name and values and gains `"dark"`;
    new optional props `height`, `valign`, `imageSrc`, `tint`. Pages
    saved before F025 render exactly as before (auto height, no image).
  - Published HTML: sections use `cr-style-<id>` instead of `cr-bg-<id>`
    (cards keep `cr-bg-…`).
- **Text colour picks itself:** the token colour with the best contrast on
  the style's background. Links and muted text fall back to the text
  colour when they'd fail AA. A solid button that wouldn't stand out (under
  3:1) shows inverse.
- **Background images are decoration** (`alt=""`), with a tint in the
  style's background. Contrast is checked against the worst case (a pure
  black or white pixel anywhere in the photo); a tint that's too faint is
  raised in the CSS and the editor says so, with a one-click fix. Never
  blocks publishing.
- **Labels:** the styles are shown as Page, Muted, Primary, Dark. "Muted"
  is the old "Surface" section.

## 2026-10-29 — Milestone 2: YOOtheme-style building (owner-approved)

- **The owner approved all three steps** after the visual explainer
  (`design/m2-yootheme-vision.html`): F025–F033, spec in
  `docs/milestone-2.md`. Claude wrote them into features.json on his
  "approve 1 2 3".
- **Direction:** YOOtheme's way of building (Section → Row → Column →
  Element, layout library, deep style customizer) on Crust's engine
  (static, accessible, free). Layouts and theme packs are Crust JSON only,
  so "bring your own template" means a Crust theme pack, not an HTML
  import.
- **Left out for now:** slider/carousel (hard to make accessible; later
  proposal), blog/collection templates, HTML template import.
- **Order:** step 1 first (biggest visual gain), visual features start
  with a design snapshot for the owner to choose from.

## 2026-10-29 — First real setup and publish (Claude, reversible)

- **Two Access applications, not one.** Pages' "Restrict previews" creates
  an Access app locked to `*.crust-admin.pages.dev`; it can't take a second
  hostname. The owner made a separate app, `crust-admin.pages.dev`, policy
  "Only me" (his email, one-time PIN). `ACCESS_AUD` is that app's tag, so
  saving works only from the main address; preview links are private but
  read-only, which is the safer default.
- **A "Page not found" page (404.html) on every publish.** Without it,
  Cloudflare Pages answers every unknown address (including deleted pages)
  with the home page and status 200: misleading for visitors and search
  engines. The renderer now writes 404.html (one h1, link home, site
  tokens); it stays out of the sitemap and is now in the axe check.

## 2026-10-29 — F021–F024 (owner-approved proposals; details Claude, reversible)

**F021: one status per page**
- **The rule:** the most urgent status wins.
  1. Only in this browser
  2. Changes not saved
  3. Saved, not live yet / Edits not live yet
  4. Live
- **"Live" is shown only when the last publish is known;** otherwise it says "Saved". Before GitHub is on: "Built into the app" or "Only in this browser".
- **The status is a column right after the title,** with a small dot. The words carry the meaning:
  - filled green: live
  - amber ring: not live yet
  - grey ring: only in the browser / not saved
  - filled grey: saved
- **A new token, `--st-pending` (#b54708),** colours the amber ring. The badges and the long note above the list are gone.

**F022: Publish saves drafts first**
- **Drafts are listed and counted** in the Publish panel as "changes in this browser, saved when you publish".
- **Publishing asks once:** "Save N pages first?" with Save and publish (focused) / Publish without them / Cancel.
  - A modal is earned here: it's a decision before a production action.
- **Drafts are saved one by one.** The first failure stops everything with its reason, and nothing is published.
- **The row's "Save to GitHub" (F020) stays** for saving without publishing.

**F023: find and sort**
- **Appears from 6 pages.** A shorter list doesn't need it.
- **Find:** every typed word must appear in the title or address, ignoring case and accents. The match count is announced, and no matches offers "Clear search".
- **Sort:** newest edit (default; undated pages last) or address (Home first). The choice is remembered in this browser only, as a per-viewer convenience.

**F024: Publish shortcut**
- **"Publish (N)" in the builder and Site settings top bars.** Screen readers hear "Publish, N changes waiting".
- **It opens the page list with focus on the Publish panel** (`#/?focus=publish`); it doesn't publish from there.
  - Publishing from the builder would skip the list of what's waiting, which is the point of the panel.
- **Not on the page list itself,** because the Publish panel is already at its top (Impeccable fix).
- **The count includes unsaved browser drafts.** It's shown only after a first publish and only while GitHub is on, and it refreshes on every screen change.

**Deploy check (preview.yml)**
- **Fixed:** a fresh deploy failed once because `/api/status` answered 404 for a few seconds. The check now retries both the page and the API.
- **Once Access is on,** a redirect to `*.cloudflareaccess.com` counts as "deployed and private". Without this, every deploy would fail.

## 2026-10-29 — Impeccable review of the Pages screen (owner asked: "let Impeccable check it, fix it and move forward")

- **How it was checked:** two separate reviewers. One did a design review (Nielsen score 24/40). The other ran the Impeccable detector and checked the screen in a browser with axe.
  - The detector found nothing in the code and one advisory in the page.
  - axe found 0 violations in 7 states.
  - One real WCAG failure.
  - Snapshot: `.impeccable/critique/`.
- **Fixed:**
  - **Focus hidden under the sticky header** on desktop (WCAG 2.4.11): `scroll-padding-top: 80px` from 900 px up, so the Site settings screen gets the fix too.
  - **The Publish panel comes first.** "What's live" and the Publish button are this screen's main question and action, especially on a phone.
  - **The Publish button says what it will do:**
    - "Publish 3 changes" when changes are waiting
    - "Publish site" before the first publish
    - "Publish again" (secondary style) when everything is live; still allowed, so you can re-run after a failure
  - **Long lists of waiting changes** show the first 6, then "Show all N".
  - **A failure to start publishing is now an alert,** styled as a warning, and says nothing changed on the live site. Only the run's status word is a live region.
  - **When the list can't load:** a "Try again" button, and the note no longer claims it's showing pages from GitHub.
  - **Links** use the admin's text colour instead of browser blue. The danger hover colour is now a token.
  - **Dates** stay on one line on desktop. Page-title links are 44 px tall on phones.
  - **The disclosure arrow** is a drawn SVG chevron instead of a "▸" character.
  - **Home's missing actions are explained:** "Always at /".
  - **New page keeps what you typed** when you close and reopen it, and focus returns to the button after Cancel.
  - **Confirmations disappear after 10 seconds.**
  - **Copy:** the rename dialog is titled "New address for “…”" (shorter on phones). The delete dialog points to "Recently deleted" instead of GitHub history.
  - **The "off" note** names the setup guide.
- **Not changed, proposed above instead:** a status column instead of badges, Publish saving drafts itself, find/sort, a Publish shortcut in the header. These change how the product works, so they're your call.
  - **No Publish confirmation dialog.** The button now states its scope, and the list of changes sits right above it. A confirmation on every publish adds friction for a single owner.
- **Advisory left as is:** the detector's "flat type hierarchy". The 18 px h1 is the app-bar title shared with Site settings (owner-reviewed), not a page heading competing with section headings.

## 2026-10-29 — F020 save browser drafts from the list (Claude, reversible)

- **"Save to GitHub" appears in the actions column** of any page marked "Draft in this browser" (Home too), only while saving to GitHub is on. It sends the browser draft exactly as the builder's "Save draft" would, and the server checks it the same way.
- **After saving,** the badge and button disappear, focus goes to the "Pages" heading, and the result is announced.
- **If saving fails,** the reason shows in an alert above the list, and the draft stays in the browser.
- **Rename/Delete now share the row's action group** with Save, wrapping on narrow screens.

## 2026-10-29 — F019 restore deleted pages (Claude, reversible)

- **Where the list comes from:** recent commits under `content/pages` whose first line is the builder's own `Delete page /x from the builder`.
  - Only the newest deletion of each address is listed, and only if no page lives there now. At most 10 are shown.
  - Each page is read as it was in the commit before the deletion.
  - No new storage and no new token permission.
- **Restoring writes that version back** in one commit ("Restore page /x …").
  - The server only accepts a builder deletion it finds in the recent history.
  - It refuses if the address is taken.
- **Not restored:** redirects that pointed to the page. Deleting removed them, and the next rename can recreate them. Keeping restore simple felt right. *(Changed in F040: they now come back with the page.)*
- **No confirmation step.** Restoring is safe: nothing is overwritten, and you can delete the page again. I dropped "with confirmation" from the F019 description before building; the owner's approved option text didn't include it.
- **The section is collapsed by default** ("Recently deleted (2)"), because restoring is rare.
  - It's a disclosure button inside the `h2` (`aria-expanded`), not `<details>`/`<summary>`, so screen readers announce it as a heading.
  - It's hidden when nothing was deleted, and before GitHub is switched on.

## 2026-10-29 — F018 update links on rename (Claude, reversible)

- **Which links:** Button `href` and Card `linkHref`, anywhere in the block tree (inside Sections and Columns too).
  - Matched forms: `/about`, `/about/`, `/about#x` and `/about?x`. The trailing slash, anchor and query are kept.
  - Full addresses (`https://…`) and text that merely mentions the path are left alone. The redirect still covers outside links.
  - The page's own links to itself follow it too.
- **Shared code:** `relinkPage` lives in `packages/blocks/src/links.ts` (no React), so the server and the browser use the same rules.
- **One commit:** the rename, the redirect and every updated page go into a single commit. The commit message says how many links changed.
- **The rename dialog** asks `GET /api/links` once when it opens and names the pages it will update ("Home (2 links), Contact (1 link)"). The hint now says the redirect is for links *from other websites*.
- **Browser drafts of other pages are updated too,** so saving one later can't bring back an old link.

## 2026-10-28 — F017 live site link (Claude, reversible)

- **The bug:** "Open live site" pointed at `site.json`'s `baseUrl`, which is still the placeholder `https://example.pages.dev`. The publish workflow already ignores the placeholder and uses the Cloudflare Pages address, which can get a random suffix if `crust-site` is taken. So the admin couldn't know the real address.
- **The fix:** `publish.yml` ends with a step whose *name* is `Live at <address>`. `GET /api/publish` reads the last successful run's job steps and returns `liveUrl`.
  - Why a step name: it needs only the Actions read permission the GitHub token already has. Deployments or Checks permissions would have meant changing the owner's token steps.
  - Checked with a temporary CI step on PR #4 that GitHub reports the evaluated name ("Live at https://…") through the jobs API.
- **Accepted addresses:** only `https://` addresses from a step that succeeded.
- **The order the admin uses:**
  1. the address the last publish reported
  2. `site.json`'s `baseUrl`, if it's a real address
  3. nothing: the panel says the link appears after the first publish
- **Not done:** editing the site name and address in Site settings. Custom domains are outside Milestone 1, and the address now comes from the publish itself.

## 2026-10-28 — F015 rename/delete and F016 unpublished changes (owner-approved proposals; details Claude, reversible)

**Content contract: new optional file `content/redirects.json`** (F015)
- **Shape:** a list of `{ "from": "/old", "to": "/new" }`. Typed as `Redirect` in `packages/blocks/src/content.ts`, and added to `docs/spec.md`.
- **No migration needed.** The file is optional: a missing file means no redirects. Page and site JSON are unchanged.
- **Why a separate file, not a field in `site.json`:** Site settings saves the whole `site.json`, so a field there could be wiped by a settings save.

**Renaming**
- **One commit.** The server moves the page file, sets its new `path`, and updates `redirects.json` in a single commit through GitHub's Git data API. History never shows half a rename. It fails safely ("someone else changed this…") if the branch moved in between.
- **The old address always redirects (301) to the new one.** No checkbox: it's always safe, and it costs nothing.
- **No chains:** earlier redirects to the old address follow it to the new one.
- **The page wins:** if a page is later created at an old address, that redirect is skipped at publish (the log says so).
- **Home (`/`) can't be renamed or deleted.** Every site needs one.
- **Links inside other pages** (Button URLs) aren't rewritten. The redirect covers them.
- **Browser drafts move with the page,** so unsaved edits aren't lost.

**Deleting**
- **The page file is removed in one commit,** along with any redirects that pointed to it. Otherwise the publish check would stop on a redirect to nowhere.
- **No redirect for deleted pages:** links to them stop working, and the confirmation says so.
- **The page can be brought back** from Git history.

**Publishing redirects**
- **`crust-publish --redirects content/redirects.json`** writes Cloudflare Pages' `_redirects` file. Each old address is listed with and without a trailing slash.
- **Checks before writing:** a redirect to an address with no page stops the publish with a plain message.
- **New Rust dependency:** `serde`/`serde_json` (MIT OR Apache-2.0; pulls in `zmij`, MIT).

**Page list and dialogs**
- **Rename and Delete are visible text buttons on each row,** not hidden in a "⋯" menu. Two actions don't need a menu, and visible buttons are easier to find and to reach by keyboard.
- **Screen-reader names include the page:** "Rename About". This meets WCAG 2.5.3 (label in name).
- **Confirmation is a native modal `<dialog>`:** the browser traps focus inside and Esc closes it.
  - **Rename** starts with focus in the address field and explains the redirect.
  - **Delete** starts on "Keep page", the safe choice for destructive confirmations, and states the consequence (removed from GitHub now, from the live site at the next publish).
- **After a change,** focus goes to the "Pages" heading (the row may be gone) and the result is announced.
- **Before GitHub is switched on,** only pages that exist just in this browser can be renamed or deleted. The page-list note says the rest switches on with saving.

**F016: what isn't live yet**
- **"Live" means the commit of the last *successful* publish run.** The server compares it with the branch (one GitHub compare call) and reports:
  - new and edited pages
  - removed pages
  - pages moved by a rename, shown as "moved to /new" rather than "removed"
  - Site settings
  - redirects
- **Before the first publish,** every page counts as new.
- **Page list badges:** "Not published yet" and "Edited since publish".
  - Dashed outline, so they read as "pending" next to the solid "Draft in this browser" badge.
  - The words carry the meaning, not the style.
- **The Publish panel** lists what's waiting above the button, and refreshes by itself when a publish it watched finishes.
- **Publish stays enabled** even when nothing is waiting, so you can always re-publish (for example, after a failed run).

## 2026-10-28 — F007–F009 (Claude, reversible)

**F007 page list**
- **The admin now opens on Pages** (`#/`). The builder is `#/edit?path=/about`, and Site settings is `#/settings`.
- **Where a page loads from:** a draft in this browser, then GitHub (once switched on), then the copy bundled with the app. The list marks pages that have changes only in this browser.
- **Every edit is kept in the browser** as you go. Save draft sends the page to GitHub.
- **New page form:**
  - The address follows the title until you edit it ("About Us & Team" → `about-us-and-team`).
  - Messages are plain-language and appear under each field. Focus moves to the first problem.
  - New pages start with a Section holding an H1, so they pass the publish checks.
- **Title and description** are edited as Puck page fields ("Page title", "Description (shown in search results)"). They're moved back to the top of the page file on save, so the content contract is unchanged.
- **Not yet:** renaming a page's address and deleting pages. Proposed below.

**F008 publishing**
- **`publish.yml` only runs when started:** from the admin's "Publish site" button through `/api/publish`, or by hand on GitHub. Nothing goes live on push. Spec: "nothing goes live until I publish."
- **The site deploys to its own Pages project, `crust-site`.** The workflow creates the project on first run, using the same Cloudflare token as the admin preview.
- **The site address comes from `site.json`'s `baseUrl`** once it's a real address. While it's still the example placeholder, the Pages address is used. Sitemap and robots.txt use the same address.
- **Order of checks:** crust-publish checks (F002/F011) and the axe check (F009) run before deploying, so a page with a serious problem never goes live. After deploying, the workflow checks the live sitemap.
- **The Publish panel** shows the latest run in plain words ("Publishing…", "Live.", "Failed. Nothing changed on the live site."). While a run is going it refreshes every 10 seconds and links to the details on GitHub.

**F009 checks**
- **axe:** WCAG 2.2 A/AA plus best practices, on every published page at 1280 and 375 px. "Serious" or "critical" issues fail; minor ones are listed but don't block.
- **Lighthouse:** run on the Home page; performance must be 95 or more. The sample scores 100 / 100 / 100 (performance, accessibility, SEO) and 96 for best practices.
- **New CI job `site-checks`.** The publish workflow also runs axe before deploying.
- **Licence note for the owner:** `axe-core` is MPL-2.0, not one of the listed MIT/Apache/BSD/ISC licences. The feature names axe explicitly, and it's a dev-only checking tool that never ships with the site or admin, so I used it. If you'd rather not, the fallback is Lighthouse's own accessibility audit (Apache-2.0, built on the same axe rules). `lighthouse`, `chrome-launcher` and `playwright-core` are Apache-2.0.

## 2026-10-28 — F006 Save to GitHub (Claude, reversible)

**Built so it's safe before the owner's setup steps.** Every API endpoint:
- refuses with "not switched on yet" until Cloudflare Access and the GitHub token are configured;
- requires a valid Cloudflare Access sign-in (RS256 JWT checked against the team's keys, audience, issuer and expiry);
- refuses requests from other sites, by requiring a custom header (which forces a CORS preflight), JSON, and a matching Origin.

So even though the preview link is public today, the endpoint can't be used to write to the repo.

Other choices:
- **Content is checked again on the server**: page address, title, description, block data present, Site settings tokens via `validateTokens`, a 512 KB limit. The browser isn't trusted.
- **One commit per save** to `main` through the GitHub contents API, with a readable message ("Save page /about ("About us") from the builder") and the signed-in email. Git history is the undo history (spec). This is the product's designed content path; the "main only through PRs" rule is about code changes.
- **Page files:** `/` → `content/pages/index.json`, `/blog/first` → `content/pages/blog__first.json` (underscores can't appear in addresses).
- **Every save is also kept in the browser.** The message says plainly where it went: "Page saved to GitHub. Visitors see it after you publish." / "saved in this browser. Saving to GitHub isn't switched on yet." / a GitHub error in plain words plus "A copy is safe in this browser."
- **Server code lives in `apps/admin/server`**, with thin route files in `apps/admin/functions/api`. It imports only `@crust/blocks/tokens` and `/content`, so React and Puck stay out of the Worker (35 KB bundle).
- **The deploy now runs from `apps/admin`** so the functions ship with the site. The preview check also calls `/api/status`.
- **Settings the owner adds in Cloudflare Pages** (Settings → Variables and secrets):
  - `GITHUB_TOKEN` (secret)
  - `ACCESS_TEAM_DOMAIN`
  - `ACCESS_AUD`
  - optional: `GITHUB_REPO` (default `hystericmoon/crust`) and `CONTENT_BRANCH` (default `main`)

## 2026-10-28 — F011–F014 (owner-approved proposals)

- **F011:** the publish check looks for the Image block's placeholder
  (`cr-image-empty`) in the rendered page, the same way it checks alt text.
- **F012 Button alignment: page JSON gains an optional `align` prop on
  Button.** No migration is needed: buttons saved without it render
  left-aligned, exactly as before. The button now sits in a
  `div.cr-button-row`, so alignment works like Heading and Text. The sample
  hero button is centred to match its heading.
- **F013 presets:**
  - Five presets: Crust (the current default), Ink, Forest, Sunset and Mono.
  - They change colours and fonts only; spacing, corners and width stay as you set them.
  - A test checks that each one passes all seven contrast pairs. That fixed the mockup's "Mono", which made Primary the same colour as Text.
  - Applying a preset keeps the previous colours and fonts, so one "Undo preset" button brings them back.
  - The current preset is marked by a thicker border plus the word "Current", so the state isn't shown by colour alone.
- **F014 click-to-colour:**
  - The preview stays a sandboxed iframe with no scripts. A click on it is mapped back into the page and matched to the colour role that styles that spot, following the same rules as the block styles. For example, text in a Primary section maps to "Text on primary".
  - The matching field is then focused and selected.
  - It's a pointer shortcut only; the form stays the keyboard route.
  - The hint text is hidden on phones, where the preview is a small strip.

## 2026-10-28 — F005 keyboard editing (Claude, reversible)

- **Shortcuts**:
  - Enter selects the focused block.
  - Alt+↑/↓ moves it up or down.
  - Alt+← moves it out of its section or column.
  - Alt+→ moves it into the section or columns above.
  - Alt+Shift+←/→ moves it to the previous or next column.
  - Enter on a block in the list adds it after the selected block.
  - Escape deselects.
  - ? opens a help panel, also reachable from a "Keyboard" button in the header.
- **Alt plus arrows** because it's the common "move item" chord (Google Docs,
  VS Code), and it doesn't clash with Tab, typing or the browser. Shortcuts
  are ignored while you're typing in a field.
- **Every move is also a labelled button on the selected block's action
  bar**, and buttons are only shown when that move is possible. The help
  panel lists the keys, so nothing depends on remembering them.
- **Every move and insert is announced** in a polite live region, e.g.
  "Text moved out of Section into the page, position 3 of 3."
- **Canvas blocks get screen-reader names**: "Text: Edit pages in the
  builder…", role "block", plus a short hint. Puck's own text called them
  "draggable", which promised a drag that keyboard users couldn't do.
- **Focus ring**: a dark outline with a white halo on canvas blocks and
  Puck's controls. On Primary sections, site buttons use the
  label colour for their focus ring.
- **Puck's "Publish" was a `<span>`**, which you can't reach with Tab. It's
  replaced by a real button named **Save draft**, because that's what it does
  until F008 (Publish) exists.
- Moves go through Puck's own actions, so Undo and Redo work for them.

## 2026-10-28 — F003 Site settings (owner + Claude)

**Owner's call** (after an Impeccable critique of the three design
directions): **direction A (form + live preview) with B's contrast-checks
panel.** Failing contrast warns and offers a fix, but never blocks saving.
Fully editable on a phone, with a collapsible preview strip. The preview
shows the real Home page. Handoff spec: `docs/f003-site-settings.md`.

Claude's build choices (reversible):
- **Contrast is checked as pairs**: every text/background combination the
  blocks produce (7 pairs), at 4.5:1. The suggested fix keeps the colour's
  hue and changes only its lightness, and it must pass every pair that
  colour is part of. The design mockups' fix (#71717A) passed on white but
  failed on Surface; this approach can't make that mistake.
- **Only the text colour's row is marked red** when a pair fails, because
  that's what the fix changes. If no shade can work, the panel says to
  change the background instead.
- **The preview is the publish renderer's own HTML** in a sandboxed iframe
  (no scripts), so preview and published page can't drift apart.
- **Fonts are curated system font stacks**, not web fonts: no download, no
  cost, no third-party requests. Any other stack is kept and shown as
  "Custom".
- **Saved in this browser** until F006 (Save to GitHub). Unsaved edits also
  show in the builder, so switching screens loses nothing. The browser asks
  before you leave with unsaved changes.
- **The admin's own controls are near-black**, not blue, so they can't be
  mistaken for the site's primary colour. Admin field borders are 3:1 or
  more, inputs are 16px (no iPhone zoom), and targets are at least 44px.
- **Test tools added:** `@testing-library/react` (MIT) and `happy-dom`
  (MIT, already installed through Puck) for screen tests.
- **The token format didn't change**, so no migration is needed.

## 2026-10-28 — F004 Columns and Card (Claude, reversible)

- **Columns has four fixed column slots; the count picks how many show.**
  Lowering the count hides the extra columns' content without deleting it,
  so it comes back if you raise the count again. Hidden content isn't
  published.
- **Breakpoints:** 1 column below 640px, 2 columns from 640px, the chosen
  count (3 or 4) from 1024px. The editor's tablet view (768px) shows 2.
  A 3-column row on tablet leaves the third card alone on its own row.
- **No sections or columns inside a column**, to keep layouts predictable.
- **Card is a fixed composition** (optional image, title, text, optional
  link) rather than a free container, so cards in a row stay consistent.
  Empty parts are left out instead of showing placeholders. The title's
  heading level is a separate choice from its size (always the same visual
  size), so the outline stays correct without changing the look. The link
  shows only when both its text and URL are set; the field asks for text
  that says where it goes (no "Read more").
- **Cards stretch to equal height in a row**, with the link pinned to the
  bottom.
- **Editor canvas now uses the page's base styles** (`cr-page` wrapper via
  Puck's root render). Before, body text in the canvas fell back to a serif
  font, so the preview didn't match the published page.
- **The sample page shows a 3-card row** so the new blocks are visible in
  the preview.

## 2026-10-28 — F002 output validation (Claude, reversible)

- **Checks run on the rendered HTML**, so they test exactly what visitors
  get. A small tag scanner, not a full HTML parser dependency: our renderer
  is the only producer and React escapes all text and attributes. It skips
  comments and `<style>`/`<script>` contents.
- **All problems on all pages are listed at once**, each with the page and
  the heading or image it's about, so the owner can fix everything in one
  pass. Nothing is written (no sitemap) when any check fails.
- **`alt=""` counts as a deliberate "decorative image"** and passes; a
  missing or blank-spaces alt fails. The Image block never writes `alt=""`
  today, so only a future "decorative" option will produce it.
- **The H1 must be the first heading.** A heading before the H1 counts as a
  skipped level (axe and WCAG guidance: the page title heading comes first).

## 2026-10-28 — F010 preview deploy (Claude, reversible)

- **Direct upload with wrangler from GitHub Actions**, not the Cloudflare
  GitHub app (owner's call: the app connection loops on his phone). The
  workflow creates the Pages project `crust-admin` itself on the first run
  (production branch `main`), so there is nothing to click in Cloudflare.
- **Wrangler runs via `npx` at a pinned version** in the workflow rather than
  as a project dependency, so normal installs stay small. The token never
  goes to a third-party action.
- **No secrets = no failure.** Without the Cloudflare secrets the build still
  runs and the job summary says the deploy was skipped, so CI stays green on
  forks and before setup.
- **Pull requests deploy on open/reopen too**, so a new PR gets its comment
  right away instead of waiting for the next push. One comment per PR,
  updated in place.
- **The workflow checks the live URL** serves the admin before reporting
  success. This is the "real deploy succeeds" part of the done check.
- **Workflow lint uses actionlint's Docker image** (pinned 1.7.7) in CI.
- **Preview URLs are public for now.** The admin holds no data or secrets
  yet (drafts live in the visitor's own browser). Cloudflare Access goes in
  front before F006 (Save to GitHub) ships.

## 2026-10-28 — Skeleton choices (Claude, reversible)

- **Renderer walks the block tree itself** instead of using Puck's `<Render>`,
  so published HTML contains only our markup.
- **CSS is inlined in each page** (tokens + base styles, a few KB). One request
  per page; revisit if the stylesheet grows.
- **Image blocks omit `alt` when empty** so the publish engine (F002) can stop
  the publish. A "decorative image" option (`alt=""`) can come later.
- **Initial commit went straight to `main`** because the repo was empty and
  there was no branch to open a PR against. From F002 on, work happens on
  branches with PRs.
- **Known audit warning:** `npm audit` reports a high-severity issue in
  `happy-dom`, pulled in by Puck through `@tiptap/html`. It affects
  processing untrusted HTML on a server with happy-dom; we don't do that (the
  admin runs in the browser, the renderer doesn't use Puck's runtime). No fix
  available upstream yet. Recheck at each dependency update.

## 2026-10-28 — Workflow

**Adopted the owner's design-in-chat / build-in-Code workflow.** One feature
per session from `features.json`, each with an executable `done_check`;
`PROGRESS.md` for handover; `BLOCKED.md` for human-only steps; `CHANGELOG.md`
for user-visible changes. Visual features carry `needs_review` and are only
fully done once the owner approves the preview. Work happens on branches and
reaches `main` through PRs with green CI.

## 2026-10-28 — Initial architecture

**Build a visual site builder that publishes static sites, not a traditional server CMS.**
The team is the owner (non-technical) plus Claude. A public server with
logins, plugins and payments would need someone who can review and maintain
the code under attack. Static output keeps the public attack surface close to
zero, makes hosting free, and makes backup trivial.

**Everything runs in the cloud; no local install.**
The owner has no personal computer (office Mac + phone only). The admin is a
web app on Cloudflare Pages behind Cloudflare Access; content is saved as JSON
in this GitHub repo; GitHub Actions builds and publishes.

**Content lives in Git as JSON, no database.**
No server or database to run, hack or pay for. Git history = backups and undo.

**Rust for the publish engine, React + TypeScript for the interface.**
Rust's strict compiler catches mistakes that would otherwise reach the owner,
and handles the correctness-critical parts (publishing, file output,
validation). React has the strongest ecosystem for the builder (Puck,
drag-and-drop, rich text) and admin UI. Expected split: ~55% TS, ~30% Rust.

**Puck as the builder engine; Puck also renders the published pages.**
Puck is MIT-licensed and stores pages as structured JSON (a block tree, never
raw HTML). Rendering pages with the same React blocks at publish time means
each block is written once and the preview matches the live page.
Trade-off accepted: the project is not 100% Rust.

**Builder saves a structured block tree, never raw HTML.**
Enables versioning, safe rendering, theme switching, migrations and a headless
API later.

**Design-system-first builder.** Global design tokens (colour, type scale,
spacing) and reusable components with props, so sites stay consistent.

**Desktop builder first; phone gets a simplified content-edit mode later.**
Layout work happens on the Mac; quick text/image edits and publishing on the
phone.

**$0 running cost.** Free tiers: GitHub (private repo, Actions), Cloudflare
Pages (500 builds/month, 20,000 files/site), Cloudflare Access (≤50 users),
Workers (100k requests/day), R2 (10 GB). Only optional cost: a custom domain.

**Deferred / out of scope:**
- E-commerce — would come back as an integration (e.g. Stripe Checkout).
- Third-party plugins (Wasm) — need someone technical to review plugin code.
- Tauri desktop app — the admin runs in the browser; Tauri can wrap it later.
- cPanel as the main platform — shared hosting can't reliably run Rust; it can
  be a publish target via FTP later.
- Hosted multi-user version (SaaS) — would bring back server cost and risk.

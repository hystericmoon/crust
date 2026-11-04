# Decisions log

Newest at the top. Each entry: what we decided, and why.
Claude logs reversible low-impact choices here; the owner makes scope calls.

## Proposals

- **Footer section in use (from F076).** Count the footer as a use of its linked section, so Layouts → Linked sections won't delete it while the footer shows it (today publishing stops with a clear message instead). Small.

- **Video uploads (from F073).** Background videos are linked by address for now. Uploading them to the media library would need size limits (a 10 s loop is 2–8 MB) and maybe Git LFS or Cloudflare R2, which may cost money. Owner's call.
- **Gradient check at publish (from F073).** Let F083's stricter template check (or publishing) stop on a Section gradient that no longer keeps text readable after a colour change.

Features Claude suggests. They are not work until the owner adds them to
`features.json`.

- **Gallery shape in the layout library: fixed 2026-11-04** (owner: "go with your recommendations"). `layouts-v2.ts` now uses `wide`; a test checks every layout Gallery uses a known shape. A bug fix, not a new feature.

- **Premium design layer (owner feedback 2026-11-02). Owner chose B (2026-11-02: "Let's go B, let's go all in in this. Compare yootheme features against us and tell me the gap. We should focus on that").** Next: a YOOtheme gap page and a milestone draft for approval; the milestone goes before the premium templates track. Gap page: https://claude.ai/artifact/ULmnd4JZEKpGvyUHFg1Kpo (`design/yootheme-gap-v1.html`, from YOOtheme Pro 5.0.53 docs and changelog, read 2026-11-01). Draft Milestone 8 "Premium design layer": A all in, 15 features F070–F084 (recommended), or B core 9. Waiting on the owner; F063 store paused until M8 is done (it's built with Crust, so it gets the new look). The owner
  compared our templates with eliras/zorven/labzzy.webflow.io and found
  ours not premium. Agreed, side by side:
  https://claude.ai/artifact/FMb9QuLomsLCvQC9aZscf3
  (`design/premium-gap-v1.html`). About 60% of the gap is the system
  (system fonts only; display sizes/tracking stop short; no mono labels
  or chips; one hero arrangement; no stats, numbered list, image strip,
  pricing blocks; no motion), 40% the templates (3 of about 7–19
  sections, filler copy, mismatched crops, an empty card in Signal).
  Options: A polish templates only; **B (recommended)** upgrade the
  design layer (bundled open-licence fonts served from the site, type
  and detail options, three hero layouts, four new blocks, CSS-only
  motion that respects Reduce motion, stricter template check), then
  rebuild Harbour, Signal, Corner; C B plus a freeform canvas (not
  recommended: reading order and phone layouts break). Learn principles
  from the references, never copy their layouts, copy or photos. If the
  owner approves B, write it up as a milestone before the premium
  templates track. F063 (store) continues meanwhile; it doesn't depend
  on this.

- **Browser copies in the app (found with F060, 2026-11-01).** The
  builder keeps working copies in the window's storage (unsaved
  colours, header and footer, page and post drafts, "Bring back my
  previous site"). In the desktop app every site shares that storage,
  so after switching sites, an unsaved colour change or draft from one
  site can show in another. Suggest keeping those copies per site
  (prefix the keys with the site's id), or clearing them on switch.
  Size S–M. F060 already avoids adding to it.
- **App wording (from F055, 2026-11-01).** In the desktop app about 70
  messages still say "GitHub" or "this browser" (Publish card, page
  status, Template banner, Site settings). Suggest one pass that gives
  each a desktop wording ("in this site", "on your computer"), best done
  with F056 when Publish works in the app. Size S–M.
- **From the review (2026-10-31).** Claude reviewed the 48 features
  waiting for review, at the owner's request (verdicts in features.json,
  `review_note`: 46 work as described, most with small notes; F005 and
  F048 have a real problem, and checking the templates found one more
  in F035, blog post margins). Fixes, most important first (S small, M medium):
  1. *Keyboard gap in the builder (F005, WCAG 2.1.1/2.4.1):* the
     "Blocks / Outline" switch can't be reached with the keyboard; add a
     "Skip to page" link too (33 Tab presses to the first block). S
  2. *Focus lost after dialogs (F022, F015, F013, WCAG 2.4.3):* closing
     the publish question, rename/delete dialogs or "Undo preset" drops
     keyboard focus to the top of the page; return it to the button. S
  3. *Blog posts touch the screen edge (F035, every template and the
     owner's own posts):* post body blocks aren't inside the page
     column. S
  4. *Template preview shows only sky (F048):* tall opening sections
     stretch the preview frame (Harbour: 2244 px desktop, 5185 px
     phone); give the preview a fixed viewport height. S
  5. *Canvas jumps sideways (F025, F027, F043):* the Section toolbar is
     wider than the canvas, and the "Make linked" / "Save as layout" name
     box opens past its right edge; the page stays scrolled. S–M
  6. *Failed saves and publishes (F006, F008):* a failed save looks like
     a success and vanishes after 10 s; "Publishing started…" stays under
     "Failed". Persistent error with "Try again". S
  7. *Contact form loses the message on a failed send (F037):* keep what
     the visitor typed and name the field that's wrong. M
  8. *Rename misses header, footer and post links (F018):* they rely on
     the redirect; update them too and say how many links changed. M
  9. *New Image block doesn't get the photo's description (F034):*
     picking a library photo on a just-added block leaves alt empty. S
  10. *Smaller polish:* page list breaks addresses mid-word (F007/F021);
      one page counted twice in "Publish N changes" (F022); a block added
      with nothing selected lands outside any section (F032); the "Site
      header" badge covers the Home link and the phone Menu button
      (F029); click-to-colour points header links and copyright at the
      wrong colour (F014); search results and the posts list use default
      blue links, focus doesn't move to results (F035, F039); Sign out
      sits next to Save draft (F040); the rich text field's right edge
      is cut off (F042); "To replace" isn't in page order and the tags
      cover the words (F046); duplicate contrast messages on theme
      import (F033); "1 of your layout" (F027); mixed label styles
      (F030); "For: Photo, part 6" on phones (F034). All S.
  11. *Template check sees layout (F047):* add a page-margin check and
      preview screenshots, so problems like 3 and 4 are caught. M
  12. *Harbour polish (F052):* a stronger opening photo (too pale; the
      phone crop loses the stair), roomier "What we do" headings, less
      space after each page's opening block. Signal's stand-in pictures
      and Corner's grey highlighter links are covered by F053. S–M

- **Header over the hero photo (from F052).** An option for the site
  header to sit transparently on top of the first section's photo, with
  light text, as premium templates do. Small.
- **Latest posts block (from F052).** A block that shows the newest 3
  journal posts (title, date, cover) on any page, filled in at publish
  time. Small to medium.
- **Highlight link style on tinted cards (from F051).** The "highlight"
  link style reads as a grey-beige block on Corner's yellow cards; tint
  it from the card's own background instead. Small.

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
- **Use the new layouts in the whole-page layouts.** For example the
  Contact page with the Contact form, Landing with the Logo strip,
  Services with Questions to open. Small; changes F026's page layouts.
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
- **Free Crust, paid templates (owner's idea, 2026-10-31, not yet
  confirmed).** The owner is thinking of making Crust free and selling
  only templates. Roadmap redrafted around it (same link,
  https://claude.ai/artifact/4eHUDzJ3tDeeaNPBf4T4ii): M6 becomes the free
  app (no licence keys; the template gallery also shows premium
  templates with a link to the store), M7 a template store, plus an
  ongoing premium-template track (about six for launch). Claude agrees
  with free, with the caveat that all income then rides on a strong
  template catalogue. New optional decision: open source or not (Claude:
  free but not open source, for now).
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
- **Milestone 5 proposal: "Templates"** — *approved by the owner on
  2026-10-30 ("Approve") and added as F045–F049; see docs/milestone-5.md.
  Item 6 (review fixes) is added only when the owner asks.* Milestone 4 made
  daily building comfortable. The roadmap's next step is templates:
  complete sites the owner designs in Crust and, later, sells (M7). M5
  makes a template a real, checkable thing; it doesn't sell anything yet.
  1. **Save a site as a template.** Site settings → "Save as template"
     downloads one `.crust` file with everything: design tokens, header
     and footer, pages, linked sections, saved layouts, a sample blog post
     and the photos. It builds on the theme pack file (F033), with a new
     `kind: "template"`. Checked on import like theme packs; unknown
     fields dropped.
  2. **Start from a template.** On the Pages screen: "Start from a
     template" opens a gallery. Each template shows a thumbnail, its pages
     and a live preview at desktop, tablet and phone widths. Applying asks
     first and says exactly what it replaces; your current site stays in
     Git history, so it can be brought back (the existing "History" undo).
     Design snapshot first.
  3. **Placeholder content.** A template's text and photos can be marked
     "replace me". The builder shows them with a dashed outline and a
     checklist ("6 things to replace"), and publishing stops with a plain
     list while any are left. Why: a buyer's first publish shouldn't show
     "Lorem ipsum" or our sample photos. Error prevention (Nielsen #5).
  4. **Template quality check.** One command (and a CI job) that a
     template must pass before it's offered: axe at three widths on every
     page, contrast in every section style, one h1 and heading order, alt
     text, Lighthouse ≥ 95 on the home page, every layout renders, no
     leftover placeholders. Produces a readable report page. This is what
     makes "accessible by default" a promise we can sell later.
  5. **First starter template.** One complete template, designed with the
     owner: Home, About, Services, Work, Contact, a blog with one post,
     linked header CTA and contact strip. It proves 1–4 end to end. Design
     snapshot with 2–3 directions first; the owner picks.
  6. **Fixes from the owner's review of Milestones 2–4.** A placeholder,
     as in M4: added as rework items only when the owner asks.
  Order: 1, 3, 4, 2, 5 (format first, then the checks, then the gallery
  that uses them, then the first real template). Everything stays free
  with $0 running cost. Rough size: like Milestone 4. Left out on purpose:
  selling, licences, accounts, the desktop app (M6–M7), and the gallery
  lightbox (still a proposal above; a template may want it, so it could
  join M5 if the owner says so).
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


- **Redirects and "page not found" on FTP hosts (from F059).** Cloudflare
  reads `_redirects`; most FTP hosts (Apache) read `.htaccess` instead,
  so after F059 a renamed page's old address gives the host's own "not
  found" page there. Publishing by FTP could write an `.htaccess` with
  the redirects and Crust's 404 page. Small (M). Only helps Apache hosts
  (most shared hosting); Nginx hosts ignore it, harmlessly.


## 2026-11-03 — F084 Rebuild Harbour, Signal and Corner (Claude, reversible)

Snapshot https://claude.ai/artifact/KhSZToRB3zEYzpXrCe5eVo
(`design/f084-starter-rebuild-v1.html`). The owner's standing rule is to
build the recommendation, so A was built for all three decisions.

- **Look: A, the matching Style library look.** Harbour = Atelier ·
  Stone, Signal = Studio · Signal, Corner = Bistro · Cream (`lookTokens`
  in starter.ts, `applyLook` on the default tokens, plus motion: Subtle,
  Lively, Subtle). Site settings recognises the look (`matchingLook`), so
  the buyer sees which look they have and the other colourways are one
  click away (recognition over recall). The colours stay close to each
  template's old palette; Signal becomes a dark site. In this look the
  "dark" section style is the light band (it uses the text colour), so
  Signal's light bands are `dark` sections.
- **Pages: A, pages that fit the business.** Harbour: Studio, Services,
  Projects, Journal, Contact. Signal: Work, Services, Studio, Notes,
  Contact, plus a "Start a project" button and a top bar. Corner: Menu
  (four price tables), Workshops (a price list), Our story, News, Visit
  us (opening hours, order ahead). Addresses `/about`, `/services`,
  `/work`, `/contact` are kept where the page is the same kind, so links
  people learned keep working.
- **Copy: A, finished words for a made-up business, still marked to
  replace.** Every made-up figure, quote, name, price, address and photo
  is marked (F046), so publishing waits until each is replaced or kept on
  purpose; generic labels ("How we work", button text) aren't. Contact
  details use `.example` addresses (reserved, never a real inbox) and
  555 phone numbers.
- **Structure.** `scripts/starter-templates/`: `kit.ts` (block helpers,
  ids counted per page so a rebuilt file is identical), `harbour.ts`,
  `signal.ts`, `corner.ts` (pages, linked sections, two posts, blog
  settings, header and footer, post/blog/404 designs), `parts.ts` (the
  shape), `starter.ts` (specs and `buildStarter`). Home pages have 9–10
  sections and 7–9 kinds of section; inner pages 4–7.
- **Header and footer v2 in templates.** The template reader (F045) never
  learned F076's fields, so a template file silently lost a header's
  layout, "over the hero", top bar and dropdowns, and a footer made of
  blocks. `pickHeader`/`pickFooter` in `template.ts` now copy them, the
  existing `validateChrome` judges them, and a block footer's section
  must be in the file. No format change: the fields were already in the
  spec and in `site.json`.
- **Photos.** Same CC0 photos the owner picked (F052/F053), used more
  widely; Signal also carries the five made-up client logos drawn for
  the layout library (`photos/signal/logo-*.png`, credited as ours).
  Rows of photos keep one shape (the 1.6:1 wides together, the 0.8:1
  talls together).
- **Width.** Sections use the normal page width, so content lines up
  with the header and footer; "wide" put text 16 px from the screen edge
  at 1280 px while the logo sat on the page grid.
- **`AWAITING_REBUILD` is empty.** The three templates are held to every
  F083 rule; `npm run check:template` passes for all three.

## 2026-11-03 — F083 Stricter template check (Claude, reversible)

- **Where.** `packages/render/src/template-strict.ts` (four new groups:
  `slotsGroup`, `cropsGroup`, `varietyGroup`, `gradientGroup`), the
  filler list in `template-check.ts` (`FILLER_EXACT`), wired in
  `scripts/check-template.ts`. Tests in `template-strict.test.ts`.
- **Empty slots.** A Slideshow slide, Gallery picture, Logo or Image block
  with no photo always fails. A Grid, Card slider or row of Cards fails
  only when some have a photo (or icon) and others don't: a grid of
  words-only cards is a design, a hole in a row is a defect. A "Replace
  me" mark doesn't excuse an empty slot.
- **Crops.** Photos in one row (Grid, Card slider, Slideshow, Gallery
  with "original" shape, the first Image or Card of each column) must be
  within 1.3× of each other in width÷height (`MAX_CROP_MISMATCH`). Square
  and wide galleries are skipped: they crop every picture the same.
  Photos that aren't the template's own (web addresses) can't be
  measured and are skipped.
- **Variety.** Home needs at least 5 different kinds of section
  (`MIN_HOME_SECTION_TYPES`): Hero, one per feature block (card grid,
  stats, quote, logos, slideshow, pricing…), Image and text, Columns,
  Text. Linked sections on Home count.
- **Filler.** Builder default words ("Heading", "Your text here", "Click
  here", "Alex Rivera", the sample quote) fail as whole-string matches,
  so ordinary sentences containing "heading" pass.
- **Gradients.** Closes the F073 proposal: a Section gradient that fails
  `gradientReads` after a colour change fails the check.
- **Harbour, Signal, Corner are excused until F084.** They fail the new
  checks (Home has 4 kinds of section; Harbour and Signal mix a portrait
  and a landscape in a row). `done_check` runs `check:template` on them,
  so their findings from the four new groups show as notes ("Waiting
  for F084's rebuild") through `AWAITING_REBUILD`. **F084 must empty
  that list** (`template-strict.ts`) and the check then holds the
  rebuilt templates to every rule. A new template is never excused.

## 2026-11-03 — F082 Post, blog and 404 designs (Claude, reversible)

Snapshot https://claude.ai/artifact/6DUK8yisbSiBT5LuYuhUND
(`design/f082-page-designs-v1.html`); the owner said "Go ahead and run",
so the recommendations were built: A for all three decisions.

- **How: A, a design with blocks that fill themselves in.** One way of
  working for pages, posts and designs (consistency, Jakob's law inside
  the product); anything can be added around the post (sign-up strip,
  linked section, "More posts"); premium templates (F084) can ship
  designed post and blog pages. B (layout switches) couldn't hold extra
  sections; C (fixed top, blocks around it) left the most visible part
  fixed.
- **Format.** `content/designs/{post,blog,404}.json`, `{ kind, title?,
  savedAt, content }` (spec, `page-designs.ts`). New optional files, so
  no migration: a missing file keeps the old renderer path exactly (the
  tests compare the output byte for byte). A damaged file stops the
  publish with its name, rather than quietly using the built-in look.
- **Rules (`checkDesign`).** The post design needs exactly one "Post
  content", at the top level (it holds the post's own full-width
  sections; inside a section it would nest sections). The builder keeps
  it, and "Cover with title", out of slots (`disallow`, also inside the
  settings tabs' `resolveFields`); saving checks again. The blog design
  needs a Post list. Self-filling blocks only go in their own designs;
  outside a design they publish nothing. One h1 stays the publish
  check's job: every starting design has exactly one.
- **Starting designs: all nine**, today's look first and marked. Post:
  Classic (today's), Split (title beside a tall cover, cropped to the
  photo's focal point), On the photo (`PostHero`: the cover fills a dark
  section with a strong tint, 4.5:1 kept; without a cover it's a plain
  dark section). Blog: Cards (today's), List, Featured. 404: Simple
  (today's), Helpful (home and site search, which every site has),
  Statement (big heading on dark). In the layout gallery "Whole pages"
  becomes "Starting designs"; picking one replaces the design (one Undo
  brings it back), because two designs on top of each other would mean
  two "Post content" blocks.
- **Where: A.** Posts screen cards "Blog page design" and "Post page
  design" with "Now: Built-in look / Your design", and "Page not found"
  as its own row after the pages (hidden while searching the list).
  Route `#/design?kind=post|blog|notFound`.
- **Builder canvas.** The design editor shows the newest post (its own
  blocks drawn read-only where "Post content" is) and the real list of
  posts; without posts, sample words. The post editor shows the post
  inside the saved post design (`StaticBlocks` from @crust/render around
  Puck's own blocks). Known gap: a "More posts" list in the post editor
  shows "No posts yet" (the editor doesn't load the other posts).
- **Saving** like posts: a copy in this browser wins until it's saved
  (`crust:design:<kind>`), so preview links without saving work; "Use
  the built-in look" deletes the file (`/api/designs` action `reset`).
  Photos used in a design count as used in the media library.
- **Templates** carry `designs` (optional; old files read as before);
  starting from a template replaces the site's designs and removes ones
  it doesn't have; the template check publishes them.
- **Search.** A post's design blocks are inside the post's searchable
  `<main>`, so text the design adds (a sign-up strip) is indexed with
  every post. Small; a later fix could mark them `data-pagefind-ignore`.
- **Checks.** check:layouts publishes the nine designs in every other
  style look (54 pages, axe at desktop and phone); check:builder has
  four new screens.

## 2026-11-03 — F081 Images: WebP, AVIF, focal point (Claude, reversible)

Snapshot https://claude.ai/artifact/Qp4rkNmxNn3AKWKxDTr9hB
(`design/f081-images-v1.html`). Only the focal point picker had a
visible choice; the owner was away, so the recommendation was built: A.

- **Copies, not conversion.** crust-publish writes `<file>.avif` and
  `<file>.webp` beside every library photo and every resized copy
  (`harbour.jpg.avif`, `harbour-480w.jpg.webp`); a WebP photo gets only
  AVIF. The original's extension stays in the name so `harbour.jpg` and
  an uploaded `harbour.webp` never share a copy. Pages list them in a
  `<picture>` (AVIF, then WebP, then the original `<img>`, which keeps
  srcset, size, alt and loading). Nothing is stored in `content/`.
- **Encoders.** AVIF: `ravif`/`rav1e` (BSD-3/BSD-2), pure Rust, built
  without assembly so no NASM is needed on Mac/Windows. WebP: `webp`
  (MIT/Apache) over libwebp (BSD-3), built from source by libwebp-sys
  (needs a C compiler, which every build already has). The `image`
  crate's own WebP writer is lossless only, which makes photos larger
  than the JPEG. Settings: AVIF quality 60 at speed 10, WebP 78. On
  Corner's eleven photos AVIF weighs 41% of the JPEGs, WebP 68%; slower
  AVIF speeds saved a few percent for 2–3× the time.
- **Speed.** Rust builds generic code inside the crate that uses it, so
  rav1e's encoder is compiled inside crust-publish; `cargo run` (a dev
  build) made a photo take ~5 s. `[profile.dev.package.crust-publish]
  opt-level = 2` brings it to ~0.4 s. Photos are encoded on a few
  threads at once.
- **Cache.** `--photo-cache <dir>` (crust-publish) keeps each photo's
  copies under `<file>-<fingerprint>/` (FNV-1a of its bytes and a
  settings version, `COPIES_VERSION`); an unchanged photo is copied from
  there, changed or deleted photos' entries are removed. The publish
  workflow keeps `.crust-cache/photos` with `actions/cache` (keyed on
  `content/media/**`, restoring the last one); the desktop app keeps it
  in the site's `.crust/photo-cache`. A cache that can't be written only
  makes the next publish slower.
- **`<picture>` doesn't change layouts.** It's `display: contents`
  (`.cr-picture`), so the `<img>` lays out as before; the three CSS rules
  that used `>` to reach a section photo also match through it. Checked
  in Chromium on the published Corner template at desktop and phone
  width: every photo loads its AVIF copy, and every photo's box is
  identical with and without the `<picture>`.
- **Focal point: A, press on the photo.** In the media library's photo
  details: press (or drag) on the photo, arrow keys move 5% (Shift 20%),
  "Centre" resets; three small crops (wide, square, tall) show what
  blocks will keep. Direct manipulation over B's nine positions (too
  coarse: a subject between two positions is clipped) and C's sliders
  (indirect: two controls to steer one point). Keyboard: one tab stop,
  `role="application"` so screen readers pass the arrows through, the
  label reads the position as words and a polite live region repeats it
  after each move. No dragging is needed (a single press works, WCAG
  2.5.7). The dot is a white ring inside a dark ring, visible on light
  and dark photos.
- **Saving.** "Save changes" (or "Use this photo") saves alt text and
  focal point in one commit (new `details` action on `/api/media`). A
  focal point can be saved before the photo has alt text. The middle is
  stored as no focus at all.
- **Format (contract).** `content/media.json` items may carry `focus`
  `{ "x": 0–100, "y": 0–100 }` (optional; missing means the middle, as
  before), so no migration is needed. Template files' photos may carry
  it too, and it comes along when a template is applied.
- **Where it's used.** Every library photo shown through `Img`, i.e. all
  of them: cards, galleries, sliders, slideshows, section and overlay
  backgrounds, post covers and thumbnails, quote portraits, video and
  map covers. Uncropped photos ignore it. A Section's own Focus (F073)
  wins when it isn't the middle. The builder's canvas gets the focal
  points too (`MediaFocusProvider`, which loads the library once), so
  the canvas crops like the site.
- **check:builder** has a "media library, focal point" screen (the
  library is faked with Playwright routes). Screenshot
  `design/f081-focal-point-picker.png`.

## 2026-11-03 — F080 Layout library v2 (Claude, reversible)

Snapshot https://claude.ai/artifact/VpbNu8K34npejqHXQpiYnj
(`design/f080-layout-library-v1.html`); the owner was asleep, so the
recommendations were built: A for all three choices. Built from 01:15
Jakarta, the time the owner asked to continue.

- **64 new sections, 10 new whole pages** (`packages/blocks/src/layouts-v2.ts`),
  on the Milestone 8 layer: display headings with labels, photo and
  gradient backgrounds, section widths, boxed, highlighted, divided and
  sticky columns, icons, figures, tables, pricing, sliders, tabs, maps,
  the lightbox. Only section styles and tokens, never colours of their
  own. Categories grew to Hero, Intro, About, Features, Services, Work,
  Gallery, Testimonials, Logos, Numbers, Process, Pricing, FAQ, Team,
  Call to action, Contact (and Content, from the first library). Words are
  written for a small design studio/workshop so a layout reads as a real
  page; "Step 1" labels appear only where the content is a sequence.
- **Photos: A, sample photos marked "to replace".** 15 public-domain
  photos from our own templates (CREDITS.md), resized to 1600 px, plus
  five made-up logos drawn for Crust (PNG, Liberation/DejaVu fonts),
  served by the builder at `/layout-photos/` (`apps/admin/public`,
  3 MB). `LayoutPhotoWatcher` copies each one into the site's Media
  library the first time a page uses it (one upload at a time, with its
  description as alt; a photo already there under its name is reused),
  then points the blocks at `/media/…` without an undo step. It watches
  the page, not the insert, so a page saved before the copy finished is
  put right next time. Every sample photo is marked (F046), so
  publishing waits until it's replaced or kept with "Keep as is"; the
  builder's own swap to the library copy keeps the mark
  (`isSampleCopy`). Safety net: a block still pointing at
  `/layout-photos/` (copy failed, then "Keep as is") renders with
  `data-crust-placeholder` and stops publishing
  (`uncopiedSampleLabel`). B (empty frames) was turned down because
  photo-led layouts looked unfinished; C (type-only) because big imagery
  is most of what makes the reference sites feel premium.
- **No team portraits.** We have no public-domain portraits; team
  layouts use workplace photos (marked to replace) or names only.
- **Old layouts: A, under "Simple".** The first library (26 sections, 5
  pages) is kept and listed after the new ones in each category under a
  "Simple" heading (its own named list for screen readers), and found by
  searching "simple". Fewer finished-looking choices first (Hick's law)
  without taking away layouts the owner knows. No ids changed.
- **Gradients fit the site.** A layout's gradient ends in a colour role
  that may not read in every look; on insert `fitLayoutToTokens` swaps
  it for one that keeps AA (or a plain colour). check:layouts renders all
  64 sections on every look (one colourway each, in turn) the same way.
- **Saved element styles: A, copy on apply.** "Saved styles" sits at the
  top of every block's Style tab: "Save this button's style…" stores the
  block's Style-tab settings (never words, links or photos; a Section's
  photo, video and focus are left out) as a saved layout of kind
  `"element"` in `content/layouts/` (or the browser until saving is on).
  Pressing a saved style copies its settings in, one undo step; "In use"
  shows when the block already matches. Rename and Delete in the same
  list, delete asks first. Only styles from the same kind of block are
  offered. B (linked styles) was turned down: it changes the page format
  and renderer, and the Style library already does "change once
  everywhere". C (one default per block type) allows only one look.
  Element styles stay out of theme packs and templates for now (Proposal
  below).
- **Content format:** `SavedLayout.kind` may be `"element"` (one block).
  Additive; pages are untouched. The server accepts it only with exactly
  one block.
- **Soft button fix (found by the new check).** In the Bistro and
  Playground looks a Soft button's label (the accent) was under 4.5:1 on
  its own tint. Each section style now works out `--cr-sec-soft-fg` (the
  accent, or the text colour) and `--cr-sec-soft-bg` (the 14% tint,
  lighter until the label reads); hover now outlines instead of
  darkening. Existing Soft buttons only gain contrast.
- **Proposal:** carry saved element styles in theme packs (small, S).

## 2026-11-02 — F079 Slideshow, Card slider, Tabs, Lightbox, Map (Claude, reversible)

Snapshot https://claude.ai/artifact/FNRagTiH9MLL4iTdDgHeje
(`design/f079-interactive-v1.html`); the owner hadn't picked, so the
recommendations were built: A for all four choices.

- **Plain HTML first, a small script second.** Slides and cards sit in a
  row that scrolls and snaps (swipe works with no script); every tab's
  text is on the page under its own heading; "Show map" is a link to
  OpenStreetMap; a gallery photo is a link to the photo. A script (each
  2.5 KB at most, unminified) is added only to pages that use the block
  (`interactiveTags`) and turns on the buttons. So the M1 rule "pages
  display with no JavaScript" still holds, search engines see every tab,
  and a page without these blocks gets no script and none of their CSS
  (`needsInteractiveCss`).
- **Slideshow: control row under the photo (A).** Buttons never sit on
  the photo, so they read on any picture without a scrim; "2 / 5" is
  written (and read out as "Slide 2 of 5"); 44 px targets (WCAG 2.5.8 asks
  24). B (dots on the photo) was turned down for tiny targets and
  colour-only state; C (thumbnails) for loading every photo up front.
  Following the WAI carousel pattern: a named region ("Slideshow: Our
  rooms", `aria-roledescription="carousel"`), slides labelled "2 of 5".
  Off by default, playing on its own needs "Yes, with a pause button";
  then the pause button comes first, rotation stops while the pointer or
  keyboard focus is inside (WCAG 2.2.2), the count isn't announced while
  it plays (`aria-live="off"`), and under Reduce motion it never plays on
  its own and slides without animation. The slideshow wraps from the last
  slide to the first; the card slider stops at the ends (buttons marked
  `aria-disabled`, not `disabled`, so focus isn't lost).
- **Card slider: arrows above the row, on the right (A)**, with the next
  card peeking in. Cards use the Grid's card look, so they match.
- **Tabs:** the WAI tabs pattern with automatic activation (arrow keys
  move and show; Home/End; the side look uses Up/Down). Looks: underline,
  pills, side (left on desktop, underline on phones). The tab row scrolls
  sideways on phones instead of turning into an accordion: changing
  widget type by screen width confuses people and screen readers. A link
  to `#<panel id>` opens that tab. Texts are plain paragraphs (like the
  Accordion's answers), not rich text, to keep the block small.
- **Lightbox: dark, the whole screen (A).** A real `<dialog>`
  (`showModal`): focus moves in and back to the pressed photo, Esc closes
  (the browser does that), arrow keys go through the gallery, the photo
  keeps its description. Fixed colours (#EDEFEC on #141614, 16:1), so it
  needs no per-site check. It's a Gallery switch, "Open photos larger
  when pressed": on for new galleries, off (missing) for galleries made
  before, so published sites don't change. Not in the builder, where
  pressing a photo selects the block.
- **Map: a drawn map card (A), OpenStreetMap on press.** The card is CSS
  in the section's colours; a cover photo can replace it (B, built as an
  option). Nothing is asked from a map service until "Show map" is
  pressed (privacy, speed score); C (map shown straight away) was turned
  down for that and because a map in the page traps scrolling on phones.
  OpenStreetMap's embed needs no account or key; Google's keyless embed
  isn't a documented API and could stop working. "Directions" uses
  Google Maps' documented link (`maps/dir/?api=1`, no key), which opens
  the visitor's maps app on phones. The press reuses the F078
  press-to-load script (`VIDEO_EMBED_SCRIPT`, now also filling a
  `data-cr-embed-box` frame). The address is always written out in an
  `<address>` (a map tells a screen reader nothing).
- **Finding the pin:** the builder's "Find on the map" asks OpenStreetMap's
  free search (Nominatim) once per press, from the owner's browser only
  (its usage policy allows this; never from published sites). Or paste a
  Google Maps, Apple Maps or OpenStreetMap link, or coordinates
  (`pinFromText`; a Google place's own pin `!3d…!4d…` wins over the map
  centre `@…`). Short links (maps.app.goo.gl) can't be read without
  following them, so the field explains how to copy a full one. The pin
  is stored as `pin: { lat, lng }` (6 decimals).
- **Content format:** all additive and optional (see docs/spec.md, F079);
  no migration. `Gallery.lightbox` missing means off.
- **Speed:** check:perf measures the Home page, which has none of these
  blocks; the scripts are small, deferred (`type="module"`), and slides
  after the first load lazily.

## 2026-11-02 — F078 Stats, Video, Table and Pricing, Numbered list (Claude, reversible)

Snapshot https://claude.ai/artifact/X3bMNKoE6MCU7EqbLJx2mk
(`design/f078-blocks-v3-v1.html`); the owner hadn't picked, so the
recommendations were built: A for all three choices.

- **Video, YouTube and Vimeo: your own cover, player only on press (A).**
  The published page holds a link to the video with the cover photo and
  a play button; nothing is requested from YouTube or Vimeo until it's
  pressed (no cookies, no tracking, speed score unaffected). Then a
  ~400-byte script (only on pages with such a video) swaps in the
  player: `youtube-nocookie.com` with captions on (`cc_load_policy=1`),
  Vimeo with `dnt=1`, and moves focus into it. Without JavaScript the
  link opens the video's own page. B (YouTube's thumbnail) was turned
  down because every visit would ask YouTube's servers for it; C (files
  only) because most people already host on YouTube or Vimeo. The play
  label sits on a dark plate (rgba 0,0,0,.78, at least 9:1 with white on
  any cover), per the M8 "text on photos gets a scrim" rule.
- **Video files:** the browser's own player, `preload="none"` (nothing
  downloads until play), poster from the cover, a `<track
  kind="captions">` from a .vtt address. No autoplay ever. Like Section
  videos, files are linked by address (no upload yet; see Proposals
  "Video uploads"). A captions file on another site would need that site
  to allow it (CORS); a site-relative .vtt always works. No `srclang`:
  the block doesn't know the site language and captions don't require it.
- **Addresses** are parsed strictly: https only, known hosts (youtube.com,
  m., music., youtube-nocookie.com, youtu.be; vimeo.com,
  player.vimeo.com), an 11-character YouTube id, a numeric Vimeo id (plus
  the unlisted-video hash). "youtube.com/watch?v=…" without https:// is
  accepted, since people paste it. Start times (`t=1m30s`) carry over.
- **Table: a grid of cells in the panel, plus paste (A).** Text boxes
  laid out as the table, buttons to add/move/remove rows and columns
  (they act on the last cell you were in), Enter/Up/Down move between
  rows, Enter in the last row adds one, and pasting cells copied from a
  spreadsheet fills the grid from that cell (tabs and new lines, quoted
  cells understood; commas aren't split, they're normal in prices).
  Limits 50 rows × 8 columns × 300 characters. Cells are plain text.
- **Table on phones: scrolls sideways (recommended).** The table sits in
  a focusable region named by its title (WCAG 2.1.1; axe
  `scrollable-region-focusable`); with "Top row and first column" the
  first column stays put (sticky). Stacked cards were turned down: CSS
  that turns a table into cards removes table semantics in Safari.
  An empty top-left cell is a `<td>`, not an empty header. Cells that are
  figures ("€49", "1,200", "12%") align right with tabular numbers.
- **Pricing: plan cards (A).** Each plan is a list item, its name a
  heading (level chosen, H3 by default), price and period as text ("€49
  per month"). Plans use a section style (Muted by default), the
  highlighted one another (Primary by default), so colours and the
  button stay contrast-checked by the section styles. The highlight has
  a written badge (WCAG 1.4.1): in the HTML it comes after the name, so
  heading navigation lands on the name, and CSS shows it above. Buttons
  default to "Choose <plan>" (WCAG 2.4.4). A comparison table is the
  Table block's job (B); price lists (C) could become a look later.
  **Changed from the snapshot:** the highlighted plan doesn't move first
  on phones; visual order then wouldn't match reading and Tab order
  (WCAG 1.3.2, 2.4.3).
- **Stats:** a list of figures, each item read as one phrase ("300+
  projects finished"); figures in the heading font, accent colour
  optional (the accent is AA-checked against the section). No count-up
  animation: a moving number is unreadable while it runs and screen
  readers get nothing from it. Boxes use a 6% tint of the text colour,
  so they work on every section style; their extra line uses the text
  colour, not the muted one, to keep 4.5:1 on the tint.
- **Numbered list:** a "Numbers" option first among the Icon list's
  marks (in the picker; search "steps" or "number" too), stored as
  `icon: "numbers"` with `numberStyle`. Published as `<ol role="list">`
  with the numbers as text (In a circle, Large "01" in the heading font,
  Plain "1."). Not a separate block: it's the same list, so switching
  back and forth keeps the lines.
- **Builder:** "Number look" shows only with Numbers, the badge and its
  colours only with a highlighted plan, the captions field only for
  video files (`blockFieldShown`, next to F073's `sectionFieldShown`).
  Under a Video's address the builder says what it found and what's
  missing (a title; captions for a file with speech; a cover).
- **CSS only where used:** `blocks-v3-css.ts` (`BLOCKS_V3_CSS`,
  `needsBlocksV3Css`), like F076 and F077, so pages without these blocks
  stay as light as before. Plan buttons are relinked when a page is
  renamed (`ITEM_LINK_PROPS.Pricing`). Phone quick edit covers Stats,
  Video, Table titles and Pricing words.

## 2026-11-02 — F077 Icons, Divider, Social (Claude, reversible)

Direction A of https://claude.ai/artifact/8o1uPhHmTBd9hgkzmx1pU2
(`design/f077-icons-v1.html`); the owner hadn't picked, so the
recommendation was built.

- **Icon sources:** 151 Lucide icons (`lucide-static@1.66.0`, ISC) in six
  categories (Contact, Places & time, Food & drink, Services, Shapes &
  marks, Arrows), and 16 social networks from Tabler
  (`@tabler/icons@3.50.0`, MIT, outline `brand-*`), because Lucide
  removed brand logos in v1. `scripts/sync-icons.mjs` `npm pack`s both
  into a temp folder and writes `packages/blocks/src/icons-data.ts`
  (licence header, ~56 KB, committed). No runtime dependency, no
  package.json change. A bit more than the ~120 in the snapshot: the
  extra are everyday business icons (bed, wifi, key…); still one
  browsable list per category.
- **Drawn inline:** each icon is its SVG in the page, `stroke:
  currentColor`, `aria-hidden`. A test checks every icon holds only
  drawing elements (no scripts, links, styles), since the drawings are
  inserted as markup.
- **Search by meaning:** each icon carries Lucide's tags plus our own
  words ("food" on utensils, coffee, pizza…). Every typed word must match
  the start of a name part or a word; name matches rank first.
- **Picker:** buttons in a grid with one Tab stop (arrow keys move by
  one / by a row of 6, Home/End, Enter or Space picks); `aria-pressed`
  shows the pick. Not a radio group, because arrows shouldn't change the
  icon while you browse 150 of them.
- **Names:** an Icon on its own is decoration; with a name and no link
  it's `role="img"`; with a link, the name is the link's name, and a
  link without one is rendered with `data-cr-needs-name` and stops the
  publish (crust-publish `validate.rs`, like a missing alt text). The
  builder says why under the field.
- **Icon list:** `icon` and a line's own `icon` take any icon. The six
  classic marks keep their own bolder drawings, so lists made before look
  the same; the picker shows them first as "List marks".
- **Card** shows an icon (in a circle, accent colours) only when it has no
  photo; a photo wins. **Button** icons are decoration; with "Text with
  arrow" an icon after the label replaces the arrow.
- **Colours:** plain icons use the section's accent (or text) colour;
  circle and square badges use the section's button colours, already
  contrast-checked. On a Primary section the accent becomes the text
  colour, as buttons do.
- **Divider:** decorative looks are `aria-hidden`; "Line with a label"
  is `role="separator"` named by its label (an empty label falls back to
  a plain line).
- **Social links:** networks recognised by host (www./m. ignored,
  look-alike hosts refused); any https:// address whose path starts
  with `/@` on an unknown host counts as Mastodon; other sites get a
  globe and their host as the name. Only https:// addresses are
  published. Each link is named "<who> on <network>" (or just the
  network), contains the visible word (WCAG 2.5.3), is at least 44 px,
  and has `rel="me"` (profile verification on Mastodon and others).
- **Content format:** all additions optional; pages made before render
  the same (docs/spec.md, "F077 adds three blocks").
- **CSS only where used** (found by CI's template check: Corner's home
  page dropped to Lighthouse 94, "Reduce unused CSS"): the F077 CSS lives
  in `icons-css.ts` (`ICONS_CSS`) and a published page gets it only when
  its rendered HTML uses one of the classes (`needsIconCss`); the builder
  always has it. Same approach as F076's header CSS.

## 2026-11-02 — F076 Header and footer v2 (Claude, reversible)

- Snapshot https://claude.ai/artifact/MQpL3LHaxEQW9r3KsWEygz
  (`design/f076-header-footer-v1.html`): A layout pictures + the menu
  list with nesting buttons + a footer from blocks (built); B header and
  footer both from blocks (YOOtheme style); C finished header presets.
  A makes the biggest choice one recognisable picture, keeps the menu
  keyboard-editable (no dragging) and keeps the header structured, so
  landmarks, skip link, phone menu and sticky offsets stay guaranteed;
  B's freedom makes a broken header easy; C can be added on top of A.
- **Format (optional, no migration):** `header.layout`, menu items'
  `children` (one level, 8 max; a parent's `href` may be empty),
  `header.overHero`, `header.topBar`, `footer.kind`/`footer.section`.
  A classic header without dropdowns renders byte-for-byte as before,
  including its fold-down phone menu (test).
- **Dropdowns:** `<details name="cr-menu">` (a real button with
  expanded state, one open at a time natively). The parent's own page,
  if it has one, is the first link inside. Hover never opens them
  (hover-only menus fail touch and keyboard, and open by accident). A
  ~350-byte module script, only on pages whose header has a dropdown,
  adds Escape (focus back to the button) and click-outside closing;
  everything works without it. In the phone menu, dropdowns are
  indented lists under their label (no second button to press).
- **Phone panel:** for the new layouts and any menu with dropdowns.
  Still `<details>`: when open, the summary's `::before` dims the page
  (a click there closes it, since it's part of the button) and its
  "Close" label is fixed above the panel, so no script is needed.
  Slides in with `@starting-style`, not under Reduce motion.
- **Split:** the logo sits inside the nav between the two halves, so
  reading and Tab order match what's seen; the phone row keeps its own
  logo. **Menu button only:** the button stays beside Menu.
- **Clear on a hero photo:** only a first section with a photo or video
  background (its tint keeps the header's words readable; gradients
  and plain colours don't qualify). A section's own "Header sits on
  this section" still works. Header room (`--cr-header-room`): 64 px,
  112 for Logo on top, +36 with a top bar; used for the hero's top
  padding, sticky columns and scroll padding.
- **Footer from blocks:** a linked section (F043), so it gets the
  builder, contrast and heading checks. "Make one from my simple
  footer" builds a Section in the footer's style: the text, then each
  column as an h2 and a list of links. The simple columns are kept for
  switching back; the copyright line stays under the blocks. A missing
  section stops the publish naming the fix; previews without the
  sections fall back to the simple footer. Known gap: deleting the
  linked section isn't blocked while the footer uses it (see Proposals).
- **CSS only where used:** the F076 CSS (~5 KB) lives in
  `header-v2-css.ts` and is added to published pages only when the site
  uses a new layout, a dropdown, the top bar or a footer from blocks
  (the builder always has it). With it in the base CSS, Lighthouse
  scored Corner's home page 94 ("Reduce unused CSS") in CI.
- check:layouts renders `header-v2-<layout>` pages (each layout, a
  dropdown, top bar on two, clear on hero on three, footer from blocks
  on three).

## 2026-11-02 — F075 Motion (Claude, reversible)

- Snapshot https://claude.ai/artifact/MnHuVJQob5bY9H1qnd3jDe
  (`design/f075-motion-v1.html`): A one site-wide level with a few
  exceptions per section (built); B an animation panel on every block
  (YOOtheme style); C motion bundled into the style library's looks. A
  keeps one motion language across the site (consistency, Nielsen #4),
  replaces timing values with three levels to compare (recognition over
  recall, Hick's law) and keeps user control (a section can opt out).
  B makes busy pages easy and consistency hard; C gives no way out.
- **Format (optional, no migration):** `tokens.style.motion`
  (`off|subtle|lively`, missing = Off), Section `entrance`
  (`rise|zoom|slide|none`, missing = Rise) and `parallax` (boolean, only
  with a photo or video background), LogoRow `moving` (`"yes"|"no"`).
  Sites without them publish byte-for-byte as before (tests); the
  motion CSS is added only when motion is on. Picking a look or preset
  keeps the motion level, and a look is still recognised with motion set.
- **CSS only, scroll-linked** (`animation-timeline: view()`), inside
  `@supports` and `prefers-reduced-motion: no-preference`. A browser
  without scroll-linked animation (Firefox today) shows the page still.
  Nothing is time-triggered, so nothing waits hidden for a script.
- **Words never fade (changed from the snapshot, which showed Rise +
  fade and a Fade choice).** With a scroll-linked fade, text stops half
  see-through when a visitor stops scrolling with it near the foot of
  the screen; axe found 22 contrast failures on the sample pages. So
  blocks only move (Rise 24/56 px, Zoom 0.96/0.9, Slide in from the
  left) and only photos fade. "Fade" became "Slide in".
- The page's first section never has an entrance (it's on screen when
  the page opens). Rows (Columns, Grid, Gallery) stagger their items by
  4 vh (Lively 6 vh) of scrolling, cycling every four; a row's own block
  doesn't move as well. Photos time their fade by the block they're in
  (a named view timeline), because a card's `overflow: hidden` would
  hide the scroll from the photo itself.
- **Hover lift:** only cards and buttons that link somewhere (the
  movement says "pressable"), also on keyboard focus; arrow buttons
  keep their own arrow nudge. Lively also zooms the card photo.
- **Parallax:** the photo is scaled 1.16 and moves ±6% over the
  section's time on screen; the words don't move.
- **Moving logo row:** published only; the builder shows the row still.
  The logos repeat until each half holds 8; the repeats and the copy
  are hidden from screen readers and their links skipped by Tab, so
  each logo is read and reached once. Pause is a real checkbox ("Pause
  the moving logos", 44 px) working without JavaScript through
  `:has(:checked)`; the row also stops on hover and keyboard focus
  (WCAG 2.2.2). Without the motion CSS (Off, Reduce motion) the repeats
  and the switch stay `hidden` (a base rule keeps `.cr-logos`'s flex
  from showing them).
- The builder canvas never gets the motion CSS (it's added in
  `renderDocument`), so blocks don't jump while being edited; Site
  settings' preview and published pages show it. check:layouts renders
  a motion sample page in all 12 looks (Subtle and Lively in turn).

## 2026-11-02 — F074 Rows and columns v2 (Claude, reversible)

- Snapshot https://claude.ai/artifact/9mia2cufYDWGXjSPr3zYbn
  (`design/f074-rows-columns-v1.html`): A one box look for all columns
  plus one highlighted column (built); B settings per column; C a
  column as its own block. A keeps rows consistent by default and
  covers the usual exception (pricing, "most popular") in a few
  controls; B makes uneven rows easy and adds a "which column am I
  editing" switch; C needs a migration of every saved page.
- **Format (optional Columns props, no migration):** `valign`
  (`top|middle|bottom`), `box` `{ style: <section style>|"none",
  padding: sm|md|lg, rounded }`, `highlight` `{ column: 1–4, style }`,
  `rowGap` (spacing step), `dividers` (boolean), `phoneOrder`
  (`normal|reverse`), `sticky` (column number). A row without them
  renders byte-for-byte as before (test).
- Boxes and the highlight reuse the section style classes, so their
  colours, links and buttons are the ones already contrast-checked for
  that style. Boxes in a row are equal height (grid stretch); Line up
  moves content inside them. Box padding is capped at M on phones.
- **Reading order:** never changed. "Last column first on phones" only
  sets CSS `order` below 640 px. When two or more columns hold links or
  buttons, the field warns that the Tab key will reach them bottom to
  top on phones (WCAG 2.4.3); one interactive column keeps its order
  among them, so no warning.
- **Dividers:** per screen size from the chosen widths: vertical for
  side-by-side columns, horizontal for stacked, none for 2 + 1 wraps.
- **Sticky column:** 1024 px and wider, below a sticky header when there
  is one. Sections switched from `overflow: hidden` to `overflow: clip`
  (hidden kept as the fallback line): it looks the same but no longer
  stops sticky from working.
- check:layouts renders a Rows and columns v2 page in all 12 looks;
  check:builder adds two Columns Style tab screens (reached through the
  "Columns" breadcrumb, since a row has no padding of its own to click).
- **CI fix (template-check):** with F073 and F074 the inline block CSS
  reached 38 KB and Lighthouse scored Corner's home page 94 ("Minify
  CSS"). Published pages now inline minified CSS (`minifyCss` in
  `render.tsx`: comments and spare whitespace out, quoted strings kept;
  about 15% smaller). Corner passes again. Splitting CSS per block used
  is a proposal if it grows further.

## 2026-11-02 — F073 Sections v2 (Claude, reversible)

- Snapshot https://claude.ai/artifact/NK9TwfBQMN6s6LHuEAuWQi
  (`design/f073-sections-v2-v1.html`): A three groups in the Style tab
  (Layout, Background, Over and under; built), B section recipes first,
  C everything on the canvas quick bar. A uses progressive disclosure
  (only the chosen background kind's fields show), pictures for widths
  (recognition over recall) and error prevention (unreadable gradient
  colours aren't offered). B overlaps the layout library; C crowds the
  quick bar and would still need the panel for keyboard users.
- **Format (optional Section props, no migration):** `width`
  (`narrow|normal|wide|full|left|right`), `bgKind`
  (`colour|gradient|photo|video`; missing = photo when `imageSrc` is set,
  so old sections read the same), `gradient` `{ to: <colour role>,
  direction: down|diagonal|across|glow }`, `videoSrc`, `focus` `{ x, y }`
  (0–100), `overlap` (`none|sm|md|lg`), `headerOver` (boolean). A
  Section without them renders byte-for-byte as before (test). Switching
  kind keeps the other kinds' values, so trying Gradient and going back
  to Photo loses nothing.
- **Gradient:** from the style's colour to a site colour, written with
  CSS variables so colour changes follow. Offered only if text, muted
  text and links keep AA and a solid button keeps 3:1 at five points
  along the gradient (mixing can be darker in the middle than at either
  end; test). The renderer doesn't re-check, so a hand-edited or
  imported page could hold a gradient that no longer reads after a
  colour change; the builder flags it ("no longer reads well here") and
  drops it from the preview. Proposal: F083's template check covers it.
- **Video:** a web address (`https://` or a site path) of an .mp4/.webm;
  the still photo is required. The `<video>` is `hidden`, muted, looping,
  `preload="none"`, no `autoplay`; a 1 KB module script (only on pages
  with one) starts it when motion is allowed and shows a real pause
  button (44 px, labelled, `aria-pressed`; WCAG 2.2.2). Reduce motion or
  no JavaScript: the photo shows and the video never downloads. Video
  uploads to the media library left out (Git repo size); see Proposals.
- **Width:** Wide = page width × 1.25; Full = no limit, gutter kept;
  Left/Right edge keep the text on the page grid and run to one screen
  edge (stack to normal gutters below 640 px).
- **Pull up:** the section moves up by M, XL or 2×XL; its top is
  see-through and its content starts that much higher; the section above
  gets the same room at its foot (`:has()`, also through the anchor or
  hide-on wrapper). What overlaps needs its own background, which the
  field's note says; found when sample cards without one vanished on a
  dark photo.
- **Header on top:** only the page's first block, and not when it's
  hidden on some screens (`headerOverStyle`); the renderer drops the flag
  from any other section. The header takes the section's style class,
  loses its background, and doesn't stick on that page (a sticky header
  that changes on scroll is F076). The builder canvas shows it the same
  way. Pages only, not posts (a post starts with its title).
- check:layouts renders a Sections v2 page in all 12 looks (header on a
  photo, pulled-up cards, a gradient per style, right edge, video);
  check:builder adds three Section Style tab screens (the check can now
  press buttons after selecting a block).

## 2026-11-02 — F072 Style library (Claude, reversible)

- Snapshot https://claude.ai/artifact/GaX1QoHvVTp8S3bU1ybxsa
  (`design/f072-style-library-v1.html`): A a grid of looks with
  colourway dots on each card (built); B a list of names with one big
  preview; C three questions, then three suggestions. A lets the owner
  compare looks side by side (recognition over recall), and each card is
  drawn in its own fonts, colours, label and button, so it previews
  honestly. B shows one look at a time; C hides most looks.
- 12 looks × 3 colourways in `packages/blocks/src/style-library.ts`.
  A look sets the font pair, the F028/F071 style options, the main
  button look, the corner radius, colours and section styles. It leaves
  spacing, page width and pages alone. All 36 colourways pass the
  contrast checks and raise no section-style warnings (tests).
- **No format change:** `applyLook` writes ordinary tokens;
  `matchingLook` finds which look and colourway the tokens match, so
  the current card is marked without storing a look id.
- Looks replace the 9 colour presets in Site settings (group "presets"
  now labelled "Styles"). `themePresets` stays in code for older sites
  and the tests that use it; nothing stored refers to it.
- Header style per look is left out: it comes with F076 (header
  styles), so the looks don't promise a header we can't draw yet.
- "Undo style" keeps the tokens from before the *first* look picked in
  this visit, even after several picks, so trying looks one after
  another is always one step from where you started. It restores
  colours, fonts, style options, section styles and radius.
- Colourway dots are 24 px round radio buttons with 8 px gaps (WCAG
  2.5.8); each has its colourway's name as label; the selected one has a
  2 px outline. Their classes are `.st-cw*`, because `.st-swatch` already
  styles the colour picker and made the dots square.

## 2026-11-02 — F071 Type and detail styles (Claude, reversible)

- Snapshot https://claude.ai/artifact/H3pscypcAov3mFHwoMHAHS
  (`design/f071-type-styles-v1.html`): A set the look once, pick per
  block (built); B free sliders per block; C only via complete styles.
  A keeps pages consistent and matches how YOOtheme, Webflow classes and
  Figma text styles work.
- **Format (optional fields, no migration):** `tokens.style` gains
  `displayWeight`, `displayTracking` (unset: follow the heading weight
  and spacing) and `labelStyle` (`plain|caps|mono|chip`, default caps);
  `headingWeight` adds 300/400, trackings add `tighter` (−0.04) and
  `tightest` (−0.05). Heading props gain `size` (`normal|display`) and
  `eyebrow`; Button `variant` adds `soft` and `arrow`; Card adds
  `layout` (`stacked|cover`). Old pages render byte-for-byte the same.
- Overlap with what existed: a site-wide "soft" button look already
  existed per section style (F028), and Flat cards are already tiles, so
  F071 adds per-button Soft/Arrow and the photo card, and no separate
  tile or shadow scale (Card style Shadow stays).
- The label is a `<p class="cr-eyebrow">` inside `<hgroup>` with the
  heading (HTML's pattern for a heading's subtitle/kicker; not its own
  heading, so heading order is unaffected). Colour is the heading's own
  (no new contrast pair); 12px minimum. Mono/Chip use bundled Geist Mono
  (`--cr-font-label`, files copied only when used).
- H3/H4 use `max(500, heading weight)` so Light/Regular only thin the big
  headings. The arrow is `aria-hidden`; its nudge stops under Reduce
  motion. Photo-card words sit on a 0→72% black gradient (white text
  passes on any photo at the bottom where the words are).
- Bug caught by the screenshot: the label rules (in the tokens CSS)
  came before the base stylesheet and lost; they're now
  `.cr-hgroup .cr-eyebrow`.
- The sample home page uses Display + Light + Tightest and a Chip label;
  Lighthouse 100, no serious axe issues.

## 2026-11-02 — F070 Fonts (Claude, reversible)

- Design snapshot https://claude.ai/artifact/Gjyo7UxqKfgcUBc3MxaSCn
  (`design/f070-fonts-v1.html`): A pairs first (built), B two lists and
  a specimen, C a font browser. A because 32 fonts make about 1,000
  combinations and most clash: cards turn recall into recognition and
  cut the choice to 12 good ones; full control stays one step down.
- **No format change.** A site uses a bundled font by naming its family
  first in `tokens.fonts.heading/body` ("'Fraunces', Georgia, …").
  `bundledFontIn()` recognises it; templates and theme packs carry it
  by name. Sites on system fonts publish byte-for-byte the same CSS.
- 32 families (12 serif, 16 sans, 4 mono) from the @fontsource packages
  (OFL 1.1, owner-approved), copied by `npm run fonts:sync` into
  `packages/blocks/fonts/` (committed, 3.7 MB, with LICENSE.txt) and
  `packages/blocks/src/font-sizes.ts`. Latin + Latin-extended, upright
  and italic, variable where available (one file per subset for all
  weights). Optical sizing only for Fraunces and Bodoni Moda (the opsz
  files of the others are 2× bigger for little gain).
- Pages get `@font-face` rules (font-display: swap, unicode-range) and
  preload links for the Latin upright file of each font in use. The
  browser fetches italic or Latin-extended files only when text needs
  them.
- Publishing copies only the files pages point to (`/fonts/<name>.woff2`)
  plus `fonts/LICENSE.txt` (OFL asks for the licence to travel with the
  fonts): crust-publish `--fonts <dir>` (pipeline, template check,
  publish:local) and `publish_fonts` with the app's own files in the
  desktop app (`asset_resolver`, so no internet needed). A font Crust
  doesn't have stops the publish with a message.
- The admin serves the fonts at `/fonts/` (vite plugin copies them into
  dist; dev server middleware). The picker loads one preview rule per
  font; browsers download only fonts on screen.
- Fonts made for headings (Playfair Display, Cormorant Garamond, Bodoni
  Moda, Instrument Serif, DM Serif Display, Young Serif) aren't offered
  for body text.
- The sample site (content/site.json) now uses Editorial (Fraunces +
  Inter Tight) so check:perf measures real font loading: Lighthouse 100.
  Visible on the live site only after the owner publishes.
- Name clash found by the screenshot: `.st-pair` was already the
  contrast checker's row; the cards are `.st-fontpair`.
- Light display weights (300–400) and tracking to −0.05 em come with
  F071; the pair cards use each font's regular weight for now.

## 2026-11-02 — Milestone 8 approved (owner)

- Owner: "Let's go A" on https://claude.ai/artifact/ULmnd4JZEKpGvyUHFg1Kpo.
  Milestone 8 "Premium design layer", F070–F084, written in
  `docs/milestone-8.md` and added to features.json (owner-approved
  scope). The "Premium design layer" proposal is now this milestone.
- The store waits: F063 now also depends on F084, as the approved plan
  said ("Then the store resumes"). This keeps the session protocol from
  picking F063 first.
- Open question for the owner: most good open fonts are under the SIL
  Open Font License 1.1, which is not in CLAUDE.md's licence list (MIT,
  Apache-2.0, BSD, ISC). It's free, allows bundling and selling sites,
  and forbids only selling the fonts on their own. F070 needs an OK to
  use OFL fonts; until then its design snapshot can go ahead.
- Owner answered (2026-11-02): "Yes to OFL fonts, and yes to MPL and
  BlueOak. Let's just throw everything the best we can do right now".
  CLAUDE.md's licence list now adds MPL-2.0, BlueOak-1.0.0 and SIL OFL
  1.1 (fonts). This also closes the open F056 question (minicbor,
  Tauri's MPL packages).
- Correction to `design/premium-gap-v1.html`: Crust's "Dramatic" type
  scale already reaches about 76 px; the gap there is tracking, light
  weights and real fonts, not size.

## 2026-11-01 — F053 Signal and Corner with real photos (Claude, reversible)

- **Directions (snapshot `design/f053-signal-corner-v1.html`):** Signal
  A "Night stage" and Corner A "Shop counter", built as the owner
  pre-approved ("go with all your recommendations"); B for each is drawn
  on the same page and can still be picked before the PR merges.
- **Signal:** dark full-bleed opening (stage crowd) at the bottom of a
  tall section; work as four Image overlay tiles with the project name
  on the photo and one "All projects" link below (four identical links
  would read badly in a screen reader's links list, WCAG 2.4.4); a dark
  photo band with one statement; journal teaser with a photo. Work page:
  tall beside two wide, a dark line, mirrored.
- **Corner:** split opening (words on butter yellow, photo beside, no
  text on the photo) so the brand colour stays visible; products as a
  card grid with photo, name and a price line, because local-shop
  visitors come for "what do you sell"; a tall photo beside one
  statement; a pale workshop band at Strong tint. Contact gets the shop
  front photo; the post gets a cover.
- **Photos:** 10 for Signal, 11 for Corner, all CC0 on Commons (licence
  re-read per file from the Commons API when downloading). Stored in
  `photos/signal/` and `photos/corner/`; file names are unique across
  templates because the template file keeps only the base name. Cropped
  to 16:10, 3:2, 4:5 or square, at most 1920 px, under 380 KB.
- **Code:** `StarterSpec.photos` is now each template's own list and
  `layout` names its Home and Work pages, About photo, optional Contact
  photo and post cover (Harbour's output is unchanged). The stand-in
  images stay in the code but no starter uses them now.
- **Card photos keep their shape (fix found while building):** a card
  with a library photo grew as tall as the photo file, because the
  photo's own height (added in F034 to stop layout jumps) beat the
  card's 16:9 shape. `.cr-card-media` now has `height: auto`. Affects
  every site's cards with library photos, only for the better.
- **Corner's opening photo is 4:3, not square:** square scored 94 on
  Lighthouse (95 needed) because the big photo was the last thing to
  appear on a slow phone; 4:3 is lighter and shorter on phones, and the
  home page now scores 100.
- Snapshot published: https://claude.ai/artifact/B3dfAGM3m15EcN1n83oooB

## 2026-11-01 — F069 Review fixes (Claude, reversible)

- **Blocks outside a Section (fixes 3 and 10, F032).** Two parts. (a)
  The renderer puts page-level blocks that aren't Sections (a post's
  body text, a block dropped between sections) inside the page column
  (`cr-container cr-page-column`); neighbours share one column. Pages
  made only of Sections render exactly as before, and the page JSON is
  unchanged. The canvas gets the same left/right space with CSS. (b) A
  block added from the block list with nothing selected now joins the
  end of the page's last Section instead of landing after it. Chosen as
  the least surprising: it appears where "the end of the page" looks to
  be, picks up that section's style, and Alt+← still moves it out. A
  Section, or a page that doesn't end with one, still goes at the end.
- **Section toolbar (fix 5).** Instead of a "More" menu, the selected
  block's action bar is capped to the room it has (`fitActionBars`, from
  its right edge and Puck's zoom) and wraps onto a second row
  (Save as layout, Make linked). If anything still scrolls the canvas
  sideways, it's put back. Measured in the built builder: no sideways
  scroll at desktop, tablet or phone, with every popover open.
- **Focus after dialogs (fix 2).** The shared `Dialog` remembers what had
  focus when it opened and returns focus there when it closes, unless
  the screen already moved focus on purpose (the Pages heading after a
  rename). After "Undo preset", focus goes to the preset that's current
  again, or the Presets heading.
- **Save and publish errors (fix 6).** One `SaveStatus` for the page,
  post and linked-section builders: success is still a 10-second toast;
  a failure (GitHub refused or unreachable, or a post that isn't ready)
  stays, in warning colours, as an alert with "Try again" and "Dismiss".
  "Isn't switched on yet" isn't a failure. A failed publish run shows a
  plain next step with "Try again" (not an alert on page load: the
  status line already announces it).
- **Contact form (fix 7).** With JavaScript (which Turnstile needs
  anyway) the form sends with `fetch` and the Worker answers JSON
  (`{ ok, problem, field }`, readable only by the site's origin); the
  page doesn't reload, so the words stay, and focus goes to the field
  to fix (`aria-invalid`, described by the message). Without JavaScript
  the form posts and comes back as before, now to `#<form>-error-<problem>`
  with a message per problem (name, email, extra field, message, spam
  check, sending), named by the field's own label, plus a hint that the
  Back button usually brings the words back. The old `#<form>-error`
  message stays for old links.
- **Rename (fix 8).** The same commit also updates the header menu,
  header button and footer columns in `site.json` (only links site.json
  spells out; an automatic menu follows by itself), and links in blog
  posts. The rename dialog lists them ("Site header and footer"), and
  the message ends "It also updated 3 links to the new address: …".
- **Alt text (fix 9).** With no earlier version of the block (just added
  or just opened), a library photo fills the alt text only when it's
  empty, so an owner's own words are never replaced.
- **Polish (fix 10).** Template preview heights: 800 (desktop), 1024
  (tablet), 812 (phone), scrolling inside. Sign out moved to the end of
  each bar after a divider. The Site header/footer label is a thin strip
  above the part instead of a badge on it. Click-to-colour treats header
  and footer links as Text and the copyright as Muted. Puck's own field
  labels take Crust's label style through Puck's CSS variables; its
  dropdowns stay (turning them into picture cards is bigger than polish).
  "1 layout"/"3 layouts" instead of "1 of your layout". The phone picker
  says "For: Photo, Gallery, block 6". Theme import doesn't repeat a
  section style's contrast problem when the same background already
  failed above. "To replace" visits columns in reading order (the
  builder can keep column4 … column1). Not done here: the "+" between
  sections still overlaps the Section toolbar a little (separate polish).

## 2026-11-01 — Review fixes and F053 directions (owner)

- Owner, after the review page: "go with all your recommendations".
  So: option A, one batch with fixes 1–10, added as F069 (fixes 11 and
  12 ride with the next template work). For F053, Claude builds its
  recommended direction for Signal and Corner; the photo picks and
  snapshot are still shown to the owner first, and he can switch
  direction before the build is merged.

## 2026-11-01 — F056 Publish on your computer (Claude, reversible)

- **One renderer, two callers.** `packages/render/src/site.ts`
  (`readSiteContent` + `renderSite`) is the whole render step, reading
  through a small `ContentSource`. The pipeline's `cli.ts` reads
  `content/` from disk with it; the app reads the site folder's content
  store (saved content, i.e. what's in its history). The output of
  `cli.ts` didn't change (checked by diff). A test renders all three
  starter templates both ways and compares every file.
- **Finishing runs in Rust, with the pipeline's own code.**
  crust-publish's new `finish()` (with `Checks::Stop` or `Checks::Report`)
  is what `publish_with_redirects` now calls; Pagefind 1.5.2 (pinned,
  same as the npm package) is a library behind crust-publish's `search`
  feature, so the publish workflow's `cargo run` doesn't compile it.
  Checked once by hand on Harbour: the app's finished folder is identical
  to `crust-publish` + `npx pagefind`, except the gzip header bytes of
  the two Pagefind `.wasm` files (same contents unzipped).
- **Preview never stops; export does.** A preview shows the site and
  lists what would stop a publish; Export, the "finished" step, stops on
  them like publishing. (Recognition and exploration before commitment.)
- **Builds live in the app's cache folder**, never in the site folder;
  a new build replaces the old one only when complete, so a failed build
  keeps the last good one.
- **Export** writes "<Site name> website" inside the folder picked in
  the system's folder picker (tauri-plugin-dialog). If that folder has
  files, the card asks before replacing it, and only a folder with
  `index.html` and `sitemap.xml` (an earlier export) is ever replaced;
  anything else is refused with "choose another place".
- **Preview in browser** serves the build on 127.0.0.1 at a free port
  (a small server in `preview.rs`, std only) and opens the default
  browser (tauri-plugin-opener). Addresses work as on hosts (`/about/`,
  404 page, search); redirects aren't applied in the preview.
- **Exporting doesn't count as publishing**: "Saved, not live yet" stays
  until F058/F059 put the site on a host.
- **Licences.** Pagefind brings `minicbor` (BlueOak-1.0.0, a permissive
  OSI licence like MIT); the Pagefind program the pipeline already runs
  has it compiled in. Tauri (F055) already brought MPL-2.0 packages
  (`cssparser`, `selectors`, `option-ext`; file-level copyleft, no
  effect on Crust's own code). Both free and open source; listed here
  because CLAUDE.md names only MIT/Apache/BSD/ISC.
- The "App wording" proposal (GitHub/browser messages in the app) did
  not ride along; still in Proposals.

## 2026-11-01 — F055 Desktop app shell (Claude, reversible)

- **The builder's server runs inside the window.** The app has no
  server: a small router (`apps/admin/src/desktop/local-api.ts`) answers
  the builder's `/api/…` and `/media/…` requests with the same handlers
  the web admin's Pages Functions call, with the site folder's
  LocalStore (F054) as `env.store`. A test checks the router has every
  address and method in `apps/admin/functions/api`. Chosen over a local
  HTTP server in Rust: no second backend, no open port.
- **Rust only touches files.** Four commands (read, write, remove, list)
  scoped to the site folder; anything with `..`, a leading `/`, a drive
  letter or a backslash is refused. Writes go to a temporary file first,
  then move into place, so a crash never leaves half a page. Photos are
  sent as raw bytes, not JSON.
- **Photos at `/media/<file>`** are served by wrapping Tauri's built-in
  files (`Context::set_assets`), so `<img src="/media/…">` works in the
  canvas exactly as on the web, with no custom address scheme.
- **The site comes from the folder, not the build.** The web admin ships
  with `content/site.json`, pages and posts built in (it's rebuilt on
  every change). In the app, `main.tsx` opens the folder first, then
  loads the builder, which reads them from `desktopContent()`. The web
  admin is unchanged (null there).
- **Where sites live:** `Documents/Crust/My site` (F057 adds more sites).
  An empty folder gets a new site: settings plus a Home page with an h1
  (commit "Start a new site"). A folder copied in without history gets
  one (commit "Start the site's history"). `CRUST_SITE_FOLDER` overrides
  the folder (tests).
- **Self-check in CI:** `CRUST_SELF_CHECK=1` opens the real window on a
  virtual screen (xvfb) and checks the builder shows, saving lands in the
  folder with history, photos show, and outside files are refused. CI
  runs it on every push (Linux only, normal minutes).
- **Installers:** `.github/workflows/desktop-release.yml`, started by
  hand, Mac (Intel + Apple silicon in one) and/or Windows; installers are
  kept 30 days as workflow downloads. Unsigned (BLOCKED.md). App id
  `app.crust.desktop`, a placeholder until the owner names the company
  that signs it. The icon is a placeholder (green tile, white "C", crust
  line) until there's a brand.
- **Words:** "Sign out" is hidden in the app and saves say "Page saved"
  instead of "saved to GitHub". Other screens still mention GitHub or
  "this browser" (about 70 places); see Proposals → "App wording".
  Publishing in the app answers "not available yet" until F056.

## 2026-10-31 — F054 Content store (Claude, reversible)

- **Same server code, two places.** The content operations in
  `apps/admin/server/github.ts` take a `Repo`: the GitHub settings (as
  before) or a `ContentStore`. With a store they hand the work to it, so
  every handler runs unchanged on a local folder. Chosen over rewriting
  each handler: the diff stays small and the GitHub path is untouched
  (all its tests pass as they were).
- **LocalStore keeps its own history** in `.crust/` inside the site
  folder (objects named like Git blobs, one JSON file per commit with the
  full file list, HEAD, last publish), instead of a real Git repository
  through gitoxide as the M6 draft said. Simpler for the app: Rust only
  has to read and write files (F055); no Git library to bundle. A real
  Git repository can still be added later if power users want one.
- With a store there is no Cloudflare Access (the app is the person's
  own); writes still need the builder's own header. Publishing answers
  "not available yet" until F056. Messages say "in this site" instead of
  "on GitHub".

## 2026-10-31 — Milestones 6 and 7 written up (Claude, reversible)

- docs/milestone-6.md (F054–F062) and docs/milestone-7.md (F063–F068),
  from the approved roadmap. Technical choices, all reversible until
  built: Tauri 2 for the app; a content store in front of the existing
  server code (GitHub or local folder) instead of a second backend; one
  hidden Git repository per site (gitoxide) so history and "Bring back"
  work offline; render, crust-publish and Pagefind run inside the app;
  host tokens in the OS keychain; installers and updates on a free
  Cloudflare Pages site (private-repo releases aren't public); delivery
  through a Worker and Workers KV (R2 needs a card on file, KV doesn't).
- F054 depends on F048, not F053, so M6 can start while the F053 photos
  wait for the owner.
- Mac/Windows installers only from a hand-started release workflow:
  private-repo minutes count 10× (Mac) and 2× (Windows).
- Launch-only owner tasks (signing, update key, payment provider, terms)
  are in BLOCKED.md labelled "Launch:", so they don't stop the features
  from being built.
- Premium templates are not features yet: the owner adds each one.

## 2026-10-31 — Free Crust, desktop app, M6 and M7 approved (owner)

- Owner, answering the roadmap (https://claude.ai/artifact/4eHUDzJ3tDeeaNPBf4T4ii):
  "i agree" to (1) Crust is free, people buy templates from us;
  (2) people run Crust as a desktop app for Mac and Windows (Tauri);
  (3) free but not open source, for now. "M6: go ahead", "m7: yes go
  ahead": Milestone 6 (the free Crust app) and Milestone 7 (the template
  store) are approved as drafted on the roadmap page. The next session
  writes docs/milestone-6.md and docs/milestone-7.md and adds their
  features to features.json (owner-approved scope).
- Owner, about the "waiting on you" list: "you do it all for me".
  Done by Claude the same day: merged #40 and #41 (CI green), started
  Publish on the live site. Delegated to Claude: the review of the 48
  features with `needs_review` (Claude reviews each on the preview, sets
  `reviewed: true` with a note "reviewed by Claude at the owner's request",
  and lists anything worth fixing as proposals). Still the owner's (they
  need his accounts, logins or money): contact-form email setup (F037),
  buying a domain (F044), app signing (Apple developer fee, Windows
  certificate), the payment provider account, terms and refunds.
## 2026-10-30 — Sessions hand over through HANDOVER.md (owner)

- The owner asked for everything a session needs in one written place,
  one session at a time, and a new session (closing the old one) after
  each finished task or when a session fills up. HANDOVER.md holds the
  rules, the state and the next step; CLAUDE.md's session protocol now
  starts and ends with it. It reaches main with the next merge.

## 2026-10-31 — F052 photos and snapshot (Claude, reversible)

- **Photos: ten CC0 files from Wikimedia Commons**, picked by eye from
  about 480 candidates (searches for minimal architecture, interiors,
  stairs, light and shadow, lakes). Commons shows a checked licence per
  file, which makes the credits list auditable. Five are pre-June-2017
  Unsplash uploads that were CC0 then; the dedication can't be
  withdrawn, so they're safe to resell. Credits:
  `scripts/starter-templates/photos/CREDITS.md`.
- **Pexels allowed (owner, with the licence text):** the Pexels License
  lets photos be used in "a template you sell"; it only forbids selling
  the photos on their own. Pexels photos are credited as "Pexels
  License", not CC0. pexels.com refuses this environment's requests; its
  API needs a free key only the owner can create. Unsplash stays out
  (its licence forbids compiling photos into a competing service, and
  the owner hasn't asked).
- **More CC0 sources (owner's list):** NegativeSpace and Skitterphoto
  (both plain CC0, licence pages checked) are searched too. StockSnap
  refuses automated requests; getting past that would mean posing as a
  browser, so it's only used for photos the owner links directly.
  Smithsonian/Met/Cleveland aren't reachable and are mostly artworks.
- **Left out:** photos of artworks or installations (the artwork keeps
  its own copyright), architecture models, recognisable people.
- **Blocked hosts:** StockSnap, Flickr images, rawpixel, pxhere and
  Pexels return 403 from this environment's network, so they were not
  searched. Openverse's API was too slow to use.
- **Sizes:** at most 1920 px (under Crust's 2400 px),
  about 90–650 KB each; publishing makes 480/960/1440 copies for srcset.
- **Snapshot** https://claude.ai/artifact/FksfsnM6msMtjBu4v5YHDm
  (`design/f052-harbour-rework-v1.html`): A Daylight (recommended, light
  hero under the 55% paper veil, rhythm on paper and sand, one dark
  band) and B Shoreline (dark 65% veil over the river photo, green
  statement band, three dark bands). Waiting for the owner's pick.

## 2026-10-31 — Harbour rework, F052 (owner)

- The owner: "I think our first template should be this good at minimal"
  (YOOtheme Fuse demo). Claude's comparison: Fuse feels premium mainly
  because of (1) photography doing the work (full-width hero photo with
  the headline over it), (2) rhythm (mixed-ratio images, text-only
  statement bands), (3) few words and quiet links, (4) real-business
  cues (latest posts, careers line). Harbour has a flat colour hero,
  geometric stand-ins, even sections and instruction-heavy copy.
- Owner: rework yes (F052); photos "A but find the best ones":
  public-domain (CC0) photos, curated for quality. Not Unsplash/Pexels:
  their licences restrict redistributing photos inside a product that's
  sold (templates are planned for sale in Milestones 6–7).
- Fuse is a quality bar, not a design to copy: original layout,
  wording and photos.
- Crust can already do most of it (Section background photo + tint,
  Columns with uneven widths, Heading bands, Button "secondary" or
  rich-text links). Gaps, as proposals only: a header that sits
  transparently over the hero photo, and a "latest posts" block (see
  Proposals). No sliders: they need JavaScript and are hard to make
  accessible.

## 2026-10-31 — F049 Harbour (Claude, reversible)

- **Built from code, not by hand in the builder:**
  `scripts/starter-templates/starter.ts` describes the pages once; each
  template (Harbour now, Signal and Corner next) only changes the look,
  business name, headline and image colours. `npm run build:starters`
  writes `templates/<id>.crust`; a test fails if the committed file is
  out of date, so the file and its source can't drift.
- **Sample content is instructions, all marked Replace me.** "A short
  line on this service: what the client gets, how long it takes, and a
  starting price" tells the buyer what to write; fake copy could survive
  unnoticed. Unmarked: section headings that work as they are ("What we
  do", "Recent work") and page titles.
- **Stand-in images, not stock photos.** Flat compositions in the
  template's colours, generated as small PNGs (7 images, 67 KB for the
  whole template), described as "Stand-in image: replace with a photo
  of …". No licences to track, and nobody mistakes them for their own
  photos.
- **No contact strip on Contact** (it would point to the page you're
  on). The Services page got a "What we offer" h2 so the service cards
  (h3) don't skip a level; the template check caught it.
- With a template in `templates/`, `npm run check:template` and the CI
  job now check Harbour instead of the sample site.

## 2026-10-31 — Three starter templates (owner)

- The F049 snapshot (https://claude.ai/artifact/JFfJLZ3Va9hoPNkdwUeFnH)
  offered A Harbour, B Signal and C Corner, with A recommended. The owner
  asked "why not 3 of them?" and, after the trade-offs (about three times
  the content and checking), answered "All three". Added as F050 (Signal)
  and F051 (Corner); F049 is Harbour, built first as the reference the
  other two reuse (same pages, same Replace me wording, their own look,
  business name and photos).

## 2026-10-31 — F048 Start from a template (Claude, reversible)

- **Direction A of the design snapshot** (its own screen, `#/templates`;
  https://claude.ai/artifact/JQoY8bbRJ9U58jZawRx2kV). The choice is
  visual, so the preview gets the full width; a dialog (B) squeezes the
  desktop view and nests the confirm question inside another dialog. The
  owner can still pick B or C.
- **Where templates come from:** `templates/*.crust` in the repo (F049's
  starter goes there, checked by `check:template` in CI), the sample site
  the builder ships with, and any `.crust` file opened from the computer.
  Every one goes through `readTemplate` first.
- **What applying replaces and keeps.** Replaced: every page, blog post
  and linked section, the blog's title, Site settings' style, header,
  footer and language (the pages are written in it). Kept: the site's
  name and address, the photo library (the template's photos are added;
  same-name files are replaced and the question names them), My layouts
  (the template's are added), and the live site until Publish. Redirects
  to pages that no longer exist are dropped. Replace me marks stay, so
  the F046 checklist and publish stop guide what to fill in.
- **One commit, so undo is exact.** Photos go first, a few per request
  (Cloudflare caps a function's requests to GitHub), as "Add photos from
  template" commits; then everything else is one "Start from template"
  commit. "Bring back my previous site" (Pages screen) undoes only the
  latest such commit, by putting back the earlier version of exactly the
  files it changed (Git blobs, no re-upload). Photos stay in the library;
  edits made since to those same files are replaced, and the question
  says so. Asking once with specifics plus undo (Nielsen #5 and #3) rather
  than a typed confirmation.
- **The server checks again.** It doesn't trust the browser's template
  check: every page, section, post, layout and the new Site settings go
  through the same checks as the save endpoints.
- **Browser drafts are set aside, not lost.** Page and post drafts only
  in this browser would win over the template's pages, so they're kept
  aside and come back with the previous site.
- **Preview links (no GitHub):** the template replaces the site in this
  browser only (the same set-aside mechanism). Its photos can't be kept
  there (no library, too big for browser storage); the question says so.
- No content format change.

## 2026-10-30 — F047 Template quality check (Claude, reversible)

- **One command, many templates.** `npm run check:template` checks every
  `templates/*.crust` in the repo (where F049's starter template will
  live), or given files (`npm run check:template -- my.crust`). With no
  templates yet it packs the sample site in `content/` the same way Site
  settings → Template does, so the CI job always checks something real.
- **It reuses the real publish path, not a copy of it.** The template is
  unpacked into a content folder and goes through the same renderer and
  crust-publish as a real publish, so "one h1, heading order, alt text,
  titles" are exactly the rules that would stop a publish. axe and
  Lighthouse run through one shared helper (`scripts/site-audit.mjs`) that
  `check:a11y` and `check:perf` now use too.
- **Replace me marks are expected, unmarked filler fails.** A template is
  supposed to have marks (that's how a buyer learns what to replace), so
  the check lists them as a note and publishes with them taken off, the
  way a buyer's site would look once filled in. What fails is filler
  nobody marked: lorem ipsum, TODO/TBD, "[Your …]", `{{…}}`, and stand-in
  photo services (picsum, placehold.co…), anywhere on pages, posts,
  linked sections, header, footer, titles. Marked fields and saved
  layouts are skipped (layouts are filled in after inserting). "Nothing
  marked" is a note, not a failure: a template made of real content is
  fine.
- **Contrast is checked per section style as the renderer resolves it:**
  text, muted text, links and button label at 4.5:1 (WCAG 1.4.3), solid
  and inverse buttons against their section at 3:1 (1.4.11). Soft buttons
  are a deliberate low-contrast tint, identified by their label, so they
  have no 3:1 edge rule.
- **Three widths:** desktop 1280, tablet 768, phone 375, on every page and
  every saved layout. Serious and critical axe findings fail; minor ones
  are counted as notes.
- **The report** is one HTML page (`dist/template-check/index.html`), a
  card per template and a row per check, each with a one-line "why it
  matters". In CI it's the **template-check-report** download on the run,
  and the failures are on the job's summary page.

## 2026-10-30 — F046 Placeholder content (Claude, reversible)

- **The mark is per field, on the block: `placeholder: ["title", "imageSrc"]`.**
  Optional, so no migration (pages without it read and publish exactly as
  before). Per field rather than per block because a Card can have your
  own title but still the template's photo; a block-level flag would clear
  both at once and let the sample photo through.
- **Which fields can be marked** is a short list per block
  (`markableFields`): words (headings, text, button text, quote, name,
  role) and photos. Lists (a Grid's cards, a Gallery's photos, questions,
  logos) are marked as a whole.
- **Replacing clears the mark by itself; lists need "Keep as is".** Editing
  a marked heading or swapping a marked photo removes that field's mark
  (recognition over recall: no extra step to remember). Changing one card
  in a list doesn't replace the others, so a list stays marked until you
  press "Keep as is". A false stop costs one click; a leaked sample photo
  on a live site is what this feature exists to prevent. Undo brings a
  mark back with its old content.
- **Marking lives in the Advanced tab ("Replace me" checkboxes).** Only
  template makers mark things, rarely; everyone else meets marks as a
  dashed amber outline with a "Replace me: …" label on the canvas, and a
  **To replace** button in the builder's top bar (only shown when there's
  something left). Its list has **Show** (selects the block) and **Keep
  as is** for each item. Error prevention (Nielsen #5) and visibility of
  system status (#1).
- **Two gates when publishing.** The Pages screen counts what's left on
  each page ("3 things to replace") and the Publish panel holds the
  button with a list of pages and links, instead of letting a publish run
  for three minutes and fail. The real gate is in the publish step: the
  renderer writes `data-crust-placeholder="Heading “Your studio” (text)"`
  on marked blocks and crust-publish refuses any page that has one, with
  that plain-language list. That also covers posts and linked sections,
  which the Pages count doesn't include yet.
- **Colours:** amber #b45309 for the outline and labels (white text on it
  5.0:1; the outline is 5.0:1 on white, 3.5:1 on near-black). On the
  green primary style amber alone is too faint, so a 2px white halo sits
  inside the dashes (the double-ring trick used for focus rings). The
  label carries the meaning too, not colour alone.
- **Not included:** header/footer text (logo, menu) can't be marked yet;
  the template's own sample site name is the obvious candidate if F049
  needs it.

## 2026-10-30 — F045 Save a site as a template (Claude, reversible)

- **Its own format, `crust-template`, not theme pack v2.** A theme pack is
  a look you mix into a site; a template is a whole site you start from.
  Keeping them apart means a theme pack import can never replace pages by
  surprise, and each file's error message can say what it is ("This file
  is a theme pack, not a whole-site template"). Both use `.crust`.
- **One JSON file, photos inside as base64.** No zip library, one thing to
  check, and the same reader works in the browser and in the template
  check (F047). Cost: base64 is a third bigger. Only photos the template
  uses go in (at most 60, each at most 8 MB and 2400 px, like uploads), so
  a typical template stays a few MB. Limit: 60 MB per file.
- **The browser builds the file, not the server.** It reads the saved site
  through the same calls the builder already uses (pages, linked sections,
  posts, photo library, `/media/<file>`). Cloudflare's free plan gives a
  server function about 10 ms of work, too little to pack photos.
- **What goes in:** style, header and footer (with menus), pages, linked
  sections, saved layouts, blog and posts, used photos, site name and
  language. **Not:** the site address, redirects, history or anything
  in the browser only. Site settings changes count as they're shown on
  screen (like the theme pack); page drafts kept only in the browser
  don't, and the screen says so.
- **A file only downloads if Crust can read it back.** The builder runs
  the template reader on what it made; if the site isn't template-ready
  (no Home page, a style failing contrast, a photo used but missing from
  the library) it lists every reason and downloads nothing. Error
  prevention: catch it when it's made, not when a buyer opens it.
- **Where:** Site settings → **Template** (menu label), heading "Save as
  template". The menu item isn't called "Save as template" because the
  action button is, and two controls with one name confuse screen readers.
- **On preview links** (no GitHub), the template holds the sample site
  that comes with the builder, and the screen says so, so the owner can
  try it there.

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

## 2026-10-30 — F043 Linked sections (Claude, reversible; owner: "keep on continuing")

- **Design snapshot:** `design/f043-linked-sections-v1.html`
  (https://claude.ai/artifact/DSXzme9pbKie3guoRpSizj). Claude built its
  recommended direction **A, its own editor**: on a page a linked section
  is one block (dashed frame and a label, builder only); its panel lists
  the pages using it and offers Edit linked section and Unlink here.
  Direction B (edit in place) can still be chosen before the PR merges.
  Why A: a typo fix on one page can't silently change four, and "Save for
  all 4 pages" says exactly what saving does.
- **Format change (contract, see docs/spec.md):** `content/sections/<id>.json`
  plus a `LinkedSection` block (`section`: the id). Additive: pages
  without it are unchanged, so no migration of existing pages.
- **Publishing:** the renderer builds the section's current blocks into
  each page before rendering, so search, sitemap, heading and axe checks
  see the real content. Ids are made unique per use; the link's own
  Hide on and anchor apply to the first block. A missing section stops
  the publish with the page's name, rather than quietly dropping it.
- **Rules:** no h1 inside (an h1 becomes an h2 when made linked; every
  page has its own); no linked section inside another; delete only when
  no page or post uses it (the error names them). Renaming a page updates
  links inside linked sections in the same commit (F018). Linked
  sections changed since the last publish are listed in the Publish
  panel ("Linked section “Contact strip”: edited").
- **Making one:** "Make linked" on a selected Section's toolbar, next to
  Save as layout; the name starts as the section's heading. The page
  then holds the link (save the page to keep it). Inserting from Layouts
  → Linked adds a link, not a copy. Not offered inside a section's own
  editor.
- **Its own editor** (`#/section?id=…&from=…`): the same builder with
  only the section, no page title fields; the save button says "Save for
  all N pages". Back with unsaved changes warns once, then leaves.
- **Before GitHub is switched on**, linked sections are kept in this
  browser, like My layouts.
- **Stacked:** this branch builds on F041 (gallery previews) and F042
  (rich text in the sections' Text blocks). Merge order F041, F042, F043.
- **Not yet:** Quick edit (phone) shows a page's own words only; a
  linked section is edited in the full builder. Theme packs (F033) don't
  export linked sections.

## 2026-10-30 — F042 Rich text in Text blocks (Claude, reversible; owner: "keep on continuing")

- **Design snapshot:** `design/f042-rich-text-v1.html`
  (https://claude.ai/artifact/1d1Ujx7ENSrGCef6CWfg9Z). Claude built its
  recommended direction **A, toolbar on the Text field** (builder panel
  and Quick edit), because the owner asked to keep going. Direction B
  (type on the canvas, floating toolbar) can still be chosen before the
  PR merges, or added later on top of A (same saved format).
- **Editor: Lexical (MIT, free)**, as the spec planned. Puck's own rich
  text field saves HTML, which the rules don't allow. Lexical only loads
  in the builder; published pages stay plain HTML with no JavaScript.
- **Format change (contract, see docs/spec.md):** a Text block's `text`
  is now `{ "rich": 1, "blocks": [...] }`: paragraphs (`p`) and lists
  (`ul`, `ol`), each a list of spans with optional `bold`, `italic` and
  `href`. Crust's own small format, not Lexical's state, so the files
  don't depend on the editor's version.
- **Migration:** older pages hold a plain string. Every reader accepts
  both (`toRichText`), so old pages publish exactly as before;
  `migrateRichText` converts a page's (or post's, or saved layout's) Text
  blocks when it's opened in the builder, so it's saved in the new format
  next time. Content files in the repo aren't rewritten in this PR, so
  nothing clashes with edits made in the builder meanwhile.
- **What's in:** bold, italic, links, bulleted and numbered lists (one
  level; nested items are flattened), line breaks with Shift+Enter.
  **Left out on purpose:** underline (reads as a link), colours, sizes,
  headings inside text (heading checks need them as blocks), tables.
- **Links:** allowed only when `safeUrl` keeps them as they are (page
  paths, `https://`, `mailto:`, `tel:`, `#anchor`). Checked in the link
  form, again by the server on save (pages, posts, layouts), in theme
  packs, and `safeUrl` again when rendering. Renaming a page updates
  links in text (F018). Published links use the section's accent colour
  and are always underlined, so colour isn't the only cue (WCAG 1.4.1);
  axe checks them on every section style in every preset.
- **Keyboard:** ⌘B / ⌘I, ⌘K (link), ⌘⇧8 / ⌘⇧7 (lists, as in Google
  Docs), "- " / "1. " to start a list. The toolbar is one Tab stop
  (WAI-ARIA toolbar, arrow keys), buttons say their state with
  `aria-pressed` and their shortcut in their name. Shortcuts typed in the
  editor stay there: Puck's own ⌘Z (page undo) and ⌘I (preview
  interactions) would otherwise fire too.
- **Typing is never overwritten:** the builder echoes each change back,
  sometimes a few keystrokes late (page settings resolve after each
  change). While the field has focus it's the source of truth; outside
  changes (another block, builder undo) apply when it doesn't.
- **Builder axe check** now also selects a Text block, so the editor and
  toolbar are checked.

## 2026-10-30 — F041 Layouts for the new blocks (Claude, reversible; owner: "keep on continuing")

- **Six section layouts**, one per block family the owner named:
  - Features grid (Grid, 6 cards, 3 columns)
  - Photo gallery (Gallery, 6 square photos)
  - Logo strip ("Trusted by teams at" + Logo row, 5 logos, grey until hovered)
  - Testimonial (large centred Quote, photo optional)
  - Questions to open (Accordion, 4 questions, all closed)
  - Contact form (details with an Icon list beside the Contact form)
- **Two new categories, Gallery and Logos.** The others fit existing
  ones (Features, Testimonials, FAQ, Contact).
- **No design snapshot:** these reuse the blocks and section styles as
  they are, like F026's layouts; the gallery cards are the preview.
- **Photos and logos start empty, alt text too.** No sample pictures
  (they'd be someone else's or need hosting), and no made-up
  descriptions that could outlive the photo. Empty slots publish as
  nothing; a photo added without a description has no alt, so the
  publish check stops it.
- **Gallery cards preview empty slots as grey boxes** (`renderPreview`,
  the blocks as the builder draws them), so the gallery and logo cards
  don't look blank. Publishing is unchanged.
- **Whole-page layouts unchanged** (F026 is finished work); e.g. the
  Contact page could use the new Contact form layout if the owner wants.
  See Proposals.

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

## 2026-11-01 — F057 Several sites (Claude, reversible)

- **Direction A of the snapshot** (https://claude.ai/artifact/7nKCuGhkAuhTJ5gMEXxfw3,
  `design/f057-several-sites-v1.html`): a Sites screen built from the
  Pages screen's parts, reached by "All sites" at the start of the Pages
  header. Switching is rare compared with editing, so it costs one click
  instead of space on every screen. Wording follows the Pages screen:
  "Restore" (not "Bring back"), "Keep site / Delete site".
- **A site is a folder; its id is the folder's name.** The Crust folder
  is `Documents/Crust` (F055's "My site" stays the first site, so
  existing setups keep working). Folder names are made safe for Mac and
  Windows (no `/\:*?"<>|`, no leading dot, no trailing dot or space, no
  CON/PRN/…), and case-insensitively unique ("Bakery 2"). The open site
  is remembered in `Crust/.sites.json`. `CRUST_SITE_FOLDER` still opens
  one folder; its neighbours become the other sites.
- **Names change through each site's history.** Rename and Duplicate
  write `content/site.json` with a commit in that site's own `.crust`
  history (the file commands take an optional `site`), then Rust moves
  the folder. Renaming or deleting the open site reloads the builder,
  because the site's name is read once at start.
- **Duplicate copies everything but publish settings**: the whole
  folder including history, minus `.crust/published` (and the future
  `.crust/hosts.json` of F058); the copy's `baseUrl` is reset to the
  placeholder so it can't publish over the original's domain. Per-site
  publish settings for F058/F059 belong in the site's `.crust` folder.
- **Recently deleted** is `Crust/.Recently deleted/<folder>`, with
  `.crust/deleted.json` (name, time) inside. Folders older than 30 days
  are removed when the list is read; folders without that note (put
  there by hand) are never removed. Deleting the open site opens the most
  recently edited other one, or a new empty "My site". No "delete now"
  button: nothing is removed before its 30 days (can be added if asked).
- **Duplicate site names are refused** in the dialogs (case-insensitive),
  so two rows never look the same; folder numbering is the backstop.

## 2026-11-01 — F058 Publish to Cloudflare Pages or Netlify (Claude, reversible)

- **Direction A of the snapshot** (https://claude.ai/artifact/DMXMZc8NdDTNRXSFEBBuah,
  `design/f058-publish-to-host-v1.html`): connect inside the Publish
  card. The two hosts are visible before anything is set up
  (recognition over recall); connecting happens where publishing does;
  a guided two-step dialog (token, then address) beats a bare settings
  form, and checks the token at step 1 so mistakes show early. Once
  connected, Publish is the primary button; Export and Preview move
  under "Or keep it on this computer".
- **Where things are kept.** `.crust/hosts.json` in the site folder
  holds host, account, project, address, last published, and the *name*
  of a keychain entry; the token itself is in the system keychain
  (service "Crust"). F057 already leaves `hosts.json` out of duplicates.
  Reconnecting or disconnecting deletes the old token from the keychain.
  Deleting a site leaves its token in the keychain (the site can be
  restored for 30 days).
- **Libraries** (all MIT/Apache/BSD/ISC): `ureq` 3 (HTTPS client) with
  `rustls` + `ring` and the computer's own certificate store
  (`rustls-platform-verifier`, so no bundled certificate list; the
  bundled one, webpki-roots, is CDLA-Permissive and was left out);
  `keyring` 3 (Mac Keychain, Windows Credential Manager; on Linux the
  kernel keyring, which forgets on restart, fine since Linux isn't an
  installer target); `blake3` (pure Rust) and `sha1_smol` for the hosts'
  file hashes; `base64`. `ring` is "Apache-2.0 AND ISC".
- **How uploads work.** Cloudflare Pages: the same direct-upload API its
  own tool (wrangler) uses: upload token, ask which file hashes are
  missing, upload only those (≤ 500 files / ~30 MB per request), then a
  deployment with the manifest plus `_redirects`/`_headers`. Netlify:
  file-digest deploy (SHA-1 per file), upload only the files it asks
  for, then wait until the deploy is "ready". Both mean re-publishing
  sends only changed files. Production branch "main" for new Cloudflare
  projects. A connect with an existing project name in the person's own
  account publishes into it.
- **Cloudflare needs only the token**: the account comes from the token
  (`GET /accounts`); with several accounts the dialog asks which one.
  Token steps ask for Account · Cloudflare Pages · Edit; Netlify uses a
  personal access token.
- **Site address.** If the site's own address isn't set, publishing to a
  host uses the host's address for canonical links and the sitemap, and
  the card says so. A set address (own domain) always wins.
- **Error kinds** shown by the card: token (wrong or expired: "Paste a
  new token"), taken (offers name-2), name, gone (project deleted on the
  host: "Connect again"), offline ("Nothing on the live site changed"),
  problems (the same page checks as Export), other (the host's own
  words and code).
- **Tests** never touch a real host: a fake Cloudflare/Netlify server on
  127.0.0.1 in `crates/crust-desktop/src/hosts/tests.rs`. The builder
  accessibility check now also runs the app's Publish card and dialogs
  in a browser with `scripts/fake-tauri.js` standing in for the app.
- **CI time limit 35 → 45 minutes.** The `check` job took ~30 of 35
  minutes on #48 and F058 adds rustls/ring to compile. The limit is a
  ceiling; it costs nothing unless a run actually takes longer (Linux
  minutes count 1×). If runs creep past ~35, better `target/` caching is
  the next step.
- **Not tested against the real hosts** from here (no account, and
  tokens are the owner's). The API calls follow the hosts' public docs
  and wrangler's upload format; the owner's first real publish is the
  real test. Logged so a failure there is expected to be small (a field
  name), not a design problem.

## 2026-11-01 — F059 Publish by FTP or SFTP (Claude, reversible)

- **Where it lives.** A third button in the app's Publish card, "Your
  own web host · FTP or SFTP", next to Cloudflare Pages and Netlify.
  No design snapshot (the feature doesn't ask for one); it follows
  F058's direction A. One form, not steps: hosts hand out these details
  together (welcome email or control panel), so splitting them adds
  clicks without lowering the load. Order follows that email: how to
  send files, server and port, username, password, folder, site address.
- **SFTP first and recommended, then FTPS, then FTP.** Plain FTP works
  but the dialog shows a warning box when it's chosen, and the card
  keeps a one-line "⚠ Plain FTP: your password and files travel
  unencrypted" while connected (F059: "warns"). No extra "I understand"
  checkbox: the warning is visible at the moment of choosing and stays
  visible after, which informs without adding a step.
- **Only changed files.** `.crust/ftp-sent.json` remembers each file's
  hash for one server + username + folder ("target"). Publishing sends
  new or changed files, makes missing folders first, sends photos and
  other files before pages (a page never points at a photo that isn't
  there yet), then removes files Crust sent before that the site no
  longer has. Files Crust never sent (a host's own files, a
  verification file) are never touched. The memory is saved after a
  failed publish too, so publishing again carries on. Another server or
  folder starts over (sends everything, removes nothing). "Send every
  file next time" (Change dialog) clears it, for when files were
  changed on the server by hand. Left out of duplicates (F057) and
  cleared on disconnect.
- **Checks when connecting.** Crust signs in, writes a small
  `.crust-check` file in the folder and removes it, so a wrong folder or
  missing permission shows at once under the Folder field. Errors land
  under the field they're about (server/port unreachable → Server;
  login refused → Password; folder → Folder).
- **SFTP server key.** The key's SHA-256 fingerprint is remembered when
  connecting (trust on first use, like FTP apps do) and shown in the
  Change dialog. If it changes, publishing stops before anything is
  sent and says why (host moved servers, or someone pretending); "Check
  the server details" re-connects and trusts the new key. SFTP signs in
  by password, and by keyboard-interactive with the same password
  (many hosts only offer that). SSH key files aren't supported yet.
- **FTPS** is explicit TLS on the usual port (AUTH TLS), checked against
  the computer's own certificate store; a certificate for another name
  is refused with a hint to use the host's FTPS server name or SFTP.
  Implicit FTPS (port 990) is left out (deprecated, rare).
- **Site address** is typed in the form (https:// added if missing,
  nothing after the domain, http:// allowed for hosts without HTTPS).
  It's used like F058's host address: canonical links and the sitemap
  use it unless Site settings has its own address.
- **`_redirects` and `_headers` aren't uploaded** (only Cloudflare reads
  them). Redirects on FTP hosts are a proposal (`.htaccess`).
- **Libraries** (all permissive): `suppaftp` 12 (MIT OR Apache-2.0,
  rustls + ring like ureq), `russh` 0.65 + `russh-sftp` 3 (Apache-2.0,
  ring, pure Rust: no OpenSSL/libssh2 to build on Mac/Windows),
  `rustls` + `rustls-platform-verifier` (already in via ureq), `tokio`
  (already in via Tauri). russh's `rsa` feature stays on so servers
  with RSA keys work; the `rsa` crate's known timing issue
  (RUSTSEC-2023-0071) is about using an RSA private key, which Crust
  never does (it only checks a server's signature). Test-only:
  `libunftp` + `unftp-sbe-fs` + `unftp-core` (Apache-2.0, a real FTP/FTPS
  server inside the tests), `rcgen` (test certificates), `async-trait`.
  137 new packages in Cargo.lock, all MIT/Apache/BSD/ISC (`ring` is
  "Apache-2.0 AND ISC", `winx` test-only "Apache-2.0 WITH
  LLVM-exception").
- **Tests against real servers in CI** (F059: "tested against a local
  test server"): `cargo test` starts an FTP server (libunftp), an FTPS
  one (with a test certificate authority) and an SFTP server (russh's
  server side with a small file handler) on 127.0.0.1, so CI needs no
  service containers. Never tried against a real host here.
- **Also fixed** in the shared Change dialog: its text was split into
  fragments on separate lines (a grid around mixed text); now two
  sentences. Affects F058's version too.
- **FTPS that breaks off is tried again (CI fix, 2026-11-01).** CI's
  FTPS test failed about one run in five: the test server (libunftp)
  answers "234" to AUTH TLS and switches to TLS a moment later, so a
  quick client's first TLS bytes can be read as a command and answered
  in plain text ("InvalidContentType"). Real hosts using libunftp can
  do the same. Crust now tries a secure connection that broke off up to
  three times (not a refused certificate, which still stops at once),
  and no longer calls that a certificate problem. 0 failures in 100
  local runs (8 in 40 before).

## 2026-11-01 — F060 First run (Claude, reversible)

- **Direction A of the snapshot** (https://claude.ai/artifact/Lx5SeC9B1GmSN3ztFebA3t,
  `design/f060-first-run-v1.html`): one welcome screen with both choices
  (start from, name) and one button, "Make my site". Not a wizard: two
  decisions don't need Back/Next, and seeing both at once is recognition
  over recall. Not the empty Sites screen: it opens on a list with
  nothing in it.
- **When it shows.** Only for a brand new Crust: the open site has no
  settings, it's the only site, it has no pages, and nothing was ever
  deleted (`isFirstRun`). Deleting every site still gives an empty "My
  site" that starts blank, as before. If the app can't list its sites,
  it starts blank too (no welcome screen rather than a wrong one).
  Quitting halfway shows the welcome screen again next time, because
  nothing was written yet.
- **What "Make my site" does:** writes the blank site (settings + Home)
  under the chosen name, renames the folder to match (`sites_rename`),
  then applies the template through the same API steps as Pages → Start
  from a template (photos, then pages). Then the window reloads into the
  builder on Home with "To replace" open and focus on its heading (a
  one-time flag in sessionStorage, `first-run/arrival.ts`). A blank
  start lands on Home with no list. Running it again after a failure is
  safe.
- **Name field** suggests the template's own site name ("Harbour
  Studio") or "My site", so Enter alone works; once the person types,
  picking another start keeps their name.
- **Starters only** (Harbour, Signal, Corner in that order), not the
  builder's sample site, plus Blank. No page-by-page preview here; it's
  in Start from a template any time later.
- **The app's own error words.** The site folder's errors (from the Rust
  side, e.g. "The disk is full.") now reach the builder as they are;
  before, they showed as "Couldn't reach GitHub" (`tauri-folder.ts`).
- **Template look not kept in the window.** After a template first run,
  the window's working copy of colours and header/footer is cleared:
  the look is in the site's settings already, and that copy is shared by
  every site in the app (see the proposal "Browser copies in the app").
- **The window self-check** (CI) now goes through the welcome screen
  first: Blank, a new name, Make my site, and checks the builder opens
  on the new site. Tried once by hand with Harbour in the real window:
  photos added, builder on Home, "To replace" open with focus on its
  heading.
- **CI's self-check gets a Crust folder of its own.** CI pointed the app
  at `$RUNNER_TEMP/crust-site`, so its "Crust folder" was the runner's
  temp folder, full of other folders that count as sites; the welcome
  screen rightly stayed away and the check failed. Now
  `$RUNNER_TEMP/crust-home/crust-site` (reproduced and checked locally).
- **Leftover:** the "Adding photos (3 of 10)" line can pause for a
  moment while large photos are prepared (the same as Start from a
  template).

## 2026-11-02 — F061 Updates built in (Claude, reversible)

- **Tauri's updater** (`tauri-plugin-updater`, MIT OR Apache-2.0), driven
  from our own commands (`update_status`, `update_check`,
  `update_download`, `update_restart` in `src/updates.rs`). The plugin's
  own JavaScript commands aren't allowed in the window (no `updater:`
  permission), so only our code decides when to download and install.
- **Signed, and strict about it.** Every update is checked against the
  key's public half before it's kept, and `requireSignedVersion` is on: a
  signature must name the version the feed announces, so an old release
  can't be passed off as a new one. Tested with keys made in the tests
  and with a file signed by the real `tauri signer` (throwaway key; only
  its public half and the signature are in the test).
- **No key, no updates.** The public half is built in at release time
  (repository variable `CRUST_UPDATE_PUBKEY`). A copy built without it
  never looks ("This copy of Crust doesn't update itself"). Test builds
  (debug) may point at another feed and key with `CRUST_UPDATE_URL` /
  `CRUST_UPDATE_PUBKEY` when they start; release builds can't be
  redirected that way.
- **When it looks:** 15 seconds after opening, then at most once a day
  (checked hourly while open; the last look is remembered in the
  window's storage). By itself it stays quiet when offline or up to date;
  "Check for updates" (Sites screen → Crust card) shows every outcome.
- **Download in the background, install on quit.** A found update
  downloads straight away; it's installed when Crust quits (Tauri's
  `RunEvent::Exit`), so the next opening is the new version, like
  browsers do. Why: an update never interrupts work (user control,
  Nielsen #3), and nothing has to be decided. "Restart now" is only a
  shortcut. On Windows the installer runs in passive mode (a small
  progress window). If Site settings has unsaved changes, "Restart now"
  says so first and turns into "Restart anyway" (it asks the page's own
  leave warning, so it can't drift from it).
- **Where it shows:** a banner on the Pages and Sites screens ("Crust
  0.2.0 is ready", Restart now / What's new / Later) and the Crust card
  on the Sites screen. Not over the builder: a floating notice there
  could cover what someone is working on or has focused (WCAG 2.2
  2.4.11), and it isn't needed because the update installs on quit
  anyway. "Later" hides it until the next opening; then the Crust card
  offers the buttons. The card's line is a polite live region (the
  screen keeps one `status`).
- **What's new** is plain lines (list marks and headings stripped, at
  most 20 lines of 300 characters), shown as a list in a dialog with the
  release date. Written per version in `crates/crust-desktop/whats-new.json`;
  releasing fails if the version has no entry.
- **Downloads site:** Cloudflare Pages project `crust-downloads` (free),
  because a private repository's releases can't be downloaded publicly.
  `scripts/updates-site.ts` makes `updates/latest.json` (Tauri's static
  feed format), `<version>/<files>`, a download page, and `_headers`
  (feed never cached). The "Desktop installers" workflow gained "Put on
  the downloads site" (off by default, only with both platforms, so
  every computer finds its update). If Cloudflare gives the project
  another address, the run stops and says to set `CRUST_UPDATE_FEED`.
  Cloudflare Pages takes files up to 25 MB; today's installers are well
  under, but a much bigger app would need another home for them.
- **The key:** a "Make update key" workflow (by hand, after typing
  "make a new key") makes it with the same Tauri tool version, masks the
  password, and hands the secret half over as a download that expires
  after a day; the owner pastes it into secrets (`docs/setup-updates.md`).
  The secret half never goes into the repository, the logs or chat.
- **Builds:** with the key secret set, the installer build adds
  `createUpdaterArtifacts` (the Mac `.app.tar.gz` and the Windows
  installer, each with a `.sig`); a secret without the public variable
  (or the other way round) stops the build with a plain message.
- **Not done:** the Linux AppImage/deb aren't on the downloads site
  (the installers workflow builds Mac and Windows only). Never tried
  end to end with a real release (needs the key and a ~150-minute
  installers run; the owner's call).

## 2026-11-02 — F062 Premium templates in the gallery (owner + Claude)

- **Direction A of the snapshot**, owner's pick ("I will go with your
  recommendation, which is A", 2026-11-02;
  https://claude.ai/artifact/B53eSPBXNaCJmAL6DNUeQs,
  `design/f062-premium-templates-v1.html`): the gallery shows **Free**
  first, then **Premium**, each a labelled group. The price is on every
  premium card. Why: the cost is known before a click (no surprise at
  the last step), and the free starters stay the gallery's main job.
- **Same preview screen.** A premium card opens the same layout as a free
  one (pages on the left, Desktop / Tablet / Phone on top), showing the
  store's pictures instead of the live template (the file isn't on the
  computer until bought). A page without a picture at a width says so.
  Long pictures scroll inside a box that takes keyboard focus.
- **Buying happens in the browser.** "Get this template · US$49" is a
  link (new tab on the web); in the app it goes through a new command,
  `open_link`, which opens only `https://` addresses. Screen readers hear
  "(opens in your browser)". "Already bought it? Open the file" in the
  preview opens a .crust file like "Open a template file…".
- **The catalogue** (`apps/admin/src/templates/catalogue.ts`, format in
  docs/spec.md) is read strictly: unknown fields dropped, secure links
  only (or the catalogue's own site), at most 60 templates and 12 pages
  each, a picture without a description isn't shown, a template with
  nothing to show is left out. Loaded each time the gallery opens, no
  cookies, 8-second limit. Offline: "Premium templates show here when
  you're online."
- **No store address yet.** `STORE_CATALOGUE_URL` is empty until the
  store exists (F063 sets it): an address nobody owns yet could serve
  anything. So today nothing extra shows. **Examples**:
  `#/templates?examples` loads a bundled example catalogue
  (`apps/admin/public/sample-catalogue/`, 480 KB, made by
  `scripts/sample-catalogue.mjs` from Harbour and Corner), marked
  "Examples: the Crust store isn't open yet", so the owner can try it.
  Its "Get this template" opens a page saying the store isn't open.
- **Premium cards are read out as "Olive, premium, US$49."** with the
  visible name first (axe: label-in-name, WCAG 2.5.3); the price chip is
  hidden from screen readers so it isn't read twice.
- **First run stays free.** The welcome screen gets one line: "More
  templates, including premium ones, are in Pages → Start from a
  template."
- Same gallery on the web admin and in the app.

## 2026-11-03 — Store milestone models confirmed (owner)

The owner confirmed the model plan for Milestone 7 as listed in
HANDOVER.md ("go ahead", 10:50 Jakarta): F063 Opus, F064 Sonnet, F065
Sonnet, F066 Opus, F067 Opus, F068 Opus. F063 starts at 11:15.

## 2026-11-03 — F063 Store site (Claude, reversible)

- **Snapshot** https://claude.ai/artifact/41A2H2RjXGJZTs3ubzRZQE
  (`design/f063-store-site-v1.html`). A built on all three choices; the
  owner hadn't picked when it was built.
  1. **Look: Showroom** (Style library Studio · Paper: white, near-black,
     Geist, mono labels). The templates are the product, so the store
     frames them and stays out of their way: a neutral frame never clashes
     with a warm (Harbour), dark (Signal) or cream (Corner) template, and
     neutral surroundings make an item's own colours easier to judge.
     Rejected: editorial paper and serif (competes with Harbour and
     Corner, two templates per screen), dark launch (washes out light
     templates, hides Signal, leads with the app instead of the templates).
  2. **Template page: pictures left, details beside them and kept in
     view** (Columns `sticky: 2`, F074; the details column has the surface
     style). The price and the next step stay one glance away while people
     look at the pictures. On phones the columns stack in reading order
     (pictures first), so a phone-only price line and button sit under
     the title instead (`hideOn` desktop and tablet); reordering the
     columns visually would make the focus order differ from what's seen
     (WCAG 2.4.3). Phone pictures sit in their own
     row underneath (a Gallery that opens larger), because a phone picture
     at a desktop column's width would be several screens tall.
  3. **Free templates listed like any other, labelled "Free with Crust".**
     The store is never empty (there are no premium templates yet), and
     people judge quality on templates they can try at no cost.
- **How it's made.** `store/list.json` (format `crust-store`, version 1)
  says what's for sale: id, template file, kind, price, the pages to show,
  and for a priced template a `buy` link and its `licence` (the list is
  refused without them, so a paid template can't be published without a
  way to buy it). `scripts/store/model.ts` writes the store's pages from
  that list and the template files (`npm run build:store` →
  `store/content/site.json` and `pages/`), so "What's included" is
  counted from the file and can't drift. The store's words aren't marked
  "to replace" (marks are taken off the kit's blocks).
- **Pictures** (`npm run store:pictures`, needs Chromium and cargo): each
  shown page published as a buyer would first publish it, then pictured
  at 1280 (1600 tall, window 800), 768 (1536, window 1024) and 390 wide
  (1170, window 844, at double sharpness like a phone screen; at single
  sharpness Harbour's opening photo looked blurred). Motion off, lazy
  photos scrolled into view first. 27 JPEGs in `store/content/media/`
  with descriptions and focus at the top, so crops keep the header.
- **Licence line for free templates**: "Free with Crust. Use it for as
  many sites as you like." The free starters are part of the free app;
  priced templates carry their own `licence` (F068 writes the full pages).
- **Download page** links to the downloads site
  (`https://crust-downloads.pages.dev`, F061). It only has files after the
  first "Desktop installers" run with "Put on the downloads site"
  (BLOCKED.md, update key).
- **Publishing**: new workflow "Publish store" (by hand only), Cloudflare
  Pages project `crust-store`, address `https://crust-store.pages.dev`.
  It stops if Cloudflare gives the project another address, rebuilds the
  pages and stops if the committed ones are out of date, runs
  crust-publish and axe, writes `catalogue.json`, then deploys. Same
  Cloudflare secrets as the site. The owner presses it (publishing is his
  call).
- **The app doesn't read the catalogue yet.** `STORE_CATALOGUE_ADDRESS`
  is the store's catalogue address; `STORE_CATALOGUE_URL` stays off. Why:
  the catalogue lists only priced templates and there are none, so
  reading it would show nothing, and until the store is first published
  the address isn't ours (anyone could claim `crust-store.pages.dev`).
  The store test fails as soon as `store/list.json` gets a price while it
  is still off, so it's switched on together with the first premium
  template, by then after the store is published.
- **Checks**: `check:a11y` and `check:perf` now also publish the store
  (`npm run publish:store` → `dist/store`) and run axe on every store
  page at desktop and phone width, and Lighthouse on its Home page.

## 2026-11-03 — F064 Live demos (Claude, reversible)

- **Snapshot `design/f064-demo-bar-v1.html`, A built:** a 48 px bar fixed to
  the bottom ("Live demo of Harbour · Free", Back to store, Get this
  template). B (strip at the top) scrolls away and collides with headers
  that sit on the opening photo; C (floating pill) has no room for the
  name or a way back. A sets its own colours (white on near-black), so any
  template's palette leaves it readable. The page gets bottom padding and
  scroll padding so the bar never hides the footer or a focused link
  (WCAG 2.4.11).
- **Under the store's address, not separate projects.** Published sites use
  addresses from the root, so `demoFiles` (scripts/store/demos.ts) moves
  every `href`, `src`, `srcset`, `action`, `url()` and the search page's
  index address into `/demos/<id>/`. Each demo gets its own Pagefind
  search index, built before the move; its results already carry the demo's
  folder (tried in a browser).
- **Demos are `noindex`, with no sitemap, robots or 404 of their own;**
  canonical and share addresses name the demo. Built after the store's own
  search index, so demos don't appear in the store's search.
- **Both bar links go to the store's template page**, which has the price,
  licence and, from F066, the buy button, so there is one place to change.
- Demo photos are made with marks off, like a buyer's first publish, and
  use the same photo cache as the store.

## 2026-11-03 — F065 Template versions (Claude, reversible)

- **Format change without a new format version.** Template files gain
  optional `id` and `release`; `format`/`version` stay `crust-template` / 1
  because older files must still open and a reader that ignores unknown
  fields loses nothing. No migration is needed: a file without them is
  simply "from before versions". The reader refuses a file that has only
  one of the two, or a malformed one (id: lowercase letters, numbers,
  dashes, up to 60; release: whole number 1–9999).
- **The release is a plain whole number** (1, 2, 3), not 1.2.3: the owner
  and buyers only need "is there a newer one", and it compares without
  rules.
- **The site remembers its template in `site.json` → `template`
  `{ id, version }`**, written by the same commit that applies the
  template, so "Bring back my previous site" restores the old record with
  the rest. Applying a template without an id removes the record, so the
  note never points at a template the site no longer uses. It is only
  recorded when saving to GitHub; the browser-only mode has no
  `site.json` to write to.
- **The catalogue carries `version` and `changes`** (optional). `version`
  comes from the template file; `changes` is written by the owner in
  `store/list.json` for the current release (1–5 lines). The store refuses
  a file listed under a different id, and a priced template whose file has
  no release (without one the app could never tell buyers about updates).
- **The note is quiet:** a section in the Templates screen (a heading, what
  changed, a link to the template's store page), not an alert or a badge
  elsewhere. It never changes the site: updating means downloading the new
  file from the store and using it, which replaces the site (existing
  confirm step). A merge of updates into a site the owner has since edited
  is out of scope; it needs the owner's decision first (Proposals).
- Only premium templates have catalogue entries, so only they get the
  note; free starters come with the app and update with it.

## 2026-11-03 — F066 Checkout (Claude, reversible; the provider is the owner's call)

Snapshot https://claude.ai/artifact/6QAvaWHcuU26fgCfCrZVdw
(`design/f066-checkout-v1.html`). Built A for both choices; the owner
hadn't picked.

- **Recommended provider: Polar** (merchant of record, 5% + US$0.50 per
  sale for new accounts, no monthly fee). Deciding facts: Indonesia is on
  Polar's own payout-country list (via Stripe Connect Express); its
  "checkout links" are plain links, so the store needs no script; a
  separate sandbox for test mode; `reference_id` on the link is copied to
  the order, which F067's Worker reads. **Lemon Squeezy** is also
  understood (same link idea, `checkout[custom][template]`), but Indonesian
  payouts weren't confirmed and new sign-ups were reported as invite-gated
  in 2026. **Paddle** left out: its checkout needs Paddle.js on the page or
  a server creating each transaction, and seller approval is manual. Fees
  are from the companies' pages and 2026 comparisons (searched
  2026-11-03); the owner checks them when opening the account.
- **The setting lives in `store/list.json`** as optional `"checkout":
  { "provider", "mode" }` (format stays `crust-store` / 1; missing means
  buy links are used as written, as in F063). Set now to Polar, test.
  With it, every buy link must be that company's link for that mode, so a
  sandbox link can't reach a live store or the other way round (Lemon
  Squeezy links look the same in both modes; its test mode is a store
  setting there).
- **Real payments need two things:** `"mode": "live"` and the owner's
  "Take real payments" switch on the Publish store workflow (off by
  default). `scripts/store/checkout-check.ts` runs before rendering and
  stops the publish when they disagree, or when something has a price but
  no checkout setting.
- **Test mode is said under each buy button** (bold "Test checkout.", no
  real payment, the test card), in reading order after the button, on
  desktop and in the phone summary. Live mode keeps only the quiet line
  "Secure checkout by Polar. Tax is added where it applies, and you get a
  receipt by email." Free templates' pages are unchanged.
- **`/thanks` page** (only once something has a price; `noindex`): where
  buyers land after paying. Its address is set as the "success URL" in
  the provider's dashboard (a link can't carry it). Its wording promises
  the emailed download link, which F067 builds; until then the store is
  test-only anyway, and the test version of the page says so.
- **Same tab, no `target="_blank"`**: going to checkout is the next step of
  one task, and the provider returns to `/thanks`.
- Not done here: the catalogue's buy flow in the app is unchanged (the
  app's "Get" opens the store page, which holds the button).

## 2026-11-03 — Faster sessions and a review round (owner: "Do B and build the review page for A, merge pr")

Page: https://claude.ai/artifact/XYA5nqaqQCfjb9oM6VuMq9.

- **PR #66 merged** (merge commit, CI green on 08aeb3c), at the owner's
  request. The session branch restarted from main. One PR per feature
  from now on (option C, follows from the merge).
- **B: start-up reading cut from ~45k to ~10k tokens.** Finished
  features' notes moved from HANDOVER.md (37 KB → ~9 KB) and PROGRESS.md
  (64 KB → ~4 KB) to `docs/archive/handover-history.md` and
  `docs/archive/progress-history.md`, unchanged. `npm run next`
  (`scripts/next-feature.ts`, tested) prints the next feature, its model
  from HANDOVER's model plan, its done_check, BLOCKED.md rows naming it,
  and the review queue, so features.json (63 KB) isn't read whole.
  CLAUDE.md's step 1 and 5 say so. docs/spec.md stays loaded with
  CLAUDE.md (the content contract is needed in most features).
- **A: review round page** `design/review-2026-11-03.html`
  (https://claude.ai/artifact/C3czUd4fpf5Qz6t2WqAkwZ): 26 features in
  five sittings, two steps to try each, Pass / Needs fixing and a note,
  saved in the page's database (`reviews`, one doc per feature id) so
  Claude reads the answers without the owner copying them. The owner's
  Pass is recorded as `reviewed: true`; a fix becomes rework only when
  he asks. Steps point to the session branch's preview admin, which
  can't save, so trying things never touches the real site. Desktop
  features (F055–F060) wait for installers (~150 Actions minutes, his
  call); store features wait for Publish store.
- **CI: site-checks limit 20 → 35 minutes.** On PR #67 the job finished
  every check (axe, Lighthouse, store, three demos) and was cancelled at
  exactly 20 minutes during cleanup. The store and demo builds added with
  F063/F064 put it at 13–20 minutes. Uses free Actions minutes only when
  the job really runs that long.

## 2026-11-03 — Token saving (owner: "do a, b and d")

Page: https://claude.ai/artifact/D2h2rdzR4iQU6dQv7TyWqV
(`design/token-saving-options.html`). Every step re-reads the whole
context, so cost follows the size of what's carried. Graphify (C) not
adopted: features are well pointed by HANDOVER.md, and a fresh cloud
container would have to install and rebuild it each session.

- **A: slim start.** CLAUDE.md no longer auto-loads docs/spec.md (~6k
  tokens on every step); the `crust-content-format` skill says how to read
  the part needed. Session routines moved to project skills
  `.claude/skills/crust-start`, `crust-lean`, `crust-finish` (content
  unchanged, from CLAUDE.md and HANDOVER.md "How sessions work", "The
  owner", "Rules that always apply"). CLAUDE.md names the skill files so
  they work even if the skill list doesn't show them.
- **B: lean work.** `crust-lean`: Explore agents for wide searches,
  `scripts/verify.sh` (one line per check, log tail on failure, logs in
  `.crust-cache/verify/`), quiet `scripts/init.sh`, and a checkpoint
  (commit, Checkpoint section in HANDOVER.md, owner `/clear`s) when the
  context passes ~200k at a green point.
- **D: unused skill packs hidden for this project only.**
  `.claude/settings.json` `skillOverrides` sets 25 account skills
  (Office files, slides, Swift, banners, browser/computer use, …) and
  four built-ins (dataviz, claude-api, plugin-authoring,
  keybindings-help) to `user-invocable-only`: Claude no longer sees them
  listed, the owner can still type `/name`. Undo by deleting entries.

## 2026-11-03 — F067 Delivery and updates (Claude, reversible)

No design snapshot: the only screens are a plain email and a one-card
download page, styled to stay quiet (system font, card, one primary
button, light and dark). `needs_review` is false for this feature.

- **One Worker, `packages/delivery`**, routes `POST /webhook` and
  `GET /d/<link>` (page) and `/d/<link>/file` (download). Company and
  test/live mode come from `store/list.json` `checkout` at deploy, so the
  Worker and the buy buttons can't disagree.
- **Signatures.** Polar: Standard Webhooks (`webhook-id`,
  `webhook-timestamp`, `webhook-signature: v1,<base64>`), messages older or
  newer than 5 minutes refused. The key is the dashboard secret's own bytes
  (Polar's SDKs base64 it before Standard Webhooks); a `whsec_…` secret is
  also accepted. Lemon Squeezy: hex HMAC in `X-Signature`. Comparison is
  constant-time. **Not yet tried against a real Polar sandbox** (no
  account): the first real test may need a small fix in `readEvent`
  (fields read: `type`, `data.id`, `data.customer.email`,
  `data.metadata.reference_id`, refund `data.status === "refunded"`).
- **Workers KV keys:** `template:<id>` (name, release, changes) and
  `file:<id>` written by Publish store (`scripts/store/delivery-kv.ts
  upload`, skipped while nothing has a price; files before records, bulk
  requests under 60 MB); `order:<company>:<order id>` → `{token, emailed}`
  and `link:<token>` → `{template, order, company, test, at}` written by
  the Worker. **The buyer's email is not stored**: it's only used to send.
  Templates taken off sale keep their keys so buyers can still download.
- **Links:** 32 random bytes (43 URL-safe characters). Pages send
  `Referrer-Policy: no-referrer`, `noindex`, `no-store` and a strict CSP
  (no scripts). The file is served as an attachment named
  `<id>-release-<n>.crust`.
- **Repeats and failures:** one link per order; a repeated message sends
  nothing (200). If the email fails, the Worker answers 502 so the company
  retries, and the retry sends the same link. Two retries arriving at the
  same instant could send the email twice (KV isn't transactional);
  accepted, harmless.
- **Refunds:** only a full refund (`refunded`) switches the link off;
  partial refunds keep it.
- **Unknown template** in an order: 422, so it shows as failed in the
  company's webhook log for the owner to see.
- **Resend's free sender** only mails the account's own address: test
  orders work, real buyers need a verified domain (F044; BLOCKED.md).
- **Deploy:** `.github/workflows/delivery-worker.yml` (skips until
  `RESEND_API_KEY`, `DELIVERY_WEBHOOK_SECRET` and the Cloudflare secrets
  exist), creates the `crust-delivery` KV namespace when missing and puts
  its id into `wrangler.toml`. The Cloudflare token needs Workers KV
  Storage: Edit. Owner steps: docs/setup-delivery.md.
- **Also in this PR:** the FTPS desktop test that failed once on #68.
  Parallel FTP/FTPS test servers shared passive ports 50000–60000 inside
  Linux's ephemeral range; each test server now gets its own 400-port
  range from 20000 (below every OS's ephemeral ports). 10/10 runs pass.

## 2026-11-03 — Repository public for now (owner: "Made it public")

The free GitHub Actions time ran out ($13.75 of $12 used, budget $0), so
CI couldn't start. Options page: https://claude.ai/artifact/2HT771j6YsmYuDnQmhfkR8
(`design/ci-minutes-v1.html`). The owner chose D: make the repository
public (Actions free) and private again later. Before the switch the
history was scanned: no keys or passwords; commits use the GitHub
no-reply address.

- **No paid template files may be committed while it's public** (the three
  in `templates/` are free on the store). Premium templates wait until the
  repository is private again, or live in a separate private repository.
- **Before going private again:** make CI lighter (site-checks and
  template-check only when their files change, no duplicate runs after a
  merge, one push per feature), so it fits the $12 included each month.
- Copies made while public stay public; the owner accepted that.

## 2026-11-03 — F068 Licence, terms and refunds (Claude drafts; the wording is the owner's call)

Snapshot https://claude.ai/artifact/DAmwsHC4W4CcGXzH4DDCij
(`design/f068-legal-v1.html`). Built A on all three choices; the owner
hadn't picked. Not legal advice: the owner decides the wording and whether
a lawyer reads it (BLOCKED.md).

1. **Licence: one price, unlimited sites** (yours or clients'; no
   reselling or sharing the template file, no selling it as your own
   template). Nothing can enforce a per-site count on plain files, so
   tiers would mostly make honest agencies count; one button means no
   comparison at the moment of paying (Hick's law). Rejected for now:
   B Personal/Agency (two products and links per template, a picker,
   a store list format change, "what is one site"), C one site per
   purchase. An agency tier can be added later without changing what
   earlier buyers got. `LICENCE_SUMMARY` in `scripts/store/legal.ts` is
   the standard one-sentence `licence` for a priced template.
2. **Refunds: full refund within 14 days, any reason.** Polar may refund
   within 60 days on its own to head off chargebacks whatever the policy
   says, and keeps its fee on a refund (~US$2.95 on US$49), so a stricter
   rule (B: only if it doesn't work) mostly adds email work; 30 days (C)
   is long enough to build and publish a whole site. Matches F067: a full
   refund switches the download page off; published sites may stay up.
3. **Three short pages**, `/licence`, `/terms`, `/refunds` (not one
   "Legal" page, not inside Help): each link lands on the page it names,
   and the refund promise isn't buried. Linked from a footer column
   "Buying", "Read the full licence" under every template page's Licence
   (free ones too: the licence page covers free templates), the other
   legal pages, and a line under every buy button (desktop and the phone
   summary, after the test note and the payment line): "By buying you
   agree to the licence and terms. Not right for you? Full refund within
   14 days."
- **The owner's settings live in code** (`LEGAL` in
  `scripts/store/legal.ts`: `approved` date, `seller`, `contact`,
  `refundDays`), not in store/list.json, so the store list format is
  unchanged. Claude changes them only when the owner says so.
- **Draft safety:** until `approved` is set, each legal page starts with
  "Draft. This wording hasn't been approved yet…", and the Publish store
  checkout step (`legalGate` in `checkout-check.ts`) refuses live mode
  while the wording is unapproved or the seller or contact is missing.
  Test mode and a store with nothing priced are unaffected. Until then
  the terms say "the maker of Crust" and the refund page says "reply to
  your receipt email"; with a contact they link `mailto:`.
- The pages are always built (the licence covers free templates), so
  `store/content/pages/` gains three files. The Terms page names the
  payment company from the checkout setting, so the "committed as
  written" store test now builds with the checkout setting, as
  `build:store` does.

- **F071/F072 review fixes (2026-11-04, owner: "Fix F071 and F072 first").** From the pre-review audit: the Cover card's text body no longer grows, so title and text sit over the dark fade at the bottom, and its "Read more" link is 44px high; "Undo style" moved above the 12 looks, right under the intro, 44px high. Focus after Undo already moves to the current look or the heading (F069). Colourway dot size and the phone preview height were left alone (minor, owner's call).

- **F074/F084 review fixes (2026-11-04, owner: "Yes, go ahead").** A row with boxed columns leaves the same space below as between its boxes (`:has()`). Phones: a post list in "list" layout puts the photo above the title (≤30rem); a sticky header's top bar is hidden (≤40rem), since it took ~90px of every screen (Signal). Harbour's home hero tint Light → Medium: white text on it measures 6.2:1 (subtitle) and 6.7:1 (logo), was 3.9 and 4.5. Not done: Harbour/Signal Studio photos, stock-template devices (taste calls); desktop divider line strength (minor).

- **F078/F057/F062 review fixes (2026-11-04, owner: "Fix F078, F057 and F062 next").** F078: a table column of figures gets its heading right-aligned too; time ranges (10:00–16:00) don't wrap; on phones the first figure of each wrapped Stats row lines up (left-aligned stats); the "Most popular" badge is sentence case, 14px. F057: Sites row buttons and the site-name link are 44px high. F062: the "Open a template file" text wraps, the native file button is styled like the other buttons, and the Get button has a gap before its arrow. Not done: the video poster prompt (F078 minor, needs a new builder field: a proposal), Delete styled differently or an explicit Open button (F057 optional), moving "Open a template file" below the Premium group (F062; its note says "above").

- **F066/F068 review fixes (2026-11-04, owner: "Yes, fix F066 and F068").** F066: under a buy button the order is now button, the licence/refund line, the live demo link, then the small print (test note, "Secure checkout by …"); on priced templates the demo sits there instead of after the whole column. F068: legal page titles are normal-size headings (not Display). The section headings (h2) keep the store's dramatic type scale: shrinking them for three pages needs a per-heading size or a store-wide change, the owner's call. Terms explain "merchant of record". Not done: seller name and contact (owner adds them in `LEGAL` on approval), Thank-you page button gap, a larger phone price.

# Changelog

User-visible changes, newest first, in plain language.

## Unreleased

- **Save a site as a template (F045):** Site settings → **Template**.
  Give it a name and a short description, press **Save as template**,
  and the whole site downloads as one .crust file: pages, linked
  sections, saved layouts, blog, the photos they use, and the style,
  header and footer. Crust checks the file before it downloads, and
  lists anything that stops the site being a template (for example, no
  Home page). Starting a site from a template comes next.

- **Your own domain (F044):** Site settings has a new **Site address**
  group. Type your domain (like studio.com), save and publish: search
  results, the sitemap, link previews, the blog's RSS feed and the "Open
  live site" button all use it. Until the domain is connected in
  Cloudflare, publishing keeps using the free address and the Publish
  panel tells you so. Step-by-step guide: docs/setup-custom-domain.md.
- **Linked sections (F043):** make a section once and show it on many
  pages. Select a section and press **Make linked** on its toolbar; add
  it to other pages from **Layouts → Linked**. Selecting it shows which
  pages use it, with **Edit linked section** (its own screen: one save
  updates every page) and **Unlink here** (a normal copy on that page
  only). A linked section can't be deleted while a page still uses it.
- **Rich text in Text blocks (F042):** make words **bold** or *italic*,
  add links, and write bulleted or numbered lists. The Text field has a
  small toolbar, in the builder and in Quick edit on your phone, plus
  shortcuts: ⌘B, ⌘I, ⌘K for a link, ⌘⇧8 / ⌘⇧7 for lists, or type "- "
  or "1. " to start a list. Links are checked, so only page addresses,
  web, email and phone links are allowed, and renaming a page updates
  links in text too. Text you already wrote keeps looking the same.
- **Layouts for the new blocks (F041):** six more ready-made sections
  in Layouts: a Features grid, a Photo gallery, a Logo strip, a
  Testimonial, Questions that open (FAQ) and a Contact form beside your
  details. Two new categories, Gallery and Logos. Photo and logo spots
  show as grey boxes until you add your own, and each photo asks for a
  description before it can go live.
- **Builder tidy-up (F040):** a **Sign out** link on the Pages screen
  and in the builder's top bar (pages and posts). Nothing is lost when you sign out: your edits
  are already kept in the browser. Restoring a deleted page that had
  been renamed now brings back its old address too, so old links and
  bookmarks lead to it again. And the builder itself now passes the
  accessibility checks: the preview, the zoom menu and the loading
  spinner have names screen readers read out, and the "Layout" /
  "Content" headings in the block list are darker and easier to read.

- **Site search (F039):** your site now has a search page at /search/.
  Visitors type a word and see matching pages and posts, with the words
  highlighted. Add a "Search" link to your header in Site settings →
  Header & menu. Built when you publish; no server, no cost.

- **Quick edit on your phone (F038):** open a page on your phone and you
  get a simple form with its words, button labels and photos, in page
  order. Fix a typo or swap a photo, then press Save, or Save and
  publish. "Full builder" is one tap away if you need layout. On a
  computer, the builder has a "Quick edit" link too.

- **Contact form (F037):** a new Contact form block (block list → Forms).
  Visitors send you a message with their name, email and anything else
  you ask for; it arrives in your inbox, and spam is kept out. Works on
  any phone, even without JavaScript. It needs a one-time setup with
  free accounts before it can send (docs/setup-contact-form.md); until
  then the form says it isn't connected yet.

- **Search and sharing (F036):** in each page's settings, set the title
  people see in search results, a picture for when the link is shared,
  or hide the page from search engines. Live previews show how it will
  look in Google and in a chat message. Every page now shares nicely by
  default (title, description and address), and blog posts use their
  cover photo.

- **Blog (F035):** a new Posts screen (link next to Pages). Write news,
  notes or portfolio pieces in the builder, with a title, summary, date
  and cover photo. Your site gets a list of posts at /blog/, a page for
  each post, and an RSS feed so people can follow along. Rename the list
  page (e.g. "News") on the Posts screen, and add /blog to your menu in
  Site settings.

- **Media library (F034):** every image field now has "Choose image".
  Upload photos from your Mac or phone (button or drag and drop), find
  them again by searching, and pick one from a grid. Each photo needs a
  short description (alt text) before it can be used; it's filled into
  the block for you. Big photos are shrunk to 2400 px before upload, and
  hidden location details are removed. Photos are kept in GitHub next to
  your pages. On the published site, phones get smaller copies of each
  photo automatically. Pasting a web address still works.

- **Theme packs (F033):** Site settings → Theme pack. Download your
  site's look (style, header and footer look, My layouts) as one .crust
  file, and bring one into another Crust site. A pack is checked first
  (format and contrast) and shown in the preview; nothing changes until
  you choose "Use this theme", and the style still waits for Save.

- **More elements (F032):** seven new blocks.
  - **Grid of cards:** a row of cards (2–4 per row) you fill in one list.
  - **Gallery:** photos in a grid, square, wide or as uploaded, with
    captions.
  - **Accordion / FAQ:** questions that open to show the answer; choose
    to open the first one, or keep only one open at a time.
  - **Icon list:** lines with a check, arrow, star, dot, plus or heart.
  - **Logo row:** client or partner logos, optionally grey until hovered
    and linked.
  - **Quote:** a testimonial with name, role and photo.
  - **Image overlay:** a title, text and button on a photo, with a tint
    that keeps the text readable.
  - Repeating items (cards, photos, questions…) are edited in a list with
    arrow buttons to reorder, so it all works from the keyboard.

- **Header, footer and menu (F031):** Site settings has two new groups.
  **Header & menu:** your logo (name or image), a menu built from your
  pages (reorder with the arrow buttons), an optional button at the end,
  and "keep at the top while scrolling". On phones the menu folds into a
  Menu button that works without JavaScript. **Footer:** a short line
  about you, up to 4 columns of links, and a copyright line where {year}
  and {name} fill themselves in. Both show on every page, with a "Skip to
  content" link for keyboard users. Existing sites get a sensible header
  and footer automatically.

- **Content, Style and Advanced (F030):** each block's settings are split
  into three tabs at the top of the panel, so simple edits stay simple.
  Advanced holds Show on, spacing, and a new **anchor name**: name a
  block "team" and a button linking to #team jumps straight to it.

- **Per-device columns (F029):** a Columns block now has widths for
  desktop, tablet and phone, side by side in the panel (for example 2/3
  + 1/3 on desktop, stacked on phone). Click a device name to preview it.
- **Show on:** any block can be hidden on desktop, tablet or phone. In
  the builder it stays visible but faded and labelled, so you can still
  select it; visitors on that device don't see it. No JavaScript.

- **Style customizer (F028):** Site settings show one group at a time
  next to the preview, with new groups:
  - **Typography:** heading sizes (Subtle to Dramatic), weight and letter
    spacing.
  - **Buttons:** shape (Square, Rounded, Pill) and the main button
    (Solid, Outline or the new Soft).
  - **Cards:** Flat, Outline or Shadow. **Links:** Underline, Thick or
    Highlight (always underlined).
  - **9 presets** that set the whole look, including 4 new ones (Ocean,
    Studio, Paper, Night). One Undo takes a preset back.
  - Click a button, card or heading in the preview to jump to its
    settings. Your current site looks exactly the same until you change
    something.

- **My layouts (F027):** keep any section, or a whole page, to reuse.
  - Select a section and choose **Save as layout** on its toolbar. It's
    named after its heading; change the name if you like.
  - Open **Layouts → My layouts** to add one, or to save the whole page.
  - Rename or delete with the **⋯** button on each card. Saved layouts
    are copies: renaming or deleting one never changes your pages.
  - Saved to GitHub (content/layouts/); kept in this browser until saving
    to GitHub is switched on.

- **Layout library (F026):** 20 designed sections and 5 whole pages,
  ready to drop in.
  - Hover the page in the builder and click a **+** between sections, or
    use **Layouts** in the top bar (adds after the selected section).
  - A large gallery opens with **Sections / Whole pages**, categories and
    search. Previews show your own site style.
  - Everything uses your site style, so it matches straight away; a page
    keeps one main heading. One Undo takes it back out.
  - A new, empty page shows an **Add a layout** button in the middle.

- **Tooltips on icon buttons in the builder** (Duplicate, Delete, Select
  parent, the move arrows, the style dots): they show on hover and on
  keyboard focus, and Escape closes them.

- **Section styles (F025):** sections can be Page, Muted, Primary or Dark,
  with a height (Auto to Full screen), content position, and a background
  image with a tint that keeps text readable.
  - Pick them from picture tiles in the side panel, or from a quick
    toolbar on the selected section.
  - Flip the toolbar to **Whole site** (or click **Edit everywhere**) to
    change what a style looks like on every page at once. Also in Site
    settings → Section styles.
  - Text colour picks itself, so every style passes contrast checks.

- **Unknown addresses show "Page not found"** with a link to the home
  page, instead of the home page itself. Deleted pages now really
  disappear from the live site.
- **Saving and publishing are switched on for real.** The builder asks
  you to sign in, saves to GitHub, and the site is live at
  https://crust-site.pages.dev.

- **Each page shows one status:** only in this browser, changes not
  saved, saved but not live yet, or live.
- **Publishing offers to save browser drafts first,** so nothing you meant
  to publish gets left behind.
- **"Find a page" and "Sort by"** (newest edit or address) once you have
  6 or more pages.
- **"Publish (3)" in the builder and Site settings top bars** takes you
  straight to the Publish panel.
- **Pages screen polish** after an Impeccable design review:
  - Publish now sits at the top, and its button says what it will do
    ("Publish 3 changes", or "Publish again" when everything is live).
  - Keyboard focus no longer hides under the top bar.
  - Clearer errors, with a "Try again" button.
  - New page keeps what you typed if you close it.
  - A few wording and spacing fixes.
- **"Save to GitHub" on pages marked "Draft in this browser",** so you can
  save a draft from the page list without opening it.
- **"Recently deleted"** under your page list: bring a deleted page back at
  its old address with one button.
- **Renaming a page also updates the buttons and card links on your other
  pages** that point to it. The rename dialog lists which pages will change.
- **"Open live site" now opens your real site,** at the address the last
  publish went live at, which is also shown under the button. Before the
  first publish, the panel says the link will appear there.
- **Rename and delete pages** from the page list. Each asks for confirmation
  first.
  - **Renamed pages keep working at their old address:** visitors are sent
    to the new one once you publish.
  - **The Home page can't be renamed or deleted.**
- **See what isn't live yet.**
  - The page list marks saved pages as "Not published yet" or "Edited since
    publish".
  - The Publish panel lists everything the next publish will change: new,
    edited, moved and removed pages, plus Site settings.
- The admin opens on your page list: titles, addresses and when each was
  last edited. "New page" creates a page (the address fills in from the
  title) and opens it in the builder. Page title and description are edited
  in the builder's page panel.
- "Publish site" (on the page list) puts your saved pages live and shows
  progress. It switches on together with saving to GitHub.
- Every published page is checked for accessibility (axe) before it goes
  live, and the sample page for speed (Lighthouse).
- Save draft and Site settings → Save now save to GitHub once it's switched
  on, with a clear message about where your work went. Until then they keep
  saving in your browser.
- In Site settings, click any part of the preview to jump straight to the
  colour that styles it.
- Site settings has five ready-made presets (Crust, Ink, Forest, Sunset,
  Mono) for colours and fonts, with one-step undo.
- Buttons can be aligned left, centre or right, so they line up under
  centred headings.
- Publishing also stops when an Image block has no image URL, instead of
  putting the "Add an image URL" placeholder on your live page.
- The builder works fully from the keyboard: select blocks with Enter, move
  them with Alt and the arrow keys (also as buttons on the selected block),
  and add blocks from the list with Enter. Screen readers hear what moved
  where. Press ? or "Keyboard" for the list of shortcuts.
- The builder's "Publish" button is now "Save draft" (that's what it does
  until publishing arrives), and it can be reached with Tab.
- Site settings: set the site's colours, fonts, spacing, corner radius and
  page width in one place, with a live preview of your Home page. A
  contrast check flags colour pairs that are hard to read and offers a
  one-click fix. Open it from "Site settings" in the builder's top bar.
- New blocks: Columns (2, 3 or 4; they stack on phones and show 2 on
  tablets) and Card (image, title, text and a link).
- The builder canvas now uses your body font, so the preview matches the
  published page.
- Publishing now stops, with a plain list of what to fix, when a page has an
  image without alt text, no main heading (H1) or more than one, a heading
  that skips a level (H2 → H4), or a missing title or description.
- Every branch now gets its own preview link of the builder, posted on its
  pull request and in the GitHub Actions summary. `main` is the stable
  preview. (Live once the Cloudflare secrets are added.)
- First version of the builder: add, reorder and edit blocks (Section,
  Heading, Text, Image, Button, Spacer) and switch between desktop, tablet
  and mobile widths. Drafts are saved in your browser for now.
- Publishing pipeline: pages become plain HTML files with your design tokens,
  plus a sitemap and robots.txt for search engines.
- Project set up: product spec, feature list, and the workflow files that
  guide every build session.

# Changelog

User-visible changes, newest first, in plain language.

## Unreleased

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

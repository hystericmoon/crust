# Changelog

User-visible changes, newest first, in plain language.

## Unreleased

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

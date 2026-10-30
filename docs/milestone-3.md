# Milestone 3 — Real content

Approved by the owner on 2026-10-30 ("Go ahead" → "Both": merge Milestone 2,
start Milestone 3). Proposal text: DECISIONS.md, 2026-10-30.

## Goal

Milestone 2 made pages look good. Milestone 3 gets real content in
(images, posts, forms) and helps people find it (search engines, sharing,
site search), still with static output and $0 running cost.

## User stories

1. I drop photos in from my Mac or phone and pick them from a library;
   alt text is asked for right away, and visitors get small, fast images.
2. I write news or portfolio posts, each from blocks, with a list page and
   an RSS feed.
3. I set how each page looks in search results and when shared, and can
   keep a page out of search engines.
4. Visitors can send me a message through a contact form, without spam.
5. On my phone I can fix a typo or swap a photo and publish.
6. Visitors can search my site.

## Features (in order)

| Feature | Notes |
|---|---|
| F034 Media library and image uploads | Design snapshot first; storage choice for the owner |
| F035 Blog and collections | New content type: `content/posts/` (migration + DECISIONS entry) |
| F036 Search and sharing settings per page | Optional page fields (migration-free) |
| F037 Contact form block | Needs a Cloudflare Worker, Turnstile and an email sender set up by the owner |
| F038 Phone quick-edit mode | Design snapshot first |
| F039 Site search | Pagefind at publish time |

## Rules that carry over

- Free and open-source only; $0 running cost. Anything that needs a new
  account, a payment method or a secret is the owner's step (BLOCKED.md).
- Visual features start from a design snapshot in `design/`.
- Format changes come with a migration and a DECISIONS.md entry.
- Accessibility (WCAG 2.2 AA) and the publish checks stay required.

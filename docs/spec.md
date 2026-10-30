# Crust — product spec

Working name. Owner: Hosni. Status: Milestones 1 and 2 complete (2026-10-29/30); Milestone 3 in progress, `docs/milestone-3.md`.

## What it is

A visual website builder and CMS. The owner designs pages in a browser-based
builder with drag-and-drop blocks and global design tokens; Crust publishes
them as fast, static HTML sites. Comparable in spirit to YooTheme Pro or a
lightweight Webflow, but with static output, accessibility built in, and $0
running cost.

## Users

- **Now:** the owner, building his own sites. One user.
- **Later:** agencies and site owners (self-hosted from a template repo, a
  hosted version, or a desktop app). Not in scope yet.

## Devices

- **Desktop browser (Mac):** full builder: layout, blocks, tokens.
- **Phone:** preview links, reviewing live sites, quick content edits and
  publishing (simplified mobile edit mode in a later milestone).

## Architecture

```
Admin + builder (React SPA on Cloudflare Pages, behind Cloudflare Access)
        │  saves page JSON (via a Pages Function that commits to GitHub)
        ▼
GitHub repo: content/  ──►  GitHub Actions publish pipeline
                               1. render: page JSON → static HTML (React SSR)
                               2. crust-publish (Rust): validation, sitemap,
                                  robots.txt, (later) images, search index
        ▼
Public site: static HTML on Cloudflare Pages (later also FTP to any host)
```

- No server, no database. Content is JSON in `content/`; Git history is the
  backup and undo history.
- Visitors get plain HTML + CSS. No React runtime on the public site unless a
  block needs interactivity.
- Each block is written once in `packages/blocks` and used both in the editor
  and by the renderer, so the preview matches the published page.

## Stack

| Part | Choice |
|---|---|
| Builder | Puck (`@puckeditor/core`, MIT) |
| Admin UI | React + TypeScript + Vite; shadcn/ui + Tailwind and Lexical later |
| Rendering | React `renderToStaticMarkup` in `packages/render` |
| Publish engine | Rust, `crates/crust-publish` (images: `image` crate) |
| Search | Pagefind (at publish time, F039) |
| Hosting/CI | Cloudflare Pages, GitHub Actions |
| Forms | Cloudflare Worker + Turnstile, email via Resend (free plan) |

## Repo layout

```
apps/admin/            Builder + admin web app
packages/blocks/       Block components, Puck config, design tokens, styles
packages/render/       page JSON → static HTML
crates/crust-publish/  Rust publish engine
content/               site.json + pages/*.json
design/                Design snapshots (artifact HTML, screenshots)
docs/                  This spec, delta specs
scripts/               init.sh and other helpers
```

## Content format (contract)

`content/site.json`
```json
{ "name": "…", "baseUrl": "https://…", "language": "en", "tokens": { … } }
```

`content/pages/<slug>.json`
```json
{ "path": "/about", "title": "…", "description": "…", "puck": { "root": {…}, "content": [ … ] } }
```

`puck` is Puck's own `Data` shape: a block tree, never raw HTML.

`tokens.sectionStyles` (optional, added with F025) defines the site-wide
section styles; a Section's `background` names one (`background`,
`surface`, `primary`, `dark`).

`tokens.style` (optional, added with F028) holds the style options:
`typeScale`, `headingWeight`, `headingTracking`, `buttonShape`, `cardStyle`,
`linkStyle`, each picked from a short list. Missing options keep the look
sites had before F028. A section style's `button` can also be `"soft"`.

Any block's props may carry `hideOn` (optional, added with F029): a list of
`"desktop"`, `"tablet"`, `"phone"`. A Columns block may carry `widths`
(`{ desktop, tablet, phone }`, each a width id such as `"two-one"` or
`"stack"`). Blocks without them render as before.

Any block may also carry `anchor` (optional, added with F030): a name made
of lowercase letters, numbers and dashes. It's published as an empty
target right before the block, so `#name` links jump there.

`header` and `footer` in `site.json` (optional, added with F031): the
site-wide header (`show`, `logo { text, imageSrc, imageAlt }`, `menu`
[{ label, href }], `cta`, `sticky`, `style`) and footer (`show`, `text`,
`columns` [{ title, links }], `copyright`, `style`). Missing fields get
defaults (see `migrateChrome`).

`content/redirects.json` (optional, added with F015)
```json
[{ "from": "/old-address", "to": "/new-address" }]
```
Written when a page is renamed; published as Cloudflare Pages `_redirects`.

Theme pack files (`<name>.crust`, added with F033) are downloaded and
uploaded in Site settings, never stored in `content/`:
```json
{ "format": "crust-theme-pack", "version": 1, "name": "…", "exportedAt": "…",
  "tokens": { … }, "chrome": { "header": { "style": "…", "sticky": false }, "footer": { "style": "…" } },
  "layouts": [{ "name": "…", "kind": "section", "content": [ … ] }] }
```
`tokens`, `chrome` and `layouts` are each optional. Importing checks
everything (see `readThemePack`) and drops unknown fields.

`content/media/<file>` and `content/media.json` (optional, added with F034):
uploaded photos (JPG, PNG, WebP; at most 2400 px) and their details.
```json
[{ "file": "harbour.jpg", "alt": "Boats in the harbour at dawn", "width": 2400,
   "height": 1600, "bytes": 512000, "uploadedAt": "…" }]
```
Pages use a photo by its address, `/media/<file>`, in any image field
(web addresses still work). `alt` is the library's description, copied
into a block's alt field when picked. Publishing copies the photos into
the site with resized copies (`<name>-480w.jpg`, `-960w`, `-1440w`) for
`srcset`; those are never stored in `content/`.

A page may carry `seo` (optional, added with F036): `{ "title": "…",
"image": "/media/…", "imageAlt": "…", "noindex": true }`, each optional.
`title` replaces the page's `<title>` and shared title; `image` is the
picture shown when the link is shared (needs `imageAlt`); `noindex`
keeps the page out of search engines and sitemap.xml. Every published
page gets a canonical link and Open Graph tags.

`header.search` in `site.json` (optional, added with F039): `true` shows
a "Search" link to `/search/`, the site search page. The search index
(`/pagefind/`) is built by Pagefind at publish time from each page's
`<main data-pagefind-body>`. Pages can't use `/search`.

`content/posts/<slug>.json` and `content/blog.json` (optional, added with F035)
```json
{ "slug": "opening-day", "title": "…", "description": "…", "date": "2026-10-30",
  "cover": "/media/door.jpg", "coverAlt": "…", "puck": { "root": {…}, "content": [ … ] } }
```
```json
{ "title": "News", "intro": "…" }
```
A post is published at `/blog/<slug>/`; the list of posts at `/blog/` and
an RSS feed at `/blog/feed.xml` appear once there is a post. Pages can't
use `/blog` or addresses below it. `cover` is optional (`""`), and needs
`coverAlt` when set. The post body is blocks, like a page (no H1: the
title is the H1).

`content/layouts/<id>.json` (optional, added with F027)
```json
{ "id": "studio-intro", "name": "Studio intro", "kind": "section", "savedAt": "…", "content": [ … ] }
```
A section or whole page the owner saved to reuse. `content` is top-level
blocks, like a page's `puck.content`. Only the builder reads these; they are
never published.

## Milestone 1 — first working slice

Prove the full loop: build a page in the browser, publish it, see it live.

### User stories
1. I open the admin on my Mac, sign in via Cloudflare Access, and see my pages.
2. I create a page with a title and URL.
3. I add blocks, reorder them, and edit settings in a side panel; the canvas
   updates as I type.
4. I set colours, fonts and spacing once in Site settings; all blocks use them.
5. I switch the canvas between desktop, tablet and mobile widths.
6. I save a draft; nothing goes live until I publish.
7. I click Publish; within minutes the site is live on Cloudflare Pages.
8. I open the live link on my phone and it looks right.

### Block library v1
Section, Columns, Heading, Text, Image, Button, Spacer, Card.

Added in F032: Grid (of cards), Gallery, Accordion, IconList, LogoRow,
Quote, ImageOverlay. Their repeating items are arrays in the block's props
(`items`, `images`, `logos`).

Added in F037: ContactForm (props `nameLabel`, `emailLabel`,
`messageLabel`, `fields` [{ label, kind, required }], `submitLabel`,
`successMessage`). It posts to the contact Worker (`packages/contact`);
the Worker's address and the Turnstile site key come from the publish
workflow's repository variables `CONTACT_FORM_URL` and
`TURNSTILE_SITE_KEY`.

### Acceptance criteria
- Published pages display with no JavaScript.
- Every page has `<title>`, meta description, and appears in `sitemap.xml`.
- Image blocks can't be published without alt text.
- One `h1` per page; heading levels don't skip.
- Every builder action works with the keyboard.
- No serious axe accessibility issues on published pages.
- Lighthouse performance ≥ 95 on a sample page.

### Not in Milestone 1
Multiple sites, media uploads (image URLs only), rich text, forms, search,
full SEO panel, templates, content import, mobile edit mode, custom domains,
FTP publishing.

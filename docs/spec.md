# Crust — product spec

Working name. Owner: Hosni. Status: Milestone 1 complete (2026-10-29); Milestone 2 planned in `docs/milestone-2.md`.

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
| Publish engine | Rust, `crates/crust-publish` |
| Search | Pagefind (later) |
| Hosting/CI | Cloudflare Pages, GitHub Actions |
| Forms (later) | Cloudflare Workers + Turnstile |

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

`content/redirects.json` (optional, added with F015)
```json
[{ "from": "/old-address", "to": "/new-address" }]
```
Written when a page is renamed; published as Cloudflare Pages `_redirects`.

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

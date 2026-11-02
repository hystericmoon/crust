# Crust — product spec

Working name. Owner: Hosni. Status: Milestones 1–6 complete (2026-10-29 to 11-02); Milestone 8 (premium design layer, `docs/milestone-8.md`) approved and next; Milestone 7 (store, `docs/milestone-7.md`) resumes after it.

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

`baseUrl` is the site's own address (F044: edited in Site settings → Site
address): `https://` plus the domain, no path. `https://example.pages.dev`
means "not set"; publishing then uses the Cloudflare Pages address, and it
uses the own domain only once Cloudflare reports it connected.

`tokens.fonts.heading` and `.body` are CSS font lists. From F070 the
first family may be one of Crust's bundled fonts (`bundledFonts`, e.g.
`'Fraunces', Georgia, serif`); publishing then adds its `@font-face`
rules and copies its files to `/fonts/`. Any other list uses fonts on
the visitor's device, as before.

`tokens.sectionStyles` (optional, added with F025) defines the site-wide
section styles; a Section's `background` names one (`background`,
`surface`, `primary`, `dark`).

`tokens.style` (optional, added with F028) holds the style options:
`typeScale`, `headingWeight`, `headingTracking`, `buttonShape`, `cardStyle`,
`linkStyle`, each picked from a short list. Missing options keep the look
sites had before F028. A section style's `button` can also be `"soft"`.
F071 adds `displayWeight`, `displayTracking` and `labelStyle` (`plain`,
`caps`, `mono`, `chip`), weights 300/400 and trackings `tighter` and
`tightest`. A Heading block may carry `size` (`"display"`) and
`eyebrow` (a small label above it); a Button's `variant` may be
`"soft"` or `"arrow"`; a Card may carry `layout: "cover"` (the photo
fills the card). The style library (F072, Site settings → Styles)
writes only these ordinary tokens (fonts, colours, `style`,
`sectionStyles`, `radius`); no look id is stored.

A Section may carry (F073, all optional) `width` (`narrow`, `normal`,
`wide`, `full`, `left`, `right`), `bgKind` (`colour`, `gradient`,
`photo`, `video`; missing means `photo` when `imageSrc` is set),
`gradient` `{ "to": "<colour role>", "direction": "down" }`
(`diagonal`, `across`, `glow`), `videoSrc` (an `https://` or site
address of an .mp4/.webm; needs `imageSrc` as its still), `focus`
`{ "x": 0–100, "y": 0–100 }`, `overlap` (`none`, `sm`, `md`, `lg`) and
`headerOver` (`true`: the site header sits on it; first block only).

A Columns block may carry (F074, all optional) `valign` (`top`,
`middle`, `bottom`), `box` `{ "style": "<section style>" | "none",
"padding": "sm" | "md" | "lg", "rounded": true }`, `highlight`
`{ "column": 1–4, "style": "<section style>" }`, `rowGap` (a spacing
step), `dividers` (boolean), `phoneOrder` (`normal`, `reverse`: visual
only, reading order stays) and `sticky` (a column number).

F077 adds three blocks: `Icon` (`icon`, `look`: `plain`, `circle`,
`square`; `size`: `sm`, `md`, `lg`; `colour`: `primary`, `text`;
`label`, `href`, `align`), `Divider` (`kind`: `line`, `accent`, `label`,
`dots`; `label`, `width`: `short`, `medium`, `full`; `space`, `align`)
and `SocialLinks` (`links` [{ href }], `show`: `icons`, `names`; `look`:
`plain`, `circle`; `who`, `align`). An icon is a name from Crust's set
(`iconNames`, `packages/blocks/src/icons-data.ts`, written by
`scripts/sync-icons.mjs`); unknown names draw nothing. Optional, all
F077: a Card's `icon` (shown when it has no photo), a Button's `icon` and
`iconAt` (`before`, `after`), and an Icon list line's own `icon`; the
Icon list's `icon` may now be any icon name besides the six classic
marks. An Icon with an `href` needs a `label`, or publishing stops.

F078 adds four blocks (all props optional for pages made before):
`Stats` (`items` [{ value, label, detail }], up to 6; `look`: `plain`,
`lines`, `boxes`; `size`: `md`, `lg`; `colour`: `text`, `primary`;
`align`), `Video` (`src`: a YouTube or Vimeo link, or an https:// or
site address of an .mp4/.webm; `title`; `imageSrc`, the cover;
`captionsSrc`, a .vtt file for .mp4/.webm; `caption`; `ratio`: `16:9`,
`4:3`, `1:1`, `9:16`), `Table` (`caption`; `rows`, a list of rows of
plain-text cells, at most 50 × 8; `headers`: `top`, `both`, `none`;
`look`: `lines`, `stripes`) and `Pricing` (`plans` [{ name, price,
period, description, features (one per line), buttonLabel, buttonHref
}], up to 4; `highlight`: `none` or `1`–`4`; `badge`; `planStyle` and
`highlightStyle`, section style ids; `titleLevel`). An Icon list's
`icon` may be `"numbers"` (a numbered list), with `numberStyle`
(`circle`, `large`, `plain`; missing means `circle`). A YouTube or
Vimeo video is published as a link to the video with the cover; a
small script, only on pages that have one, swaps in the player
(youtube-nocookie.com, Vimeo with "do not track") when it's pressed.

F079 adds four blocks (all props optional): `Slideshow` (`name`;
`slides` [{ imageSrc, imageAlt, title, text, linkLabel, linkHref }], up
to 10; `ratio`: `16:9`, `3:2`, `4:3`, `21:9`; `autoplay`: `no`, `yes`;
`speed`: `5`, `8`, `12` seconds; `titleLevel`), `CardSlider` (`name`;
`items`, cards like the Grid's, up to 12; `visible`: `2`–`4`;
`titleLevel`; `background`), `Tabs` (`tabs` [{ label, text }], up to 8,
text in plain paragraphs; `look`: `underline`, `pills`, `side`;
`titleLevel`, the headings shown without the script) and `Map` (`place`,
`address`, `pin` { lat, lng }, `zoom`: `street`, `area`, `city`;
`ratio`; `imageSrc`, a photo shown before the map). A Gallery may carry
`lightbox` (`"yes"`: a photo opens larger when pressed; missing means
no). Each block's small script is added only to pages that use it; the
map loads from OpenStreetMap only when "Show map" is pressed.

`tokens.style.motion` (optional, F075): `off`, `subtle` or `lively`;
missing means Off. A Section may carry `entrance` (`rise`, `zoom`,
`slide`, `none`; missing means Rise) and `parallax` (`true`: its photo
moves slower). A LogoRow may carry `moving` (`"yes"`: scrolls slowly,
with a pause switch). Published pages get the motion CSS only when
motion is on; it is CSS only (scroll-linked), off under Reduce motion,
and words never fade.

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

F076 adds (all optional; headers and footers without them look as
before): `header.layout` (`classic`, `centred`, `stacked`, `split`,
`left`, `button`), a menu item's `children` (a dropdown, one level, up
to 8 links; the item's own `href` may then be empty),
`header.overHero` (`true`: the header sits on any page whose first
section has a photo or video background), `header.topBar` (`show`,
`text`, `link { label, href }`, `contact`, `style`), and
`footer.kind: "blocks"` with `footer.section` (a linked section's id):
the footer is then that section's blocks, with the copyright line
under them; a missing section stops the publish.

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

Starting from a template (F048) writes ordinary content files: the
template's pages, posts, linked sections and blog settings replace the
site's, its style, header, footer and language go into `site.json` (name
and `baseUrl` stay), its photos join `content/media/`, its layouts join
`content/layouts/`. One commit ("Start from template …"), which "Bring
back my previous site" undoes.

Template files (`<name>.crust`, added with F045) hold a whole site and are
downloaded from Site settings → Template, never stored in `content/`:
```json
{ "format": "crust-template", "version": 1, "name": "…", "description": "…", "exportedAt": "…",
  "site": { "name": "…", "language": "en" }, "tokens": { … }, "header": { … }, "footer": { … },
  "pages": [{ "path": "/", "title": "…", "description": "…", "seo": { … }, "puck": { … } }],
  "sections": [{ "id": "…", "name": "…", "content": [ … ] }],
  "layouts": [{ "name": "…", "kind": "section", "content": [ … ] }],
  "blog": { "title": "…", "intro": "…" }, "posts": [ … ],
  "media": [{ "file": "harbour.jpg", "alt": "…", "width": 2400, "height": 1600, "data": "<base64>" }] }
```
Only photos the template uses go in. Reading one (`readTemplate`) refuses
the whole file on any problem (unknown blocks, unsafe links, contrast,
missing Home page, a photo or linked section used but not included) and
drops unknown fields. The site's address, redirects and history never go
in.

The store's catalogue (`catalogue.json`, added with F062; the store
writes it from F063 on) lists premium templates for the gallery:
```json
{ "format": "crust-catalogue", "version": 1, "templates": [
  { "id": "olive", "name": "Olive", "description": "…", "kind": "Restaurant", "price": "US$49",
    "url": "https://…/olive/",
    "pages": [{ "title": "Home", "path": "/", "pictures": [
      { "width": "desktop", "src": "…/olive-home-desktop.jpg", "alt": "…" } ] }] } ] }
```
`width` is `desktop`, `tablet` or `phone`. Links are `https://` (or on
the catalogue's own site, relative to it). Reading it (`readCatalogue`)
drops unknown fields and leaves out any template with a bad id, name,
price or link, any picture without `alt`, and templates with no
picture at all. The app has no catalogue address until the store
exists (`STORE_CATALOGUE_URL`); `#/templates?examples` shows a bundled
example catalogue.

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
`srcset`; those are never stored in `content/`. F081: each photo and
resized copy also gets AVIF and WebP copies (`harbour.jpg.avif`,
`harbour-480w.jpg.webp`; a WebP photo only AVIF), which pages offer first
in a `<picture>`. A media.json item may carry `focus` `{ "x": 0–100,
"y": 0–100 }` (optional; missing means the middle): blocks that crop the
photo keep that point in view. Template photos may carry it too.

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

A Text block's `text` (changed with F042) is rich text, never HTML:
```json
{ "rich": 1, "blocks": [
  { "type": "p", "children": [{ "text": "Fresh bread " }, { "text": "daily", "bold": true },
                              { "text": "menu", "href": "/menu", "italic": true }] },
  { "type": "ul", "items": [[{ "text": "Sourdough" }], [{ "text": "Rye" }]] },
  { "type": "ol", "items": [[{ "text": "Order" }]] }
] }
```
Spans may be `bold`, `italic` and carry an `href` (checked with `safeUrl`;
page paths, `https://`, `mailto:`, `tel:`, `#anchor`). `"\n"` inside a span
is a line break. Pages saved before F042 hold a plain string (paragraphs
split by blank lines); it reads the same and becomes rich text the next
time the page is opened and saved (`migrateRichText`).

Any block with words or photos may carry `placeholder` (optional, added
with F046): the fields still holding a template's sample content, e.g.
`["title", "imageSrc"]` (which fields a block can mark: `markableFields`).
The builder outlines marked blocks and lists them under "To replace";
editing a marked word or photo field drops its mark, lists (`items`,
`images`, `logos`) are cleared with "Keep as is". Marked blocks render
with `data-crust-placeholder`, and publishing stops while any page has one.

`content/sections/<id>.json` (optional, added with F043): a linked section,
shown on many pages and edited once.
```json
{ "id": "contact-strip", "name": "Contact strip", "savedAt": "…", "content": [ { "type": "Section", … } ] }
```
A page (or post) shows it with a block `{ "type": "LinkedSection", "props":
{ "id": "…", "section": "contact-strip" } }`. Publishing builds the
section's current blocks into each page; a missing section stops the
publish with the page's name. A linked section holds no h1 and no other
linked section, and can't be deleted while a page uses it.

F080: a saved layout's `kind` may also be `"element"`: a saved element
style, `content` holding exactly one block whose props are only its
Style-tab settings (no words, links or photos, no id). The builder
copies them into a block of the same type when applied; they're never
published, and theme packs and templates leave them out. Layouts from
the library may use the builder's sample photos (`/layout-photos/…`);
the builder copies them into `content/media/` and the blocks then use
`/media/…`. A block still pointing at `/layout-photos/` stops the
publish.

`content/layouts/<id>.json` (optional, added with F027)
```json
{ "id": "studio-intro", "name": "Studio intro", "kind": "section", "savedAt": "…", "content": [ … ] }
```
A section or whole page the owner saved to reuse (or, from F080, a saved element style). `content` is top-level
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

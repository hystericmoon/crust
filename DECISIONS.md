# Decisions log

Newest at the top. Each entry: what we decided, and why.
Claude logs reversible low-impact choices here; the owner makes scope calls.

## Proposals

Features Claude suggests. They are not work until the owner adds them to
`features.json`.

- **Stop publishing images with no URL.** An Image block left without a URL
  currently publishes its editor placeholder ("Add an image URL") on the
  live page. F002's checker could catch it the same way as missing alt
  text. Small; would fit in F004 or as its own item.

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

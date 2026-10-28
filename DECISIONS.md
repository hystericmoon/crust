# Decisions log

Newest at the top. Each entry: what we decided, and why.
Claude logs reversible low-impact choices here; the owner makes scope calls.

## Proposals

Features Claude suggests. They are not work until the owner adds them to
`features.json`.

- *(none yet)*

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

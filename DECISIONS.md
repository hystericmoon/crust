# Decisions log

Newest at the top. Each entry: what we decided, and why.
Claude logs reversible low-impact choices here; the owner makes scope calls.

## Proposals

Features Claude suggests. They are not work until the owner adds them to
`features.json`.

- *(The four proposals so far were approved by the owner on 2026-10-28 and
  are now F011–F014 in `features.json`.)*

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

# Decisions log

Newest at the top. Each entry: what we decided, and why.
Claude logs reversible low-impact choices here; the owner makes scope calls.

## Proposals

Features Claude suggests. They are not work until the owner adds them to
`features.json`.

- *(All proposals so far were approved by the owner on 2026-10-28: the
  first four are F011–F014, "rename and delete pages" is F015 and "show
  what's not published yet" is F016. Claude's next four recommendations
  were approved the same day as F017–F020. The four from the Impeccable
  review were approved on 2026-10-29 as F021–F024.)*
- **Sign out button in the builder.** Today the only way to sign out is
  to open `crust-admin.pages.dev/cdn-cgi/access/logout`. A "Sign out"
  item in the top bar would link there. Small.
- **Bring the redirect back when a renamed page is restored.** Deleting a
  renamed page removes its old-address redirect, and restoring it doesn't
  add the redirect back. Harmless today; matters once the site has
  visitors and bookmarks.

## 2026-10-29 — Milestone 2: YOOtheme-style building (owner-approved)

- **The owner approved all three steps** after the visual explainer
  (`design/m2-yootheme-vision.html`): F025–F033, spec in
  `docs/milestone-2.md`. Claude wrote them into features.json on his
  "approve 1 2 3".
- **Direction:** YOOtheme's way of building (Section → Row → Column →
  Element, layout library, deep style customizer) on Crust's engine
  (static, accessible, free). Layouts and theme packs are Crust JSON only,
  so "bring your own template" means a Crust theme pack, not an HTML
  import.
- **Left out for now:** slider/carousel (hard to make accessible; later
  proposal), blog/collection templates, HTML template import.
- **Order:** step 1 first (biggest visual gain), visual features start
  with a design snapshot for the owner to choose from.

## 2026-10-29 — First real setup and publish (Claude, reversible)

- **Two Access applications, not one.** Pages' "Restrict previews" creates
  an Access app locked to `*.crust-admin.pages.dev`; it can't take a second
  hostname. The owner made a separate app, `crust-admin.pages.dev`, policy
  "Only me" (his email, one-time PIN). `ACCESS_AUD` is that app's tag, so
  saving works only from the main address; preview links are private but
  read-only, which is the safer default.
- **A "Page not found" page (404.html) on every publish.** Without it,
  Cloudflare Pages answers every unknown address (including deleted pages)
  with the home page and status 200: misleading for visitors and search
  engines. The renderer now writes 404.html (one h1, link home, site
  tokens); it stays out of the sitemap and is now in the axe check.

## 2026-10-29 — F021–F024 (owner-approved proposals; details Claude, reversible)

**F021: one status per page**
- **The rule:** the most urgent status wins.
  1. Only in this browser
  2. Changes not saved
  3. Saved, not live yet / Edits not live yet
  4. Live
- **"Live" is shown only when the last publish is known;** otherwise it says "Saved". Before GitHub is on: "Built into the app" or "Only in this browser".
- **The status is a column right after the title,** with a small dot. The words carry the meaning:
  - filled green: live
  - amber ring: not live yet
  - grey ring: only in the browser / not saved
  - filled grey: saved
- **A new token, `--st-pending` (#b54708),** colours the amber ring. The badges and the long note above the list are gone.

**F022: Publish saves drafts first**
- **Drafts are listed and counted** in the Publish panel as "changes in this browser, saved when you publish".
- **Publishing asks once:** "Save N pages first?" with Save and publish (focused) / Publish without them / Cancel.
  - A modal is earned here: it's a decision before a production action.
- **Drafts are saved one by one.** The first failure stops everything with its reason, and nothing is published.
- **The row's "Save to GitHub" (F020) stays** for saving without publishing.

**F023: find and sort**
- **Appears from 6 pages.** A shorter list doesn't need it.
- **Find:** every typed word must appear in the title or address, ignoring case and accents. The match count is announced, and no matches offers "Clear search".
- **Sort:** newest edit (default; undated pages last) or address (Home first). The choice is remembered in this browser only, as a per-viewer convenience.

**F024: Publish shortcut**
- **"Publish (N)" in the builder and Site settings top bars.** Screen readers hear "Publish, N changes waiting".
- **It opens the page list with focus on the Publish panel** (`#/?focus=publish`); it doesn't publish from there.
  - Publishing from the builder would skip the list of what's waiting, which is the point of the panel.
- **Not on the page list itself,** because the Publish panel is already at its top (Impeccable fix).
- **The count includes unsaved browser drafts.** It's shown only after a first publish and only while GitHub is on, and it refreshes on every screen change.

**Deploy check (preview.yml)**
- **Fixed:** a fresh deploy failed once because `/api/status` answered 404 for a few seconds. The check now retries both the page and the API.
- **Once Access is on,** a redirect to `*.cloudflareaccess.com` counts as "deployed and private". Without this, every deploy would fail.

## 2026-10-29 — Impeccable review of the Pages screen (owner asked: "let Impeccable check it, fix it and move forward")

- **How it was checked:** two separate reviewers. One did a design review (Nielsen score 24/40). The other ran the Impeccable detector and checked the screen in a browser with axe.
  - The detector found nothing in the code and one advisory in the page.
  - axe found 0 violations in 7 states.
  - One real WCAG failure.
  - Snapshot: `.impeccable/critique/`.
- **Fixed:**
  - **Focus hidden under the sticky header** on desktop (WCAG 2.4.11): `scroll-padding-top: 80px` from 900 px up, so the Site settings screen gets the fix too.
  - **The Publish panel comes first.** "What's live" and the Publish button are this screen's main question and action, especially on a phone.
  - **The Publish button says what it will do:**
    - "Publish 3 changes" when changes are waiting
    - "Publish site" before the first publish
    - "Publish again" (secondary style) when everything is live; still allowed, so you can re-run after a failure
  - **Long lists of waiting changes** show the first 6, then "Show all N".
  - **A failure to start publishing is now an alert,** styled as a warning, and says nothing changed on the live site. Only the run's status word is a live region.
  - **When the list can't load:** a "Try again" button, and the note no longer claims it's showing pages from GitHub.
  - **Links** use the admin's text colour instead of browser blue. The danger hover colour is now a token.
  - **Dates** stay on one line on desktop. Page-title links are 44 px tall on phones.
  - **The disclosure arrow** is a drawn SVG chevron instead of a "▸" character.
  - **Home's missing actions are explained:** "Always at /".
  - **New page keeps what you typed** when you close and reopen it, and focus returns to the button after Cancel.
  - **Confirmations disappear after 10 seconds.**
  - **Copy:** the rename dialog is titled "New address for “…”" (shorter on phones). The delete dialog points to "Recently deleted" instead of GitHub history.
  - **The "off" note** names the setup guide.
- **Not changed, proposed above instead:** a status column instead of badges, Publish saving drafts itself, find/sort, a Publish shortcut in the header. These change how the product works, so they're your call.
  - **No Publish confirmation dialog.** The button now states its scope, and the list of changes sits right above it. A confirmation on every publish adds friction for a single owner.
- **Advisory left as is:** the detector's "flat type hierarchy". The 18 px h1 is the app-bar title shared with Site settings (owner-reviewed), not a page heading competing with section headings.

## 2026-10-29 — F020 save browser drafts from the list (Claude, reversible)

- **"Save to GitHub" appears in the actions column** of any page marked "Draft in this browser" (Home too), only while saving to GitHub is on. It sends the browser draft exactly as the builder's "Save draft" would, and the server checks it the same way.
- **After saving,** the badge and button disappear, focus goes to the "Pages" heading, and the result is announced.
- **If saving fails,** the reason shows in an alert above the list, and the draft stays in the browser.
- **Rename/Delete now share the row's action group** with Save, wrapping on narrow screens.

## 2026-10-29 — F019 restore deleted pages (Claude, reversible)

- **Where the list comes from:** recent commits under `content/pages` whose first line is the builder's own `Delete page /x from the builder`.
  - Only the newest deletion of each address is listed, and only if no page lives there now. At most 10 are shown.
  - Each page is read as it was in the commit before the deletion.
  - No new storage and no new token permission.
- **Restoring writes that version back** in one commit ("Restore page /x …").
  - The server only accepts a builder deletion it finds in the recent history.
  - It refuses if the address is taken.
- **Not restored:** redirects that pointed to the page. Deleting removed them, and the next rename can recreate them. Keeping restore simple felt right.
- **No confirmation step.** Restoring is safe: nothing is overwritten, and you can delete the page again. I dropped "with confirmation" from the F019 description before building; the owner's approved option text didn't include it.
- **The section is collapsed by default** ("Recently deleted (2)"), because restoring is rare.
  - It's a disclosure button inside the `h2` (`aria-expanded`), not `<details>`/`<summary>`, so screen readers announce it as a heading.
  - It's hidden when nothing was deleted, and before GitHub is switched on.

## 2026-10-29 — F018 update links on rename (Claude, reversible)

- **Which links:** Button `href` and Card `linkHref`, anywhere in the block tree (inside Sections and Columns too).
  - Matched forms: `/about`, `/about/`, `/about#x` and `/about?x`. The trailing slash, anchor and query are kept.
  - Full addresses (`https://…`) and text that merely mentions the path are left alone. The redirect still covers outside links.
  - The page's own links to itself follow it too.
- **Shared code:** `relinkPage` lives in `packages/blocks/src/links.ts` (no React), so the server and the browser use the same rules.
- **One commit:** the rename, the redirect and every updated page go into a single commit. The commit message says how many links changed.
- **The rename dialog** asks `GET /api/links` once when it opens and names the pages it will update ("Home (2 links), Contact (1 link)"). The hint now says the redirect is for links *from other websites*.
- **Browser drafts of other pages are updated too,** so saving one later can't bring back an old link.

## 2026-10-28 — F017 live site link (Claude, reversible)

- **The bug:** "Open live site" pointed at `site.json`'s `baseUrl`, which is still the placeholder `https://example.pages.dev`. The publish workflow already ignores the placeholder and uses the Cloudflare Pages address, which can get a random suffix if `crust-site` is taken. So the admin couldn't know the real address.
- **The fix:** `publish.yml` ends with a step whose *name* is `Live at <address>`. `GET /api/publish` reads the last successful run's job steps and returns `liveUrl`.
  - Why a step name: it needs only the Actions read permission the GitHub token already has. Deployments or Checks permissions would have meant changing the owner's token steps.
  - Checked with a temporary CI step on PR #4 that GitHub reports the evaluated name ("Live at https://…") through the jobs API.
- **Accepted addresses:** only `https://` addresses from a step that succeeded.
- **The order the admin uses:**
  1. the address the last publish reported
  2. `site.json`'s `baseUrl`, if it's a real address
  3. nothing: the panel says the link appears after the first publish
- **Not done:** editing the site name and address in Site settings. Custom domains are outside Milestone 1, and the address now comes from the publish itself.

## 2026-10-28 — F015 rename/delete and F016 unpublished changes (owner-approved proposals; details Claude, reversible)

**Content contract: new optional file `content/redirects.json`** (F015)
- **Shape:** a list of `{ "from": "/old", "to": "/new" }`. Typed as `Redirect` in `packages/blocks/src/content.ts`, and added to `docs/spec.md`.
- **No migration needed.** The file is optional: a missing file means no redirects. Page and site JSON are unchanged.
- **Why a separate file, not a field in `site.json`:** Site settings saves the whole `site.json`, so a field there could be wiped by a settings save.

**Renaming**
- **One commit.** The server moves the page file, sets its new `path`, and updates `redirects.json` in a single commit through GitHub's Git data API. History never shows half a rename. It fails safely ("someone else changed this…") if the branch moved in between.
- **The old address always redirects (301) to the new one.** No checkbox: it's always safe, and it costs nothing.
- **No chains:** earlier redirects to the old address follow it to the new one.
- **The page wins:** if a page is later created at an old address, that redirect is skipped at publish (the log says so).
- **Home (`/`) can't be renamed or deleted.** Every site needs one.
- **Links inside other pages** (Button URLs) aren't rewritten. The redirect covers them.
- **Browser drafts move with the page,** so unsaved edits aren't lost.

**Deleting**
- **The page file is removed in one commit,** along with any redirects that pointed to it. Otherwise the publish check would stop on a redirect to nowhere.
- **No redirect for deleted pages:** links to them stop working, and the confirmation says so.
- **The page can be brought back** from Git history.

**Publishing redirects**
- **`crust-publish --redirects content/redirects.json`** writes Cloudflare Pages' `_redirects` file. Each old address is listed with and without a trailing slash.
- **Checks before writing:** a redirect to an address with no page stops the publish with a plain message.
- **New Rust dependency:** `serde`/`serde_json` (MIT OR Apache-2.0; pulls in `zmij`, MIT).

**Page list and dialogs**
- **Rename and Delete are visible text buttons on each row,** not hidden in a "⋯" menu. Two actions don't need a menu, and visible buttons are easier to find and to reach by keyboard.
- **Screen-reader names include the page:** "Rename About". This meets WCAG 2.5.3 (label in name).
- **Confirmation is a native modal `<dialog>`:** the browser traps focus inside and Esc closes it.
  - **Rename** starts with focus in the address field and explains the redirect.
  - **Delete** starts on "Keep page", the safe choice for destructive confirmations, and states the consequence (removed from GitHub now, from the live site at the next publish).
- **After a change,** focus goes to the "Pages" heading (the row may be gone) and the result is announced.
- **Before GitHub is switched on,** only pages that exist just in this browser can be renamed or deleted. The page-list note says the rest switches on with saving.

**F016: what isn't live yet**
- **"Live" means the commit of the last *successful* publish run.** The server compares it with the branch (one GitHub compare call) and reports:
  - new and edited pages
  - removed pages
  - pages moved by a rename, shown as "moved to /new" rather than "removed"
  - Site settings
  - redirects
- **Before the first publish,** every page counts as new.
- **Page list badges:** "Not published yet" and "Edited since publish".
  - Dashed outline, so they read as "pending" next to the solid "Draft in this browser" badge.
  - The words carry the meaning, not the style.
- **The Publish panel** lists what's waiting above the button, and refreshes by itself when a publish it watched finishes.
- **Publish stays enabled** even when nothing is waiting, so you can always re-publish (for example, after a failed run).

## 2026-10-28 — F007–F009 (Claude, reversible)

**F007 page list**
- **The admin now opens on Pages** (`#/`). The builder is `#/edit?path=/about`, and Site settings is `#/settings`.
- **Where a page loads from:** a draft in this browser, then GitHub (once switched on), then the copy bundled with the app. The list marks pages that have changes only in this browser.
- **Every edit is kept in the browser** as you go. Save draft sends the page to GitHub.
- **New page form:**
  - The address follows the title until you edit it ("About Us & Team" → `about-us-and-team`).
  - Messages are plain-language and appear under each field. Focus moves to the first problem.
  - New pages start with a Section holding an H1, so they pass the publish checks.
- **Title and description** are edited as Puck page fields ("Page title", "Description (shown in search results)"). They're moved back to the top of the page file on save, so the content contract is unchanged.
- **Not yet:** renaming a page's address and deleting pages. Proposed below.

**F008 publishing**
- **`publish.yml` only runs when started:** from the admin's "Publish site" button through `/api/publish`, or by hand on GitHub. Nothing goes live on push. Spec: "nothing goes live until I publish."
- **The site deploys to its own Pages project, `crust-site`.** The workflow creates the project on first run, using the same Cloudflare token as the admin preview.
- **The site address comes from `site.json`'s `baseUrl`** once it's a real address. While it's still the example placeholder, the Pages address is used. Sitemap and robots.txt use the same address.
- **Order of checks:** crust-publish checks (F002/F011) and the axe check (F009) run before deploying, so a page with a serious problem never goes live. After deploying, the workflow checks the live sitemap.
- **The Publish panel** shows the latest run in plain words ("Publishing…", "Live.", "Failed. Nothing changed on the live site."). While a run is going it refreshes every 10 seconds and links to the details on GitHub.

**F009 checks**
- **axe:** WCAG 2.2 A/AA plus best practices, on every published page at 1280 and 375 px. "Serious" or "critical" issues fail; minor ones are listed but don't block.
- **Lighthouse:** run on the Home page; performance must be 95 or more. The sample scores 100 / 100 / 100 (performance, accessibility, SEO) and 96 for best practices.
- **New CI job `site-checks`.** The publish workflow also runs axe before deploying.
- **Licence note for the owner:** `axe-core` is MPL-2.0, not one of the listed MIT/Apache/BSD/ISC licences. The feature names axe explicitly, and it's a dev-only checking tool that never ships with the site or admin, so I used it. If you'd rather not, the fallback is Lighthouse's own accessibility audit (Apache-2.0, built on the same axe rules). `lighthouse`, `chrome-launcher` and `playwright-core` are Apache-2.0.

## 2026-10-28 — F006 Save to GitHub (Claude, reversible)

**Built so it's safe before the owner's setup steps.** Every API endpoint:
- refuses with "not switched on yet" until Cloudflare Access and the GitHub token are configured;
- requires a valid Cloudflare Access sign-in (RS256 JWT checked against the team's keys, audience, issuer and expiry);
- refuses requests from other sites, by requiring a custom header (which forces a CORS preflight), JSON, and a matching Origin.

So even though the preview link is public today, the endpoint can't be used to write to the repo.

Other choices:
- **Content is checked again on the server**: page address, title, description, block data present, Site settings tokens via `validateTokens`, a 512 KB limit. The browser isn't trusted.
- **One commit per save** to `main` through the GitHub contents API, with a readable message ("Save page /about ("About us") from the builder") and the signed-in email. Git history is the undo history (spec). This is the product's designed content path; the "main only through PRs" rule is about code changes.
- **Page files:** `/` → `content/pages/index.json`, `/blog/first` → `content/pages/blog__first.json` (underscores can't appear in addresses).
- **Every save is also kept in the browser.** The message says plainly where it went: "Page saved to GitHub. Visitors see it after you publish." / "saved in this browser. Saving to GitHub isn't switched on yet." / a GitHub error in plain words plus "A copy is safe in this browser."
- **Server code lives in `apps/admin/server`**, with thin route files in `apps/admin/functions/api`. It imports only `@crust/blocks/tokens` and `/content`, so React and Puck stay out of the Worker (35 KB bundle).
- **The deploy now runs from `apps/admin`** so the functions ship with the site. The preview check also calls `/api/status`.
- **Settings the owner adds in Cloudflare Pages** (Settings → Variables and secrets):
  - `GITHUB_TOKEN` (secret)
  - `ACCESS_TEAM_DOMAIN`
  - `ACCESS_AUD`
  - optional: `GITHUB_REPO` (default `hystericmoon/crust`) and `CONTENT_BRANCH` (default `main`)

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
- **F014 click-to-colour:**
  - The preview stays a sandboxed iframe with no scripts. A click on it is mapped back into the page and matched to the colour role that styles that spot, following the same rules as the block styles. For example, text in a Primary section maps to "Text on primary".
  - The matching field is then focused and selected.
  - It's a pointer shortcut only; the form stays the keyboard route.
  - The hint text is hidden on phones, where the preview is a small strip.

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

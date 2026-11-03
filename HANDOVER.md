# Handover

The one file a new Crust session reads to pick up the work. Keep it
current: update "Where things stand" and "Next" every time a feature is
finished and before a session ends. Details live in the files linked
below; this file says where to look and what to do.

## Model plan (owner, 2026-11-03)

The owner picks the model per feature. **First thing every session**,
before any work: find out which model you are (`get_session`, its
`session_context.model`) and compare it with the next feature's row. If
it doesn't match, do nothing else: tell the owner, in one line, "Switch to
<model>: type `/model`, pick <model>, then send the same message again."
**At the end of every feature, and whenever the owner says he wants to
clear**, after the usual handover, end the message with this reminder,
filled in (the owner asked for it every time, 2026-11-03):

> **Ready to clear.** Everything is saved and pushed.
> 1. `/clear`
> 2. `/model` → **<model for the next feature>** (next: <feature>)
> 3. Paste: `Read HANDOVER.md on branch <branch> and continue`

Never show it while work is uncommitted or unpushed; finish that first.

| Next feature | Model | Why |
|---|---|---|
| F083 Stricter template check | **Sonnet** | Clear rules, a checklist, no design choices |
| F084 Rebuild Harbour, Signal and Corner | **Opus** | Premium design and copy; judgment the checks can't measure |
| F063 Store site | Opus (suggested) | Design snapshot, the public face of the store |
| F064 Live demos | Sonnet (suggested) | Follows F063's setup |
| F065 Template versions | Sonnet (suggested) | Well-defined data and checks |
| F066 Checkout | Opus (suggested) | Payments and security |
| F067 Delivery and updates | Opus (suggested) | Licences, downloads, security |
| F068 Licence, terms and refunds | Opus (suggested) | Legal wording for the owner to decide |

"Suggested" rows are confirmed by the owner after F083 (he said he'd
decide the store milestone then); until he has, ask before starting one.
The message after every `/clear` stays the same: "Read HANDOVER.md on
branch <branch> and continue" (branch below, under "Last updated").

Last updated: 2026-11-03 ~07:30 (Jakarta). **F082 Post, blog and 404
designs built, passes** (branch `ccr-d50f7e80-weuq18`, stacked on
F079–F081 in PR #65; done_check exit 0; DECISIONS "F082"). Snapshot
https://claude.ai/artifact/6DUK8yisbSiBT5LuYuhUND (A for all three).
How it fits: model `packages/blocks/src/page-designs.ts` (files
`content/designs/{post,blog,404}.json`, `checkDesign`, `parseDesign`,
nine `designLayouts`, `currentDesign`), blocks
`page-design-blocks.tsx` (`PageDesignContext`, PostTitle, PostDetails,
PostSummary, PostCover, PostHero, PostContent, BlogTitle, BlogIntro,
PostList; config categories `post`/`blog`, hidden in page editors), CSS
"F082" in styles.css. Render: `renderDesignBody` (render.tsx),
`renderDesignedPost`/blog in blog.tsx, `renderNotFound` with
`options.designs`; site.ts reads designs (damaged one stops publish).
Server `apps/admin/server/designs.ts` (`/api/designs`, function +
local-api). Admin `apps/admin/src/designs/` (`store.ts` with browser
copies, `DesignEditor.tsx` with `withDesignEditing`, `DesignLinks.tsx`
cards + Pages row, `context.ts` for the gallery's "Starting designs");
post editor draws the design (`PostFrame` in posts/editing.tsx,
`StaticBlocks` from @crust/render). Templates carry `designs`
(template.ts, server template.ts apply, collect.ts, content-template.ts,
template-check.ts). CI fix in this round: ci.yml "Make room on the
runner" (F081's encoders filled the disk; link died with Bus error).
Needs `reviewed: true`. **Next: F083 Stricter template check**
(done_check in features.json), stacked on this branch or from main once
#65 is merged.

Earlier (~05:00): **F081 Images: WebP, AVIF,
focal point built, passes** (branch `ccr-d50f7e80-weuq18`, stacked on
F079/F080 in PR #65; done_check exit 0; DECISIONS "F081"). Snapshot
https://claude.ai/artifact/Qp4rkNmxNn3AKWKxDTr9hB (A built). How it
fits: crust-publish `media.rs` (`modern_formats`, `modern_file`,
`publish_media_cached` with `--photo-cache`, FNV fingerprint +
`COPIES_VERSION`, threads), `validate.rs` reads `<source srcset>`;
Cargo.toml `[profile.dev.package.crust-publish] opt-level = 2` (AVIF is
~12× slower without it); publish.yml caches `.crust-cache/photos`;
desktop `publish.rs` uses `.crust/photo-cache`, `.avif` MIME in
preview.rs/hosts.rs. Blocks: `media.ts` (`focus` on MediaItem,
`mediaFocus`, `modernFormats`, `modernFile`), `media-img.tsx` (`Img`
renders `<picture class="cr-picture">`, `MediaFocusContext`),
`.cr-picture { display: contents }` + three `>` selectors in
styles.css/motion.ts. Admin: `media/FocusPicker.tsx` (`FocusPicker`,
`MediaFocusProvider` in App.tsx `BuilderCanvas`), MediaPicker "Save
changes", server `/api/media` action `details`; template photos carry
`focus`. check:builder screen "media library, focal point" (fakes
/api/media with page.route). Needs `reviewed: true`. **Next: F082
Post, blog and 404 designs** (design snapshot first; done_check `npm
test -- page-designs && npm run check:a11y`), stacked on this branch
or from main once #65 is merged.

Earlier (~02:30): **F080 Layout library v2
built, passes** (branch `ccr-d50f7e80-weuq18`, stacked on F079: PR #65
is still open and now holds F079 and F080; done_check exit 0;
DECISIONS "F080"). Started at 01:15 by a scheduled message the owner
asked for. Snapshot https://claude.ai/artifact/VpbNu8K34npejqHXQpiYnj
(A built for all three choices). How it fits: sections and pages in
`packages/blocks/src/layouts-v2.ts` (`sectionLayoutsV2`,
`pageLayoutsV2`, `fitLayoutToTokens`), merged in layouts.ts
(`sectionLayouts` = new first, then the first library with `simple:
true`); sample photos `layout-photos.ts` + files in
`apps/admin/public/layout-photos/`; builder copy into Media
`apps/admin/src/layouts/photos.tsx` (`LayoutPhotoWatcher` in App.tsx
`BuilderRoot`, `adoptLayoutPhotos`); mark kept by `isSampleCopy`,
publish stop `uncopiedSampleLabel` (placeholders.ts, used in config.tsx
`withVisibility`); gallery "Simple" group `ItemGrid`/`splitSimple`.
Saved element styles: `apps/admin/src/tabs/element-styles.tsx`
(`SavedStyles`, `_styles` field added in tabs.tsx), stored as
SavedLayout kind `"element"` (server content.ts `checkLayout`). Soft
button fix: section-styles.ts `softFg`/`softBg`. check:layouts renders
`library-v2-<look>`; check:builder has "Section Style tab, saving a
style" and "layout gallery, Hero". Needs `reviewed: true`. **Next:
F081 Images: WebP, AVIF, focal point** (design snapshot first if it has
visible choices; done_check `npm test -- images && cargo test -p
crust-publish && npm run check:perf`), on this branch (stacked) or a new
branch from main once #65 is merged.

Earlier (~23:00): **F079 Slideshow, Card
slider, Tabs, Lightbox, Map built, passes** (branch
`ccr-d50f7e80-weuq18`, restarted from main after F078 merged as PR #64;
done_check exit 0; DECISIONS "F079"). Snapshot
https://claude.ai/artifact/FNRagTiH9MLL4iTdDgHeje (A built for all
four choices). How it fits: blocks in
`packages/blocks/src/interactive.tsx` (Slideshow, CardSlider, Tabs,
`MapBlock` registered as `Map`; `pinFromText`, `mapEmbedUrl`,
`directionsUrl`; scripts `SLIDER_SCRIPT`, `TABS_SCRIPT`,
`LIGHTBOX_SCRIPT`, picked per page by `interactiveTags`, which
render.tsx `videoTag` appends); CSS `interactive-css.ts`
(`INTERACTIVE_CSS`, `needsInteractiveCss`); the Gallery's `lightbox`
switch in more-blocks.tsx; "Show map" reuses `VIDEO_EMBED_SCRIPT` (now
fills a `data-cr-embed-box`). Tabs in the builder are a working React
version (the published page uses the script). Builder:
`apps/admin/src/interactive/` (`MapPinField.tsx` with Nominatim search
in `geocode.ts`, `fields.tsx` `withInteractiveFields`,
`interactiveFieldShown`). Samples in block-samples.ts; check:builder
screens "Map pin field", "Tabs selected", "Slideshow Style tab".
Needs `reviewed: true`. **Next: F080 Layout library v2** (design
snapshot first; done_check `npm test -- layouts && npm run
check:layouts`), on a new branch from main once F079 is merged, or
stacked.

Earlier (~20:30): **F078 Stats, Video,
Table and Pricing, Numbered list built, passes** (branch
`ccr-d50f7e80-weuq18`, from main after F077 merged as PR #63;
done_check exit 0; DECISIONS "F078"). Snapshot
https://claude.ai/artifact/X3bMNKoE6MCU7EqbLJx2mk (A built for all
three choices). How it fits: blocks in
`packages/blocks/src/blocks-v3.tsx` (Stats, Video with
`videoSourceOf`/`VIDEO_EMBED_SCRIPT`/`hasVideoEmbed`, Table with
`tableCells`, Pricing), CSS in `blocks-v3-css.ts` (`BLOCKS_V3_CSS`, only
on pages that use it via `needsBlocksV3Css`), numbered list is the Icon
list's `icon: "numbers"` + `numberStyle` (more-blocks.tsx). Builder:
`apps/admin/src/blocks-v3/` (`TableField.tsx`, `table-edit.ts`,
`fields.tsx` with `withBlocksV3Fields`, `blockFieldShown`,
`videoNotes`); Numbers option in `IconPicker` (`numbers` prop).
render.tsx `videoTag` now also adds the embed script. check:builder
seeds a post `check-blocks` (ids must start with the block type for
`[data-puck-component^=…]`). Needs `reviewed: true`. **Next: F079
Slideshow, Card slider, Tabs, Lightbox, Map** (design snapshot first;
done_check `npm test -- interactive && npm run check:a11y && npm run
check:perf`), on a new branch from main once F078 is merged, or stacked.
Sessions: from now on one session, reset with `/clear` between
features (owner, 2026-11-02); after a clear the owner sends "Read
HANDOVER.md on branch <branch> and continue".

Earlier (~19:00): **F077 Icons, Divider,
Social built, passes** (branch `f077-icons`, from main; done_check
`npm test -- icons && npm run check:a11y` exit 0; DECISIONS "F077").
Direction A of https://claude.ai/artifact/8o1uPhHmTBd9hgkzmx1pU2 (owner
hadn't picked). How it fits: `scripts/sync-icons.mjs` writes
`packages/blocks/src/icons-data.ts` (151 Lucide icons + 16 Tabler social
icons, committed; add icons to `CURATED` and rerun); model in
`icons.tsx` (`searchIcons`, `IconSvg`, `socialLinkOf`, `iconA11y`);
blocks in `icon-blocks.tsx` (Icon, Divider, SocialLinks, `IconMark`);
Card `icon`, Button `icon`/`iconAt` in config.tsx; IconList any icon +
per-line icon in more-blocks.tsx (classic six marks keep their
drawings). Builder: `apps/admin/src/icons/` (`IconPicker.tsx`,
`fields.tsx` `withIconFields`, items.tsx sub-field type `icon`). Publish
check: crust-publish validate.rs `data-cr-needs-name` (icon link without
a name). Samples in block-samples.ts; check:builder screen "Card icon
picker". Screenshots `design/f077-*.png`. Needs `reviewed: true`.
**Next: F078 Stats, Video, Table and Pricing, Numbered list** (design
snapshot first; done_check `npm test -- blocks-v3 && npm run
check:a11y`), on a new branch from main once F077 is merged, or stacked
on `f077-icons`. The owner starts sessions by hand (chain limit): "Read
HANDOVER.md on branch f077-icons and continue".

Earlier today (~17:15): F075 Motion merged (PR #61). F076 notes: model
in `packages/blocks/src/chrome-model.ts` (`headerLayouts`, `layoutOf`,
`TopBar`, `contactHref`, `footerStarter`, menu `children` checks), views
in `chrome.tsx` (`SiteHeaderView`, `MenuList`, `TopBarView`,
`DROPDOWN_SCRIPT`, `hasDropdowns`), CSS in `header-v2-css.ts`
(`HEADER_V2_CSS`, added to published pages only when
`needsHeaderV2Css`; the builder always has it), `heroStyle` in
sections-v2.ts; render.tsx `footerHtml`, `overHero`,
`--cr-header-room`. Admin: `settings/MenuEditor.tsx`,
`ChromeGroups.tsx` (`LayoutPicker`, `TopBarFields`, `FooterKind`).
F070–F076 need `reviewed: true`. F075 (motion): DECISIONS "F075",
`motion.ts`, `motionCss` in `renderDocument`.

Earlier (2026-11-02 13:10, Jakarta): **F070–F074 merged to main** (owner: "Merge em all"; PRs #54–#59, merge commits, in order). Start F075 on a new branch from main. PRs #53 (F062) and #45 (F053)
**merged to main** (owner had said to merge). Then the owner said our
templates aren't premium next to eliras/zorven/labzzy.webflow.io and
chose **B: upgrade the design layer, "all in"**, and asked for a
YOOtheme comparison. Gap page:
https://claude.ai/artifact/ULmnd4JZEKpGvyUHFg1Kpo
(`design/yootheme-gap-v1.html`); first comparison
https://claude.ai/artifact/FMb9QuLomsLCvQC9aZscf3. See DECISIONS
Proposals "Premium design layer".
**Milestone 8 approved** (owner, 2026-11-02: "Let's go A"):
`docs/milestone-8.md`, F070–F084 in features.json; F063 now depends on
F084, so the store waits. Owner allowed OFL fonts, MPL and BlueOak.
**F070 Fonts built, passes** (branch `f070-fonts`, PR stacked on #54;
DECISIONS "F070"). How it fits: `packages/blocks/src/fonts.ts`
(`bundledFonts`, `fontPairs`, `fontFaceCss`, `fontPreloads`), files in
`packages/blocks/fonts/` (`npm run fonts:sync`), crust-publish
`fonts.rs` (`--fonts`), desktop `build_site(.., fonts)`, picker in
`SiteSettings.tsx` (`FontPairs`, `FontField`). **F071 Type and detail styles built, passes** (branch
`f071-type-styles`, stacked on f070-fonts; DECISIONS "F071"): style
options in `style-options.ts` (`displaySize`, `labelsUseMono`), Heading
`size`/`eyebrow`, Button soft/arrow, Card `layout: cover`, UI in
`StyleGroups.tsx` (`DisplayOptions`). **F072 Style library built, passes** (branch `f072-style-library`,
PR #57, stacked on f071-type-styles; DECISIONS "F072"). Snapshot
https://claude.ai/artifact/GaX1QoHvVTp8S3bU1ybxsa (A built). How it
fits: `packages/blocks/src/style-library.ts` (`styleLooks`, 12 looks ×
3 colourways, `applyLook`, `matchingLook`), tests in
`style-library.test.ts`, `StyleLibrary` in `SiteSettings.tsx` (dots are
`.st-cw*` in `settings.css`). Screenshots `design/f072-styles*.png`
(Playwright over apps/admin/dist: open `#/settings`, click
`.st-look:has-text("Atelier")`, screenshot `#presets`).
**F073 Sections v2 built, passes** (branch `f073-sections-v2`, stacked
on `f072-style-library`; DECISIONS "F073"). Snapshot
https://claude.ai/artifact/NK9TwfBQMN6s6LHuEAuWQi (A built). How it
fits: `packages/blocks/src/sections-v2.ts` (widths, `backgroundKindOf`,
`gradientColours`/`gradientReads`, `focusPosition`, `videoAddress`,
`VIDEO_SCRIPT`, `headerOverStyle`, `onlyFirstHeaderOver`), Section
render in `config.tsx`, CSS in `styles.css` ("Sections v2"); renderer
adds `videoTag` and `headerOver` (`render.tsx`, `blog.tsx`); builder
fields in `apps/admin/src/sections/sections-v2-fields.tsx`
(`sectionFieldShown` is used by `tabs.tsx` resolveFields), canvas
header in `chrome-canvas.tsx`. check:layouts has `sections-v2-<look>`
pages (`sectionsV2Samples`); check:builder screens can press buttons
after selecting a block (`then`).
**F074 Rows and columns v2 built, passes** (branch
`f074-rows-columns-v2`, stacked on `f073-sections-v2`; DECISIONS
"F074"). Snapshot https://claude.ai/artifact/9mia2cufYDWGXjSPr3zYbn (A
built). How it fits: `packages/blocks/src/columns-v2.ts` (`rowExtras`,
`columnExtras`, `dividerModes`, `reversedFocusWarning`), Columns render
in `config.tsx`, CSS "Rows and columns v2" in `styles.css`; builder
fields in `apps/admin/src/sections/columns-v2-fields.tsx` (added in
`withSectionEditing`, Widths moved to the top of the Style tab). Sample
pages `columns-v2-<look>` in check:layouts (`columnsV2Samples`).
**Next: F075 Motion** (design snapshot first), on a new branch from
`main` (everything through F074 is merged). The owner starts sessions
by hand now: the old session chain hit its limit, so a fresh session
gets the prompt "Read HANDOVER.md on branch main and continue". Branch `f063-store-site` (PR #54) holds the comparison
pages, the M8 write-up and a midnight test fix; no store code. Start
F070 on a new branch from main once #54 is merged, or stack on it.
This session can't start new sessions (chain limit): if it ends, the
owner starts a fresh one with "Read HANDOVER.md on branch
f063-store-site and continue".

## How sessions work (owner's rule, updated 2026-11-02)

The owner said (2026-11-02): "Let's use clear instead of creating new
sessions moving forward." So the work stays in **one Crust session**,
and its context is reset with `/clear` instead of starting new sessions:

1. **One session, cleared between features.** Don't call
   `create_session` to hand over, and don't archive the current session.
   (The old rule chained new sessions; the chain stopped at depth 8.)
2. **Write first, then clear.** After each finished feature (or when the
   context is getting long): commit and push, update this file,
   PROGRESS.md and CHANGELOG.md, so a cleared context can pick up from
   here. Then tell the owner it's ready for `/clear`.
3. **After a clear,** the owner sends "Read HANDOVER.md on branch
   <branch> and continue" in the same session; the session starts from
   this file as before.
4. **Tell the owner** in plain language what was finished and what he
   can try. Never stop without doing 2 and 4. "Keep on continuing,
   don't stop."

## The owner

Hosni (GitHub `hystericmoon`), senior product designer, not a developer.
Tests as a user from a browser (office Mac, phone); never runs commands.
Write to him in plain language, from a user's point of view. Peer-level on
visual design; explain the reasoning behind UX choices (heuristics,
research). Always flag accessibility.

Standing instructions:
- "Keep on continuing, don't stop": keep building the current milestone
  without waiting for him.
- Don't merge feature PRs to main, and don't press Publish on the live
  site, unless he says so in his own words.
- Scope is his: never add items to features.json. Proposals go in
  DECISIONS.md → Proposals.
- Design snapshots (Artifacts with 2–3 directions) before visual features;
  build Claude's recommended direction unless the feature says the owner
  must pick first.

## Rules that always apply

CLAUDE.md (session protocol, decision policy, engineering rules) and
docs/spec.md (the product and the content format). In short: one feature
at a time, tests for everything, its `done_check` must exit 0 before
`passes: true`, WCAG 2.2 AA, free open-source dependencies only, no
secrets in code or chat, work on branches, no force-push.

Start of every session: `scripts/init.sh`, then read this file,
PROGRESS.md, features.json, `git log --oneline -20`.

Before every push: `npm test`, `npm run typecheck`, `cargo test`,
`cargo clippy -- -D warnings`.

## Where things stand

- **Live site** https://crust-site.pages.dev: published 2026-10-31
  (Milestones 1–5). Only the owner decides when to publish. Main now
  also has F053 (Signal and Corner photos), which shows on the live
  site only after the next Publish.
- **Admin** https://crust-admin.pages.dev: main, Milestones 1–6 merged
  (M5: PRs #33–#39; F054 #43, F069 #44; F053 #45; M6: #46–#53,
  2026-11-02).
- **Desktop app** (M6, F055–F062): built and tested in CI, never
  installed by the owner yet. Installers: Actions → "Desktop installers"
  (by hand, ~150 counted minutes, ask first). Updates need the update
  key (BLOCKED.md, docs/setup-updates.md).
- **Needs `reviewed: true` from the owner:** F062 (try
  https://crust-admin.pages.dev/#/templates?examples), plus the older
  ones listed in PROGRESS.md "Waiting on the owner".

- **Waiting on the owner:** see PROGRESS.md "Waiting on the owner"
  (preview links to try, F034–F046 still need `reviewed: true`), and
  BLOCKED.md (F037 contact form email setup, F044 buying a domain).
- **Design snapshots so far:** roadmap
  https://claude.ai/artifact/4eHUDzJ3tDeeaNPBf4T4ii, F042
  https://claude.ai/artifact/1d1Ujx7ENSrGCef6CWfg9Z, F043
  https://claude.ai/artifact/DSXzme9pbKie3guoRpSizj (A built for both), F048
  https://claude.ai/artifact/JQoY8bbRJ9U58jZawRx2kV (A built), F052
  https://claude.ai/artifact/FksfsnM6msMtjBu4v5YHDm (waiting), F053
  https://claude.ai/artifact/B3dfAGM3m15EcN1n83oooB (A built for both), F056
  https://claude.ai/artifact/JdsQXqRu8kTu5KwQQ8qcb9 (A built), F057
  https://claude.ai/artifact/7nKCuGhkAuhTJ5gMEXxfw3 (A built), F058
  https://claude.ai/artifact/DMXMZc8NdDTNRXSFEBBuah (A built). F059: no
  snapshot (screenshots design/f059-*.png). F060
  https://claude.ai/artifact/Lx5SeC9B1GmSN3ztFebA3t (A built). F061: no
  snapshot (screenshots design/f061-*.png). F062
  https://claude.ai/artifact/B53eSPBXNaCJmAL6DNUeQs (A, owner's pick).

## Next

The owner approved a lot on 2026-10-31 evening; see DECISIONS.md
"Free Crust, desktop app, M6 and M7 approved". In order:

1. ~~F053 Signal and Corner with real photos~~ **built, passes**
   (PR #45, branch `f053-signal-corner-photos`). Snapshot
   https://claude.ai/artifact/B3dfAGM3m15EcN1n83oooB
   (`design/f053-signal-corner-v1.html`); A built for both. If the owner
   says "B for Signal/Corner", rework on the same branch before merge.
   Photos live in `scripts/starter-templates/photos/{signal,corner}/`,
   layouts in `starter.ts` (`signalHome`, `cornerHome`, …), photo lists
   in `photo-sets.ts`. Commons rate-limits hard from here (429 for
   ~20 min): one request every ~30 s, back off to 5 min, never write a
   file before the download succeeds. Fixes 11 (template check sees
   layout, M) and 12 (Harbour polish, needs new photo hunt) did NOT ride
   along; still in DECISIONS Proposals.
   ~~F055 Desktop app shell~~ **built, passes, CI green** (PR #46,
   branch `f055-desktop-shell`, from main). See DECISIONS "F055". How it
   fits: `crates/crust-desktop` (Rust: four file commands fenced to the
   site folder, photos at /media via `set_assets`, `CRUST_SELF_CHECK=1`
   window self-check run in CI under xvfb); `apps/admin/src/desktop/`
   (opens the folder, routes /api to the server handlers in the window,
   `desktopContent()` replaces the built-in site.json/pages/posts).
   Building the crate needs `apps/admin/dist` (`npm run build` first)
   and the GTK/WebKit libraries (CI installs them; locally the same
   `apt-get install` line as ci.yml). CI's `check` job now takes ~23 of
   its 35 minutes. Installers: Actions → "Desktop installers" (by hand
   only, ~150 counted minutes; ask the owner first).
   ~~F056 Publish on your computer~~ **built, passes** (PR #47, branch
   `f056-publish-on-computer`, stacked on #46). See DECISIONS "F056".
   How it fits: `packages/render/src/site.ts` is the one render step
   (pipeline's cli.ts and the app both call it);
   `apps/admin/src/desktop/local-publish.ts` renders from the site
   folder and calls the app; `crates/crust-desktop/src/publish.rs`
   (finish with crust-publish, Pagefind via crust-publish's `search`
   feature, export) and `preview.rs` (127.0.0.1 server); card:
   `apps/admin/src/publish/DesktopPublishPanel.tsx`. Snapshot
   https://claude.ai/artifact/JdsQXqRu8kTu5KwQQ8qcb9 (A built).
   Building crust-desktop locally: `npm run build`, the ci.yml
   `apt-get` line, then `cargo build -p crust-desktop --features
   tauri/custom-protocol`; screenshot with `xvfb-run` + `import -window
   root` (how design/f056-app-publish-card.png was made).
   ~~F057 Several sites~~ **built, passes** (PR #48, branch
   `f057-several-sites`, stacked on #47). See DECISIONS "F057". How it
   fits: `crates/crust-desktop/src/sites.rs` (`Sites`: the Crust folder,
   the open site, create/rename/duplicate/delete/restore, Recently
   deleted in `Crust/.Recently deleted`, open site remembered in
   `Crust/.sites.json`); the file commands take an optional `site`
   (arg, or `x-crust-site` header for writes); `apps/admin/src/sites/`
   (`sites.ts` API, `SitesScreen.tsx`, route `#/sites`, desktop only;
   Pages header gets "All sites"). Per-site publish settings for F058
   go in the site's `.crust` folder (`.crust/hosts.json` is already
   left out of duplicates). Screenshots: design/f057-sites-screen.png
   (made with Playwright over `apps/admin/dist` and a fake
   `__TAURI_INTERNALS__`, quicker than the real window for a screen).
   **CI time warning:** on #48 the `check` job took 30 of its 35
   minutes (ci.yml `timeout-minutes`). If F058 adds much Rust (HTTP
   client, keychain), expect it to cross 35: either cache `target/`
   better or raise the limit, and log it in DECISIONS (it costs free
   minutes, so mention it to the owner).
   ~~F058 Publish to Cloudflare Pages or Netlify~~ **built, passes**
   (PR #49, branch `f058-publish-to-host`, stacked on #48). See
   DECISIONS "F058". How it fits: `crates/crust-desktop/src/hosts.rs`
   (`Client`: Cloudflare direct upload and Netlify digest deploy, base
   URLs overridable with `CRUST_CLOUDFLARE_API` / `CRUST_NETLIFY_API`;
   `HostService`: connect/replace token/disconnect/publish for a site;
   `Keychain` trait, `SystemKeychain` via keyring, `MemoryKeychain` for
   tests and the self-check); `.crust/hosts.json` holds the connection
   and the keychain entry's name; commands `host_*` in lib.rs (progress
   event "host-progress"). UI: `apps/admin/src/publish/hosts.ts`,
   `HostPublish.tsx`, inside `DesktopPublishPanel`. Tests use a fake
   host server on 127.0.0.1 (`src/hosts/tests.rs`). `scripts/fake-tauri.js`
   runs app-only screens in a plain browser (check:builder uses it; also
   handy for screenshots). CI `check` limit raised to 45 minutes; on #49
   it took 21 minutes (with a fresh Rust cache). Never tried against a real host (no account here):
   if the owner's first real publish fails, expect a small API detail.
   ~~F059 Publish by FTP or SFTP~~ **built, passes** (PR #50, branch
   `f059-ftp-sftp`, stacked on #49). See DECISIONS "F059". How it fits:
   `crates/crust-desktop/src/ftp.rs` (settings, `.crust/ftp-sent.json`
   memory, `plan`, `run`), `ftp/ftp_remote.rs` (suppaftp, FTP/FTPS),
   `ftp/sftp_remote.rs` (russh + russh-sftp; server key remembered in
   `FtpSettings.host_key`); `hosts.rs` has `HostKind::Ftp`,
   `Connection.ftp`, `connect_ftp`, `resend_all`; commands
   `host_connect_ftp`, `host_resend_all`. UI: `FtpDialog`,
   `PasswordDialog` in `HostPublish.tsx`. Tests start real FTP/FTPS
   (libunftp) and SFTP (russh server) servers in `ftp/tests.rs`.
   `scripts/fake-tauri.js` takes host "ftp" / "ftp-plain". Screenshots
   design/f059-*.png (made with Playwright + fake-tauri). CI `check`
   took 28 of its 45 minutes on #50 (FTP/SFTP crates added ~5 min).
   ~~F060 First run~~ **built, passes** (PR #51, branch
   `f060-first-run`, stacked on #50). See DECISIONS "F060". How it
   fits: `apps/admin/src/first-run/` (`first-run.ts`: `isFirstRun`,
   `makeFirstSite`, `landInBuilder`; `FirstRun.tsx` the screen;
   `arrival.ts` the one-time "open To replace" flag read by
   `placeholders/Checklist.tsx`); `desktop.ts` `launchDesktop` decides
   welcome screen or site, `main.tsx` renders one or the other. The
   fake app for tests moved to `sites/fake-app.ts`. `fake-tauri.js` takes
   `firstRun: true`. The window self-check (`self_check.js`) goes
   through the welcome screen first (Blank), so CI covers it; CI gives
   it its own Crust folder (`$RUNNER_TEMP/crust-home/crust-site`),
   because other folders beside the site count as sites.
   **CI time warning:** on #51 the `check` job took 41 of its 45
   minutes (a cold Rust cache after the FTPS fix; #50 took ~5 with a
   warm one). If F061 adds Rust (tauri-plugin-updater), expect it to
   cross 45: improve the `target/` cache or raise the limit, log it in
   DECISIONS and mention it to the owner (free minutes).
   **F059 CI fix (on #50):** FTPS connections that break off are tried
   up to three times (libunftp switches to TLS late); see DECISIONS
   F059, last bullet.
   ~~F061 Updates built in~~ **built, passes** (PR #52, branch
   `f061-updates`, stacked on #51). See DECISIONS "F061". How it fits:
   `crates/crust-desktop/src/updates.rs` (`Updates`: check/download/
   install_ready over tauri-plugin-updater; feed address and public key
   built in at release, `CRUST_UPDATE_URL`/`CRUST_UPDATE_PUBKEY` at start
   only in debug builds; installs on `RunEvent::Exit`), tests in
   `src/updates/tests.rs` (fake downloads site on 127.0.0.1, keys made
   with the `minisign` crate, plus one file signed by the real `tauri
   signer`). Window: `apps/admin/src/updates/` (`updates.ts`: API,
   `Updater` state, once-a-day timing; `UpdateNotice.tsx`: banner on the
   Pages and Sites screens, Crust card on Sites). Release:
   `scripts/updates-site.ts` (feed + download page), what's new in
   `crates/crust-desktop/whats-new.json` (bump with the version in
   tauri.conf.json), Desktop installers workflow "Put on the downloads
   site", new "Make update key" workflow, owner guide
   `docs/setup-updates.md`. `fake-tauri.js` takes `update: "available"`.
   The window self-check asks `update_status`/`update_check` (CI has no
   key, so "off"). Tests turn on tauri's `test` feature, so `cargo test`
   rebuilds the tauri crate once more than `cargo build` (~1 min of CI).
   ~~F062 Premium templates in the gallery~~ **built, passes** (PR #53,
   branch `f062-premium-templates`, stacked on #52). Owner picked A of
   https://claude.ai/artifact/B53eSPBXNaCJmAL6DNUeQs. See DECISIONS
   "F062". How it fits: `apps/admin/src/templates/catalogue.ts`
   (`readCatalogue`, `loadCatalogue`, `catalogueSource`;
   `STORE_CATALOGUE_URL` is null until the store exists: **F063 must set
   it** to the store's catalogue address); `TemplatesScreen.tsx`
   (`PremiumGroup`, `PremiumDetail`, `openInBrowser`); Rust command
   `open_link` (https only) in lib.rs. Catalogue format in docs/spec.md:
   **F063's store writes exactly this file.** Example catalogue in
   `apps/admin/public/sample-catalogue/` (regenerate with `npm run build
   && node scripts/sample-catalogue.mjs`), shown at
   `#/templates?examples`. check:builder covers three premium screens.
   **Next: F063 Store site** (Milestone 7, docs/milestone-7.md; design
   snapshot first; done_check `npm test -- store && npm run check:a11y
   && npm run check:perf`). It writes the catalogue file F062 reads. Open proposals worth
   raising: "App wording", "Browser copies in the app" (found with
   F060: unsaved colours/drafts are shared between sites in the app),
   `.htaccess` redirects for FTP hosts.
   Owner-facing notes still open: Pagefind brings minicbor
   (BlueOak-1.0.0) and Tauri brought MPL-2.0 packages (DECISIONS
   "F056"), owner told, no answer yet. F058/F059 never tried against a
   real host account. F061 never tried with a real release (needs the
   update key and a ~150-minute installers run; owner's call).
2. ~~Write Milestones 6 and 7~~ done 2026-10-31 (F054–F068; F054 depends
   on F048 so M6 can start while F053 waits for the owner).
   **F054 Content store done and merged** (PR #43). After F053:
   **F055 Desktop app shell** (Tauri 2; the app
   gives LocalStore a Folder backed by Tauri file commands; see
   `apps/admin/server/local-store.ts` and DECISIONS "F054").
3. ~~Review the 48 `needs_review` features~~ done 2026-10-31: all have
   `reviewed: true` + `review_note`; 12 fixes in DECISIONS.md
   Proposals "From the review"; page for the owner
   https://claude.ai/artifact/53YM8oVKV9XrECZJSNHo1J
   (`design/review-2026-10-31.html`). Owner chose A (2026-11-01, "go
   with all your recommendations"): **F069 Review fixes built and
   merged** (PR #44), done_check exit 0. Fixes 11–12
   ride with the next template work. Leftover: the "+" between sections
   overlaps the Section toolbar slightly (DECISIONS F069).
4. ~~Live site publish~~ checked: run 3 succeeded, site up.

## Where to find things

| What | File |
|---|---|
| Product, architecture, content format | docs/spec.md |
| Milestone plan | docs/milestone-5.md (earlier: docs/milestone-*.md) |
| Every feature, its done_check and status | features.json |
| What happened, what the owner should test | PROGRESS.md |
| Why things are the way they are | DECISIONS.md |
| What only the owner can do | BLOCKED.md |
| User-visible changes | CHANGELOG.md |
| Setup guides for the owner | docs/setup-*.md |

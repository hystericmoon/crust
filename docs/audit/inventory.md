# Crust UI inventory (for the UX audit)

Read-only inventory built from code on 2026-11-25. Routes come from `apps/admin/src/App.tsx` (`parseRoute`). "(inferred)" marks anything not seen directly in code.

Variant codes: **E** empty · **L** loading · **Er** error · **F** first-run · **Sel** selected · **D** dialog open · **Long** long content · **M** phone width (under 768px) · **—** no variant worth capturing.

Routing summary: `#/` or empty opens the Home page editor (`#/edit?path=/`). `#/edit?path=…` opens a page. On a phone (`prefersQuickEdit`) that route opens Quick edit instead. `#/?focus=publish` opens the page list with Publish focused. `#/settings`, `#/templates`, `#/posts`, `#/post?slug=`, `#/section?id=&from=`, `#/design?kind=post|blog|notFound`. `#/sites` shows the Sites screen only in the desktop app; in the web admin it falls through to the page list.

---

## 1. First run and onboarding

| ID | Screen or state | How to reach it | Source file | Variants |
|---|---|---|---|---|
| S01 | First-run chooser: "Welcome · Crust", "1. Start from", Blank option ("One empty Home page…"), template cards, "Make my site" | Desktop app only, on first launch with no site (`main.tsx` renders `FirstRun` when launched with a `firstRun` context) | `first-run/FirstRun.tsx`, `first-run/first-run.ts` | F, L ("Loading a template…"), Er ("This template couldn't be loaded."), Sel, M |
| S02 | Template preview inside first run ("Loading the template…") | Select a template card in S01 | `first-run/FirstRun.tsx` | L, Er |
| S03 | Suggested name prefill ("My site" or template's site name) | Shown in S01 on the naming step | `first-run/first-run.ts` (`suggestedName`, `BLANK_NAME`) | F, Long |
| S04 | Open-to-replace arrival after a template choice | Set by `setOpenToReplace` and read in the editor (inferred) | `first-run/arrival.ts` | — |

## 2. Sites list and templates

| ID | Screen or state | How to reach it | Source file | Variants |
|---|---|---|---|---|
| S05 | Your sites (desktop): table "Site / Last edited / Actions", "Your sites" h1 | `#/sites` in the desktop app; the site menu links to it | `sites/SitesScreen.tsx` | E, L ("Loading your sites…"), M, Long |
| S06 | Delete site dialog: "Delete “{name}”?" | Actions column on S05 | `sites/SitesScreen.tsx` | D |
| S07 | Deleted sites section | Lower part of S05 when any site was deleted | `sites/SitesScreen.tsx` (`deleted-sites-h`) | Sel |
| S08 | Start from a template (main screen): "Templates" nav, "Premium templates", preview pane with "Preview width" control | `#/templates`; also "Start from a template" banner | `templates/TemplatesScreen.tsx`, `templates/TemplateBanner.tsx` | L ("Checking what your site has…"), E ("Premium templates show here when you're online."), Sel, M |
| S09 | Template preview: "Blog:" page list and "Open in your browser" link | Select a template on S08 | `templates/TemplatesScreen.tsx` | Sel, Long |
| S10 | Replace-your-site confirmation: "Replace your site with “…”?" with "Replaced" and "Kept" lists | Apply a template on S08 | `templates/TemplatesScreen.tsx` | D, Long |
| S11 | Open a template file (local `.crust` file) and its error "That file can't be used as a template:" | "Open a template file…" on S08 | `templates/TemplatesScreen.tsx`, `templates/local-site.ts` | Er, D |
| S12 | "Already bought it? Open the file" and "This page can't be shown." error | S08 premium area | `templates/TemplatesScreen.tsx` | Er |
| S13 | Template banner shown in the page list | Page list top, `TemplateBanner` | `templates/TemplateBanner.tsx` | — |

## 3. Page editor

| ID | Screen or state | How to reach it | Source file | Variants |
|---|---|---|---|---|
| S14 | Page editor (Puck builder) for a page | `#/edit?path=/about`; Home is the default | `App.tsx` (`Builder`), `app-frame/EditorBar.tsx` | E (new page from template), L, Er ("There's no page at {path}"), Sel, D, Long, M (goes to quick edit instead) |
| S15 | "There's no page at {path}" | Route to a path with no draft, no GitHub page, no bundled page | `App.tsx` (`Builder`, `QuickEditScreen`) | Er |
| S16 | Top bar in the editor: page switcher, Settings button, Undo, Redo, Page width (Desktop 1280 / Tablet 768 / Mobile 375), Settings panel toggle, Preview | Always in S14 | `app-frame/EditorBar.tsx`, `App.tsx` (`viewports`) | Sel, M |
| S17 | Left rail: Pages panel, Media panel, Styles panel, Site settings button, Keyboard shortcuts link, Back button | Rail in S14 (`railPlugins`) | `app-frame/rail.tsx` | Sel, D (rail panel open), Long |
| S18 | "This page" / "Your site" groups in the page rail (Pages panel) | Rail → Pages | `pages-panel/PagesRail.tsx`, `pages-panel/PagesPanel.tsx`, `app-frame/rail.tsx` | E ("No pages yet…"), Long |
| S19 | Section toolbar on a selected section (Make linked, Save as layout, delete, move) | Click a section on the canvas | `sections/section-toolbar` (test name), `linked/fields.tsx`, `layouts/SaveLayoutAction.tsx` | Sel, M (inferred) |
| S20 | Keyboard drag/move mode for a section (keyboard alternative to drag) | Keyboard focus on a section, shortcut from S24 | `keyboard/KeyboardEditing.tsx`, `keyboard/moves.ts`, `keyboard/drag-status.ts` | Sel, D |
| S21 | Add-section gallery: "Add a section", "Search layouts", type select (Sections / …), "Plainer layouts from the first library" | "+" between sections, or the layouts button | `layouts/LayoutGallery.tsx`, `layouts/LayoutInserters` | E (no results), L, D, Long |
| S22 | Gallery "Insert" choice: "On this empty page" option | Gallery on an empty page | `layouts/LayoutGallery.tsx` | E |
| S23 | Replace whole design confirm: "It replaces the whole design. Undo brings it back." | Choose a layout that replaces the page | `layouts/LayoutGallery.tsx` | D |
| S24 | Keyboard shortcuts dialog ("Keyboard shortcuts") | Rail "Keyboard shortcuts" link | `keyboard/tooltips.ts`, `app-frame/rail.tsx` | D |
| S25 | Section settings (fields panel for a selected section, Content / Style / Advanced tabs) | Select a section → right-hand fields panel (`SettingsPanel` override) | `page-first/PageFirst.tsx`, `tabs/tabs.tsx`, `sections/editing.tsx` | Sel, Long, M |
| S26 | Section settings: visual Section fields and placeholders checklist | Section fields panel | `sections/sections-v2-fields.tsx`, `placeholders/Checklist.tsx` | Sel, E |
| S27 | Page settings ("Page settings" label): search and sharing (SEO) fields | Settings button in the editor top bar | `seo/fields.tsx`, `page-first/PageFirst.tsx` | Sel, E, Long |
| S28 | Next steps / placeholder checklist: "Not ready to publish yet:" and sample words or photos to replace | Shown in page editor and publish panel | `placeholders/Checklist.tsx`, `publish/PublishPanel.tsx` | Long, E (nothing to do) |
| S29 | Layout photo prompt (photo replacement watcher) | Shown when a layout with photos is inserted (inferred) | `layouts/photos.tsx` | D |
| S30 | Media picker dialog "Choose an image" on an image field | Any image field → Choose | `media/MediaPicker.tsx`, `media/ImageField.tsx` | D, E ("No image yet."), Sel, Long, M |
| S31 | Image focus picker (choose focal point) | Image field → focus control | `media/FocusPicker.tsx` | D, Sel |
| S32 | Responsive per-device settings (Desktop / Tablet / Mobile overrides) | Width toggle in S16, then fields | `responsive/fields.tsx` | Sel, M |
| S33 | Inline text editing and rich text (Text blocks) | Click text on the canvas | `inline-text/InlineText.tsx`, `rich-text/field.tsx` | Sel, Long |
| S34 | Save status bar in the editor ("Save" phases, "Try again" on failure) | Bottom of S14 (`SaveStatus`) | `save-status.tsx`, `app-frame/status.ts`, `app-frame/autosave.ts` | Er, L (saving), Sel |
| S35 | Publish button in editor top bar (publishes after autosave) | Top bar of S14 (`onPublish`) | `app-frame/AppTopBar.tsx`, `App.tsx` | Er (failed) |

## 4. Posts and blog

| ID | Screen or state | How to reach it | Source file | Variants |
|---|---|---|---|---|
| S36 | Posts list (blog): "Posts · Crust" page, "Delete this post?" confirm | `#/posts` | `posts/PostList.tsx` | E, L ("Loading…"), D, Long, M |
| S37 | "New post" dialog | "New post" button on S36 | `posts/PostList.tsx` | D, Er (validation) |
| S38 | "Blog page" dialog (the blog listing page's settings) | Blog page action on S36 | `posts/PostList.tsx` | D |
| S39 | Post editor (same builder, post details in "Post settings") | `#/post?slug=…` | `App.tsx` (`PostBuilder`), `posts/editing.tsx` | Sel, Er ("There's no post at /blog/{slug}"), L, Long |
| S40 | "Saving works on crust-admin.pages.dev." note (saving not connected) | Posts list when GitHub saving is off | `posts/PostList.tsx` | E |
| S41 | Post held, not saved: "Kept in this browser, not saved yet: …" (validation problems) | Post with missing required fields in S39 | `App.tsx` (`PostBuilder.save`), `posts/store.ts` | Er |

## 5. Media

| ID | Screen or state | How to reach it | Source file | Variants |
|---|---|---|---|---|
| S42 | Media library picker: search ("Search photos"), grid, upload | Any image field (S30) | `media/MediaPicker.tsx` | E, L, D, Long, M |
| S43 | Delete photo confirm: "Delete this photo?" | Photo in S42 | `media/MediaPicker.tsx` | D |
| S44 | Web address for an image ("Use a web address instead") | Expand inside S30 | `media/ImageField.tsx` | Sel, Er (bad URL) |
| S45 | Media panel in the rail | Rail → Media (`MediaPanel`) | `app-frame/rail.tsx` | E, Long |
| S46 | Image size shrink and optimise step (inferred from file name) | On upload | `media/shrink.ts` | L |

## 6. Look (styles) and Site settings

| ID | Screen or state | How to reach it | Source file | Variants |
|---|---|---|---|---|
| S47 | Site settings screen: "Site settings" h1, nav "Style groups", live preview aside ("Live preview") | `#/settings`; or Site settings button in the rail | `settings/SiteSettings.tsx`, `styles-panel/SiteSettingsSheet.tsx` | Sel, Long, M, Er (save fails) |
| S48 | Styles panel (whole-site look in the builder rail): "How the whole site looks…" | Rail → Styles | `styles-panel/StylesPanel.tsx`, `styles-panel/context.ts` | Sel (section mode), D, Long |
| S49 | Style groups: Styles (presets), Colours, Buttons, Cards, Links, Motion, Section styles | Site settings nav | `settings/StyleGroups.tsx`, `settings/SiteSettings.tsx` | Sel, Long |
| S50 | Typography: font pairs ("System: Fonts on visitors' devices, nothing to download") | Site settings → Typography | `settings/SiteSettings.tsx`, `settings/fonts-picker.test.tsx` (test name) | Sel, Long |
| S51 | Spacing and Shape & layout groups | Site settings nav | `settings/SiteSettings.tsx` | Sel |
| S52 | Contrast checks ("Contrast checks") | Site settings → colours | `settings/SiteSettings.tsx` | Er (fails), E |
| S53 | Header & menu group (menu editor) | Site settings → Header & menu | `settings/ChromeGroups.tsx`, `settings/MenuEditor.tsx` | E, Long, Sel |
| S54 | Footer group: "Shown at the bottom of every page." | Site settings → Footer | `settings/ChromeGroups.tsx` | Sel |
| S55 | Theme pack: "Use this theme", "Header and footer look…", "My layouts (none saved yet)", "Using…" | Site settings → Theme pack | `settings/ThemePack.tsx` | E, Sel, L, Long |
| S56 | Save as template group | Site settings → Save as template | `settings/SiteSettings.tsx` | D (inferred) |
| S57 | Site address group ("Site address") | Site settings → Site address | `settings/SiteAddress.tsx` | Er, Sel |
| S58 | Discard and Save bar for Site settings changes | Bottom of S47 when dirty | `settings/SiteSettings.tsx`, `save-messages.ts` | Er |

## 7. Publish and hosting

| ID | Screen or state | How to reach it | Source file | Variants |
|---|---|---|---|---|
| S59 | Page list with Publish panel (web admin) | `#/` or `#/?focus=publish`; Publish button in top bar | `pages/PageList.tsx`, `publish/PublishPanel.tsx`, `publish/shortcut.tsx` | E, L, Er ("Showing the pages in this browser for now."), Long, M |
| S60 | Publish panel: "The link to your live site appears here after your first publish." and changes list | S59 | `publish/PublishPanel.tsx`, `publish/changes.ts` | E, Long |
| S61 | Where this site is published (host chooser): Cloudflare, Netlify, "Your own web host" | Publish → "Where should this site live?" | `publish/HostPublish.tsx`, `publish/hosts.ts` | E, Sel, Er |
| S62 | Checking where this site is published… | Publish panel while status loads | `publish/HostPublish.tsx` | L |
| S63 | Connect FTP/SFTP form: "How to send files" (SFTP recommended / FTPS / FTP not encrypted), "Warning, not encrypted." | "Your own web host" → Connect | `publish/HostPublish.tsx` | Er, Sel, D |
| S64 | Type the password again (confirm for a host) | Host connect step | `publish/HostPublish.tsx` | D, Er |
| S65 | Upload progress ("Upload progress", "Only changed files are sent…") | During a publish | `publish/HostPublish.tsx` | L |
| S66 | "Your site is live." result with build report | After a successful publish | `publish/HostPublish.tsx` (`describeBuild`) | Sel |
| S67 | Desktop publish: "Or keep it on this computer", build "Opened in your browser.", "Exported.", "Replace “{folder}”?" | Desktop app, Publish panel | `publish/DesktopPublishPanel.tsx` | D, Er, Sel |
| S68 | Blocked publish: "Not ready to publish yet: …" with placeholder count | Publish panel when pages have sample content | `publish/PublishPanel.tsx` | Er |
| S69 | Custom domain guide (link opens new tab) and "Until Cloudflare says the domain is connected…" | Site settings → Site address | `settings/SiteAddress.tsx` | Sel, E |
| S70 | Contact form setup: form fields, "Thank-you message", "Button label", "Required", "This form isn't connected yet." (public-side message) | Contact form block: field editor is in the blocks package; the setup screen itself was not located in admin code (inferred: block fields) | `packages/blocks/src/contact-form.tsx`, `packages/contact/src/worker.ts` | E, Er, Long |

## 8. Quick edit (phone)

| ID | Screen or state | How to reach it | Source file | Variants |
|---|---|---|---|---|
| S71 | Quick edit page: "Quick edit" h1, groups of words and photos | Any page on a phone (`#/edit?path=…`); or `mode=quick` | `quick/QuickEdit.tsx`, `quick/quick.ts` | M, L, E ("This page has no words or photos to change yet."), Sel, Long |
| S72 | Quick edit photo picker | Photo in S71 → MediaPicker | `quick/QuickEdit.tsx`, `media/MediaPicker.tsx` | D, M |
| S73 | Quick edit save status and error | Save in S71 | `quick/QuickEdit.tsx` (`saveMessage`) | Er, L |

## 9. Designs, layouts and linked sections

| ID | Screen or state | How to reach it | Source file | Variants |
|---|---|---|---|---|
| S74 | Design editor "{name} design" (post, blog, or "Page not found") | `#/design?kind=post\|blog\|notFound`; "Page not found" link in the Pages panel | `designs/DesignEditor.tsx`, `designs/DesignLinks.tsx` | Sel, L, Long |
| S75 | "Use the built-in look?" confirm | Design editor, reset action | `designs/DesignEditor.tsx` | D |
| S76 | Saved layouts ("My layouts"): "Nothing saved yet.", "Loading your layouts…" | Gallery tab in S21 | `layouts/LayoutGallery.tsx`, `layouts/mine.tsx` | E, L, Long |
| S77 | Linked sections list: "Linked", "No linked sections yet.", "Loading your linked sections…" | Gallery tab in S21 | `layouts/LayoutGallery.tsx`, `linked/store.tsx` | E, L, Long |
| S78 | Linked section editor (`#/section?id=…&from=…`), Back button | Edit a linked section from a page, or S77 | `linked/SectionEditor.tsx` | Sel, L, Er ("There's no linked section called “{id}”") |
| S79 | Save as layout dialog | Section toolbar → Save as layout | `layouts/SaveLayoutAction.tsx` | D, Er |
| S80 | Plain layouts sub-list ("Plainer layouts from the first library, for quiet pages.") | Gallery → lower section | `layouts/LayoutGallery.tsx` | Long |

## 10. Desktop app (updates, sign-out, windowing)

| ID | Screen or state | How to reach it | Source file | Variants |
|---|---|---|---|---|
| S81 | Update banner: "It's installed the next time Crust opens. Your sites aren't touched." with "Restart now" and "Later" | Shown when an update is ready (desktop only) | `updates/UpdateNotice.tsx` (`UpdateBanner`) | Sel, Er |
| S82 | Restart with unsaved changes: "You have unsaved changes in Site settings…", "Restart anyway" | Click "Restart now" while Site settings is dirty | `updates/UpdateNotice.tsx` (`RestartButton`) | D |
| S83 | What's new dialog: "What's new in Crust {version}", "Fixes and improvements." | Update notice | `updates/UpdateNotice.tsx` (`WhatsNew`) | D, E (no notes) |
| S84 | About Crust panel: "Crust" h2 with version | Site menu / Sites screen (inferred) | `updates/UpdateNotice.tsx` (`AboutCrust`) | Sel |
| S85 | Sign out link ("Sign out" to Cloudflare Access logout) | Top bar site menu, page list | `sign-out.tsx`, `app-frame/AppTopBar.tsx` | — |
| S86 | Desktop window and folder handling (multi-site folder, Tauri commands) | Desktop app only (inferred from `desktop/` and `tauri-folder.ts`; windowing not read) | `desktop/desktop.ts`, `desktop/tauri-folder.ts` | F, Er |

## 11. Public sites (generated and marketing)

| ID | Screen or state | How to reach it | Source file | Variants |
|---|---|---|---|---|
| S87 | Crust marketing home "/" ("Templates for Crust") | Store site root | `store/content/pages/index.json`, `store/list.json` | M, Long |
| S88 | Download page "/download" ("Download Crust", Mac and Windows) | Store site `/download` | `store/content/pages/download.json` | M |
| S89 | All templates "/templates" | Store site `/templates` | `store/content/pages/templates.json` | M, Long |
| S90 | Template detail pages "/templates/corner", "/templates/harbour", "/templates/signal" | Store site | `store/content/pages/templates-*.json`, `templates/*.crust` | M, Long |
| S91 | Help "/help" | Store site `/help` | `store/content/pages/help.json` | Long |
| S92 | Licence "/licence" | Store site `/licence` | `store/content/pages/licence.json` | Long |
| S93 | Home page of a published user site (generated) | Published site root | `home/content/pages/index.json`, `packages/render/src/render.tsx` | M, Long |
| S94 | Page not found (404) of a published site: "Page not found", "Shown for addresses with no page" | Any unknown address on a published site; design kind `notFound` | `pages-panel/PagesRail.tsx`, `designs/*`, `packages/render` (inferred) | M |
| S95 | Contact form on a published page: "Send message", thank-you, "This form isn't connected yet…", "Sorry, your message couldn't be sent…" | Submit a contact form block on a live page | `packages/blocks/src/contact-form.tsx` | D, Er, M |

## 12. Global

| ID | Screen or state | How to reach it | Source file | Variants |
|---|---|---|---|---|
| S96 | Top bar (app frame): site menu, status, Publish button, sign out, screen heading | Every screen | `app-frame/AppTopBar.tsx` | Sel, M, Long (site name), D (site menu open) |
| S97 | Save status in top bar (saved / local / failed / pending) | Top bar via `FrameStatus` | `app-frame/AppTopBar.tsx`, `app-frame/status.ts` | Er, L |
| S98 | Pending changes count ("3 changes not live") | Top bar | `publish/shortcut.tsx`, `App.tsx` | Sel |
| S99 | Error and save toasts: "Kept in this browser…", "The menu change wasn't saved to your site…", `saveMessage` texts | Any failed save | `save-messages.ts`, `save-status.tsx`, `App.tsx` | Er, D (dismissable) |
| S100 | Loading state "Loading…" (role=status) | Any route while GitHub status loads | `App.tsx` (`Loading`) | L |
| S101 | Dark mode toggle, aria "Light or dark" | Top bar `ThemeToggle` | `app-theme/ThemeToggle.tsx`, `app-theme/theme.ts` | Sel (dark), M |
| S102 | Keyboard shortcuts help dialog | See S24 | `keyboard/tooltips.ts` | D |
| S103 | Editor viewport switcher (Desktop, Tablet, Mobile) | Editor top bar | `app-frame/EditorBar.tsx` | Sel |
| S104 | Frame-level "Page not found" for an unknown route | Unknown hash falls through to the page list (inferred from `parseRoute`) | `App.tsx` | — |

---

## Key end-to-end journeys

1. **First run to published site (desktop):** S01 (Start from a template) → S03 (name the site) → S14 (edit the Home page) → S16 (preview at Mobile) → S35 (Publish) → S61 (choose host) → S66 ("Your site is live.")
2. **First run to published site (web):** S59 (page list) → S08 (Start from a template) → S10 (replace confirm) → S14 (edit Home) → S59 (Publish panel) → S61 → S65 (upload progress) → S66
3. **Edit text on phone:** S71 (quick edit opens for the page) → change words → S73 (save status) → S71 (back to pages)
4. **Add a blog post:** S36 (Posts list) → S37 (New post) → S39 (post editor) → S25 (section settings) → S30 (pick image) → S41 (held post if fields are missing) → S39 (saved) → S36
5. **Change brand colours:** S47 (Site settings) → S49 (Colours) → S52 (contrast check) → S58 (Save) → S14 (check in editor) → S48 (Styles panel)
6. **Connect a domain:** S57 (Site address) → S69 (custom domain guide) → S61 (host) → S66 (live link) → S63 (FTP/SFTP if self-hosted)
7. **Save and reuse a section:** S19 (section toolbar) → S79 (Save as layout) → S21 (add-section gallery) → S76 (My layouts) → insert → S14
8. **Make a section linked and edit it once:** S19 (Make linked) → S77 (linked list) → S78 (linked section editor) → Back → S14 (updated everywhere)
9. **Add a contact form and test it:** S14 (add contact form block) → S70 (fields and labels) → S14 preview → publish (S35) → S95 (live form, thank-you message)
10. **Desktop update:** S81 (update banner) → S83 (What's new) → S82 (restart; warn if Site settings unsaved) → S81 dismissed with "Later"

---

Screen count: **104** screen or state rows (S01 to S104). Inferred rows are marked in the Source or How columns; not all states were visually verified.

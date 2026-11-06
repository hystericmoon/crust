# App UX redesign: research notes (2026-11-06)

Working notes for the owner's request: "the ui ux for the app itself is not
very nice and friendly ... see how squarespace, wix, webflow made theirs,
compare with us ... redesign ours." Screenshots of Crust today: the PNGs in
this folder (1440x900, desktop app faked with scripts/fake-tauri.js, host
"connected"). The site shown is the fake app's sample site, so "the editor
looks blank after picking a template" is a test-setup effect, not a real bug.

## Crust today (my walk + Impeccable critique, Assessment A)

Nielsen score 24/40. Strengths: plain, kind copy ("Saved, not live yet");
choosing visually (templates, styles, 90-layout gallery with photos);
reassurance (pre-publish checks, template switch can be undone, failed save
stays with "Try again"). Welcome screen is the best screen.

Priority issues:
1. P1 Editor opens on the wrong things (04): canvas at 57% zoom (body text
   under 10px), 13+ block list on the left, SEO form on the right when
   nothing is selected. Text is edited in a side box, not on the page.
   Fix: fit-to-width 75-100%, "what to do next" panel when nothing is
   selected, SEO under "Search & sharing", click text to edit in place.
2. P1 Editor header has no hierarchy (App.tsx ~630-660): 6 equal outlined
   buttons (Pages, Quick edit, Layouts, Keyboard, Site settings, Publish)
   plus black "Save draft". Publish is not the main action; no save/live
   status. Fix: status text, Publish the one primary, others to icons/More.
3. P1 Section toolbar overloaded (06, 11): ~12 controls on 2 rows covering
   the site header and "+"; "Whole site", "Make linked", orange "Edit
   everywhere" (site-wide) next to colour dots. Fix: one row, scope step for
   site-wide changes showing how many sections/pages it affects.
4. P2 Navigation inconsistent between screens: back link says "Builder",
   "Pages", "All sites" or is missing (Posts); Publish filled/outlined in
   different places; "Save draft" vs Settings "Save"/"Discard". Fix: one
   app shell, one word per idea.
5. P2 Site settings is a 16-item flat list mixing design and site (Styles,
   Colours, Typography, Buttons, Cards, Links, Motion, Section styles,
   Header & menu, Footer, Spacing, Shape & layout, Theme pack, Template,
   Site address). Fix: Look (Styles + Fine-tune), Header & footer, Site
   details, Advanced.
Also: four unrelated accents in the editor (purple +, indigo pill, teal
"Save as layout", orange "Edit everywhere"); app chrome is generic admin
(white cards on grey, Inter, outlined buttons) next to characterful
templates; Posts screen has separate "Save blog page"; "Sample site" should
be "Blank"; "Open" pill reads like a button; welcome card text truncated;
full /Users/... path shown. A11y to check: toolbar colour dots ~16px
(2.5.8), canvas header/footer labels tiny, focus hidden under the floating
toolbar (2.4.11), colour dots need names.

## Competitors (research agent, sources in its report; help.webflow.com was 403)

- Squarespace: dashboard and editor fused (Website panel beside live
  preview, Edit enters edit mode in place). Minimal chrome, page fills the
  screen. "+ Add section" between sections -> library with category tabs,
  big thumbnails, Blank and Saved. Settings as popovers on the item. Clean
  3-way split: on-page content / Site Styles (paintbrush: fonts, colours +
  section themes, buttons, spacing) / Settings in dashboard (domain, SEO).
  Pages panel: Main Navigation vs Not Linked. Focal point dot. No publish
  button (save = live once public); site visibility setting.
- Wix: strict split, dashboard app (setup checklist, sidebar by site type)
  vs full-screen editor ("Edit Site"). Classic top bar is crowded (16 items
  incl. upsells). Studio: left panels (Add, Layers, Pages, Site Styles...),
  right Inspector, hover "+ Add Section". Harmony (Jan 2026): AI-first,
  dynamic action bar for the selected element. Save + Publish separate,
  first-publish dialog. Alt text labelled "What's in the image?";
  Accessibility Wizard.
- Webflow: pro tool, dense dark chrome, left icon rail (Add, Navigator,
  Pages, Components, Assets, CMS, Settings, Audit), right Style panel.
  Publish dropdown with destinations and unpublished-changes summary.
  Cmd+K Quick find. Audit panel (alt text, heading order). Edit mode for
  content editors locks layout. Steep learning curve.
- Copy: "+" between sections; section library with thumbnails/Blank/Saved;
  content / styles / settings split; style presets; goal-based onboarding
  with skip; popovers on the item; Main nav vs Not linked; "What's in the
  image?"; unpublished-changes count + publish summary; setup checklist;
  audit panel that jumps to problems; auto SEO defaults and redirects;
  Cmd+K; device preview.
- Avoid: freeform positioning; CSS concepts (classes, flex); save = live;
  irreversible start choices; crowded top bars with upsells; nav separate
  from pages; several editors/modes.

## Directions drafted (not yet drawn)

- A "One studio" (Claude's pick): the editor is home, Squarespace-like.
  Top bar: site name menu (sites), page switcher, device toggle,
  undo/redo, status "Saved · 3 changes not live", Preview, Publish
  (primary, with count). Left icon rail: Add (sections first, then
  blocks), Pages (main nav / not linked), Styles (paintbrush), Media,
  Blog. Right inspector only when something is selected. Site details
  (address, SEO defaults, host) in a Settings sheet. No "Save draft"
  (changes autosave; one Publish decision).
- B "Dashboard + editor" (Wix-like): left sidebar app shell (Home with
  setup checklist, Pages, Blog, Media, Design, Settings, Publish) and an
  "Edit" button into a focused editor.
- C "Tidy up": keep today's structure; fix header hierarchy, one back
  link, group settings, one-row section toolbar, zoom default.

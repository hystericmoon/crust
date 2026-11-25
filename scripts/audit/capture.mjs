// UI audit, step 2 (capture). Pilot covers areas 1 (first run) and 3 (page editor).
// Usage: node scripts/audit/capture.mjs <outDir> [areaIds, e.g. 1,3]
// Reuses scripts/serve-static.mjs and the offline setup of scripts/check-builder-a11y.mjs
// (sample Home page as a browser draft, fake desktop host, same click paths).
// Writes only under <outDir>. Never presses Publish. Never reads .env files.
import { execFile } from "node:child_process";
import { appendFile, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { chromium } from "playwright-core";
import { serve } from "../serve-static.mjs";

const execFileAsync = promisify(execFile);
const require = createRequire(import.meta.url);
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const DIST = join(ROOT, "apps/admin/dist");
const BROWSER = process.env.CHROME_PATH || "/opt/pw-browsers/chromium";
const BUDGET_MS = 25 * 60 * 1000;
const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  tablet: { width: 820, height: 1100 },
  phone: { width: 390, height: 800 },
};
const SCHEMES = ["light", "dark"];
const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"];
const INTERACTIVE = "button, a[href], input, select, textarea, [role=button], [tabindex]";
const RAIL_YOUR_SITE = '[class*="NavItem-link"]:has-text("Your site")';
const RAIL_THIS_PAGE = '[class*="NavItem-link"]:has-text("This page")';
const SECTION = '[data-puck-component^="Section"]';
const CARD = '[data-puck-component^="Card"]';
const TEXT = '[data-puck-component^="Text"]';
const EDIT_HOME = { hash: "/#/edit?path=/", seed: "home", builder: true };
const EDIT_EMPTY = { hash: "/#/edit?path=/", seed: "empty", builder: true };
const FIRST_RUN = { hash: "/", app: { host: "none", firstRun: true }, wait: ".fr-form" };
const PHOTO_PICK = [{ canvas: CARD }, { click: 'button:has-text("Choose image"):visible' }, { waitFor: "dialog[open]" }];
const MEDIA = { media: true };
// A post opened from a browser draft (offline, as scripts/check-builder-a11y.mjs does); seeded with screen.post.
const SAMPLE_POST = {
  slug: "audit-post",
  title: "Opening day",
  description: "We open on Saturday.",
  date: "2026-10-30",
  cover: "",
  coverAlt: "",
  puck: { root: { props: {} }, content: [{ type: "Text", props: { id: "t1", text: "Come and say hello." } }] },
};

// Screens of the pilot. "steps" run after the page is ready; "shares" = visible in another screen's capture;
// "notReached" = no capture attempted (reason given).
const SCREENS = [
  { id: "S01", area: 1, title: "First-run chooser (Blank and templates, name field)", ...FIRST_RUN, steps: [] },
  { id: "S01-blank", area: 1, title: "First-run chooser, Blank picked", ...FIRST_RUN, steps: [{ click: 'label:has-text("Blank")' }] },
  { id: "S02", area: 1, title: "Template picked inside first run (preview)", ...FIRST_RUN, steps: [{ click: ".fr-card" }] },
  { id: "S03", area: 1, title: "Suggested name prefill", shares: "S01", note: "The name field is on the S01 screen; not captured separately." },
  { id: "S04", area: 1, title: "Open-to-replace arrival", notReached: "Code only (first-run/arrival.ts); no control reaches it." },

  { id: "S14", area: 3, title: "Page editor, Home", ...EDIT_HOME, steps: [] },
  { id: "S15", area: 3, title: "There's no page at this path", hash: "/#/edit?path=/no-such-page", steps: [] },
  { id: "S16", area: 3, title: "Editor top bar", shares: "S14", note: "Top bar is in every S14 capture." },
  { id: "S17", area: 3, title: "Left rail", shares: "S14", note: "Rail is in every S14 capture." },
  { id: "S18", area: 3, title: "Pages panel", ...EDIT_HOME, steps: [{ click: RAIL_YOUR_SITE }, { click: '.af-place-link:has(strong:text-is("Pages"))' }] },
  { id: "S19", area: 3, title: "Section selected (section toolbar)", ...EDIT_HOME, steps: [{ canvas: SECTION }] },
  // Section focused on the canvas, then the move shortcut from the Keyboard shortcuts list (Alt + ↓).
  { id: "S20", area: 3, title: "Keyboard move of a focused section", ...EDIT_HOME, steps: [{ canvas: SECTION }, { key: "Alt+ArrowDown" }] },
  { id: "S21", area: 3, title: "Add-section gallery", ...EDIT_HOME, steps: [{ click: RAIL_THIS_PAGE }, { click: ".af-add-section" }, { waitFor: "dialog[open]" }] },
  // Empty page (seeded as an empty browser draft, as Blank does): the gallery's Insert list offers "On this empty page".
  { id: "S22", area: 3, title: "Add-section gallery on an empty page", ...EDIT_EMPTY, steps: [{ click: RAIL_THIS_PAGE }, { click: ".af-add-section" }, { waitFor: "dialog[open]" }] },
  // The whole-design note only shows for a starting design (design editor, kind=blog), not for the page editor.
  {
    id: "S23", area: 3, title: "Replace whole design note (starting design)",
    hash: "/#/design?kind=blog", builder: true,
    steps: [
      { click: 'button:has-text("Layouts")' }, { waitFor: "dialog[open]" },
      { pick: ['.lg-dialog select:has(option[value="page"])', "page"] },
      { click: ".lg-card-button" },
      { waitFor: '.lg-foot-note:has-text("It replaces the whole design")' },
    ],
  },
  // Your site > Help > Keyboard shortcuts.
  { id: "S24", area: 3, title: "Keyboard shortcuts dialog", ...EDIT_HOME, steps: [{ click: RAIL_YOUR_SITE }, { click: '.af-place-link:has(strong:text-is("Help"))' }, { click: 'button.af-panel-link:has-text("Keyboard shortcuts")' }, { waitFor: "dialog[open]" }] },
  { id: "S25", area: 3, title: "Section settings, Style tab", ...EDIT_HOME, steps: [{ canvas: SECTION }, { click: '.tb-tab:has-text("Style"):visible' }] },
  { id: "S26", area: 3, title: "Section visual fields and placeholders checklist", notReached: "The checklist sits in the publish panel, which needs Publish; this capture never presses Publish." },
  // The top bar's "Settings panel" toggle opens the page settings (labelled "Page settings").
  { id: "S27", area: 3, title: "Page settings (search and sharing)", ...EDIT_HOME, steps: [{ click: 'button[aria-label="Settings panel"][aria-pressed="false"]' }] },
  { id: "S28", area: 3, title: "Next steps / placeholder checklist", notReached: "Shown in the publish panel, which needs Publish; this capture never presses Publish." },
  { id: "S29", area: 3, title: "Layout photo prompt", notReached: "Code only (layouts/photos.tsx); needs a photo layout inserted first." },
  { id: "S30", area: 3, title: "Media picker 'Choose an image'", ...EDIT_HOME, ...MEDIA, steps: PHOTO_PICK },
  { id: "S31", area: 3, title: "Media photo details with focal point", ...EDIT_HOME, ...MEDIA, steps: [...PHOTO_PICK, { click: '.mp-photo[data-file="stage.jpg"]' }] },
  // The top bar's Page width group: the Phone width button (aria-label "Phone width").
  { id: "S32", area: 3, title: "Page width set to phone (preview toggle)", ...EDIT_HOME, steps: [{ click: '[role="group"][aria-label="Page width"] [aria-label="Phone width"]' }] },
  { id: "S33", area: 3, title: "Inline text editing", ...EDIT_HOME, steps: [{ canvas: TEXT }, { waitFor: ".rt-editor" }] },
  { id: "S34", area: 3, title: "Save status bar", shares: "S14", note: "Status bar is in the S14 capture; no separate state." },
  { id: "S35", area: 3, title: "Publish button (top bar)", shares: "S14", note: "Default state only, in the S14 capture. Error state needs Publish, never pressed." },

  // Area 2: Sites list and templates. The Sites screen is desktop only, so it runs on the fake desktop host.
  { id: "S05", area: 2, title: "Your sites (desktop)", hash: "/#/sites", app: { host: "none" }, wait: "#sites-h", steps: [] },
  { id: "S06", area: 2, title: "Delete site dialog", hash: "/#/sites", app: { host: "none" }, wait: "#sites-h", steps: [{ click: '[data-site-action^="delete:"]' }, { waitFor: "dialog[open]" }] },
  { id: "S07", area: 2, title: "Deleted sites section", notReached: "Shown only when a site was deleted; the fake desktop host always lists none." },
  { id: "S08", area: 2, title: "Start from a template (main screen)", hash: "/#/templates", steps: [] },
  { id: "S09", area: 2, title: "Template preview (page list and open link)", hash: "/#/templates", steps: [{ click: ".tp-card[id]" }, { waitFor: 'nav[aria-label^="Pages in"]' }] },
  { id: "S10", area: 2, title: "Replace-your-site confirmation", hash: "/#/templates", steps: [{ click: ".tp-card[id]" }, { click: 'button:has-text("Use this template")' }, { waitFor: "dialog[open]" }] },
  { id: "S11", area: 2, title: "Open a template file (local .crust file)", notReached: "Needs a .crust file chosen in the file picker; the capture cannot pick a file." },
  { id: "S12", area: 2, title: "Premium area: Already bought it? Open the file", hash: "/#/templates?examples", steps: [{ click: ".tp-premium .tp-card" }, { waitFor: 'label:has-text("Already bought it? Open the file")' }] },
  { id: "S13", area: 2, title: "Template banner in the page list", notReached: "The banner shows only after a template was applied (templates/TemplateBanner.tsx); a fresh offline site shows none." },

  // Area 4: Posts and blog. The sample post is seeded as a browser draft (screen.post).
  { id: "S36", area: 4, title: "Posts list (blog)", hash: "/#/posts", wait: "#posts-h", steps: [] },
  { id: "S37", area: 4, title: "New post dialog", hash: "/#/posts", wait: "#posts-h", steps: [{ click: 'button:has-text("New post")' }, { waitFor: "#new-post" }] },
  { id: "S38", area: 4, title: "Blog page settings", shares: "S36", note: "The Blog page is a card on the Posts screen, not a dialog as the inventory says." },
  { id: "S39", area: 4, title: "Post editor (sample post)", hash: "/#/post?slug=audit-post", post: SAMPLE_POST, builder: true, steps: [] },
  { id: "S40", area: 4, title: "Saving works on crust-admin.pages.dev note", shares: "S36", note: "The note shows in the Blog page card when GitHub saving is off, the offline state of every S36 capture." },
  { id: "S41", area: 4, title: "Post held, not saved (validation)", notReached: "Needs a post with missing required fields and a save press; the capture seeds only a complete sample post." },

  // Area 5: Media.
  { id: "S42", area: 5, title: "Media library picker (search, grid, upload)", shares: "S30", note: "The library is the dialog S30 opens: search, grid and upload are all in it." },
  { id: "S43", area: 5, title: "Delete photo confirm", hash: "/#/edit?path=/", seed: "home", builder: true, ...MEDIA, steps: [...PHOTO_PICK, { click: '.mp-photo[data-file="door.jpg"]' }, { click: ".mp-delete .mp-link" }, { waitFor: '[role="group"][aria-label="Delete this photo?"]' }] },
  { id: "S44", area: 5, title: "Web address for an image", hash: "/#/edit?path=/", seed: "home", builder: true, steps: [{ canvas: CARD }, { click: 'summary:has-text("Use a web address instead")' }] },
  { id: "S45", area: 5, title: "Media panel in the rail", hash: "/#/edit?path=/", builder: true, ...MEDIA, steps: [{ click: RAIL_YOUR_SITE }, { click: '.af-place-link:has(strong:text-is("Media"))' }] },
  { id: "S46", area: 5, title: "Image shrink and optimise on upload", notReached: "Runs when a file is uploaded; the capture cannot pick a file." },

  // Area 6: Look and Site settings. The nav buttons are the group names (settings/SiteSettings.tsx).
  { id: "S47", area: 6, title: "Site settings screen", hash: "/#/settings", wait: ".st-nav", steps: [] },
  { id: "S48", area: 6, title: "Styles panel in the builder rail", hash: "/#/edit?path=/", builder: true, steps: [{ click: RAIL_YOUR_SITE }, { click: '.af-place-link:has(strong:text-is("Look"))' }, { waitFor: ".sp-head" }] },
  { id: "S49", area: 6, title: "Style groups nav (Colours open)", hash: "/#/settings", wait: ".st-nav", steps: [{ click: '.st-nav-item:has-text("Colours")' }, { waitFor: "#colours-h" }] },
  { id: "S50", area: 6, title: "Typography (font pairs)", hash: "/#/settings", wait: ".st-nav", steps: [{ click: '.st-nav-item:has-text("Typography")' }, { waitFor: ".st-fontpair" }] },
  { id: "S51", area: 6, title: "Spacing group (Shape & layout not captured separately)", hash: "/#/settings", wait: ".st-nav", steps: [{ click: '.st-nav-item:has-text("Spacing")' }, { waitFor: "#spacing-h" }] },
  { id: "S52", area: 6, title: "Contrast checks (Colours group)", hash: "/#/settings", wait: ".st-nav", steps: [{ click: '.st-nav-item:has-text("Colours")' }, { waitFor: "#contrast-h" }] },
  { id: "S53", area: 6, title: "Header and menu group", hash: "/#/settings", wait: ".st-nav", steps: [{ click: '.st-nav-item:has-text("Header & menu")' }, { waitFor: "#header-h" }] },
  { id: "S54", area: 6, title: "Footer group", hash: "/#/settings", wait: ".st-nav", steps: [{ click: '.st-nav-item:has-text("Footer")' }, { waitFor: "#footer-h" }] },
  { id: "S55", area: 6, title: "Theme pack group", hash: "/#/settings", wait: ".st-nav", steps: [{ click: '.st-nav-item:has-text("Theme pack")' }, { waitFor: "#theme-pack-h" }] },
  { id: "S56", area: 6, title: "Save as template group", hash: "/#/settings", wait: ".st-nav", steps: [{ click: '.st-nav-item:text-is("Template")' }, { waitFor: "#template-h" }] },
  { id: "S57", area: 6, title: "Site address group", hash: "/#/settings", wait: ".st-nav", steps: [{ click: '.st-nav-item:has-text("Site address")' }, { waitFor: "#address-h" }] },
  // Picking a look makes Site settings unsaved, which shows the Discard and Save bar.
  { id: "S58", area: 6, title: "Discard and Save bar (after a change)", hash: "/#/settings", wait: ".st-nav", steps: [{ click: '.st-look:has-text("Atelier")' }, { waitFor: 'button:has-text("Discard")' }] },

  // Area 7: Publish and hosting. Publish is never pressed: pages are reached by route and clicks never touch Publish.
  { id: "S59", area: 7, title: "Page list with Publish panel (web)", hash: "/#/?focus=publish", steps: [] },
    { id: "S60", area: 7, title: "Publish panel: live link and changes list", notReached: "The live-link line and changes list are not in the offline page list capture (S59); they show only in a publish state, which needs Publish." },
    { id: "S61", area: 7, title: "Where this site is published (host chooser)", notReached: "The host chooser (Where should this site live?) opens from the Publish button, which is never pressed. The capture of the card would show the Cloudflare connect dialog instead, so it is not used." },
  { id: "S62", area: 7, title: "Checking where this site is published", notReached: "A short loading state that clears on its own; not captured as a screen of its own." },
  { id: "S63", area: 7, title: "Connect FTP/SFTP form", hash: "/#/", app: { host: "none" }, wait: ".hp-host", steps: [{ click: 'button:has-text("Your own web host")' }, { waitFor: "dialog[open]" }] },
  { id: "S64", area: 7, title: "Type the password again (host confirm)", notReached: "Needs a saved host that asks for its password again; the fake desktop host (scripts/fake-tauri.js) has no such state." },
  { id: "S65", area: 7, title: "Upload progress", notReached: "Shown during a publish; the capture never publishes." },
  { id: "S66", area: 7, title: "Your site is live (result)", notReached: "Shown after a successful publish; the capture never publishes." },
  { id: "S67", area: 7, title: "Desktop publish: keep it on this computer", hash: "/#/", app: { host: "none" }, wait: ".hp-host", steps: [] },
    { id: "S68", area: 7, title: "Blocked publish: Not ready to publish yet", notReached: "Not in the offline page list capture (S59); it shows only when pages hold sample text in a publish state, which needs Publish." },
  { id: "S69", area: 7, title: "Custom domain guide (Site address)", hash: "/#/settings", wait: ".st-nav", steps: [{ click: '.st-nav-item:has-text("Site address")' }, { waitFor: 'a:has-text("Open the custom domain guide")' }] },
  { id: "S70", area: 7, title: "Contact form setup", notReached: "The setup screen was not found in admin code (inventory note); the block's fields are edited in the page editor, see S14 and S25." },

  // Area 8: Quick edit (phone). mode=quick opens it at any width; the phone variant is the one the inventory means.
  { id: "S71", area: 8, title: "Quick edit page", hash: "/#/edit?path=/&mode=quick", seed: "home", steps: [] },
  { id: "S72", area: 8, title: "Quick edit photo picker", hash: "/#/edit?path=/&mode=quick", seed: "home", ...MEDIA, steps: [{ click: 'button:has-text("Choose image"):visible' }, { waitFor: "dialog[open]" }] },
  { id: "S73", area: 8, title: "Quick edit save status and error", notReached: "The error and saving states need a failed or slow save; the capture does not save." },

  // Area 9: Designs, layouts and linked sections.
  { id: "S74", area: 9, title: "Design editor: post design (blog and not-found designs not captured)", hash: "/#/design?kind=post", builder: true, steps: [] },
  { id: "S75", area: 9, title: "Use the built-in look? confirm", notReached: "The reset button shows only once a page design is saved (crust:design:<kind> in browser storage); the capture does not seed one." },
  { id: "S76", area: 9, title: "My layouts (gallery tab)", hash: "/#/edit?path=/", builder: true, steps: [{ click: RAIL_THIS_PAGE }, { click: ".af-add-section" }, { waitFor: "dialog[open]" }, { click: '.lg-kind-option:has-text("Mine")' }] },
  { id: "S77", area: 9, title: "Linked sections list (gallery)", hash: "/#/edit?path=/", builder: true, steps: [{ click: RAIL_THIS_PAGE }, { click: ".af-add-section" }, { waitFor: "dialog[open]" }, { pick: ['.lg-dialog select:has(option[value="linked"])', "linked"] }] },
  { id: "S78", area: 9, title: "Linked section editor (no such section)", hash: "/#/section?id=hero-band&from=%23%2Fedit%3Fpath%3D%2F", steps: [] },
  { id: "S79", area: 9, title: "Save as layout dialog", notReached: "The Save as layout button in the section toolbar never became clickable after selecting a section in this capture (not resolved; the S19 selection works)." },
  { id: "S80", area: 9, title: "Plain layouts sub-list", hash: "/#/edit?path=/", builder: true, steps: [{ click: RAIL_THIS_PAGE }, { click: ".af-add-section" }, { waitFor: "dialog[open]" }, { waitFor: ".lg-side-note" }] },

  // Area 10: Desktop app updates. The fake desktop host offers Crust 0.2.0 when asked (scripts/fake-tauri.js).
  { id: "S81", area: 10, title: "Update banner", hash: "/#/sites", app: { host: "none", update: "available" }, wait: "#sites-h", steps: [{ click: 'button:has-text("Check for updates")' }, { waitFor: ".up-banner" }] },
  { id: "S82", area: 10, title: "Restart with unsaved Site settings changes", notReached: "Needs an update banner and unsaved Site settings at the same time; the capture has no step that moves between the two." },
  { id: "S83", area: 10, title: "What's new dialog", hash: "/#/sites", app: { host: "none", update: "available" }, wait: "#sites-h", steps: [{ click: 'button:has-text("Check for updates")' }, { click: '.up-banner button:has-text("What\'s new")' }, { waitFor: "dialog[open]" }] },
  { id: "S84", area: 10, title: "About Crust (version card)", shares: "S05", note: "The About card (version and Check for updates) sits on the Sites screen." },
  { id: "S85", area: 10, title: "Sign out link (site menu, web only)", hash: "/#/", steps: [{ click: 'button[aria-expanded="false"][aria-controls]' }, { waitFor: '.af-menu a:has-text("Sign out")' }] },
  { id: "S86", area: 10, title: "Desktop window and folder handling", notReached: "No screen of its own; windowing is not a visible state the browser capture can show (inferred from desktop/ code only)." },

  // Area 11: public sites. Store and generated sites are not in the admin app, so none are captured here.
  { id: "S87", area: 11, title: "Crust marketing home", notReached: "Store site, not in the admin app; not captured in this pass." },
  { id: "S88", area: 11, title: "Download page", notReached: "Store site, not in the admin app; not captured in this pass." },
  { id: "S89", area: 11, title: "All templates page (store)", notReached: "Store site, not in the admin app; not captured in this pass." },
  { id: "S90", area: 11, title: "Template detail pages (store)", notReached: "Store site, not in the admin app; not captured in this pass." },
  { id: "S91", area: 11, title: "Help page (store)", notReached: "Store site, not in the admin app; not captured in this pass." },
  { id: "S92", area: 11, title: "Licence page (store)", notReached: "Store site, not in the admin app; not captured in this pass." },
  { id: "S93", area: 11, title: "Home page of a published user site", notReached: "Generated published site (publish:local output), not in the admin app; not captured." },
  { id: "S94", area: 11, title: "Page not found on a published site", notReached: "Generated published site, not in the admin app; not captured." },
  { id: "S95", area: 11, title: "Contact form on a published page", notReached: "Generated published site; submitting the form would send a message, so it is not captured." },

  // Area 12: global parts of the app frame.
  { id: "S96", area: 12, title: "Top bar (app frame)", shares: "S14", note: "The top bar is in every editor capture." },
  { id: "S97", area: 12, title: "Save status in top bar", shares: "S14", note: "The status is in every editor capture; the failed and loading states need a failed or slow save." },
  { id: "S98", area: 12, title: "Pending changes count", shares: "S14", note: "The count sits in the top bar status when changes are not live." },
  { id: "S99", area: 12, title: "Error and save toasts", notReached: "Needs a failed save; the capture does not force one." },
  { id: "S100", area: 12, title: "Loading state", notReached: "Transient, shown while GitHub status loads; not a stable state to capture." },
  { id: "S101", area: 12, title: "Dark mode toggle", shares: "S14", note: "The Light or dark toggle is in the top bar; the dark variants of S14 show it." },
  { id: "S102", area: 12, title: "Keyboard shortcuts help dialog", shares: "S24", note: "Same dialog as S24." },
  { id: "S103", area: 12, title: "Viewport switcher (Desktop, Tablet, Mobile)", shares: "S14", note: "The Page width group is in every editor capture." },
  { id: "S104", area: 12, title: "Unknown route falls through to the page list", hash: "/#/no-such-route", steps: [] },
];

// Runs in the page as window.__audit. Written as a function so its source ships to the browser.
function auditHelpers() {
  const isVisible = (el) => {
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden") return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const isInert = (el) => !!el.closest('[inert], [aria-hidden="true"]');
  const cssPath = (el) => {
    const parts = [];
    for (let n = el; n && n.nodeType === 1 && parts.length < 4; n = n.parentElement) {
      if (n.id) { parts.unshift("#" + CSS.escape(n.id)); break; }
      const siblings = n.parentElement ? [...n.parentElement.children].filter((c) => c.tagName === n.tagName) : [n];
      const cls = [...n.classList].slice(0, 2).map((c) => "." + CSS.escape(c)).join("");
      parts.unshift(n.tagName.toLowerCase() + cls + (siblings.length > 1 ? `:nth-of-type(${siblings.indexOf(n) + 1})` : ""));
    }
    return parts.join(" > ").slice(0, 200);
  };
  const textOf = (el) => (el.innerText || el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 80);
  const accName = (el) => {
    const ids = el.getAttribute("aria-labelledby");
    if (ids) {
      const t = ids.split(/\s+/).map((id) => document.getElementById(id)?.textContent ?? "").join(" ").trim();
      if (t) return t.slice(0, 120);
    }
    if (el.getAttribute("aria-label")) return el.getAttribute("aria-label").slice(0, 120);
    if (el.labels && el.labels.length) {
      const t = [...el.labels].map((l) => l.textContent).join(" ").trim();
      if (t) return t.slice(0, 120);
    }
    if (el.tagName === "IMG") return (el.getAttribute("alt") ?? "").slice(0, 120);
    const t = textOf(el);
    if (t) return t;
    return String(el.getAttribute("title") || el.getAttribute("placeholder") || el.value || "").slice(0, 120);
  };
  // Interactive targets under 24px (44px on phone). Hidden or inert ones are skipped. spacingOk: the WCAG 2.5.8
  // spacing exception holds when a 24px circle centred on the target overlaps no other visible target.
  const smallTargets = (selector, min) => {
    const cands = [...document.querySelectorAll(selector)]
      .filter((el) => isVisible(el) && !isInert(el))
      .map((el) => ({ el, r: el.getBoundingClientRect() }));
    const out = [];
    for (const c of cands) {
      if (c.r.width >= min && c.r.height >= min) continue;
      const cx = c.r.left + c.r.width / 2;
      const cy = c.r.top + c.r.height / 2;
      let blockedBy = null;
      for (const o of cands) {
        if (o === c) continue;
        const dx = Math.max(o.r.left - cx, 0, cx - o.r.right);
        const dy = Math.max(o.r.top - cy, 0, cy - o.r.bottom);
        if (dx * dx + dy * dy < 144) { blockedBy = cssPath(o.el); break; }
      }
      out.push({
        selector: cssPath(c.el),
        text: accName(c.el).slice(0, 80),
        size: `${Math.round(c.r.width)}x${Math.round(c.r.height)}`,
        spacingOk: blockedBy === null,
        spacingBlockedBy: blockedBy,
      });
    }
    return out;
  };
  const labels = () => {
    const seen = new Map();
    const add = (kind, text) => {
      const t = (text || "").replace(/\s+/g, " ").trim();
      if (t) seen.set(kind + "\u0000" + t, { kind, text: t.slice(0, 160) });
    };
    for (const el of document.querySelectorAll("button, a, h1, h2, h3, h4, h5, h6, label, [role=button], [role=tab], [role=heading]")) {
      if (!isVisible(el) || isInert(el)) continue;
      const kind = /^H[1-6]$/.test(el.tagName) || el.getAttribute("role") === "heading" ? "heading" : el.tagName === "LABEL" ? "label" : el.tagName === "A" ? "link" : "button";
      add(kind, textOf(el));
    }
    for (const el of document.querySelectorAll("input, textarea, select")) {
      if (!isVisible(el) || isInert(el)) continue;
      add("placeholder", el.getAttribute("placeholder"));
      for (const l of el.labels ?? []) add("label", l.textContent);
    }
    for (const el of document.querySelectorAll("[aria-label]")) if (isVisible(el) && !isInert(el)) add("aria-label", el.getAttribute("aria-label"));
    return [...seen.values()];
  };
  const parse = (s) => {
    const m = String(s).match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  };
  const over = (top, bot) => ({ r: top.r * top.a + bot.r * (1 - top.a), g: top.g * top.a + bot.g * (1 - top.a), b: top.b * top.a + bot.b * (1 - top.a), a: 1 });
  const luminance = (c) => {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  };
  // Effective background: nearest opaque layers composed over the root (white when none is opaque).
  // Any background image or gradient on the way makes the background "unknown".
  const backgroundOf = (el) => {
    const layers = [];
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.backgroundImage && cs.backgroundImage !== "none") return { unknown: true };
      const c = parse(cs.backgroundColor);
      if (c && c.a > 0) {
        layers.push(c);
        if (c.a >= 1) break;
      }
    }
    let base = layers.length && layers[layers.length - 1].a >= 1 ? layers.pop() : { r: 255, g: 255, b: 255, a: 1 };
    for (let i = layers.length - 1; i >= 0; i--) base = over(layers[i], base);
    return base;
  };
  const contrast = (limit) => {
    const out = { sampled: 0, checked: 0, unknown: 0, unparsed: 0, failures: [] };
    const els = [...document.querySelectorAll("body *")]
      .filter((el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && isVisible(el))
      .slice(0, limit);
    out.sampled = els.length;
    for (const el of els) {
      const cs = getComputedStyle(el);
      const bg = backgroundOf(el);
      if (bg.unknown) { out.unknown++; continue; }
      let fg = parse(cs.color);
      if (!fg) { out.unparsed++; continue; }
      if (fg.a < 1) fg = over(fg, bg);
      const l1 = luminance(fg);
      const l2 = luminance(bg);
      const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
      const size = parseFloat(cs.fontSize);
      const large = size >= 24 || (Number(cs.fontWeight) >= 700 && size >= 18.66);
      const required = large ? 3 : 4.5;
      out.checked++;
      if (ratio < required) out.failures.push({ selector: cssPath(el), text: textOf(el).slice(0, 60), ratio: Math.round(ratio * 100) / 100, required, large });
    }
    return out;
  };
  const overflow = (max) => {
    const de = document.documentElement;
    const items = [];
    for (const el of document.querySelectorAll("body *")) {
      if (!isVisible(el)) continue;
      const r = el.getBoundingClientRect();
      if (r.right > de.clientWidth + 1) {
        items.push({ selector: cssPath(el), right: Math.round(r.right), clientWidth: de.clientWidth });
        if (items.length >= max) break;
      }
    }
    return { scrollWidth: de.scrollWidth, clientWidth: de.clientWidth, horizontalScroll: de.scrollWidth > de.clientWidth, overflowing: items };
  };

  // --- Tab walk support -------------------------------------------------------------------------
  // The focused element, following same-origin iframes (the builder canvas is one).
  const deepActive = () => {
    let doc = document;
    let el = document.activeElement;
    let inFrame = false;
    while (el && el.tagName === "IFRAME") {
      let inner = null;
      try { inner = el.contentDocument; } catch { inner = null; }
      if (!inner || !inner.activeElement || inner.activeElement === inner.body) break;
      doc = inner;
      el = inner.activeElement;
      inFrame = true;
    }
    return { el, doc, inFrame };
  };
  const looks = (cs) => ({ outlineStyle: cs.outlineStyle, outlineWidth: cs.outlineWidth, outlineColor: cs.outlineColor, boxShadow: cs.boxShadow, borderColor: cs.borderTopColor });
  const changed = (a, b) => !!a && (a.outlineStyle !== b.outlineStyle || a.outlineWidth !== b.outlineWidth || a.outlineColor !== b.outlineColor || a.boxShadow !== b.boxShadow || a.borderColor !== b.borderColor);
  // Before the first Tab: every element's look, so a later focus can be compared with its unfocused self.
  const snapshot = () => {
    const docs = [document];
    for (const f of document.querySelectorAll("iframe")) {
      try { if (f.contentDocument) docs.push(f.contentDocument); } catch { /* cross-origin: not walked */ }
    }
    window.__auditBase = new WeakMap();
    window.__auditIds = new WeakMap();
    window.__auditCount = 0;
    for (const d of docs) for (const el of d.querySelectorAll("*")) window.__auditBase.set(el, looks(d.defaultView.getComputedStyle(el)));
    return docs.length;
  };
  const idOf = (el) => {
    let id = window.__auditIds.get(el);
    if (!id) { id = ++window.__auditCount; window.__auditIds.set(el, id); }
    return id;
  };
  // Reads the element that has focus now. Focus indicator: :focus-visible AND (own outline or box-shadow, or a
  // changed look on one of the three nearest ancestors compared with the snapshot taken before the first Tab).
  const active = () => {
    const { el, doc, inFrame } = deepActive();
    if (!el || el === doc.body || el === doc.documentElement) return { leftDocument: true };
    const view = doc.defaultView;
    const now = looks(view.getComputedStyle(el));
    let source = null;
    if (el.matches(":focus-visible")) {
      if (now.outlineStyle !== "none" && parseFloat(now.outlineWidth) > 0) source = "own outline";
      else if (now.boxShadow !== "none") source = "own box-shadow";
      else {
        let n = el.parentElement;
        for (let i = 0; i < 3 && n && !source; i++, n = n.parentElement) {
          if (changed(window.__auditBase.get(n), looks(view.getComputedStyle(n)))) source = `ancestor ${cssPath(n)}`;
        }
      }
    }
    return { key: idOf(el), selector: cssPath(el), name: accName(el), inFrame, focusVisible: el.matches(":focus-visible"), focusIndicator: !!source, indicatorSource: source };
  };
  return { isVisible, cssPath, accName, smallTargets, labels, contrast, overflow, snapshot, active };
}
const HELPERS_SRC = `window.__audit = (${auditHelpers.toString()})();`;

// A self-test failure means the contrast sampler is not trustworthy: the run stops.
class FatalError extends Error {
  constructor(message) {
    super(message);
    this.fatal = true;
  }
}

const axeEvaluate = (tags) =>
  // eslint-disable-next-line no-undef
  axe.run(document, { runOnly: { type: "tag", values: tags } }).then((r) =>
    r.violations.map((v) => ({
      id: v.id,
      impact: v.impact ?? "unknown",
      help: v.help,
      tags: v.tags.filter((t) => /^wcag\d|best-practice/.test(t)),
      nodeCount: v.nodes.length,
      targets: v.nodes.slice(0, 5).map((n) => n.target.join(" ")),
    })),
  );

async function mockMedia(context) {
  const items = [
    { file: "stage.jpg", alt: "The band on stage", width: 1920, height: 1200, bytes: 400000, uploadedAt: "2026-11-02T10:00:00Z", focus: { x: 18, y: 45 } },
    { file: "door.jpg", alt: "", width: 1920, height: 1280, bytes: 300000, uploadedAt: "2026-11-01T10:00:00Z" },
  ];
  await context.route("**/api/media", (r) => r.fulfill({ json: { ok: true, items, usage: {} } }));
  await context.route("**/media/*.jpg", async (r) => {
    const name = r.request().url().includes("stage") ? "signal/guitarist" : "corner/tool-wall";
    r.fulfill({ contentType: "image/jpeg", body: await readFile(join(ROOT, "scripts/starter-templates/photos", `${name}.jpg`)) });
  });
}

async function runStep(page, step) {
  const timeout = 8000;
  if (step.click) await page.locator(step.click).first().click({ timeout });
  else if (step.canvas) {
    const at = step.canvas.includes("Section") ? { position: { x: 12, y: 12 } } : {};
    await page.frameLocator("#preview-frame").locator(step.canvas).first().click({ timeout, ...at });
  } else if (step.pick) await page.locator(step.pick[0]).first().selectOption(step.pick[1], { timeout });
  else if (step.key) await page.keyboard.press(step.key);
  else if (step.waitFor) await page.waitForSelector(step.waitFor, { state: "attached", timeout: 10000 });
  else throw new Error(`unknown step ${JSON.stringify(step)}`);
  await page.waitForTimeout(600);
}

async function writeJson(path, data) {
  await writeFile(path, JSON.stringify(data, null, 2) + "\n");
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

// Tab walk: presses Tab and reads the focused element each time. Stops when the first element comes round again,
// when focus leaves the document (recorded once as "leftDocument"), or after 60 presses. possibleTrap is set only
// when three Tab presses in a row leave the focused element unchanged.
async function tabWalk(page) {
  await page.evaluate(() => window.__audit.snapshot());
  const stops = [];
  let first = null;
  let unchangedRun = 0;
  let prevKey = undefined;
  let possibleTrap = false;
  let leftDocument = false;
  let cycle = false;
  for (let i = 1; i <= 60; i++) {
    await page.keyboard.press("Tab");
    const s = await page.evaluate(() => window.__audit.active());
    if (s.leftDocument) {
      leftDocument = true;
      stops.push({ i, selector: "leftDocument", name: "", focusVisible: false, focusIndicator: null });
      break;
    }
    if (first === null) first = s.key;
    else if (i > 1 && s.key === first) {
      cycle = true;
      break;
    }
    stops.push({ i, ...s });
    unchangedRun = s.key === prevKey ? unchangedRun + 1 : 0;
    prevKey = s.key;
    if (unchangedRun >= 3) {
      possibleTrap = true;
      break;
    }
  }
  const real = stops.filter((s) => s.key !== undefined);
  const uniq = new Map();
  for (const s of real) uniq.set(s.key, s);
  const withoutIndicator = [...uniq.values()].filter((s) => s.focusIndicator === false).map((s) => ({ selector: s.selector, name: s.name }));
  return {
    presses: stops.length,
    stops,
    uniqueStops: uniq.size,
    stopsWithoutIndicator: withoutIndicator,
    leftDocument,
    returnedToFirst: cycle,
    possibleTrap,
    note: "Focus read from document.activeElement after each Tab (following same-origin iframes). Indicator: :focus-visible and an own outline or box-shadow, or a changed look on one of the three nearest ancestors against a snapshot taken before the first Tab.",
  };
}

// Captures one screen at one viewport and colour scheme. Returns { reached, reason?, counts? }.
async function captureVariant({ browser, server, demoHome, fakeApp, axeSource, screen, vp, scheme, out }) {
  const dir = join(out, screen.id, `${vp}-${scheme}`);
  await mkdir(dir, { recursive: true });
  const context = await browser.newContext({ viewport: VIEWPORTS[vp], colorScheme: scheme, deviceScaleFactor: 1 });
  try {
    const page = await context.newPage();
    if (screen.media) await mockMedia(context);
    if (screen.app) await page.addInitScript(`window.__FAKE_TAURI__ = ${JSON.stringify(screen.app)};\n${fakeApp}`);
    if (screen.post) {
      await page.addInitScript((p) => {
        try {
          localStorage.setItem(`crust:post:${p.slug}`, JSON.stringify({ post: p, updatedAt: new Date().toISOString(), savedToGitHub: false }));
        } catch {
          // Storage can be blocked; the post then does not open.
        }
      }, screen.post);
    }
    if (screen.seed && !screen.app) {
      const home = screen.seed === "empty" ? { ...demoHome, content: [] } : demoHome;
      await page.addInitScript((h) => {
        try {
          localStorage.setItem("crust:page:/", JSON.stringify({ page: h, updatedAt: new Date().toISOString(), savedToGitHub: true }));
        } catch {
          // Storage can be blocked; the page then opens its bundled Home.
        }
      }, home);
    }
    await page.goto(server.url + screen.hash, { waitUntil: "load" });
    const wait = screen.wait ?? (screen.builder && vp !== "phone" ? "iframe" : "body");
    try {
      await page.waitForSelector(wait, { state: "attached", timeout: 20000 });
      await page.waitForTimeout(1500);
      for (const step of screen.steps ?? []) {
        try {
          await runStep(page, step);
        } catch (err) {
          const reason = `step ${JSON.stringify(step)} failed: ${String(err.message).split("\n")[0]}`;
          await writeFile(join(dir, "NOT_REACHED.txt"), `${reason}\n`);
          return { reached: false, reason };
        }
      }
    } catch (err) {
      const reason = `page not ready (waited for ${wait}): ${String(err.message).split("\n")[0]}`;
      await writeFile(join(dir, "NOT_REACHED.txt"), `${reason}\n`);
      return { reached: false, reason };
    }
    await page.waitForTimeout(500);
    await page.screenshot({ path: join(dir, "screenshot.png") });

    // axe, on the page and on the builder's canvas frame (its own document).
    const frameHandle = await page.$("#preview-frame");
    const frame = frameHandle ? await frameHandle.contentFrame() : null;
    const contexts = [{ scope: "page", ctx: page }, ...(frame ? [{ scope: "preview-frame", ctx: frame }] : [])];
    const violations = [];
    for (const { scope, ctx } of contexts) {
      await ctx.addScriptTag({ content: axeSource });
      await ctx.addScriptTag({ content: HELPERS_SRC });
      for (const v of await ctx.evaluate(axeEvaluate, AXE_TAGS)) {
        violations.push({ ...v, scope, targets: scope === "page" ? v.targets : v.targets.map((t) => `#preview-frame ${t}`) });
      }
    }
    await writeJson(join(dir, "axe.json"), { violations });

    // Real small targets (under 24px, 44px on phone), hidden and inert ones skipped.
    const minSize = vp === "phone" ? 44 : 24;
    const targetItems = [];
    for (const { scope, ctx } of contexts) {
      for (const t of await ctx.evaluate(([sel, min]) => window.__audit.smallTargets(sel, min), [INTERACTIVE, minSize])) {
        targetItems.push({ scope, ...t });
      }
    }
    await writeJson(join(dir, "targets.json"), { minSizePx: minSize, count: targetItems.length, spacingExceptionOk: targetItems.filter((t) => t.spacingOk).length, items: targetItems });

    await writeJson(join(dir, "aria.json"), { snapshot: await page.locator("body").ariaSnapshot() });
    await writeJson(join(dir, "labels.json"), { items: await page.evaluate(() => window.__audit.labels()) });

    // Tab walk, then Escape in any open dialog.
    const walk = await tabWalk(page);
    const openDialogs = await page.locator("dialog[open]").count();
    let dialogEscape = null;
    if (openDialogs) {
      await page.keyboard.press("Escape");
      await page.waitForTimeout(400);
      dialogEscape = { dialogsOpen: openDialogs, closedByEscape: (await page.locator("dialog[open]").count()) < openDialogs };
    }
    await writeJson(join(dir, "tabwalk.json"), { ...walk, dialogEscape });

    // Contrast, with a self-test: a known failing pair must be reported, or the run stops.
    await page.evaluate(() => {
      const d = document.createElement("div");
      d.id = "audit-selftest";
      d.textContent = "Self-test contrast";
      d.setAttribute("style", "position:fixed;top:0;left:0;z-index:2147483647;color:#999;background:#fff;font-size:16px;padding:4px");
      document.body.prepend(d);
    });
    const sample = await page.evaluate(() => window.__audit.contrast(300));
    await page.evaluate(() => document.getElementById("audit-selftest")?.remove());
    const selfTest = sample.failures.find((f) => f.text === "Self-test contrast");
    if (!selfTest || selfTest.ratio >= 4.5) throw new FatalError(`contrast self-test failed: #999 on #fff was not reported (${JSON.stringify(selfTest)})`);
    sample.failures = sample.failures.filter((f) => f.text !== "Self-test contrast");
    sample.selfTest = `passed (#999 on #fff = ${selfTest.ratio})`;
    await writeJson(join(dir, "contrast.json"), sample);

    let reflow = null;
    if (vp === "desktop" && scheme === "light") {
      await page.emulateMedia({ colorScheme: "light", forcedColors: "active" });
      await page.waitForTimeout(400);
      await page.screenshot({ path: join(dir, "forced-colors.png") });
      await page.emulateMedia({ colorScheme: "light", forcedColors: "none", reducedMotion: "reduce" });
      await page.waitForTimeout(400);
      const motion = await page.evaluate(() => {
        const running = document.getAnimations().filter((a) => a.playState === "running");
        const css = running.filter((a) => typeof CSSAnimation !== "undefined" && a instanceof CSSAnimation);
        return { cssAnimationsRunning: css.length, cssTransitionsRunning: running.length - css.length, names: css.slice(0, 10).map((a) => a.animationName) };
      });
      await writeJson(join(dir, "reduced-motion.json"), { emulated: "prefers-reduced-motion: reduce", ...motion });
      await page.emulateMedia({ colorScheme: "light", forcedColors: "none", reducedMotion: "no-preference" });
    }
    if (vp === "phone") {
      await page.setViewportSize({ width: 320, height: 640 });
      await page.waitForTimeout(500);
      reflow = await page.evaluate(() => window.__audit.overflow(5));
      await writeJson(join(dir, "reflow.json"), { viewportPx: "320x640 (reflow check; stands in for 200% zoom)", ...reflow });
    }

    const axeByImpact = { critical: 0, serious: 0, moderate: 0, minor: 0, unknown: 0 };
    for (const v of violations) axeByImpact[v.impact] = (axeByImpact[v.impact] ?? 0) + 1;
    return {
      reached: true,
      counts: {
        axe: { ...axeByImpact, total: violations.length, ruleIds: [...new Set(violations.map((v) => `${v.impact}:${v.id}`))] },
        smallTargets: targetItems.length,
        stopsWithoutIndicator: walk.stopsWithoutIndicator.length,
        possibleTrap: walk.possibleTrap,
        dialogEscape,
        contrastFailures: sample.failures.length,
        contrastUnknown: sample.unknown,
        reflowOverflow: reflow ? reflow.horizontalScroll : null,
      },
    };
  } finally {
    await context.close();
  }
}

async function main() {
  const started = Date.now();
  const [outArg, areaArg = "1,3"] = process.argv.slice(2);
  if (!outArg) {
    console.error("Usage: node scripts/audit/capture.mjs <outDir> [areaIds, e.g. 1,3]");
    process.exit(2);
  }
  const out = resolve(outArg);
  const areas = new Set(areaArg.split(",").map((s) => Number(s.trim())));
  await mkdir(out, { recursive: true });
  const logError = (msg) => appendFile(join(out, "errors.log"), `${new Date().toISOString()} ${msg}\n`);

  if (!(await stat(join(DIST, "index.html")).catch(() => null))) {
    console.log("apps/admin/dist is missing; running npm run build once.");
    await execFileAsync("npm", ["run", "build"], { cwd: ROOT, maxBuffer: 1 << 26 });
  }

  const axeSource = await readFile(require.resolve("axe-core/axe.min.js"), "utf8");
  const demoHome = JSON.parse(await readFile(join(ROOT, "packages/render/src/fixtures/sample-content/pages/index.json"), "utf8"));
  const fakeApp = await readFile(join(ROOT, "scripts/fake-tauri.js"), "utf8");
  const server = await serve(DIST);
  const browser = await chromium.launch({ executablePath: BROWSER, args: ["--no-sandbox"] });
  const screens = [];
  let timedOut = false;
  try {
    for (const screen of SCREENS.filter((s) => areas.has(s.area))) {
      const record = { id: screen.id, area: screen.area, title: screen.title, status: "", reason: "", variants: [] };
      screens.push(record);
      const screenDir = join(out, screen.id);
      await mkdir(screenDir, { recursive: true });
      if (screen.notReached) {
        record.status = "not_reached";
        record.reason = screen.notReached;
        await writeFile(join(screenDir, "NOT_REACHED.txt"), `${screen.notReached}\n`);
        continue;
      }
      if (screen.shares) {
        record.status = "shared";
        record.reason = `${screen.note} Captured in ${screen.shares}.`;
        await writeFile(join(screenDir, "SHARED.txt"), `${record.reason}\n`);
        continue;
      }
      const reasons = [];
      for (const vp of Object.keys(VIEWPORTS)) {
        for (const scheme of SCHEMES) {
          const key = `${vp}-${scheme}`;
          if (Date.now() - started > BUDGET_MS) {
            timedOut = true;
            reasons.push(`${key}: skipped, time budget reached`);
            continue;
          }
          try {
            const r = await captureVariant({ browser, server, demoHome, fakeApp, axeSource, screen, vp, scheme, out });
            if (r.reached) record.variants.push({ viewport: vp, scheme, counts: r.counts });
            else reasons.push(`${key}: ${r.reason}`);
          } catch (err) {
            if (err.fatal) throw err;
            const msg = String(err.stack ?? err).split("\n").slice(0, 3).join(" | ");
            await logError(`${screen.id} ${key}: ${msg}`);
            reasons.push(`${key}: error (see errors.log)`);
          }
        }
      }
      record.status = record.variants.length ? "reached" : "not_reached";
      record.reason = reasons.join("; ");
      if (!record.variants.length) await writeFile(join(screenDir, "NOT_REACHED.txt"), reasons.join("\n") + "\n");
      console.log(`${screen.id}: ${record.variants.length}/6 variants${record.variants.length ? "" : " (not reached)"}`);
    }
  } finally {
    await browser.close();
    await server.close();
  }

  // Summary: raw counts only. Unique axe rules are counted per screen so repeats across viewports and schemes do not inflate them.
  const perVariantTotals = { critical: 0, serious: 0, moderate: 0, minor: 0, unknown: 0 };
  const uniqueByImpact = { critical: 0, serious: 0, moderate: 0, minor: 0, unknown: 0 };
  for (const s of screens) {
    const seen = new Set();
    for (const v of s.variants) {
      for (const k of Object.keys(perVariantTotals)) perVariantTotals[k] += v.counts.axe[k] ?? 0;
      for (const r of v.counts.axe.ruleIds) seen.add(r);
    }
    s.uniqueAxeRules = [...seen].sort();
    for (const r of seen) uniqueByImpact[r.split(":")[0]] += 1;
  }
  const summary = {
    generatedAt: new Date().toISOString(),
    areas: [...areas],
    minutes: Math.round(((Date.now() - started) / 60000) * 10) / 10,
    timeBudgetHit: timedOut,
    screens: { total: screens.length, reached: screens.filter((s) => s.status === "reached").length, notReached: screens.filter((s) => s.status === "not_reached").length, shared: screens.filter((s) => s.status === "shared").length },
    axeViolationsPerVariant: perVariantTotals,
    axeUniqueRulesPerScreenByImpact: uniqueByImpact,
    screensList: screens.map(({ id, area, title, status, reason, variants, uniqueAxeRules }) => ({ id, area, title, status, reason, uniqueAxeRules, variants })),
  };
  await writeJson(join(out, "summary.json"), summary);

  const rows = [];
  for (const s of screens) {
    if (s.status !== "reached") continue;
    for (const v of s.variants) {
      const c = v.counts;
      const trap = c.possibleTrap ? "yes" : "no";
      const esc = c.dialogEscape ? (c.dialogEscape.closedByEscape ? "closes" : "stays open") : "-";
      rows.push(`| ${s.id} | ${v.viewport}-${v.scheme} | ${c.axe.critical}/${c.axe.serious}/${c.axe.moderate}/${c.axe.minor}/${c.axe.unknown} | ${c.smallTargets} | ${c.stopsWithoutIndicator} | ${trap} | ${esc} | ${c.contrastFailures} | ${c.contrastUnknown} | ${c.reflowOverflow === null ? "-" : c.reflowOverflow ? "yes" : "no"} |`);
    }
  }
  const screenRows = screens
    .filter((s) => s.status === "reached")
    .map((s) => `| ${s.id} | ${s.variants.length}/6 | ${s.uniqueAxeRules.length} | ${s.uniqueAxeRules.map((r) => r.replace(":", " ")).join(", ") || "-"} |`);
  const md = [
    `# Capture summary (areas ${[...areas].join(",")})`,
    "",
    `Output: ${out}. Generated ${summary.generatedAt} in ${summary.minutes} min${timedOut ? " (time budget hit)" : ""}.`,
    "",
    `Screens: ${summary.screens.reached} reached, ${summary.screens.notReached} not reached, ${summary.screens.shared} shared with another capture (of ${summary.screens.total}).`,
    "",
    `axe violations, summed over variants: critical ${perVariantTotals.critical}, serious ${perVariantTotals.serious}, moderate ${perVariantTotals.moderate}, minor ${perVariantTotals.minor}, unknown ${perVariantTotals.unknown}.`,
    `axe unique rules per screen, by impact: critical ${uniqueByImpact.critical}, serious ${uniqueByImpact.serious}, moderate ${uniqueByImpact.moderate}, minor ${uniqueByImpact.minor}, unknown ${uniqueByImpact.unknown}.`,
    "",
    "## Per screen (unique axe rules)",
    "",
    "| Screen | Variants reached | Unique axe rules | Rule ids (impact) |",
    "|---|---|---|---|",
    ...screenRows,
    "",
    "## Per variant (raw counts)",
    "",
    "axe columns: critical/serious/moderate/minor/unknown. Small targets: real ones (hidden and inert skipped).",
    "",
    "| Screen | Viewport-scheme | axe | Small targets | Stops without focus indicator | Tab trap | Escape in dialog | Contrast fails | Contrast unknown | Phone overflow |",
    "|---|---|---|---|---|---|---|---|---|---|",
    ...rows,
    "",
    "## Not reached or shared",
    "",
    ...screens.filter((s) => s.status !== "reached").map((s) => `- ${s.id} (${s.status}) ${s.title}: ${s.reason}`),
    "",
  ].join("\n");
  await writeFile(join(out, "summary.md"), md);
  console.log(`Done in ${summary.minutes} min. Output: ${out}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

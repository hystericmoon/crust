// F040: runs axe on the builder itself (Puck's chrome and our own controls),
// at desktop width, after the canvas has loaded. Fails on any "serious" or
// "critical" issue. Needs the built admin: npm run build first.
// Usage: node scripts/check-builder-a11y.mjs [apps/admin/dist]
import { readFile, stat } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";
import { chromium } from "playwright-core";
import { serve } from "./serve-static.mjs";

const require = createRequire(import.meta.url);
const axeSource = await readFile(require.resolve("axe-core/axe.min.js"), "utf8");
const distDir = process.argv[2] ?? "apps/admin/dist";

if (!(await stat(join(distDir, "index.html")).catch(() => null))) {
  console.log(`No builder in ${distDir}. Run npm run build first.`);
  process.exit(1);
}

// The post builder needs a post; offline, posts come from the browser's drafts.
const samplePost = {
  slug: "check-post",
  title: "Opening day",
  description: "We open on Saturday.",
  date: "2026-10-30",
  cover: "",
  coverAlt: "",
  puck: { root: { props: {} }, content: [{ type: "Text", props: { id: "t1", text: "Come and say hello." } }] },
};
// F078: a post with the new blocks, to check the Table's cells, the Video's notes and Pricing's style fields.
const blocksPost = {
  ...samplePost,
  slug: "check-blocks",
  puck: {
    root: { props: {} },
    content: [
      { type: "Table", props: { id: "Table-check", caption: "Opening hours", headers: "both", look: "lines", rows: [["", "Studio"], ["Saturday", "10–16"]] } },
      { type: "Video", props: { id: "Video-check", src: "/media/tour.mp4", title: "", imageSrc: "", captionsSrc: "", caption: "", ratio: "16:9" } },
      { type: "Pricing", props: { id: "Pricing-check", highlight: "1", badge: "Most popular", planStyle: "surface", highlightStyle: "primary", titleLevel: "h2", plans: [{ name: "Studio", price: "€49", period: "per month", description: "", features: "5 sites", buttonLabel: "", buttonHref: "/contact" }] } },
      { type: "Stats", props: { id: "Stats-check", look: "lines", size: "md", colour: "text", align: "left", items: [{ value: "12", label: "years", detail: "" }] } },
    ],
  },
};
// [label, address, post to seed, block to select first (F042: the rich text editor), buttons to press (F048),
//  F073: { then: buttons to press after selecting the block },
//  F058: { app: run as the desktop app (scripts/fake-tauri.js) with this host state, wait: what to wait for instead of the canvas,
//  F060: firstRun: a brand new Crust (the welcome screen), F061: update: "available" }]
const screens = [
  ["page builder", "/#/edit?path=/", null, null],
  ["page builder, Text block selected", "/#/edit?path=/", null, '[data-puck-component^="Text"]'],
  ["post builder", "/#/post?slug=check-post", samplePost, null],
  ["template gallery", "/#/templates", null, null],
  ["template preview", "/#/templates", null, null, [".tp-card[id]"]],
  ["template confirm question", "/#/templates", null, null, [".tp-card[id]", 'button:has-text("Use this template")', "dialog[open]"]],
  ["app Publish card, no host yet", "/#/", null, null, [], { app: "none", wait: ".hp-host" }],
  ["app connect dialog, token step", "/#/", null, null, [".hp-host", "dialog[open]"], { app: "none", wait: ".hp-host" }],
  ["app Publish card, connected", "/#/", null, null, [], { app: "connected", wait: ".hp-where" }],
  ["app change or disconnect", "/#/", null, null, ['button:has-text("Change or disconnect")', "dialog[open]"], { app: "connected", wait: ".hp-where" }],
  ["app FTP connect dialog", "/#/", null, null, ['button:has-text("Your own web host")', "dialog[open]"], { app: "none", wait: ".hp-host" }],
  ["app FTP dialog, plain FTP warning", "/#/", null, null, ['button:has-text("Your own web host")', 'label:has-text("FTP (not encrypted)")', "dialog[open]"], { app: "none", wait: ".hp-host" }],
  ["app Publish card, plain FTP", "/#/", null, null, [], { app: "ftp-plain", wait: ".hp-plain" }],
  ["app change or disconnect, SFTP", "/#/", null, null, ['button:has-text("Change or disconnect")', "dialog[open]"], { app: "ftp", wait: ".hp-where" }],
  // F060: a brand new Crust opens on the welcome screen.
  ["app welcome screen (first run)", "/", null, null, [], { app: "none", firstRun: true, wait: ".fr-card iframe" }],
  // F062: premium templates (the example catalogue): the gallery's groups and a premium preview.
  ["template gallery with premium", "/#/templates?examples", null, null, [], { wait: ".tp-premium img" }],
  ["premium template preview", "/#/templates?examples", null, null, [".tp-premium .tp-card"], { wait: ".tp-premium img" }],
  ["premium template preview, phone width", "/#/templates?examples", null, null, [".tp-premium .tp-card", 'button:has-text("Phone")'], { wait: ".tp-premium img" }],
  // F061: an update found from the Sites screen: the banner, the Crust card, and What's new.
  ["app Sites screen, update ready", "/#/sites", null, null, ['button:has-text("Check for updates")'], { app: "none", update: "available", wait: ".up-about" }],
  ["app What's new dialog", "/#/sites", null, null, ['button:has-text("Check for updates")', '.up-banner button:has-text("What\'s new")', "dialog[open]"], { app: "none", update: "available", wait: ".up-about" }],
  ["app Pages screen, update ready", "/#/sites", null, null, ['button:has-text("Check for updates")', ".st-back"], { app: "none", update: "available", wait: ".up-about" }],
  // F072: Site settings → Styles (the Style library), then a look and a colourway picked.
  ["Site settings, Styles", "/#/settings", null, null, [], { wait: ".st-looks" }],
  ["Site settings, look and colourway picked", "/#/settings", null, null, ['.st-look:has-text("Atelier")', '[aria-label="Atelier colourway"] [aria-label="Night"]'], { wait: ".st-looks" }],
  // F070: Site settings → Typography, the font pairs and grouped font lists; then a pair picked.
  ["Site settings, Typography", "/#/settings", null, null, ['.st-nav-item:has-text("Typography")'], { wait: ".st-nav" }],
  ["Site settings, font pair picked", "/#/settings", null, null, ['.st-nav-item:has-text("Typography")', '.st-fontpair:has-text("Editorial")'], { wait: ".st-nav" }],
  // F073: a Section's Style tab (Layout, Background, Over and under), then Gradient and Photo picked.
  ["Section Style tab", "/#/edit?path=/", null, '[data-puck-component^="Section"]', [], { then: ['.tb-tab:has-text("Style"):visible'] }],
  ["Section Style tab, gradient", "/#/edit?path=/", null, '[data-puck-component^="Section"]', [], { then: ['.tb-tab:has-text("Style"):visible', '[aria-label="Background"] .sx-seg-option:has-text("Gradient"):visible'] }],
  ["Section Style tab, video", "/#/edit?path=/", null, '[data-puck-component^="Section"]', [], { then: ['.tb-tab:has-text("Style"):visible', '[aria-label="Background"] .sx-seg-option:has-text("Video"):visible'] }],
  // F078: the Table's cells, the Video's notes, Pricing's Style tab, an Icon list switched to Numbers.
  ["Table cells", "/#/post?slug=check-blocks", blocksPost, '[data-puck-component^="Table"]'],
  ["Video notes", "/#/post?slug=check-blocks", blocksPost, '[data-puck-component^="Video"]'],
  ["Pricing Style tab", "/#/post?slug=check-blocks", blocksPost, '[data-puck-component^="Pricing"]', [], { then: ['.tb-tab:has-text("Style"):visible'] }],
  // F077: a Card's icon picker (Content tab), then a category picked.
  ["Card icon picker", "/#/edit?path=/", null, '[data-puck-component^="Card"]', [], { then: ['.ic-chip:has-text("Food"):visible'] }],
  // F074: a Columns row's Style tab, then boxes and a highlighted column picked.
  ["Columns Style tab", "/#/edit?path=/", null, '[data-puck-component^="Card"]', [], { then: ['button:text-is("Columns"):visible', '.tb-tab:has-text("Style"):visible'] }],
  ["Columns Style tab, boxes and highlight", "/#/edit?path=/", null, '[data-puck-component^="Card"]', [], { then: ['button:text-is("Columns"):visible', '.tb-tab:has-text("Style"):visible', '[aria-label="Box behind each column"] [aria-label="Muted"]:visible', '[aria-label="Highlight a column"] [aria-label="Column 2"]:visible'] }],
  ["app welcome screen, Blank picked", "/", null, null, ['label:has-text("Blank")'], { app: "none", firstRun: true, wait: ".fr-card iframe" }],
];
const fakeApp = await readFile(new URL("./fake-tauri.js", import.meta.url), "utf8");

const server = await serve(distDir);
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
let failures = 0;
try {
  for (const [label, hash, post, select, clicks = [], { app, wait, firstRun, update, then = [] } = {}] of screens) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    if (app) await page.addInitScript(`window.__FAKE_TAURI__ = ${JSON.stringify({ host: app, firstRun, update })};\n${fakeApp}`);
    if (post) {
      await page.addInitScript((p) => {
        localStorage.setItem(`crust:post:${p.slug}`, JSON.stringify({ post: p, updatedAt: new Date().toISOString(), savedToGitHub: false }));
      }, post);
    }
    await page.goto(server.url + hash, { waitUntil: "load" });
    // Wait for Puck's canvas and the blocks inside it (or the screen's own landmark).
    await page.waitForSelector(wait ?? "iframe", { timeout: 20_000 });
    await page.waitForTimeout(1500);
    // Buttons to press in order; a last "dialog[open]" only waits for the dialog to be there.
    for (const button of clicks) {
      if (button === "dialog[open]") await page.waitForSelector(button, { timeout: 10_000 });
      else await page.locator(button).first().click();
      await page.waitForTimeout(800);
    }
    if (select) {
      // A Section is clicked near its corner, so the Section itself is selected rather than a block inside it.
      await page.frameLocator("#preview-frame").locator(select).first().click(select.includes("Section") ? { position: { x: 12, y: 12 } } : undefined);
      if (select.includes("Text")) await page.waitForSelector(".rt-editor", { state: "attached", timeout: 10_000 });
      await page.waitForTimeout(500);
    }
    // F073: buttons to press once the block is selected (its settings panel).
    for (const button of then) {
      await page.locator(button).first().click();
      await page.waitForTimeout(600);
    }
    await page.addScriptTag({ content: axeSource });
    const results = await page.evaluate(() =>
      // eslint-disable-next-line no-undef
      axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"] } }),
    );
    const bad = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    const minor = results.violations.filter((v) => !bad.includes(v));
    if (bad.length) {
      failures += bad.length;
      console.log(`✗ ${label}: ${bad.length} serious issue(s)`);
      for (const v of bad) {
        console.log(`   - ${v.help} [${v.id}, ${v.impact}]`);
        for (const n of v.nodes.slice(0, 3)) console.log(`       at ${n.target.join(" ")}`);
      }
    } else {
      console.log(`✓ ${label}: no serious issues${minor.length ? ` (${minor.length} minor, not blocking)` : ""}`);
    }
    for (const v of minor) console.log(`   · minor: ${v.help} [${v.id}] at ${v.nodes[0]?.target.join(" ")}`);
    await page.close();
  }
} finally {
  await browser.close();
  await server.close();
}
if (failures) {
  console.log(`\nBuilder accessibility check failed: ${failures} serious issue(s).`);
  process.exit(1);
}
console.log("\nBuilder accessibility check passed.");

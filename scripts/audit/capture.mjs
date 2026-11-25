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
const BUDGET_MS = 20 * 60 * 1000;
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
const FIRST_RUN = { hash: "/", app: { host: "none", firstRun: true }, wait: ".fr-form" };
const PHOTO_PICK = [{ canvas: CARD },{ click: 'button:has-text("Choose image"):visible' }, { waitFor: "dialog[open]" }];
const MEDIA = { media: true };

// Screens of the pilot. "steps" run after the page is ready; "shares" = visible in another screen's capture;
// "notReached" = no capture attempted (reason given).
const SCREENS = [
  { id: "S01", area: 1, title: "First-run chooser (Blank and templates, name field)", ...FIRST_RUN, steps: [] },
  { id: "S01-blank", area: 1, title: "First-run chooser, Blank picked", ...FIRST_RUN, steps: [{ click: 'label:has-text("Blank")' }] },
  { id: "S02", area: 1, title: "Template picked inside first run (preview)", ...FIRST_RUN, steps: [{ click: ".fr-card" }] },
  { id: "S03", area: 1, title: "Suggested name prefill", shares: "S01", note: "The name field is on the S01 screen; not captured separately." },
  { id: "S04", area: 1, title: "Open-to-replace arrival", notReached: "Inferred from code only (first-run/arrival.ts); no control reaches it in this pilot." },

  { id: "S14", area: 3, title: "Page editor, Home", ...EDIT_HOME, steps: [] },
  { id: "S15", area: 3, title: "There's no page at this path", hash: "/#/edit?path=/no-such-page", steps: [] },
  { id: "S16", area: 3, title: "Editor top bar", shares: "S14", note: "Top bar is in every S14 capture." },
  { id: "S17", area: 3, title: "Left rail", shares: "S14", note: "Rail is in every S14 capture." },
  { id: "S18", area: 3, title: "Pages panel", ...EDIT_HOME, steps: [{ click: RAIL_YOUR_SITE }, { click: '.af-place-link:has(strong:text-is("Pages"))' }] },
  { id: "S19", area: 3, title: "Section selected (section toolbar)", ...EDIT_HOME, steps: [{ canvas: SECTION }] },
  { id: "S20", area: 3, title: "Keyboard move mode for a section", notReached: "Needs keyboard focus on a section plus a shortcut that is not in the selectors; not scripted in the pilot." },
  { id: "S21", area: 3, title: "Add-section gallery", ...EDIT_HOME, steps: [{ click: RAIL_THIS_PAGE }, { click: ".af-add-section" }, { waitFor: "dialog[open]" }] },
  { id: "S22", area: 3, title: "Gallery 'On this empty page' choice", notReached: "Needs an empty page; the pilot uses the sample Home page." },
  {
    id: "S23", area: 3, title: "Replace whole design confirm",
    ...EDIT_HOME,
    steps: [
      { click: RAIL_THIS_PAGE }, { click: ".af-add-section" }, { waitFor: "dialog[open]" },
      { pick: [".lg-dialog select:has(option[value=page])", "page"] },
      { click: ".lg-card-button" },
      { waitFor: 'dialog[open]:has-text("replaces the whole design")' },
    ],
  },
  { id: "S24", area: 3, title: "Keyboard shortcuts dialog", ...EDIT_HOME, steps: [{ click: 'a:has-text("Keyboard shortcuts"), button:has-text("Keyboard shortcuts")' }, { waitFor: "dialog[open]" }] },
  { id: "S25", area: 3, title: "Section settings, Style tab", ...EDIT_HOME, steps: [{ canvas: SECTION }, { click: '.tb-tab:has-text("Style"):visible' }] },
  { id: "S26", area: 3, title: "Section visual fields and placeholders checklist", notReached: "Placeholder checklist sits in the publish panel; not reached without pressing Publish, which this capture never does." },
  { id: "S27", area: 3, title: "Page settings (search and sharing)", ...EDIT_HOME, steps: [{ click: 'button:text-is("Settings")' }] },
  { id: "S28", area: 3, title: "Next steps / placeholder checklist", notReached: "Shown in the publish panel, which opens from Publish; this capture never presses Publish." },
  { id: "S29", area: 3, title: "Layout photo prompt", notReached: "Inferred from code only (layouts/photos.tsx); needs a photo layout inserted first." },
  { id: "S30", area: 3, title: "Media picker 'Choose an image'", ...EDIT_HOME, ...MEDIA, steps: PHOTO_PICK },
  { id: "S31", area: 3, title: "Media photo details with focal point", ...EDIT_HOME, ...MEDIA, steps: [...PHOTO_PICK, { click: '.mp-photo[data-file="stage.jpg"]' }] },
  { id: "S32", area: 3, title: "Responsive override (Mobile width)", ...EDIT_HOME, steps: [{ canvas: TEXT }, { click: 'button:has-text("Mobile"):visible' }] },
  { id: "S33", area: 3, title: "Inline text editing", ...EDIT_HOME, steps: [{ canvas: TEXT }, { waitFor: ".rt-editor" }] },
  { id: "S34", area: 3, title: "Save status bar", shares: "S14", note: "Status bar is in the S14 capture; no separate state." },
  { id: "S35", area: 3, title: "Publish button (top bar)", shares: "S14", note: "Default state only, in the S14 capture. Error state not reachable without pressing Publish." },
];

// Runs in the page (and the canvas frame) as window.__audit. Written as a function so its source ships to the browser.
function auditHelpers() {
  const isVisible = (el) => {
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden") return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
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
  const focusStyle = (cs) => ({ outlineStyle: cs.outlineStyle, outlineWidth: cs.outlineWidth, outlineColor: cs.outlineColor, boxShadow: cs.boxShadow });
  // Reads the focused element's look, then (blur, read, focus again) its unfocused look, and compares.
  const focusInfo = () => {
    const el = document.activeElement;
    if (!el || el === document.body || el === document.documentElement) return { selector: "(focus left the page)", name: "", focusIndicator: false };
    if (el.tagName === "IFRAME") return { selector: cssPath(el), name: el.title || "", focusIndicator: null };
    const focused = focusStyle(getComputedStyle(el));
    el.blur();
    const unfocused = focusStyle(getComputedStyle(el));
    el.focus({ preventScroll: true });
    const outline = focused.outlineStyle !== "none" && parseFloat(focused.outlineWidth) > 0 &&
      (focused.outlineStyle !== unfocused.outlineStyle || focused.outlineWidth !== unfocused.outlineWidth || focused.outlineColor !== unfocused.outlineColor);
    const shadow = focused.boxShadow !== "none" && focused.boxShadow !== unfocused.boxShadow;
    return { selector: cssPath(el), name: accName(el), focusIndicator: outline || shadow };
  };
  const smallTargets = (selector, min) => {
    const out = [];
    for (const el of document.querySelectorAll(selector)) {
      if (!isVisible(el)) continue;
      const r = el.getBoundingClientRect();
      if (r.width < min || r.height < min) out.push({ selector: cssPath(el), text: accName(el).slice(0, 80), size: `${Math.round(r.width)}x${Math.round(r.height)}` });
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
      if (!isVisible(el)) continue;
      const kind = /^H[1-6]$/.test(el.tagName) || el.getAttribute("role") === "heading" ? "heading" : el.tagName === "LABEL" ? "label" : el.tagName === "A" ? "link" : "button";
      add(kind, textOf(el));
    }
    for (const el of document.querySelectorAll("input, textarea, select")) {
      if (!isVisible(el)) continue;
      add("placeholder", el.getAttribute("placeholder"));
      for (const l of el.labels ?? []) add("label", l.textContent);
    }
    for (const el of document.querySelectorAll("[aria-label]")) if (isVisible(el)) add("aria-label", el.getAttribute("aria-label"));
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
  const backgroundOf = (el) => {
    const layers = [];
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.backgroundImage && cs.backgroundImage !== "none") return { image: true };
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
    const out = { checked: 0, skippedBackgroundImage: 0, unparsed: 0, failures: [] };
    const els = [...document.querySelectorAll("body *")]
      .filter((el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && isVisible(el))
      .slice(0, limit);
    for (const el of els) {
      const cs = getComputedStyle(el);
      const bg = backgroundOf(el);
      if (bg.image) { out.skippedBackgroundImage++; continue; }
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
  return { isVisible, cssPath, accName, focusInfo, smallTargets, labels, contrast, overflow };
}
const HELPERS_SRC = `window.__audit = (${auditHelpers.toString()})();`;

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
  else if (step.waitFor) await page.waitForSelector(step.waitFor, { state: "attached", timeout: 10000 });
  else throw new Error(`unknown step ${JSON.stringify(step)}`);
  await page.waitForTimeout(600);
}

async function writeJson(path, data) {
  await writeFile(path, JSON.stringify(data, null, 2) + "\n");
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
    if (screen.seed === "home" && !screen.app) {
      await page.addInitScript((home) => {
        try {
          localStorage.setItem("crust:page:/", JSON.stringify({ page: home, updatedAt: new Date().toISOString(), savedToGitHub: true }));
        } catch {
          // Storage can be blocked; the page then opens its bundled Home.
        }
      }, demoHome);
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

    // Targets smaller than 24px (44px on phone) on the page and in the canvas.
    const minSize = vp === "phone" ? 44 : 24;
    const targetItems = [];
    for (const { scope, ctx } of contexts) {
      for (const t of await ctx.evaluate(([sel, min]) => window.__audit.smallTargets(sel, min), [INTERACTIVE, minSize])) {
        targetItems.push({ scope, ...t });
      }
    }
    await writeJson(join(dir, "targets.json"), { minSizePx: minSize, count: targetItems.length, items: targetItems });

    await writeJson(join(dir, "aria.json"), { snapshot: await page.locator("body").ariaSnapshot() });
    await writeJson(join(dir, "labels.json"), { items: await page.evaluate(() => window.__audit.labels()) });
    await writeJson(join(dir, "contrast.json"), await page.evaluate(() => window.__audit.contrast(150)));

    // Tab walk: 40 presses from the top of the page.
    const stops = [];
    for (let i = 0; i < 40; i++) {
      await page.keyboard.press("Tab");
      stops.push({ i: i + 1, ...(await page.evaluate(() => window.__audit.focusInfo())) });
    }
    const last = stops.slice(-12).map((s) => s.selector);
    const possibleTrap = stops.length === 40 && new Set(last).size <= 3;
    await writeJson(join(dir, "tabwalk.json"), {
      stops,
      uniqueStops: new Set(stops.map((s) => s.selector)).size,
      withoutVisibleFocus: stops.filter((s) => s.focusIndicator === false).length,
      possibleTrap,
      note: "Each stop is checked by blur, read, focus-again; focus is restored after each read.",
    });

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
        return {
          cssAnimationsRunning: css.length,
          cssTransitionsRunning: running.length - css.length,
          names: css.slice(0, 10).map((a) => a.animationName),
        };
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

    const counts = {
      axe: { critical: 0, serious: 0, moderate: 0, minor: 0, unknown: 0, total: violations.length },
      smallTargets: targetItems.length,
      tabStopsWithoutFocus: stops.filter((s) => s.focusIndicator === false).length,
      possibleTrap,
      contrastFailures: (await readJson(join(dir, "contrast.json"))).failures.length,
      reflowOverflow: reflow ? reflow.horizontalScroll : null,
    };
    for (const v of violations) counts.axe[v.impact] = (counts.axe[v.impact] ?? 0) + 1;
    return { reached: true, counts };
  } finally {
    await context.close();
  }
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function issueScore(counts) {
  return counts.axe.total + counts.smallTargets + counts.tabStopsWithoutFocus + counts.contrastFailures + (counts.reflowOverflow ? 1 : 0);
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
  const errorsLog = join(out, "errors.log");
  const logError = (msg) => appendFile(errorsLog, `${new Date().toISOString()} ${msg}\n`);

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

  // Summary.
  const totals = { critical: 0, serious: 0, moderate: 0, minor: 0, unknown: 0 };
  for (const s of screens) for (const v of s.variants) for (const k of Object.keys(totals)) totals[k] += v.counts.axe[k] ?? 0;
  const ranked = screens
    .filter((s) => s.status === "reached")
    .map((s) => ({ id: s.id, title: s.title, issues: s.variants.reduce((n, v) => n + issueScore(v.counts), 0) }))
    .sort((a, b) => b.issues - a.issues);
  const summary = {
    generatedAt: new Date().toISOString(),
    areas: [...areas],
    minutes: Math.round(((Date.now() - started) / 60000) * 10) / 10,
    timeBudgetHit: timedOut,
    screens: { total: screens.length, reached: screens.filter((s) => s.status === "reached").length, notReached: screens.filter((s) => s.status === "not_reached").length, shared: screens.filter((s) => s.status === "shared").length },
    axeViolationsByImpact: totals,
    topScreensByIssues: ranked.slice(0, 5),
    screensList: screens.map(({ id, area, title, status, reason, variants }) => ({ id, area, title, status, reason, variants })),
    issueScoreDefinition: "axe violations (all impacts) + small targets + tab stops without visible focus + contrast failures + 1 if phone reflow overflows",
  };
  await writeJson(join(out, "summary.json"), summary);

  const rows = [];
  for (const s of screens) {
    if (s.status !== "reached") continue;
    for (const v of s.variants) {
      const c = v.counts;
      rows.push(`| ${s.id} | ${v.viewport}-${v.scheme} | ${c.axe.critical}/${c.axe.serious}/${c.axe.moderate}/${c.axe.minor}/${c.axe.unknown} | ${c.smallTargets} | ${c.tabStopsWithoutFocus}${c.possibleTrap ? " (trap?)" : ""} | ${c.contrastFailures} | ${c.reflowOverflow === null ? "-" : c.reflowOverflow ? "yes" : "no"} |`);
    }
  }
  const md = [
    `# Capture summary (areas ${[...areas].join(",")})`,
    "",
    `Output: ${out}. Generated ${summary.generatedAt} in ${summary.minutes} min${timedOut ? " (time budget hit)" : ""}.`,
    "",
    `Screens: ${summary.screens.reached} reached, ${summary.screens.notReached} not reached, ${summary.screens.shared} shared with another capture (of ${summary.screens.total}).`,
    "",
    `axe violations by impact (all variants): critical ${totals.critical}, serious ${totals.serious}, moderate ${totals.moderate}, minor ${totals.minor}, unknown ${totals.unknown}.`,
    "",
    "Top 5 screens by issues (see summary.json for the score definition):",
    ...ranked.slice(0, 5).map((r, i) => `${i + 1}. ${r.id} ${r.title}: ${r.issues}`),
    "",
    "## Per screen and variant",
    "",
    "axe columns: critical/serious/moderate/minor/unknown.",
    "",
    "| Screen | Viewport-scheme | axe | Small targets | Tab stops without focus | Contrast fails | Reflow overflow (phone) |",
    "|---|---|---|---|---|---|---|",
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

main().catch(async (err) => {
  console.error(err);
  process.exit(1);
});

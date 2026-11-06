import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * F085: the app's CSS uses the tokens in app-theme.css, never raw colours,
 * so both looks stay complete. A var() fallback is fine. The allowlist is
 * for colours that belong to something other than the app's chrome.
 */

const src = fileURLToPath(new URL("..", import.meta.url));

/** [file, selector text it appears in, why it stays a raw colour] */
const allowed: [string, string, string][] = [
  ["seo/seo.css", ".so-search", "the search result preview looks like Google's own result in both looks"],
  ["templates/templates.css", ".tp-thumb iframe", "paper behind a site preview while it loads"],
  ["templates/templates.css", ".tp-frame", "paper behind a site preview while it loads"],
  ["templates/templates.css", ".tp-shot", "paper behind a site picture"],
  ["settings/settings.css", ".st-preview-stage", "paper behind the site preview"],
  ["sections/sections.css", ".sx-focus-dot", "a white ring with a dark edge, drawn over a photo, so it shows on any picture"],
  ["media/media.css", ".mp-dot", "a white ring with a dark edge, drawn over a photo, so it shows on any picture"],
  ["responsive/responsive.css", "[data-hidden]", "faint stripes drawn over the site's own blocks in the canvas"],
];

function cssFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return cssFiles(path);
    return name.endsWith(".css") ? [path] : [];
  });
}

const COLOUR = /#[0-9a-f]{3,8}\b|\brgba?\(|\bhsla?\(/gi;

/** Raw colours in a stylesheet, with the selector each sits under (comments and var() fallbacks removed). */
function rawColours(css: string): { selector: string; colour: string }[] {
  const text = css.replace(/\/\*[\s\S]*?\*\//g, "").replace(/var\(--[\w-]+,[^()]*(\([^()]*\))?[^()]*\)/g, "var()");
  const found: { selector: string; colour: string }[] = [];
  for (const rule of text.matchAll(/([^{}]*)\{([^{}]*)\}/g)) {
    for (const m of rule[2]!.matchAll(COLOUR)) found.push({ selector: rule[1]!.trim(), colour: m[0] });
  }
  return found;
}

describe("app-theme guard", () => {
  const files = cssFiles(src).filter((f) => !f.includes(`${join("app-theme", "app-theme.css")}`));

  it("finds the app's stylesheets", () => {
    expect(files.length).toBeGreaterThan(20);
  });

  it("app CSS has no raw colours outside app-theme.css (except the listed site-side ones)", () => {
    const problems: string[] = [];
    for (const file of files) {
      const rel = relative(src, file).split("\\").join("/");
      for (const { selector, colour } of rawColours(readFileSync(file, "utf8"))) {
        const ok = allowed.some(([f, sel]) => f === rel && selector.includes(sel));
        if (!ok) problems.push(`${rel}: ${colour} in "${selector.slice(0, 80)}"`);
      }
    }
    expect(problems).toEqual([]);
  });

  it("every allowlist entry is still needed", () => {
    for (const [file, sel] of allowed) {
      const found = rawColours(readFileSync(join(src, file), "utf8")).some((c) => c.selector.includes(sel));
      expect(found, `${file} ${sel}`).toBe(true);
    }
  });

  it("main.tsx loads the token sheet and Puck's styles without the Inter download", () => {
    const main = readFileSync(join(src, "main.tsx"), "utf8");
    expect(main).toContain('import "./app-theme/app-theme.css"');
    expect(main).toContain("@puckeditor/core/no-external.css");
    expect(main).not.toContain("@puckeditor/core/puck.css");
  });
});

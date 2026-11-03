/**
 * F064: live demos. Each template is published under /demos/<id>/ in the
 * store with a slim "Get this template" bar.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CHECK_BASE_URL, unpackTemplate } from "../../packages/render/src/template-check";
import { readSiteContent, renderSite } from "../../packages/render/src/site";
import { demoBar, demoFiles, demoPage, demoPath, demoUrl, moveAddress, moveAddresses } from "./demos";
import { loadStore, ROOT, storeContentFiles } from "./load";
import { STORE_URL } from "./model";

const { templates } = loadStore();
const css = readFileSync(join(ROOT, "packages/blocks/src/styles.css"), "utf8");
const info = { id: "harbour", name: "Harbour", price: "Free" };

/** A template published the way demos-build.ts does (without the Rust step). */
async function published(id: string) {
  const t = templates.find((x) => x.item.id === id)!;
  const files = unpackTemplate(t.template);
  const text = (p: string) => {
    const v = files.get(p);
    return typeof v === "string" ? v : null;
  };
  const content = await readSiteContent({
    read: async (p) => text(p),
    list: async (sub) => [...files.keys()].filter((k) => k.startsWith(`${sub}/`) && !k.slice(sub.length + 1).includes("/")).map((k) => k.slice(sub.length + 1)),
  });
  return { t, site: new Map(renderSite(content, css, { baseUrl: CHECK_BASE_URL }).map((f) => [f.path, f.content as string | Uint8Array])) };
}

describe("moving addresses into the demo's folder", () => {
  it("moves addresses that start at the site's root", () => {
    expect(moveAddress("/about", "/demos/harbour")).toBe("/demos/harbour/about");
    expect(moveAddress("/", "/demos/harbour")).toBe("/demos/harbour/");
  });
  it("leaves other addresses alone", () => {
    for (const a of ["//cdn.example.com/x.js", "https://example.com/", "mailto:a@b.co", "#top", "about", "tel:+123"]) expect(moveAddress(a, "/demos/harbour")).toBe(a);
  });
  it("moves links, photos, forms, srcset lists and font files", () => {
    const html = `<a href="/about">A</a><img src="/media/a.jpg" srcSet="/media/a-480w.jpg 480w, /media/a.jpg 960w"><form action="/search/"><a href="https://x.co/">X</a><a href="#c">C</a>`;
    const out = moveAddresses(html.replace("srcSet", "srcset"), "/demos/harbour");
    expect(out).toContain('href="/demos/harbour/about"');
    expect(out).toContain('src="/demos/harbour/media/a.jpg"');
    expect(out).toContain('srcset="/demos/harbour/media/a-480w.jpg 480w, /demos/harbour/media/a.jpg 960w"');
    expect(out).toContain('action="/demos/harbour/search/"');
    expect(out).toContain('href="https://x.co/"');
    expect(out).toContain('href="#c"');
    expect(moveAddresses("@font-face{src:url(/fonts/a.woff2) format('woff2')}", "/demos/harbour")).toContain("url(/demos/harbour/fonts/a.woff2)");
  });
  it("points the search page at the demo's own index", () => {
    expect(moveAddresses('await import("/pagefind/pagefind.js")', "/demos/harbour")).toContain('import("/demos/harbour/pagefind/pagefind.js")');
  });
});

describe("the demo bar", () => {
  const bar = demoBar(info);
  it("is a named region with the store's template page behind both links", () => {
    expect(bar).toContain('role="region"');
    expect(bar).toContain('aria-label="About this demo"');
    expect(bar.match(/href="\/templates\/harbour\/"/g)).toHaveLength(2);
    expect(bar).toContain("Get this template");
    expect(bar).toContain("Back to store");
    expect(bar).toContain("Live demo of </span>");
    expect(bar).toContain("Harbour");
  });
  it("escapes the template's name", () => {
    expect(demoBar({ ...info, name: `<b>"Hi"</b>` })).not.toContain("<b>");
  });
});

describe("a demo page", () => {
  const html = `<!doctype html><html><head><title>Home</title><link rel="canonical" href="${CHECK_BASE_URL}/about"></head><body class="x">\n<a class="cr-skip" href="#content">Skip to content</a>\n<header><a href="/">Home</a></header><main id="content"></main></body></html>`;
  const out = demoPage(html, info, CHECK_BASE_URL);
  it("keeps search engines out and names its own address", () => {
    expect(out).toContain('<meta name="robots" content="noindex">');
    expect(out).toContain(`href="${demoUrl("harbour")}/about"`);
    expect(out).not.toContain(CHECK_BASE_URL);
  });
  it("puts the bar after the skip link, so the skip link stays first", () => {
    expect(out.indexOf("class=\"cr-skip\"")).toBeLessThan(out.indexOf("class=\"crust-demo-bar\""));
    expect(out.indexOf("class=\"crust-demo-bar\"")).toBeLessThan(out.indexOf("<header"));
  });
  it("leaves room for the bar and keeps the bar's links pointing at the store", () => {
    expect(out).toContain("scroll-padding-bottom");
    expect(out).toContain('class="crust-demo-get" href="/templates/harbour/"');
    expect(out).toContain('href="/demos/harbour/"');
  });
});

describe("every listed template as a demo", () => {
  for (const { item } of templates) {
    it(`${item.id}: every address starts inside its folder, and it has the bar`, async () => {
      const { t, site } = await published(item.id);
      const files = demoFiles(site, { id: item.id, name: t.template.name, price: item.price }, CHECK_BASE_URL);
      const prefix = demoPath(item.id);
      expect(files.has("sitemap.xml")).toBe(false);
      expect(files.has("robots.txt")).toBe(false);
      expect(files.has("404.html")).toBe(false);
      expect(files.has("index.html")).toBe(true);
      const outside: string[] = [];
      for (const [path, body] of files) {
        if (typeof body !== "string") continue;
        if (path.endsWith(".html")) {
          expect(body, path).toContain("crust-demo-bar");
          expect(body, path).toContain('content="noindex"');
        }
        for (const m of body.matchAll(/\b(?:href|src|action)="(\/(?!\/)[^"]*)"|\burl\((\/(?!\/)[^)]*)\)/g)) {
          const a = m[1] ?? m[2]!;
          // The bar's own links go to the store.
          if (a.startsWith("/templates/")) continue;
          if (!a.startsWith(`${prefix}/`)) outside.push(`${path}: ${a}`);
        }
        for (const m of body.matchAll(/srcset="([^"]*)"/gi)) for (const part of m[1]!.split(",")) if (part.trim().startsWith("/") && !part.trim().startsWith(`${prefix}/`)) outside.push(`${path}: ${part.trim()}`);
        expect(body, path).not.toContain(CHECK_BASE_URL);
      }
      expect(outside).toEqual([]);
    });
  }
});

describe("the store points at its demos", () => {
  it("each template page has a Try the live demo button to its demo", () => {
    for (const { item } of templates) {
      const text = storeContentFiles(templates).get(`pages/templates-${item.id}.json`)!;
      expect(text, item.id).toContain("Try the live demo");
      expect(text, item.id).toContain(`"${demoPath(item.id)}/"`);
    }
  });
  it("demos are built when the store is published, here and in the workflow", () => {
    expect(readFileSync(join(ROOT, "package.json"), "utf8")).toContain("demos-build.ts dist/store");
    const workflow = readFileSync(join(ROOT, ".github/workflows/publish-store.yml"), "utf8");
    expect(workflow).toContain("scripts/store/demos-build.ts dist/store");
    expect(workflow).toContain(`${"$STORE_URL"}/demos/harbour/`);
  });
  it("the store's address is unchanged", () => {
    expect(demoUrl("harbour")).toBe(`${STORE_URL}/demos/harbour`);
  });
});

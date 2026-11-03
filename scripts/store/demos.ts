/**
 * F064: live demos. Each template in the store is published as a full site
 * under /demos/<id>/, with a slim "Get this template" bar at the bottom.
 *
 * A published site uses addresses from the site's root ("/about",
 * "/media/x.jpg"), so a copy under /demos/<id>/ needs each of them moved
 * (`moveAddresses`). The rest is `demoPage` (bar, no search engines) and
 * `demoFiles` (which files of the demo are kept). Nothing here touches the
 * disk; demos-build.ts does.
 */
import { STORE_URL } from "./model";

export const DEMOS_DIR = "demos";
export const demoPath = (id: string) => `/${DEMOS_DIR}/${id}`;
/** The demo's own public address, no trailing slash. */
export const demoUrl = (id: string, storeUrl = STORE_URL) => `${storeUrl}${demoPath(id)}`;

export interface DemoInfo {
  id: string;
  /** The template's name ("Harbour"). */
  name: string;
  /** "Free" or a price ("US$49"). */
  price: string;
}

/** Where "Get this template" and "Back to store" go: the template's page in the store. */
export const demoStorePage = (id: string) => `/templates/${id}/`;

/** Moves one address from the site's root into the demo's folder; any other address stays as it is. */
export const moveAddress = (address: string, prefix: string) => (address.startsWith("/") && !address.startsWith("//") ? `${prefix}${address}` : address);

/** Every address from the site's root in a page, stylesheet or script, moved into the demo's folder. */
export function moveAddresses(text: string, prefix: string): string {
  const one = (a: string) => moveAddress(a, prefix);
  return (
    text
      // href="/x", src="/x", action="/x", poster="/x"
      .replace(/\b(href|src|action|poster)=(["'])(\/(?!\/)[^"']*)\2/gi, (_m, attr: string, q: string, a: string) => `${attr}=${q}${one(a)}${q}`)
      // srcset="/a.jpg 480w, /b.jpg 960w" (React writes srcSet)
      .replace(/\bsrcset=(["'])([^"']*)\1/gi, (_m, q: string, list: string) => `srcset=${q}${list.split(",").map((part) => part.replace(/^(\s*)(\/(?!\/)\S*)/, (_x, sp: string, a: string) => sp + one(a))).join(",")}${q}`)
      // url(/fonts/x.woff2)
      .replace(/\burl\(\s*(["']?)(\/(?!\/)[^)"']*)\1\s*\)/g, (_m, q: string, a: string) => `url(${q}${one(a)}${q})`)
      // The search page loads its index from the site's root.
      .replace(/(["'`])\/pagefind\//g, (_m, q: string) => `${q}${prefix}/pagefind/`)
  );
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * The bar's CSS. Everything is under .crust-demo-bar and sets its own colours
 * and sizes, so it can't change the template. Fixed to the bottom so it never
 * meets the template's own header.
 */
export const DEMO_BAR_CSS = `
.crust-demo-bar,.crust-demo-bar *{box-sizing:border-box;margin:0;padding:0;border:0;font:inherit;letter-spacing:normal;text-transform:none;text-shadow:none;animation:none;transition:none}
.crust-demo-bar{position:fixed;left:0;right:0;bottom:0;z-index:2147483000;display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:48px;padding:6px 16px;background:#15171c;color:#fff;font:500 14px/1.3 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;box-shadow:0 -1px 0 rgba(255,255,255,.12)}
.crust-demo-bar p{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#fff}
.crust-demo-bar .crust-demo-dim{color:#c9ced8}
.crust-demo-bar .crust-demo-short{display:none}
.crust-demo-bar nav{display:flex;align-items:center;gap:8px;flex:none}
.crust-demo-bar a{display:inline-flex;align-items:center;justify-content:center;min-height:36px;padding:0 14px;border-radius:999px;color:#fff;text-decoration:none;white-space:nowrap}
.crust-demo-bar a.crust-demo-back{text-decoration:underline;text-underline-offset:3px}
.crust-demo-bar a.crust-demo-get{background:#fff;color:#15171c;font-weight:700}
.crust-demo-bar a:hover{background:#2b2f38}
.crust-demo-bar a.crust-demo-get:hover{background:#e6e9ef}
.crust-demo-bar a:focus-visible{outline:3px solid #8ab4ff;outline-offset:2px}
html{scroll-padding-bottom:64px}
body{padding-bottom:48px}
@media (max-width:520px){.crust-demo-bar{padding:6px 10px;gap:8px}.crust-demo-bar .crust-demo-long{display:none}.crust-demo-bar .crust-demo-short{display:inline}.crust-demo-bar a{padding:0 12px}}
@media (forced-colors:active){.crust-demo-bar{border-top:1px solid CanvasText}}
`.replace(/\n/g, "");

/** The bar as HTML: a named region, so screen readers can find it and skip it. */
export function demoBar({ id, name, price }: DemoInfo): string {
  const store = demoStorePage(id);
  return (
    `<div class="crust-demo-bar" role="region" aria-label="About this demo">` +
    `<p><span class="crust-demo-long">Live demo of </span><span class="crust-demo-short">Demo: </span>${esc(name)} <span class="crust-demo-long crust-demo-dim">· ${esc(price)}</span></p>` +
    `<nav aria-label="Demo links"><a class="crust-demo-back" href="${store}">Back to store</a><a class="crust-demo-get" href="${store}">Get this template</a></nav>` +
    `</div>`
  );
}

/**
 * One published page of a demo: addresses moved into the demo's folder, the
 * address search engines see set to the demo's, "noindex" so demos don't
 * compete with the store's own pages, and the bar added after the skip link.
 * `checkBase` is the address the template was rendered with.
 */
export function demoPage(html: string, info: DemoInfo, checkBase: string): string {
  let out = moveAddresses(html, demoPath(info.id)).split(checkBase).join(demoUrl(info.id));
  // The bar's links go to the store, so it's added after the demo's addresses are moved.
  out = out.replace("</head>", `<meta name="robots" content="noindex">\n<style>${DEMO_BAR_CSS}</style>\n</head>`);
  const bar = demoBar(info);
  const skip = /<a class="cr-skip"[^>]*>[^<]*<\/a>/.exec(out);
  return skip ? out.slice(0, skip.index + skip[0].length) + bar + out.slice(skip.index + skip[0].length) : out.replace(/<body[^>]*>/, (m) => m + bar);
}

/** Files the store speaks for itself: a demo has no address list, robots file or 404 page of its own. */
export const demoSkips = (path: string) => ["sitemap.xml", "robots.txt", "404.html"].includes(path);

/** A demo's files (path → text or bytes) ready to sit in dist/store/demos/<id>/. */
export function demoFiles(site: Map<string, string | Uint8Array>, info: DemoInfo, checkBase: string): Map<string, string | Uint8Array> {
  const out = new Map<string, string | Uint8Array>();
  for (const [path, body] of site) {
    if (demoSkips(path)) continue;
    if (typeof body !== "string" || path.startsWith("pagefind/")) out.set(path, body);
    else if (path.endsWith(".html")) out.set(path, demoPage(body, info, checkBase));
    else if (/\.(css|js|mjs|xml)$/i.test(path)) out.set(path, moveAddresses(body, demoPath(info.id)).split(checkBase).join(demoUrl(info.id)));
    else out.set(path, body);
  }
  return out;
}

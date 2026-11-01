/**
 * Site search (F039): the /search/ page. Pagefind builds the index at
 * publish time (it reads every page's <main data-pagefind-body>); this
 * page asks it in the visitor's browser. The form also works as a plain
 * link target: /search/?q=bread.
 */
import type { Site } from "@crust/blocks";
import { renderDocument, type RenderOptions } from "./render";

export const SEARCH_PATH = "/search";

/** Runs in the visitor's browser; plain JavaScript, no framework. */
const script = `
const q = (new URLSearchParams(location.search).get("q") || "").trim();
const input = document.getElementById("cr-search-q");
const status = document.getElementById("cr-search-status");
const list = document.getElementById("cr-search-results");
input.value = q;
if (q) {
  document.title = "Search: " + q + " | " + document.title.split(" | ").pop();
  status.textContent = "Searching…";
  try {
    const pagefind = await import("/pagefind/pagefind.js");
    const found = await pagefind.search(q);
    const items = await Promise.all(found.results.slice(0, 20).map((r) => r.data()));
    list.replaceChildren(...items.map((d) => {
      const li = document.createElement("li");
      const h = document.createElement("h2");
      h.className = "cr-heading cr-h4";
      const a = document.createElement("a");
      a.href = d.url;
      a.textContent = (d.meta && d.meta.title) || d.url;
      h.append(a);
      const p = document.createElement("p");
      // Pagefind escapes page text; only its <mark> highlights are kept.
      p.innerHTML = (d.excerpt || "").replace(/<(?!\\/?mark>)[^>]*>/g, "");
      li.append(h, p);
      return li;
    }));
    const n = found.results.length;
    status.textContent = n ? n + (n === 1 ? " result" : " results") + " for “" + q + "”" + (n > 20 ? ", showing the first 20." : ".") : "No results for “" + q + "”. Try another word.";
    // F069: the page reloaded with focus at the top; take keyboard and screen-reader users to the count.
    status.focus();
  } catch {
    status.textContent = "Search isn't available right now. Please use the menu.";
  }
}
`;

export function renderSearchPage(site: Site, baseCss: string, options: RenderOptions = {}): string {
  const body = `<section class="cr-section cr-style-background cr-search"><div class="cr-container">
<h1 class="cr-heading cr-h1">Search</h1>
<form class="cr-search-form" role="search" action="/search/" method="get">
<label for="cr-search-q">Search this site</label>
<div class="cr-search-row"><input id="cr-search-q" name="q" type="search" autocomplete="off" spellcheck="false" enterkeyhint="search"><button class="cr-button cr-button-primary" type="submit">Search</button></div>
</form>
<p id="cr-search-status" class="cr-search-status" role="status" aria-live="polite" tabindex="-1"></p>
<ol id="cr-search-results" class="cr-search-results"></ol>
<noscript><p>Search needs JavaScript. Please use the menu to find pages.</p></noscript>
</div></section>
<script type="module">${script}</script>`;
  // The search page itself is never a search result, in Google or on the site.
  return renderDocument(site, { path: SEARCH_PATH, title: "Search", description: `Search ${site.name}.`, body, share: { noindex: true }, searchable: false }, baseCss, options);
}

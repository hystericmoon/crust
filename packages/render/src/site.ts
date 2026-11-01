/**
 * The whole site, rendered (F056). One function used by both ways of
 * publishing, so they make the same pages:
 * - the GitHub publish pipeline (cli.ts reads content/ from disk), and
 * - the desktop app (reads the site folder through its content store).
 *
 * Reading goes through a small `ContentSource`, so this file has no Node
 * or browser parts and runs in either.
 */
import {
  isBlogPath,
  parseBlog,
  parseLinkedSection,
  parseMediaIndex,
  parsePost,
  type BlogSettings,
  type LinkedSectionFile,
  type MediaItem,
  type Page,
  type Post,
  type Site,
} from "@crust/blocks";
import { renderBlogIndex, renderPost, rssFeed } from "./blog";
import { outputFileFor, renderNotFound, renderPage, type RenderOptions } from "./render";
import { renderSearchPage } from "./search";

/** Reads the content folder. Paths are relative to it: "site.json", "pages/about.json". */
export interface ContentSource {
  /** A file's text, or null when it isn't there. */
  read(path: string): Promise<string | null>;
  /** Names of the files in a folder ("pages"), any order; empty when there's no such folder. */
  list(dir: string): Promise<string[]>;
}

/** Everything that goes into the published site. */
export interface SiteContent {
  site: Site;
  /** Pages with the name of their file, for messages. */
  pages: { file: string; page: Page }[];
  posts: Post[];
  blog: BlogSettings;
  media: MediaItem[];
  linkedSections: Map<string, LinkedSectionFile>;
}

/** One finished file: where it goes in the site, and its text. */
export interface RenderedFile {
  path: string;
  content: string;
}

const jsonFiles = async (source: ContentSource, dir: string) => (await source.list(dir)).filter((f) => f.endsWith(".json")).sort();

/** Reads the site's content. Damaged files stop it with a message saying which one. */
export async function readSiteContent(source: ContentSource): Promise<SiteContent> {
  const siteText = await source.read("site.json");
  if (siteText === null) throw new Error("The site's settings (site.json) are missing.");
  const site = JSON.parse(siteText) as Site;
  const pages: SiteContent["pages"] = [];
  for (const file of await jsonFiles(source, "pages")) {
    const text = await source.read(`pages/${file}`);
    if (text !== null) pages.push({ file, page: JSON.parse(text) as Page });
  }
  // F035: posts and the blog's settings.
  const posts: Post[] = [];
  for (const file of await jsonFiles(source, "posts")) {
    const post = parsePost(await source.read(`posts/${file}`));
    if (!post || `${post.slug}.json` !== file) throw new Error(`The post file ${file} is damaged or misnamed. Open it in the builder and save it again.`);
    posts.push(post);
  }
  const blog = parseBlog(await source.read("blog.json"));
  // F034: uploaded photos get srcset; crust-publish makes the resized copies.
  const media = parseMediaIndex(await source.read("media.json"));
  // F043: linked sections, built into every page that uses them.
  const linkedSections = new Map<string, LinkedSectionFile>();
  for (const file of await jsonFiles(source, "sections")) {
    const id = file.replace(/\.json$/, "");
    const section = parseLinkedSection(await source.read(`sections/${file}`), id);
    if (!section) throw new Error(`content/sections/${file} isn't a linked section Crust can read.`);
    linkedSections.set(id, section);
  }
  return { site, pages, posts, blog, media, linkedSections };
}

export interface RenderSiteOptions {
  /** The site's public address; site.json's baseUrl when not given. */
  baseUrl?: string;
  /** Where contact forms send messages (F037); forms show but don't send without it. */
  forms?: RenderOptions["forms"];
}

/**
 * Renders every page, post, the blog list and feed, the search page and the
 * 404 page. Throws, naming the page, when two pages share an address or a
 * page uses an address that belongs to the blog or search.
 */
export function renderSite(content: SiteContent, baseCss: string, opts: RenderSiteOptions = {}): RenderedFile[] {
  const { site, pages, posts, blog, media, linkedSections } = content;
  const baseUrl = opts.baseUrl || site.baseUrl;
  // Sites saved before F031 have no menu yet: it's made from these pages.
  const options: RenderOptions = { pages: pages.map(({ page }) => ({ path: page.path, title: page.title })), media, baseUrl, forms: opts.forms, linkedSections };
  const files: RenderedFile[] = [];
  const seen = new Map<string, string>();
  for (const { file, page } of pages) {
    if (page.path === "/search" || page.path.startsWith("/search/")) throw new Error(`Page ${file} uses the address ${page.path}, which belongs to site search. Rename the page.`);
    if (isBlogPath(page.path)) throw new Error(`Page ${file} uses the address ${page.path}, which belongs to your blog. Rename the page.`);
    const target = outputFileFor(page.path);
    const previous = seen.get(target);
    if (previous) throw new Error(`Pages ${previous} and ${file} both use the URL "${page.path}".`);
    seen.set(target, file);
    files.push({ path: target, content: renderPage(site, page, baseCss, options) });
  }
  // F035: posts, the blog's list page and its feed (only when there are posts).
  if (posts.length) {
    files.push({ path: "blog/index.html", content: renderBlogIndex(site, posts, blog, baseCss, options) });
    files.push({ path: "blog/feed.xml", content: rssFeed(site, posts, blog, baseUrl) });
    for (const post of posts) files.push({ path: `blog/${post.slug}/index.html`, content: renderPost(site, post, blog, baseCss, options) });
  }
  // F039: the site search page; the search index is built after crust-publish.
  files.push({ path: "search/index.html", content: renderSearchPage(site, baseCss, options) });
  files.push({ path: "404.html", content: renderNotFound(site, baseCss, options) });
  return files;
}

/**
 * Blog pages (F035): each post at /blog/<slug>/, the list at /blog/, and an
 * RSS feed at /blog/feed.xml. Same page shell as every other page.
 */
import { BLOG_PATH, BlogListView, PostHeaderView, postPath, sortPosts, type BlogSettings, type Post, type Site } from "@crust/blocks";
import { renderToStaticMarkup } from "react-dom/server";
import { escapeHtml, formsFor, renderBody, renderDocument, turnstileTag, withMedia, type RenderOptions } from "./render";

const FEED = `${BLOG_PATH}/feed.xml`;

/** Lets feed readers find the feed from any blog page. */
const feedLink = (site: Site, blog: BlogSettings) =>
  `<link rel="alternate" type="application/rss+xml" title="${escapeHtml(`${blog.title} | ${site.name}`)}" href="${FEED}">\n`;

export function renderPost(site: Site, post: Post, blog: BlogSettings, baseCss: string, options: RenderOptions = {}): string {
  const top = renderToStaticMarkup(withMedia(<PostHeaderView post={post} blog={blog} language={site.language} />, options.media));
  const body = `<article class="cr-post">${top}${renderBody(post.puck, options.media, formsFor(options, postPath(post.slug)))}</article>`;
  // F036: a shared post shows its cover.
  const share = { image: post.cover || undefined, imageAlt: post.coverAlt, type: "article" as const };
  return renderDocument(site, { path: postPath(post.slug), title: post.title, description: post.description || post.title, body, head: feedLink(site, blog) + turnstileTag(options, post.puck), share }, baseCss, options);
}

export function renderBlogIndex(site: Site, posts: Post[], blog: BlogSettings, baseCss: string, options: RenderOptions = {}): string {
  const body = renderToStaticMarkup(withMedia(<BlogListView posts={sortPosts(posts)} blog={blog} language={site.language} />, options.media));
  const description = blog.intro || `${blog.title} from ${site.name}`;
  return renderDocument(site, { path: BLOG_PATH, title: blog.title, description, body, head: feedLink(site, blog) }, baseCss, options);
}

const xml = (s: string) => escapeHtml(s).replace(/'/g, "&apos;");

/** RSS 2.0, newest 20 posts. `baseUrl` is the site's public address. */
export function rssFeed(site: Site, posts: Post[], blog: BlogSettings, baseUrl: string): string {
  const base = baseUrl.replace(/\/+$/, "");
  const items = sortPosts(posts)
    .slice(0, 20)
    .map((p) => {
      const url = `${base}${postPath(p.slug)}/`;
      const date = new Date(`${p.date}T00:00:00Z`).toUTCString();
      return `<item><title>${xml(p.title)}</title><link>${xml(url)}</link><guid isPermaLink="true">${xml(url)}</guid><pubDate>${date}</pubDate>${p.description ? `<description>${xml(p.description)}</description>` : ""}</item>`;
    });
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
<title>${xml(`${blog.title} | ${site.name}`)}</title>
<link>${xml(`${base}${BLOG_PATH}/`)}</link>
<atom:link href="${xml(`${base}${FEED}`)}" rel="self" type="application/rss+xml"/>
<description>${xml(blog.intro || `${blog.title} from ${site.name}`)}</description>
<language>${xml(site.language)}</language>
${items.join("\n")}
</channel>
</rss>
`;
}

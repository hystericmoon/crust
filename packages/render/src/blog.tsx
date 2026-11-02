/**
 * Blog pages (F035): each post at /blog/<slug>/, the list at /blog/, and an
 * RSS feed at /blog/feed.xml. Same page shell as every other page.
 */
import { BLOG_PATH, BlogListView, PostHeaderView, heroStyle, postPath, sortPosts, type BlogSettings, type DesignPost, type Page, type Post, type Site } from "@crust/blocks";
import { renderToStaticMarkup } from "react-dom/server";
import { escapeHtml, formsFor, renderBody, renderDesignBody, renderDocument, turnstileTag, videoTag, withLinkedSections, withMedia, type RenderOptions } from "./render";

const FEED = `${BLOG_PATH}/feed.xml`;

/** Lets feed readers find the feed from any blog page. */
const feedLink = (site: Site, blog: BlogSettings) =>
  `<link rel="alternate" type="application/rss+xml" title="${escapeHtml(`${blog.title} | ${site.name}`)}" href="${FEED}">\n`;

/** What the self-filling blocks need of a post (F082): everything but its blocks. */
export const designPost = ({ slug, title, description, date, cover, coverAlt }: Post): DesignPost => ({ slug, title, description, date, cover, coverAlt });

/** The other posts, for a Post list in a design (F082); `posts` may be given in the options. */
export interface BlogRenderOptions extends RenderOptions {
  /** Every post, so a Post list in the post design can show "more posts". */
  posts?: Post[];
}

export function renderPost(site: Site, input: Post, blog: BlogSettings, baseCss: string, options: BlogRenderOptions = {}): string {
  const post = { ...input, puck: withLinkedSections(input.puck, options, `Post ${postPath(input.slug)}`) };
  const design = options.designs?.post;
  if (design) return renderDesignedPost(site, post, blog, baseCss, options, design.content);
  const top = renderToStaticMarkup(withMedia(<PostHeaderView post={post} blog={blog} language={site.language} />, options.media));
  const body = `<article class="cr-post">${top}${renderBody(post.puck, options.media, formsFor(options, postPath(post.slug)))}</article>`;
  // F036: a shared post shows its cover.
  const share = { image: post.cover || undefined, imageAlt: post.coverAlt, type: "article" as const };
  return renderDocument(site, { path: postPath(post.slug), title: post.title, description: post.description || post.title, body, head: feedLink(site, blog) + turnstileTag(options, post.puck) + videoTag(post.puck), share }, baseCss, options);
}

/** F082: the post inside the owner's post page design. */
function renderDesignedPost(site: Site, post: Post, blog: BlogSettings, baseCss: string, options: BlogRenderOptions, content: Page["puck"]["content"]): string {
  const design = withLinkedSections({ root: { props: {} }, content } as Page["puck"], options, "The post page design");
  const data = { post: designPost(post), posts: sortPosts(options.posts ?? []).map(designPost), blog, language: site.language };
  const body = `<article class="cr-post">${renderDesignBody(design, data, post.puck, options.media, formsFor(options, postPath(post.slug)))}</article>`;
  // Scripts and the header follow both: the design's blocks and the post's own.
  const both = { root: { props: {} }, content: [...design.content, ...post.puck.content] } as Page["puck"];
  const first = design.content[0];
  // A "Cover with title" first is a hero photo for the header's "Clear on a hero photo" (F076).
  const hero = first?.type === "PostHero" && post.cover.trim() ? "dark" : (heroStyle(design.content) ?? undefined);
  const share = { image: post.cover || undefined, imageAlt: post.coverAlt, type: "article" as const };
  return renderDocument(
    site,
    { path: postPath(post.slug), title: post.title, description: post.description || post.title, body, head: feedLink(site, blog) + turnstileTag(options, both) + videoTag(both), hero, share },
    baseCss,
    options,
  );
}

export function renderBlogIndex(site: Site, posts: Post[], blog: BlogSettings, baseCss: string, options: RenderOptions = {}): string {
  const designed = options.designs?.blog;
  if (designed) {
    const design = withLinkedSections({ root: { props: {} }, content: designed.content } as Page["puck"], options, "The blog page design");
    const data = { posts: sortPosts(posts).map(designPost), blog, language: site.language };
    const description = blog.intro || `${blog.title} from ${site.name}`;
    const body = renderDesignBody(design, data, null, options.media, formsFor(options, BLOG_PATH));
    return renderDocument(
      site,
      { path: BLOG_PATH, title: blog.title, description, body, head: feedLink(site, blog) + turnstileTag(options, design) + videoTag(design), hero: heroStyle(design.content) ?? undefined, searchable: false },
      baseCss,
      options,
    );
  }
  const body = renderToStaticMarkup(withMedia(<BlogListView posts={sortPosts(posts)} blog={blog} language={site.language} />, options.media));
  const description = blog.intro || `${blog.title} from ${site.name}`;
  // The list repeats the posts' summaries; site search finds the posts themselves (F039).
  return renderDocument(site, { path: BLOG_PATH, title: blog.title, description, body, head: feedLink(site, blog), searchable: false }, baseCss, options);
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

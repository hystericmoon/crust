/**
 * Blog posts (F035): content/posts/<slug>.json, published at /blog/<slug>/,
 * with a list page at /blog/ and an RSS feed at /blog/feed.xml. The list
 * page's title and intro live in content/blog.json.
 *
 * Deep-importable (no React) so the server functions can use it.
 */
import type { Data } from "@puckeditor/core";

/** content/posts/<slug>.json */
export interface Post {
  /** Also the file name and the address (/blog/<slug>/). */
  slug: string;
  title: string;
  /** Summary: shown on the list page, in search results and in the feed. */
  description: string;
  /** "2026-10-30" */
  date: string;
  /** Cover photo address (optional, "" for none) and its alt text. */
  cover: string;
  coverAlt: string;
  /** The post's body, built from blocks like a page. */
  puck: Data;
}

/** content/blog.json */
export interface BlogSettings {
  title: string;
  intro: string;
}

export const POSTS_FOLDER = "content/posts";
export const BLOG_FILE = "content/blog.json";
export const BLOG_PATH = "/blog";
export const defaultBlog: BlogSettings = { title: "Blog", intro: "" };

export const postLimits = { title: 120, description: 300, slug: 60, blogTitle: 60, intro: 300 };

const SLUG = /^[a-z0-9][a-z0-9-]{0,59}$/;
export const isValidSlug = (slug: unknown): slug is string => typeof slug === "string" && SLUG.test(slug) && !slug.endsWith("-") && slug !== "feed";
export const postFileFor = (slug: string) => `${POSTS_FOLDER}/${slug}.json`;
export const postPath = (slug: string) => `${BLOG_PATH}/${slug}`;
export const slugForFile = (file: string): string | null => {
  const m = file.match(/^content\/posts\/([^/]+)\.json$/);
  return m && isValidSlug(m[1]) ? m[1]! : null;
};

/** Pages can't live at /blog or below it: that's where posts are published. */
export const isBlogPath = (path: string) => path === BLOG_PATH || path.startsWith(`${BLOG_PATH}/`);

/** "My first post!" → "my-first-post", free among `taken` ("my-first-post-2"). */
export function slugFor(title: string, taken: Iterable<string>): string {
  const base =
    title
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 50)
      .replace(/-+$/, "") || "post";
  const used = new Set(taken);
  const free = (s: string) => !used.has(s) && isValidSlug(s);
  if (free(base)) return base;
  let n = 2;
  while (!free(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

/** A real calendar date written as YYYY-MM-DD. */
export function isValidDate(date: unknown): date is string {
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const d = new Date(`${date}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === date;
}

/** Today's date in this computer's time zone, as YYYY-MM-DD. */
export function today(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** Newest first; same day: by title. */
export const sortPosts = <T extends Pick<Post, "date" | "title">>(posts: T[]): T[] =>
  [...posts].sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title));

/** "30 October 2026" in the site's language. */
export function formatPostDate(date: string, language = "en"): string {
  if (!isValidDate(date)) return date;
  try {
    return new Intl.DateTimeFormat(language, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
  } catch {
    return date;
  }
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** Problems with a post, in the owner's words. Empty when it can be saved. */
export function checkPost(post: unknown): string[] {
  if (!isObject(post)) return ["The post is missing."];
  const problems: string[] = [];
  if (!isValidSlug(post.slug)) problems.push("The post address must use lowercase letters, numbers and dashes.");
  if (typeof post.title !== "string" || !post.title.trim()) problems.push("The post needs a title.");
  else if (post.title.length > postLimits.title) problems.push(`The post title is longer than ${postLimits.title} characters.`);
  if (typeof post.description !== "string") problems.push("The post summary is missing.");
  else if (post.description.length > postLimits.description) problems.push(`The post summary is longer than ${postLimits.description} characters.`);
  if (!isValidDate(post.date)) problems.push("The post date must be a real date.");
  if (typeof post.cover !== "string" || typeof post.coverAlt !== "string") problems.push("The cover photo details are damaged.");
  else if (post.cover.trim() && !post.coverAlt.trim()) problems.push("The cover photo needs alt text.");
  const puck = post.puck;
  if (!isObject(puck) || !Array.isArray(puck.content) || !isObject(puck.root)) problems.push("The post's blocks are missing or damaged.");
  return problems;
}

/** Reads a post file; null when it isn't a usable post. Missing cover fields are filled in. */
export function parsePost(text: string | null | undefined): Post | null {
  if (!text) return null;
  try {
    const v = JSON.parse(text) as Record<string, unknown>;
    const post = { cover: "", coverAlt: "", ...v } as unknown as Post;
    return checkPost(post).length ? null : post;
  } catch {
    return null;
  }
}

export function checkBlog(blog: unknown): string[] {
  if (!isObject(blog)) return ["The blog settings are missing."];
  const problems: string[] = [];
  if (typeof blog.title !== "string" || !blog.title.trim()) problems.push("The blog page needs a title.");
  else if (blog.title.length > postLimits.blogTitle) problems.push(`The blog title is longer than ${postLimits.blogTitle} characters.`);
  if (typeof blog.intro !== "string") problems.push("The blog intro is missing.");
  else if (blog.intro.length > postLimits.intro) problems.push(`The blog intro is longer than ${postLimits.intro} characters.`);
  return problems;
}

export function parseBlog(text: string | null | undefined): BlogSettings {
  if (!text) return defaultBlog;
  try {
    const v = JSON.parse(text) as unknown;
    if (checkBlog(v).length) return defaultBlog;
    const b = v as BlogSettings;
    return { title: b.title.trim(), intro: b.intro.trim() };
  } catch {
    return defaultBlog;
  }
}

/** A new post: today's date and one Text block to start writing in. */
export function newPost(title: string, slug: string, date = today()): Post {
  return {
    slug,
    title: title.trim(),
    description: "",
    date,
    cover: "",
    coverAlt: "",
    puck: {
      root: { props: {} },
      content: [
        {
          type: "Section",
          props: {
            id: `Section-${slug}`,
            background: "background",
            paddingY: "md",
            height: "auto",
            valign: "top",
            imageSrc: "",
            tint: "medium",
            content: [{ type: "Text", props: { id: `Text-${slug}`, text: "Start writing here.", align: "left", tone: "default" } }],
          },
        },
      ],
    },
  };
}

/**
 * Where posts come from in the admin (F035), like pages (F007): GitHub once
 * saving is switched on, otherwise the posts bundled into the app, plus
 * drafts kept in this browser, which win until they're saved to GitHub.
 */
import { checkPost, defaultBlog, migrateRichTextBlocks, sortPosts, type BlogSettings, type Post } from "@crust/blocks";
import type { Data } from "@puckeditor/core";
import { getPost, listPosts, type PostSummary } from "../api-client";
import { desktopContent } from "../desktop/content";
import { templateBase } from "../templates/local-site";

const PREFIX = "crust:post:";

interface LocalPost {
  post: Post;
  updatedAt: string;
  savedToGitHub: boolean;
}

const built: Post[] = Object.values(import.meta.glob<Post>("../../../../content/posts/*.json", { eager: true, import: "default" }));
/** The posts built into the web admin, or the desktop app's site folder (F055). */
const bundled = (): Post[] => desktopContent()?.posts ?? built;
/** F048: after "Start from a template" without GitHub, the template's posts stand in for the bundled ones. */
export const bundledPosts = (): Post[] => templateBase()?.posts ?? bundled();

function read(slug: string): LocalPost | null {
  try {
    const raw = localStorage.getItem(PREFIX + slug);
    if (!raw) return null;
    const v = JSON.parse(raw) as LocalPost;
    return checkPost(v.post).length ? null : v;
  } catch {
    return null;
  }
}

export const getLocalPost = read;

/** Keeps a post in this browser; false if the browser wouldn't store it. */
export function saveLocalPost(post: Post, savedToGitHub: boolean): boolean {
  try {
    localStorage.setItem(PREFIX + post.slug, JSON.stringify({ post, updatedAt: new Date().toISOString(), savedToGitHub }));
    return true;
  } catch {
    return false;
  }
}

export function removeLocalPost(slug: string) {
  try {
    localStorage.removeItem(PREFIX + slug);
  } catch {
    // Nothing stored.
  }
}

export function localPosts(): LocalPost[] {
  const out: LocalPost[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith(PREFIX)) continue;
      const v = read(key.slice(PREFIX.length));
      if (v) out.push(v);
    }
  } catch {
    // Storage blocked: no local posts.
  }
  return out;
}

export interface PostRow extends PostSummary {
  /** Changes in this browser that aren't on GitHub yet. */
  localChanges: boolean;
  /** On GitHub (or bundled), not only in this browser. */
  inRepo: boolean;
}

/** GitHub (or bundled) posts with this browser's drafts on top, newest first. */
export function mergePostRows(repo: PostSummary[], local: LocalPost[]): PostRow[] {
  const rows = new Map<string, PostRow>(repo.map((p) => [p.slug, { ...p, localChanges: false, inRepo: true }]));
  for (const l of local) {
    if (l.savedToGitHub && rows.has(l.post.slug)) continue;
    const { puck: _puck, ...summary } = l.post;
    const existing = rows.get(l.post.slug);
    rows.set(l.post.slug, { ...summary, localChanges: !l.savedToGitHub, inRepo: !!existing });
  }
  return sortPosts([...rows.values()]);
}

export async function loadPostRows(githubOn: boolean): Promise<{ rows: PostRow[]; blog: BlogSettings; error?: string }> {
  const fromBundle = bundledPosts().map(({ puck: _puck, ...rest }) => rest);
  if (!githubOn) return { rows: mergePostRows(fromBundle, localPosts()), blog: templateBase()?.blog ?? defaultBlog };
  const res = await listPosts();
  if (res.ok) return { rows: mergePostRows(res.posts, localPosts()), blog: res.blog };
  return { rows: mergePostRows(fromBundle, localPosts()), blog: defaultBlog, error: `Couldn't load your posts from GitHub: ${res.error}` };
}

/** A browser draft that isn't on GitHub wins; then GitHub; then the bundled copy. */
export async function loadPost(slug: string, githubOn: boolean): Promise<Post | null> {
  const local = read(slug);
  if (local && !local.savedToGitHub) return local.post;
  if (githubOn) {
    const res = await getPost(slug);
    if (res.ok) return res.post;
  }
  return local?.post ?? bundledPosts().find((p) => p.slug === slug) ?? null;
}

/** The post's details live in Puck's root props while editing. */
export const toPuckData = (post: Post): Data =>
  ({
    root: { props: { title: post.title, description: post.description, date: post.date, cover: post.cover, coverAlt: post.coverAlt } },
    // F042: plain text in older Text blocks becomes rich text.
    content: migrateRichTextBlocks(post.puck.content),
  }) as Data;

export function fromPuckData(slug: string, data: Data): Post {
  const r = (data.root.props ?? {}) as Record<string, unknown>;
  const text = (v: unknown) => (typeof v === "string" ? v : "");
  return {
    slug,
    title: text(r.title),
    description: text(r.description),
    date: text(r.date),
    cover: text(r.cover),
    coverAlt: text(r.coverAlt),
    puck: { root: { props: {} }, content: data.content },
  };
}

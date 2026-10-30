/**
 * Blog posts (F035): content/posts/<slug>.json and the list page's title
 * and intro in content/blog.json, saved through the same GitHub token as
 * pages. Checked here, whatever the browser sent.
 */
import {
  BLOG_FILE,
  POSTS_FOLDER,
  checkBlog,
  checkPost,
  isValidSlug,
  parseBlog,
  parsePost,
  postFileFor,
  slugForFile,
  sortPosts,
  type BlogSettings,
  type Post,
} from "@crust/blocks/posts";
import { fail, gate, githubConfig, githubFailure, json, type Env } from "./api";
import { MAX_BYTES } from "./content";
import { commitFiles, listFolder, readFile } from "./github";

const serialize = (value: Post | BlogSettings) => `${JSON.stringify(value, null, 2)}\n`;

export type PostSummary = Omit<Post, "puck">;

/**
 * GET /api/posts: every post (newest first, without blocks) and the blog settings.
 * GET /api/posts?slug=x: one post.
 * POST { action: "save", post } | { action: "delete", slug } | { action: "blog", blog }
 */
export async function handlePosts(request: Request, env: Env, fetchFn: typeof fetch = fetch): Promise<Response> {
  const write = request.method === "POST";
  const user = await gate(request, env, fetchFn, write);
  if (user instanceof Response) return user;
  const cfg = githubConfig(env);

  try {
    if (!write) {
      const slug = new URL(request.url).searchParams.get("slug");
      if (slug !== null) {
        if (!isValidSlug(slug)) return fail(400, "That isn't a post address.");
        const post = parsePost(await readFile(cfg, postFileFor(slug), fetchFn));
        return post ? json(200, { ok: true, post }) : fail(404, "That post isn't on GitHub. It may have been deleted.");
      }
      const files = (await listFolder(cfg, POSTS_FOLDER, fetchFn)).filter((f) => slugForFile(f.path));
      const [posts, blogText] = await Promise.all([
        Promise.all(files.map(async (f) => parsePost(await readFile(cfg, f.path, fetchFn)))),
        readFile(cfg, BLOG_FILE, fetchFn),
      ]);
      const summaries: PostSummary[] = posts.filter((p): p is Post => p !== null).map(({ puck: _puck, ...rest }) => rest);
      return json(200, { ok: true, posts: sortPosts(summaries), blog: parseBlog(blogText) });
    }

    const text = await request.text();
    if (new TextEncoder().encode(text).length > MAX_BYTES) return fail(413, "This post is too large to save (over 512 KB).");
    let body: Record<string, unknown>;
    try {
      body = (JSON.parse(text) ?? {}) as Record<string, unknown>;
    } catch {
      return fail(400, "The data sent wasn't valid JSON.");
    }

    if (body.action === "save") {
      const problems = checkPost(body.post);
      if (problems.length) return fail(422, `Not saved. ${problems.join(" ")}`);
      const p = body.post as Post;
      // Only the known fields are written (the file format is a contract).
      const post: Post = { slug: p.slug, title: p.title.trim(), description: p.description.trim(), date: p.date, cover: p.cover.trim(), coverAlt: p.coverAlt.trim(), puck: p.puck };
      const result = await commitFiles(cfg, [{ path: postFileFor(post.slug), content: serialize(post) }], `Save post "${post.title}" from the builder\n\nSaved by ${user.email}`, fetchFn);
      return json(200, { ok: true, post, commit: result.commit });
    }

    if (body.action === "delete") {
      if (!isValidSlug(body.slug)) return fail(400, "That isn't a post address.");
      const current = parsePost(await readFile(cfg, postFileFor(body.slug), fetchFn));
      if (!current) return fail(404, "That post isn't on GitHub any more.");
      const result = await commitFiles(cfg, [{ path: postFileFor(body.slug), content: null }], `Delete post "${current.title}" from the builder\n\nDeleted by ${user.email}`, fetchFn);
      return json(200, { ok: true, commit: result.commit });
    }

    if (body.action === "blog") {
      const problems = checkBlog(body.blog);
      if (problems.length) return fail(422, `Not saved. ${problems.join(" ")}`);
      const b = body.blog as BlogSettings;
      const blog: BlogSettings = { title: b.title.trim(), intro: b.intro.trim() };
      const result = await commitFiles(cfg, [{ path: BLOG_FILE, content: serialize(blog) }], `Save blog settings from the builder\n\nSaved by ${user.email}`, fetchFn);
      return json(200, { ok: true, blog, commit: result.commit });
    }
    return fail(400, "Nothing to do.");
  } catch (e) {
    return githubFailure(e);
  }
}

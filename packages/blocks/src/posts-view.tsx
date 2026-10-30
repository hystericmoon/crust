/**
 * How posts look (F035), shared by the builder canvas and the publish
 * renderer: the top of a post (title, date, summary, cover) and the list
 * page at /blog/.
 */
import { Img } from "./media-img";
import { BLOG_PATH, formatPostDate, isValidDate, postPath, type BlogSettings, type Post } from "./posts";

type PostTop = Pick<Post, "title" | "description" | "date" | "cover" | "coverAlt">;

export function PostHeaderView({ post, blog, language }: { post: PostTop; blog: BlogSettings; language: string }) {
  const alt = post.coverAlt.trim();
  return (
    <header className="cr-section cr-style-background cr-post-head">
      <div className="cr-container cr-post-narrow">
        <p className="cr-post-meta">
          <a href={`${BLOG_PATH}/`}>{blog.title}</a>
          {isValidDate(post.date) ? (
            <>
              <span aria-hidden="true"> · </span>
              <time dateTime={post.date}>{formatPostDate(post.date, language)}</time>
            </>
          ) : null}
        </p>
        <h1 className="cr-heading cr-h1">{post.title}</h1>
        {post.description.trim() ? <p className="cr-post-summary">{post.description}</p> : null}
        {post.cover.trim() ? (
          // Missing alt is left out on purpose so the publish check can flag it.
          <Img className="cr-post-cover" src={post.cover} size="full" {...(alt ? { alt } : {})} decoding="async" />
        ) : null}
      </div>
    </header>
  );
}

export function BlogListView({ posts, blog, language }: { posts: (PostTop & Pick<Post, "slug">)[]; blog: BlogSettings; language: string }) {
  return (
    <section className="cr-section cr-style-background cr-blog">
      <div className="cr-container">
        <h1 className="cr-heading cr-h1">{blog.title}</h1>
        {blog.intro ? <p className="cr-post-summary">{blog.intro}</p> : null}
        {posts.length ? (
          <ul className="cr-post-list">
            {posts.map((p) => (
              <li key={p.slug} className="cr-post-item">
                <article>
                  {/* The title link names the post; the cover is a picture of it. */}
                  {p.cover.trim() ? <Img className="cr-post-thumb" src={p.cover} size="third" alt="" loading="lazy" decoding="async" /> : null}
                  <h2 className="cr-heading cr-h3">
                    <a href={`${postPath(p.slug)}/`}>{p.title}</a>
                  </h2>
                  {isValidDate(p.date) ? <time className="cr-post-date" dateTime={p.date}>{formatPostDate(p.date, language)}</time> : null}
                  {p.description.trim() ? <p>{p.description}</p> : null}
                </article>
              </li>
            ))}
          </ul>
        ) : (
          <p>No posts yet.</p>
        )}
      </div>
    </section>
  );
}

/**
 * Blocks that fill themselves in (F082), used in the post page, blog page
 * and "Page not found" designs (page-designs.ts). The renderer and the
 * builder pass the post (or the list of posts) in `PageDesignContext`.
 * Without it (the layout gallery's pictures, the builder before posts have
 * loaded), they show sample words while editing and nothing when published.
 */
import type { ComponentConfig } from "@puckeditor/core";
import { createContext, useContext, type ReactNode } from "react";
import { alignField, headingTag, type Align } from "./block-helpers";
import { Img } from "./media-img";
import { BLOG_PATH, defaultBlog, formatPostDate, isValidDate, postPath, type BlogSettings, type Post } from "./posts";

export type DesignPost = Pick<Post, "slug" | "title" | "description" | "date" | "cover" | "coverAlt">;

export interface PageDesignData {
  /** The post being shown (post design). */
  post?: DesignPost;
  /** Its own blocks, where "Post content" stands. */
  body?: ReactNode;
  /** Every post, newest first (Post list). */
  posts?: DesignPost[];
  blog: BlogSettings;
  language: string;
}

export const PageDesignContext = createContext<PageDesignData | null>(null);

const samplePost: DesignPost = {
  slug: "sample",
  title: "A post title, as long as a real one",
  description: "The post's summary: one or two sentences about what it says.",
  date: "2026-11-02",
  cover: "",
  coverAlt: "",
};
// The sample list doesn't leave out the sample post (different addresses).
const samplePosts: DesignPost[] = [
  { ...samplePost, slug: "sample-1" },
  { ...samplePost, slug: "sample-2", title: "Another post", date: "2026-10-20" },
  { ...samplePost, slug: "sample-3", title: "An older post", date: "2026-10-08" },
];

type Editing = { puck?: { isEditing?: boolean } };
/** The design data, or samples while editing; null when there's nothing to show. */
function useDesign(editing: boolean): PageDesignData | null {
  const data = useContext(PageDesignContext);
  if (data) return data;
  return editing ? { post: samplePost, posts: samplePosts, blog: defaultBlog, language: "en" } : null;
}
const isEditing = (p: Editing) => p.puck?.isEditing === true;
const alignOf = (a: unknown): Align => (a === "center" || a === "right" ? a : "left");

const sizeField = {
  type: "radio" as const,
  label: "Size",
  options: [
    { label: "Normal", value: "normal" },
    { label: "Large (display)", value: "display" },
  ],
};
const yesNo = (label: string) => ({
  type: "radio" as const,
  label,
  options: [
    { label: "Yes", value: "yes" },
    { label: "No", value: "no" },
  ],
});

// --- Post page -------------------------------------------------------------------------------

export type PostTitleProps = { size: "normal" | "display"; align: Align };
export const PostTitle: ComponentConfig<PostTitleProps> = {
  label: "Post title",
  fields: { size: sizeField, align: alignField },
  defaultProps: { size: "normal", align: "left" },
  render: (props) => {
    const d = useDesign(isEditing(props));
    if (!d?.post) return <></>;
    return <h1 className={`cr-heading cr-h1${props.size === "display" ? " cr-display" : ""} cr-align-${alignOf(props.align)}`}>{d.post.title}</h1>;
  },
};

export type PostDetailsProps = { show: "both" | "date" | "blog"; align: Align };
export const PostDetails: ComponentConfig<PostDetailsProps> = {
  label: "Post details",
  fields: {
    show: {
      type: "radio",
      label: "Show",
      options: [
        { label: "Blog name and date", value: "both" },
        { label: "Date", value: "date" },
        { label: "Blog name", value: "blog" },
      ],
    },
    align: alignField,
  },
  defaultProps: { show: "both", align: "left" },
  render: (props) => {
    const d = useDesign(isEditing(props));
    if (!d?.post) return <></>;
    const blog = props.show !== "date";
    const date = props.show !== "blog" && isValidDate(d.post.date);
    if (!blog && !date) return <></>;
    return (
      <p className={`cr-post-meta cr-align-${alignOf(props.align)}`}>
        {blog ? <a href={`${BLOG_PATH}/`}>{d.blog.title}</a> : null}
        {blog && date ? <span aria-hidden="true"> · </span> : null}
        {date ? <time dateTime={d.post.date}>{formatPostDate(d.post.date, d.language)}</time> : null}
      </p>
    );
  },
};

export type PostSummaryProps = { align: Align };
export const PostSummary: ComponentConfig<PostSummaryProps> = {
  label: "Post summary",
  fields: { align: alignField },
  defaultProps: { align: "left" },
  render: (props) => {
    const d = useDesign(isEditing(props));
    const text = d?.post?.description.trim();
    if (!text) return <></>;
    return <p className={`cr-post-summary cr-align-${alignOf(props.align)}`}>{text}</p>;
  },
};

export const coverRatios = ["auto", "wide", "cinema", "square", "tall"] as const;
export type CoverRatio = (typeof coverRatios)[number];
export type PostCoverProps = { ratio: CoverRatio };
export const PostCover: ComponentConfig<PostCoverProps> = {
  label: "Cover photo",
  fields: {
    ratio: {
      type: "select",
      label: "Shape",
      options: [
        { label: "As the photo is", value: "auto" },
        { label: "Wide (16:9)", value: "wide" },
        { label: "Cinema (21:9)", value: "cinema" },
        { label: "Square", value: "square" },
        { label: "Tall (3:4)", value: "tall" },
      ],
    },
  },
  defaultProps: { ratio: "auto" },
  render: (props) => {
    const editing = isEditing(props);
    const d = useDesign(editing);
    const ratio = coverRatios.includes(props.ratio) ? props.ratio : "auto";
    const cover = d?.post?.cover.trim();
    if (!cover) {
      // A post without a cover shows nothing; the builder shows where it would go.
      return editing ? <div className={`cr-post-cover cr-post-cover-empty cr-cover-${ratio}`}>Cover photo</div> : <></>;
    }
    const alt = d!.post!.coverAlt.trim();
    // Missing alt is left out on purpose so the publish check can flag it.
    return <Img className={`cr-post-cover cr-cover-${ratio}`} src={cover} size="full" {...(alt ? { alt } : {})} decoding="async" />;
  },
};

export type PostHeroProps = { height: "auto" | "medium" | "large" | "full"; tint: "light" | "medium" | "strong"; align: Align; summary: "yes" | "no" };
/** The cover filling a dark section, with the post's details, title and summary on it. */
export const PostHero: ComponentConfig<PostHeroProps> = {
  label: "Cover with title",
  fields: {
    height: {
      type: "select",
      label: "Height",
      options: [
        { label: "Fit the words", value: "auto" },
        { label: "Half the screen", value: "medium" },
        { label: "Three quarters", value: "large" },
        { label: "Full screen", value: "full" },
      ],
    },
    tint: {
      type: "radio",
      label: "Darken the photo",
      options: [
        { label: "Light", value: "light" },
        { label: "Medium", value: "medium" },
        { label: "Strong", value: "strong" },
      ],
    },
    align: alignField,
    summary: yesNo("Show the summary"),
  },
  defaultProps: { height: "large", tint: "strong", align: "left", summary: "yes" },
  render: (props) => {
    const d = useDesign(isEditing(props));
    if (!d?.post) return <></>;
    const { post } = d;
    const align = alignOf(props.align);
    const height = ["auto", "medium", "large", "full"].includes(props.height) ? props.height : "large";
    const tint = ["light", "medium", "strong"].includes(props.tint) ? props.tint : "strong";
    const cover = post.cover.trim();
    return (
      <section className={`cr-section cr-style-dark cr-height-${height} cr-valign-bottom cr-post-hero`}>
        {cover ? (
          <>
            {/* The cover is the post's picture; its alt is said once, here. */}
            <Img className="cr-section-media" src={cover} size="wide" {...(post.coverAlt.trim() ? { alt: post.coverAlt.trim() } : {})} decoding="async" />
            <div className={`cr-section-tint cr-tint-${tint}`} aria-hidden="true" />
          </>
        ) : null}
        <div className="cr-container">
          <p className={`cr-post-meta cr-align-${align}`}>
            <a href={`${BLOG_PATH}/`}>{d.blog.title}</a>
            {isValidDate(post.date) ? (
              <>
                <span aria-hidden="true"> · </span>
                <time dateTime={post.date}>{formatPostDate(post.date, d.language)}</time>
              </>
            ) : null}
          </p>
          <h1 className={`cr-heading cr-h1 cr-display cr-align-${align}`}>{post.title}</h1>
          {props.summary !== "no" && post.description.trim() ? <p className={`cr-post-summary cr-align-${align}`}>{post.description}</p> : null}
        </div>
      </section>
    );
  },
};

/** Where each post's own blocks go. Exactly one, at the top level (checkDesign). */
export const PostContent: ComponentConfig<Record<string, never>> = {
  label: "Post content",
  fields: {},
  defaultProps: {},
  render: (props) => {
    const d = useContext(PageDesignContext);
    if (d?.body !== undefined) return <>{d.body}</>;
    if (!isEditing(props as Editing)) return <></>;
    return (
      <div className="cr-container cr-post-content-sample">
        <p className="cr-post-content-label">Post content</p>
        <p>Each post's own blocks show here: its text, photos and sections.</p>
      </div>
    );
  },
};

// --- Blog page -------------------------------------------------------------------------------

export type BlogTitleProps = { size: "normal" | "display"; align: Align };
export const BlogTitle: ComponentConfig<BlogTitleProps> = {
  label: "Blog title",
  fields: { size: sizeField, align: alignField },
  defaultProps: { size: "normal", align: "left" },
  render: (props) => {
    const d = useDesign(isEditing(props));
    if (!d) return <></>;
    return <h1 className={`cr-heading cr-h1${props.size === "display" ? " cr-display" : ""} cr-align-${alignOf(props.align)}`}>{d.blog.title}</h1>;
  },
};

export type BlogIntroProps = { align: Align };
export const BlogIntro: ComponentConfig<BlogIntroProps> = {
  label: "Blog intro",
  fields: { align: alignField },
  defaultProps: { align: "left" },
  render: (props) => {
    const editing = isEditing(props);
    const d = useDesign(editing);
    const text = d?.blog.intro.trim() || (editing ? "The blog's intro, from the Posts screen (optional)." : "");
    if (!text) return <></>;
    return <p className={`cr-post-summary cr-align-${alignOf(props.align)}`}>{text}</p>;
  },
};

export const postListLooks = ["cards", "list", "featured"] as const;
export type PostListLook = (typeof postListLooks)[number];
export type PostListProps = {
  look: PostListLook;
  columns: "auto" | "2" | "3";
  count: "all" | "3" | "6" | "12";
  photo: "yes" | "no";
  date: "yes" | "no";
  summary: "yes" | "no";
  titleLevel: "h2" | "h3";
};

/** The posts, newest first. On a post page it leaves out the post itself ("More posts"). */
export const PostList: ComponentConfig<PostListProps> = {
  label: "Post list",
  fields: {
    look: {
      type: "radio",
      label: "Look",
      options: [
        { label: "Cards", value: "cards" },
        { label: "List", value: "list" },
        { label: "Newest large", value: "featured" },
      ],
    },
    columns: {
      type: "radio",
      label: "Cards across",
      options: [
        { label: "Fit", value: "auto" },
        { label: "2", value: "2" },
        { label: "3", value: "3" },
      ],
    },
    count: {
      type: "select",
      label: "How many",
      options: [
        { label: "All posts", value: "all" },
        { label: "3", value: "3" },
        { label: "6", value: "6" },
        { label: "12", value: "12" },
      ],
    },
    photo: yesNo("Photos"),
    date: yesNo("Dates"),
    summary: yesNo("Summaries"),
    titleLevel: {
      type: "radio",
      label: "Post titles are",
      options: [
        { label: "Heading 2", value: "h2" },
        { label: "Heading 3", value: "h3" },
      ],
    },
  },
  defaultProps: { look: "cards", columns: "auto", count: "all", photo: "yes", date: "yes", summary: "yes", titleLevel: "h2" },
  render: (props) => {
    const d = useDesign(isEditing(props));
    if (!d) return <></>;
    const look = postListLooks.includes(props.look) ? props.look : "cards";
    const Title = headingTag(props.titleLevel, "h2");
    const max = props.count === "all" ? Infinity : Number(props.count) || Infinity;
    const posts = (d.posts ?? []).filter((p) => p.slug !== d.post?.slug).slice(0, max);
    if (!posts.length) return <p className="cr-post-empty">No posts yet.</p>;
    const cols = props.columns === "2" || props.columns === "3" ? ` cr-post-cols-${props.columns}` : "";
    return (
      <ul className={`cr-post-list cr-post-list-${look}${cols}`}>
        {posts.map((p, i) => {
          const featured = look === "featured" && i === 0;
          return (
            <li key={p.slug} className={featured ? "cr-post-item cr-post-featured" : "cr-post-item"}>
              <article>
                {/* The title link names the post; the cover is a picture of it. */}
                {props.photo !== "no" && p.cover.trim() ? (
                  <Img className="cr-post-thumb" src={p.cover} size={featured ? "half" : look === "list" ? "small" : "third"} alt="" loading="lazy" decoding="async" />
                ) : null}
                <div className="cr-post-text">
                  <Title className={`cr-heading ${featured ? "cr-h2" : "cr-h3"}`}>
                    <a href={`${postPath(p.slug)}/`}>{p.title}</a>
                  </Title>
                  {props.date !== "no" && isValidDate(p.date) ? (
                    <time className="cr-post-date" dateTime={p.date}>
                      {formatPostDate(p.date, d.language)}
                    </time>
                  ) : null}
                  {props.summary !== "no" && p.description.trim() ? <p>{p.description}</p> : null}
                </div>
              </article>
            </li>
          );
        })}
      </ul>
    );
  },
};

export const pageDesignBlocks = { PostTitle, PostDetails, PostSummary, PostCover, PostHero, PostContent, BlogTitle, BlogIntro, PostList };

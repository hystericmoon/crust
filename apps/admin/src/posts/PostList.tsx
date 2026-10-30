/**
 * The Posts screen (F035): every post, newest first, with "New post", and
 * the blog list page's title and intro. Posts are edited in the builder
 * like pages and go live with the next Publish.
 */
import { formatPostDate, isValidDate, isValidSlug, newPost, postLimits, postPath, slugFor, today, type BlogSettings } from "@crust/blocks";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { deletePost, saveBlog, savePost } from "../api-client";
import { loadPostRows, removeLocalPost, saveLocalPost, type PostRow } from "./store";

export const postEditHref = (slug: string) => `#/post?slug=${encodeURIComponent(slug)}`;

export interface NewPostErrors {
  title?: string;
  slug?: string;
  date?: string;
}

/** Plain-language problems with a new post, keyed by field. */
export function checkNewPost(input: { title: string; slug: string; date: string }, taken: string[]): NewPostErrors {
  const errors: NewPostErrors = {};
  if (!input.title.trim()) errors.title = "Add a title.";
  else if (input.title.length > postLimits.title) errors.title = `Use at most ${postLimits.title} characters.`;
  if (!input.slug.trim()) errors.slug = "Add an address, like first-post.";
  else if (!isValidSlug(input.slug)) errors.slug = "Use lowercase letters, numbers and dashes, starting with a letter or number.";
  else if (taken.includes(input.slug)) errors.slug = `There's already a post at ${postPath(input.slug)}.`;
  if (!isValidDate(input.date)) errors.date = "Pick a date.";
  return errors;
}

export function PostList({ siteName, githubOn, language }: { siteName: string; githubOn: boolean; language: string }) {
  const [rows, setRows] = useState<PostRow[] | null>(null);
  const [blog, setBlog] = useState<BlogSettings | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [creating, setCreating] = useState(false);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const newRef = useRef<HTMLButtonElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    void loadPostRows(githubOn).then((r) => {
      setRows(r.rows);
      setBlog(r.blog);
      setError(r.error ?? "");
    });
  }, [githubOn, version]);

  const create = async (input: { title: string; slug: string; date: string }): Promise<string | null> => {
    const post = newPost(input.title, input.slug, input.date);
    if (githubOn) {
      const res = await savePost(post);
      if (!res.ok) return `Not created: ${res.error}`;
    }
    if (!saveLocalPost(post, githubOn)) return "This browser wouldn't store the post. Try again.";
    location.hash = postEditHref(post.slug);
    return null;
  };

  const remove = async (row: PostRow) => {
    if (row.inRepo && githubOn) {
      const res = await deletePost(row.slug);
      if (!res.ok) {
        setMessage(`Not deleted: ${res.error}`);
        return;
      }
    }
    removeLocalPost(row.slug);
    setConfirming(null);
    setMessage(`Deleted “${row.title}”.${row.inRepo ? " It leaves the live site the next time you publish." : ""}`);
    setVersion((v) => v + 1);
    requestAnimationFrame(() => headingRef.current?.focus());
  };

  return (
    <div className="st">
      <header className="st-header">
        <h1 className="st-title">{siteName}: posts</h1>
        <div className="st-actions">
          <a className="st-button st-link-button" href="#/">
            Pages
          </a>
          <a className="st-button st-link-button" href="#/settings">
            Site settings
          </a>
          <button ref={newRef} type="button" className="st-button st-button-primary" aria-expanded={creating} aria-controls="new-post" onClick={() => setCreating((c) => !c)}>
            New post
          </button>
        </div>
      </header>
      <main className="pg">
        {creating ? (
          <NewPostForm
            taken={rows?.map((r) => r.slug) ?? []}
            onCancel={() => {
              setCreating(false);
              newRef.current?.focus();
            }}
            onCreate={create}
          />
        ) : null}

        <section className="st-card" aria-labelledby="posts-h">
          <h2 id="posts-h" ref={headingRef} tabIndex={-1}>
            Posts
          </h2>
          <p className="st-lede">
            News, notes or portfolio pieces, newest first, listed at /blog/ with an RSS feed. They go live when you{" "}
            <a href="#/?focus=publish">publish</a>.
          </p>
          {error ? (
            <p className="st-error" role="alert">
              {error}
            </p>
          ) : null}
          <p className="st-status-inline" role="status">
            {message}
          </p>
          {rows === null ? (
            <p>Loading…</p>
          ) : rows.length === 0 ? (
            <p className="po-empty">No posts yet. Press “New post” to write the first one; the blog appears on your site once it has a post.</p>
          ) : (
            <ul className="po-list">
              {rows.map((row) => (
                <li key={row.slug} className="po-row">
                  <div className="po-main">
                    <a className="po-title" href={postEditHref(row.slug)}>
                      {row.title}
                    </a>
                    <span className="po-meta">
                      <time dateTime={row.date}>{formatPostDate(row.date, language)}</time> · {postPath(row.slug)}/
                      {row.localChanges ? " · Draft in this browser" : ""}
                    </span>
                  </div>
                  {confirming === row.slug ? (
                    <div className="po-confirm" role="group" aria-label={`Delete “${row.title}”?`}>
                      <span>Delete this post?</span>
                      <button type="button" id={`delete-${row.slug}`} className="st-button pg-small po-danger" onClick={() => void remove(row)}>
                        Delete post
                      </button>
                      <button
                        type="button"
                        className="st-button pg-small"
                        onClick={() => {
                          setConfirming(null);
                          requestAnimationFrame(() => document.getElementById(`ask-${row.slug}`)?.focus());
                        }}
                      >
                        Keep it
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      id={`ask-${row.slug}`}
                      className="st-button pg-small"
                      onClick={() => {
                        setConfirming(row.slug);
                        requestAnimationFrame(() => document.getElementById(`delete-${row.slug}`)?.focus());
                      }}
                    >
                      Delete<span className="pg-sr"> {row.title}</span>
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {blog ? <BlogSettingsForm blog={blog} githubOn={githubOn} onSaved={setBlog} /> : null}
      </main>
    </div>
  );
}

function NewPostForm({ taken, onCancel, onCreate }: { taken: string[]; onCancel: () => void; onCreate: (input: { title: string; slug: string; date: string }) => Promise<string | null> }) {
  const id = useId();
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [date, setDate] = useState(today());
  const [errors, setErrors] = useState<NewPostErrors>({});
  const [failure, setFailure] = useState("");
  const [busy, setBusy] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  useEffect(() => titleRef.current?.focus(), []);

  const address = slugEdited ? slug : title.trim() ? slugFor(title, taken) : "";
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const input = { title, slug: address, date };
    const found = checkNewPost(input, taken);
    setErrors(found);
    if (Object.keys(found).length) {
      document.getElementById(`${id}-${Object.keys(found)[0]}`)?.focus();
      return;
    }
    setBusy(true);
    const failed = await onCreate(input);
    setBusy(false);
    if (failed) setFailure(failed);
  };
  const described = (field: keyof NewPostErrors, hint?: string) => [hint, errors[field] ? `${id}-${field}-error` : ""].filter(Boolean).join(" ") || undefined;

  return (
    <section id="new-post" className="st-card" aria-labelledby={`${id}-h`}>
      <h2 id={`${id}-h`}>New post</h2>
      <form className="po-form" onSubmit={(e) => void submit(e)} noValidate>
        <div className="pg-field">
          <label className="st-field-label" htmlFor={`${id}-title`}>
            Title
          </label>
          <input ref={titleRef} id={`${id}-title`} className="st-input" value={title} aria-invalid={!!errors.title} aria-describedby={described("title")} onChange={(e) => setTitle(e.target.value)} />
          {errors.title ? (
            <p id={`${id}-title-error`} className="st-error">
              {errors.title}
            </p>
          ) : null}
        </div>
        <div className="pg-field">
          <label className="st-field-label" htmlFor={`${id}-slug`}>
            Address
          </label>
          <div className="po-prefix">
            <span aria-hidden="true">/blog/</span>
            <input
              id={`${id}-slug`}
              className="st-input"
              value={address}
              aria-invalid={!!errors.slug}
              aria-describedby={described("slug", `${id}-slug-hint`)}
              onChange={(e) => {
                setSlugEdited(true);
                setSlug(e.target.value);
              }}
            />
          </div>
          <p id={`${id}-slug-hint`} className="st-help">
            Made from the title. The post will be at /blog/{address || "…"}/.
          </p>
          {errors.slug ? (
            <p id={`${id}-slug-error`} className="st-error">
              {errors.slug}
            </p>
          ) : null}
        </div>
        <div className="pg-field">
          <label className="st-field-label" htmlFor={`${id}-date`}>
            Date
          </label>
          <input id={`${id}-date`} className="st-input po-date" type="date" value={date} aria-invalid={!!errors.date} aria-describedby={described("date")} onChange={(e) => setDate(e.target.value)} />
          {errors.date ? (
            <p id={`${id}-date-error`} className="st-error">
              {errors.date}
            </p>
          ) : null}
        </div>
        {failure ? (
          <p className="st-error" role="alert">
            {failure}
          </p>
        ) : null}
        <div className="po-buttons">
          <button type="submit" className="st-button st-button-primary" disabled={busy}>
            Create and edit
          </button>
          <button type="button" className="st-button" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </form>
    </section>
  );
}

function BlogSettingsForm({ blog, githubOn, onSaved }: { blog: BlogSettings; githubOn: boolean; onSaved: (b: BlogSettings) => void }) {
  const id = useId();
  const [title, setTitle] = useState(blog.title);
  const [intro, setIntro] = useState(blog.intro);
  const [status, setStatus] = useState("");
  const changed = title !== blog.title || intro !== blog.intro;
  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setStatus("The blog page needs a title.");
      document.getElementById(`${id}-title`)?.focus();
      return;
    }
    const next = { title: title.trim(), intro: intro.trim() };
    const res = await saveBlog(next);
    if (res.ok) {
      onSaved(res.blog);
      setStatus("Blog page saved. Visitors see it after you publish.");
    } else setStatus(`Not saved: ${res.error}`);
  };
  return (
    <section className="st-card" aria-labelledby={`${id}-h`}>
      <h2 id={`${id}-h`}>Blog page</h2>
      <p className="st-lede">The list of posts at /blog/. Add it to your menu in Site settings → Header & menu.</p>
      <form className="po-form" onSubmit={(e) => void save(e)} noValidate>
        <div className="pg-field">
          <label className="st-field-label" htmlFor={`${id}-title`}>
            Title
          </label>
          <input id={`${id}-title`} className="st-input" maxLength={postLimits.blogTitle} value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="pg-field">
          <label className="st-field-label" htmlFor={`${id}-intro`}>
            Intro (optional)
          </label>
          <textarea id={`${id}-intro`} className="st-input" rows={2} maxLength={postLimits.intro} value={intro} onChange={(e) => setIntro(e.target.value)} />
        </div>
        <div className="po-buttons">
          <button type="submit" className="st-button st-button-primary" disabled={!changed || !githubOn}>
            Save blog page
          </button>
          {!githubOn ? <span className="st-help">Saving works on crust-admin.pages.dev.</span> : null}
        </div>
        <p className="st-status-inline" role="status">
          {status}
        </p>
      </form>
    </section>
  );
}

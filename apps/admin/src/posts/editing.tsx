/**
 * The builder for a post (F035): the same blocks as pages, with the post's
 * details (title, summary, date, cover photo) in the page settings, and the
 * top of the post on the canvas as it will be published.
 */
import { PostHeaderView, defaultBlog, type BlogSettings, type Components } from "@crust/blocks";
import type { Config } from "@puckeditor/core";
import { createContext, useContext, useId, type ReactNode } from "react";
import { fillAltText } from "../media/fields";
import { ImageField } from "../media/ImageField";

/** The blog's title, for the "Blog · date" line above the post title. */
export const BlogContext = createContext<{ blog: BlogSettings; language: string }>({ blog: defaultBlog, language: "en" });

type RootProps = { title?: string; description?: string; date?: string; cover?: string; coverAlt?: string };

function DateField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const id = useId();
  return (
    <div className="po-field">
      <label className="mf-label" htmlFor={id}>
        Date
      </label>
      <input id={id} className="mf-input po-date" type="date" required value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function PostTop(props: RootProps) {
  const { blog, language } = useContext(BlogContext);
  return (
    <PostHeaderView
      post={{ title: props.title || "Untitled post", description: props.description ?? "", date: props.date ?? "", cover: props.cover ?? "", coverAlt: props.coverAlt ?? "" }}
      blog={blog}
      language={language}
    />
  );
}

/**
 * Turns a page builder config into the post builder: post fields in the
 * page settings, the post's top above its blocks. `config` is the page
 * builder's (its root render adds the site header and footer).
 */
export function withPostEditing(config: Config<Components>): Config<Components> {
  const root = config.root ?? {};
  const outer = root.render as ((p: { children: ReactNode }) => ReactNode) | undefined;
  return {
    ...config,
    root: {
      ...root,
      fields: {
        title: { type: "text", label: "Post title" },
        description: { type: "textarea", label: "Summary (on the blog page, in search results and feeds)" },
        date: { type: "custom", label: "Date", render: ({ value, onChange }: { value?: string; onChange: (v: string) => void }) => <DateField value={value ?? ""} onChange={onChange} /> },
        cover: {
          type: "custom",
          label: "Cover photo (optional)",
          render: ({ value, onChange }: { value?: string; onChange: (v: string) => void }) => <ImageField label="Cover photo (optional)" value={value ?? ""} onChange={onChange} />,
        },
        coverAlt: { type: "text", label: "Cover alt text (describe the photo)" },
      },
      // Picking a library photo fills its alt text, as in image blocks (F034).
      resolveData: (data: { props: Record<string, unknown> }, params: { lastData: { props: Record<string, unknown> } | null }) => {
        const props = fillAltText(data.props, params.lastData?.props ?? null, [["cover", "coverAlt"]]);
        return props === data.props ? data : { ...data, props };
      },
      render: (props: RootProps & { children: ReactNode }) => {
        const inner = (
          <article className="cr-post">
            <PostTop {...props} />
            {props.children}
          </article>
        );
        return outer ? outer({ children: inner }) : <div className="cr-page">{inner}</div>;
      },
    },
  } as unknown as Config<Components>;
}

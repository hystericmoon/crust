/**
 * Search and sharing settings in the page settings panel (F036): a search
 * title, a social image, "Hide from search engines", and previews of how
 * the page looks in search results and when its link is shared.
 */
import { cleanSeo, displayUrl, safeUrl, seoAdvice, shorten, type Components, type PageSeo } from "@crust/blocks";
import { createUsePuck, type Config } from "@puckeditor/core";
import { createContext, useContext, useId, type ReactNode } from "react";
import { fillAltText } from "../media/fields";
import { ImageField } from "../media/ImageField";

const usePuckSelector = createUsePuck();

/** The site's address and name, for the previews. */
export const SeoSiteContext = createContext<{ baseUrl: string; siteName: string; path: string }>({ baseUrl: "https://example.com", siteName: "", path: "/" });

/** Root props while editing ⇄ the page file's `seo` (only set values are written). */
export const seoToRoot = (seo: PageSeo | undefined) => ({
  seoTitle: seo?.title ?? "",
  seoImage: seo?.image ?? "",
  seoImageAlt: seo?.imageAlt ?? "",
  noindex: seo?.noindex ?? false,
});

export function seoFromRoot(props: Record<string, unknown>): { seo: PageSeo | undefined; rest: Record<string, unknown> } {
  const { seoTitle, seoImage, seoImageAlt, noindex, sharePreview: _preview, ...rest } = props;
  const text = (v: unknown) => (typeof v === "string" ? v : "");
  return { seo: cleanSeo({ title: text(seoTitle), image: text(seoImage), imageAlt: text(seoImageAlt), noindex: noindex === true }), rest };
}

function Counter({ id, length, advice }: { id: string; length: number; advice: number }) {
  return (
    <p id={id} className={length > advice ? "so-hint is-long" : "so-hint"}>
      {length} characters{length > advice ? ` · search engines usually show about ${advice}` : ""}
    </p>
  );
}

function SearchTitleField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const id = useId();
  return (
    <div className="so-field">
      <label className="mf-label" htmlFor={id}>
        Search title (optional)
      </label>
      <input id={id} className="mf-input" maxLength={120} value={value} aria-describedby={`${id}-hint ${id}-count`} onChange={(e) => onChange(e.target.value)} />
      <p id={`${id}-hint`} className="so-hint">
        Replaces “Page title | Site name” in search results and shared links.
      </p>
      <Counter id={`${id}-count`} length={value.length} advice={seoAdvice.title} />
    </div>
  );
}

function NoindexField({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  const id = useId();
  return (
    <div className="so-field">
      <div className="so-check">
        <input id={id} type="checkbox" checked={value} aria-describedby={`${id}-hint`} onChange={(e) => onChange(e.target.checked)} />
        <label htmlFor={id}>Hide from search engines</label>
      </div>
      <p id={`${id}-hint`} className="so-hint">
        For pages like “Thank you” or drafts shared by link. The page is still published and its links work; it's left out of the sitemap.
      </p>
    </div>
  );
}

export interface PreviewInput {
  title: string;
  description: string;
  seoTitle: string;
  seoImage: string;
  noindex: boolean;
}

/** How the page shows in search results and when its link is shared. */
export function SharePreview({ input, baseUrl, siteName, path }: { input: PreviewInput; baseUrl: string; siteName: string; path: string }) {
  const title = input.seoTitle.trim() || (path === "/" ? input.title : `${input.title} | ${siteName}`);
  const shareTitle = input.seoTitle.trim() || input.title;
  const description = input.description.trim();
  const host = baseUrl.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  return (
    <div className="so-previews" role="group" aria-label="Previews">
      <span className="mf-label">In search results</span>
      {input.noindex ? (
        <p className="so-hint">Hidden from search engines.</p>
      ) : (
        <div className="so-search">
          <span className="so-search-url">{displayUrl(baseUrl, path)}</span>
          <span className="so-search-title">{shorten(title || "Untitled page", seoAdvice.title)}</span>
          <span className="so-search-text">{description ? shorten(description, seoAdvice.description) : "No description yet: search engines will pick some text from the page."}</span>
        </div>
      )}
      <span className="mf-label">When shared (messages, social media)</span>
      <div className="so-card">
        {input.seoImage.trim() ? <img className="so-card-image" src={safeUrl(input.seoImage)} alt="" /> : null}
        <div className="so-card-body">
          <span className="so-card-host">{host}</span>
          <span className="so-card-title">{shorten(shareTitle || "Untitled page", 70)}</span>
          {description ? <span className="so-card-text">{shorten(description, 110)}</span> : null}
        </div>
      </div>
      {!input.seoImage.trim() ? <p className="so-hint">Add a social image to show a big picture when the link is shared (best at 1200 × 630).</p> : null}
    </div>
  );
}

function LivePreview() {
  const props = usePuckSelector((s) => (s.appState.data.root as { props?: Record<string, unknown> }).props ?? {}) as Record<string, unknown>;
  const site = useContext(SeoSiteContext);
  const text = (v: unknown) => (typeof v === "string" ? v : "");
  return (
    <SharePreview
      input={{ title: text(props.title), description: text(props.description), seoTitle: text(props.seoTitle), seoImage: text(props.seoImage), noindex: props.noindex === true }}
      baseUrl={site.baseUrl}
      siteName={site.siteName}
      path={site.path}
    />
  );
}

type FieldRender<T> = { value?: T; onChange: (v: T) => void };

/** Adds the search and sharing fields to the page settings (root). */
export function withSeoEditing(config: Config<Components>): Config<Components> {
  const root = config.root ?? {};
  const own = root.resolveData as ((d: unknown, p: unknown) => unknown) | undefined;
  return {
    ...config,
    root: {
      ...root,
      fields: {
        ...(root.fields ?? {}),
        seoTitle: { type: "custom", label: "Search title (optional)", render: ({ value, onChange }: FieldRender<string>) => <SearchTitleField value={value ?? ""} onChange={onChange} /> },
        seoImage: {
          type: "custom",
          label: "Social image (optional)",
          render: ({ value, onChange }: FieldRender<string>) => <ImageField label="Social image (optional)" value={value ?? ""} onChange={onChange} />,
        },
        seoImageAlt: { type: "text", label: "Social image alt text" },
        noindex: { type: "custom", label: "Hide from search engines", render: ({ value, onChange }: FieldRender<boolean>) => <NoindexField value={value === true} onChange={onChange} /> },
        sharePreview: { type: "custom", label: "Previews", render: () => <LivePreview /> },
      },
      // A library photo brings its alt text, as in image blocks (F034).
      resolveData: async (data: { props: Record<string, unknown> }, params: { lastData: { props: Record<string, unknown> } | null }) => {
        const base = (own ? await own(data, params) : data) as { props: Record<string, unknown> };
        const props = fillAltText(base.props, params.lastData?.props ?? null, [["seoImage", "seoImageAlt"]]);
        return props === base.props ? base : { ...base, props };
      },
    },
  } as unknown as Config<Components>;
}

/** For the canvas wrapper: nothing to draw, the settings only change <head>. */
export const SeoSiteProvider = ({ value, children }: { value: { baseUrl: string; siteName: string; path: string }; children: ReactNode }) => (
  <SeoSiteContext.Provider value={value}>{children}</SeoSiteContext.Provider>
);


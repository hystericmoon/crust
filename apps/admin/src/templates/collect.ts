/**
 * F045: gathers everything a template holds. Connected to GitHub, that's
 * the saved site (pages, linked sections, blog, photo library); on a
 * preview link without GitHub, the site that ships with the builder.
 */
import {
  defaultBlog,
  makeTemplate,
  readTemplate,
  config,
  type BlogSettings,
  type LinkedSectionFile,
  type MediaItem,
  type PackLayout,
  type Post,
  type SiteChrome,
  type SiteTokens,
  type Template,
  type TemplatePage,
} from "@crust/blocks";
import { getPage, getPost, listMedia, listPages, listPosts, listSections } from "../api-client";
import { bundledPages } from "../pages/store";

export interface TemplateLoader {
  pages: () => Promise<TemplatePage[]>;
  sections: () => Promise<Pick<LinkedSectionFile, "id" | "name" | "content">[]>;
  blog: () => Promise<{ blog: BlogSettings; posts: Post[] }>;
  media: () => Promise<Pick<MediaItem, "file" | "alt" | "width" | "height" | "focus">[]>;
  /** One photo's bytes as base64; null when it can't be read. */
  photo: (file: string) => Promise<string | null>;
}

const must = <T,>(res: { ok: true } & T | { ok: false; error: string }, what: string): T => {
  if (!res.ok) throw new Error(`Couldn't read ${what}: ${res.error}`);
  return res;
};

/** A blob as base64, without the data: prefix. */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).replace(/^data:[^,]*,/, ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export const githubLoader: TemplateLoader = {
  pages: async () => {
    const list = must(await listPages(), "the pages").pages;
    const pages: TemplatePage[] = [];
    for (const row of list) pages.push(must(await getPage(row.path), row.title).page);
    return pages;
  },
  sections: async () => must(await listSections(), "the linked sections").sections,
  blog: async () => {
    const res = must(await listPosts(), "the blog");
    const posts: Post[] = [];
    for (const p of res.posts) posts.push(must(await getPost(p.slug), p.title).post);
    return { blog: res.blog, posts };
  },
  media: async () => must(await listMedia(), "the photo library").items,
  photo: async (file) => {
    const res = await fetch(`/media/${encodeURIComponent(file)}`);
    return res.ok ? blobToBase64(await res.blob()) : null;
  },
};

/** Preview links have no GitHub connection: the builder's own sample site. */
export const bundledLoader: TemplateLoader = {
  pages: async () => bundledPages(),
  sections: async () => [],
  blog: async () => ({ blog: defaultBlog, posts: [] }),
  media: async () => [],
  photo: async () => null,
};

export type CollectStep = "pages" | "sections" | "blog" | "photos" | "checking";

export interface CollectResult {
  /** The file's text, ready to download; null when the site can't be a template yet. */
  text: string | null;
  template: Template | null;
  /** Why it can't be saved as a template (from the same check that reads templates). */
  problems: string[];
  /** Photos used on a page that the library doesn't have; left out. */
  missing: string[];
}

/**
 * Collects the site, builds the template and reads it back with the
 * template reader, so a file only downloads if Crust can open it again.
 */
export async function collectTemplate(
  details: { name: string; description: string },
  site: { name: string; language: string; tokens: SiteTokens; chrome: SiteChrome; layouts: PackLayout[] },
  loader: TemplateLoader,
  onStep: (step: CollectStep) => void = () => undefined,
): Promise<CollectResult> {
  onStep("pages");
  const pages = await loader.pages();
  onStep("sections");
  const sections = await loader.sections();
  onStep("blog");
  const { blog, posts } = await loader.blog();
  onStep("photos");
  const media = await loader.media();
  const { template, missing } = await makeTemplate(
    details,
    { site: { name: site.name, language: site.language }, tokens: site.tokens, chrome: site.chrome, pages, sections, layouts: site.layouts, blog, posts, media },
    loader.photo,
  );
  onStep("checking");
  const text = JSON.stringify(template);
  const check = readTemplate(text, config.components);
  if (!check.template) return { text: null, template: null, problems: check.problems, missing };
  return { text, template: check.template, problems: [], missing };
}

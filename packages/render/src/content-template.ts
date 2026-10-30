/**
 * F047: a content folder (the repo's content/) packed as a template, the
 * same way Site settings → Template does it in the builder (F045). The
 * template check uses it when there's no .crust file to check.
 */
import {
  defaultBlog,
  makeTemplate,
  migrateChrome,
  parseBlog,
  parseLinkedSection,
  parseMediaIndex,
  parsePost,
  type PackLayout,
  type Page,
  type Post,
  type Site,
  type Template,
} from "@crust/blocks";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const jsonFiles = async (dir: string) => (await readdir(dir).catch(() => [] as string[])).filter((f) => f.endsWith(".json")).sort();

export async function templateFromContent(contentDir: string, details = { name: "", description: "" }): Promise<{ template: Template; missing: string[] }> {
  const read = (...parts: string[]) => readFile(join(contentDir, ...parts), "utf8");
  const site = JSON.parse(await read("site.json")) as Site;
  const pages: Page[] = [];
  for (const f of await jsonFiles(join(contentDir, "pages"))) pages.push(JSON.parse(await read("pages", f)) as Page);
  const sections = [];
  for (const f of await jsonFiles(join(contentDir, "sections"))) {
    const s = parseLinkedSection(await read("sections", f), f.replace(/\.json$/, ""));
    if (s) sections.push(s);
  }
  const posts: Post[] = [];
  for (const f of await jsonFiles(join(contentDir, "posts"))) {
    const p = parsePost(await read("posts", f));
    if (p) posts.push(p);
  }
  const layouts: PackLayout[] = [];
  for (const f of await jsonFiles(join(contentDir, "layouts"))) {
    const l = JSON.parse(await read("layouts", f)) as PackLayout;
    layouts.push({ name: l.name, kind: l.kind, content: l.content });
  }
  const blog = posts.length ? parseBlog(await read("blog.json").catch(() => null)) : defaultBlog;
  const media = parseMediaIndex(await read("media.json").catch(() => null));
  return makeTemplate(
    { name: details.name || site.name, description: details.description },
    {
      site: { name: site.name, language: site.language },
      tokens: site.tokens,
      chrome: migrateChrome(site, pages.map((p) => ({ path: p.path, title: p.title }))),
      pages,
      sections,
      layouts,
      blog,
      posts,
      media,
    },
    async (file) => readFile(join(contentDir, "media", file)).then((b) => b.toString("base64"), () => null),
  );
}

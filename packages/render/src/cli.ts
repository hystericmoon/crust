/**
 * Usage: tsx packages/render/src/cli.ts <contentDir> <outDir>
 * Renders every page in <contentDir>/pages to static HTML in <outDir>.
 */
import { isBlogPath, parseBlog, parseMediaIndex, parsePost, type Page, type Post, type Site } from "@crust/blocks";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { renderBlogIndex, renderPost, rssFeed } from "./blog";
import { outputFileFor, renderNotFound, renderPage } from "./render";

const [contentDir = "content", outDir = "dist/site"] = process.argv.slice(2);
const stylesPath = join(dirname(fileURLToPath(import.meta.url)), "../../blocks/src/styles.css");

const readJson = async <T>(path: string): Promise<T> => JSON.parse(await readFile(path, "utf8")) as T;

const site = await readJson<Site>(join(contentDir, "site.json"));
const baseCss = await readFile(stylesPath, "utf8");
const pageFiles = (await readdir(join(contentDir, "pages"))).filter((f) => f.endsWith(".json")).sort();

await rm(outDir, { recursive: true, force: true });
const pages = await Promise.all(pageFiles.map((file) => readJson<Page>(join(contentDir, "pages", file))));
// Sites saved before F031 have no menu yet: it's made from these pages.
// F034: uploaded photos get srcset; crust-publish makes the resized copies.
const media = parseMediaIndex(await readFile(join(contentDir, "media.json"), "utf8").catch(() => null));
// The publish workflow passes the live address; locally the one in site.json is used.
const baseUrl = process.env.BASE_URL || site.baseUrl;
// F037: set by the publish workflow once the contact form service is set up (BLOCKED.md).
const forms = process.env.CONTACT_FORM_URL ? { endpoint: process.env.CONTACT_FORM_URL, siteKey: process.env.TURNSTILE_SITE_KEY ?? "" } : undefined;
const options = { pages: pages.map((p) => ({ path: p.path, title: p.title })), media, baseUrl, forms };
const seen = new Map<string, string>();
for (const [i, file] of pageFiles.entries()) {
  const page = pages[i]!;
  if (isBlogPath(page.path)) throw new Error(`Page ${file} uses the address ${page.path}, which belongs to your blog. Rename the page.`);
  const target = outputFileFor(page.path);
  const previous = seen.get(target);
  if (previous) throw new Error(`Pages ${previous} and ${file} both use the URL "${page.path}".`);
  seen.set(target, file);
  const html = renderPage(site, page, baseCss, options);
  await mkdir(dirname(join(outDir, target)), { recursive: true });
  await writeFile(join(outDir, target), html);
  console.log(`rendered ${page.path} -> ${target}`);
}
await mkdir(outDir, { recursive: true });

// F035: posts, the blog's list page and its feed (only when there are posts).
const postFiles = (await readdir(join(contentDir, "posts")).catch(() => [] as string[])).filter((f) => f.endsWith(".json")).sort();
const posts: Post[] = [];
for (const file of postFiles) {
  const post = parsePost(await readFile(join(contentDir, "posts", file), "utf8"));
  if (!post || `${post.slug}.json` !== file) throw new Error(`The post file ${file} is damaged or misnamed. Open it in the builder and save it again.`);
  posts.push(post);
}
if (posts.length) {
  const blog = parseBlog(await readFile(join(contentDir, "blog.json"), "utf8").catch(() => null));
  await mkdir(join(outDir, "blog"), { recursive: true });
  await writeFile(join(outDir, "blog", "index.html"), renderBlogIndex(site, posts, blog, baseCss, options));
  await writeFile(join(outDir, "blog", "feed.xml"), rssFeed(site, posts, blog, baseUrl));
  for (const post of posts) {
    await mkdir(join(outDir, "blog", post.slug), { recursive: true });
    await writeFile(join(outDir, "blog", post.slug, "index.html"), renderPost(site, post, blog, baseCss, options));
  }
  console.log(`rendered ${posts.length} post(s), /blog/ and /blog/feed.xml`);
}
await writeFile(join(outDir, "404.html"), renderNotFound(site, baseCss, options));
console.log(`render: ${pageFiles.length} page(s) written to ${outDir}`);

/**
 * Where the gallery's templates come from (F048): the starter templates in
 * the repo's templates/ folder (checked by npm run check:template in CI),
 * the sample site the builder ships with, and any .crust file opened from
 * the computer. Every one is read with the template reader first.
 */
import { config, defaultBlog, migrateChrome, readTemplate, type Site, type Template, type TemplateCheck } from "@crust/blocks";
import siteJson from "../../../../content/site.json";
import { desktopContent } from "../desktop/content";
import { contentPages } from "../pages/store";
import { collectTemplate } from "./collect";

export interface GallerySource {
  id: string;
  /** Loads and checks the template; big files load only when needed. */
  load: () => Promise<TemplateCheck>;
}

// Loaded on demand: a template with photos is megabytes of text.
const starterFiles = import.meta.glob<string>("../../../../templates/*.crust", { query: "?raw", import: "default" });

export const readTemplateText = (text: string): TemplateCheck => readTemplate(text, config.components);

export const SAMPLE_ID = "sample-site";

/** The site that ships with the builder, as a template. */
async function sampleSite(): Promise<TemplateCheck> {
  const site = (desktopContent()?.site ?? siteJson) as Site;
  const pages = contentPages();
  const result = await collectTemplate(
    { name: "Sample site", description: "The site Crust ships with: a simple start to shape into your own." },
    { name: site.name, language: site.language, tokens: site.tokens, chrome: migrateChrome(site, pages), layouts: [] },
    { pages: async () => pages, sections: async () => [], blog: async () => ({ blog: defaultBlog, posts: [] }), media: async () => [], photo: async () => null },
  );
  return result.template ? { template: result.template, problems: [] } : { template: null, problems: result.problems };
}

export function gallerySources(): GallerySource[] {
  const starters = Object.entries(starterFiles)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([path, load]) => ({ id: path.split("/").pop()!.replace(/\.crust$/, ""), load: async () => readTemplateText(await load()) }));
  return [...starters, { id: SAMPLE_ID, load: sampleSite }];
}

export type { Template };

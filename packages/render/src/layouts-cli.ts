/**
 * Usage: tsx packages/render/src/layouts-cli.ts <contentDir> <outDir>
 * Renders every layout in the library (F026) as a page, so check-a11y can
 * run axe on them: each section layout with the site's tokens, and each
 * whole-page layout with every theme preset, plus one page of the F032
 * blocks per preset.
 */
import { applyLook, applyPreset, buildPageLayout, fitHeadings, newPost, pageLayouts, sectionLayouts, styleLooks, themePresets, type Page, type Site } from "@crust/blocks";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { blockSamples, columnsV2Samples, motionSamples, sectionsV2Samples } from "./block-samples";
import { renderBlogIndex, renderPost } from "./blog";
import { renderPage } from "./render";

const [contentDir = "content", outDir = "dist/layout-check"] = process.argv.slice(2);
const stylesPath = join(dirname(fileURLToPath(import.meta.url)), "../../blocks/src/styles.css");
const site = JSON.parse(await readFile(join(contentDir, "site.json"), "utf8")) as Site;
const baseCss = await readFile(stylesPath, "utf8");

await rm(outDir, { recursive: true, force: true });
const write = async (slug: string, s: Site, title: string, content: Page["puck"]["content"]) => {
  const page: Page = { path: `/${slug}`, title, description: `Layout check: ${title}`, puck: { root: { props: {} }, content } };
  await mkdir(join(outDir, slug), { recursive: true });
  await writeFile(join(outDir, slug, "index.html"), renderPage(s, page, baseCss));
};

for (const layout of sectionLayouts) await write(layout.id, site, layout.name, fitHeadings(layout.build(), false));
for (const preset of themePresets) {
  const themed: Site = { ...site, tokens: applyPreset(site.tokens, preset) };
  for (const layout of pageLayouts) await write(`${layout.id}-${preset.id}`, themed, `${layout.name} (${preset.name})`, buildPageLayout(layout));
  // F032: the new blocks, on every section style, in every preset.
  await write(`blocks-${preset.id}`, themed, `New blocks (${preset.name})`, blockSamples());
}
// F073: Sections v2 in every look of the style library (first colourway).
for (const look of styleLooks) {
  const looked: Site = { ...site, tokens: applyLook(site.tokens, look) };
  await write(`sections-v2-${look.id}`, looked, `Sections v2 (${look.name})`, sectionsV2Samples(looked.tokens));
  // F074: Rows and columns v2 in the same looks.
  await write(`columns-v2-${look.id}`, looked, `Rows and columns v2 (${look.name})`, columnsV2Samples());
  // F075: motion on (Subtle and Lively in turn), in the same looks.
  const moving: Site = { ...looked, tokens: { ...looked.tokens, style: { ...looked.tokens.style, motion: styleLooks.indexOf(look) % 2 ? "lively" : "subtle" } } };
  await write(`motion-${look.id}`, moving, `Motion (${look.name})`, motionSamples());
}
// F035: the blog's list page and a post, in every preset.
const posts = [
  { ...newPost("Opening day", "opening-day", "2026-10-01"), description: "We open on Friday, with coffee for the first fifty visitors." },
  { ...newPost("Autumn menu", "autumn-menu", "2026-10-30"), description: "Soup, bread and the last tomatoes." },
];
const blog = { title: "News", intro: "Notes from the studio." };
for (const preset of themePresets) {
  const themed: Site = { ...site, tokens: applyPreset(site.tokens, preset) };
  await mkdir(join(outDir, `blog-${preset.id}`, "post"), { recursive: true });
  await writeFile(join(outDir, `blog-${preset.id}`, "index.html"), renderBlogIndex(themed, posts, blog, baseCss));
  await writeFile(join(outDir, `blog-${preset.id}`, "post", "index.html"), renderPost(themed, posts[0]!, blog, baseCss));
}
// F037: a contact form, connected and not yet, in every preset.
const contact: Page["puck"]["content"] = [
  { type: "Heading", props: { id: "h-contact", text: "Contact us", level: "h1", align: "left" } },
  { type: "ContactForm", props: { id: "ContactForm-check", nameLabel: "Name", emailLabel: "Email", messageLabel: "Message", fields: [{ label: "Phone", kind: "tel", required: "no" }], submitLabel: "Send message", successMessage: "Thanks!" } },
];
for (const preset of themePresets) {
  const themed: Site = { ...site, tokens: applyPreset(site.tokens, preset) };
  for (const [slug, forms] of [[`contact-${preset.id}`, { endpoint: "https://contact.example/", siteKey: "" }], [`contact-off-${preset.id}`, undefined]] as const) {
    const page: Page = { path: `/${slug}`, title: "Contact", description: "Layout check: contact form", puck: { root: { props: {} }, content: [{ type: "Section", props: { id: `s-${slug}`, background: "background", paddingY: "lg", content: contact } }] } };
    await mkdir(join(outDir, slug), { recursive: true });
    await writeFile(join(outDir, slug, "index.html"), renderPage(themed, page, baseCss, { forms }));
  }
}
console.log(`layouts: ${sectionLayouts.length} sections and ${pageLayouts.length * themePresets.length} themed pages written to ${outDir}`);

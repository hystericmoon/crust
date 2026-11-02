/**
 * Usage: tsx packages/render/src/layouts-cli.ts <contentDir> <outDir>
 * Renders every layout in the library (F026) as a page, so check-a11y can
 * run axe on them: each section layout with the site's tokens, and each
 * whole-page layout with every theme preset, plus one page of the F032
 * blocks per preset.
 */
import { designLayouts, type PageDesign } from "@crust/blocks";
import { applyLook, applyPreset, buildPageLayout, fitHeadings, fitLayoutToTokens, sectionLayoutsV2, footerStarter, headerLayouts, migrateChrome, newPost, pageLayouts, sectionLayouts, styleLooks, themePresets, type Page, type Site } from "@crust/blocks";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { blockSamples, columnsV2Samples, motionSamples, sectionsV2Samples } from "./block-samples";
import { renderBlogIndex, renderPost } from "./blog";
import { renderNotFound, renderPage } from "./render";

const [contentDir = "content", outDir = "dist/layout-check"] = process.argv.slice(2);
const stylesPath = join(dirname(fileURLToPath(import.meta.url)), "../../blocks/src/styles.css");
const site = JSON.parse(await readFile(join(contentDir, "site.json"), "utf8")) as Site;
const baseCss = await readFile(stylesPath, "utf8");

await rm(outDir, { recursive: true, force: true });
const write = async (slug: string, s: Site, title: string, content: Page["puck"]["content"], options: Parameters<typeof renderPage>[3] = {}) => {
  const page: Page = { path: `/${slug}`, title, description: `Layout check: ${title}`, puck: { root: { props: {} }, content } };
  await mkdir(join(outDir, slug), { recursive: true });
  await writeFile(join(outDir, slug, "index.html"), renderPage(s, page, baseCss, options));
};

for (const layout of sectionLayouts) await write(layout.id, site, layout.name, fitHeadings(layout.build(), false));
for (const preset of themePresets) {
  const themed: Site = { ...site, tokens: applyPreset(site.tokens, preset) };
  for (const layout of pageLayouts) await write(`${layout.id}-${preset.id}`, themed, `${layout.name} (${preset.name})`, buildPageLayout(layout));
  // F032: the new blocks, on every section style, in every preset.
  await write(`blocks-${preset.id}`, themed, `New blocks (${preset.name})`, blockSamples());
}
// F080: the new sections, all on one page per look of the style library (and every colourway in turn), fitted to that look as the builder does on insert.
for (const [i, look] of styleLooks.entries()) {
  const looked: Site = { ...site, tokens: applyLook(site.tokens, look, look.variations[i % look.variations.length]) };
  const all = sectionLayoutsV2.flatMap((l) => l.build());
  await write(`library-v2-${look.id}`, looked, `Layout library v2 (${look.name})`, fitHeadings(fitLayoutToTokens(all, looked.tokens), false));
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
// F076: every header layout, in turn on a photo hero or a plain page, with a dropdown, a top bar, and a footer built from blocks.
{
  const chrome = migrateChrome(site, [{ path: "/", title: "Home" }]);
  const menu = [
    { label: "Work", href: "/work" },
    { label: "Studio", href: "/studio", children: [{ label: "Team", href: "/team" }, { label: "Careers", href: "/careers" }] },
    { label: "Journal", href: "/blog" },
    { label: "Visit", href: "", children: [{ label: "Opening hours", href: "/hours" }] },
  ];
  const footerSection = { id: "footer", name: "Footer", savedAt: "2026-11-02T00:00:00Z", content: footerStarter({ ...chrome.footer, style: "dark", text: "Studio Atelier, Keizersgracht 12.", columns: [{ title: "Explore", links: menu.slice(0, 1) }] }, site.name) as Page["puck"]["content"] };
  for (const [i, layout] of headerLayouts.entries()) {
    const looked = applyLook(site.tokens, styleLooks[i % styleLooks.length]!);
    const s: Site = {
      ...site,
      tokens: looked,
      header: { ...chrome.header, layout, menu, cta: { label: "Contact", href: "/contact" }, overHero: i % 2 === 0, sticky: i === 1, topBar: { show: i % 3 === 0, text: "Free delivery over €50", link: { label: "Shop", href: "/shop" }, contact: "+31 20 555 0101", style: "primary" } },
      footer: { ...chrome.footer, kind: i % 2 ? "simple" : "blocks", section: "footer", style: "dark", columns: [{ title: "Explore", links: menu.slice(0, 1) }] },
    };
    const hero = { type: "Section", props: { id: "hero", background: "dark", paddingY: "xl", height: "large", imageSrc: "/sample.jpg", tint: "strong", content: [{ type: "Heading", props: { id: "h1", text: `Header: ${layout}`, level: "h1", align: "left" } }] } };
    await write(`header-v2-${layout}`, s, `Header v2 (${layout})`, [hero, ...sectionsV2Samples(looked).slice(1)] as Page["puck"]["content"], { linkedSections: new Map([["footer", footerSection]]) });
  }
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
// F082: the nine starting designs (post, blog, "Page not found") in every other look (CI time), with a cover photo and a "More posts" list.
{
  const withCover = [{ ...posts[0]!, cover: "/sample.jpg", coverAlt: "Coffee cups on a counter" }, posts[1]!, { ...newPost("Winter loaves", "winter-loaves", "2026-11-02"), description: "Rye and spelt from Friday." }];
  const more = { type: "Section", props: { id: "more", background: "surface", paddingY: "lg", content: [
    { type: "Heading", props: { id: "more-h", text: "More news", level: "h2", align: "left" } },
    { type: "PostList", props: { id: "more-list", look: "cards", columns: "3", count: "3", photo: "yes", date: "yes", summary: "no", titleLevel: "h3" } },
  ] } };
  for (const look of styleLooks.filter((_, i) => i % 2 === 0)) {
    const s: Site = { ...site, tokens: applyLook(site.tokens, look) };
    for (const d of designLayouts) {
      const slug = `design-${d.id}-${look.id}`;
      const design = { kind: d.kind, savedAt: "", content: d.kind === "post" ? [...d.build(), more] : d.build() } as PageDesign;
      await mkdir(join(outDir, slug), { recursive: true });
      const html =
        d.kind === "post"
          ? renderPost(s, withCover[0]!, blog, baseCss, { designs: { post: design }, posts: withCover })
          : d.kind === "blog"
            ? renderBlogIndex(s, withCover, blog, baseCss, { designs: { blog: design } })
            : renderNotFound(s, baseCss, { designs: { notFound: design } });
      await writeFile(join(outDir, slug, "index.html"), html);
    }
  }
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

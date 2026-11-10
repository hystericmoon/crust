/**
 * Start from a template (F048): what applying one replaces, the preview of
 * its pages, and applying and undoing it, on GitHub or in this browser.
 */
import { migrateChrome, type LinkedSectionFile, type Page, type Post, type SavedLayout, type Site, type Template } from "@crust/blocks";
import { renderPage } from "@crust/render";
import { renderPost } from "@crust/render/src/blog";
import { applyTemplateContent, sendTemplatePhotos, undoTemplate } from "../api-client";
import { saveChrome } from "../chrome-store";
import { saveTokens } from "../tokens-store";
import { BASE_KEY, beforeTemplate, bringBackBrowserSite, setAsideBrowserSite, type TemplateBase } from "./local-site";

// --- What it replaces ------------------------------------------------------------------

export interface CurrentSite {
  language: string;
  pages: { title: string }[];
  posts: number;
  sections: string[];
  /** The photo library's file names; null when there's no library (no GitHub). */
  photos: string[] | null;
  /** Pages and posts with changes only in this browser. */
  drafts: number;
}

export interface ReplacePlan {
  replaced: string[];
  kept: string[];
  /** Said under the two lists. */
  notes: string[];
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** "Home, About, Menu" or "Home, About, Menu and 4 more". */
export function nameList(names: string[], max = 5): string {
  if (names.length <= max) return names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names.at(-1)}` : (names[0] ?? "");
  return `${names.slice(0, max).join(", ")} and ${names.length - max} more`;
}

const languageNames = (code: string) => {
  try {
    return new Intl.DisplayNames(["en"], { type: "language" }).of(code) ?? code;
  } catch {
    return code;
  }
};

/** Exactly what "Use this template" changes, worked out from this site, in the words the confirm question uses. */
export function replacePlan(t: Pick<Template, "name" | "site" | "media" | "layouts" | "pages" | "posts">, current: CurrentSite): ReplacePlan {
  const replaced: string[] = [];
  const titles = current.pages.map((p) => p.title);
  replaced.push(titles.length ? `Your ${plural(titles.length, "page")}: ${nameList(titles)}` : "Your pages");
  replaced.push("Colours, fonts and styles", "Header and footer");
  replaced.push(current.posts ? `Your ${plural(current.posts, "blog post")} and the blog’s title` : "The blog’s title and intro");
  if (current.sections.length) replaced.push(`Your linked ${current.sections.length === 1 ? "section" : "sections"} ${nameList(current.sections.map((s) => `“${s}”`))}`);
  if (t.site.language !== current.language) replaced.push(`The site’s language: ${languageNames(current.language)} becomes ${languageNames(t.site.language)}`);
  const clashes = current.photos ? t.media.filter((m) => current.photos!.includes(m.file)).map((m) => m.file) : [];
  if (clashes.length) replaced.push(`${clashes.length === 1 ? "The photo" : "Photos"} ${nameList(clashes)} (the template has photos with the same name)`);

  const kept = ["Your site’s name and address"];
  if (current.photos) kept.push(t.media.length ? `Your photo library (${plural(t.media.length - clashes.length, "photo")} added)` : "Your photo library");
  kept.push(t.layouts.length ? `My layouts (${plural(t.layouts.length, "layout")} added)` : "My layouts");
  kept.push("The live site, until you publish");

  const notes: string[] = [];
  if (current.drafts) notes.push(`${plural(current.drafts, "draft")} only in this browser ${current.drafts === 1 ? "is" : "are"} set aside and ${current.drafts === 1 ? "comes" : "come"} back with your previous site.`);
  if (!current.photos && t.media.length) notes.push(`Saving isn't on here, so the template's ${plural(t.media.length, "photo")} can't join a photo library; pages show empty photo spaces until you pick photos.`);
  return { replaced, kept, notes };
}

/** One line for a gallery card: "5 pages, blog, 9 photos". */
export function templateFacts(t: Pick<Template, "pages" | "posts" | "media" | "sections">): string {
  const parts = [plural(t.pages.length, "page")];
  if (t.posts.length) parts.push(`blog (${plural(t.posts.length, "post")})`);
  if (t.media.length) parts.push(plural(t.media.length, "photo"));
  return parts.join(", ");
}

// --- Preview ---------------------------------------------------------------------------

export type PreviewTarget = { kind: "page"; path: string } | { kind: "post"; slug: string };

/** The template's own site settings, as publishing would see them. */
export const templateSite = (t: Template): Site => ({
  name: t.site.name,
  baseUrl: "https://example.pages.dev",
  language: t.site.language,
  tokens: t.tokens,
  header: t.header,
  footer: t.footer,
});

const PREVIEW_CSS = "<style>[data-crust-placeholder]{outline:2px dashed #b54708;outline-offset:2px}html{scroll-behavior:auto}</style>";

/**
 * A page or post of the template, rendered exactly as publishing renders it.
 * Photos come from inside the template file; sample content is outlined.
 */
export function previewHtml(t: Template, target: PreviewTarget, baseCss: string): string | null {
  const options = {
    pages: t.pages.map((p) => ({ path: p.path, title: p.title })),
    linkedSections: new Map(t.sections.map((s) => [s.id, { ...s, savedAt: t.exportedAt } satisfies LinkedSectionFile])),
  };
  let html: string;
  try {
    if (target.kind === "page") {
      const page = t.pages.find((p) => p.path === target.path);
      if (!page) return null;
      html = renderPage(templateSite(t), page as Page, baseCss, options);
    } else {
      const post = t.posts.find((p) => p.slug === target.slug);
      if (!post) return null;
      html = renderPost(templateSite(t), post, t.blog, baseCss, options);
    }
  } catch {
    return null;
  }
  for (const m of t.media) {
    const type = m.file.endsWith(".png") ? "image/png" : m.file.endsWith(".webp") ? "image/webp" : "image/jpeg";
    html = html.split(`/media/${m.file}`).join(`data:${type};base64,${m.data}`);
  }
  return html.replace("</head>", `${PREVIEW_CSS}</head>`);
}

// --- Applying --------------------------------------------------------------------------

export type ApplyStep = "photos" | "pages" | "done";

/** Photos go a few at a time: each request stays well under the server's limit. */
export function photoBatches<T extends { data: string }>(photos: T[], maxChars = 9 * 1024 * 1024, maxCount = 6): T[][] {
  const batches: T[][] = [];
  let current: T[] = [];
  let size = 0;
  for (const p of photos) {
    if (current.length && (size + p.data.length > maxChars || current.length >= maxCount)) {
      batches.push(current);
      current = [];
      size = 0;
    }
    current.push(p);
    size += p.data.length;
  }
  if (current.length) batches.push(current);
  return batches;
}

/** The template without its photos' bytes: what the apply step sends. */
export const templateContent = (t: Template) => ({
  name: t.name,
  ...(t.id && t.release ? { id: t.id, release: t.release } : {}),
  site: { language: t.site.language, tokens: t.tokens, header: t.header, footer: t.footer },
  pages: t.pages,
  sections: t.sections,
  layouts: t.layouts,
  blog: t.blog,
  posts: t.posts,
  photos: t.media.map((m) => m.file),
  ...(t.designs?.length ? { designs: t.designs } : {}),
});

/** The template's look becomes this browser's working copy of Site settings. */
function adoptTemplateLook(t: Template) {
  saveTokens(t.tokens);
  saveChrome({ header: t.header, footer: t.footer });
}

/** Resolves to null when it worked, or what went wrong in plain words. */
export async function applyOnGitHub(t: Template, onStep: (step: ApplyStep, done?: number, total?: number) => void = () => undefined): Promise<string | null> {
  const batches = photoBatches(t.media);
  let sent = 0;
  for (const batch of batches) {
    onStep("photos", sent, t.media.length);
    const res = await sendTemplatePhotos(t.name, batch.map(({ file, alt, data, focus }) => ({ file, alt, data, ...(focus ? { focus } : {}) })));
    if (!res.ok) return `Nothing was replaced. Adding the photos stopped: ${res.error}${sent ? ` ${plural(sent, "photo")} already joined your photo library.` : ""}`;
    sent += batch.length;
  }
  onStep("pages");
  const res = await applyTemplateContent(templateContent(t));
  if (!res.ok) return `Nothing was replaced. ${res.error}`;
  if (!setAsideBrowserSite(t.name, res.commit)) return "Your site now uses the template, but this browser wouldn't store its copy. Reload the page.";
  adoptTemplateLook(t);
  onStep("done");
  return null;
}

/** Without GitHub: the template replaces the site in this browser only. */
export function applyLocally(t: Template, now = new Date()): string | null {
  const before = beforeTemplate();
  // A second template on top of the first: the site from before both is the one to bring back.
  const original = before && before.commit === null ? before : null;
  if (!original && !setAsideBrowserSite(t.name, null, now)) return "This browser wouldn't store the template. Nothing was replaced.";
  const kept = beforeTemplate()!;
  const savedAt = now.toISOString();
  const previous = (() => {
    try {
      return JSON.parse(kept.saved["crust:my-layouts"] ?? "[]") as SavedLayout[];
    } catch {
      return [];
    }
  })();
  const ids = new Set(previous.map((l) => l.id));
  const added: SavedLayout[] = t.layouts.map((l, i) => {
    let id = `template-${i + 1}`;
    for (let n = 2; ids.has(id); n++) id = `template-${i + 1}-${n}`;
    ids.add(id);
    return { id, name: l.name, kind: l.kind, savedAt, content: l.content as SavedLayout["content"] };
  });
  const base: TemplateBase = { name: t.name, pages: t.pages as Page[], posts: t.posts as Post[], blog: t.blog };
  try {
    for (const key of Object.keys(localStorage)) if (key.startsWith("crust:page:") || key.startsWith("crust:post:")) localStorage.removeItem(key);
    localStorage.setItem(BASE_KEY, JSON.stringify(base));
    localStorage.setItem("crust:sections", JSON.stringify(t.sections.map((s) => ({ ...s, savedAt }))));
    localStorage.setItem("crust:my-layouts", JSON.stringify([...previous, ...added]));
    // F082: the template's designs, as this browser's copies (the site's own were set aside above).
    for (const d of t.designs ?? []) localStorage.setItem(`crust:design:${d.kind}`, JSON.stringify({ design: { ...d, savedAt }, savedToGitHub: false }));
    if (original) localStorage.setItem("crust:before-template", JSON.stringify({ ...original, name: t.name }));
  } catch {
    bringBackBrowserSite();
    return "This browser ran out of room for the template. Nothing was replaced.";
  }
  adoptTemplateLook(t);
  return null;
}

/** Puts the previous site back: on GitHub, the switch's commit undone; here, the copy kept aside. */
export async function bringBack(commit: string | null): Promise<string | null> {
  if (commit === null) return bringBackBrowserSite() ? null : "There's no previous site kept in this browser.";
  const res = await undoTemplate(commit);
  if (!res.ok) return `Your previous site wasn't brought back. ${res.error}`;
  const kept = beforeTemplate();
  if (kept?.commit === commit) bringBackBrowserSite();
  // Site settings as they were, unless this browser had its own unsaved copy.
  if (res.site) {
    try {
      if (!localStorage.getItem("crust:draft:tokens")) saveTokens(res.site.tokens);
      if (!localStorage.getItem("crust:draft:chrome")) saveChrome(migrateChrome(res.site, []));
    } catch {
      // Storage unavailable: the builder falls back to the site it shipped with.
    }
  }
  return null;
}

/**
 * Page designs (F082): the post page, the blog page and "Page not found",
 * designed in the builder like a page (design snapshot option A,
 * design/f082-page-designs-v1.html).
 *
 * content/designs/post.json, blog.json, 404.json:
 *   { "kind": "post", "savedAt": "…", "content": [ …blocks ] }
 * A "notFound" design may also carry "title" (the browser tab's title).
 * A missing file means the built-in look, so sites made before F082 stay
 * the same.
 *
 * Special blocks fill themselves in when published (page-design-blocks.tsx):
 * the post's title, details, summary, cover and its own blocks
 * ("PostContent", exactly once, at the top level); the blog's title, intro
 * and the list of posts.
 *
 * Deep-importable (no React) so the server functions can use it.
 */
import type { ComponentData } from "@puckeditor/core";

export const designKinds = ["post", "blog", "notFound"] as const;
export type DesignKind = (typeof designKinds)[number];
export const isDesignKind = (k: unknown): k is DesignKind => designKinds.includes(k as DesignKind);

export interface PageDesign {
  kind: DesignKind;
  /** notFound only: the page's title (browser tab); "Page not found" when missing. */
  title?: string;
  savedAt: string;
  content: ComponentData[];
}

export const DESIGNS_FOLDER = "content/designs";
const fileNames: Record<DesignKind, string> = { post: "post.json", blog: "blog.json", notFound: "404.json" };
/** content/designs/post.json, …/blog.json, …/404.json */
export const designFile = (kind: DesignKind) => `${DESIGNS_FOLDER}/${fileNames[kind]}`;
/** Same, relative to content/ (for readers given the content folder). */
export const designFileInContent = (kind: DesignKind) => `designs/${fileNames[kind]}`;

/** What the owner calls each one. */
export const designNames: Record<DesignKind, string> = { post: "Post page", blog: "Blog page", notFound: "Page not found" };
export const NOT_FOUND_TITLE = "Page not found";
export const designLimits = { title: 120, blocks: 200 };

/** The blocks that fill themselves in, and the designs they belong to. */
export const designBlocks: Record<string, readonly DesignKind[]> = {
  PostTitle: ["post"],
  PostDetails: ["post"],
  PostSummary: ["post"],
  PostCover: ["post"],
  PostHero: ["post"],
  PostContent: ["post"],
  BlogTitle: ["blog"],
  BlogIntro: ["blog"],
  PostList: ["post", "blog"],
};
export const isDesignBlock = (type: string) => Object.hasOwn(designBlocks, type);
/** Design blocks a design of this kind may use (for the builder's block list). */
export const designBlocksFor = (kind: DesignKind) => Object.keys(designBlocks).filter((t) => designBlocks[t]!.includes(kind));

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** Every block in a list, at any depth (slots are arrays of blocks in props). */
export function allBlocks(items: unknown, out: { block: ComponentData; top: boolean }[] = [], top = true): { block: ComponentData; top: boolean }[] {
  if (!Array.isArray(items)) return out;
  for (const item of items) {
    if (!isObject(item) || typeof item.type !== "string" || !isObject(item.props)) continue;
    out.push({ block: item as unknown as ComponentData, top });
    for (const value of Object.values(item.props)) {
      if (Array.isArray(value) && value.some((v) => isObject(v) && typeof v.type === "string" && isObject(v.props))) allBlocks(value, out, false);
    }
  }
  return out;
}

/**
 * Problems with a design, in the owner's words; empty when it can be saved
 * and published. Unknown block types are left to the page checks.
 */
export function checkDesign(design: unknown): string[] {
  if (!isObject(design)) return ["The design is missing."];
  if (!isDesignKind(design.kind)) return ["That isn't a post, blog or “Page not found” design."];
  const kind = design.kind;
  const name = designNames[kind];
  if (!Array.isArray(design.content)) return [`The ${name} design has no blocks.`];
  const problems: string[] = [];
  if (design.title !== undefined && (typeof design.title !== "string" || design.title.length > designLimits.title)) {
    problems.push(`The page title is longer than ${designLimits.title} characters.`);
  }
  const blocks = allBlocks(design.content);
  if (blocks.length > designLimits.blocks) problems.push(`The ${name} design has more than ${designLimits.blocks} blocks.`);
  for (const { block } of blocks) {
    const allowed = designBlocks[block.type];
    if (allowed && !allowed.includes(kind)) problems.push(`“${blockLabel(block.type)}” can't be used in the ${name} design.`);
  }
  if (kind === "post") {
    const contents = blocks.filter((b) => b.block.type === "PostContent");
    if (contents.length === 0) problems.push("The post page design needs a “Post content” block, where each post's own blocks go.");
    else if (contents.length > 1) problems.push("The post page design has more than one “Post content” block. Keep one.");
    else if (!contents[0]!.top) problems.push("“Post content” can't go inside a section or column. Move it to the page itself.");
  }
  if (kind === "blog" && !blocks.some((b) => b.block.type === "PostList")) {
    problems.push("The blog page design needs a “Post list” block.");
  }
  return [...new Set(problems)];
}

const labels: Record<string, string> = {
  PostTitle: "Post title",
  PostDetails: "Post details",
  PostSummary: "Post summary",
  PostCover: "Cover photo",
  PostHero: "Cover with title",
  PostContent: "Post content",
  BlogTitle: "Blog title",
  BlogIntro: "Blog intro",
  PostList: "Post list",
};
export const blockLabel = (type: string) => labels[type] ?? type;

/** Reads a design file; null for a missing or broken one (the built-in look is used). */
export function parseDesign(text: string | null | undefined, kind: DesignKind): PageDesign | null {
  if (!text) return null;
  try {
    const raw = JSON.parse(text) as unknown;
    if (!isObject(raw) || raw.kind !== kind || checkDesign(raw).length) return null;
    return cleanDesign(raw as unknown as PageDesign);
  } catch {
    return null;
  }
}

/** Only the known fields (the file format is a contract). */
export function cleanDesign(d: PageDesign): PageDesign {
  const title = d.kind === "notFound" && typeof d.title === "string" && d.title.trim() ? d.title.trim() : undefined;
  return { kind: d.kind, ...(title ? { title } : {}), savedAt: typeof d.savedAt === "string" ? d.savedAt : "", content: d.content };
}

export type PageDesigns = Partial<Record<DesignKind, PageDesign>>;

// --- Starting designs (offered in the layout gallery) ---------------------------------------

export interface DesignLayout {
  id: string;
  kind: DesignKind;
  name: string;
  description: string;
  /** Today's look: what the site shows until a design is saved. */
  current?: boolean;
  build: () => ComponentData[];
}

let n = 0;
const id = (type: string) => `${type}-design-${++n}`;
const block = (type: string, props: Record<string, unknown>): ComponentData => ({ type, props: { id: id(type), ...props } }) as ComponentData;
const section = (props: Record<string, unknown>, content: ComponentData[]) =>
  block("Section", { background: "background", paddingY: "lg", height: "auto", valign: "center", imageSrc: "", tint: "medium", ...props, content });
const columns = (props: Record<string, unknown>, column1: ComponentData[], column2: ComponentData[]) =>
  block("Columns", { count: "2", gap: "lg", column1, column2, column3: [], column4: [], ...props });

export const designLayouts: DesignLayout[] = [
  {
    id: "post-classic",
    kind: "post",
    name: "Classic",
    description: "Centred title, date and summary, the cover under them.",
    current: true,
    build: () => [
      section({ width: "narrow", paddingY: "md" }, [
        block("PostDetails", { show: "both", align: "left" }),
        block("PostTitle", { size: "normal", align: "left" }),
        block("PostSummary", { align: "left" }),
        block("PostCover", { ratio: "auto" }),
      ]),
      block("PostContent", {}),
    ],
  },
  {
    id: "post-split",
    kind: "post",
    name: "Split",
    description: "Title beside a tall cover; good for portfolio pieces.",
    build: () => [
      section({ width: "wide", paddingY: "lg" }, [
        columns({ valign: "middle" }, [block("PostDetails", { show: "both", align: "left" }), block("PostTitle", { size: "display", align: "left" }), block("PostSummary", { align: "left" })], [block("PostCover", { ratio: "tall" })]),
      ]),
      block("PostContent", {}),
    ],
  },
  {
    id: "post-cover",
    kind: "post",
    name: "On the photo",
    description: "The cover fills the top, with the title on a dark tint.",
    build: () => [block("PostHero", { height: "large", tint: "strong", align: "left", summary: "yes" }), block("PostContent", {})],
  },
  {
    id: "blog-cards",
    kind: "blog",
    name: "Cards",
    description: "A grid of photo cards, as the blog page is today.",
    current: true,
    build: () => [
      section({ paddingY: "lg" }, [
        block("BlogTitle", { size: "normal", align: "left" }),
        block("BlogIntro", { align: "left" }),
        block("PostList", { look: "cards", columns: "auto", count: "all", photo: "yes", date: "yes", summary: "yes", titleLevel: "h2" }),
      ]),
    ],
  },
  {
    id: "blog-list",
    kind: "blog",
    name: "List",
    description: "One post per row with a small photo and the date.",
    build: () => [
      section({ width: "narrow", paddingY: "lg" }, [
        block("BlogTitle", { size: "display", align: "left" }),
        block("BlogIntro", { align: "left" }),
        block("PostList", { look: "list", columns: "auto", count: "all", photo: "yes", date: "yes", summary: "yes", titleLevel: "h2" }),
      ]),
    ],
  },
  {
    id: "blog-featured",
    kind: "blog",
    name: "Featured",
    description: "The newest post large, the rest as cards.",
    build: () => [
      section({ width: "wide", paddingY: "lg" }, [
        block("BlogTitle", { size: "display", align: "left" }),
        block("BlogIntro", { align: "left" }),
        block("PostList", { look: "featured", columns: "3", count: "all", photo: "yes", date: "yes", summary: "yes", titleLevel: "h2" }),
      ]),
    ],
  },
  {
    id: "not-found-simple",
    kind: "notFound",
    name: "Simple",
    description: "Title, one line and a button to the home page.",
    current: true,
    build: () => [
      section({ paddingY: "xl" }, [
        block("Heading", { text: "Page not found", level: "h1", align: "center", size: "normal", eyebrow: "" }),
        block("Text", { text: "There's no page at this address. It may have moved or been deleted.", align: "center", tone: "muted" }),
        block("Spacer", { size: "sm" }),
        block("Button", { label: "Go to the home page", href: "/", variant: "primary", align: "center" }),
      ]),
    ],
  },
  {
    id: "not-found-helpful",
    kind: "notFound",
    name: "Helpful",
    description: "Ways on: the home page and the site search.",
    build: () => [
      section({ width: "narrow", paddingY: "xl" }, [
        block("Heading", { text: "We couldn't find that page", level: "h1", align: "left", size: "normal", eyebrow: "Page not found" }),
        block("Text", { text: "The address may be mistyped, or the page has moved. Start from the home page, or search the site.", align: "left", tone: "muted" }),
        block("Spacer", { size: "sm" }),
        block("Button", { label: "Go to the home page", href: "/", variant: "primary", align: "left" }),
        block("Button", { label: "Search the site", href: "/search/", variant: "arrow", align: "left" }),
      ]),
    ],
  },
  {
    id: "not-found-statement",
    kind: "notFound",
    name: "Statement",
    description: "A big heading on a dark section.",
    build: () => [
      section({ background: "dark", paddingY: "xl", height: "medium" }, [
        block("Heading", { text: "This page has moved or never was", level: "h1", align: "left", size: "display", eyebrow: "Error 404" }),
        block("Spacer", { size: "sm" }),
        block("Button", { label: "Go to the home page", href: "/", variant: "primary", align: "left" }),
      ]),
    ],
  },
];

export const designLayoutsFor = (kind: DesignKind) => designLayouts.filter((l) => l.kind === kind);
/** The blocks of today's look, where a new design starts. */
export const currentDesign = (kind: DesignKind): ComponentData[] => designLayouts.find((l) => l.kind === kind && l.current)!.build();

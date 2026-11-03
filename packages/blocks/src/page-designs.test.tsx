/** F082: post, blog and "Page not found" designs: the file, its checks, the starting designs and the blocks. */
import type { ComponentData } from "@puckeditor/core";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { config } from "./config";
import { PageDesignContext } from "./page-design-blocks";
import { checkDesign, currentDesign, designBlocksFor, designFile, designLayouts, designLayoutsFor, isDesignBlock, parseDesign } from "./page-designs";

const b = (type: string, props: Record<string, unknown> = {}) => ({ type, props: { id: `${type}-1`, ...props } }) as ComponentData;
const section = (content: ComponentData[]) => b("Section", { background: "background", paddingY: "md", content });
type Render = (p: Record<string, unknown>) => ReactElement;
const render = (type: string, props: Record<string, unknown>) => (config.components as unknown as Record<string, { render: Render; defaultProps: Record<string, unknown> }>)[type]!;
/** A block as a component (its render uses hooks). */
const el = (type: string, props: Record<string, unknown> = {}, editing = false) => {
  const c = render(type, props);
  const Block = c.render;
  return <Block {...c.defaultProps} {...props} puck={{ isEditing: editing }} />;
};
const html = (type: string, props: Record<string, unknown> = {}, editing = false) => renderToStaticMarkup(el(type, props, editing));

describe("design files (F082)", () => {
  it("live in content/designs/", () => {
    expect(designFile("post")).toBe("content/designs/post.json");
    expect(designFile("blog")).toBe("content/designs/blog.json");
    expect(designFile("notFound")).toBe("content/designs/404.json");
  });

  it("a post design needs exactly one Post content, on the page itself", () => {
    expect(checkDesign({ kind: "post", content: [section([b("PostTitle")]), b("PostContent")] })).toEqual([]);
    expect(checkDesign({ kind: "post", content: [b("PostTitle")] })[0]).toMatch(/needs a “Post content” block/);
    expect(checkDesign({ kind: "post", content: [b("PostContent"), b("PostContent")] })[0]).toMatch(/more than one/);
    expect(checkDesign({ kind: "post", content: [section([b("PostContent")])] })[0]).toMatch(/can't go inside a section/);
  });

  it("a blog design needs a Post list; blocks only go in their own designs", () => {
    expect(checkDesign({ kind: "blog", content: [section([b("BlogTitle"), b("PostList")])] })).toEqual([]);
    expect(checkDesign({ kind: "blog", content: [b("BlogTitle")] })).toEqual(["The blog page design needs a “Post list” block."]);
    expect(checkDesign({ kind: "notFound", content: [b("PostTitle")] })).toEqual(["“Post title” can't be used in the Page not found design."]);
    expect(checkDesign({ kind: "blog", content: [b("PostList"), b("PostContent")] })).toContain("“Post content” can't be used in the Blog page design.");
    expect(checkDesign({ kind: "page", content: [] })[0]).toMatch(/isn't a post, blog/);
    expect(checkDesign({ kind: "notFound", content: [], title: "x".repeat(121) })[0]).toMatch(/longer than 120/);
  });

  it("reads only good files of the right kind, and only the known fields", () => {
    const good = JSON.stringify({ kind: "notFound", title: " Oops ", savedAt: "2026-11-03", content: [b("Heading", { level: "h1", text: "Oops" })], extra: 1 });
    expect(parseDesign(good, "notFound")).toEqual({ kind: "notFound", title: "Oops", savedAt: "2026-11-03", content: [b("Heading", { level: "h1", text: "Oops" })] });
    expect(parseDesign(good, "blog")).toBeNull();
    expect(parseDesign("{", "notFound")).toBeNull();
    expect(parseDesign(null, "post")).toBeNull();
    // A title only belongs to "Page not found".
    expect(parseDesign(JSON.stringify({ kind: "blog", title: "x", savedAt: "", content: [b("PostList")] }), "blog")).not.toHaveProperty("title");
  });

  it("nine starting designs, three each, all publishable; today's look marked", () => {
    expect(designLayouts).toHaveLength(9);
    for (const kind of ["post", "blog", "notFound"] as const) {
      expect(designLayoutsFor(kind)).toHaveLength(3);
      expect(designLayoutsFor(kind).filter((l) => l.current)).toHaveLength(1);
    }
    for (const l of designLayouts) expect(checkDesign({ kind: l.kind, content: l.build() }), l.id).toEqual([]);
    // Each build has fresh ids, so a design can be inserted twice in one session.
    expect(currentDesign("post")[0]!.props.id).not.toBe(currentDesign("post")[0]!.props.id);
  });

  it("knows which blocks fill themselves in, and where they go", () => {
    expect(isDesignBlock("PostList")).toBe(true);
    expect(isDesignBlock("Heading")).toBe(false);
    expect(designBlocksFor("blog")).toEqual(["BlogTitle", "BlogIntro", "PostList"]);
    expect(designBlocksFor("notFound")).toEqual([]);
    // Not in the page builder's block list.
    const categories = config.categories as Record<string, { visible?: boolean; components?: string[] }>;
    expect(categories.post!.visible).toBe(false);
    expect(categories.blog!.visible).toBe(false);
  });
});

describe("self-filling blocks (F082)", () => {
  const post = { slug: "a", title: "Winter <loaves>", description: "Rye.", date: "2026-11-02", cover: "", coverAlt: "" };
  const inDesign = (node: ReactElement) => renderToStaticMarkup(<PageDesignContext.Provider value={{ post, posts: [post], blog: { title: "News", intro: "" }, language: "en-GB" }}>{node}</PageDesignContext.Provider>);

  it("show nothing on a published page outside a design", () => {
    for (const type of ["PostTitle", "PostDetails", "PostSummary", "PostCover", "PostHero", "PostContent", "BlogTitle", "BlogIntro", "PostList"]) {
      expect(html(type), type).toBe("");
    }
  });

  it("show sample words while editing (the layout gallery's pictures)", () => {
    expect(html("PostTitle", {}, true)).toContain("A post title, as long as a real one");
    expect(html("PostCover", { ratio: "wide" }, true)).toBe('<div class="cr-post-cover cr-post-cover-empty cr-cover-wide">Cover photo</div>');
    expect(html("PostContent", {}, true)).toContain("Each post&#x27;s own blocks show here");
    expect(html("PostList", {}, true).match(/<li/g)).toHaveLength(3);
  });

  it("fill in the post, escaped", () => {
    expect(inDesign(el("PostTitle", { size: "display", align: "center" }))).toBe('<h1 class="cr-heading cr-h1 cr-display cr-align-center">Winter &lt;loaves&gt;</h1>');
    expect(inDesign(el("PostDetails", { show: "date" }))).toBe('<p class="cr-post-meta cr-align-left"><time dateTime="2026-11-02">2 November 2026</time></p>');
    expect(inDesign(el("PostDetails", { show: "blog" }))).toBe('<p class="cr-post-meta cr-align-left"><a href="/blog/">News</a></p>');
    // A post without a cover shows no cover, and the list says when there's nothing else.
    expect(inDesign(el("PostCover"))).toBe("");
    expect(inDesign(el("PostList"))).toBe('<p class="cr-post-empty">No posts yet.</p>');
  });
});

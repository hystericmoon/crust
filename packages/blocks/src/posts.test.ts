import { describe, expect, it } from "vitest";
import { checkBlog, checkPost, formatPostDate, isBlogPath, isValidDate, isValidSlug, newPost, parseBlog, parsePost, slugFor, slugForFile, sortPosts, today } from "./posts";

describe("blog posts (F035)", () => {
  it("makes addresses from titles, never reusing one", () => {
    expect(slugFor("My first post!", [])).toBe("my-first-post");
    expect(slugFor("Café opening", ["cafe-opening"])).toBe("cafe-opening-2");
    expect(slugFor("???", [])).toBe("post");
    // "feed" is the RSS feed's address.
    expect(slugFor("Feed", [])).toBe("feed-2");
    expect(isValidSlug("feed")).toBe(false);
    expect(isValidSlug("a-")).toBe(false);
    expect(isValidSlug("../x")).toBe(false);
    expect(slugForFile("content/posts/first.json")).toBe("first");
    expect(slugForFile("content/posts/Bad Name.json")).toBeNull();
  });

  it("only accepts real dates", () => {
    expect(isValidDate("2026-10-30")).toBe(true);
    expect(isValidDate("2026-02-30")).toBe(false);
    expect(isValidDate("30/10/2026")).toBe(false);
    expect(today(new Date(2026, 0, 5))).toBe("2026-01-05");
  });

  it("formats dates in the site's language", () => {
    expect(formatPostDate("2026-10-30", "en")).toBe("October 30, 2026");
    expect(formatPostDate("2026-10-30", "en-GB")).toBe("30 October 2026");
    expect(formatPostDate("2026-10-30", "id")).toBe("30 Oktober 2026");
    expect(formatPostDate("nope", "en")).toBe("nope");
  });

  it("sorts newest first, then by title", () => {
    const posts = [
      { date: "2026-01-01", title: "B" },
      { date: "2026-10-30", title: "Z" },
      { date: "2026-01-01", title: "A" },
    ];
    expect(sortPosts(posts).map((p) => p.title)).toEqual(["Z", "A", "B"]);
  });

  it("checks a post before saving", () => {
    expect(checkPost(newPost("Hello", "hello", "2026-10-30"))).toEqual([]);
    const bad = { ...newPost("", "Bad Slug", "2026-13-01"), cover: "/media/a.jpg", coverAlt: " " };
    expect(checkPost(bad)).toEqual([
      "The post address must use lowercase letters, numbers and dashes.",
      "The post needs a title.",
      "The post date must be a real date.",
      "The cover photo needs alt text.",
    ]);
    expect(checkPost(null)).toEqual(["The post is missing."]);
  });

  it("reads post files, filling in a missing cover", () => {
    const { cover: _c, coverAlt: _a, ...old } = newPost("Hello", "hello", "2026-10-30");
    expect(parsePost(JSON.stringify(old))?.cover).toBe("");
    expect(parsePost("{")).toBeNull();
    expect(parsePost(JSON.stringify({ slug: "x" }))).toBeNull();
  });

  it("has a blog list page with a title and intro", () => {
    expect(parseBlog(null)).toEqual({ title: "Blog", intro: "" });
    expect(parseBlog(JSON.stringify({ title: " News ", intro: "From the studio." }))).toEqual({ title: "News", intro: "From the studio." });
    expect(parseBlog(JSON.stringify({ title: "" , intro: "" }))).toEqual({ title: "Blog", intro: "" });
    expect(checkBlog({ title: "x".repeat(61), intro: "" })).toEqual(["The blog title is longer than 60 characters."]);
  });

  it("keeps /blog for posts", () => {
    expect(isBlogPath("/blog")).toBe(true);
    expect(isBlogPath("/blog/x")).toBe(true);
    expect(isBlogPath("/blogging")).toBe(false);
  });
});

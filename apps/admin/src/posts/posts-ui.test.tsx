// @vitest-environment happy-dom
import { config, newPost, type Components } from "@crust/blocks";
import type { Config } from "@puckeditor/core";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parseRoute } from "../App";
import { BlogContext, withPostEditing } from "./editing";
import { checkNewPost, PostList } from "./PostList";
import { fromPuckData, getLocalPost, mergePostRows, saveLocalPost, toPuckData } from "./store";

const api = vi.hoisted(() => ({ listPosts: vi.fn(), savePost: vi.fn(), deletePost: vi.fn(), saveBlog: vi.fn(), getPost: vi.fn() }));
vi.mock("../api-client", async (orig) => ({ ...(await orig<typeof import("../api-client")>()), ...api }));

const summary = (slug: string, title: string, date: string) => ({ slug, title, date, description: "", cover: "", coverAlt: "" });

beforeEach(() => {
  Object.values(api).forEach((f) => f.mockReset());
  localStorage.clear();
  location.hash = "#/posts";
});
afterEach(() => cleanup());

describe("Posts screen (F035)", () => {
  it("lists posts from GitHub newest first, with links to edit them", async () => {
    api.listPosts.mockResolvedValue({ ok: true, posts: [summary("new", "New one", "2026-10-30"), summary("old", "Old one", "2026-01-02")], blog: { title: "News", intro: "" } });
    render(<PostList siteName="Haho" githubOn language="en-GB" />);
    await waitFor(() => expect(screen.getByRole("link", { name: "New one" })).toBeTruthy());
    expect(screen.getByRole("link", { name: "New one" }).getAttribute("href")).toBe("#/post?slug=new");
    expect(screen.getByText("30 October 2026")).toBeTruthy();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect((screen.getByLabelText("Title", { selector: "input[maxlength]" }) as HTMLInputElement).value).toBe("News");
  });

  it("says what to do when there are no posts", async () => {
    render(<PostList siteName="Haho" githubOn={false} language="en" />);
    await waitFor(() => expect(screen.getByText(/No posts yet/)).toBeTruthy());
  });

  it("creates a post: address from the title, then opens it in the builder", async () => {
    api.listPosts.mockResolvedValue({ ok: true, posts: [], blog: { title: "Blog", intro: "" } });
    api.savePost.mockImplementation(async (p) => ({ ok: true, post: p }));
    render(<PostList siteName="Haho" githubOn language="en" />);
    await waitFor(() => expect(screen.getByText(/No posts yet/)).toBeTruthy());
    act(() => fireEvent.click(screen.getByRole("button", { name: "New post" })));
    const title = screen.getAllByLabelText("Title")[0] as HTMLInputElement;
    expect(document.activeElement).toBe(title);
    act(() => fireEvent.change(title, { target: { value: "Opening day!" } }));
    expect((screen.getByLabelText("Address") as HTMLInputElement).value).toBe("opening-day");
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Create and edit" })));
    expect(api.savePost).toHaveBeenCalledWith(expect.objectContaining({ slug: "opening-day", title: "Opening day!" }));
    expect(location.hash).toBe("#/post?slug=opening-day");
    expect(getLocalPost("opening-day")?.savedToGitHub).toBe(true);
  });

  it("explains each problem with a new post and focuses the first", async () => {
    render(<PostList siteName="Haho" githubOn={false} language="en" />);
    act(() => fireEvent.click(screen.getByRole("button", { name: "New post" })));
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Create and edit" })));
    expect(screen.getByText("Add a title.")).toBeTruthy();
    expect(document.activeElement?.getAttribute("aria-invalid")).toBe("true");
    expect(checkNewPost({ title: "A", slug: "a", date: "2026-10-30" }, ["a"]).slug).toBe("There's already a post at /blog/a.");
    expect(checkNewPost({ title: "A", slug: "A B", date: "" }, []).date).toBe("Pick a date.");
  });

  it("deletes a post after asking", async () => {
    api.listPosts.mockResolvedValue({ ok: true, posts: [summary("old", "Old one", "2026-01-02")], blog: { title: "Blog", intro: "" } });
    api.deletePost.mockResolvedValue({ ok: true });
    render(<PostList siteName="Haho" githubOn language="en" />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Delete Old one" })).toBeTruthy());
    act(() => fireEvent.click(screen.getByRole("button", { name: "Delete Old one" })));
    api.listPosts.mockResolvedValue({ ok: true, posts: [], blog: { title: "Blog", intro: "" } });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Delete post" })));
    expect(api.deletePost).toHaveBeenCalledWith("old");
    await waitFor(() => expect(screen.getByText(/Deleted “Old one”/)).toBeTruthy());
  });
});

describe("posts in the builder (F035)", () => {
  it("has its own addresses", () => {
    expect(parseRoute("#/posts")).toEqual({ name: "posts" });
    expect(parseRoute("#/post?slug=opening-day")).toEqual({ name: "post", slug: "opening-day" });
  });

  it("keeps the post's details in the page settings while editing", () => {
    const post = { ...newPost("Hello", "hello", "2026-10-30"), cover: "/media/a.jpg", coverAlt: "A" };
    const data = toPuckData(post);
    expect(data.root.props).toEqual({ title: "Hello", description: "", date: "2026-10-30", cover: "/media/a.jpg", coverAlt: "A" });
    expect(fromPuckData("hello", data)).toEqual(post);
  });

  it("shows the post's top on the canvas, with the post fields", () => {
    const cfg = withPostEditing(config as Config<Components>) as unknown as Config;
    expect(Object.keys(cfg.root!.fields!)).toEqual(["title", "description", "date", "cover", "coverAlt"]);
    const Root = cfg.root!.render as unknown as (p: Record<string, unknown>) => React.ReactElement;
    const html = renderToStaticMarkup(
      <BlogContext.Provider value={{ blog: { title: "News", intro: "" }, language: "en" }}>
        <Root title="Hello" description="Short" date="2026-10-30" cover="" coverAlt="" children={<p>Body</p>} />
      </BlogContext.Provider>,
    );
    expect(html).toContain('<h1 class="cr-heading cr-h1">Hello</h1>');
    expect(html).toContain('<a href="/blog/">News</a>');
    expect(html).toContain("<p>Body</p>");
  });

  it("browser drafts win over GitHub until saved", () => {
    const local = { ...newPost("Draft", "a", "2026-10-30") };
    saveLocalPost(local, false);
    const rows = mergePostRows([summary("a", "On GitHub", "2026-10-01"), summary("b", "B", "2026-01-01")], [{ post: local, updatedAt: "", savedToGitHub: false }]);
    expect(rows.map((r) => [r.slug, r.title, r.localChanges, r.inRepo])).toEqual([
      ["a", "Draft", true, true],
      ["b", "B", false, true],
    ]);
  });
});

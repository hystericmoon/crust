// @vitest-environment happy-dom
import { readFileSync } from "node:fs";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PostList } from "./PostList";

const api = vi.hoisted(() => ({ listPosts: vi.fn(), savePost: vi.fn(), deletePost: vi.fn(), saveBlog: vi.fn(), getPost: vi.fn() }));
vi.mock("../api-client", async (orig) => ({ ...(await orig<typeof import("../api-client")>()), ...api }));

afterEach(() => cleanup());

describe("audit A109: New post form", () => {
  it("marks Title and Address as required in words and shows a worked address example", async () => {
    localStorage.clear();
    location.hash = "#/posts";
    render(<PostList siteName="Haho" githubOn={false} language="en-GB" />);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "New post" })));
    const title = screen.getByLabelText(/^Title \(required\)/);
    expect(title.closest(".pg-field")?.textContent).toContain("(required)");
    expect(title.getAttribute("aria-required")).toBe("true");
    expect(screen.getByLabelText(/^Address \(required\)/).closest(".pg-field")?.textContent).toContain("(required)");
    expect(document.body.textContent).toContain("/blog/my-title/ (an example)");
    expect(document.body.textContent).not.toContain("…/");
    fireEvent.change(title, { target: { value: "Hello world" } });
    expect(document.body.textContent).toContain("/blog/hello-world/.");
    expect(readFileSync("apps/admin/src/posts/posts.css", "utf8")).toMatch(/\.po-form \{[^}]*margin-top: 16px/);
  });
});

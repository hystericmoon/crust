// @vitest-environment happy-dom
import { config, type Components } from "@crust/blocks";
import type { Config } from "@puckeditor/core";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { checkPage } from "../../server/content";
import { fromPuckData, toPuckData } from "../pages/store";
import { seoFromRoot, SharePreview, withSeoEditing } from "./fields";

afterEach(() => cleanup());

const page = { path: "/about", title: "About", description: "Who we are", puck: { root: { props: {} }, content: [] } };

describe("search and sharing in the builder (F036)", () => {
  it("adds the fields to the page settings", () => {
    const cfg = withSeoEditing(config as Config<Components>) as unknown as Config;
    expect(Object.keys(cfg.root!.fields!)).toEqual(["title", "description", "seoTitle", "seoImage", "seoImageAlt", "noindex", "sharePreview"]);
  });

  it("moves the settings in and out of the page file as `seo`, only when set", () => {
    expect(toPuckData(page).root.props).toEqual({ title: "About", description: "Who we are" });
    const withSeo = { ...page, seo: { title: "About Haho", noindex: true } };
    const data = toPuckData(withSeo);
    expect(data.root.props).toMatchObject({ seoTitle: "About Haho", seoImage: "", noindex: true });
    expect(fromPuckData("/about", data)).toEqual(withSeo);
    // Cleared fields leave no `seo` behind.
    const cleared = { ...data, root: { props: { ...data.root.props, seoTitle: "", noindex: false } } };
    expect(fromPuckData("/about", cleared).seo).toBeUndefined();
    expect(seoFromRoot({ sharePreview: undefined, other: 1 }).rest).toEqual({ other: 1 });
  });

  it("previews the search result and the shared link", () => {
    render(<SharePreview input={{ title: "About", description: "Who we are", seoTitle: "", seoImage: "", noindex: false }} baseUrl="https://haho.studio" siteName="Haho" path="/about" />);
    expect(screen.getByText("haho.studio › about")).toBeTruthy();
    expect(screen.getByText("About | Haho")).toBeTruthy();
    expect(screen.getByText(/Add a social image/)).toBeTruthy();
    cleanup();
    render(<SharePreview input={{ title: "About", description: "", seoTitle: "Meet us", seoImage: "/media/a.jpg", noindex: true }} baseUrl="https://haho.studio" siteName="Haho" path="/about" />);
    expect(screen.getByText("Hidden from search engines.")).toBeTruthy();
    expect(screen.getByText("Meet us")).toBeTruthy();
    expect(document.querySelector(".so-card-image")?.getAttribute("src")).toBe("/media/a.jpg");
  });

  it("the server refuses a social image without alt text", () => {
    expect(checkPage({ ...page, seo: { image: "/media/a.jpg" } })).toEqual(["The social image needs a description (alt text)."]);
    expect(checkPage({ ...page, seo: { title: "Fine" } })).toEqual([]);
  });
});

// @vitest-environment happy-dom
// F100: the left menu inside a site, on real screens.
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "../App";
import { groupFromHash } from "../settings/SiteSettings";
import { setAppFrame } from "./AppTopBar";

afterEach(() => {
  cleanup();
  location.hash = "";
  setAppFrame({ desktop: false });
});

describe("F100: the site menu on screens", () => {
  it("Posts screen: the left menu marks Posts and there is no site dropdown", async () => {
    location.hash = "#/posts";
    render(<App />);
    const nav = await screen.findByRole("navigation", { name: "Site" });
    expect(within(nav).getByRole("link", { name: "Posts" }).getAttribute("aria-current")).toBe("page");
    expect(screen.queryByRole("button", { name: /site menu/ })).toBeNull();
  });

  it("Media is a screen of its own", async () => {
    location.hash = "#/media";
    render(<App />);
    expect(await screen.findByRole("heading", { level: 1, name: "Media" })).toBeTruthy();
    expect(within(screen.getByRole("navigation", { name: "Site" })).getByRole("link", { name: "Media" }).getAttribute("aria-current")).toBe("page");
  });

  it("Layout opens Site settings on the header group, Styles on Styles", async () => {
    location.hash = "#/settings?group=header";
    render(<App />);
    const nav = await screen.findByRole("navigation", { name: "Site" });
    expect(within(nav).getByRole("link", { name: "Layout" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("heading", { name: "Header & menu" }).closest("section")?.hasAttribute("hidden")).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Footer" }));
    expect(location.hash).toBe("#/settings?group=footer");
    expect(within(nav).getByRole("link", { name: "Layout" }).getAttribute("aria-current")).toBe("page");
    fireEvent.click(screen.getByRole("button", { name: "Colours" }));
    expect(within(nav).getByRole("link", { name: "Styles" }).getAttribute("aria-current")).toBe("page");
  });

  it("the editor gets the narrow rail", async () => {
    location.hash = "#/edit?path=/";
    render(<App />);
    await screen.findByRole("button", { name: "Undo" }, { timeout: 5000 });
    expect(document.querySelector(".sn-shell-rail .sn-mode-rail")).not.toBeNull();
  });

  it("reads a group from the address", () => {
    expect(groupFromHash("#/settings?group=footer")).toBe("footer");
    expect(groupFromHash("#/settings?group=nope")).toBeNull();
    expect(groupFromHash("#/settings")).toBeNull();
  });
});

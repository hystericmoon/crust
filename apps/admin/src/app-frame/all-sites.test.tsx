// @vitest-environment happy-dom
/** F101: level 1 of the two-level menu (desktop app): Sites, Templates, Settings. */
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AllSitesNav, SiteNav, allCurrent, navMode, takeFocusHeading } from "./SiteNav";
import { AppSettings, TemplatesBrowse } from "../sites/AllSitesViews";

afterEach(() => {
  cleanup();
  location.hash = "";
});

describe("all sites: the level-1 menu", () => {
  it("only the desktop app has it; the web version opens straight into a site", () => {
    expect(navMode("#/sites", true)).toBe("all");
    expect(navMode("#/sites?view=templates", true)).toBe("all");
    expect(navMode("#/sites", false)).toBe("list");
    expect(navMode("#/posts", true)).toBe("list");
  });

  it("has Sites, Templates and Settings in one named landmark, the current one marked", () => {
    render(<AllSitesNav hash="#/sites?view=templates" />);
    const nav = screen.getByRole("navigation", { name: "Crust" });
    const links = within(nav).getAllByRole("link");
    expect(links.slice(0, 3).map((l) => l.textContent)).toEqual(["Sites", "Templates", "Settings"]);
    expect(links.filter((l) => l.getAttribute("aria-current") === "page").map((l) => l.textContent)).toEqual(["Templates"]);
    expect(allCurrent("#/sites")).toBe("sites");
    expect(allCurrent("#/sites?view=settings")).toBe("settings");
  });

  it("asks for focus on the new screen's heading when an item is chosen", () => {
    render(<AllSitesNav hash="#/sites" />);
    takeFocusHeading();
    fireEvent.click(screen.getByRole("link", { name: "Settings" }));
    expect(takeFocusHeading()).toBe(true);
  });

  it("level 2 offers '← All sites' first, in the desktop app only", () => {
    render(<SiteNav mode="list" hash="#/" desktop siteName="Harbour" />);
    const first = within(screen.getByRole("navigation", { name: "Site" })).getAllByRole("link")[0]!;
    expect(first.textContent).toBe("All sites");
    expect(first.getAttribute("href")).toBe("#/sites");
  });
});

describe("all sites: Templates and Settings", () => {
  it("Templates is browsing only: it says where to use one", async () => {
    render(<TemplatesBrowse sources={[{ id: "x", load: async () => ({ template: null, problems: ["no"] }) }]} />);
    expect(screen.getByRole("heading", { level: 1, name: "Templates" })).toBeTruthy();
    expect(screen.getByText(/open a site and choose Start from a template/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /apply|use/i })).toBeNull();
  });

  it("Settings has the app's look setting under its own heading", () => {
    render(<AppSettings />);
    expect(screen.getByRole("heading", { level: 1, name: "Settings" })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 2, name: "Appearance" })).toBeTruthy();
  });
});

// @vitest-environment happy-dom
/** F056: the desktop app's Publish card (design/f056-publish-on-computer-v1.html, A). */
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { BuildReport, LocalPublisher } from "../desktop/local-publish";
import { describeBuild, DesktopPublishPanel, splitProblems } from "./DesktopPublishPanel";

afterEach(cleanup);

const report = (over: Partial<BuildReport> = {}): BuildReport => ({ pages: 8, photos: 10, searchable: 9, redirects: 0, problems: [], ...over });

function publisher(over: Partial<LocalPublisher> = {}): LocalPublisher {
  return {
    preview: vi.fn(async () => ({ url: "http://127.0.0.1:5555/", report: report() })),
    exportSite: vi.fn(async () => ({ result: { status: "done" as const, folder: "/Users/hosni/Desktop/Harbour website" }, report: report() })),
    replaceExport: vi.fn(async () => ({ status: "done" as const, folder: "/Users/hosni/Desktop/Harbour website" })),
    showExport: vi.fn(async () => undefined),
    buildToPublish: vi.fn(async () => report()),
    ...over,
  };
}

const click = async (name: RegExp | string) => {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name }));
  });
};

describe("plain words", () => {
  it("sums up a build", () => {
    expect(describeBuild(report())).toBe("8 pages, 10 photos, search on 9 pages.");
    expect(describeBuild(report({ pages: 1, photos: 0, searchable: 1 }))).toBe("1 page, search on 1 page.");
  });

  it("turns the publish check's message into the card's words", () => {
    const msg = "Nothing was published. Fix these 2 problems on 1 page and publish again:\n  - Page /about/: An image has no description.\n  - Page /about/: Headings skip a level.";
    expect(splitProblems(msg)).toEqual({
      lead: "Nothing was exported. Fix these 2 problems on 1 page and export again:",
      items: ["Page /about/: An image has no description.", "Page /about/: Headings skip a level."],
    });
    expect(splitProblems("Couldn't open your browser.")).toEqual({ lead: "Couldn't open your browser.", items: [] });
  });
});

describe("the app's Publish card", () => {
  it("offers export and preview, and says publishing to a host comes later", () => {
    render(<DesktopPublishPanel publisher={publisher()} siteUrl="https://harbour.example" />);
    expect(screen.getByRole("heading", { name: "Publish" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Export site folder" }).className).toContain("st-button-primary");
    expect(screen.getByRole("button", { name: "Preview in browser (opens your web browser)" })).toBeTruthy();
    expect(screen.getByText(/comes in a later update/)).toBeTruthy();
    expect(screen.queryByText(/address isn't set yet/)).toBeNull();
  });

  it("preview: says it opened, and lists what to fix before exporting", async () => {
    const p = publisher({ preview: vi.fn(async () => ({ url: "x", report: report({ problems: ["Page /about/: An image has no description."] }) })) });
    render(<DesktopPublishPanel publisher={p} siteUrl="https://harbour.example" />);
    await click(/Preview in browser/);
    expect(p.preview).toHaveBeenCalledTimes(1);
    const status = screen.getByRole("status");
    expect(status.textContent).toContain("Opened in your browser. 8 pages, 10 photos, search on 9 pages.");
    expect(status.textContent).toContain("1 thing to fix before you export:");
    expect(status.textContent).toContain("Page /about/: An image has no description.");
  });

  it("export: names the folder and can show it", async () => {
    const p = publisher();
    render(<DesktopPublishPanel publisher={p} siteUrl="https://harbour.example" />);
    await click("Export site folder");
    expect(screen.getByRole("status").textContent).toContain("Exported. 8 pages, 10 photos, search on 9 pages.");
    expect(screen.getByText("/Users/hosni/Desktop/Harbour website")).toBeTruthy();
    expect(screen.getByText(/Upload everything in “Harbour website”/)).toBeTruthy();
    await click("Show the folder");
    expect(p.showExport).toHaveBeenCalledTimes(1);
  });

  it("export: asks before replacing an earlier export, and Cancel leaves it", async () => {
    const p = publisher({ exportSite: vi.fn(async () => ({ result: { status: "exists" as const, folder: "/Users/hosni/Desktop/Harbour website" }, report: report() })) });
    render(<DesktopPublishPanel publisher={p} siteUrl="https://harbour.example" />);
    await click("Export site folder");
    expect(screen.getByRole("heading", { name: "Replace “Harbour website”?" })).toBeTruthy();
    await click("Cancel");
    expect(screen.queryByRole("heading", { name: /Replace/ })).toBeNull();
    expect(p.replaceExport).not.toHaveBeenCalled();
    await click("Export site folder");
    await click("Replace");
    expect(p.replaceExport).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("status").textContent).toContain("Exported.");
  });

  it("a stopped export is an alert listing each problem", async () => {
    const p = publisher({
      exportSite: vi.fn(async () => {
        throw new Error("Nothing was published. Fix this problem on 1 page and publish again:\n  - Page /about/: An image has no description.");
      }),
    });
    render(<DesktopPublishPanel publisher={p} siteUrl="https://harbour.example" />);
    await click("Export site folder");
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("Nothing was exported. Fix this problem on 1 page and export again:");
    expect(alert.querySelectorAll("li")).toHaveLength(1);
  });

  it("a cancelled folder picker changes nothing", async () => {
    const p = publisher({ exportSite: vi.fn(async () => ({ result: { status: "cancelled" as const, folder: "" }, report: report() })) });
    render(<DesktopPublishPanel publisher={p} siteUrl="https://harbour.example" />);
    await click("Export site folder");
    expect(screen.getByRole("status").textContent).toBe("");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("one build at a time", async () => {
    let finish: (v: { url: string; report: BuildReport }) => void = () => undefined;
    const p = publisher({ preview: vi.fn(() => new Promise<{ url: string; report: BuildReport }>((r) => (finish = r))) });
    render(<DesktopPublishPanel publisher={p} siteUrl="https://harbour.example" />);
    await click(/Preview in browser/);
    expect(screen.getByRole("status").textContent).toContain("Building your site");
    expect(screen.getByRole("button", { name: "Export site folder" }).getAttribute("aria-disabled")).toBe("true");
    await click("Export site folder");
    await click(/Preview in browser/);
    expect(p.preview).toHaveBeenCalledTimes(1);
    expect(p.exportSite).not.toHaveBeenCalled();
    await act(async () => finish({ url: "x", report: report() }));
    expect(screen.getByRole("status").textContent).toContain("Opened in your browser.");
  });

  it("points to Site settings while the site's address is the placeholder", () => {
    render(<DesktopPublishPanel publisher={publisher()} siteUrl="https://example.pages.dev/" />);
    expect(screen.getByRole("link", { name: "Site settings → Site address" }).getAttribute("href")).toBe("#/settings");
  });
});

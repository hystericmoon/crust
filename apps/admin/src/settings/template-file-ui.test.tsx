// @vitest-environment happy-dom
import { config, defaultTokens, readTemplate, type Page, type Site } from "@crust/blocks";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { TemplateLoader } from "../templates/collect";
import { SiteSettings } from "./SiteSettings";

const site: Site = { name: "Studio", baseUrl: "https://example.pages.dev", language: "en", tokens: defaultTokens };
const home: Page = { path: "/", title: "Home", description: "Hi", puck: { root: { props: {} }, content: [{ type: "Heading", props: { id: "h", text: "Studio", level: "h1", align: "left" } }] } };

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});
afterEach(() => {
  cleanup();
  localStorage.clear();
});

const loader = (pages: Page[]): TemplateLoader => ({
  pages: async () => pages,
  sections: async () => [],
  blog: async () => ({ blog: { title: "News", intro: "" }, posts: [] }),
  media: async () => [],
  photo: async () => null,
});

function setup(pages: Page[] = [home], githubOn = true) {
  const download = vi.fn();
  // The group reads its download function from the anchor trick; capture it through URL.createObjectURL.
  const blobs: Blob[] = [];
  URL.createObjectURL = vi.fn((b: Blob) => {
    blobs.push(b);
    return "blob:x";
  }) as typeof URL.createObjectURL;
  URL.revokeObjectURL = vi.fn();
  render(
    <SiteSettings
      site={site}
      page={home}
      saved={defaultTokens}
      draft={defaultTokens}
      onChange={() => undefined}
      onSave={async () => "Saved."}
      onDiscard={() => undefined}
      templateLoader={loader(pages)}
      githubOn={githubOn}
    />,
  );
  act(() => fireEvent.click(within(screen.getByRole("navigation", { name: "Style groups" })).getByRole("button", { name: "Template" })));
  return { download, blobs };
}

describe("template-file: Site settings → Save as template (F045)", () => {
  it("has a heading, a named field for the name and description, and one button", () => {
    setup();
    expect(screen.getByRole("heading", { level: 2, name: "Save as template" })).toBeTruthy();
    expect((screen.getByLabelText("Template name") as HTMLInputElement).value).toBe("Studio");
    expect(screen.getByLabelText(/Description/)).toBeTruthy();
    expect(screen.getByText(/300 characters left/)).toBeTruthy();
    expect(screen.queryByText(/sample site that comes with the builder/)).toBeNull();
  });

  it("downloads a file Crust can read back, and says what's in it", async () => {
    const { blobs } = setup();
    act(() => fireEvent.change(screen.getByLabelText(/Description/), { target: { value: "For studios." } }));
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Save as template" })));
    expect(blobs).toHaveLength(1);
    const check = readTemplate(await blobs[0]!.text(), config.components);
    expect(check.problems).toEqual([]);
    expect(check.template).toMatchObject({ name: "Studio", description: "For studios.", pages: [{ path: "/", title: "Home" }] });
    expect(within(document.getElementById("template")!).getByRole("status").textContent).toMatch(/^Saved studio\.crust \(\d+ KB\)\. It's in your Downloads folder\.$/);
    expect(screen.getByRole("heading", { level: 3, name: "In the template" })).toBeTruthy();
    expect(screen.getByText("1 page: Home")).toBeTruthy();
  });

  it("explains why a site can't be a template yet, and downloads nothing", async () => {
    const { blobs } = setup([{ ...home, path: "/about", title: "About" }]);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Save as template" })));
    expect(blobs).toHaveLength(0);
    expect(within(document.getElementById("template")!).getByRole("status").textContent).toBe("Not saved. This site can't be a template yet:");
    expect(screen.getByText("The template needs a Home page (address /).")).toBeTruthy();
  });

  it("says when a preview link uses the sample site", () => {
    setup([home], false);
    expect(screen.getByText(/sample site that comes with the builder/)).toBeTruthy();
  });
});

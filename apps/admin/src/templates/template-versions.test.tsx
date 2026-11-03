// @vitest-environment happy-dom
import { defaultTokens, type Site } from "@crust/blocks";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { readStoreList, readStoreTemplates, storeCatalogue, type StoreTemplate } from "../../../../scripts/store/model";
import { applyChanges, checkTemplateContent, type TemplateContent } from "../../server/template";
import { readCatalogue, templateUpdate, type CatalogueState } from "./catalogue";
import { TemplatesScreen } from "./TemplatesScreen";

describe("template-versions: the site remembers its template (F065)", () => {
  const baseSite = { name: "Mine", baseUrl: "https://example.pages.dev", language: "en", tokens: defaultTokens, template: { id: "old", version: 1 } } as Site;
  const content = (extra: object): TemplateContent =>
    ({ name: "Olive", site: { language: "en", tokens: defaultTokens }, pages: [{ path: "/", title: "Home", description: "", puck: { root: { props: {} }, content: [] } }], sections: [], layouts: [], blog: { title: "News", intro: "" }, posts: [], photos: [], ...extra }) as TemplateContent;
  const current = { site: baseSite, pageFiles: [], sectionFiles: [], postFiles: [], layoutIds: [], redirects: null };
  const siteOf = (c: TemplateContent) => JSON.parse(applyChanges(c, current, new Date()).find((x) => x.path === "content/site.json")!.content!) as Site;

  it("writes the template's id and release into site.json", () => {
    expect(siteOf(content({ id: "olive", release: 2 })).template).toEqual({ id: "olive", version: 2 });
  });

  it("forgets the earlier template when the new one has no id", () => {
    expect(siteOf(content({})).template).toBeUndefined();
  });

  it("refuses a damaged id or release", () => {
    expect(checkTemplateContent(content({ id: "olive" }))).toContain("The template's id or version number is damaged.");
    expect(checkTemplateContent(content({ id: "Olive", release: 1 }))).toContain("The template's id or version number is damaged.");
    expect(checkTemplateContent(content({ id: "olive", release: 2 }))).not.toContain("The template's id or version number is damaged.");
  });
});

describe("template-versions: the update note (F065)", () => {
  const entry = (extra: object) => ({ id: "olive", name: "Olive", description: "", kind: "Restaurant", price: "US$49", url: "https://store.example/templates/olive/", pages: [{ title: "Home", path: "/", pictures: [{ width: "desktop", src: "a.jpg", alt: "Home" }] }], ...extra });
  const read = (extra: object) => readCatalogue({ format: "crust-catalogue", version: 1, templates: [entry(extra)] }, "https://store.example/catalogue.json")!;

  it("reads the release and what changed, strictly", () => {
    const t = read({ version: 3, changes: ["New menu page", "  ", 5, "Fixed the footer"] }).templates[0]!;
    expect(t.version).toBe(3);
    expect(t.changes).toEqual(["New menu page", "Fixed the footer"]);
    expect(read({ version: 0 }).templates[0]!.version).toBeUndefined();
    expect(read({}).templates[0]!.changes).toEqual([]);
  });

  it("notes a newer release only for the template the site started from", () => {
    const c = read({ version: 3, changes: ["New menu page"] });
    expect(templateUpdate({ id: "olive", version: 2 }, c)).toMatchObject({ name: "Olive", from: 2, to: 3, changes: ["New menu page"], url: "https://store.example/templates/olive/" });
    expect(templateUpdate({ id: "olive", version: 3 }, c)).toBeNull();
    expect(templateUpdate({ id: "olive", version: 4 }, c)).toBeNull();
    expect(templateUpdate({ id: "other", version: 1 }, c)).toBeNull();
    expect(templateUpdate(undefined, c)).toBeNull();
    expect(templateUpdate({ id: "olive", version: 1 }, read({}))).toBeNull();
  });
});

describe("template-versions: the note in the gallery (F065)", () => {
  const state: CatalogueState = {
    kind: "ready",
    catalogue: readCatalogue(
      { format: "crust-catalogue", version: 1, templates: [{ id: "olive", name: "Olive", description: "", kind: "Restaurant", price: "US$49", url: "https://store.example/templates/olive/", version: 3, changes: ["New menu page", "Fixed the footer"], pages: [{ title: "Home", path: "/", pictures: [{ width: "desktop", src: "a.jpg", alt: "Home" }] }] }] },
      "https://store.example/catalogue.json",
    )!,
  };
  beforeAll(() => {
    globalThis.ResizeObserver ??= class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;
  });
  afterEach(cleanup);
  async function gallery(startedFrom?: { id: string; version: number }) {
    render(<TemplatesScreen siteName="Bakery" githubOn={false} currentSite={async () => ({ language: "en", pages: [], posts: 0, sections: [], photos: [], drafts: 0 })} sources={[]} premium={async () => state} startedFrom={startedFrom} />);
    await act(async () => undefined);
  }

  it("says what's new, without an alert, and links to the store page", async () => {
    await gallery({ id: "olive", version: 2 });
    expect(screen.getByRole("heading", { level: 2, name: "A newer “Olive” is available" })).toBeTruthy();
    expect(screen.getByText("New menu page")).toBeTruthy();
    expect(screen.getByText("Fixed the footer")).toBeTruthy();
    expect(screen.getByText(/version 2; the store now has version 3/)).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByRole("link", { name: /Open its page in the store/ }).getAttribute("href")).toBe("https://store.example/templates/olive/");
  });

  it("is silent when the site is up to date or didn't start from a template", async () => {
    await gallery({ id: "olive", version: 3 });
    expect(screen.queryByText(/is available/)).toBeNull();
    cleanup();
    await gallery(undefined);
    expect(screen.queryByText(/is available/)).toBeNull();
  });
});

describe("template-versions: the store's catalogue (F065)", () => {
  const entry = { id: "olive", file: "templates/olive.crust", kind: "Restaurants", price: "US$49", buy: "https://pay.example/olive", licence: "One site.", show: ["/"] };
  const list = (e: object) => JSON.stringify({ format: "crust-store", version: 1, templates: [e] });

  it("reads and checks a release's changes from store/list.json", () => {
    expect(readStoreList(list({ ...entry, changes: ["New menu page"] })).list!.templates[0]!.changes).toEqual(["New menu page"]);
    expect(readStoreList(list({ ...entry, changes: [] })).problems[0]).toContain('"changes" should be 1 to 5 short lines');
    expect(readStoreList(list({ ...entry, changes: ["a", "b", "c", "d", "e", "f"] })).problems[0]).toContain('"changes"');
  });

  it("publishes the version and changes the file itself carries", async () => {
    const { makeTemplate, migrateChrome, defaultTokens } = await import("@crust/blocks");
    const { template } = await makeTemplate(
      { name: "Olive", description: "", id: "olive", release: 4 },
      { site: { name: "Olive", language: "en" }, tokens: defaultTokens, chrome: migrateChrome({ name: "Olive" }, [{ path: "/", title: "Home" }]), pages: [{ path: "/", title: "Home", description: "", puck: { root: { props: {} }, content: [] } }], sections: [], layouts: [], blog: { title: "News", intro: "" }, posts: [], media: [] },
      async () => null,
    );
    const item = readStoreList(list({ ...entry, changes: ["New menu page"] })).list!.templates[0]!;
    const entryOut = storeCatalogue([{ item, template } as StoreTemplate]).templates[0]!;
    expect(entryOut).toMatchObject({ id: "olive", version: 4, changes: ["New menu page"] });
    // Files from before F065 have no release: the catalogue says nothing about versions.
    const old = storeCatalogue([{ item, template: { ...template, id: undefined, release: undefined } } as StoreTemplate]).templates[0]!;
    expect("version" in old).toBe(false);
  });

  it("stops a file listed under another id, and a priced template with no release", async () => {
    const { makeTemplate, migrateChrome, defaultTokens } = await import("@crust/blocks");
    const fileWith = async (id?: string, release?: number) =>
      JSON.stringify(
        (
          await makeTemplate(
            { name: "Olive", description: "", id, release },
            { site: { name: "Olive", language: "en" }, tokens: defaultTokens, chrome: migrateChrome({ name: "Olive" }, [{ path: "/", title: "Home" }]), pages: [{ path: "/", title: "Home", description: "", puck: { root: { props: {} }, content: [{ type: "Heading", props: { id: "h", text: "Olive", level: "h1", align: "left" } }] } }], sections: [], layouts: [], blog: { title: "News", intro: "" }, posts: [], media: [] },
            async () => null,
          )
        ).template,
      );
    const read = async (id?: string, release?: number) => {
      const text = await fileWith(id, release);
      return readStoreTemplates(readStoreList(list(entry)).list!, () => text).problems;
    };
    expect(await read("olive", 2)).toEqual([]);
    expect(await read("other", 2)).toEqual(["“olive”: templates/olive.crust says it is “other”."]);
    expect(await read()).toEqual(["“olive”: a priced template needs an id and release number in its file (see F065)."]);
  });
});

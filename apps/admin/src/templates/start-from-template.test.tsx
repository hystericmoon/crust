// @vitest-environment happy-dom
import { config, defaultTokens, linkedBlock, makeTemplate, migrateChrome, readTemplate, type Template, type TemplateSource } from "@crust/blocks";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { bundledPages, contentPages, saveLocalDraft } from "../pages/store";
import { bundledPosts } from "../posts/store";
import { BEFORE_KEY, beforeTemplate } from "./local-site";
import { applyLocally, applyOnGitHub, bringBack, nameList, photoBatches, previewHtml, replacePlan, templateFacts, type CurrentSite } from "./start";
import { TemplateBanner } from "./TemplateBanner";
import { TemplatesScreen } from "./TemplatesScreen";

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
  sessionStorage.clear();
  vi.unstubAllGlobals();
});

function pngBase64(width: number, height: number) {
  const b = new Uint8Array(33);
  b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
  new DataView(b.buffer).setUint32(16, width);
  new DataView(b.buffer).setUint32(20, height);
  return btoa(String.fromCharCode(...b));
}

const heading = (text: string, level = "h1", placeholder?: string[]) => ({ type: "Heading", props: { id: `h-${text}`, text, level, align: "left", ...(placeholder ? { placeholder } : {}) } });
const image = (src: string) => ({ type: "Image", props: { id: `i-${src}`, src, alt: "Boats", caption: "", aspect: "auto" } });

async function harbour(): Promise<Template> {
  const site = { name: "Harbour Studio", language: "en" };
  const source: TemplateSource = {
    site,
    tokens: defaultTokens,
    chrome: migrateChrome({ ...site }, [{ path: "/", title: "Home" }, { path: "/work", title: "Work" }]),
    pages: [
      { path: "/", title: "Home", description: "Welcome.", puck: { root: { props: {} }, content: [heading("Design for the waterfront", "h1", ["text"]), image("/media/harbour.png"), linkedBlock("contact-strip")] } },
      { path: "/work", title: "Work", description: "Our work.", puck: { root: { props: {} }, content: [heading("Work")] } },
    ],
    sections: [{ id: "contact-strip", name: "Contact strip", content: [{ type: "Section", props: { id: "s", background: "dark", content: [heading("Write to us", "h2")] } }] as never }],
    layouts: [{ name: "Studio intro", kind: "section", content: [{ type: "Section", props: { id: "l", background: "surface", content: [] } }] as never }],
    blog: { title: "Journal", intro: "" },
    posts: [{ slug: "opening-day", title: "Opening day", description: "We opened.", date: "2026-10-30", cover: "", coverAlt: "", puck: { root: { props: {} }, content: [] } }],
    media: [{ file: "harbour.png", alt: "Boats in the harbour", width: 1600, height: 900 }],
  };
  const { template } = await makeTemplate({ name: "Harbour", description: "For a studio by the water." }, source, async () => pngBase64(1600, 900));
  const read = readTemplate(JSON.stringify(template), config.components);
  expect(read.problems).toEqual([]);
  return read.template!;
}

const bakery: CurrentSite = { language: "en", pages: [{ title: "Home" }, { title: "About" }, { title: "Menu" }], posts: 2, sections: ["Opening hours"], photos: ["bread.png", "harbour.png"], drafts: 0 };

describe("what applying a template replaces (F048)", () => {
  it("names your own pages, posts and sections, and what stays", async () => {
    const plan = replacePlan(await harbour(), bakery);
    expect(plan.replaced).toEqual([
      "Your 3 pages: Home, About and Menu",
      "Colours, fonts and styles",
      "Header and footer",
      "Your 2 blog posts and the blog’s title",
      "Your linked section “Opening hours”",
      "The photo harbour.png (the template has photos with the same name)",
    ]);
    expect(plan.kept).toEqual(["Your site’s name and address", "Your photo library (0 photos added)", "My layouts (1 layout added)", "The live site, until you publish"]);
    expect(plan.notes).toEqual([]);
  });

  it("says when the language changes, when drafts are set aside, and when photos can't be kept", async () => {
    const t = await harbour();
    const plan = replacePlan({ ...t, site: { ...t.site, language: "id" } }, { ...bakery, photos: null, drafts: 2, sections: [] });
    expect(plan.replaced).toContain("The site’s language: English becomes Indonesian");
    expect(plan.kept).not.toContain("Your photo library");
    expect(plan.notes[0]).toBe("2 drafts only in this browser are set aside and come back with your previous site.");
    expect(plan.notes[1]).toMatch(/template's 1 photo can't join a photo library/);
  });

  it("shortens long lists and sums a template up in a line", async () => {
    expect(nameList(["A", "B", "C", "D", "E", "F", "G"])).toBe("A, B, C, D, E and 2 more");
    expect(nameList(["A"])).toBe("A");
    expect(templateFacts(await harbour())).toBe("2 pages, blog (1 post), 1 photo");
  });
});

describe("the preview (F048)", () => {
  it("renders a page as publishing does, with the template's own photos and linked sections, sample content outlined", async () => {
    const html = previewHtml(await harbour(), { kind: "page", path: "/" }, "")!;
    expect(html).toContain("Design for the waterfront");
    expect(html).toContain("Write to us");
    expect(html).toContain(`src="data:image/png;base64,${pngBase64(1600, 900)}"`);
    expect(html).not.toContain('"/media/harbour.png"');
    expect(html).toContain("data-crust-placeholder");
    expect(html).toContain("[data-crust-placeholder]{outline:2px dashed");
    expect(html).not.toMatch(/<script(?![^>]*application\/ld\+json)/);
  });

  it("renders a post, and nothing for a page that isn't there", async () => {
    const t = await harbour();
    expect(previewHtml(t, { kind: "post", slug: "opening-day" }, "")).toContain("Opening day");
    expect(previewHtml(t, { kind: "page", path: "/nope" }, "")).toBeNull();
  });
});

describe("applying in this browser, and bringing the old site back (F048)", () => {
  it("the template's pages and posts replace the bundled ones; drafts and the look are set aside, then come back", async () => {
    const original = bundledPages().map((p) => p.path);
    saveLocalDraft({ path: "/about", title: "About us", description: "", puck: { root: { props: {} }, content: [] } }, false);
    localStorage.setItem("crust:draft:tokens", JSON.stringify(defaultTokens));
    localStorage.setItem("crust:my-layouts", JSON.stringify([{ id: "mine", name: "Mine", kind: "section", savedAt: "", content: [] }]));

    expect(applyLocally(await harbour())).toBeNull();
    expect(bundledPages().map((p) => p.path)).toEqual(["/", "/work"]);
    expect(contentPages().map((p) => p.path)).toEqual(original);
    expect(bundledPosts().map((p) => p.slug)).toEqual(["opening-day"]);
    expect(localStorage.getItem("crust:page:/about")).toBeNull();
    expect(JSON.parse(localStorage.getItem("crust:sections")!)[0].id).toBe("contact-strip");
    expect(JSON.parse(localStorage.getItem("crust:my-layouts")!).map((l: { name: string }) => l.name)).toEqual(["Mine", "Studio intro"]);
    expect(JSON.parse(localStorage.getItem("crust:draft:chrome")!).header.logo.text).toBe("Harbour Studio");
    expect(beforeTemplate()).toMatchObject({ name: "Harbour", commit: null });

    expect(await bringBack(null)).toBeNull();
    expect(bundledPages().map((p) => p.path)).toEqual(original);
    expect(JSON.parse(localStorage.getItem("crust:page:/about")!).page.title).toBe("About us");
    expect(JSON.parse(localStorage.getItem("crust:my-layouts")!).map((l: { name: string }) => l.name)).toEqual(["Mine"]);
    expect(localStorage.getItem("crust:draft:chrome")).toBeNull();
    expect(localStorage.getItem(BEFORE_KEY)).toBeNull();
  });

  it("a second template on top of the first still brings back the site from before both", async () => {
    saveLocalDraft({ path: "/about", title: "About us", description: "", puck: { root: { props: {} }, content: [] } }, false);
    const t = await harbour();
    applyLocally(t);
    applyLocally({ ...t, name: "Second" });
    expect(beforeTemplate()!.name).toBe("Second");
    await bringBack(null);
    expect(localStorage.getItem("crust:page:/about")).not.toBeNull();
  });
});

describe("applying on GitHub (F048)", () => {
  const ok = (body: unknown) => new Response(JSON.stringify({ ok: true, ...(body as object) }), { headers: { "Content-Type": "application/json" } });

  it("sends the photos first, then the rest without the photos' bytes; keeps the browser's drafts aside", async () => {
    const sent: { action: string; photos?: unknown[]; template?: { photos: string[]; media?: unknown } }[] = [];
    vi.stubGlobal("fetch", vi.fn(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body));
      sent.push(body);
      return ok(body.action === "apply" ? { commit: "abc1234", site: {} } : { files: [] });
    }));
    saveLocalDraft({ path: "/menu", title: "Menu", description: "", puck: { root: { props: {} }, content: [] } }, false);
    const steps: string[] = [];
    expect(await applyOnGitHub(await harbour(), (s) => steps.push(s))).toBeNull();
    expect(sent.map((b) => b.action)).toEqual(["photos", "apply"]);
    expect(sent[0]!.photos).toHaveLength(1);
    expect(sent[1]!.template!.photos).toEqual(["harbour.png"]);
    expect(JSON.stringify(sent[1])).not.toContain(pngBase64(1600, 900));
    expect(steps).toEqual(["photos", "pages", "done"]);
    expect(localStorage.getItem("crust:page:/menu")).toBeNull();
    expect(beforeTemplate()).toMatchObject({ name: "Harbour", commit: "abc1234" });
  });

  it("stops before replacing anything when the photos don't arrive", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ ok: false, error: "GitHub is busy." }), { headers: { "Content-Type": "application/json" } })));
    expect(await applyOnGitHub(await harbour())).toBe("Nothing was replaced. Adding the photos stopped: GitHub is busy.");
    expect(beforeTemplate()).toBeNull();
  });

  it("splits photos into small batches", () => {
    const p = (n: number) => ({ data: "x".repeat(n) });
    expect(photoBatches([p(5), p(5), p(5)], 10).map((b) => b.length)).toEqual([2, 1]);
    expect(photoBatches([p(50), p(1)], 10).map((b) => b.length)).toEqual([1, 1]);
    expect(photoBatches(Array.from({ length: 7 }, () => p(1))).map((b) => b.length)).toEqual([6, 1]);
  });
});

describe("the gallery screen (F048)", () => {
  async function setup(githubOn = false) {
    const t = await harbour();
    const onApplied = vi.fn();
    const currentSite = vi.fn(async () => bakery);
    render(
      <TemplatesScreen
        siteName="Bakery"
        githubOn={githubOn}
        currentSite={currentSite}
        onApplied={onApplied}
        sources={[
          { id: "harbour", load: async () => ({ template: t, problems: [] }) },
          { id: "broken", load: async () => ({ template: null, problems: ["The template has no pages."] }) },
        ]}
      />,
    );
    await act(async () => undefined);
    return { onApplied, currentSite };
  }

  it("lists templates with what's in them, says why a broken one can't be used, and offers to open a file", async () => {
    await setup();
    const list = screen.getByRole("list", { name: "Templates" });
    expect(within(list).getByRole("button", { name: /Harbour.*For a studio by the water\..*2 pages, blog \(1 post\), 1 photo/ })).toBeTruthy();
    expect(within(list).getByText(/This template can't be used: The template has no pages\./)).toBeTruthy();
    expect(screen.getByLabelText(/Open a template file/)).toBeTruthy();
  });

  it("refuses a file that isn't a template, with the reasons", async () => {
    await setup();
    const input = screen.getByLabelText(/Open a template file/) as HTMLInputElement;
    const file = new File(['{"format":"crust-theme-pack"}'], "look.crust");
    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(screen.getByRole("alert").textContent).toMatch(/theme pack \(a look\), not a whole-site template/);
  });

  it("previews every page and post at three widths, and asks before replacing", async () => {
    const { onApplied } = await setup();
    fireEvent.click(screen.getByRole("button", { name: /^Harbour/ }));
    expect(screen.getByRole("heading", { level: 1, name: "Harbour" })).toBe(document.activeElement);
    const nav = screen.getByRole("navigation", { name: "Pages in Harbour" });
    expect(within(nav).getByRole("button", { name: "Home /" }).getAttribute("aria-current")).toBe("page");
    fireEvent.click(within(nav).getByRole("button", { name: "Work /work" }));
    expect(within(nav).getByRole("button", { name: "Work /work" }).getAttribute("aria-current")).toBe("page");
    fireEvent.click(screen.getByRole("button", { name: "Phone" }));
    expect(screen.getByRole("button", { name: "Phone" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByTitle("Harbour: Work, phone width")).toBeTruthy();
    fireEvent.click(within(nav).getByRole("button", { name: "Opening day" }));
    expect(screen.getByTitle("Harbour: Opening day, phone width")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Use this template" }));
    await act(async () => undefined);
    const dialog = screen.getByRole("dialog", { name: "Replace your site with “Harbour”?" });
    expect(within(dialog).getByText("Your 3 pages: Home, About and Menu")).toBeTruthy();
    expect(within(dialog).getByText("The live site, until you publish")).toBeTruthy();
    expect(within(dialog).getByRole("button", { name: "Cancel" })).toBe(document.activeElement);
    // Nothing happens until confirmed.
    expect(localStorage.length).toBe(0);
    fireEvent.click(within(dialog).getByRole("button", { name: "Replace my site" }));
    await act(async () => undefined);
    expect(onApplied).toHaveBeenCalled();
    expect(bundledPages().map((p) => p.path)).toEqual(["/", "/work"]);
    expect(sessionStorage.getItem("crust:template-just")).toBe("Your site now uses the “Harbour” template, in this browser.");
  });

  it("Cancel changes nothing and goes back to the button", async () => {
    await setup();
    fireEvent.click(screen.getByRole("button", { name: /^Harbour/ }));
    fireEvent.click(screen.getByRole("button", { name: "Use this template" }));
    await act(async () => undefined);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await act(async () => new Promise((r) => setTimeout(r, 0)));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("button", { name: "Use this template" })).toBe(document.activeElement);
    expect(localStorage.length).toBe(0);
    fireEvent.click(screen.getByRole("button", { name: "All templates" }));
    await act(async () => new Promise((r) => setTimeout(r, 0)));
    expect(screen.getByRole("button", { name: /^Harbour/ })).toBe(document.activeElement);
  });
});

describe("the banner on the Pages screen (F048)", () => {
  it("says which template the site uses, and brings the previous site back after asking", async () => {
    saveLocalDraft({ path: "/about", title: "About us", description: "", puck: { root: { props: {} }, content: [] } }, false);
    applyLocally(await harbour());
    sessionStorage.setItem("crust:template-just", "Your site now uses the “Harbour” template, in this browser.");
    const onDone = vi.fn();
    render(<TemplateBanner githubOn={false} onDone={onDone} />);
    await act(async () => undefined);
    expect(screen.getByRole("heading", { name: "Your site uses the “Harbour” template" })).toBe(document.activeElement);
    expect(screen.getByRole("status").textContent).toBe("Your site now uses the “Harbour” template, in this browser.");
    fireEvent.click(screen.getByRole("button", { name: "Bring back my previous site" }));
    const dialog = screen.getByRole("dialog", { name: "Bring back the site you had before “Harbour”?" });
    fireEvent.click(within(dialog).getAllByRole("button", { name: "Bring back my previous site" })[0]!);
    await act(async () => undefined);
    expect(onDone).toHaveBeenCalled();
    expect(localStorage.getItem("crust:page:/about")).not.toBeNull();
  });

  it("on GitHub, asks the server which switch can be undone, and shows nothing when none", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ ok: true, last: null }), { headers: { "Content-Type": "application/json" } })));
    const { container } = render(<TemplateBanner githubOn={true} />);
    await act(async () => undefined);
    expect(container.textContent).toBe("");
  });
});

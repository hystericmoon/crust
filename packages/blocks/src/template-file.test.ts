import { describe, expect, it } from "vitest";
import { config } from "./config";
import { migrateChrome } from "./chrome-model";
import { linkedBlock } from "./linked-sections";
import { currentDesign } from "./page-designs";
import { makeTemplate, photosUsed, readTemplate, templateFileName, templateSummary, type TemplateSource } from "./template";
import { defaultTokens } from "./tokens";
import { makeThemePack } from "./theme-pack";

const blocks = config.components;

function pngBase64(width: number, height: number) {
  const b = new Uint8Array(33);
  b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
  new DataView(b.buffer).setUint32(16, width);
  new DataView(b.buffer).setUint32(20, height);
  return btoa(String.fromCharCode(...b));
}

const heading = (text: string, level = "h1") => ({ type: "Heading", props: { id: `h-${text}`, text, level, align: "left" } });
const image = (src: string) => ({ type: "Image", props: { id: `i-${src}`, src, alt: "Boats", caption: "", aspect: "auto" } });

function source(over: Partial<TemplateSource> = {}): TemplateSource {
  const site = { name: "Studio", language: "en" };
  return {
    site,
    tokens: defaultTokens,
    chrome: migrateChrome({ ...site }, [{ path: "/", title: "Home" }]),
    pages: [
      { path: "/", title: "Home", description: "Welcome.", puck: { root: { props: {} }, content: [heading("Studio"), image("/media/harbour.png"), linkedBlock("contact-strip")] } },
      { path: "/about", title: "About", description: "Who we are.", seo: { noindex: true }, puck: { root: { props: {} }, content: [heading("About")] } },
    ],
    sections: [{ id: "contact-strip", name: "Contact strip", content: [{ type: "Section", props: { id: "s", background: "surface", content: [heading("Say hello", "h2")] } }] as never }],
    layouts: [{ name: "Intro", kind: "section", content: [heading("Intro", "h2")] }],
    blog: { title: "News", intro: "" },
    posts: [],
    media: [
      { file: "harbour.png", alt: "Boats in the harbour", width: 1600, height: 900 },
      { file: "unused.png", alt: "Not used", width: 10, height: 10 },
    ],
    ...over,
  };
}

const photo = async (file: string) => (file === "harbour.png" ? pngBase64(1600, 900) : null);

async function made(over: Partial<TemplateSource> = {}) {
  return makeTemplate({ name: "Studio", description: "For small design studios." }, source(over), photo, new Date("2026-10-30T12:00:00Z"));
}

describe("template-file: saving a site as a template (F045)", () => {
  it("holds the whole site, and only the photos it uses", async () => {
    const { template, missing } = await made();
    expect(missing).toEqual([]);
    expect(template).toMatchObject({ format: "crust-template", version: 1, name: "Studio", description: "For small design studios.", exportedAt: "2026-10-30T12:00:00.000Z" });
    expect(template.site).toEqual({ name: "Studio", language: "en" });
    expect(template.pages.map((p) => p.path)).toEqual(["/", "/about"]);
    expect(template.sections.map((s) => s.id)).toEqual(["contact-strip"]);
    expect(template.layouts).toHaveLength(1);
    expect(template.media.map((m) => m.file)).toEqual(["harbour.png"]);
    expect(template.media[0]).toMatchObject({ alt: "Boats in the harbour", width: 1600, height: 900 });
    expect(templateSummary(template)).toEqual(["2 pages: Home, About", "1 linked section: Contact strip", "1 saved layout", "1 photo", "Style, header and footer"]);
    expect(templateFileName("Studio Template")).toBe("studio-template.crust");
  });

  it("finds photos in pages, posts' covers and the header logo", () => {
    const s = source({ posts: [{ slug: "hi", title: "Hi", description: "", date: "2026-10-30", cover: "/media/door.jpg", coverAlt: "Door", puck: { root: { props: {} }, content: [] } }] });
    s.chrome.header.logo.imageSrc = "/media/logo.png";
    expect(photosUsed(s)).toEqual(["door.jpg", "harbour.png", "logo.png"]);
  });

  it("names photos the library can't provide", async () => {
    const { missing } = await made({ media: [] });
    expect(missing).toEqual(["harbour.png"]);
  });
});

describe("template-file: reading a template (F045)", () => {
  it("reads back exactly what was saved", async () => {
    const { template } = await made();
    const check = readTemplate(JSON.stringify(template), blocks);
    expect(check.problems).toEqual([]);
    expect(check.template).toEqual(template);
  });

  it("drops fields Crust doesn't know", async () => {
    const { template } = await made();
    const raw = JSON.parse(JSON.stringify(template));
    raw.script = "alert(1)";
    raw.pages[0].html = "<script>";
    raw.header.onclick = "x";
    const check = readTemplate(JSON.stringify(raw), blocks);
    expect(check.problems).toEqual([]);
    expect(JSON.stringify(check.template)).not.toMatch(/alert|<script>|onclick/);
  });

  it("explains files that aren't templates", () => {
    expect(readTemplate("nope", blocks).problems).toEqual(["This file isn't a Crust template (it couldn't be read)."]);
    expect(readTemplate("{}", blocks).problems).toEqual(["This file isn't a Crust template."]);
    const pack = makeThemePack("Look", { tokens: true, chrome: false, layouts: false }, { tokens: defaultTokens, chrome: { header: { style: "background", sticky: false }, footer: { style: "surface" } }, layouts: [] });
    expect(readTemplate(JSON.stringify(pack), blocks).problems[0]).toMatch(/theme pack/);
    expect(readTemplate(JSON.stringify({ format: "crust-template", version: 2 }), blocks).problems).toEqual(["This template was made by a newer Crust. Update Crust, then try again."]);
  });

  it("refuses the whole file, listing every reason", async () => {
    const { template } = await made();
    const raw = JSON.parse(JSON.stringify(template));
    raw.pages[0].path = "/About Us";
    raw.pages.push({ path: "/blog", title: "Blog", description: "", puck: { root: { props: {} }, content: [] } });
    raw.pages[1].puck.content.push({ type: "Script", props: { src: "x" } });
    raw.sections = [];
    raw.media[0].data = btoa("not an image at all");
    const check = readTemplate(JSON.stringify(raw), blocks);
    expect(check.template).toBeNull();
    expect(check.problems).toEqual(
      expect.arrayContaining([
        "Page “Home” has an address Crust can't use.",
        "Page “Blog” uses /blog, which Crust keeps for the blog or search.",
        "Page “About” has blocks Crust doesn't know, or damaged ones.",
        "The template needs a Home page (address /).",
        "The photo harbour.png is damaged or isn't a JPG, PNG or WebP.",
      ]),
    );
  });

  it("needs every photo and linked section it uses", async () => {
    const { template } = await made();
    const raw = JSON.parse(JSON.stringify(template));
    raw.media = [];
    raw.sections = [];
    expect(readTemplate(JSON.stringify(raw), blocks).problems).toEqual([
      "The photo harbour.png is used but isn't in the template.",
      "The linked section “contact-strip” is used but isn't in the template.",
    ]);
  });

  it("refuses photos without alt text, too big or misnamed", async () => {
    const { template } = await made();
    for (const [change, problem] of [
      [{ alt: "" }, "The photo harbour.png needs a description (alt text)."],
      [{ data: pngBase64(5000, 10) }, "The photo harbour.png is bigger than 2400 pixels."],
      [{ file: "harbour.jpg" }, "The photo harbour.jpg isn't the kind of image its name says."],
    ] as const) {
      const raw = JSON.parse(JSON.stringify(template));
      Object.assign(raw.media[0], change);
      expect(readTemplate(JSON.stringify(raw), blocks).problems, problem).toContain(problem);
    }
  });

  it("refuses a style that's hard to read, and unsafe links", async () => {
    const { template } = await made();
    const raw = JSON.parse(JSON.stringify(template));
    raw.tokens.colors.text = raw.tokens.colors.background;
    raw.header.menu = [{ label: "Bad", href: "javascript:alert(1)" }];
    const problems = readTemplate(JSON.stringify(raw), blocks).problems;
    expect(problems.some((p) => p.startsWith("Contrast:"))).toBe(true);
    expect(problems.some((p) => /can't link to/.test(p))).toBe(true);
  });

  it("refuses files that are too big", () => {
    expect(readTemplate(" ".repeat(60 * 1024 * 1024 + 1), blocks).problems).toEqual(["This file is too big to be a Crust template."]);
  });
});

describe("template-file: header and footer v2 (F076, kept since F084)", () => {
  const v2 = (site: ReturnType<typeof source>) => ({
    header: {
      ...site.chrome.header,
      layout: "stacked" as const,
      overHero: true,
      menu: [{ label: "Shop", href: "/", children: [{ label: "About", href: "/about" }] }],
      topBar: { show: true, text: "Open from 7:00", link: { label: "Menu", href: "/about" }, contact: "+353 1 555 0187", style: "primary" as const },
    },
    footer: { ...site.chrome.footer, kind: "blocks" as const, section: "contact-strip" },
  });

  it("keeps the layout, top bar, dropdowns and a footer made of blocks", async () => {
    const chrome = v2(source());
    const { template } = await made({ chrome });
    const check = readTemplate(JSON.stringify(template), blocks);
    expect(check.problems).toEqual([]);
    expect(check.template!.header).toMatchObject({ layout: "stacked", overHero: true, topBar: chrome.header.topBar });
    expect(check.template!.header.menu[0]!.children).toEqual([{ label: "About", href: "/about" }]);
    expect(check.template!.footer).toMatchObject({ kind: "blocks", section: "contact-strip" });
  });

  it("refuses a footer section that isn't in the file, and an unsafe top bar link", async () => {
    const chrome = v2(source());
    const { template } = await made({ chrome });
    const raw = JSON.parse(JSON.stringify(template));
    raw.footer.section = "gone";
    raw.header.topBar.link.href = "javascript:alert(1)";
    const problems = readTemplate(JSON.stringify(raw), blocks).problems;
    expect(problems).toContain("The linked section “gone” is used but isn't in the template.");
    expect(problems.some((p) => p.startsWith("Top bar"))).toBe(true);
  });

  it("drops unknown fields inside the top bar and menu", async () => {
    const { template } = await made({ chrome: v2(source()) });
    const raw = JSON.parse(JSON.stringify(template));
    raw.header.topBar.onclick = "x";
    raw.header.menu[0].children[0].script = "alert(1)";
    expect(JSON.stringify(readTemplate(JSON.stringify(raw), blocks).template)).not.toMatch(/onclick|alert/);
  });
});

describe("template-file: page designs (F082)", () => {
  const blogDesign = { kind: "blog" as const, content: currentDesign("blog") };
  const photoPost = { kind: "post" as const, content: [...currentDesign("post"), { type: "Image", props: { id: "i-d", src: "/media/harbour.png", alt: "Boats", caption: "" } }] as never };

  it("go into the template with the photos they use, and come back out", async () => {
    const { template } = await made({ designs: [blogDesign, photoPost], media: [{ file: "harbour.png", alt: "Boats in the harbour", width: 1600, height: 900 }] });
    expect(template.designs!.map((d) => d.kind)).toEqual(["blog", "post"]);
    expect(photosUsed({ ...source(), pages: [], designs: [photoPost] })).toEqual(["harbour.png"]);
    const back = readTemplate(JSON.stringify(template), blocks);
    expect(back.problems).toEqual([]);
    expect(back.template!.designs!.map((d) => d.kind)).toEqual(["blog", "post"]);
    // Templates without designs read as before, with none.
    expect(readTemplate(JSON.stringify((await made()).template), blocks).template).not.toHaveProperty("designs");
  });

  it("a design that can't be published, or two of one kind, refuse the file", async () => {
    const { template } = await made();
    const bad = { ...template, designs: [{ kind: "post", content: [] }] };
    expect(readTemplate(JSON.stringify(bad), blocks).problems).toContain("Post page design: The post page design needs a “Post content” block, where each post's own blocks go.");
    const twice = { ...template, designs: [blogDesign, blogDesign] };
    expect(readTemplate(JSON.stringify(twice), blocks).problems).toContain("The template has two Blog page designs.");
    const other = { kind: "notFound", content: [{ type: "Image", props: { id: "i-x", src: "/media/door.png", alt: "Door", caption: "" } }] };
    expect(readTemplate(JSON.stringify({ ...template, designs: [other] }), blocks).problems).toContain("The photo door.png is used but isn't in the template.");
  });
});

describe("template-versions: a template's id and release (F065)", () => {
  const withRelease = async (id?: string, release?: number) => (await makeTemplate({ name: "Olive", description: "", id, release }, source(), photo, new Date("2026-11-03T00:00:00Z"))).template;

  it("carries an id and release number, and reads them back", async () => {
    const t = await withRelease("olive", 3);
    expect(t).toMatchObject({ format: "crust-template", version: 1, id: "olive", release: 3 });
    const read = readTemplate(JSON.stringify(t), blocks);
    expect(read.problems).toEqual([]);
    expect(read.template).toMatchObject({ id: "olive", release: 3 });
  });

  it("still opens files made before ids and releases", async () => {
    const t = await withRelease();
    expect("id" in t || "release" in t).toBe(false);
    const read = readTemplate(JSON.stringify(t), blocks);
    expect(read.problems).toEqual([]);
    expect(read.template?.id).toBeUndefined();
  });

  it("leaves both out unless both are valid", async () => {
    expect("id" in (await withRelease("olive"))).toBe(false);
    expect("release" in (await withRelease("Bad Id", 2))).toBe(false);
  });

  it("refuses a damaged id or release", async () => {
    const t = await withRelease("olive", 3);
    for (const bad of [{ id: "Olive!" }, { release: 0 }, { release: 1.5 }, { release: "2" }, { id: undefined }, { release: undefined }]) {
      const file = JSON.stringify({ ...t, ...bad });
      expect(readTemplate(file, blocks).template).toBeNull();
    }
  });
});

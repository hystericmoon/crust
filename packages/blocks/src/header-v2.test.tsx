import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  contactHref,
  defaultHeader,
  defaultFooter,
  DROPDOWN_SCRIPT,
  footerStarter,
  hasDropdowns,
  headerLayouts,
  layoutOf,
  migrateChrome,
  SiteHeaderView,
  validateChrome,
  type SiteHeader,
} from "./chrome";
import { heroStyle } from "./sections-v2";

const pages = [
  { path: "/", title: "Home" },
  { path: "/work", title: "Work" },
  { path: "/studio", title: "Studio" },
  { path: "/journal", title: "Journal" },
];
const base: SiteHeader = { ...defaultHeader("Atelier", pages), cta: { label: "Contact", href: "/contact" } };
const draw = (h: Partial<SiteHeader>, path = "/") => renderToStaticMarkup(<SiteHeaderView header={{ ...base, ...h }} path={path} />);
const studio = { label: "Studio", href: "/studio", children: [{ label: "Team", href: "/team" }, { label: "Careers", href: "/careers" }] };

describe("header v2: headers saved before F076", () => {
  it("render exactly as before (classic layout, fold-down phone menu)", () => {
    const html = draw({});
    expect(html).toBe(draw({ layout: "classic", overHero: false }));
    expect(html).toContain('<header class="cr-site-header cr-style-background">');
    expect(html).toContain('<details class="cr-nav-phone"><summary>Menu</summary>');
    expect(html).not.toMatch(/cr-topbar|cr-header-(centred|stacked|split|left|button)|cr-nav-panel|cr-dropdown/);
    expect(layoutOf({})).toBe("classic");
    expect(layoutOf({ layout: "zigzag" as never })).toBe("classic");
  });
});

describe("header v2: layouts", () => {
  it("each layout adds its class; all but classic get the side panel on phones", () => {
    for (const l of headerLayouts.filter((x) => x !== "classic")) {
      const html = draw({ layout: l });
      expect(html).toContain(`cr-header-${l}`);
      expect(html).toContain('<details class="cr-nav-phone cr-nav-panel"><summary><span class="cr-menu-open">Menu</span><span class="cr-menu-close">Close</span></summary>');
    }
  });

  it("split puts the logo between the two halves of the menu, in reading order too", () => {
    const html = draw({ layout: "split" });
    const nav = html.slice(html.indexOf('<nav class="cr-nav cr-nav-wide"'), html.indexOf("</nav>"));
    // The menu is Home, Journal, Studio, Work (pages by address).
    const order = [">Home<", ">Journal<", 'class="cr-logo cr-logo-split"', ">Studio<", ">Work<"].map((t) => nav.indexOf(t));
    expect(order.every((n, i) => n > -1 && (i === 0 || n > order[i - 1]!))).toBe(true);
    // The phone row keeps its own logo (hidden on wide screens).
    expect(html).toContain('class="cr-logo cr-logo-phone"');
  });

  it("menu button only: no wide menu; the button stays beside the Menu button, not in the panel", () => {
    const html = draw({ layout: "button" });
    expect(html).not.toContain("cr-nav-wide");
    expect(html.match(/cr-header-cta/g)).toHaveLength(1);
    expect(html.indexOf("cr-header-cta")).toBeLessThan(html.indexOf("cr-nav-phone"));
  });

  it("one navigation per screen size, each named Main", () => {
    const html = draw({ layout: "centred", menu: [studio] });
    expect(html.match(/<nav class="cr-nav[^"]*" aria-label="Main">/g)).toHaveLength(2);
  });
});

describe("header v2: dropdowns", () => {
  it("are disclosures on wide screens, one open at a time, with the parent's own page first", () => {
    const html = draw({ menu: [{ label: "Work", href: "/work" }, studio] }, "/team");
    expect(html).toContain(
      '<li class="cr-has-dropdown"><details class="cr-dropdown" name="cr-menu"><summary class="cr-current">Studio</summary><ul class="cr-submenu"><li><a href="/studio">Studio</a></li><li><a href="/team" aria-current="page">Team</a></li>',
    );
    // The phone panel lists them under the label, without another button to press.
    expect(html).toContain('<li class="cr-has-dropdown"><span class="cr-menu-group cr-current">Studio</span><ul class="cr-submenu">');
    expect(hasDropdowns({ ...base, menu: [studio] })).toBe(true);
    expect(hasDropdowns(base)).toBe(false);
  });

  it("a dropdown without its own page has no extra link", () => {
    const html = draw({ menu: [{ ...studio, href: "" }] });
    expect(html).not.toContain('href="#"');
    expect(html).toContain('<summary>Studio</summary><ul class="cr-submenu"><li><a href="/team">Team</a></li>');
  });

  it("the optional script only closes things (Escape, click outside)", () => {
    expect(DROPDOWN_SCRIPT).toContain('e.key!=="Escape"');
    expect(DROPDOWN_SCRIPT).not.toMatch(/innerHTML|fetch|open=true/);
  });

  it("are checked: one level deep, at most 8 links, and a dropdown needs no address of its own", () => {
    expect(validateChrome({ header: { ...base, menu: [{ ...studio, href: "" }] } })).toEqual([]);
    const deep = { ...studio, children: [{ label: "Team", href: "/team", children: [{ label: "X", href: "/x" }] }] };
    expect(validateChrome({ header: { ...base, menu: [deep] } }).map((p) => p.message)).toContain('Menu: dropdowns go one level deep only ("Studio").');
    const many = { ...studio, children: Array.from({ length: 9 }, (_, i) => ({ label: `L${i}`, href: `/l${i}` })) };
    expect(validateChrome({ header: { ...base, menu: [many] } }).map((p) => p.message)).toContain('Dropdown "Studio": keep it to 8 links.');
    expect(validateChrome({ header: { ...base, menu: [{ ...studio, children: [{ label: "Bad", href: "javascript:alert(1)" }] }] } }).length).toBe(1);
  });
});

describe("header v2: top bar", () => {
  const bar = { show: true, text: "Free delivery over €50", link: { label: "Shop", href: "/shop" }, contact: "+31 20 555 0101", style: "primary" as const };

  it("sits inside the header, in its own section style, with the contact linked", () => {
    const html = draw({ topBar: bar });
    expect(html).toContain(
      '<div class="cr-topbar cr-style-primary"><div class="cr-container cr-topbar-inner"><p class="cr-topbar-text">Free delivery over €50 <a href="/shop">Shop</a></p><a class="cr-topbar-contact" href="tel:+31205550101">+31 20 555 0101</a></div></div>',
    );
    expect(draw({ topBar: { ...bar, show: false } })).not.toContain("cr-topbar");
  });

  it("links phone numbers and emails, and leaves other text alone", () => {
    expect(contactHref("hello@atelier.nl")).toBe("mailto:hello@atelier.nl");
    expect(contactHref("(020) 555-0101")).toBe("tel:0205550101");
    expect(contactHref("Open daily")).toBeNull();
  });

  it("is checked and filled in", () => {
    expect(validateChrome({ header: { ...base, topBar: { ...bar, text: "", contact: "", link: { label: "", href: "" } } } }).map((p) => p.message)).toEqual([
      "Top bar: write a short message, a link or a phone number or email, or turn it off.",
    ]);
    expect(validateChrome({ header: { ...base, topBar: { ...bar, link: { label: "Shop", href: "javascript:x" } } } })[0]?.path).toBe("header.topBar.link.href");
    expect(migrateChrome({ name: "A", header: { topBar: { show: true, text: "Hi" } as never } }, pages).header.topBar).toEqual({
      show: true,
      text: "Hi",
      link: { label: "", href: "" },
      contact: "",
      style: "primary",
    });
  });
});

describe("header v2: clear on a hero photo", () => {
  it("finds a first section with a photo or video that shows on every screen", () => {
    const section = (props: Record<string, unknown>) => [{ type: "Section", props: { background: "dark", ...props } }];
    expect(heroStyle(section({ imageSrc: "/media/a.jpg" }))).toBe("dark");
    expect(heroStyle(section({ bgKind: "video", imageSrc: "/media/a.jpg", videoSrc: "/v.mp4" }))).toBe("dark");
    expect(heroStyle(section({}))).toBeNull();
    expect(heroStyle(section({ bgKind: "gradient", imageSrc: "/media/a.jpg" }))).toBeNull();
    expect(heroStyle(section({ imageSrc: "/media/a.jpg", hideOn: ["phone"] }))).toBeNull();
    expect(heroStyle([{ type: "Heading", props: {} }])).toBeNull();
  });
});

describe("footer v2: built from blocks", () => {
  it("is checked: it needs a linked section", () => {
    expect(validateChrome({ footer: { ...defaultFooter, kind: "blocks" } }).map((p) => p.path)).toEqual(["footer.section"]);
    expect(validateChrome({ footer: { ...defaultFooter, kind: "blocks", section: "footer" } })).toEqual([]);
    expect(validateChrome({ footer: { ...defaultFooter, kind: "fancy" as never } })[0]?.path).toBe("footer.kind");
  });

  it("starts from the simple footer, so nothing is lost", () => {
    const [section] = footerStarter(
      { ...defaultFooter, style: "dark", text: "Studio Atelier", columns: [{ title: "Visit", links: [{ label: "Map", href: "/map" }] }] },
      "Atelier",
    );
    expect(section!.props.background).toBe("dark");
    const cols = (section!.props.content as { type: string; props: Record<string, unknown> }[])[0]!;
    expect(cols.type).toBe("Columns");
    expect(cols.props.count).toBe("2");
    expect(JSON.stringify(cols.props.column1)).toContain("Studio Atelier");
    expect(JSON.stringify(cols.props.column2)).toContain('"items":[[{"text":"Map","href":"/map"}]]');
    expect(JSON.stringify(cols.props.column2)).toContain('"level":"h2"');
    // No columns: just the text, with the site's name when there's none.
    expect(JSON.stringify(footerStarter(defaultFooter, "Atelier"))).toContain('"text":"Atelier"');
  });
});

import { describe, expect, it } from "vitest";
import { defaultFooter, menuFromPages, migrateChrome, validateChrome, type SiteChrome } from "./chrome";

const pages = [
  { path: "/work", title: "Selected work" },
  { path: "/", title: "Welcome" },
  { path: "/about", title: "About us" },
];

describe("header and footer: sites saved before F031", () => {
  it("get the site name as logo, the pages as the menu (Home first) and a copyright line", () => {
    const { header, footer } = migrateChrome({ name: "Haho" }, pages);
    expect(header.show).toBe(true);
    expect(header.logo).toEqual({ text: "Haho", imageSrc: "", imageAlt: "" });
    expect(header.menu).toEqual([
      { label: "Home", href: "/" },
      { label: "About us", href: "/about" },
      { label: "Selected work", href: "/work" },
    ]);
    expect(header.cta.label).toBe("");
    expect(header.sticky).toBe(false);
    expect(footer).toEqual(defaultFooter);
    expect(footer.copyright).toBe("© {year} {name}");
  });

  it("keep saved values and fill only what's missing", () => {
    const { header, footer } = migrateChrome({ name: "Haho", header: { sticky: true, logo: { text: "HH" } as never }, footer: { text: "Hi" } }, pages);
    expect(header.sticky).toBe(true);
    expect(header.logo).toEqual({ text: "HH", imageSrc: "", imageAlt: "" });
    expect(header.menu).toHaveLength(3);
    expect(footer.text).toBe("Hi");
    expect(footer.copyright).toBe("© {year} {name}");
  });

  it("suggest at most six menu links", () => {
    const many = Array.from({ length: 9 }, (_, i) => ({ path: `/p${i}`, title: `P${i}` }));
    expect(menuFromPages(many)).toHaveLength(6);
  });
});

describe("header and footer: checks", () => {
  const ok = migrateChrome({ name: "Haho" }, pages);
  const withHeader = (patch: Partial<SiteChrome["header"]>): SiteChrome => ({ ...ok, header: { ...ok.header, ...patch } });

  it("pass for the defaults", () => {
    expect(validateChrome(ok)).toEqual([]);
    expect(validateChrome({})).toEqual([]);
  });

  it("need alt text for a logo image, and a name or image for the logo", () => {
    expect(validateChrome(withHeader({ logo: { text: "", imageSrc: "/logo.svg", imageAlt: "" } })).map((p) => p.path)).toEqual(["header.logo.imageAlt"]);
    expect(validateChrome(withHeader({ logo: { text: " ", imageSrc: "", imageAlt: "" } })).map((p) => p.path)).toEqual(["header.logo.text"]);
  });

  it("need a label and a safe address for every menu link, and at most 8 links", () => {
    const problems = validateChrome(withHeader({ menu: [{ label: "", href: "/a" }, { label: "Evil", href: "javascript:alert(1)" }, { label: "Blank", href: "" }] }));
    expect(problems.map((p) => p.path)).toEqual(["header.menu.0.label", "header.menu.1.href", "header.menu.2.href"]);
    expect(problems[1]!.message).toContain("can't link to");
    const nine = Array.from({ length: 9 }, (_, i) => ({ label: `L${i}`, href: `/l${i}` }));
    expect(validateChrome(withHeader({ menu: nine }))[0]!.message).toBe("Menu: keep it to 8 links.");
  });

  it("need an address for a header button with a label, and a known style", () => {
    expect(validateChrome(withHeader({ cta: { label: "Contact", href: "" } }))[0]!.path).toBe("header.cta.href");
    expect(validateChrome(withHeader({ style: "neon" as never }))[0]!.path).toBe("header.style");
  });

  it("check footer columns, text length and style", () => {
    const footer = { ...ok.footer, columns: [{ title: "", links: [{ label: "Mail", href: "mailto:hi@example.com" }] }], text: "x".repeat(301), style: "neon" as never };
    expect(validateChrome({ footer }).map((p) => p.path)).toEqual(["footer.columns.0.title", "footer.text", "footer.style"]);
    const five = Array.from({ length: 5 }, (_, i) => ({ title: `C${i}`, links: [] }));
    expect(validateChrome({ footer: { ...ok.footer, columns: five } })[0]!.message).toBe("Footer: keep it to 4 columns.");
    expect(validateChrome({ footer: { columns: "x" } })[0]!.message).toBe("Footer: the columns are damaged.");
  });
});

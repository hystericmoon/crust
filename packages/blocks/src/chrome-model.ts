/**
 * Site header, menu and footer data (F031): types, defaults, migration and
 * checks. No JSX, so the save functions can check a site without React.
 * The views are in chrome.tsx.
 */
import { sectionStyleIds, type SectionStyleId } from "./section-styles";
import { safeUrl } from "./url";

export interface MenuLink {
  label: string;
  href: string;
  /** F076: a dropdown, one level deep (header menu only). Missing = a plain link. */
  children?: MenuLink[];
}

/** F076: six header layouts; missing = classic, the header before F076. */
export const headerLayouts = ["classic", "centred", "stacked", "split", "left", "button"] as const;
export type HeaderLayout = (typeof headerLayouts)[number];
export const headerLayoutNames: Record<HeaderLayout, string> = {
  classic: "Classic",
  centred: "Centred menu",
  stacked: "Logo on top",
  split: "Split",
  left: "Left together",
  button: "Menu button only",
};
export const headerLayoutHelp: Record<HeaderLayout, string> = {
  classic: "Logo left, menu and button right.",
  centred: "Logo left, menu in the middle, button right.",
  stacked: "Centred logo with the menu underneath.",
  split: "Logo in the middle, the menu split on both sides. Best with four to six links.",
  left: "The menu right after the logo, the button far right.",
  button: "Only a Menu button, on every screen, opening a side panel.",
};

/** F076: a thin strip above the header. */
export interface TopBar {
  show: boolean;
  text: string;
  link: MenuLink;
  /** A phone number or email address on the right; linked when it is one. */
  contact: string;
  style: SectionStyleId;
}
export const defaultTopBar: TopBar = { show: false, text: "", link: { label: "", href: "" }, contact: "", style: "primary" };

export interface SiteHeader {
  show: boolean;
  logo: { text: string; imageSrc: string; imageAlt: string };
  menu: MenuLink[];
  /** A button at the end of the menu; hidden while its label is empty. */
  cta: MenuLink;
  sticky: boolean;
  style: SectionStyleId;
  /** A "Search" link to the site search page (F039). Optional: off for older sites. */
  search?: boolean;
  /** F076 (all optional; headers without them look as before). */
  layout?: HeaderLayout;
  /** Sit clear on every page whose first section has a photo or video background. */
  overHero?: boolean;
  topBar?: TopBar;
}

export interface FooterColumn {
  title: string;
  links: MenuLink[];
}

export interface SiteFooter {
  show: boolean;
  /** A short line about the site, first column. */
  text: string;
  columns: FooterColumn[];
  /** "{year}" and "{name}" are filled in when the page is published. */
  copyright: string;
  style: SectionStyleId;
  /** F076: "blocks" shows a linked section (`section`, its id) instead of the columns. Missing = simple. */
  kind?: "simple" | "blocks";
  section?: string;
}

export interface SiteChrome {
  header: SiteHeader;
  footer: SiteFooter;
}

export const chromeLimits = { menu: 8, columns: 4, links: 8, label: 40, text: 300, copyright: 200, children: 8, topBar: 120 } as const;

/** The header's layout, classic when missing or unknown. */
export const layoutOf = (h: Pick<SiteHeader, "layout">): HeaderLayout => (h.layout && (headerLayouts as readonly string[]).includes(h.layout) ? h.layout : "classic");

/** Whether a contact line is an email address or a phone number, and its link. */
export function contactHref(contact: string): string | null {
  const c = contact.trim();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c)) return `mailto:${c}`;
  const digits = c.replace(/[\s().-]/g, "");
  if (/^\+?\d{6,15}$/.test(digits)) return `tel:${digits}`;
  return null;
}

/** The menu Crust suggests: Home first, then the other pages by address. */
export function menuFromPages(pages: { path: string; title: string }[]): MenuLink[] {
  const sorted = [...pages].sort((a, b) => (a.path === "/" ? -1 : b.path === "/" ? 1 : a.path.localeCompare(b.path)));
  return sorted.slice(0, 6).map((p) => ({ label: p.path === "/" ? "Home" : p.title.slice(0, chromeLimits.label), href: p.path }));
}

export function defaultHeader(siteName: string, pages: { path: string; title: string }[]): SiteHeader {
  return {
    show: true,
    logo: { text: siteName, imageSrc: "", imageAlt: "" },
    menu: menuFromPages(pages),
    cta: { label: "", href: "" },
    sticky: false,
    style: "background",
  };
}

export const defaultFooter: SiteFooter = { show: true, text: "", columns: [], copyright: "© {year} {name}", style: "surface" };

/** Header and footer of any site, old or new: saved values over defaults. */
export function migrateChrome(
  site: { name: string; header?: Partial<SiteHeader>; footer?: Partial<SiteFooter> },
  pages: { path: string; title: string }[],
): SiteChrome {
  const h = defaultHeader(site.name, pages);
  return {
    header: {
      ...h,
      ...site.header,
      logo: { ...h.logo, ...site.header?.logo },
      cta: { ...h.cta, ...site.header?.cta },
      ...(site.header?.topBar ? { topBar: { ...defaultTopBar, ...site.header.topBar, link: { ...defaultTopBar.link, ...site.header.topBar.link } } } : {}),
    },
    footer: { ...defaultFooter, ...site.footer },
  };
}

export interface ChromeProblem {
  path: string;
  message: string;
}

const isStr = (v: unknown): v is string => typeof v === "string";

function checkLinks(list: unknown, path: string, what: string, max: number): ChromeProblem[] {
  if (!Array.isArray(list)) return [{ path, message: `${what}: the list is damaged.` }];
  const problems: ChromeProblem[] = [];
  if (list.length > max) problems.push({ path, message: `${what}: keep it to ${max} links.` });
  list.forEach((l: Partial<MenuLink>, i) => {
    if (!isStr(l?.label) || !l.label.trim()) problems.push({ path: `${path}.${i}.label`, message: `${what}: link ${i + 1} needs a label.` });
    else if (l.label.length > chromeLimits.label) problems.push({ path: `${path}.${i}.label`, message: `${what}: "${l.label}" is longer than ${chromeLimits.label} characters.` });
    // F076: a dropdown's own label may have no page of its own.
    if ((!isStr(l?.href) || !l.href.trim()) && Array.isArray(l?.children) && l.children.length) return;
    if (!isStr(l?.href) || !l.href.trim()) problems.push({ path: `${path}.${i}.href`, message: `${what}: "${l?.label ?? `link ${i + 1}`}" needs an address.` });
    else if (safeUrl(l.href) !== l.href.trim()) problems.push({ path: `${path}.${i}.href`, message: `${what}: "${l.label}" has an address Crust can't link to. Use a page like /about or a web address.` });
  });
  return problems;
}

/** Checks a header and footer before they're saved or published. Empty = fine. */
export function validateChrome(chrome: { header?: unknown; footer?: unknown }): ChromeProblem[] {
  const problems: ChromeProblem[] = [];
  const h = chrome.header as Partial<SiteHeader> | undefined;
  if (h !== undefined) {
    if (h.logo && isStr(h.logo.imageSrc) && h.logo.imageSrc.trim() && !(isStr(h.logo.imageAlt) && h.logo.imageAlt.trim())) {
      problems.push({ path: "header.logo.imageAlt", message: "Header: the logo image needs a description (alt text), for people who can't see it." });
    }
    if (h.logo && !(isStr(h.logo.text) && h.logo.text.trim()) && !(isStr(h.logo.imageSrc) && h.logo.imageSrc.trim())) {
      problems.push({ path: "header.logo.text", message: "Header: give the logo a name or an image." });
    }
    if (h.menu !== undefined) problems.push(...checkLinks(h.menu, "header.menu", "Menu", chromeLimits.menu));
    if (h.cta && isStr(h.cta.label) && h.cta.label.trim() && !(isStr(h.cta.href) && h.cta.href.trim())) {
      problems.push({ path: "header.cta.href", message: "Header: the button needs an address." });
    } else if (h.cta && isStr(h.cta.href) && h.cta.href.trim() && safeUrl(h.cta.href) !== h.cta.href.trim()) {
      problems.push({ path: "header.cta.href", message: "Header: the button has an address Crust can't link to. Use a page like /contact or a web address." });
    }
    if (h.logo && isStr(h.logo.imageSrc) && h.logo.imageSrc.trim() && safeUrl(h.logo.imageSrc) !== h.logo.imageSrc.trim()) {
      problems.push({ path: "header.logo.imageSrc", message: "Header: Crust can't use that logo image address. Use a web address (https://…) or a path like /logo.svg." });
    }
    if (h.style !== undefined && !(sectionStyleIds as readonly string[]).includes(h.style)) problems.push({ path: "header.style", message: "Header: pick one of the section styles." });
    if (h.layout !== undefined && !(headerLayouts as readonly string[]).includes(h.layout)) problems.push({ path: "header.layout", message: "Header: pick one of the layouts." });
    if (Array.isArray(h.menu)) {
      h.menu.forEach((m: Partial<MenuLink>, i) => {
        if (m?.children === undefined) return;
        if (!Array.isArray(m.children)) problems.push({ path: `header.menu.${i}.children`, message: `Menu: the dropdown under "${m.label ?? i + 1}" is damaged.` });
        else {
          if (m.children.some((c) => (c as MenuLink | undefined)?.children !== undefined)) problems.push({ path: `header.menu.${i}.children`, message: `Menu: dropdowns go one level deep only ("${m.label}").` });
          problems.push(...checkLinks(m.children, `header.menu.${i}.children`, `Dropdown "${m.label ?? i + 1}"`, chromeLimits.children));
        }
      });
    }
    const t = h.topBar as Partial<TopBar> | undefined;
    if (t !== undefined) {
      if (typeof t !== "object" || t === null) problems.push({ path: "header.topBar", message: "Top bar: it's damaged." });
      else {
        if (t.show && !(isStr(t.text) && t.text.trim()) && !(isStr(t.contact) && t.contact.trim()) && !(isStr(t.link?.label) && t.link.label.trim()))
          problems.push({ path: "header.topBar.text", message: "Top bar: write a short message, a link or a phone number or email, or turn it off." });
        if (isStr(t.text) && t.text.length > chromeLimits.topBar) problems.push({ path: "header.topBar.text", message: `Top bar: keep the message under ${chromeLimits.topBar} characters.` });
        if (isStr(t.contact) && t.contact.length > chromeLimits.label) problems.push({ path: "header.topBar.contact", message: `Top bar: keep the contact line under ${chromeLimits.label} characters.` });
        if (t.link && isStr(t.link.label) && t.link.label.trim()) problems.push(...checkLinks([t.link], "header.topBar.link", "Top bar", 1).map((p) => ({ ...p, path: p.path.replace(".0", "") })));
        if (t.style !== undefined && !(sectionStyleIds as readonly string[]).includes(t.style)) problems.push({ path: "header.topBar.style", message: "Top bar: pick one of the section styles." });
      }
    }
  }
  const f = chrome.footer as Partial<SiteFooter> | undefined;
  if (f !== undefined) {
    if (f.columns !== undefined) {
      if (!Array.isArray(f.columns)) problems.push({ path: "footer.columns", message: "Footer: the columns are damaged." });
      else {
        if (f.columns.length > chromeLimits.columns) problems.push({ path: "footer.columns", message: `Footer: keep it to ${chromeLimits.columns} columns.` });
        f.columns.forEach((c, i) => {
          if (!isStr(c?.title) || !c.title.trim()) problems.push({ path: `footer.columns.${i}.title`, message: `Footer: column ${i + 1} needs a title.` });
          problems.push(...checkLinks(c?.links, `footer.columns.${i}.links`, `Footer column "${c?.title || i + 1}"`, chromeLimits.links));
        });
      }
    }
    if (isStr(f.text) && f.text.length > chromeLimits.text) problems.push({ path: "footer.text", message: `Footer: keep the text under ${chromeLimits.text} characters.` });
    if (isStr(f.copyright) && f.copyright.length > chromeLimits.copyright) problems.push({ path: "footer.copyright", message: `Footer: keep the copyright line under ${chromeLimits.copyright} characters.` });
    if (f.style !== undefined && !(sectionStyleIds as readonly string[]).includes(f.style)) problems.push({ path: "footer.style", message: "Footer: pick one of the section styles." });
    if (f.kind !== undefined && f.kind !== "simple" && f.kind !== "blocks") problems.push({ path: "footer.kind", message: "Footer: pick Simple or Built from blocks." });
    if (f.kind === "blocks" && f.show !== false && !(isStr(f.section) && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(f.section)))
      problems.push({ path: "footer.section", message: "Footer: pick the linked section to use as the footer, or go back to Simple." });
  }
  return problems;
}

/**
 * F076: the first content of a footer built from blocks, made from the
 * simple footer so nothing is lost: one Section in the footer's style, the
 * short text first and each column of links beside it (as a heading and a
 * list). The owner then edits it like any linked section.
 */
export function footerStarter(footer: SiteFooter, siteName: string): { type: string; props: Record<string, unknown> }[] {
  const text = (id: string, words: string) => ({ type: "Text", props: { id, text: words, align: "left", tone: "default" } });
  const first = [text("footer-text", footer.text.trim() || siteName)];
  const cols = footer.columns.slice(0, 3).map((c, i) => [
    { type: "Heading", props: { id: `footer-title-${i + 1}`, text: c.title || `Links ${i + 1}`, level: "h2", align: "left" } },
    {
      type: "Text",
      props: {
        id: `footer-links-${i + 1}`,
        align: "left",
        tone: "default",
        text: { rich: 1, blocks: [{ type: "ul", items: c.links.map((l) => [{ text: l.label, href: l.href }]) }] },
      },
    },
  ]);
  const content = cols.length
    ? [
        {
          type: "Columns",
          props: {
            id: "footer-columns",
            count: String(cols.length + 1),
            gap: "md",
            column1: first,
            column2: cols[0] ?? [],
            column3: cols[1] ?? [],
            column4: cols[2] ?? [],
          },
        },
      ]
    : first;
  return [{ type: "Section", props: { id: "footer-section", background: footer.style, paddingY: "lg", content } }];
}

/**
 * Site header, menu and footer (F031): edited once in Site settings, shown
 * on every page. Plain HTML and CSS: the phone menu is a <details> element,
 * so it opens and closes without JavaScript.
 *
 * Stored in site.json as `header` and `footer`. Sites saved before F031 have
 * neither; `migrateChrome` fills in defaults (site name as logo, the pages
 * as the menu, a copyright line).
 */
import type { ReactNode } from "react";
import { sectionStyleIds, type SectionStyleId } from "./section-styles";
import { safeUrl } from "./url";

export interface MenuLink {
  label: string;
  href: string;
}

export interface SiteHeader {
  show: boolean;
  logo: { text: string; imageSrc: string; imageAlt: string };
  menu: MenuLink[];
  /** A button at the end of the menu; hidden while its label is empty. */
  cta: MenuLink;
  sticky: boolean;
  style: SectionStyleId;
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
}

export interface SiteChrome {
  header: SiteHeader;
  footer: SiteFooter;
}

export const chromeLimits = { menu: 8, columns: 4, links: 8, label: 40, text: 300, copyright: 200 } as const;

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
    header: { ...h, ...site.header, logo: { ...h.logo, ...site.header?.logo }, cta: { ...h.cta, ...site.header?.cta } },
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
    if (!isStr(l?.href) || !l.href.trim()) problems.push({ path: `${path}.${i}.href`, message: `${what}: "${l?.label ?? `link ${i + 1}`}" needs an address.` });
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
    }
    if (h.style !== undefined && !(sectionStyleIds as readonly string[]).includes(h.style)) problems.push({ path: "header.style", message: "Header: pick one of the section styles." });
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
  }
  return problems;
}

// --- Rendering (the same in the publish step and the builder) ---------------------------

const same = (href: string, path: string) => href.replace(/\/+$/, "") === path.replace(/\/+$/, "");

function MenuList({ menu, path }: { menu: MenuLink[]; path: string }) {
  return (
    <ul className="cr-menu">
      {menu.map((l, i) => (
        <li key={i}>
          <a href={safeUrl(l.href)} aria-current={same(l.href, path) ? "page" : undefined}>
            {l.label}
          </a>
        </li>
      ))}
    </ul>
  );
}

export function SiteHeaderView({ header, path }: { header: SiteHeader; path: string }): ReactNode {
  if (!header.show) return null;
  const cta = header.cta.label.trim() ? (
    <a className="cr-button cr-button-primary cr-header-cta" href={safeUrl(header.cta.href)}>
      {header.cta.label}
    </a>
  ) : null;
  const logo = header.logo.imageSrc.trim() ? (
    <img className="cr-logo-image" src={safeUrl(header.logo.imageSrc)} alt={header.logo.imageAlt} />
  ) : (
    header.logo.text
  );
  return (
    <header className={`cr-site-header cr-style-${header.style}${header.sticky ? " cr-sticky" : ""}`}>
      <div className="cr-container cr-header-inner">
        <a className="cr-logo" href="/" aria-current={path === "/" ? "page" : undefined}>
          {logo}
        </a>
        {header.menu.length || cta ? (
          <>
            <nav className="cr-nav cr-nav-wide" aria-label="Main">
              <MenuList menu={header.menu} path={path} />
              {cta}
            </nav>
            <details className="cr-nav-phone">
              <summary>Menu</summary>
              <nav className="cr-nav" aria-label="Main">
                <MenuList menu={header.menu} path={path} />
                {cta}
              </nav>
            </details>
          </>
        ) : null}
      </div>
    </header>
  );
}

export function SiteFooterView({ footer, siteName, path, year }: { footer: SiteFooter; siteName: string; path: string; year: number }): ReactNode {
  if (!footer.show) return null;
  const copyright = footer.copyright.replace(/\{year\}/g, String(year)).replace(/\{name\}/g, siteName).trim();
  return (
    <footer className={`cr-site-footer cr-style-${footer.style}`}>
      <div className="cr-container">
        {footer.text.trim() || footer.columns.length ? (
          <div className="cr-footer-grid">
            {footer.text.trim() ? <p className="cr-footer-text">{footer.text}</p> : null}
            {footer.columns.map((c, i) => (
              <nav className="cr-footer-column" key={i} aria-labelledby={`cr-footer-${i}`}>
                <h2 className="cr-footer-title" id={`cr-footer-${i}`}>
                  {c.title}
                </h2>
                <MenuList menu={c.links} path={path} />
              </nav>
            ))}
          </div>
        ) : null}
        {copyright ? <p className="cr-footer-copy">{copyright}</p> : null}
      </div>
    </footer>
  );
}

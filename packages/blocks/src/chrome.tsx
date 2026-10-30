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
import type { MenuLink, SiteFooter, SiteHeader } from "./chrome-model";
import { Img } from "./media-img";
import { safeUrl } from "./url";

export * from "./chrome-model";

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
    <Img className="cr-logo-image" src={header.logo.imageSrc} size="small" alt={header.logo.imageAlt} />
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
  const copyright = footer.copyright.replace(/\{year\}/g, String(year)).replace(/\{name\}/g, () => siteName).trim();
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

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
import {
  contactHref,
  layoutOf,
  type MenuLink,
  type SiteFooter,
  type SiteHeader,
} from "./chrome-model";
import { Img } from "./media-img";
import { safeUrl } from "./url";
import type { SectionStyleId } from "./section-styles";

export * from "./chrome-model";

// --- Rendering (the same in the publish step and the builder) ---------------------------

const same = (href: string, path: string) =>
  href.replace(/\/+$/, "") === path.replace(/\/+$/, "");
const hasChildren = (l: MenuLink) => !!l.children?.length;

/** F076: whether any menu item opens a dropdown (the page then gets DROPDOWN_SCRIPT). */
export const hasDropdowns = (header: Pick<SiteHeader, "menu" | "show">) =>
  header.show && header.menu.some(hasChildren);

/**
 * F076, optional and tiny (only on pages whose header has a dropdown): Escape
 * closes an open dropdown or the phone menu and puts focus back on its
 * button; a click outside closes a dropdown. Everything works without it.
 */
export const DROPDOWN_SCRIPT =
  'document.addEventListener("keydown",e=>{if(e.key!=="Escape")return;const d=document.activeElement&&document.activeElement.closest(".cr-site-header details[open]");if(d){d.open=false;d.querySelector("summary").focus()}});' +
  'document.addEventListener("click",e=>{for(const d of document.querySelectorAll(".cr-dropdown[open]"))if(!d.contains(e.target))d.open=false});';

function MenuList({
  menu,
  path,
  wide,
}: {
  menu: MenuLink[];
  path: string;
  wide?: boolean;
}) {
  return (
    <ul className="cr-menu">
      {menu.map((l, i) => {
        if (!hasChildren(l))
          return (
            <li key={i}>
              <a
                href={safeUrl(l.href)}
                aria-current={same(l.href, path) ? "page" : undefined}
              >
                {l.label}
              </a>
            </li>
          );
        // F076: the parent's own page, when it has one, is the first link inside.
        const links = [
          ...(l.href.trim() ? [{ label: l.label, href: l.href }] : []),
          ...l.children!,
        ];
        const sub = (
          <ul className="cr-submenu">
            {links.map((c, j) => (
              <li key={j}>
                <a
                  href={safeUrl(c.href)}
                  aria-current={same(c.href, path) ? "page" : undefined}
                >
                  {c.label}
                </a>
              </li>
            ))}
          </ul>
        );
        const current = links.some((c) => same(c.href, path));
        // Wide screens: a disclosure (a real button, aria-expanded built in); one open at a time.
        // In the phone menu: an indented list under the label.
        return wide ? (
          <li key={i} className="cr-has-dropdown">
            <details className="cr-dropdown" name="cr-menu">
              <summary className={current ? "cr-current" : undefined}>
                {l.label}
              </summary>
              {sub}
            </details>
          </li>
        ) : (
          <li key={i} className="cr-has-dropdown">
            <span
              className={current ? "cr-menu-group cr-current" : "cr-menu-group"}
            >
              {l.label}
            </span>
            {sub}
          </li>
        );
      })}
    </ul>
  );
}

function TopBarView({ header }: { header: SiteHeader }) {
  const t = header.topBar;
  if (!t?.show) return null;
  const contact = t.contact.trim();
  const tel = contactHref(contact);
  return (
    <div className={`cr-topbar cr-style-${t.style}`}>
      <div className="cr-container cr-topbar-inner">
        {t.text.trim() || t.link.label.trim() ? (
          <p className="cr-topbar-text">
            {t.text.trim()}
            {t.text.trim() && t.link.label.trim() ? " " : null}
            {t.link.label.trim() ? (
              <a href={safeUrl(t.link.href)}>{t.link.label}</a>
            ) : null}
          </p>
        ) : null}
        {contact ? (
          tel ? (
            <a className="cr-topbar-contact" href={tel}>
              {contact}
            </a>
          ) : (
            <span className="cr-topbar-contact">{contact}</span>
          )
        ) : null}
      </div>
    </div>
  );
}

/** `over` (F073): the header sits on the page's first section, in that section's style, and doesn't stick. */
export function SiteHeaderView({
  header,
  path,
  over,
}: {
  header: SiteHeader;
  path: string;
  over?: SectionStyleId;
}): ReactNode {
  if (!header.show) return null;
  const layout = layoutOf(header);
  const cta = header.cta.label.trim() ? (
    <a
      className="cr-button cr-button-primary cr-header-cta"
      href={safeUrl(header.cta.href)}
    >
      {header.cta.label}
    </a>
  ) : null;
  // F039: a Search link after the menu, before the button.
  const search = header.search ? (
    <a
      className="cr-header-search"
      href="/search/"
      aria-current={path === "/search" ? "page" : undefined}
    >
      Search
    </a>
  ) : null;
  const logo = header.logo.imageSrc.trim() ? (
    <Img
      className="cr-logo-image"
      src={header.logo.imageSrc}
      size="small"
      alt={header.logo.imageAlt}
    />
  ) : (
    header.logo.text
  );
  const logoLink = (extra = "") => (
    <a
      className={`cr-logo${extra}`}
      href="/"
      aria-current={path === "/" ? "page" : undefined}
    >
      {logo}
    </a>
  );
  // F076 Split: the logo sits between the two halves of the menu, in reading order too.
  const half = Math.ceil(header.menu.length / 2);
  const wideMenu =
    layout === "split" ? (
      <>
        <MenuList menu={header.menu.slice(0, half)} path={path} wide />
        {logoLink(" cr-logo-split")}
        <MenuList menu={header.menu.slice(half)} path={path} wide />
      </>
    ) : (
      <MenuList menu={header.menu} path={path} wide />
    );
  const classes = over
    ? ["cr-site-header", `cr-style-${over}`, "cr-header-over"]
    : [
        "cr-site-header",
        `cr-style-${header.style}`,
        ...(header.sticky ? ["cr-sticky"] : []),
      ];
  if (layout !== "classic") classes.push(`cr-header-${layout}`);
  // F076: the phone menu slides in from the side; the classic header without dropdowns keeps its fold-down menu.
  const panel = layout !== "classic" || header.menu.some(hasChildren);
  return (
    <header className={classes.join(" ")}>
      <TopBarView header={header} />
      <div className="cr-container cr-header-inner">
        {logoLink(layout === "split" ? " cr-logo-phone" : "")}
        {header.menu.length || cta || search ? (
          <>
            {layout === "button" ? (
              cta
            ) : (
              <nav className="cr-nav cr-nav-wide" aria-label="Main">
                {wideMenu}
                {search}
                {cta}
              </nav>
            )}
            <details
              className={panel ? "cr-nav-phone cr-nav-panel" : "cr-nav-phone"}
            >
              <summary>
                {!panel ? (
                  "Menu"
                ) : (
                  <>
                    <span className="cr-menu-open">Menu</span>
                    <span className="cr-menu-close">Close</span>
                  </>
                )}
              </summary>
              <nav className="cr-nav" aria-label="Main">
                <MenuList menu={header.menu} path={path} />
                {search}
                {layout === "button" ? null : cta}
              </nav>
            </details>
          </>
        ) : null}
      </div>
    </header>
  );
}

export function SiteFooterView({
  footer,
  siteName,
  path,
  year,
}: {
  footer: SiteFooter;
  siteName: string;
  path: string;
  year: number;
}): ReactNode {
  if (!footer.show) return null;
  const copyright = footer.copyright
    .replace(/\{year\}/g, String(year))
    .replace(/\{name\}/g, () => siteName)
    .trim();
  return (
    <footer className={`cr-site-footer cr-style-${footer.style}`}>
      <div className="cr-container">
        {footer.text.trim() || footer.columns.length ? (
          <div className="cr-footer-grid">
            {footer.text.trim() ? (
              <p className="cr-footer-text">{footer.text}</p>
            ) : null}
            {footer.columns.map((c, i) => (
              <nav
                className="cr-footer-column"
                key={i}
                aria-labelledby={`cr-footer-${i}`}
              >
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

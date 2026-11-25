/**
 * F096: the left rail has two places (Puck plugins). "This page": the
 * outline plus "+ Add section" (the Add by picture panel opens in the
 * same place, with a back arrow). "Your site": Pages, Blog, Media, Look,
 * Site settings and Help, one panel at a time, each with a back arrow
 * that names where you came from.
 */
import { blocksPlugin, createUsePuck, outlinePlugin, Puck, useGetPuck, type Plugin } from "@puckeditor/core";
import { mediaSrc } from "@crust/blocks";
import { openKeyboardHelp } from "../keyboard/KeyboardEditing";
import { openLayoutGallery } from "../layouts/library";
import { useEffect, useRef, useState } from "react";
import { loadMedia, useMedia } from "../media/store";
import { FrameIcon, type FrameIconName } from "./icons";
import { NextStepsLink } from "../page-first/PageFirst";

export interface RailOptions {
  /** Pages for the Pages panel. */
  pages: () => { path: string; title: string }[];
  hrefFor: (path: string) => string;
  /** The page or post being edited, for the Help panel's quick edit link. */
  quickEdit?: string;
  /** F091: the full Pages panel (replaces the plain list). */
  pagesPanel?: () => React.ReactElement;
  /** F092: the full Styles panel, and the button that opens the Site settings sheet (replace the plain links). */
  stylesPanel?: () => React.ReactElement;
  siteSettings?: () => React.ReactElement;
  /** The post editor has no Pages panel (a post is not a page). */
  hidePages?: boolean;
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="af-panel" aria-label={title}>
      <h2 className="af-panel-title">{title}</h2>
      {children}
    </section>
  );
}

function PagesPanel({ pages, hrefFor }: Pick<RailOptions, "hrefFor"> & { pages: { path: string; title: string }[] }) {
  return (
    <Panel title="Pages">
      <ul className="af-panel-list">
        {pages.map((p) => (
          <li key={p.path}>
            <a href={hrefFor(p.path)}>
              <span>{p.title || p.path}</span>
              <small>{p.path}</small>
            </a>
          </li>
        ))}
      </ul>
      <a className="af-panel-link" href="#/">
        Manage pages
      </a>
    </Panel>
  );
}

function MediaPanel() {
  const media = useMedia();
  useEffect(() => {
    if (media.status === "idle") void loadMedia();
  }, [media.status]);
  const items = media.items;
  return (
    <Panel title="Media">
      {items.length ? (
        <ul className="af-media">
          {items.slice(0, 12).map((m) => (
            <li key={m.file}>
              <img src={mediaSrc(m.file)} alt={m.alt} loading="lazy" />
            </li>
          ))}
        </ul>
      ) : (
        <p className="af-panel-note">No photos yet.</p>
      )}
      <p className="af-panel-note">To put a photo on the page, select an image and press Choose image. You can upload new photos there.</p>
    </Panel>
  );
}

function BackButton({ to, onClick }: { to: string; onClick: () => void }) {
  return (
    <button type="button" className="af-back" onClick={onClick}>
      <FrameIcon name="back" size={14} />
      <span>Back to {to}</span>
    </button>
  );
}

type SitePlace = "pages" | "blog" | "media" | "look" | "settings" | "help";

const usePuck = createUsePuck();

export function railPlugins({ pages, hrefFor, quickEdit, pagesPanel, stylesPanel, siteSettings, hidePages }: RailOptions): Plugin[] {
  const blocks = blocksPlugin();
  const outline = outlinePlugin();

  /**
   * Puck draws each outline row as a focusable "button" (drag handle) that holds two real buttons (open, expand):
   * buttons inside a button, which assistive tech can't use (axe nested-interactive). The two real buttons are
   * the keyboard way in; moving a section by keyboard is Move up / Move down on its toolbar. So the row is a plain box.
   */
  const ROW_ATTRS = ["role", "tabindex", "aria-roledescription", "aria-describedby", "aria-pressed", "aria-disabled"];
  function useCleanOutline(ref: React.RefObject<HTMLElement | null>) {
    useEffect(() => {
      const root = ref.current;
      if (!root) return;
      const clean = () =>
        root.querySelectorAll('[class*="Layer-inner"]').forEach((row) => ROW_ATTRS.forEach((a) => row.hasAttribute(a) && row.removeAttribute(a)));
      clean();
      const observer = new MutationObserver(clean);
      observer.observe(root, { subtree: true, childList: true, attributes: true, attributeFilter: ROW_ATTRS });
      return () => observer.disconnect();
    }, [ref]);
  }

  /** F099: a picked section's settings, in plain fields, under "Back to Outline" (Puck's own fields form, drawn here). */
  function SectionSettings() {
    const item = usePuck((s) => s.selectedItem);
    const label = usePuck((s) => (item ? (s.config.components[item.type]?.label ?? item.type) : ""));
    const parentId = usePuck((s) => {
      const id = s.selectedItem?.props?.id as string | undefined;
      return (id ? (s.getParentById(id)?.props?.id as string | undefined) : undefined) ?? "";
    });
    const parentLabel = usePuck((s) => {
      const p = parentId ? s.getItemById(parentId) : undefined;
      // Audit A002: a section directly on the page has the page itself as its parent (internal name "root"); only a real block counts.
      return p && s.config.components[p.type] ? (s.config.components[p.type]?.label ?? p.type) : "";
    });
    const parent = parentId && parentLabel ? { id: parentId, label: parentLabel } : null;
    const getPuck = useGetPuck();
    const heading = useRef<HTMLHeadingElement>(null);
    useEffect(() => heading.current?.focus(), []);
    return (
      <div className="af-place af-section-settings">
        <BackButton to="Outline" onClick={() => getPuck().dispatch({ type: "setUi", ui: { itemSelector: null }, recordHistory: false })} />
        <h2 className="af-panel-title" ref={heading} tabIndex={-1}>
          {label} settings
        </h2>
        {parent ? (
          // Puck's own "go up to the parent" link lived in the right panel; a card inside Columns needs it here.
          <button
            type="button"
            className="af-panel-link"
            onClick={() => {
              const puck = getPuck();
              const sel = puck.getSelectorForId(parent.id);
              if (sel) puck.dispatch({ type: "setUi", ui: { itemSelector: sel }, recordHistory: false });
            }}
          >
            {parent.label}
          </button>
        ) : null}
        <Puck.Fields wrapFields={false} />
      </div>
    );
  }

  function ThisPage() {
    const place = useRef<HTMLDivElement>(null);
    useCleanOutline(place);
    const picked = usePuck((s) => !!s.appState.ui.itemSelector);
    if (picked) return <SectionSettings />;
    return (
      <div className="af-place" ref={place}>
        <h2 className="af-panel-title">This page</h2>
        <button
          type="button"
          className="af-panel-link af-add-section"
          onClick={() => openLayoutGallery(null)}
        >
          <FrameIcon name="add" size={14} /> Add section
        </button>
        <p className="af-panel-note">Your sections, top to bottom. Select one to edit it.</p>
        {outline.render?.()}
        <details className="af-addsec-elements">
          <summary>Add an element</summary>
          {blocks.render?.()}
        </details>
      </div>
    );
  }

  function YourSite() {
    const [place, setPlace] = useState<SitePlace | null>(null);
    const places: { id: SitePlace; label: string; note: string; icon: FrameIconName; skip?: boolean }[] = [
      { id: "pages", label: "Pages", note: "Add, rename and open pages", icon: "pages", skip: hidePages },
      { id: "blog", label: "Blog", note: "Posts and how they look", icon: "blog" },
      { id: "media", label: "Media", note: "Your photos", icon: "media" },
      { id: "look", label: "Look", note: "Colours, fonts, buttons, header and footer", icon: "brush" },
      { id: "settings", label: "Site settings", note: "Name, language, search, where it publishes", icon: "site" },
      { id: "help", label: "Help", note: "Shortcuts and next steps", icon: "help" },
    ];
    if (!place) {
      return (
        <section className="af-panel af-place" aria-label="Your site">
          <h2 className="af-panel-title">Your site</h2>
          <ul className="af-places">
            {places
              .filter((p) => !p.skip)
              .map((p) => (
                <li key={p.id}>
                  <button type="button" className="af-place-link" onClick={() => setPlace(p.id)}>
                    <FrameIcon name={p.icon} size={18} />
                    <span>
                      <strong>{p.label}</strong>
                      <small>{p.note}</small>
                    </span>
                    <FrameIcon name="next" size={14} />
                  </button>
                </li>
              ))}
          </ul>
        </section>
      );
    }
    const back = <BackButton to="Your site" onClick={() => setPlace(null)} />;
    let body: React.ReactNode;
    if (place === "pages") body = pagesPanel ? pagesPanel() : <PagesPanel pages={pages()} hrefFor={hrefFor} />;
    else if (place === "media") body = <MediaPanel />;
    else if (place === "look")
      body = stylesPanel ? (
        stylesPanel()
      ) : (
        <Panel title="Look">
          <p className="af-panel-note">Colours, fonts, buttons, spacing and the header and footer, for the whole site.</p>
          <a className="af-panel-link" href="#/settings">
            Open styles
          </a>
          <p className="af-panel-note">To style one section, select it on the page.</p>
        </Panel>
      );
    else if (place === "blog")
      body = (
        <Panel title="Blog">
          <a className="af-panel-link" href="#/posts">
            All posts
          </a>
          <a className="af-panel-link" href="#/design?kind=post">
            Post page design
          </a>
          <a className="af-panel-link" href="#/design?kind=blog">
            Blog page design
          </a>
        </Panel>
      );
    else if (place === "settings")
      body = (
        <Panel title="Site settings">
          {siteSettings ? (
            siteSettings()
          ) : (
            <a className="af-panel-link" href="#/settings">
              Site settings
            </a>
          )}
          <a className="af-panel-link" href="#/templates">
            Start from a template
          </a>
          <a className="af-panel-link" href="#/design?kind=notFound">
            “Page not found” design
          </a>
        </Panel>
      );
    else
      body = (
        <Panel title="Help">
          <button type="button" className="af-panel-link" onClick={openKeyboardHelp}>
            Keyboard shortcuts
          </button>
          <NextStepsLink />
          {quickEdit ? (
            <a className="af-panel-link" href={quickEdit}>
              Quick edit (words and photos only)
            </a>
          ) : null}
          <p className="af-panel-note">Changes save on their own. Visitors see them after you press Publish.</p>
        </Panel>
      );
    return (
      <div className="af-place">
        {back}
        {body}
      </div>
    );
  }

  return [
    // "This page" keeps Puck's block list under the name "this-page" so drag-and-drop from the Add view still works.
    { ...blocks, name: "this-page", label: "This page", icon: <FrameIcon name="layers" size={18} />, render: () => <ThisPage /> },
    { name: "your-site", label: "Your site", icon: <FrameIcon name="site" size={18} />, render: () => <YourSite /> },
  ];
}

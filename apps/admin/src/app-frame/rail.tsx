/**
 * F086: the left icon bar (Puck plugins): Add, Layers, Pages, Styles,
 * Media, Blog, Site, Help. Add and Layers are Puck's block list and
 * outline, renamed. The others are small panels that take you to the
 * screen that does the job today; F087–F092 grow them into full panels.
 */
import { blocksPlugin, outlinePlugin, type Plugin } from "@puckeditor/core";
import { mediaSrc } from "@crust/blocks";
import { openKeyboardHelp } from "../keyboard/KeyboardEditing";
import { AddSectionPanel } from "../layouts/AddSectionPanel";
import { useEffect } from "react";
import { loadMedia, useMedia } from "../media/store";
import { FrameIcon } from "./icons";
import { NextStepsLink } from "../page-first/PageFirst";

export interface RailOptions {
  /** Pages for the Pages panel. */
  pages: () => { path: string; title: string }[];
  hrefFor: (path: string) => string;
  /** The page or post being edited, for the Help panel's quick edit link. */
  quickEdit?: string;
  /** F091: the full Pages panel (replaces the plain list). */
  pagesPanel?: () => React.ReactElement;
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

export function railPlugins({ pages, hrefFor, quickEdit, pagesPanel }: RailOptions): Plugin[] {
  const blocks = blocksPlugin();
  return [
    // Add: whole layouts first (the gallery), then single blocks. F088: pictures of sections first, single blocks under "Add an element".
    {
      ...blocks,
      label: "Add",
      icon: <FrameIcon name="add" size={18} />,
      render: () => <AddSectionPanel elements={blocks.render?.()} />,
    },
    outlinePlugin({ label: "Layers", icon: <FrameIcon name="layers" size={18} /> }),
    {
      name: "pages",
      label: "Pages",
      icon: <FrameIcon name="pages" size={18} />,
      render: () => (pagesPanel ? pagesPanel() : <PagesPanel pages={pages()} hrefFor={hrefFor} />),
    },
    {
      name: "styles",
      label: "Styles",
      icon: <FrameIcon name="brush" size={18} />,
      render: () => (
        <Panel title="Styles">
          <p className="af-panel-note">Colours, fonts, buttons, spacing and the header and footer, for the whole site.</p>
          <a className="af-panel-link" href="#/settings">
            Open styles
          </a>
          <p className="af-panel-note">To style one section, select it on the page.</p>
        </Panel>
      ),
    },
    {
      name: "media",
      label: "Media",
      icon: <FrameIcon name="media" size={18} />,
      render: () => <MediaPanel />,
    },
    {
      name: "blog",
      label: "Blog",
      icon: <FrameIcon name="blog" size={18} />,
      render: () => (
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
      ),
    },
    {
      name: "site",
      label: "Site",
      icon: <FrameIcon name="site" size={18} />,
      render: () => (
        <Panel title="Site">
          <a className="af-panel-link" href="#/settings">
            Site settings
          </a>
          <a className="af-panel-link" href="#/templates">
            Start from a template
          </a>
          <a className="af-panel-link" href="#/design?kind=notFound">
            “Page not found” design
          </a>
        </Panel>
      ),
    },
    {
      name: "help",
      label: "Help",
      icon: <FrameIcon name="help" size={18} />,
      render: () => (
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
      ),
    },
  ];
}

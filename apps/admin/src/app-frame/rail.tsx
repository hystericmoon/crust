/**
 * F096: the left rail has two places (Puck plugins). "This page": the
 * outline plus "+ Add section" (the Add by picture panel opens in the
 * same place, with a back arrow). "Your site": Pages, Blog, Media, Look,
 * Site settings and Help, one panel at a time, each with a back arrow
 * that names where you came from.
 */
import { blocksPlugin, createUsePuck, outlinePlugin, Puck, useGetPuck, type Plugin } from "@puckeditor/core";
import { formatBytes, type MediaItem } from "@crust/blocks";
import { openKeyboardHelp } from "../keyboard/KeyboardEditing";
import { openLayoutGallery } from "../layouts/library";
import { useEffect, useMemo, useRef, useState } from "react";
import { filterMedia } from "../media/MediaPicker";
import { PhotoGrid } from "../media/PhotoGrid";
import { ACCEPT } from "../media/shrink";
import { addPhoto, loadMedia, removePhoto, useMedia } from "../media/store";
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

export function MediaPanel() {
  const media = useMedia();
  const grid = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  useEffect(() => {
    if (media.status === "idle") void loadMedia();
  }, [media.status]);

  const shown = useMemo(() => filterMedia(media.items, query), [media.items, query]);
  const item = media.items.find((i) => i.file === selected) ?? null;
  const usedOn = item ? (media.usage[item.file] ?? []) : [];
  const uploadsOff = media.status === "off";
  const focusPhoto = (file: string) => requestAnimationFrame(() => grid.current?.querySelector<HTMLElement>(`[data-file="${file}"]`)?.focus());

  const upload = async (files: File[]) => {
    if (!files.length || busy) return;
    setErrors([]);
    setMessage("");
    const problems: string[] = [];
    let last: MediaItem | null = null;
    for (const [n, file] of files.entries()) {
      setBusy(files.length > 1 ? `Uploading ${n + 1} of ${files.length}…` : `Uploading ${file.name}…`);
      const res = await addPhoto(file);
      if (res.ok) last = res.item;
      else problems.push(res.error);
    }
    setBusy("");
    setErrors(problems);
    if (last) {
      setQuery("");
      setSelected(last.file);
      const count = files.length - problems.length;
      setMessage(`${count === 1 ? `Uploaded ${last.file}` : `Uploaded ${count} photos`}. Add its alt text when you choose it on a page.`);
    }
  };

  const remove = async () => {
    if (!item) return;
    const index = shown.findIndex((i) => i.file === item.file);
    setBusy("Deleting…");
    const res = await removePhoto(item.file);
    setBusy("");
    setConfirmDelete(false);
    if (!res.ok) {
      setErrors([res.error]);
      return;
    }
    setMessage(`Deleted ${item.file}.`);
    const next = shown.filter((i) => i.file !== item.file)[Math.max(0, index - 1)];
    setSelected(next?.file ?? null);
    if (next) focusPhoto(next.file);
    else fileInput.current?.parentElement?.querySelector<HTMLElement>("button")?.focus();
  };

  return (
    <Panel title="Photos">
      <div className="af-media-tools">
        <input type="search" className="af-media-search" placeholder="Search by alt text or name" aria-label="Search photos" value={query} onChange={(e) => setQuery(e.target.value)} />
        <div>
          <button type="button" className="af-panel-link" disabled={uploadsOff || !!busy} onClick={() => fileInput.current?.click()}>
            Upload photos
          </button>
          <input
            ref={fileInput}
            type="file"
            accept={ACCEPT}
            multiple
            hidden
            onChange={(e) => {
              const files = [...(e.target.files ?? [])];
              e.target.value = "";
              void upload(files);
            }}
          />
        </div>
      </div>
      <p className="af-media-status" role="status">
        {busy || message}
      </p>
      {errors.length ? (
        <ul className="af-media-errors" role="alert">
          {errors.map((err) => (
            <li key={err}>{err}</li>
          ))}
        </ul>
      ) : null}
      {media.status === "loading" || media.status === "idle" ? (
        <p className="af-panel-note">Loading your photos…</p>
      ) : media.status === "off" ? (
        <p className="af-panel-note">The photo library needs saving to be switched on, which works on crust-admin.pages.dev.</p>
      ) : media.status === "error" ? (
        <p className="af-panel-note">
          {media.error}{" "}
          <button type="button" className="af-media-link" onClick={() => void loadMedia(true)}>
            Try again
          </button>
        </p>
      ) : !media.items.length ? (
        <p className="af-panel-note">No photos yet. Upload photos from your Mac or phone; they stay in your site's library and can be used on any page.</p>
      ) : !shown.length ? (
        <p className="af-panel-note">No photos match "{query}".</p>
      ) : (
        <div className="af-media">
          <PhotoGrid
            items={shown}
            selected={selected}
            gridRef={grid}
            onSelect={(file, focus) => {
              setSelected(file);
              setConfirmDelete(false);
              if (focus) focusPhoto(file);
            }}
          />
        </div>
      )}
      {item ? (
        <div className="af-media-details" role="group" aria-label={`Selected photo: ${item.alt || item.file}`}>
          <p className="af-media-name">{item.alt || "No alt text yet"}</p>
          <dl className="af-media-meta">
            <dt>File</dt>
            <dd>{item.file}</dd>
            <dt>Size</dt>
            <dd>
              {item.width} × {item.height} px · {formatBytes(item.bytes)}
            </dd>
            <dt>Used on</dt>
            <dd>{usedOn.length ? usedOn.map((u) => u.title).join(", ") : "No pages yet"}</dd>
          </dl>
          {usedOn.length ? (
            <p className="af-panel-note">To delete this photo, choose another one on {usedOn.length === 1 ? "that page" : "those pages"} first.</p>
          ) : confirmDelete ? (
            <div className="af-media-confirm" role="group" aria-label="Delete this photo?">
              <p>Delete {item.file} from the library? Its history is kept.</p>
              <button type="button" className="af-media-danger" disabled={!!busy} autoFocus onClick={() => void remove()}>
                Delete photo
              </button>
              <button
                type="button"
                className="af-panel-link"
                onClick={() => {
                  setConfirmDelete(false);
                  requestAnimationFrame(() => document.getElementById("af-media-ask-delete")?.focus());
                }}
              >
                Keep it
              </button>
            </div>
          ) : (
            <button type="button" id="af-media-ask-delete" className="af-media-link" onClick={() => setConfirmDelete(true)}>
              Delete from library…
            </button>
          )}
        </div>
      ) : media.items.length ? (
        <p className="af-panel-note">Pick a photo to see its details.</p>
      ) : null}
      <p className="af-panel-note">To put a photo on the page, select a photo and press Choose photo. Alt text is added there.</p>
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
      { id: "media", label: "Photos", note: "Your photos", icon: "media" },
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

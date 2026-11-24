/**
 * The layout library in the builder (F026), direction B: a big gallery
 * opened from a "+" between sections on the canvas, or from the "Layouts"
 * button in the top bar (the keyboard way in).
 *
 * Thumbnails are the publish renderer's own HTML, styled by the site tokens
 * already on the page, so they show the site's current style.
 */
import { layoutCategories, sectionLayouts, type LayoutCategory } from "@crust/blocks";
import { renderPreview } from "@crust/render";
import { sectionHtml, useInSectionEditor, useLinkedSections } from "../linked/store";
import { createUsePuck, useGetPuck, type ComponentData, type Config, type Data } from "@puckeditor/core";
import { useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { announce, focusBlock, select } from "../keyboard/KeyboardEditing";
import { RadioGroup } from "../sections/controls";
import {
  blockName,
  buildItem,
  describeInsertion,
  filterLayouts,
  firstHeading,
  insertionPoint,
  openLayoutGallery,
  splitSimple,
  planLayoutInsert,
  registerGalleryOpener,
  type LayoutItem,
  type LayoutKind,
} from "./library";
import { MAX_NAME, useMyLayouts } from "./mine";
import { SiteStyleContext } from "../sections/site-style";
import { DesignKindContext } from "../designs/context";

const usePuckSelector = createUsePuck();

/** Previews are drawn at desktop width, then scaled down to the card. */
const PREVIEW_WIDTH = 1280;

const previews = new Map<string, string>();
/** The layout as published, rendered once. */
function previewHtml(item: LayoutItem): string {
  // A saved layout deleted and saved again under the same name gets the same id.
  const key = item.kind === "mine" || item.kind === "linked" ? `${item.kind}:${item.layout.id}:${item.layout.savedAt}` : `${item.kind}:${item.layout.id}`;
  let html = previews.get(key);
  if (html === undefined) {
    try {
      // F043: a linked section's preview is its blocks, not the link.
      html = item.kind === "linked" ? sectionHtml(item.layout.content) : renderPreview({ root: { props: {} }, content: buildItem(item) });
    } catch {
      html = "";
    }
    previews.set(key, html);
  }
  return html;
}

function Thumb({ item, maxHeight }: { item: LayoutItem; maxHeight: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ scale: 0.2, height: 120 });
  const html = previewHtml(item);
  useLayoutEffect(() => {
    const el = ref.current;
    const inner = el?.firstElementChild as HTMLElement | null;
    if (!el || !inner) return;
    const measure = () => {
      const scale = el.clientWidth / PREVIEW_WIDTH || 0.2;
      setBox({ scale, height: Math.min(Math.max(inner.offsetHeight * scale, 60), maxHeight) });
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [html, maxHeight]);
  return (
    // A picture of the layout: hidden from screen readers and out of the tab order (its links are not real).
    <div ref={ref} className="lg-thumb" aria-hidden="true" inert style={{ height: box.height }}>
      <div
        className="cr-page lg-thumb-page"
        style={{ width: PREVIEW_WIDTH, transform: `scale(${box.scale})` }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}

type BuiltIn = Exclude<LayoutItem, { kind: "mine" } | { kind: "linked" }>;

function Card({ item, onPick, picked }: { item: BuiltIn; onPick: (item: LayoutItem) => void; picked?: boolean }) {
  const { layout } = item;
  const descId = `lg-desc-${item.kind}-${layout.id}`;
  const meta =
    item.kind === "page" ? `${item.layout.sections.length} sections` : item.kind === "design" ? (item.layout.current ? "Today's look" : "Starting design") : item.layout.category;
  return (
    <li className={picked ? "lg-card is-picked" : "lg-card"}>
      <Thumb item={item} maxHeight={item.kind === "page" || item.kind === "design" ? 300 : 190} />
      <div className="lg-card-text">
        <button type="button" className="lg-card-button" aria-describedby={descId} aria-pressed={picked ?? false} onClick={() => onPick(item)}>
          <span className="lg-card-name">{layout.name}</span>
          <span className="lg-card-meta">{meta}</span>
        </button>
        <p id={descId} className="lg-card-desc">
          {layout.description}
        </p>
      </div>
    </li>
  );
}

/** A linked section (F043): inserting adds a link; the card says where it's used. */
function LinkedCard({ item, onPick, picked }: { item: Extract<LayoutItem, { kind: "linked" }>; onPick: (item: LayoutItem) => void; picked?: boolean }) {
  const { usage } = useLinkedSections();
  const used = usage[item.layout.id]?.length ?? 0;
  const descId = `lg-desc-linked-${item.layout.id}`;
  return (
    <li className={picked ? "lg-card is-picked" : "lg-card"}>
      <Thumb item={item} maxHeight={190} />
      <div className="lg-card-text">
        <button type="button" className="lg-card-button" aria-describedby={descId} aria-pressed={picked ?? false} onClick={() => onPick(item)}>
          <span className="lg-card-name">{item.layout.name}</span>
          <span className="lg-card-meta">Linked</span>
        </button>
        <p id={descId} className="lg-card-desc">
          {used === 0 ? "Not on any page yet." : `On ${used} page${used === 1 ? "" : "s"}. Editing it changes all of them.`}
        </p>
      </div>
    </li>
  );
}

/** A name field with Save and Cancel; used to save, and to rename. */
export function NameForm({
  label,
  initial,
  submitLabel,
  onSubmit,
  onCancel,
  idPrefix,
}: {
  label: string;
  initial: string;
  submitLabel: string;
  /** Resolves to an error message, or null when it worked. */
  onSubmit: (name: string) => Promise<string | null>;
  onCancel: () => void;
  idPrefix: string;
}) {
  const [name, setName] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    input.current?.focus();
    input.current?.select();
  }, []);
  return (
    <form
      className="lg-name-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (busy) return;
        setBusy(true);
        void onSubmit(name).then((problem) => {
          setBusy(false);
          setError(problem);
          if (problem) input.current?.focus();
        });
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          // Close just this form, not the gallery or the selection.
          e.preventDefault();
          e.stopPropagation();
          onCancel();
        }
      }}
    >
      <label className="lg-name-label" htmlFor={`${idPrefix}-name`}>
        {label}
      </label>
      <input
        ref={input}
        id={`${idPrefix}-name`}
        className="lg-name-input"
        value={name}
        maxLength={MAX_NAME + 20}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${idPrefix}-error` : undefined}
        onChange={(e) => setName(e.target.value)}
      />
      {error ? (
        <p id={`${idPrefix}-error`} className="lg-name-error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="lg-name-actions">
        <button type="submit" className="lg-name-save" disabled={busy}>
          {busy ? "Saving…" : submitLabel}
        </button>
        <button type="button" className="lg-close" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function MineCard({ item, onPick, picked }: { item: Extract<LayoutItem, { kind: "mine" }>; onPick: (item: LayoutItem) => void; picked?: boolean }) {
  const mine = useMyLayouts();
  const { layout } = item;
  const [mode, setMode] = useState<"idle" | "menu" | "rename" | "delete">("idle");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const more = useRef<HTMLButtonElement>(null);
  const base = `lg-mine-${layout.id}`;
  const close = () => {
    setMode("idle");
    setError(null);
    requestAnimationFrame(() => more.current?.focus());
  };
  return (
    <li
      className={picked ? "lg-card is-mine is-picked" : "lg-card is-mine"}
      onKeyDown={(e) => {
        if (e.key === "Escape" && mode !== "idle") {
          e.preventDefault();
          e.stopPropagation();
          close();
        }
      }}
    >
      <Thumb item={item} maxHeight={layout.kind === "page" ? 300 : 190} />
      <div className="lg-card-text">
        <div className="lg-card-row">
          <button type="button" className="lg-card-button" aria-pressed={picked ?? false} onClick={() => onPick(item)}>
            <span className="lg-card-name">{layout.name}</span>
            <span className="lg-card-meta">{layout.kind === "page" ? `Page · ${layout.content.length} sections` : "Section"}</span>
          </button>
          <button
            ref={more}
            type="button"
            className="lg-more"
            aria-label={`More for ${layout.name}`}
            aria-expanded={mode === "menu"}
            aria-controls={`${base}-menu`}
            onClick={() => setMode(mode === "menu" ? "idle" : "menu")}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
              <circle cx="5" cy="12" r="2" />
              <circle cx="12" cy="12" r="2" />
              <circle cx="19" cy="12" r="2" />
            </svg>
          </button>
        </div>
        {mode === "menu" ? (
          <div id={`${base}-menu`} className="lg-menu">
            <button type="button" onClick={() => setMode("rename")} autoFocus>
              Rename
            </button>
            <button type="button" className="is-danger" onClick={() => setMode("delete")}>
              Delete
            </button>
          </div>
        ) : null}
        {mode === "rename" ? (
          <NameForm
            idPrefix={`${base}-rename`}
            label="New name"
            initial={layout.name}
            submitLabel="Save name"
            onSubmit={async (name) => {
              const problem = await mine.rename(layout.id, name);
              if (!problem) close();
              return problem;
            }}
            onCancel={close}
          />
        ) : null}
        {mode === "delete" ? (
          <div className="lg-confirm" role="group" aria-labelledby={`${base}-confirm`}>
            <p id={`${base}-confirm`}>Delete “{layout.name}”? Pages that already use it keep their copy.</p>
            {error ? (
              <p className="lg-name-error" role="alert">
                {error}
              </p>
            ) : null}
            <div className="lg-name-actions">
              <button
                type="button"
                className="lg-danger"
                disabled={busy}
                autoFocus
                onClick={() => {
                  setBusy(true);
                  void mine.remove(layout.id).then((problem) => {
                    setBusy(false);
                    setError(problem);
                  });
                }}
              >
                {busy ? "Deleting…" : "Delete layout"}
              </button>
              <button type="button" className="lg-close" onClick={close}>
                Keep it
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </li>
  );
}

/** "Save this page as a layout", at the top of My layouts. */
function SavePage({ onSaved }: { onSaved: () => void }) {
  const getPuck = useGetPuck();
  const mine = useMyLayouts();
  const [open, setOpen] = useState(false);
  const data = getPuck().appState.data as Data;
  const empty = data.content.length === 0;
  if (!open) {
    return (
      <div className="lg-save-page">
        <button type="button" className="lg-close" disabled={empty} onClick={() => setOpen(true)}>
          Save this page as a layout
        </button>
        <span className="lg-where">{empty ? "Add a section first." : `All ${data.content.length} sections, to reuse as a whole page.`}</span>
      </div>
    );
  }
  const title = typeof data.root.props?.title === "string" ? data.root.props.title : "";
  return (
    <NameForm
      idPrefix="lg-save-page"
      label="Name for this page layout"
      initial={title.trim() || firstHeading(data.content) || "My page"}
      submitLabel="Save layout"
      onSubmit={async (name) => {
        const problem = await mine.save(name, "page", (getPuck().appState.data as Data).content);
        if (!problem) {
          setOpen(false);
          onSaved();
        }
        return problem;
      }}
      onCancel={() => setOpen(false)}
    />
  );
}

const itemKey = (item: LayoutItem) => `${item.kind}:${item.layout.id}`;

export function ItemList({
  items,
  kind,
  onPick,
  labelledBy,
  picked,
}: {
  items: LayoutItem[];
  kind: LayoutKind;
  onPick: (item: LayoutItem) => void;
  labelledBy?: string;
  /** F098: the card chosen so far (the Add button inserts it). */
  picked?: LayoutItem | null;
}) {
  return (
    <ul className={kind === "section" ? "lg-grid" : "lg-grid is-pages"} aria-labelledby={labelledBy}>
      {items.map((item) => {
        const key = itemKey(item);
        const on = !!picked && itemKey(picked) === key;
        return item.kind === "mine" ? (
          <MineCard key={key} item={item} onPick={onPick} picked={on} />
        ) : item.kind === "linked" ? (
          <LinkedCard key={key} item={item} onPick={onPick} picked={on} />
        ) : (
          <Card key={key} item={item} onPick={onPick} picked={on} />
        );
      })}
    </ul>
  );
}

/**
 * F080: the new layouts first; the first library's plainer ones after them,
 * under "Simple", so the finished-looking ones are what you meet first
 * (fewer choices up front, Hick's law) and nothing you knew disappears.
 */
function ItemGrid({ items, kind, onPick, picked }: { items: LayoutItem[]; kind: LayoutKind; onPick: (item: LayoutItem) => void; picked: LayoutItem | null }) {
  const { main, simple } = splitSimple(items);
  if (!simple.length) return <ItemList items={items} kind={kind} onPick={onPick} picked={picked} />;
  return (
    <>
      {main.length ? <ItemList items={main} kind={kind} onPick={onPick} picked={picked} /> : null}
      <h3 className="lg-subhead" id="lg-simple">
        Simple <span className="lg-cat-count">{simple.length}</span>
      </h3>
      <p className="lg-side-note">Plainer layouts from the first library, for quiet pages.</p>
      <ItemList items={simple} kind={kind} onPick={onPick} labelledBy="lg-simple" picked={picked} />
    </>
  );
}

/** F088: put a layout on the page (one Undo removes it), select it and say so. Shared by the dialog and the Add panel. */
export function insertLayout(getPuck: ReturnType<typeof useGetPuck>, item: LayoutItem, index: number, tokens?: Parameters<typeof planLayoutInsert>[3]): boolean {
  const puck = getPuck();
  // F080: a gradient that wouldn't read in this site's colours is swapped for one that does.
  const plan = planLayoutInsert(puck.appState.data as Data, item, index, tokens);
  if (!plan) return false;
  // setData skips the undo history unless asked; one Undo removes the whole layout.
  puck.dispatch({ type: "setData", data: plan.data, recordHistory: true });
  select(getPuck, plan.firstId);
  focusBlock(plan.firstId);
  announce(plan.announcement);
  return true;
}

/** F098: which tab the one gallery shows. "Layouts" holds sections, whole pages and linked sections (the Type filter). */
type GalleryTab = "layouts" | "mine";
type LayoutType = Exclude<LayoutKind, "mine">;

const typeCount = (type: LayoutType, category: LayoutCategory | "All") =>
  type === "section" && category !== "All" ? sectionLayouts.filter((l) => l.category === category).length : null;

/** The one full-screen gallery: opened from the Add section buttons, the "+" bars on the page and the Layouts button. Lives in overrides.puck, so it can reach the editor. */
export function LayoutGallery() {
  const getPuck = useGetPuck();
  const dialog = useRef<HTMLDialogElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [tab, setTab] = useState<GalleryTab>("layouts");
  const [type, setType] = useState<LayoutType>("section");
  const [category, setCategory] = useState<LayoutCategory | "All">("All");
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<LayoutItem | null>(null);

  useEffect(
    () =>
      registerGalleryOpener((at) => {
        const puck = getPuck();
        const content = (puck.appState.data as Data).content;
        setIndex(Math.min(at ?? insertionPoint(content, puck.selectedItem?.props.id as string | undefined), content.length));
        setQuery("");
        setPicked(null);
        setOpen(true);
        const el = dialog.current;
        if (el && !el.open) el.showModal();
        // Straight to the search box: type "pricing" and Tab to the first match.
        requestAnimationFrame(() => search.current?.focus());
      }),
    [getPuck],
  );

  const mine = useMyLayouts();
  const close = () => dialog.current?.close();
  const linked = useLinkedSections();
  // A linked section can't hold another one, so its own editor doesn't offer them.
  const linkedOn = !useInSectionEditor();
  // F082: in a post, blog or "Page not found" design, whole pages are its starting designs.
  const design = useContext(DesignKindContext);
  const kind: LayoutKind = tab === "mine" ? "mine" : type === "linked" && !linkedOn ? "section" : type;
  const items = useMemo(
    () => filterLayouts(kind, category, query, mine.layouts ?? [], linked.sections ?? [], design),
    [kind, category, query, mine.layouts, linked.sections, design],
  );
  const mineCount = mine.layouts?.filter((l) => l.kind !== "element").length ?? 0;
  const siteStyle = useContext(SiteStyleContext);
  const linkedCount = linked.sections?.length ?? 0;
  const content = open ? ((getPuck().appState.data as Data).content as ComponentData[]) : [];
  const cfg = open ? (getPuck().config as Config) : undefined;
  const where = open && cfg ? describeInsertion(cfg, content, index) : "";
  // A starting design replaces the whole design, so "where" does not apply to it.
  const replaces = picked?.kind === "design";

  const choose = (next: () => void) => {
    next();
    setPicked(null);
  };
  const add = () => {
    if (!picked) return;
    close();
    insertLayout(getPuck, picked, index, siteStyle?.tokens);
  };

  const noun = kind === "page" ? (design ? "starting design" : "page layout") : kind === "linked" ? "linked section" : "section";

  return (
    <dialog
      ref={dialog}
      className="lg-dialog"
      aria-labelledby="lg-title"
      aria-describedby="lg-where"
      onClose={() => setOpen(false)}
    >
      {open ? (
        <div className="lg-box">
          <header className="lg-head">
            <div className="lg-head-text">
              <h2 id="lg-title">Add a section</h2>
              <p id="lg-where" className="lg-where">
                {design && type === "page" && tab === "layouts" ? "A starting design replaces the whole design. Undo brings it back." : where}
              </p>
            </div>
            <RadioGroup<GalleryTab>
              label="Where to choose from"
              className="lg-kind"
              optionClass="lg-kind-option"
              value={tab}
              onChange={(v) => choose(() => setTab(v))}
              options={[
                { value: "layouts", label: "Layouts" },
                { value: "mine", label: mineCount ? `Mine (${mineCount})` : "Mine" },
              ]}
            />
            <button type="button" className="lg-close" onClick={close}>
              Close
            </button>
          </header>
          <div className="lg-filters">
            <label className="lg-search">
              <span className="lg-search-label">Search layouts</span>
              <input ref={search} type="search" value={query} placeholder="Pricing, team, questions…" onChange={(e) => setQuery(e.target.value)} />
            </label>
            {tab === "layouts" ? (
              <>
                <label className="lg-filter">
                  <span className="lg-search-label">Type</span>
                  <select value={type} onChange={(e) => choose(() => setType(e.target.value as LayoutType))}>
                    <option value="section">Sections</option>
                    <option value="page">{design ? "Starting designs" : "Whole pages"}</option>
                    {linkedOn ? <option value="linked">{linkedCount ? `Linked (${linkedCount})` : "Linked"}</option> : null}
                  </select>
                </label>
                {type === "section" ? (
                  <label className="lg-filter">
                    <span className="lg-search-label">Topic</span>
                    <select value={category} onChange={(e) => setCategory(e.target.value as LayoutCategory | "All")}>
                      <option value="All">All topics ({sectionLayouts.length})</option>
                      {layoutCategories.map((c) => (
                        <option key={c} value={c}>
                          {c} ({typeCount("section", c)})
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
              </>
            ) : null}
          </div>
          <div className="lg-body">
            <div className="lg-main">
              {tab === "layouts" && type === "page" ? (
                <p className="lg-side-note">
                  {design
                    ? "Each one is a whole design to start from, in your site's colours and fonts. Change anything after."
                    : "A whole page adds all its sections at once. Change or remove any of them after."}
                </p>
              ) : tab === "layouts" && type === "linked" ? (
                <p className="lg-side-note">
                  Sections shown on many pages, kept in {linked.where}. Adding one adds a link: edit it once and every page that shows it changes.
                </p>
              ) : tab === "mine" ? (
                <p className="lg-side-note">
                  Sections and pages you saved, kept in {mine.where}. They're copies: renaming or deleting one never changes your pages.
                </p>
              ) : null}
              {kind === "mine" ? <SavePage onSaved={() => setQuery("")} /> : null}
              <p className="lg-count" role="status">
                {items.length === 0
                  ? ""
                  : kind === "mine"
                    ? // F069: "1 of your layout" read wrong; the tab already says whose.
                      `${items.length === 1 ? "1 layout" : `${items.length} layouts`}`
                    : `${items.length} ${noun}${items.length === 1 ? "" : "s"}${kind === "section" && category !== "All" ? ` in ${category}` : ""}`}
              </p>
              {kind === "linked" && linked.loadError ? (
                <div className="lg-empty" role="alert">
                  <p>{linked.loadError}</p>
                  <button type="button" className="lg-close" onClick={linked.reload}>
                    Try again
                  </button>
                </div>
              ) : kind === "linked" && linked.sections === null ? (
                <p className="lg-empty">Loading your linked sections…</p>
              ) : kind === "linked" && linkedCount === 0 ? (
                <div className="lg-empty">
                  <p>
                    <strong>No linked sections yet.</strong> Select a section on the page and choose <strong>Make linked</strong> on its toolbar.
                    Then add it to other pages from here.
                  </p>
                </div>
              ) : kind === "mine" && mine.loadError ? (
                <div className="lg-empty" role="alert">
                  <p>{mine.loadError}</p>
                  <button type="button" className="lg-close" onClick={mine.reload}>
                    Try again
                  </button>
                </div>
              ) : kind === "mine" && mine.layouts === null ? (
                <p className="lg-empty">Loading your layouts…</p>
              ) : kind === "mine" && mineCount === 0 ? (
                <div className="lg-empty">
                  <p>
                    <strong>Nothing saved yet.</strong> Select a section on the page and choose <strong>Save as layout</strong> on its toolbar,
                    or save this whole page above.
                  </p>
                </div>
              ) : items.length ? (
                <ItemGrid items={items} kind={kind} onPick={setPicked} picked={picked} />
              ) : (
                <div className="lg-empty">
                  <p>
                    No layouts match “{query}”
                    {kind === "section" && category !== "All" ? ` in ${category}` : ""}.
                  </p>
                  <button
                    type="button"
                    className="lg-close"
                    onClick={() => {
                      setQuery("");
                      setCategory("All");
                      search.current?.focus();
                    }}
                  >
                    Show all layouts
                  </button>
                </div>
              )}
            </div>
          </div>
          <footer className="lg-foot">
            {replaces ? (
              <p className="lg-foot-note">It replaces the whole design. Undo brings it back.</p>
            ) : (
              <label className="lg-where-pick">
                <span className="lg-search-label">Insert</span>
                <select value={index} onChange={(e) => setIndex(Number(e.target.value))}>
                  {content.length === 0 ? (
                    <option value={0}>On this empty page</option>
                  ) : (
                    <>
                      <option value={0}>At the top, above {cfg ? blockName(cfg, content[0]!) : "the first section"}</option>
                      {content.map((item, i) => (
                        <option key={String(item.props.id)} value={i + 1}>
                          After {cfg ? blockName(cfg, item) : `section ${i + 1}`}
                        </option>
                      ))}
                    </>
                  )}
                </select>
              </label>
            )}
            <p className="lg-foot-pick" role="status">
              {picked ? `Chosen: ${picked.layout.name}` : "Choose a layout above."}
            </p>
            <button type="button" className="lg-add" disabled={!picked} onClick={add}>
              Add
            </button>
          </footer>
        </div>
      ) : null}
    </dialog>
  );
}

/** Top-bar button: the keyboard way into the gallery. */
export function LayoutsButton() {
  return (
    <button type="button" className="crust-header-link" onClick={() => openLayoutGallery(null)}>
      Layouts
    </button>
  );
}

// --- "+" between sections on the canvas ---------------------------------------------

interface Spot {
  index: number;
  top: number;
  left: number;
}

const ZONE = '[data-puck-dropzone="root:default-zone"]';

/** Where the "+" buttons go: above the first section, between each pair, below the last. */
export function insertSpots(doc: Document): { spots: Spot[]; zoom: number } {
  const view = doc.defaultView;
  const frame = view?.frameElement as HTMLElement | null | undefined;
  const zoom = frame && view?.innerWidth ? frame.getBoundingClientRect().width / view.innerWidth || 1 : 1;
  const zone = doc.querySelector<HTMLElement>(ZONE);
  if (!zone) return { spots: [], zoom };
  const blocks = [...zone.children].filter((el) => el.hasAttribute("data-puck-component"));
  const z = zone.getBoundingClientRect();
  const sx = view?.scrollX ?? 0;
  const sy = view?.scrollY ?? 0;
  const left = z.left + z.width / 2 + sx;
  if (!blocks.length) return { spots: [{ index: 0, top: z.top + Math.max(z.height, 160) / 2 + sy, left }], zoom };
  const rects = blocks.map((b) => b.getBoundingClientRect());
  // Keep the first one fully inside the canvas: half a button above the page would be cut off.
  const inset = 18 / (zoom > 0 && zoom < 1 ? zoom : 1);
  const spots = rects.map((r, i) => ({ index: i, top: (i === 0 ? Math.max(r.top + sy, inset) - sy : (rects[i - 1]!.bottom + r.top) / 2) + sy, left }));
  spots.push({ index: rects.length, top: rects[rects.length - 1]!.bottom + sy, left });
  return { spots, zoom };
}

/** overrides.iframe child: the "+" buttons, drawn into the canvas document. */
export function LayoutInserters({ document: doc }: { document?: Document }) {
  const content = usePuckSelector((s) => (s.appState.data as Data).content) as ComponentData[];
  const [{ spots, zoom }, setLayout] = useState<{ spots: Spot[]; zoom: number }>({ spots: [], zoom: 1 });

  useEffect(() => {
    if (!doc?.body) return;
    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const next = insertSpots(doc);
        setLayout((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
      });
    };
    measure();
    // Our own buttons live in the body too; only Puck's canvas changes matter.
    const observer = new MutationObserver((records) => {
      if (records.some((r) => !(r.target as Element).closest?.(".lg-inserters"))) measure();
    });
    observer.observe(doc.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["style", "class"] });
    const resize = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    resize?.observe(doc.body);
    doc.defaultView?.addEventListener("resize", measure);
    // The canvas zoom changes with the outer window, not the iframe.
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      resize?.disconnect();
      doc.defaultView?.removeEventListener("resize", measure);
      window.removeEventListener("resize", measure);
      cancelAnimationFrame(frame);
    };
  }, [doc, content]);

  if (!doc?.body) return null;
  // The canvas is shown zoomed out; undo that so the buttons stay a usable size.
  const inv = zoom > 0 && zoom < 1 ? 1 / zoom : 1;
  const empty = content.length === 0;
  // F098: the bars choose the spot and open the one gallery, which says where the section will land.
  const openAddPanel = (index: number) => openLayoutGallery(index);
  return createPortal(
    <div className="lg-inserters">
      {empty && spots[0] ? (
        // An empty page: the library is the obvious first step, so it's a real, reachable button.
        <button
          type="button"
          className="lg-insert-empty"
          style={{ top: spots[0].top, left: spots[0].left, transform: `translate(-50%, -50%) scale(${inv})` }}
          onClick={() => openAddPanel(0)}
        >
          <span aria-hidden="true">+</span> Add section
        </button>
      ) : (
        // F097: real, labelled buttons: reachable by Tab, shown in full on touch screens and on focus.
        spots.map((s) => {
          const words = s.index === 0 ? "Add section at the top" : s.index === content.length ? "Add section at the end" : "Add section here";
          return (
            <button
              key={s.index}
              type="button"
              className="lg-insert"
              aria-label={words}
              style={{ top: s.top, left: s.left, transform: `translate(-50%, -50%) scale(${inv})` }}
              onClick={() => openAddPanel(s.index)}
            >
              <span aria-hidden="true" className="lg-insert-plus">+</span>
              <span aria-hidden="true" className="lg-insert-words">{words}</span>
            </button>
          );
        })
      )}
    </div>,
    doc.body,
  );
}

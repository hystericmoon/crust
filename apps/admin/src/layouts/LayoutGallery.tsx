/**
 * The layout library in the builder (F026), direction B: a big gallery
 * opened from a "+" between sections on the canvas, or from the "Layouts"
 * button in the top bar (the keyboard way in).
 *
 * Thumbnails are the publish renderer's own HTML, styled by the site tokens
 * already on the page, so they show the site's current style.
 */
import { layoutCategories, sectionLayouts, type LayoutCategory } from "@crust/blocks";
import { renderBody } from "@crust/render";
import { createUsePuck, useGetPuck, type ComponentData, type Config, type Data } from "@puckeditor/core";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { announce, focusBlock, select } from "../keyboard/KeyboardEditing";
import { RadioGroup } from "../sections/controls";
import {
  buildItem,
  describeInsertion,
  filterLayouts,
  insertionPoint,
  openLayoutGallery,
  planLayoutInsert,
  registerGalleryOpener,
  type LayoutItem,
  type LayoutKind,
} from "./library";

const usePuckSelector = createUsePuck();

/** Previews are drawn at desktop width, then scaled down to the card. */
const PREVIEW_WIDTH = 1280;

const previews = new Map<string, string>();
/** The layout as published, rendered once. */
function previewHtml(item: LayoutItem): string {
  const key = `${item.kind}:${item.layout.id}`;
  let html = previews.get(key);
  if (html === undefined) {
    try {
      html = renderBody({ root: { props: {} }, content: buildItem(item) });
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

function Card({ item, onPick }: { item: LayoutItem; onPick: (item: LayoutItem) => void }) {
  const { layout } = item;
  const descId = `lg-desc-${item.kind}-${layout.id}`;
  const meta = item.kind === "page" ? `${item.layout.sections.length} sections` : item.layout.category;
  return (
    <li className="lg-card">
      <Thumb item={item} maxHeight={item.kind === "page" ? 300 : 190} />
      <div className="lg-card-text">
        <button type="button" className="lg-card-button" aria-describedby={descId} onClick={() => onPick(item)}>
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

const categoryCount = (c: LayoutCategory | "All") =>
  c === "All" ? sectionLayouts.length : sectionLayouts.filter((l) => l.category === c).length;

/** The gallery dialog. Lives in overrides.puck, so it can reach the editor. */
export function LayoutGallery() {
  const getPuck = useGetPuck();
  const dialog = useRef<HTMLDialogElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [kind, setKind] = useState<LayoutKind>("section");
  const [category, setCategory] = useState<LayoutCategory | "All">("All");
  const [query, setQuery] = useState("");

  useEffect(
    () =>
      registerGalleryOpener((at) => {
        const puck = getPuck();
        const content = (puck.appState.data as Data).content;
        setIndex(at ?? insertionPoint(content, puck.selectedItem?.props.id as string | undefined));
        setQuery("");
        setOpen(true);
        const el = dialog.current;
        if (el && !el.open) el.showModal();
        // Straight to the search box: type "pricing" and Tab to the first match.
        requestAnimationFrame(() => search.current?.focus());
      }),
    [getPuck],
  );

  const close = () => dialog.current?.close();
  const items = useMemo(() => filterLayouts(kind, category, query), [kind, category, query]);
  const where = open ? describeInsertion(getPuck().config as Config, (getPuck().appState.data as Data).content, index) : "";

  const pick = (item: LayoutItem) => {
    const puck = getPuck();
    const plan = planLayoutInsert(puck.appState.data as Data, item, index);
    close();
    if (!plan) return;
    // setData skips the undo history unless asked; one Undo removes the whole layout.
    puck.dispatch({ type: "setData", data: plan.data, recordHistory: true });
    select(getPuck, plan.firstId);
    focusBlock(plan.firstId);
    announce(plan.announcement);
  };

  return (
    <dialog
      ref={dialog}
      className="lg-dialog"
      aria-labelledby="lg-title"
      aria-describedby="lg-where"
      onClose={() => setOpen(false)}
      // A click on the dimmed backdrop (the dialog element itself) closes it.
      onClick={(e) => {
        if (e.target === dialog.current) close();
      }}
    >
      {open ? (
        <div className="lg-box">
          <header className="lg-head">
            <div className="lg-head-text">
              <h2 id="lg-title">Add a layout</h2>
              <p id="lg-where" className="lg-where">
                {where}
              </p>
            </div>
            <RadioGroup<LayoutKind>
              label="Kind of layout"
              className="lg-kind"
              optionClass="lg-kind-option"
              value={kind}
              onChange={setKind}
              options={[
                { value: "section", label: "Sections" },
                { value: "page", label: "Whole pages" },
              ]}
            />
            <button type="button" className="lg-close" onClick={close}>
              Close
            </button>
          </header>
          <div className="lg-body">
            <nav className="lg-side" aria-label="Categories">
              {kind === "section" ? (
                <ul className="lg-cats">
                  {(["All", ...layoutCategories] as const).map((c) => (
                    <li key={c}>
                      <button type="button" className="lg-cat" aria-pressed={category === c} onClick={() => setCategory(c)}>
                        <span>{c}</span>
                        <span className="lg-cat-count">{categoryCount(c)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="lg-side-note">A whole page adds all its sections at once. Change or remove any of them after.</p>
              )}
            </nav>
            <div className="lg-main">
              <label className="lg-search">
                <span className="lg-search-label">Search layouts</span>
                <input
                  ref={search}
                  type="search"
                  value={query}
                  placeholder="Pricing, team, questions…"
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
              <p className="lg-count" role="status">
                {items.length === 0
                  ? ""
                  : `${items.length} ${kind === "page" ? "page layout" : "section"}${items.length === 1 ? "" : "s"}${
                      kind === "section" && category !== "All" ? ` in ${category}` : ""
                    }`}
              </p>
              {items.length ? (
                <ul className={kind === "page" ? "lg-grid is-pages" : "lg-grid"}>
                  {items.map((item) => (
                    <Card key={`${item.kind}:${item.layout.id}`} item={item} onPick={pick} />
                  ))}
                </ul>
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
  return createPortal(
    <div className="lg-inserters">
      {empty && spots[0] ? (
        // An empty page: the library is the obvious first step, so it's a real, reachable button.
        <button
          type="button"
          className="lg-insert-empty"
          style={{ top: spots[0].top, left: spots[0].left, transform: `translate(-50%, -50%) scale(${inv})` }}
          onClick={() => openLayoutGallery(0)}
        >
          <span aria-hidden="true">+</span> Add a layout
        </button>
      ) : (
        // Pointer shortcuts: keyboard users have the "Layouts" button, which adds after the selected section.
        spots.map((s) => (
          <button
            key={s.index}
            type="button"
            className="lg-insert"
            tabIndex={-1}
            aria-hidden="true"
            data-tip={s.index === 0 ? "Add a layout at the top" : s.index === content.length ? "Add a layout at the end" : "Add a layout here"}
            style={{ top: s.top, left: s.left, transform: `translate(-50%, -50%) scale(${inv})` }}
            onClick={() => openLayoutGallery(s.index)}
          >
            +
          </button>
        ))
      )}
    </div>,
    doc.body,
  );
}

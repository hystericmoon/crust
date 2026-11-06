/**
 * Section editing in the builder (F025): visual fields in the side panel and
 * a quick toolbar on the selected section. Both edit "This section" or, with
 * the scope switch, the site-wide style itself ("Whole site").
 */
import {
  backgroundKindOf,
  sectionStyleNames,
  type Components,
  type SectionHeight,
  type SectionProps,
  type SectionStyleId,
  type TintLevel,
} from "@crust/blocks";
import { ActionBar, createUsePuck, useGetPuck, type ComponentData, type Config, type Data } from "@puckeditor/core";
import { useEffect, useRef, useState, useSyncExternalStore, type KeyboardEvent, type ReactNode } from "react";
import { SaveLayoutForm } from "../layouts/SaveLayoutAction";
import { MakeLinkedForm } from "../linked/fields";
import { useInSectionEditor } from "../linked/store";
import { HeightPicker, SectionStyleEditor, StyleSwatch, StyleTiles, TintPicker, RadioGroup } from "./controls";
import { countSectionStyles, useSiteStyle } from "./site-style";
import { ImageField } from "../media/ImageField";
import { FocusPicker, MovingField, sectionV2Fields } from "./sections-v2-fields";
import { columnsV2Fields } from "./columns-v2-fields";

const usePuckSelector = createUsePuck();

// --- Scope: "This section" or "Whole site", shared by panel and toolbar ----------

export type Scope = "local" | "global";
let scope: Scope = "local";
const scopeListeners = new Set<() => void>();
export function setScope(next: Scope) {
  scope = next;
  scopeListeners.forEach((l) => l());
}
function useScope(): [Scope, (s: Scope) => void] {
  const value = useSyncExternalStore(
    (l) => {
      scopeListeners.add(l);
      return () => scopeListeners.delete(l);
    },
    () => scope,
  );
  return [value, setScope];
}

export function useSelectedSection(): SectionProps | null {
  const item = usePuckSelector((s) => s.selectedItem);
  return item?.type === "Section" ? (item.props as SectionProps) : null;
}

/** Whether the selected block is the page's first top-level block (F075: it never waits for an entrance). */
export function useIsFirstSection(): boolean {
  const id = usePuckSelector((s) => s.selectedItem?.props.id as string | undefined);
  const first = usePuckSelector((s) => (s.appState.data as Data).content?.[0]?.props.id as string | undefined);
  return !!id && id === first;
}

function useCounts() {
  const data = usePuckSelector((s) => s.appState.data) as Data;
  return countSectionStyles(data);
}

/** Changes props of the selected section in one undoable step. */
export function usePatchSelected() {
  const getPuck = useGetPuck();
  return (patch: Partial<SectionProps>) => {
    const puck = getPuck();
    const item = puck.selectedItem;
    if (!item) return;
    const selector = puck.getSelectorForId(item.props.id as string);
    if (!selector) return;
    puck.dispatch({
      type: "replace",
      destinationIndex: selector.index,
      destinationZone: selector.zone,
      data: { ...item, props: { ...item.props, ...patch } },
    });
  };
}

// --- Side panel fields ---------------------------------------------------------------

/** "Muted is a site-wide style": the way into editing it everywhere. */
function GlobalStyleCard({ id }: { id: SectionStyleId }) {
  const site = useSiteStyle();
  const counts = useCounts();
  const [current, set] = useScope();
  const [message, setMessage] = useState("");
  const open = current === "global";
  const n = counts[id] ?? 0;
  return (
    <div className={open ? "sx-global is-open" : "sx-global"}>
      <p className="sx-global-head">
        <strong>{sectionStyleNames[id]}</strong> is a site-wide style · {n} section{n === 1 ? "" : "s"} on this page
      </p>
      <button type="button" className="sx-button sx-button-global" aria-expanded={open} onClick={() => set(open ? "local" : "global")}>
        {open ? "Done editing everywhere" : "Edit everywhere"}
      </button>
      {open ? <SectionStyleEditor tokens={site.tokens} id={id} onChange={site.setTokens} usedOnPage={n} /> : null}
      <SaveSiteStyle onMessage={setMessage} />
      <p className="sx-note" role="status">
        {message}
      </p>
    </div>
  );
}

/** Shown while site-wide edits are unsaved; saves them like Site settings does. */
function SaveSiteStyle({ onMessage }: { onMessage: (m: string) => void }) {
  const site = useSiteStyle();
  if (!site.dirty) return null;
  return (
    <div className="sx-save">
      <span>Site style changed, not saved yet.</span>
      <button type="button" className="sx-button sx-button-global" onClick={() => void site.save().then(onMessage)}>
        Save site style
      </button>
      <button
        type="button"
        className="sx-button"
        onClick={() => {
          site.discard();
          onMessage("Site style changes undone.");
        }}
      >
        Undo
      </button>
    </div>
  );
}

function StyleField({ value, onChange }: { value: SectionStyleId; onChange: (v: SectionStyleId) => void }) {
  const site = useSiteStyle();
  const counts = useCounts();
  return (
    <div className="sx-stack">
      <span className="sx-label">Style</span>
      <StyleTiles tokens={site.tokens} value={value ?? "background"} onChange={onChange} counts={counts} />
      <GlobalStyleCard id={value ?? "background"} />
    </div>
  );
}

function TintField({ value, onChange }: { value: TintLevel; onChange: (v: TintLevel) => void }) {
  const site = useSiteStyle();
  const section = useSelectedSection();
  if (!section?.imageSrc?.trim()) return <p className="sx-note">Add a background image above to choose its tint.</p>;
  return (
    <div className="sx-stack">
      <span className="sx-label">Image tint</span>
      <TintPicker tokens={site.tokens} style={section.background} value={value ?? "medium"} onChange={onChange} />
    </div>
  );
}

/** The builder's config: the same blocks, with visual Section fields. */
export function withSectionEditing(config: Config<Components>): Config<Components> {
  const section = config.components.Section;
  const columns = config.components.Columns;
  const logos = config.components.LogoRow;
  return {
    ...config,
    components: {
      ...config.components,
      Section: {
        ...section,
        fields: {
          ...section.fields,
          background: { type: "custom", label: "Style", render: ({ value, onChange }) => <StyleField value={value} onChange={onChange} /> },
          height: {
            type: "custom",
            label: "Height",
            render: ({ value, onChange }) => (
              <div className="sx-stack">
                <span className="sx-label">Height</span>
                <HeightPicker value={(value as SectionHeight) ?? "auto"} onChange={onChange} />
              </div>
            ),
          },
          tint: { type: "custom", label: "Image tint", render: ({ value, onChange }) => <TintField value={value ?? "medium"} onChange={onChange} /> },
          ...sectionV2Fields,
        },
      },
      // F074: Columns boxes, line-up, dividers, phone order, sticky.
      // Widths (filled in by the responsive fields) come first in the Style tab, with Line up.
      // F075: the moving logo row, with a note when the site's motion is off.
      LogoRow: {
        ...logos,
        fields: {
          ...logos.fields,
          moving: { type: "custom", label: "Scroll slowly", render: ({ value, onChange }) => <MovingField value={value} onChange={onChange} /> },
        },
      },
      Columns: { ...columns, fields: { count: columns.fields?.count, widths: { type: "custom", label: "Widths", render: () => <></> }, ...columns.fields, ...columnsV2Fields } },
    },
  } as Config<Components>;
}

// --- Canvas toolbar ---------------------------------------------------------------------

type Pop = "section" | "style" | "layout" | "more" | "everywhere" | "global" | "keep" | "link" | null;

/**
 * The quick bar on a selected section; lives inside the canvas action bar (F089).
 * One row: Section (background picture), Style (named colours), Layout (height),
 * Move (the arrow buttons, passed in), More (site-wide and keeping actions).
 */
export function SectionToolbar({ moves }: { moves?: ReactNode }) {
  const getPuck = useGetPuck();
  const section = useSelectedSection();
  const item = usePuckSelector((s) => s.selectedItem) as ComponentData | null;
  const site = useSiteStyle();
  const counts = useCounts();
  const patch = usePatchSelected();
  const inEditor = useInSectionEditor();
  const [current, setCurrent] = useScope();
  const [pop, setPop] = useState<Pop>(null);
  const rowRef = useRef<HTMLDivElement>(null);

  // A different section: start closed.
  const id = section ? (section as SectionProps & { id?: string }).id : undefined;
  useEffect(() => setPop(current === "global" ? "global" : null), [id, current]);

  if (!section || !item) return null;
  const style = section.background ?? "background";
  const n = counts[style] ?? 0;
  const toggle = (p: Exclude<Pop, null>) => setPop(pop === p ? null : p);
  const shown = (p: Exclude<Pop, null>) => (p === "more" ? pop === "more" || pop === "everywhere" || pop === "keep" || pop === "link" || pop === "global" : pop === p);
  const close = () => {
    setPop(null);
    if (current === "global") setCurrent("local");
  };
  const buttons = () => Array.from(rowRef.current?.querySelectorAll<HTMLButtonElement>("button") ?? []);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape" && pop) {
      e.stopPropagation();
      const opener = rowRef.current?.querySelector<HTMLButtonElement>('button[aria-expanded="true"]');
      close();
      opener?.focus();
      return;
    }
    // Arrow keys move along the row (a toolbar is one tab stop's worth of choices, not nine).
    const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    const target = e.target as HTMLElement;
    if (!step || !rowRef.current?.contains(target) || target.tagName !== "BUTTON") return;
    const all = buttons();
    const i = all.indexOf(target as HTMLButtonElement);
    if (i < 0) return;
    e.preventDefault();
    e.stopPropagation();
    all[(i + step + all.length) % all.length]!.focus();
  };

  const tab = (p: "section" | "style" | "layout", label: string) => (
    <button type="button" className="sx-tbtn" aria-expanded={shown(p)} onClick={() => toggle(p)}>
      {label} <span aria-hidden="true">▾</span>
    </button>
  );

  return (
    <ActionBar.Group>
      <div ref={rowRef} className={`sx-toolbar is-${current}`} role="toolbar" aria-label="Section" onKeyDown={onKeyDown}>
        {tab("section", "Section")}
        {tab("style", "Style")}
        {tab("layout", "Layout")}
        {moves}
        <button type="button" className="sx-tbtn" aria-expanded={shown("more")} onClick={() => (shown("more") ? close() : setPop("more"))}>
          More <span aria-hidden="true">⋯</span>
        </button>
      </div>
      {pop ? (
        <div className={pop === "global" || pop === "everywhere" ? "sx-pop is-global" : "sx-pop"} role="group" aria-label={popLabel(pop, style)} onKeyDown={onKeyDown}>
          {pop === "layout" ? <HeightPicker value={section.height ?? "auto"} onChange={(height) => patch({ height })} /> : null}
          {pop === "section" ? (
            <div className="sx-stack">
              <ImageField
                label={backgroundKindOf(section) === "video" ? "Still photo" : "Background image"}
                value={section.imageSrc ?? ""}
                // F073: a photo picked here shows, whatever background kind was chosen before (a video keeps it as its still).
                onChange={(imageSrc) => patch(backgroundKindOf(section) === "video" || !imageSrc.trim() ? { imageSrc } : { imageSrc, bgKind: "photo" })}
              />
              {section.imageSrc?.trim() ? (
                <>
                  <FocusPicker src={section.imageSrc} value={section.focus} onChange={(focus) => patch({ focus })} />
                  <TintPicker tokens={site.tokens} style={style} value={section.tint ?? "medium"} onChange={(tint) => patch({ tint })} />
                </>
              ) : null}
            </div>
          ) : null}
          {pop === "style" ? (
            <>
              <RadioGroup<SectionStyleId>
                label="Section style"
                className="sx-named"
                optionClass="sx-named-option"
                value={style}
                onChange={(background) => patch({ background })}
                options={(["background", "surface", "primary", "dark"] as const).map((sid) => ({
                  value: sid,
                  label: `${sectionStyleNames[sid]} style`,
                  content: (
                    <>
                      <StyleSwatch tokens={site.tokens} id={sid} size="dot" />
                      <span>{sectionStyleNames[sid]}</span>
                    </>
                  ),
                }))}
              />
              <p className="sx-note">Changes this section only.</p>
            </>
          ) : null}
          {pop === "more" ? (
            <div className="sx-menu">
              <button type="button" className="sx-menu-item" onClick={() => setPop("everywhere")}>
                Change “{sectionStyleNames[style]}” everywhere…
              </button>
              {inEditor ? null : (
                <button type="button" className="sx-menu-item" onClick={() => setPop("link")}>
                  Make linked (use on many pages)…
                </button>
              )}
              <button type="button" className="sx-menu-item" onClick={() => setPop("keep")}>
                Save as layout…
              </button>
            </div>
          ) : null}
          {pop === "everywhere" ? (
            <>
              <strong>Change “{sectionStyleNames[style]}” everywhere?</strong>
              <p className="sx-note">
                This changes {n} section{n === 1 ? "" : "s"} on this page, and every {sectionStyleNames[style]} section on the site’s other pages. You can undo
                before you save.
              </p>
              <div className="sx-step-buttons">
                <button type="button" className="sx-button sx-button-global" onClick={() => setCurrent("global")}>
                  Change everywhere
                </button>
                <button type="button" className="sx-button" onClick={() => setPop("more")}>
                  Cancel
                </button>
              </div>
            </>
          ) : null}
          {pop === "global" ? (
            <>
              <SectionStyleEditor tokens={site.tokens} id={style} onChange={site.setTokens} usedOnPage={n} />
              <SaveSiteStyle onMessage={() => undefined} />
              <button type="button" className="sx-button" onClick={close}>
                Done editing everywhere
              </button>
            </>
          ) : null}
          {pop === "keep" ? <SaveLayoutForm item={item} onDone={() => setPop(null)} /> : null}
          {pop === "link" ? <MakeLinkedForm item={item} onDone={() => setPop(null)} /> : null}
        </div>
      ) : null}
    </ActionBar.Group>
  );
}

const popLabel = (pop: Exclude<Pop, null>, style: SectionStyleId) =>
  ({
    section: "Section background",
    style: "Section style",
    layout: "Section height",
    more: "More for this section",
    everywhere: `Change the ${sectionStyleNames[style]} style everywhere`,
    global: `Edit the ${sectionStyleNames[style]} style for the whole site`,
    keep: "Save this section as a layout",
    link: "Make this section a linked section",
  })[pop];

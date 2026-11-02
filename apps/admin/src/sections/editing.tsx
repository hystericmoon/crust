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
import { ActionBar, createUsePuck, useGetPuck, type Config, type Data } from "@puckeditor/core";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { HeightPicker, SectionStyleEditor, StyleSwatch, StyleTiles, TintPicker, RadioGroup } from "./controls";
import { countSectionStyles, useSiteStyle } from "./site-style";
import { ImageField } from "../media/ImageField";
import { FocusPicker, sectionV2Fields } from "./sections-v2-fields";

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
    },
  } as Config<Components>;
}

// --- Canvas toolbar ---------------------------------------------------------------------

type Pop = "height" | "image" | "global" | null;

/** The quick bar on a selected section; lives inside the canvas action bar. */
export function SectionToolbar() {
  const section = useSelectedSection();
  const site = useSiteStyle();
  const counts = useCounts();
  const patch = usePatchSelected();
  const [current, setCurrent] = useScope();
  const [pop, setPop] = useState<Pop>(null);
  const popRef = useRef<HTMLDivElement>(null);

  // A different section: start closed.
  const id = section ? (section as SectionProps & { id?: string }).id : undefined;
  useEffect(() => setPop(current === "global" ? "global" : null), [id, current]);

  if (!section) return null;
  const style = section.background ?? "background";
  const n = counts[style] ?? 0;
  const toggle = (p: Exclude<Pop, null>) => setPop(pop === p ? null : p);

  return (
    <ActionBar.Group>
      <div
        className={`sx-toolbar is-${current}`}
        onKeyDown={(e) => {
          if (e.key === "Escape" && pop) {
            e.stopPropagation();
            setPop(null);
          }
        }}
      >
        <RadioGroup<"local" | "global">
          label="What to change"
          className="sx-scope"
          optionClass="sx-scope-option"
          value={current}
          onChange={(s) => {
            setCurrent(s);
            setPop(s === "global" ? "global" : null);
          }}
          options={[
            { value: "local", label: "This section" },
            { value: "global", label: "Whole site" },
          ]}
        />
        {current === "local" ? (
          <>
            <RadioGroup<SectionStyleId>
              label="Section style"
              className="sx-dots"
              optionClass="sx-dot-option"
              value={style}
              onChange={(background) => patch({ background })}
              options={(["background", "surface", "primary", "dark"] as const).map((sid) => ({
                value: sid,
                label: `${sectionStyleNames[sid]} style`,
                content: <StyleSwatch tokens={site.tokens} id={sid} size="dot" />,
              }))}
            />
            <button type="button" className="sx-tbtn" aria-expanded={pop === "height"} onClick={() => toggle("height")}>
              Height
            </button>
            <button type="button" className="sx-tbtn" aria-expanded={pop === "image"} onClick={() => toggle("image")}>
              Image{section.imageSrc?.trim() ? " ✓" : ""}
            </button>
          </>
        ) : (
          <button type="button" className="sx-tbtn sx-tbtn-global" aria-expanded={pop === "global"} onClick={() => toggle("global")}>
            Edit “{sectionStyleNames[style]}” · {n} section{n === 1 ? "" : "s"}
          </button>
        )}
      </div>
      {pop ? (
        <div ref={popRef} className={pop === "global" ? "sx-pop is-global" : "sx-pop"} role="group" aria-label={popLabel(pop, style)}>
          {pop === "height" ? <HeightPicker value={section.height ?? "auto"} onChange={(height) => patch({ height })} /> : null}
          {pop === "image" ? (
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
          {pop === "global" ? (
            <>
              <SectionStyleEditor tokens={site.tokens} id={style} onChange={site.setTokens} usedOnPage={n} />
              <SaveSiteStyle onMessage={() => undefined} />
            </>
          ) : null}
        </div>
      ) : null}
    </ActionBar.Group>
  );
}

const popLabel = (pop: Exclude<Pop, null>, style: SectionStyleId) =>
  pop === "height" ? "Section height" : pop === "image" ? "Background image" : `Edit the ${sectionStyleNames[style]} style for the whole site`;

/**
 * Content, Style and Advanced tabs in the block settings panel (F030), so
 * simple edits stay simple. Every field belongs to one tab; Puck's
 * `resolveFields` shows only the current tab's fields. The chosen tab is
 * kept when you select another block.
 */
import { cleanAnchor, type Components } from "@crust/blocks";
import { createUsePuck, useGetPuck, type ComponentData, type Config, type Data, type Field, type Fields } from "@puckeditor/core";
import { useEffect, useId, useState, useSyncExternalStore } from "react";
import { RadioGroup } from "../sections/controls";

export const tabs = ["content", "style", "advanced"] as const;
export type Tab = (typeof tabs)[number];
export const tabNames: Record<Tab, string> = { content: "Content", style: "Style", advanced: "Advanced" };

/** Where each field lives. Anything not listed is Content. */
const styleFields = new Set([
  "align",
  "tone",
  "variant",
  "background",
  "height",
  "valign",
  "imageSrc:Section",
  "tint",
  "size",
  "widths",
  // F032 blocks
  "columns",
  "shape",
  "icon",
  "iconColor",
  "logoSize",
  "grayscale",
  "position",
]);
const advancedFields = new Set(["hideOn", "anchor", "paddingY", "gap", "placeholder"]);

export function tabOf(component: string, field: string): Tab {
  if (advancedFields.has(field)) return "advanced";
  if (styleFields.has(field) || styleFields.has(`${field}:${component}`)) return "style";
  return "content";
}

// --- The current tab, shared by both copies of the panel (sidebar and phone layout) ---

let current: Tab = "content";
const listeners = new Set<() => void>();
export const getTab = () => current;
export function setTab(next: Tab) {
  current = next;
  listeners.forEach((l) => l());
}
const useTab = () =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current,
  );

const usePuckSelector = createUsePuck();

/** Puck only works fields out again when the block changes; re-saving the same props (outside undo) does that. */
function useRefreshFields() {
  const getPuck = useGetPuck();
  return () => {
    const puck = getPuck();
    const item = puck.selectedItem;
    if (!item) return;
    const selector = puck.getSelectorForId(item.props.id as string);
    if (!selector) return;
    puck.dispatch({ type: "replace", destinationIndex: selector.index, destinationZone: selector.zone, data: { ...item }, recordHistory: false });
  };
}

export function TabBar() {
  const tab = useTab();
  const refresh = useRefreshFields();
  return (
    <RadioGroup<Tab>
      label="Settings to show"
      className="tb-tabs"
      optionClass="tb-tab"
      value={tab}
      onChange={(t) => {
        setTab(t);
        refresh();
      }}
      options={tabs.map((t) => ({ value: t, label: tabNames[t] }))}
    />
  );
}

/** Shown when a tab has nothing for this block. */
function EmptyTab({ component }: { component: string }) {
  const tab = useTab();
  const text =
    tab === "content" && component === "Section"
      ? "A section's content is on the canvas: add blocks inside it, or pick a layout with the + buttons."
      : `${component} has no ${tabNames[tab].toLowerCase()} settings.`;
  return <p className="tb-empty">{text}</p>;
}

/** Every anchor on the page except the given block's, for the duplicate warning. */
function anchorsElsewhere(data: Data, id: string): Set<string> {
  const found = new Set<string>();
  const walk = (items: ComponentData[]) => {
    for (const item of items) {
      if (item.props.id !== id) {
        const a = cleanAnchor(item.props.anchor);
        if (a) found.add(a);
      }
      for (const v of Object.values(item.props)) if (Array.isArray(v) && v.every((x) => x && typeof x === "object" && "type" in x)) walk(v as ComponentData[]);
    }
  };
  walk(data.content);
  return found;
}

export function AnchorField({ value, onChange }: { value: string | undefined; onChange: (v: string) => void }) {
  const inputId = useId();
  const [raw, setRaw] = useState(value ?? "");
  const data = usePuckSelector((s) => s.appState.data) as Data;
  const id = usePuckSelector((s) => s.selectedItem?.props.id) as string | undefined;
  // Another block selected (or undo): show its anchor, unless it's what's being typed.
  useEffect(() => setRaw((r) => (cleanAnchor(r) === (value ?? "") ? r : (value ?? ""))), [value]);
  const clean = cleanAnchor(raw);
  const taken = clean && id ? anchorsElsewhere(data, id).has(clean) : false;
  return (
    <div className="tb-anchor">
      <label className="tb-label" htmlFor={inputId}>
        Anchor name
      </label>
      <input
        id={inputId}
        className="tb-input"
        value={raw}
        placeholder="e.g. team"
        aria-describedby={`${inputId}-help`}
        aria-invalid={taken || undefined}
        onChange={(e) => {
          setRaw(e.target.value);
          onChange(cleanAnchor(e.target.value));
        }}
      />
      <p className={taken ? "tb-help is-error" : "tb-help"} id={`${inputId}-help`} role={taken ? "alert" : undefined}>
        {!clean
          ? "Give this block a name to link straight to it from a button or menu."
          : taken
            ? `Another block on this page is already called #${clean}. Links go to the first one; pick another name.`
            : `Link to it with #${clean}${raw.trim() !== clean ? ` (letters, numbers and dashes only)` : ""}.`}
      </p>
    </div>
  );
}

const isSlot = (f: Field | undefined) => f?.type === "slot";

/** The builder's config: a tab switch on every block, the anchor field, and only the current tab's fields. */
export function withSettingsTabs(config: Config<Components>): Config<Components> {
  const components = Object.fromEntries(
    Object.entries(config.components).map(([name, comp]) => {
      const own: Fields = {
        _tabs: { type: "custom", label: "Settings to show", render: () => <TabBar /> },
        ...(comp.fields as Fields),
        anchor: { type: "custom", label: "Anchor name", render: ({ value, onChange }) => <AnchorField value={value as string} onChange={onChange} /> },
        _empty: { type: "custom", label: "", render: () => <EmptyTab component={name} /> },
      };
      const resolveFields = () => {
        const tab = getTab();
        const picked = Object.entries(own).filter(([key, f]) => key === "_tabs" || isSlot(f) || (key !== "_empty" && tabOf(name, key) === tab));
        const visible = picked.filter(([key, f]) => key !== "_tabs" && !isSlot(f));
        if (!visible.length) picked.push(["_empty", own._empty!]);
        return Object.fromEntries(picked) as Fields;
      };
      return [name, { ...comp, fields: own, resolveFields }];
    }),
  );
  return { ...config, components } as unknown as Config<Components>;
}

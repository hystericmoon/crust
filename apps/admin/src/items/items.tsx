/**
 * Lists of items inside a block (F032: cards in a Grid, photos in a Gallery,
 * questions in an Accordion…). Puck's own list field can only be reordered
 * by dragging; this one has Move up / Move down / Remove buttons on every
 * item and announces each change, so it all works from the keyboard.
 */
import type { Components } from "@crust/blocks";
import type { Config } from "@puckeditor/core";
import { useId, useState } from "react";
import { ImageField } from "../media/ImageField";
import { IconPicker } from "../icons/IconPicker";

type SubField =
  | { type: "text" | "textarea"; label?: string }
  | { type: "select" | "radio"; label?: string; options: { label: string; value: string }[] }
  // F034: a photo from the media library; picking one also fills `altKey`.
  | { type: "image"; label?: string; altKey?: string }
  // F077: an icon from the set; `classic` adds the Icon list's own marks.
  | { type: "icon"; label?: string; classic?: boolean };

export type ItemsFieldDef = {
  type: "array";
  label?: string;
  max?: number;
  arrayFields: Record<string, SubField>;
  defaultItemProps?: Record<string, unknown>;
  getItemSummary?: (item: Record<string, unknown>, index?: number) => string;
};

type Item = Record<string, unknown>;

/** "Cards" → "card", for "Add a card", "Card 2". */
export function itemNoun(listLabel: string): string {
  const word = listLabel.toLowerCase().replace(/s$/, "");
  return word === "photo" || word === "logo" || word === "card" || word === "question" || word === "line" || word === "extra field" ? word : "item";
}

const article = (noun: string) => (/^[aeiou]/.test(noun) ? "an" : "a");
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function ItemsField({ field, value, onChange }: { field: ItemsFieldDef; value: Item[] | undefined; onChange: (items: Item[]) => void }) {
  const items = Array.isArray(value) ? value : [];
  const id = useId();
  const label = field.label ?? "Items";
  const noun = itemNoun(label);
  const max = field.max ?? Infinity;
  const [open, setOpen] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const summary = (item: Item, i: number) => {
    const text = field.getItemSummary?.(item, i)?.trim();
    return text ? text : `${cap(noun)} ${i + 1}`;
  };
  const focusLater = (target: string, select = false) =>
    requestAnimationFrame(() => {
      const el = document.getElementById(target);
      el?.focus();
      // A new item starts with sample text; selecting it lets typing replace it.
      if (select && (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) el.select();
    });

  const set = (i: number, key: string, v: string) => onChange(items.map((it, j) => (j === i ? { ...it, [key]: v } : it)));
  const setMany = (i: number, patch: Item) => onChange(items.map((it, j) => (j === i ? { ...it, ...patch } : it)));
  const move = (i: number, by: number) => {
    const j = i + by;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j]!, next[i]!];
    onChange(next);
    if (open === i) setOpen(j);
    else if (open === j) setOpen(i);
    setMessage(`${summary(items[i]!, i)} moved to position ${j + 1} of ${items.length}.`);
    // Keep focus on the same button of the moved item, unless it just reached the end of the list.
    const edge = (by < 0 && j === 0) || (by > 0 && j === items.length - 1);
    focusLater(`${id}-${j}-${edge ? (by < 0 ? "down" : "up") : by < 0 ? "up" : "down"}`);
  };
  const remove = (i: number) => {
    const name = summary(items[i]!, i);
    onChange(items.filter((_, j) => j !== i));
    setOpen(null);
    setMessage(`${name} removed.`);
    focusLater(items.length > 1 ? `${id}-${Math.min(i, items.length - 2)}-toggle` : `${id}-add`);
  };
  const add = () => {
    if (items.length >= max) return;
    onChange([...items, { ...(field.defaultItemProps ?? {}) }]);
    setOpen(items.length);
    setMessage(`${cap(noun)} ${items.length + 1} added.`);
    focusLater(`${id}-${items.length}-first`, true);
  };

  return (
    <div className="it-list" role="group" aria-labelledby={`${id}-label`}>
      <span className="it-label" id={`${id}-label`}>
        {label}
      </span>
      {items.length ? (
        <ol className="it-items">
          {items.map((item, i) => {
            const expanded = open === i;
            const name = summary(item, i);
            return (
              <li key={i} className={expanded ? "it-item is-open" : "it-item"}>
                <div className="it-head">
                  <button
                    type="button"
                    id={`${id}-${i}-toggle`}
                    className="it-toggle"
                    aria-expanded={expanded}
                    aria-controls={`${id}-${i}-body`}
                    onClick={() => setOpen(expanded ? null : i)}
                  >
                    <span className="it-num" aria-hidden="true">
                      {i + 1}
                    </span>
                    <span className="it-name">{name}</span>
                  </button>
                  <button type="button" id={`${id}-${i}-up`} className="it-icon" disabled={i === 0} aria-label={`Move ${name} up`} onClick={() => move(i, -1)}>
                    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
                      <path d="M12 19V5M6 11l6-6 6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  <button type="button" id={`${id}-${i}-down`} className="it-icon" disabled={i === items.length - 1} aria-label={`Move ${name} down`} onClick={() => move(i, 1)}>
                    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
                      <path d="M12 5v14M6 13l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  <button type="button" className="it-icon" aria-label={`Remove ${name}`} onClick={() => remove(i)}>
                    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
                      <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
                <div className="it-body" id={`${id}-${i}-body`} hidden={!expanded}>
                  {Object.entries(field.arrayFields).map(([key, sub], k) =>
                    sub.type === "image" ? (
                      <ImageField
                        key={key}
                        firstId={k === 0 ? `${id}-${i}-first` : undefined}
                        label={sub.label ?? key}
                        context={`${cap(noun)} ${i + 1}`}
                        value={typeof item[key] === "string" ? (item[key] as string) : ""}
                        onChange={(v) => set(i, key, v)}
                        onPick={sub.altKey ? (src, alt) => setMany(i, { [key]: src, [sub.altKey!]: alt }) : undefined}
                      />
                    ) : sub.type === "icon" ? (
                      <IconPicker
                        key={key}
                        label={sub.label ?? key}
                        context={`${cap(noun)} ${i + 1}`}
                        optional
                        classic={sub.classic}
                        value={typeof item[key] === "string" ? (item[key] as string) : ""}
                        onChange={(v) => set(i, key, v)}
                      />
                    ) : (
                    <SubInput
                      key={key}
                      id={k === 0 ? `${id}-${i}-first` : `${id}-${i}-${key}`}
                      label={`${sub.label ?? key}`}
                      context={`${cap(noun)} ${i + 1}`}
                      field={sub}
                      value={typeof item[key] === "string" ? (item[key] as string) : ""}
                      onChange={(v) => set(i, key, v)}
                    />
                    ),
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="it-empty">No {noun}s yet.</p>
      )}
      <button type="button" id={`${id}-add`} className="it-add" disabled={items.length >= max} onClick={add}>
        Add {article(noun)} {noun}
      </button>
      {items.length >= max ? <p className="it-note">That's the most this block can hold ({max}).</p> : null}
      <p className="it-sr" role="status">
        {message}
      </p>
    </div>
  );
}

function SubInput({ id, label, context, field, value, onChange }: { id: string; label: string; context: string; field: SubField; value: string; onChange: (v: string) => void }) {
  return (
    <div className="it-field">
      <label className="it-field-label" htmlFor={id}>
        {label}
        <span className="it-sr">, {context}</span>
      </label>
      {field.type === "textarea" ? (
        <textarea id={id} className="it-input" rows={3} value={value} onChange={(e) => onChange(e.target.value)} />
      ) : field.type === "select" || field.type === "radio" ? (
        <select id={id} className="it-input" value={value} onChange={(e) => onChange(e.target.value)}>
          {field.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : (
        <input id={id} className="it-input" value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  );
}

/** Swaps every list ("array") field in the blocks for ItemsField. */
export function withItemEditing(config: Config<Components>): Config<Components> {
  const components = Object.fromEntries(
    Object.entries(config.components).map(([name, comp]) => {
      const fields: Record<string, unknown> = { ...comp.fields };
      for (const [key, f] of Object.entries(fields)) {
        if ((f as { type?: string })?.type !== "array") continue;
        const def = f as ItemsFieldDef;
        fields[key] = {
          type: "custom",
          label: def.label,
          render: ({ value, onChange }: { value: Item[] | undefined; onChange: (v: Item[]) => void }) => <ItemsField field={def} value={value} onChange={onChange} />,
        };
      }
      return [name, { ...comp, fields }];
    }),
  );
  return { ...config, components } as unknown as Config<Components>;
}

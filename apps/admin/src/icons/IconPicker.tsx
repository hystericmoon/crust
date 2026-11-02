/**
 * The icon picker (F077, direction A of
 * https://claude.ai/artifact/8o1uPhHmTBd9hgkzmx1pU2): search by meaning plus
 * six categories over the curated set. A grid of buttons with one Tab stop:
 * arrow keys move, Enter or Space picks; each icon has a spoken name.
 *
 * Why this shape: searching by meaning ("food" finds utensils, coffee and
 * pizza) means recognising, not remembering technical names; categories
 * keep ~150 icons browsable (Hick's law); one Tab stop keeps the panel quick
 * to move through by keyboard.
 */
import {
  ListIconSvg,
  IconSvg,
  iconCategories,
  iconCategoryNames,
  iconLabel,
  isIconName,
  listIconNames,
  listIcons,
  searchIcons,
  type IconCategory,
} from "@crust/blocks";
import { useId, useMemo, useRef, useState, type KeyboardEvent } from "react";

/** Icons per row: fixed, so Up and Down move by exactly one row. */
export const PICKER_COLUMNS = 6;

type Category = IconCategory | "all" | "classic";

export interface IconPickerProps {
  label: string;
  value: string;
  onChange: (name: string) => void;
  /** Offer "No icon" (Card, Button, a list line's own icon). */
  optional?: boolean;
  /** Offer the Icon list's six classic marks as their own group, first. */
  classic?: boolean;
  /** Read after the label, for lists ("Line 2"). */
  context?: string;
}

const classicLabel = (name: string) => `${listIconNames[name as keyof typeof listIconNames]} (list mark)`;
const isClassic = (name: string) => (listIcons as readonly string[]).includes(name);

export function IconPicker({ label, value, onChange, optional = false, classic = false, context }: IconPickerProps) {
  const id = useId();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category>(() => (classic && (!value || isClassic(value)) ? "classic" : "all"));
  const grid = useRef<HTMLDivElement>(null);
  const [focusIndex, setFocusIndex] = useState<number | null>(null);

  const names = useMemo(() => {
    if (category === "classic" && !query.trim()) return [...listIcons] as string[];
    return searchIcons(query, category === "classic" ? "all" : category);
  }, [query, category]);
  const options = optional && !query.trim() ? ["", ...names] : names;
  const current = options.indexOf(value);
  // The Tab stop: the last focused icon, else the chosen one, else the first.
  const tabIndexAt = focusIndex !== null && focusIndex < options.length ? focusIndex : current >= 0 ? current : 0;

  const nameOf = (n: string) => (n === "" ? "No icon" : classic && isClassic(n) ? classicLabel(n) : iconLabel(n));
  const picked = value && (isIconName(value) || (classic && isClassic(value))) ? nameOf(value) : optional ? "No icon" : "None";

  const move = (to: number) => {
    const next = Math.max(0, Math.min(options.length - 1, to));
    setFocusIndex(next);
    grid.current?.querySelectorAll<HTMLButtonElement>("button")[next]?.focus();
  };
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = Number((e.target as HTMLElement).dataset.index ?? -1);
    if (i < 0) return;
    const to = {
      ArrowRight: i + 1,
      ArrowLeft: i - 1,
      ArrowDown: i + PICKER_COLUMNS,
      ArrowUp: i - PICKER_COLUMNS,
      Home: 0,
      End: options.length - 1,
    }[e.key];
    if (to === undefined) return;
    e.preventDefault();
    e.stopPropagation();
    move(to);
  };

  const chips: Category[] = [...(classic ? (["classic"] as const) : []), "all", ...iconCategories];
  const chipName = (c: Category) => (c === "all" ? "All" : c === "classic" ? "List marks" : iconCategoryNames[c]);

  return (
    <div className="ic-picker" role="group" aria-labelledby={`${id}-label`}>
      <div className="ic-head">
        <span className="ic-label" id={`${id}-label`}>
          {label}
          {context ? <span className="ic-sr">, {context}</span> : null}
        </span>
        <span className="ic-picked" aria-live="polite">
          {picked}
        </span>
      </div>
      <input
        className="ic-search"
        type="search"
        aria-label={`Search icons${context ? `, ${context}` : ""}`}
        placeholder="Search: “phone”, “food”…"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setFocusIndex(null);
        }}
      />
      <div className="ic-chips" role="group" aria-label="Icon categories">
        {chips.map((c) => (
          <button
            key={c}
            type="button"
            className="ic-chip"
            aria-pressed={category === c}
            onClick={() => {
              setCategory(c);
              setFocusIndex(null);
            }}
          >
            {chipName(c)}
          </button>
        ))}
      </div>
      {options.length ? (
        <div className="ic-grid" ref={grid} role="group" aria-label={`Icons, ${options.length}`} onKeyDown={onKey} style={{ gridTemplateColumns: `repeat(${PICKER_COLUMNS}, minmax(0, 1fr))` }}>
          {options.map((n, i) => (
            <button
              key={n || "none"}
              type="button"
              className="ic-cell"
              data-index={i}
              aria-label={nameOf(n)}
              aria-pressed={n === value}
              title={nameOf(n)}
              tabIndex={i === tabIndexAt ? 0 : -1}
              onFocus={() => setFocusIndex(i)}
              onClick={() => onChange(n)}
            >
              {n === "" ? (
                <span className="ic-none" aria-hidden="true" />
              ) : classic && isClassic(n) ? (
                <ListIconSvg icon={n} />
              ) : (
                <IconSvg name={n} size={20} />
              )}
            </button>
          ))}
        </div>
      ) : (
        <p className="ic-empty" role="status">
          No icon matches “{query.trim()}”. Try a simpler word, like “food” or “arrow”.
        </p>
      )}
      <p className="ic-hint">Arrow keys move, Enter picks.</p>
    </div>
  );
}

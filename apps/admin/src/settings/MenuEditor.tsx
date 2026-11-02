/**
 * The header menu with dropdowns (F076, direction A of
 * https://claude.ai/artifact/MQpL3LHaxEQW9r3KsWEygz): the same list as
 * before (label, address, move up/down, remove) plus "Put under the item
 * above" and "Take out", so a dropdown is made with buttons, never by
 * dragging. One level deep.
 */
import { chromeLimits, type MenuLink } from "@crust/blocks";
import { useId, useState } from "react";
import type { PageOption } from "./ChromeGroups";

type Path = [number] | [number, number];

const at = (menu: MenuLink[], p: Path): MenuLink =>
  p.length === 1 ? menu[p[0]]! : menu[p[0]]!.children![p[1]]!;
const name = (l: MenuLink, fallback: string) => l.label.trim() || fallback;

/** The menu with one item changed. */
function patchAt(
  menu: MenuLink[],
  p: Path,
  patch: Partial<MenuLink>,
): MenuLink[] {
  return menu.map((l, i) => {
    if (i !== p[0]) return l;
    if (p.length === 1) return { ...l, ...patch };
    return {
      ...l,
      children: l.children!.map((c, j) =>
        j === p[1] ? { ...c, ...patch } : c,
      ),
    };
  });
}

const withChildren = (l: MenuLink, children: MenuLink[]): MenuLink => {
  const { children: _drop, ...rest } = l;
  return children.length ? { ...rest, children } : rest;
};

/** Moves an item up or down among its own siblings. */
export function moveItem(
  menu: MenuLink[],
  p: Path,
  by: number,
): MenuLink[] | null {
  const swap = <T,>(list: T[], i: number): T[] | null => {
    const j = i + by;
    if (j < 0 || j >= list.length) return null;
    const next = [...list];
    [next[i], next[j]] = [next[j]!, next[i]!];
    return next;
  };
  if (p.length === 1) return swap(menu, p[0]);
  const kids = swap(menu[p[0]]!.children!, p[1]);
  return kids
    ? menu.map((l, i) => (i === p[0] ? withChildren(l, kids) : l))
    : null;
}

/** "Put under the item above": the item joins the end of the previous item's dropdown. */
export function indentItem(menu: MenuLink[], i: number): MenuLink[] | null {
  const item = menu[i];
  const parent = menu[i - 1];
  if (
    !item ||
    !parent ||
    item.children?.length ||
    (parent.children?.length ?? 0) >= chromeLimits.children
  )
    return null;
  const next = menu.filter((_, j) => j !== i);
  next[i - 1] = withChildren(parent, [...(parent.children ?? []), item]);
  return next;
}

/** "Take out": the item leaves its dropdown and follows its old parent in the menu. */
export function outdentItem(
  menu: MenuLink[],
  i: number,
  j: number,
): MenuLink[] | null {
  const parent = menu[i];
  const item = parent?.children?.[j];
  if (!parent || !item || menu.length >= chromeLimits.menu) return null;
  const next = [...menu];
  next[i] = withChildren(
    parent,
    parent.children!.filter((_, k) => k !== j),
  );
  next.splice(i + 1, 0, item);
  return next;
}

export function removeItem(menu: MenuLink[], p: Path): MenuLink[] {
  if (p.length === 1) return menu.filter((_, i) => i !== p[0]);
  return menu.map((l, i) =>
    i === p[0]
      ? withChildren(
          l,
          l.children!.filter((_, j) => j !== p[1]),
        )
      : l,
  );
}

export function MenuEditor({
  menu,
  onChange,
  pages,
}: {
  menu: MenuLink[];
  onChange: (menu: MenuLink[]) => void;
  pages: PageOption[];
}) {
  const id = useId();
  const [message, setMessage] = useState("");
  const [pick, setPick] = useState("");
  const used = (href: string) =>
    menu.some(
      (l) => l.href === href || l.children?.some((c) => c.href === href),
    );
  const unused = pages.filter((p) => !used(p.path));
  const full = menu.length >= chromeLimits.menu;
  const rowId = (p: Path) => `${id}-${p.join("-")}`;
  const focusSoon = (target: string) =>
    requestAnimationFrame(() => document.getElementById(target)?.focus());
  const apply = (next: MenuLink[] | null, said: string, focus?: string) => {
    if (!next) return;
    onChange(next);
    setMessage(said);
    if (focus) focusSoon(focus);
  };

  const row = (p: Path, siblings: number) => {
    const l = at(menu, p);
    const child = p.length === 2;
    const label = name(
      l,
      child
        ? `link ${p[1] + 1} in ${name(menu[p[0]]!, "the dropdown")}`
        : `link ${p[0] + 1}`,
    );
    const index = p[p.length - 1]!;
    const hasKids = !!l.children?.length;
    return (
      <li
        key={p.join("-")}
        className={child ? "st-link-row st-menu-child" : "st-link-row"}
      >
        <label className="st-sr" htmlFor={`${rowId(p)}-label`}>
          {child
            ? `Dropdown ${name(menu[p[0]]!, String(p[0] + 1))}, link ${index + 1}: label`
            : `Menu link ${index + 1}: label`}
        </label>
        <input
          id={`${rowId(p)}-label`}
          className="st-input"
          placeholder="Label"
          value={l.label}
          onChange={(e) =>
            onChange(patchAt(menu, p, { label: e.target.value }))
          }
        />
        <label className="st-sr" htmlFor={`${rowId(p)}-href`}>
          {child
            ? `Dropdown ${name(menu[p[0]]!, String(p[0] + 1))}, link ${index + 1}: address`
            : `Menu link ${index + 1}: address`}
        </label>
        <input
          id={`${rowId(p)}-href`}
          className="st-input"
          placeholder={
            hasKids ? "Optional: its own page" : "/about or https://…"
          }
          value={l.href}
          onChange={(e) => onChange(patchAt(menu, p, { href: e.target.value }))}
        />
        <span className="st-link-actions">
          <button
            type="button"
            id={`${rowId(p)}-up`}
            className="st-icon-button"
            disabled={index === 0}
            aria-label={`Move ${label} up`}
            onClick={() =>
              apply(
                moveItem(menu, p, -1),
                `${label} moved up.`,
                `${rowId(child ? [p[0], index - 1] : [index - 1])}-up`,
              )
            }
          >
            ↑
          </button>
          <button
            type="button"
            id={`${rowId(p)}-down`}
            className="st-icon-button"
            disabled={index === siblings - 1}
            aria-label={`Move ${label} down`}
            onClick={() =>
              apply(
                moveItem(menu, p, 1),
                `${label} moved down.`,
                `${rowId(child ? [p[0], index + 1] : [index + 1])}-down`,
              )
            }
          >
            ↓
          </button>
          {child ? (
            <button
              type="button"
              className="st-icon-button st-text-button"
              disabled={full}
              title={
                full
                  ? `The menu holds ${chromeLimits.menu} items at most.`
                  : undefined
              }
              onClick={() =>
                apply(
                  outdentItem(menu, p[0], p[1]),
                  `${label} taken out of the dropdown.`,
                  `${rowId([p[0] + 1])}-label`,
                )
              }
            >
              Take out
            </button>
          ) : (
            <button
              type="button"
              className="st-icon-button st-text-button"
              disabled={
                index === 0 ||
                hasKids ||
                (menu[index - 1]?.children?.length ?? 0) >=
                  chromeLimits.children
              }
              aria-label={
                index === 0
                  ? undefined
                  : `Put ${label} under ${name(menu[index - 1]!, "the item above")}`
              }
              onClick={() => {
                const parent = menu[index - 1]!;
                apply(
                  indentItem(menu, index),
                  `${label} is now in the ${name(parent, "")} dropdown.`,
                  `${rowId([index - 1, parent.children?.length ?? 0])}-label`,
                );
              }}
            >
              Put under above
            </button>
          )}
          <button
            type="button"
            className="st-icon-button"
            aria-label={`Remove ${label}${hasKids ? " and its dropdown" : ""}`}
            onClick={() => apply(removeItem(menu, p), `${label} removed.`)}
          >
            ×
          </button>
        </span>
        {hasKids ? (
          <ol
            className="st-link-list st-menu-children"
            aria-label={`Dropdown under ${name(l, "this item")}`}
          >
            {l.children!.map((_, j) => row([p[0], j], l.children!.length))}
          </ol>
        ) : null}
      </li>
    );
  };

  return (
    <div className="st-links" role="group" aria-labelledby={`${id}-name`}>
      <span className="st-field-label" id={`${id}-name`}>
        Menu
      </span>
      <p className="st-help">
        "Put under above" makes a dropdown from the item above (one level, up to{" "}
        {chromeLimits.children} links). A dropdown's own address is optional.
      </p>
      {menu.length ? (
        <ol className="st-link-list">
          {menu.map((_, i) => row([i], menu.length))}
        </ol>
      ) : (
        <p className="st-help">No links yet.</p>
      )}
      <div className="st-link-add">
        {unused.length ? (
          <>
            <label className="st-sr" htmlFor={`${id}-pick`}>
              Page to add to the menu
            </label>
            <select
              id={`${id}-pick`}
              className="st-input"
              value={pick}
              onChange={(e) => setPick(e.target.value)}
              disabled={full}
            >
              <option value="">Choose a page…</option>
              {unused.map((p) => (
                <option key={p.path} value={p.path}>
                  {p.title} ({p.path})
                </option>
              ))}
            </select>
            <button
              type="button"
              className="st-button"
              disabled={full || !pick}
              onClick={() => {
                const page = pages.find((p) => p.path === pick);
                if (!page) return;
                const label =
                  page.path === "/"
                    ? "Home"
                    : page.title.slice(0, chromeLimits.label);
                apply([...menu, { label, href: page.path }], `${label} added.`);
                setPick("");
              }}
            >
              Add page
            </button>
          </>
        ) : null}
        <button
          type="button"
          className="st-button"
          disabled={full}
          onClick={() => onChange([...menu, { label: "", href: "" }])}
        >
          Add a link
        </button>
      </div>
      {full ? (
        <p className="st-help">
          That's the most the menu can hold ({chromeLimits.menu}).
        </p>
      ) : null}
      <p className="st-sr" role="status">
        {message}
      </p>
    </div>
  );
}

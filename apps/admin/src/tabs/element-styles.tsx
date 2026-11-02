/**
 * Saved element styles (F080, direction A): save a block's style settings
 * under a name and apply them to another block of the same kind. Applying
 * copies the settings in (one undo step); blocks never follow later changes,
 * so changing one never surprises you on another page. They're kept with
 * My layouts (kind "element"), never published.
 *
 * Only Style-tab settings are saved: never words, links or photos.
 */
import type { SavedLayout } from "@crust/blocks";
import { createUsePuck, useGetPuck, type ComponentData } from "@puckeditor/core";
import { useEffect, useState } from "react";
import { NameForm } from "../layouts/LayoutGallery";
import { useMyLayouts } from "../layouts/mine";
import { announce } from "../keyboard/KeyboardEditing";

const usePuckSelector = createUsePuck();

/** Style-tab fields that are really content (a photo and where it's cropped): never part of a saved style. */
const notStyle = new Set(["imageSrc", "videoSrc", "focus"]);

/** The fields a saved style of this block holds, from the block's fields and which tab each sits in. */
export function styleKeys(fieldKeys: string[], isStyle: (key: string) => boolean): string[] {
  return fieldKeys.filter((k) => !k.startsWith("_") && !notStyle.has(k) && isStyle(k));
}

/** The block's current style: only the style fields it has a value for. */
export function styleOf(props: Record<string, unknown>, keys: string[]): Record<string, unknown> {
  return Object.fromEntries(keys.filter((k) => props[k] !== undefined).map((k) => [k, props[k]]));
}

/** The block with a saved style copied in. Fields the style doesn't name are left as they are. */
export function withStyle(props: Record<string, unknown>, style: Record<string, unknown>, keys: string[]): Record<string, unknown> {
  const out = { ...props };
  for (const k of keys) if (k in style) out[k] = style[k];
  return out;
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** Whether the block already looks exactly like a saved style. */
export const matchesStyle = (props: Record<string, unknown>, style: Record<string, unknown>, keys: string[]) =>
  keys.every((k) => !(k in style) || same(props[k], style[k]));

/** The saved styles for one kind of block, newest first (as My layouts are kept). */
export const stylesFor = (layouts: SavedLayout[] | null, type: string): SavedLayout[] =>
  (layouts ?? []).filter((l) => l.kind === "element" && l.content[0]?.type === type);

export function SavedStyles({ component, label, keys }: { component: string; label: string; keys: string[] }) {
  const getPuck = useGetPuck();
  const mine = useMyLayouts();
  const item = usePuckSelector((s) => s.selectedItem) as ComponentData | null;
  const [mode, setMode] = useState<{ kind: "idle" } | { kind: "save" } | { kind: "rename"; id: string } | { kind: "delete"; id: string }>({ kind: "idle" });
  const [error, setError] = useState<string | null>(null);
  const id = item?.props.id as string | undefined;
  useEffect(() => {
    setMode({ kind: "idle" });
    setError(null);
  }, [id]);
  if (!item || item.type !== component || !keys.length) return null;
  const styles = stylesFor(mine.layouts, component);
  const props = item.props as Record<string, unknown>;
  const thing = label.toLowerCase();

  const apply = (style: SavedLayout) => {
    const puck = getPuck();
    const current = (id && puck.getItemById(id)) || item;
    const selector = id ? puck.getSelectorForId(id) : undefined;
    if (!selector) return;
    const next = withStyle(current.props as Record<string, unknown>, style.content[0]!.props as Record<string, unknown>, keys);
    puck.dispatch({ type: "replace", destinationIndex: selector.index, destinationZone: selector.zone, data: { ...current, props: next as ComponentData["props"] }, recordHistory: true });
    announce(`Applied the style “${style.name}” to this ${thing}. Undo puts it back.`);
  };

  return (
    <div className="es-box" role="group" aria-labelledby={`es-title-${id}`}>
      <p className="tb-label" id={`es-title-${id}`}>
        Saved styles
      </p>
      {styles.length ? (
        <ul className="es-list">
          {styles.map((s) => {
            const inUse = matchesStyle(props, s.content[0]!.props as Record<string, unknown>, keys);
            return (
              <li key={s.id} className="es-row">
                {mode.kind === "rename" && mode.id === s.id ? (
                  <NameForm
                    idPrefix={`es-rename-${s.id}`}
                    label="New name"
                    initial={s.name}
                    submitLabel="Rename"
                    onSubmit={async (name) => {
                      const problem = await mine.rename(s.id, name);
                      if (!problem) setMode({ kind: "idle" });
                      return problem;
                    }}
                    onCancel={() => setMode({ kind: "idle" })}
                  />
                ) : mode.kind === "delete" && mode.id === s.id ? (
                  <div className="es-confirm" role="alert">
                    <span>Delete “{s.name}”? Blocks that use it keep their look.</span>
                    <button
                      type="button"
                      className="es-danger"
                      onClick={() =>
                        void mine.remove(s.id).then((problem) => {
                          setError(problem);
                          if (!problem) setMode({ kind: "idle" });
                        })
                      }
                    >
                      Delete
                    </button>
                    <button type="button" className="es-link" onClick={() => setMode({ kind: "idle" })}>
                      Keep it
                    </button>
                  </div>
                ) : (
                  <>
                    <button type="button" className="es-apply" aria-pressed={inUse} onClick={() => apply(s)}>
                      <span>{s.name}</span>
                      {inUse ? <span className="es-inuse">In use</span> : null}
                    </button>
                    <button type="button" className="es-link" aria-label={`Rename ${s.name}`} onClick={() => setMode({ kind: "rename", id: s.id })}>
                      Rename
                    </button>
                    <button type="button" className="es-link" aria-label={`Delete ${s.name}`} onClick={() => setMode({ kind: "delete", id: s.id })}>
                      Delete
                    </button>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="tb-help">Set this {thing} up the way you like, then save its style to use it on other {thing}s.</p>
      )}
      {mode.kind === "save" ? (
        <NameForm
          idPrefix={`es-save-${id}`}
          label="Style name"
          initial={`${label} style`}
          submitLabel="Save style"
          onSubmit={async (name) => {
            const style = styleOf(props, keys);
            const problem = await mine.save(name, "element", [{ type: component, props: style as ComponentData["props"] }]);
            if (!problem) setMode({ kind: "idle" });
            return problem;
          }}
          onCancel={() => setMode({ kind: "idle" })}
        />
      ) : (
        <button type="button" className="es-save" onClick={() => setMode({ kind: "save" })}>
          Save this {thing}'s style…
        </button>
      )}
      {error ? (
        <p className="tb-help is-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

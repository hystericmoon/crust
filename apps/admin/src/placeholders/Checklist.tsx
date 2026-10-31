/**
 * F046: the builder's "To replace" list and the watcher that clears a mark
 * once its words or photo are replaced. Both live inside Puck.
 */
import { blockName, clearEditedPlaceholders, findPlaceholders, placeholderSummary, unmarkPlaceholder, type Placeholder } from "@crust/blocks";
import { createUsePuck, useGetPuck, type Data } from "@puckeditor/core";
import { useEffect, useId, useRef, useState } from "react";
import { focusBlock, select } from "../keyboard/KeyboardEditing";

const usePuckSelector = createUsePuck();
const useContent = () => usePuckSelector((s) => s.appState.data.content);

/** Clears marks of words and photos you've just replaced. Renders nothing. */
export function PlaceholderWatcher() {
  const content = useContent();
  const getPuck = useGetPuck();
  const previous = useRef(content);
  useEffect(() => {
    const before = previous.current;
    previous.current = content;
    if (before === content) return;
    const next = clearEditedPlaceholders(before, content);
    if (next === content) return;
    previous.current = next;
    const puck = getPuck();
    // Part of the same edit: no separate undo step.
    puck.dispatch({ type: "setData", data: { ...(puck.appState.data as Data), content: next } });
  }, [content, getPuck]);
  return null;
}

function itemText(p: Placeholder): string {
  return `${blockName(p.type)}${p.preview ? ` ${p.preview}` : ""}`;
}

/** "To replace (6)" in the builder's top bar; hidden when there's nothing left. */
export function PlaceholderChecklist() {
  const content = useContent();
  const getPuck = useGetPuck();
  const items = findPlaceholders(content);
  const count = items.reduce((n, p) => n + p.fields.length, 0);
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const id = useId();
  const hadItems = useRef(count > 0);

  useEffect(() => {
    if (count > 0) hadItems.current = true;
    else if (hadItems.current && open) setDone(true);
  }, [count, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (count === 0 && !done) return null;

  const keep = (p: Placeholder) => {
    const puck = getPuck();
    const data = puck.appState.data as Data;
    puck.dispatch({ type: "setData", data: { ...data, content: unmarkPlaceholder(data.content, p.id) }, recordHistory: true });
    // Focus stays in the list: the next item, or the heading when it's the last.
    requestAnimationFrame(() => panelRef.current?.querySelector<HTMLElement>("[data-ph-show], h2")?.focus());
  };
  const show = (p: Placeholder) => {
    select(getPuck, p.id);
    focusBlock(p.id);
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className="crust-header-link ph-button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => {
          setOpen((v) => !v);
          setDone(false);
        }}
      >
        {count ? (
          <>
            To replace <span className="ph-count">{count}</span>
          </>
        ) : (
          "All replaced"
        )}
      </button>
      {open ? (
        <div className="ph-panel" id={id} ref={panelRef} role="region" aria-labelledby={`${id}-h`}>
          <h2 id={`${id}-h`} tabIndex={-1}>
            {count ? placeholderSummary(count) : "All replaced"}
          </h2>
          {count ? (
            <>
              <p className="ph-help">
                These came with the template. Publishing waits until each is replaced with your own words or photos, or kept on purpose.
              </p>
              <ul>
                {items.map((p) => (
                  <li key={p.id}>
                    <span className="ph-what">
                      <strong>{itemText(p)}</strong>
                      <span>{p.fields.map((f) => f.label).join(", ")}</span>
                    </span>
                    <span className="ph-actions">
                      <button type="button" className="ph-link" data-ph-show aria-label={`Show ${itemText(p)}`} onClick={() => show(p)}>
                        Show
                      </button>
                      <button type="button" className="ph-link" aria-label={`Keep as is: ${itemText(p)}`} onClick={() => keep(p)}>
                        Keep as is
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="ph-help" role="status">
              Nothing from the template is left on this page. Save it, and it's ready to publish.
            </p>
          )}
        </div>
      ) : null}
    </>
  );
}

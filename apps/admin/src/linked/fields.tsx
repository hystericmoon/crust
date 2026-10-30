/**
 * Linked sections in the builder (F043, direction A of
 * design/f043-linked-sections-v1.html): selecting one shows where it's used
 * and offers Edit (its own screen) or Unlink here. "Make linked" on a
 * selected section's toolbar turns it into one.
 */
import { linkedBlock, unlinkedCopy, type Components } from "@crust/blocks";
import { ActionBar, createUsePuck, useGetPuck, type ComponentData, type Config, type Data } from "@puckeditor/core";
import { useEffect, useState } from "react";
import { announce } from "../keyboard/KeyboardEditing";
import { NameForm } from "../layouts/LayoutGallery";
import { firstHeading } from "../layouts/library";
import { useInSectionEditor, useLinkedSections } from "./store";
import "./linked.css";

const usePuckSelector = createUsePuck();
const isTree = (v: unknown): v is ComponentData[] => Array.isArray(v) && v.length > 0 && v.every((x) => x && typeof x === "object" && "type" in x && "props" in x);

/** The data with the block `id` replaced by `blocks`, wherever it is (slots and zones too). */
export function replaceBlock(data: Data, id: string, blocks: ComponentData[]): Data {
  const walk = (list: ComponentData[]): ComponentData[] =>
    list.flatMap((b) => {
      if (String(b.props.id) === id) return blocks;
      let props = b.props;
      for (const [k, v] of Object.entries(b.props)) if (isTree(v)) props = { ...props, [k]: walk(v) };
      return [props === b.props ? b : { ...b, props }];
    });
  const zones = data.zones ? Object.fromEntries(Object.entries(data.zones).map(([k, v]) => [k, walk(v)])) : undefined;
  return { ...data, content: walk(data.content), ...(zones ? { zones } : {}) };
}

/** Where the builder is now, so the section's editor can come back to it. */
export const sectionEditorHref = (id: string, from = typeof location === "undefined" ? "#/" : location.hash) =>
  `#/section?id=${encodeURIComponent(id)}&from=${encodeURIComponent(from || "#/")}`;

function LinkedSectionPanel({ sectionId }: { sectionId: string }) {
  const getPuck = useGetPuck();
  const linked = useLinkedSections();
  const section = linked.get(sectionId);
  const used = linked.usage[sectionId] ?? [];
  if (linked.sections === null) return <p className="ls-note">Loading the linked section…</p>;
  if (!section) {
    return (
      <div className="ls-panel">
        <p className="ls-note" role="alert">
          This linked section doesn't exist any more. Delete this block (Delete key, or the bin on its toolbar).
        </p>
      </div>
    );
  }
  const unlink = () => {
    const puck = getPuck();
    const id = puck.selectedItem?.props.id as string | undefined;
    if (!id) return;
    const copy = unlinkedCopy(section);
    puck.dispatch({ type: "setData", data: replaceBlock(puck.appState.data as Data, id, copy), recordHistory: true });
    announce(`Unlinked “${section.name}” on this page. It's a normal copy here now; other pages keep the link.`);
  };
  return (
    <div className="ls-panel">
      <p className="ls-title">
        Linked section: <strong>{section.name}</strong>
      </p>
      {used.length ? (
        <>
          <p className="ls-note">
            On {used.length} page{used.length === 1 ? "" : "s"}:
          </p>
          <ul className="ls-uses">
            {used.map((u) => (
              <li key={u.path}>{u.title ? `${u.title} (${u.path})` : u.path}</li>
            ))}
          </ul>
        </>
      ) : (
        <p className="ls-note">Not saved on any page yet. Save this page to add it here.</p>
      )}
      <div className="ls-actions">
        <a className="ls-btn ls-btn-primary" href={sectionEditorHref(section.id)}>
          Edit linked section
        </a>
        <button type="button" className="ls-btn" onClick={unlink}>
          Unlink here
        </button>
      </div>
      <p className="ls-note">Edit opens it on its own; saving updates every page. Unlink makes this page's copy a normal section; the other pages keep the link.</p>
    </div>
  );
}

/** The LinkedSection block's settings: its panel instead of a raw id field. */
export function withLinkedSectionFields(config: Config<Components>): Config<Components> {
  const comp = config.components.LinkedSection;
  return {
    ...config,
    components: {
      ...config.components,
      LinkedSection: {
        ...comp,
        fields: {
          section: { type: "custom", label: "Linked section", render: ({ value }: { value: string }) => <LinkedSectionPanel sectionId={value} /> },
        } as NonNullable<typeof comp.fields>,
      },
    },
  };
}

/** "Make linked" on a selected Section's toolbar. */
export function MakeLinkedAction() {
  const getPuck = useGetPuck();
  const linked = useLinkedSections();
  const inEditor = useInSectionEditor();
  const item = usePuckSelector((s) => s.selectedItem) as ComponentData | null;
  const [open, setOpen] = useState(false);
  const id = item?.props.id as string | undefined;
  useEffect(() => setOpen(false), [id]);
  if (inEditor || !item || item.type !== "Section") return null;
  return (
    <ActionBar.Group>
      <button type="button" className="sx-tbtn ls-make-tbtn" aria-expanded={open} onClick={() => setOpen(!open)}>
        Make linked
      </button>
      {open ? (
        <div className="sx-pop ls-make-pop" role="group" aria-label="Make this section a linked section">
          <p className="ls-pop-note">Use it on many pages and edit it in one place.</p>
          <NameForm
            idPrefix={`ls-make-${id}`}
            label="Linked section name"
            initial={firstHeading([item]) || "My section"}
            submitLabel="Make linked"
            onSubmit={async (name) => {
              const puck = getPuck();
              const current = puck.getItemById(id!) ?? item;
              const made = await linked.create(name, [current]);
              if (typeof made === "string") return made;
              const block = linkedBlock(made.id);
              puck.dispatch({ type: "setData", data: replaceBlock(puck.appState.data as Data, id!, [block]), recordHistory: true });
              setOpen(false);
              announce(`“${made.name}” is a linked section now. Add it to other pages from Layouts → Linked. Save this page to keep the link.`);
              return null;
            }}
            onCancel={() => setOpen(false)}
          />
        </div>
      ) : null}
    </ActionBar.Group>
  );
}

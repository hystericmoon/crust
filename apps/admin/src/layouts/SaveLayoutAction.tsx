/**
 * "Save as layout" on the selected section's toolbar (F027, direction A):
 * you decide a section is worth keeping while you look at it, so saving
 * happens right there. The name starts as the section's heading.
 */
import { ActionBar, createUsePuck, useGetPuck, type ComponentData } from "@puckeditor/core";
import { useEffect, useState } from "react";
import { NameForm } from "./LayoutGallery";
import { firstHeading } from "./library";
import { useMyLayouts } from "./mine";

const usePuckSelector = createUsePuck();

/** The naming form for keeping the selected section (F089: also shown from the toolbar's More menu). */
export function SaveLayoutForm({ item, onDone }: { item: ComponentData; onDone: () => void }) {
  const getPuck = useGetPuck();
  const mine = useMyLayouts();
  const id = item.props.id as string;
  return (
    <>
      <NameForm
        idPrefix={`lg-save-${id}`}
        label="Layout name"
        initial={firstHeading([item]) || "My section"}
        submitLabel="Save layout"
        onSubmit={async (name) => {
          // The section as it is now, not as it was when the form opened.
          const current = getPuck().getItemById(id) ?? item;
          const problem = await mine.save(name, "section", [current]);
          if (!problem) onDone();
          return problem;
        }}
        onCancel={onDone}
      />
      <p className="lg-save-note">Shows in Layouts → My layouts, kept in {mine.where}. Pages that use it won't change later.</p>
    </>
  );
}

export function SaveLayoutAction() {
  const item = usePuckSelector((s) => s.selectedItem) as ComponentData | null;
  const [open, setOpen] = useState(false);
  const id = item?.props.id as string | undefined;
  // A different section: start closed.
  useEffect(() => setOpen(false), [id]);
  if (!item || item.type !== "Section") return null;

  return (
    <ActionBar.Group>
      <button type="button" className="sx-tbtn lg-save-tbtn" aria-expanded={open} onClick={() => setOpen(!open)}>
        Save as layout
      </button>
      {open ? (
        <div className="sx-pop lg-save-pop" role="group" aria-label="Save this section as a layout">
          <SaveLayoutForm item={item} onDone={() => setOpen(false)} />
        </div>
      ) : null}
    </ActionBar.Group>
  );
}

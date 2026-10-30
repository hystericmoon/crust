/**
 * A linked section's own editor (F043, direction A): the builder with only
 * the section on the canvas. Saving updates every page that shows it, and
 * the button says so. Back returns to where you came from.
 */
import { migrateRichTextBlocks, type Components } from "@crust/blocks";
import { Puck, useGetPuck, type Config, type Data, type Overrides } from "@puckeditor/core";
import { useEffect, useMemo, useRef, useState } from "react";
import { MyLayoutsProvider } from "../layouts/mine";
import { SectionEditorContext, useLinkedSections } from "./store";

interface Props {
  id: string;
  /** Where Back goes: a screen of this app, e.g. "#/edit?path=/about". */
  back: string;
  githubOn: boolean;
  config?: Config<Components>;
  overrides?: Partial<Overrides>;
}

const pagesLabel = (n: number) => `${n} page${n === 1 ? "" : "s"}`;

function SaveButton({ label, onSave }: { label: string; onSave: (data: Data) => void }) {
  const getPuck = useGetPuck();
  return (
    <button type="button" className="crust-save" onClick={() => onSave(getPuck().appState.data as Data)}>
      {label}
    </button>
  );
}

export function SectionEditor({ id, back, githubOn, config, overrides }: Props) {
  const linked = useLinkedSections();
  const section = linked.get(id);
  const used = linked.usage[id] ?? [];
  const [status, setStatus] = useState("");
  const dirty = useRef(false);
  const [warned, setWarned] = useState(false);

  // The section's own config: no page title or description to edit here.
  const sectionConfig = useMemo(() => (config ? { ...config, root: { ...config.root, fields: {} } } : undefined), [config]);
  const data = useMemo<Data | null>(() => (section ? { root: { props: {} }, content: migrateRichTextBlocks(section.content) } : null), [section?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!status || status === "Saving…") return;
    const t = setTimeout(() => setStatus(""), 10_000);
    return () => clearTimeout(t);
  }, [status]);

  if (linked.sections === null) return <p className="ls-note" style={{ padding: 24 }}>Loading the linked section…</p>;
  if (!section || !data || !sectionConfig) {
    return (
      <div className="st">
        <main className="pg">
          <h1 className="st-title">There's no linked section called “{id}”</h1>
          <p>
            <a href={back}>Back</a>
          </p>
        </main>
      </div>
    );
  }

  const where = used.length ? `on ${pagesLabel(used.length)}` : "not on any page yet";
  const save = async (next: Data) => {
    setStatus("Saving…");
    const res = await linked.update(id, next.content);
    if (typeof res === "string") {
      setStatus(res);
      return;
    }
    dirty.current = false;
    setWarned(false);
    const n = linked.usage[id]?.length ?? used.length;
    setStatus(
      `“${res.name}” saved to ${linked.where}${n > 1 ? `, so all ${pagesLabel(n)} show the change` : n === 1 ? ", so its page shows the change" : ""}.${githubOn ? " Visitors see it after you publish." : ""}`,
    );
  };

  return (
    <SectionEditorContext.Provider value={true}>
      <MyLayoutsProvider githubOn={githubOn}>
        <Puck
          config={sectionConfig as Config}
          data={data}
          headerTitle={`Linked section “${section.name}”`}
          overrides={{
            ...overrides,
            headerActions: () => (
              <>
                <span className="ls-editing">Editing a linked section · {where}</span>
                <a
                  className="crust-header-link"
                  href={back}
                  onClick={(e) => {
                    // Unsaved changes: say so once; a second press leaves without saving.
                    if (dirty.current && !warned) {
                      e.preventDefault();
                      setWarned(true);
                      setStatus(`You have changes that aren't saved. Save them, or press Back again to leave without saving.`);
                    }
                  }}
                >
                  Back
                </a>
                <SaveButton label={used.length > 1 ? `Save for all ${used.length} pages` : "Save linked section"} onSave={save} />
              </>
            ),
          }}
          onPublish={save}
          onChange={() => {
            dirty.current = true;
          }}
        />
        <div role="status" aria-live="polite" className="crust-status">
          {status}
        </div>
      </MyLayoutsProvider>
    </SectionEditorContext.Provider>
  );
}

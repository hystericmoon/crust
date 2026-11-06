/**
 * F088: "Add section, by picture". The Add panel shows pictures of whole
 * sections (search, categories, My layouts) beside the page, so you see where
 * the section will land. Single blocks sit below as "Add an element".
 * A picture is a real button: Enter inserts it, focus moves to the new section.
 */
import { layoutCategories, type LayoutCategory } from "@crust/blocks";
import { createUsePuck, useGetPuck, type ComponentData, type Config, type Data } from "@puckeditor/core";
import { useContext, useMemo, useState, useSyncExternalStore } from "react";
import { SiteStyleContext } from "../sections/site-style";
import { ItemList, insertLayout } from "./LayoutGallery";
import { describeInsertion, filterLayouts, getAddAt, insertionPoint, openLayoutGallery, setAddAt, subscribeAddAt, type LayoutItem } from "./library";
import { useMyLayouts } from "./mine";

const usePuckSelector = createUsePuck();

type Pick = LayoutCategory | "All" | "Mine";

export function AddSectionPanel({ elements }: { elements?: React.ReactNode }) {
  const getPuck = useGetPuck();
  const content = usePuckSelector((s) => (s.appState.data as Data).content) as ComponentData[];
  const selectedId = usePuckSelector((s) => s.selectedItem?.props.id as string | undefined);
  const addAt = useSyncExternalStore(subscribeAddAt, getAddAt);
  const siteStyle = useContext(SiteStyleContext);
  const mine = useMyLayouts();
  const [query, setQuery] = useState("");
  const [pick, setPick] = useState<Pick>("All");

  const index = addAt !== null ? Math.min(addAt, content.length) : insertionPoint(content, selectedId);
  const where = describeInsertion(getPuck().config as Config, content, index);
  const items = useMemo<LayoutItem[]>(
    () => (pick === "Mine" ? filterLayouts("mine", "All", query, mine.layouts ?? []) : filterLayouts("section", pick, query)),
    [pick, query, mine.layouts],
  );

  const add = (item: LayoutItem) => {
    if (insertLayout(getPuck, item, index, siteStyle?.tokens)) setAddAt(null);
  };

  return (
    <div className="af-addsec">
      <h2 className="af-panel-title">Add section</h2>
      <p className="af-addsec-where" role="status">
        {where}
      </p>
      <label className="af-addsec-search">
        <span className="lg-search-label">Search layouts</span>
        <input type="search" value={query} placeholder="Pricing, team, questions…" onChange={(e) => setQuery(e.target.value)} />
      </label>
      <ul className="af-addsec-chips" aria-label="Categories">
        {(["All", ...layoutCategories, "Mine"] as Pick[]).map((c) => (
          <li key={c}>
            <button type="button" className="af-chip" aria-pressed={pick === c} onClick={() => setPick(c)}>
              {c === "Mine" ? "My layouts" : c}
            </button>
          </li>
        ))}
      </ul>
      {items.length ? (
        <ItemList items={items} kind="section" onPick={add} />
      ) : (
        <p className="af-panel-note">{pick === "Mine" ? "Nothing saved yet. Select a section and choose Save as layout." : `No layouts match “${query}”.`}</p>
      )}
      <button type="button" className="af-panel-link" onClick={() => openLayoutGallery(index)}>
        See larger, whole pages and linked sections
      </button>
      {elements ? (
        <details className="af-addsec-elements">
          <summary>Add an element</summary>
          {elements}
        </details>
      ) : null}
    </div>
  );
}

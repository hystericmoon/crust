/** F091: the Pages panel in the editor's left bar. Its data and the menu come from the screen around the editor. */
import { createContext, useContext } from "react";
import { useGetPuck } from "@puckeditor/core";
import type { MenuLink } from "@crust/blocks";
import { saveLocalDraft } from "../pages/store";
import { setPanelMode } from "../page-first/store";
import { editHref } from "./format";
import { PagesPanel } from "./PagesPanel";
import { usePagesData } from "./usePagesData";

export interface PagesMenuState {
  menu: MenuLink[];
  onMenuChange?: (menu: MenuLink[]) => void | Promise<string | null | void>;
  githubOn: boolean;
  currentPath?: string;
}

export const PagesMenuContext = createContext<PagesMenuState>({ menu: [], githubOn: false });

export function PagesRail() {
  const { menu, onMenuChange, githubOn, currentPath } = useContext(PagesMenuContext);
  const data = usePagesData(githubOn);
  const getPuck = useGetPuck();
  return (
    <section className="af-panel" aria-label="Pages">
      <PagesPanel
        variant="rail"
        rows={data.rows}
        menu={menu}
        onMenuChange={onMenuChange}
        currentPath={currentPath}
        onOpenSettings={() => {
          getPuck().dispatch({ type: "setUi", ui: { itemSelector: null }, recordHistory: false });
          setPanelMode("page");
        }}
        loadError={data.error}
        onRetry={data.reload}
        githubOn={githubOn}
        liveKnown={githubOn && data.changes !== null}
        onRename={data.rename}
        onDelete={data.remove}
        findLinks={data.findLinks}
        onSaveDraft={data.saveDraft}
        onDuplicate={data.duplicate}
        deleted={githubOn ? data.deleted : null}
        onRestore={data.restore}
        onCreate={(page) => {
          saveLocalDraft(page, false);
          location.hash = editHref(page.path);
        }}
      />
    </section>
  );
}

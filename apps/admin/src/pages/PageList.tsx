import type { MenuLink, Page } from "@crust/blocks";
import type { DeletedPage } from "../api-client";
import { AppTopBar } from "../app-frame/AppTopBar";
import { useRef, useState, type ReactNode } from "react";
import type { LinkingPage, PageAction } from "./PageActions";
import type { PageRow } from "./store";
import { UpdateBanner } from "../updates/UpdateNotice";
import { NewPageForm } from "../pages-panel/NewPageForm";
import { PagesPanel } from "../pages-panel/PagesPanel";

// F091: the helpers moved with the Pages panel; kept here for the screens that import them.
export { breakablePath, relinkedNote, editHref } from "../pages-panel/format";

export interface PageListProps {
  siteName: string;
  /** null while loading. */
  rows: PageRow[] | null;
  /** Where the list came from, said plainly under the heading. */
  sourceNote: string;
  loadError?: string;
  /** Loads the list again after a load error. */
  onRetry?: () => void;
  onCreate: (page: Page) => void;
  /**
   * Rename and delete (F015). Pages on GitHub need saving to GitHub switched
   * on (githubOn); pages only in this browser can always be changed.
   */
  githubOn?: boolean;
  /** Resolves to a problem, or (F069) to the links that were updated with it. */
  onRename?: (row: PageRow, to: string) => Promise<string | null | { relinked: LinkingPage[] }>;
  onDelete?: (row: PageRow) => PageAction;
  /** Other pages linking to a page, shown in the rename dialog (F018). */
  findLinks?: (row: PageRow) => Promise<LinkingPage[] | null>;
  /** Pages deleted from GitHub that can come back (F019); null or empty hides the section. */
  deleted?: DeletedPage[] | null;
  onRestore?: (page: DeletedPage) => PageAction;
  /** Saves a page's browser draft to GitHub without opening it (F020). */
  onSaveDraft?: (row: PageRow) => PageAction;
  /** True once we know what the last publish contained, so a page can be called "Live" (F021). */
  liveKnown?: boolean;
  /** Shown above the list (the Publish panel). */
  children?: ReactNode;
  /** Shown first: after starting from a template (F048). */
  notice?: ReactNode;
  /** F091: the header menu and a way to save it; the pages it links to are "In the menu". */
  menu?: MenuLink[];
  onMenuChange?: (menu: MenuLink[]) => void;
  /** F091: makes a copy of a page. */
  onDuplicate?: (row: PageRow) => PageAction;
  /** F057: the desktop app keeps several sites; a link to them leads the header. */
  allSites?: boolean;
}

export function PageList({ allSites = false, siteName, rows, sourceNote, loadError, onRetry, onCreate, githubOn = false, onRename, onDelete, findLinks, deleted, onRestore, onSaveDraft, onDuplicate, liveKnown = false, children, notice, menu = [], onMenuChange }: PageListProps) {
  const [creating, setCreating] = useState(false);
  const newPageRef = useRef<HTMLButtonElement>(null);
  return (
    <div className="st">
      {/* F086: the app frame's top bar. Posts, Site settings, templates and Sign out are in the site menu. */}
      <AppTopBar
        siteName={siteName}
        allSites={allSites}
        where={
          <h1 className="af-title">
            <span className="pg-sr">{siteName}: </span>Pages
          </h1>
        }
        tools={
          <button
            ref={newPageRef}
            type="button"
            className="st-button"
            aria-expanded={creating}
            aria-controls="new-page"
            onClick={() => setCreating((c) => !c)}
          >
            New page
          </button>
        }
        onPublish={() => {
          const heading = document.getElementById("publish-h");
          heading?.focus();
          heading?.scrollIntoView({ block: "start" });
        }}
      />

      <main className="pg">
        <NewPageForm
          open={creating}
          existing={rows?.map((r) => r.path) ?? []}
          onCancel={() => {
            setCreating(false);
            newPageRef.current?.focus();
          }}
          onCreate={onCreate}
        />
        {notice}
        <UpdateBanner />
        {/* What's live and the Publish button come first: it's the screen's main question and action, also on a phone. */}
        {children}

        {/* F091: the Pages panel replaces the table; the editor's left bar shows the same panel. */}
        <section className="st-card">
          <PagesPanel
            variant="screen"
            rows={rows}
            menu={menu}
            onMenuChange={onMenuChange}
            sourceNote={sourceNote}
            loadError={loadError}
            onRetry={onRetry}
            githubOn={githubOn}
            liveKnown={liveKnown}
            onRename={onRename}
            onDelete={onDelete}
            findLinks={findLinks}
            onSaveDraft={onSaveDraft}
            onDuplicate={onDuplicate}
            deleted={deleted}
            onRestore={onRestore}
          />
        </section>
      </main>
    </div>
  );
}

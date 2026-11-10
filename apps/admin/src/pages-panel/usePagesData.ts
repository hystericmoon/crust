/**
 * F091: the pages screen's data, shared by the home screen and the editor's
 * Pages panel: the rows (GitHub or bundled, plus browser drafts), what is
 * unpublished, recently deleted pages, and rename, delete, restore, save and
 * duplicate (through GitHub for pages there, in this browser otherwise).
 */
import { countPlaceholders, type Page } from "@crust/blocks";
import { relinkPage } from "@crust/blocks/links";
import { useEffect, useState } from "react";
import { deletePage, getChanges, getDeleted, getLinks, getPage, listPages, renamePage, restorePage, saveContent, type DeletedPage, type PendingChanges } from "../api-client";
import type { LinkingPage } from "../pages/PageActions";
import { bundledPages, getLocalDraft, localDrafts, mergePageRows, moveLocalDraft, removeLocalDraft, saveLocalDraft, type PageRow } from "../pages/store";
import { markUnpublished } from "../publish/changes";

export function usePagesData(githubOn: boolean | null) {
  const [rows, setRows] = useState<PageRow[] | null>(null);
  const [error, setError] = useState<string>();
  const [changes, setChanges] = useState<PendingChanges | null>(null);
  const [deleted, setDeleted] = useState<DeletedPage[] | null>(null);
  // Bumped after a rename, delete or publish to load the list again.
  const [version, setVersion] = useState(0);
  const reload = () => setVersion((v) => v + 1);

  useEffect(() => {
    if (githubOn === null) return;
    const bundled = bundledPages().map((p) => ({ path: p.path, title: p.title, lastEdited: null, ...(countPlaceholders(p.puck.content) ? { placeholders: countPlaceholders(p.puck.content) } : {}) }));
    if (!githubOn) {
      setRows(mergePageRows(bundled, localDrafts()));
      return;
    }
    void listPages().then((res) => {
      if (res.ok) {
        setError(undefined);
        setRows(mergePageRows(res.pages, localDrafts()));
      } else {
        setError(`Couldn't load your pages from your site: ${res.error}`);
        setRows(mergePageRows(bundled, localDrafts()));
      }
    });
    // If this fails, pages just aren't marked; the list itself still works.
    void getChanges().then((res) => setChanges(res.ok ? res : null));
    void getDeleted().then((res) => setDeleted(res.ok ? res.pages : null));
  }, [githubOn, version]);

  // Rename and delete (F015): through GitHub for pages there, in this browser otherwise.
  const rename = async (row: PageRow, to: string): Promise<string | { relinked: LinkingPage[] }> => {
    let relinked: LinkingPage[] = [];
    if (row.inRepo) {
      const res = await renamePage(row.path, to);
      if (!res.ok) return `Not renamed: ${res.error}`;
      // F069: said in the message ("It also updated 3 links…").
      relinked = res.relinked ?? [];
    }
    if (!moveLocalDraft(row.path, to)) return "This browser wouldn't store the change. Try again.";
    // F018: drafts in this browser follow too, so saving one later doesn't bring the old links back.
    for (const draft of localDrafts()) {
      const { puck, count } = relinkPage(draft.page.puck, row.path, to);
      if (count) saveLocalDraft({ ...draft.page, puck }, draft.savedToGitHub);
    }
    reload();
    return { relinked };
  };
  const restore = async (page: DeletedPage): Promise<string | null> => {
    const res = await restorePage(page);
    if (!res.ok) return `Not restored: ${res.error}`;
    reload();
    return null;
  };
  // F020: the browser draft goes to GitHub as it is, like "Save draft" in the builder.
  const saveDraft = async (row: PageRow): Promise<string | null> => {
    const draft = getLocalDraft(row.path);
    if (!draft) return "There's no draft of this page in this browser any more.";
    const res = await saveContent({ kind: "page", page: draft.page });
    if (!res.ok) return `Not saved: ${res.error} The draft is still kept in this browser.`;
    saveLocalDraft(draft.page, true);
    reload();
    return null;
  };
  // F022: Publish offers to save these first.
  const drafts = githubOn ? (rows ?? []).filter((r) => r.localChanges) : [];
  const saveAllDrafts = async (): Promise<string | null> => {
    for (const row of drafts) {
      const failed = await saveDraft(row);
      if (failed) return `“${row.title}”: ${failed}`;
    }
    return null;
  };
  const findLinks = async (row: PageRow) => {
    if (!githubOn || !row.inRepo) return null;
    const res = await getLinks(row.path);
    return res.ok ? res.pages : null;
  };
  const remove = async (row: PageRow): Promise<string | null> => {
    if (row.inRepo) {
      const res = await deletePage(row.path);
      if (!res.ok) return `Not deleted: ${res.error}`;
    }
    removeLocalDraft(row.path);
    reload();
    return null;
  };

  // F091: a copy of a page, in this browser, beside the original.
  const duplicate = async (row: PageRow): Promise<string | null> => {
    const draft = getLocalDraft(row.path);
    let page: Page | null = draft?.page ?? null;
    if (!page && githubOn && row.inRepo) {
      const res = await getPage(row.path);
      if (res.ok) page = res.page;
    }
    page ??= bundledPages().find((p) => p.path === row.path) ?? null;
    if (!page) return "Couldn't read this page to copy it. Try again in a moment.";
    const taken = new Set((rows ?? []).map((r) => r.path));
    let path = `${row.path === "/" ? "/home" : row.path}-copy`;
    for (let n = 2; taken.has(path); n++) path = `${row.path === "/" ? "/home" : row.path}-copy-${n}`;
    const copy: Page = { ...page, path, title: `Copy of ${page.title || row.title}` };
    if (!saveLocalDraft(copy, false)) return "This browser wouldn't store the copy. Try again.";
    reload();
    return null;
  };


  return {
    rows: rows && markUnpublished(rows, changes),
    plainRows: rows,
    error,
    changes,
    deleted,
    reload,
    rename,
    restore,
    saveDraft,
    saveAllDrafts,
    drafts,
    findLinks,
    remove,
    duplicate,
  };
}

import { config, migrateChrome, tokensToCss, type Page, type Site, type SiteChrome, type SiteTokens } from "@crust/blocks";
import { relinkPage } from "@crust/blocks/links";
import { Puck, useGetPuck, type Data } from "@puckeditor/core";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import siteJson from "../../../content/site.json";
import {
  deletePage,
  getChanges,
  getDeleted,
  getLinks,
  getPage,
  getStatus,
  listPages,
  renamePage,
  restorePage,
  saveContent,
  type ApiResult,
  type DeletedPage,
  type PendingChanges,
} from "./api-client";
import { KeyboardActionBar, KeyboardCanvas, KeyboardRoot, openKeyboardHelp } from "./keyboard/KeyboardEditing";
import { LayoutGallery, LayoutInserters, LayoutsButton } from "./layouts/LayoutGallery";
import { MyLayoutsProvider } from "./layouts/mine";
import { PageList, editHref } from "./pages/PageList";
import {
  bundledPages,
  fromPuckData,
  getLocalDraft,
  localDrafts,
  mergePageRows,
  moveLocalDraft,
  removeLocalDraft,
  saveLocalDraft,
  toPuckData,
  type PageRow,
} from "./pages/store";
import { markUnpublished } from "./publish/changes";
import { PublishPanel } from "./publish/PublishPanel";
import { PublishShortcut, usePendingCount } from "./publish/shortcut";
import { withItemEditing } from "./items/items";
import { withResponsiveEditing } from "./responsive/fields";
import { withSectionEditing } from "./sections/editing";
import { withSettingsTabs } from "./tabs/tabs";
import { SiteStyleContext, type SiteStyle } from "./sections/site-style";
import { SiteSettings } from "./settings/SiteSettings";
import { loadSavedTokens, sameTokens, saveTokens } from "./tokens-store";
import { loadSavedChrome, sameChrome, saveChrome, siteToSave } from "./chrome-store";
import { SiteChromeContext, withSiteChrome } from "./chrome-canvas";

const site = siteJson as Site;
/** The builder's blocks: visual Section fields (F025), per-device settings (F029), Content/Style/Advanced tabs (F030). */
const editorConfig = withSiteChrome(withSettingsTabs(withResponsiveEditing(withSectionEditing(withItemEditing(config)))));

/** Responsive canvas widths for the viewport switcher. */
const viewports = [
  { width: 1280, height: "auto" as const, label: "Desktop", icon: "Monitor" as const },
  { width: 768, height: "auto" as const, label: "Tablet", icon: "Tablet" as const },
  { width: 375, height: "auto" as const, label: "Mobile", icon: "Smartphone" as const },
];

/** Puts the site's design tokens on the page so the canvas uses them. */
function useTokenStyles(css: string) {
  useEffect(() => {
    const style = document.createElement("style");
    style.dataset.crustTokens = "";
    style.textContent = css;
    document.head.appendChild(style);
    return () => style.remove();
  }, [css]);
}

/**
 * Replaces Puck's Publish control, which is a <span> and can't be reached
 * with the keyboard. It saves a draft, so it says so.
 */
function SaveDraftButton({ onSave }: { onSave: (data: Data) => void }) {
  const getPuck = useGetPuck();
  return (
    <button type="button" className="crust-save" onClick={() => onSave(getPuck().appState.data)}>
      Save draft
    </button>
  );
}

/** What to tell the owner after a save: GitHub first, the browser copy as the safety net. */
export function saveMessage(result: ApiResult<unknown>, savedLocally: boolean, what: string): string {
  if (result.ok) return `${what} saved to GitHub. Visitors see it after you publish.`;
  const local = savedLocally ? " A copy is safe in this browser." : "";
  if (result.notConfigured) return `${what} saved in this browser. Saving to GitHub isn't switched on yet.`;
  return `${what} not saved to GitHub: ${result.error}${local}`;
}

// --- Routing: #/ pages · #/edit?path=/about · #/settings ---------------------

export type Route = { name: "pages"; focus?: "publish" } | { name: "edit"; path: string } | { name: "settings" };

export function parseRoute(hash: string): Route {
  if (hash.startsWith("#/settings")) return { name: "settings" };
  if (hash.startsWith("#/edit")) {
    const path = new URLSearchParams(hash.split("?")[1] ?? "").get("path");
    if (path) return { name: "edit", path };
  }
  // F024: the Publish shortcut lands on the page list with focus on Publish.
  if (new URLSearchParams(hash.split("?")[1] ?? "").get("focus") === "publish") return { name: "pages", focus: "publish" };
  return { name: "pages" };
}

function useRoute(): Route {
  const [route, setRoute] = useState(() => parseRoute(location.hash));
  useEffect(() => {
    const onChange = () => setRoute(parseRoute(location.hash));
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return route;
}

/** Finds a page: a browser draft first, then GitHub, then the copy bundled with the app. */
async function loadPage(path: string, githubOn: boolean): Promise<Page | null> {
  const draft = getLocalDraft(path);
  if (draft) return draft.page;
  if (githubOn) {
    const remote = await getPage(path);
    if (remote.ok) return remote.page;
  }
  return bundledPages().find((p) => p.path === path) ?? null;
}

/** Pages for menus (F031): GitHub's when saving is on, plus drafts in this browser. */
function usePageOptions(githubOn: boolean | null, active: boolean) {
  const [pages, setPages] = useState(() => mergePageRows(bundledPages().map((p) => ({ path: p.path, title: p.title, lastEdited: null })), localDrafts()));
  useEffect(() => {
    if (!active || !githubOn) return;
    void listPages().then((res) => {
      if (res.ok) setPages(mergePageRows(res.pages, localDrafts()));
    });
  }, [githubOn, active]);
  return pages.map((p) => ({ path: p.path, title: p.title }));
}

export function App() {
  const route = useRoute();
  const [saved, setSaved] = useState<SiteTokens>(() => loadSavedTokens(site.tokens));
  const [draft, setDraft] = useState<SiteTokens>(saved);
  // F031: header and footer, saved with the tokens in site.json.
  const defaultChrome = useMemo(() => migrateChrome(site, bundledPages()), [site]);
  const [savedChrome, setSavedChrome] = useState<SiteChrome>(() => loadSavedChrome(defaultChrome));
  const [chromeDraft, setChromeDraft] = useState<SiteChrome>(savedChrome);
  const [githubOn, setGithubOn] = useState<boolean | null>(null);
  // The builder shows unsaved token edits too, so switching screens loses nothing.
  useTokenStyles(useMemo(() => tokensToCss(draft), [draft]));

  useEffect(() => {
    void getStatus().then((s) => setGithubOn(s.ok && s.configured));
  }, []);

  useEffect(() => {
    document.title =
      route.name === "settings" ? "Site settings · Crust" : route.name === "edit" ? `Editing ${route.path} · Crust` : "Pages · Crust";
  }, [route]);

  const saveSiteTokens = async (tokens: SiteTokens) => {
    const chrome = chromeDraft;
    const local = saveTokens(tokens) && saveChrome(chrome);
    if (local) {
      setSaved(tokens);
      setSavedChrome(chrome);
    }
    const result = await saveContent({ kind: "site", site: siteToSave(site, tokens, chrome, defaultChrome) });
    if (result.ok) {
      setSaved(tokens);
      setSavedChrome(chrome);
    }
    return saveMessage(result, local, "Site settings");
  };
  const pageOptions = usePageOptions(githubOn, route.name === "settings");
  // F025: the builder edits the same draft as Site settings ("Whole site" mode).
  const siteStyle: SiteStyle = {
    tokens: draft,
    setTokens: setDraft,
    dirty: !sameTokens(saved, draft),
    save: () => saveSiteTokens(draft),
    discard: () => setDraft(saved),
  };

  // F024: shown in the builder and Site settings top bars; counted again on each screen change.
  const pendingCount = usePendingCount(githubOn, route.name);
  const shortcut = (className: string) => (githubOn ? <PublishShortcut count={pendingCount} className={className} /> : null);

  if (route.name === "settings") {
    return (
      // My layouts are here too: a theme pack can carry them (F033).
      <MyLayoutsProvider githubOn={!!githubOn}>
        <SiteSettings
          headerLink={shortcut("st-button st-link-button")}
          site={site}
          page={getLocalDraft("/")?.page ?? bundledPages().find((p) => p.path === "/") ?? bundledPages()[0]!}
          saved={saved}
          draft={draft}
          onChange={setDraft}
          onSave={saveSiteTokens}
          onDiscard={() => {
            setDraft(saved);
            setChromeDraft(savedChrome);
          }}
          chrome={chromeDraft}
          onChromeChange={setChromeDraft}
          chromeDirty={!sameChrome(savedChrome, chromeDraft)}
          pages={pageOptions}
        />
      </MyLayoutsProvider>
    );
  }

  if (route.name === "edit") {
    if (githubOn === null) return <Loading />;
    return (
      <SiteStyleContext.Provider value={siteStyle}>
        <SiteChromeContext.Provider value={{ chrome: chromeDraft, siteName: site.name, path: route.path }}>
          <Builder key={route.path} path={route.path} githubOn={githubOn} shortcut={shortcut("crust-header-link")} />
        </SiteChromeContext.Provider>
      </SiteStyleContext.Provider>
    );
  }

  return <Pages githubOn={githubOn} focusPublish={route.name === "pages" && route.focus === "publish"} />;
}

function Loading() {
  return (
    <p className="crust-loading" role="status">
      Loading…
    </p>
  );
}

function Pages({ githubOn, focusPublish = false }: { githubOn: boolean | null; focusPublish?: boolean }) {
  const [rows, setRows] = useState<PageRow[] | null>(null);
  const [error, setError] = useState<string>();
  const [changes, setChanges] = useState<PendingChanges | null>(null);
  const [deleted, setDeleted] = useState<DeletedPage[] | null>(null);
  // Bumped after a rename, delete or publish to load the list again.
  const [version, setVersion] = useState(0);
  const reload = () => setVersion((v) => v + 1);

  useEffect(() => {
    if (githubOn === null) return;
    const bundled = bundledPages().map((p) => ({ path: p.path, title: p.title, lastEdited: null }));
    if (!githubOn) {
      setRows(mergePageRows(bundled, localDrafts()));
      return;
    }
    void listPages().then((res) => {
      if (res.ok) {
        setError(undefined);
        setRows(mergePageRows(res.pages, localDrafts()));
      } else {
        setError(`Couldn't load your pages from GitHub: ${res.error}`);
        setRows(mergePageRows(bundled, localDrafts()));
      }
    });
    // If this fails, pages just aren't marked; the list itself still works.
    void getChanges().then((res) => setChanges(res.ok ? res : null));
    void getDeleted().then((res) => setDeleted(res.ok ? res.pages : null));
  }, [githubOn, version]);

  // F024: arriving from the Publish shortcut, focus goes to the Publish panel once the list is there.
  useEffect(() => {
    if (!focusPublish || rows === null) return;
    const heading = document.getElementById("publish-h");
    heading?.focus();
    heading?.scrollIntoView({ block: "start" });
  }, [focusPublish, rows === null]);

  // Rename and delete (F015): through GitHub for pages there, in this browser otherwise.
  const rename = async (row: PageRow, to: string): Promise<string | null> => {
    if (row.inRepo) {
      const res = await renamePage(row.path, to);
      if (!res.ok) return `Not renamed: ${res.error}`;
    }
    if (!moveLocalDraft(row.path, to)) return "This browser wouldn't store the change. Try again.";
    // F018: drafts in this browser follow too, so saving one later doesn't bring the old links back.
    for (const draft of localDrafts()) {
      const { puck, count } = relinkPage(draft.page.puck, row.path, to);
      if (count) saveLocalDraft({ ...draft.page, puck }, draft.savedToGitHub);
    }
    reload();
    return null;
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
    if (!res.ok) return `Not saved to GitHub: ${res.error} The draft is still safe in this browser.`;
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

  return (
    <PageList
      siteName={site.name}
      rows={rows && markUnpublished(rows, changes)}
      loadError={error}
      onRetry={reload}
      sourceNote={
        error
          ? "Showing the pages in this browser for now."
          : githubOn
          ? "Each page shows where its latest version is: only in this browser, saved, or live."
          : "Saving to GitHub isn't switched on yet, so this lists the pages built into the app plus drafts saved in this browser. Renaming and deleting those pages switches on with it."
      }
      githubOn={githubOn === true}
      onRename={rename}
      onDelete={remove}
      findLinks={findLinks}
      deleted={githubOn ? deleted : null}
      onRestore={restore}
      onSaveDraft={saveDraft}
      liveKnown={githubOn === true && changes !== null}
      onCreate={(page) => {
        saveLocalDraft(page, false);
        location.hash = editHref(page.path);
      }}
    >
      <PublishPanel
        githubOn={githubOn === true}
        siteUrl={site.baseUrl}
        changes={changes}
        titles={new Map((rows ?? []).map((r) => [r.path, r.title]))}
        drafts={drafts.map((r) => ({ path: r.path, title: r.title }))}
        onSaveDrafts={saveAllDrafts}
        onFinished={reload}
      />
    </PageList>
  );
}

/** overrides.puck: keyboard editing plus the layout gallery (F026). */
function BuilderRoot({ children }: { children: ReactNode }) {
  return (
    <KeyboardRoot>
      {children}
      <LayoutGallery />
    </KeyboardRoot>
  );
}

/** overrides.iframe: the canvas, with the "+" buttons between sections (F026). */
function BuilderCanvas({ children, document }: { children: ReactNode; document?: Document }) {
  return (
    <KeyboardCanvas document={document}>
      {children}
      <LayoutInserters document={document} />
    </KeyboardCanvas>
  );
}

function Builder({ path, githubOn, shortcut }: { path: string; githubOn: boolean; shortcut?: ReactNode }) {
  const [page, setPage] = useState<Page | null | undefined>(undefined);
  const [status, setStatus] = useState<string>("");

  useEffect(() => {
    void loadPage(path, githubOn).then(setPage);
  }, [path, githubOn]);

  // Let the toast go after a while; screen readers have already heard it.
  useEffect(() => {
    if (!status || status === "Saving…") return;
    const t = setTimeout(() => setStatus(""), 10_000);
    return () => clearTimeout(t);
  }, [status]);

  const saveDraft = useCallback(
    async (data: Data) => {
      const next = fromPuckData(path, data);
      const local = saveLocalDraft(next, false);
      setStatus("Saving…");
      const result = await saveContent({ kind: "page", page: next });
      if (result.ok) saveLocalDraft(next, true);
      setStatus(saveMessage(result, local, "Page"));
    },
    [path],
  );

  if (page === undefined) return <Loading />;
  if (page === null) {
    return (
      <div className="st">
        <main className="pg">
          <h1 className="st-title">There's no page at {path}</h1>
          <p>
            <a href="#/">Back to pages</a>
          </p>
        </main>
      </div>
    );
  }

  return (
    <MyLayoutsProvider githubOn={githubOn}>
      <Puck
        config={editorConfig}
        data={toPuckData(page)}
        viewports={viewports}
        headerTitle={page.title || path}
        overrides={{
          headerActions: () => (
            <>
              <a className="crust-header-link" href="#/">
                Pages
              </a>
              <LayoutsButton />
              <button type="button" className="crust-header-link" onClick={openKeyboardHelp}>
                Keyboard
              </button>
              <a className="crust-header-link" href="#/settings">
                Site settings
              </a>
              {shortcut}
              <SaveDraftButton onSave={saveDraft} />
            </>
          ),
          puck: BuilderRoot,
          iframe: BuilderCanvas,
          actionBar: KeyboardActionBar,
        }}
        onPublish={saveDraft}
        // Keep every edit in this browser, so leaving the page never loses work.
        onChange={(data) => saveLocalDraft(fromPuckData(path, data), false)}
      />
      <div role="status" aria-live="polite" className="crust-status">
        {status}
      </div>
    </MyLayoutsProvider>
  );
}

import { checkPost, config, countPlaceholders, defaultBlog, migrateChrome, tokensToCss,
  HEADER_V2_CSS, type BlogSettings, type Page, type Post, type Site, type SiteChrome, type SiteTokens } from "@crust/blocks";
import { relinkPage } from "@crust/blocks/links";
import { Puck, useGetPuck, type Data } from "@puckeditor/core";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import siteJson from "../../../content/site.json";
import {
  deletePage,
  getChanges,
  getDeleted,
  getLinks,
  getPage,
  getStatus,
  listPages,
  listPosts,
  renamePage,
  restorePage,
  saveContent,
  savePost,
  type ApiResult,
  type DeletedPage,
  type PendingChanges,
} from "./api-client";
import { KeyboardActionBar, KeyboardCanvas, KeyboardRoot, openKeyboardHelp } from "./keyboard/KeyboardEditing";
import { LayoutGallery, LayoutInserters, LayoutsButton } from "./layouts/LayoutGallery";
import { MyLayoutsProvider } from "./layouts/mine";
import { PageList, editHref } from "./pages/PageList";
import type { LinkingPage } from "./pages/PageActions";
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
import { DesktopPublishPanel } from "./publish/DesktopPublishPanel";
import { desktopHosts } from "./publish/hosts";
import { desktopPublisher } from "./desktop/local-publish";
import { PublishShortcut, usePendingCount } from "./publish/shortcut";
import { SignOutLink } from "./sign-out";
import { SaveStatus, useSaveStatus } from "./save-status";
import { withRichText } from "./rich-text/field";
import { withLinkedSectionFields } from "./linked/fields";
import { LinkedSectionsProvider } from "./linked/store";
import { SectionEditor } from "./linked/SectionEditor";
export { SIGN_OUT_URL, SignOutLink } from "./sign-out";
import { withItemEditing } from "./items/items";
import { withIconFields } from "./icons/fields";
import "./icons/icons.css";
import { withResponsiveEditing } from "./responsive/fields";
import { withPlaceholderEditing } from "./placeholders/fields";
import { PlaceholderChecklist, PlaceholderWatcher } from "./placeholders/Checklist";
import { withSectionEditing } from "./sections/editing";
import { withSettingsTabs } from "./tabs/tabs";
import { SiteStyleContext, type SiteStyle } from "./sections/site-style";
import { SiteSettings } from "./settings/SiteSettings";
import { bundledLoader, githubLoader } from "./templates/collect";
import { currentSiteNow } from "./templates/current";
import { TemplateBanner } from "./templates/TemplateBanner";
import { TemplatesScreen } from "./templates/TemplatesScreen";
import { loadSavedTokens, sameTokens, saveTokens } from "./tokens-store";
import { loadSavedAddress, loadSavedChrome, sameChrome, saveAddress, saveChrome, siteToSave } from "./chrome-store";
import { SiteChromeContext, withSiteChrome } from "./chrome-canvas";
import { desktopContent } from "./desktop/content";
import { sitesApi, sitesInvoke } from "./sites/sites";
import { SitesScreen } from "./sites/SitesScreen";
import { withMediaFields } from "./media/fields";
import { MediaPicker } from "./media/MediaPicker";
import { BlogContext, withPostEditing } from "./posts/editing";
import { SeoSiteProvider, withSeoEditing } from "./seo/fields";
import { PostList } from "./posts/PostList";
import { QuickEdit } from "./quick/QuickEdit";
import { prefersQuickEdit } from "./quick/quick";
import { fromPuckData as postFromPuckData, loadPost, saveLocalPost, toPuckData as postToPuckData } from "./posts/store";

/** The site's settings: built into the web admin, or from the desktop app's site folder (F055). */
const site = (desktopContent()?.site ?? siteJson) as Site;
/** The builder's blocks: "Replace me" marks (F046), rich text in Text blocks (F042), image fields with the media library (F034), visual Section fields (F025), per-device settings (F029), Content/Style/Advanced tabs (F030). */
const editorConfig = withSiteChrome(withSettingsTabs(withPlaceholderEditing(withResponsiveEditing(withSectionEditing(withItemEditing(withIconFields(withMediaFields(withRichText(withLinkedSectionFields(config))))))))));
/** Posts (F035): the same blocks, with the post's details and top. */
const postEditorConfig = withPostEditing(editorConfig);
/** Pages also get search and sharing settings (F036). */
const pageEditorConfig = withSeoEditing(editorConfig);

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

/** F069: GitHub refused or couldn't be reached (not "isn't switched on yet", which is expected). */
export const saveFailed = (result: ApiResult<unknown>) => !result.ok && !result.notConfigured;

/** What to tell the owner after a save: GitHub first, the browser copy as the safety net. */
export function saveMessage(result: ApiResult<unknown>, savedLocally: boolean, what: string): string {
  // F055: in the desktop app, saving means the site folder on the computer.
  if (desktopContent()) return result.ok ? `${what} saved. Visitors see it after you publish.` : `${what} not saved: ${result.error}`;
  if (result.ok) return `${what} saved to GitHub. Visitors see it after you publish.`;
  const local = savedLocally ? " A copy is safe in this browser." : "";
  if (result.notConfigured) return `${what} saved in this browser. Saving to GitHub isn't switched on yet.`;
  return `${what} not saved to GitHub: ${result.error}${local}`;
}

// --- Routing: #/ pages · #/edit?path=/about · #/settings · #/posts · #/post?slug=x ---

export type Route =
  | { name: "pages"; focus?: "publish" }
  | { name: "edit"; path: string }
  | { name: "settings" }
  // F035: the Posts screen and one post in the builder.
  | { name: "posts" }
  | { name: "post"; slug: string }
  /** F043: a linked section's own editor; `from` is where Back goes. */
  | { name: "section"; id: string; from: string }
  /** F048: Start from a template. */
  | { name: "templates" }
  /** F057: the desktop app's Sites screen. */
  | { name: "sites" };

export function parseRoute(hash: string): Route {
  if (hash.startsWith("#/settings")) return { name: "settings" };
  if (hash.startsWith("#/templates")) return { name: "templates" };
  if (hash.startsWith("#/sites")) return { name: "sites" };
  if (hash.startsWith("#/posts")) return { name: "posts" };
  if (hash.startsWith("#/post?")) {
    const slug = new URLSearchParams(hash.split("?")[1] ?? "").get("slug");
    if (slug) return { name: "post", slug };
  }
  if (hash.startsWith("#/section?")) {
    const q = new URLSearchParams(hash.split("?").slice(1).join("?"));
    const id = q.get("id");
    const from = q.get("from") ?? "";
    // Back only ever goes to a screen of this app.
    if (id) return { name: "section", id, from: from.startsWith("#/") ? from : "#/" };
  }
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
  // F044: the site's own address (site.json's baseUrl), saved with the rest of Site settings.
  const [savedAddress, setSavedAddress] = useState(() => loadSavedAddress(site.baseUrl));
  const [addressDraft, setAddressDraft] = useState(savedAddress);
  const [githubOn, setGithubOn] = useState<boolean | null>(null);
  // The builder shows unsaved token edits too, so switching screens loses nothing.
  // F076: the builder always has the header and footer v2 CSS (published pages only when used).
  useTokenStyles(useMemo(() => `${tokensToCss(draft)}\n${HEADER_V2_CSS}`, [draft]));

  useEffect(() => {
    void getStatus().then((s) => setGithubOn(s.ok && s.configured));
  }, []);

  useEffect(() => {
    document.title =
      route.name === "settings"
        ? "Site settings · Crust"
        : route.name === "edit"
          ? `Editing ${route.path} · Crust`
          : route.name === "posts"
            ? "Posts · Crust"
            : route.name === "post"
              ? `Editing post /blog/${route.slug} · Crust`
              : route.name === "section"
                ? "Editing a linked section · Crust"
                : route.name === "templates"
                  ? "Start from a template · Crust"
                  : "Pages · Crust";
  }, [route]);

  const saveSiteTokens = async (tokens: SiteTokens) => {
    const chrome = chromeDraft;
    const address = addressDraft;
    const local = saveTokens(tokens) && saveChrome(chrome) && saveAddress(address);
    if (local) {
      setSaved(tokens);
      setSavedChrome(chrome);
      setSavedAddress(address);
    }
    const result = await saveContent({ kind: "site", site: siteToSave(site, tokens, chrome, defaultChrome, address) });
    if (result.ok) {
      setSaved(tokens);
      setSavedChrome(chrome);
      setSavedAddress(address);
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
        {/* F076: a footer built from blocks is a linked section. */}
        <LinkedSectionsProvider githubOn={!!githubOn}>
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
            setAddressDraft(savedAddress);
          }}
          chrome={chromeDraft}
          onChromeChange={setChromeDraft}
          chromeDirty={!sameChrome(savedChrome, chromeDraft)}
          pages={pageOptions}
          address={addressDraft}
          onAddressChange={setAddressDraft}
          addressDirty={savedAddress !== addressDraft}
          templateLoader={githubOn ? githubLoader : bundledLoader}
          githubOn={githubOn === true}
        />
        </LinkedSectionsProvider>
        <MediaPicker />
      </MyLayoutsProvider>
    );
  }

  if (route.name === "sites") {
    const invoke = sitesInvoke();
    // Only the desktop app keeps several sites; the web admin is one site.
    if (invoke) return <SitesScreen api={sitesApi(invoke)} openName={site.name} />;
  }

  if (route.name === "templates") {
    if (githubOn === null) return <Loading />;
    return <TemplatesScreen siteName={site.name} githubOn={githubOn} currentSite={() => currentSiteNow(githubOn, site.language)} />;
  }

  if (route.name === "posts") {
    if (githubOn === null) return <Loading />;
    return <PostList siteName={site.name} githubOn={githubOn} language={site.language} />;
  }

  if (route.name === "post") {
    if (githubOn === null) return <Loading />;
    return (
      <SiteStyleContext.Provider value={siteStyle}>
        <SiteChromeContext.Provider value={{ chrome: chromeDraft, siteName: site.name, path: `/blog/${route.slug}` }}>
          <PostBuilder key={route.slug} slug={route.slug} githubOn={githubOn} shortcut={shortcut("crust-header-link")} />
          <MediaPicker />
        </SiteChromeContext.Provider>
      </SiteStyleContext.Provider>
    );
  }

  if (route.name === "section") {
    if (githubOn === null) return <Loading />;
    return (
      <SiteStyleContext.Provider value={siteStyle}>
        <SiteChromeContext.Provider value={{ chrome: chromeDraft, siteName: site.name, path: "/" }}>
          <LinkedSectionsProvider githubOn={githubOn}>
            <SectionEditor
              key={route.id}
              id={route.id}
              back={route.from}
              githubOn={githubOn}
              config={editorConfig}
              overrides={{ puck: BuilderRoot, iframe: BuilderCanvas, actionBar: KeyboardActionBar }}
            />
          </LinkedSectionsProvider>
          <MediaPicker />
        </SiteChromeContext.Provider>
      </SiteStyleContext.Provider>
    );
  }

  if (route.name === "edit") {
    if (githubOn === null) return <Loading />;
    // F038: on a phone, pages open in quick edit (words and photos only).
    if (prefersQuickEdit(window.innerWidth, location.hash)) {
      return (
        <>
          <QuickEditScreen key={route.path} path={route.path} githubOn={githubOn} />
          <MediaPicker />
        </>
      );
    }
    return (
      <SiteStyleContext.Provider value={siteStyle}>
        <SiteChromeContext.Provider value={{ chrome: chromeDraft, siteName: site.name, path: route.path }}>
          <Builder key={route.path} path={route.path} githubOn={githubOn} shortcut={shortcut("crust-header-link")} />
          <MediaPicker />
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
      allSites={desktopContent() !== null}
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
      notice={<TemplateBanner githubOn={githubOn} />}
    >
      {desktopPublisher() ? (
        // F056: in the desktop app the site is built on the computer.
        <DesktopPublishPanel publisher={desktopPublisher()!} siteUrl={loadSavedAddress(site.baseUrl)} hosts={desktopHosts()} />
      ) : (
      <PublishPanel
        githubOn={githubOn === true}
        siteUrl={loadSavedAddress(site.baseUrl)}
        changes={changes}
        titles={new Map((rows ?? []).map((r) => [r.path, r.title]))}
        drafts={drafts.map((r) => ({ path: r.path, title: r.title }))}
        placeholders={(rows ?? []).filter((r) => r.placeholders).map((r) => ({ path: r.path, title: r.title, count: r.placeholders! }))}
        onSaveDrafts={saveAllDrafts}
        onFinished={reload}
      />
      )}
    </PageList>
  );
}

/** overrides.puck: keyboard editing plus the layout gallery (F026). */
function BuilderRoot({ children }: { children: ReactNode }) {
  return (
    <KeyboardRoot>
      {children}
      <LayoutGallery />
      <PlaceholderWatcher />
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
  const status = useSaveStatus();

  useEffect(() => {
    void loadPage(path, githubOn).then(setPage);
  }, [path, githubOn]);


  const saveDraftRef = useRef<(data: Data) => Promise<void>>(async () => {});
  const saveDraft = useCallback(
    async (data: Data) => {
      const next = fromPuckData(path, data);
      const local = saveLocalDraft(next, false);
      status.saving();
      const result = await saveContent({ kind: "page", page: next });
      if (result.ok) saveLocalDraft(next, true);
      // F069: a failed save stays on screen with "Try again".
      status.show(saveMessage(result, local, "Page"), saveFailed(result), () => void saveDraftRef.current(data));
    },
    [path, status.saving, status.show],
  );
  saveDraftRef.current = saveDraft;

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
    <SeoSiteProvider value={{ baseUrl: loadSavedAddress(site.baseUrl), siteName: site.name, path }}>
      <LinkedSectionsProvider githubOn={githubOn}>
      <MyLayoutsProvider githubOn={githubOn}>
        <Puck
          config={pageEditorConfig}
          data={toPuckData(page)}
          viewports={viewports}
          headerTitle={page.title || path}
          overrides={{
            headerActions: () => (
              <>
                <a className="crust-header-link" href="#/">
                  Pages
                </a>
                <a className="crust-header-link" href={`#/edit?path=${encodeURIComponent(path)}&mode=quick`}>
                  Quick edit
                </a>
                <LayoutsButton />
                <PlaceholderChecklist />
                <button type="button" className="crust-header-link" onClick={openKeyboardHelp}>
                  Keyboard
                </button>
                <a className="crust-header-link" href="#/settings">
                  Site settings
                </a>
                {shortcut}
                <SaveDraftButton onSave={saveDraft} />
                {/* F069: at the far end, after a divider, away from Save draft. */}
                <SignOutLink />
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
        <SaveStatus note={status.note} onDismiss={status.clear} />
      </MyLayoutsProvider>
      </LinkedSectionsProvider>
    </SeoSiteProvider>
  );
}

/** One post in the builder (F035). Like Builder, with the post's details in the page settings. */
function PostBuilder({ slug, githubOn, shortcut }: { slug: string; githubOn: boolean; shortcut?: ReactNode }) {
  const [post, setPost] = useState<Post | null | undefined>(undefined);
  const [blog, setBlog] = useState<BlogSettings>(defaultBlog);
  const status = useSaveStatus();

  useEffect(() => {
    void loadPost(slug, githubOn).then(setPost);
    if (githubOn) void listPosts().then((res) => res.ok && setBlog(res.blog));
  }, [slug, githubOn]);


  const saveDraftRef = useRef<(data: Data) => Promise<void>>(async () => {});
  const saveDraft = useCallback(
    async (data: Data) => {
      const next = postFromPuckData(slug, data);
      const problems = checkPost(next);
      const local = saveLocalPost(next, false);
      if (problems.length) {
        status.show(`Kept in this browser, not saved to GitHub yet: ${problems.join(" ")}`, true);
        return;
      }
      status.saving();
      const result = await savePost(next);
      if (result.ok) saveLocalPost(next, true);
      status.show(saveMessage(result, local, "Post"), saveFailed(result), () => void saveDraftRef.current(data));
    },
    [slug, status.saving, status.show],
  );
  saveDraftRef.current = saveDraft;

  if (post === undefined) return <Loading />;
  if (post === null) {
    return (
      <div className="st">
        <main className="pg">
          <h1 className="st-title">There's no post at /blog/{slug}</h1>
          <p>
            <a href="#/posts">Back to posts</a>
          </p>
        </main>
      </div>
    );
  }

  return (
    <BlogContext.Provider value={{ blog, language: site.language }}>
      <LinkedSectionsProvider githubOn={githubOn}>
      <MyLayoutsProvider githubOn={githubOn}>
        <Puck
          config={postEditorConfig}
          data={postToPuckData(post)}
          viewports={viewports}
          headerTitle={post.title || "Untitled post"}
          overrides={{
            headerActions: () => (
              <>
                <a className="crust-header-link" href="#/posts">
                  Posts
                </a>
                <LayoutsButton />
                <PlaceholderChecklist />
                <button type="button" className="crust-header-link" onClick={openKeyboardHelp}>
                  Keyboard
                </button>
                {shortcut}
                <SaveDraftButton onSave={saveDraft} />
                {/* F069: at the far end, after a divider, away from Save draft. */}
                <SignOutLink />
              </>
            ),
            puck: BuilderRoot,
            iframe: BuilderCanvas,
            actionBar: KeyboardActionBar,
          }}
          onPublish={saveDraft}
          onChange={(data) => saveLocalPost(postFromPuckData(slug, data), false)}
        />
        <SaveStatus note={status.note} onDismiss={status.clear} />
      </MyLayoutsProvider>
      </LinkedSectionsProvider>
    </BlogContext.Provider>
  );
}

/** Quick edit for one page (F038). */
function QuickEditScreen({ path, githubOn }: { path: string; githubOn: boolean }) {
  const [page, setPage] = useState<Page | null | undefined>(undefined);
  useEffect(() => {
    void loadPage(path, githubOn).then(setPage);
  }, [path, githubOn]);
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
  return <QuickEdit page={page} githubOn={githubOn} saveMessage={saveMessage} />;
}

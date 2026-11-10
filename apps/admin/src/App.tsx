import { checkPost, config, defaultBlog, menuFromPages, migrateChrome, tokensToCss,
  HEADER_V2_CSS, ICONS_CSS, BLOCKS_V3_CSS, INTERACTIVE_CSS, designNames, isDesignKind, type DesignKind, type BlogSettings, type MenuLink, type Page, type Post, type Site, type SiteChrome, type SiteTokens } from "@crust/blocks";
import { Puck, type Data } from "@puckeditor/core";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import siteJson from "../../../content/site.json";
import {
  getPage,
  getStatus,
  listPages,
  listPosts,
  saveContent,
  savePost,
  type ApiResult,
} from "./api-client";
import { KeyboardActionBar, KeyboardCanvas, KeyboardRoot } from "./keyboard/KeyboardEditing";
import { LayoutPhotoWatcher } from "./layouts/photos";
import { LayoutGallery, LayoutInserters, LayoutsButton } from "./layouts/LayoutGallery";
import "./app-frame/app-frame.css";
import { MyLayoutsProvider } from "./layouts/mine";
import { PageList, editHref } from "./pages/PageList";
import { usePagesData } from "./pages-panel/usePagesData";
import { PagesMenuContext, PagesRail } from "./pages-panel/PagesRail";
import {
  bundledPages,
  fromPuckData,
  getLocalDraft,
  localDrafts,
  mergePageRows,
  saveLocalDraft,
  toPuckData,
} from "./pages/store";
import { PublishPanel } from "./publish/PublishPanel";
import { DesktopPublishPanel } from "./publish/DesktopPublishPanel";
import { desktopHosts } from "./publish/hosts";
import { desktopPublisher } from "./desktop/local-publish";
import { usePendingCount } from "./publish/shortcut";
import { SaveStatus, useSaveStatus } from "./save-status";
import { withRichText } from "./rich-text/field";
import { withInlineText } from "./inline-text/InlineText";
import { withLinkedSectionFields } from "./linked/fields";
import { LinkedSectionsProvider } from "./linked/store";
import { SectionEditor } from "./linked/SectionEditor";
export { SIGN_OUT_URL, SignOutLink } from "./sign-out";
import { withItemEditing } from "./items/items";
import { withIconFields } from "./icons/fields";
import "./icons/icons.css";
import { withBlocksV3Fields } from "./blocks-v3/fields";
import "./blocks-v3/blocks-v3.css";
import "./interactive/interactive.css";
import { withInteractiveFields } from "./interactive/fields";
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
import { setAppFrame } from "./app-frame/AppTopBar";
import { EditorBar, EditorFrameContext, PageSwitcher } from "./app-frame/EditorBar";
import { railPlugins } from "./app-frame/rail";
import "./page-first/page-first.css";
import { PageFirstContext, PageFirstWatcher, SettingsButton, SettingsPanel, withSettingsLabel } from "./page-first/PageFirst";
import { useAutosave, type SavePhase } from "./app-frame/autosave";
import { MediaFocusProvider } from "./media/FocusPicker";
import { DesignEditor } from "./designs/DesignEditor";
import { BlogContext, withPostEditing } from "./posts/editing";
import { SeoSiteProvider, withSeoEditing } from "./seo/fields";
import { PostList } from "./posts/PostList";
import { QuickEdit } from "./quick/QuickEdit";
import { prefersQuickEdit } from "./quick/quick";
import { fromPuckData as postFromPuckData, loadPost, saveLocalPost, toPuckData as postToPuckData } from "./posts/store";

/** The site's settings: built into the web admin, or from the desktop app's site folder (F055). */
const site = (desktopContent()?.site ?? siteJson) as Site;
/** The builder's blocks: "Replace me" marks (F046), rich text in Text blocks (F042), image fields with the media library (F034), visual Section fields (F025), per-device settings (F029), Content/Style/Advanced tabs (F030). */
const editorConfig = withSiteChrome(withSettingsTabs(withPlaceholderEditing(withResponsiveEditing(withSectionEditing(withItemEditing(withIconFields(withBlocksV3Fields(withInteractiveFields(withMediaFields(withRichText(withLinkedSectionFields(withInlineText(config)))))))))))));
/** Posts (F035): the same blocks, with the post's details and top. */
const postEditorConfig = withSettingsLabel(withPostEditing(editorConfig), "Post settings");
/** Pages also get search and sharing settings (F036). */
const pageEditorConfig = withSettingsLabel(withSeoEditing(editorConfig), "Page settings");

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

export { saveFailed, saveMessage } from "./save-messages";
import { saveFailed, saveMessage } from "./save-messages";

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
  /** F082: the post page, blog page or "Page not found" design. */
  | { name: "design"; kind: DesignKind }
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
  if (hash.startsWith("#/design?")) {
    const kind = new URLSearchParams(hash.split("?")[1] ?? "").get("kind");
    if (isDesignKind(kind)) return { name: "design", kind };
  }
  if (hash.startsWith("#/edit")) {
    const path = new URLSearchParams(hash.split("?")[1] ?? "").get("path");
    if (path) return { name: "edit", path };
  }
  // F087: page first: with no address, the site opens on its Home page in the editor.
  if (hash === "" || hash === "#") return { name: "edit", path: "/" };
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
  useTokenStyles(useMemo(() => `${tokensToCss(draft)}\n${HEADER_V2_CSS}\n${ICONS_CSS}\n${BLOCKS_V3_CSS}\n${INTERACTIVE_CSS}`, [draft]));

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
                  : route.name === "design"
                    ? `${designNames[route.kind]} design · Crust`
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
  const pageOptions = usePageOptions(githubOn, route.name === "settings" || route.name === "edit" || route.name === "pages");
  // F091: the pages panel's "In the menu" is the header menu. A site whose header was never edited gets its menu
  // from its pages at publish time, so until then every page counts as in the menu.
  const menuIsAutomatic = site.header === undefined && sameChrome(savedChrome, defaultChrome);
  const panelMenu = useMemo(
    () => (menuIsAutomatic ? menuFromPages(pageOptions) : chromeDraft.header.menu),
    [menuIsAutomatic, pageOptions, chromeDraft.header.menu],
  );
  const saveMenu = (menu: MenuLink[]) => {
    const next: SiteChrome = { ...savedChrome, header: { ...savedChrome.header, menu } };
    setSavedChrome(next);
    setChromeDraft((c) => ({ ...c, header: { ...c.header, menu } }));
    saveChrome(next);
    // Like the rest of Site settings: kept in this browser at once, then saved to GitHub when that is on.
    void saveContent({ kind: "site", site: siteToSave(site, saved, next, defaultChrome, savedAddress) });
  };
  // F025: the builder edits the same draft as Site settings ("Whole site" mode).
  const siteStyle: SiteStyle = {
    tokens: draft,
    setTokens: setDraft,
    dirty: !sameTokens(saved, draft),
    save: () => saveSiteTokens(draft),
    discard: () => setDraft(saved),
  };

  // F024: shown in the builder and Site settings top bars; counted again on each screen change.
  // F086: and after each save, so the top bar's "3 changes not live" keeps up.
  const [saves, setSaves] = useState(0);
  const onSaved = useCallback(() => setSaves((n) => n + 1), []);
  const pendingCount = usePendingCount(githubOn, `${route.name}:${saves}`);
  useEffect(() => setAppFrame({ siteName: site.name, desktop: desktopContent() !== null, pending: pendingCount }), [pendingCount]);

  if (route.name === "settings") {
    return (
      // My layouts are here too: a theme pack can carry them (F033).
      <MyLayoutsProvider githubOn={!!githubOn}>
        {/* F076: a footer built from blocks is a linked section. */}
        <LinkedSectionsProvider githubOn={!!githubOn}>
        <SiteSettings
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
    return <TemplatesScreen siteName={site.name} githubOn={githubOn} currentSite={() => currentSiteNow(githubOn, site.language)} startedFrom={site.template} />;
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
          <PostBuilder key={route.slug} slug={route.slug} githubOn={githubOn} onSaved={onSaved} />
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

  if (route.name === "design") {
    if (githubOn === null) return <Loading />;
    const path = route.kind === "post" ? "/blog/post" : route.kind === "blog" ? "/blog" : "/404";
    return (
      <SiteStyleContext.Provider value={siteStyle}>
        <SiteChromeContext.Provider value={{ chrome: chromeDraft, siteName: site.name, path }}>
          <LinkedSectionsProvider githubOn={githubOn}>
            <DesignEditor
              key={route.kind}
              kind={route.kind}
              githubOn={githubOn}
              language={site.language}
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
          <PagesMenuContext.Provider value={{ menu: panelMenu, onMenuChange: saveMenu, githubOn, currentPath: route.path }}>
            <Builder key={route.path} path={route.path} githubOn={githubOn} onSaved={onSaved} pages={pageOptions} />
          </PagesMenuContext.Provider>
          <MediaPicker />
        </SiteChromeContext.Provider>
      </SiteStyleContext.Provider>
    );
  }

  return <Pages githubOn={githubOn} focusPublish={route.name === "pages" && route.focus === "publish"} menu={panelMenu} onMenuChange={saveMenu} />;
}

function Loading() {
  return (
    <p className="crust-loading" role="status">
      Loading…
    </p>
  );
}

function Pages({ githubOn, focusPublish = false, menu, onMenuChange }: { githubOn: boolean | null; focusPublish?: boolean; menu: MenuLink[]; onMenuChange: (menu: MenuLink[]) => void }) {
  const { rows: markedRows, plainRows: rows, error, changes, deleted, reload, rename, restore, saveDraft, saveAllDrafts, drafts, findLinks, remove, duplicate } = usePagesData(githubOn);

  // F024: arriving from the Publish shortcut, focus goes to the Publish panel once the list is there.
  useEffect(() => {
    if (!focusPublish || rows === null) return;
    const heading = document.getElementById("publish-h");
    heading?.focus();
    heading?.scrollIntoView({ block: "start" });
  }, [focusPublish, rows === null]);

  return (
    <PageList
      siteName={site.name}
      allSites={desktopContent() !== null}
      rows={markedRows}
      menu={menu}
      onMenuChange={onMenuChange}
      onDuplicate={duplicate}
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
      <LayoutPhotoWatcher />
      <PageFirstWatcher />
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

/** F086: what a save ended in, for the top bar. */
function phaseOf(result: ApiResult<unknown>): SavePhase {
  if (result.ok) return "saved";
  return saveFailed(result) ? "failed" : "local";
}

function Builder({ path, githubOn, onSaved, pages }: { path: string; githubOn: boolean; onSaved: () => void; pages: { path: string; title: string }[] }) {
  const [page, setPage] = useState<Page | null | undefined>(undefined);
  const status = useSaveStatus();

  useEffect(() => {
    void loadPage(path, githubOn).then(setPage);
  }, [path, githubOn]);

  // F086: changes save on their own (grouped), so "Save draft" is gone.
  const save = useCallback(
    async (next: Page): Promise<SavePhase> => {
      const local = saveLocalDraft(next, false);
      const result = await saveContent({ kind: "page", page: next });
      if (result.ok) {
        saveLocalDraft(next, true);
        onSaved();
      }
      // F069: a failed save stays on screen with "Try again".
      if (saveFailed(result)) status.show(saveMessage(result, local, "Page"), true, () => autosave.retry(next));
      else status.clear();
      return phaseOf(result);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onSaved, status.show, status.clear],
  );
  const autosave = useAutosave<Page>(save, (p) => JSON.stringify(p), page ?? null);
  const plugins = useMemo(
    () => railPlugins({ pages: () => pages, hrefFor: editHref, quickEdit: `#/edit?path=${encodeURIComponent(path)}&mode=quick`, pagesPanel: () => <PagesRail /> }),
    [pages, path],
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
    <SeoSiteProvider value={{ baseUrl: loadSavedAddress(site.baseUrl), siteName: site.name, path }}>
      <LinkedSectionsProvider githubOn={githubOn}>
      <MyLayoutsProvider githubOn={githubOn}>
        <PageFirstContext.Provider value={{ site: site.name, settingsLabel: "Page settings" }}>
        <EditorFrameContext.Provider
          value={{ where: (
            <>
              <PageSwitcher current={path} pages={pages} hrefFor={editHref} />
              <SettingsButton />
            </>
          ), devices: viewports, phase: githubOn ? autosave.phase : autosave.phase === "saved" ? "local" : autosave.phase }}
        >
          <Puck
            config={pageEditorConfig}
            data={toPuckData(page)}
            viewports={viewports}
            ui={{ rightSideBarVisible: false }}
            headerTitle={page.title || path}
            plugins={plugins}
            overrides={{
              header: EditorBar,
              fields: SettingsPanel,
              puck: BuilderRoot,
              iframe: BuilderCanvas,
              actionBar: KeyboardActionBar,
            }}
            onPublish={(data) => autosave.retry(fromPuckData(path, data))}
            // Keep every edit in this browser at once, so leaving the page never loses work;
            // the save to GitHub (or the computer) follows when the editing pauses.
            onChange={(data) => {
              const next = fromPuckData(path, data);
              saveLocalDraft(next, false);
              autosave.schedule(next);
            }}
          />
        </EditorFrameContext.Provider>
        </PageFirstContext.Provider>
        <SaveStatus note={status.note} onDismiss={status.clear} />
      </MyLayoutsProvider>
      </LinkedSectionsProvider>
    </SeoSiteProvider>
  );
}

/** One post in the builder (F035). Like Builder, with the post's details in the page settings. */
function PostBuilder({ slug, githubOn, onSaved }: { slug: string; githubOn: boolean; onSaved: () => void }) {
  const [post, setPost] = useState<Post | null | undefined>(undefined);
  const [blog, setBlog] = useState<BlogSettings>(defaultBlog);
  const status = useSaveStatus();

  useEffect(() => {
    void loadPost(slug, githubOn).then(setPost);
    if (githubOn) void listPosts().then((res) => res.ok && setBlog(res.blog));
  }, [slug, githubOn]);

  const save = useCallback(
    async (next: Post): Promise<SavePhase> => {
      const problems = checkPost(next);
      const local = saveLocalPost(next, false);
      if (problems.length) {
        // Said once per new problem, not on every pause in typing.
        status.show(`Kept in this browser, not saved yet: ${problems.join(" ")}`);
        return "held";
      }
      const result = await savePost(next);
      if (result.ok) {
        saveLocalPost(next, true);
        onSaved();
      }
      if (saveFailed(result)) status.show(saveMessage(result, local, "Post"), true, () => autosave.retry(next));
      else status.clear();
      return phaseOf(result);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onSaved, status.show, status.clear],
  );
  const autosave = useAutosave<Post>(save, (p) => JSON.stringify(p), post ?? null);
  const plugins = useMemo(() => railPlugins({ pages: () => [], hrefFor: editHref }).filter((p) => p.name !== "pages"), []);

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
        <PageFirstContext.Provider value={{ site: site.name, settingsLabel: "Post settings" }}>
        <EditorFrameContext.Provider
          value={{
            where: (
              <>
              <a className="af-crumb" href="#/posts">
                <span className="af-switch-label">Post</span>
                {post.title || "Untitled post"}
              </a>
              <SettingsButton />
              </>
            ),
            devices: viewports,
            phase: githubOn ? autosave.phase : autosave.phase === "saved" ? "local" : autosave.phase,
          }}
        >
          <Puck
            config={postEditorConfig}
            data={postToPuckData(post)}
            viewports={viewports}
            ui={{ rightSideBarVisible: false }}
            headerTitle={post.title || "Untitled post"}
            plugins={plugins}
            overrides={{
              header: EditorBar,
              fields: SettingsPanel,
              puck: BuilderRoot,
              iframe: BuilderCanvas,
              actionBar: KeyboardActionBar,
            }}
            onPublish={(data) => autosave.retry(postFromPuckData(slug, data))}
            onChange={(data) => {
              const next = postFromPuckData(slug, data);
              saveLocalPost(next, false);
              autosave.schedule(next);
            }}
          />
        </EditorFrameContext.Provider>
        </PageFirstContext.Provider>
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

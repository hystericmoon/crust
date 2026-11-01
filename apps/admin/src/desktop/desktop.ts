/**
 * F055: starting the builder inside the desktop app. Opens the site folder
 * (a new site if it's empty), reads the site the way the web admin has it
 * built in, and answers the builder's API requests in the window.
 */
import { defaultTokens, parsePost, type Page, type Post, type Site } from "@crust/blocks";
import { LocalStore } from "../../server/local-store";
import { setDesktopContent, type DesktopContent } from "./content";
import { localApi, routedFetch } from "./local-api";
import { localPublisher, setDesktopPublisher } from "./local-publish";
import { tauriFolder, type Invoke } from "./tauri-folder";
import { setSitesInvoke } from "../sites/sites";

/** True when the builder runs in the desktop app's window. */
export const isDesktop = (): boolean => typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

const json = (v: unknown) => `${JSON.stringify(v, null, 2)}\n`;

/** A new, nearly empty site: its settings and a Home page to start from. */
export function newSiteFiles(name = "My site"): { path: string; content: string }[] {
  const site: Site = { name, baseUrl: "https://example.pages.dev", language: "en", tokens: defaultTokens };
  const home: Page = {
    path: "/",
    title: name,
    description: `The home page of ${name}.`,
    puck: {
      root: { props: {} },
      content: [
        {
          type: "Section",
          props: {
            id: "Section-start",
            background: "background",
            paddingY: "xl",
            content: [
              { type: "Heading", props: { id: "Heading-start", text: name, level: "h1", align: "left" } },
              {
                type: "Text",
                props: { id: "Text-start", text: "Your new site. Add blocks from the left, or start from a template.", align: "left", tone: "muted" },
              },
            ],
          },
        },
      ],
    } as Page["puck"],
  };
  return [
    { path: "content/site.json", content: json(site) },
    { path: "content/pages/index.json", content: json(home) },
  ];
}

const parse = <T>(text: string | null): T | null => {
  if (!text) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
};

/**
 * Opens a site folder: a new site when there's none yet, and a history for
 * a site that came without one (copied in). Returns what the builder
 * starts from.
 */
export async function openSite(store: LocalStore, name = "My site"): Promise<Omit<DesktopContent, "folder" | "siteId">> {
  let site = parse<Site>(await store.readFile("content/site.json"));
  if (!site) {
    await store.commitFiles(newSiteFiles(name), "Start a new site");
    site = parse<Site>(await store.readFile("content/site.json"))!;
  } else {
    await store.init();
  }
  const pages: Page[] = [];
  for (const file of await store.listFolder("content/pages")) {
    if (!file.name.endsWith(".json")) continue;
    const page = parse<Page>(await store.readFile(file.path));
    if (page?.path && page.puck) pages.push(page);
  }
  const posts: Post[] = [];
  for (const file of await store.listFolder("content/posts")) {
    if (!file.name.endsWith(".json")) continue;
    const post = parsePost(await store.readFile(file.path));
    if (post) posts.push(post);
  }
  return { site, pages, posts };
}

/** Everything the app does before the builder appears. */
export async function startDesktop(invoke?: Invoke): Promise<DesktopContent> {
  const call: Invoke = invoke ?? ((await import("@tauri-apps/api/core")).invoke as Invoke);
  const store = new LocalStore(tauriFolder(call));
  // F057: several sites; a new one starts with its folder's name.
  const { folder, id } = (await call("site_info")) as { folder: string; id?: string };
  const opened = await openSite(store, id || "My site");
  const content = { ...opened, folder, siteId: id ?? "" };
  setDesktopContent(content);
  setSitesInvoke(call);
  // F056: publishing happens on the computer.
  setDesktopPublisher(localPublisher(store, call));
  window.fetch = routedFetch(window.fetch.bind(window), localApi({ store, localUser: "you" }), window.location.href);
  document.title = `${content.site.name} · Crust`;
  return content;
}

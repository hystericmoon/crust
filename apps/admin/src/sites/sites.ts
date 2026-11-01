/**
 * F057: several sites in the desktop app. Each site is a folder in
 * Documents/Crust with its own content, history and publish settings; the
 * app's Rust side (crates/crust-desktop/src/sites.rs) moves the folders, and
 * this side changes what's inside them through each site's own history, so
 * a rename or a copy is a saved change like any other.
 */
import { PLACEHOLDER_BASE_URL } from "@crust/blocks";
import { LocalStore } from "../../server/local-store";
import { newSiteFiles } from "../desktop/desktop";
import { tauriFolder, type Invoke } from "../desktop/tauri-folder";

export interface SiteSummary {
  /** The folder's name; how the app refers to the site. */
  id: string;
  name: string;
  pages: number;
  /** Last saved, in milliseconds since 1970. */
  edited: number | null;
  /** The site open in the window. */
  open: boolean;
}

export interface DeletedSite {
  id: string;
  name: string;
  deletedAt: number;
  /** When it's removed for good (30 days after deleting). */
  removedAt: number;
}

/** Longest site name (as crust_desktop::sites::MAX_NAME). */
export const MAX_NAME = 80;

let current: Invoke | null = null;

/** The app's commands, once the desktop app has started (null on the web). */
export const sitesInvoke = (): Invoke | null => current;

export function setSitesInvoke(invoke: Invoke | null) {
  current = invoke;
}

/** A name tidied the way the app stores it: spaces trimmed and collapsed. */
export const tidyName = (name: string) => name.trim().replace(/\s+/g, " ");

/** What's wrong with a site name, in words to show under the field; null if it's fine. */
export function siteNameProblem(name: string, others: string[]): string | null {
  const tidy = tidyName(name);
  if (!tidy) return "Give the site a name.";
  if ([...tidy].length > MAX_NAME) return `Use a shorter name (at most ${MAX_NAME} characters).`;
  if (others.some((o) => o.toLowerCase() === tidy.toLowerCase())) return `You already have a site called “${tidy}”. Pick another name.`;
  return null;
}

/** The name a copy gets: "Harbour copy", kept within the limit. */
export function copyName(name: string, others: string[]): string {
  const base = [...`${name}`].slice(0, MAX_NAME - 8).join("").trimEnd();
  const taken = new Set(others.map((o) => o.toLowerCase()));
  let candidate = `${base} copy`;
  for (let n = 2; taken.has(candidate.toLowerCase()); n++) candidate = `${base} copy ${n}`;
  return candidate;
}

const asError = (e: unknown) => (e instanceof Error ? e : new Error(String(e)));

/** Calls an app command; its refusal becomes an Error with the app's own words. */
async function call<T>(invoke: Invoke, cmd: string, args?: Record<string, unknown>): Promise<T> {
  try {
    return (await invoke(cmd, args)) as T;
  } catch (e) {
    throw asError(e);
  }
}

/** Changes a site's settings (content/site.json) as one saved change in its history. */
async function editSettings(store: LocalStore, change: (site: Record<string, unknown>) => void, message: string) {
  const text = await store.readFile("content/site.json");
  if (!text) return;
  let site: Record<string, unknown>;
  try {
    site = JSON.parse(text) as Record<string, unknown>;
  } catch {
    return;
  }
  change(site);
  await store.commitFiles([{ path: "content/site.json", content: `${JSON.stringify(site, null, 2)}\n` }], message);
}

export interface SitesApi {
  list(): Promise<SiteSummary[]>;
  deleted(): Promise<DeletedSite[]>;
  /** Makes a new site with a Home page; returns its id. */
  create(name: string): Promise<string>;
  /** Renames a site (its settings and its folder); returns its new id. */
  rename(site: SiteSummary, name: string): Promise<string>;
  /** Copies a site, history and all, without its publish settings. */
  duplicate(site: SiteSummary, name: string): Promise<string>;
  /** Moves a site to Recently deleted; returns the id of the site open afterwards. */
  remove(site: SiteSummary): Promise<string>;
  /** Brings a deleted site back; returns its id. */
  restore(site: DeletedSite): Promise<string>;
  /** Opens a site in the window (the builder reloads with it). */
  open(id: string): Promise<void>;
}

/** Starts the builder again from the Pages screen, with whichever site is open. */
export function reloadBuilder() {
  window.location.hash = "#/";
  window.location.reload();
}

export function sitesApi(invoke: Invoke, reload: () => void = reloadBuilder): SitesApi {
  const storeFor = (id: string) => new LocalStore(tauriFolder(invoke, id));
  return {
    list: () => call<SiteSummary[]>(invoke, "sites_list"),
    deleted: () => call<DeletedSite[]>(invoke, "sites_deleted"),
    async create(name) {
      const id = await call<string>(invoke, "sites_create", { name: tidyName(name) });
      await storeFor(id).commitFiles(newSiteFiles(tidyName(name)), "Start a new site");
      return id;
    },
    async rename(site, name) {
      const tidy = tidyName(name);
      await editSettings(storeFor(site.id), (s) => void (s.name = tidy), `Rename the site to “${tidy}”`);
      return call<string>(invoke, "sites_rename", { id: site.id, name: tidy });
    },
    async duplicate(site, name) {
      const tidy = tidyName(name);
      const id = await call<string>(invoke, "sites_duplicate", { id: site.id, name: tidy });
      // The copy is a new site: its own name, and no address yet, so it never publishes over the original.
      await editSettings(
        storeFor(id),
        (s) => {
          s.name = tidy;
          s.baseUrl = PLACEHOLDER_BASE_URL;
        },
        `Copy of “${site.name}”`,
      );
      return id;
    },
    remove: (site) => call<string>(invoke, "sites_delete", { id: site.id }),
    restore: (site) => call<string>(invoke, "sites_restore", { id: site.id }),
    async open(id) {
      await call<void>(invoke, "sites_open", { id });
      reload();
    },
  };
}

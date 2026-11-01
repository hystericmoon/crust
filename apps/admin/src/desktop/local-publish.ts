/**
 * F056: publish on your computer. The builder renders the site from the
 * site folder with the same code as the GitHub publish pipeline
 * (renderSite), and the app's Rust side finishes it with crust-publish
 * and Pagefind (crates/crust-desktop/src/publish.rs). Then it's either
 * shown in the person's browser or exported to a folder they choose.
 */
import baseCss from "@crust/blocks/styles.css?raw";
import { readSiteContent, renderSite, type ContentSource, type RenderedFile } from "@crust/render/src/site";
import { isPlaceholderAddress, type Site } from "@crust/blocks";
import type { ContentStore } from "../../server/store";
import type { Invoke } from "./tauri-folder";

/** The site folder's content/, through its content store. */
export const storeSource = (store: Pick<ContentStore, "readFile" | "listFolder">): ContentSource => ({
  read: (path) => store.readFile(`content/${path}`),
  list: async (dir) => (await store.listFolder(`content/${dir}`)).map((f) => f.name),
});

/** Every file of the site, rendered as the publish pipeline renders it. */
export async function renderLocalSite(
  store: Pick<ContentStore, "readFile" | "listFolder">,
  css = baseCss,
  /** F058: the host's address, used when the site's own address isn't set. */
  hostUrl?: string,
): Promise<{ site: Site; files: RenderedFile[] }> {
  const content = await readSiteContent(storeSource(store));
  if (hostUrl && isPlaceholderAddress(content.site.baseUrl)) content.site = { ...content.site, baseUrl: hostUrl };
  return { site: content.site, files: renderSite(content, css) };
}

/** What the app's build made (crust_desktop::BuildReport). */
export interface BuildReport {
  pages: number;
  photos: number;
  /** Pages in the search index. */
  searchable: number;
  redirects: number;
  /** Problems that would stop a publish (a preview still shows the site). */
  problems: string[];
}

/** crust_desktop::ExportResult. */
export interface ExportResult {
  status: "done" | "exists" | "cancelled";
  folder: string;
}

export interface LocalPublisher {
  /** Builds the site (problems don't stop it) and opens it in the browser. */
  preview(): Promise<{ url: string; report: BuildReport }>;
  /** Builds the site (problems stop it), asks where, and writes it there. */
  exportSite(): Promise<{ result: ExportResult; report: BuildReport }>;
  /** After "exists": replaces that folder. */
  replaceExport(): Promise<ExportResult>;
  /** Shows the exported folder in Finder or File Explorer. */
  showExport(): Promise<void>;
  /**
   * F058: builds the site with every check on (problems stop it), to upload.
   * `hostUrl` stands in for the site's address while that isn't set.
   */
  buildToPublish(hostUrl?: string): Promise<BuildReport>;
}

const asError = (e: unknown) => (e instanceof Error ? e : new Error(String(e)));

/** Calls the app, turning its refusals (plain strings) into errors. */
async function call<T>(invoke: Invoke, cmd: string, args?: Record<string, unknown>): Promise<T> {
  try {
    return (await invoke(cmd, args)) as T;
  } catch (e) {
    throw asError(e);
  }
}

export function localPublisher(store: Pick<ContentStore, "readFile" | "listFolder">, invoke: Invoke): LocalPublisher {
  const build = async (preview: boolean, hostUrl?: string) => {
    let rendered: { site: Site; files: RenderedFile[] };
    try {
      rendered = await renderLocalSite(store, baseCss, hostUrl);
    } catch (e) {
      throw new Error(`Nothing was built. ${asError(e).message}`);
    }
    const report = await call<BuildReport>(invoke, "site_build", { files: rendered.files, baseUrl: rendered.site.baseUrl, preview });
    return { site: rendered.site, report };
  };
  return {
    async preview() {
      const { report } = await build(true);
      const url = await call<string>(invoke, "site_preview", { open: true });
      return { url, report };
    },
    async exportSite() {
      const { site, report } = await build(false);
      const result = await call<ExportResult>(invoke, "site_export", { name: site.name });
      return { result, report };
    },
    replaceExport: () => call<ExportResult>(invoke, "site_export_replace"),
    showExport: () => call<void>(invoke, "site_show_export"),
    buildToPublish: async (hostUrl) => (await build(false, hostUrl)).report,
  };
}

let current: LocalPublisher | null = null;

/** The desktop app's publisher; null on the web. */
export const desktopPublisher = (): LocalPublisher | null => current;

export function setDesktopPublisher(publisher: LocalPublisher | null) {
  current = publisher;
}

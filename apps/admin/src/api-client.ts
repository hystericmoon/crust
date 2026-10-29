/**
 * Browser side of the admin API (apps/admin/server). Every call resolves to
 * a plain result; it never throws, so the UI always has a message to show.
 */
import type { Page, Site } from "@crust/blocks";

export type ApiResult<T = Record<string, never>> =
  | ({ ok: true } & T)
  | { ok: false; error: string; notConfigured?: boolean };

const NOT_AVAILABLE = "Saving to GitHub isn't available here yet.";

async function call<T>(path: string, init?: RequestInit): Promise<ApiResult<T>> {
  let res: Response;
  try {
    res = await fetch(path, { credentials: "same-origin", ...init });
  } catch {
    return { ok: false, error: "Couldn't reach the server. Check your connection and try again." };
  }
  // Without the server functions (local preview), the app's own page comes back instead of JSON.
  if (!res.headers.get("Content-Type")?.includes("application/json")) {
    return { ok: false, error: NOT_AVAILABLE, notConfigured: true };
  }
  try {
    return (await res.json()) as ApiResult<T>;
  } catch {
    return { ok: false, error: NOT_AVAILABLE, notConfigured: true };
  }
}

const post = (body: unknown): RequestInit => ({
  method: "POST",
  headers: { "Content-Type": "application/json", "X-Crust": "1" },
  body: JSON.stringify(body),
});

export const saveContent = (body: { kind: "page"; page: Page } | { kind: "site"; site: Site }) =>
  call<{ path: string; commit: string; url: string }>("/api/save", post(body));

export const getStatus = () => call<{ configured: boolean; email?: string; missing?: string[] }>("/api/status");

export interface PageSummary {
  path: string;
  title: string;
  file: string;
  lastEdited: string | null;
}
export const listPages = () => call<{ pages: PageSummary[] }>("/api/pages");
export const getPage = (path: string) => call<{ page: Page }>(`/api/page?path=${encodeURIComponent(path)}`);

export interface PublishRun {
  id: number;
  status: string;
  conclusion: string | null;
  createdAt: string;
  url: string;
}
export const startPublish = () => call("/api/publish", post({}));
/** liveUrl: where the last successful publish put the site (F017); null before the first. */
export const publishRuns = () => call<{ runs: PublishRun[]; liveUrl?: string | null }>("/api/publish");

export interface LinkingPage {
  path: string;
  title: string;
  count: number;
}
export const renamePage = (from: string, to: string) =>
  call<{ page: Page; relinked: LinkingPage[]; commit: string; url: string }>("/api/rename", post({ from, to }));
/** Other pages whose buttons or card links point at `path` (F018). */
export const getLinks = (path: string) => call<{ pages: LinkingPage[] }>(`/api/links?path=${encodeURIComponent(path)}`);
export const deletePage = (path: string) => call<{ commit: string; url: string }>("/api/delete", post({ path }));

/** What the next publish will change (F016). Same shape as server/api.ts PendingChanges. */
export interface PendingChanges {
  lastPublish: { at: string; url: string } | null;
  pages: { path: string; change: "new" | "edited" }[];
  removed: string[];
  moved: { from: string; to: string }[];
  site: boolean;
  redirects: boolean;
}
export const getChanges = () => call<PendingChanges>("/api/changes");

/** A page deleted from the builder that can be restored (F019). */
export interface DeletedPage {
  path: string;
  title: string;
  deletedAt: string;
  commit: string;
}
export const getDeleted = () => call<{ pages: DeletedPage[] }>("/api/deleted");
export const restorePage = (d: DeletedPage) => call<{ page: Page }>("/api/restore", post({ path: d.path, commit: d.commit }));

/**
 * Browser side of the admin API (apps/admin/server). Every call resolves to
 * a plain result; it never throws, so the UI always has a message to show.
 */
import type { BlogSettings, DesignKind, LinkedSectionFile, MediaItem, Page, PageDesign, PageDesigns, Post, SavedLayout, Site } from "@crust/blocks";

export type ApiResult<T = Record<string, never>> =
  | ({ ok: true } & T)
  | { ok: false; error: string; notConfigured?: boolean };

const NOT_AVAILABLE = "Saving isn't available here yet.";

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
  /** F046: sample content still to replace (missing from older servers). */
  placeholders?: number;
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
/**
 * liveUrl: where the last successful publish put the site (F017); null before the first.
 * notConnected: the site's own domain when that publish found it not connected yet (F044).
 */
export const publishRuns = () => call<{ runs: PublishRun[]; liveUrl?: string | null; notConnected?: string | null }>("/api/publish");

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
  /** Linked sections saved since the last publish (F043). */
  sections?: { id: string; name: string; change: "new" | "edited" | "removed" }[];
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

/** My layouts (F027): sections and pages saved to reuse, in content/layouts/. */
export const listLayouts = () => call<{ layouts: SavedLayout[] }>("/api/layouts");
export const saveLayout = (layout: Pick<SavedLayout, "name" | "kind" | "content">) =>
  call<{ layout: SavedLayout }>("/api/layouts", post({ action: "save", layout }));
export const renameLayout = (id: string, name: string) => call<{ layout: SavedLayout }>("/api/layouts", post({ action: "rename", id, name }));
export const deleteLayout = (id: string) => call("/api/layouts", post({ action: "delete", id }));

/** Media library (F034): photos in content/media/, details in content/media.json. */
export interface MediaUse {
  path: string;
  title: string;
}
export const listMedia = () => call<{ items: MediaItem[]; usage: Record<string, MediaUse[]> }>("/api/media");
export const uploadMedia = (photo: { name: string; data: string; alt: string }) => call<{ item: MediaItem }>("/api/media", post({ action: "upload", ...photo }));
export const setMediaAlt = (file: string, alt: string) => call<{ item: MediaItem }>("/api/media", post({ action: "alt", file, alt }));
/** F081: alt text and focal point together (null focus = the middle). */
export const setMediaDetails = (file: string, alt: string, focus: { x: number; y: number } | null) =>
  call<{ item: MediaItem }>("/api/media", post({ action: "details", file, alt, focus }));
export const deleteMedia = (file: string) => call<{ usedOn?: MediaUse[] }>("/api/media", post({ action: "delete", file }));

/** Post, blog and "Page not found" designs (F082): content/designs/. */
export const listDesigns = () => call<{ designs: PageDesigns }>("/api/designs");
export const saveDesign = (design: Pick<PageDesign, "kind" | "content" | "title">) => call<{ design: PageDesign }>("/api/designs", post({ action: "save", design }));
export const resetDesign = (kind: DesignKind) => call<{ commit: string | null }>("/api/designs", post({ action: "reset", kind }));

/** Blog posts (F035): content/posts/<slug>.json; list page title and intro in content/blog.json. */
export type PostSummary = Omit<Post, "puck">;
export const listPosts = () => call<{ posts: PostSummary[]; blog: BlogSettings }>("/api/posts");
export const getPost = (slug: string) => call<{ post: Post }>(`/api/posts?slug=${encodeURIComponent(slug)}`);
export const savePost = (p: Post) => call<{ post: Post }>("/api/posts", post({ action: "save", post: p }));
export const deletePost = (slug: string) => call("/api/posts", post({ action: "delete", slug }));
export const saveBlog = (blog: BlogSettings) => call<{ blog: BlogSettings }>("/api/posts", post({ action: "blog", blog }));

// --- Linked sections (F043): content/sections/ ---------------------------------
export interface SectionUse {
  path: string;
  title: string;
}
export const listSections = () => call<{ sections: LinkedSectionFile[]; usage: Record<string, SectionUse[]> }>("/api/sections");
export const createSection = (name: string, content: LinkedSectionFile["content"]) => call<{ section: LinkedSectionFile }>("/api/sections", post({ action: "create", name, content }));
export const updateSection = (id: string, content: LinkedSectionFile["content"]) =>
  call<{ section: LinkedSectionFile; usedOn: SectionUse[] }>("/api/sections", post({ action: "update", id, content }));
export const renameSection = (id: string, name: string) => call<{ section: LinkedSectionFile }>("/api/sections", post({ action: "rename", id, name }));
export const deleteSection = (id: string) => call<{ usedOn?: SectionUse[] }>("/api/sections", post({ action: "delete", id }));

// --- Start from a template (F048) ------------------------------------------------
export interface AppliedTemplate {
  commit: string;
  name: string;
  date: string;
}
export const lastTemplate = () => call<{ last: AppliedTemplate | null }>("/api/template");
export const sendTemplatePhotos = (name: string, photos: { file: string; alt: string; data: string; focus?: { x: number; y: number } }[]) =>
  call<{ files: string[] }>("/api/template", post({ action: "photos", name, photos }));
export const applyTemplateContent = (template: unknown) => call<{ commit: string; site: Site }>("/api/template", post({ action: "apply", template }));
export const undoTemplate = (commit: string) => call<{ commit: string; site: Site | null }>("/api/template", post({ action: "undo", commit }));

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
export const publishRuns = () => call<{ runs: PublishRun[] }>("/api/publish");

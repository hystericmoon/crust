/** Minimal GitHub contents API client for saving content files. */

export interface GitHubConfig {
  token: string;
  /** "owner/repo" */
  repo: string;
  branch: string;
}

export class GitHubError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

const api = "https://api.github.com";

const headers = (token: string) => ({
  Authorization: `Bearer ${token}`,
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  "User-Agent": "crust-admin",
});

/** UTF-8 safe base64 (btoa alone only handles Latin-1). */
export function toBase64(text: string): string {
  let bin = "";
  for (const b of new TextEncoder().encode(text)) bin += String.fromCharCode(b);
  return btoa(bin);
}

export function fromBase64(b64: string): string {
  const bin = atob(b64.replace(/\s/g, ""));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

const encodePath = (path: string) => path.split("/").map(encodeURIComponent).join("/");

function explain(status: number): string {
  if (status === 401) return "GitHub didn't accept the token. It may have expired; create a new one.";
  if (status === 403) return "The GitHub token isn't allowed to change this repository's contents.";
  if (status === 404) return "GitHub couldn't find the repository. Check the token's repository access.";
  if (status === 409) return "Someone else changed this file at the same moment. Reload and save again.";
  if (status === 422) return "GitHub rejected the change.";
  return `GitHub returned an error (${status}). Try again in a minute.`;
}

/** Current blob sha of a file, or null if it doesn't exist yet. */
export async function getFileSha(cfg: GitHubConfig, path: string, fetchFn: typeof fetch = fetch): Promise<string | null> {
  const res = await fetchFn(`${api}/repos/${cfg.repo}/contents/${encodePath(path)}?ref=${encodeURIComponent(cfg.branch)}`, {
    headers: headers(cfg.token),
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new GitHubError(explain(res.status), res.status);
  const body = (await res.json()) as { sha?: string };
  return body.sha ?? null;
}

/** Creates or updates one file in a single commit. Returns the commit sha. */
export async function putFile(
  cfg: GitHubConfig,
  path: string,
  content: string,
  message: string,
  fetchFn: typeof fetch = fetch,
): Promise<{ commit: string; url: string }> {
  const sha = await getFileSha(cfg, path, fetchFn);
  const res = await fetchFn(`${api}/repos/${cfg.repo}/contents/${encodePath(path)}`, {
    method: "PUT",
    headers: { ...headers(cfg.token), "Content-Type": "application/json" },
    body: JSON.stringify({ message, content: toBase64(content), branch: cfg.branch, ...(sha ? { sha } : {}) }),
  });
  if (!res.ok) throw new GitHubError(explain(res.status), res.status);
  const body = (await res.json()) as { commit: { sha: string; html_url: string } };
  return { commit: body.commit.sha, url: body.commit.html_url };
}

export interface RepoFile {
  name: string;
  path: string;
  sha: string;
}

/** Lists the files in a folder (one level). Empty if the folder doesn't exist. */
export async function listFolder(cfg: GitHubConfig, path: string, fetchFn: typeof fetch = fetch): Promise<RepoFile[]> {
  const res = await fetchFn(`${api}/repos/${cfg.repo}/contents/${encodePath(path)}?ref=${encodeURIComponent(cfg.branch)}`, {
    headers: headers(cfg.token),
  });
  if (res.status === 404) return [];
  if (!res.ok) throw new GitHubError(explain(res.status), res.status);
  const items = (await res.json()) as (RepoFile & { type: string })[];
  return items.filter((i) => i.type === "file").map(({ name, path: p, sha }) => ({ name, path: p, sha }));
}

/** Reads a text file; null if missing. */
export async function readFile(cfg: GitHubConfig, path: string, fetchFn: typeof fetch = fetch): Promise<string | null> {
  const res = await fetchFn(`${api}/repos/${cfg.repo}/contents/${encodePath(path)}?ref=${encodeURIComponent(cfg.branch)}`, {
    headers: headers(cfg.token),
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new GitHubError(explain(res.status), res.status);
  const body = (await res.json()) as { content: string };
  return fromBase64(body.content);
}

/** When a file last changed (latest commit touching it), as an ISO date. */
export async function lastCommitDate(cfg: GitHubConfig, path: string, fetchFn: typeof fetch = fetch): Promise<string | null> {
  const res = await fetchFn(
    `${api}/repos/${cfg.repo}/commits?path=${encodeURIComponent(path)}&sha=${encodeURIComponent(cfg.branch)}&per_page=1`,
    { headers: headers(cfg.token) },
  );
  if (!res.ok) return null;
  const commits = (await res.json()) as { commit: { committer: { date: string } } }[];
  return commits[0]?.commit.committer.date ?? null;
}

/** Starts a workflow_dispatch run (used by Publish, F008). */
export async function dispatchWorkflow(
  cfg: GitHubConfig,
  workflow: string,
  fetchFn: typeof fetch = fetch,
): Promise<void> {
  const res = await fetchFn(`${api}/repos/${cfg.repo}/actions/workflows/${encodeURIComponent(workflow)}/dispatches`, {
    method: "POST",
    headers: { ...headers(cfg.token), "Content-Type": "application/json" },
    body: JSON.stringify({ ref: cfg.branch }),
  });
  if (!res.ok) throw new GitHubError(explain(res.status), res.status);
}

export interface WorkflowRun {
  id: number;
  status: string;
  conclusion: string | null;
  createdAt: string;
  url: string;
}

/** Most recent runs of a workflow (used by Publish status, F008). */
export async function latestRuns(cfg: GitHubConfig, workflow: string, fetchFn: typeof fetch = fetch): Promise<WorkflowRun[]> {
  const res = await fetchFn(
    `${api}/repos/${cfg.repo}/actions/workflows/${encodeURIComponent(workflow)}/runs?branch=${encodeURIComponent(cfg.branch)}&per_page=5`,
    { headers: headers(cfg.token) },
  );
  if (!res.ok) throw new GitHubError(explain(res.status), res.status);
  const body = (await res.json()) as {
    workflow_runs: { id: number; status: string; conclusion: string | null; created_at: string; html_url: string }[];
  };
  return body.workflow_runs.map((r) => ({ id: r.id, status: r.status, conclusion: r.conclusion, createdAt: r.created_at, url: r.html_url }));
}

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

/** Reads a text file (on the branch, or at a commit given as `ref`); null if missing. */
export async function readFile(cfg: GitHubConfig, path: string, fetchFn: typeof fetch = fetch, ref = cfg.branch): Promise<string | null> {
  const res = await fetchFn(`${api}/repos/${cfg.repo}/contents/${encodePath(path)}?ref=${encodeURIComponent(ref)}`, {
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

/** One file in a multi-file commit: new text, or null to delete it. */
export interface FileChange {
  path: string;
  content: string | null;
}

/**
 * Commits several file changes at once (F015: a rename moves the page file
 * and updates redirects.json in one step, so history never shows half of it).
 * Uses the Git data API: new tree on top of the branch head, then a commit,
 * then a fast-forward of the branch.
 */
export async function commitFiles(
  cfg: GitHubConfig,
  changes: FileChange[],
  message: string,
  fetchFn: typeof fetch = fetch,
): Promise<{ commit: string; url: string }> {
  const repo = `${api}/repos/${cfg.repo}/git`;
  const send = async <T>(url: string, method: string, body?: unknown): Promise<T> => {
    const res = await fetchFn(url, {
      method,
      headers: { ...headers(cfg.token), ...(body ? { "Content-Type": "application/json" } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    // A branch update that isn't a fast-forward means someone saved in between.
    if (res.status === 422 && method === "PATCH") throw new GitHubError(explain(409), 409);
    if (!res.ok) throw new GitHubError(explain(res.status), res.status);
    return (await res.json()) as T;
  };

  const ref = await send<{ object: { sha: string } }>(`${repo}/ref/heads/${encodePath(cfg.branch)}`, "GET");
  const head = await send<{ tree: { sha: string } }>(`${repo}/commits/${ref.object.sha}`, "GET");
  const tree = await send<{ sha: string }>(`${repo}/trees`, "POST", {
    base_tree: head.tree.sha,
    tree: changes.map((c) =>
      c.content === null
        ? { path: c.path, mode: "100644", type: "blob", sha: null }
        : { path: c.path, mode: "100644", type: "blob", content: c.content },
    ),
  });
  const commit = await send<{ sha: string; html_url: string }>(`${repo}/commits`, "POST", {
    message,
    tree: tree.sha,
    parents: [ref.object.sha],
  });
  await send(`${repo}/refs/heads/${encodePath(cfg.branch)}`, "PATCH", { sha: commit.sha, force: false });
  return { commit: commit.sha, url: commit.html_url };
}

export interface PublishedRun {
  id: number;
  /** The commit that went live. */
  sha: string;
  createdAt: string;
  url: string;
}

/** The latest successful run of a workflow, or null if it never succeeded (F016). */
export async function lastSuccessfulRun(cfg: GitHubConfig, workflow: string, fetchFn: typeof fetch = fetch): Promise<PublishedRun | null> {
  const res = await fetchFn(
    `${api}/repos/${cfg.repo}/actions/workflows/${encodeURIComponent(workflow)}/runs?branch=${encodeURIComponent(cfg.branch)}&status=success&per_page=1`,
    { headers: headers(cfg.token) },
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new GitHubError(explain(res.status), res.status);
  const body = (await res.json()) as { workflow_runs: { id: number; head_sha: string; created_at: string; html_url: string }[] };
  const run = body.workflow_runs[0];
  return run ? { id: run.id, sha: run.head_sha, createdAt: run.created_at, url: run.html_url } : null;
}

export interface ChangedFile {
  path: string;
  status: "added" | "modified" | "removed";
}

/** Files that differ between a commit and the branch head (F016). Renames count as removed + added. */
export async function changedFiles(cfg: GitHubConfig, since: string, fetchFn: typeof fetch = fetch): Promise<ChangedFile[]> {
  const res = await fetchFn(
    `${api}/repos/${cfg.repo}/compare/${encodeURIComponent(since)}...${encodeURIComponent(cfg.branch)}`,
    { headers: headers(cfg.token) },
  );
  if (!res.ok) throw new GitHubError(explain(res.status), res.status);
  const body = (await res.json()) as { files?: { filename: string; status: string; previous_filename?: string }[] };
  const out: ChangedFile[] = [];
  for (const f of body.files ?? []) {
    if (f.status === "removed") out.push({ path: f.filename, status: "removed" });
    else if (f.status === "added" || f.status === "copied") out.push({ path: f.filename, status: "added" });
    else if (f.status === "renamed") {
      if (f.previous_filename) out.push({ path: f.previous_filename, status: "removed" });
      out.push({ path: f.filename, status: "added" });
    } else out.push({ path: f.filename, status: "modified" });
  }
  return out;
}

/** The publish workflow's last step is named "Live at <address>" (F017). */
const LIVE_STEP = /^Live at (https:\/\/[a-z0-9.-]+(?::\d+)?(?:\/\S*)?)$/i;

/** The address a run published the site at, read from its step names; null if none. */
export async function liveAddress(cfg: GitHubConfig, runId: number, fetchFn: typeof fetch = fetch): Promise<string | null> {
  const res = await fetchFn(`${api}/repos/${cfg.repo}/actions/runs/${runId}/jobs?per_page=10`, { headers: headers(cfg.token) });
  if (!res.ok) return null;
  const body = (await res.json()) as { jobs?: { steps?: { name: string; conclusion: string | null }[] }[] };
  for (const job of body.jobs ?? []) {
    for (const step of job.steps ?? []) {
      const m = LIVE_STEP.exec(step.name);
      if (m && step.conclusion === "success") return m[1]!;
    }
  }
  return null;
}

export interface CommitSummary {
  sha: string;
  parent: string | null;
  message: string;
  date: string;
}

/** Recent commits on the branch that touched a folder, newest first (F019). */
export async function recentCommits(cfg: GitHubConfig, path: string, fetchFn: typeof fetch = fetch, perPage = 50): Promise<CommitSummary[]> {
  const res = await fetchFn(
    `${api}/repos/${cfg.repo}/commits?path=${encodeURIComponent(path)}&sha=${encodeURIComponent(cfg.branch)}&per_page=${perPage}`,
    { headers: headers(cfg.token) },
  );
  if (!res.ok) throw new GitHubError(explain(res.status), res.status);
  const commits = (await res.json()) as { sha: string; parents?: { sha: string }[]; commit: { message: string; committer: { date: string } } }[];
  return commits.map((c) => ({ sha: c.sha, parent: c.parents?.[0]?.sha ?? null, message: c.commit.message, date: c.commit.committer.date }));
}

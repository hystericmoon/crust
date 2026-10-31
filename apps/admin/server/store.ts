/**
 * F054: where a site's content lives. The admin's server code reads and
 * writes content through the operations in ./github. Each takes a `Repo`:
 * either the GitHub settings (the web admin, as before) or a ContentStore,
 * which keeps the same files and history somewhere else (LocalStore: a
 * folder on the computer, for the desktop app, F055).
 *
 * A store behaves like the GitHub repository the server code was written
 * for: paths look like "content/pages/about.json", every change is a
 * commit with a message, and history can be read back (F019 restore, F048
 * "Bring back my previous site").
 */
import type { GitHubConfig } from "./github";

export interface RepoFile {
  name: string;
  path: string;
  sha: string;
}

/**
 * One file in a multi-file commit: new text, or null to delete it. `base64`
 * is for binary files (F034 photos); `sha` puts back a file's earlier
 * version that the store already has (F048 undo).
 */
export interface FileChange {
  path: string;
  content: string | null;
  base64?: string;
  sha?: string;
}

export interface CommitSummary {
  sha: string;
  parent: string | null;
  message: string;
  date: string;
}

export interface ChangedFile {
  path: string;
  status: "added" | "modified" | "removed";
}

export interface CommitResult {
  commit: string;
  /** Where the commit can be seen; "" when there's nowhere to look (a local folder). */
  url: string;
}

export interface ContentStore {
  readonly kind: "local";
  /** A text file, now or at a commit given as `ref`; null if missing. */
  readFile(path: string, ref?: string): Promise<string | null>;
  readRaw(path: string): Promise<ArrayBuffer | null>;
  /** Files in a folder (one level); empty if the folder doesn't exist. */
  listFolder(path: string): Promise<RepoFile[]>;
  commitFiles(changes: FileChange[], message: string): Promise<CommitResult>;
  /** When a file last changed, as an ISO date. */
  lastCommitDate(path: string): Promise<string | null>;
  /** Recent commits that touched a folder, newest first. */
  recentCommits(path: string, perPage?: number): Promise<CommitSummary[]>;
  /** The files one commit changed, and its parent. */
  commitChanges(sha: string): Promise<{ parent: string | null; files: { path: string; status: string }[] }>;
  /** Every file under `folder` at a commit: path → blob sha. */
  filesAt(commit: string, folder: string): Promise<Map<string, string>>;
  /** Files that differ between a commit and now. */
  changedFiles(since: string): Promise<ChangedFile[]>;
  /** The commit that was last published, and when; null if never (F016, F056). */
  lastPublished(): Promise<{ sha: string; at: string } | null>;
}

/** Where content lives: the GitHub repository, or another store. */
export type Repo = GitHubConfig | ContentStore;

export const isStore = (repo: Repo): repo is ContentStore => "kind" in repo && repo.kind === "local";

/**
 * F054: a site kept in a folder on the computer (the desktop app, F055),
 * with its own history so every save is kept, as on GitHub.
 *
 * The site's files sit in the folder as they would in the repository
 * (content/site.json, content/pages/…). The history lives next to them in
 * a hidden `.crust/` folder:
 *   .crust/objects/<sha>      every version of every file, by content
 *   .crust/commits/<sha>.json { parent, message, date, tree: { path: sha } }
 *   .crust/HEAD               the newest commit
 *   .crust/published          the commit last published, and when (F056)
 * File versions are named like Git blobs (SHA-1 of "blob <size>\0" + bytes),
 * so a version written twice is stored once.
 *
 * All file access goes through a Folder, so the same code runs on the
 * desktop (Tauri file commands), in tests (memory, or a temporary folder).
 */
import type { ChangedFile, CommitResult, CommitSummary, ContentStore, FileChange, RepoFile } from "./store";

export interface Folder {
  /** A file's bytes; null if it doesn't exist. */
  read(path: string): Promise<Uint8Array | null>;
  /** Writes a file, creating its folders. */
  write(path: string, bytes: Uint8Array): Promise<void>;
  remove(path: string): Promise<void>;
  /** Names of the files (not folders) directly inside a folder; empty if missing. */
  list(dir: string): Promise<string[]>;
}

/** A folder held in memory: tests, and trying the app without saving. */
export function memoryFolder(initial: Record<string, string | Uint8Array> = {}): Folder & { files: Map<string, Uint8Array> } {
  const files = new Map<string, Uint8Array>();
  for (const [path, value] of Object.entries(initial)) files.set(path, typeof value === "string" ? utf8(value) : value);
  return {
    files,
    read: async (path) => files.get(path) ?? null,
    write: async (path, bytes) => void files.set(path, bytes),
    remove: async (path) => void files.delete(path),
    list: async (dir) =>
      [...files.keys()].filter((p) => p.startsWith(`${dir}/`) && !p.slice(dir.length + 1).includes("/")).map((p) => p.slice(dir.length + 1)),
  };
}

interface Commit {
  parent: string | null;
  message: string;
  date: string;
  tree: Record<string, string>;
}

const HISTORY = ".crust";
const utf8 = (text: string) => new TextEncoder().encode(text);
const text = (bytes: Uint8Array) => new TextDecoder().decode(bytes);

async function sha1(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-1", bytes as BufferSource);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** The name Git would give these bytes as a blob. */
export async function blobSha(bytes: Uint8Array): Promise<string> {
  const head = utf8(`blob ${bytes.length}\0`);
  const all = new Uint8Array(head.length + bytes.length);
  all.set(head);
  all.set(bytes, head.length);
  return sha1(all);
}

function fromBase64(b64: string): Uint8Array {
  const bin = atob(b64.replace(/\s/g, ""));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

const toArrayBuffer = (bytes: Uint8Array): ArrayBuffer => bytes.slice().buffer as ArrayBuffer;

const inFolder = (path: string, folder: string) => folder === "" || path === folder || path.startsWith(`${folder}/`);

/** Commits older than this many aren't searched for "when did this file change". */
const HISTORY_DEPTH = 500;

export class StoreError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export class LocalStore implements ContentStore {
  readonly kind = "local";
  /** One change at a time: each commit builds on the one before. */
  private queue: Promise<unknown> = Promise.resolve();
  private commits = new Map<string, Commit>();

  constructor(
    readonly folder: Folder,
    /** Paths the history tracks; anything else in the folder is left alone. */
    private readonly tracked = (path: string) => path.startsWith("content/"),
    private readonly now = () => new Date(),
  ) {}

  /**
   * Starts the history of a folder that already has files (a site copied in,
   * or made before the app kept history): one first commit with everything.
   * Does nothing when there's history already.
   */
  async init(message = "Start the site's history"): Promise<string | null> {
    if (await this.head()) return null;
    const tree: Record<string, string> = {};
    const walk = async (dir: string, names: (dir: string) => Promise<string[]>): Promise<void> => {
      for (const name of await names(dir)) {
        const path = dir ? `${dir}/${name}` : name;
        if (!this.tracked(path)) continue;
        const bytes = await this.folder.read(path);
        if (bytes) tree[path] = await this.store(bytes);
      }
    };
    // A Folder only lists files, so the known content folders are walked by name.
    for (const dir of ["content", "content/pages", "content/posts", "content/sections", "content/layouts", "content/media"]) {
      await walk(dir, (d) => this.folder.list(d));
    }
    return this.writeCommit({ parent: null, message, date: this.now().toISOString(), tree });
  }

  async readFile(path: string, ref?: string): Promise<string | null> {
    const bytes = await this.bytes(path, ref);
    return bytes ? text(bytes) : null;
  }

  async readRaw(path: string): Promise<ArrayBuffer | null> {
    const bytes = await this.bytes(path);
    return bytes ? toArrayBuffer(bytes) : null;
  }

  async listFolder(path: string): Promise<RepoFile[]> {
    const tree = await this.tree();
    return Object.entries(tree)
      .filter(([p]) => p.startsWith(`${path}/`) && !p.slice(path.length + 1).includes("/"))
      .map(([p, sha]) => ({ name: p.slice(path.length + 1), path: p, sha }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  commitFiles(changes: FileChange[], message: string): Promise<CommitResult> {
    const run = this.queue.then(() => this.commitNow(changes, message));
    this.queue = run.catch(() => undefined);
    return run;
  }

  private async commitNow(changes: FileChange[], message: string): Promise<CommitResult> {
    const parent = await this.head();
    const tree = { ...(parent ? (await this.commit(parent)).tree : {}) };
    for (const c of changes) {
      if (!this.tracked(c.path) || c.path.split("/").some((part) => part === "" || part === "." || part === "..")) {
        throw new StoreError(`Can't save ${c.path} here.`, 422);
      }
      if (c.sha !== undefined) {
        const bytes = await this.folder.read(`${HISTORY}/objects/${c.sha}`);
        if (!bytes) throw new StoreError("That earlier version isn't in this site's history.", 404);
        await this.folder.write(c.path, bytes);
        tree[c.path] = c.sha;
      } else if (c.base64 !== undefined || c.content !== null) {
        const bytes = c.base64 !== undefined ? fromBase64(c.base64) : utf8(c.content!);
        tree[c.path] = await this.store(bytes);
        await this.folder.write(c.path, bytes);
      } else {
        delete tree[c.path];
        await this.folder.remove(c.path);
      }
    }
    const sha = await this.writeCommit({ parent, message, date: this.now().toISOString(), tree });
    return { commit: sha, url: "" };
  }

  async lastCommitDate(path: string): Promise<string | null> {
    for await (const { commit, parentTree } of this.walk()) {
      if (commit.tree[path] !== parentTree[path]) return commit.tree[path] === undefined ? null : commit.date;
    }
    return null;
  }

  async recentCommits(path: string, perPage = 50): Promise<CommitSummary[]> {
    const out: CommitSummary[] = [];
    for await (const { sha, commit, parentTree } of this.walk()) {
      if (diff(parentTree, commit.tree).some((f) => inFolder(f.path, path))) {
        out.push({ sha, parent: commit.parent, message: commit.message, date: commit.date });
        if (out.length === perPage) break;
      }
    }
    return out;
  }

  async commitChanges(sha: string): Promise<{ parent: string | null; files: { path: string; status: string }[] }> {
    const commit = await this.commit(sha);
    const before = commit.parent ? (await this.commit(commit.parent)).tree : {};
    return { parent: commit.parent, files: diff(before, commit.tree) };
  }

  async filesAt(commit: string, folder: string): Promise<Map<string, string>> {
    const { tree } = await this.commit(commit);
    return new Map(Object.entries(tree).filter(([p]) => p.startsWith(`${folder}/`)));
  }

  async changedFiles(since: string): Promise<ChangedFile[]> {
    return diff((await this.commit(since)).tree, await this.tree());
  }

  async lastPublished(): Promise<{ sha: string; at: string } | null> {
    const bytes = await this.folder.read(`${HISTORY}/published`);
    if (!bytes) return null;
    try {
      const { sha, at } = JSON.parse(text(bytes)) as { sha?: unknown; at?: unknown };
      return typeof sha === "string" && typeof at === "string" ? { sha, at } : null;
    } catch {
      return null;
    }
  }

  /** Remembers that the newest commit went live (called by publishing, F056). */
  async markPublished(): Promise<void> {
    const sha = await this.head();
    if (sha) await this.folder.write(`${HISTORY}/published`, utf8(JSON.stringify({ sha, at: this.now().toISOString() })));
  }

  /** The newest commit, or null before the first one. */
  async head(): Promise<string | null> {
    const bytes = await this.folder.read(`${HISTORY}/HEAD`);
    return bytes ? text(bytes).trim() || null : null;
  }

  // --- internals ---------------------------------------------------------------------------

  private async bytes(path: string, ref?: string): Promise<Uint8Array | null> {
    if (ref === undefined) return this.tracked(path) ? this.folder.read(path) : null;
    const sha = (await this.commit(ref)).tree[path];
    return sha ? this.folder.read(`${HISTORY}/objects/${sha}`) : null;
  }

  private async tree(): Promise<Record<string, string>> {
    const head = await this.head();
    return head ? (await this.commit(head)).tree : {};
  }

  private async store(bytes: Uint8Array): Promise<string> {
    const sha = await blobSha(bytes);
    const path = `${HISTORY}/objects/${sha}`;
    if (!(await this.folder.read(path))) await this.folder.write(path, bytes);
    return sha;
  }

  private async commit(sha: string): Promise<Commit> {
    const cached = this.commits.get(sha);
    if (cached) return cached;
    if (!/^[0-9a-f]{40}$/.test(sha)) throw new StoreError("That isn't a version of this site.", 404);
    const bytes = await this.folder.read(`${HISTORY}/commits/${sha}.json`);
    if (!bytes) throw new StoreError("That version isn't in this site's history.", 404);
    const commit = JSON.parse(text(bytes)) as Commit;
    this.commits.set(sha, commit);
    return commit;
  }

  private async writeCommit(commit: Commit): Promise<string> {
    const bytes = utf8(JSON.stringify(commit));
    const sha = await sha1(bytes);
    await this.folder.write(`${HISTORY}/commits/${sha}.json`, bytes);
    await this.folder.write(`${HISTORY}/HEAD`, utf8(`${sha}\n`));
    this.commits.set(sha, commit);
    return sha;
  }

  /** Commits from the newest back, each with its parent's files. */
  private async *walk(): AsyncGenerator<{ sha: string; commit: Commit; parentTree: Record<string, string> }> {
    let sha = await this.head();
    for (let n = 0; sha && n < HISTORY_DEPTH; n++) {
      const commit = await this.commit(sha);
      const parentTree = commit.parent ? (await this.commit(commit.parent)).tree : {};
      yield { sha, commit, parentTree };
      sha = commit.parent;
    }
  }
}

/** What changed between two sets of files. */
function diff(before: Record<string, string>, after: Record<string, string>): ChangedFile[] {
  const out: ChangedFile[] = [];
  for (const [path, sha] of Object.entries(after)) {
    if (!(path in before)) out.push({ path, status: "added" });
    else if (before[path] !== sha) out.push({ path, status: "modified" });
  }
  for (const path of Object.keys(before)) if (!(path in after)) out.push({ path, status: "removed" });
  return out.sort((a, b) => a.path.localeCompare(b.path));
}

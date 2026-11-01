/**
 * F054: a Folder on disk, for tests and command-line tools that run in
 * Node. The desktop app (F055) gives the LocalStore its own Folder that
 * goes through Tauri's file commands instead.
 */
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";
import type { Folder } from "./local-store";

export function nodeFolder(root: string): Folder {
  const base = resolve(root);
  const at = (path: string) => {
    const full = resolve(base, path);
    if (full !== base && !full.startsWith(base + sep)) throw new Error(`${path} is outside the site folder.`);
    return full;
  };
  const missing = (e: unknown) => (e as NodeJS.ErrnoException).code === "ENOENT";
  return {
    async read(path) {
      try {
        return new Uint8Array(await readFile(at(path)));
      } catch (e) {
        if (missing(e)) return null;
        throw e;
      }
    },
    async write(path, bytes) {
      const full = at(path);
      await mkdir(dirname(full), { recursive: true });
      await writeFile(full, bytes);
    },
    async remove(path) {
      await rm(at(path), { force: true });
    },
    async list(dir) {
      try {
        return (await readdir(at(dir), { withFileTypes: true })).filter((e) => e.isFile()).map((e) => e.name);
      } catch (e) {
        if (missing(e)) return [];
        throw e;
      }
    },
  };
}


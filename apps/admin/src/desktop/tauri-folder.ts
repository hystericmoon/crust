/**
 * F055: the site folder, through the desktop app's file commands
 * (crates/crust-desktop/src/lib.rs). The app's Rust side decides which
 * folder that is and refuses anything outside it.
 */
import type { Folder } from "../../server/local-store";

/** Tauri's invoke: a command name, its arguments, and request headers. */
export type Invoke = (cmd: string, args?: Record<string, unknown> | Uint8Array, options?: { headers: Record<string, string> }) => Promise<unknown>;

/** What the app answers when a file isn't there (crust_desktop::NOT_FOUND). */
export const NOT_FOUND = "crust:not-found";
/** The header naming the file being written (crust_desktop::PATH_HEADER). */
export const PATH_HEADER = "x-crust-path";

const asError = (e: unknown) => (e instanceof Error ? e : new Error(String(e)));

export function tauriFolder(invoke: Invoke): Folder {
  return {
    async read(path) {
      try {
        const bytes = await invoke("site_read", { path });
        return bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes as ArrayBuffer | number[]);
      } catch (e) {
        if (e === NOT_FOUND) return null;
        throw asError(e);
      }
    },
    async write(path, bytes) {
      try {
        await invoke("site_write", bytes, { headers: { [PATH_HEADER]: encodeURIComponent(path) } });
      } catch (e) {
        throw asError(e);
      }
    },
    async remove(path) {
      try {
        await invoke("site_remove", { path });
      } catch (e) {
        throw asError(e);
      }
    },
    async list(dir) {
      try {
        return (await invoke("site_list", { dir })) as string[];
      } catch (e) {
        throw asError(e);
      }
    },
  };
}

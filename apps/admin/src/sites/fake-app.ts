/**
 * F057: the desktop app's commands over sites in memory, following
 * crates/crust-desktop/src/sites.rs' rules. For tests (sites, first run).
 */
import { memoryFolder } from "../../server/local-store";
import { NOT_FOUND, PATH_HEADER, SITE_HEADER, type Invoke } from "../desktop/tauri-folder";

const decode = (bytes: Uint8Array | null | undefined) => (bytes ? new TextDecoder().decode(bytes) : null);

/** The app's commands over sites in memory, following crust_desktop::sites' rules. */
export function fakeApp() {
  type Folder = ReturnType<typeof memoryFolder>;
  const sites = new Map<string, Folder>([["My site", memoryFolder()]]);
  const trash = new Map<string, { folder: Folder; name: string; deletedAt: number }>();
  let open = "My site";
  let now = 1_000;
  const free = (taken: Iterable<string>, name: string) => {
    const lower = new Set([...taken].map((t) => t.toLowerCase()));
    let id = name;
    for (let n = 2; lower.has(id.toLowerCase()); n++) id = `${name} ${n}`;
    return id;
  };
  const nameOf = (folder: Folder, id: string) => {
    try {
      return (JSON.parse(decode(folder.files.get("content/site.json")) ?? "{}") as { name?: string }).name ?? id;
    } catch {
      return id;
    }
  };
  const pick = (site?: string) => {
    const folder = sites.get(site || open);
    if (!folder) throw "That site isn't in the Crust folder any more.";
    return folder;
  };
  const invoke: Invoke = async (cmd, args, options) => {
    const a = (args ?? {}) as Record<string, string>;
    switch (cmd) {
      case "site_info":
        return { folder: `/Users/hosni/Documents/Crust/${open}`, id: open };
      case "site_read": {
        const bytes = await pick(a.site).read(a.path!);
        if (!bytes) throw NOT_FOUND;
        return bytes.slice().buffer;
      }
      case "site_write": {
        const site = options!.headers[SITE_HEADER];
        return pick(site && decodeURIComponent(site)).write(decodeURIComponent(options!.headers[PATH_HEADER]!), args as Uint8Array);
      }
      case "site_remove":
        return pick(a.site).remove(a.path!);
      case "site_list":
        return pick(a.site).list(a.dir!);
      case "sites_list":
        return [...sites].map(([id, folder]) => ({
          id,
          name: nameOf(folder, id),
          pages: [...folder.files.keys()].filter((p) => p.startsWith("content/pages/")).length,
          edited: folder.files.has(".crust/HEAD") ? now : null,
          open: id === open,
        }));
      case "sites_deleted":
        return [...trash].map(([id, d]) => ({ id, name: d.name, deletedAt: d.deletedAt, removedAt: d.deletedAt + 30 * 864e5 }));
      case "sites_create": {
        const id = free(sites.keys(), a.name!);
        sites.set(id, memoryFolder());
        return id;
      }
      case "sites_rename": {
        const folder = pick(a.id);
        const id = free([...sites.keys()].filter((k) => k !== a.id), a.name!);
        sites.delete(a.id!);
        sites.set(id, folder);
        if (open === a.id) open = id;
        return id;
      }
      case "sites_duplicate": {
        const from = pick(a.id);
        const id = free(sites.keys(), a.name!);
        const copy = memoryFolder();
        for (const [path, bytes] of from.files) if (path !== ".crust/published") copy.files.set(path, bytes);
        sites.set(id, copy);
        return id;
      }
      case "sites_delete": {
        const folder = pick(a.id);
        const id = free(trash.keys(), a.id!);
        trash.set(id, { folder, name: nameOf(folder, a.id!), deletedAt: now++ });
        sites.delete(a.id!);
        if (open === a.id) {
          open = sites.keys().next().value ?? "My site";
          if (!sites.has(open)) sites.set(open, memoryFolder());
        }
        return open;
      }
      case "sites_restore": {
        const d = trash.get(a.id!);
        if (!d) throw "That site isn't in Recently deleted any more.";
        trash.delete(a.id!);
        const id = free(sites.keys(), d.name);
        sites.set(id, d.folder);
        return id;
      }
      case "sites_open":
        pick(a.id);
        open = a.id!;
        return null;
      default:
        throw `unknown command ${cmd}`;
    }
  };
  return { sites, trash, invoke, open: () => open };
}

// F058: stands in for the desktop app in a plain browser, so the app-only
// screens (Publish card, connect dialog) can be checked and photographed
// from apps/admin/dist. Files live in memory; host commands answer as a
// connected or unconnected site. Set window.__FAKE_TAURI__ before this
// runs: { host: "none" | "connected" }.
(() => {
  const opts = window.__FAKE_TAURI__ || {};
  const files = new Map();
  const callbacks = new Map();
  let nextId = 1;
  const decode = (s) => decodeURIComponent(s);
  const connection =
    opts.host === "connected"
      ? { host: "cloudflare", accountName: "Hosni", project: "harbour-studio", url: "https://harbour-studio.pages.dev", lastPublished: Date.now() - 3 * 60 * 60 * 1000, hasToken: true }
      : null;
  const commands = {
    site_info: () => ({ folder: "/Users/hosni/Documents/Crust/Harbour Studio", id: "Harbour Studio" }),
    site_read: ({ path }) => {
      if (!files.has(path)) throw "crust:not-found";
      return files.get(path);
    },
    site_write: (bytes, options) => {
      files.set(decode(options.headers["x-crust-path"]), bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes));
      return null;
    },
    site_remove: ({ path }) => {
      files.delete(path);
      return null;
    },
    site_list: ({ dir }) => {
      const prefix = dir ? `${dir}/` : "";
      return [...files.keys()].filter((p) => p.startsWith(prefix) && !p.slice(prefix.length).includes("/")).map((p) => p.slice(prefix.length)).sort();
    },
    sites_list: () => [{ id: "Harbour Studio", name: "Harbour Studio", pages: 1, edited: Date.now(), open: true }],
    sites_deleted: () => [],
    host_status: () => ({ connection, suggestedName: "harbour-studio" }),
    host_check_token: () => [{ id: "acc1", name: "Hosni" }],
    host_open_token_page: () => null,
    "plugin:event|listen": () => nextId++,
    "plugin:event|unlisten": () => null,
  };
  window.__TAURI_INTERNALS__ = {
    invoke: async (cmd, args, options) => {
      const run = commands[cmd];
      if (!run) throw `fake app: no command ${cmd}`;
      return run(args, options);
    },
    transformCallback: (cb) => {
      const id = nextId++;
      callbacks.set(id, cb);
      return id;
    },
    unregisterCallback: (id) => callbacks.delete(id),
    convertFileSrc: (p) => p,
    metadata: { currentWindow: { label: "main" }, currentWebview: { windowLabel: "main", label: "main" } },
  };
})();

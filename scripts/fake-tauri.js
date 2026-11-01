// F058: stands in for the desktop app in a plain browser, so the app-only
// screens (Publish card, connect dialog) can be checked and photographed
// from apps/admin/dist. Files live in memory; host commands answer as a
// connected or unconnected site. Set window.__FAKE_TAURI__ before this
// runs: { host: "none" | "connected" | "ftp" | "ftp-plain" } (F059: an FTP host),
// firstRun: true for a brand new Crust (F060: the welcome screen).
(() => {
  const opts = window.__FAKE_TAURI__ || {};
  const files = new Map();
  let siteId = opts.firstRun ? "My site" : "Harbour Studio";
  const callbacks = new Map();
  let nextId = 1;
  const decode = (s) => decodeURIComponent(s);
  const hoursAgo = (h) => Date.now() - h * 60 * 60 * 1000;
  const ftp = (protocol) => ({
    host: "ftp",
    accountName: "rina@ftp.harbour-studio.com",
    project: "ftp.harbour-studio.com",
    url: "https://harbour-studio.com",
    lastPublished: hoursAgo(3),
    hasToken: true,
    ftp: { protocol, server: "ftp.harbour-studio.com", port: protocol === "sftp" ? 22 : 21, username: "rina", folder: "public_html", hostKey: protocol === "sftp" ? "SHA256:q3Jm7h0qJ1R5c2vZb0a8kX4yW9nL6tP1sE2dF3gH4iA" : "" },
  });
  const connection =
    opts.host === "connected"
      ? { host: "cloudflare", accountName: "Hosni", project: "harbour-studio", url: "https://harbour-studio.pages.dev", lastPublished: hoursAgo(3), hasToken: true }
      : opts.host === "ftp"
        ? ftp("sftp")
        : opts.host === "ftp-plain"
          ? ftp("ftp")
          : null;
  const commands = {
    site_info: () => ({ folder: `/Users/hosni/Documents/Crust/${siteId}`, id: siteId }),
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
    sites_list: () => [{ id: siteId, name: siteId, pages: opts.firstRun && !files.has("content/site.json") ? 0 : 1, edited: Date.now(), open: true }],
    sites_rename: ({ name }) => {
      siteId = name;
      return name;
    },
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

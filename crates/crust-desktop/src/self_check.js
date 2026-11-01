// F055: the app's self-check (CRUST_SELF_CHECK=1). Run in the real window
// after the builder loads; reports what works back to the app, which
// prints it and quits. Used by CI on Linux to prove the window, the file
// commands, the builder's server and the site's photos work together.
(async () => {
  const report = { checks: {}, errors: [] };
  const check = (name, ok, detail) => {
    report.checks[name] = ok ? "ok" : `failed${detail ? `: ${detail}` : ""}`;
  };
  const invoke = window.__TAURI_INTERNALS__.invoke;
  try {
    // The builder appears (it waits for the site folder first).
    const start = Date.now();
    while (!document.querySelector("#root > *") && Date.now() - start < 30000) await new Promise((r) => setTimeout(r, 200));
    // F060: a fresh site folder (as in CI) opens on the welcome screen. Start
    // blank under a new name; the window reloads into the builder and this
    // check runs again from the top.
    if (document.querySelector(".fr")) {
      const blank = document.querySelector('input[type="radio"][value="blank"]');
      const starters = document.querySelectorAll('.fr input[type="radio"]').length;
      if (!blank || starters < 4) throw new Error(`The welcome screen has ${starters} starts, expected the three starters and Blank.`);
      blank.click();
      const name = document.querySelector(".fr-input");
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(name, "Self check site");
      name.dispatchEvent(new Event("input", { bubbles: true }));
      sessionStorage.setItem("crust:self-check-first-run", "1");
      document.querySelector(".fr-make").click();
      return;
    }
    check("first run made the site", sessionStorage.getItem("crust:self-check-first-run") === "1" && (await invoke("site_info")).id === "Self check site", (await invoke("site_info")).id);
    check("builder shows", !!document.querySelector("#root > *"), document.body.innerText.slice(0, 200));
    check("window is named after the site", / · Crust$/.test(document.title), document.title);

    const status = await (await fetch("/api/status")).json();
    check("server answers in the window", status.ok && status.configured, JSON.stringify(status));

    const { pages } = await (await fetch("/api/pages")).json();
    check("site has a Home page", Array.isArray(pages) && pages.some((p) => p.path === "/"), JSON.stringify(pages));

    const about = {
      path: "/self-check",
      title: "Self check",
      description: "Made by the app's self-check.",
      puck: { root: { props: {} }, content: [{ type: "Heading", props: { id: "h", text: "Self check", level: "h1", align: "left" } }] },
    };
    const saved = await (
      await fetch("/api/save", { method: "POST", headers: { "Content-Type": "application/json", "X-Crust": "1" }, body: JSON.stringify({ kind: "page", page: about }) })
    ).json();
    check("saving a page works", saved.ok, JSON.stringify(saved));
    const onDisk = await invoke("site_read", { path: "content/pages/self-check.json" });
    check("the page is in the site folder", new TextDecoder().decode(onDisk).includes("Self check"));

    // A photo written through the app shows at /media/<file> in an <img>.
    const png = Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="), (c) => c.charCodeAt(0));
    await invoke("site_write", png, { headers: { "x-crust-path": encodeURIComponent("content/media/self-check.png") } });
    const loaded = await new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img.naturalWidth === 1);
      img.onerror = () => resolve(false);
      img.src = "/media/self-check.png";
    });
    check("photos show from the site folder", loaded);

    // F056: the site is built in the app (render, checks, search index) and served for a preview.
    const built = await invoke("site_build", {
      files: [
        { path: "index.html", content: '<!doctype html><html lang="en"><head><title>Self check</title><meta name="description" content="Self check."></head><body><main data-pagefind-body><h1>Self check</h1></main></body></html>' },
        { path: "404.html", content: '<!doctype html><html lang="en"><head><title>Not found</title><meta name="description" content="Not found."></head><body><main><h1>Not found</h1></main></body></html>' },
      ],
      baseUrl: "https://example.pages.dev",
      preview: false,
    });
    check("the site is built in the app", built.pages === 1 && built.searchable >= 1, JSON.stringify(built));
    const url = await invoke("site_preview", { open: false });
    check("the preview has a local address", /^http:\/\/127\.0\.0\.1:\d+\/$/.test(url), url);
    const exported = await invoke("site_export", { name: "Self check" });
    check("the site exports to a folder", exported.status === "done" && exported.folder.endsWith("Self check website"), JSON.stringify(exported));

    let refused = false;
    try {
      await invoke("site_read", { path: "../outside.txt" });
    } catch (e) {
      refused = String(e).includes("outside the site folder");
    }
    check("files outside the site folder are refused", refused);

    // F057: several sites. A second site is made, written to by name, renamed,
    // copied, deleted and restored, without the open site changing.
    const { id: openId } = await invoke("site_info");
    const other = await invoke("sites_create", { name: "Self check two" });
    await invoke("site_write", new TextEncoder().encode('{"name":"Self check two"}'), {
      headers: { "x-crust-path": encodeURIComponent("content/site.json"), "x-crust-site": encodeURIComponent(other) },
    });
    const listed = await invoke("sites_list");
    check("sites are listed", listed.some((s) => s.id === openId && s.open) && listed.some((s) => s.id === other && s.name === "Self check two" && !s.open), JSON.stringify(listed));
    const renamed = await invoke("sites_rename", { id: other, name: "Self check renamed" });
    const copy = await invoke("sites_duplicate", { id: renamed, name: "Self check copy" });
    const copied = new TextDecoder().decode(await invoke("site_read", { path: "content/site.json", site: copy }));
    check("sites rename and duplicate", renamed === "Self check renamed" && copied.includes("Self check two"), `${renamed} ${copied}`);
    const stillOpen = await invoke("sites_delete", { id: copy });
    const deleted = await invoke("sites_deleted");
    const restored = await invoke("sites_restore", { id: deleted.find((d) => d.name === "Self check two").id });
    check("sites delete and restore", stillOpen === openId && typeof restored === "string" && (await invoke("site_info")).id === openId, `${stillOpen} ${restored}`);

    // F061: updates. CI builds without the update key, so Crust says it
    // doesn't look (and never reaches out).
    const updateStatus = await invoke("update_status");
    const found = await invoke("update_check");
    check("updates answer", typeof updateStatus.current === "string" && updateStatus.current.length > 0 && updateStatus.enabled === false && found.state === "off", JSON.stringify({ updateStatus, found }));
  } catch (e) {
    report.errors.push(String(e && e.stack ? e.stack : e));
  }
  await invoke("self_check_report", { report: JSON.stringify(report) });
})();

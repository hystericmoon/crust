/**
 * F056: publish on your computer. The app renders the site from its site
 * folder with the same result as the GitHub publish pipeline's render step
 * (packages/render/src/cli.ts), then hands the files to the app's Rust
 * side to finish (tested in crates/crust-desktop/src/publish.rs).
 */
import { config, defaultTokens, readTemplate } from "@crust/blocks";
import { unpackTemplate } from "@crust/render/src/template-check";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { LocalStore, memoryFolder } from "../../server/local-store";
import { nodeFolder } from "../../server/node-folder";
import { desktopPublisher, localPublisher, renderLocalSite, setDesktopPublisher, type BuildReport } from "./local-publish";
import type { Invoke } from "./tauri-folder";

const root = join(__dirname, "../../../..");
const temp = mkdtempSync(join(tmpdir(), "crust-local-publish-"));
afterAll(() => rmSync(temp, { recursive: true, force: true }));

/** Every file under a folder, by its path inside it. */
function readTree(dir: string): Map<string, string> {
  const out = new Map<string, string>();
  const walk = (d: string) => {
    for (const name of readdirSync(d)) {
      const full = join(d, name);
      if (statSync(full).isDirectory()) walk(full);
      else out.set(relative(dir, full).split("\\").join("/"), readFileSync(full, "utf8"));
    }
  };
  walk(dir);
  return out;
}

/** A starter template, unpacked into a site folder's content/ as the app keeps it. */
function siteFolderFrom(template: string): string {
  const read = readTemplate(readFileSync(join(root, "templates", `${template}.crust`), "utf8"), config.components);
  if (!read.template) throw new Error(read.problems.join("\n"));
  const site = join(temp, template);
  for (const [path, content] of unpackTemplate(read.template)) {
    const full = join(site, "content", path);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, content);
  }
  return site;
}

describe("the app renders what the publish pipeline renders", () => {
  for (const template of ["harbour", "signal", "corner"]) {
    it(`${template}: same files, same pages`, async () => {
      const site = siteFolderFrom(template);
      // The pipeline's render step, as the publish workflow runs it (npm run render).
      const out = join(temp, `${template}-pipeline`);
      const run = spawnSync(process.execPath, ["--import", "tsx", join(root, "packages/render/src/cli.ts"), join(site, "content"), out], {
        cwd: root,
        encoding: "utf8",
        env: { ...process.env, BASE_URL: "", CONTACT_FORM_URL: "" },
      });
      expect(run.status, run.stderr).toBe(0);
      const pipeline = readTree(out);

      const store = new LocalStore(nodeFolder(site));
      // The app starts a history for a site copied in (openSite); saved content is what's in it.
      await store.init();
      const { files } = await renderLocalSite(store, readFileSync(join(root, "packages/blocks/src/styles.css"), "utf8"));
      const app = new Map(files.map((f) => [f.path, f.content]));

      expect([...app.keys()].sort()).toEqual([...pipeline.keys()].sort());
      for (const [path, html] of pipeline) expect(app.get(path), path).toBe(html);
      // The site really has the parts that matter: pages, the blog, search, 404.
      expect(app.has("index.html") && app.has("search/index.html") && app.has("404.html")).toBe(true);
    }, 60_000);
  }
});

/** The app's commands, recording what the builder asked for. */
function fakeApp(answers: Partial<Record<string, (args: Record<string, unknown>) => unknown>> = {}) {
  const calls: { cmd: string; args: Record<string, unknown> }[] = [];
  const report: BuildReport = { pages: 2, photos: 1, searchable: 3, redirects: 0, problems: [] };
  const invoke: Invoke = async (cmd, args) => {
    const a = (args ?? {}) as Record<string, unknown>;
    calls.push({ cmd, args: a });
    const answer = answers[cmd];
    if (answer) return answer(a);
    switch (cmd) {
      case "site_build":
        return report;
      case "site_preview":
        return "http://127.0.0.1:4321/";
      case "site_export":
        return { status: "done", folder: "/Users/hosni/Desktop/Bakery website" };
      default:
        return null;
    }
  };
  return { invoke, calls, report };
}

const json = (v: unknown) => `${JSON.stringify(v, null, 2)}\n`;
const page = (path: string, title: string) => ({
  path,
  title,
  description: `${title} page.`,
  puck: { root: { props: {} }, content: [{ type: "Heading", props: { id: `h-${title}`, text: title, level: "h1", align: "left" } }] },
});

async function bakery(extra: Record<string, string> = {}) {
  const store = new LocalStore(
    memoryFolder({
      "content/site.json": json({ name: "Bakery", baseUrl: "https://bakery.example", language: "en", tokens: defaultTokens }),
      "content/pages/index.json": json(page("/", "Home")),
      "content/pages/about.json": json(page("/about", "About")),
      ...extra,
    }),
  );
  await store.init();
  return store;
}

describe("publishing from the app", () => {
  it("preview: builds without stopping on problems, then opens the browser", async () => {
    const app = fakeApp();
    const { url, report } = await localPublisher(await bakery(), app.invoke).preview();
    expect(url).toBe("http://127.0.0.1:4321/");
    expect(report).toEqual(app.report);
    expect(app.calls.map((c) => c.cmd)).toEqual(["site_build", "site_preview"]);
    const build = app.calls[0]!.args as { files: { path: string; content: string }[]; baseUrl: string; preview: boolean };
    expect(build.preview).toBe(true);
    expect(build.baseUrl).toBe("https://bakery.example");
    expect(build.files.map((f) => f.path).sort()).toEqual(["404.html", "about/index.html", "index.html", "search/index.html"]);
    expect(build.files.find((f) => f.path === "about/index.html")!.content).toContain("<h1");
    expect(app.calls[1]!.args).toEqual({ open: true });
  });

  it("export: problems stop the build, and the folder is named after the site", async () => {
    const app = fakeApp();
    const { result } = await localPublisher(await bakery(), app.invoke).exportSite();
    expect(result).toEqual({ status: "done", folder: "/Users/hosni/Desktop/Bakery website" });
    expect(app.calls[0]!.args.preview).toBe(false);
    expect(app.calls[1]).toEqual({ cmd: "site_export", args: { name: "Bakery" } });
  });

  it("the app's refusals come back as plain messages", async () => {
    const app = fakeApp({
      site_build: () => {
        throw "Nothing was published. Fix this problem on 1 page and publish again:\n  - Page /about/: An image has no description.";
      },
    });
    await expect(localPublisher(await bakery(), app.invoke).exportSite()).rejects.toThrow(/^Nothing was published\. Fix this problem/);
    expect(app.calls.map((c) => c.cmd)).toEqual(["site_build"]);
  });

  it("a page the renderer can't place stops it before anything is built", async () => {
    const app = fakeApp();
    const clash = await bakery({ "content/pages/about-copy.json": json(page("/about", "About again")) });
    await expect(localPublisher(clash, app.invoke).preview()).rejects.toThrow(/^Nothing was built\. Pages about-copy\.json and about\.json both use the URL "\/about"/);
    expect(app.calls).toEqual([]);
  });

  it("replace and show go straight to the app", async () => {
    const app = fakeApp({ site_export_replace: () => ({ status: "done", folder: "/x/Bakery website" }) });
    const publisher = localPublisher(await bakery(), app.invoke);
    expect(await publisher.replaceExport()).toEqual({ status: "done", folder: "/x/Bakery website" });
    await publisher.showExport();
    expect(app.calls.map((c) => c.cmd)).toEqual(["site_export_replace", "site_show_export"]);
  });

  it("is only there in the app", async () => {
    expect(desktopPublisher()).toBeNull();
    const publisher = localPublisher(await bakery(), fakeApp().invoke);
    setDesktopPublisher(publisher);
    expect(desktopPublisher()).toBe(publisher);
    setDesktopPublisher(null);
  });
});

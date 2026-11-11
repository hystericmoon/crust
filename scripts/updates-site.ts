/**
 * F061: the downloads site. After the "Desktop installers" workflow builds
 * the app, this puts together what goes on the free Cloudflare Pages site
 * Crust updates from:
 *
 *   updates/latest.json   what the app asks: newest version, what's new,
 *                         and for each kind of computer the signed update
 *   index.html            a download page with what's new
 *
 * The installers and update files are too big for Cloudflare Pages (25 MB
 * a file), so they go on a GitHub release (free, the repository is public)
 * and the feed and the download page point there.
 *
 *   npx tsx scripts/updates-site.ts <built files folder> <out folder>
 *
 * The version comes from crates/crust-desktop/tauri.conf.json and what's new
 * from crates/crust-desktop/whats-new.json, which must have an entry for it.
 */
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { basename, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

export const DOWNLOADS_URL = "https://crust-downloads.pages.dev";
/** Where the installers live for a version: that version's GitHub release. */
export const filesUrl = (version: string, repository = "hystericmoon/crust") => `https://github.com/${repository}/releases/download/v${version}`;

export interface Release {
  version: string;
  date: string;
  notes: string[];
}

/** A built file, by its name, with its signature if it's an update file. */
export interface BuiltFile {
  path: string;
  name: string;
  signature?: string;
}

/** The kinds of computer the app updates on, as Tauri names them. */
export type Target = "darwin-aarch64" | "darwin-x86_64" | "windows-x86_64" | "linux-x86_64";

export interface UpdatesSite {
  latest: { version: string; notes: string; pub_date: string; platforms: Partial<Record<Target, { url: string; signature: string }>> };
  /** Files to put on the version's GitHub release: file name → built file. */
  copies: { to: string; from: string }[];
  downloads: { label: string; to: string; url: string }[];
  index: string;
}

const SEMVER = /^\d+\.\d+\.\d+$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** The release notes for `version`, checked; throws with a plain reason. */
export function releaseFor(whatsNew: unknown, version: string): Release {
  if (!Array.isArray(whatsNew)) throw new Error("whats-new.json should be a list of releases.");
  const entry = whatsNew.find((r) => r && typeof r === "object" && (r as Release).version === version) as Release | undefined;
  if (!entry) throw new Error(`whats-new.json has nothing for version ${version}. Add what's new before releasing.`);
  if (!SEMVER.test(entry.version)) throw new Error(`“${entry.version}” isn't a version like 1.2.3.`);
  if (typeof entry.date !== "string" || !DATE.test(entry.date)) throw new Error(`Give version ${version} a date like 2026-11-02.`);
  if (!Array.isArray(entry.notes) || entry.notes.length === 0 || entry.notes.some((n) => typeof n !== "string" || !n.trim())) {
    throw new Error(`Write at least one line of what's new for version ${version}.`);
  }
  return { version: entry.version, date: entry.date, notes: entry.notes.map((n) => n.trim()) };
}

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
/** A file name safe in an address. */
const urlName = (name: string) => encodeURIComponent(name);

/**
 * What goes on the downloads site (and the release) for these built files. A Mac update
 * (`*.app.tar.gz`, built for both Apple chips) serves both Mac targets; the
 * Windows installer (`*-setup.exe`) is also its update. Installers without
 * a signature are still offered for download, just not as updates.
 */
export function updatesSite(files: BuiltFile[], release: Release, filesBase = filesUrl(release.version)): UpdatesSite {
  const base = filesBase.replace(/\/+$/, "");
  const at = (f: BuiltFile) => f.name;
  const url = (f: BuiltFile) => `${base}/${urlName(f.name)}`;
  const platforms: UpdatesSite["latest"]["platforms"] = {};
  const copies: UpdatesSite["copies"] = [];
  const downloads: UpdatesSite["downloads"] = [];

  for (const f of files) {
    if (f.name.endsWith(".app.tar.gz")) {
      if (!f.signature) throw new Error(`${f.name} has no signature (.sig). Is the update key set?`);
      platforms["darwin-aarch64"] = platforms["darwin-x86_64"] = { url: url(f), signature: f.signature };
      copies.push({ to: at(f), from: f.path });
    } else if (f.name.endsWith("-setup.exe")) {
      if (f.signature) platforms["windows-x86_64"] = { url: url(f), signature: f.signature };
      copies.push({ to: at(f), from: f.path });
      downloads.push({ label: "Windows (10 and 11)", to: at(f), url: url(f) });
    } else if (f.name.endsWith(".AppImage")) {
      // The AppImage is also its own update (Tauri on Linux updates only AppImages).
      if (f.signature) platforms["linux-x86_64"] = { url: url(f), signature: f.signature };
      copies.push({ to: at(f), from: f.path });
      downloads.push({ label: "Linux (AppImage: runs on most computers, no install)", to: at(f), url: url(f) });
    } else if (f.name.endsWith(".deb")) {
      copies.push({ to: at(f), from: f.path });
      downloads.push({ label: "Linux (.deb for Ubuntu and Debian; doesn't update itself)", to: at(f), url: url(f) });
    } else if (f.name.endsWith(".dmg")) {
      copies.push({ to: at(f), from: f.path });
      downloads.push({ label: "Mac (Apple chip or Intel, macOS 11 or later)", to: at(f), url: url(f) });
    }
  }
  if (!downloads.length) throw new Error("No installers found (.dmg, -setup.exe, .AppImage or .deb). Did the build finish?");
  downloads.sort((a, b) => a.label.localeCompare(b.label));

  const latest = { version: release.version, notes: release.notes.map((n) => `- ${n}`).join("\n"), pub_date: `${release.date}T00:00:00Z`, platforms };
  return { latest, copies, downloads, index: indexPage(release, downloads) };
}

function indexPage(release: Release, downloads: UpdatesSite["downloads"]): string {
  const links = downloads.map((d) => `      <li><a href="${escapeHtml(d.url)}">${escapeHtml(d.label)}</a></li>`).join("\n");
  const notes = release.notes.map((n) => `      <li>${escapeHtml(n)}</li>`).join("\n");
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Download Crust</title>
  <meta name="description" content="Download the Crust app for Mac, Windows and Linux.">
  <style>
    body { margin: 0; background: #f6f6f7; color: #18181b; font: 16px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; }
    main { max-width: 40rem; margin: 0 auto; padding: 48px 16px; }
    h1 { font-size: 2rem; margin: 0 0 8px; }
    h2 { font-size: 1.25rem; margin: 32px 0 8px; }
    a { color: #18181b; text-underline-offset: 3px; }
    a:focus-visible { outline: 2px solid #18181b; outline-offset: 2px; }
    .downloads { list-style: none; padding: 0; display: grid; gap: 8px; }
    .downloads a { display: block; padding: 12px 16px; min-height: 24px; border: 1px solid #85858f; border-radius: 8px; background: #fff; font-weight: 600; text-decoration: none; }
    .downloads a:hover { background: #f4f4f5; }
    .muted { color: #52525b; }
  </style>
</head>
<body>
  <main>
    <h1>Download Crust</h1>
    <p class="muted">Version ${escapeHtml(release.version)}, ${escapeHtml(release.date)}. Once installed, Crust keeps itself up to date.</p>
    <ul class="downloads">
${links}
    </ul>
    <h2>What's new</h2>
    <ul>
${notes}
    </ul>
  </main>
</body>
</html>
`;
}

/** Every file under a folder (the workflow's downloaded build files). */
async function walk(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(path)));
    else out.push(path);
  }
  return out;
}

/** The built files in a folder, each update file with its signature. */
export async function builtFiles(dir: string): Promise<BuiltFile[]> {
  const paths = await walk(dir);
  const names = new Set(paths);
  const files: BuiltFile[] = [];
  for (const path of paths) {
    if (path.endsWith(".sig")) continue;
    const sig = `${path}.sig`;
    files.push({ path, name: basename(path), signature: names.has(sig) ? (await readFile(sig, "utf8")).trim() : undefined });
  }
  return files;
}

async function main(argv: string[]) {
  const [input, output] = argv;
  if (!input || !output) throw new Error("Usage: tsx scripts/updates-site.ts <built files folder> <out folder>");
  const root = join(fileURLToPath(import.meta.url), "../..");
  const conf = JSON.parse(await readFile(join(root, "crates/crust-desktop/tauri.conf.json"), "utf8")) as { version: string };
  const release = releaseFor(JSON.parse(await readFile(join(root, "crates/crust-desktop/whats-new.json"), "utf8")), conf.version);
  const repository = process.env.GITHUB_REPOSITORY || undefined;
  const site = updatesSite(await builtFiles(input), release, process.env.CRUST_FILES_URL || filesUrl(release.version, repository));
  await mkdir(join(output, "updates"), { recursive: true });
  // The installers aren't copied here: the workflow puts them on the version's GitHub release.
  await writeFile(join(output, "updates/latest.json"), `${JSON.stringify(site.latest, null, 2)}\n`);
  await writeFile(join(output, "index.html"), site.index);
  // The feed must never be cached for long, or people get updates late.
  await writeFile(join(output, "_headers"), "/updates/*\n  Cache-Control: no-cache\n");
  console.log(`Downloads site for Crust ${release.version} in ${relative(process.cwd(), output) || "."}: ${site.downloads.map((d) => d.label).join(", ")}; updates for ${Object.keys(site.latest.platforms).join(", ") || "nothing (no update key)"}.`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main(process.argv.slice(2)).catch((e) => {
    console.error(e instanceof Error ? e.message : String(e));
    process.exit(1);
  });
}

/**
 * Linked sections (F043): content/sections/<id>.json, shown on many pages.
 * Saving one updates every page that uses it; a section in use can't be
 * deleted. Checked here, whatever the browser sent.
 */
import {
  SECTIONS_FOLDER,
  checkSectionContent,
  checkSectionName,
  isValidSectionId,
  linkedSectionIds,
  parseLinkedSection,
  sectionContentFor,
  sectionFileFor,
  sectionIdFor,
  sectionIdForFile,
  type LinkedSectionFile,
} from "@crust/blocks/linked-sections";
import { POSTS_FOLDER, parsePost, postPath, slugForFile } from "@crust/blocks/posts";
import { richTextProblems } from "@crust/blocks/rich-text";
import { fail, gate, keptIn, githubFailure, repoFor, json, readBody, readPages, type Env } from "./api";
import { commitFiles, listFolder, readFile, type Repo } from "./github";

const serialize = (value: LinkedSectionFile) => `${JSON.stringify(value, null, 2)}\n`;

export interface SectionUse {
  path: string;
  title: string;
}

/** Every linked section, by name. Unreadable files are skipped. */
export async function readSections(cfg: Repo, fetchFn: typeof fetch): Promise<LinkedSectionFile[]> {
  const files = await listFolder(cfg, SECTIONS_FOLDER, fetchFn);
  const sections = await Promise.all(
    files.map(async (f) => {
      const id = sectionIdForFile(f.path);
      return id ? parseLinkedSection(await readFile(cfg, f.path, fetchFn), id) : null;
    }),
  );
  return sections.filter((s): s is LinkedSectionFile => s !== null).sort((a, b) => a.name.localeCompare(b.name));
}

/** Which pages and posts use each linked section. */
async function readUsage(cfg: Repo, fetchFn: typeof fetch): Promise<Record<string, SectionUse[]>> {
  const usage: Record<string, SectionUse[]> = {};
  const add = (ids: Set<string>, use: SectionUse) => {
    for (const id of ids) (usage[id] ??= []).push(use);
  };
  const [pages, postFiles] = await Promise.all([readPages(cfg, fetchFn), listFolder(cfg, POSTS_FOLDER, fetchFn)]);
  for (const { page } of pages) add(linkedSectionIds(page.puck), { path: page.path, title: page.title });
  const posts = await Promise.all(postFiles.filter((f) => slugForFile(f.path)).map(async (f) => parsePost(await readFile(cfg, f.path, fetchFn))));
  for (const post of posts) if (post) add(linkedSectionIds(post.puck), { path: postPath(post.slug), title: post.title });
  for (const list of Object.values(usage)) list.sort((a, b) => a.path.localeCompare(b.path));
  return usage;
}

const contentProblems = (content: unknown) => [...checkSectionContent(content), ...(Array.isArray(content) ? richTextProblems(content) : [])];

/**
 * GET /api/sections: every linked section and where it's used.
 * POST /api/sections
 *   { action: "create", name, content }   (from "Make linked")
 *   { action: "update", id, content }     (its own editor: every page changes)
 *   { action: "rename", id, name }
 *   { action: "delete", id }              (only when no page uses it)
 */
export async function handleSections(request: Request, env: Env, fetchFn: typeof fetch = fetch): Promise<Response> {
  const write = request.method === "POST";
  const user = await gate(request, env, fetchFn, write);
  if (user instanceof Response) return user;
  const cfg = repoFor(env);
  try {
    if (!write) {
      const [sections, usage] = await Promise.all([readSections(cfg, fetchFn), readUsage(cfg, fetchFn)]);
      return json(200, { ok: true, sections, usage });
    }
    const body = await readBody(request);
    if (body instanceof Response) return body;
    const { action, id, name, content } = (body ?? {}) as { action?: string; id?: unknown; name?: unknown; content?: unknown };

    if (action === "create") {
      const problems = [...checkSectionName(name), ...contentProblems(content)];
      if (problems.length) return fail(422, `Not saved. ${problems.join(" ")}`);
      const taken = new Set((await listFolder(cfg, SECTIONS_FOLDER, fetchFn)).map((f) => sectionIdForFile(f.path)).filter((x): x is string => x !== null));
      const section: LinkedSectionFile = {
        id: sectionIdFor(name as string, taken),
        name: (name as string).trim(),
        savedAt: new Date().toISOString(),
        content: sectionContentFor(content as LinkedSectionFile["content"]),
      };
      const result = await commitFiles(cfg, [{ path: sectionFileFor(section.id), content: serialize(section) }], `Make linked section "${section.name}" from the builder\n\nMade by ${user.email}`, fetchFn);
      return json(200, { ok: true, section, commit: result.commit });
    }

    if (!isValidSectionId(id)) return fail(400, "That isn't one of your linked sections.");
    const current = parseLinkedSection(await readFile(cfg, sectionFileFor(id), fetchFn), id);
    if (!current) return fail(404, `That linked section isn't ${keptIn(env)} any more. It may have been deleted.`);

    if (action === "update") {
      const problems = contentProblems(content);
      if (problems.length) return fail(422, `Not saved. ${problems.join(" ")}`);
      const section: LinkedSectionFile = { ...current, savedAt: new Date().toISOString(), content: sectionContentFor(content as LinkedSectionFile["content"]) };
      const usedOn = (await readUsage(cfg, fetchFn))[id] ?? [];
      const result = await commitFiles(
        cfg,
        [{ path: sectionFileFor(id), content: serialize(section) }],
        `Update linked section "${section.name}" from the builder\n\nShown on ${usedOn.length} page${usedOn.length === 1 ? "" : "s"}.\nSaved by ${user.email}`,
        fetchFn,
      );
      return json(200, { ok: true, section, usedOn, commit: result.commit });
    }

    if (action === "rename") {
      const problems = checkSectionName(name);
      if (problems.length) return fail(422, `Not renamed. ${problems.join(" ")}`);
      const section: LinkedSectionFile = { ...current, name: (name as string).trim() };
      const result = await commitFiles(cfg, [{ path: sectionFileFor(id), content: serialize(section) }], `Rename linked section "${current.name}" to "${section.name}" from the builder\n\nRenamed by ${user.email}`, fetchFn);
      return json(200, { ok: true, section, commit: result.commit });
    }

    if (action === "delete") {
      const usedOn = (await readUsage(cfg, fetchFn))[id] ?? [];
      if (usedOn.length) {
        const names = usedOn.map((u) => `${u.title} (${u.path})`).join(", ");
        return json(409, { ok: false, error: `“${current.name}” is still on ${usedOn.length === 1 ? "a page" : `${usedOn.length} pages`}: ${names}. Unlink or remove it there first.`, usedOn });
      }
      const result = await commitFiles(cfg, [{ path: sectionFileFor(id), content: null }], `Delete linked section "${current.name}" from the builder\n\nDeleted by ${user.email}`, fetchFn);
      return json(200, { ok: true, commit: result.commit });
    }
    return fail(400, "Nothing to do.");
  } catch (e) {
    return githubFailure(e);
  }
}

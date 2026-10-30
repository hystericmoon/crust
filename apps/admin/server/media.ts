/**
 * Media library endpoints (F034). Photos are committed to the content repo
 * under content/media/, with their details in content/media.json, through
 * the same GitHub token as pages. Never trusts the browser about a file:
 * the type and pixel size are read from the bytes.
 */
import {
  MEDIA_FOLDER,
  MEDIA_INDEX,
  isMediaFile,
  mediaFileFor,
  mediaLimits,
  mediaTypes,
  mediaUsedIn,
  parseMediaIndex,
  sniffImage,
  type MediaItem,
} from "@crust/blocks/media";
import { fail, gate, githubConfig, githubFailure, json, readPages, type Env } from "./api";
import { commitFiles, readFile, readRaw, type GitHubConfig } from "./github";

/** Base64 grows a file by a third; leave room for the rest of the request. */
const MAX_UPLOAD_REQUEST = Math.ceil((mediaLimits.uploadBytes * 4) / 3) + 64 * 1024;

const serializeIndex = (items: MediaItem[]) => `${JSON.stringify(items, null, 2)}\n`;

export interface MediaUse {
  /** Page address, or "site" for the header logo. */
  path: string;
  title: string;
}

/** Where each photo is used: pages and the site header. */
async function usage(cfg: GitHubConfig, fetchFn: typeof fetch): Promise<Record<string, MediaUse[]>> {
  const [pages, siteText] = await Promise.all([readPages(cfg, fetchFn), readFile(cfg, "content/site.json", fetchFn)]);
  const out: Record<string, MediaUse[]> = {};
  const add = (files: Set<string>, use: MediaUse) => {
    for (const f of files) (out[f] ??= []).push(use);
  };
  for (const { page } of [...pages].sort((a, b) => a.page.path.localeCompare(b.page.path))) {
    add(mediaUsedIn(page.puck), { path: page.path, title: page.title });
  }
  if (siteText) {
    try {
      add(mediaUsedIn((JSON.parse(siteText) as { header?: unknown }).header), { path: "site", title: "Site header" });
    } catch {
      // A damaged site.json uses no photos.
    }
  }
  return out;
}

function decodeBase64(data: string): Uint8Array | null {
  try {
    const bin = atob(data);
    return Uint8Array.from(bin, (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
}

/** Byte length of base64 text; null if it isn't base64. */
export function base64Size(data: string): number | null {
  if (data.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(data)) return null;
  return (data.length / 4) * 3 - (data.endsWith("==") ? 2 : data.endsWith("=") ? 1 : 0);
}

const checkAlt = (alt: unknown): string | null =>
  typeof alt !== "string" ? "The alt text is missing." : alt.length > mediaLimits.alt ? `The alt text is longer than ${mediaLimits.alt} characters.` : null;

/**
 * GET /api/media: every photo, newest first, with where it's used.
 * POST /api/media { action: "upload", name, data (base64), alt }
 *               | { action: "alt", file, alt } | { action: "delete", file }
 */
export async function handleMedia(request: Request, env: Env, fetchFn: typeof fetch = fetch): Promise<Response> {
  const write = request.method === "POST";
  const user = await gate(request, env, fetchFn, write);
  if (user instanceof Response) return user;
  const cfg = githubConfig(env);

  if (!write) {
    try {
      const [items, used] = await Promise.all([readFile(cfg, MEDIA_INDEX, fetchFn).then(parseMediaIndex), usage(cfg, fetchFn)]);
      items.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
      return json(200, { ok: true, items, usage: used });
    } catch (e) {
      return githubFailure(e);
    }
  }

  const text = await request.text();
  if (text.length > MAX_UPLOAD_REQUEST) return fail(413, `This photo is still too large after shrinking (over ${mediaLimits.uploadBytes / 1024 / 1024} MB).`);
  let body: Record<string, unknown>;
  try {
    body = (JSON.parse(text) ?? {}) as Record<string, unknown>;
  } catch {
    return fail(400, "The data sent wasn't valid JSON.");
  }

  try {
    const items = parseMediaIndex(await readFile(cfg, MEDIA_INDEX, fetchFn));

    if (body.action === "upload") {
      const altProblem = checkAlt(body.alt ?? "");
      if (altProblem) return fail(422, `Not uploaded. ${altProblem}`);
      if (typeof body.name !== "string" || typeof body.data !== "string") return fail(400, "The photo is missing.");
      const size = base64Size(body.data);
      // Only the start is decoded: enough to know the type and size, and cheap on Cloudflare's CPU limit.
      const head = size === null ? null : decodeBase64(body.data.slice(0, 256 * 1024));
      if (size === null || !head) return fail(400, "The photo is damaged.");
      if (size > mediaLimits.uploadBytes) return fail(413, `This photo is still too large after shrinking (over ${mediaLimits.uploadBytes / 1024 / 1024} MB).`);
      const kind = sniffImage(head);
      if (!kind) return fail(415, "Only JPG, PNG and WebP photos can be uploaded.");
      if (items.length >= mediaLimits.photos) return fail(422, `The library is full (${mediaLimits.photos} photos). Delete photos you no longer use.`);
      const file = mediaFileFor(body.name, kind.ext, items.map((i) => i.file));
      const item: MediaItem = {
        file,
        alt: String(body.alt ?? "").trim(),
        width: kind.width,
        height: kind.height,
        bytes: size,
        uploadedAt: new Date().toISOString(),
      };
      const result = await commitFiles(
        cfg,
        [
          { path: `${MEDIA_FOLDER}/${file}`, content: "", base64: body.data },
          { path: MEDIA_INDEX, content: serializeIndex([...items, item]) },
        ],
        `Upload photo ${file} from the builder\n\nUploaded by ${user.email}`,
        fetchFn,
      );
      return json(200, { ok: true, item, commit: result.commit });
    }

    if (!isMediaFile(body.file)) return fail(400, "That isn't a photo in the library.");
    const current = items.find((i) => i.file === body.file);
    if (!current) return fail(404, "That photo isn't in the library any more. It may have been deleted.");

    if (body.action === "alt") {
      const altProblem = checkAlt(body.alt);
      if (altProblem) return fail(422, `Not saved. ${altProblem}`);
      const item = { ...current, alt: (body.alt as string).trim() };
      const result = await commitFiles(
        cfg,
        [{ path: MEDIA_INDEX, content: serializeIndex(items.map((i) => (i.file === item.file ? item : i))) }],
        `Describe photo ${item.file} from the builder\n\nSaved by ${user.email}`,
        fetchFn,
      );
      return json(200, { ok: true, item, commit: result.commit });
    }

    if (body.action === "delete") {
      const used = (await usage(cfg, fetchFn))[current.file] ?? [];
      if (used.length) {
        return fail(409, `This photo is still used on ${used.map((u) => u.title).join(", ")}. Choose another photo there first.`, { usedOn: used });
      }
      const result = await commitFiles(
        cfg,
        [
          { path: `${MEDIA_FOLDER}/${current.file}`, content: null },
          { path: MEDIA_INDEX, content: serializeIndex(items.filter((i) => i.file !== current.file)) },
        ],
        `Delete photo ${current.file} from the builder\n\nDeleted by ${user.email}`,
        fetchFn,
      );
      return json(200, { ok: true, commit: result.commit });
    }
    return fail(400, "Nothing to do.");
  } catch (e) {
    return githubFailure(e);
  }
}

/** GET /media/<file>: a library photo, so the builder shows it at the address pages use. */
export async function handleMediaFile(request: Request, env: Env, file: string, fetchFn: typeof fetch = fetch): Promise<Response> {
  const user = await gate(request, env, fetchFn, false);
  if (user instanceof Response) return user;
  if (!isMediaFile(file)) return new Response("Not found", { status: 404 });
  try {
    const bytes = await readRaw(githubConfig(env), `${MEDIA_FOLDER}/${file}`, fetchFn);
    if (!bytes) return new Response("Not found", { status: 404 });
    const ext = file.slice(file.lastIndexOf(".") + 1) as keyof typeof mediaTypes;
    return new Response(bytes, {
      headers: {
        "Content-Type": mediaTypes[ext],
        // Signed-in only; an uploaded file is never changed in place.
        "Cache-Control": "private, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    return githubFailure(e);
  }
}

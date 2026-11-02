/**
 * F055: the admin's server, inside the desktop app. On the web, each
 * address under /api/ is a Cloudflare Pages Function (apps/admin/functions)
 * that calls a handler in apps/admin/server. In the app there's no server:
 * the builder's requests are answered by the same handlers, right in the
 * window, with the site folder's content store (F054) as their `env.store`.
 */
import {
  handleChanges,
  handleDelete,
  handleDeleted,
  handleLayouts,
  handleLinks,
  handlePage,
  handlePages,
  handlePublish,
  handleRename,
  handleRestore,
  handleSave,
  handleStatus,
  type Env,
} from "../../server/api";
import { handleDesigns } from "../../server/designs";
import { handleMedia, handleMediaFile } from "../../server/media";
import { handlePosts } from "../../server/posts";
import { handleSections } from "../../server/sections";
import { handleTemplate } from "../../server/template";

type Handler = (request: Request, env: Env) => Promise<Response>;
type Method = "GET" | "POST";

/** The same addresses and methods as apps/admin/functions/api. */
export const routes: Record<string, Partial<Record<Method, Handler>>> = {
  "/api/changes": { GET: handleChanges },
  "/api/delete": { POST: handleDelete },
  "/api/deleted": { GET: handleDeleted },
  "/api/designs": { GET: handleDesigns, POST: handleDesigns },
  "/api/layouts": { GET: handleLayouts, POST: handleLayouts },
  "/api/links": { GET: handleLinks },
  "/api/media": { GET: handleMedia, POST: handleMedia },
  "/api/page": { GET: handlePage },
  "/api/pages": { GET: handlePages },
  "/api/posts": { GET: handlePosts, POST: handlePosts },
  "/api/publish": { GET: handlePublish, POST: handlePublish },
  "/api/rename": { POST: handleRename },
  "/api/restore": { POST: handleRestore },
  "/api/save": { POST: handleSave },
  "/api/sections": { GET: handleSections, POST: handleSections },
  "/api/status": { GET: handleStatus },
  "/api/template": { GET: handleTemplate, POST: handleTemplate },
};

const notFound = () =>
  new Response(JSON.stringify({ ok: false, error: "There's nothing at this address." }), {
    status: 404,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });

/** Answers one of the builder's requests, the way the web admin's server would. */
export function localApi(env: Env): (request: Request) => Promise<Response> {
  // Handlers get a fetch that refuses to go online: in the app, content
  // never leaves the computer unless the person publishes (F056+).
  const offline: typeof fetch = async () => {
    throw new Error("Crust doesn't go online for this.");
  };
  return async (request) => {
    const { pathname } = new URL(request.url);
    const media = /^\/media\/([^/]+)$/.exec(pathname);
    if (media) {
      if (request.method !== "GET" && request.method !== "HEAD") return new Response("Method not allowed", { status: 405 });
      return handleMediaFile(request, env, decodeURIComponent(media[1]!), offline);
    }
    const route = routes[pathname];
    if (!route) return notFound();
    const handler = route[request.method as Method];
    if (!handler) return new Response(JSON.stringify({ ok: false, error: "Method not allowed" }), { status: 405 });
    return (handler as (r: Request, e: Env, f: typeof fetch) => Promise<Response>)(request, env, offline);
  };
}

/** True for the addresses the app answers itself. */
export const isLocalAddress = (pathname: string) => pathname.startsWith("/api/") || pathname.startsWith("/media/");

/**
 * A fetch that sends the builder's own requests (/api/…, /media/… on this
 * window's address) to `answer`, and everything else on as usual.
 */
export function routedFetch(original: typeof fetch, answer: (request: Request) => Promise<Response>, here: string): typeof fetch {
  const base = new URL(here);
  return async (input, init) => {
    const raw = input instanceof Request ? input.url : String(input);
    const url = new URL(raw, base);
    if (url.protocol !== base.protocol || url.host !== base.host || !isLocalAddress(url.pathname)) return original(input, init);
    // Tauri's own address (tauri://localhost) isn't one every browser part
    // understands, so the handlers see a plain one; they only use the path.
    const target = `http://crust.app${url.pathname}${url.search}`;
    const request = input instanceof Request ? new Request(target, input) : new Request(target, init);
    try {
      return await answer(request);
    } catch (e) {
      return new Response(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }), {
        status: 500,
        headers: { "Content-Type": "application/json; charset=utf-8" },
      });
    }
  };
}

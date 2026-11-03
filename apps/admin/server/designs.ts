/**
 * Post, blog and "Page not found" designs (F082): content/designs/*.json,
 * saved through the same store as pages. Checked here, whatever the
 * browser sent.
 */
import { checkDesign, cleanDesign, designFile, designKinds, designNames, isDesignKind, parseDesign, type PageDesign, type PageDesigns } from "@crust/blocks/page-designs";
import { richTextProblems } from "@crust/blocks/rich-text";
import { fail, gate, githubFailure, json, repoFor, type Env } from "./api";
import { MAX_BYTES } from "./content";
import { commitFiles, readFile } from "./github";

const serialize = (d: PageDesign) => `${JSON.stringify(d, null, 2)}\n`;

/**
 * GET /api/designs: { designs: { post?, blog?, notFound? } } (missing: the built-in look).
 * POST { action: "save", design } | { action: "reset", kind } (back to the built-in look).
 */
export async function handleDesigns(request: Request, env: Env, fetchFn: typeof fetch = fetch): Promise<Response> {
  const write = request.method === "POST";
  const user = await gate(request, env, fetchFn, write);
  if (user instanceof Response) return user;
  const cfg = repoFor(env);

  try {
    if (!write) {
      const designs: PageDesigns = {};
      const texts = await Promise.all(designKinds.map((kind) => readFile(cfg, designFile(kind), fetchFn)));
      designKinds.forEach((kind, i) => {
        const design = parseDesign(texts[i], kind);
        if (design) designs[kind] = design;
      });
      return json(200, { ok: true, designs });
    }

    const text = await request.text();
    if (new TextEncoder().encode(text).length > MAX_BYTES) return fail(413, "This design is too large to save (over 512 KB).");
    let body: Record<string, unknown>;
    try {
      body = (JSON.parse(text) ?? {}) as Record<string, unknown>;
    } catch {
      return fail(400, "The data sent wasn't valid JSON.");
    }

    if (body.action === "save") {
      const problems = checkDesign(body.design);
      if (!problems.length) problems.push(...richTextProblems({ content: (body.design as PageDesign).content }));
      if (problems.length) return fail(422, `Not saved. ${problems.join(" ")}`);
      const design = cleanDesign({ ...(body.design as PageDesign), savedAt: new Date().toISOString() });
      const name = designNames[design.kind];
      const result = await commitFiles(cfg, [{ path: designFile(design.kind), content: serialize(design) }], `Save the ${name} design from the builder\n\nSaved by ${user.email}`, fetchFn);
      return json(200, { ok: true, design, commit: result.commit });
    }

    if (body.action === "reset") {
      if (!isDesignKind(body.kind)) return fail(400, "That isn't a post, blog or “Page not found” design.");
      const kind = body.kind;
      if ((await readFile(cfg, designFile(kind), fetchFn)) === null) return json(200, { ok: true, commit: null });
      const result = await commitFiles(cfg, [{ path: designFile(kind), content: null }], `Use the built-in ${designNames[kind]} again\n\nChanged by ${user.email}`, fetchFn);
      return json(200, { ok: true, commit: result.commit });
    }
    return fail(400, "Nothing to do.");
  } catch (e) {
    return githubFailure(e);
  }
}

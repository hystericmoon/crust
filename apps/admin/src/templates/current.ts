/** F048: this site as it is now, for the "what gets replaced" question. */
import { listMedia, listPages, listSections } from "../api-client";
import { readLocalSections } from "../linked/store";
import { bundledPages, localDrafts, mergePageRows } from "../pages/store";
import { loadPostRows } from "../posts/store";
import type { CurrentSite } from "./start";

export async function currentSiteNow(githubOn: boolean, language: string): Promise<CurrentSite> {
  const bundled = bundledPages().map((p) => ({ path: p.path, title: p.title, lastEdited: null }));
  const [pages, posts, sections, media] = await Promise.all([
    githubOn ? listPages() : null,
    loadPostRows(githubOn),
    githubOn ? listSections() : null,
    githubOn ? listMedia() : null,
  ]);
  const rows = mergePageRows(pages?.ok ? pages.pages : bundled, localDrafts());
  return {
    language,
    pages: rows.map((r) => ({ title: r.title })),
    posts: posts.rows.length,
    sections: (sections?.ok ? sections.sections : readLocalSections()).map((s) => s.name),
    photos: media?.ok ? media.items.map((m) => m.file) : null,
    drafts: githubOn ? rows.filter((r) => r.localChanges).length + posts.rows.filter((r) => r.localChanges).length : 0,
  };
}

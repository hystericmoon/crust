/**
 * F101: the other two screens of level 1 in the desktop app's menu.
 * Templates is browsing only (applying one is an action inside a site, under
 * Pages); Settings is the app's own settings, not a site's.
 */
import { useEffect, useRef, useState } from "react";
import { ThemeToggle } from "../app-theme/ThemeToggle";
import { gallerySources, type GallerySource, type Template } from "../templates/sources";
import { Thumbnail } from "../templates/TemplatesScreen";
import { AboutCrust, UpdateBanner } from "../updates/UpdateNotice";

type Loaded = { id: string; template: Template | null; loading: boolean };

export function TemplatesBrowse({ sources: given }: { sources?: GallerySource[] }) {
  const [sources] = useState(() => given ?? gallerySources());
  const [cards, setCards] = useState<Loaded[]>(() => sources.map((s) => ({ id: s.id, template: null, loading: true })));
  useEffect(() => {
    let live = true;
    sources.forEach((s, i) => {
      void s
        .load()
        .catch(() => ({ template: null }))
        .then((r) => {
          if (live) setCards((all) => all.map((c, j) => (j === i ? { id: s.id, template: r.template, loading: false } : c)));
        });
    });
    return () => {
      live = false;
    };
  }, [sources]);
  const ready = cards.filter((c) => c.template);
  return (
    <div className="st">
      <header className="st-header">
        <h1 className="st-title">Templates</h1>
      </header>
      <main className="pg sites">
        <section className="st-card" aria-labelledby="tpl-h">
          <h2 id="tpl-h">Starting points</h2>
          <p className="st-lede">To use one, open a site and choose Start from a template under Pages. Nothing here changes a site.</p>
          {cards.every((c) => c.loading) ? <p role="status">Loading templates…</p> : null}
          <ul className="as-cards as-templates">
            {ready.map((c) => (
              <li key={c.id} className="as-card">
                <Thumbnail template={c.template!} />
                <h3 className="as-card-name">{c.template!.name}</h3>
                {c.template!.description ? <p className="st-help as-card-meta">{c.template!.description}</p> : null}
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}

export function AppSettings() {
  const ref = useRef<HTMLHeadingElement>(null);
  return (
    <div className="st">
      <header className="st-header">
        <h1 className="st-title" ref={ref}>
          Settings
        </h1>
      </header>
      <main className="pg sites">
        <UpdateBanner />
        <section className="st-card" aria-labelledby="look-h">
          <h2 id="look-h">Appearance</h2>
          <p className="st-lede">Light or dark for the Crust app. Your websites keep their own look.</p>
          <ThemeToggle />
        </section>
        <AboutCrust />
      </main>
    </div>
  );
}

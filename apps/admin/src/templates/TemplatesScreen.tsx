/**
 * Pages → Start from a template (F048, design direction A): a gallery of
 * templates, then one template's pages in a preview at desktop, tablet and
 * phone widths, then a question that says exactly what applying it
 * replaces and what it keeps. Design snapshot: design/f048-start-from-template-v1.html.
 */
import baseCss from "@crust/blocks/styles.css?raw";
import { useEffect, useId, useMemo, useRef, useState, type ChangeEvent } from "react";
import { Dialog, focusAfterDialog } from "../pages/PageActions";
import { setJustApplied } from "./local-site";
import { gallerySources, readTemplateText, type GallerySource, type Template } from "./sources";
import { applyLocally, applyOnGitHub, previewHtml, replacePlan, templateFacts, type ApplyStep, type CurrentSite, type PreviewTarget, type ReplacePlan } from "./start";
import "./templates.css";

/**
 * F069: each preview has a real screen height too, and the page scrolls
 * inside it. Sized to its content, a full-height opening section (vh units)
 * grew with the frame: Harbour's was 2244 px on desktop, 5185 px on a phone.
 */
const widths = [
  { id: "desktop", label: "Desktop", width: 1280, height: 800 },
  { id: "tablet", label: "Tablet", width: 768, height: 1024 },
  { id: "phone", label: "Phone", width: 375, height: 812 },
] as const;
type WidthId = (typeof widths)[number]["id"];

const narrow = () => typeof matchMedia === "function" && matchMedia("(max-width: 699px)").matches;

type Card = { id: string; template: Template | null; problems: string[]; loading: boolean };

export interface TemplatesScreenProps {
  siteName: string;
  githubOn: boolean;
  /** This site as it is now, for the confirm question. */
  currentSite: () => Promise<CurrentSite>;
  sources?: GallerySource[];
  /** After applying: the app reloads so every screen picks up the new site. */
  onApplied?: () => void;
}

const reload = () => {
  location.hash = "#/";
  location.reload();
};

export function TemplatesScreen({ siteName, githubOn, currentSite, sources: given, onApplied = reload }: TemplatesScreenProps) {
  const [sources] = useState(() => given ?? gallerySources());
  const [cards, setCards] = useState<Card[]>(() => sources.map((s) => ({ id: s.id, template: null, problems: [], loading: true })));
  const [chosen, setChosen] = useState<Template | null>(null);
  const [fileProblems, setFileProblems] = useState<string[]>([]);
  // Back from a template: focus returns to its card (or the file field), which the gallery draws anew.
  const [returnTo, setReturnTo] = useState<string | null>(null);
  const fileId = useId();

  useEffect(() => {
    if (chosen || !returnTo) return;
    document.getElementById(returnTo)?.focus();
    setReturnTo(null);
  }, [chosen, returnTo]);

  useEffect(() => {
    let live = true;
    sources.forEach((s, i) => {
      void s
        .load()
        .catch(() => ({ template: null, problems: ["This template couldn't be loaded."] }))
        .then((r) => {
          if (live) setCards((all) => all.map((c, j) => (j === i ? { id: s.id, template: r.template, problems: r.problems, loading: false } : c)));
        });
    });
    return () => {
      live = false;
    };
  }, [sources]);

  const open = (t: Template, from: string) => {
    setReturnTo(from);
    setChosen(t);
    window.scrollTo?.(0, 0);
  };

  const openFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const file = input.files?.[0];
    setFileProblems([]);
    if (!file) return;
    const read = readTemplateText(await file.text());
    input.value = "";
    if (read.template) open(read.template, fileId);
    else setFileProblems(read.problems);
  };

  if (chosen) {
    return (
      <TemplateDetail
        template={chosen}
        githubOn={githubOn}
        currentSite={currentSite}
        onApplied={onApplied}
        onBack={() => setChosen(null)}
      />
    );
  }

  const ready = cards.filter((c) => c.template || !c.loading);
  return (
    <div className="st">
      <header className="st-header">
        <a className="st-back" href="#/">
          <span aria-hidden="true">←</span> Pages
        </a>
        <h1 className="st-title">{siteName}: start from a template</h1>
      </header>
      <main className="pg">
        <p className="st-lede">
          Pick a template to look through its pages. Nothing changes until you choose “Use this template” and confirm; even then your
          previous site can be brought back.
        </p>
        <ul className="tp-grid" aria-label="Templates" aria-busy={ready.length < cards.length || undefined}>
          {cards.map((c) =>
            c.template ? (
              <li key={c.id}>
                <button type="button" id={`${fileId}-${c.id}`} className="tp-card" onClick={() => open(c.template!, `${fileId}-${c.id}`)}>
                  <Thumbnail template={c.template} />
                  <span className="tp-card-meta">
                    <strong className="tp-card-name">{c.template.name}</strong>
                    {c.template.description ? <span>{c.template.description}</span> : null}
                    <span className="tp-facts">{templateFacts(c.template)}</span>
                  </span>
                </button>
              </li>
            ) : c.loading ? (
              <li key={c.id} className="tp-card tp-card-loading">
                Loading a template…
              </li>
            ) : (
              <li key={c.id} className="tp-card tp-card-broken">
                <strong>{c.id}</strong>
                <span>This template can't be used: {c.problems[0] ?? "it's damaged."}</span>
              </li>
            ),
          )}
          <li>
            <div className="tp-card tp-card-file">
              <label htmlFor={fileId} className="tp-file-label">
                <strong>Open a template file…</strong>
                <span>A .crust file made with Site settings → Template, or sent to you.</span>
              </label>
              <input id={fileId} type="file" accept=".crust,application/json" onChange={openFile} />
            </div>
          </li>
        </ul>
        {fileProblems.length ? (
          <div className="st-error" role="alert">
            <p>That file can't be used as a template:</p>
            <ul>
              {fileProblems.slice(0, 8).map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </main>
    </div>
  );
}

/** The template's Home page, small. Decorative: the card's text says what it is. */
export function Thumbnail({ template }: { template: Template }) {
  const html = useMemo(() => previewHtml(template, { kind: "page", path: "/" }, baseCss), [template]);
  const boxRef = useRef<HTMLSpanElement>(null);
  const [scale, setScale] = useState(0.2);
  useEffect(() => {
    const box = boxRef.current;
    if (!box || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => setScale((entry?.contentRect.width ?? 256) / 1280));
    observer.observe(box);
    return () => observer.disconnect();
  }, []);
  return (
    <span className="tp-thumb" ref={boxRef} aria-hidden="true">
      {html ? <iframe title={`${template.name}, home page`} tabIndex={-1} sandbox="" srcDoc={html} loading="lazy" style={{ transform: `scale(${scale})` }} /> : null}
    </span>
  );
}

function TemplateDetail({
  template: t,
  githubOn,
  currentSite,
  onApplied,
  onBack,
}: {
  template: Template;
  githubOn: boolean;
  currentSite: () => Promise<CurrentSite>;
  onApplied: () => void;
  onBack: () => void;
}) {
  const [target, setTarget] = useState<PreviewTarget>({ kind: "page", path: "/" });
  const [widthId, setWidthId] = useState<WidthId>(() => (narrow() ? "phone" : "desktop"));
  const [asking, setAsking] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const applyRef = useRef<HTMLButtonElement>(null);

  useEffect(() => headingRef.current?.focus(), []);

  const pages = [...t.pages].sort((a, b) => (a.path === "/" ? -1 : b.path === "/" ? 1 : 0));
  const label =
    target.kind === "page" ? (pages.find((p) => p.path === target.path)?.title ?? "") : (t.posts.find((p) => p.slug === target.slug)?.title ?? "");
  const width = widths.find((w) => w.id === widthId)!;

  return (
    <div className="st">
      <header className="st-header">
        <button type="button" className="st-back tp-back" onClick={onBack}>
          <span aria-hidden="true">←</span> All templates
        </button>
        <h1 className="st-title" ref={headingRef} tabIndex={-1}>
          {t.name}
        </h1>
        <div className="st-actions">
          <button ref={applyRef} type="button" className="st-button st-button-primary" onClick={() => setAsking(true)}>
            Use this template
          </button>
        </div>
      </header>
      <main className="tp-detail">
        <nav className="tp-pages" aria-label={`Pages in ${t.name}`}>
          {t.description ? <p className="tp-description">{t.description}</p> : null}
          <h2 className="tp-sub">{pages.length === 1 ? "1 page" : `${pages.length} pages`}</h2>
          <ul>
            {pages.map((p) => (
              <li key={p.path}>
                <button
                  type="button"
                  aria-current={target.kind === "page" && target.path === p.path ? "page" : undefined}
                  onClick={() => setTarget({ kind: "page", path: p.path })}
                >
                  {p.title}
                  <span className="tp-path">{p.path}</span>
                </button>
              </li>
            ))}
          </ul>
          {t.posts.length ? (
            <>
              <h2 className="tp-sub">Blog: {t.posts.length === 1 ? "1 post" : `${t.posts.length} posts`}</h2>
              <ul>
                {t.posts.map((p) => (
                  <li key={p.slug}>
                    <button
                      type="button"
                      aria-current={target.kind === "post" && target.slug === p.slug ? "page" : undefined}
                      onClick={() => setTarget({ kind: "post", slug: p.slug })}
                    >
                      {p.title}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </nav>
        <section className="tp-stage" aria-label="Preview">
          <div className="tp-stage-bar">
            <div className="st-segmented" role="group" aria-label="Preview width">
              {widths.map((w) => (
                <button key={w.id} type="button" className="st-segment" aria-pressed={w.id === widthId} onClick={() => setWidthId(w.id)}>
                  {w.label}
                </button>
              ))}
            </div>
            <p className="tp-legend">Scroll inside the preview to see the whole page. Dashed outlines: sample content to replace.</p>
          </div>
          <TemplatePreview template={t} target={target} width={width.width} height={width.height} title={`${t.name}: ${label}, ${width.label.toLowerCase()} width`} />
        </section>
      </main>
      {asking ? (
        <ConfirmDialog
          template={t}
          githubOn={githubOn}
          currentSite={currentSite}
          onApplied={onApplied}
          onClose={() => {
            setAsking(false);
            focusAfterDialog(() => applyRef.current);
          }}
        />
      ) : null}
    </div>
  );
}

/** Rendered as publishing renders it, scaled to fit, in a frame where no scripts run. */
function TemplatePreview({ template, target, width, height, title }: { template: Template; target: PreviewTarget; width: number; height: number; title: string }) {
  const html = useMemo(() => previewHtml(template, target, baseCss), [template, target]);
  const paneRef = useRef<HTMLDivElement>(null);
  const [paneWidth, setPaneWidth] = useState(0);

  useEffect(() => {
    const pane = paneRef.current;
    if (!pane || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => setPaneWidth(entry?.contentRect.width ?? 0));
    observer.observe(pane);
    return () => observer.disconnect();
  }, []);

  const scale = paneWidth > 0 ? Math.min(1, paneWidth / width) : 1;
  return (
    <div className="tp-pane" ref={paneRef}>
      {html === null ? (
        <p className="st-error">This page can't be shown.</p>
      ) : (
        <div className="tp-frame" style={{ width: width * scale, height: height * scale }}>
          <iframe title={title} sandbox="allow-same-origin" srcDoc={html} style={{ width, height, transform: `scale(${scale})` }} />
        </div>
      )}
    </div>
  );
}

const stepText = (step: ApplyStep, done = 0, total = 0) =>
  step === "photos" ? `Adding photos to your library (${done} of ${total})…` : step === "pages" ? "Replacing pages, style, header and footer…" : "Done.";

function ConfirmDialog({
  template: t,
  githubOn,
  currentSite,
  onApplied,
  onClose,
}: {
  template: Template;
  githubOn: boolean;
  currentSite: () => Promise<CurrentSite>;
  onApplied: () => void;
  onClose: () => void;
}) {
  const id = useId();
  const [plan, setPlan] = useState<ReplacePlan | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string | null>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    void currentSite().then((c) => setPlan(replacePlan(t, c)));
  }, [t, currentSite]);

  const apply = async () => {
    if (busy || !plan) return;
    setBusy(true);
    setError(null);
    const failed = githubOn ? await applyOnGitHub(t, (step, done, total) => setStatus(stepText(step, done, total))) : applyLocally(t);
    if (failed) {
      setBusy(false);
      setStatus("");
      setError(failed);
      return;
    }
    setJustApplied(
      githubOn
        ? `Your site now uses the “${t.name}” template. It's saved to GitHub; visitors see it after you publish.`
        : `Your site now uses the “${t.name}” template, in this browser.`,
    );
    onApplied();
  };

  return (
    <Dialog labelledBy={`${id}-h`} describedBy={`${id}-body`} onClose={busy ? () => undefined : onClose}>
      <div className="pg-form tp-confirm">
        <h2 id={`${id}-h`}>Replace your site with “{t.name}”?</h2>
        <div className="pg-dialog-body" id={`${id}-body`}>
          {plan ? (
            <>
              <div className="tp-lists">
                <div className="tp-list tp-replaced">
                  <h3>Replaced</h3>
                  <ul>
                    {plan.replaced.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                </div>
                <div className="tp-list tp-kept">
                  <h3>Kept</h3>
                  <ul>
                    {plan.kept.map((k) => (
                      <li key={k}>{k}</li>
                    ))}
                  </ul>
                </div>
              </div>
              {plan.notes.map((n) => (
                <p key={n}>{n}</p>
              ))}
              <p>
                {githubOn
                  ? "Your current site stays in the history. Afterwards the Pages screen offers “Bring back my previous site”."
                  : "Your current site is kept in this browser. Afterwards the Pages screen offers “Bring back my previous site”."}
              </p>
            </>
          ) : (
            <p>Checking what your site has…</p>
          )}
        </div>
        <p className="st-status-inline" role="status">
          {status}
        </p>
        {error ? (
          <p className="st-error" role="alert">
            {error}
          </p>
        ) : null}
        <div className="pg-form-actions">
          <button ref={cancelRef} type="button" className="st-button" onClick={onClose} disabled={busy} autoFocus>
            Cancel
          </button>
          <button type="button" className="st-button pg-danger" onClick={apply} aria-disabled={busy || !plan || undefined}>
            {busy ? "Replacing…" : "Replace my site"}
          </button>
        </div>
      </div>
    </Dialog>
  );
}

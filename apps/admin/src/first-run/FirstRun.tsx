/**
 * F060: the welcome screen (design direction A): pick a start, name the
 * site, "Make my site". One screen, a real radio group, keyboard first.
 */
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { siteNameProblem, MAX_NAME } from "../sites/sites";
import { gallerySources, SAMPLE_ID, type GallerySource, type Template } from "../templates/sources";
import { templateFacts } from "../templates/start";
import { Thumbnail } from "../templates/TemplatesScreen";
import { BLANK, BLANK_NAME, landInBuilder, makeFirstSite, starterOrder, stepText, suggestedName, type FirstRunContext, type MakeStep } from "./first-run";
import "../templates/templates.css";
import "./first-run.css";

type Start = { id: string; template: Template | null; loading: boolean; broken: boolean };

/** The free starters, without the builder's own sample site. */
export const starterSources = (): GallerySource[] => gallerySources().filter((s) => s.id !== SAMPLE_ID).sort((a, b) => starterOrder(a.id, b.id));

export interface FirstRunProps {
  context: FirstRunContext;
  sources?: GallerySource[];
  /** After the site is made (the app reloads into the builder). */
  onDone?: (withTemplate: boolean) => void;
}

/** "/Users/rina/Documents/Crust/My site" → "/Users/rina/Documents/Crust". */
const parentFolder = (folder: string) => folder.replace(/[\\/][^\\/]*[\\/]?$/, "") || folder;

export function FirstRun({ context, sources: given, onDone = landInBuilder }: FirstRunProps) {
  const [sources] = useState(() => given ?? starterSources());
  const [starts, setStarts] = useState<Start[]>(() => sources.map((s) => ({ id: s.id, template: null, loading: true, broken: false })));
  const [chosen, setChosen] = useState<string>(() => sources[0]?.id ?? BLANK);
  const [name, setName] = useState("");
  // The field follows the chosen start until the person types a name of their own.
  const [typed, setTyped] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [step, setStep] = useState<MakeStep | null>(null);
  const [error, setError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const ids = useId();

  useEffect(() => {
    document.title = "Welcome · Crust";
    headingRef.current?.focus();
  }, []);

  useEffect(() => {
    let live = true;
    sources.forEach((s, i) => {
      void s
        .load()
        .catch(() => ({ template: null, problems: ["This template couldn't be loaded."] }))
        .then((r) => {
          if (live) setStarts((all) => all.map((c, j) => (j === i ? { id: s.id, template: r.template, loading: false, broken: !r.template } : c)));
        });
    });
    return () => {
      live = false;
    };
  }, [sources]);

  const options = starts.filter((s) => !s.broken);
  const chosenStart = starts.find((s) => s.id === chosen) ?? null;
  // A start that won't load falls back to Blank.
  useEffect(() => {
    if (chosen !== BLANK && chosenStart?.broken) setChosen(BLANK);
  }, [chosen, chosenStart?.broken]);
  const suggestion = chosen === BLANK ? BLANK_NAME : chosenStart?.template ? suggestedName(chosenStart.template) : "";
  const shownName = typed ? name : suggestion;

  const working = step !== null;
  const waiting = chosen !== BLANK && !chosenStart?.template;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (working || waiting) return;
    const found = siteNameProblem(shownName, []);
    setProblem(found);
    if (found) {
      nameRef.current?.focus();
      return;
    }
    setError(null);
    const template = chosen === BLANK ? null : (chosenStart?.template ?? null);
    const failed = await makeFirstSite(context, shownName, template, setStep);
    if (failed) {
      setStep(null);
      setError(failed);
      return;
    }
    onDone(template !== null);
  };

  return (
    <div className="st fr">
      <main className="pg fr-main">
        <h1 className="st-title fr-title" ref={headingRef} tabIndex={-1}>
          Welcome to Crust
        </h1>
        <p className="st-lede fr-lede">
          Make a website on your computer and publish it wherever you like. Pick a start, name your site, and you’re in. No account needed.
        </p>
        <form className="fr-form" onSubmit={submit} noValidate aria-busy={working || undefined}>
          <fieldset className="fr-starts" disabled={working}>
            <legend className="fr-legend">1. Start from</legend>
            <ul className="fr-grid" aria-busy={starts.some((s) => s.loading) || undefined}>
              {options.map((s) => (
                <li key={s.id}>
                  <label className={`fr-card${chosen === s.id ? " fr-on" : ""}`}>
                    {s.template ? <Thumbnail template={s.template} /> : <span className="tp-thumb fr-thumb-wait" aria-hidden="true" />}
                    <span className="fr-meta">
                      <span className="fr-pick">
                        <input
                          type="radio"
                          name={`${ids}-start`}
                          value={s.id}
                          checked={chosen === s.id}
                          disabled={!s.template}
                          onChange={() => setChosen(s.id)}
                        />
                        <strong>{s.template?.name ?? "Loading a template…"}</strong>
                      </span>
                      {s.template ? (
                        <>
                          <span className="fr-desc">{s.template.description}</span>
                          <span className="fr-facts">{templateFacts(s.template)}</span>
                        </>
                      ) : null}
                    </span>
                  </label>
                </li>
              ))}
              <li>
                <label className={`fr-card${chosen === BLANK ? " fr-on" : ""}`}>
                  <span className="tp-thumb fr-blank" aria-hidden="true" />
                  <span className="fr-meta">
                    <span className="fr-pick">
                      <input type="radio" name={`${ids}-start`} value={BLANK} checked={chosen === BLANK} onChange={() => setChosen(BLANK)} />
                      <strong>Blank</strong>
                    </span>
                    <span className="fr-desc">One empty Home page and the plain Crust look, to build up yourself.</span>
                    <span className="fr-facts">1 page</span>
                  </span>
                </label>
              </li>
            </ul>
          </fieldset>
          <div className="fr-name">
            <label className="fr-legend" htmlFor={`${ids}-name`}>
              2. Your site’s name
            </label>
            <div className="fr-row">
              <input
                ref={nameRef}
                id={`${ids}-name`}
                className="st-input fr-input"
                value={shownName}
                maxLength={MAX_NAME + 20}
                autoComplete="off"
                disabled={working}
                aria-invalid={problem ? true : undefined}
                aria-describedby={problem ? `${ids}-problem` : `${ids}-hint`}
                onChange={(e) => {
                  setTyped(true);
                  setName(e.currentTarget.value);
                  setProblem(null);
                }}
              />
              <button type="submit" className="st-button st-button-primary fr-make" disabled={working || waiting}>
                Make my site
              </button>
            </div>
            {problem ? (
              <p id={`${ids}-problem`} className="st-error">
                {problem}
              </p>
            ) : (
              <p id={`${ids}-hint`} className="fr-hint">
                You can change it later. Sites are kept in {parentFolder(context.folder)} on this computer.
              </p>
            )}
          </div>
          <p className="fr-status" role="status">
            {step ? stepText(step) : waiting ? "Loading the template…" : ""}
          </p>
          {error ? (
            <p className="st-error fr-error" role="alert">
              {error}
            </p>
          ) : null}
        </form>
      </main>
    </div>
  );
}

/**
 * F087 Page first (take A of design/f087-page-first-v1.html): the page
 * fills the canvas at fit width, and the right panel follows what you
 * pick. With nothing picked there's no panel, unless you asked for the
 * page's settings or a new site's "Next steps" list is open.
 */
import { findPlaceholders } from "@crust/blocks";
import { createUsePuck, useGetPuck, type Config } from "@puckeditor/core";
import { createContext, useContext, useEffect, useId, useRef, type ReactNode } from "react";
import { FrameIcon } from "../app-frame/icons";
import {
  fitWidth,
  isDesktopWidth,
  panelMode,
  setPanelMode,
  setStepDone,
  showNextSteps,
  skipNextSteps,
  startNextSteps,
  useNextSteps,
  usePanelMode,
  type StepId,
} from "./store";

const usePuck = createUsePuck();

export interface PageFirstInfo {
  /** Which site's Next steps list (kept per site). */
  site: string;
  /** "Page settings" or "Post settings". */
  settingsLabel: string;
}

export const PageFirstContext = createContext<PageFirstInfo>({ site: "", settingsLabel: "Page settings" });

/** The right panel's heading with nothing selected says whose settings these are. */
export function withSettingsLabel<C extends Config>(config: C, label: string): C {
  return { ...config, root: { ...config.root, label } } as C;
}

/** Puck's canvas frame (its content box is the room the page has). */
function canvasFrame(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[class*="_PuckCanvas-inner_"]');
}

function contentWidth(el: HTMLElement): number {
  const s = getComputedStyle(el);
  return el.clientWidth - (parseFloat(s.paddingLeft) || 0) - (parseFloat(s.paddingRight) || 0);
}

/**
 * Inside Puck; renders nothing. Keeps Desktop at fit width, shows the
 * right panel while something is selected (or asked for), and opens a new
 * site's Next steps.
 */
export function PageFirstWatcher() {
  const { site } = useContext(PageFirstContext);
  const selected = usePuck((s) => s.appState.ui.itemSelector);
  const width = usePuck((s) => s.appState.ui.viewports.current.width);
  const getPuck = useGetPuck();
  const mode = usePanelMode();

  // A new site opens with its Next steps; otherwise nothing is open.
  useEffect(() => {
    // F091: "Page settings" in the Pages panel opens a page with its settings showing.
    setPanelMode(/[?&]settings=1\b/.test(location.hash) ? "page" : site && startNextSteps(site).show ? "next" : null);
    return () => setPanelMode(null);
  }, [site]);

  // Picking something shows its settings; page settings make way for it.
  useEffect(() => {
    if (selected && panelMode() === "page") setPanelMode(null);
  }, [selected]);

  useEffect(() => {
    const want = !!selected || mode !== null;
    const puck = getPuck();
    if (puck.appState.ui.rightSideBarVisible !== want) puck.dispatch({ type: "setUi", ui: { rightSideBarVisible: want }, recordHistory: false });
  }, [selected, mode, getPuck]);

  // Fit width: on Desktop the page is as wide as the canvas (at least a desktop), so it shows at 100%.
  useEffect(() => {
    if (!isDesktopWidth(width)) return;
    const frame = canvasFrame();
    if (!frame) return;
    const fit = () => {
      const puck = getPuck();
      const { viewports } = puck.appState.ui;
      if (!isDesktopWidth(viewports.current.width)) return;
      const w = fitWidth(contentWidth(frame));
      if (w === viewports.current.width) return;
      puck.dispatch({ type: "setUi", ui: { viewports: { ...viewports, current: { ...viewports.current, width: w } } }, recordHistory: false });
    };
    fit();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(fit);
    observer.observe(frame);
    return () => observer.disconnect();
  }, [width, getPuck]);

  return null;
}

/** Beside the page switcher: the page's title, description and search settings, in the right panel. */
export function SettingsButton() {
  const { settingsLabel } = useContext(PageFirstContext);
  const mode = usePanelMode();
  const selected = usePuck((s) => s.appState.ui.itemSelector);
  const getPuck = useGetPuck();
  const on = mode === "page" && !selected;
  return (
    <button
      type="button"
      className="af-icon-button"
      aria-pressed={on}
      aria-label={settingsLabel}
      title={settingsLabel}
      onClick={() => {
        if (on) return setPanelMode(null);
        getPuck().dispatch({ type: "setUi", ui: { itemSelector: null }, recordHistory: false });
        setPanelMode("page");
      }}
    >
      <FrameIcon name="sliders" />
    </button>
  );
}

/** The top bar's panel button: with nothing selected it opens or closes the page's settings. */
export function usePanelToggle(): { shown: boolean; toggle: () => void } {
  const shown = usePuck((s) => s.appState.ui.rightSideBarVisible);
  const selected = usePuck((s) => s.appState.ui.itemSelector);
  const getPuck = useGetPuck();
  return {
    shown,
    toggle: () => {
      if (!selected) return setPanelMode(shown ? null : "page");
      getPuck().dispatch({ type: "setUi", ui: { rightSideBarVisible: !shown }, recordHistory: false });
    },
  };
}

/** Help panel: brings Next steps back after Skip. */
export function NextStepsLink() {
  const { site } = useContext(PageFirstContext);
  const getPuck = useGetPuck();
  return (
    <button
      type="button"
      className="af-panel-link"
      onClick={() => {
        showNextSteps(site);
        getPuck().dispatch({ type: "setUi", ui: { itemSelector: null }, recordHistory: false });
        setPanelMode("next");
      }}
    >
      Next steps for a new site
    </button>
  );
}

interface Step {
  id: StepId;
  label: string;
  hint: string;
  action?: { label: string; run: () => void };
}

function NextSteps() {
  const { site, settingsLabel } = useContext(PageFirstContext);
  const state = useNextSteps(site);
  const content = usePuck((s) => s.appState.data.content);
  const description = usePuck((s) => (s.appState.data.root?.props as { description?: string } | undefined)?.description);
  const width = usePuck((s) => s.appState.ui.viewports.current.width);
  const getPuck = useGetPuck();
  const id = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Counted like the "To replace" list: words and photos still to change.
  const leftToReplace = findPlaceholders(content).reduce((n, p) => n + p.fields.length, 0);
  // Steps tick themselves when the work is visibly done.
  useEffect(() => {
    if (leftToReplace === 0) setStepDone(site, "words", true);
  }, [leftToReplace, site]);
  useEffect(() => {
    if (description?.trim()) setStepDone(site, "page", true);
  }, [description, site]);
  useEffect(() => {
    if (width === 375) setStepDone(site, "phone", true);
  }, [width, site]);

  const steps: Step[] = [
    {
      id: "words",
      label: "Replace the sample words and photos",
      hint: leftToReplace ? `${leftToReplace} left: see "To replace" at the top.` : "Click any words on the page to change them.",
    },
    {
      id: "page",
      label: "Describe the page for search",
      hint: "A sentence people see under the page's name in search results.",
      action: { label: settingsLabel, run: () => setPanelMode("page") },
    },
    {
      id: "phone",
      label: "See it on a phone",
      hint: "Most visitors will.",
      action: {
        label: "Switch to phone width",
        run: () => {
          const puck = getPuck();
          const { viewports } = puck.appState.ui;
          puck.dispatch({ type: "setUi", ui: { viewports: { ...viewports, current: { width: 375, height: "auto" } } }, recordHistory: false });
        },
      },
    },
    { id: "publish", label: "Publish when you're ready", hint: "Publish is at the top right. Visitors see nothing until then." },
  ];
  const doneCount = steps.filter((s) => state.done.includes(s.id)).length;

  return (
    <section className="pf-next" aria-labelledby={`${id}-h`}>
      <div className="pf-next-head">
        <h2 id={`${id}-h`} ref={headingRef} tabIndex={-1} className="pf-next-title">
          Next steps
        </h2>
        <button
          type="button"
          className="af-button pf-skip"
          onClick={() => {
            skipNextSteps(site);
            setPanelMode(null);
          }}
        >
          Skip
        </button>
      </div>
      <p className="pf-next-count" aria-live="polite">
        {doneCount === steps.length ? "All done. Skip closes this list." : `${doneCount} of ${steps.length} done`}
      </p>
      <ul className="pf-steps">
        {steps.map((s) => {
          const done = state.done.includes(s.id);
          return (
            <li key={s.id} className="pf-step" data-done={done || undefined}>
              <input id={`${id}-${s.id}`} type="checkbox" checked={done} onChange={(e) => setStepDone(site, s.id, e.target.checked)} />
              <div>
                <label htmlFor={`${id}-${s.id}`}>{s.label}</label>
                <p className="pf-step-hint">{s.hint}</p>
                {s.action && !done ? (
                  <button type="button" className="af-panel-link pf-step-action" onClick={s.action.run}>
                    {s.action.label}
                  </button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
      <p className="pf-step-hint">You can bring this list back from Help.</p>
    </section>
  );
}

/** overrides.fields: Next steps in place of the page's settings while that list is open. */
export function SettingsPanel({ children, itemSelector }: { children: ReactNode; itemSelector?: unknown }) {
  const mode = usePanelMode();
  if (!itemSelector && mode === "next") return <NextSteps />;
  return <>{children}</>;
}

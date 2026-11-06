/**
 * F086: the builder's top bar (Puck's `header` override). The frame's bar
 * with the page switcher, the device toggle, undo and redo, Preview, and
 * the save status. Puck's own viewport buttons on the canvas are hidden
 * (app-frame.css); the zoom stays there.
 */
import { createUsePuck, type Viewport } from "@puckeditor/core";
import { createContext, useContext, type ReactNode } from "react";
import { PlaceholderChecklist } from "../placeholders/Checklist";
import { AppTopBar } from "./AppTopBar";
import { FrameIcon, type FrameIconName } from "./icons";
import type { SavePhase } from "./autosave";

const usePuck = createUsePuck();

export interface EditorFrame {
  /** Where you are: the page switcher, or the post's name. */
  where: ReactNode;
  phase: SavePhase;
  /** The widths the device toggle offers (the builder's viewports). */
  devices?: Viewport[];
}

export const EditorFrameContext = createContext<EditorFrame>({ where: null, phase: "saved" });

const deviceIcon: Record<string, FrameIconName> = { Desktop: "desktop", Tablet: "tablet", Mobile: "phone" };
const deviceName: Record<string, string> = { Desktop: "Desktop width", Tablet: "Tablet width", Mobile: "Phone width" };

function DeviceToggle() {
  const options = useContext(EditorFrameContext).devices;
  const viewports = usePuck((s) => s.appState.ui.viewports);
  const dispatch = usePuck((s) => s.dispatch);
  if (!options?.length) return null;
  return (
    <div className="af-seg" role="group" aria-label="Page width">
      {options.map((v) => {
        const label = v.label ?? `${v.width}px`;
        const on = viewports.current.width === v.width;
        return (
          <button
            key={label}
            type="button"
            className="af-icon-button"
            aria-pressed={on}
            aria-label={deviceName[label] ?? label}
            title={deviceName[label] ?? label}
            onClick={() =>
              dispatch({
                type: "setUi",
                ui: { viewports: { ...viewports, current: { width: v.width, height: v.height ?? "auto" } } },
                recordHistory: false,
              })
            }
          >
            <FrameIcon name={deviceIcon[label] ?? "desktop"} />
          </button>
        );
      })}
    </div>
  );
}

function UndoRedo() {
  const back = usePuck((s) => s.history.back);
  const forward = usePuck((s) => s.history.forward);
  const hasPast = usePuck((s) => s.history.hasPast);
  const hasFuture = usePuck((s) => s.history.hasFuture);
  return (
    <>
      <button type="button" className="af-icon-button" aria-label="Undo" title="Undo" disabled={!hasPast} onClick={() => back()}>
        <FrameIcon name="undo" />
      </button>
      <button type="button" className="af-icon-button" aria-label="Redo" title="Redo" disabled={!hasFuture} onClick={() => forward()}>
        <FrameIcon name="redo" />
      </button>
    </>
  );
}

/** The settings panel on the right: shown or hidden (F087 makes it follow the selection). */
function PanelToggle() {
  const shown = usePuck((s) => s.appState.ui.rightSideBarVisible);
  const dispatch = usePuck((s) => s.dispatch);
  return (
    <button
      type="button"
      className="af-icon-button"
      aria-pressed={shown}
      aria-label="Settings panel"
      title={shown ? "Hide the settings panel" : "Show the settings panel"}
      onClick={() => dispatch({ type: "setUi", ui: { rightSideBarVisible: !shown }, recordHistory: false })}
    >
      <FrameIcon name="panel" />
    </button>
  );
}

/** Preview: the page as visitors use it (links and buttons work), pressed again to edit. */
function PreviewButton() {
  const mode = usePuck((s) => s.appState.ui.previewMode);
  const dispatch = usePuck((s) => s.dispatch);
  const on = mode === "interactive";
  return (
    <button
      type="button"
      className="af-button"
      aria-pressed={on}
      onClick={() => dispatch({ type: "setUi", ui: { previewMode: on ? "edit" : "interactive" }, recordHistory: false })}
    >
      Preview
    </button>
  );
}

export function EditorBar() {
  const { where, phase } = useContext(EditorFrameContext);
  return (
    <AppTopBar
      where={where}
      tools={
        <>
          <PlaceholderChecklist />
          <DeviceToggle />
          <UndoRedo />
          <PanelToggle />
          <span className="af-divider" aria-hidden="true" />
        </>
      }
      phase={phase}
      beforePublish={<PreviewButton />}
    />
  );
}

/** The page switcher: a real select, so it works with the keyboard and screen readers as it is. */
export function PageSwitcher({ current, pages, hrefFor }: { current: string; pages: { path: string; title: string }[]; hrefFor: (path: string) => string }) {
  const list = pages.some((p) => p.path === current) ? pages : [{ path: current, title: current }, ...pages];
  return (
    <label className="af-switch">
      <span className="af-switch-label">Page</span>
      <select
        value={current}
        onChange={(e) => {
          location.hash = hrefFor(e.currentTarget.value);
        }}
      >
        {list.map((p) => (
          <option key={p.path} value={p.path}>
            {p.title || p.path}
          </option>
        ))}
      </select>
    </label>
  );
}

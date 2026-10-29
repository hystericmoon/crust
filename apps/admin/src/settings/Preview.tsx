import type { ColorRole, Page, Site } from "@crust/blocks";
import baseCss from "@crust/blocks/styles.css?raw";
import { renderPage } from "@crust/render";
import { useDeferredValue, useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { roleForElement } from "./pick";

const widths = [
  { id: "desktop", label: "Desktop", width: 1280 },
  { id: "tablet", label: "Tablet", width: 768 },
  { id: "mobile", label: "Mobile", width: 375 },
] as const;
type WidthId = (typeof widths)[number]["id"];

/**
 * The Home page exactly as the publish step renders it, in a sandboxed
 * iframe scaled to fit. No scripts run inside it.
 */
export interface PreviewProps {
  site: Site;
  page: Page;
  /** Narrow screens: the preview can be collapsed to a bar. */
  open: boolean;
  onToggle: () => void;
  /** Click on the preview: which colour styles that spot (pointer shortcut, F014). */
  onPick?: (role: ColorRole, el?: Element) => void;
}

const narrow = () => typeof matchMedia === "function" && matchMedia("(max-width: 899px)").matches;

export function Preview({ site, page, open, onToggle, onPick }: PreviewProps) {
  const deferredSite = useDeferredValue(site);
  // On a phone, start with the phone layout; a scaled-down desktop page is unreadable there.
  const [widthId, setWidthId] = useState<WidthId>(() => (narrow() ? "mobile" : "desktop"));
  const width = widths.find((w) => w.id === widthId)!.width;
  const paneRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [paneWidth, setPaneWidth] = useState(0);
  const [contentHeight, setContentHeight] = useState(800);

  const html = useMemo(() => {
    try {
      return renderPage(deferredSite, page, baseCss);
    } catch {
      return null;
    }
  }, [deferredSite, page]);

  useEffect(() => {
    const pane = paneRef.current;
    if (!pane) return;
    const observer = new ResizeObserver(([entry]) => setPaneWidth(entry?.contentRect.width ?? 0));
    observer.observe(pane);
    return () => observer.disconnect();
  }, []);

  const measure = () => {
    const doc = frameRef.current?.contentDocument;
    // The body, not <html>: <html> is never shorter than the iframe itself.
    if (doc?.body) setContentHeight(Math.max(200, Math.ceil(doc.body.getBoundingClientRect().height)));
  };

  // Re-measure when the width changes: text reflows, so the height does too.
  useEffect(() => {
    const id = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(id);
  }, [width, html]);

  const scale = paneWidth > 0 ? Math.min(1, paneWidth / width) : 1;

  // The iframe ignores the pointer (no scripts run in it); map the click on
  // the stage back into the page's own coordinates instead.
  const pick = (e: MouseEvent<HTMLDivElement>) => {
    const doc = frameRef.current?.contentDocument;
    if (!onPick || !doc) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const el = doc.elementFromPoint((e.clientX - rect.left) / scale, (e.clientY - rect.top) / scale);
    if (el) onPick(roleForElement(el), el);
  };

  return (
    <div className="st-preview">
      <div className="st-preview-bar">
        <span className="st-preview-title">Home page preview</span>
        <div className="st-segmented" role="group" aria-label="Preview width">
          {widths.map((w) => (
            <button
              key={w.id}
              type="button"
              className="st-segment"
              aria-pressed={w.id === widthId}
              onClick={() => setWidthId(w.id)}
            >
              {w.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="st-button st-preview-toggle"
          aria-expanded={open}
          aria-controls="st-preview-pane"
          onClick={onToggle}
        >
          {open ? "Hide" : "Show"}
          <span className="st-sr"> preview</span>
        </button>
        {onPick ? <p className="st-preview-hint">Click part of the page to jump to its settings.</p> : null}
      </div>
      <div className="st-preview-pane" id="st-preview-pane" ref={paneRef}>
        {html === null ? (
          <p className="st-preview-error">The preview can't show these settings. Fix the fields marked in red.</p>
        ) : (
          <div
            className={onPick ? "st-preview-stage is-pickable" : "st-preview-stage"}
            style={{ width: width * scale, height: contentHeight * scale }}
            onClick={pick}
            title={onPick ? "Click part of the page to find its settings" : undefined}
          >
            <iframe
              ref={frameRef}
              title="Home page preview"
              sandbox="allow-same-origin"
              tabIndex={-1}
              srcDoc={html}
              onLoad={measure}
              style={{ width, height: contentHeight, transform: `scale(${scale})` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

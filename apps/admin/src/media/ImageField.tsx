/**
 * An image field (F034): the chosen photo with "Choose image", which opens
 * the media library, and "Use a web address instead" for pasted addresses,
 * which keep working as before.
 */
import { mediaFileOf, safeUrl } from "@crust/blocks";
import { useEffect, useId, useRef } from "react";
import { openMediaPicker } from "./MediaPicker";
import { findMedia, loadMedia, useMedia } from "./store";

/** A short name for an address: the library file, or the end of a web address. */
export function imageName(src: string): string {
  const file = mediaFileOf(src);
  if (file) return file;
  const clean = src.trim().replace(/[?#].*$/, "");
  return clean.split("/").filter(Boolean).pop() ?? clean;
}

export interface ImageFieldProps {
  label: string;
  value: string;
  onChange: (src: string) => void;
  /**
   * Replaces onChange when a library photo is picked, with its alt text, so a
   * field that has alt text can set both at once.
   */
  onPick?: (src: string, alt: string) => void;
  /** Extra words for screen readers, e.g. "Photo 2". */
  context?: string;
  /** id for the first control, so lists can move focus here. */
  firstId?: string;
}

export function ImageField({ label, value, onChange, onPick, context, firstId }: ImageFieldProps) {
  useMedia();
  // Library photos show their size once the library has loaded.
  useEffect(() => void loadMedia(), []);
  const id = useId();
  const choose = useRef<HTMLButtonElement>(null);
  const urlBox = useRef<HTMLDetailsElement>(null);
  const src = value?.trim() ?? "";
  const file = mediaFileOf(src);
  const item = findMedia(file);
  const external = !!src && !file;
  const forWhat = context ? `${label}, ${context}` : label;

  const open = () => {
    const opened = openMediaPicker({
      current: src,
      fieldLabel: forWhat,
      returnFocus: choose.current,
      onPick: (next, alt) => (onPick ? onPick(next, alt) : onChange(next)),
    });
    if (!opened && urlBox.current) {
      urlBox.current.open = true;
      document.getElementById(`${id}-url`)?.focus();
    }
  };

  return (
    <div className="mf-field" role="group" aria-labelledby={`${id}-label`}>
      <span className="mf-label" id={`${id}-label`}>
        {label}
        {context ? <span className="mp-sr">, {context}</span> : null}
      </span>
      {src ? (
        <div className="mf-current">
          <img className="mf-thumb" src={safeUrl(src)} alt="" />
          <div className="mf-info">
            <span className="mf-name" title={src}>
              {imageName(src)}
            </span>
            <span className="mf-sub">{item ? `${item.width} × ${item.height}` : external ? "Web address" : file ? "From your library" : ""}</span>
          </div>
        </div>
      ) : (
        <p className="mf-empty">No image yet.</p>
      )}
      <div className="mf-actions">
        <button ref={choose} id={firstId} type="button" className="mf-button mf-primary" aria-describedby={`${id}-label`} onClick={open}>
          {src ? "Change image" : "Choose image"}
        </button>
        {src ? (
          <button type="button" className="mf-button" aria-label={`Remove ${forWhat.toLowerCase()}`} onClick={() => onChange("")}>
            Remove
          </button>
        ) : null}
      </div>
      <details ref={urlBox} className="mf-url" open={external || undefined}>
        <summary>Use a web address instead</summary>
        <label className="mp-sr" htmlFor={`${id}-url`}>
          Web address for {forWhat.toLowerCase()}
        </label>
        <input id={`${id}-url`} className="mf-input" type="url" inputMode="url" placeholder="https://…" value={external ? src : ""} onChange={(e) => onChange(e.target.value)} />
      </details>
    </div>
  );
}

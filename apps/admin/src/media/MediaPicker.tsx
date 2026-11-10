/**
 * "Choose an image" (F034, direction A): one dialog for every image field.
 * Upload (button or drop), search, a grid of photos and a details pane where
 * the alt text is required before a photo can be used. F081: the details
 * pane also sets the photo's focal point (FocusPicker).
 *
 * Mounted once in the app; image fields open it with openMediaPicker().
 */
import { formatBytes, mediaFileOf, mediaSrc, type MediaItem } from "@crust/blocks";
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { ACCEPT } from "./shrink";
import { CENTRE, FocusPicker, sameFocus, type Focus } from "./FocusPicker";
import { addPhoto, describePhoto, loadMedia, removePhoto, savePhotoDetails, useMedia } from "./store";

export interface PickRequest {
  /** The field's current address, to start on that photo. */
  current: string;
  /** What the field is for, e.g. "Image" or "Logo" (the dialog's subtitle). */
  fieldLabel: string;
  onPick: (src: string, alt: string) => void;
  /** Where focus goes back to when the dialog closes. */
  returnFocus?: HTMLElement | null;
}

let opener: ((req: PickRequest) => void) | null = null;
/** Opens the picker; false when it isn't mounted (then the field falls back to typing an address). */
export function openMediaPicker(req: PickRequest): boolean {
  if (!opener) return false;
  opener(req);
  return true;
}

/** Photos whose alt text or file name contain every word typed. */
export function filterMedia(items: MediaItem[], query: string): MediaItem[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return items;
  return items.filter((i) => {
    const text = `${i.alt} ${i.file}`.toLowerCase();
    return words.every((w) => text.includes(w));
  });
}

/** Columns in a CSS grid, for arrow keys up and down. */
const columnsOf = (el: HTMLElement | null) => (el ? getComputedStyle(el).gridTemplateColumns.split(" ").filter(Boolean).length || 1 : 1);

export function MediaPicker() {
  const dialog = useRef<HTMLDialogElement>(null);
  const grid = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const altInput = useRef<HTMLTextAreaElement>(null);
  const details = useRef<HTMLDivElement>(null);
  const id = useId();
  const media = useMedia();
  const [req, setReq] = useState<PickRequest | null>(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  // Alt text being typed, for one photo; any other photo shows its saved alt text.
  const [draft, setDraft] = useState<{ file: string; alt: string; touched: boolean } | null>(null);
  // F081: the focal point being picked, for one photo.
  const [focusDraft, setFocusDraft] = useState<{ file: string; focus: Focus } | null>(null);
  const [busy, setBusy] = useState<string>("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    opener = (r) => {
      setReq(r);
      setQuery("");
      setErrors([]);
      setMessage("");
      setConfirmDelete(false);
      const file = mediaFileOf(r.current);
      setSelected(file);
      void loadMedia();
      const el = dialog.current;
      if (el && !el.open) el.showModal?.();
      requestAnimationFrame(() => (grid.current?.querySelector<HTMLElement>('[tabindex="0"]') ?? fileInput.current?.parentElement?.querySelector("button"))?.focus());
    };
    return () => {
      opener = null;
    };
  }, []);

  const item = media.items.find((i) => i.file === selected) ?? null;
  const mine = item && draft?.file === item.file ? draft : null;
  const alt = mine ? mine.alt : (item?.alt ?? "");
  const altTouched = mine?.touched ?? false;
  const setAlt = (text: string) => item && setDraft({ file: item.file, alt: text, touched: altTouched });
  const setAltTouched = (touched: boolean) => item && setDraft({ file: item.file, alt, touched });

  const shown = useMemo(() => filterMedia(media.items, query), [media.items, query]);
  const usedOn = item ? (media.usage[item.file] ?? []) : [];
  const altMissing = !alt.trim();
  const altChanged = !!item && alt.trim() !== item.alt;
  const focus = item && focusDraft?.file === item.file ? focusDraft.focus : (item?.focus ?? CENTRE);
  const focusChanged = !!item && !sameFocus(focus, item.focus);
  const setFocus = (f: Focus) => item && setFocusDraft({ file: item.file, focus: f });

  /** Saves what changed: alt text, focal point or both (one commit). */
  const saveChanges = async (): Promise<boolean> => {
    if (!item) return false;
    setBusy("Saving…");
    const res = focusChanged ? await savePhotoDetails(item.file, altChanged ? alt.trim() : item.alt, sameFocus(focus, CENTRE) ? null : focus) : await describePhoto(item.file, alt.trim());
    setBusy("");
    if (!res.ok) setErrors([res.error]);
    else if (focusChanged) setFocusDraft(null);
    return res.ok;
  };
  const uploadsOff = media.status === "off";

  const close = () => dialog.current?.close();
  const select = (file: string, focus = false) => {
    setSelected(file);
    setConfirmDelete(false);
    if (focus) requestAnimationFrame(() => grid.current?.querySelector<HTMLElement>(`[data-file="${file}"]`)?.focus());
    // On a phone the details are below the grid.
    if (window.matchMedia?.("(max-width: 760px)").matches) {
      const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      requestAnimationFrame(() => details.current?.scrollIntoView?.({ behavior: smooth ? "smooth" : "auto", block: "nearest" }));
    }
  };

  const upload = async (files: File[]) => {
    if (!files.length || busy) return;
    setErrors([]);
    const problems: string[] = [];
    let last: MediaItem | null = null;
    for (const [n, file] of files.entries()) {
      setBusy(files.length > 1 ? `Uploading ${n + 1} of ${files.length}…` : `Uploading ${file.name}…`);
      const res = await addPhoto(file);
      if (res.ok) last = res.item;
      else problems.push(res.error);
    }
    setBusy("");
    setErrors(problems);
    if (last) {
      setQuery("");
      setSelected(last.file);
      const count = files.length - problems.length;
      setMessage(`${count === 1 ? `Uploaded ${last.file}` : `Uploaded ${count} photos`}. Describe it in Alt text.`);
      // Alt text is asked for right away.
      requestAnimationFrame(() => altInput.current?.focus());
    }
  };

  const use = async () => {
    if (!item || !req) return;
    setAltTouched(true);
    if (altMissing) {
      altInput.current?.focus();
      return;
    }
    if ((altChanged || focusChanged) && !(await saveChanges())) return;
    req.onPick(mediaSrc(item.file), alt.trim());
    close();
  };

  const saveAlt = async () => {
    if (!item) return;
    // Alt text can't be emptied; a focal point can be saved before there's alt text.
    if (altChanged) {
      setAltTouched(true);
      if (altMissing) return;
    }
    const what = altChanged && focusChanged ? "Alt text and focal point saved." : focusChanged ? "Focal point saved." : "Alt text saved.";
    if (await saveChanges()) setMessage(what);
  };

  const remove = async () => {
    if (!item) return;
    const index = shown.findIndex((i) => i.file === item.file);
    setBusy("Deleting…");
    const res = await removePhoto(item.file);
    setBusy("");
    setConfirmDelete(false);
    if (!res.ok) {
      setErrors([res.error]);
      return;
    }
    setMessage(`Deleted ${item.file}.`);
    const next = shown.filter((i) => i.file !== item.file)[Math.max(0, index - 1)];
    setSelected(next?.file ?? null);
    requestAnimationFrame(() => (next ? grid.current?.querySelector<HTMLElement>(`[data-file="${next.file}"]`) : fileInput.current?.parentElement?.querySelector("button"))?.focus());
  };

  // One tab stop for the whole grid; arrow keys move between photos (radio group pattern).
  const onGridKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = shown.findIndex((p) => p.file === selected);
    const cols = columnsOf(grid.current);
    const step: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: cols, ArrowUp: -cols };
    let next: number | null = null;
    // With nothing picked yet, any arrow picks the photo that has focus (the first).
    if (e.key in step) next = i < 0 ? 0 : Math.min(shown.length - 1, Math.max(0, i + step[e.key]!));
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = shown.length - 1;
    else if (e.key === "Enter" && item) {
      e.preventDefault();
      void use();
      return;
    }
    const target = next === null ? undefined : shown[next];
    if (!target) return;
    e.preventDefault();
    select(target.file, true);
  };

  const tabStop = shown.some((p) => p.file === selected) ? selected : (shown[0]?.file ?? null);
  const describedBy = [`${id}-alt-hint`, altTouched && altMissing ? `${id}-alt-error` : ""].filter(Boolean).join(" ");

  return (
    <dialog
      ref={dialog}
      className="mp-dialog"
      aria-labelledby={`${id}-title`}
      onClose={() => {
        const back = req?.returnFocus;
        setReq(null);
        back?.focus();
      }}
      onClick={(e) => {
        if (e.target === dialog.current) close();
      }}
    >
      {req ? (
        <div
          className={dragging ? "mp-box is-dragging" : "mp-box"}
          onDragOver={(e) => {
            if (uploadsOff || !e.dataTransfer.types.includes("Files")) return;
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={(e) => {
            if (e.currentTarget === e.target) setDragging(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            if (!uploadsOff) void upload([...e.dataTransfer.files]);
          }}
        >
          <header className="mp-head">
            <div className="mp-head-text">
              <h2 id={`${id}-title`}>Choose an image</h2>
              <p className="mp-for">For: {req.fieldLabel}</p>
            </div>
            <input
              type="search"
              className="mp-search"
              placeholder="Search by alt text or name"
              aria-label="Search photos"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button type="button" className="mp-button" onClick={close}>
              Close
            </button>
          </header>

          <div className="mp-body">
            <div className="mp-library">
              <div className="mp-drop">
                <button type="button" className="mp-button mp-primary" disabled={uploadsOff || !!busy} onClick={() => fileInput.current?.click()}>
                  Upload photos
                </button>
                <span className="mp-drop-text">or drop them here · JPG, PNG, WebP up to 20 MB · big photos are shrunk to 2400 px</span>
                <input
                  ref={fileInput}
                  type="file"
                  accept={ACCEPT}
                  multiple
                  hidden
                  onChange={(e) => {
                    const files = [...(e.target.files ?? [])];
                    e.target.value = "";
                    void upload(files);
                  }}
                />
              </div>
              <p className="mp-status" role="status">
                {busy || message}
              </p>
              {errors.length ? (
                <ul className="mp-errors" role="alert">
                  {errors.map((err) => (
                    <li key={err}>{err}</li>
                  ))}
                </ul>
              ) : null}

              {media.status === "loading" || media.status === "idle" ? (
                <p className="mp-note">Loading your photos…</p>
              ) : media.status === "off" ? (
                <p className="mp-note">The photo library needs saving to be switched on, which works on crust-admin.pages.dev. Here you can still type a web address in the image field.</p>
              ) : media.status === "error" ? (
                <p className="mp-note">
                  {media.error}{" "}
                  <button type="button" className="mp-link" onClick={() => void loadMedia(true)}>
                    Try again
                  </button>
                </p>
              ) : !media.items.length ? (
                <p className="mp-note">No photos yet. Upload photos from your Mac or phone; they stay in your site's library and can be used on any page.</p>
              ) : !shown.length ? (
                <p className="mp-note">No photos match "{query}".</p>
              ) : (
                <div ref={grid} className="mp-grid" role="radiogroup" aria-label={`Photos (${shown.length})`} onKeyDown={onGridKey}>
                  {shown.map((p) => (
                    <button
                      key={p.file}
                      type="button"
                      role="radio"
                      data-file={p.file}
                      className="mp-photo"
                      aria-checked={p.file === selected}
                      tabIndex={p.file === tabStop ? 0 : -1}
                      aria-label={p.alt ? p.alt : `${p.file} (needs alt text)`}
                      onClick={() => select(p.file)}
                      onDoubleClick={() => p.alt && void use()}
                    >
                      <img src={mediaSrc(p.file)} alt="" loading="lazy" decoding="async" />
                      {!p.alt ? (
                        <span className="mp-badge" aria-hidden="true">
                          Needs alt
                        </span>
                      ) : null}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="mp-details" ref={details} aria-labelledby={`${id}-details`} role="region">
              <h3 id={`${id}-details`} className="mp-sr">
                Selected photo
              </h3>
              {item ? (
                <>
                  <FocusPicker key={item.file} item={item} focus={focus} onChange={setFocus} />
                  <div className="mp-field">
                    <label className="mp-label" htmlFor={`${id}-alt`}>
                      Alt text <span className="mp-required">(required)</span>
                    </label>
                    <textarea
                      ref={altInput}
                      id={`${id}-alt`}
                      className="mp-input"
                      rows={3}
                      maxLength={250}
                      value={alt}
                      aria-invalid={altTouched && altMissing}
                      aria-describedby={describedBy}
                      onChange={(e) => setAlt(e.target.value)}
                      onBlur={() => setAltTouched(true)}
                    />
                    <p id={`${id}-alt-hint`} className="mp-hint">
                      Describe what the photo shows, for people who can't see it, e.g. "Boats in the harbour at dawn".
                    </p>
                    {altTouched && altMissing ? (
                      <p id={`${id}-alt-error`} className="mp-error">
                        Add alt text before using this photo.
                      </p>
                    ) : null}
                  </div>
                  <dl className="mp-meta">
                    <dt>File</dt>
                    <dd>{item.file}</dd>
                    <dt>Size</dt>
                    <dd>
                      {item.width} × {item.height} px · {formatBytes(item.bytes)}
                    </dd>
                    <dt>Used on</dt>
                    <dd>{usedOn.length ? usedOn.map((u) => u.title).join(", ") : "No pages yet"}</dd>
                  </dl>
                  <div className="mp-actions">
                    <button type="button" className="mp-button mp-primary" disabled={!!busy} onClick={() => void use()}>
                      Use this photo
                    </button>
                    {altChanged || focusChanged ? (
                      <button type="button" className="mp-button" disabled={!!busy} onClick={() => void saveAlt()}>
                        {focusChanged ? "Save changes" : "Save alt text"}
                      </button>
                    ) : null}
                  </div>
                  <div className="mp-delete">
                    {usedOn.length ? (
                      <p className="mp-hint">To delete this photo, choose another one on {usedOn.length === 1 ? "that page" : "those pages"} first.</p>
                    ) : confirmDelete ? (
                      <div className="mp-confirm" role="group" aria-label="Delete this photo?">
                        <p>Delete {item.file} from the library? Its history is kept.</p>
                        <button type="button" id={`${id}-delete`} className="mp-button mp-danger" disabled={!!busy} onClick={() => void remove()}>
                          Delete photo
                        </button>
                        <button
                          type="button"
                          className="mp-button"
                          onClick={() => {
                            setConfirmDelete(false);
                            requestAnimationFrame(() => document.getElementById(`${id}-ask-delete`)?.focus());
                          }}
                        >
                          Keep it
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        id={`${id}-ask-delete`}
                        className="mp-link"
                        onClick={() => {
                          setConfirmDelete(true);
                          requestAnimationFrame(() => document.getElementById(`${id}-delete`)?.focus());
                        }}
                      >
                        Delete from library…
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <p className="mp-note">Pick a photo to see its details, or upload a new one.</p>
              )}
            </div>
          </div>
          {dragging ? (
            <div className="mp-dropping" aria-hidden="true">
              Drop photos to upload
            </div>
          ) : null}
        </div>
      ) : null}
    </dialog>
  );
}

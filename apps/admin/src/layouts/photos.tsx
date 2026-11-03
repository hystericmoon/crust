/**
 * F080: sample photos in layouts. A layout from the library arrives with the
 * builder's own sample photos (/layout-photos/…). This copies each one into
 * the site's Media library once, and points the blocks at /media/…, so the
 * published site has the photo. The blocks stay marked "to replace" (F046).
 *
 * It watches the whole page rather than the insert itself, so a page saved
 * before the copy finished (or a layout undone and redone) is put right the
 * next time it's open.
 */
import { layoutPhotoOf, layoutPhotoSrcs, swapLayoutPhotos, type MediaItem } from "@crust/blocks";
import { createUsePuck, useGetPuck, type Data } from "@puckeditor/core";
import { useEffect, useRef } from "react";
import { uploadMedia } from "../api-client";
import { announce } from "../keyboard/KeyboardEditing";
import { getMediaState, loadMedia, rememberUploaded } from "../media/store";

const usePuckSelector = createUsePuck();

export interface AdoptDeps {
  /** The library as it is now (loaded first). */
  library: () => Promise<{ ok: true; items: MediaItem[] } | { ok: false }>;
  /** The sample file's bytes, as base64. */
  read: (src: string) => Promise<string>;
  upload: (photo: { name: string; data: string; alt: string }) => Promise<{ ok: true; item: MediaItem } | { ok: false; error: string }>;
}

async function toBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

export const browserDeps: AdoptDeps = {
  library: async () => {
    await loadMedia();
    const s = getMediaState();
    return s.status === "ready" ? { ok: true, items: s.items } : { ok: false };
  },
  read: async (src) => {
    const res = await fetch(src);
    if (!res.ok) throw new Error(`${src}: ${res.status}`);
    return toBase64(await res.blob());
  },
  upload: async (photo) => {
    const res = await uploadMedia(photo);
    if (!res.ok) return { ok: false, error: res.error };
    rememberUploaded(res.item);
    return { ok: true, item: res.item };
  },
};

export interface Adopted {
  /** Sample address → its address in the Media library. */
  map: Map<string, string>;
  /** How many were uploaded now (the rest were already in the library). */
  uploaded: number;
  /** Why some couldn't be copied, if any. */
  error: string | null;
}

/**
 * Copies sample photos into the Media library, one at a time (each upload
 * changes the library's list). A photo already there under its own name is
 * reused, so inserting the same layout twice adds nothing.
 */
export async function adoptLayoutPhotos(srcs: string[], deps: AdoptDeps = browserDeps): Promise<Adopted> {
  const map = new Map<string, string>();
  const wanted = srcs.filter((s) => layoutPhotoOf(s));
  if (!wanted.length) return { map, uploaded: 0, error: null };
  const lib = await deps.library();
  if (!lib.ok) return { map, uploaded: 0, error: "The Media library isn't available, so sample photos stay as they are." };
  const have = new Set(lib.items.map((i) => i.file));
  let uploaded = 0;
  for (const src of wanted) {
    const photo = layoutPhotoOf(src)!;
    if (have.has(photo.file)) {
      map.set(src, `/media/${photo.file}`);
      continue;
    }
    try {
      const res = await deps.upload({ name: photo.file, data: await deps.read(src), alt: photo.alt });
      if (!res.ok) return { map, uploaded, error: res.error };
      have.add(res.item.file);
      map.set(src, `/media/${res.item.file}`);
      uploaded++;
    } catch (e) {
      return { map, uploaded, error: e instanceof Error ? e.message : String(e) };
    }
  }
  return { map, uploaded, error: null };
}

/** Lives beside the gallery in the builder: copies sample photos as soon as a page has any. */
export function LayoutPhotoWatcher({ deps = browserDeps }: { deps?: AdoptDeps }) {
  const getPuck = useGetPuck();
  const data = usePuckSelector((s) => s.appState.data) as Data;
  const busy = useRef(false);
  const failed = useRef(new Set<string>());
  const srcs = layoutPhotoSrcs(data).filter((s) => !failed.current.has(s));
  const key = srcs.join("|");

  useEffect(() => {
    if (!key || busy.current) return;
    busy.current = true;
    void adoptLayoutPhotos(key.split("|"), deps).then((res) => {
      busy.current = false;
      for (const s of key.split("|")) if (!res.map.has(s)) failed.current.add(s);
      if (res.map.size) {
        // The page may have changed while uploading: swap in the latest data.
        const puck = getPuck();
        puck.dispatch({ type: "setData", data: swapLayoutPhotos(puck.appState.data as Data, res.map), recordHistory: false });
      }
      if (res.uploaded) announce(`Copied ${res.uploaded === 1 ? "1 sample photo" : `${res.uploaded} sample photos`} into your Media library. Replace them with your own before publishing.`);
      else if (res.error) announce(`Sample photos weren't copied: ${res.error}`);
    });
  }, [key, deps, getPuck]);

  return null;
}

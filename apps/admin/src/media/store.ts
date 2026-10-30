/**
 * The media library in the browser (F034): one shared list, loaded once per
 * visit, so every image field and the picker see the same photos.
 */
import type { MediaItem } from "@crust/blocks";
import { useSyncExternalStore } from "react";
import { deleteMedia, listMedia, setMediaAlt, uploadMedia, type MediaUse } from "../api-client";
import { prepareUpload } from "./shrink";

export interface MediaState {
  status: "idle" | "loading" | "ready" | "off" | "error";
  items: MediaItem[];
  usage: Record<string, MediaUse[]>;
  /** Why loading failed, or why uploads are off. */
  error: string;
}

let state: MediaState = { status: "idle", items: [], usage: {}, error: "" };
const listeners = new Set<() => void>();
const set = (patch: Partial<MediaState>) => {
  state = { ...state, ...patch };
  for (const l of listeners) l();
};

export const getMediaState = () => state;

/** For tests. */
export function resetMediaStore(next: Partial<MediaState> = {}) {
  state = { status: "idle", items: [], usage: {}, error: "", ...next };
  for (const l of listeners) l();
}

export function useMedia(): MediaState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
  );
}

export const findMedia = (file: string | null) => (file ? state.items.find((i) => i.file === file) : undefined);

/** Loads the library (again, with `force`). */
export async function loadMedia(force = false): Promise<void> {
  if (!force && (state.status === "loading" || state.status === "ready")) return;
  set({ status: "loading", error: "" });
  const res = await listMedia();
  if (res.ok) set({ status: "ready", items: res.items, usage: res.usage });
  else set({ status: res.notConfigured ? "off" : "error", error: res.error });
}

/** Shrinks and uploads one photo; the new item comes first in the library. */
export async function addPhoto(file: File): Promise<{ ok: true; item: MediaItem } | { ok: false; error: string }> {
  const prepared = await prepareUpload(file);
  if (!prepared.ok) return prepared;
  const res = await uploadMedia({ name: prepared.name, data: prepared.base64, alt: "" });
  if (!res.ok) return { ok: false, error: `${file.name}: ${res.error}` };
  set({ items: [res.item, ...state.items] });
  return { ok: true, item: res.item };
}

export async function describePhoto(file: string, alt: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await setMediaAlt(file, alt);
  if (!res.ok) return res;
  set({ items: state.items.map((i) => (i.file === file ? res.item : i)) });
  return { ok: true };
}

export async function removePhoto(file: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await deleteMedia(file);
  if (!res.ok) return res;
  set({ items: state.items.filter((i) => i.file !== file) });
  return { ok: true };
}

/**
 * Post, blog and "Page not found" designs in the builder (F082). Loaded once
 * per visit. Like posts, a copy is kept in this browser: it wins until it's
 * saved to GitHub (or the site folder in the app), so preview links without
 * saving can still be tried.
 */
import { checkDesign, cleanDesign, designKinds, type DesignKind, type PageDesign, type PageDesigns } from "@crust/blocks";
import type { ComponentData } from "@puckeditor/core";
import { useSyncExternalStore } from "react";
import { listDesigns, resetDesign, saveDesign, type ApiResult } from "../api-client";

const PREFIX = "crust:design:";

interface LocalDesign {
  design: PageDesign;
  savedToGitHub: boolean;
}

export interface DesignsState {
  status: "idle" | "loading" | "ready";
  designs: PageDesigns;
  /** Saving isn't switched on: designs live in this browser only. */
  offline: boolean;
  /** Kinds whose newest copy is only in this browser. */
  unsaved: DesignKind[];
}

let state: DesignsState = { status: "idle", designs: {}, offline: false, unsaved: [] };
const listeners = new Set<() => void>();
const set = (patch: Partial<DesignsState>) => {
  state = { ...state, ...patch };
  for (const l of listeners) l();
};

export const getDesignsState = () => state;

/** For tests. */
export function resetDesignsStore(next: Partial<DesignsState> = {}) {
  state = { status: "idle", designs: {}, offline: false, unsaved: [], ...next };
  for (const l of listeners) l();
}

export function useDesigns(): DesignsState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
    () => state,
  );
}

function readLocal(kind: DesignKind): LocalDesign | null {
  try {
    const raw = localStorage.getItem(PREFIX + kind);
    if (!raw) return null;
    const v = JSON.parse(raw) as LocalDesign;
    return v && v.design?.kind === kind && !checkDesign(v.design).length ? v : null;
  } catch {
    return null;
  }
}

function writeLocal(design: PageDesign, savedToGitHub: boolean): boolean {
  try {
    localStorage.setItem(PREFIX + design.kind, JSON.stringify({ design, savedToGitHub }));
    return true;
  } catch {
    return false;
  }
}

function dropLocal(kind: DesignKind) {
  try {
    localStorage.removeItem(PREFIX + kind);
  } catch {
    // Nothing to drop.
  }
}

/** Loads the designs (again, with `force`). */
export async function loadDesigns(force = false): Promise<void> {
  if (!force && (state.status === "loading" || state.status === "ready")) return;
  set({ status: "loading" });
  const res = await listDesigns();
  const designs: PageDesigns = res.ok ? { ...res.designs } : {};
  const unsaved: DesignKind[] = [];
  for (const kind of designKinds) {
    const local = readLocal(kind);
    if (local && !local.savedToGitHub) {
      designs[kind] = local.design;
      unsaved.push(kind);
    }
  }
  set({ status: "ready", designs, offline: !res.ok && !!res.notConfigured, unsaved });
}

export type SaveDesignResult = { problems: string[] } | { result: ApiResult<unknown>; local: boolean };

/** Checks, keeps a browser copy, then saves. */
export async function storeDesign(kind: DesignKind, content: ComponentData[], title?: string): Promise<SaveDesignResult> {
  const draft = cleanDesign({ kind, content, savedAt: new Date().toISOString(), ...(title?.trim() ? { title: title.trim() } : {}) });
  const problems = checkDesign(draft);
  if (problems.length) return { problems };
  const local = writeLocal(draft, false);
  set({ designs: { ...state.designs, [kind]: draft }, unsaved: [...new Set([...state.unsaved, kind])] });
  const result = await saveDesign({ kind, content: draft.content, ...(draft.title ? { title: draft.title } : {}) });
  if (result.ok) {
    writeLocal(result.design, true);
    set({ designs: { ...state.designs, [kind]: result.design }, unsaved: state.unsaved.filter((k) => k !== kind) });
  }
  return { result, local };
}

/** Back to the built-in look. */
export async function forgetDesign(kind: DesignKind): Promise<ApiResult<unknown>> {
  const result = await resetDesign(kind);
  if (result.ok || result.notConfigured) {
    dropLocal(kind);
    const designs = { ...state.designs };
    delete designs[kind];
    set({ designs, unsaved: state.unsaved.filter((k) => k !== kind) });
  }
  return result;
}

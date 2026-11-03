/**
 * My layouts (F027): sections and whole pages the owner saved to reuse.
 * On GitHub (content/layouts/) once saving is switched on; in this browser
 * until then. Saved layouts are copies: pages that used one never change.
 */
import type { SavedLayout } from "@crust/blocks";
import type { ComponentData } from "@puckeditor/core";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { deleteLayout, listLayouts, renameLayout, saveLayout } from "../api-client";
import { announce } from "../keyboard/KeyboardEditing";

export const MAX_NAME = 60;
const LOCAL_KEY = "crust:my-layouts";

/** Problem with a layout name in the owner's words, or null. */
export function nameProblem(name: string): string | null {
  if (!name.trim()) return "Give the layout a name.";
  if (name.trim().length > MAX_NAME) return `Keep the name under ${MAX_NAME} characters.`;
  return null;
}

export function readLocalLayouts(): SavedLayout[] {
  try {
    const list = JSON.parse(localStorage.getItem(LOCAL_KEY) ?? "[]") as unknown;
    return Array.isArray(list) ? (list as SavedLayout[]).filter((l) => l && typeof l.id === "string" && Array.isArray(l.content)) : [];
  } catch {
    return [];
  }
}

function writeLocalLayouts(list: SavedLayout[]): boolean {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(list));
    return true;
  } catch {
    return false;
  }
}

export interface MyLayouts {
  /** Null while loading. */
  layouts: SavedLayout[] | null;
  /** Why the list couldn't load, if it didn't. */
  loadError: string | null;
  /** Where saves go, for messages: "GitHub" or "this browser". */
  where: "GitHub" | "this browser";
  reload: () => void;
  /** Each resolves to an error message, or null when it worked. */
  save: (name: string, kind: SavedLayout["kind"], content: ComponentData[]) => Promise<string | null>;
  rename: (id: string, name: string) => Promise<string | null>;
  remove: (id: string) => Promise<string | null>;
}

const MyLayoutsContext = createContext<MyLayouts | null>(null);

/** The saved layouts; outside a provider (tests of other parts), an empty, read-only list. */
export function useMyLayouts(): MyLayouts {
  return useContext(MyLayoutsContext) ?? emptyLayouts;
}

const emptyLayouts: MyLayouts = {
  layouts: [],
  loadError: null,
  where: "this browser",
  reload: () => undefined,
  save: async () => "Saving layouts isn't available here.",
  rename: async () => "Renaming layouts isn't available here.",
  remove: async () => "Deleting layouts isn't available here.",
};

const newest = (a: SavedLayout, b: SavedLayout) => b.savedAt.localeCompare(a.savedAt) || a.name.localeCompare(b.name);

export function MyLayoutsProvider({ githubOn, children }: { githubOn: boolean; children: ReactNode }) {
  const [layouts, setLayouts] = useState<SavedLayout[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!githubOn) {
      setLayouts(readLocalLayouts().sort(newest));
      return;
    }
    let live = true;
    setLayouts(null);
    void listLayouts().then((res) => {
      if (!live) return;
      if (res.ok) {
        setLoadError(null);
        setLayouts(res.layouts);
      } else {
        setLoadError(`Couldn't load your layouts from GitHub: ${res.error}`);
        setLayouts([]);
      }
    });
    return () => {
      live = false;
    };
  }, [githubOn, version]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 6000);
    return () => clearTimeout(t);
  }, [toast]);

  const tell = useCallback((text: string) => {
    setToast(text);
    announce(text);
  }, []);

  const save: MyLayouts["save"] = async (name, kind, content) => {
    const problem = nameProblem(name);
    if (problem) return problem;
    const clean = name.trim();
    if (githubOn) {
      const res = await saveLayout({ name: clean, kind, content });
      if (!res.ok) return `Not saved: ${res.error}`;
      setLayouts((list) => [res.layout, ...(list ?? []).filter((l) => l.id !== res.layout.id)]);
    } else {
      const layout: SavedLayout = { id: `local-${crypto.randomUUID()}`, name: clean, kind, savedAt: new Date().toISOString(), content };
      const next = [layout, ...readLocalLayouts()];
      if (!writeLocalLayouts(next)) return "This browser wouldn't store the layout. Try again.";
      setLayouts(next.sort(newest));
    }
    tell(kind === "element" ? `Saved the style “${clean}”. Apply it from the Style tab of any ${content[0]?.type ?? "block"}.` : `Saved “${clean}” to My layouts.`);
    return null;
  };

  const rename: MyLayouts["rename"] = async (id, name) => {
    const problem = nameProblem(name);
    if (problem) return problem;
    const clean = name.trim();
    if (githubOn) {
      const res = await renameLayout(id, clean);
      if (!res.ok) return `Not renamed: ${res.error}`;
    } else if (!writeLocalLayouts(readLocalLayouts().map((l) => (l.id === id ? { ...l, name: clean } : l)))) {
      return "This browser wouldn't store the change. Try again.";
    }
    setLayouts((list) => (list ?? []).map((l) => (l.id === id ? { ...l, name: clean } : l)));
    tell(`Renamed to “${clean}”.`);
    return null;
  };

  const remove: MyLayouts["remove"] = async (id) => {
    const gone = layouts?.find((l) => l.id === id);
    if (githubOn) {
      const res = await deleteLayout(id);
      if (!res.ok) return `Not deleted: ${res.error}`;
    } else if (!writeLocalLayouts(readLocalLayouts().filter((l) => l.id !== id))) {
      return "This browser wouldn't store the change. Try again.";
    }
    setLayouts((list) => (list ?? []).filter((l) => l.id !== id));
    tell(
      gone?.kind === "element"
        ? `Deleted the style “${gone.name}”. Blocks that use it keep their look.`
        : `Deleted “${gone?.name ?? "the layout"}”. Pages that use it are unchanged.`,
    );
    return null;
  };

  const value: MyLayouts = {
    layouts,
    loadError,
    where: githubOn ? "GitHub" : "this browser",
    reload: () => setVersion((v) => v + 1),
    save,
    rename,
    remove,
  };

  return (
    <MyLayoutsContext.Provider value={value}>
      {children}
      {/* Visible confirmation; screen readers hear it through the builder's live region. */}
      <div className="lg-toast" aria-hidden="true">
        {toast}
      </div>
    </MyLayoutsContext.Provider>
  );
}

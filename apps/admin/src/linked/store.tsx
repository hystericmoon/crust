/**
 * Linked sections in the builder (F043): the list from GitHub (or this
 * browser before saving is switched on), where each is used, and drawing
 * them on the canvas. Pages hold a LinkedSection block; the section's
 * blocks live once, in content/sections/<id>.json.
 */
import {
  LinkedSectionsContext,
  checkSectionName,
  linkedSectionIds,
  migrateRichTextBlocks,
  sectionContentFor,
  sectionIdFor,
  type LinkedSectionFile,
} from "@crust/blocks";
import { renderPreview } from "@crust/render";
import type { ComponentData } from "@puckeditor/core";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { createSection, deleteSection, listSections, renameSection, updateSection, type SectionUse } from "../api-client";
import { localDrafts } from "../pages/store";
import "./linked.css";

const LOCAL_KEY = "crust:sections";

export function readLocalSections(): LinkedSectionFile[] {
  try {
    const list = JSON.parse(localStorage.getItem(LOCAL_KEY) ?? "[]") as unknown;
    return Array.isArray(list) ? (list as LinkedSectionFile[]).filter((s) => s && typeof s.id === "string" && Array.isArray(s.content)) : [];
  } catch {
    return [];
  }
}
function writeLocalSections(list: LinkedSectionFile[]): boolean {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(list));
    return true;
  } catch {
    return false;
  }
}

/** Where each section is used, from this browser's page drafts (before GitHub is switched on). */
function localUsage(): Record<string, SectionUse[]> {
  const usage: Record<string, SectionUse[]> = {};
  for (const d of localDrafts()) for (const id of linkedSectionIds(d.page.puck)) (usage[id] ??= []).push({ path: d.page.path, title: d.page.title });
  return usage;
}

export interface LinkedSections {
  /** Null while loading. */
  sections: LinkedSectionFile[] | null;
  usage: Record<string, SectionUse[]>;
  loadError: string | null;
  where: "your site" | "this browser";
  get: (id: string) => LinkedSectionFile | undefined;
  reload: () => void;
  /** Each resolves to the section, or an error message. */
  create: (name: string, content: ComponentData[]) => Promise<LinkedSectionFile | string>;
  update: (id: string, content: ComponentData[]) => Promise<LinkedSectionFile | string>;
  rename: (id: string, name: string) => Promise<string | null>;
  remove: (id: string) => Promise<string | null>;
}

const Ctx = createContext<LinkedSections | null>(null);

const empty: LinkedSections = {
  sections: [],
  usage: {},
  loadError: null,
  where: "this browser",
  get: () => undefined,
  reload: () => undefined,
  create: async () => "Linked sections aren't available here.",
  update: async () => "Linked sections aren't available here.",
  rename: async () => "Linked sections aren't available here.",
  remove: async () => "Linked sections aren't available here.",
};

export const useLinkedSections = (): LinkedSections => useContext(Ctx) ?? empty;

/** A section's blocks as they publish, for the canvas and the gallery's previews. */
export const sectionHtml = (content: ComponentData[]) => renderPreview({ root: { props: {} }, content: migrateRichTextBlocks(content) });

export function LinkedSectionsProvider({ githubOn, children }: { githubOn: boolean; children: ReactNode }) {
  const [sections, setSections] = useState<LinkedSectionFile[] | null>(null);
  const [usage, setUsage] = useState<Record<string, SectionUse[]>>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!githubOn) {
      setSections(readLocalSections());
      setUsage(localUsage());
      return;
    }
    let live = true;
    void listSections().then((res) => {
      if (!live) return;
      if (res.ok) {
        setLoadError(null);
        setSections(res.sections);
        setUsage(res.usage);
      } else {
        setLoadError(`Couldn't load your linked sections from your site: ${res.error}`);
        setSections([]);
      }
    });
    return () => {
      live = false;
    };
  }, [githubOn, version]);

  const byId = useMemo(() => new Map((sections ?? []).map((s) => [s.id, s])), [sections]);
  const put = (section: LinkedSectionFile) => setSections((list) => [...(list ?? []).filter((s) => s.id !== section.id), section].sort((a, b) => a.name.localeCompare(b.name)));

  const value: LinkedSections = {
    sections,
    usage,
    loadError,
    where: githubOn ? "your site" : "this browser",
    get: (id) => byId.get(id),
    reload: () => setVersion((v) => v + 1),
    create: async (name, content) => {
      const problem = checkSectionName(name)[0];
      if (problem) return problem;
      if (githubOn) {
        const res = await createSection(name.trim(), content);
        if (!res.ok) return `Not made linked: ${res.error}`;
        put(res.section);
        return res.section;
      }
      const list = readLocalSections();
      const section: LinkedSectionFile = { id: sectionIdFor(name, new Set(list.map((s) => s.id))), name: name.trim(), savedAt: new Date().toISOString(), content: sectionContentFor(content) };
      if (!writeLocalSections([...list, section])) return "Not made linked: this browser's storage is full.";
      put(section);
      return section;
    },
    update: async (id, content) => {
      if (githubOn) {
        const res = await updateSection(id, content);
        if (!res.ok) return `Not saved: ${res.error}`;
        put(res.section);
        setUsage((u) => ({ ...u, [id]: res.usedOn }));
        return res.section;
      }
      const list = readLocalSections();
      const current = list.find((s) => s.id === id);
      if (!current) return "Not saved: this linked section isn't in this browser any more.";
      const section = { ...current, savedAt: new Date().toISOString(), content: sectionContentFor(content) };
      if (!writeLocalSections(list.map((s) => (s.id === id ? section : s)))) return "Not saved: this browser's storage is full.";
      put(section);
      return section;
    },
    rename: async (id, name) => {
      const problem = checkSectionName(name)[0];
      if (problem) return problem;
      if (githubOn) {
        const res = await renameSection(id, name.trim());
        if (!res.ok) return `Not renamed: ${res.error}`;
        put(res.section);
        return null;
      }
      const list = readLocalSections().map((s) => (s.id === id ? { ...s, name: name.trim() } : s));
      writeLocalSections(list);
      setSections(list);
      return null;
    },
    remove: async (id) => {
      const used = (githubOn ? usage[id] : localUsage()[id]) ?? [];
      if (!githubOn && used.length) return `Still on ${used.map((u) => u.title || u.path).join(", ")}. Unlink or remove it there first.`;
      if (githubOn) {
        const res = await deleteSection(id);
        if (!res.ok) return res.error;
      } else writeLocalSections(readLocalSections().filter((s) => s.id !== id));
      setSections((list) => (list ?? []).filter((s) => s.id !== id));
      return null;
    },
  };

  const render = useCallback((blocks: ComponentData[]) => <div className="cr-linked-body" dangerouslySetInnerHTML={{ __html: sectionHtml(blocks) }} />, []);
  const canvas = useMemo(() => ({ get: (id: string) => byId.get(id), render, usedOn: (id: string) => usage[id]?.length ?? 0 }), [byId, render, usage]);

  return (
    <Ctx.Provider value={value}>
      <LinkedSectionsContext.Provider value={canvas}>{children}</LinkedSectionsContext.Provider>
    </Ctx.Provider>
  );
}

/** True inside a linked section's own editor, where another linked section can't be added. */
export const SectionEditorContext = createContext(false);
export const useInSectionEditor = () => useContext(SectionEditorContext);

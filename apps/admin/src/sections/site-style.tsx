/**
 * The site's tokens as the builder sees them (F025): edits from the toolbar's
 * "Whole site" mode change the same draft as Site settings, and are saved
 * the same way.
 */
import type { SectionStyleId, SiteTokens } from "@crust/blocks";
import type { ComponentData, Data } from "@puckeditor/core";
import { createContext, useContext } from "react";

export interface SiteStyle {
  tokens: SiteTokens;
  setTokens: (tokens: SiteTokens) => void;
  /** True when the draft differs from what's saved. */
  dirty: boolean;
  /** Saves the draft; resolves to the message to show. */
  save: () => Promise<string>;
  discard: () => void;
}

export const SiteStyleContext = createContext<SiteStyle | null>(null);

export function useSiteStyle(): SiteStyle {
  const value = useContext(SiteStyleContext);
  if (!value) throw new Error("useSiteStyle needs a SiteStyleContext provider");
  return value;
}

/** How many sections on a page use each style, nested ones included. */
export function countSectionStyles(data: Data): Partial<Record<SectionStyleId, number>> {
  const counts: Partial<Record<SectionStyleId, number>> = {};
  const walk = (items: ComponentData[]) => {
    for (const item of items) {
      if (item.type === "Section") {
        const id = (item.props.background ?? "background") as SectionStyleId;
        counts[id] = (counts[id] ?? 0) + 1;
      }
      for (const value of Object.values(item.props)) {
        if (Array.isArray(value) && value.every((v) => v && typeof v === "object" && "type" in v)) walk(value as ComponentData[]);
      }
    }
  };
  walk(data.content ?? []);
  return counts;
}

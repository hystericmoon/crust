/** F092: what the Styles panel and the Site settings sheet need from the screen around the editor (colours and type come from SiteStyleContext). */
import { createContext, useContext } from "react";
import type { Site, SiteChrome } from "@crust/blocks";
import type { SiteDetails } from "../chrome-store";
import type { PageOption } from "../settings/ChromeGroups";
import type { TemplateLoader } from "../templates/collect";

export interface StylesPanelState {
  site: Pick<Site, "name" | "language">;
  /** F094: the saved name and language, and the draft being edited (with the search defaults). */
  details: SiteDetails;
  onDetailsChange: (details: SiteDetails) => void;
  detailsDirty: boolean;
  chrome: SiteChrome;
  onChromeChange: (chrome: SiteChrome) => void;
  chromeDirty: boolean;
  pages: PageOption[];
  address: string;
  onAddressChange: (baseUrl: string) => void;
  addressDirty: boolean;
  templateLoader: TemplateLoader;
  githubOn: boolean;
  /** Saves tokens, header, footer and address together; resolves to the message to show. */
  save: () => Promise<string>;
  /** Puts tokens, header, footer and address back to what is saved. */
  discard: () => void;
}

export const StylesPanelContext = createContext<StylesPanelState | null>(null);

export function useStylesPanel(): StylesPanelState {
  const ctx = useContext(StylesPanelContext);
  if (!ctx) throw new Error("The Styles panel needs StylesPanelContext.");
  return ctx;
}

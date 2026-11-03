/** F084: what each rebuilt starter template provides besides its look. */
import type { BlogSettings, Page, Post, SiteChrome, TemplateDesign } from "@crust/blocks";
import type { Block } from "./kit";

export interface StarterParts {
  pages: () => Page[];
  /** Linked sections (F043), e.g. the contact strip. */
  sections: () => { id: string; name: string; content: Block[] }[];
  posts: () => Post[];
  blog: BlogSettings;
  chrome: () => SiteChrome;
  /** Post, blog and "Page not found" designs (F082). */
  designs: () => TemplateDesign[];
}

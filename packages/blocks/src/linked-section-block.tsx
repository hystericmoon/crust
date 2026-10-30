/**
 * The LinkedSection block (F043). Published pages never render it: the
 * renderer swaps it for the section's blocks first (resolveLinkedSections).
 * In the builder it draws the shared section, read-only, from context.
 */
import type { ComponentConfig, ComponentData } from "@puckeditor/core";
import { createContext, useContext, type ReactNode } from "react";
import type { LinkedSectionFile } from "./linked-sections";

export type LinkedSectionProps = { section: string };

export interface LinkedSectionsSetup {
  get: (id: string) => LinkedSectionFile | undefined;
  /** Draws a section's blocks as they publish. */
  render: (blocks: ComponentData[]) => ReactNode;
  /** How many pages use it, for the label. */
  usedOn?: (id: string) => number;
}

export const LinkedSectionsContext = createContext<LinkedSectionsSetup | null>(null);

export const LinkedSection: ComponentConfig<LinkedSectionProps> = {
  label: "Linked section",
  fields: { section: { type: "text", label: "Linked section" } },
  defaultProps: { section: "" },
  render: function Render({ section }: LinkedSectionProps) {
    const setup = useContext(LinkedSectionsContext);
    if (!setup) return <></>;
    const file = setup.get(section);
    if (!file) {
      return (
        <div className="cr-linked cr-linked-missing">
          <p>This linked section doesn't exist any more. Remove this block, or unlink it on another page that still shows it.</p>
        </div>
      );
    }
    const pages = setup.usedOn?.(file.id) ?? 0;
    return (
      <div className="cr-linked" data-linked={file.id}>
        <span className="cr-linked-tag">
          Linked section · {file.name}
          {pages > 1 ? ` · on ${pages} pages` : ""}
        </span>
        {setup.render(file.content)}
      </div>
    );
  },
};

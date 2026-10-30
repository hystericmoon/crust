import type { CSSProperties, ReactNode } from "react";

export type Align = "left" | "center" | "right";
export const alignField = {
  type: "radio" as const,
  label: "Alignment",
  options: [
    { label: "Left", value: "left" },
    { label: "Center", value: "center" },
    { label: "Right", value: "right" },
  ],
};

/** Inline style that only sets CSS custom properties. */
export const vars = (v: Record<string, string>) => v as CSSProperties;

/** Splits text on blank lines into paragraphs. React escapes the content. */
export function paragraphs(text: string): ReactNode[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p, i) => <p key={i}>{p}</p>);
}

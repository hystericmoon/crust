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

const headingTags = ["h1", "h2", "h3", "h4"] as const;
/** A heading tag from a block's props: anything else (e.g. "script") becomes `fallback`. */
type HeadingTag = (typeof headingTags)[number];
export const headingTag = (level: unknown, fallback: HeadingTag): HeadingTag =>
  (headingTags as readonly unknown[]).includes(level) ? (level as HeadingTag) : fallback;

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

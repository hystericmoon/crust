import type { Config, Slot } from "@puckeditor/core";
import type { CSSProperties, ReactNode } from "react";
import { spaceVar, spacingField } from "./fields";
import type { SpacingStep } from "./tokens";
import { safeUrl } from "./url";

type Align = "left" | "center" | "right";
const alignField = {
  type: "radio" as const,
  label: "Alignment",
  options: [
    { label: "Left", value: "left" },
    { label: "Center", value: "center" },
    { label: "Right", value: "right" },
  ],
};

/** Inline style that only sets CSS custom properties. */
const vars = (v: Record<string, string>) => v as CSSProperties;

export type SectionProps = {
  background: "background" | "surface" | "primary";
  paddingY: SpacingStep;
  content: Slot;
};
export type HeadingProps = { text: string; level: "h1" | "h2" | "h3" | "h4"; align: Align };
export type TextProps = { text: string; align: Align; tone: "default" | "muted" };
export type ImageProps = { src: string; alt: string; caption: string };
export type ButtonProps = { label: string; href: string; variant: "primary" | "secondary" };
export type SpacerProps = { size: SpacingStep };

export type Components = {
  Section: SectionProps;
  Heading: HeadingProps;
  Text: TextProps;
  Image: ImageProps;
  Button: ButtonProps;
  Spacer: SpacerProps;
};

/** Splits text on blank lines into paragraphs. React escapes the content. */
function paragraphs(text: string): ReactNode[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p, i) => <p key={i}>{p}</p>);
}

export const config: Config<Components> = {
  categories: {
    layout: { title: "Layout", components: ["Section", "Spacer"] },
    content: { title: "Content", components: ["Heading", "Text", "Image", "Button"] },
  },
  components: {
    Section: {
      label: "Section",
      fields: {
        background: {
          type: "select",
          label: "Background",
          options: [
            { label: "Page", value: "background" },
            { label: "Surface", value: "surface" },
            { label: "Primary", value: "primary" },
          ],
        },
        paddingY: spacingField("Vertical padding"),
        content: { type: "slot" },
      },
      defaultProps: { background: "background", paddingY: "lg", content: [] },
      render: ({ background, paddingY, content: Content }) => (
        <section
          className={`cr-section cr-bg-${background}`}
          style={vars({ "--cr-section-pad": spaceVar(paddingY) })}
        >
          <div className="cr-container">
            <Content />
          </div>
        </section>
      ),
    },
    Heading: {
      label: "Heading",
      fields: {
        text: { type: "text", label: "Text" },
        level: {
          type: "select",
          label: "Level",
          options: [
            { label: "H1 (page title)", value: "h1" },
            { label: "H2", value: "h2" },
            { label: "H3", value: "h3" },
            { label: "H4", value: "h4" },
          ],
        },
        align: alignField,
      },
      defaultProps: { text: "Heading", level: "h2", align: "left" },
      render: ({ text, level, align }) => {
        const Tag = level;
        return <Tag className={`cr-heading cr-${level} cr-align-${align}`}>{text}</Tag>;
      },
    },
    Text: {
      label: "Text",
      fields: {
        text: { type: "textarea", label: "Text" },
        align: alignField,
        tone: {
          type: "radio",
          label: "Tone",
          options: [
            { label: "Default", value: "default" },
            { label: "Muted", value: "muted" },
          ],
        },
      },
      defaultProps: { text: "Write something here.", align: "left", tone: "default" },
      render: ({ text, align, tone }) => (
        <div className={`cr-text cr-align-${align} cr-tone-${tone}`}>{paragraphs(text)}</div>
      ),
    },
    Image: {
      label: "Image",
      fields: {
        src: { type: "text", label: "Image URL" },
        alt: { type: "text", label: "Alt text (describe the image)" },
        caption: { type: "text", label: "Caption (optional)" },
      },
      defaultProps: { src: "", alt: "", caption: "" },
      render: ({ src, alt, caption }) => {
        // Missing alt is left out on purpose so the publish engine can flag it.
        const altAttr = alt.trim() ? { alt: alt.trim() } : {};
        return (
          <figure className="cr-image">
            {src ? (
              <img src={safeUrl(src)} {...altAttr} loading="lazy" decoding="async" />
            ) : (
              <div className="cr-image-empty">Add an image URL</div>
            )}
            {caption ? <figcaption>{caption}</figcaption> : null}
          </figure>
        );
      },
    },
    Button: {
      label: "Button",
      fields: {
        label: { type: "text", label: "Label" },
        href: { type: "text", label: "Link" },
        variant: {
          type: "radio",
          label: "Style",
          options: [
            { label: "Primary", value: "primary" },
            { label: "Secondary", value: "secondary" },
          ],
        },
      },
      defaultProps: { label: "Learn more", href: "/", variant: "primary" },
      render: ({ label, href, variant }) => (
        <a className={`cr-button cr-button-${variant}`} href={safeUrl(href)}>
          {label}
        </a>
      ),
    },
    Spacer: {
      label: "Spacer",
      fields: { size: spacingField("Size") },
      defaultProps: { size: "md" },
      render: ({ size }) => (
        <div className="cr-spacer" aria-hidden="true" style={{ height: spaceVar(size) }} />
      ),
    },
  },
};

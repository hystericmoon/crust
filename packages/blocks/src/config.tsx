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
/** `align` was added in F012; pages saved before it have none and stay left-aligned. */
export type ButtonProps = { label: string; href: string; variant: "primary" | "secondary"; align?: Align };
export type SpacerProps = { size: SpacingStep };
export type ColumnsProps = {
  count: "2" | "3" | "4";
  gap: SpacingStep;
  column1: Slot;
  column2: Slot;
  column3: Slot;
  column4: Slot;
};
export type CardProps = {
  imageSrc: string;
  imageAlt: string;
  title: string;
  titleLevel: "h2" | "h3" | "h4";
  text: string;
  linkLabel: string;
  linkHref: string;
  background: "background" | "surface" | "primary";
};

export type Components = {
  Section: SectionProps;
  Heading: HeadingProps;
  Text: TextProps;
  Image: ImageProps;
  Button: ButtonProps;
  Spacer: SpacerProps;
  Columns: ColumnsProps;
  Card: CardProps;
};

const backgroundField = {
  type: "select" as const,
  label: "Background",
  options: [
    { label: "Page", value: "background" },
    { label: "Surface", value: "surface" },
    { label: "Primary", value: "primary" },
  ],
};

/** Blocks that can't go inside a column (no full-width sections or nested columns). */
const columnSlot = { type: "slot" as const, disallow: ["Section", "Columns"] };

/** Splits text on blank lines into paragraphs. React escapes the content. */
function paragraphs(text: string): ReactNode[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p, i) => <p key={i}>{p}</p>);
}

export const config: Config<Components> = {
  // Gives the editor canvas the published page's base styles (font, colours),
  // so the preview matches. The renderer writes its own <body class="cr-page">.
  root: {
    // Page title and description are edited here; the admin moves them to the
    // top of the page file on save (content contract), so the renderer ignores them.
    fields: {
      title: { type: "text", label: "Page title" },
      description: { type: "textarea", label: "Description (shown in search results)" },
    },
    render: ({ children }) => <div className="cr-page">{children}</div>,
  },
  categories: {
    layout: { title: "Layout", components: ["Section", "Columns", "Spacer"] },
    content: { title: "Content", components: ["Heading", "Text", "Image", "Button", "Card"] },
  },
  components: {
    Section: {
      label: "Section",
      fields: {
        background: backgroundField,
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
        align: alignField,
      },
      defaultProps: { label: "Learn more", href: "/", variant: "primary", align: "left" },
      render: ({ label, href, variant, align }) => (
        <div className={`cr-button-row cr-align-${align ?? "left"}`}>
          <a className={`cr-button cr-button-${variant}`} href={safeUrl(href)}>
            {label}
          </a>
        </div>
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
    Columns: {
      label: "Columns",
      fields: {
        count: {
          type: "radio",
          label: "Columns (stack on phones)",
          options: [
            { label: "2", value: "2" },
            { label: "3", value: "3" },
            { label: "4", value: "4" },
          ],
        },
        gap: spacingField("Gap"),
        column1: columnSlot,
        column2: columnSlot,
        column3: columnSlot,
        column4: columnSlot,
      },
      defaultProps: { count: "2", gap: "md", column1: [], column2: [], column3: [], column4: [] },
      render: ({ count, gap, column1, column2, column3, column4 }) => {
        // Content in columns beyond `count` is kept (so lowering the count is
        // undoable) but not shown or published.
        const columns = [column1, column2, column3, column4].slice(0, Number(count));
        return (
          <div className={`cr-columns cr-columns-${count}`} style={vars({ "--cr-columns-gap": spaceVar(gap) })}>
            {columns.map((Column, i) => (
              <div className="cr-column" key={i}>
                <Column />
              </div>
            ))}
          </div>
        );
      },
    },
    Card: {
      label: "Card",
      fields: {
        title: { type: "text", label: "Title" },
        titleLevel: {
          type: "select",
          label: "Title level",
          options: [
            { label: "H2", value: "h2" },
            { label: "H3", value: "h3" },
            { label: "H4", value: "h4" },
          ],
        },
        text: { type: "textarea", label: "Text" },
        imageSrc: { type: "text", label: "Image URL (optional)" },
        imageAlt: { type: "text", label: "Image alt text (describe the image)" },
        linkLabel: { type: "text", label: "Link text (say where it goes)" },
        linkHref: { type: "text", label: "Link" },
        background: backgroundField,
      },
      defaultProps: {
        title: "Card title",
        titleLevel: "h3",
        text: "A short description.",
        imageSrc: "",
        imageAlt: "",
        linkLabel: "",
        linkHref: "",
        background: "surface",
      },
      render: ({ imageSrc, imageAlt, title, titleLevel, text, linkLabel, linkHref, background }) => {
        const Title = titleLevel;
        // Same rule as the Image block: missing alt is left out for the publish check.
        const altAttr = imageAlt.trim() ? { alt: imageAlt.trim() } : {};
        return (
          <article className={`cr-card cr-bg-${background}`}>
            {imageSrc.trim() ? (
              <img className="cr-card-media" src={safeUrl(imageSrc)} {...altAttr} loading="lazy" decoding="async" />
            ) : null}
            <div className="cr-card-body">
              {title.trim() ? <Title className="cr-heading cr-card-title">{title}</Title> : null}
              {text.trim() ? <div className="cr-text">{paragraphs(text)}</div> : null}
              {linkLabel.trim() && linkHref.trim() ? (
                <a className="cr-card-link" href={safeUrl(linkHref)}>
                  {linkLabel}
                </a>
              ) : null}
            </div>
          </article>
        );
      },
    },
  },
};

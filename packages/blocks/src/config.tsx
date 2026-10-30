import type { Config, Slot } from "@puckeditor/core";
import type { ReactNode } from "react";
import { alignField, headingTag, paragraphs, vars, type Align } from "./block-helpers";
import {
  moreBlocks,
  type AccordionProps,
  type GalleryProps,
  type GridProps,
  type IconListProps,
  type ImageOverlayProps,
  type LogoRowProps,
  type QuoteProps,
} from "./more-blocks";
import { spaceVar, spacingField } from "./fields";
import { sectionStyleIds, sectionStyleNames, tintLevels, tintNames, type SectionStyleId, type TintLevel } from "./section-styles";
import type { SpacingStep } from "./tokens";
import { ContactForm, type ContactFormProps } from "./contact-form";
import { Img } from "./media-img";
import { safeUrl } from "./url";
import { cleanAnchor, columnClasses, hiddenLabel, hideClasses, type ColumnWidths, type HideOn } from "./responsive";


export const sectionHeights = ["auto", "medium", "large", "full"] as const;
export type SectionHeight = (typeof sectionHeights)[number];
export const sectionHeightNames: Record<SectionHeight, string> = { auto: "Auto", medium: "Medium", large: "Large", full: "Full screen" };
export type SectionAlign = "top" | "center" | "bottom";

/**
 * `background` names a site-wide section style (F025). `height`, `valign`,
 * `imageSrc` and `tint` were added in F025; pages saved before have none and
 * render as before (auto height, no image).
 */
export type SectionProps = {
  background: SectionStyleId;
  paddingY: SpacingStep;
  height?: SectionHeight;
  valign?: SectionAlign;
  imageSrc?: string;
  tint?: TintLevel;
  content: Slot;
};
export type HeadingProps = { text: string; level: "h1" | "h2" | "h3" | "h4"; align: Align };
export type TextProps = { text: string; align: Align; tone: "default" | "muted" };
export type ImageProps = { src: string; alt: string; caption: string };
/** `align` was added in F012; pages saved before it have none and stay left-aligned. */
export type ButtonProps = { label: string; href: string; variant: "primary" | "secondary"; align?: Align };
export type SpacerProps = { size: SpacingStep };
/** `widths` was added in F029; Columns saved before it keep the old per-device behaviour. */
export type ColumnsProps = {
  count: "2" | "3" | "4";
  gap: SpacingStep;
  widths?: ColumnWidths;
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

/**
 * Advanced settings any block can have, both optional: hidden on some
 * devices (F029), and an anchor name so links like "#team" can jump to it (F030).
 */
export type Visibility = { hideOn?: HideOn; anchor?: string };

export type Components = {
  Section: SectionProps & Visibility;
  Heading: HeadingProps & Visibility;
  Text: TextProps & Visibility;
  Image: ImageProps & Visibility;
  Button: ButtonProps & Visibility;
  Spacer: SpacerProps & Visibility;
  Columns: ColumnsProps & Visibility;
  Card: CardProps & Visibility;
  Grid: GridProps & Visibility;
  Gallery: GalleryProps & Visibility;
  Accordion: AccordionProps & Visibility;
  IconList: IconListProps & Visibility;
  LogoRow: LogoRowProps & Visibility;
  Quote: QuoteProps & Visibility;
  ImageOverlay: ImageOverlayProps & Visibility;
  ContactForm: ContactFormProps & Visibility;
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

const blocks: Config<Components> = {
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
    layout: { title: "Layout", components: ["Section", "Columns", "Grid", "Spacer"] },
    content: { title: "Content", components: ["Heading", "Text", "Image", "Button", "Card", "IconList", "Quote", "Accordion"] },
    media: { title: "Media", components: ["Gallery", "ImageOverlay", "LogoRow"] },
    forms: { title: "Forms", components: ["ContactForm"] },
  },
  components: {
    Section: {
      label: "Section",
      fields: {
        background: {
          type: "select",
          label: "Style",
          options: sectionStyleIds.map((id) => ({ label: sectionStyleNames[id], value: id })),
        },
        height: {
          type: "select",
          label: "Height",
          options: sectionHeights.map((h) => ({ label: sectionHeightNames[h], value: h })),
        },
        valign: {
          type: "radio",
          label: "Content position",
          options: [
            { label: "Top", value: "top" },
            { label: "Middle", value: "center" },
            { label: "Bottom", value: "bottom" },
          ],
        },
        imageSrc: { type: "text", label: "Background image URL (optional)" },
        tint: {
          type: "radio",
          label: "Image tint",
          options: tintLevels.map((l) => ({ label: tintNames[l], value: l })),
        },
        paddingY: spacingField("Vertical padding"),
        content: { type: "slot" },
      },
      defaultProps: { background: "background", paddingY: "lg", height: "auto", valign: "center", imageSrc: "", tint: "medium", content: [] },
      render: ({ background, paddingY, height, valign, imageSrc, tint, content: Content }) => {
        // An unsafe address (e.g. javascript:) means no image at all.
        const image = imageSrc?.trim() ? safeUrl(imageSrc) : "#";
        const classes = ["cr-section", `cr-style-${background}`, `cr-height-${height ?? "auto"}`, `cr-valign-${valign ?? "center"}`];
        return (
          <section className={classes.join(" ")} style={vars({ "--cr-section-pad": spaceVar(paddingY) })}>
            {image !== "#" ? (
              <>
                {/* Background photos are decoration; the tint keeps text readable on any photo. */}
                <Img className="cr-section-media" src={image} size="wide" alt="" decoding="async" />
                <div className={`cr-section-tint cr-tint-${tint ?? "medium"}`} aria-hidden="true" />
              </>
            ) : null}
            <div className="cr-container">
              <Content />
            </div>
          </section>
        );
      },
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
        const Tag = headingTag(level, "h2");
        return <Tag className={`cr-heading cr-${Tag} cr-align-${align}`}>{text}</Tag>;
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
              <Img src={src} {...altAttr} loading="lazy" decoding="async" />
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
          label: "Columns",
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
      render: ({ count, gap, widths, column1, column2, column3, column4 }) => {
        // Content in columns beyond `count` is kept (so lowering the count is
        // undoable) but not shown or published.
        const columns = [column1, column2, column3, column4].slice(0, Number(count));
        return (
          <div
            className={["cr-columns", `cr-columns-${count}`, columnClasses(Number(count), widths)].filter(Boolean).join(" ")}
            style={vars({ "--cr-columns-gap": spaceVar(gap) })}
          >
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
        const Title = headingTag(titleLevel, "h3");
        // Same rule as the Image block: missing alt is left out for the publish check.
        const altAttr = imageAlt.trim() ? { alt: imageAlt.trim() } : {};
        return (
          <article className={`cr-card cr-bg-${background}`}>
            {imageSrc.trim() ? (
              <Img className="cr-card-media" src={imageSrc} size="half" {...altAttr} loading="lazy" decoding="async" />
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
    ...(moreBlocks as unknown as Pick<Config<Components>["components"], keyof typeof moreBlocks>),
    ContactForm: ContactForm as unknown as Config<Components>["components"]["ContactForm"],
  },
};

type AnyRender = (props: Record<string, unknown> & { puck?: { isEditing?: boolean } }) => ReactNode;

/**
 * Wraps every block so it can be hidden per device (F029) or jumped to (F030).
 * The wrapper only exists when needed; it has `display: contents`, so the
 * block's own layout is unchanged where it shows. In the builder it carries
 * a label. An anchor is an empty marker element right before the block,
 * because an element with `display: contents` can't be scrolled to.
 */
function withVisibility(c: Config<Components>): Config<Components> {
  const components = Object.fromEntries(
    Object.entries(c.components).map(([name, comp]) => {
      const render = comp.render as unknown as AnyRender;
      const wrapped: AnyRender = (props) => {
        const out = render(props);
        const classes = hideClasses(props.hideOn);
        const anchor = cleanAnchor(props.anchor);
        if (!classes && !anchor) return out;
        return (
          <div className={classes ? `cr-show ${classes}` : "cr-show"} data-hidden={classes && props.puck?.isEditing ? hiddenLabel(props.hideOn) : undefined}>
            {anchor ? <span className="cr-anchor" id={anchor} /> : null}
            {out}
          </div>
        );
      };
      return [name, { ...comp, render: wrapped }];
    }),
  );
  return { ...c, components } as unknown as Config<Components>;
}

export const config: Config<Components> = withVisibility(blocks);

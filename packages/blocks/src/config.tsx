import type { Config, Slot } from "@puckeditor/core";
import type { ReactNode } from "react";
import { alignField, headingTag, paragraphs, vars, type Align } from "./block-helpers";
import { richParagraphs, type RichText } from "./rich-text";
import { RichTextView } from "./rich-text-view";
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
import { columnAlignNames, columnAligns, columnExtras, rowExtras, type ColumnAlign, type ColumnBox, type ColumnHighlight } from "./columns-v2";
import {
  backgroundKindNames,
  backgroundKindOf,
  backgroundKinds,
  cleanGradient,
  focusPosition,
  gradientCss,
  isSectionWidth,
  overlapNames,
  overlapSizes,
  sectionWidthNames,
  sectionWidths,
  videoAddress,
  videoType,
  type BackgroundKind,
  type FocalPoint,
  type OverlapSize,
  type SectionGradient,
  type SectionWidth,
} from "./sections-v2";
import type { SpacingStep } from "./tokens";
import { ContactForm, type ContactFormProps } from "./contact-form";
import { IconMark, iconBlocks, type DividerProps, type IconProps, type SocialLinksProps } from "./icon-blocks";
import { blocksV3, type PricingProps, type StatsProps, type TableProps, type VideoProps } from "./blocks-v3";
import { interactiveBlocks, type CardSliderProps, type MapProps, type SlideshowProps, type TabsProps } from "./interactive";
import {
  pageDesignBlocks,
  type BlogIntroProps,
  type BlogTitleProps,
  type PostCoverProps,
  type PostDetailsProps,
  type PostHeroProps,
  type PostListProps,
  type PostSummaryProps,
  type PostTitleProps,
} from "./page-design-blocks";
import { IconSvg, isIconName } from "./icons";
import { LinkedSection, type LinkedSectionProps } from "./linked-section-block";
import { placeholderBadge, placeholderLabel, uncopiedSampleLabel } from "./placeholders";
import { Img } from "./media-img";
import { safeUrl } from "./url";
import { entranceNames, entrances, sectionMotionClasses, type Entrance } from "./motion";
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
  /** F073 (all optional; Sections without them publish as before). */
  width?: SectionWidth;
  bgKind?: BackgroundKind;
  gradient?: SectionGradient;
  videoSrc?: string;
  focus?: FocalPoint;
  overlap?: OverlapSize;
  headerOver?: boolean;
  /** F075 (optional): how the section's blocks come in (missing: Rise), and a slower-moving photo. */
  entrance?: Entrance;
  parallax?: boolean;
  content: Slot;
};
/** `size` and `eyebrow` were added in F071; headings without them render as before. */
export type HeadingProps = { text: string; level: "h1" | "h2" | "h3" | "h4"; align: Align; size?: "normal" | "display"; eyebrow?: string };
/** `text` is rich text (F042); pages saved before F042 hold a plain string. */
export type TextProps = { text: RichText | string; align: Align; tone: "default" | "muted" };
export type ImageProps = { src: string; alt: string; caption: string };
/** `align` was added in F012; pages saved before it have none and stay left-aligned. */
/** F071 added "soft" and "arrow". */
/** `icon` and `iconAt` were added in F077 (missing: no icon). */
export type ButtonProps = { label: string; href: string; variant: "primary" | "secondary" | "soft" | "arrow"; align?: Align; icon?: string; iconAt?: "before" | "after" };
export type SpacerProps = { size: SpacingStep };
/** `widths` was added in F029; Columns saved before it keep the old per-device behaviour. */
export type ColumnsProps = {
  count: "2" | "3" | "4";
  gap: SpacingStep;
  widths?: ColumnWidths;
  /** F074 (all optional; rows without them publish as before). */
  valign?: ColumnAlign;
  box?: ColumnBox;
  highlight?: ColumnHighlight;
  rowGap?: SpacingStep;
  dividers?: boolean;
  phoneOrder?: "normal" | "reverse";
  sticky?: number;
  column1: Slot;
  column2: Slot;
  column3: Slot;
  column4: Slot;
};
/** `layout` was added in F071 ("cover": the photo fills the card); `icon` in F077 (shown when there's no photo). */
export type CardProps = {
  layout?: "stacked" | "cover";
  icon?: string;
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
export type Visibility = { hideOn?: HideOn; anchor?: string; placeholder?: string[] };

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
  Icon: IconProps & Visibility;
  Divider: DividerProps & Visibility;
  SocialLinks: SocialLinksProps & Visibility;
  Stats: StatsProps & Visibility;
  Video: VideoProps & Visibility;
  Table: TableProps & Visibility;
  Pricing: PricingProps & Visibility;
  Slideshow: SlideshowProps & Visibility;
  CardSlider: CardSliderProps & Visibility;
  Tabs: TabsProps & Visibility;
  Map: MapProps & Visibility;
  LinkedSection: LinkedSectionProps & Visibility;
  /** F082: blocks that fill themselves in, only in the post, blog and "Page not found" designs. */
  PostTitle: PostTitleProps & Visibility;
  PostDetails: PostDetailsProps & Visibility;
  PostSummary: PostSummaryProps & Visibility;
  PostCover: PostCoverProps & Visibility;
  PostHero: PostHeroProps & Visibility;
  PostContent: Visibility;
  BlogTitle: BlogTitleProps & Visibility;
  BlogIntro: BlogIntroProps & Visibility;
  PostList: PostListProps & Visibility;
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
    layout: { title: "Layout", components: ["Section", "Columns", "Grid", "Spacer", "Divider"] },
    content: { title: "Content", components: ["Heading", "Text", "Image", "Button", "Card", "Icon", "IconList", "Stats", "Table", "Pricing", "Quote", "Accordion", "Tabs", "SocialLinks"] },
    media: { title: "Media", components: ["Gallery", "Slideshow", "CardSlider", "Video", "ImageOverlay", "LogoRow", "Map"] },
    forms: { title: "Forms", components: ["ContactForm"] },
    // F043: added through Layouts → Linked sections, not from the block list.
    linked: { title: "Linked", components: ["LinkedSection"], visible: false },
    // F082: shown only in the design editors (apps/admin/src/designs).
    post: { title: "Post", components: ["PostTitle", "PostDetails", "PostSummary", "PostCover", "PostHero", "PostContent", "PostList"], visible: false },
    blog: { title: "Blog", components: ["BlogTitle", "BlogIntro", "PostList"], visible: false },
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
        width: {
          type: "select",
          label: "Width",
          options: sectionWidths.map((w) => ({ label: sectionWidthNames[w], value: w })),
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
        bgKind: {
          type: "radio",
          label: "Background",
          options: backgroundKinds.map((k) => ({ label: backgroundKindNames[k], value: k })),
        },
        gradient: {
          type: "object",
          label: "Gradient",
          objectFields: {
            to: { type: "text", label: "Ends in (site colour)" },
            direction: { type: "text", label: "Direction" },
          },
        },
        imageSrc: { type: "text", label: "Background image URL (optional)" },
        videoSrc: { type: "text", label: "Video address (.mp4 or .webm)" },
        focus: {
          type: "object",
          label: "Focal point",
          objectFields: { x: { type: "number", label: "Across (%)", min: 0, max: 100 }, y: { type: "number", label: "Down (%)", min: 0, max: 100 } },
        },
        tint: {
          type: "radio",
          label: "Image tint",
          options: tintLevels.map((l) => ({ label: tintNames[l], value: l })),
        },
        overlap: {
          type: "select",
          label: "Pull up over the section above",
          options: overlapSizes.map((o) => ({ label: overlapNames[o], value: o })),
        },
        headerOver: {
          type: "radio",
          label: "Header sits on this section",
          options: [
            { label: "No", value: false },
            { label: "Yes", value: true },
          ],
        },
        entrance: {
          type: "radio",
          label: "Entrance",
          options: entrances.map((e) => ({ label: entranceNames[e], value: e })),
        },
        parallax: {
          type: "radio",
          label: "Photo moves slower (parallax)",
          options: [
            { label: "No", value: false },
            { label: "Yes", value: true },
          ],
        },
        paddingY: spacingField("Vertical padding"),
        content: { type: "slot" },
      },
      defaultProps: { background: "background", paddingY: "lg", height: "auto", valign: "center", imageSrc: "", tint: "medium", content: [] },
      render: ({ background, paddingY, height, valign, imageSrc, tint, width, bgKind, gradient, videoSrc, focus, overlap, headerOver, entrance, parallax, content: Content }) => {
        const kind = backgroundKindOf({ bgKind, imageSrc });
        // An unsafe address (e.g. javascript:) means no image at all. Video needs its still photo.
        const image = (kind === "photo" || kind === "video") && imageSrc?.trim() ? safeUrl(imageSrc) : "#";
        const video = kind === "video" && image !== "#" ? videoAddress(videoSrc) : null;
        const grad = kind === "gradient" ? cleanGradient(gradient) : null;
        const position = focusPosition(focus);
        const classes = ["cr-section", `cr-style-${background}`, `cr-height-${height ?? "auto"}`, `cr-valign-${valign ?? "center"}`];
        if (isSectionWidth(width) && width !== "normal") classes.push(`cr-width-${width}`);
        if (overlap && overlap !== "none" && overlapSizes.includes(overlap)) classes.push(`cr-overlap-${overlap}`);
        if (headerOver === true) classes.push("cr-under-header");
        if (grad) classes.push("cr-has-gradient");
        classes.push(...sectionMotionClasses({ entrance, parallax }, image !== "#"));
        const style: Record<string, string> = { "--cr-section-pad": spaceVar(paddingY) };
        if (grad) style["--cr-section-gradient"] = gradientCss(grad);
        return (
          <section className={classes.join(" ")} style={vars(style)}>
            {image !== "#" ? (
              <>
                {/* Background photos are decoration; the tint keeps text readable on any photo. */}
                <Img className="cr-section-media" src={image} size="wide" alt="" decoding="async" style={position ? { objectPosition: position } : undefined} />
                {video ? (
                  // Hidden until VIDEO_SCRIPT starts it, only when the visitor allows motion (F073).
                  <video
                    className="cr-section-media cr-section-video"
                    data-cr-video=""
                    muted
                    loop
                    playsInline
                    preload="none"
                    aria-hidden="true"
                    tabIndex={-1}
                    hidden
                    style={position ? { objectPosition: position } : undefined}
                  >
                    <source src={video} type={videoType(video)} />
                  </video>
                ) : null}
                <div className={`cr-section-tint cr-tint-${tint ?? "medium"}`} aria-hidden="true" />
              </>
            ) : null}
            <div className="cr-container">
              <Content />
            </div>
            {video ? (
              <button className="cr-video-toggle" type="button" hidden>
                <span>Pause background video</span>
              </button>
            ) : null}
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
        // F071: a Display heading is a step above H1 (its look is set in Site settings → Typography).
        size: {
          type: "radio",
          label: "Size",
          options: [
            { label: "Normal", value: "normal" },
            { label: "Display", value: "display" },
          ],
        },
        eyebrow: { type: "text", label: "Small label above (optional)" },
      },
      defaultProps: { text: "Heading", level: "h2", align: "left", size: "normal", eyebrow: "" },
      render: ({ text, level, align, size, eyebrow }) => {
        const Tag = headingTag(level, "h2");
        const display = size === "display" ? " cr-display" : "";
        const label = eyebrow?.trim();
        if (!label) return <Tag className={`cr-heading cr-${Tag}${display} cr-align-${align}`}>{text}</Tag>;
        // The label is part of the heading group, so screen readers meet it with the heading (not as its own heading).
        return (
          <hgroup className={`cr-hgroup cr-align-${align}`}>
            <p className="cr-eyebrow">{label}</p>
            <Tag className={`cr-heading cr-${Tag}${display} cr-align-${align}`}>{text}</Tag>
          </hgroup>
        );
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
      defaultProps: { text: richParagraphs("Write something here."), align: "left", tone: "default" },
      // F042: rich text (older pages' plain text reads the same).
      render: ({ text, align, tone }) => (
        <div className={`cr-text cr-rich cr-align-${align} cr-tone-${tone}`}>
          <RichTextView value={text} />
        </div>
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
            { label: "Outline", value: "secondary" },
            { label: "Soft", value: "soft" },
            { label: "Text with arrow", value: "arrow" },
          ],
        },
        align: alignField,
        // F077: an icon before or after the label (decoration: the label says it all).
        icon: { type: "text", label: "Icon (optional)" },
        iconAt: {
          type: "radio",
          label: "Icon position",
          options: [
            { label: "Before the label", value: "before" },
            { label: "After the label", value: "after" },
          ],
        },
      },
      defaultProps: { label: "Learn more", href: "/", variant: "primary", align: "left", icon: "", iconAt: "before" },
      render: ({ label, href, variant, align, icon, iconAt }) => {
        const hasIcon = isIconName(icon);
        const after = hasIcon && iconAt === "after";
        const mark = hasIcon ? <IconSvg name={icon!} className="cr-button-icon" size={18} /> : null;
        return (
          <div className={`cr-button-row cr-align-${align ?? "left"}`}>
            <a className={`cr-button cr-button-${variant}${hasIcon ? " cr-has-icon" : ""}`} href={safeUrl(href)}>
              {hasIcon && !after ? mark : null}
              {label}
              {after ? mark : null}
              {/* The arrow is decoration; the label already says where the link goes. An icon after the label takes its place. */}
              {variant === "arrow" && !after ? <span className="cr-arrow" aria-hidden="true">→</span> : null}
            </a>
          </div>
        );
      },
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
        valign: {
          type: "radio",
          label: "Line up",
          options: columnAligns.map((a) => ({ label: columnAlignNames[a], value: a })),
        },
        box: {
          type: "object",
          label: "Boxes",
          objectFields: {
            style: { type: "text", label: "Style (none, background, surface, primary, dark)" },
            padding: { type: "text", label: "Padding (sm, md, lg)" },
            rounded: { type: "radio", label: "Rounded corners", options: [{ label: "Yes", value: true }, { label: "No", value: false }] },
          },
        },
        highlight: {
          type: "object",
          label: "Highlight a column",
          objectFields: { column: { type: "number", label: "Column", min: 0, max: 4 }, style: { type: "text", label: "Style" } },
        },
        rowGap: spacingField("Gap between rows"),
        dividers: { type: "radio", label: "Dividers", options: [{ label: "No", value: false }, { label: "Yes", value: true }] },
        phoneOrder: {
          type: "radio",
          label: "Order on phones",
          options: [
            { label: "As written", value: "normal" },
            { label: "Last first", value: "reverse" },
          ],
        },
        sticky: { type: "number", label: "Keep column in view (0 = none)", min: 0, max: 4 },
        column1: columnSlot,
        column2: columnSlot,
        column3: columnSlot,
        column4: columnSlot,
      },
      defaultProps: { count: "2", gap: "md", column1: [], column2: [], column3: [], column4: [] },
      render: (props) => {
        const { count, gap, widths, column1, column2, column3, column4 } = props;
        // Content in columns beyond `count` is kept (so lowering the count is
        // undoable) but not shown or published.
        const columns = [column1, column2, column3, column4].slice(0, Number(count));
        const row = rowExtras(props);
        return (
          <div
            className={["cr-columns", `cr-columns-${count}`, columnClasses(Number(count), widths), ...row.classes].filter(Boolean).join(" ")}
            style={vars({ "--cr-columns-gap": spaceVar(gap), ...row.vars })}
          >
            {columns.map((Column, i) => {
              const col = columnExtras(props, i + 1);
              return (
                <div className={["cr-column", ...col.classes].join(" ")} key={i} style={col.classes.length ? vars(col.vars) : undefined}>
                  <Column />
                </div>
              );
            })}
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
        icon: { type: "text", label: "Icon (shown when there's no photo)" },
        linkLabel: { type: "text", label: "Link text (say where it goes)" },
        linkHref: { type: "text", label: "Link" },
        background: backgroundField,
        layout: {
          type: "radio",
          label: "Layout",
          options: [
            { label: "Stacked", value: "stacked" },
            { label: "Photo fills the card", value: "cover" },
          ],
        },
      },
      defaultProps: {
        layout: "stacked",
        title: "Card title",
        titleLevel: "h3",
        text: "A short description.",
        imageSrc: "",
        imageAlt: "",
        linkLabel: "",
        linkHref: "",
        background: "surface",
      },
      render: ({ layout, imageSrc, imageAlt, icon, title, titleLevel, text, linkLabel, linkHref, background }) => {
        const Title = headingTag(titleLevel, "h3");
        // Same rule as the Image block: missing alt is left out for the publish check.
        const altAttr = imageAlt.trim() ? { alt: imageAlt.trim() } : {};
        // F071: without a photo, "Photo fills the card" falls back to stacked.
        const cover = layout === "cover" && !!imageSrc.trim();
        return (
          <article className={cover ? "cr-card cr-card-cover" : `cr-card cr-bg-${background}`}>
            {imageSrc.trim() ? (
              <Img className="cr-card-media" src={imageSrc} size="half" {...altAttr} loading="lazy" decoding="async" />
            ) : isIconName(icon) ? (
              // F077: an icon instead of a photo (decoration: the title says it all).
              <div className="cr-card-icon">
                <IconMark name={icon} look="circle" size="md" colour="primary" />
              </div>
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
    ...(iconBlocks as unknown as Pick<Config<Components>["components"], keyof typeof iconBlocks>),
    ...(blocksV3 as unknown as Pick<Config<Components>["components"], keyof typeof blocksV3>),
    ...(interactiveBlocks as unknown as Pick<Config<Components>["components"], keyof typeof interactiveBlocks>),
    LinkedSection: LinkedSection as unknown as Config<Components>["components"]["LinkedSection"],
    ...(pageDesignBlocks as unknown as Pick<Config<Components>["components"], keyof typeof pageDesignBlocks>),
  },
};

type AnyRender = (props: Record<string, unknown> & { puck?: { isEditing?: boolean } }) => ReactNode;

/**
 * Wraps every block so it can be hidden per device (F029) or jumped to (F030).
 * The wrapper only exists when needed; it has `display: contents`, so the
 * block's own layout is unchanged where it shows. In the builder it carries
 * a label. Sample content (F046) carries a mark the publish check finds.
 * An anchor is an empty marker element right before the block,
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
        // F046: sample content still to replace. Publishing stops on this attribute; the builder outlines it.
        const sample = placeholderLabel(name, props) || uncopiedSampleLabel(name, props);
        if (!classes && !anchor && !sample) return out;
        return (
          <div
            className={classes ? `cr-show ${classes}` : "cr-show"}
            data-hidden={classes && props.puck?.isEditing ? hiddenLabel(props.hideOn) : undefined}
            data-crust-placeholder={sample || undefined}
            data-replace={sample && props.puck?.isEditing ? placeholderBadge(name, props.placeholder) : undefined}
          >
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

/**
 * More elements (F032): Grid of cards, Gallery, Accordion, Icon list, Logo
 * row, Quote and Image overlay. All plain HTML and CSS, no JavaScript: the
 * accordion is <details>, lists are real lists.
 *
 * Repeating items (cards, photos, questions…) are Puck "array" fields. The
 * builder swaps them for a list editor with Move up/down buttons, so no
 * dragging is needed (apps/admin/src/items).
 */
import type { ComponentConfig } from "@puckeditor/core";
import type { ReactNode } from "react";
import { alignField, headingTag, paragraphs, type Align } from "./block-helpers";
import { sectionStyleIds, sectionStyleNames, tintLevels, tintNames, type SectionStyleId, type TintLevel } from "./section-styles";
import { Img } from "./media-img";
import { safeUrl } from "./url";

type Editing = { puck?: { isEditing?: boolean } };
type TitleLevel = "h2" | "h3" | "h4";

/** How many items each list can hold. */
export const itemLimits = { grid: 12, gallery: 24, accordion: 20, iconList: 20, logos: 12 } as const;

export type GridItem = { title: string; text: string; imageSrc: string; imageAlt: string; linkLabel: string; linkHref: string };
export type GridProps = { items: GridItem[]; columns: "2" | "3" | "4"; titleLevel: TitleLevel; background: "background" | "surface" | "primary" };

export type GalleryImage = { src: string; alt: string; caption: string };
export type GalleryProps = { images: GalleryImage[]; columns: "2" | "3" | "4"; shape: "square" | "wide" | "original" };

export type AccordionItem = { question: string; answer: string };
export type AccordionProps = { items: AccordionItem[]; firstOpen: "yes" | "no"; oneAtATime: "yes" | "no" };

export const listIcons = ["check", "arrow", "star", "dot", "plus", "heart"] as const;
export type ListIcon = (typeof listIcons)[number];
export const listIconNames: Record<ListIcon, string> = { check: "Check", arrow: "Arrow", star: "Star", dot: "Dot", plus: "Plus", heart: "Heart" };
export type IconListProps = { items: { text: string }[]; icon: ListIcon; iconColor: "primary" | "text" };

export type Logo = { src: string; alt: string; href: string };
export type LogoRowProps = { logos: Logo[]; logoSize: "small" | "medium" | "large"; grayscale: "yes" | "no"; align: Align };

export type QuoteProps = { text: string; name: string; role: string; imageSrc: string; align: Align; size: "normal" | "large" };

export type ImageOverlayProps = {
  imageSrc: string;
  imageAlt: string;
  title: string;
  titleLevel: TitleLevel;
  text: string;
  linkLabel: string;
  linkHref: string;
  background: SectionStyleId;
  tint: TintLevel;
  position: "center" | "bottom-left" | "top-left";
  height: "medium" | "large";
};

const levelField = {
  type: "select" as const,
  label: "Title level",
  options: [
    { label: "H2", value: "h2" },
    { label: "H3", value: "h3" },
    { label: "H4", value: "h4" },
  ],
};
const columnsField = {
  type: "radio" as const,
  label: "Columns",
  options: [
    { label: "2", value: "2" },
    { label: "3", value: "3" },
    { label: "4", value: "4" },
  ],
};
const yesNo = (label: string) => ({
  type: "radio" as const,
  label,
  options: [
    { label: "Yes", value: "yes" },
    { label: "No", value: "no" },
  ],
});

/** An image's alt attribute: left out when empty, so the publish check can flag it (as with the Image block). */
const altOf = (alt: string) => (alt.trim() ? { alt: alt.trim() } : {});

function Placeholder({ children }: { children: ReactNode }) {
  return <div className="cr-image-empty">{children}</div>;
}

// --- Icons: drawn inline, decoration only (the text says it all) -------------

const iconPaths: Record<ListIcon, ReactNode> = {
  check: <path d="M4 12.5l5 5L20 6.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />,
  arrow: <path d="M4 12h15M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />,
  star: <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" fill="currentColor" />,
  dot: <circle cx="12" cy="12" r="5" fill="currentColor" />,
  plus: <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />,
  heart: <path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z" fill="currentColor" />,
};

export function ListIconSvg({ icon }: { icon: ListIcon }) {
  return (
    <svg className="cr-list-icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
      {iconPaths[icon] ?? iconPaths.check}
    </svg>
  );
}

// --- Blocks ---------------------------------------------------------------------

export const Grid: ComponentConfig<GridProps> = {
  label: "Grid of cards",
  fields: {
    items: {
      type: "array",
      label: "Cards",
      max: itemLimits.grid,
      getItemSummary: (item) => item.title || "Card",
      defaultItemProps: { title: "Card title", text: "A short description.", imageSrc: "", imageAlt: "", linkLabel: "", linkHref: "" },
      arrayFields: {
        title: { type: "text", label: "Title" },
        text: { type: "textarea", label: "Text" },
        imageSrc: { type: "text", label: "Image URL (optional)" },
        imageAlt: { type: "text", label: "Image alt text (describe the image)" },
        linkLabel: { type: "text", label: "Link text (say where it goes)" },
        linkHref: { type: "text", label: "Link" },
      },
    },
    columns: columnsField,
    titleLevel: levelField,
    background: {
      type: "select",
      label: "Card background",
      options: [
        { label: "Page", value: "background" },
        { label: "Surface", value: "surface" },
        { label: "Primary", value: "primary" },
      ],
    },
  },
  defaultProps: {
    items: [
      { title: "Plan", text: "Sketch the pages you need.", imageSrc: "", imageAlt: "", linkLabel: "", linkHref: "" },
      { title: "Build", text: "Lay them out with blocks.", imageSrc: "", imageAlt: "", linkLabel: "", linkHref: "" },
      { title: "Publish", text: "Go live in one click.", imageSrc: "", imageAlt: "", linkLabel: "", linkHref: "" },
    ],
    columns: "3",
    titleLevel: "h3",
    background: "surface",
  },
  render: ({ items, columns, titleLevel, background }) => {
    const Title = headingTag(titleLevel, "h3");
    return (
      <ul className={`cr-grid cr-grid-${columns}`} role="list">
        {(items ?? []).map((c, i) => (
          <li key={i}>
            <article className={`cr-card cr-bg-${background}`}>
              {c.imageSrc?.trim() ? <Img className="cr-card-media" src={c.imageSrc} size="third" {...altOf(c.imageAlt ?? "")} loading="lazy" decoding="async" /> : null}
              <div className="cr-card-body">
                {c.title?.trim() ? <Title className="cr-heading cr-card-title">{c.title}</Title> : null}
                {c.text?.trim() ? <div className="cr-text">{paragraphs(c.text)}</div> : null}
                {c.linkLabel?.trim() && c.linkHref?.trim() ? (
                  <a className="cr-card-link" href={safeUrl(c.linkHref)}>
                    {c.linkLabel}
                  </a>
                ) : null}
              </div>
            </article>
          </li>
        ))}
      </ul>
    );
  },
};

export const Gallery: ComponentConfig<GalleryProps> = {
  label: "Gallery",
  fields: {
    images: {
      type: "array",
      label: "Photos",
      max: itemLimits.gallery,
      getItemSummary: (item) => item.alt || item.caption || "Photo",
      defaultItemProps: { src: "", alt: "", caption: "" },
      arrayFields: {
        src: { type: "text", label: "Image URL" },
        alt: { type: "text", label: "Alt text (describe the image)" },
        caption: { type: "text", label: "Caption (optional)" },
      },
    },
    columns: columnsField,
    shape: {
      type: "radio",
      label: "Shape",
      options: [
        { label: "Square", value: "square" },
        { label: "Wide", value: "wide" },
        { label: "As uploaded", value: "original" },
      ],
    },
  },
  defaultProps: {
    images: [
      { src: "", alt: "", caption: "" },
      { src: "", alt: "", caption: "" },
      { src: "", alt: "", caption: "" },
    ],
    columns: "3",
    shape: "square",
  },
  render: ({ images, columns, shape, puck }: GalleryProps & Editing) => {
    // Photos without an address are only placeholders in the builder.
    const list = (images ?? []).filter((im) => im.src?.trim() || puck?.isEditing);
    return (
      <ul className={`cr-gallery cr-grid-${columns} cr-shape-${shape}`} role="list">
        {list.map((im, i) => (
          <li key={i}>
            <figure className="cr-gallery-item">
              {im.src?.trim() ? <Img src={im.src} size="third" {...altOf(im.alt ?? "")} loading="lazy" decoding="async" /> : <Placeholder>Add an image URL</Placeholder>}
              {im.caption?.trim() ? <figcaption>{im.caption}</figcaption> : null}
            </figure>
          </li>
        ))}
      </ul>
    );
  },
};

export const Accordion: ComponentConfig<AccordionProps> = {
  label: "Accordion / FAQ",
  fields: {
    items: {
      type: "array",
      label: "Questions",
      max: itemLimits.accordion,
      getItemSummary: (item) => item.question || "Question",
      defaultItemProps: { question: "A question people ask", answer: "The answer." },
      arrayFields: {
        question: { type: "text", label: "Question (always shown)" },
        answer: { type: "textarea", label: "Answer (shown when opened)" },
      },
    },
    firstOpen: yesNo("Open the first one"),
    oneAtATime: yesNo("Only one open at a time"),
  },
  defaultProps: {
    items: [
      { question: "How long does a project take?", answer: "Most sites are ready in two to four weeks." },
      { question: "Can I edit the site myself?", answer: "Yes. Every page is built from blocks you can change." },
    ],
    firstOpen: "no",
    oneAtATime: "no",
  },
  render: ({ id, items, firstOpen, oneAtATime }: AccordionProps & { id?: string }) => (
    <div className="cr-accordion">
      {(items ?? []).map((it, i) => (
        // `name` groups the panels so opening one closes the others, in the browser itself (no JavaScript).
        <details key={i} className="cr-accordion-item" open={firstOpen === "yes" && i === 0} name={oneAtATime === "yes" ? `acc-${id ?? "group"}` : undefined}>
          <summary>{it.question}</summary>
          <div className="cr-accordion-body cr-text">{paragraphs(it.answer ?? "")}</div>
        </details>
      ))}
    </div>
  ),
};

export const IconList: ComponentConfig<IconListProps> = {
  label: "Icon list",
  fields: {
    items: {
      type: "array",
      label: "Lines",
      max: itemLimits.iconList,
      getItemSummary: (item) => item.text || "Line",
      defaultItemProps: { text: "Another point" },
      arrayFields: { text: { type: "text", label: "Text" } },
    },
    icon: {
      type: "select",
      label: "Icon",
      options: listIcons.map((i) => ({ label: listIconNames[i], value: i })),
    },
    iconColor: {
      type: "radio",
      label: "Icon colour",
      options: [
        { label: "Accent", value: "primary" },
        { label: "Text", value: "text" },
      ],
    },
  },
  defaultProps: {
    items: [{ text: "Fast, static pages" }, { text: "Accessible by default" }, { text: "No monthly fees" }],
    icon: "check",
    iconColor: "primary",
  },
  render: ({ items, icon, iconColor }) => (
    <ul className={`cr-icon-list cr-icon-${iconColor}`} role="list">
      {(items ?? []).map((it, i) => (
        <li key={i}>
          <ListIconSvg icon={icon} />
          <span>{it.text}</span>
        </li>
      ))}
    </ul>
  ),
};

export const LogoRow: ComponentConfig<LogoRowProps> = {
  label: "Logo row",
  fields: {
    logos: {
      type: "array",
      label: "Logos",
      max: itemLimits.logos,
      getItemSummary: (item) => item.alt || "Logo",
      defaultItemProps: { src: "", alt: "", href: "" },
      arrayFields: {
        src: { type: "text", label: "Logo image URL" },
        alt: { type: "text", label: "Company name (alt text)" },
        href: { type: "text", label: "Link (optional)" },
      },
    },
    logoSize: {
      type: "radio",
      label: "Size",
      options: [
        { label: "Small", value: "small" },
        { label: "Medium", value: "medium" },
        { label: "Large", value: "large" },
      ],
    },
    grayscale: yesNo("Grey until hovered"),
    align: alignField,
  },
  defaultProps: {
    logos: [
      { src: "", alt: "", href: "" },
      { src: "", alt: "", href: "" },
      { src: "", alt: "", href: "" },
      { src: "", alt: "", href: "" },
    ],
    logoSize: "medium",
    grayscale: "yes",
    align: "center",
  },
  render: ({ logos, logoSize, grayscale, align, puck }: LogoRowProps & Editing) => {
    const list = (logos ?? []).filter((l) => l.src?.trim() || puck?.isEditing);
    return (
      <ul className={`cr-logos cr-logos-${logoSize} cr-align-${align}${grayscale === "yes" ? " cr-logos-grey" : ""}`} role="list">
        {list.map((l, i) => {
          const img = l.src?.trim() ? <Img src={l.src} size="small" {...altOf(l.alt ?? "")} loading="lazy" decoding="async" /> : <Placeholder>Logo</Placeholder>;
          return <li key={i}>{l.href?.trim() ? <a href={safeUrl(l.href)}>{img}</a> : img}</li>;
        })}
      </ul>
    );
  },
};

export const Quote: ComponentConfig<QuoteProps> = {
  label: "Quote",
  fields: {
    text: { type: "textarea", label: "Quote" },
    name: { type: "text", label: "Who said it" },
    role: { type: "text", label: "Their role or company (optional)" },
    imageSrc: { type: "text", label: "Photo URL (optional)" },
    align: alignField,
    size: {
      type: "radio",
      label: "Size",
      options: [
        { label: "Normal", value: "normal" },
        { label: "Large", value: "large" },
      ],
    },
  },
  defaultProps: { text: "Crust made our site faster and easier to change.", name: "Alex Rivera", role: "Studio Rivera", imageSrc: "", align: "left", size: "normal" },
  render: ({ text, name, role, imageSrc, align, size }) => (
    <figure className={`cr-quote cr-quote-${size} cr-align-${align}`}>
      <blockquote className="cr-quote-text">{paragraphs(text)}</blockquote>
      {name.trim() || role.trim() ? (
        <figcaption className="cr-quote-by">
          {/* The name is right next to the photo, so the photo itself is decoration. */}
          {imageSrc.trim() ? <Img className="cr-quote-photo" src={imageSrc} size="small" alt="" loading="lazy" decoding="async" /> : null}
          <span>
            {name.trim() ? <span className="cr-quote-name">{name}</span> : null}
            {role.trim() ? <span className="cr-quote-role">{role}</span> : null}
          </span>
        </figcaption>
      ) : null}
    </figure>
  ),
};

export const ImageOverlay: ComponentConfig<ImageOverlayProps> = {
  label: "Image overlay",
  fields: {
    imageSrc: { type: "text", label: "Image URL" },
    imageAlt: { type: "text", label: "Alt text (describe the image)" },
    title: { type: "text", label: "Title" },
    titleLevel: levelField,
    text: { type: "textarea", label: "Text" },
    linkLabel: { type: "text", label: "Link text (say where it goes)" },
    linkHref: { type: "text", label: "Link" },
    background: {
      type: "select",
      label: "Text style",
      options: sectionStyleIds.map((id) => ({ label: sectionStyleNames[id], value: id })),
    },
    tint: {
      type: "radio",
      label: "Image tint",
      options: tintLevels.map((l) => ({ label: tintNames[l], value: l })),
    },
    position: {
      type: "radio",
      label: "Text position",
      options: [
        { label: "Middle", value: "center" },
        { label: "Bottom left", value: "bottom-left" },
        { label: "Top left", value: "top-left" },
      ],
    },
    height: {
      type: "radio",
      label: "Height",
      options: [
        { label: "Medium", value: "medium" },
        { label: "Large", value: "large" },
      ],
    },
  },
  defaultProps: {
    imageSrc: "",
    imageAlt: "",
    title: "A title on a photo",
    titleLevel: "h2",
    text: "The tint keeps this text readable on any photo.",
    linkLabel: "",
    linkHref: "",
    background: "dark",
    tint: "medium",
    position: "bottom-left",
    height: "medium",
  },
  render: ({ imageSrc, imageAlt, title, titleLevel, text, linkLabel, linkHref, background, tint, position, height }) => {
    const Title = headingTag(titleLevel, "h2");
    const image = imageSrc.trim() ? safeUrl(imageSrc) : "#";
    // The tint is the style's background over the photo, strong enough for its text (see effectiveTint).
    return (
      <div className={`cr-overlay cr-style-${background} cr-overlay-${position} cr-overlay-${height}`}>
        {image !== "#" ? <Img className="cr-section-media" src={image} size="wide" {...altOf(imageAlt)} loading="lazy" decoding="async" /> : null}
        <div className={`cr-section-tint cr-tint-${tint}`} aria-hidden="true" />
        <div className="cr-overlay-body">
          {title.trim() ? <Title className="cr-heading cr-overlay-title">{title}</Title> : null}
          {text.trim() ? <div className="cr-text">{paragraphs(text)}</div> : null}
          {linkLabel.trim() && linkHref.trim() ? (
            <a className="cr-button cr-button-primary" href={safeUrl(linkHref)}>
              {linkLabel}
            </a>
          ) : null}
        </div>
      </div>
    );
  },
};

export const moreBlocks = { Grid, Gallery, Accordion, IconList, LogoRow, Quote, ImageOverlay };

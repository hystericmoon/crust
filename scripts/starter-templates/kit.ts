/**
 * F084: the block helpers the rebuilt starter templates are written with.
 * Every page gets its own `kit`, whose ids count up (`home-heading-3`), so a
 * rebuilt template file is byte-for-byte the same.
 *
 * Marks (F046): everything that describes the made-up business (words,
 * figures, names, prices, photos) is marked "to replace"; wording that
 * suits any business of the kind (button labels, "How we work") isn't.
 */
import { richParagraphs, type Page, type RichText } from "@crust/blocks";
import { allPhotos } from "./photo-sets";

export type Block = Page["puck"]["content"][number];
type Props = Record<string, unknown>;
type Align = "left" | "center" | "right";
type Level = "h1" | "h2" | "h3" | "h4";
type Step = "xs" | "sm" | "md" | "lg" | "xl";
type Style = "background" | "surface" | "primary" | "dark";

export const img = (file: string) => `/media/${file}`;
export function altOf(file: string): string {
  const p = allPhotos.find((x) => x.file === file);
  if (!p) throw new Error(`No photo called ${file}`);
  return p.alt;
}

export interface SectionOptions {
  paddingY?: Step;
  height?: "auto" | "medium" | "large" | "full";
  valign?: "top" | "center" | "bottom";
  width?: "narrow" | "normal" | "wide" | "full" | "left" | "right";
  photo?: string;
  tint?: "light" | "medium" | "strong";
  focus?: { x: number; y: number };
  gradient?: { to: "background" | "surface" | "text" | "muted" | "primary" | "onPrimary"; direction: "down" | "diagonal" | "across" | "glow" };
  overlap?: "sm" | "md" | "lg";
  entrance?: "rise" | "zoom" | "slide" | "none";
  parallax?: boolean;
  anchor?: string;
}

export interface HeadingOptions {
  level?: Level;
  align?: Align;
  eyebrow?: string;
  display?: boolean;
  /** Mark the words "to replace" (default true). */
  mark?: boolean;
}

export interface ColumnOptions {
  gap?: Step;
  valign?: "top" | "middle" | "bottom";
  widths?: string;
  box?: { style: Style | "none"; padding: "sm" | "md" | "lg"; rounded: boolean };
  highlight?: { column: number; style: Style };
  dividers?: boolean;
  sticky?: number;
  phoneOrder?: "normal" | "reverse";
  rowGap?: Step;
}

export interface CardItem {
  title: string;
  text: string;
  photo?: string;
  link?: [string, string];
}

/** One rich-text paragraph with a link inside it: "words [label](href) more words". */
export function linked(before: string, label: string, href: string, after = ""): RichText {
  return { rich: 1, blocks: [{ type: "p", children: [...(before ? [{ text: before }] : []), { text: label, href }, ...(after ? [{ text: after }] : [])] }] } as RichText;
}

export function kit(prefix: string) {
  let n = 0;
  const id = (kind: string) => `${prefix}-${kind}-${++n}`;
  const block = (type: string, props: Props): Block => ({ type, props: { id: id(type.toLowerCase()), ...props } }) as Block;

  const section = (background: Style, content: Block[], o: SectionOptions = {}): Block =>
    block("Section", {
      background,
      paddingY: o.paddingY ?? "lg",
      height: o.height ?? "auto",
      valign: o.valign ?? "center",
      imageSrc: o.photo ? img(o.photo) : "",
      tint: o.tint ?? "medium",
      ...(o.width && o.width !== "normal" ? { width: o.width } : {}),
      ...(o.photo ? { bgKind: "photo", placeholder: ["imageSrc"] } : o.gradient ? { bgKind: "gradient", gradient: o.gradient } : {}),
      ...(o.focus ? { focus: o.focus } : {}),
      ...(o.overlap ? { overlap: o.overlap } : {}),
      ...(o.entrance ? { entrance: o.entrance } : {}),
      ...(o.parallax ? { parallax: true } : {}),
      ...(o.anchor ? { anchor: o.anchor } : {}),
      content,
    });

  const heading = (text: string, o: HeadingOptions = {}): Block => {
    const mark = o.mark ?? true;
    const marked = [...(mark ? ["text"] : []), ...(mark && o.eyebrow ? ["eyebrow"] : [])];
    return block("Heading", {
      text,
      level: o.level ?? "h2",
      align: o.align ?? "left",
      size: o.display ? "display" : "normal",
      eyebrow: o.eyebrow ?? "",
      ...(marked.length ? { placeholder: marked } : {}),
    });
  };
  const h1 = (text: string, o: Omit<HeadingOptions, "level"> = {}) => heading(text, { display: true, ...o, level: "h1" });

  /** Paragraphs of sample words, marked to replace. */
  const text = (paragraphs: string | string[] | RichText, o: { align?: Align; tone?: "default" | "muted" } = {}): Block =>
    block("Text", {
      text: typeof paragraphs === "string" ? richParagraphs(paragraphs) : Array.isArray(paragraphs) ? richParagraphs(...paragraphs) : paragraphs,
      align: o.align ?? "left",
      tone: o.tone ?? "muted",
      placeholder: ["text"],
    });
  /** A quiet link that says where it goes: not sample content (F052). */
  const link = (label: string, href: string, align: Align = "left"): Block =>
    block("Text", { text: { rich: 1, blocks: [{ type: "p", children: [{ text: label, href }] }] }, align, tone: "default" });
  const button = (label: string, href: string, variant: "primary" | "secondary" | "soft" | "arrow" = "primary", o: { align?: Align; icon?: string } = {}): Block =>
    block("Button", { label, href, variant, align: o.align ?? "left", ...(o.icon ? { icon: o.icon, iconAt: "after" } : {}) });
  const spacer = (size: Step = "sm"): Block => block("Spacer", { size });
  const image = (file: string, caption = ""): Block => block("Image", { src: img(file), alt: altOf(file), caption, placeholder: ["src"] });
  const divider = (kind: "line" | "accent" | "label" | "dots" = "line", o: { label?: string; width?: "short" | "medium" | "full"; align?: Align; space?: Step } = {}): Block =>
    block("Divider", { kind, label: o.label ?? "", width: o.width ?? "full", space: o.space ?? "sm", align: o.align ?? "left" });
  const icon = (name: string, look: "plain" | "circle" | "square" = "circle", o: { size?: "sm" | "md" | "lg"; align?: Align } = {}): Block =>
    block("Icon", { icon: name, look, size: o.size ?? "md", colour: "primary", label: "", href: "", align: o.align ?? "left" });

  const columns = (cols: Block[][], o: ColumnOptions = {}): Block =>
    block("Columns", {
      count: String(cols.length),
      gap: o.gap ?? "lg",
      column1: cols[0] ?? [],
      column2: cols[1] ?? [],
      column3: cols[2] ?? [],
      column4: cols[3] ?? [],
      widths: { desktop: o.widths ?? "equal", tablet: cols.length === 2 ? (o.widths ?? "equal") : "wrap", phone: "stack" },
      ...(o.valign ? { valign: o.valign } : {}),
      ...(o.box ? { box: o.box } : {}),
      ...(o.highlight ? { highlight: o.highlight } : {}),
      ...(o.dividers ? { dividers: true } : {}),
      ...(o.sticky ? { sticky: o.sticky } : {}),
      ...(o.phoneOrder ? { phoneOrder: o.phoneOrder } : {}),
      ...(o.rowGap ? { rowGap: o.rowGap } : {}),
    });

  const cardItems = (items: CardItem[]) =>
    items.map((i) => ({
      title: i.title,
      text: i.text,
      imageSrc: i.photo ? img(i.photo) : "",
      imageAlt: i.photo ? altOf(i.photo) : "",
      linkLabel: i.link?.[0] ?? "",
      linkHref: i.link?.[1] ?? "",
    }));
  const grid = (items: CardItem[], o: { columns?: "2" | "3" | "4"; background?: Style; level?: Level } = {}): Block =>
    block("Grid", { columns: o.columns ?? "3", titleLevel: o.level ?? "h3", background: o.background ?? "surface", items: cardItems(items), placeholder: ["items"] });
  const cardSlider = (name: string, items: CardItem[], o: { visible?: "2" | "3" | "4"; background?: Style; level?: Level } = {}): Block =>
    block("CardSlider", { name, items: cardItems(items), visible: o.visible ?? "3", titleLevel: o.level ?? "h3", background: o.background ?? "surface", placeholder: ["items"] });
  const slideshow = (name: string, slides: { photo: string; title: string; text: string; link?: [string, string] }[], o: { ratio?: "16:9" | "3:2" | "4:3" | "21:9"; level?: Level } = {}): Block =>
    block("Slideshow", {
      name,
      ratio: o.ratio ?? "16:9",
      autoplay: "no",
      speed: "8",
      titleLevel: o.level ?? "h3",
      slides: slides.map((s) => ({ imageSrc: img(s.photo), imageAlt: altOf(s.photo), title: s.title, text: s.text, linkLabel: s.link?.[0] ?? "", linkHref: s.link?.[1] ?? "" })),
      placeholder: ["slides"],
    });
  const gallery = (files: { file: string; caption?: string }[], o: { columns?: "2" | "3" | "4"; shape?: "square" | "wide" | "original"; lightbox?: boolean } = {}): Block =>
    block("Gallery", {
      columns: o.columns ?? "3",
      shape: o.shape ?? "wide",
      ...(o.lightbox ? { lightbox: "yes" } : {}),
      images: files.map((f) => ({ src: img(f.file), alt: altOf(f.file), caption: f.caption ?? "" })),
      placeholder: ["images"],
    });
  const overlay = (file: string, title: string, body: string, o: { link?: [string, string]; height?: "medium" | "large"; style?: Style; position?: string; level?: Level } = {}): Block =>
    block("ImageOverlay", {
      imageSrc: img(file),
      imageAlt: altOf(file),
      title,
      titleLevel: o.level ?? "h3",
      text: body,
      linkLabel: o.link?.[0] ?? "",
      linkHref: o.link?.[1] ?? "",
      background: o.style ?? "dark",
      tint: "medium",
      position: o.position ?? "bottom-left",
      height: o.height ?? "medium",
      placeholder: ["imageSrc", "title", "text"],
    });
  const quote = (words: string, name: string, role: string, o: { align?: Align; size?: "normal" | "large" } = {}): Block =>
    block("Quote", { text: words, name, role, imageSrc: "", align: o.align ?? "left", size: o.size ?? "large", placeholder: ["text", "name", "role"] });
  const stats = (items: [string, string, string?][], o: { look?: "plain" | "lines" | "boxes"; size?: "md" | "lg"; colour?: "text" | "primary"; align?: Align } = {}): Block =>
    block("Stats", {
      look: o.look ?? "lines",
      size: o.size ?? "lg",
      colour: o.colour ?? "text",
      align: o.align ?? "left",
      items: items.map(([value, label, detail]) => ({ value, label, detail: detail ?? "" })),
      placeholder: ["items"],
    });
  const iconList = (items: (string | [string, string])[], iconName = "check"): Block =>
    block("IconList", {
      icon: iconName,
      iconColor: "primary",
      items: items.map((i) => (typeof i === "string" ? { text: i } : { text: i[0], icon: i[1] })),
      placeholder: ["items"],
    });
  const steps = (items: string[], numberStyle: "circle" | "large" | "plain" = "large"): Block =>
    block("IconList", { icon: "numbers", numberStyle, iconColor: "primary", items: items.map((t) => ({ text: t })), placeholder: ["items"] });
  const accordion = (items: [string, string][]): Block =>
    block("Accordion", { firstOpen: "yes", oneAtATime: "no", items: items.map(([question, answer]) => ({ question, answer })), placeholder: ["items"] });
  const tabs = (items: [string, string][], look: "underline" | "pills" | "side" = "underline", level: Level = "h3"): Block =>
    block("Tabs", { tabs: items.map(([label, t]) => ({ label, text: t })), look, titleLevel: level, placeholder: ["tabs"] });
  const table = (caption: string, rows: string[][], o: { headers?: "top" | "both" | "none"; look?: "lines" | "stripes" } = {}): Block =>
    block("Table", { caption, rows, headers: o.headers ?? "top", look: o.look ?? "lines", placeholder: ["caption", "rows"] });
  const pricing = (
    plans: { name: string; price: string; period: string; description: string; features: string[]; button: [string, string] }[],
    o: { highlight?: "none" | "1" | "2" | "3" | "4"; badge?: string; planStyle?: Style; highlightStyle?: Style; level?: Level } = {},
  ): Block =>
    block("Pricing", {
      plans: plans.map((p) => ({ name: p.name, price: p.price, period: p.period, description: p.description, features: p.features.join("\n"), buttonLabel: p.button[0], buttonHref: p.button[1] })),
      highlight: o.highlight ?? "none",
      badge: o.badge ?? "",
      planStyle: o.planStyle ?? "surface",
      highlightStyle: o.highlightStyle ?? "primary",
      titleLevel: o.level ?? "h3",
      placeholder: ["plans"],
    });
  const logos = (items: { file: string; alt: string; width: number; height: number }[], o: { moving?: boolean } = {}): Block =>
    block("LogoRow", {
      logoSize: "medium",
      grayscale: "yes",
      align: "center",
      ...(o.moving ? { moving: "yes" } : {}),
      logos: items.map((l) => ({ src: img(l.file), alt: l.alt, href: "" })),
      placeholder: ["logos"],
    });
  const form = (message: string, submit: string, success: string): Block =>
    block("ContactForm", { nameLabel: "Your name", emailLabel: "Email", messageLabel: message, fields: [], submitLabel: submit, successMessage: success });
  const linkedSection = (section: string): Block => block("LinkedSection", { section });
  const raw = block;

  return { id, section, heading, h1, text, link, button, spacer, image, divider, icon, columns, grid, cardSlider, slideshow, gallery, overlay, quote, stats, iconList, steps, accordion, tabs, table, pricing, logos, form, linkedSection, raw };
}
export type Kit = ReturnType<typeof kit>;

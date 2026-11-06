/**
 * Layout library v2 (F080): about 60 sections and 10 whole pages built on the
 * Milestone 8 layer (display headings and labels, photo and gradient
 * backgrounds, boxed and highlighted columns, icons, figures, sliders, tabs,
 * maps). Like the first library they use only section styles and tokens, so
 * they take on any site's look.
 *
 * Photos are the bundled samples (`layout-photos.ts`), marked "to replace"
 * (F046): the builder copies them into the Media library on insert and the
 * publish check waits until each is replaced or kept on purpose.
 */
import type { ComponentData } from "@puckeditor/core";
import { layoutLogos, layoutPhotoSrc, layoutPhotos, type LayoutPhoto, type LayoutPhotoId } from "./layout-photos";
import type { PageLayout, SectionLayout } from "./layouts";
import { richParagraphs } from "./rich-text";
import type { SectionStyleId } from "./section-styles";
import { gradientColours, gradientReads, type GradientDirection } from "./sections-v2";
import type { ColorRole, SiteTokens, SpacingStep } from "./tokens";

type Align = "left" | "center" | "right";
type Level = "h1" | "h2" | "h3" | "h4";
type Props = Record<string, unknown>;

// --- Block helpers -------------------------------------------------------------------

const uid = (type: string) => `${type}-${globalThis.crypto.randomUUID()}`;
const block = (type: string, props: Props): ComponentData => ({ type, props: { id: uid(type), ...props } });

const P = (id: LayoutPhotoId): LayoutPhoto => layoutPhotos[id];
const src = (id: LayoutPhotoId) => layoutPhotoSrc(P(id));
const alt = (id: LayoutPhotoId) => P(id).alt;

interface SectionOptions {
  paddingY?: SpacingStep;
  height?: "auto" | "medium" | "large" | "full";
  valign?: "top" | "center" | "bottom";
  width?: "narrow" | "normal" | "wide" | "full" | "left" | "right";
  photo?: LayoutPhotoId;
  tint?: "light" | "medium" | "strong";
  focus?: { x: number; y: number };
  gradient?: { to: ColorRole; direction: GradientDirection };
  overlap?: "sm" | "md" | "lg";
  headerOver?: boolean;
  parallax?: boolean;
}

const section = (background: SectionStyleId, content: ComponentData[], o: SectionOptions = {}) =>
  block("Section", {
    background,
    paddingY: o.paddingY ?? "lg",
    height: o.height ?? "auto",
    valign: o.valign ?? "center",
    imageSrc: o.photo ? src(o.photo) : "",
    tint: o.tint ?? "medium",
    ...(o.width && o.width !== "normal" ? { width: o.width } : {}),
    ...(o.photo ? { bgKind: "photo", placeholder: ["imageSrc"] } : o.gradient ? { bgKind: "gradient", gradient: o.gradient } : {}),
    ...(o.focus ? { focus: o.focus } : {}),
    ...(o.overlap ? { overlap: o.overlap } : {}),
    ...(o.headerOver ? { headerOver: true } : {}),
    ...(o.parallax ? { parallax: true } : {}),
    content,
  });

interface HeadingOptions {
  level?: Level;
  align?: Align;
  eyebrow?: string;
  display?: boolean;
}
const heading = (text: string, o: HeadingOptions = {}) =>
  block("Heading", { text, level: o.level ?? "h2", align: o.align ?? "left", size: o.display ? "display" : "normal", eyebrow: o.eyebrow ?? "" });
const h1 = (text: string, o: Omit<HeadingOptions, "level"> = {}) => heading(text, { ...o, level: "h1", display: o.display ?? true });
const h3 = (text: string, align: Align = "left") => heading(text, { level: "h3", align });
const text = (t: string, align: Align = "left", tone: "default" | "muted" = "muted") => block("Text", { text: richParagraphs(t), align, tone });
const button = (label: string, href: string, variant: "primary" | "secondary" | "soft" | "arrow" = "primary", align: Align = "left", icon = "") =>
  block("Button", { label, href, variant, align, icon, iconAt: "after" });
const spacer = (size: SpacingStep = "sm") => block("Spacer", { size });
const image = (id: LayoutPhotoId, caption = "") => block("Image", { src: src(id), alt: alt(id), caption, placeholder: ["src"] });
const divider = (kind: "line" | "accent" | "label" | "dots", label = "", width: "short" | "medium" | "full" = "full", align: Align = "left") =>
  block("Divider", { kind, label, width, space: "sm", align });
const icon = (name: string, look: "plain" | "circle" | "square" = "circle", size: "sm" | "md" | "lg" = "md", align: Align = "left") =>
  block("Icon", { icon: name, look, size, colour: "primary", label: "", href: "", align });
const iconList = (items: (string | [string, string])[], iconName = "check", extra: Props = {}) =>
  block("IconList", {
    icon: iconName,
    iconColor: "primary",
    items: items.map((i) => (typeof i === "string" ? { text: i } : { text: i[0], icon: i[1] })),
    ...extra,
  });
const steps = (items: string[], numberStyle: "circle" | "large" | "plain" = "large") =>
  block("IconList", { icon: "numbers", numberStyle, iconColor: "primary", items: items.map((t) => ({ text: t })) });

interface ColumnOptions {
  gap?: SpacingStep;
  valign?: "top" | "middle" | "bottom";
  widths?: string;
  box?: { style: SectionStyleId | "none"; padding: "sm" | "md" | "lg"; rounded: boolean };
  highlight?: { column: number; style: SectionStyleId };
  dividers?: boolean;
  sticky?: number;
  phoneOrder?: "normal" | "reverse";
  rowGap?: SpacingStep;
}
const columns = (cols: ComponentData[][], o: ColumnOptions = {}) =>
  block("Columns", {
    count: String(cols.length),
    gap: o.gap ?? "lg",
    column1: cols[0] ?? [],
    column2: cols[1] ?? [],
    column3: cols[2] ?? [],
    column4: cols[3] ?? [],
    ...(o.widths ? { widths: { desktop: o.widths, tablet: o.widths === "stack" ? "stack" : cols.length === 2 ? o.widths : "wrap", phone: "stack" } } : {}),
    ...(o.valign ? { valign: o.valign } : {}),
    ...(o.box ? { box: o.box } : {}),
    ...(o.highlight ? { highlight: o.highlight } : {}),
    ...(o.dividers ? { dividers: true } : {}),
    ...(o.sticky ? { sticky: o.sticky } : {}),
    ...(o.phoneOrder ? { phoneOrder: o.phoneOrder } : {}),
    ...(o.rowGap ? { rowGap: o.rowGap } : {}),
  });

interface CardOptions {
  photo?: LayoutPhotoId;
  icon?: string;
  cover?: boolean;
  link?: [string, string];
  background?: SectionStyleId;
  level?: Level;
}
const card = (title: string, body: string, o: CardOptions = {}) =>
  block("Card", {
    layout: o.cover ? "cover" : "stacked",
    title,
    titleLevel: o.level ?? "h3",
    text: body,
    imageSrc: o.photo ? src(o.photo) : "",
    imageAlt: o.photo ? alt(o.photo) : "",
    icon: o.icon ?? "",
    linkLabel: o.link?.[0] ?? "",
    linkHref: o.link?.[1] ?? "",
    background: o.background ?? "surface",
    ...(o.photo ? { placeholder: ["imageSrc"] } : {}),
  });
const gridItem = (title: string, body: string, photo?: LayoutPhotoId, link?: [string, string]) => ({
  title,
  text: body,
  imageSrc: photo ? src(photo) : "",
  imageAlt: photo ? alt(photo) : "",
  linkLabel: link?.[0] ?? "",
  linkHref: link?.[1] ?? "",
});
const grid = (items: ReturnType<typeof gridItem>[], cols: "2" | "3" | "4" = "3", background: SectionStyleId = "surface") =>
  block("Grid", { columns: cols, titleLevel: "h3", background, items, ...(items.some((i) => i.imageSrc) ? { placeholder: ["items"] } : {}) });
const gallery = (ids: LayoutPhotoId[], o: { columns?: "2" | "3" | "4"; shape?: "square" | "wide" | "original"; lightbox?: boolean } = {}) =>
  block("Gallery", {
    columns: o.columns ?? "3",
    shape: o.shape ?? "wide",
    ...(o.lightbox ? { lightbox: "yes" } : {}),
    images: ids.map((id) => ({ src: src(id), alt: alt(id), caption: "" })),
    placeholder: ["images"],
  });
const quote = (t: string, name: string, role: string, o: { align?: Align; size?: "normal" | "large" } = {}) =>
  block("Quote", { text: t, name, role, imageSrc: "", align: o.align ?? "left", size: o.size ?? "normal" });
const stats = (items: [string, string, string?][], o: { look?: "plain" | "lines" | "boxes"; size?: "md" | "lg"; colour?: "text" | "primary"; align?: Align } = {}) =>
  block("Stats", {
    look: o.look ?? "lines",
    size: o.size ?? "lg",
    colour: o.colour ?? "text",
    align: o.align ?? "left",
    items: items.map(([value, label, detail]) => ({ value, label, detail: detail ?? "" })),
  });
const accordion = (items: [string, string][], firstOpen = true) =>
  block("Accordion", { firstOpen: firstOpen ? "yes" : "no", oneAtATime: "no", items: items.map(([question, answer]) => ({ question, answer })) });
const logos = (moving = false) =>
  block("LogoRow", {
    logoSize: "medium",
    grayscale: "yes",
    align: "center",
    ...(moving ? { moving: "yes" } : {}),
    logos: layoutLogos.map((l) => ({ src: layoutPhotoSrc(l), alt: l.alt, href: "" })),
    placeholder: ["logos"],
  });
const overlay = (id: LayoutPhotoId, title: string, body: string, link: [string, string], height: "medium" | "large" = "large") =>
  block("ImageOverlay", {
    imageSrc: src(id),
    imageAlt: alt(id),
    title,
    titleLevel: "h3",
    text: body,
    linkLabel: link[0],
    linkHref: link[1],
    background: "dark",
    tint: "medium",
    position: "bottom-left",
    height,
    placeholder: ["imageSrc"],
  });

const FAQ: [string, string][] = [
  ["How long does a project take?", "Most projects take four to eight weeks, from the first call to the day it goes live."],
  ["Can I make changes myself afterwards?", "Yes. You change words and photos in the builder and publish when you're ready."],
  ["What does it cost?", "Every project gets a fixed price after the first call, so there are no surprises."],
  ["Do you work with clients abroad?", "Yes. Most of our work happens over video calls and shared documents."],
];
const PLANS = [
  { name: "Starter", price: "€19", period: "per month", description: "For a first site.", features: "One site\nYour own domain\nEmail help", buttonLabel: "Start with Starter", buttonHref: "/contact" },
  { name: "Studio", price: "€49", period: "per month", description: "For growing teams.", features: "Five sites\nYour own domains\nPriority help\nMonthly check-in", buttonLabel: "Start with Studio", buttonHref: "/contact" },
  { name: "Agency", price: "€129", period: "per month", description: "For client work.", features: "Unlimited sites\nClient handover\nPhone help", buttonLabel: "Talk to us", buttonHref: "/contact" },
];

// --- Sections ------------------------------------------------------------------------------

const L = (id: string, name: string, category: SectionLayout["category"], description: string, build: () => ComponentData[]): SectionLayout => ({
  id,
  name,
  category,
  description,
  build,
});

export const sectionLayoutsV2: SectionLayout[] = [
  // Hero
  L("hero-photo-full", "Full photo hero", "Hero", "A photo fills the screen; your header sits on it; headline and two buttons at the bottom.", () => [
    section("dark", [
      h1("Rooms that hold the light", { eyebrow: "Interior studio" }),
      text("Calm, practical homes for people who live in them every day.", "left", "default"),
      spacer("sm"),
      button("See the work", "/work"),
      button("About the studio", "/about", "secondary"),
    ], { photo: "stair", height: "full", valign: "bottom", tint: "light", headerOver: true, width: "wide", focus: { x: 50, y: 40 } }),
  ]),
  L("hero-split-photo", "Text beside a photo", "Hero", "Headline and a button on one side, a tall photo on the other.", () => [
    section("background", [
      columns([
        [h1("Design that settles in", { eyebrow: "Architecture & interiors" }), text("We plan, design and see through renovations of small homes and studios."), spacer("sm"), button("Book a first call", "/contact", "primary", "left", "arrow-right")],
        [image("balconies")],
      ], { valign: "middle", widths: "equal", gap: "xl" }),
    ], { paddingY: "xl", width: "wide" }),
  ]),
  L("hero-statement", "Big statement", "Hero", "One large headline on a soft glow, no photo. Strong for studios and products.", () => [
    section("background", [
      h1("Fewer things, made properly.", { align: "center", eyebrow: "Since 2014" }),
      text("A small studio for brands that would rather be clear than loud.", "center"),
      spacer("sm"),
      button("See what we make", "/work", "primary", "center"),
    ], { paddingY: "xl", height: "large", width: "narrow", gradient: { to: "surface", direction: "glow" } }),
  ]),
  L("hero-overlap-card", "Photo with a card over it", "Hero", "A wide photo with a box of text pulled over its lower edge.", () => [
    section("dark", [spacer("xl"), spacer("xl")], { photo: "pool", height: "large", tint: "light", width: "full" }),
    section("background", [
      columns([[h1("A house above the valley", { display: false, eyebrow: "Featured project" }), text("Four rooms, one long terrace and a pool that ends at the trees.")], [spacer("xs"), button("Read the story", "/work", "arrow")]], {
        valign: "bottom",
        widths: "two-one",
        box: { style: "background", padding: "lg", rounded: true },
      }),
    ], { overlap: "lg", paddingY: "md" }),
  ]),
  L("hero-figures", "Headline with figures", "Hero", "Headline and button, with three key figures under a line.", () => [
    section("surface", [
      h1("Websites that pay for themselves", { eyebrow: "For small businesses" }),
      text("Fast pages, clear words and nothing to maintain. You edit, we keep it running."),
      spacer("sm"),
      button("See prices", "/pricing", "primary", "left", "arrow-right"),
      spacer("md"),
      stats([["98", "average speed score"], ["3 weeks", "from first call to live"], ["€0", "hosting per month"]], { look: "lines", size: "md" }),
    ], { paddingY: "xl" }),
  ]),
  L("hero-photo-left", "Words on the left of a photo", "Hero", "A photo across the section with the words in a narrow column on its left.", () => [
    section("dark", [
      h1("Made by hand, in small batches", { display: false, eyebrow: "Workshop" }),
      text("Bottles, bowls and cups thrown, glazed and fired in our own kiln.", "left", "default"),
      button("Visit the shop", "/shop", "soft"),
    ], { photo: "bottles", height: "large", width: "left", tint: "light" }),
  ]),
  L("hero-slideshow", "Slideshow hero", "Hero", "A headline over a slideshow of your best photos, with a pause button.", () => [
    section("background", [
      h1("Spaces we've made", { eyebrow: "Portfolio" }),
      block("Slideshow", {
        name: "Recent projects",
        ratio: "21:9",
        autoplay: "no",
        speed: "8",
        titleLevel: "h2",
        slides: [
          { imageSrc: src("pool"), imageAlt: alt("pool"), title: "Valley house", text: "A family home with a long terrace.", linkLabel: "See the valley house", linkHref: "/work" },
          { imageSrc: src("office"), imageAlt: alt("office"), title: "Studio Lane", text: "A bright workroom for two.", linkLabel: "", linkHref: "" },
          { imageSrc: src("spiral"), imageAlt: alt("spiral"), title: "Spiral house", text: "A stair as the centre of the home.", linkLabel: "", linkHref: "" },
        ],
        placeholder: ["slides"],
      }),
    ], { width: "wide" }),
  ]),
  L("hero-dark-centred", "Dark centred hero", "Hero", "Centred headline on a dark gradient with a main and a quiet action.", () => [
    section("dark", [
      h1("Launch week, without the panic", { align: "center", eyebrow: "New" }),
      text("Plan, write and publish your launch page in one afternoon.", "center", "default"),
      spacer("sm"),
      button("Start free", "/start", "primary", "center"),
      button("Take the tour", "/tour", "arrow", "center"),
    ], { paddingY: "xl", height: "large", width: "narrow", gradient: { to: "primary", direction: "glow" } }),
  ]),

  // Intro
  L("intro-statement", "One large sentence", "Intro", "A single statement in big type, centred, with room around it.", () => [
    section("background", [
      heading("We design homes around the way light moves through a day, and the way people move through a home.", { align: "center", display: true, eyebrow: "What we do" }),
    ], { paddingY: "xl", width: "narrow" }),
  ]),
  L("intro-label-left", "Label left, text right", "Intro", "A small heading on the left, a paragraph and a link on the right.", () => [
    section("background", [
      columns([
        [heading("Who we are", { level: "h2" })],
        [text("A team of six architects and makers in a converted print shop. We take on a handful of homes each year and see every one through to the last shelf.", "left", "default"), button("Meet the team", "/about", "arrow")],
      ], { widths: "one-two", gap: "xl" }),
    ]),
  ]),
  L("intro-photo-pair", "Two photos and a paragraph", "Intro", "A paragraph beside two photos of different sizes.", () => [
    section("surface", [
      columns([
        [heading("Built to last, made to be used", { eyebrow: "Our approach" }), text("Good materials, honest details and plans that fit your budget before the first wall comes down."), button("How we work", "/process", "arrow")],
        [image("angles")],
        [image("tree")],
      ], { widths: "wide-first", valign: "bottom" }),
    ], { width: "wide" }),
  ]),
  L("intro-checklist", "Intro with a checklist", "Intro", "A heading and a paragraph beside a list of what's included.", () => [
    section("background", [
      columns([
        [heading("Everything in one place", { eyebrow: "Included" }), text("From the first sketch to the keys, one team and one plan.")],
        [iconList(["Measured survey and plans", "Planning permission", "Builders found and managed", "Furniture and lighting"], "check")],
      ], { valign: "middle", dividers: true }),
    ]),
  ]),

  // About
  L("about-story-photo", "Our story with a photo", "About", "A photo on one side, a short story and a signature on the other.", () => [
    section("background", [
      columns([
        [image("pottery")],
        [heading("It started with one wheel in a garage", { eyebrow: "Our story" }), text("Ten years later we're a team of four, a shop and a kiln that's always warm. Everything we sell is made within twenty metres of the till."), text("Maya Hartono, founder", "left", "default")],
      ], { valign: "middle", gap: "xl" }),
    ]),
  ]),
  L("about-values", "Values with icons", "About", "Three values, each with an icon, a title and a line.", () => [
    section("surface", [
      heading("What we stand for", { align: "center", eyebrow: "Values" }),
      spacer("sm"),
      columns([
        [icon("leaf", "circle"), h3("Use less"), text("Local materials, little waste and nothing that's thrown away in five years.")],
        [icon("handshake", "circle"), h3("Say it plainly"), text("Clear prices, clear plans and no surprises at the end.")],
        [icon("hammer", "circle"), h3("Finish properly"), text("We stay until the last door closes the way it should.")],
      ]),
    ]),
  ]),
  L("about-timeline", "Milestones", "About", "Your story in years: a table of milestones beside a short introduction.", () => [
    section("background", [
      columns([
        [heading("Ten years in short", { eyebrow: "History" }), text("From a garage to a studio of six, one home at a time.")],
        [block("Table", {
          caption: "Milestones",
          headers: "both",
          look: "lines",
          rows: [["Year", "What happened"], ["2014", "First project, a kitchen in Kemang"], ["2017", "Moved into the old print shop"], ["2021", "Our hundredth home"], ["2024", "Opened the workshop"]],
        })],
      ], { widths: "one-two", gap: "xl" }),
    ]),
  ]),
  L("about-dark-statement", "Statement on dark", "About", "A large sentence on a dark section with a link to your story.", () => [
    section("dark", [
      heading("We'd rather do fewer projects and do every one of them well.", { display: true, eyebrow: "Why we're small" }),
      button("Read our story", "/about", "arrow"),
    ], { paddingY: "xl", width: "narrow" }),
  ]),

  // Features
  L("features-icons-3", "Three features with icons", "Features", "Icon, title and a line, three across, centred heading.", () => [
    section("background", [
      heading("Why people choose us", { align: "center", eyebrow: "Features" }),
      spacer("sm"),
      columns([
        [icon("zap", "square"), h3("Fast on any phone"), text("Pages are plain HTML, so they open in a blink on a slow connection.")],
        [icon("eye", "square"), h3("Readable by everyone"), text("Contrast, headings and keyboard use are checked before anything goes live.")],
        [icon("heart", "square"), h3("Yours to edit"), text("Change words and photos yourself, and publish when you're ready.")],
      ]),
    ]),
  ]),
  L("features-boxed-4", "Four boxed features", "Features", "Four features in boxes, two by two on tablets.", () => [
    section("surface", [
      heading("Everything you need, nothing you don't", { eyebrow: "What's included" }),
      spacer("sm"),
      columns([
        [icon("globe", "plain"), h3("Your own address"), text("Connect your domain in a few steps.")],
        [icon("search", "plain"), h3("Found on search"), text("Titles, descriptions and a sitemap on every page.")],
        [icon("camera", "plain"), h3("Sharp photos"), text("Resized for every screen automatically.")],
        [icon("shield-check", "plain"), h3("Nothing to patch"), text("No server, no plugins, no updates.")],
      ], { box: { style: "background", padding: "md", rounded: true }, gap: "md" }),
    ]),
  ]),
  L("features-alternating", "Photo and text, alternating", "Features", "Two rows: photo left then right, each with a title, text and link.", () => [
    section("background", [
      columns([[image("office")], [heading("A plan before a single wall moves", { eyebrow: "Step one" }), text("We measure, draw and price everything first, so you decide with the full picture."), button("How planning works", "/process", "arrow")]], { valign: "middle", gap: "xl" }),
      spacer("lg"),
      columns([[heading("One team on site, every day", { eyebrow: "Step two" }), text("Our own builders and makers, managed by the person who drew your plans."), button("Meet the team", "/about", "arrow")], [image("tools")]], { valign: "middle", gap: "xl", phoneOrder: "reverse" }),
    ], { width: "wide" }),
  ]),
  L("features-sticky-list", "Heading that stays, list that scrolls", "Features", "A heading stays in view on the left while a long list of features scrolls on the right.", () => [
    section("background", [
      columns([
        [heading("Built for the way you work", { eyebrow: "Features" }), text("Everything here comes with every plan."), button("Compare plans", "/pricing", "soft")],
        [
          h3("Drag-and-drop pages"), text("Arrange sections and blocks, then fine-tune spacing and colour."),
          divider("line"),
          h3("A style for the whole site"), text("Fonts, colours and buttons set once and used everywhere."),
          divider("line"),
          h3("Photos that load fast"), text("Every photo is resized and compressed when you publish."),
          divider("line"),
          h3("Checked before it's live"), text("Missing descriptions, broken links and low contrast are caught for you."),
        ],
      ], { widths: "one-two", sticky: 1, gap: "xl" }),
    ]),
  ]),
  L("features-cover-cards", "Photo cards", "Features", "Three cards with the photo filling each card and the title on top.", () => [
    section("background", [
      heading("Three ways to work with us", { eyebrow: "Services" }),
      spacer("sm"),
      columns([
        [card("Full renovation", "From plans to keys.", { photo: "spiral", cover: true, link: ["Read about full renovations", "/services"] })],
        [card("Design only", "Plans you can build with anyone.", { photo: "angles", cover: true, link: ["Read about design only", "/services"] })],
        [card("One room", "A kitchen, a bath, a studio.", { photo: "office", cover: true, link: ["Read about single rooms", "/services"] })],
      ], { gap: "md" }),
    ], { width: "wide" }),
  ]),
  L("features-tabs", "Features in tabs", "Features", "A heading and tabs that each explain one part, to keep a long story short.", () => [
    section("surface", [
      heading("One tool, three jobs", { align: "center", eyebrow: "How it fits" }),
      spacer("sm"),
      block("Tabs", {
        look: "pills",
        titleLevel: "h3",
        tabs: [
          { label: "Design", text: "Pick a look, adjust colours and fonts, and see every page change at once." },
          { label: "Write", text: "Edit words where they sit on the page. Headings, lists and links, nothing more." },
          { label: "Publish", text: "One press and your site is live, with search, sitemap and fast photos." },
        ],
      }),
    ], { width: "narrow" }),
  ]),
  L("features-checklist-photo", "Checklist beside a photo", "Features", "A heading and a list of benefits beside a tall photo.", () => [
    section("surface", [
      columns([
        [heading("A workshop you can visit", { eyebrow: "The space" }), iconList([["Open Thursday to Saturday", "clock"], ["Classes for beginners", "users"], ["Kiln firing for your own pieces", "flame"], ["Ten minutes from the station", "map-pin"]], "check"), button("Plan a visit", "/visit")],
        [image("atrium")],
      ], { valign: "middle", gap: "xl" }),
    ]),
  ]),

  // Services
  L("services-rows", "Services as rows", "Services", "Each service on its own line with a short description and an arrow link.", () => [
    section("background", [
      heading("Services", { eyebrow: "What we do" }),
      divider("line"),
      columns([[h3("Brand identity")], [text("Names, logos and the rules that keep them consistent.")], [button("Brand identity", "/services/brand", "arrow", "right")]], { valign: "middle", widths: "wide-middle" }),
      divider("line"),
      columns([[h3("Websites")], [text("Designed, written and built to be edited by you.")], [button("Websites", "/services/web", "arrow", "right")]], { valign: "middle", widths: "wide-middle" }),
      divider("line"),
      columns([[h3("Campaigns")], [text("Launches, posters and everything that goes with them.")], [button("Campaigns", "/services/campaigns", "arrow", "right")]], { valign: "middle", widths: "wide-middle" }),
      divider("line"),
    ]),
  ]),
  L("services-photo-cards", "Services with photos", "Services", "Three cards with a photo, a line and a link each.", () => [
    section("surface", [
      heading("What we can do for you", { eyebrow: "Services" }),
      spacer("sm"),
      grid([
        gridItem("Plans and permits", "Measured drawings, 3D views and the paperwork.", "angles", ["About plans and permits", "/services"]),
        gridItem("Building", "Our own team on site from day one.", "tools", ["About building", "/services"]),
        gridItem("Interiors", "Furniture, lighting and the last details.", "office", ["About interiors", "/services"]),
      ], "3", "background"),
    ]),
  ]),
  L("services-highlighted", "Three services, one highlighted", "Services", "Three columns in boxes, the middle one in your main colour.", () => [
    section("background", [
      heading("Pick a way to start", { align: "center", eyebrow: "Services" }),
      spacer("sm"),
      columns([
        [h3("Advice"), text("A two-hour visit with clear next steps."), button("Book advice", "/contact", "secondary")],
        [h3("Design"), text("Plans, drawings and a fixed price to build."), button("Start a design", "/contact")],
        [h3("Design and build"), text("One team from the first sketch to the keys."), button("Talk to us", "/contact", "secondary")],
      ], { box: { style: "surface", padding: "lg", rounded: true }, highlight: { column: 2, style: "primary" }, gap: "md" }),
    ]),
  ]),
  L("services-questions", "Services you can open", "Services", "Services as questions that open to show the details, beside a short intro.", () => [
    section("background", [
      columns([
        [heading("Services", { eyebrow: "In detail" }), text("Open any service to see what's included and how long it takes."), button("Ask for a price", "/contact", "soft")],
        [accordion([
          ["Brand identity", "Name, logo, colours and a short guide. Usually four weeks."],
          ["Websites", "Design, words and build on Crust, so you can edit it yourself. Usually six weeks."],
          ["Photography", "A day at your place for photos you can use everywhere."],
          ["Ongoing help", "A few hours a month for changes, campaigns and advice."],
        ])],
      ], { widths: "one-two", gap: "xl" }),
    ]),
  ]),

  // Work
  L("work-cover-grid", "Project grid", "Work", "Four projects as photo cards, two by two.", () => [
    section("background", [
      columns([[heading("Selected work", { eyebrow: "Portfolio" })], [button("All projects", "/work", "arrow", "right")]], { valign: "bottom" }),
      spacer("sm"),
      columns([
        [card("Valley house", "Family home, 2024", { photo: "pool", cover: true, link: ["See the valley house", "/work"] }), card("Studio Lane", "Workroom, 2023", { photo: "office", cover: true, link: ["See Studio Lane", "/work"] })],
        [card("Spiral house", "Renovation, 2023", { photo: "spiral", cover: true, link: ["See the spiral house", "/work"] }), card("Garden wall", "Extension, 2022", { photo: "tree", cover: true, link: ["See the garden wall", "/work"] })],
      ], { gap: "md", rowGap: "md" }),
    ], { width: "wide" }),
  ]),
  L("work-slider", "Projects slider", "Work", "A row of project cards that scrolls sideways, with arrows by the title.", () => [
    section("surface", [
      heading("Recent projects", { eyebrow: "Work" }),
      block("CardSlider", {
        name: "Recent projects",
        visible: "3",
        titleLevel: "h3",
        background: "background",
        items: [
          gridItem("Valley house", "A long terrace and a pool.", "pool", ["See the valley house", "/work"]),
          gridItem("Studio Lane", "A bright workroom for two.", "office", ["See Studio Lane", "/work"]),
          gridItem("Spiral house", "A stair at the heart of it.", "spiral", ["See the spiral house", "/work"]),
          gridItem("Terraces", "Twelve flats, one courtyard.", "terraces", ["See the terraces", "/work"]),
          gridItem("Garden wall", "An extension under a tree.", "tree", ["See the garden wall", "/work"]),
        ],
        placeholder: ["items"],
      }),
    ], { width: "wide" }),
  ]),
  L("work-feature-pair", "One big, two small", "Work", "One featured project large, with two more beside it.", () => [
    section("background", [
      heading("Featured", { eyebrow: "Work" }),
      spacer("sm"),
      columns([
        [overlay("terraces", "The terraces", "Twelve flats around one shared courtyard.", ["See the terraces", "/work"], "large")],
        [overlay("stair", "Copper stair", "A stair that turns a hall into a room.", ["See the copper stair", "/work"], "medium"), spacer("xs"), overlay("angles", "Roof light", "Daylight into a dark attic.", ["See the roof light", "/work"], "medium")],
      ], { widths: "two-one", gap: "md" }),
    ], { width: "wide" }),
  ]),
  L("work-case-study", "Case study summary", "Work", "A photo, the brief in a sentence, and the results as figures.", () => [
    section("surface", [
      columns([
        [image("lounge")],
        [heading("A lounge that fills itself", { eyebrow: "Case study" }), text("A dark basement became the studio's favourite room, booked every evening."), stats([["+40%", "evening bookings"], ["6 weeks", "start to finish"]], { look: "plain", size: "md", colour: "primary" }), button("Read the case study", "/work", "arrow")],
      ], { valign: "middle", gap: "xl" }),
    ]),
  ]),
  L("work-list", "Project list", "Work", "Projects as a simple list: name, kind and year, with dividers.", () => [
    section("background", [
      heading("Archive", { eyebrow: "All projects" }),
      block("Table", {
        caption: "Projects by year",
        headers: "top",
        look: "lines",
        rows: [["Project", "Kind", "Year"], ["Valley house", "New home", "2024"], ["Studio Lane", "Workroom", "2023"], ["Spiral house", "Renovation", "2023"], ["Garden wall", "Extension", "2022"], ["Terraces", "Housing", "2021"]],
      }),
    ], { width: "narrow" }),
  ]),

  // Gallery
  L("gallery-lightbox", "Gallery that opens larger", "Gallery", "Six photos; pressing one opens it larger, with arrows.", () => [
    section("background", [
      heading("Inside the studio", { eyebrow: "Gallery" }),
      spacer("sm"),
      gallery(["office", "shadows", "tools", "pottery", "bottles", "breakfast"], { columns: "3", shape: "wide", lightbox: true }),
    ], { width: "wide" }),
  ]),
  L("gallery-mosaic", "Photo mosaic", "Gallery", "One tall photo beside two wide ones, edge to edge.", () => [
    section("background", [
      columns([[image("balconies")], [image("angles"), image("tree")]], { gap: "sm", valign: "top" }),
    ], { width: "full", paddingY: "sm" }),
  ]),
  L("gallery-slideshow", "Photo slideshow", "Gallery", "One photo at a time with a caption, arrows and swipe.", () => [
    section("surface", [
      block("Slideshow", {
        name: "The workshop",
        ratio: "3:2",
        autoplay: "no",
        speed: "8",
        titleLevel: "h3",
        slides: (["pottery", "bottles", "tools"] as LayoutPhotoId[]).map((id, i) => ({ imageSrc: src(id), imageAlt: alt(id), title: ["At the wheel", "Out of the kiln", "The tool wall"][i], text: "", linkLabel: "", linkHref: "" })),
        placeholder: ["slides"],
      }),
    ], { width: "narrow" }),
  ]),

  // Testimonials
  L("quote-photo", "Quote beside a photo", "Testimonials", "A large quote with a name, beside a photo of the work.", () => [
    section("surface", [
      columns([[image("office")], [quote("They listened more than they talked, and the house shows it. Every room works the way we actually live.", "Dewi and Arif", "Valley house, 2024", { size: "large" })]], { valign: "middle", gap: "xl" }),
    ]),
  ]),
  L("quotes-three", "Three short quotes", "Testimonials", "Three quotes in boxes with names and roles.", () => [
    section("background", [
      heading("What clients say", { align: "center", eyebrow: "Kind words" }),
      spacer("sm"),
      columns([
        [quote("Clear prices and no surprises. Rare, and very welcome.", "Rina Santoso", "Studio Haho")],
        [quote("They finished a week early and left the place cleaner than they found it.", "Tom Wijaya", "Garden wall")],
        [quote("We still find small details we didn't know we'd asked for.", "Laila Putri", "Spiral house")],
      ], { box: { style: "surface", padding: "lg", rounded: true }, gap: "md" }),
    ]),
  ]),
  L("quote-centred-dark", "Big quote on dark", "Testimonials", "One quote, centred, large, on a dark section.", () => [
    section("dark", [quote("The best decision we made for the business this year, and the least stressful one.", "Rina Santoso", "Founder, Studio Haho", { align: "center", size: "large" })], { paddingY: "xl", width: "narrow" }),
  ]),
  L("quote-with-logos", "Quote with logos", "Testimonials", "A quote above a row of the logos you've worked with.", () => [
    section("background", [
      quote("Our launch page went from a week of meetings to an afternoon.", "Tom Wijaya", "Head of marketing, Northfield", { align: "center", size: "large" }),
      spacer("md"),
      logos(),
    ], { width: "narrow" }),
  ]),

  // Logos
  L("logos-moving", "Moving logo row", "Logos", "A line of text and your clients' logos moving slowly, with a pause switch.", () => [
    section("surface", [text("Trusted by teams at", "center"), logos(true)], { paddingY: "md" }),
  ]),
  L("logos-intro", "Logos with an introduction", "Logos", "A short heading and line on the left, logos on the right.", () => [
    section("background", [
      columns([[heading("In good company", { level: "h2" }), text("Studios, shops and schools that build with us.")], [logos()]], { valign: "middle", widths: "one-two", gap: "xl" }),
    ]),
  ]),

  // Numbers
  L("numbers-lines", "Figures with lines", "Numbers", "Four large figures divided by thin lines.", () => [
    section("background", [
      heading("In numbers", { eyebrow: "Ten years" }),
      stats([["120", "homes finished"], ["6", "people in the studio"], ["4.9", "average client rating"], ["0", "projects over budget"]], { look: "lines", size: "lg" }),
    ]),
  ]),
  L("numbers-dark", "Figures on dark", "Numbers", "Three figures in boxes on a dark section, with a heading.", () => [
    section("dark", [
      heading("What changed after launch", { align: "center" }),
      spacer("sm"),
      stats([["2.1×", "more enquiries", "in the first three months"], ["0.8 s", "to load on a phone"], ["100", "accessibility score"]], { look: "boxes", size: "lg", align: "center" }),
    ]),
  ]),
  L("numbers-photo", "Figures beside a photo", "Numbers", "A photo on one side, a heading and figures on the other.", () => [
    section("surface", [
      columns([
        [heading("A small studio, a long record", { eyebrow: "About us" }), stats([["2014", "founded"], ["120+", "homes"], ["98%", "would recommend us"]], { look: "plain", size: "md", colour: "primary" })],
        [image("stair")],
      ], { valign: "middle", gap: "xl" }),
    ]),
  ]),

  // Process
  L("process-large-steps", "Large numbered steps", "Process", "Four steps with big numbers, beside a short introduction.", () => [
    section("background", [
      columns([
        [heading("How it works", { eyebrow: "Process" }), text("Four steps, one team, and a fixed price before anything is built.")],
        [steps(["A first call to hear what you need", "A visit, measurements and a plan", "A fixed price and a start date", "Building, with weekly updates"], "large")],
      ], { widths: "one-two", gap: "xl" }),
    ]),
  ]),
  L("process-columns", "Steps in columns", "Process", "Three steps side by side, divided by lines.", () => [
    section("surface", [
      heading("From idea to opening day", { align: "center", eyebrow: "How we work" }),
      spacer("sm"),
      columns([
        [heading("Listen", { level: "h3", eyebrow: "Step 1" }), text("A long conversation about how you live and work.")],
        [heading("Draw", { level: "h3", eyebrow: "Step 2" }), text("Plans, 3D views and a price you can hold us to.")],
        [heading("Build", { level: "h3", eyebrow: "Step 3" }), text("Our own team on site, the designer there every week.")],
      ], { dividers: true }),
    ]),
  ]),
  L("process-timeline", "Steps with a sticky heading", "Process", "A heading that stays in view beside steps that each take a paragraph.", () => [
    section("background", [
      columns([
        [heading("What happens when", { eyebrow: "Timeline" }), button("Book a first call", "/contact")],
        [
          h3("Week 1: first call"), text("We talk through what you need, your budget and your timing."),
          divider("line"),
          h3("Weeks 2–4: plans"), text("A measured survey, drawings and a 3D model to walk through."),
          divider("line"),
          h3("Week 5: price"), text("A fixed price and a start date, in writing."),
          divider("line"),
          h3("From week 6: building"), text("Weekly visits, photos and one person to call."),
        ],
      ], { widths: "one-two", sticky: 1, gap: "xl" }),
    ]),
  ]),

  // Pricing
  L("pricing-three-v2", "Three plans, one highlighted", "Pricing", "Three plans with features and buttons; the middle one stands out with a badge.", () => [
    section("background", [
      heading("Simple prices", { align: "center", eyebrow: "Pricing" }),
      text("Pay monthly, stop any time.", "center"),
      spacer("sm"),
      block("Pricing", { highlight: "2", badge: "Most popular", planStyle: "surface", highlightStyle: "primary", titleLevel: "h3", plans: PLANS }),
    ]),
  ]),
  L("pricing-two", "Two plans", "Pricing", "Two plans side by side with an introduction, for simple offers.", () => [
    section("surface", [
      columns([
        [heading("Two ways to start", { eyebrow: "Pricing" }), text("Both include hosting, your own domain and help by email."), iconList(["No setup fee", "Cancel any time"], "check")],
        [block("Pricing", { highlight: "2", badge: "", planStyle: "background", highlightStyle: "dark", titleLevel: "h3", plans: PLANS.slice(0, 2) })],
      ], { widths: "one-two", gap: "xl", valign: "middle" }),
    ]),
  ]),
  L("pricing-compare", "Compare plans", "Pricing", "A table that compares what each plan includes.", () => [
    section("background", [
      heading("Compare plans", { eyebrow: "In detail" }),
      block("Table", {
        caption: "What each plan includes",
        headers: "both",
        look: "stripes",
        rows: [
          ["", "Starter", "Studio", "Agency"],
          ["Sites", "1", "5", "Unlimited"],
          ["Own domain", "Yes", "Yes", "Yes"],
          ["Help", "Email", "Priority email", "Phone"],
          ["Monthly check-in", "No", "Yes", "Yes"],
          ["Price per month", "€19", "€49", "€129"],
        ],
      }),
    ]),
  ]),

  // FAQ
  L("faq-sticky", "Questions with a sticky heading", "FAQ", "A heading and contact link that stay in view beside the questions.", () => [
    section("background", [
      columns([
        [heading("Questions", { eyebrow: "FAQ" }), text("Can't find yours? We answer within a day."), button("Ask a question", "/contact", "soft")],
        [accordion(FAQ)],
      ], { widths: "one-two", sticky: 1, gap: "xl" }),
    ]),
  ]),
  L("faq-centred", "Centred questions", "FAQ", "A centred heading and questions in a narrow column, easy to read.", () => [
    section("surface", [heading("Good to know", { align: "center", eyebrow: "FAQ" }), spacer("sm"), accordion(FAQ, false)], { width: "narrow" }),
  ]),
  L("faq-tabs", "Questions by topic", "FAQ", "Questions grouped into tabs: about the work, prices and timing.", () => [
    section("background", [
      heading("Questions by topic", { eyebrow: "FAQ" }),
      block("Tabs", {
        look: "underline",
        titleLevel: "h3",
        tabs: [
          { label: "The work", text: "We design and renovate homes, studios and small shops, from one room to a whole building." },
          { label: "Prices", text: "You get a fixed price after the plans are drawn. Advice visits are a fixed fee." },
          { label: "Timing", text: "Plans take three to four weeks. Building time depends on the project; we agree it before we start." },
        ],
      }),
    ], { width: "narrow" }),
  ]),

  // Team
  L("team-cards", "Team with photos", "Team", "Three people with a photo, name and role. Replace the photos with your own.", () => [
    section("background", [
      heading("The people", { eyebrow: "Team" }),
      spacer("sm"),
      columns([
        [card("Maya Hartono", "Founder and architect", { photo: "shadows" })],
        [card("Arif Nugroho", "Site lead", { photo: "tools" })],
        [card("Sari Dewanti", "Interiors", { photo: "bottles" })],
      ], { gap: "md" }),
    ]),
  ]),
  L("team-intro", "Team with an introduction", "Team", "A short introduction beside four names and roles, no photos needed.", () => [
    section("surface", [
      columns([
        [heading("Small on purpose", { eyebrow: "Team" }), text("Four people who each know every project by heart."), button("Work with us", "/careers", "arrow")],
        [columns([[h3("Maya Hartono"), text("Founder")], [h3("Arif Nugroho"), text("Site lead")]], { gap: "md" }), divider("line"), columns([[h3("Sari Dewanti"), text("Interiors")], [h3("Budi Santoso"), text("Workshop")]], { gap: "md" })],
      ], { widths: "one-two", gap: "xl" }),
    ]),
  ]),
  L("team-join", "Join the team", "Team", "A photo of your workplace with an invitation to apply.", () => [
    section("dark", [
      heading("We're looking for a junior architect", { eyebrow: "Careers" }),
      text("Three days a week in the studio, two wherever you like.", "left", "default"),
      button("See the job", "/careers", "soft"),
    ], { photo: "lounge", height: "medium", width: "left", tint: "light" }),
  ]),

  // Call to action
  L("cta-gradient", "Gradient call to action", "Call to action", "A centred line and a button on a soft gradient.", () => [
    section("primary", [heading("Ready when you are", { align: "center", display: true }), text("Tell us about your project. We reply within a day.", "center", "default"), button("Start a project", "/contact", "primary", "center", "arrow-right")], {
      paddingY: "xl",
      width: "narrow",
      gradient: { to: "text", direction: "diagonal" },
    }),
  ]),
  L("cta-photo", "Call to action on a photo", "Call to action", "A heading and a button on a full-width photo.", () => [
    section("dark", [heading("Come and see the workshop", { align: "center" }), text("Open Thursday to Saturday, 10 to 5.", "center", "default"), button("Plan your visit", "/visit", "primary", "center")], {
      photo: "pottery",
      height: "medium",
      tint: "light",
      width: "full",
      parallax: true,
    }),
  ]),
  L("cta-boxed-split", "Boxed call to action", "Call to action", "A box with a heading on the left and two buttons on the right.", () => [
    section("background", [
      columns([[heading("Have a project in mind?", { level: "h2" }), text("A first call is free and there's no obligation.")], [button("Book a call", "/contact", "primary", "right"), button("Email us", "mailto:hello@example.com", "arrow", "right")]], {
        valign: "middle",
        widths: "two-one",
        box: { style: "surface", padding: "lg", rounded: true },
      }),
    ]),
  ]),
  L("cta-minimal", "Quiet call to action", "Call to action", "A big line with an arrow link, between a line above and below.", () => [
    section("background", [divider("line"), columns([[heading("Let's make something that lasts.", { display: true })], [button("Get in touch", "/contact", "arrow", "right")]], { valign: "bottom", widths: "two-one" }), divider("line")]),
  ]),

  // Contact
  L("contact-form-details", "Form beside your details", "Contact", "A contact form with your address, phone and hours beside it.", () => [
    section("surface", [
      columns([
        [
          heading("Get in touch", { eyebrow: "Contact" }),
          text("Tell us a little about your project. We reply within one working day."),
          iconList([["hello@example.com", "mail"], ["+62 21 555 0101", "phone"], ["Monday to Friday, 9 to 5", "clock"]], "check"),
        ],
        [block("ContactForm", { nameLabel: "Name", emailLabel: "Email", messageLabel: "Message", fields: [{ label: "Phone", kind: "tel", required: "no" }], submitLabel: "Send message", successMessage: "Thank you! Your message is on its way. We'll reply by email." })],
      ], { gap: "xl", box: { style: "none", padding: "sm", rounded: false } }),
    ]),
  ]),
  L("contact-map", "Map and opening hours", "Contact", "Your address on a map (loads when pressed), with opening hours.", () => [
    section("background", [
      columns([
        [heading("Visit us", { eyebrow: "Find us" }), block("Table", { caption: "Opening hours", headers: "both", look: "lines", rows: [["Day", "Hours"], ["Monday to Friday", "9:00–17:00"], ["Saturday", "10:00–15:00"], ["Sunday", "Closed"]] })],
        [block("Map", { place: "Our studio", address: "Jl. Kemang Raya 12\nJakarta", pin: { lat: -6.2607, lng: 106.8137 }, zoom: "street", ratio: "4:3", imageSrc: "", placeholder: ["place", "address"] })],
      ], { gap: "xl", valign: "middle" }),
    ]),
  ]),
  L("contact-cards", "Contact cards", "Contact", "Three ways to reach you, each with an icon and a link.", () => [
    section("background", [
      heading("Talk to us", { align: "center", eyebrow: "Contact" }),
      spacer("sm"),
      columns([
        [card("Email", "We reply within a day.", { icon: "mail", link: ["hello@example.com", "mailto:hello@example.com"] })],
        [card("Phone", "Weekdays, 9 to 5.", { icon: "phone", link: ["+62 21 555 0101", "tel:+62215550101"] })],
        [card("Studio", "Jl. Kemang Raya 12, Jakarta.", { icon: "map-pin", link: ["Directions to the studio", "/contact"] })],
      ], { gap: "md" }),
    ]),
  ]),
  L("contact-social", "Contact and social links", "Contact", "A short heading, an email button and your social profiles.", () => [
    section("surface", [
      heading("Say hello", { align: "center" }),
      text("hello@example.com", "center"),
      button("Email us", "mailto:hello@example.com", "primary", "center"),
      spacer("sm"),
      block("SocialLinks", { who: "the studio", show: "icons", look: "circle", align: "center", links: [{ href: "https://instagram.com/" }, { href: "https://www.linkedin.com/" }, { href: "https://www.pinterest.com/" }] }),
    ], { width: "narrow" }),
  ]),
];

// --- Whole pages ---------------------------------------------------------------------------

export const pageLayoutsV2: PageLayout[] = [
  { id: "page-studio-home", name: "Studio home", description: "Full photo hero, intro, work, figures, quote and a call to action.", sections: ["hero-photo-full", "intro-label-left", "work-cover-grid", "numbers-lines", "quote-centred-dark", "cta-minimal"] },
  { id: "page-restaurant-home", name: "Restaurant or shop home", description: "Slideshow, a story, the menu in tabs, a gallery and a map.", sections: ["hero-slideshow", "about-story-photo", "features-tabs", "gallery-lightbox", "contact-map"] },
  { id: "page-product", name: "Product landing", description: "Big statement, logos, features, pricing and questions.", sections: ["hero-dark-centred", "logos-moving", "features-icons-3", "features-alternating", "pricing-three-v2", "faq-centred", "cta-gradient"] },
  { id: "page-services-v2", name: "Services", description: "Services as rows, how you work, plans and questions.", sections: ["hero-figures", "services-rows", "process-large-steps", "pricing-two", "faq-sticky", "cta-boxed-split"] },
  { id: "page-about-v2", name: "About", description: "A statement, your story, values, team and milestones.", sections: ["hero-split-photo", "about-story-photo", "about-values", "team-cards", "about-timeline", "cta-photo"] },
  { id: "page-work", name: "Work", description: "A featured project, a grid of work and an archive list.", sections: ["intro-statement", "work-feature-pair", "work-cover-grid", "work-list", "cta-minimal"] },
  { id: "page-case-study", name: "Case study", description: "A project from brief to result: photo, figures, story, gallery and a quote.", sections: ["hero-overlap-card", "work-case-study", "features-alternating", "gallery-mosaic", "quote-photo", "cta-boxed-split"] },
  { id: "page-pricing", name: "Pricing", description: "Plans, a comparison table and questions by topic.", sections: ["pricing-three-v2", "pricing-compare", "faq-tabs", "quotes-three", "cta-gradient"] },
  { id: "page-contact-v2", name: "Contact", description: "A form beside your details, a map with hours, and social links.", sections: ["contact-form-details", "contact-map", "contact-social"] },
  { id: "page-venue", name: "Venue or event", description: "Photo hero, what to expect, a timeline, gallery and how to get there.", sections: ["hero-photo-left", "features-checklist-photo", "process-timeline", "gallery-lightbox", "contact-map", "cta-photo"] },
];

// --- Fitting a layout to the site ------------------------------------------------------------

const isTree = (v: unknown): v is ComponentData[] => Array.isArray(v) && v.every((x) => x && typeof x === "object" && "type" in x);

/**
 * A layout's gradients end in a colour role; in some looks that colour would
 * make the text hard to read. This swaps such a gradient for one that reads
 * on this site (or a plain colour when none does), so every inserted layout
 * keeps AA contrast whatever the look.
 */
export function fitLayoutToTokens(items: ComponentData[], tokens: SiteTokens): ComponentData[] {
  return items.map((item) => {
    const props: Record<string, unknown> = { ...item.props };
    if (item.type === "Section" && props.bgKind === "gradient") {
      const style = props.background as SectionStyleId;
      const g = props.gradient as { to: ColorRole; direction: GradientDirection } | undefined;
      if (!g || !gradientReads(tokens, style, g.to)) {
        const to = gradientColours(tokens, style)[0];
        if (to && g) props.gradient = { ...g, to };
        else {
          props.bgKind = "colour";
          delete props.gradient;
        }
      }
    }
    for (const [k, v] of Object.entries(props)) if (isTree(v)) props[k] = fitLayoutToTokens(v, tokens);
    return { ...item, props: props as ComponentData["props"] };
  });
}

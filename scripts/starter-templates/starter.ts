/**
 * The starter templates (F049 Harbour, F050 Signal, F051 Corner). All three
 * share the same pages and the same "Replace me" wording; each has its own
 * look (Site settings values), business name, headline and stand-in images.
 * Design snapshot: design/f049-starter-template-v1.html.
 *
 * F052 reworked Harbour around real CC0 photos (photos/, credited in
 * photos/CREDITS.md): a photo opening, a tall-beside-two-wide work mosaic,
 * statement bands and quiet links. Snapshot: design/f052-harbour-rework-v1.html
 * (direction A).
 *
 * `npm run build:starters` writes templates/<id>.crust from this file; the
 * starter-template test fails if a committed file is out of date.
 */
import {
  defaultTokens,
  fontStacks,
  makeTemplate,
  richParagraphs,
  type Page,
  type Post,
  type SiteChrome,
  type SiteTokens,
  type Template,
  type TemplateSource,
} from "@crust/blocks";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { cornerPhotos, harbourPhotos, signalPhotos, type Photo } from "./photo-sets";
import { standIn, toBase64, type Composition } from "./standins";

type Block = Page["puck"]["content"][number];

export interface StarterSpec {
  /** File name: templates/<id>.crust */
  id: string;
  name: string;
  description: string;
  siteName: string;
  tagline: string;
  tokens: SiteTokens;
  /** Header and opening section style. */
  heroStyle: "background" | "surface" | "dark";
  /** Three colours for the stand-in images: ground, shape, accent. */
  imageColors: [string, string, string];
  /**
   * F052/F053: real photos (in `photos/`, credited in photos/CREDITS.md) and
   * a photo-led layout of the template's own instead of stand-ins.
   */
  photos?: Photo[];
  layout?: PhotoLayout;
}

/** The pages and photos that differ per photo-led template. */
interface PhotoLayout {
  home: (s: StarterSpec) => Page;
  work: (s: StarterSpec) => Page;
  /** The About page's photo. */
  about: string;
  /** A photo under the address on the Contact page (F053). */
  contact?: string;
  /** The first post's cover (F053). */
  postCover?: string;
}

const font = (id: string) => fontStacks.find((f) => f.id === id)!.stack;

export const harbour: StarterSpec = {
  id: "harbour",
  name: "Harbour",
  description: "Calm and editorial: serif headings, deep green on warm paper. For studios, consultants and anyone selling judgement.",
  siteName: "Harbour Studio",
  tagline: "Design for places people remember",
  tokens: {
    ...defaultTokens,
    colors: { background: "#FBFAF7", surface: "#F0EDE4", text: "#1D2420", muted: "#4F5A53", primary: "#1F5135", onPrimary: "#FFFFFF" },
    fonts: { heading: font("oldstyle"), body: font("humanist") },
    radius: 2,
    style: { typeScale: "balanced", headingWeight: 500, headingTracking: "snug", buttonShape: "square", cardStyle: "outline", linkStyle: "thick" },
  },
  heroStyle: "background",
  imageColors: ["#D9E0D3", "#8FA58F", "#1F5135"],
  photos: harbourPhotos,
  layout: { home: homeWithPhotos, work: workWithPhotos, about: "home-office.jpg" },
};

export const signal: StarterSpec = {
  id: "signal",
  name: "Signal",
  description: "Bold and current: heavy sans set tight, a dark opening, one burnt-orange accent. For agencies, product studios and events.",
  siteName: "Signal & Co",
  tagline: "We make brands people talk about",
  tokens: {
    ...defaultTokens,
    colors: { background: "#FFFFFF", surface: "#F3F4F6", text: "#0B0D12", muted: "#4B5160", primary: "#C2410C", onPrimary: "#FFFFFF" },
    fonts: { heading: font("geometric"), body: font("system") },
    radius: 14,
    style: { typeScale: "dramatic", headingWeight: 800, headingTracking: "tight", buttonShape: "pill", cardStyle: "shadow", linkStyle: "underline" },
  },
  heroStyle: "dark",
  imageColors: ["#FDE7D6", "#FDBA74", "#C2410C"],
  photos: signalPhotos,
  layout: { home: signalHome, work: signalWork, about: "studio-lounge.jpg", postCover: "spiral-amber.jpg" },
};

export const corner: StarterSpec = {
  id: "corner",
  name: "Corner",
  description: "Warm and local: a sturdy serif, navy on butter yellow, highlighter links. For shops, cafés, makers and local services.",
  siteName: "Corner Workshop",
  tagline: "Made by hand, around the corner",
  tokens: {
    ...defaultTokens,
    colors: { background: "#FFFDF6", surface: "#FBF1D0", text: "#1C2340", muted: "#4A5170", primary: "#1E3A8A", onPrimary: "#FFFFFF" },
    fonts: { heading: font("transitional"), body: font("system") },
    radius: 10,
    style: { typeScale: "subtle", headingWeight: 700, headingTracking: "normal", buttonShape: "rounded", cardStyle: "flat", linkStyle: "highlight" },
  },
  heroStyle: "surface",
  imageColors: ["#E3EAFB", "#BFD0F5", "#1E3A8A"],
  photos: cornerPhotos,
  layout: { home: cornerHome, work: cornerWork, about: "pottery-wheel.jpg", contact: "flower-shop.jpg", postCover: "moka-pour.jpg" },
};

export const starters: StarterSpec[] = [harbour, signal, corner];

// --- Building blocks ----------------------------------------------------------------------

/** Ids only need to be unique within a page; a counter per page keeps rebuilt files identical. */
function ids(prefix: string) {
  let n = 0;
  return (kind: string) => `${prefix}-${kind}-${++n}`;
}

const STANDIN = "Stand-in image";

/** Every stand-in image a starter uses, with its description. */
export const images: { file: string; kind: Composition; alt: string }[] = [
  { file: "studio.png", kind: "window", alt: `${STANDIN}: replace with a photo of your studio or team at work` },
  { file: "project-1.png", kind: "arches", alt: `${STANDIN}: replace with a photo of a finished project` },
  { file: "project-2.png", kind: "horizon", alt: `${STANDIN}: replace with a photo of a finished project` },
  { file: "project-3.png", kind: "blocks", alt: `${STANDIN}: replace with a photo of a finished project` },
  { file: "project-4.png", kind: "stairs", alt: `${STANDIN}: replace with a photo of a finished project` },
  { file: "project-5.png", kind: "dunes", alt: `${STANDIN}: replace with a photo of a finished project` },
  { file: "project-6.png", kind: "window", alt: `${STANDIN}: replace with a photo of a finished project` },
];

const photoDir = join(dirname(fileURLToPath(import.meta.url)), "photos");

const img = (file: string) => `/media/${file}`;
const altOf = (file: string) => [...images, ...harbourPhotos, ...signalPhotos, ...cornerPhotos].find((i) => i.file === file)!.alt;

const SERVICE_LINE = "A short line on this service: what the client gets, how long it takes, and a starting price.";
const PROJECT_CAPTION = "Project name, the client, the year";

function sectionOf(id: (k: string) => string, background: string, content: Block[], paddingY = "lg"): Block {
  return { type: "Section", props: { id: id("section"), background, paddingY, height: "auto", valign: "center", imageSrc: "", tint: "medium", content } } as Block;
}
const heading = (id: (k: string) => string, text: string, level: "h1" | "h2" | "h3", marked = true): Block =>
  ({ type: "Heading", props: { id: id("heading"), text, level, align: "left", ...(marked ? { placeholder: ["text"] } : {}) } }) as Block;
const text = (id: (k: string) => string, ...paragraphs: string[]): Block =>
  ({ type: "Text", props: { id: id("text"), text: richParagraphs(...paragraphs), align: "left", tone: "default", placeholder: ["text"] } }) as Block;
const button = (id: (k: string) => string, label: string, href: string, variant: "primary" | "secondary" = "primary"): Block =>
  ({ type: "Button", props: { id: id("button"), label, href, variant, align: "left" } }) as Block;

/** A quiet link (F052): rich text with one link. It says where it goes, so it isn't sample content. */
const link = (id: (k: string) => string, label: string, href: string): Block =>
  ({ type: "Text", props: { id: id("text"), text: { rich: 1, blocks: [{ type: "p", children: [{ text: label, href }] }] }, align: "left", tone: "default" } }) as Block;
const muted = (id: (k: string) => string, line: string): Block =>
  ({ type: "Text", props: { id: id("text"), text: richParagraphs(line), align: "left", tone: "muted", placeholder: ["text"] } }) as Block;
const photo = (id: (k: string) => string, file: string): Block =>
  ({ type: "Image", props: { id: id("image"), src: img(file), alt: altOf(file), caption: "", placeholder: ["src"] } }) as Block;
function columns(id: (k: string) => string, desktop: string, column1: Block[], column2: Block[], column3: Block[] = []): Block {
  const count = column3.length ? "3" : "2";
  return {
    type: "Columns",
    props: { id: id("columns"), count, gap: "lg", widths: { desktop, tablet: count === "2" ? desktop : "wrap", phone: "stack" }, column1, column2, column3, column4: [] },
  } as Block;
}
/** A work photo with its line underneath ("Project name, the client, the year"). */
const project = (id: (k: string) => string, file: string): Block[] => [photo(id, file), muted(id, PROJECT_CAPTION)];

function serviceGrid(id: (k: string) => string, cardBackground: string, linked: boolean): Block {
  const items = ["Brand identity", "Websites", "Signage and print"].map((title) => ({
    title,
    text: SERVICE_LINE,
    imageSrc: "",
    imageAlt: "",
    linkLabel: linked ? `More about ${title.toLowerCase()}` : "",
    linkHref: linked ? "/services" : "",
  }));
  return { type: "Grid", props: { id: id("grid"), columns: "3", titleLevel: "h3", background: cardBackground, items, placeholder: ["items"] } } as Block;
}

/** The contact strip, linked (F043): a fixed id, so a rebuilt file is identical. */
const linked = (id: (k: string) => string): Block => ({ type: "LinkedSection", props: { id: id("linked"), section: "contact-strip" } }) as Block;

const gallery = (id: (k: string) => string, files: string[], columns: "2" | "3"): Block =>
  ({
    type: "Gallery",
    props: { id: id("gallery"), columns, shape: "wide", images: files.map((f) => ({ src: img(f), alt: altOf(f), caption: PROJECT_CAPTION })), placeholder: ["images"] },
  }) as Block;

// --- Pages ----------------------------------------------------------------------------------

function home(s: StarterSpec): Page {
  if (s.layout) return s.layout.home(s);
  const id = ids("home");
  return {
    path: "/",
    title: "Home",
    description: `${s.siteName}: what the studio does, recent work and how to get in touch.`,
    puck: {
      root: { props: {} },
      content: [
        sectionOf(id, s.heroStyle, [
          heading(id, s.tagline, "h1"),
          text(id, "One or two sentences about what you do and who it's for. Say it the way you would to a new client."),
          button(id, "See our work", "/work"),
        ]),
        sectionOf(id, "background", [heading(id, "What we do", "h2", false), serviceGrid(id, "surface", true)]),
        sectionOf(id, "surface", [
          heading(id, "Recent work", "h2", false),
          gallery(id, ["project-1.png", "project-2.png"], "2"),
          button(id, "All projects", "/work", "secondary"),
        ]),
        sectionOf(id, "background", [
          {
            type: "Quote",
            props: {
              id: id("quote"),
              text: "A sentence a happy client said about working with you. Ask them first.",
              name: "Client's name",
              role: "Their role and company",
              imageSrc: "",
              align: "left",
              size: "large",
              placeholder: ["text", "name", "role"],
            },
          } as Block,
        ]),
        linked(id),
      ],
    },
  };
}

function about(s: StarterSpec): Page {
  const id = ids("about");
  const studio = s.layout ? photo(id, s.layout.about) : null;
  return {
    path: "/about",
    title: "About",
    description: `Who works at ${s.siteName} and how the studio works.`,
    puck: {
      root: { props: {} },
      content: [
        sectionOf(id, s.heroStyle, [
          heading(id, "About the studio", "h1", false),
          text(
            id,
            "How the studio started, in two or three sentences. People hire people: say who you are.",
            "What you care about in your work, and what clients can count on.",
          ),
        ]),
        sectionOf(id, "background", [
          studio ?? ({ type: "Image", props: { id: id("image"), src: img("studio.png"), alt: altOf("studio.png"), caption: "", placeholder: ["src"] } } as Block),
        ]),
        sectionOf(id, "surface", [
          heading(id, "How we work", "h2", false),
          {
            type: "IconList",
            props: {
              id: id("icons"),
              icon: "check",
              iconColor: "primary",
              items: [{ text: "First step: how a project starts" }, { text: "Second step: what happens in the middle" }, { text: "Last step: what the client gets at the end" }],
              placeholder: ["items"],
            },
          } as Block,
        ]),
        sectionOf(id, "background", [
          heading(id, "The team", "h2", false),
          {
            type: "Grid",
            props: {
              id: id("grid"),
              columns: "3",
              titleLevel: "h3",
              background: "surface",
              items: ["Name", "Name", "Name"].map((title) => ({ title, text: "Their role, and one line about what they're good at.", imageSrc: "", imageAlt: "", linkLabel: "", linkHref: "" })),
              placeholder: ["items"],
            },
          } as Block,
        ]),
        linked(id),
      ],
    },
  };
}

function services(s: StarterSpec): Page {
  const id = ids("services");
  return {
    path: "/services",
    title: "Services",
    description: `What ${s.siteName} offers, what's included and what it costs.`,
    puck: {
      root: { props: {} },
      content: [
        sectionOf(id, s.heroStyle, [
          heading(id, "Services", "h1", false),
          text(id, "One sentence on the kind of work you take on, and the kind you don't."),
        ]),
        sectionOf(id, "background", [heading(id, "What we offer", "h2", false), serviceGrid(id, "surface", false)]),
        sectionOf(id, "surface", [
          heading(id, "Questions clients ask", "h2", false),
          {
            type: "Accordion",
            props: {
              id: id("questions"),
              firstOpen: "yes",
              oneAtATime: "no",
              items: [
                { question: "How long does a project take?", answer: "Your usual timeline, and what makes it longer or shorter." },
                { question: "What does it cost?", answer: "How you price your work, and what a typical project costs." },
                { question: "What do you need from me?", answer: "What a client should have ready before you start." },
              ],
              placeholder: ["items"],
            },
          } as Block,
        ]),
        linked(id),
      ],
    },
  };
}

function work(s: StarterSpec): Page {
  if (s.layout) return s.layout.work(s);
  const id = ids("work");
  return {
    path: "/work",
    title: "Work",
    description: `Recent projects by ${s.siteName}.`,
    puck: {
      root: { props: {} },
      content: [
        sectionOf(id, s.heroStyle, [
          heading(id, "Work", "h1", false),
          text(id, "A line about the projects below: who they were for and what they have in common."),
        ]),
        sectionOf(id, "background", [gallery(id, ["project-1.png", "project-2.png", "project-3.png", "project-4.png", "project-5.png", "project-6.png"], "3")]),
        linked(id),
      ],
    },
  };
}

const SERVICES = ["Architecture", "Interiors", "Landscape"];

/** Harbour's home page (F052, direction A): photo opening, statement, mosaic, quiet services, journal. */
function homeWithPhotos(s: StarterSpec): Page {
  const id = ids("home");
  const opening = sectionOf(id, s.heroStyle, [
    heading(id, s.tagline, "h1"),
    text(id, "Houses, studios and public rooms, designed to stay calm for decades."),
    link(id, "See the work", "/work"),
  ]) as Block & { props: Record<string, unknown> };
  Object.assign(opening.props, { imageSrc: img("terraces.jpg"), tint: "light", height: "large", valign: "bottom", placeholder: ["imageSrc"] });
  return {
    path: "/",
    title: "Home",
    description: `${s.siteName}: what the studio does, recent work and how to get in touch.`,
    puck: {
      root: { props: {} },
      content: [
        opening,
        sectionOf(id, "background", [heading(id, "We take on a few projects a year, and see each one through from the first sketch to the last fitting.", "h2")]),
        sectionOf(id, "background", [
          heading(id, "Recent work", "h2", false),
          columns(id, "equal", [photo(id, "balconies.jpg")], [photo(id, "angles.jpg"), photo(id, "wood-spiral.jpg")]),
          link(id, "All projects", "/work"),
        ]),
        sectionOf(id, "surface", [
          heading(id, "What we do", "h2", false),
          columns(
            id,
            "equal",
            ...(SERVICES.map((name) => [heading(id, name, "h3"), muted(id, "One line on this service and who it's for."), link(id, `More on ${name.toLowerCase()}`, "/services")]) as [Block[], Block[], Block[]]),
          ),
        ]),
        sectionOf(id, "background", [
          columns(
            id,
            "one-two",
            [photo(id, "shadows.jpg")],
            [
              muted(id, "From the journal"),
              heading(id, "News from the studio", "h2"),
              link(id, "Read the post", "/blog/studio-news"),
              muted(id, "We're hiring: one line about the role and how to apply."),
            ],
          ),
        ]),
        linked(id),
      ],
    },
  };
}

/** Harbour's Work page (F052): two mosaics, the second mirrored, a statement line between. */
function workWithPhotos(s: StarterSpec): Page {
  const id = ids("work");
  return {
    path: "/work",
    title: "Work",
    description: `Recent projects by ${s.siteName}.`,
    puck: {
      root: { props: {} },
      content: [
        sectionOf(id, s.heroStyle, [
          heading(id, "Work", "h1", false),
          text(id, "A line about the projects below: who they were for and what they have in common."),
        ]),
        sectionOf(id, "background", [
          columns(id, "equal", project(id, "balconies.jpg"), [...project(id, "angles.jpg"), ...project(id, "wood-spiral.jpg")]),
        ]),
        sectionOf(id, "surface", [heading(id, "Every project starts with a walk around the site.", "h2")]),
        sectionOf(id, "background", [
          columns(id, "equal", [...project(id, "pool-house.jpg"), ...project(id, "window-tree.jpg")], project(id, "white-stair.jpg")),
          ...project(id, "grid.jpg"),
        ]),
        linked(id),
      ],
    },
  };
}

// --- F053: Signal and Corner ------------------------------------------------------------------
// Snapshot: design/f053-signal-corner-v1.html (direction A for both).

type Props = Block & { props: Record<string, unknown> };

/** A section with a photo behind it; the photo is marked Replace me. */
function photoSection(id: (k: string) => string, background: string, file: string, content: Block[], extra: Record<string, unknown> = {}): Block {
  const section = sectionOf(id, background, content) as Props;
  Object.assign(section.props, { imageSrc: img(file), tint: "medium", placeholder: ["imageSrc"], ...extra });
  return section;
}

/** Signal's work tiles (F053): the project name on its photo, under the dark style's tint. */
const tile = (id: (k: string) => string, file: string): Block =>
  ({
    type: "ImageOverlay",
    props: {
      id: id("overlay"),
      imageSrc: img(file),
      imageAlt: altOf(file),
      title: "Project name",
      titleLevel: "h3",
      text: "The client, the year",
      linkLabel: "",
      linkHref: "",
      background: "dark",
      tint: "medium",
      position: "bottom-left",
      height: "medium",
      placeholder: ["imageSrc", "title", "text"],
    },
  }) as Block;

/** Signal's home page (F053, direction A "Night stage"): dark photo opening, statement, work tiles, stair band, journal. */
function signalHome(s: StarterSpec): Page {
  const id = ids("home");
  return {
    path: "/",
    title: "Home",
    description: `${s.siteName}: what the studio does, recent work and how to get in touch.`,
    puck: {
      root: { props: {} },
      content: [
        photoSection(
          id,
          "dark",
          "stage-crowd.jpg",
          [heading(id, s.tagline, "h1"), text(id, "Identity, campaigns and launch events for teams that want to be noticed."), button(id, "See the work", "/work")],
          { height: "large", valign: "bottom" },
        ),
        sectionOf(id, "dark", [heading(id, "Small senior team. Every project has a strategist, a designer and a producer from day one.", "h2")]),
        sectionOf(id, "background", [
          heading(id, "Selected work", "h2", false),
          columns(id, "equal", [tile(id, "copper-stair.jpg"), tile(id, "red-stage.jpg")], [tile(id, "guitarist.jpg"), tile(id, "atrium.jpg")]),
          link(id, "All projects", "/work"),
        ]),
        photoSection(id, "dark", "stair-lights.jpg", [heading(id, "Brief on Monday. First ideas on Friday.", "h2")]),
        sectionOf(id, "background", [
          columns(
            id,
            "equal",
            [photo(id, "dark-desk.jpg")],
            [muted(id, "From the journal"), heading(id, "News from the studio", "h2"), link(id, "Read the post", "/blog/studio-news")],
          ),
        ]),
        linked(id),
      ],
    },
  };
}

/** Signal's Work page (F053): a tall beside two wide, a dark line, then mirrored. */
function signalWork(s: StarterSpec): Page {
  const id = ids("work");
  return {
    path: "/work",
    title: "Work",
    description: `Recent projects by ${s.siteName}.`,
    puck: {
      root: { props: {} },
      content: [
        sectionOf(id, s.heroStyle, [
          heading(id, "Work", "h1", false),
          text(id, "A line about the projects below: who they were for and what they have in common."),
        ]),
        sectionOf(id, "background", [
          columns(id, "equal", project(id, "concrete-tower.jpg"), [...project(id, "copper-stair.jpg"), ...project(id, "guitarist.jpg")]),
        ]),
        sectionOf(id, "dark", [heading(id, "We say no to most briefs, so we can say yes properly.", "h2")]),
        sectionOf(id, "background", [
          columns(id, "equal", [...project(id, "red-stage.jpg"), ...project(id, "studio-lounge.jpg")], project(id, "atrium.jpg")),
        ]),
        linked(id),
      ],
    },
  };
}

/** Corner's product cards (F053): a photo, a name and a line with the price. */
const products = (id: (k: string) => string, files: string[]): Block =>
  ({
    type: "Grid",
    props: {
      id: id("grid"),
      columns: "3",
      titleLevel: "h3",
      background: "surface",
      items: files.map((f) => ({ title: "Product name", text: "One line about it, and the price.", imageSrc: img(f), imageAlt: altOf(f), linkLabel: "", linkHref: "" })),
      placeholder: ["items"],
    },
  }) as Block;

/** Corner's home page (F053, direction A "Shop counter"): split opening, products, a story, a workshop band. */
function cornerHome(s: StarterSpec): Page {
  const id = ids("home");
  return {
    path: "/",
    title: "Home",
    description: `${s.siteName}: what the shop makes, when it's open and how to find it.`,
    puck: {
      root: { props: {} },
      content: [
        sectionOf(id, s.heroStyle, [
          columns(
            id,
            "equal",
            [
              heading(id, s.tagline, "h1"),
              text(id, "Bread, coffee and small things made in the back room. Open six days a week."),
              button(id, "Visit the shop", "/contact"),
            ],
            [photo(id, "bread-hands.jpg")],
          ),
        ]),
        sectionOf(id, "background", [heading(id, "This week at the counter", "h2", false), products(id, ["loaves.jpg", "moka-breakfast.jpg", "lemon-loaf.jpg"])]),
        sectionOf(id, "surface", [
          columns(
            id,
            "one-two",
            [photo(id, "pouring-coffee.jpg")],
            [heading(id, "Everything is made here, in small batches, by the people who serve you.", "h2"), link(id, "More about us", "/about")],
          ),
        ]),
        photoSection(id, "background", "tool-wall.jpg", [heading(id, "Workshops on Saturday mornings. Bring nothing but your hands.", "h2")], { tint: "strong" }),
        linked(id),
      ],
    },
  };
}

/** Corner's Work page (F053): what the shop makes, as a tall beside two wide, mirrored. */
function cornerWork(s: StarterSpec): Page {
  const id = ids("work");
  return {
    path: "/work",
    title: "Work",
    description: `What ${s.siteName} makes.`,
    puck: {
      root: { props: {} },
      content: [
        sectionOf(id, s.heroStyle, [
          heading(id, "Work", "h1", false),
          text(id, "A line about what you make: what it's made of, and who it's for."),
        ]),
        sectionOf(id, "background", [
          columns(id, "equal", project(id, "carnations.jpg"), [...project(id, "ceramic-bottles.jpg"), ...project(id, "loaves.jpg")]),
        ]),
        sectionOf(id, "surface", [heading(id, "Made in small batches. When it's gone, it's gone.", "h2")]),
        sectionOf(id, "background", [
          columns(id, "equal", [...project(id, "moka-breakfast.jpg"), ...project(id, "lemon-loaf.jpg")], project(id, "pouring-coffee.jpg")),
        ]),
        linked(id),
      ],
    },
  };
}

function contact(s: StarterSpec): Page {
  const id = ids("contact");
  return {
    path: "/contact",
    title: "Contact",
    description: `How to reach ${s.siteName}.`,
    puck: {
      root: { props: {} },
      content: [
        sectionOf(id, s.heroStyle, [
          heading(id, "Contact", "h1", false),
          {
            type: "Columns",
            props: {
              id: id("columns"),
              count: "2",
              gap: "lg",
              column1: [
                text(id, "Your address, on one or two lines.", "Your phone number and email address.", "When you're open, or when you answer messages."),
                ...(s.layout?.contact ? [photo(id, s.layout.contact)] : []),
              ],
              column2: [
                {
                  type: "ContactForm",
                  props: {
                    id: id("form"),
                    nameLabel: "Name",
                    emailLabel: "Email",
                    messageLabel: "Tell us about your project",
                    fields: [],
                    submitLabel: "Send message",
                    successMessage: "Thank you. Your message is on its way; we'll reply by email.",
                  },
                },
              ],
              column3: [],
              column4: [],
            },
          } as Block,
        ]),
      ],
    },
  };
}

const contactStrip = (id = ids("strip")) => ({
  id: "contact-strip",
  name: "Contact strip",
  content: [sectionOf(id, "dark", [heading(id, "Have a project in mind?", "h2"), button(id, "Get in touch", "/contact")], "md")] as Page["puck"]["content"],
});

function post(s: StarterSpec): Post {
  const id = ids("post");
  return {
    slug: "studio-news",
    title: "News from the studio",
    description: "A first post: what's new, and what the journal will be about.",
    date: "2026-10-31",
    cover: s.layout?.postCover ? img(s.layout.postCover) : "",
    coverAlt: s.layout?.postCover ? altOf(s.layout.postCover) : "",
    puck: {
      root: { props: {} },
      content: [
        text(
          id,
          `Write your first post here: news about ${s.siteName}, a recent project, or something you learned.`,
          "A journal is optional. If you don't want one, delete this post and the blog disappears from the site.",
        ),
      ],
    },
  };
}

function chrome(s: StarterSpec): SiteChrome {
  return {
    header: {
      show: true,
      logo: { text: s.siteName, imageSrc: "", imageAlt: "" },
      menu: [
        { label: "About", href: "/about" },
        { label: "Services", href: "/services" },
        { label: "Work", href: "/work" },
        { label: "Journal", href: "/blog" },
        { label: "Contact", href: "/contact" },
      ],
      cta: { label: "", href: "" },
      sticky: false,
      style: s.heroStyle,
    },
    footer: {
      show: true,
      text: "One line about the studio, and where you are.",
      columns: [
        { title: "Studio", links: [{ label: "About", href: "/about" }, { label: "Services", href: "/services" }, { label: "Work", href: "/work" }] },
        { title: "Say hello", links: [{ label: "Contact", href: "/contact" }, { label: "Journal", href: "/blog" }] },
      ],
      copyright: "© {year} {name}",
      style: "surface",
    },
  };
}

/** The template's source, as the builder would collect it from a site. */
export function starterSource(s: StarterSpec): TemplateSource {
  return {
    site: { name: s.siteName, language: "en" },
    tokens: s.tokens,
    chrome: chrome(s),
    pages: [home(s), about(s), services(s), work(s), contact(s)],
    sections: [contactStrip()],
    layouts: [],
    blog: { title: "Journal", intro: "News from the studio and notes on recent work." },
    posts: [post(s)],
    media: s.photos
      ? s.photos.map(({ file, alt, width, height }) => ({ file, alt, width, height }))
      : images.map((i) => ({ file: i.file, alt: i.alt, width: 1200, height: 800 })),
  };
}

/** The finished template. The date is fixed so a rebuilt file is identical. */
export async function buildStarter(s: StarterSpec): Promise<Template> {
  const byFile = new Map(images.map((i) => [i.file, i]));
  const { template, missing } = await makeTemplate({ name: s.name, description: s.description }, starterSource(s), async (file) => {
    if (s.photos) {
      const p = s.photos.find((p) => p.file === file);
      return p ? toBase64(await readFile(join(photoDir, p.path))) : null;
    }
    const i = byFile.get(file);
    return i ? toBase64(standIn(i.kind, s.imageColors)) : null;
  }, new Date("2026-10-31T00:00:00Z"));
  if (missing.length) throw new Error(`Missing images: ${missing.join(", ")}`);
  return template;
}

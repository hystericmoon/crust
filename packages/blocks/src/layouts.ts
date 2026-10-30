/**
 * The layout library (F026): designed sections and whole pages built only
 * from Crust blocks. They use section styles and tokens, never colours of
 * their own, so they match any site the moment they're inserted.
 *
 * Layouts are recipes: `build()` returns fresh blocks with new ids each time.
 */
import type { ComponentData } from "@puckeditor/core";
import type { SectionStyleId } from "./section-styles";
import type { SpacingStep } from "./tokens";
import { richParagraphs } from "./rich-text";

type Align = "left" | "center" | "right";
type Level = "h1" | "h2" | "h3" | "h4";

export const layoutCategories = [
  "Hero",
  "Features",
  "Content",
  "Testimonials",
  "Pricing",
  "FAQ",
  "Team",
  "Numbers",
  "Call to action",
  "Contact",
] as const;
export type LayoutCategory = (typeof layoutCategories)[number];

export interface SectionLayout {
  id: string;
  name: string;
  category: LayoutCategory;
  /** One line about when to use it. */
  description: string;
  build: () => ComponentData[];
}

export interface PageLayout {
  id: string;
  name: string;
  description: string;
  /** Section layout ids, top to bottom. */
  sections: string[];
}

// --- Block helpers -----------------------------------------------------------

const uid = (type: string) => `${type}-${globalThis.crypto.randomUUID()}`;
const block = (type: string, props: Record<string, unknown>): ComponentData => ({ type, props: { id: uid(type), ...props } });

const section = (
  background: SectionStyleId,
  content: ComponentData[],
  extra: { paddingY?: SpacingStep; height?: string; valign?: string } = {},
) =>
  block("Section", {
    background,
    paddingY: extra.paddingY ?? "lg",
    height: extra.height ?? "auto",
    valign: extra.valign ?? "center",
    imageSrc: "",
    tint: "medium",
    content,
  });
const heading = (text: string, level: Level = "h2", align: Align = "left") => block("Heading", { text, level, align });
const text = (t: string, align: Align = "left", tone: "default" | "muted" = "default") => block("Text", { text: richParagraphs(t), align, tone });
const button = (label: string, href: string, variant: "primary" | "secondary" = "primary", align: Align = "left") =>
  block("Button", { label, href, variant, align });
const spacer = (size: SpacingStep = "sm") => block("Spacer", { size });
const columns = (cols: ComponentData[][], gap: SpacingStep = "md") =>
  block("Columns", {
    count: String(cols.length),
    gap,
    column1: cols[0] ?? [],
    column2: cols[1] ?? [],
    column3: cols[2] ?? [],
    column4: cols[3] ?? [],
  });
const card = (title: string, body: string, background: "background" | "surface" | "primary" = "surface", link?: [string, string]) =>
  block("Card", {
    title,
    titleLevel: "h3",
    text: body,
    imageSrc: "",
    imageAlt: "",
    linkLabel: link?.[0] ?? "",
    linkHref: link?.[1] ?? "",
    background,
  });

// --- Sections ------------------------------------------------------------------

export const sectionLayouts: SectionLayout[] = [
  {
    id: "hero-centered",
    name: "Centered hero",
    category: "Hero",
    description: "Big headline, one line and a button, centred.",
    build: () => [
      section("background", [
        heading("Make something people love", "h1", "center"),
        text("One clear sentence about what you do and who it's for.", "center", "muted"),
        spacer("sm"),
        button("Get started", "/contact", "primary", "center"),
      ], { paddingY: "xl" }),
    ],
  },
  {
    id: "hero-left",
    name: "Hero, two buttons",
    category: "Hero",
    description: "Left-aligned headline with a main and a second action.",
    build: () => [
      section("surface", [
        heading("Design studio for small teams", "h1"),
        text("Brand, web and campaigns, made with care and shipped fast.", "left", "muted"),
        spacer("sm"),
        columns([[button("See our work", "/work")], [button("About us", "/about", "secondary")]], "sm"),
      ], { paddingY: "xl" }),
    ],
  },
  {
    id: "hero-dark-full",
    name: "Full-screen dark hero",
    category: "Hero",
    description: "Fills the screen; add a background photo in the section's Image.",
    build: () => [
      section("dark", [
        heading("Fast sites. No servers.", "h1", "center"),
        text("Publish plain HTML in one click.", "center"),
        spacer("sm"),
        button("Start now", "/contact", "primary", "center"),
      ], { height: "full" }),
    ],
  },
  {
    id: "hero-primary",
    name: "Brand-colour hero",
    category: "Hero",
    description: "Headline on your primary colour.",
    build: () => [
      section("primary", [
        heading("Hello, we're Studio Name", "h1"),
        text("A short welcome that says why people should stay.", "left"),
        spacer("sm"),
        button("Say hello", "/contact"),
      ], { paddingY: "xl", height: "medium" }),
    ],
  },
  {
    id: "features-3",
    name: "Three features",
    category: "Features",
    description: "A heading and three cards side by side.",
    build: () => [
      section("surface", [
        heading("What we do", "h2", "center"),
        spacer("xs"),
        columns([
          [card("Identity", "Logos, colours and type that feel like you.", "background")],
          [card("Websites", "Fast, accessible sites you can edit yourself.", "background")],
          [card("Campaigns", "Launches and content that people remember.", "background")],
        ]),
      ]),
    ],
  },
  {
    id: "features-4",
    name: "Four features",
    category: "Features",
    description: "Four short points in a row.",
    build: () => [
      section("background", [
        heading("Why people choose us", "h2"),
        columns([
          [heading("Fast", "h3"), text("Pages load in a blink.", "left", "muted")],
          [heading("Accessible", "h3"), text("Everyone can use what we make.", "left", "muted")],
          [heading("Yours", "h3"), text("Edit it yourself, any time.", "left", "muted")],
          [heading("Friendly", "h3"), text("Real people answer your emails.", "left", "muted")],
        ]),
      ]),
    ],
  },
  {
    id: "steps-3",
    name: "Three steps",
    category: "Features",
    description: "How it works, as three numbered steps.",
    build: () => [
      section("background", [
        heading("How it works", "h2", "center"),
        columns([
          [heading("1. Talk", "h3", "center"), text("Tell us what you need.", "center", "muted")],
          [heading("2. Make", "h3", "center"), text("We design and build it.", "center", "muted")],
          [heading("3. Launch", "h3", "center"), text("You go live and grow.", "center", "muted")],
        ]),
      ]),
    ],
  },
  {
    id: "text-block",
    name: "Text block",
    category: "Content",
    description: "A heading and a few paragraphs.",
    build: () => [
      section("background", [
        heading("Our story", "h2"),
        text("Start with where you began and why.\n\nThen say what you care about today, in plain words."),
      ]),
    ],
  },
  {
    id: "text-two-columns",
    name: "Text in two columns",
    category: "Content",
    description: "Heading on the left, text on the right.",
    build: () => [
      section("background", [
        columns([
          [heading("Made with care", "h2")],
          [
            text("Every project starts with listening. We ask questions until we understand what you need.", "left"),
            button("About us", "/about", "secondary"),
          ],
        ], "lg"),
      ]),
    ],
  },
  {
    id: "quote",
    name: "Big quote",
    category: "Testimonials",
    description: "One testimonial, large and centred.",
    build: () => [
      section("surface", [
        text("“The fastest site we've ever shipped, and the easiest to edit.”", "center"),
        text("Rina, Founder", "center", "muted"),
      ], { paddingY: "xl" }),
    ],
  },
  {
    id: "testimonials-3",
    name: "Three testimonials",
    category: "Testimonials",
    description: "Three short quotes as cards.",
    build: () => [
      section("background", [
        heading("What clients say", "h2", "center"),
        columns([
          [card("Rina, Studio Haho", "“Clear, quick and lovely to work with.”")],
          [card("Bayu, Kopi Co.", "“Our new site doubled online orders.”")],
          [card("Sari, Ruang", "“We update it ourselves every week.”")],
        ]),
      ]),
    ],
  },
  {
    id: "pricing-3",
    name: "Three plans",
    category: "Pricing",
    description: "Plan name, price, a line and a button each.",
    build: () => [
      section("surface", [
        heading("Simple pricing", "h2", "center"),
        columns(
          [
            ["Starter", "$0", "For trying things out."],
            ["Studio", "$19", "For small teams."],
            ["Agency", "$49", "For many sites."],
          ].map(([name, price, line]) => [
            heading(name!, "h3"),
            heading(price!, "h4"),
            text(`${line} Per month.`, "left", "muted"),
            button(`Choose ${name}`, "/contact", name === "Studio" ? "primary" : "secondary"),
          ]),
        ),
      ]),
    ],
  },
  {
    id: "faq",
    name: "Questions and answers",
    category: "FAQ",
    description: "Common questions, each with a short answer.",
    build: () => [
      section("background", [
        heading("Questions", "h2"),
        heading("How long does a site take?", "h3"),
        text("Most sites are live in two to four weeks.", "left", "muted"),
        heading("Can I edit it myself?", "h3"),
        text("Yes. You change text and pictures in the builder and publish.", "left", "muted"),
        heading("Do you do hosting?", "h3"),
        text("Sites are hosted for free on Cloudflare Pages.", "left", "muted"),
      ]),
    ],
  },
  {
    id: "faq-two-columns",
    name: "Questions in two columns",
    category: "FAQ",
    description: "Heading left, questions right.",
    build: () => [
      section("surface", [
        columns([
          [heading("Good to know", "h2"), text("Can't find your answer? Just ask.", "left", "muted")],
          [
            heading("What does it cost?", "h3"),
            text("Plans start free.", "left", "muted"),
            heading("Who owns the site?", "h3"),
            text("You do, along with all its content.", "left", "muted"),
          ],
        ], "lg"),
      ]),
    ],
  },
  {
    id: "team-3",
    name: "Team",
    category: "Team",
    description: "Three people with name and role.",
    build: () => [
      section("background", [
        heading("The team", "h2", "center"),
        columns([
          [card("Hosni", "Design lead")],
          [card("Rina", "Developer")],
          [card("Bayu", "Strategist")],
        ]),
      ]),
    ],
  },
  {
    id: "numbers-3",
    name: "Numbers",
    category: "Numbers",
    description: "Three big figures with a label each.",
    build: () => [
      section("primary", [
        heading("In numbers", "h2", "center"),
        columns([
          [heading("120+", "h3", "center"), text("Sites launched", "center")],
          [heading("98", "h3", "center"), text("Average speed score", "center")],
          [heading("0", "h3", "center"), text("Servers to look after", "center")],
        ]),
      ]),
    ],
  },
  {
    id: "cta-primary",
    name: "Call to action",
    category: "Call to action",
    description: "A closing line and one button on your brand colour.",
    build: () => [
      section("primary", [
        heading("Let's make something.", "h2", "center"),
        text("Tell us about your project.", "center"),
        spacer("xs"),
        button("Get in touch", "/contact", "primary", "center"),
      ], { paddingY: "xl" }),
    ],
  },
  {
    id: "cta-dark-split",
    name: "Call to action, split",
    category: "Call to action",
    description: "Text on the left, button on the right, dark.",
    build: () => [
      section("dark", [
        columns([
          [heading("Ready when you are", "h2"), text("Start with a free call.", "left")],
          [spacer("xs"), button("Book a call", "/contact", "primary", "right")],
        ]),
      ]),
    ],
  },
  {
    id: "contact",
    name: "Contact details",
    category: "Contact",
    description: "How to reach you, with an email button.",
    build: () => [
      section("surface", [
        columns([
          [heading("Say hello", "h2"), text("We reply within one working day.", "left", "muted")],
          [
            heading("Email", "h3"),
            text("hello@example.com", "left"),
            heading("Hours", "h3"),
            text("Monday to Friday, 9 to 5", "left"),
            button("Email us", "mailto:hello@example.com"),
          ],
        ], "lg"),
      ]),
    ],
  },
  {
    id: "contact-centered",
    name: "Contact, centred",
    category: "Contact",
    description: "One line and a big email button.",
    build: () => [
      section("background", [
        heading("Questions? Write to us.", "h2", "center"),
        text("hello@example.com", "center", "muted"),
        button("Email us", "mailto:hello@example.com", "primary", "center"),
      ], { paddingY: "xl" }),
    ],
  },
];

// --- Whole pages -----------------------------------------------------------------

export const pageLayouts: PageLayout[] = [
  { id: "page-landing", name: "Landing page", description: "Hero, features, quote and a call to action.", sections: ["hero-centered", "features-3", "quote", "cta-primary"] },
  { id: "page-about", name: "About", description: "Your story, numbers and team.", sections: ["hero-left", "text-two-columns", "numbers-3", "team-3"] },
  { id: "page-services", name: "Services", description: "What you offer, how it works, prices and questions.", sections: ["hero-primary", "features-4", "steps-3", "pricing-3", "faq"] },
  { id: "page-contact", name: "Contact", description: "A short hero, contact details and questions.", sections: ["hero-centered", "contact", "faq-two-columns"] },
  { id: "page-simple", name: "Simple page", description: "A heading and text, ready to write.", sections: ["hero-centered", "text-block"] },
];

export const findSectionLayout = (id: string) => sectionLayouts.find((l) => l.id === id);

/** All blocks of a page layout, fresh ids. */
export function buildPageLayout(page: PageLayout): ComponentData[] {
  return page.sections.flatMap((id) => findSectionLayout(id)?.build() ?? []);
}

// --- Fitting a layout into a page ---------------------------------------------------

/** Every Heading block in a tree, in order. */
function headings(items: ComponentData[]): ComponentData[] {
  const out: ComponentData[] = [];
  const walk = (list: ComponentData[]) => {
    for (const item of list) {
      if (item.type === "Heading") out.push(item);
      for (const v of Object.values(item.props)) if (Array.isArray(v) && v.every((x) => x && typeof x === "object" && "type" in x)) walk(v as ComponentData[]);
    }
  };
  walk(items);
  return out;
}

export const hasH1 = (items: ComponentData[]) => headings(items).some((h) => h.props.level === "h1");

/**
 * A page has one h1 (and the publish check enforces it): a hero dropped into
 * a page that already has one gets an h2 instead, and a page layout keeps
 * only its first h1.
 */
export function fitHeadings(items: ComponentData[], pageHasH1: boolean): ComponentData[] {
  let seen = pageHasH1;
  const fix = (list: ComponentData[]): ComponentData[] =>
    list.map((item) => {
      const props: Record<string, unknown> = { ...item.props };
      if (item.type === "Heading" && props.level === "h1") {
        if (seen) props.level = "h2";
        seen = true;
      }
      for (const [k, v] of Object.entries(props)) {
        if (Array.isArray(v) && v.every((x) => x && typeof x === "object" && "type" in x)) props[k] = fix(v as ComponentData[]);
      }
      return { ...item, props: props as ComponentData["props"] };
    });
  return fix(items);
}

/** Inserts top-level blocks at `index` (null = end), fitting headings to the page. */
export function insertLayout(content: ComponentData[], items: ComponentData[], index: number | null): ComponentData[] {
  const at = index === null ? content.length : Math.max(0, Math.min(index, content.length));
  return [...content.slice(0, at), ...fitHeadings(items, hasH1(content)), ...content.slice(at)];
}

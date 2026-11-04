/**
 * Harbour (F084): an architecture and interiors studio. Look: Atelier ·
 * Stone from the Style library. A photo opening with the header on it,
 * a statement, figures, a project slider, the process beside a tall photo,
 * services, a client's words and the journal. Snapshot:
 * design/f084-starter-rebuild-v1.html.
 */
import { richParagraphs, type Page, type Post, type SiteChrome, type TemplateDesign } from "@crust/blocks";
import { img, altOf, kit, type Block } from "./kit";
import type { StarterParts } from "./parts";

const EMAIL = "studio@harbour.example";
const PHONE = "+31 10 555 0142";
const ADDRESS = "Touwbaan 14, 3011 Rotterdam";

const PROJECTS = {
  valley: { title: "Valley House", photo: "pool-house.jpg", line: "A family home above a wooded valley: four rooms, one long terrace and a pool that ends at the trees. 2025." },
  longRoom: { title: "The Long Room", photo: "angles.jpg", line: "A library for a school of 400, under one folded timber roof. 2024." },
  spiral: { title: "Spiral House", photo: "wood-spiral.jpg", line: "A narrow town house turned around an oak stair. 2023." },
  orchard: { title: "Orchard Studio", photo: "window-tree.jpg", line: "A painter's studio with one tall window facing an old pear tree. 2022." },
  grid: { title: "Quay Offices", photo: "grid.jpg", line: "A white brick office for a shipping firm, shaded by its own deep frame. 2021." },
} as const;

function home(): Page {
  const k = kit("home");
  const p = Object.values(PROJECTS);
  return {
    path: "/",
    title: "Home",
    description: "Harbour Studio designs houses, interiors and gardens that stay calm for decades. Eight projects a year, from the first walk on site to the last shelf.",
    puck: {
      root: { props: {} },
      content: [
        k.section("dark", [
          k.h1("Design for places people remember", { eyebrow: "Architecture & interiors" }),
          k.text("Houses, studios and public rooms, designed to stay calm for decades.", { tone: "default" }),
          k.spacer("xs"),
          k.columns([[k.button("See the projects", "/work")], [k.button("Start a project", "/contact", "arrow")]], { gap: "sm", widths: "one-three", valign: "middle" }),
        ], { photo: "terraces.jpg", height: "full", valign: "bottom", tint: "medium", focus: { x: 50, y: 55 } }),
        k.section("background", [
          k.heading("We take on eight projects a year and see each one through, from the first walk around the site to the last shelf.", { eyebrow: "The studio" }),
          k.link("About the studio", "/about"),
        ], { width: "narrow", paddingY: "xl" }),
        k.section("background", [
          k.stats([["62", "homes, studios and public rooms"], ["14", "years in practice"], ["8", "projects a year, never more"], ["5", "national design awards"]], { look: "lines", size: "lg" }),
        ], { paddingY: "md" }),
        k.section("surface", [
          k.columns([[k.heading("Selected projects", { mark: false })], [k.link("All projects", "/work", "right")]], { widths: "two-one", valign: "bottom", gap: "sm" }),
          k.cardSlider("Selected projects", p.map((x) => ({ title: x.title, text: x.line, photo: x.photo, link: [`See ${x.title}`, "/work"] as [string, string] })), { visible: "3", background: "background" }),
        ], {}),
        k.section("background", [
          k.columns([
            [k.image("white-stair.jpg")],
            [
              k.heading("Four stages, one team", { eyebrow: "How we work", mark: false }),
              k.text("The people who sketch your house are the people who stand on site with the builder. Nothing gets lost in a handover, because there isn't one."),
              k.steps([
                "Listen. A day on the site with you, in whatever weather it has.",
                "Sketch. Three honest options with a cost for each, then one we develop together.",
                "Build. We're on site every week until the builder hands you the keys.",
                "Live. A year later we come back, see how the house is used, and fix what needs fixing.",
              ]),
            ],
          ], { widths: "equal", valign: "middle", gap: "xl" }),
        ], { paddingY: "xl" }),
        k.section("surface", [
          k.heading("What we do", { mark: false }),
          k.spacer("xs"),
          k.columns(
            [
              ["house", "Architecture", "New houses, extensions and studios, from the planning application to the last fitting."],
              ["lightbulb", "Interiors", "Rooms that work: joinery, lighting, colour and furniture chosen with you, not for you."],
              ["trees", "Landscape", "Gardens, courtyards and terraces planted to look better every year than the one before."],
            ].map(([ic, title, body]) => [k.icon(ic!, "circle"), k.heading(title!, { level: "h3" }), k.text(body!), k.link(`More on ${title!.toLowerCase()}`, "/services")]),
            { gap: "xl", dividers: true },
          ),
        ], { paddingY: "xl" }),
        k.section("background", [
          k.quote("They listened longer than anyone else we met, and it shows in every room. Two years on, we still find small things they thought of for us.", "Ingrid Solberg", "Owner, Valley House", { align: "center" }),
        ], { width: "narrow", paddingY: "xl" }),
        k.section("surface", [
          k.columns([
            [k.image("shadows.jpg")],
            [
              k.heading("Why every project starts with a walk", { eyebrow: "From the journal" }),
              k.text("Before we draw a line we spend a day on the site: where the light falls at four o'clock, where the wind comes from, which tree the neighbours love."),
              k.link("Read the post", "/blog/why-we-walk-first"),
            ],
          ], { widths: "equal", valign: "middle", gap: "xl" }),
        ], {}),
        k.linkedSection("contact-strip"),
      ],
    },
  };
}

function about(): Page {
  const k = kit("about");
  return {
    path: "/about",
    title: "Studio",
    description: "Harbour Studio is four architects and makers in a former rope works in Rotterdam. Who we are, how we work and what we've been recognised for.",
    puck: {
      root: { props: {} },
      content: [
        k.section("background", [
          k.columns([
            [
              k.h1("A small studio for houses and the rooms inside them", { eyebrow: "The studio" }),
              k.text("Four architects and makers in a former rope works by the river. We've worked together since 2012, and we still answer our own phone."),
              k.link("See the projects", "/work"),
            ],
            [k.image("home-office.jpg")],
          ], { widths: "equal", valign: "middle", gap: "xl" }),
        ], { paddingY: "xl" }),
        k.section("surface", [
          k.heading("Why we stay small", { mark: false }),
          k.text([
            "Most studios grow until the founders stop drawing. We decided early that we wouldn't. Eight projects a year is what four people can do properly, with time to visit every site each week and to pick up the phone when a builder has a question.",
            "It also means we choose our clients as carefully as they choose us. If we're not the right studio for your project, we'll say so in the first call, and we'll usually know someone who is.",
          ]),
        ], { width: "narrow", paddingY: "xl" }),
        k.section("background", [
          k.heading("The people", { mark: false }),
          k.spacer("xs"),
          k.columns(
            [
              ["Mara Lindqvist", "Founding architect. Leads every project's first sketches and still draws by hand."],
              ["Joost de Vries", "Architect. Runs the building sites and keeps budgets honest."],
              ["Ana Ferreira", "Interiors and joinery. Designs the rooms, the cupboards and the light."],
              ["Sam Okoye", "Landscape. Plants gardens that take ten years to be at their best."],
            ].map(([name, line]) => [k.heading(name!, { level: "h3" }), k.text(line!)]),
            { dividers: true, gap: "lg" },
          ),
        ], {}),
        k.section("dark", [
          k.heading("We'd rather do eight projects well than twenty in a hurry.", { display: true, mark: false }),
        ], { photo: "angles.jpg", tint: "strong", height: "medium", valign: "bottom" }),
        k.section("background", [
          k.columns([
            [k.heading("Recognition", { mark: false }), k.text("Awards matter less to us than a client who calls back five years later. These ones we're glad of.")],
            [
              k.table("Awards and shortlists", [
                ["Year", "Award", "Project"],
                ["2026", "Houses of the Year, winner", "Valley House"],
                ["2025", "Interior Design Awards, residential", "Spiral House"],
                ["2024", "Public Building Prize, shortlist", "The Long Room"],
                ["2022", "Timber in Architecture, winner", "Orchard Studio"],
                ["2019", "Young Practice Award", "Harbour Studio"],
              ]),
            ],
          ], { widths: "one-two", gap: "xl" }),
        ], { paddingY: "xl" }),
        k.linkedSection("contact-strip"),
      ],
    },
  };
}

function services(): Page {
  const k = kit("services");
  return {
    path: "/services",
    title: "Services",
    description: "Architecture, interiors and landscape by Harbour Studio: what each includes, how we charge and the questions clients ask first.",
    puck: {
      root: { props: {} },
      content: [
        k.section("surface", [
          k.h1("Three ways in, one team all the way", { eyebrow: "Services" }),
          k.text("Most projects start with a site study and grow from there. Some only need a room. Either way, you work with the same four people from the first call."),
        ], { width: "narrow", paddingY: "xl" }),
        k.section("background", [
          k.tabs([
            ["Architecture", "New houses, extensions and studios. We take care of the drawings, the planning application, finding the right builder and the weekly site visits.\n\nTypical projects take twelve to twenty months from the first sketch to moving in."],
            ["Interiors", "Kitchens, libraries, bathrooms and whole floors. We design the joinery, choose materials and light with you, and work with makers we've known for years.\n\nMost interiors take three to six months."],
            ["Landscape", "Gardens, courtyards and roof terraces, planted for the soil and the light you have. We draw the plan, choose every plant and come back in the first spring to see what took.\n\nPlanting happens in spring or autumn."],
          ], "underline", "h2"),
        ], {}),
        k.section("surface", [
          k.heading("How we charge", { align: "center", mark: false }),
          k.text("Fixed prices where we can, and a clear percentage where we can't. No hourly surprises.", { align: "center" }),
          k.spacer("sm"),
          k.pricing([
            { name: "Site study", price: "€2,400", period: "fixed", description: "Two days on site and a written study of what's possible, what it costs and what needs permission.", features: ["Site visit and measured survey", "Planning check", "Three sketch options", "A cost range from a builder"], button: ["Book a site study", "/contact"] },
            { name: "Full project", price: "9%", period: "of the build cost", description: "Architecture from the first sketch to the keys, for new houses and large renovations.", features: ["Everything in the site study", "Drawings and planning application", "Builder tender and contract", "Weekly site visits", "A return visit after one year"], button: ["Start a project", "/contact"] },
            { name: "Interiors", price: "from €6,500", period: "per room", description: "Rooms, joinery, lighting and furniture, for homes that already work from the outside.", features: ["Measured drawings", "Joinery and lighting design", "Materials and samples", "Makers found and managed"], button: ["Ask about a room", "/contact"] },
          ], { highlight: "2", badge: "Most chosen", planStyle: "background" }),
        ], { paddingY: "xl" }),
        k.section("background", [
          k.columns([
            [k.heading("Questions clients ask", { mark: false }), k.text(`Something else? Write to ${EMAIL} and we'll answer within two working days.`)],
            [
              k.accordion([
                ["How long does a house take?", "Twelve to twenty months from the first sketch to moving in. Planning permission is usually the slowest part, and we start on it early."],
                ["Do you work outside the city?", "Yes, anywhere we can reach in about two hours, so we can still visit the site every week."],
                ["Can you work with a builder we already know?", "Gladly. We'll meet them early, and we'll still check every price they give against our own estimate."],
                ["What if the budget changes halfway?", "It happens on most projects. We show you what each change costs before anything is decided, and keep a running total you can see at any time."],
                ["Do you take on small jobs?", "One room or one garden is fine. We keep a few places each year for projects under €50,000."],
              ]),
            ],
          ], { widths: "one-two", gap: "xl" }),
        ], { paddingY: "xl" }),
        k.linkedSection("contact-strip"),
      ],
    },
  };
}

function work(): Page {
  const k = kit("work");
  const pair = (a: { title: string; photo: string; line: string }) => [k.image(a.photo), k.heading(a.title, { level: "h3" }), k.text(a.line)];
  return {
    path: "/work",
    title: "Projects",
    description: "Houses, interiors, gardens and public rooms by Harbour Studio, 2019 to 2026.",
    puck: {
      root: { props: {} },
      content: [
        k.section("background", [
          k.h1("Selected projects, 2019 to 2026", { eyebrow: "Projects" }),
          k.text("Houses, interiors, gardens and a few public rooms. Every one was visited weekly by the people who drew it."),
        ], { paddingY: "xl" }),
        k.section("background", [
          k.overlay(PROJECTS.valley.photo, PROJECTS.valley.title, PROJECTS.valley.line, { height: "large", level: "h2" }),
        ], { paddingY: "sm" }),
        k.section("background", [k.columns([pair(PROJECTS.longRoom), pair(PROJECTS.spiral)], { gap: "xl" })], {}),
        k.section("surface", [k.heading("Every project starts with a walk around the site.", { display: true, align: "center", mark: false })], { width: "narrow", paddingY: "xl" }),
        k.section("background", [
          k.columns([
            pair({ title: "Quay Apartments", photo: "balconies.jpg", line: "Thirty-two flats with deep, curved balconies that shade the rooms behind them. 2024." }),
            pair({ title: "Rope Works Stair", photo: "white-stair.jpg", line: "A new stair for our own building, folded from one sheet of steel. 2020." }),
          ], { gap: "xl" }),
        ], {}),
        k.section("background", [
          k.heading("More from the studio", { mark: false }),
          k.gallery([
            { file: PROJECTS.orchard.photo, caption: "Orchard Studio, 2022" },
            { file: PROJECTS.grid.photo, caption: "Quay Offices, 2021" },
            { file: "terraces.jpg", caption: "Harbour Steps, 2019" },
          ], { columns: "3", shape: "wide", lightbox: true }),
        ], {}),
        k.linkedSection("contact-strip"),
      ],
    },
  };
}

function contact(): Page {
  const k = kit("contact");
  return {
    path: "/contact",
    title: "Contact",
    description: "Write to Harbour Studio about your house, room or garden. We answer within two working days.",
    puck: {
      root: { props: {} },
      content: [
        k.section("background", [
          k.columns([
            [
              k.h1("Tell us about the place", { eyebrow: "Contact" }),
              k.text("A few lines are enough: where it is, what you'd like to change and roughly when. We answer every message within two working days."),
              k.spacer("xs"),
              k.iconList([[ADDRESS, "map-pin"], [PHONE, "phone"], [EMAIL, "mail"], ["Monday to Friday, 9:00 to 17:30", "clock"]]),
            ],
            [k.form("Tell us about your project", "Send message", "Thank you. Your message is on its way, and we'll reply by email within two working days.")],
          ], { widths: "equal", gap: "xl" }),
        ], { paddingY: "xl" }),
        k.section("surface", [k.image("terraces.jpg", "Visitors are welcome by appointment. The studio is on the first floor, above the old rope walk.")], {}),
      ],
    },
  };
}

function contactStrip() {
  const k = kit("strip");
  return {
    id: "contact-strip",
    name: "Contact strip",
    content: [
      k.section("dark", [
        k.columns([
          [k.heading("Have a site, a house or a room in mind?", { eyebrow: "Start a project" })],
          [k.text("Write a few lines about it. We answer every message within two working days.", { tone: "default" }), k.button("Start a project", "/contact")],
        ], { widths: "two-one", valign: "bottom", gap: "xl" }),
      ], { paddingY: "xl" }),
    ] as Block[],
  };
}

function posts(): Post[] {
  const a = kit("post-walk");
  const b = kit("post-valley");
  return [
    {
      slug: "why-we-walk-first",
      title: "Why every project starts with a walk",
      description: "Before we draw a line, we spend a day on the site. What we look for, and why it saves our clients money.",
      date: "2026-10-14",
      cover: img("shadows.jpg"),
      coverAlt: altOf("shadows.jpg"),
      puck: {
        root: { props: {} },
        content: [
          a.section("background", [
            a.text([
              "Every project we take on starts the same way: a whole day on the site, with the client if they can spare it, and without a sketchbook for the first hour.",
              "It sounds slow. It's the fastest thing we do. Almost every expensive change we've seen on a building site goes back to something nobody noticed at the start.",
            ], { tone: "default" }),
            a.heading("What we look for", { mark: false }),
            a.text([
              "Where the light falls at nine in the morning and at four in the afternoon. Which way the rain comes from. Where the neighbours' windows look. Which tree everyone on the street would miss.",
              "We also listen: to traffic, to a school playground two streets away, to the quiet corner of the garden where the client always ends up standing.",
            ], { tone: "default" }),
            a.image("angles.jpg", "The Long Room: the folded roof follows the line of the old playground wall we found on our first walk."),
            a.quote("We moved the whole house four metres east after that first day. It cost nothing on paper and gave us the morning sun.", "Ingrid Solberg", "Owner, Valley House", { size: "normal" }),
            a.text("If you're thinking about a project, the walk is where we'd start. It's part of every site study, and you keep the notes whether you work with us or not.", { tone: "default" }),
          ], { width: "narrow", paddingY: "md" }),
        ],
      },
    },
    {
      slug: "valley-house-one-year-on",
      title: "Valley House, one year on",
      description: "We went back to Valley House a year after the family moved in. What worked, what didn't, and the one thing we'd change.",
      date: "2026-09-02",
      cover: img("pool-house.jpg"),
      coverAlt: altOf("pool-house.jpg"),
      puck: {
        root: { props: {} },
        content: [
          b.section("background", [
            b.text([
              "A year after handing over the keys, we go back to every house we've designed. We bring coffee, a notebook and a carpenter, and we ask the same question: what would you change?",
              "At Valley House the answer was short. The terrace is used every evening, even in October. The children have claimed the window seat on the stairs. The pool is colder than promised.",
            ], { tone: "default" }),
            b.heading("The one thing we'd change", { mark: false }),
            b.text("The kitchen drawers. We made them deep and wide, and they're too heavy when full. Our carpenter split them in two that afternoon, and we've changed the way we draw drawers since.", { tone: "default" }),
          ], { width: "narrow", paddingY: "md" }),
        ],
      },
    },
  ];
}

function chrome(): SiteChrome {
  return {
    header: {
      show: true,
      logo: { text: "Harbour Studio", imageSrc: "", imageAlt: "" },
      menu: [
        { label: "Studio", href: "/about" },
        { label: "Services", href: "/services" },
        { label: "Projects", href: "/work" },
        { label: "Journal", href: "/blog" },
        { label: "Contact", href: "/contact" },
      ],
      cta: { label: "", href: "" },
      sticky: false,
      style: "background",
      layout: "classic",
      overHero: true,
    },
    footer: {
      show: true,
      text: `Architecture, interiors and landscape from a former rope works in Rotterdam. ${ADDRESS}.`,
      columns: [
        { title: "Studio", links: [{ label: "About the studio", href: "/about" }, { label: "Services", href: "/services" }, { label: "Projects", href: "/work" }] },
        { title: "Get in touch", links: [{ label: "Contact", href: "/contact" }, { label: "Journal", href: "/blog" }, { label: EMAIL, href: `mailto:${EMAIL}` }] },
      ],
      copyright: "© {year} {name}",
      style: "surface",
    },
  };
}

function designs(): TemplateDesign[] {
  const k = kit("design");
  return [
    {
      kind: "post",
      content: [
        k.section("background", [
          k.raw("PostDetails", { show: "both", align: "left" }),
          k.raw("PostTitle", { size: "display", align: "left" }),
          k.raw("PostSummary", { align: "left" }),
        ], { width: "narrow", paddingY: "lg" }),
        k.section("background", [k.raw("PostCover", { ratio: "wide" })], { paddingY: "xs" }),
        k.raw("PostContent", {}),
        k.linkedSection("contact-strip"),
      ],
    },
    {
      kind: "blog",
      content: [
        k.section("background", [
          k.raw("BlogTitle", { size: "display", align: "left" }),
          k.raw("BlogIntro", { align: "left" }),
          k.raw("PostList", { look: "list", columns: "auto", count: "all", photo: "yes", date: "yes", summary: "yes", titleLevel: "h2" }),
        ], { width: "narrow", paddingY: "xl" }),
      ],
    },
    {
      kind: "notFound",
      title: "Page not found",
      content: [
        k.section("background", [
          k.heading("This page has moved, or was never built", { level: "h1", display: true, eyebrow: "Page not found", mark: false }),
          k.raw("Text", { text: richParagraphs("The address may be mistyped, or the page has moved. The projects and the studio are a click away."), align: "left", tone: "muted" }),
          k.spacer("sm"),
          k.columns([[k.button("Go to the home page", "/")], [k.button("See the projects", "/work", "arrow")]], { gap: "sm", widths: "one-three", valign: "middle" }),
        ], { width: "narrow", paddingY: "xl", height: "medium" }),
      ],
    },
  ];
}

export const harbourParts: StarterParts = {
  pages: () => [home(), about(), services(), work(), contact()],
  sections: () => [contactStrip()],
  posts,
  blog: { title: "Journal", intro: "Notes from the studio: sites we've walked, houses we've gone back to, and what we've learned." },
  chrome,
  designs,
};

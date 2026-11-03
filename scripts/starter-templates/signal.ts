/**
 * Signal (F084): a brand and launch agency. Look: Studio · Signal from the
 * Style library (dark, mono labels, one hot accent), motion Lively. A stage
 * photo under the header, client logos on a light band, named work tiles,
 * figures, services as tabs, the process and a client's words. Snapshot:
 * design/f084-starter-rebuild-v1.html.
 *
 * In this look the "dark" section style is the light one (it uses the text
 * colour as its background), so light bands are `dark` sections.
 */
import { richParagraphs, type Page, type Post, type SiteChrome, type TemplateDesign } from "@crust/blocks";
import { altOf, img, kit, type Block } from "./kit";
import type { StarterParts } from "./parts";
import { signalLogos } from "./photo-sets";

const EMAIL = "hello@signal.example";
const PHONE = "+44 20 5550 0193";
const ADDRESS = "Unit 4, 22 Arches Yard, London E8";

const WORK = [
  { title: "Northfield Festival", line: "Identity, stage and signage for 40,000 people, 2026", photo: "red-stage.jpg" },
  { title: "Atlas Architects", line: "Rebrand and website, 2025", photo: "copper-stair.jpg" },
  { title: "Kestrel Records", line: "Album launch tour in six cities, 2026", photo: "guitarist.jpg" },
  { title: "Orbit Workspace", line: "Launch campaign for three buildings, 2025", photo: "studio-lounge.jpg" },
];

function home(): Page {
  const k = kit("home");
  return {
    path: "/",
    title: "Home",
    description: "Signal & Co is a brand and launch studio: identity, campaigns and live events for teams that want to be noticed.",
    puck: {
      root: { props: {} },
      content: [
        k.section("background", [
          k.h1("We make brands people talk about", { eyebrow: "Brand & launch studio" }),
          k.text("Identity, campaigns and launch events for teams that want to be noticed, and remembered the morning after.", { tone: "default" }),
          k.spacer("xs"),
          k.columns([[k.button("See the work", "/work")], [k.button("How we work", "/services", "secondary")]], { gap: "sm", widths: "one-three", valign: "middle" }),
        ], { photo: "stage-crowd.jpg", height: "full", valign: "bottom", tint: "strong", focus: { x: 50, y: 35 } }),
        k.section("dark", [
          k.heading("Trusted by teams at", { level: "h2", align: "center", mark: false }),
          k.logos(signalLogos, { moving: true }),
        ], { paddingY: "md" }),
        k.section("background", [
          k.heading("Small senior team. A strategist, a designer and a producer on every project, from the first day to the launch.", { eyebrow: "The studio" }),
          k.link("Meet the studio", "/about"),
        ], { width: "narrow", paddingY: "xl" }),
        k.section("background", [
          k.columns([[k.heading("Selected work", { mark: false })], [k.link("All work", "/work", "right")]], { widths: "two-one", valign: "bottom", gap: "sm" }),
          k.columns(
            [
              [k.overlay(WORK[0]!.photo, WORK[0]!.title, WORK[0]!.line, { link: ["See the project", "/work"], style: "background" }), k.overlay(WORK[2]!.photo, WORK[2]!.title, WORK[2]!.line, { link: ["See the project", "/work"], style: "background" })],
              [k.overlay(WORK[1]!.photo, WORK[1]!.title, WORK[1]!.line, { link: ["See the project", "/work"], style: "background" }), k.overlay(WORK[3]!.photo, WORK[3]!.title, WORK[3]!.line, { link: ["See the project", "/work"], style: "background" })],
            ],
            { gap: "md", rowGap: "md" },
          ),
        ], {}),
        k.section("background", [
          k.stats([["140+", "launches since 2015"], ["9 days", "from brief to first ideas"], ["24", "design and campaign awards"], ["3", "senior people on every project"]], { look: "boxes", size: "lg", colour: "primary" }),
        ], { paddingY: "md" }),
        k.section("surface", [
          k.heading("What we do", { eyebrow: "Services", mark: false }),
          k.tabs([
            ["Strategy", "Two weeks of interviews, research and workshops end in one page: who you're for, what you say, and what you never say.\n\nEverything we make afterwards is checked against that page."],
            ["Identity", "Names, logos, type, colour and the rules that hold them together, built to work on a stage, a phone screen and the side of a lorry."],
            ["Campaigns", "Launch films, posters, social and press, planned as one story told over six weeks rather than one loud day."],
            ["Live events", "Launch nights, festivals and tours: stage design, signage and the hundred small decisions that make a crowd remember it."],
          ], "pills"),
        ], { paddingY: "xl" }),
        k.section("background", [
          k.columns([
            [k.heading("From brief to launch in six weeks", { eyebrow: "How we work", mark: false }), k.text("The same three people run your project from the first call to the launch. You'll never be handed to a junior team after the pitch."), k.button("See prices", "/services", "arrow")],
            [k.steps([
              "Brief and research. A day with your team, then a week of listening to your customers.",
              "First ideas on day nine. Three directions, each one shown as it would look on launch day.",
              "Design and build. One direction, made real across every place it needs to appear.",
              "Launch, then measure. We're there on the night, and we report back a month later.",
            ], "circle")],
          ], { widths: "equal", gap: "xl", sticky: 1 }),
        ], { paddingY: "xl" }),
        k.section("surface", [
          k.quote("Ticket sales were up forty per cent before we'd announced a single act. People were buying into the festival, not the line-up.", "Maya Okafor", "Director, Northfield Festival", { align: "center" }),
        ], { width: "narrow", paddingY: "xl" }),
        k.linkedSection("contact-strip"),
      ],
    },
  };
}

function work(): Page {
  const k = kit("work");
  return {
    path: "/work",
    title: "Work",
    description: "Launches, identities and live events by Signal & Co for festivals, labels, architects and workspaces.",
    puck: {
      root: { props: {} },
      content: [
        k.section("background", [
          k.h1("Launches, identities and nights people still talk about", { eyebrow: "Work" }),
          k.text("A few of the projects we've made since 2015. Each one started with a brief, a deadline and a team that wanted to be noticed."),
        ], { paddingY: "xl" }),
        k.section("background", [
          k.heading("Northfield Festival", { eyebrow: "Identity, stage and signage, 2026" }),
          k.slideshow("Northfield Festival", [
            { photo: "red-stage.jpg", title: "Main stage, opening night", text: "A stage built around one colour, so every photo from the weekend looks like Northfield." },
            { photo: "guitarist.jpg", title: "The late tent", text: "Smoke, warm light and signage you can read from the back of a crowd." },
            { photo: "stage-crowd.jpg", title: "40,000 people", text: "Sold out three weeks before the line-up was announced." },
          ], { ratio: "16:9", level: "h3" }),
        ], {}),
        k.section("background", [
          k.columns([
            [k.image("concrete-tower.jpg"), k.heading("Atlas Architects", { level: "h3" }), k.text("A rebrand built from their own buildings: every letter of the logo is cut from a section drawing. 2025.")],
            [k.image("atrium.jpg"), k.heading("Orbit Workspace", { level: "h3" }), k.text("Three buildings, one launch: a campaign that made a co-working space feel like a members' club. 2025.")],
          ], { gap: "xl" }),
        ], {}),
        k.section("dark", [k.heading("We say no to most briefs, so we can say yes properly.", { display: true, align: "center", mark: false })], { width: "narrow", paddingY: "xl" }),
        k.section("background", [
          k.heading("More projects", { mark: false }),
          k.grid([
            { title: "Lumen & Co", text: "Lighting brand, launch film and showroom, 2024.", photo: "stair-lights.jpg" },
            { title: "Field Notes app", text: "Name, identity and launch for a note-taking app, 2024.", photo: "dark-desk.jpg" },
            { title: "Spiral Hotel", text: "Opening campaign for a hotel in a former bell foundry, 2023.", photo: "spiral-amber.jpg" },
          ], { columns: "3", background: "surface" }),
        ], {}),
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
    description: "Strategy, identity, campaigns and live events by Signal & Co, with fixed prices for each way of working together.",
    puck: {
      root: { props: {} },
      content: [
        k.section("background", [
          k.h1("Strategy, identity, campaigns and live events", { eyebrow: "Services" }),
          k.text("Four things we're good at, usually done together. Most clients start with a two-week sprint and decide from there."),
        ], { paddingY: "xl" }),
        k.section("background", [
          k.heading("Four things we're good at", { mark: false }),
          k.spacer("xs"),
          k.columns(
            [
              ["target", "Strategy", "Interviews, research and one page that says who you're for."],
              ["palette", "Identity", "Name, logo, type, colour and the rules that hold them together."],
              ["rocket", "Campaigns", "A launch told over six weeks, across every channel you use."],
              ["music", "Live events", "Stages, signage and launch nights people remember."],
            ].map(([ic, title, body]) => [k.icon(ic!, "square"), k.heading(title!, { level: "h3" }), k.text(body!)]),
            { gap: "lg", box: { style: "surface", padding: "md", rounded: true } },
          ),
        ], {}),
        k.section("surface", [
          k.heading("Ways to work with us", { align: "center", mark: false }),
          k.text("Fixed prices, agreed before we start. Travel and printing are charged at cost.", { align: "center" }),
          k.spacer("sm"),
          k.pricing([
            { name: "Sprint", price: "€12,000", period: "two weeks", description: "For a team that needs a clear direction before it spends anything else.", features: ["Strategy workshop", "Customer interviews", "One-page brand strategy", "Three creative directions"], button: ["Book a sprint", "/contact"] },
            { name: "Launch", price: "€38,000", period: "six weeks", description: "Everything from the sprint, made real and launched.", features: ["Everything in the sprint", "Full identity system", "Launch campaign", "Website design", "Launch night support"], button: ["Plan a launch", "/contact"] },
            { name: "Partner", price: "€9,000", period: "per month", description: "For brands that launch often and want the same team each time.", features: ["Two senior people, two days a week", "Campaigns and updates", "Quarterly strategy review"], button: ["Talk to us", "/contact"] },
          ], { highlight: "2", badge: "Most booked", planStyle: "background" }),
        ], { paddingY: "xl" }),
        k.section("background", [
          k.table("What each one includes", [
            ["", "Sprint", "Launch", "Partner"],
            ["Strategy", "Yes", "Yes", "Every quarter"],
            ["Identity", "Three directions", "Full system", "Updates"],
            ["Campaign", "No", "Launch campaign", "Monthly"],
            ["Live events", "No", "Launch night", "On request"],
            ["Senior people", "3", "3, plus makers", "2"],
          ], { headers: "both", look: "stripes" }),
        ], {}),
        k.section("background", [
          k.columns([
            [k.heading("Questions we get asked", { mark: false })],
            [k.accordion([
              ["How soon can you start?", "Usually within three weeks. We take on four projects at a time, so we'll tell you on the first call when a place opens up."],
              ["Do you pitch for free?", "No. We'd rather spend that time on a paid sprint, which gives you real work you keep either way."],
              ["Can you work with our in-house team?", "Yes, and we prefer it. Your team knows things we'd need months to learn."],
              ["Who owns the work?", "You do, in full, once the last invoice is paid. Fonts and photos are licensed in your name."],
            ])],
          ], { widths: "one-two", gap: "xl" }),
        ], { paddingY: "xl" }),
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
    description: "Signal & Co is twelve people on one floor in East London: who we are, what we believe and how to join us.",
    puck: {
      root: { props: {} },
      content: [
        k.section("background", [
          k.columns([
            [
              k.h1("Twelve people, one floor, no account managers", { eyebrow: "The studio" }),
              k.text("Signal started in 2015 in a railway arch with two desks and one client. We're bigger now, but you'll still talk to the people doing the work."),
            ],
            [k.image("studio-lounge.jpg")],
          ], { widths: "equal", valign: "middle", gap: "xl" }),
        ], { paddingY: "xl" }),
        k.section("background", [
          k.stats([["2015", "founded in a railway arch"], ["12", "people, all senior"], ["31", "countries we've launched in"], ["0", "account managers"]], { look: "plain", size: "lg", colour: "primary" }),
        ], { paddingY: "md" }),
        k.section("surface", [
          k.heading("What we believe", { mark: false }),
          k.spacer("xs"),
          k.columns(
            [
              ["eye", "Say less, mean it", "One clear idea beats five clever ones. We cut until it hurts, then cut once more."],
              ["zap", "Ideas on day nine", "Long research phases hide indecision. We show real work early and improve it in the open."],
              ["handshake", "Same people, start to finish", "The team that pitches is the team that delivers. Nobody is handed over."],
            ].map(([ic, title, body]) => [k.icon(ic!, "plain", { size: "lg" }), k.heading(title!, { level: "h3" }), k.text(body!)]),
            { gap: "xl", dividers: true },
          ),
        ], { paddingY: "xl" }),
        k.section("background", [
          k.heading("The partners", { mark: false }),
          k.grid([
            { title: "Dev Malhotra", text: "Strategy partner. Ran research at a news agency before Signal." },
            { title: "Lena Brandt", text: "Design partner. Type nerd, poster collector, former festival designer." },
            { title: "Kofi Mensah", text: "Production partner. Has built stages on four continents." },
            { title: "Rosa Iglesias", text: "Campaign partner. Writes every line before anyone opens a laptop." },
          ], { columns: "4", background: "surface" }),
        ], {}),
        k.section("background", [
          k.columns([
            [k.heading("Join us", { mark: false })],
            [k.text(["We hire one or two people a year, always senior, always people who've made things they're proud of.", `Send three projects and a few lines about why to ${EMAIL}.`]), k.button("Send your work", `mailto:${EMAIL}`, "arrow")],
          ], { widths: "one-two", gap: "xl" }),
        ], { paddingY: "xl" }),
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
    description: "Start a project with Signal & Co. Tell us what you're launching and when; we reply within one working day.",
    puck: {
      root: { props: {} },
      content: [
        k.section("background", [
          k.columns([
            [
              k.h1("Start a project", { eyebrow: "Contact" }),
              k.text("Tell us what you're launching and when. We reply within one working day, usually with a time for a call."),
              k.spacer("xs"),
              k.iconList([[EMAIL, "mail"], [PHONE, "phone"], [ADDRESS, "map-pin"]]),
            ],
            [k.form("What are you launching, and when?", "Send brief", "Thank you. Your brief is on its way, and we'll reply within one working day.")],
          ], { widths: "equal", gap: "xl" }),
        ], { paddingY: "xl" }),
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
      k.section("background", [
        k.heading("Got a launch date? Let's talk this week.", { display: true, eyebrow: "Start a project" }),
        k.spacer("xs"),
        k.button("Start a project", "/contact"),
      ], { photo: "stair-lights.jpg", tint: "strong", paddingY: "xl" }),
    ] as Block[],
  };
}

function footer() {
  const k = kit("footer");
  return {
    id: "site-footer",
    name: "Site footer",
    content: [
      k.section("surface", [
        k.columns([
          [k.heading("Let's make something people talk about.", { mark: false }), k.link(EMAIL, `mailto:${EMAIL}`)],
          [k.raw("Text", { text: { rich: 1, blocks: [{ type: "p", children: [{ text: "Work", href: "/work" }] }, { type: "p", children: [{ text: "Services", href: "/services" }] }, { type: "p", children: [{ text: "Studio", href: "/about" }] }, { type: "p", children: [{ text: "Notes", href: "/blog" }] }] }, align: "left", tone: "default" })],
          [k.text([ADDRESS, PHONE])],
        ], { widths: "wide-first", gap: "xl" }),
      ], { paddingY: "lg" }),
    ] as Block[],
  };
}

function posts(): Post[] {
  const a = kit("post-nine");
  const b = kit("post-northfield");
  return [
    {
      slug: "first-ideas-on-day-nine",
      title: "Why first ideas take nine days",
      description: "Not two, not thirty. Why we show clients real work on day nine of every project, and what happens on the eight days before.",
      date: "2026-10-21",
      cover: img("dark-desk.jpg"),
      coverAlt: altOf("dark-desk.jpg"),
      puck: {
        root: { props: {} },
        content: [
          a.section("background", [
            a.text([
              "Every project at Signal has the same date in its plan: day nine. That's when the client sees three directions, each one drawn as it would look on launch day.",
              "Two days is too soon: we haven't listened enough. Thirty days is too late: by then everyone has fallen in love with an idea nobody has tested.",
            ], { tone: "default" }),
            a.heading("The eight days before", { mark: false }),
            a.steps(["Days one and two: a workshop with your team and a walk through everything you've made before.", "Days three to six: interviews with customers, people who left and people who never came.", "Days seven and eight: the studio goes quiet, and three teams of two each make one direction."], "plain"),
            a.quote("Day nine was the first time an agency showed us something we could imagine on the street the next morning.", "Theo Grant", "Head of brand, Orbit Workspace", { size: "normal" }),
          ], { width: "narrow", paddingY: "md" }),
        ],
      },
    },
    {
      slug: "northfield-sold-out",
      title: "How Northfield sold out before the line-up",
      description: "Forty thousand tickets, three weeks early, with no names on the poster. What we made, and why it worked.",
      date: "2026-08-12",
      cover: img("red-stage.jpg"),
      coverAlt: altOf("red-stage.jpg"),
      puck: {
        root: { props: {} },
        content: [
          b.section("background", [
            b.text([
              "Festivals sell on their line-up. That was the problem: Northfield's wouldn't be ready until June, and the money was needed in March.",
              "So we sold the place instead. One colour, one shape and a promise: the warmest weekend of the summer, whoever is playing.",
            ], { tone: "default" }),
            b.image("guitarist.jpg", "The late tent, lit in the festival's own amber."),
            b.text("By the time the first act was announced, there were no tickets left to sell.", { tone: "default" }),
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
      logo: { text: "Signal & Co", imageSrc: "", imageAlt: "" },
      menu: [
        { label: "Work", href: "/work" },
        { label: "Services", href: "/services" },
        { label: "Studio", href: "/about" },
        { label: "Notes", href: "/blog" },
        { label: "Contact", href: "/contact" },
      ],
      cta: { label: "Start a project", href: "/contact" },
      sticky: true,
      style: "background",
      layout: "centred",
      overHero: true,
      topBar: { show: true, text: "Now booking launches for spring 2027.", link: { label: "Start a project", href: "/contact" }, contact: EMAIL, style: "primary" },
    },
    footer: {
      show: true,
      text: "A brand and launch studio in East London.",
      columns: [],
      copyright: "© {year} {name}",
      style: "surface",
      kind: "blocks",
      section: "site-footer",
    },
  };
}

function designs(): TemplateDesign[] {
  const k = kit("design");
  return [
    {
      kind: "post",
      content: [k.raw("PostHero", { height: "large", tint: "strong", align: "left", summary: "yes" }), k.raw("PostContent", {}), k.linkedSection("contact-strip")],
    },
    {
      kind: "blog",
      content: [
        k.section("background", [
          k.raw("BlogTitle", { size: "display", align: "left" }),
          k.raw("BlogIntro", { align: "left" }),
          k.raw("PostList", { look: "featured", columns: "3", count: "all", photo: "yes", date: "yes", summary: "yes", titleLevel: "h2" }),
        ], { paddingY: "xl" }),
      ],
    },
    {
      kind: "notFound",
      title: "Page not found",
      content: [
        k.section("background", [
          k.heading("Nothing to launch here", { level: "h1", display: true, eyebrow: "Error 404", mark: false }),
          k.raw("Text", { text: richParagraphs("This page has moved, or never existed. The work is still where you left it."), align: "left", tone: "muted" }),
          k.spacer("sm"),
          k.columns([[k.button("Go to the home page", "/")], [k.button("See the work", "/work", "arrow")]], { gap: "sm", widths: "one-three", valign: "middle" }),
        ], { paddingY: "xl", height: "medium" }),
      ],
    },
  ];
}

export const signalParts: StarterParts = {
  pages: () => [home(), work(), services(), about(), contact()],
  sections: () => [contactStrip(), footer()],
  posts,
  blog: { title: "Notes", intro: "What we're learning from launches, festivals and first ideas." },
  chrome,
  designs,
};

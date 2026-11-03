/**
 * Corner (F084): a bakery, coffee bar and Saturday workshop. Look: Bistro ·
 * Cream from the Style library, motion Subtle, logo on top like a shop
 * sign, a top bar with the opening time. Its pages fit a shop: Menu (price
 * tables), Workshops (a price list), Our story and Visit us (opening hours).
 * Snapshot: design/f084-starter-rebuild-v1.html.
 */
import { richParagraphs, type Page, type Post, type SiteChrome, type TemplateDesign } from "@crust/blocks";
import { altOf, img, kit, type Block } from "./kit";
import type { StarterParts } from "./parts";

const EMAIL = "hello@corner.example";
const PHONE = "+353 1 555 0187";
const ADDRESS = "14 Mill Lane, Dublin 8";
const HOURS = [
  ["Day", "Open"],
  ["Tuesday to Friday", "7:00 to 17:00"],
  ["Saturday", "8:00 to 16:00"],
  ["Sunday", "8:00 to 13:00"],
  ["Monday", "Closed"],
];

const WORKSHOPS = [
  { title: "Pottery morning", text: "Three hours at the wheel. You take home two pieces once they're fired. €65", photo: "pottery-wheel.jpg" },
  { title: "Glaze and fire", text: "Glaze the pieces you've made, then watch the kiln being loaded. €80", photo: "ceramic-bottles.jpg" },
  { title: "Woodwork weekend", text: "Two days with hand tools only. You leave with a stool you made yourself. €180", photo: "tool-wall.jpg" },
  { title: "Sourdough class", text: "Mix, shape and bake. You take home a loaf and a jar of our starter. €55", photo: "bread-hands.jpg" },
];

function home(): Page {
  const k = kit("home");
  return {
    path: "/",
    title: "Home",
    description: "Corner Workshop on Mill Lane: sourdough baked before seven, coffee roasted three streets away, and Saturday workshops in the back room.",
    puck: {
      root: { props: {} },
      content: [
        k.section("surface", [
          k.columns([
            [
              k.h1("Made by hand, around the corner", { eyebrow: "Bakery · Coffee · Workshop" }),
              k.text("Sourdough out of the oven before seven, coffee roasted three streets away, and a back room where you can learn to make things yourself."),
              k.spacer("xs"),
              k.columns([[k.button("See today's menu", "/menu")], [k.button("Find us", "/visit", "arrow")]], { gap: "sm", widths: "equal", valign: "middle" }),
            ],
            [k.image("bread-hands.jpg")],
          ], { widths: "equal", valign: "middle", gap: "xl" }),
        ], { paddingY: "xl" }),
        k.section("background", [
          k.heading("Why the queue starts at seven", { mark: false }),
          k.spacer("xs"),
          k.columns(
            [
              ["wheat", "Baked before 7:00", "Every loaf is shaped the night before and baked in the morning, six days a week."],
              ["coffee", "Coffee from nearby", "Beans roasted on Dock Street, three streets away, and ground to order."],
              ["hammer", "Saturday workshops", "Clay, wood and bread in the back room, for eight people at a time."],
            ].map(([ic, title, body]) => [k.icon(ic!, "circle"), k.heading(title!, { level: "h3" }), k.text(body!)]),
            { gap: "xl" },
          ),
        ], { paddingY: "lg" }),
        k.section("background", [
          k.columns([[k.heading("On the counter this week", { mark: false })], [k.link("The full menu", "/menu", "right")]], { widths: "two-one", valign: "bottom", gap: "sm" }),
          k.grid([
            { title: "Country sourdough", text: "Forty-eight hours from flour to loaf. €6.50", photo: "loaves.jpg" },
            { title: "Breakfast for two", text: "A pot of coffee, two croissants and jam. €14", photo: "moka-breakfast.jpg" },
            { title: "Lemon and lavender loaf", text: "Iced while warm, sold by the slice. €3.80", photo: "lemon-loaf.jpg" },
          ], { columns: "3", background: "surface" }),
        ], {}),
        k.section("surface", [
          k.columns([
            [k.image("pouring-coffee.jpg")],
            [
              k.heading("Everything is made here, in small batches, by the people who serve you.", { eyebrow: "Our story" }),
              k.text("Corner opened in 2017 in a bakery that had been empty for ten years. The oven was still there. We cleaned it, fired it, and haven't let it go cold since."),
              k.link("Read our story", "/about"),
            ],
          ], { widths: "one-two", valign: "middle", gap: "xl" }),
        ], { paddingY: "xl" }),
        k.section("background", [
          k.columns([[k.heading("Saturday workshops", { mark: false })], [k.link("Dates and prices", "/workshops", "right")]], { widths: "two-one", valign: "bottom", gap: "sm" }),
          k.cardSlider("Saturday workshops", WORKSHOPS.map((w) => ({ ...w, link: ["Book a place", "/workshops"] as [string, string] })), { visible: "3", background: "surface" }),
        ], {}),
        k.section("primary", [
          k.quote("The best loaf in the neighbourhood, and the kindest people serving it. I came for bread and stayed for the pottery.", "Tomás Byrne", "A regular since 2019", { align: "center" }),
        ], { width: "narrow", paddingY: "xl" }),
        k.section("background", [
          k.columns([
            [
              k.heading("Find us on Mill Lane", { eyebrow: "Visit" }),
              k.text("Next to the flower stall, five minutes from the canal. There's a bench outside and a dog bowl by the door."),
              k.table("Opening hours", HOURS, { headers: "both" }),
              k.link("How to get here", "/visit"),
            ],
            [k.image("flower-shop.jpg")],
          ], { widths: "equal", valign: "middle", gap: "xl" }),
        ], { paddingY: "xl" }),
        k.linkedSection("contact-strip"),
      ],
    },
  };
}

function menu(): Page {
  const k = kit("menu");
  return {
    path: "/menu",
    title: "Menu",
    description: "Bread, pastry, coffee and breakfast at Corner Workshop, with this week's prices.",
    puck: {
      root: { props: {} },
      content: [
        k.section("surface", [
          k.h1("Baked this morning", { eyebrow: "Menu" }),
          k.text("What's on the counter changes with the season and sells out by early afternoon. Ask us about allergens: we know what's in everything, because we made it."),
        ], { width: "narrow", paddingY: "xl" }),
        k.section("background", [
          k.columns([
            [k.table("Bread", [["Loaf", "Price"], ["Country sourdough", "€6.50"], ["Seeded rye", "€5.80"], ["Spelt and honey", "€6.20"], ["Baguette", "€3.20"]])],
            [k.table("Pastry and cake", [["Pastry", "Price"], ["Butter croissant", "€2.80"], ["Cardamom bun", "€3.40"], ["Lemon and lavender loaf, a slice", "€3.80"], ["Brown butter cookie", "€2.50"]])],
          ], { gap: "xl" }),
          k.spacer("md"),
          k.columns([
            [k.table("Coffee", [["Drink", "Price"], ["Espresso", "€2.60"], ["Flat white", "€3.60"], ["Filter, refilled once", "€3.20"], ["Moka pot for two", "€6.00"]])],
            [k.table("Breakfast, until 11:30", [["Plate", "Price"], ["Toast, butter and jam", "€5.50"], ["Breakfast for two", "€14.00"], ["Eggs on sourdough", "€9.50"], ["Yoghurt, fruit and granola", "€7.00"]])],
          ], { gap: "xl" }),
        ], { paddingY: "xl" }),
        k.section("surface", [
          k.gallery([
            { file: "loaves.jpg", caption: "Country sourdough" },
            { file: "moka-breakfast.jpg", caption: "Breakfast for two" },
            { file: "lemon-loaf.jpg", caption: "Lemon and lavender loaf" },
            { file: "moka-pour.jpg", caption: "Moka pot for two" },
          ], { columns: "4", shape: "square", lightbox: true }),
        ], {}),
        k.linkedSection("contact-strip"),
      ],
    },
  };
}

function workshops(): Page {
  const k = kit("workshops");
  return {
    path: "/workshops",
    title: "Workshops",
    description: "Pottery, woodwork and bread workshops on Saturdays at Corner Workshop: what you'll make, what it costs and how to book.",
    puck: {
      root: { props: {} },
      content: [
        k.section("dark", [
          k.h1("Learn to make it yourself", { eyebrow: "Saturday workshops" }),
          k.text("Pottery, woodwork and bread in the back room, for eight people at a time. No experience needed, and coffee is included.", { tone: "default" }),
        ], { photo: "pottery-wheel.jpg", tint: "strong", height: "large", valign: "bottom" }),
        k.section("background", [
          k.heading("Choose a workshop", { align: "center", mark: false }),
          k.text("All materials, tools, coffee and a pastry are included. Book at the counter or by email.", { align: "center" }),
          k.spacer("sm"),
          k.pricing([
            { name: "Pottery morning", price: "€65", period: "3 hours", description: "Throw your first pots at the wheel.", features: ["Two pieces, fired and posted to you", "Aprons and tools", "Coffee and a pastry"], button: ["Book pottery", `mailto:${EMAIL}`] },
            { name: "Sourdough class", price: "€55", period: "3 hours", description: "Mix, shape and bake a loaf.", features: ["A loaf to take home", "A jar of our starter", "The recipe we use"], button: ["Book bread", `mailto:${EMAIL}`] },
            { name: "Glaze and fire", price: "€80", period: "4 hours", description: "Glaze pieces from a pottery morning.", features: ["Glazes and firing", "A look inside the kiln", "Lunch from the counter"], button: ["Book glazing", `mailto:${EMAIL}`] },
            { name: "Woodwork weekend", price: "€180", period: "2 days", description: "Make a stool with hand tools only.", features: ["Oak and all tools", "A stool to take home", "Lunch both days"], button: ["Book woodwork", `mailto:${EMAIL}`] },
          ], { highlight: "1", badge: "Most booked", planStyle: "surface" }),
        ], { paddingY: "xl", anchor: "prices" }),
        k.section("surface", [
          k.columns([
            [k.heading("How a Saturday goes", { mark: false }), k.text("Every workshop follows the same easy rhythm, so you can come on your own and feel at home.")],
            [k.steps([
              "9:30. Coffee and a pastry while everyone arrives.",
              "10:00. A short demonstration, then hands on.",
              "12:00. A break at the counter, with bread from the morning bake.",
              "13:00. Finish, tidy up and take your work home, or leave it for the kiln.",
            ], "circle")],
          ], { widths: "one-two", gap: "xl" }),
        ], { paddingY: "xl" }),
        k.section("background", [
          k.columns([
            [k.heading("Questions", { mark: false })],
            [k.accordion([
              ["Do I need any experience?", "None at all. Most people at the wheel have never touched clay before."],
              ["Can I book for a group?", "Yes. Eight people can book the whole back room on a Saturday afternoon. Write to us for a date."],
              ["What if I can't come?", "Tell us a week before and we'll move you to another Saturday or give you a refund."],
              ["Are children welcome?", "From twelve, with an adult who books a place too."],
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
    title: "Our story",
    description: "How a bakery that stood empty for ten years became Corner Workshop: the oven, the people and the back room.",
    puck: {
      root: { props: {} },
      content: [
        k.section("surface", [
          k.columns([
            [
              k.h1("A bakery, a coffee bar and a back room full of tools", { eyebrow: "Our story" }),
              k.text("Corner is eleven people, one old oven and a long table where strangers end up sharing a pot of coffee."),
            ],
            [k.image("carnations.jpg")],
          ], { widths: "equal", valign: "middle", gap: "xl" }),
        ], { paddingY: "xl" }),
        k.section("background", [
          k.heading("How it started", { mark: false }),
          k.text([
            "In 2017 the bakery on Mill Lane had been empty for ten years. The windows were papered over, but the oven, built in 1962, was still standing in the back.",
            "We cleaned it, fired it, and baked our first loaves for the neighbours who'd watched us working through the window. They came back the next day, and the day after. The back room, where the flour used to be stored, became a workshop a year later.",
          ]),
        ], { width: "narrow", paddingY: "xl" }),
        k.section("background", [
          k.stats([["1962", "the year our oven was built"], ["48 hours", "every sourdough rests"], ["6 days", "a week, Tuesday to Sunday"], ["11", "people in the kitchen, counter and workshop"]], { look: "lines", size: "md", colour: "primary" }),
        ], { paddingY: "md" }),
        k.section("surface", [
          k.columns([
            [k.image("tool-wall.jpg")],
            [
              k.heading("The back room", { eyebrow: "Workshop" }),
              k.text("Every tool on this wall was bought second-hand, sharpened and given a place. On Saturdays it's a classroom; the rest of the week our potter and our carpenter make the cups and shelves you'll find in the shop."),
              k.link("See the workshops", "/workshops"),
            ],
          ], { widths: "equal", valign: "middle", gap: "xl" }),
        ], { paddingY: "xl" }),
        k.section("background", [
          k.quote("They didn't just open a bakery. They gave the street a place to meet again.", "Niamh Walsh", "Owner of the flower stall next door", { align: "center" }),
        ], { width: "narrow", paddingY: "xl" }),
        k.linkedSection("contact-strip"),
      ],
    },
  };
}

function visit(): Page {
  const k = kit("visit");
  return {
    path: "/visit",
    title: "Visit us",
    description: `Corner Workshop is at ${ADDRESS}. Opening hours, how to get here and how to order ahead.`,
    puck: {
      root: { props: {} },
      content: [
        k.section("background", [
          k.columns([
            [
              k.h1(ADDRESS, { eyebrow: "Visit us" }),
              k.text("Five minutes' walk from the canal, next to the flower stall. Buses 13 and 40 stop at the end of the lane, and there's a bike rack by the door."),
              k.table("Opening hours", HOURS, { headers: "both" }),
              k.iconList([[PHONE, "phone"], [EMAIL, "mail"]]),
            ],
            [k.image("flower-shop.jpg")],
          ], { widths: "equal", valign: "middle", gap: "xl" }),
        ], { paddingY: "xl" }),
        k.section("surface", [
          k.columns([
            [k.heading("Order ahead", { mark: false }), k.text("Cakes, bread for a party or coffee for an office: tell us by Thursday for the weekend, and we'll have it ready at the counter.")],
            [k.form("What would you like, and for when?", "Send order", "Thank you. We'll confirm your order by email before the end of the day.")],
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
    name: "Order ahead strip",
    content: [
      k.section("surface", [
        k.columns([
          [k.heading("Ordering for a party? Tell us by Thursday.")],
          [k.text("Cakes, bread and coffee for ten or a hundred, ready at the counter on the day.", { tone: "default" }), k.button("Order ahead", "/visit")],
        ], { widths: "two-one", valign: "bottom", gap: "xl" }),
      ], { paddingY: "xl" }),
    ] as Block[],
  };
}

function posts(): Post[] {
  const a = kit("post-rest");
  const b = kit("post-spring");
  return [
    {
      slug: "why-sourdough-rests",
      title: "Why our sourdough rests for 48 hours",
      description: "Two days from flour to loaf sounds slow. Here's what happens in that time, and why you can taste it.",
      date: "2026-10-09",
      cover: img("loaves.jpg"),
      coverAlt: altOf("loaves.jpg"),
      puck: {
        root: { props: {} },
        content: [
          a.section("background", [
            a.text([
              "Most bread is made in a few hours. Ours takes two days, and people ask why every week.",
              "The short answer: time does what machines and additives do in a factory, only better. The flour and water are mixed on Tuesday afternoon, and the loaf you buy on Thursday morning has been slowly working ever since.",
            ], { tone: "default" }),
            a.heading("What happens in 48 hours", { mark: false }),
            a.steps(["Day one, afternoon: flour, water and our starter are mixed, then left alone.", "Day one, evening: we fold the dough four times, an hour apart.", "Day two: the shaped loaves rest overnight in the cold room.", "Day three, 5:00: into the oven, and on the counter by seven."], "plain"),
            a.text("The result is a crust that crackles, a crumb that stays soft for days, and bread that many people who can't eat ordinary loaves find easier to digest.", { tone: "default" }),
          ], { width: "narrow", paddingY: "md" }),
        ],
      },
    },
    {
      slug: "spring-workshops",
      title: "New Saturday workshops this spring",
      description: "Glazing, a sourdough class and a woodwork weekend join the pottery mornings. Dates and how to book.",
      date: "2026-09-18",
      cover: img("ceramic-bottles.jpg"),
      coverAlt: altOf("ceramic-bottles.jpg"),
      puck: {
        root: { props: {} },
        content: [
          b.section("background", [
            b.text([
              "The pottery mornings have been full since the spring, so we're adding three more workshops on Saturdays.",
              "Glaze and fire is for anyone who has made pots with us and wants to finish them. The sourdough class sends you home with a loaf and a jar of our starter. And the woodwork weekend ends with a stool you made with hand tools only.",
            ], { tone: "default" }),
            b.image("tool-wall.jpg", "The back room, ready for the first woodwork weekend."),
            b.text("Places are eight per workshop. Book at the counter or by email.", { tone: "default" }),
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
      logo: { text: "Corner Workshop", imageSrc: "", imageAlt: "" },
      menu: [
        { label: "Menu", href: "/menu" },
        { label: "Workshops", href: "/workshops" },
        { label: "Our story", href: "/about" },
        { label: "News", href: "/blog" },
        { label: "Visit us", href: "/visit" },
      ],
      cta: { label: "", href: "" },
      sticky: false,
      style: "background",
      layout: "stacked",
      topBar: { show: true, text: "Fresh bread from 7:00, Tuesday to Sunday.", link: { label: "Today's menu", href: "/menu" }, contact: PHONE, style: "primary" },
    },
    footer: {
      show: true,
      text: `Bakery, coffee bar and Saturday workshop at ${ADDRESS}.`,
      columns: [
        { title: "The shop", links: [{ label: "Menu", href: "/menu" }, { label: "Workshops", href: "/workshops" }, { label: "Order ahead", href: "/visit" }] },
        { title: "Visit", links: [{ label: "Opening hours", href: "/visit" }, { label: "Our story", href: "/about" }, { label: "News", href: "/blog" }] },
      ],
      copyright: "© {year} {name}",
      style: "primary",
    },
  };
}

function designs(): TemplateDesign[] {
  const k = kit("design");
  return [
    {
      kind: "post",
      content: [
        k.section("surface", [
          k.columns([
            [k.raw("PostDetails", { show: "both", align: "left" }), k.raw("PostTitle", { size: "display", align: "left" }), k.raw("PostSummary", { align: "left" })],
            [k.raw("PostCover", { ratio: "square" })],
          ], { widths: "equal", valign: "middle", gap: "xl" }),
        ], { paddingY: "lg" }),
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
          k.raw("PostList", { look: "cards", columns: "auto", count: "all", photo: "yes", date: "yes", summary: "yes", titleLevel: "h2" }),
        ], { paddingY: "xl" }),
      ],
    },
    {
      kind: "notFound",
      title: "Page not found",
      content: [
        k.section("surface", [
          k.heading("This shelf is empty", { level: "h1", display: true, align: "center", eyebrow: "Page not found", mark: false }),
          k.raw("Text", { text: richParagraphs("The page you were looking for has moved or sold out. Today's menu is still on the counter."), align: "center", tone: "muted" }),
          k.spacer("sm"),
          k.button("See today's menu", "/menu", "primary", { align: "center" }),
          k.button("Go to the home page", "/", "arrow", { align: "center" }),
        ], { width: "narrow", paddingY: "xl", height: "medium" }),
      ],
    },
  ];
}

export const cornerParts: StarterParts = {
  pages: () => [home(), menu(), workshops(), about(), visit()],
  sections: () => [contactStrip()],
  posts,
  blog: { title: "News", intro: "New bakes, workshop dates and what's happening on Mill Lane." },
  chrome,
  designs,
};

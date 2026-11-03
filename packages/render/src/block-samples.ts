/**
 * One of each F032 block, filled in, on every section style. The layout
 * check renders this with every theme preset so axe can check the new
 * blocks' contrast, names and structure (no published page uses them yet).
 */
import { gradientColours, sectionStyleIds, type Page, type SiteTokens } from "@crust/blocks";

type Content = Page["puck"]["content"];

const sampleBlocks = (n: string): Content => [
  { type: "Heading", props: { id: `h-${n}`, text: `Sample ${n}`, level: "h2", align: "left" } },
  // F042: rich text, so axe checks links and lists on every section style.
  {
    type: "Text",
    props: {
      id: `rich-${n}`,
      align: "left",
      tone: "default",
      text: {
        rich: 1,
        blocks: [
          { type: "p", children: [{ text: "Fresh bread " }, { text: "every morning", bold: true }, { text: ", see the " }, { text: "menu", href: "/menu" }, { text: "." }] },
          { type: "ul", items: [[{ text: "Sourdough" }], [{ text: "Rye, ", italic: true }, { text: "on Fridays", href: "/fridays" }]] },
          { type: "ol", items: [[{ text: "Order" }], [{ text: "Collect" }]] },
        ],
      },
    },
  },
  {
    type: "Grid",
    props: {
      id: `grid-${n}`,
      columns: "3",
      titleLevel: "h3",
      background: "primary",
      items: [
        { title: "Plan", text: "Sketch the pages.", imageSrc: "/sample.jpg", imageAlt: "A sketchbook", linkLabel: "Read about planning", linkHref: "/plan" },
        { title: "Build", text: "Use blocks.", imageSrc: "", imageAlt: "", linkLabel: "", linkHref: "" },
        { title: "Publish", text: "Go live.", imageSrc: "", imageAlt: "", linkLabel: "", linkHref: "" },
      ],
    },
  },
  {
    type: "Gallery",
    props: {
      id: `gallery-${n}`,
      columns: "3",
      shape: "square",
      images: [
        { src: "/a.jpg", alt: "A studio desk", caption: "Our desk" },
        { src: "/b.jpg", alt: "A plant", caption: "" },
        { src: "", alt: "", caption: "Skipped: no address" },
      ],
    },
  },
  {
    type: "Accordion",
    props: {
      id: `acc-${n}`,
      firstOpen: "yes",
      oneAtATime: "yes",
      items: [
        { question: "How long does it take?", answer: "Two to four weeks." },
        { question: "Can I edit it myself?", answer: "Yes.\n\nEvery page is built from blocks." },
      ],
    },
  },
  { type: "IconList", props: { id: `icons-${n}`, icon: "check", iconColor: "primary", items: [{ text: "Fast pages" }, { text: "Accessible" }] } },
  // F077: icons in every look, a named one, an icon link, dividers and social links.
  { type: "IconList", props: { id: `icons2-${n}`, icon: "map-pin", iconColor: "primary", items: [{ text: "Keizersgracht 12" }, { text: "+31 20 555 0101", icon: "phone" }] } },
  {
    type: "Columns",
    props: {
      id: `icon-cols-${n}`,
      count: "3",
      gap: "md",
      column1: [{ type: "Icon", props: { id: `ic1-${n}`, icon: "truck", look: "circle", size: "md", colour: "primary", label: "", href: "", align: "left" } }],
      column2: [{ type: "Icon", props: { id: `ic2-${n}`, icon: "leaf", look: "square", size: "lg", colour: "text", label: "Organic", href: "", align: "left" } }],
      column3: [{ type: "Icon", props: { id: `ic3-${n}`, icon: "phone", look: "plain", size: "sm", colour: "primary", label: "Call us", href: "tel:+31205550101", align: "left" } }],
    },
  },
  { type: "Card", props: { id: `icard-${n}`, background: "surface", icon: "clock", title: "Open late", titleLevel: "h3", text: "Until 22:00.", imageSrc: "", imageAlt: "", linkLabel: "", linkHref: "" } },
  { type: "Button", props: { id: `ibtn-${n}`, label: "Book a table", href: "/book", variant: "secondary", icon: "calendar", iconAt: "before" } },
  { type: "Divider", props: { id: `div1-${n}`, kind: "label", label: "Our menu", width: "full", space: "md", align: "center" } },
  { type: "Divider", props: { id: `div2-${n}`, kind: "dots", label: "", width: "short", space: "sm", align: "center" } },
  { type: "Divider", props: { id: `div3-${n}`, kind: "accent", label: "", width: "short", space: "sm", align: "left" } },
  // F078: stats, numbered lists, a table, pricing and both kinds of video.
  {
    type: "Stats",
    props: {
      id: `stats-${n}`,
      look: n === "surface" ? "boxes" : "lines",
      size: "md",
      colour: n === "background" ? "primary" : "text",
      align: "left",
      items: [
        { value: "1,200+", label: "sites published", detail: "since 2024" },
        { value: "98", label: "average speed score", detail: "" },
        { value: "€0", label: "monthly running cost", detail: "" },
      ],
    },
  },
  { type: "IconList", props: { id: `steps-${n}`, icon: "numbers", numberStyle: "circle", iconColor: "primary", items: [{ text: "Pick a template" }, { text: "Press Publish" }] } },
  { type: "IconList", props: { id: `steps2-${n}`, icon: "numbers", numberStyle: "large", iconColor: "primary", items: [{ text: "Book a call" }, { text: "Get a plan" }] } },
  { type: "IconList", props: { id: `steps3-${n}`, icon: "numbers", numberStyle: "plain", iconColor: "text", items: [{ text: "Order" }, { text: "Collect" }] } },
  {
    type: "Table",
    props: {
      id: `table-${n}`,
      caption: "Opening hours",
      headers: "both",
      look: n === "surface" ? "stripes" : "lines",
      rows: [
        ["", "Studio", "Shop"],
        ["Monday to Friday", "9:00–18:00", "€12"],
        ["Saturday", "10:00–16:00", "€9.50"],
      ],
    },
  },
  {
    type: "Pricing",
    props: {
      id: `pricing-${n}`,
      highlight: "2",
      badge: "Most popular",
      planStyle: "surface",
      highlightStyle: n === "primary" ? "dark" : "primary",
      titleLevel: "h3",
      plans: [
        { name: "Starter", price: "€19", period: "per month", description: "For a first site.", features: "1 site\nEmail help", buttonLabel: "", buttonHref: "/contact" },
        { name: "Studio", price: "€49", period: "per month", description: "", features: "5 sites\nYour own domain", buttonLabel: "", buttonHref: "/contact" },
      ],
    },
  },
  { type: "Video", props: { id: `yt-${n}`, src: "https://youtu.be/aqz-KE-bpKQ", title: "A morning at the studio", imageSrc: "/sample.jpg", captionsSrc: "", caption: "Filmed in March.", ratio: "16:9" } },
  { type: "Video", props: { id: `vid-${n}`, src: "/media/tour.mp4", title: "Studio tour", imageSrc: "", captionsSrc: "/media/tour.vtt", caption: "", ratio: "16:9" } },
  // F079: Slideshow (playing on its own, so the pause button is checked), Card slider, Tabs, Map, lightbox Gallery.
  {
    type: "Slideshow",
    props: {
      id: `slides-${n}`,
      name: "Our rooms",
      ratio: "16:9",
      autoplay: n === "surface" ? "yes" : "no",
      speed: "8",
      titleLevel: "h3",
      slides: [
        { imageSrc: "/sample.jpg", imageAlt: "The harbour room", title: "Harbour room", text: "Sea view, two beds.", linkLabel: "Book the harbour room", linkHref: "/book" },
        { imageSrc: "/alex.jpg", imageAlt: "The garden room", title: "Garden room", text: "", linkLabel: "", linkHref: "" },
      ],
    },
  },
  {
    type: "CardSlider",
    props: {
      id: `cards-${n}`,
      name: "This season",
      visible: "3",
      titleLevel: "h3",
      background: n === "primary" ? "background" : "surface",
      items: ["Rye loaf", "Pear tart", "Focaccia", "Babka"].map((title) => ({ title, text: "Baked every morning.", imageSrc: "", imageAlt: "", linkLabel: `Order the ${title.toLowerCase()}`, linkHref: "/order" })),
    },
  },
  {
    type: "Tabs",
    props: {
      id: `tabs-${n}`,
      look: n === "background" ? "underline" : n === "surface" ? "pills" : "side",
      titleLevel: "h3",
      tabs: [
        { label: "Menu", text: "Bread from 7, coffee from 8." },
        { label: "Hours", text: "Closed on Mondays." },
        { label: "Find us", text: "Next to the harbour." },
      ],
    },
  },
  { type: "Map", props: { id: `map-${n}`, place: "Crust Bakery", address: "Harbour street 12\nAmsterdam", pin: { lat: 52.3731, lng: 4.8922 }, zoom: "street", ratio: "16:9", imageSrc: "" } },
  {
    type: "Gallery",
    props: { id: `lightbox-${n}`, lightbox: "yes", columns: "3", shape: "square", images: [{ src: "/sample.jpg", alt: "The bakery's back room", caption: "Before opening" }, { src: "/alex.jpg", alt: "Alex at the oven", caption: "" }] },
  },
  {
    type: "SocialLinks",
    props: {
      id: `social-${n}`,
      who: "Atelier",
      show: n === "surface" ? "names" : "icons",
      look: n === "primary" ? "circle" : "plain",
      align: "left",
      links: [{ href: "https://instagram.com/atelier" }, { href: "https://www.linkedin.com/company/atelier" }, { href: "https://example.com/atelier" }],
    },
  },
  {
    type: "LogoRow",
    props: {
      id: `logos-${n}`,
      logoSize: "medium",
      grayscale: "yes",
      align: "center",
      logos: [
        { src: "/l1.svg", alt: "Acme", href: "https://example.com" },
        { src: "/l2.svg", alt: "Globex", href: "" },
      ],
    },
  },
  { type: "Quote", props: { id: `quote-${n}`, text: "It just works.", name: "Alex Rivera", role: "Studio Rivera", imageSrc: "/alex.jpg", align: "left", size: "large" } },
  {
    type: "ImageOverlay",
    props: {
      id: `overlay-${n}`,
      imageSrc: "",
      imageAlt: "",
      title: "On a photo",
      titleLevel: "h3",
      text: "Readable on any photo.",
      linkLabel: "See the work",
      linkHref: "/work",
      background: "dark",
      tint: "medium",
      position: "bottom-left",
      height: "medium",
    },
  },
];

export function blockSamples(): Content {
  return [
    { type: "Heading", props: { id: "h-top", text: "New blocks", level: "h1", align: "left" } },
    ...sectionStyleIds.map((style) => ({
      type: "Section",
      props: { id: `s-${style}`, background: style, paddingY: "md", content: sampleBlocks(style) },
    })),
  ] as Content;
}

/**
 * F073: one page using every Sections v2 option, so axe checks the header on
 * a photo, gradients, the video's pause button and pulled-up cards. Gradients
 * end in the first colour the builder would offer for each style.
 */
export function sectionsV2Samples(tokens: SiteTokens): Content {
  const card = (n: string) => ({
    type: "Card",
    props: { id: `card-${n}`, background: "background", title: `Card ${n}`, text: "Pulled up over the photo.", imageSrc: "", imageAlt: "", linkLabel: "", linkHref: "" },
  });
  const section = (id: string, props: Record<string, unknown>, content: Content) => ({
    type: "Section",
    props: { id, paddingY: "lg", height: "auto", valign: "center", tint: "medium", imageSrc: "", ...props, content },
  });
  const words = (id: string, text: string, level: "h1" | "h2" = "h2"): Content => [
    { type: "Heading", props: { id: `h-${id}`, text, level, align: "left" } },
    { type: "Text", props: { id: `t-${id}`, text: "Text and a link to the [menu].", align: "left", tone: "default" } },
    { type: "Button", props: { id: `b-${id}`, label: "Get in touch", href: "/contact", variant: "primary" } },
  ];
  return [
    section("hero", { background: "dark", bgKind: "photo", imageSrc: "/sample.jpg", focus: { x: 30, y: 60 }, headerOver: true, height: "large", width: "wide" }, words("hero", "Sections v2", "h1")),
    section("cards", { background: "background", overlap: "md", width: "normal" }, [
      { type: "Columns", props: { id: "cols", count: "3", gap: "md", column1: [card("1")], column2: [card("2")], column3: [card("3")] } },
    ]),
    ...sectionStyleIds.flatMap((style) => {
      const to = gradientColours(tokens, style)[0];
      return to ? [section(`grad-${style}`, { background: style, bgKind: "gradient", gradient: { to, direction: "diagonal" }, width: "narrow" }, words(`grad-${style}`, `Gradient on ${style}`))] : [];
    }),
    section("edge", { background: "surface", width: "right" }, [
      { type: "Columns", props: { id: "edge-cols", count: "2", gap: "md", column1: words("edge", "To the right edge"), column2: [{ type: "Image", props: { id: "edge-img", src: "/sample.jpg", alt: "A sample photo", caption: "" } }] } },
    ]),
    section("video", { background: "primary", bgKind: "video", imageSrc: "/sample.jpg", videoSrc: "/sample-loop.mp4", height: "medium", width: "full" }, words("video", "A background video")),
  ] as Content;
}

/**
 * F074: rows using every Columns v2 option, so axe checks column boxes and
 * the highlighted column in each style, dividers, phone order and sticky.
 */
export function columnsV2Samples(): Content {
  const words = (id: string, title: string, withButton = false): Content => [
    { type: "Heading", props: { id: `h-${id}`, text: title, level: "h3", align: "left" } },
    { type: "Text", props: { id: `t-${id}`, text: "A short line about this column.", align: "left", tone: "default" } },
    ...(withButton ? [{ type: "Button", props: { id: `b-${id}`, label: `Choose ${title}`, href: "/contact", variant: "primary" } }] : []),
  ] as Content;
  const row = (id: string, props: Record<string, unknown>, cols: Content[]) => ({
    type: "Columns",
    props: { id, count: String(cols.length), gap: "md", column1: cols[0] ?? [], column2: cols[1] ?? [], column3: cols[2] ?? [], column4: cols[3] ?? [], ...props },
  });
  const section = (id: string, background: string, content: Content) => ({ type: "Section", props: { id, background, paddingY: "lg", content } });
  return [
    { type: "Heading", props: { id: "h-top", text: "Rows and columns v2", level: "h1", align: "left" } },
    ...sectionStyleIds.map((style) =>
      section(`s-${style}`, style, [
        { type: "Heading", props: { id: `h-${style}`, text: `Boxes on ${style}`, level: "h2", align: "left" } },
        row(`price-${style}`, { box: { style: style === "surface" ? "background" : "surface", padding: "md", rounded: true }, highlight: { column: 2, style: style === "primary" ? "dark" : "primary" }, rowGap: "lg" }, [
          words(`basic-${style}`, "Basic", true),
          words(`studio-${style}`, "Studio", true),
          words(`agency-${style}`, "Agency", true),
        ]),
        row(`div-${style}`, { dividers: true, valign: "middle" }, [words(`d1-${style}`, "One"), words(`d2-${style}`, "Two"), words(`d3-${style}`, "Three")]),
      ]),
    ),
    section("s-order", "background", [
      row("reverse", { phoneOrder: "reverse", valign: "middle", box: { style: "dark", padding: "lg", rounded: false } }, [
        words("rev-text", "Photo first on phones", true),
        [{ type: "Image", props: { id: "rev-img", src: "/sample.jpg", alt: "A sample photo", caption: "" } }] as Content,
      ]),
      row("sticky", { sticky: 1, dividers: true }, [words("st-1", "Stays in view"), [...words("st-2a", "Long column"), ...words("st-2b", "More"), ...words("st-2c", "And more")] as Content]),
    ]),
  ] as Content;
}

/**
 * F075: a page using every motion option (entrances, staggered rows of
 * linked cards and photos, parallax, the moving logo row with its pause
 * switch), so axe checks it with motion on in a real browser.
 */
export function motionSamples(): Content {
  const entrances = ["rise", "zoom", "slide", "none"] as const;
  const card = (id: string, title: string) => ({
    type: "Card",
    props: { id, background: "background", title, text: "A card that links somewhere lifts.", imageSrc: "/sample.jpg", imageAlt: "A sample photo", linkLabel: `Read about ${title}`, linkHref: `/${id}` },
  });
  const section = (id: string, props: Record<string, unknown>, content: Content) => ({
    type: "Section",
    props: { id, paddingY: "lg", height: "auto", valign: "center", tint: "medium", imageSrc: "", ...props, content },
  });
  return [
    section("hero", { background: "dark", imageSrc: "/sample.jpg", height: "large", parallax: true }, [
      { type: "Heading", props: { id: "h-hero", text: "Motion", level: "h1", align: "left" } },
      { type: "Button", props: { id: "b-hero", label: "Get in touch", href: "/contact", variant: "primary" } },
    ]),
    ...sectionStyleIds.map((style, i) =>
      section(`s-${style}`, { background: style, entrance: entrances[i % entrances.length] }, [
        { type: "Heading", props: { id: `h-${style}`, text: `Entrance on ${style}`, level: "h2", align: "left" } },
        {
          type: "Columns",
          props: { id: `cols-${style}`, count: "3", gap: "md", column1: [card(`one-${style}`, "One")], column2: [card(`two-${style}`, "Two")], column3: [card(`three-${style}`, "Three")] },
        },
        {
          type: "Grid",
          props: {
            id: `grid-${style}`,
            columns: "3",
            titleLevel: "h3",
            background: "background",
            items: ["Plan", "Build", "Publish", "Review"].map((t) => ({ title: t, text: "Step.", imageSrc: "", imageAlt: "", linkLabel: `More on ${t}`, linkHref: `/${t.toLowerCase()}` })),
          },
        },
        {
          type: "LogoRow",
          props: {
            id: `logos-${style}`,
            logoSize: "medium",
            grayscale: "no",
            align: "center",
            moving: "yes",
            logos: [
              { src: "/l1.svg", alt: "Acme", href: "https://example.com" },
              { src: "/l2.svg", alt: "Globex", href: "" },
              { src: "/l3.svg", alt: "Initech", href: "" },
            ],
          },
        },
      ]),
    ),
    section("photo", { background: "dark", imageSrc: "/sample.jpg", height: "medium", parallax: true }, [
      { type: "Heading", props: { id: "h-photo", text: "Photo moves slower", level: "h2", align: "left" } },
      {
        type: "Gallery",
        props: { id: "gallery", columns: "3", shape: "square", images: [{ src: "/a.jpg", alt: "A studio desk", caption: "" }, { src: "/b.jpg", alt: "A plant", caption: "" }, { src: "/sample.jpg", alt: "A sample photo", caption: "" }] },
      },
    ]),
  ] as Content;
}

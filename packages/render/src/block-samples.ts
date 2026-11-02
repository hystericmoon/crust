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

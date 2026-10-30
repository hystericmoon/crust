/**
 * One of each F032 block, filled in, on every section style. The layout
 * check renders this with every theme preset so axe can check the new
 * blocks' contrast, names and structure (no published page uses them yet).
 */
import { sectionStyleIds, type Page } from "@crust/blocks";

type Content = Page["puck"]["content"];

const sampleBlocks = (n: string): Content => [
  { type: "Heading", props: { id: `h-${n}`, text: `Sample ${n}`, level: "h2", align: "left" } },
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

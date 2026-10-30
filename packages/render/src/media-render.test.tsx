import { defaultTokens, type MediaItem, type Page, type Site } from "@crust/blocks";
import { describe, expect, it } from "vitest";
import { renderPage } from "./render";

const site: Site = {
  name: "Test",
  baseUrl: "https://example.test",
  language: "en",
  tokens: defaultTokens,
  header: { logo: { text: "Test", imageSrc: "/media/logo.png", imageAlt: "Test" } },
};
const page: Page = {
  path: "/",
  title: "Home",
  description: "Desc",
  puck: {
    root: { props: {} },
    content: [
      { type: "Heading", props: { id: "h", text: "Home", level: "h1", align: "left" } },
      { type: "Image", props: { id: "i", src: "/media/harbour.jpg", alt: "Boats at dawn", caption: "" } },
      { type: "Gallery", props: { id: "g", images: [{ src: "/media/harbour.jpg", alt: "Boats", caption: "" }, { src: "https://x.dev/a.jpg", alt: "A", caption: "" }] } },
    ],
  },
};
const media: MediaItem[] = [
  { file: "harbour.jpg", alt: "Boats", width: 2400, height: 1600, bytes: 1, uploadedAt: "" },
  { file: "logo.png", alt: "Test", width: 400, height: 100, bytes: 1, uploadedAt: "" },
];

describe("published pages with library photos (F034)", () => {
  it("lists resized copies in srcset, with sizes per block", () => {
    const html = renderPage(site, page, "", { media });
    expect(html).toContain('<img src="/media/harbour.jpg" srcSet="/media/harbour-480w.jpg 480w, /media/harbour-960w.jpg 960w, /media/harbour-1440w.jpg 1440w, /media/harbour.jpg 2400w" sizes="(min-width: 75rem) 75rem, 100vw" width="2400" height="1600" alt="Boats at dawn"');
    // Gallery photos are a third of the page wide on big screens.
    expect(html).toContain('sizes="(min-width: 64rem) 33vw, (min-width: 40rem) 50vw, 100vw"');
    // Web addresses still work as before.
    expect(html).toContain('<img src="https://x.dev/a.jpg" alt="A"');
    // The header logo is small: its size, no copies.
    expect(html).toContain('<img class="cr-logo-image" src="/media/logo.png" width="400" height="100" alt="Test"');
  });

  it("without the library, photos are published as they are", () => {
    const html = renderPage(site, page, "");
    expect(html).toContain('<img src="/media/harbour.jpg" alt="Boats at dawn"');
    expect(html).not.toContain("srcSet");
  });
});

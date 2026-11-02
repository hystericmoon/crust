/** F081: published pages offer AVIF and WebP copies and crop around focal points. */
import { defaultTokens, type MediaItem, type Page, type Site } from "@crust/blocks";
import { describe, expect, it } from "vitest";
import { renderPage } from "./render";

const site: Site = { name: "Test", baseUrl: "https://example.test", language: "en", tokens: defaultTokens };
const page: Page = {
  path: "/",
  title: "Home",
  description: "Desc",
  puck: {
    root: { props: {} },
    content: [
      { type: "Section", props: { id: "s", background: "dark", paddingY: "lg", height: "tall", valign: "center", imageSrc: "/media/stage.jpg", tint: "medium", content: [
        { type: "Heading", props: { id: "h", text: "Home", level: "h1", align: "left" } },
      ] } },
      { type: "Gallery", props: { id: "g", shape: "square", images: [{ src: "/media/stage.jpg", alt: "The band on stage", caption: "" }] } },
    ],
  },
};
const media: MediaItem[] = [{ file: "stage.jpg", alt: "The band", width: 1920, height: 1200, bytes: 1, uploadedAt: "", focus: { x: 18, y: 45 } }];

describe("published photos (F081)", () => {
  it("are <picture>s with AVIF and WebP copies, cropped around the focal point", () => {
    const html = renderPage(site, page, "", { media });
    expect(html.match(/<picture class="cr-picture">/g)).toHaveLength(2);
    expect(html).toContain('<source type="image/avif" srcSet="/media/stage-480w.jpg.avif 480w');
    expect(html).toContain('<source type="image/webp" srcSet="/media/stage-480w.jpg.webp 480w');
    expect(html.match(/object-position:18% 45%/g)).toHaveLength(2);
  });

  it("without the library, photos are published as they are", () => {
    const html = renderPage(site, page, "");
    expect(html).not.toContain("<picture");
    expect(html).not.toContain("object-position");
  });
});

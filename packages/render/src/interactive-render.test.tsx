import { defaultTokens, INTERACTIVE_CSS, LIGHTBOX_SCRIPT, SLIDER_SCRIPT, TABS_SCRIPT, VIDEO_EMBED_SCRIPT, type Page, type Site } from "@crust/blocks";
import { describe, expect, it } from "vitest";
import { renderPost } from "./blog";
import { minifyCss, renderPage } from "./render";

const site: Site = { name: "Test", baseUrl: "https://example.test", language: "en", tokens: defaultTokens };
const page = (content: Page["puck"]["content"]): Page => ({ path: "/", title: "Home", description: "Desc", puck: { root: { props: {} }, content } });
const h1 = { type: "Heading", props: { id: "h", text: "Home", level: "h1", align: "left" } };
const slide = (n: number) => ({ imageSrc: `/s${n}.jpg`, imageAlt: `Slide ${n}`, title: "", text: "", linkLabel: "", linkHref: "" });
const scripts = (html: string) => html.match(/<script type="module">/g)?.length ?? 0;

describe("F079 interactive blocks on published pages", () => {
  it("a page without them gets no script and none of their CSS", () => {
    const html = renderPage(site, page([h1]), "");
    expect(html).not.toContain("<script");
    expect(html).not.toContain(".cr-slider-track");
  });
  it("each block brings only its own script, once, however many there are", () => {
    const html = renderPage(
      site,
      page([
        h1,
        { type: "Slideshow", props: { id: "s1", slides: [slide(1), slide(2)] } },
        { type: "Slideshow", props: { id: "s2", slides: [slide(3), slide(4)] } },
        { type: "Tabs", props: { id: "t", tabs: [{ label: "A", text: "a" }] } },
      ]),
      "",
    );
    expect(html).toContain(SLIDER_SCRIPT);
    expect(html).toContain(TABS_SCRIPT);
    expect(html).not.toContain(LIGHTBOX_SCRIPT);
    expect(scripts(html)).toBe(2);
    expect(html).toContain(minifyCss(INTERACTIVE_CSS).slice(0, 80));
  });
  it("a gallery with the lightbox brings the lightbox script; a map with a pin the press-to-load script", () => {
    const html = renderPage(
      site,
      page([
        h1,
        { type: "Gallery", props: { id: "g", lightbox: "yes", columns: "3", shape: "square", images: [{ src: "/a.jpg", alt: "A", caption: "" }] } },
        { type: "Map", props: { id: "m", place: "Shop", address: "Main street 1", pin: { lat: 52.37, lng: 4.89 }, zoom: "street", ratio: "16:9", imageSrc: "" } },
      ]),
      "",
    );
    expect(html).toContain(LIGHTBOX_SCRIPT);
    expect(html).toContain(VIDEO_EMBED_SCRIPT);
    expect(html).not.toContain(SLIDER_SCRIPT);
    // Nothing is fetched from a map service before the press.
    expect(html).not.toContain("<iframe");
  });
  it("posts get them too", () => {
    const html = renderPost(site, { slug: "p", title: "P", description: "", date: "2026-11-02", cover: "", coverAlt: "", puck: { root: { props: {} }, content: [{ type: "Tabs", props: { id: "t", tabs: [{ label: "A", text: "a" }] } }] } } as never, { title: "News", intro: "" }, "");
    expect(html).toContain(TABS_SCRIPT);
  });
});

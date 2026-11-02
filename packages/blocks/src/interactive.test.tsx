// @vitest-environment happy-dom
// @vitest-environment-options {"settings":{"disableIframePageLoading":true}}
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { config, type Components } from "./config";
import { VIDEO_EMBED_SCRIPT } from "./blocks-v3";
import {
  cleanPin,
  directionsUrl,
  hasMapEmbed,
  interactiveNeeds,
  interactiveTags,
  LIGHTBOX_SCRIPT,
  mapEmbedUrl,
  mapPageUrl,
  pinFromText,
  SLIDER_SCRIPT,
  slideList,
  TABS_SCRIPT,
} from "./interactive";
import { INTERACTIVE_CSS, needsInteractiveCss } from "./interactive-css";
import { relinkPage } from "./links";
import { markableFields } from "./placeholders";

type Name = keyof Components;
type Render = (props: Record<string, unknown>) => ReactNode;

function html(name: Name, props: Record<string, unknown> = {}, isEditing = false) {
  const block = config.components[name];
  const render = block.render as unknown as Render;
  return renderToStaticMarkup(<>{render({ id: `${name}-1`, ...block.defaultProps, ...props, puck: { isEditing } })}</>);
}

const slide = (n: number, extra: Record<string, string> = {}) => ({ imageSrc: `/media/s${n}.jpg`, imageAlt: `Room ${n}`, title: "", text: "", linkLabel: "", linkHref: "", ...extra });
const card = (title: string) => ({ title, text: "Words.", imageSrc: "", imageAlt: "", linkLabel: "", linkHref: "" });

/** Puts published HTML on the page and runs a block script on it, as the browser would. */
function run(markup: string, ...scripts: string[]) {
  document.body.innerHTML = markup;
  for (const js of scripts) new Function(js)();
}

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

describe("F079 interactive blocks: in the builder", () => {
  it("are listed: Slideshow, Card slider and Map under Media, Tabs under Content", () => {
    expect(config.categories?.media?.components).toEqual(expect.arrayContaining(["Slideshow", "CardSlider", "Map"]));
    expect(config.categories?.content?.components).toContain("Tabs");
  });
  it("can be marked as template sample content, and their links follow renamed pages", () => {
    expect(markableFields.Slideshow?.map((f) => f.field)).toEqual(["slides"]);
    expect(markableFields.Map?.map((f) => f.field)).toEqual(["place", "address", "imageSrc"]);
    const data = {
      root: { props: {} },
      content: [
        { type: "Slideshow", props: { id: "s", slides: [slide(1, { linkLabel: "See", linkHref: "/rooms" })] } },
        { type: "CardSlider", props: { id: "c", items: [{ ...card("A"), linkLabel: "Go", linkHref: "/rooms#a" }] } },
      ],
    };
    const { puck: out, count } = relinkPage(data as never, "/rooms", "/stay");
    expect(count).toBe(2);
    expect(JSON.stringify(out)).toContain('"/stay#a"');
  });
});

describe("F079 Slideshow", () => {
  it("publishes a named carousel of photo slides, each labelled, with buttons hidden until the script runs", () => {
    const out = html("Slideshow", { name: "Our rooms", slides: [slide(1, { title: "Harbour room", text: "Sea view", linkLabel: "Book it", linkHref: "/book" }), slide(2), slide(3)] });
    expect(out).toContain('<section class="cr-slideshow cr-slider" aria-roledescription="carousel" aria-label="Slideshow: Our rooms" data-cr-slider="slides"');
    expect(out).toContain('style="--cr-slide-ratio:16 / 9"');
    expect(out).toContain('<ul class="cr-slider-track" role="list" tabindex="0">');
    expect(out).toContain('<li class="cr-slide" aria-roledescription="slide" aria-label="1 of 3">');
    expect(out).toContain('<li class="cr-slide" aria-roledescription="slide" aria-label="3 of 3">');
    // The first photo loads at once, the others when they come near.
    expect(out).toContain('<img class="cr-slide-img" src="/media/s1.jpg" alt="Room 1" decoding="async"/>');
    expect(out).toContain('<img class="cr-slide-img" src="/media/s2.jpg" alt="Room 2" loading="lazy" decoding="async"/>');
    expect(out).toContain('<h3 class="cr-slide-title">Harbour room</h3><p class="cr-slide-text">Sea view</p><a class="cr-card-link cr-slide-link" href="/book">Book it</a>');
    expect(out).toContain('<div class="cr-slider-controls" hidden="">');
    expect(out).toContain('aria-label="Previous slide"');
    expect(out).toContain('<span aria-hidden="true">1 / 3</span><span class="cr-vh">Slide 1 of 3</span>');
    // Not playing on its own unless asked: no autoplay attribute, no pause button.
    expect(out).not.toContain("data-cr-autoplay");
    expect(out).not.toContain("data-cr-pause");
    expect(out).not.toMatch(/\son[a-z]+=/i);
  });
  it("plays on its own only when asked, always with a pause button first", () => {
    const out = html("Slideshow", { slides: [slide(1), slide(2)], autoplay: "yes", speed: "5", ratio: "21:9" });
    expect(out).toContain('aria-label="Slideshow"');
    expect(out).toContain('data-cr-autoplay="5"');
    expect(out).toContain("--cr-slide-ratio:21 / 9");
    expect(out.indexOf("data-cr-pause")).toBeLessThan(out.indexOf("data-cr-prev"));
    expect(out).toContain('aria-label="Pause slideshow"');
    // One slide: nothing to move between.
    const one = html("Slideshow", { slides: [slide(1)], autoplay: "yes" });
    expect(one).not.toContain("cr-slider-controls");
    expect(one).not.toContain("data-cr-autoplay");
  });
  it("leaves out slides without a photo, and unsafe links", () => {
    expect(slideList([slide(1), { ...slide(2), imageSrc: " " }, null])).toHaveLength(1);
    expect(slideList(Array.from({ length: 14 }, (_, i) => slide(i)))).toHaveLength(10);
    const out = html("Slideshow", { slides: [slide(1, { linkLabel: "x", linkHref: "javascript:alert(1)" }), { ...slide(2), imageSrc: "" }] });
    expect(out).not.toContain("javascript:");
    expect(out).not.toContain("s2.jpg");
    expect(html("Slideshow", { slides: [] })).toBe("");
    // In the builder, empty slides show a placeholder and the buttons show.
    const editing = html("Slideshow", { slides: [{ ...slide(1), imageSrc: "" }, slide(2)] }, true);
    expect(editing).toContain("Add a photo");
    expect(editing).toContain('<div class="cr-slider-controls">');
  });
});

describe("F079 Card slider", () => {
  it("publishes cards in a row that scrolls, with the buttons above it", () => {
    const out = html("CardSlider", { name: "This season", items: [card("Rye"), card("Tart"), card("Focaccia")], visible: "4", background: "primary" });
    expect(out).toContain('<section class="cr-card-slider cr-slider" aria-roledescription="carousel" aria-label="Cards: This season" data-cr-slider="cards" style="--cr-slider-visible:4">');
    expect(out.indexOf("cr-slider-controls")).toBeLessThan(out.indexOf("cr-slider-track"));
    expect(out).toContain('aria-label="Next cards"');
    expect(out).toContain('<article class="cr-card cr-bg-primary">');
    expect(out).toContain('<h3 class="cr-heading cr-card-title">Rye</h3>');
    expect(out).not.toContain("data-cr-count");
    expect(html("CardSlider", { items: [card("One")] })).not.toContain("cr-slider-controls");
  });
});

describe("F079 Tabs", () => {
  const tabs = [
    { label: "Menu", text: "Bread from 7.\n\nCoffee from 8." },
    { label: "Hours", text: "Closed on Mondays." },
    { label: "", text: "No name: left out" },
  ];
  it("publishes every text under its own heading, with the tab list hidden until the script runs", () => {
    const out = html("Tabs", { id: "Tabs-a1b2 x", tabs, titleLevel: "h2", look: "pills" });
    expect(out).toContain('<div class="cr-tabs cr-tabs-pills" data-cr-tabs="">');
    expect(out).toContain('<div class="cr-tab-list" role="tablist" aria-orientation="horizontal" hidden="">');
    expect(out).toContain('<button type="button" role="tab" class="cr-tab" id="Tabs-a1b2-x-tab-1" aria-controls="Tabs-a1b2-x-panel-1" aria-selected="true" tabindex="0">Menu</button>');
    expect(out).toContain('aria-selected="false" tabindex="-1">Hours</button>');
    expect(out).toContain('<div class="cr-tab-panel" id="Tabs-a1b2-x-panel-1"><h2 class="cr-tab-title">Menu</h2><div class="cr-text"><p>Bread from 7.</p><p>Coffee from 8.</p></div></div>');
    expect(out).not.toContain("No name");
    expect(out).not.toContain('role="tabpanel"');
    expect(html("Tabs", { tabs, look: "side" })).toContain('aria-orientation="vertical"');
  });
  it("works as real tabs in the builder", () => {
    const out = html("Tabs", { tabs }, true);
    expect(out).toContain('<div class="cr-tabs cr-tabs-underline cr-tabs-ready" data-cr-tabs="">');
    expect(out).toContain('role="tabpanel" aria-labelledby="Tabs-1-tab-2" tabindex="0" hidden=""');
  });
});

describe("F079 Map", () => {
  it("reads the pin from Google Maps, Apple Maps and OpenStreetMap links, or coordinates", () => {
    expect(pinFromText("https://www.google.com/maps/place/Kemang/@-6.26,106.81,17z/data=!3m1!4b1!4m6!3m5!1s0x0:0x0!8m2!3d-6.2607123!4d106.8136456")).toEqual({ lat: -6.260712, lng: 106.813646 });
    expect(pinFromText("https://www.google.com/maps/@52.3731,4.8922,15z")).toEqual({ lat: 52.3731, lng: 4.8922 });
    expect(pinFromText("https://maps.google.com/?q=48.8584,2.2945")).toEqual({ lat: 48.8584, lng: 2.2945 });
    expect(pinFromText("https://maps.apple.com/?ll=40.7484,-73.9857&q=Empire")).toEqual({ lat: 40.7484, lng: -73.9857 });
    expect(pinFromText("https://www.openstreetmap.org/?mlat=51.5007&mlon=-0.1246#map=17/51.5007/-0.1246")).toEqual({ lat: 51.5007, lng: -0.1246 });
    expect(pinFromText("https://www.openstreetmap.org/#map=16/41.9029/12.4534")).toEqual({ lat: 41.9029, lng: 12.4534 });
    expect(pinFromText(" -6.2607, 106.8136 ")).toEqual({ lat: -6.2607, lng: 106.8136 });
    expect(pinFromText("https://maps.app.goo.gl/AbCdEf")).toBeNull();
    expect(pinFromText("Jl. Kemang Raya 12")).toBeNull();
    expect(pinFromText("95, 10")).toBeNull();
  });
  it("cleans pins and builds the map, map page and directions addresses", () => {
    expect(cleanPin({ lat: "1.5", lng: 2 })).toEqual({ lat: 1.5, lng: 2 });
    expect(cleanPin({ lat: 0, lng: 0 })).toBeNull();
    expect(cleanPin({ lat: NaN, lng: 2 })).toBeNull();
    expect(cleanPin(null)).toBeNull();
    const pin = { lat: -6.2607, lng: 106.8136 };
    expect(mapEmbedUrl(pin)).toMatch(/^https:\/\/www\.openstreetmap\.org\/export\/embed\.html\?bbox=106\.8096%2C-6\.26\d+%2C106\.8176%2C-6\.25\d+&layer=mapnik&marker=-6\.2607%2C106\.8136$/);
    expect(mapPageUrl(pin, "city")).toBe("https://www.openstreetmap.org/?mlat=-6.2607&mlon=106.8136#map=12/-6.2607/106.8136");
    expect(directionsUrl("Jl. Kemang Raya 12", null)).toBe("https://www.google.com/maps/dir/?api=1&destination=Jl.%20Kemang%20Raya%2012");
    expect(directionsUrl("x", pin)).toBe("https://www.google.com/maps/dir/?api=1&destination=-6.2607%2C106.8136");
    expect(directionsUrl(" ", null)).toBeNull();
  });
  it("publishes the address in words, a drawn map and a Show map link that loads the map only when pressed", () => {
    const out = html("Map", { place: "Crust Bakery", address: "Jl. Kemang Raya 12\nJakarta", pin: { lat: -6.2607, lng: 106.8136 } });
    expect(out).toContain('<figure class="cr-map" style="--cr-map-ratio:16 / 9"><div class="cr-map-frame cr-map-drawn" data-cr-embed-box="">');
    expect(out).toContain('href="https://www.openstreetmap.org/?mlat=-6.2607&amp;mlon=106.8136#map=17/-6.2607/106.8136"');
    expect(out).toContain('data-cr-embed="https://www.openstreetmap.org/export/embed.html?');
    expect(out).toContain('data-cr-embed-title="Map: Crust Bakery" data-cr-embed-class="cr-map-player">Show map<span class="cr-vh">: Crust Bakery</span></a>');
    expect(out).toContain('<address class="cr-map-address"><strong class="cr-map-place">Crust Bakery</strong><span class="cr-map-line">Jl. Kemang Raya 12</span><span class="cr-map-line">Jakarta</span></address>');
    expect(out).toContain('Directions<span class="cr-vh"> to Crust Bakery</span>');
    expect(out).not.toContain("<iframe");
  });
  it("without a pin shows the address and directions only; with a photo shows the photo instead of the drawing", () => {
    const noPin = html("Map", { address: "Jl. Kemang Raya 12, Jakarta" });
    expect(noPin).not.toContain("cr-map-frame");
    expect(noPin).toContain('<span class="cr-map-line">Jl. Kemang Raya 12</span><span class="cr-map-line">Jakarta</span>');
    expect(noPin).toContain("destination=Jl.%20Kemang%20Raya%2012%2C%20Jakarta");
    expect(html("Map", { address: "" })).toBe("");
    expect(html("Map", { address: "x" }, true)).toContain("Press Find on the map");
    const photo = html("Map", { address: "x", pin: { lat: 1, lng: 2 }, imageSrc: "/media/shop.jpg" });
    expect(photo).toContain('<div class="cr-map-frame" data-cr-embed-box=""><img class="cr-map-cover" src="/media/shop.jpg" alt=""');
  });
});

describe("F079 Gallery lightbox", () => {
  const images = [
    { src: "/media/a.jpg", alt: "A desk", caption: "Our desk" },
    { src: "/media/b.jpg", alt: "A lamp", caption: "" },
  ];
  it("new galleries link each photo to itself for the lightbox; galleries made before stay as they were", () => {
    const out = html("Gallery", { images });
    expect(out).toContain('<ul class="cr-gallery cr-grid-3 cr-shape-square cr-gallery-lightbox" role="list" data-cr-gallery="">');
    expect(out).toContain('<a class="cr-gallery-open" href="/media/a.jpg" data-cr-lightbox=""><img src="/media/a.jpg" alt="A desk"');
    const old = html("Gallery", { images, lightbox: undefined });
    expect(old).not.toContain("data-cr-lightbox");
    // Not in the builder: pressing a photo there selects the block.
    expect(html("Gallery", { images }, true)).not.toContain("data-cr-lightbox");
  });
});

describe("F079 scripts and CSS: only on pages that use them", () => {
  const page = (content: unknown[]) => ({ root: { props: {} }, content });
  it("asks for each script only when its block is on the page, nested in sections too", () => {
    expect(interactiveTags(page([{ type: "Heading", props: {} }]))).toBe("");
    const nested = page([{ type: "Section", props: { content: [{ type: "Slideshow", props: { slides: [slide(1), slide(2)] } }] } }]);
    expect(interactiveNeeds(nested)).toEqual({ slider: true, tabs: false, lightbox: false });
    expect(interactiveTags(nested)).toBe(`<script type="module">${SLIDER_SCRIPT}</script>\n`);
    expect(interactiveNeeds(page([{ type: "Slideshow", props: { slides: [slide(1)] } }])).slider).toBe(false);
    expect(interactiveNeeds(page([{ type: "Tabs", props: { tabs: [{ label: "A", text: "" }] } }])).tabs).toBe(true);
    expect(interactiveNeeds(page([{ type: "Gallery", props: { lightbox: "yes", images: [{ src: "/a.jpg" }] } }])).lightbox).toBe(true);
    expect(interactiveNeeds(page([{ type: "Gallery", props: { images: [{ src: "/a.jpg" }] } }])).lightbox).toBe(false);
    expect(hasMapEmbed(page([{ type: "Map", props: { pin: { lat: 1, lng: 2 } } }]))).toBe(true);
    expect(hasMapEmbed(page([{ type: "Map", props: { address: "x" } }]))).toBe(false);
  });
  it("adds the CSS only for pages showing one of the blocks", () => {
    expect(needsInteractiveCss(html("Tabs"))).toBe(true);
    expect(needsInteractiveCss(html("Map", { address: "x" }))).toBe(true);
    expect(needsInteractiveCss(html("Gallery", { images: [{ src: "/a.jpg", alt: "a", caption: "" }] }))).toBe(true);
    expect(needsInteractiveCss('<div class="cr-gallery cr-grid-3">')).toBe(false);
    expect(needsInteractiveCss('<div class="cr-sliders-x">')).toBe(false);
    expect(INTERACTIVE_CSS).toContain("prefers-reduced-motion");
    expect(INTERACTIVE_CSS).not.toContain("@import");
  });
  it("scripts hold no addresses of other sites and no eval", () => {
    for (const js of [SLIDER_SCRIPT, TABS_SCRIPT, LIGHTBOX_SCRIPT]) {
      expect(js).not.toMatch(/https?:\/\//);
      expect(js).not.toMatch(/\beval\(|new Function/);
      expect(() => new Function(js)).not.toThrow();
    }
  });
});

describe("F079 scripts in the browser", () => {
  it("Tabs: shows the list, one text at a time, arrow keys and Home/End move", () => {
    run(html("Tabs", { tabs: [{ label: "A", text: "one" }, { label: "B", text: "two" }, { label: "C", text: "three" }] }), TABS_SCRIPT);
    const list = document.querySelector<HTMLElement>("[role=tablist]")!;
    const tabs = [...document.querySelectorAll<HTMLButtonElement>("[role=tab]")];
    const panels = [...document.querySelectorAll<HTMLElement>(".cr-tab-panel")];
    expect(list.hidden).toBe(false);
    expect(panels.map((p) => p.hidden)).toEqual([false, true, true]);
    expect(panels[0]!.getAttribute("role")).toBe("tabpanel");
    expect(panels[0]!.getAttribute("aria-labelledby")).toBe(tabs[0]!.id);
    expect(panels[0]!.querySelector<HTMLElement>(".cr-tab-title")!.hidden).toBe(true);
    tabs[0]!.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    expect(tabs[1]!.getAttribute("aria-selected")).toBe("true");
    expect(document.activeElement).toBe(tabs[1]);
    expect(panels.map((p) => p.hidden)).toEqual([true, false, true]);
    tabs[1]!.dispatchEvent(new KeyboardEvent("keydown", { key: "End", bubbles: true }));
    expect(tabs[2]!.tabIndex).toBe(0);
    tabs[2]!.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    expect(document.activeElement).toBe(tabs[0]);
    tabs[1]!.click();
    expect(panels[1]!.hidden).toBe(false);
  });
  it("Slideshow: shows the buttons, moves by one slide, and the pause button stops and starts it", () => {
    vi.spyOn(window, "matchMedia").mockReturnValue({ matches: false } as MediaQueryList);
    const scrollTo = vi.fn();
    vi.spyOn(HTMLElement.prototype, "scrollTo").mockImplementation(scrollTo);
    vi.useFakeTimers();
    try {
      run(html("Slideshow", { slides: [slide(1), slide(2), slide(3)], autoplay: "yes", speed: "5" }), SLIDER_SCRIPT);
      const s = document.querySelector<HTMLElement>("[data-cr-slider]")!;
      expect(s.querySelector<HTMLElement>(".cr-slider-controls")!.hidden).toBe(false);
      expect(s.classList.contains("cr-slider-ready")).toBe(true);
      document.querySelector<HTMLButtonElement>("[data-cr-next]")!.click();
      expect(scrollTo).toHaveBeenLastCalledWith({ left: expect.any(Number), behavior: "smooth" });
      // Plays on its own: one move after 5 seconds; the count stops being announced meanwhile.
      scrollTo.mockClear();
      vi.advanceTimersByTime(5000);
      expect(scrollTo).toHaveBeenCalledTimes(1);
      expect(s.querySelector("[data-cr-count]")!.getAttribute("aria-live")).toBe("off");
      const pause = s.querySelector<HTMLButtonElement>("[data-cr-pause]")!;
      pause.click();
      expect(pause.getAttribute("aria-label")).toBe("Play slideshow");
      expect(s.querySelector("[data-cr-count]")!.getAttribute("aria-live")).toBe("polite");
      scrollTo.mockClear();
      vi.advanceTimersByTime(20000);
      expect(scrollTo).not.toHaveBeenCalled();
      pause.click();
      expect(pause.getAttribute("aria-label")).toBe("Pause slideshow");
      // Keyboard focus inside holds it still.
      s.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
      scrollTo.mockClear();
      vi.advanceTimersByTime(20000);
      expect(scrollTo).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
  it("Slideshow: never plays on its own under Reduce motion, and slides without the slide animation", () => {
    vi.spyOn(window, "matchMedia").mockReturnValue({ matches: true } as MediaQueryList);
    const scrollTo = vi.fn();
    vi.spyOn(HTMLElement.prototype, "scrollTo").mockImplementation(scrollTo);
    vi.useFakeTimers();
    try {
      run(html("Slideshow", { slides: [slide(1), slide(2)], autoplay: "yes", speed: "5" }), SLIDER_SCRIPT);
      vi.advanceTimersByTime(30000);
      expect(scrollTo).not.toHaveBeenCalled();
      expect(document.querySelector("[data-cr-pause]")!.getAttribute("aria-label")).toBe("Play slideshow");
      document.querySelector<HTMLButtonElement>("[data-cr-next]")!.click();
      expect(scrollTo).toHaveBeenLastCalledWith({ left: expect.any(Number), behavior: "auto" });
    } finally {
      vi.useRealTimers();
    }
  });
  it("Card slider: the back button is marked unavailable at the start", () => {
    vi.spyOn(window, "matchMedia").mockReturnValue({ matches: false } as MediaQueryList);
    run(html("CardSlider", { items: [card("A"), card("B"), card("C")] }), SLIDER_SCRIPT);
    expect(document.querySelector("[data-cr-prev]")!.getAttribute("aria-disabled")).toBe("true");
  });
  it("Lightbox: opens the pressed photo in a dialog, arrow keys go through, closing returns focus", () => {
    const images = [
      { src: "/media/a.jpg", alt: "A desk", caption: "Our desk" },
      { src: "/media/b.jpg", alt: "A lamp", caption: "" },
    ];
    run(html("Gallery", { images }), LIGHTBOX_SCRIPT);
    const dialog = document.querySelector<HTMLDialogElement>("dialog.cr-lightbox")!;
    expect(dialog).toBeTruthy();
    const links = [...document.querySelectorAll<HTMLAnchorElement>("a[data-cr-lightbox]")];
    expect(links[0]!.getAttribute("aria-haspopup")).toBe("dialog");
    links[1]!.focus();
    links[1]!.click();
    expect(dialog.open).toBe(true);
    const img = dialog.querySelector("img")!;
    expect(img.getAttribute("src")).toMatch(/\/media\/b\.jpg$/);
    expect(img.alt).toBe("A lamp");
    expect(dialog.querySelector(".cr-lightbox-count")!.textContent).toBe("2 / 2Photo 2 of 2");
    expect(dialog.querySelector("figcaption")!.hidden).toBe(true);
    dialog.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    expect(img.alt).toBe("A desk");
    expect(dialog.querySelector("figcaption")!.textContent).toBe("Our desk");
    dialog.querySelector<HTMLButtonElement>("[data-x]")!.click();
    expect(dialog.open).toBe(false);
    dialog.dispatchEvent(new Event("close"));
    expect(document.activeElement).toBe(links[1]);
  });
  it("Map: Show map puts the map in the frame only when pressed, with a title", () => {
    run(html("Map", { place: "Crust Bakery", address: "Jakarta", pin: { lat: -6.26, lng: 106.81 } }), VIDEO_EMBED_SCRIPT);
    expect(document.querySelector("iframe")).toBeNull();
    const show = document.querySelector<HTMLAnchorElement>(".cr-map-show")!;
    expect(show.getAttribute("role")).toBe("button");
    show.click();
    const frame = document.querySelector(".cr-map-frame")!;
    const iframe = frame.querySelector("iframe")!;
    expect(frame.children).toHaveLength(1);
    expect(iframe.className).toBe("cr-map-player");
    expect(iframe.title).toBe("Map: Crust Bakery");
    expect(iframe.getAttribute("src")).toContain("https://www.openstreetmap.org/export/embed.html?");
    // The address and Directions stay.
    expect(document.querySelector(".cr-map-directions")).toBeTruthy();
  });
});

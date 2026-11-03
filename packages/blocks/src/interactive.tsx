/**
 * Interactive blocks (F079): Slideshow, Card slider, Tabs and Map, plus the
 * Gallery's lightbox (more-blocks.tsx). Each is plain HTML first: slides and
 * cards sit in a row that scrolls and snaps, every tab's text is on the page
 * under its own heading, the map is a link to OpenStreetMap, a gallery photo
 * is a link to the photo. A small script, added only to pages that use the
 * block (`interactiveTags`), turns on the buttons. CSS: interactive-css.ts.
 */
import type { ComponentConfig } from "@puckeditor/core";
import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { headingTag, paragraphs, vars } from "./block-helpers";
import { Img } from "./media-img";
import { safeUrl } from "./url";

type Editing = { puck?: { isEditing?: boolean } };
type TitleLevel = "h2" | "h3" | "h4";

/** How much each block holds. */
export const interactiveLimits = { slides: 10, cards: 12, tabs: 8 } as const;

const pick = <T extends string>(list: readonly T[], v: unknown, fallback: T): T => (list.includes(v as T) ? (v as T) : fallback);
const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
/** A block id that is safe inside id="" and aria-controls (letters, numbers, dashes). */
const domId = (id: unknown) => (typeof id === "string" && id ? id : "block").replace(/[^A-Za-z0-9_-]/g, "-");

const levelField = {
  type: "select" as const,
  label: "Title level",
  options: [
    { label: "H2", value: "h2" },
    { label: "H3", value: "h3" },
    { label: "H4", value: "h4" },
  ],
};

const Arrow = ({ back }: { back?: boolean }) => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
    <path d={back ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const PauseIcon = () => (
  <svg className="cr-slider-pause-icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
    <path d="M8 5v14M16 5v14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);
const PlayIcon = () => (
  <svg className="cr-slider-play-icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
    <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.6-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" fill="currentColor" />
  </svg>
);

// --- Sliders: the row, its buttons, and the builder's version of the buttons ----------------

/** In the builder the scripts don't run; the buttons move the row themselves. */
function useBuilderRow() {
  const track = useRef<HTMLUListElement>(null);
  const move = (dir: 1 | -1) => {
    const t = track.current;
    const first = t?.children[0] as HTMLElement | undefined;
    if (!t || !first) return;
    t.scrollBy({ left: dir * (first.offsetWidth || t.clientWidth), behavior: "smooth" });
  };
  return { track, move };
}

type ControlsProps = { editing: boolean; count?: number; autoplay?: boolean; move: (dir: 1 | -1) => void; what: string };

/**
 * Previous / next (and pause, when it plays on its own). Hidden in the
 * published HTML until the script runs: without it the row simply scrolls.
 */
function SliderControls({ editing, count, autoplay, move, what }: ControlsProps) {
  return (
    <div className="cr-slider-controls" hidden={!editing}>
      {autoplay ? (
        <button type="button" className="cr-slider-btn cr-slider-pause" data-cr-pause="" aria-label={`Pause ${what}`}>
          <PauseIcon />
          <PlayIcon />
        </button>
      ) : null}
      <button type="button" className="cr-slider-btn" data-cr-prev="" aria-label={`Previous ${what === "slideshow" ? "slide" : "cards"}`} onClick={editing ? () => move(-1) : undefined}>
        <Arrow back />
      </button>
      <button type="button" className="cr-slider-btn" data-cr-next="" aria-label={`Next ${what === "slideshow" ? "slide" : "cards"}`} onClick={editing ? () => move(1) : undefined}>
        <Arrow />
      </button>
      {count ? (
        <p className="cr-slider-count" data-cr-count="" aria-live="polite">
          <span aria-hidden="true">1 / {count}</span>
          <span className="cr-vh">
            Slide 1 of {count}
          </span>
        </p>
      ) : null}
    </div>
  );
}

// --- Slideshow ------------------------------------------------------------------------------

export type Slide = { imageSrc: string; imageAlt: string; title: string; text: string; linkLabel: string; linkHref: string };
export const slideRatios = ["16:9", "3:2", "4:3", "21:9"] as const;
export type SlideRatio = (typeof slideRatios)[number];
export const slideRatioNames: Record<SlideRatio, string> = { "16:9": "Wide (16:9)", "3:2": "Photo (3:2)", "4:3": "Classic (4:3)", "21:9": "Cinema (21:9)" };
export const slideSpeeds = ["5", "8", "12"] as const;
export type SlideSpeed = (typeof slideSpeeds)[number];

export type SlideshowProps = {
  /** What the slideshow shows ("Our rooms"): names it for screen readers. */
  name: string;
  slides: Slide[];
  ratio: SlideRatio;
  /** Plays on its own (never under Reduce motion; a pause button is always there). */
  autoplay: "no" | "yes";
  /** Seconds per slide when it plays on its own. */
  speed: SlideSpeed;
  titleLevel: TitleLevel;
};

const ratioCss = (r: string) => r.replace(":", " / ");

/** The slides to publish: those with a photo, at most ten. */
export const slideList = (slides: unknown, editing = false): Slide[] =>
  (Array.isArray(slides) ? (slides as Slide[]) : []).filter((s) => s && (editing || str(s.imageSrc))).slice(0, interactiveLimits.slides);

/** The slideshow's name for screen readers: "Slideshow: Our rooms". */
export const slideshowLabel = (name: unknown) => (str(name) ? `Slideshow: ${str(name)}` : "Slideshow");

function SlideshowView({ name, slides, ratio, autoplay, speed, titleLevel, puck }: SlideshowProps & Editing) {
  const editing = !!puck?.isEditing;
  const list = slideList(slides, editing);
  const { track, move } = useBuilderRow();
  const Title = headingTag(titleLevel, "h3");
  const auto = autoplay === "yes" && list.length > 1;
  const n = list.length;
  if (!n) return editing ? <div className="cr-image-empty">Add photos to the slideshow</div> : <></>;
  return (
    <section
      className="cr-slideshow cr-slider"
      aria-roledescription="carousel"
      aria-label={slideshowLabel(name)}
      data-cr-slider="slides"
      data-cr-autoplay={auto ? pick(slideSpeeds, speed, "8") : undefined}
      style={vars({ "--cr-slide-ratio": ratioCss(pick(slideRatios, ratio, "16:9")) })}
    >
      {/* Focusable, so the row can be scrolled from the keyboard before the script runs (WCAG 2.1.1). */}
      <ul className="cr-slider-track" role="list" tabIndex={0} ref={track}>
        {list.map((s, i) => {
          const href = str(s.linkHref);
          const words = str(s.title) || str(s.text) || (str(s.linkLabel) && href);
          return (
            <li key={i} className="cr-slide" aria-roledescription="slide" aria-label={`${i + 1} of ${n}`}>
              <figure className="cr-slide-figure">
                {str(s.imageSrc) ? (
                  <Img className="cr-slide-img" src={s.imageSrc} size="full" {...(str(s.imageAlt) ? { alt: str(s.imageAlt) } : {})} {...(i ? { loading: "lazy" as const } : {})} decoding="async" />
                ) : (
                  <div className="cr-image-empty cr-slide-img">Add a photo</div>
                )}
                {words ? (
                  <figcaption className="cr-slide-caption">
                    {str(s.title) ? <Title className="cr-slide-title">{str(s.title)}</Title> : null}
                    {str(s.text) ? <p className="cr-slide-text">{str(s.text)}</p> : null}
                    {str(s.linkLabel) && href ? (
                      <a className="cr-card-link cr-slide-link" href={safeUrl(href)}>
                        {str(s.linkLabel)}
                      </a>
                    ) : null}
                  </figcaption>
                ) : null}
              </figure>
            </li>
          );
        })}
      </ul>
      {n > 1 ? <SliderControls editing={editing} count={n} autoplay={auto} move={move} what="slideshow" /> : null}
    </section>
  );
}

export const Slideshow: ComponentConfig<SlideshowProps> = {
  label: "Slideshow",
  fields: {
    name: { type: "text", label: "What it shows (read out as “Slideshow: …”)" },
    slides: {
      type: "array",
      label: "Slides",
      max: interactiveLimits.slides,
      getItemSummary: (item) => item.title || item.imageAlt || "Slide",
      defaultItemProps: { imageSrc: "", imageAlt: "", title: "", text: "", linkLabel: "", linkHref: "" },
      arrayFields: {
        imageSrc: { type: "text", label: "Photo URL" },
        imageAlt: { type: "text", label: "Alt text (describe the photo)" },
        title: { type: "text", label: "Title (optional)" },
        text: { type: "text", label: "Line under it (optional)" },
        linkLabel: { type: "text", label: "Link text (say where it goes)" },
        linkHref: { type: "text", label: "Link" },
      },
    },
    ratio: { type: "radio", label: "Shape", options: slideRatios.map((r) => ({ label: slideRatioNames[r], value: r })) },
    autoplay: {
      type: "radio",
      label: "Play on its own",
      options: [
        { label: "No", value: "no" },
        { label: "Yes, with a pause button", value: "yes" },
      ],
    },
    speed: {
      type: "radio",
      label: "Each slide shows for",
      options: slideSpeeds.map((s) => ({ label: `${s} seconds`, value: s })),
    },
    titleLevel: levelField,
  },
  defaultProps: {
    name: "",
    slides: [
      { imageSrc: "", imageAlt: "", title: "", text: "", linkLabel: "", linkHref: "" },
      { imageSrc: "", imageAlt: "", title: "", text: "", linkLabel: "", linkHref: "" },
      { imageSrc: "", imageAlt: "", title: "", text: "", linkLabel: "", linkHref: "" },
    ],
    ratio: "16:9",
    autoplay: "no",
    speed: "8",
    titleLevel: "h3",
  },
  render: (props) => <SlideshowView {...(props as SlideshowProps & Editing)} />,
};

// --- Card slider ----------------------------------------------------------------------------

export type SliderCard = { title: string; text: string; imageSrc: string; imageAlt: string; linkLabel: string; linkHref: string };
export const sliderVisible = ["2", "3", "4"] as const;
export type CardSliderProps = {
  /** What the cards are ("This season"): names the row for screen readers. */
  name: string;
  items: SliderCard[];
  /** Cards visible at once on a desktop (plus a peek of the next). */
  visible: (typeof sliderVisible)[number];
  titleLevel: TitleLevel;
  background: "background" | "surface" | "primary";
};

export const cardSliderLabel = (name: unknown) => (str(name) ? `Cards: ${str(name)}` : "Cards");

function CardSliderView({ name, items, visible, titleLevel, background, puck }: CardSliderProps & Editing) {
  const editing = !!puck?.isEditing;
  const list = (Array.isArray(items) ? items : []).slice(0, interactiveLimits.cards);
  const { track, move } = useBuilderRow();
  const Title = headingTag(titleLevel, "h3");
  const bg = pick(["background", "surface", "primary"] as const, background, "surface");
  if (!list.length) return editing ? <div className="cr-image-empty">Add cards to the slider</div> : <></>;
  return (
    <section
      className="cr-card-slider cr-slider"
      aria-roledescription="carousel"
      aria-label={cardSliderLabel(name)}
      data-cr-slider="cards"
      style={vars({ "--cr-slider-visible": pick(sliderVisible, visible, "3") })}
    >
      {/* The buttons come first: they sit above the row, on the right (snapshot choice 2, A). */}
      {list.length > 1 ? <SliderControls editing={editing} move={move} what="cards" /> : null}
      <ul className="cr-slider-track" role="list" tabIndex={0} ref={track}>
        {list.map((c, i) => (
          <li key={i} className="cr-slide">
            <article className={`cr-card cr-bg-${bg}`}>
              {str(c.imageSrc) ? <Img className="cr-card-media" src={c.imageSrc} size="third" {...(str(c.imageAlt) ? { alt: str(c.imageAlt) } : {})} loading="lazy" decoding="async" /> : null}
              <div className="cr-card-body">
                {str(c.title) ? <Title className="cr-heading cr-card-title">{str(c.title)}</Title> : null}
                {str(c.text) ? <div className="cr-text">{paragraphs(str(c.text))}</div> : null}
                {str(c.linkLabel) && str(c.linkHref) ? (
                  <a className="cr-card-link" href={safeUrl(str(c.linkHref))}>
                    {str(c.linkLabel)}
                  </a>
                ) : null}
              </div>
            </article>
          </li>
        ))}
      </ul>
    </section>
  );
}

export const CardSlider: ComponentConfig<CardSliderProps> = {
  label: "Card slider",
  fields: {
    name: { type: "text", label: "What the cards are (read out as “Cards: …”)" },
    items: {
      type: "array",
      label: "Cards",
      max: interactiveLimits.cards,
      getItemSummary: (item) => item.title || "Card",
      defaultItemProps: { title: "Card title", text: "A short description.", imageSrc: "", imageAlt: "", linkLabel: "", linkHref: "" },
      arrayFields: {
        title: { type: "text", label: "Title" },
        text: { type: "textarea", label: "Text" },
        imageSrc: { type: "text", label: "Image URL (optional)" },
        imageAlt: { type: "text", label: "Image alt text (describe the image)" },
        linkLabel: { type: "text", label: "Link text (say where it goes)" },
        linkHref: { type: "text", label: "Link" },
      },
    },
    visible: { type: "radio", label: "Cards in view (desktop)", options: sliderVisible.map((v) => ({ label: v, value: v })) },
    titleLevel: levelField,
    background: {
      type: "select",
      label: "Card background",
      options: [
        { label: "Page", value: "background" },
        { label: "Surface", value: "surface" },
        { label: "Primary", value: "primary" },
      ],
    },
  },
  defaultProps: {
    name: "",
    items: [
      { title: "First", text: "A short description.", imageSrc: "", imageAlt: "", linkLabel: "", linkHref: "" },
      { title: "Second", text: "A short description.", imageSrc: "", imageAlt: "", linkLabel: "", linkHref: "" },
      { title: "Third", text: "A short description.", imageSrc: "", imageAlt: "", linkLabel: "", linkHref: "" },
      { title: "Fourth", text: "A short description.", imageSrc: "", imageAlt: "", linkLabel: "", linkHref: "" },
    ],
    visible: "3",
    titleLevel: "h3",
    background: "surface",
  },
  render: (props) => <CardSliderView {...(props as CardSliderProps & Editing)} />,
};

// --- Tabs -----------------------------------------------------------------------------------

export type TabItem = { label: string; text: string };
export const tabLooks = ["underline", "pills", "side"] as const;
export type TabLook = (typeof tabLooks)[number];
export const tabLookNames: Record<TabLook, string> = { underline: "Underline", pills: "Pills", side: "Side (left on desktop)" };
export type TabsProps = { tabs: TabItem[]; look: TabLook; titleLevel: TitleLevel };

/** The tabs to publish: those with a name, at most eight. */
export const tabList = (tabs: unknown): TabItem[] =>
  (Array.isArray(tabs) ? tabs : [])
    .map((t) => ({ label: str(t?.label), text: typeof t?.text === "string" ? t.text : "" }))
    .filter((t) => t.label)
    .slice(0, interactiveLimits.tabs);

function TabsView({ id, tabs, look, titleLevel, puck }: TabsProps & Editing & { id?: string }) {
  const editing = !!puck?.isEditing;
  const list = tabList(tabs);
  const [open, setOpen] = useState(0);
  const Title = headingTag(titleLevel, "h3");
  const base = domId(id);
  const kind = pick(tabLooks, look, "underline");
  if (!list.length) return editing ? <div className="cr-image-empty">Add tabs</div> : <></>;
  const active = Math.min(open, list.length - 1);
  // The builder shows the working tabs (React); the published page shows every
  // text under its heading until TABS_SCRIPT turns the list on.
  const onKey = (e: KeyboardEvent, i: number) => {
    const n = list.length;
    const j = e.key === "ArrowRight" || e.key === "ArrowDown" ? (i + 1) % n : e.key === "ArrowLeft" || e.key === "ArrowUp" ? (i - 1 + n) % n : e.key === "Home" ? 0 : e.key === "End" ? n - 1 : -1;
    if (j < 0) return;
    e.preventDefault();
    setOpen(j);
    (e.currentTarget.parentElement?.children[j] as HTMLElement | undefined)?.focus();
  };
  return (
    <div className={`cr-tabs cr-tabs-${kind}${editing ? " cr-tabs-ready" : ""}`} data-cr-tabs="">
      <div className="cr-tab-list" role="tablist" aria-orientation={kind === "side" ? "vertical" : "horizontal"} hidden={!editing}>
        {list.map((t, i) => (
          <button
            key={i}
            type="button"
            role="tab"
            className="cr-tab"
            id={`${base}-tab-${i + 1}`}
            aria-controls={`${base}-panel-${i + 1}`}
            aria-selected={editing ? i === active : i === 0}
            tabIndex={(editing ? i === active : i === 0) ? 0 : -1}
            onClick={editing ? () => setOpen(i) : undefined}
            onKeyDown={editing ? (e) => onKey(e, i) : undefined}
          >
            {t.label}
          </button>
        ))}
      </div>
      {list.map((t, i) => (
        <div
          key={i}
          className="cr-tab-panel"
          id={`${base}-panel-${i + 1}`}
          {...(editing ? { role: "tabpanel", "aria-labelledby": `${base}-tab-${i + 1}`, tabIndex: 0, hidden: i !== active } : {})}
        >
          <Title className="cr-tab-title" hidden={editing}>
            {t.label}
          </Title>
          <div className="cr-text">{paragraphs(t.text)}</div>
        </div>
      ))}
    </div>
  );
}

export const Tabs: ComponentConfig<TabsProps> = {
  label: "Tabs",
  fields: {
    tabs: {
      type: "array",
      label: "Tabs",
      max: interactiveLimits.tabs,
      getItemSummary: (item) => item.label || "Tab",
      defaultItemProps: { label: "Tab", text: "What this tab says." },
      arrayFields: {
        label: { type: "text", label: "Tab name (short)" },
        text: { type: "textarea", label: "Text (a blank line starts a new paragraph)" },
      },
    },
    look: { type: "radio", label: "Look", options: tabLooks.map((l) => ({ label: tabLookNames[l], value: l })) },
    titleLevel: { ...levelField, label: "Heading level (used when the page is read without tabs)" },
  },
  defaultProps: {
    tabs: [
      { label: "Weddings", text: "From the first call to the last dance: one planner, one plan." },
      { label: "Events", text: "Launches, dinners and parties for 20 to 200 guests." },
      { label: "Workshops", text: "Half-day sessions for teams, held in our studio." },
    ],
    look: "underline",
    titleLevel: "h3",
  },
  render: (props) => <TabsView {...(props as TabsProps & Editing & { id?: string })} />,
};

// --- Map ------------------------------------------------------------------------------------

export type MapPin = { lat: number; lng: number };
export const mapZooms = ["street", "area", "city"] as const;
export type MapZoom = (typeof mapZooms)[number];
export const mapZoomNames: Record<MapZoom, string> = { street: "Street", area: "Neighbourhood", city: "City" };
export const mapRatios = ["16:9", "4:3", "1:1", "21:9"] as const;
export type MapRatio = (typeof mapRatios)[number];
export const mapRatioNames: Record<MapRatio, string> = { "16:9": "Wide (16:9)", "4:3": "Classic (4:3)", "1:1": "Square", "21:9": "Strip (21:9)" };

export type MapProps = {
  /** The place's name ("Crust Bakery"), shown above the address. */
  place: string;
  /** The address in words: always shown, and used for Directions. */
  address: string;
  /** Where the pin goes (found in the builder from the address, or read from a maps link). */
  pin?: MapPin | null;
  zoom: MapZoom;
  ratio: MapRatio;
  /** A photo of the place shown before the map loads, instead of the drawn map (optional). */
  imageSrc: string;
};

const round6 = (n: number) => Math.round(n * 1e6) / 1e6;

/** A pin that can be used: finite numbers in range, rounded to six decimals (about 10 cm). */
export function cleanPin(v: unknown): MapPin | null {
  if (typeof v !== "object" || v === null) return null;
  const lat = Number((v as MapPin).lat);
  const lng = Number((v as MapPin).lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  if (lat === 0 && lng === 0) return null;
  return { lat: round6(lat), lng: round6(lng) };
}

const NUM = "(-?\\d{1,3}(?:\\.\\d+)?)";

/**
 * The pin in a pasted Google Maps, Apple Maps or OpenStreetMap link, or in
 * plain "lat, lng". A Google place link's own pin (!3d…!4d…) wins over the
 * map's centre (@…).
 */
export function pinFromText(text: unknown): MapPin | null {
  if (typeof text !== "string") return null;
  const s = text.trim();
  let raw = s;
  try {
    raw = decodeURIComponent(s);
  } catch {
    // keep as is
  }
  const tries: RegExp[] = [
    new RegExp(`!3d${NUM}!4d${NUM}`),
    new RegExp(`[?&]mlat=${NUM}&mlon=${NUM}`),
    new RegExp(`[?&](?:q|query|ll|sll|destination|daddr|center)=${NUM},\\s*${NUM}`),
    new RegExp(`@${NUM},${NUM}`),
    new RegExp(`#map=\\d{1,2}/${NUM}/${NUM}`),
    new RegExp(`^${NUM}\\s*[,\\s]\\s*${NUM}$`),
  ];
  for (const re of tries) {
    const m = re.exec(raw);
    if (m) {
      const pin = cleanPin({ lat: Number(m[1]), lng: Number(m[2]) });
      if (pin) return pin;
    }
  }
  return null;
}

const zoomLevel: Record<MapZoom, number> = { street: 17, area: 15, city: 12 };
/** Half the map's width in degrees of longitude at each zoom (for OpenStreetMap's box). */
const zoomSpan: Record<MapZoom, number> = { street: 0.004, area: 0.015, city: 0.12 };

/** OpenStreetMap's embeddable map around the pin, with a marker. Loaded only when pressed. */
export function mapEmbedUrl(pin: MapPin, zoom: MapZoom = "street"): string {
  const dx = zoomSpan[zoom];
  const dy = dx * Math.cos((pin.lat * Math.PI) / 180) * 0.6;
  const box = [pin.lng - dx, pin.lat - dy, pin.lng + dx, pin.lat + dy].map((n) => round6(n)).join(",");
  return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(box)}&layer=mapnik&marker=${pin.lat}%2C${pin.lng}`;
}

/** The map on openstreetmap.org: where "Show map" goes without JavaScript. */
export const mapPageUrl = (pin: MapPin, zoom: MapZoom = "street") =>
  `https://www.openstreetmap.org/?mlat=${pin.lat}&mlon=${pin.lng}#map=${zoomLevel[zoom]}/${pin.lat}/${pin.lng}`;

/** Directions in the visitor's maps app (Google Maps' documented link; opens the app on phones). */
export function directionsUrl(address: string, pin: MapPin | null): string | null {
  const to = pin ? `${pin.lat},${pin.lng}` : address.trim();
  return to ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(to)}` : null;
}

const PinMark = () => (
  <svg className="cr-map-pin" viewBox="0 0 24 24" width="36" height="36" aria-hidden="true" focusable="false">
    <path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z" fill="currentColor" />
    <circle cx="12" cy="10" r="2.6" fill="#fff" />
  </svg>
);

export const MapBlock: ComponentConfig<MapProps> = {
  label: "Map",
  fields: {
    place: { type: "text", label: "Place name (optional)" },
    address: { type: "textarea", label: "Address (shown on the page, and used for directions)" },
    pin: { type: "custom", label: "Map pin", render: () => <></> },
    zoom: { type: "radio", label: "Zoom", options: mapZooms.map((z) => ({ label: mapZoomNames[z], value: z })) },
    ratio: { type: "radio", label: "Shape", options: mapRatios.map((r) => ({ label: mapRatioNames[r], value: r })) },
    imageSrc: { type: "text", label: "Photo of the place URL (optional, shown before the map)" },
  },
  defaultProps: { place: "", address: "", pin: null, zoom: "street", ratio: "16:9", imageSrc: "" },
  render: ({ place, address, pin, zoom, ratio, imageSrc, puck }: MapProps & Editing) => {
    const where = cleanPin(pin);
    const name = str(place);
    const lines = str(address)
      .split(/\n|,\s*(?=\S)/)
      .map((l) => l.trim())
      .filter(Boolean);
    const z = pick(mapZooms, zoom, "street");
    const directions = directionsUrl(str(address) || name, where);
    const editing = !!puck?.isEditing;
    if (!where && !lines.length && !name) return editing ? <div className="cr-image-empty">Type the address, then press Find on the map</div> : <></>;
    const label = name || lines[0] || "the place";
    let frame: ReactNode = null;
    if (where || editing) {
      const cover = str(imageSrc);
      frame = (
        <div className={`cr-map-frame${cover ? "" : " cr-map-drawn"}`} data-cr-embed-box="">
          {cover ? <Img className="cr-map-cover" src={cover} alt="" loading="lazy" decoding="async" /> : <PinMark />}
          {where ? (
            // MAP: a link to the map; VIDEO_EMBED_SCRIPT swaps the map in when pressed.
            <a
              className="cr-button cr-button-primary cr-map-show"
              href={mapPageUrl(where, z)}
              data-cr-embed={mapEmbedUrl(where, z)}
              data-cr-embed-title={`Map: ${label}`}
              data-cr-embed-class="cr-map-player"
            >
              Show map<span className="cr-vh">: {label}</span>
            </a>
          ) : (
            <span className="cr-map-missing">Press Find on the map in the panel to place the pin</span>
          )}
        </div>
      );
    }
    return (
      <figure className="cr-map" style={vars({ "--cr-map-ratio": ratioCss(pick(mapRatios, ratio, "16:9")) })}>
        {frame}
        <figcaption className="cr-map-info">
          <address className="cr-map-address">
            {name ? <strong className="cr-map-place">{name}</strong> : null}
            {lines.map((l, i) => (
              <span key={i} className="cr-map-line">
                {l}
              </span>
            ))}
          </address>
          {directions ? (
            <a className="cr-card-link cr-map-directions" href={directions}>
              Directions<span className="cr-vh"> to {label}</span>
            </a>
          ) : null}
        </figcaption>
      </figure>
    );
  },
};

/** Whether a page's blocks hold a Map with a pin, so the page needs the press-to-load script. */
export const hasMapEmbed = (value: unknown): boolean => someBlock(value, (type, props) => type === "Map" && !!cleanPin(props.pin));

// --- Which pages get which script ------------------------------------------------------------

function someBlock(value: unknown, test: (type: string, props: Record<string, unknown>) => boolean): boolean {
  if (Array.isArray(value)) return value.some((v) => someBlock(v, test));
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  if (typeof v.type === "string" && v.props && typeof v.props === "object" && test(v.type, v.props as Record<string, unknown>)) return true;
  return Object.values(v).some((x) => someBlock(x, test));
}

const many = (v: unknown, min: number) => Array.isArray(v) && v.length >= min;

/** Which interactive scripts a page's blocks need. */
export function interactiveNeeds(puck: unknown) {
  return {
    slider: someBlock(puck, (t, p) => (t === "Slideshow" && slideList(p.slides).length > 1) || (t === "CardSlider" && many(p.items, 2))),
    tabs: someBlock(puck, (t, p) => t === "Tabs" && tabList(p.tabs).length > 0),
    lightbox: someBlock(puck, (t, p) => t === "Gallery" && p.lightbox === "yes" && many(p.images, 1)),
  };
}

/**
 * Slideshow and Card slider: shows the buttons, keeps "2 / 5" and the ends
 * up to date as the row scrolls (also by swiping), and plays a slideshow on
 * its own only when asked, never under Reduce motion, pausing while the
 * pointer or keyboard is inside and whenever the pause button says so.
 */
export const SLIDER_SCRIPT = `const rm=matchMedia("(prefers-reduced-motion: reduce)");
for(const s of document.querySelectorAll("[data-cr-slider]")){
const t=s.querySelector(".cr-slider-track"),c=s.querySelector(".cr-slider-controls");if(!t||!c)continue;
const items=[...t.children],n=items.length;if(n<2)continue;
c.hidden=false;s.classList.add("cr-slider-ready");
const prev=s.querySelector("[data-cr-prev]"),next=s.querySelector("[data-cr-next]"),count=s.querySelector("[data-cr-count]"),pause=s.querySelector("[data-cr-pause]"),wrap=s.dataset.crSlider==="slides";
const left=i=>items[i].offsetLeft-items[0].offsetLeft;
const at=()=>{let b=0,d=1/0;items.forEach((_,i)=>{const e=Math.abs(left(i)-t.scrollLeft);if(e<d){d=e;b=i}});return b};
const end=()=>t.scrollLeft+t.clientWidth>=t.scrollWidth-2;
const go=i=>{i=wrap?(i+n)%n:Math.max(0,Math.min(n-1,i));t.scrollTo({left:left(i),behavior:rm.matches?"auto":"smooth"})};
const show=()=>{const i=at();if(count){count.firstElementChild.textContent=(i+1)+" / "+n;count.lastElementChild.textContent="Slide "+(i+1)+" of "+n}
if(!wrap){prev.setAttribute("aria-disabled",String(t.scrollLeft<2));next.setAttribute("aria-disabled",String(end()))}};
let h=0;t.addEventListener("scroll",()=>{clearTimeout(h);h=setTimeout(show,90)},{passive:true});addEventListener("resize",show);
const off=b=>b.getAttribute("aria-disabled")==="true";
prev.addEventListener("click",()=>{if(!off(prev))go(at()-1)});next.addEventListener("click",()=>{if(!off(next))go(at()+1)});
const sec=Number(s.dataset.crAutoplay)||0;let timer=0,stopped=!sec||rm.matches,hold=false;
const tick=()=>{clearInterval(timer);timer=0;if(!stopped&&!hold)timer=setInterval(()=>go(at()+1),sec*1000);if(count)count.setAttribute("aria-live",timer?"off":"polite")};
if(pause){const label=()=>{pause.setAttribute("aria-label",(stopped?"Play":"Pause")+" slideshow");pause.classList.toggle("cr-is-paused",stopped)};
pause.addEventListener("click",()=>{stopped=!stopped;label();tick()});label()}
s.addEventListener("pointerenter",()=>{hold=true;tick()});s.addEventListener("pointerleave",()=>{hold=false;tick()});
s.addEventListener("focusin",()=>{hold=true;tick()});s.addEventListener("focusout",e=>{if(!s.contains(e.relatedTarget)){hold=false;tick()}});
show();tick()}`;

/**
 * Tabs (the WAI-ARIA tabs pattern): shows the tab list, hides the headings
 * that stood in for it, shows one text at a time. Arrow keys move between
 * tabs (Up/Down for the side look), Home and End jump.
 */
export const TABS_SCRIPT = `for(const w of document.querySelectorAll("[data-cr-tabs]")){
const list=w.querySelector("[role=tablist]");if(!list)continue;
const tabs=[...list.querySelectorAll("[role=tab]")],panels=tabs.map(t=>document.getElementById(t.getAttribute("aria-controls")));
if(!tabs.length||panels.some(p=>!p))continue;
const v=list.getAttribute("aria-orientation")==="vertical";
list.hidden=false;w.classList.add("cr-tabs-ready");
panels.forEach((p,i)=>{p.setAttribute("role","tabpanel");p.setAttribute("aria-labelledby",tabs[i].id);p.tabIndex=0;const h=p.querySelector(".cr-tab-title");if(h)h.hidden=true});
const pick=(i,f)=>{tabs.forEach((t,j)=>{const on=i===j;t.setAttribute("aria-selected",String(on));t.tabIndex=on?0:-1;panels[j].hidden=!on});if(f)tabs[i].focus()};
tabs.forEach((t,i)=>{t.addEventListener("click",()=>pick(i,false));
t.addEventListener("keydown",e=>{const n=tabs.length,k=e.key,fw=v?"ArrowDown":"ArrowRight",bw=v?"ArrowUp":"ArrowLeft";
const j=k===fw?(i+1)%n:k===bw?(i-1+n)%n:k==="Home"?0:k==="End"?n-1:-1;if(j>=0){e.preventDefault();pick(j,true)}})});
const hit=panels.findIndex(p=>location.hash==="#"+p.id);pick(hit<0?0:hit,false)}`;

/**
 * The Gallery's lightbox: a real <dialog> with the photo, its description
 * and caption, "3 / 12", previous/next and close. Esc closes it (the
 * browser does that), arrow keys go through the photos, focus goes back to
 * the photo that was pressed. Without the script a photo opens on its own.
 */
export const LIGHTBOX_SCRIPT = `const links=[...document.querySelectorAll("a[data-cr-lightbox]")];
if(links.length){const svg=p=>'<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false"><path d="'+p+'" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const d=document.createElement("dialog");d.className="cr-lightbox";d.setAttribute("aria-label","Photos");
d.innerHTML='<div class="cr-lightbox-bar"><p class="cr-lightbox-count" aria-live="polite"><span aria-hidden="true"></span><span class="cr-vh"></span></p><button type="button" class="cr-lightbox-btn" data-x aria-label="Close">'+svg("M6 6l12 12M18 6L6 18")+'</button></div><figure class="cr-lightbox-figure"><img alt=""><figcaption></figcaption></figure><button type="button" class="cr-lightbox-btn cr-lightbox-prev" data-p aria-label="Previous photo">'+svg("M15 5l-7 7 7 7")+'</button><button type="button" class="cr-lightbox-btn cr-lightbox-next" data-n aria-label="Next photo">'+svg("M9 5l7 7-7 7")+'</button>';
document.body.append(d);
const img=d.querySelector("img"),cap=d.querySelector("figcaption"),count=d.querySelector(".cr-lightbox-count"),bp=d.querySelector("[data-p]"),bn=d.querySelector("[data-n]");
let group=[],i=0,opener=null;
const show=()=>{const a=group[i],im=a.querySelector("img"),c=a.closest("figure")?.querySelector("figcaption");img.src=a.href;img.alt=im?im.alt:"";cap.textContent=c?c.textContent:"";cap.hidden=!c;
count.firstElementChild.textContent=(i+1)+" / "+group.length;count.lastElementChild.textContent="Photo "+(i+1)+" of "+group.length;bp.hidden=bn.hidden=group.length<2};
const step=k=>{i=(i+k+group.length)%group.length;show()};
links.forEach(a=>{a.setAttribute("aria-haspopup","dialog");a.addEventListener("click",e=>{if(e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;e.preventDefault();
const g=a.closest("[data-cr-gallery]");group=g?[...g.querySelectorAll("a[data-cr-lightbox]")]:[a];i=Math.max(0,group.indexOf(a));opener=a;show();d.showModal()})});
bp.onclick=()=>step(-1);bn.onclick=()=>step(1);d.querySelector("[data-x]").onclick=()=>d.close();
d.addEventListener("keydown",e=>{if(e.key==="ArrowLeft"){e.preventDefault();step(-1)}else if(e.key==="ArrowRight"){e.preventDefault();step(1)}});
d.addEventListener("click",e=>{if(e.target===d)d.close()});
d.addEventListener("close",()=>{img.removeAttribute("src");if(opener)opener.focus()})}`;

/** The script tags a page needs for its interactive blocks (none for pages without them). */
export function interactiveTags(puck: unknown): string {
  const need = interactiveNeeds(puck);
  const tag = (js: string) => `<script type="module">${js}</script>\n`;
  return (need.slider ? tag(SLIDER_SCRIPT) : "") + (need.tabs ? tag(TABS_SCRIPT) : "") + (need.lightbox ? tag(LIGHTBOX_SCRIPT) : "");
}

export const interactiveBlocks = { Slideshow, CardSlider, Tabs, Map: MapBlock };

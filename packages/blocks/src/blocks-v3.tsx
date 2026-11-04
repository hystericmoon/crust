/**
 * Stats, Video, Table and Pricing blocks (F078). Plain HTML and CSS; only a
 * YouTube or Vimeo video adds a small script (VIDEO_EMBED_SCRIPT), and only
 * on pages that have one. The Icon list's numbered look lives with the Icon
 * list (more-blocks.tsx). CSS: blocks-v3-css.ts.
 */
import type { ComponentConfig } from "@puckeditor/core";
import { alignField, headingTag, vars, type Align } from "./block-helpers";
import { Img } from "./media-img";
import { videoAddress, videoType } from "./sections-v2";
import { sectionStyleIds, sectionStyleNames, type SectionStyleId } from "./section-styles";
import { safeUrl } from "./url";

type Editing = { puck?: { isEditing?: boolean } };
type TitleLevel = "h2" | "h3" | "h4";

/** How much each block holds. */
export const blocksV3Limits = { stats: 6, plans: 4, tableRows: 50, tableColumns: 8, tableCell: 300 } as const;

// --- Stats --------------------------------------------------------------------------------

export type StatItem = { value: string; label: string; detail: string };
export const statLooks = ["plain", "lines", "boxes"] as const;
export type StatLook = (typeof statLooks)[number];
export const statLookNames: Record<StatLook, string> = { plain: "Plain", lines: "Lines between", boxes: "Boxes" };
export type StatsProps = { items: StatItem[]; look: StatLook; size: "md" | "lg"; colour: "text" | "primary"; align: Align };

const pick = <T extends string>(list: readonly T[], v: unknown, fallback: T): T => (list.includes(v as T) ? (v as T) : fallback);
const str = (v: unknown) => (typeof v === "string" ? v : "");

/** The figures to show: those with a value, at most six. */
export const statItems = (items: unknown): StatItem[] =>
  (Array.isArray(items) ? items : [])
    .map((it) => ({ value: str(it?.value).trim(), label: str(it?.label).trim(), detail: str(it?.detail).trim() }))
    .filter((it) => it.value)
    .slice(0, blocksV3Limits.stats);

export const Stats: ComponentConfig<StatsProps> = {
  label: "Stats",
  fields: {
    items: {
      type: "array",
      label: "Figures",
      max: blocksV3Limits.stats,
      getItemSummary: (item) => [item.value, item.label].filter(Boolean).join(" ") || "Figure",
      defaultItemProps: { value: "100%", label: "What it counts", detail: "" },
      arrayFields: {
        value: { type: "text", label: "Figure (e.g. 1,200+ or €0)" },
        label: { type: "text", label: "What it counts" },
        detail: { type: "text", label: "Extra line (optional)" },
      },
    },
    look: { type: "radio", label: "Look", options: statLooks.map((l) => ({ label: statLookNames[l], value: l })) },
    size: {
      type: "radio",
      label: "Size",
      options: [
        { label: "Medium", value: "md" },
        { label: "Large", value: "lg" },
      ],
    },
    colour: {
      type: "radio",
      label: "Figure colour",
      options: [
        { label: "Text", value: "text" },
        { label: "Accent", value: "primary" },
      ],
    },
    align: alignField,
  },
  defaultProps: {
    items: [
      { value: "12", label: "years of practice", detail: "" },
      { value: "300+", label: "projects finished", detail: "" },
      { value: "4.9", label: "average review", detail: "" },
    ],
    look: "lines",
    size: "md",
    colour: "text",
    align: "left",
  },
  render: ({ items, look, size, colour, align }) => {
    const list = statItems(items);
    const classes = [
      "cr-stats",
      `cr-stats-${pick(statLooks, look, "plain")}`,
      `cr-stats-${size === "lg" ? "lg" : "md"}`,
      `cr-stats-colour-${colour === "primary" ? "primary" : "text"}`,
      `cr-align-${pick(["left", "center", "right"] as const, align, "left")}`,
    ];
    // One list item per figure: the figure and its words are read together ("300+ projects finished").
    return (
      <ul className={classes.join(" ")} role="list" style={vars({ "--cr-stats-count": String(Math.max(1, list.length)) })}>
        {list.map((it, i) => (
          <li key={i} className="cr-stat">
            <span className="cr-stat-value">{it.value}</span>
            {it.label ? <span className="cr-stat-label"> {it.label}</span> : null}
            {it.detail ? <span className="cr-stat-detail"> {it.detail}</span> : null}
          </li>
        ))}
      </ul>
    );
  },
};

// --- Video --------------------------------------------------------------------------------

export type VideoSource =
  | { kind: "file"; url: string }
  | { kind: "youtube"; id: string; start: number }
  | { kind: "vimeo"; id: string; hash: string };

export const videoRatios = ["16:9", "4:3", "1:1", "9:16"] as const;
export type VideoRatio = (typeof videoRatios)[number];
export const videoRatioNames: Record<VideoRatio, string> = { "16:9": "Wide (16:9)", "4:3": "Classic (4:3)", "1:1": "Square", "9:16": "Upright (9:16)" };

export type VideoProps = {
  /** A YouTube or Vimeo link, or an .mp4/.webm address (https:// or on the site). */
  src: string;
  /** What the video is: names the play button ("Play video: …") and the player. */
  title: string;
  /** The cover photo shown before it plays (optional). */
  imageSrc: string;
  /** A captions file (.vtt) for an .mp4/.webm video. */
  captionsSrc: string;
  caption: string;
  ratio: VideoRatio;
};

const YOUTUBE_HOSTS = new Set(["youtube.com", "m.youtube.com", "youtube-nocookie.com", "music.youtube.com"]);
const VIMEO_HOSTS = new Set(["vimeo.com", "player.vimeo.com"]);
const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

/** "1m30s", "90", "90s" → seconds (YouTube's t= parameter). */
function startSeconds(t: string | null): number {
  if (!t) return 0;
  if (/^\d+$/.test(t)) return Number(t);
  const m = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(t);
  return m && t ? Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0) : 0;
}

/**
 * What a pasted video address is: a file the site serves (or another https://
 * address), a YouTube video or a Vimeo video. Anything else is null.
 * "youtube.com/watch?v=…" without https:// is accepted, as people paste it.
 */
export function videoSourceOf(src: unknown): VideoSource | null {
  if (typeof src !== "string" || !src.trim()) return null;
  let raw = src.trim();
  if (/^(?:www\.|m\.)?(?:youtube\.com|youtu\.be|vimeo\.com)\//i.test(raw)) raw = `https://${raw}`;
  const file = videoAddress(raw);
  if (file) return { kind: "file", url: file };
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.username || url.password || url.port) return null;
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  const parts = url.pathname.split("/").filter(Boolean);
  if (host === "youtu.be" || YOUTUBE_HOSTS.has(host)) {
    let id = "";
    if (host === "youtu.be") id = parts[0] ?? "";
    else if (parts[0] === "watch") id = url.searchParams.get("v") ?? "";
    else if (["embed", "shorts", "live", "v"].includes(parts[0] ?? "")) id = parts[1] ?? "";
    if (!YOUTUBE_ID.test(id)) return null;
    return { kind: "youtube", id, start: startSeconds(url.searchParams.get("t") ?? url.searchParams.get("start")) };
  }
  if (VIMEO_HOSTS.has(host)) {
    const rest = host === "player.vimeo.com" ? (parts[0] === "video" ? parts.slice(1) : []) : parts;
    const id = rest[0] ?? "";
    if (!/^\d{1,12}$/.test(id)) return null;
    // Unlisted videos carry a hash: vimeo.com/123/abc or ?h=abc.
    const hash = rest[1] ?? url.searchParams.get("h") ?? "";
    return { kind: "vimeo", id, hash: /^[A-Za-z0-9]{1,40}$/.test(hash) ? hash : "" };
  }
  return null;
}

export const videoServiceName = (s: VideoSource) => (s.kind === "youtube" ? "YouTube" : s.kind === "vimeo" ? "Vimeo" : "");

/**
 * The player address, loaded only after the press: YouTube's no-cookie
 * player and Vimeo with "do not track", starting at once, captions on.
 */
export function videoEmbedUrl(s: VideoSource): string | null {
  if (s.kind === "youtube") return `https://www.youtube-nocookie.com/embed/${s.id}?autoplay=1&rel=0&cc_load_policy=1${s.start ? `&start=${s.start}` : ""}`;
  if (s.kind === "vimeo") return `https://player.vimeo.com/video/${s.id}?autoplay=1&dnt=1${s.hash ? `&h=${s.hash}` : ""}`;
  return null;
}

/** Where the play button goes without JavaScript: the video's own page. */
export function videoWatchUrl(s: VideoSource): string | null {
  if (s.kind === "youtube") return `https://www.youtube.com/watch?v=${s.id}${s.start ? `&t=${s.start}s` : ""}`;
  if (s.kind === "vimeo") return `https://vimeo.com/${s.id}${s.hash ? `/${s.hash}` : ""}`;
  return null;
}

/** A captions file's address (.vtt, https:// or on the site), or null. */
export function captionsAddress(src: unknown): string | null {
  if (typeof src !== "string" || !src.trim()) return null;
  const url = safeUrl(src.trim());
  if (url === "#" || !(url.startsWith("https://") || (url.startsWith("/") && !url.startsWith("//")))) return null;
  return /\.vtt(?:[?#].*)?$/i.test(url) ? url : null;
}

const ratioCss: Record<VideoRatio, string> = { "16:9": "16 / 9", "4:3": "4 / 3", "1:1": "1 / 1", "9:16": "9 / 16" };

/** The play button's words: "Play video: Our bakery". */
export const playLabel = (title: string) => (title.trim() ? `Play video: ${title.trim()}` : "Play video");

const PlayIcon = () => (
  <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true" focusable="false">
    <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.6-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" fill="currentColor" />
  </svg>
);

export const Video: ComponentConfig<VideoProps> = {
  label: "Video",
  fields: {
    src: { type: "text", label: "Video (YouTube or Vimeo link, or an .mp4 address)" },
    title: { type: "text", label: "What the video is (read out as “Play video: …”)" },
    imageSrc: { type: "text", label: "Cover photo URL (shown before it plays)" },
    captionsSrc: { type: "text", label: "Captions file (.vtt, for .mp4 videos)" },
    caption: { type: "text", label: "Caption under the video (optional)" },
    ratio: { type: "radio", label: "Shape", options: videoRatios.map((r) => ({ label: videoRatioNames[r], value: r })) },
  },
  defaultProps: { src: "", title: "", imageSrc: "", captionsSrc: "", caption: "", ratio: "16:9" },
  render: ({ src, title, imageSrc, captionsSrc, caption, ratio, puck }: VideoProps & Editing) => {
    const source = videoSourceOf(src);
    const name = str(title).trim();
    const style = vars({ "--cr-video-ratio": ratioCss[pick(videoRatios, ratio, "16:9")] });
    const cover = str(imageSrc).trim();
    const figcaption = str(caption).trim() ? <figcaption>{str(caption).trim()}</figcaption> : null;
    if (!source) {
      return puck?.isEditing ? (
        <figure className="cr-video" style={style}>
          <div className="cr-video-frame cr-video-empty">Paste a YouTube or Vimeo link, or a video file address (.mp4)</div>
        </figure>
      ) : (
        <></>
      );
    }
    if (source.kind === "file") {
      const captions = captionsAddress(captionsSrc);
      // The browser's own player: nothing downloads until play is pressed (preload="none").
      return (
        <figure className="cr-video" style={style}>
          <div className="cr-video-frame">
            <video className="cr-video-file" controls preload="none" playsInline {...(cover ? { poster: safeUrl(cover) } : {})} {...(name ? { "aria-label": name } : {})}>
              <source src={source.url} type={videoType(source.url)} />
              {captions ? <track kind="captions" src={captions} label="Captions" default /> : null}
            </video>
          </div>
          {figcaption}
        </figure>
      );
    }
    // YouTube or Vimeo: a link to the video with the cover; VIDEO_EMBED_SCRIPT swaps in the player when pressed.
    return (
      <figure className="cr-video cr-video-embed" style={style}>
        <div className="cr-video-frame">
          <a className="cr-video-play" href={videoWatchUrl(source)!} data-cr-embed={videoEmbedUrl(source)!} data-cr-video-title={name || "Video"}>
            {cover ? <Img className="cr-video-cover" src={cover} alt="" loading="lazy" decoding="async" /> : null}
            <span className="cr-video-button" aria-hidden="true">
              <PlayIcon />
            </span>
            <span className="cr-video-label">
              {playLabel(name)}
              <span className="cr-video-service"> · {videoServiceName(source)}</span>
            </span>
          </a>
        </div>
        {figcaption}
      </figure>
    );
  },
};

/** Whether a page's blocks hold a YouTube or Vimeo video, so the page needs VIDEO_EMBED_SCRIPT. */
export function hasVideoEmbed(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(hasVideoEmbed);
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  if (v.type === "Video" && v.props && typeof v.props === "object") {
    const s = videoSourceOf((v.props as Record<string, unknown>).src);
    if (s && s.kind !== "file") return true;
  }
  return Object.values(v).some(hasVideoEmbed);
}

/**
 * Swaps a pressed video cover for the player (YouTube or Vimeo), so nothing
 * loads from those services before the visitor asks. Without this script
 * the cover is a link to the video's own page. Focus moves into the player.
 * F079: a Map's "Show map" works the same way (its frame, marked
 * `data-cr-embed-box`, gets the map).
 */
export const VIDEO_EMBED_SCRIPT = `for(const a of document.querySelectorAll("a[data-cr-embed]")){
a.setAttribute("role","button");
const go=e=>{e.preventDefault();const f=document.createElement("iframe");f.src=a.dataset.crEmbed;f.title=a.dataset.crEmbedTitle||a.dataset.crVideoTitle||"Video";f.allow="autoplay; fullscreen; picture-in-picture; encrypted-media";f.allowFullscreen=true;f.className=a.dataset.crEmbedClass||"cr-video-player";const b=a.closest("[data-cr-embed-box]");if(b)b.replaceChildren(f);else a.replaceWith(f);f.focus();};
a.addEventListener("click",go);
a.addEventListener("keydown",e=>{if(e.key===" ")go(e);});}`;

// --- Table --------------------------------------------------------------------------------

export const tableHeaders = ["top", "both", "none"] as const;
export type TableHeaders = (typeof tableHeaders)[number];
export const tableHeaderNames: Record<TableHeaders, string> = { top: "Top row", both: "Top row and first column", none: "None" };
export const tableLooks = ["lines", "stripes"] as const;
export type TableLook = (typeof tableLooks)[number];
export const tableLookNames: Record<TableLook, string> = { lines: "Lines", stripes: "Stripes" };

export type TableProps = {
  /** The table's title, shown above it (its <caption>). */
  caption: string;
  /** Rows of cells, plain text. The first row is the header row unless `headers` is "none". */
  rows: string[][];
  headers: TableHeaders;
  look: TableLook;
};

/**
 * The cells to publish: text only, every row as wide as the widest, empty
 * rows and columns at the end dropped, and within the limits.
 */
export function tableCells(rows: unknown): string[][] {
  const { tableRows, tableColumns, tableCell } = blocksV3Limits;
  let grid = (Array.isArray(rows) ? rows : [])
    .slice(0, tableRows)
    .map((r) => (Array.isArray(r) ? r : []).slice(0, tableColumns).map((c) => str(c).replace(/\s+/g, " ").trim().slice(0, tableCell)));
  const width = Math.max(0, ...grid.map((r) => r.length));
  grid = grid.map((r) => [...r, ...Array<string>(width - r.length).fill("")]);
  grid = grid.filter((r) => r.some(Boolean));
  let cols = width;
  while (cols > 0 && grid.every((r) => !r[cols - 1])) cols--;
  return grid.map((r) => r.slice(0, cols));
}

/** Figures line up on the right: "€49", "1,200", "12.5%", "-3". */
/** A time range such as 10:00–16:00 stays on one line. */
export const isTimeRange = (cell: string) => /^\d{1,2}[:.]\d{2}\s?[–—-]\s?\d{1,2}[:.]\d{2}$/.test(cell.trim());
export const isNumberCell = (cell: string) => /^[-+−]?\s?\p{Sc}?\s?\d[\d.,\s]*\s?(%|\p{Sc}|[kKmM])?$/u.test(cell.trim());

export const Table: ComponentConfig<TableProps & { id?: string }> = {
  label: "Table",
  fields: {
    caption: { type: "text", label: "Title (shown above the table)" },
    // The builder swaps this for a grid of cells (apps/admin/src/blocks-v3).
    rows: { type: "custom", label: "Cells", render: () => <></> } as never,
    headers: { type: "radio", label: "Header cells", options: tableHeaders.map((h) => ({ label: tableHeaderNames[h], value: h })) },
    look: { type: "radio", label: "Look", options: tableLooks.map((l) => ({ label: tableLookNames[l], value: l })) },
  },
  defaultProps: {
    caption: "Opening hours",
    rows: [
      ["Day", "Studio", "Shop"],
      ["Monday to Friday", "9:00–18:00", "10:00–18:00"],
      ["Saturday", "10:00–16:00", "10:00–17:00"],
      ["Sunday", "Closed", "12:00–16:00"],
    ],
    headers: "both",
    look: "lines",
  },
  render: ({ id, caption, rows, headers, look, puck }: TableProps & { id?: string } & Editing) => {
    const cells = tableCells(rows);
    const h = pick(tableHeaders, headers, "top");
    const title = str(caption).trim();
    if (!cells.length) return puck?.isEditing ? <div className="cr-table-empty">Add some cells to the table</div> : <></>;
    const top = h !== "none" && cells.length > 1;
    const head = top ? cells[0]! : null;
    const body = top ? cells.slice(1) : cells;
    const captionId = `${id ?? "table"}-title`;
    // A column of figures gets its heading right-aligned too, so the two line up.
    const numberColumns = (head ?? []).map((_, i) => body.length > 0 && body.every((r) => !(r[i] ?? "").trim() || isNumberCell(r[i] ?? "")) && body.some((r) => isNumberCell(r[i] ?? "")));
    const cell = (text: string, col: number, key: number) => {
      if (h === "both" && col === 0 && text) return <th key={key} scope="row">{text}</th>;
      return (
        <td key={key} className={[isNumberCell(text) ? "cr-num" : "", isTimeRange(text) ? "cr-nowrap" : ""].filter(Boolean).join(" ") || undefined}>
          {text}
        </td>
      );
    };
    // A focusable, named area, so the table can be scrolled sideways by keyboard on a phone (WCAG 2.1.1).
    return (
      <div className="cr-table-wrap" role="region" tabIndex={0} {...(title ? { "aria-labelledby": captionId } : { "aria-label": "Table" })}>
        <table className={`cr-table cr-table-${pick(tableLooks, look, "lines")} cr-table-headers-${h}`}>
          {title ? <caption id={captionId}>{title}</caption> : null}
          {head ? (
            <thead>
              <tr>
                {/* An empty corner cell isn't a header. */}
                {head.map((c, i) =>
                  c ? (
                    <th key={i} scope="col" className={numberColumns[i] ? "cr-num" : undefined}>
                      {c}
                    </th>
                  ) : (
                    <td key={i} />
                  ),
                )}
              </tr>
            </thead>
          ) : null}
          <tbody>
            {body.map((r, i) => (
              <tr key={i}>{r.map((c, j) => cell(c, j, j))}</tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  },
};

// --- Pricing ------------------------------------------------------------------------------

export type Plan = {
  name: string;
  price: string;
  /** Words after the price: "per month", "one-off". */
  period: string;
  description: string;
  /** What's included, one per line. */
  features: string;
  buttonLabel: string;
  buttonHref: string;
};

export type PricingProps = {
  plans: Plan[];
  /** Which plan stands out: "none" or its number ("1"–"4"). */
  highlight: "none" | "1" | "2" | "3" | "4";
  /** Words on the highlighted plan's badge. */
  badge: string;
  planStyle: SectionStyleId;
  highlightStyle: SectionStyleId;
  titleLevel: TitleLevel;
};

/** "Sites\n\n  Domain " → ["Sites", "Domain"] */
export const featureLines = (text: unknown) =>
  str(text)
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 20);

/** The button's words: the owner's, else "Choose <plan>" (names the plan, WCAG 2.4.4). */
export const planButtonLabel = (plan: Pick<Plan, "name" | "buttonLabel">) => str(plan.buttonLabel).trim() || (str(plan.name).trim() ? `Choose ${str(plan.name).trim()}` : "Choose");

const styleField = (label: string) => ({
  type: "select" as const,
  label,
  options: sectionStyleIds.map((s) => ({ label: sectionStyleNames[s], value: s })),
});

const CheckMark = () => (
  <svg className="cr-plan-check" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
    <path d="M4 12.5l5 5L20 6.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const Pricing: ComponentConfig<PricingProps> = {
  label: "Pricing",
  fields: {
    plans: {
      type: "array",
      label: "Plans",
      max: blocksV3Limits.plans,
      getItemSummary: (item) => [item.name, item.price].filter(Boolean).join(" · ") || "Plan",
      defaultItemProps: { name: "New plan", price: "€0", period: "per month", description: "", features: "", buttonLabel: "", buttonHref: "/contact" },
      arrayFields: {
        name: { type: "text", label: "Plan name" },
        price: { type: "text", label: "Price (e.g. €49)" },
        period: { type: "text", label: "After the price (e.g. per month)" },
        description: { type: "textarea", label: "Short description (optional)" },
        features: { type: "textarea", label: "What's included (one per line)" },
        buttonLabel: { type: "text", label: "Button text (empty: “Choose <plan name>”)" },
        buttonHref: { type: "text", label: "Button link (empty: no button)" },
      },
    },
    highlight: {
      type: "radio",
      label: "Highlight a plan",
      options: [
        { label: "None", value: "none" },
        { label: "1", value: "1" },
        { label: "2", value: "2" },
        { label: "3", value: "3" },
        { label: "4", value: "4" },
      ],
    },
    badge: { type: "text", label: "Badge on the highlighted plan" },
    titleLevel: {
      type: "select",
      label: "Plan name level",
      options: [
        { label: "H2", value: "h2" },
        { label: "H3", value: "h3" },
        { label: "H4", value: "h4" },
      ],
    },
    planStyle: styleField("Plan colours"),
    highlightStyle: styleField("Highlighted plan colours"),
  },
  defaultProps: {
    plans: [
      { name: "Starter", price: "€19", period: "per month", description: "For a first site.", features: "1 site\nEmail help", buttonLabel: "", buttonHref: "/contact" },
      { name: "Studio", price: "€49", period: "per month", description: "For a growing business.", features: "5 sites\nYour own domain\nEmail help", buttonLabel: "", buttonHref: "/contact" },
      { name: "Agency", price: "€99", period: "per month", description: "For teams.", features: "20 sites\nYour own domains\nPriority help", buttonLabel: "", buttonHref: "/contact" },
    ],
    highlight: "2",
    badge: "Most popular",
    planStyle: "surface",
    highlightStyle: "primary",
    titleLevel: "h3",
  },
  render: ({ plans, highlight, badge, planStyle, highlightStyle, titleLevel }) => {
    const list = (Array.isArray(plans) ? plans : []).slice(0, blocksV3Limits.plans).filter((p) => str(p?.name).trim() || str(p?.price).trim());
    const Title = headingTag(titleLevel, "h3");
    const hi = highlight && highlight !== "none" ? Number(highlight) : 0;
    const badgeText = str(badge).trim();
    const normal = pick(sectionStyleIds, planStyle, "surface");
    const special = pick(sectionStyleIds, highlightStyle, "primary");
    return (
      <ul className={`cr-pricing cr-pricing-n${Math.max(1, list.length)}`} role="list">
        {list.map((p, i) => {
          const on = hi === i + 1;
          const features = featureLines(p.features);
          const href = str(p.buttonHref).trim();
          return (
            <li key={i} className={`cr-plan cr-style-${on ? special : normal}${on ? " cr-plan-highlight" : ""}`}>
              {/* The name comes first for screen readers; the badge shows above it (WCAG 1.4.1: the highlight is in words, not colour alone). */}
              {str(p.name).trim() ? <Title className="cr-plan-name">{str(p.name).trim()}</Title> : null}
              {on && badgeText ? <p className="cr-plan-badge">{badgeText}</p> : null}
              <p className="cr-plan-price">
                <span className="cr-plan-amount">{str(p.price).trim()}</span>
                {str(p.period).trim() ? <span className="cr-plan-period"> {str(p.period).trim()}</span> : null}
              </p>
              {str(p.description).trim() ? <p className="cr-plan-desc">{str(p.description).trim()}</p> : null}
              {features.length ? (
                <ul className="cr-plan-features" role="list">
                  {features.map((f, j) => (
                    <li key={j}>
                      <CheckMark />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
              {href ? (
                <a className={`cr-button ${on ? "cr-button-primary" : "cr-button-secondary"} cr-plan-button`} href={safeUrl(href)}>
                  {planButtonLabel(p)}
                </a>
              ) : null}
            </li>
          );
        })}
      </ul>
    );
  },
};

export const blocksV3 = { Stats, Video, Table, Pricing };

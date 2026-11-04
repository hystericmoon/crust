import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { config, type Components } from "./config";
import {
  captionsAddress,
  featureLines,
  hasVideoEmbed,
  isNumberCell,
  planButtonLabel,
  statItems,
  tableCells,
  videoEmbedUrl,
  videoSourceOf,
  videoWatchUrl,
  VIDEO_EMBED_SCRIPT,
} from "./blocks-v3";
import { BLOCKS_V3_CSS, needsBlocksV3Css } from "./blocks-v3-css";
import { listNumber } from "./more-blocks";
import { blockName, markableFields } from "./placeholders";
import { ITEM_LINK_PROPS, relinkPage } from "./links";
import type { Data } from "@puckeditor/core";

type Render = (props: Record<string, unknown>) => ReactNode;
function html(name: keyof Components, props: Record<string, unknown> = {}, editing = false) {
  const block = config.components[name];
  return renderToStaticMarkup(<>{(block.render as unknown as Render)({ id: `${name}-1`, ...block.defaultProps, ...props, puck: { isEditing: editing } })}</>);
}

describe("F078 blocks-v3: registered", () => {
  it("adds Stats, Video, Table and Pricing to the block list with names and markable fields", () => {
    for (const name of ["Stats", "Video", "Table", "Pricing"] as const) {
      expect(config.components[name]).toBeTruthy();
      expect(blockName(name)).toBe(name);
      expect(markableFields[name]?.length).toBeGreaterThan(0);
    }
    const all = Object.values(config.categories ?? {}).flatMap((c) => c.components ?? []);
    expect(all).toEqual(expect.arrayContaining(["Stats", "Video", "Table", "Pricing"]));
  });
});

describe("F078 blocks-v3: Stats", () => {
  it("renders one list item per figure, figure and words read together", () => {
    const out = html("Stats", { items: [{ value: "1,200+", label: "sites published", detail: "since 2024" }, { value: "", label: "skipped", detail: "" }] });
    expect(out).toContain('<ul class="cr-stats cr-stats-lines cr-stats-md cr-stats-colour-text cr-align-left" role="list" style="--cr-stats-count:1">');
    expect(out).toContain('<li class="cr-stat"><span class="cr-stat-value">1,200+</span><span class="cr-stat-label"> sites published</span><span class="cr-stat-detail"> since 2024</span></li>');
    expect(out).not.toContain("skipped");
  });
  it("keeps at most six figures and escapes text", () => {
    expect(statItems(Array.from({ length: 9 }, (_, i) => ({ value: String(i) })))).toHaveLength(6);
    expect(html("Stats", { items: [{ value: "<b>9</b>", label: "", detail: "" }] })).toContain("&lt;b&gt;9&lt;/b&gt;");
  });
  it("falls back to safe looks", () => {
    expect(html("Stats", { look: "evil", size: "xl", colour: "red", align: "middle" })).toContain("cr-stats cr-stats-plain cr-stats-md cr-stats-colour-text cr-align-left");
  });
});

describe("F078 blocks-v3: video addresses", () => {
  it("recognises YouTube links in their usual shapes", () => {
    for (const link of [
      "https://www.youtube.com/watch?v=aqz-KE-bpKQ",
      "https://youtu.be/aqz-KE-bpKQ",
      "youtube.com/watch?v=aqz-KE-bpKQ&list=x",
      "https://m.youtube.com/watch?v=aqz-KE-bpKQ",
      "https://www.youtube.com/shorts/aqz-KE-bpKQ",
      "https://www.youtube.com/embed/aqz-KE-bpKQ",
      "https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ",
    ])
      expect(videoSourceOf(link)).toEqual({ kind: "youtube", id: "aqz-KE-bpKQ", start: 0 });
    expect(videoSourceOf("https://youtu.be/aqz-KE-bpKQ?t=1m30s")).toEqual({ kind: "youtube", id: "aqz-KE-bpKQ", start: 90 });
  });
  it("recognises Vimeo, including unlisted videos", () => {
    expect(videoSourceOf("https://vimeo.com/76979871")).toEqual({ kind: "vimeo", id: "76979871", hash: "" });
    expect(videoSourceOf("https://vimeo.com/76979871/abc123")).toEqual({ kind: "vimeo", id: "76979871", hash: "abc123" });
    expect(videoSourceOf("https://player.vimeo.com/video/76979871?h=abc123")).toEqual({ kind: "vimeo", id: "76979871", hash: "abc123" });
  });
  it("recognises video files on the site or https://", () => {
    expect(videoSourceOf("/media/tour.mp4")).toEqual({ kind: "file", url: "/media/tour.mp4" });
    expect(videoSourceOf("https://cdn.example.com/a.webm")).toEqual({ kind: "file", url: "https://cdn.example.com/a.webm" });
  });
  it("refuses everything else", () => {
    for (const bad of [
      "",
      "javascript:alert(1)//youtube.com/watch?v=aqz-KE-bpKQ",
      "http://www.youtube.com/watch?v=aqz-KE-bpKQ",
      "https://youtube.com.evil.com/watch?v=aqz-KE-bpKQ",
      "https://evil.com/youtube.com/watch?v=aqz-KE-bpKQ",
      "https://www.youtube.com/watch?v=short",
      'https://www.youtube.com/watch?v=aqz-KE-bp"Q',
      "https://vimeo.com/channels/staff",
      "https://user:pw@vimeo.com/123",
      "//cdn.example.com/a.mp4",
      "/media/tour.mov",
    ])
      expect(videoSourceOf(bad)).toBeNull();
  });
  it("builds the no-cookie and do-not-track players, and the fallback links", () => {
    const yt = videoSourceOf("https://youtu.be/aqz-KE-bpKQ?t=90")!;
    expect(videoEmbedUrl(yt)).toBe("https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ?autoplay=1&rel=0&cc_load_policy=1&start=90");
    expect(videoWatchUrl(yt)).toBe("https://www.youtube.com/watch?v=aqz-KE-bpKQ&t=90s");
    const vm = videoSourceOf("https://vimeo.com/76979871/abc123")!;
    expect(videoEmbedUrl(vm)).toBe("https://player.vimeo.com/video/76979871?autoplay=1&dnt=1&h=abc123");
    expect(videoWatchUrl(vm)).toBe("https://vimeo.com/76979871/abc123");
  });
  it("accepts captions only as .vtt files", () => {
    expect(captionsAddress("/media/tour.vtt")).toBe("/media/tour.vtt");
    expect(captionsAddress("https://x.org/a.vtt?v=2")).toBe("https://x.org/a.vtt?v=2");
    expect(captionsAddress("/media/tour.srt")).toBeNull();
    expect(captionsAddress("javascript:a.vtt")).toBeNull();
  });
});

describe("F078 blocks-v3: Video", () => {
  it("YouTube: a link with the cover and a named play button, nothing loaded from YouTube", () => {
    const out = html("Video", { src: "https://youtu.be/aqz-KE-bpKQ", title: "Our bakery", imageSrc: "/media/door.jpg", caption: "Filmed in March." });
    expect(out).toContain('<a class="cr-video-play" href="https://www.youtube.com/watch?v=aqz-KE-bpKQ" data-cr-embed="https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ?autoplay=1&amp;rel=0&amp;cc_load_policy=1" data-cr-video-title="Our bakery">');
    expect(out).toContain('<img class="cr-video-cover" src="/media/door.jpg" alt="" loading="lazy" decoding="async"/>');
    expect(out).toContain('<span class="cr-video-label">Play video: Our bakery<span class="cr-video-service"> · YouTube</span></span>');
    expect(out).toContain("<figcaption>Filmed in March.</figcaption>");
    expect(out).not.toMatch(/<iframe|ytimg|<script/);
  });
  it("a file: the browser's player, downloading nothing until pressed, with captions", () => {
    const out = html("Video", { src: "/media/tour.mp4", title: "Studio tour", imageSrc: "/media/still.jpg", captionsSrc: "/media/tour.vtt" });
    expect(out).toContain('<video class="cr-video-file" controls="" preload="none" playsInline="" poster="/media/still.jpg" aria-label="Studio tour">');
    expect(out).toContain('<source src="/media/tour.mp4" type="video/mp4"/><track kind="captions" src="/media/tour.vtt" label="Captions" default=""/>');
    expect(out).not.toContain("autoplay");
  });
  it("nothing on the page for a missing or unknown address; a hint in the builder", () => {
    expect(html("Video", { src: "https://example.com/watch" })).toBe("");
    expect(html("Video", { src: "" }, true)).toContain("Paste a YouTube or Vimeo link");
  });
  it("the page gets the player script only when it has a YouTube or Vimeo video", () => {
    const page = (src: string) => [{ type: "Section", props: { content: [{ type: "Video", props: { src } }] } }];
    expect(hasVideoEmbed(page("https://vimeo.com/76979871"))).toBe(true);
    expect(hasVideoEmbed(page("/media/a.mp4"))).toBe(false);
    expect(hasVideoEmbed(page("nope"))).toBe(false);
    expect(VIDEO_EMBED_SCRIPT).toContain("data-cr-embed");
    expect(VIDEO_EMBED_SCRIPT).toContain("f.focus()");
  });
});

describe("F078 blocks-v3: Table", () => {
  it("cleans the cells: text only, even rows, no empty rows or trailing columns, within limits", () => {
    expect(tableCells([["a", " b  c ", ""], ["", ""], [1 as unknown as string, "x"]])).toEqual([["a", "b c"], ["", "x"]]);
    expect(tableCells(Array.from({ length: 80 }, () => Array.from({ length: 12 }, () => "x")))).toHaveLength(50);
    expect(tableCells([Array.from({ length: 12 }, () => "x")])[0]).toHaveLength(8);
    expect(tableCells("nope")).toEqual([]);
  });
  it("is a real table: caption, column and row headers with scope, a named scroll area", () => {
    const out = html("Table", { caption: "Opening hours", headers: "both", rows: [["", "Studio"], ["Saturday", "€12"]] });
    expect(out).toContain('<div class="cr-table-wrap" role="region" tabindex="0" aria-labelledby="Table-1-title"><table class="cr-table cr-table-lines cr-table-headers-both"><caption id="Table-1-title">Opening hours</caption>');
    expect(out).toContain('<thead><tr><td></td><th scope="col" class="cr-num">Studio</th></tr></thead>');
    expect(out).toContain('<tbody><tr><th scope="row">Saturday</th><td class="cr-num">€12</td></tr></tbody>');
  });
  it("right-aligns the heading over a column of figures, and keeps a time range on one line (F078 review)", () => {
    const out = html("Table", { caption: "", headers: "top", rows: [["Day", "Shop", "Hours"], ["Mon", "€12", "10:00–16:00"], ["Tue", "€9", "Closed"]] });
    expect(out).toContain('<th scope="col">Day</th><th scope="col" class="cr-num">Shop</th><th scope="col">Hours</th>');
    expect(out).toContain('<td class="cr-nowrap">10:00–16:00</td>');
    expect(out).toContain("<td>Closed</td>");
    // A mixed column (figures and words) stays left-aligned, heading included.
    const mixed = html("Table", { caption: "", headers: "top", rows: [["Plan", "Price"], ["Free", "€0"], ["Team", "Ask us"]] });
    expect(mixed).toContain('<th scope="col">Price</th>');
    expect(mixed).toContain("<td>€0</td>");
  });
  it("without headers or a title", () => {
    const out = html("Table", { caption: "", headers: "none", rows: [["a", "b"]] });
    expect(out).toContain('aria-label="Table"');
    expect(out).not.toContain("<th");
    expect(out).not.toContain("<caption");
  });
  it("lines up figures", () => {
    for (const n of ["12", "€49", "1,200", "12.5%", "-3", "$ 1 200", "4k"]) expect(isNumberCell(n)).toBe(true);
    for (const t of ["9:00–18:00", "Closed", "2 rooms", ""]) expect(isNumberCell(t)).toBe(false);
  });
  it("escapes cells", () => {
    expect(html("Table", { rows: [["<img src=x onerror=alert(1)>"]], headers: "none" })).toContain("&lt;img src=x");
  });
});

describe("F078 blocks-v3: Pricing", () => {
  it("plans as list items, name as heading, highlight in words and colours", () => {
    const out = html("Pricing");
    expect(out).toContain('<ul class="cr-pricing cr-pricing-n3" role="list">');
    expect(out).toContain('<li class="cr-plan cr-style-primary cr-plan-highlight"><h3 class="cr-plan-name">Studio</h3><p class="cr-plan-badge">Most popular</p>');
    expect(out).toContain('<p class="cr-plan-price"><span class="cr-plan-amount">€49</span><span class="cr-plan-period"> per month</span></p>');
    expect(out).toContain('<a class="cr-button cr-button-primary cr-plan-button" href="/contact">Choose Studio</a>');
    expect(out).toContain('<a class="cr-button cr-button-secondary cr-plan-button" href="/contact">Choose Starter</a>');
    expect(out.match(/cr-style-surface/g)).toHaveLength(2);
  });
  it("buttons name their plan; no link, no button; unsafe links are neutralised", () => {
    expect(planButtonLabel({ name: "Studio", buttonLabel: "" })).toBe("Choose Studio");
    expect(planButtonLabel({ name: "Studio", buttonLabel: "Start now" })).toBe("Start now");
    const out = html("Pricing", { highlight: "none", plans: [{ name: "A", price: "€1", period: "", description: "", features: "", buttonLabel: "", buttonHref: "javascript:alert(1)" }, { name: "B", price: "€2", buttonHref: "" }] });
    expect(out).toContain('href="#"');
    expect(out.match(/cr-plan-button/g)).toHaveLength(1);
    expect(out).not.toContain("cr-plan-badge");
  });
  it("what's included: one per line", () => {
    expect(featureLines(" 5 sites \n\n Domain\n")).toEqual(["5 sites", "Domain"]);
    expect(html("Pricing")).toContain('<ul class="cr-plan-features" role="list"><li><svg class="cr-plan-check"');
  });
  it("relinks plan buttons when a page is renamed", () => {
    expect(ITEM_LINK_PROPS.Pricing).toEqual(["plans", "buttonHref"]);
    const puck = { root: { props: {} }, content: [{ type: "Pricing", props: { id: "p", plans: [{ name: "A", buttonHref: "/contact" }] } }] } as unknown as Data;
    const out = relinkPage(puck, "/contact", "/talk");
    expect(out.count).toBe(1);
  });
});

describe("F078 blocks-v3: numbered list", () => {
  it("Numbers makes the Icon list an ordered list, in three looks", () => {
    const out = html("IconList", { icon: "numbers", items: [{ text: "Pick a template" }, { text: "Publish" }] });
    expect(out).toBe('<ol class="cr-icon-list cr-numbered cr-numbers-circle cr-icon-primary" role="list"><li><span class="cr-list-number">1</span><span>Pick a template</span></li><li><span class="cr-list-number">2</span><span>Publish</span></li></ol>');
    expect(html("IconList", { icon: "numbers", numberStyle: "large" })).toContain('<span class="cr-list-number">01</span>');
    expect(listNumber(9, "large")).toBe("10");
    expect(listNumber(0, "plain")).toBe("1.");
  });
  it("lists made before stay the same", () => {
    expect(html("IconList", { icon: "check", numberStyle: undefined })).toContain('<ul class="cr-icon-list cr-icon-primary" role="list">');
  });
});

describe("F078 blocks-v3: CSS only where used", () => {
  it("is added when a page shows one of the blocks", () => {
    for (const name of ["Stats", "Table", "Pricing"] as const) expect(needsBlocksV3Css(html(name))).toBe(true);
    expect(needsBlocksV3Css(html("Video", { src: "https://youtu.be/aqz-KE-bpKQ" }))).toBe(true);
    expect(needsBlocksV3Css(html("IconList", { icon: "numbers" }))).toBe(true);
    expect(needsBlocksV3Css(html("IconList"))).toBe(false);
    expect(needsBlocksV3Css('<div class="cr-section-video">')).toBe(false);
    expect(BLOCKS_V3_CSS).toContain(".cr-plan-badge");
  });
});

describe("review fixes F078, F057, F062 (2026-11-04)", () => {
  it("styles: badge in sentence case at 14px, stats line up on phones, time ranges don't wrap", async () => {
    const { readFileSync } = await import("node:fs");
    const css = readFileSync("packages/blocks/src/blocks-v3-css.ts", "utf8");
    expect(css).toMatch(/\.cr-plan-badge \{[^}]*font-size: 0\.875rem;(?![^}]*uppercase)/);
    expect(css).toContain(".cr-stats.cr-align-left .cr-stat:nth-child(2n+1) { padding-left: 0; }");
    expect(css).toContain(".cr-table .cr-nowrap { white-space: nowrap; }");
  });
  it("admin: Sites row buttons and site-name link are 44px; the template file button is styled", async () => {
    const { readFileSync } = await import("node:fs");
    const pages = readFileSync("apps/admin/src/pages/pages.css", "utf8");
    expect(pages).toContain(".sites-table .pg-small { min-height: 44px; }");
    expect(pages).toMatch(/\.sites-open \{\s*min-height: 44px;/);
    const tp = readFileSync("apps/admin/src/templates/templates.css", "utf8");
    expect(tp).toContain(".tp-card-file input::file-selector-button");
    expect(tp).toMatch(/\.tp-get \{[^}]*gap: 0\.4em;/);
  });
});

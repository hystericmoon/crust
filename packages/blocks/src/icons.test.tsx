import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { config, type Components } from "./config";
import { iconData, socialIconData } from "./icons-data";
import {
  iconA11y,
  iconCategories,
  iconLabel,
  iconNames,
  isIconName,
  searchIcons,
  socialLabel,
  socialLinkOf,
  socialNetworks,
} from "./icons";
import { cleanPlaceholder, markableFields } from "./placeholders";
import { LINK_PROPS } from "./links";
import { innerSvg } from "../../../scripts/sync-icons.mjs";

type Render = (props: Record<string, unknown>) => ReactNode;
function html(name: keyof Components, props: Record<string, unknown> = {}) {
  const block = config.components[name];
  return renderToStaticMarkup(<>{(block.render as unknown as Render)({ id: `${name}-1`, ...block.defaultProps, ...props, puck: { isEditing: false } })}</>);
}

describe("icons: the set", () => {
  it("has a curated set of about 150 icons, each in a category, with only drawing elements", () => {
    expect(iconNames.length).toBeGreaterThanOrEqual(100);
    expect(iconNames.length).toBeLessThanOrEqual(160);
    for (const name of iconNames) {
      const entry = iconData[name]!;
      expect(iconCategories).toContain(entry.category);
      // Only shapes: no scripts, styles, links or event handlers can ride along.
      const tags = [...entry.svg.matchAll(/<([a-z]+)/g)].map((m) => m[1]);
      for (const t of tags) expect(["path", "circle", "rect", "line", "polyline", "polygon", "ellipse"]).toContain(t);
      expect(entry.svg).not.toMatch(/on[a-z]+=|href|style|script/i);
    }
    expect(iconCategories.every((c) => iconNames.some((n) => iconData[n]!.category === c))).toBe(true);
  });

  it("has all 16 social networks, also drawing elements only, without Tabler's empty frame", () => {
    expect(Object.keys(socialIconData).sort()).toEqual([...socialNetworks].sort());
    for (const svg of Object.values(socialIconData)) {
      expect(svg).not.toContain('d="M0 0h24v24H0z"');
      expect(svg).not.toMatch(/on[a-z]+=|href|style|script/i);
    }
  });

  it("the sync script keeps only the drawing", () => {
    const file = `<!-- @license x -->\n<svg\n  xmlns="http://www.w3.org/2000/svg"\n  width="24"\n>\n  <path stroke="none" d="M0 0h24v24H0z" fill="none" />\n  <path d="M1 2" />\n  <circle cx="1" cy="2" r="3" />\n</svg>`;
    expect(innerSvg(file)).toBe('<path d="M1 2"/><circle cx="1" cy="2" r="3"/>');
  });

  it("names icons in plain words", () => {
    expect(iconLabel("map-pin")).toBe("Map pin");
    expect(iconLabel("building-2")).toBe("Building");
    expect(isIconName("truck")).toBe(true);
    expect(isIconName("toString")).toBe(false);
    expect(isIconName(undefined)).toBe(false);
  });
});

describe("icons: search finds by meaning", () => {
  it("'food' finds utensils, coffee and pizza", () => {
    const found = searchIcons("food");
    for (const n of ["utensils", "coffee", "pizza"]) expect(found).toContain(n);
  });

  it("puts the icon's own name first, matches word starts, and needs every word", () => {
    expect(searchIcons("phone")[0]).toBe("phone");
    expect(searchIcons("deliv")).toContain("truck");
    expect(searchIcons("map pin")).toEqual(["map-pin"]);
    expect(searchIcons("zzzz")).toEqual([]);
  });

  it("filters by category, and an empty search lists the category", () => {
    expect(searchIcons("", "food").every((n) => iconData[n]!.category === "food")).toBe(true);
    expect(searchIcons("").length).toBe(iconNames.length);
    expect(searchIcons("coffee", "arrows")).toEqual([]);
  });
});

describe("icons: social links", () => {
  it("recognises the network from the address", () => {
    expect(socialLinkOf("https://www.instagram.com/atelier")?.network).toBe("instagram");
    expect(socialLinkOf("https://m.facebook.com/atelier")?.network).toBe("facebook");
    expect(socialLinkOf("https://twitter.com/atelier")?.network).toBe("x");
    expect(socialLinkOf("https://bsky.app/profile/atelier.bsky.social")?.network).toBe("bluesky");
    expect(socialLinkOf("https://wa.me/31205550101")?.network).toBe("whatsapp");
    expect(socialLinkOf("https://www.threads.net/@atelier")?.network).toBe("threads");
    expect(socialLinkOf("https://www.tiktok.com/@atelier")?.network).toBe("tiktok");
    expect(socialLinkOf("https://hachyderm.io/@atelier")?.network).toBe("mastodon");
    expect(socialLinkOf("https://nl.linkedin.com/in/atelier")?.network).toBe("linkedin");
  });

  it("doesn't fall for look-alike hosts", () => {
    expect(socialLinkOf("https://notinstagram.com/x")).toEqual({ network: null, name: "notinstagram.com" });
    expect(socialLinkOf("https://instagram.com.evil.example/x")?.network).toBeNull();
  });

  it("only takes full https:// addresses", () => {
    expect(socialLinkOf("http://instagram.com/x")).toBeNull();
    expect(socialLinkOf("javascript:alert(1)")).toBeNull();
    expect(socialLinkOf("instagram.com/x")).toBeNull();
    expect(socialLinkOf("")).toBeNull();
  });

  it("names each link for screen readers", () => {
    const ig = socialLinkOf("https://instagram.com/a")!;
    expect(socialLabel(ig, " Atelier ")).toBe("Atelier on Instagram");
    expect(socialLabel(ig, "")).toBe("Instagram");
  });
});

describe("icons: blocks", () => {
  it("Icon on its own is decoration, hidden from screen readers", () => {
    const out = html("Icon", { icon: "truck", label: "", href: "" });
    expect(out).toContain('class="cr-icon cr-icon-look-circle cr-icon-size-md cr-icon-colour-primary" aria-hidden="true"');
    expect(out).toContain('<svg class="cr-svg" viewBox="0 0 24 24" width="32" height="32"');
    expect(out).not.toContain("<a");
    expect(out).not.toContain("role=");
  });

  it("Icon with a name and no link is an image with that name", () => {
    expect(html("Icon", { icon: "leaf", label: "Organic" })).toContain('<span class="cr-icon-named" role="img" aria-label="Organic">');
  });

  it("Icon with a link is a named link; without a name it's marked for the publish check", () => {
    expect(html("Icon", { icon: "phone", label: "Call us", href: "tel:+31205550101" })).toContain('<a class="cr-icon-link" href="tel:+31205550101" aria-label="Call us">');
    const unnamed = html("Icon", { icon: "phone", label: " ", href: "/contact" });
    expect(unnamed).toContain('data-cr-needs-name="Icon"');
    expect(unnamed).not.toContain("aria-label");
    expect(iconA11y("", "/x")).toEqual({ kind: "link", name: "", missingName: true });
  });

  it("Icon checks its link and ignores unknown icon names", () => {
    expect(html("Icon", { icon: "phone", label: "x", href: "javascript:alert(1)" })).toContain('href="#"');
    expect(html("Icon", { icon: "<script>" })).toBe('<div class="cr-icon-block cr-align-left"></div>');
    expect(LINK_PROPS.Icon).toBe("href");
  });

  it("Icon looks and sizes", () => {
    expect(html("Icon", { look: "square", size: "lg", colour: "text" })).toContain("cr-icon-look-square cr-icon-size-lg cr-icon-colour-text");
    expect(html("Icon", { look: "bogus", size: "bogus" })).toContain("cr-icon-look-plain cr-icon-size-md");
  });

  it("Divider: decorative looks are hidden; a labelled one is a named separator", () => {
    expect(html("Divider", { kind: "line" })).toBe('<div class="cr-divider cr-divider-line cr-divider-full cr-align-center" style="--cr-divider-space:var(--cr-space-md)" aria-hidden="true"></div>');
    expect(html("Divider", { kind: "dots", width: "short" })).toContain("<i></i><i></i><i></i>");
    const labelled = html("Divider", { kind: "label", label: "Our menu" });
    expect(labelled).toContain('role="separator" aria-label="Our menu"');
    expect(labelled).toContain('<span class="cr-divider-text" aria-hidden="true">Our menu</span>');
    // No label: a plain decorative line.
    expect(html("Divider", { kind: "label", label: "  " })).toContain('cr-divider-line');
    expect(html("Divider", { kind: "label", label: "<b>x</b>" })).toContain("&lt;b&gt;x&lt;/b&gt;");
  });

  it("Social links: a list of named links with the network's icon; bad addresses left out", () => {
    const out = html("SocialLinks", {
      who: "Atelier",
      links: [{ href: "https://instagram.com/atelier" }, { href: "javascript:alert(1)" }, { href: "https://example.com/me" }],
    });
    expect(out.match(/<li>/g)).toHaveLength(2);
    expect(out).toContain('<a class="cr-social-link" href="https://instagram.com/atelier" aria-label="Atelier on Instagram" rel="me">');
    expect(out).toContain('aria-label="Atelier on example.com"');
    expect(out).not.toContain("javascript");
    expect(out).toContain('role="list"');
  });

  it("Social links with names show the network's name, inside the link's name", () => {
    const out = html("SocialLinks", { show: "names", look: "circle", links: [{ href: "https://www.linkedin.com/company/atelier" }] });
    expect(out).toContain("cr-social-names cr-social-circle");
    expect(out).toContain('aria-label="LinkedIn"');
    expect(out).toContain('<span aria-hidden="true">LinkedIn</span>');
  });

  it("templates can mark the divider label and the profiles as sample content", () => {
    expect(markableFields.Divider!.map((f) => f.field)).toEqual(["label"]);
    expect(cleanPlaceholder("SocialLinks", ["links"])).toEqual(["links"]);
  });
});

describe("icons: in lists, cards and buttons", () => {
  it("Icon list keeps the classic marks exactly as before", () => {
    const out = html("IconList", { icon: "check", items: [{ text: "Fast" }] });
    expect(out).toContain('<svg class="cr-list-icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path d="M4 12.5l5 5L20 6.5"');
  });

  it("Icon list takes any icon, per list or per line", () => {
    const out = html("IconList", { icon: "map-pin", items: [{ text: "Keizersgracht 12" }, { text: "+31 20", icon: "phone" }, { text: "x", icon: "bogus" }] });
    const svgs = out.split("<li>").slice(1);
    expect(svgs[0]).toContain(iconData["map-pin"]!.svg);
    expect(svgs[1]).toContain(iconData.phone!.svg);
    expect(svgs[2]).toContain(iconData["map-pin"]!.svg);
    expect(svgs.every((s) => s.includes('aria-hidden="true"'))).toBe(true);
  });

  it("Card shows an icon only when it has no photo", () => {
    expect(html("Card", { icon: "truck" })).toContain('<div class="cr-card-icon"><span class="cr-icon cr-icon-look-circle');
    expect(html("Card", { icon: "truck", imageSrc: "/a.jpg", imageAlt: "A" })).not.toContain("cr-card-icon");
    expect(html("Card", {})).not.toContain("cr-card-icon");
  });

  it("Button puts a decorative icon before or after the label", () => {
    const before = html("Button", { label: "Call", icon: "phone" });
    expect(before).toMatch(/cr-has-icon"[^>]*><svg class="cr-button-icon"[^>]*aria-hidden="true"[\s\S]*<\/svg>Call<\/a>/);
    const after = html("Button", { label: "Menu", icon: "arrow-right", iconAt: "after", variant: "arrow" });
    expect(after).toMatch(/Menu<svg class="cr-button-icon"/);
    expect(after).not.toContain("cr-arrow");
    expect(html("Button", { label: "Go" })).toBe('<div class="cr-button-row cr-align-left"><a class="cr-button cr-button-primary" href="/">Go</a></div>');
  });
});

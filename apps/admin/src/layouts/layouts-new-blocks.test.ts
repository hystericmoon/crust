import { fitHeadings, layoutCategories, sectionLayouts, type Page } from "@crust/blocks";
import { renderBody, renderPreview } from "@crust/render";
import type { ComponentData } from "@puckeditor/core";
import { describe, expect, it } from "vitest";
import { checkPage } from "../../server/content";
import { filterLayouts } from "./library";

/** F041: layouts that put the Milestone 2–3 blocks one click away. */
const added: [id: string, category: string, block: string][] = [
  ["features-grid", "Features", "Grid"],
  ["gallery-grid", "Gallery", "Gallery"],
  ["logos-strip", "Logos", "LogoRow"],
  ["testimonial", "Testimonials", "Quote"],
  ["faq-accordion", "FAQ", "Accordion"],
  ["contact-form", "Contact", "ContactForm"],
];

const layout = (id: string) => sectionLayouts.find((l) => l.id === id)!;

/** Every block in a tree, nested ones included. */
function all(items: ComponentData[]): ComponentData[] {
  return items.flatMap((item) => [
    item,
    ...Object.values(item.props).flatMap((v) =>
      Array.isArray(v) && v.every((x) => x && typeof x === "object" && "type" in x) ? all(v as ComponentData[]) : [],
    ),
  ]);
}

const asPage = (content: ComponentData[]): Page => ({
  path: "/check",
  title: "Check",
  description: "A page made from one layout.",
  puck: { root: { props: {} }, content: [{ type: "Heading", props: { id: "h1", text: "Check", level: "h1", align: "left" } }, ...fitHeadings(content, true)] },
});

describe("layouts for the new blocks (F041)", () => {
  it.each(added)("%s is in %s and uses the %s block", (id, category, type) => {
    const l = layout(id);
    expect(l, id).toBeDefined();
    expect(l.category).toBe(category);
    expect(l.description.length).toBeGreaterThan(10);
    expect(all(l.build()).map((b) => b.type)).toContain(type);
  });

  it("adds Gallery and Logos to the categories, each with a layout", () => {
    expect(layoutCategories).toContain("Gallery");
    expect(layoutCategories).toContain("Logos");
    expect(filterLayouts("section", "Gallery", "").map((i) => i.layout.id)).toEqual(["gallery-grid"]);
    expect(filterLayouts("section", "Logos", "").map((i) => i.layout.id)).toEqual(["logos-strip"]);
    expect(filterLayouts("section", "All", "logo").map((i) => i.layout.id)).toContain("logos-strip");
  });

  it.each(added)("%s builds fresh ids every time", (id) => {
    const ids = (items: ComponentData[]) => all(items).map((b) => String(b.props.id));
    const [a, b] = [ids(layout(id).build()), ids(layout(id).build())];
    expect(new Set(a).size).toBe(a.length);
    expect(a.some((x) => b.includes(x))).toBe(false);
  });

  it.each(added)("%s passes the page checks once inserted, and has no h1 of its own", (id) => {
    const content = layout(id).build();
    expect(all(content).some((b) => b.type === "Heading" && b.props.level === "h1")).toBe(false);
    expect(checkPage(asPage(content))).toEqual([]);
  });

  it("publishes empty photo and logo slots as nothing, and previews them as placeholders", () => {
    for (const id of ["gallery-grid", "logos-strip"]) {
      const data = { root: { props: {} }, content: layout(id).build() };
      expect(renderBody(data), id).not.toContain("cr-image-empty");
      expect(renderBody(data), id).not.toContain("<img");
      expect(renderPreview(data).match(/cr-image-empty/g)?.length, id).toBe(id === "gallery-grid" ? 6 : 5);
    }
  });

  it("comes with no alt text, so a photo added without a description can't be published", () => {
    // crust-publish refuses an <img> with no alt attribute (F002).
    const content = layout("gallery-grid").build();
    const gallery = all(content).find((b) => b.type === "Gallery")!;
    const images = gallery.props.images as { src: string; alt: string }[];
    expect(images.every((im) => im.alt === "")).toBe(true);
    images[0]!.src = "/media/harbour.jpg";
    const img = renderBody({ root: { props: {} }, content }).match(/<img[^>]*>/)![0];
    expect(img).not.toMatch(/\balt=/);
  });

  it("the contact layout publishes a labelled form", () => {
    const html = renderBody({ root: { props: {} }, content: layout("contact-form").build() });
    expect(html).toContain("<form");
    for (const label of ["Name", "Email", "Message"]) expect(html).toMatch(new RegExp(`<label[^>]*>${label}`));
  });
});

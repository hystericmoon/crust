import { defaultTokens, linkedBlock, type LinkedSectionFile, type Page, type Site } from "@crust/blocks";
import { describe, expect, it } from "vitest";
import { renderPage } from "./render";

const site: Site = { name: "Haho", baseUrl: "https://haho.example", language: "en", tokens: defaultTokens };
const strip: LinkedSectionFile = {
  id: "contact-strip",
  name: "Contact strip",
  savedAt: "",
  content: [{ type: "Section", props: { id: "s1", background: "dark", paddingY: "md", content: [{ type: "Heading", props: { id: "h", text: "Questions? Call us.", level: "h2", align: "left" } }] } }],
};
const page = (content: Page["puck"]["content"]): Page => ({ path: "/about", title: "About", description: "", puck: { root: { props: {} }, content } });

describe("linked-sections: rendered pages (F043)", () => {
  it("publish the section's blocks as plain HTML, with nothing of the builder", () => {
    const html = renderPage(site, page([{ type: "Heading", props: { id: "t", text: "About", level: "h1", align: "left" } }, linkedBlock("contact-strip")]), "", {
      linkedSections: new Map([[strip.id, strip]]),
    });
    expect(html).toContain("Questions? Call us.");
    expect(html).not.toContain("cr-linked");
    expect(html).not.toContain("Linked section");
  });

  it("name the page when a linked section is missing", () => {
    expect(() => renderPage(site, page([linkedBlock("gone")]), "", { linkedSections: new Map() })).toThrow(/^Page \/about: A page uses the linked section "gone"/);
  });
});

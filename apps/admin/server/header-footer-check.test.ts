import { defaultTokens, type Site } from "@crust/blocks";
import { describe, expect, it } from "vitest";
import { checkSite } from "./content";

const site: Site = { name: "Haho", baseUrl: "https://t.dev", language: "en", tokens: defaultTokens };

describe("saving site.json checks the header and footer too", () => {
  it("accepts a site without them (older sites) and with valid ones", () => {
    expect(checkSite(site)).toEqual([]);
    expect(checkSite({ ...site, header: { sticky: true, menu: [{ label: "Home", href: "/" }] }, footer: { columns: [] } })).toEqual([]);
  });

  it("refuses unsafe menu links and logo images without alt text", () => {
    const problems = checkSite({ ...site, header: { logo: { text: "", imageSrc: "/l.svg", imageAlt: "" }, menu: [{ label: "x", href: "javascript:alert(1)" }] } });
    expect(problems).toHaveLength(2);
    expect(problems[0]).toContain("alt text");
    expect(problems[1]).toContain("can't link to");
  });
});

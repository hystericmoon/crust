import { defaultTokens, type Page, type Site } from "@crust/blocks";
import { describe, expect, it } from "vitest";
import { renderPage } from "./render";

const site = (motion?: string): Site => ({
  name: "Haho",
  baseUrl: "https://haho.test",
  language: "en",
  tokens: motion ? { ...defaultTokens, style: { motion } as Site["tokens"]["style"] } : defaultTokens,
});
const page: Page = {
  path: "/",
  title: "Home",
  description: "Hi",
  puck: { root: { props: {} }, content: [{ type: "Section", props: { id: "s", background: "background", paddingY: "lg", entrance: "zoom", content: [] } }] },
};

describe("published motion (F075)", () => {
  it("adds no motion CSS to sites that never turned it on, and no script either way", () => {
    for (const s of [site(), site("off")]) {
      const html = renderPage(s, page, ".cr-page{margin:0}");
      expect(html).not.toContain("cr-enter-rise");
      expect(html).not.toContain("prefers-reduced-motion");
    }
    expect(renderPage(site("lively"), page, "")).not.toContain("<script");
  });

  it("adds it, minified and intact, when motion is on", () => {
    const html = renderPage(site("subtle"), page, "");
    expect(html).toContain("@media (prefers-reduced-motion: no-preference){@keyframes cr-enter-rise");
    expect(html).toContain("animation-range: cover calc(var(--cr-i,0) * 4vh) cover calc(30vh + var(--cr-i,0) * 4vh)");
    expect(html).toContain('class="cr-section cr-style-background cr-height-auto cr-valign-center cr-enter-zoom"');
  });
});

import { readFileSync } from "node:fs";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { config, type CardProps, type ColumnsProps } from "./config";

type Render<P> = (props: P & { puck: { isEditing: false } }) => ReactNode;

/** A slot that renders a marker so tests can see which columns appear. */
const slot = (label: string) => () => <p>{label}</p>;

function renderColumns(props: Partial<Record<keyof ColumnsProps, unknown>>) {
  const block = config.components.Columns;
  const render = block.render as unknown as Render<Record<string, unknown>>;
  const all = {
    ...block.defaultProps,
    column1: slot("one"),
    column2: slot("two"),
    column3: slot("three"),
    column4: slot("four"),
    ...props,
  };
  return renderToStaticMarkup(<>{render({ ...all, puck: { isEditing: false } })}</>);
}

function renderCard(props: Partial<CardProps>) {
  const block = config.components.Card;
  const render = block.render as unknown as Render<CardProps>;
  return renderToStaticMarkup(<>{render({ ...(block.defaultProps as CardProps), ...props, puck: { isEditing: false } })}</>);
}

describe("Columns block", () => {
  it("renders the chosen number of columns with the gap token", () => {
    const html = renderColumns({ count: "3", gap: "lg" });
    expect(html).toContain('class="cr-columns cr-columns-3"');
    expect(html).toContain("--cr-columns-gap:var(--cr-space-lg)");
    expect(html.match(/class="cr-column"/g)).toHaveLength(3);
    expect(html).toContain("<p>three</p>");
    expect(html).not.toContain("<p>four</p>");
  });

  it("keeps content of hidden columns out of the page", () => {
    const html = renderColumns({ count: "2" });
    expect(html).toContain("<p>two</p>");
    expect(html).not.toContain("three");
  });

  it("offers 2 to 4 columns, defaulting to 2", () => {
    const field = config.components.Columns.fields?.count as { options: { value: string }[] };
    expect(field.options.map((o) => o.value)).toEqual(["2", "3", "4"]);
    expect(config.components.Columns.defaultProps?.count).toBe("2");
  });

  it("doesn't allow sections or columns inside a column", () => {
    for (const name of ["column1", "column2", "column3", "column4"] as const) {
      const field = config.components.Columns.fields?.[name] as { type: string; disallow: string[] };
      expect(field.type).toBe("slot");
      expect(field.disallow).toEqual(["Section", "Columns"]);
    }
  });
});

describe("Columns layout CSS", () => {
  const css = readFileSync(new URL("./styles.css", import.meta.url), "utf8");

  it("stacks to one column on phones by default", () => {
    expect(css).toMatch(/\.cr-columns \{[^}]*grid-template-columns: minmax\(0, 1fr\);/);
  });
  it("uses two columns from tablet width and the full count from 1024px", () => {
    expect(css).toMatch(/@media \(min-width: 640px\) \{\s*\.cr-columns \{ grid-template-columns: repeat\(2,/);
    expect(css).toMatch(/@media \(min-width: 1024px\) \{\s*\.cr-columns-3 \{[^}]*repeat\(3,[^}]*\}\s*\.cr-columns-4 \{[^}]*repeat\(4,/);
  });
});

describe("Card block", () => {
  it("renders image, title, text and link", () => {
    const html = renderCard({
      imageSrc: "https://x.dev/a.jpg",
      imageAlt: "A desk",
      title: "Design",
      titleLevel: "h3",
      text: "One.\n\nTwo.",
      linkLabel: "Read about design",
      linkHref: "/design",
      background: "primary",
    });
    expect(html).toMatch(/^<article class="cr-card cr-bg-primary">/);
    expect(html).toContain('<img class="cr-card-media" src="https://x.dev/a.jpg" alt="A desk"');
    expect(html).toContain('<h3 class="cr-heading cr-card-title">Design</h3>');
    expect(html).toContain("<p>One.</p><p>Two.</p>");
    expect(html).toContain('<a class="cr-card-link" href="/design">Read about design</a>');
  });

  it("leaves out empty parts instead of rendering placeholders", () => {
    const html = renderCard({ imageSrc: "", title: " ", text: "", linkLabel: "", linkHref: "" });
    expect(html).toBe('<article class="cr-card cr-bg-surface"><div class="cr-card-body"></div></article>');
  });

  it("needs both link text and link to show a link", () => {
    expect(renderCard({ linkLabel: "Go", linkHref: "" })).not.toContain("<a ");
    expect(renderCard({ linkLabel: "", linkHref: "/x" })).not.toContain("<a ");
  });

  it("omits alt when missing so the publish check can flag it", () => {
    expect(renderCard({ imageSrc: "/a.jpg", imageAlt: "  " })).toMatch(/<img [^>]*src="\/a.jpg"(?![^>]*alt=)/);
  });

  it("neutralises unsafe links and image URLs", () => {
    const html = renderCard({ imageSrc: "javascript:x", imageAlt: "x", linkLabel: "Go", linkHref: "javascript:alert(1)" });
    expect(html).toContain('src="#"');
    expect(html).toContain('href="#"');
  });

  it("escapes user text", () => {
    expect(renderCard({ title: "<b>x</b>" })).toContain("&lt;b&gt;x&lt;/b&gt;");
  });

  it("uses the chosen heading level", () => {
    expect(renderCard({ titleLevel: "h2" })).toContain("<h2 ");
    expect(renderCard({ titleLevel: "h4" })).toContain("<h4 ");
  });
});

describe("editor canvas", () => {
  it("wraps the canvas in the page's base styles so the preview matches", () => {
    const render = config.root?.render as unknown as (p: { children: ReactNode }) => ReactNode;
    expect(renderToStaticMarkup(<>{render({ children: <p>x</p> })}</>)).toBe('<div class="cr-page"><p>x</p></div>');
  });
});

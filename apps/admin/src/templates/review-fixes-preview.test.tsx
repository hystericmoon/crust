// @vitest-environment happy-dom
// F069 fix 4: the template preview has a real screen height, so a full-height opening section can't stretch it (F048).
import { config, defaultTokens, makeTemplate, migrateChrome, readTemplate, type TemplateSource } from "@crust/blocks";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { TemplatesScreen } from "./TemplatesScreen";

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});
afterEach(cleanup);

async function tallHero() {
  const site = { name: "Tall", language: "en" };
  const source: TemplateSource = {
    site,
    tokens: defaultTokens,
    chrome: migrateChrome({ ...site }, [{ path: "/", title: "Home" }]),
    pages: [
      {
        path: "/",
        title: "Home",
        description: "Welcome.",
        puck: {
          root: { props: {} },
          content: [{ type: "Section", props: { id: "s", background: "dark", height: "full", content: [{ type: "Heading", props: { id: "h", text: "Hello", level: "h1", align: "left" } }] } }],
        } as never,
      },
    ],
    sections: [],
    layouts: [],
    blog: { title: "Journal", intro: "" },
    posts: [],
    media: [],
  };
  const { template } = await makeTemplate({ name: "Tall", description: "A full-height hero." }, source, async () => "");
  return readTemplate(JSON.stringify(template), config.components).template!;
}

describe("review-fixes 4: template preview height (F048)", () => {
  it("shows each width at a fixed screen height and scrolls inside it", async () => {
    const t = await tallHero();
    render(<TemplatesScreen siteName="Bakery" githubOn={false} currentSite={async () => ({ language: "en", pages: [], posts: 0, sections: [], photos: [], drafts: 0 })} sources={[{ id: "tall", load: async () => ({ template: t, problems: [] }) }]} />);
    await act(async () => undefined);
    fireEvent.click(screen.getByRole("button", { name: /^Tall/ }));
    const desktop = screen.getByTitle("Tall: Home, desktop width") as HTMLIFrameElement;
    expect(desktop.style.width).toBe("1280px");
    expect(desktop.style.height).toBe("800px");
    expect((desktop.parentElement as HTMLElement).style.height).toBe("800px");
    fireEvent.click(screen.getByRole("button", { name: "Phone" }));
    const phone = screen.getByTitle("Tall: Home, phone width") as HTMLIFrameElement;
    expect(phone.style.height).toBe("812px");
    fireEvent.click(screen.getByRole("button", { name: "Tablet" }));
    expect((screen.getByTitle("Tall: Home, tablet width") as HTMLIFrameElement).style.height).toBe("1024px");
    expect(screen.getByText(/Scroll inside the preview to see the whole page\./)).toBeTruthy();
  });
});

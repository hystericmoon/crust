// @vitest-environment happy-dom
import { defaultTokens, resolveSectionStyle, type Page, type SectionStyleId, type Site, type SiteTokens, type TintLevel } from "@crust/blocks";
import type { Data } from "@puckeditor/core";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { SiteSettings } from "../settings/SiteSettings";
import { HeightPicker, SectionStyleEditor, StyleTiles, TintPicker } from "./controls";
import { countSectionStyles } from "./site-style";

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});
afterEach(() => {
  cleanup();
  localStorage.clear();
});

const radio = (name: string | RegExp) => screen.getByRole("radio", { name });

describe("section style tiles", () => {
  it("shows every style with how often it's used, and picks with arrow keys", () => {
    const onChange = vi.fn();
    render(<StyleTiles tokens={defaultTokens} value="surface" onChange={onChange} counts={{ surface: 2, dark: 1 }} />);
    expect(screen.getByRole("radiogroup", { name: "Section style" })).toBeTruthy();
    expect(radio("Muted · 2 on this page").getAttribute("aria-checked")).toBe("true");
    expect(radio("Page · 0 on this page").tabIndex).toBe(-1);
    fireEvent.keyDown(radio("Muted · 2 on this page"), { key: "ArrowRight" });
    expect(onChange).toHaveBeenCalledWith("primary");
    fireEvent.click(radio("Dark · 1 on this page"));
    expect(onChange).toHaveBeenLastCalledWith("dark");
  });
});

describe("height picker", () => {
  it("offers the four heights", () => {
    const onChange = vi.fn();
    render(<HeightPicker value="auto" onChange={onChange} />);
    fireEvent.click(radio("Full screen"));
    expect(onChange).toHaveBeenCalledWith("full");
  });
});

describe("image tint", () => {
  function Harness({ style }: { style: SectionStyleId }) {
    const [tint, setTint] = useState<TintLevel>("light");
    return <TintPicker tokens={defaultTokens} style={style} value={tint} onChange={setTint} />;
  }

  it("says when a tint is too faint and fixes it in one click", () => {
    render(<Harness style="background" />);
    expect(screen.getByRole("status").textContent).toMatch(/Light is too faint on Page; Crust makes it stronger/);
    act(() => fireEvent.click(screen.getByRole("button", { name: /Use (medium|strong) tint/ })));
    expect(screen.getByRole("status").textContent).toBe("Text stays readable on any photo.");
  });
});

describe("site-wide style editor", () => {
  function Harness({ onTokens }: { onTokens: (t: SiteTokens) => void }) {
    const [tokens, setTokens] = useState(defaultTokens);
    return (
      <SectionStyleEditor
        tokens={tokens}
        id="surface"
        usedOnPage={2}
        onChange={(t) => {
          setTokens(t);
          onTokens(t);
        }}
      />
    );
  }

  it("says how many sections change", () => {
    render(<Harness onTokens={() => undefined} />);
    expect(screen.getByText(/Changes 2 sections on this page, and every Muted section on other pages/)).toBeTruthy();
  });

  it("changes the style's background and button look for the whole site", () => {
    const onTokens = vi.fn();
    render(<Harness onTokens={onTokens} />);
    fireEvent.click(radio("Site colour: Text"));
    expect(onTokens).toHaveBeenLastCalledWith(
      expect.objectContaining({ sectionStyles: expect.objectContaining({ surface: { bg: "text", button: "solid" } }) }),
    );
    fireEvent.click(radio("Outline"));
    const last = onTokens.mock.lastCall![0] as SiteTokens;
    expect(last.sectionStyles!.surface).toEqual({ bg: "text", button: "outline" });
    // Text picks itself: light text on the now dark background.
    expect(resolveSectionStyle(last, "surface").ink.toLowerCase()).toBe("#ffffff");
  });

  it("takes a custom hex colour", () => {
    const onTokens = vi.fn();
    render(<Harness onTokens={onTokens} />);
    fireEvent.change(screen.getByLabelText("Custom colour"), { target: { value: "#f3ead8" } });
    expect((onTokens.mock.lastCall![0] as SiteTokens).sectionStyles!.surface.bg).toBe("#F3EAD8");
    expect(radio("Custom colour #F3EAD8").getAttribute("aria-checked")).toBe("true");
  });

  it("warns when no site colour reads on the background", () => {
    const onTokens = vi.fn();
    render(<Harness onTokens={onTokens} />);
    fireEvent.change(screen.getByLabelText("Custom colour"), { target: { value: "#7a7a7a" } });
    expect(screen.getByText(/No site colour is readable on this background/)).toBeTruthy();
  });
});

describe("counting section styles on a page", () => {
  it("counts sections by style, treating old sections without a style as Page", () => {
    const data = {
      root: { props: {} },
      content: [
        { type: "Section", props: { id: "a", background: "surface", content: [] } },
        { type: "Section", props: { id: "b", background: "surface", content: [] } },
        { type: "Section", props: { id: "c", content: [{ type: "Heading", props: { id: "h" } }] } },
        { type: "Heading", props: { id: "x" } },
      ],
    } as unknown as Data;
    expect(countSectionStyles(data)).toEqual({ surface: 2, background: 1 });
  });
});

describe("Site settings: Section styles", () => {
  const site: Site = { name: "Test", baseUrl: "https://t.dev", language: "en", tokens: defaultTokens };
  const page: Page = { path: "/", title: "Home", description: "d", puck: { root: { props: {} }, content: [] } };

  it("edits each style for the whole site and saves with the other settings", async () => {
    const onSave = vi.fn(async (_t: SiteTokens) => "Saved.");
    function Harness() {
      const [draft, setDraft] = useState(defaultTokens);
      return <SiteSettings site={site} page={page} saved={defaultTokens} draft={draft} onChange={setDraft} onSave={onSave} onDiscard={() => undefined} />;
    }
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Section styles" }));
    const card = screen.getByRole("region", { name: "Section styles" });
    const dark = within(card).getByRole("group", { name: "Dark sections" });
    fireEvent.click(within(dark).getByRole("radio", { name: "Site colour: Primary" }));
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Save" })));
    expect(onSave.mock.lastCall![0].sectionStyles!.dark).toEqual({ bg: "primary", button: "inverse" });
  });
});

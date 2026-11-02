// @vitest-environment happy-dom
import { defaultTokens, type SiteTokens } from "@crust/blocks";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MovingField, sectionFieldShown } from "../sections/sections-v2-fields";
import { SiteStyleContext, type SiteStyle } from "../sections/site-style";
import { tabOf } from "../tabs/tabs";
import { groups } from "./SiteSettings";
import { MotionOptions } from "./StyleGroups";

afterEach(() => cleanup());
const radio = (name: string) => screen.getByRole("radio", { name });
const withMotion = (motion: "off" | "subtle" | "lively"): SiteTokens => ({ ...defaultTokens, style: { motion } });
const site = (tokens: SiteTokens): SiteStyle => ({ tokens, setTokens: () => undefined, dirty: false, save: async () => "", discard: () => undefined });

describe("F075 Site settings → Motion", () => {
  it("is its own group, after Links", () => {
    const ids = groups.map((g) => g.id);
    expect(ids.indexOf("motion")).toBe(ids.indexOf("links") + 1);
  });

  it("offers Off, Subtle and Lively; missing means Off; picking keeps the other style options", () => {
    const onChange = vi.fn();
    const tokens = { ...defaultTokens, style: { buttonShape: "pill" as const } };
    render(<MotionOptions tokens={tokens} onChange={onChange} />);
    expect(screen.getAllByRole("radio")).toHaveLength(3);
    expect(radio("Off").getAttribute("aria-checked")).toBe("true");
    expect(screen.getByText(/Nothing moves\./)).toBeTruthy();
    fireEvent.click(radio("Subtle"));
    expect(onChange).toHaveBeenCalledWith({ ...tokens, style: { buttonShape: "pill", motion: "subtle" } });
  });

  it("moves with the arrow keys and says what the level does", () => {
    const onChange = vi.fn();
    render(<MotionOptions tokens={withMotion("subtle")} onChange={onChange} />);
    expect(screen.getByText(/Sections ease in as they scroll into view/)).toBeTruthy();
    expect(screen.getByText(/Reduce motion on their device always see a still page/)).toBeTruthy();
    fireEvent.keyDown(radio("Subtle"), { key: "ArrowRight" });
    expect(onChange).toHaveBeenCalledWith(withMotion("lively"));
  });
});

describe("F075 builder fields", () => {
  it("sit in the Style tab", () => {
    expect(tabOf("Section", "entrance")).toBe("style");
    expect(tabOf("Section", "parallax")).toBe("style");
    expect(tabOf("LogoRow", "moving")).toBe("style");
  });

  it("offer parallax only for a photo or video background with a photo", () => {
    expect(sectionFieldShown("parallax", { imageSrc: "/media/a.jpg" }, false)).toBe(true);
    expect(sectionFieldShown("parallax", { bgKind: "video", imageSrc: "/media/a.jpg" }, false)).toBe(true);
    expect(sectionFieldShown("parallax", {}, false)).toBe(false);
    expect(sectionFieldShown("parallax", { bgKind: "gradient", imageSrc: "/media/a.jpg" }, false)).toBe(false);
    expect(sectionFieldShown("entrance", {}, true)).toBe(true);
  });

  it("the moving logo row is a labelled checkbox, and says when the site's motion is off", () => {
    const onChange = vi.fn();
    const { unmount } = render(
      <SiteStyleContext.Provider value={site(defaultTokens)}>
        <MovingField value={undefined} onChange={onChange} />
      </SiteStyleContext.Provider>,
    );
    const box = screen.getByRole("checkbox", { name: "Scroll slowly" });
    expect(box.getAttribute("aria-describedby")).toBeTruthy();
    fireEvent.click(box);
    expect(onChange).toHaveBeenCalledWith("yes");
    expect(screen.getByText(/Motion is Off for this site/)).toBeTruthy();
    unmount();
    render(
      <SiteStyleContext.Provider value={site(withMotion("subtle"))}>
        <MovingField value="yes" onChange={onChange} />
      </SiteStyleContext.Provider>,
    );
    expect(screen.queryByText(/Motion is Off for this site/)).toBeNull();
  });
});

// @vitest-environment happy-dom
import { applyLook, defaultTokens, gradientReads, styleLooks, type FocalPoint, type SectionGradient } from "@crust/blocks";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FocusPicker, GradientPicker, VideoInput, WidthPicker } from "./sections-v2-fields";

afterEach(() => cleanup());
const radio = (name: string | RegExp) => screen.getByRole("radio", { name });

describe("F073 width picker", () => {
  it("offers six widths as pictures with spoken names, and moves with arrow keys", () => {
    const onChange = vi.fn();
    render(<WidthPicker value="normal" onChange={onChange} />);
    expect(screen.getAllByRole("radio")).toHaveLength(6);
    expect(radio(/^Normal: /).getAttribute("aria-checked")).toBe("true");
    expect(radio(/^Right edge: .*right edge of the screen/)).toBeTruthy();
    fireEvent.keyDown(radio(/^Normal: /), { key: "ArrowRight" });
    expect(onChange).toHaveBeenCalledWith("wide");
  });
});

describe("F073 gradient picker", () => {
  it("offers only colours that keep the text readable, and sets direction", () => {
    const onChange = vi.fn();
    render(<GradientPicker tokens={defaultTokens} style="background" value={{ to: "surface", direction: "down" }} onChange={onChange} />);
    expect(radio("Surface").getAttribute("aria-checked")).toBe("true");
    expect(screen.queryByRole("radio", { name: "Primary" })).toBeNull();
    fireEvent.click(radio("Diagonal"));
    expect(onChange).toHaveBeenCalledWith({ to: "surface", direction: "diagonal" });
  });

  it("says so when a saved colour no longer reads, and when none can", () => {
    const g: SectionGradient = { to: "primary", direction: "down" };
    const { unmount } = render(<GradientPicker tokens={defaultTokens} style="background" value={g} onChange={() => undefined} />);
    expect(screen.getByText(/no longer reads well here/)).toBeTruthy();
    unmount();
    const harsh = { ...defaultTokens, colors: { background: "#777777", surface: "#777777", text: "#777777", muted: "#777777", primary: "#777777", onPrimary: "#777777" } };
    render(<GradientPicker tokens={harsh} style="background" value={undefined} onChange={() => undefined} />);
    expect(screen.getByText(/No site colour keeps this style's text readable/)).toBeTruthy();
  });

  it("every colour offered in the style library's looks passes the check", () => {
    for (const look of styleLooks) {
      const tokens = applyLook(defaultTokens, look);
      const { unmount } = render(<GradientPicker tokens={tokens} style="dark" value={undefined} onChange={() => undefined} />);
      for (const r of screen.queryAllByRole("radio").filter((b) => b.closest(".sx-grad-colours"))) {
        const role = (["background", "surface", "text", "muted", "primary", "onPrimary"] as const).find(
          (x) => ({ background: "Page", surface: "Surface", text: "Text", muted: "Muted text", primary: "Primary", onPrimary: "Text on primary" })[x] === r.getAttribute("aria-label"),
        )!;
        expect(gradientReads(tokens, "dark", role)).toBe(true);
      }
      unmount();
    }
  });
});

describe("F073 focal point", () => {
  it("has a slider for each direction, for the keyboard", () => {
    let f: FocalPoint | undefined;
    render(<FocusPicker src="/media/a.jpg" value={{ x: 50, y: 50 }} onChange={(v) => (f = v)} />);
    const across = screen.getByRole("slider", { name: "Across" });
    fireEvent.change(across, { target: { value: "20" } });
    expect(f).toEqual({ x: 20, y: 50 });
    fireEvent.change(screen.getByRole("slider", { name: "Down" }), { target: { value: "75" } });
    expect(f).toEqual({ x: 50, y: 75 });
    expect(screen.queryByRole("button", { name: "Back to the middle" })).toBeNull();
  });

  it("goes back to the middle", () => {
    const onChange = vi.fn();
    render(<FocusPicker src="/media/a.jpg" value={{ x: 10, y: 90 }} onChange={onChange} />);
    expect(screen.getByText("10%")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Back to the middle" }));
    expect(onChange).toHaveBeenCalledWith({ x: 50, y: 50 });
  });
});

describe("F073 video address", () => {
  it("explains what's wrong with an address it can't use", () => {
    const { rerender } = render(<VideoInput value="https://a.test/clip.mov" onChange={() => undefined} hasStill />);
    const input = screen.getByLabelText("Video address");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByText(/must start with https:\/\/ and end in .mp4 or .webm/)).toBeTruthy();
    rerender(<VideoInput value="https://a.test/clip.mp4" onChange={() => undefined} hasStill={false} />);
    expect(screen.getByText(/Add a still photo above/)).toBeTruthy();
    rerender(<VideoInput value="https://a.test/clip.mp4" onChange={() => undefined} hasStill />);
    expect(screen.getByText(/Visitors with Reduce motion on see the still photo/)).toBeTruthy();
  });
});

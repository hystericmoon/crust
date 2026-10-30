// @vitest-environment happy-dom
import { config, type Components } from "@crust/blocks";
import type { Config } from "@puckeditor/core";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { deviceWidths, ShowOnField, WidthsField, withResponsiveEditing } from "./fields";

let selected: { type: string; props: Record<string, unknown> } | null;
const dispatch = vi.fn();
vi.mock("@puckeditor/core", async (orig) => ({
  ...(await orig<typeof import("@puckeditor/core")>()),
  useGetPuck: () => () => ({ dispatch, appState: { ui: { viewports: { current: { width: 1280, height: "auto" }, options: [] } } } }),
  createUsePuck: () => (selector: (s: unknown) => unknown) => selector({ selectedItem: selected }),
}));

beforeEach(() => {
  selected = { type: "Columns", props: { count: "2" } };
  dispatch.mockReset();
});
afterEach(() => cleanup());

function Widths({ initial }: { initial?: Record<string, string> }) {
  const [value, setValue] = useState(initial);
  return (
    <>
      <WidthsField value={value} onChange={setValue} />
      <pre data-testid="value">{JSON.stringify(value ?? null)}</pre>
    </>
  );
}
const value = () => JSON.parse(screen.getByTestId("value").textContent!);

describe("responsive: widths for all three devices at once", () => {
  it("shows a row per device with today's behaviour selected", () => {
    render(<Widths />);
    const checked = (name: string) => within(screen.getByRole("radiogroup", { name })).getByRole("radio", { checked: true }).getAttribute("aria-label");
    expect(checked("Desktop widths")).toBe("1/2 + 1/2");
    expect(checked("Tablet widths")).toBe("1/2 + 1/2");
    expect(checked("Phone widths")).toBe("Stacked");
  });

  it("changing one device keeps the others as they look", () => {
    render(<Widths />);
    act(() => fireEvent.click(within(screen.getByRole("radiogroup", { name: "Desktop widths" })).getByRole("radio", { name: "2/3 + 1/3" })));
    expect(value()).toEqual({ desktop: "two-one", tablet: "equal", phone: "stack" });
  });

  it("offers the options for the current column count", () => {
    selected = { type: "Columns", props: { count: "4" } };
    render(<Widths />);
    expect(within(screen.getByRole("radiogroup", { name: "Tablet widths" })).getAllByRole("radio").map((r) => r.getAttribute("aria-label"))).toEqual(["Equal", "2 + 2", "Stacked"]);
  });

  it("arrow keys move between widths", () => {
    render(<Widths />);
    act(() => fireEvent.keyDown(within(screen.getByRole("radiogroup", { name: "Phone widths" })).getByRole("radio", { name: "Stacked" }), { key: "ArrowRight" }));
    expect(value().phone).toBe("equal");
  });

  it("each device name shows that width in the canvas", () => {
    render(<Widths />);
    fireEvent.click(screen.getByRole("button", { name: /^Phone\s*: show in the canvas$/ }));
    expect(dispatch).toHaveBeenCalledWith({ type: "setUi", ui: { viewports: { current: { width: deviceWidths.phone, height: "auto" }, options: [] } } });
  });
});

describe("responsive: show on", () => {
  function Show() {
    const [v, setV] = useState<("desktop" | "tablet" | "phone")[] | undefined>(undefined);
    return (
      <>
        <ShowOnField value={v} onChange={setV} />
        <pre data-testid="value">{JSON.stringify(v ?? null)}</pre>
      </>
    );
  }

  it("toggles each device and says what it means", () => {
    render(<Show />);
    const phone = screen.getByRole("button", { name: "Phone" });
    expect(phone.getAttribute("aria-pressed")).toBe("true");
    act(() => fireEvent.click(phone));
    expect(phone.getAttribute("aria-pressed")).toBe("false");
    expect(value()).toEqual(["phone"]);
    expect(screen.getByRole("status").textContent).toMatch(/^Hidden on phone\. In the builder it shows faded there/);
    act(() => fireEvent.click(screen.getByRole("button", { name: "Desktop" })));
    act(() => fireEvent.click(screen.getByRole("button", { name: "Tablet" })));
    expect(screen.getByRole("status").textContent).toBe("Hidden on every device: visitors won't see this block.");
    act(() => fireEvent.click(phone));
    expect(value()).toEqual(["desktop", "tablet"]);
  });
});

describe("responsive: builder config", () => {
  it("adds Show on to every block and Widths to Columns", () => {
    const c = withResponsiveEditing(config as Config<Components>);
    for (const comp of Object.values(c.components)) expect(Object.keys(comp.fields ?? {})).toContain("hideOn");
    expect(Object.keys(c.components.Columns.fields ?? {})).toContain("widths");
    expect(Object.keys(c.components.Heading.fields ?? {})).not.toContain("widths");
  });
});

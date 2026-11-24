// @vitest-environment happy-dom
// F097: a selected section's toolbar says Move / Duplicate / Delete in words; other blocks keep icons only.
import { config } from "@crust/blocks";
import type { ComponentData, Config, Data } from "@puckeditor/core";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

let selectedType = "Section";
const block = (type: string, id: string): ComponentData => ({ type, props: { ...((config as unknown as Config).components[type]?.defaultProps ?? {}), id } });
const data: Data = { root: { props: {} }, content: [block("Section", "a"), block("Section", "b")] };

vi.mock("@puckeditor/core", async (orig) => {
  const real = await orig<typeof import("@puckeditor/core")>();
  const Group = ({ children }: { children: unknown }) => children;
  const Action = ({ children, label }: { children: unknown; label?: string }) => <button type="button" title={label}>{children as never}</button>;
  return {
    ...real,
    ActionBar: Object.assign(({ children }: { children: unknown }) => <div data-bar>{children as never}</div>, { Group, Action, Label: () => null }),
    useGetPuck: () => () => ({}),
    createUsePuck: () => (selector: (s: unknown) => unknown) =>
      selector({ appState: { data }, config, selectedItem: { type: selectedType, props: { id: "a" } } }),
  };
});
vi.mock("../sections/editing", () => ({ SectionToolbar: ({ moves }: { moves?: unknown }) => <>{moves as never}</> }));

import { KeyboardActionBar } from "./KeyboardEditing";

afterEach(cleanup);

describe("section toolbar words (F097)", () => {
  it("a section's bar is wrapped for words and its Move button has one", () => {
    const { container } = render(<KeyboardActionBar parentAction={null}><button type="button" title="Duplicate" /></KeyboardActionBar>);
    expect(container.querySelector(".kb-words [data-bar]")).toBeTruthy();
    expect(container.querySelector(".kb-word")?.textContent).toBe("Move down");
  });

  it("another block keeps the plain icon bar", () => {
    selectedType = "Heading";
    const { container } = render(<KeyboardActionBar parentAction={null}>{null}</KeyboardActionBar>);
    expect(container.querySelector(".kb-words")).toBeNull();
    expect(container.querySelector(".kb-word")).toBeNull();
    selectedType = "Section";
  });
});

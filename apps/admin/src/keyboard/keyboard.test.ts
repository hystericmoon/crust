import { config } from "@crust/blocks";
import type { ComponentData, Config, Data } from "@puckeditor/core";
import { describe, expect, it } from "vitest";
import { availableMoves, findById, planInsert, planMove, ROOT_ZONE, visibleSlots } from "./moves";

const cfg = config as unknown as Config;
const block = (type: string, id: string, props: Record<string, unknown> = {}): ComponentData => ({
  type,
  props: { ...(cfg.components[type]?.defaultProps ?? {}), ...props, id },
});

/** Page: Heading, Section[Text, Button], Columns[ [Card a], [Card b], hidden [Card c] ], Spacer */
const page = (): Data => ({
  root: { props: {} },
  content: [
    block("Heading", "h"),
    block("Section", "s", { content: [block("Text", "t"), block("Button", "b")] }),
    block("Columns", "c", {
      count: "2",
      column1: [block("Card", "ca")],
      column2: [block("Card", "cb")],
      column3: [block("Card", "cc")],
      column4: [],
    }),
    block("Spacer", "sp"),
  ],
});

describe("keyboard: finding blocks", () => {
  it("locates blocks in the page and inside slots", () => {
    const d = page();
    expect(findById(d, "h")).toMatchObject({ zone: ROOT_ZONE, index: 0, parent: null });
    expect(findById(d, "b")).toMatchObject({ zone: "s:content", index: 1, parent: { slot: "content", index: 1 } });
    expect(findById(d, "cb")).toMatchObject({ zone: "c:column2", index: 0 });
    expect(findById(d, "nope")).toBeNull();
  });

  it("only offers the columns that are shown", () => {
    const columns = findById(page(), "c")!.item;
    expect(visibleSlots(cfg, columns).map(([name]) => name)).toEqual(["column1", "column2"]);
  });
});

describe("keyboard: moving blocks (drag alternatives)", () => {
  it("moves up and down within the same place", () => {
    const d = page();
    expect(planMove(d, cfg, "b", "up")).toEqual({
      action: { type: "reorder", sourceIndex: 1, destinationIndex: 0, destinationZone: "s:content" },
      announcement: "Button moved up in Section, position 1 of 2.",
    });
    expect(planMove(d, cfg, "t", "up")).toBeNull();
    expect(planMove(d, cfg, "sp", "down")).toBeNull();
    expect(planMove(d, cfg, "h", "down")?.announcement).toBe("Heading moved down in the page, position 2 of 4.");
  });

  it("moves a block out of its section, right after it", () => {
    expect(planMove(page(), cfg, "t", "out")).toEqual({
      action: { type: "move", sourceIndex: 0, sourceZone: "s:content", destinationIndex: 2, destinationZone: ROOT_ZONE },
      announcement: "Text moved out of Section into the page, position 3 of 5.",
    });
    expect(planMove(page(), cfg, "h", "out")).toBeNull();
  });

  it("moves into the block above when that block has room for it", () => {
    const d: Data = { root: { props: {} }, content: [block("Section", "s", { content: [block("Text", "t")] }), block("Heading", "h")] };
    expect(planMove(d, cfg, "h", "into")).toEqual({
      action: { type: "move", sourceIndex: 1, sourceZone: ROOT_ZONE, destinationIndex: 1, destinationZone: "s:content" },
      announcement: "Heading moved into Section, position 2 of 2.",
    });
    // A Heading above has no slot.
    expect(planMove(d, cfg, "s", "into")).toBeNull();
  });

  it("moves into the first column of Columns above", () => {
    const d = page();
    expect(planMove(d, cfg, "sp", "into")).toEqual({
      action: { type: "move", sourceIndex: 3, sourceZone: ROOT_ZONE, destinationIndex: 1, destinationZone: "c:column1" },
      announcement: "Spacer moved into column 1 of Columns, position 2 of 2.",
    });
  });

  it("respects slot rules: no sections or columns inside a column", () => {
    const d: Data = { root: { props: {} }, content: [block("Columns", "c"), block("Section", "s")] };
    expect(planMove(d, cfg, "s", "into")).toBeNull();
  });

  it("moves between visible columns", () => {
    const d = page();
    expect(planMove(d, cfg, "ca", "nextSlot")).toEqual({
      action: { type: "move", sourceIndex: 0, sourceZone: "c:column1", destinationIndex: 1, destinationZone: "c:column2" },
      announcement: "Card moved to column 2 of Columns, position 2 of 2.",
    });
    expect(planMove(d, cfg, "ca", "prevSlot")).toBeNull();
    // Column 3 is hidden (count is 2), so there's no next column for b.
    expect(planMove(d, cfg, "cb", "nextSlot")).toBeNull();
    // A single-slot Section has no "other column".
    expect(planMove(d, cfg, "t", "nextSlot")).toBeNull();
  });

  it("lists only the moves that are possible", () => {
    expect(availableMoves(page(), cfg, "ca")).toEqual(["out", "nextSlot"]);
    expect(availableMoves(page(), cfg, "h")).toEqual(["down"]);
    expect(availableMoves(page(), cfg, "sp")).toEqual(["up", "into"]);
  });
});

describe("keyboard: adding blocks (drag-in alternative)", () => {
  it("adds after the selected block", () => {
    expect(planInsert(page(), cfg, "Image", "t", "Image-new")).toEqual({
      action: { type: "insert", componentType: "Image", destinationIndex: 1, destinationZone: "s:content", id: "Image-new" },
      announcement: "Image added to Section, position 2 of 3. It's selected; edit it in the panel on the right.",
    });
  });

  it("adds after the container when the block isn't allowed inside it", () => {
    // A Section can't go in a column, so it lands after the Columns block.
    expect(planInsert(page(), cfg, "Section", "ca", "S-new")?.action).toEqual({
      type: "insert",
      componentType: "Section",
      destinationIndex: 3,
      destinationZone: ROOT_ZONE,
      id: "S-new",
    });
  });

  it("adds at the end of the page when nothing is selected", () => {
    expect(planInsert(page(), cfg, "Text", null, "T-new")?.action).toMatchObject({ destinationIndex: 4, destinationZone: ROOT_ZONE });
    expect(planInsert(page(), cfg, "Nope", null, "x")).toBeNull();
  });
});

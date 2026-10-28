/**
 * Keyboard alternatives for every drag action in the builder. Pure functions
 * over Puck's page data, so they can be tested without a browser.
 *
 * Zones follow Puck's naming: the page itself is "root:default-zone", a slot
 * is "<blockId>:<slotName>".
 */
import type { ComponentData, Config, Data } from "@puckeditor/core";

export const ROOT_ZONE = "root:default-zone";

export type MoveKind = "up" | "down" | "out" | "into" | "prevSlot" | "nextSlot";

interface Located {
  item: ComponentData;
  zone: string;
  index: number;
  siblings: ComponentData[];
  /** The block whose slot holds this one; null at page level. */
  parent: { item: ComponentData; slot: string; zone: string; index: number } | null;
}

type SlotField = { type: "slot"; allow?: string[]; disallow?: string[] };
type AnyConfig = Config;

const slotFields = (config: AnyConfig, type: string): [string, SlotField][] =>
  Object.entries(config.components[type]?.fields ?? {}).filter(
    (entry): entry is [string, SlotField] => (entry[1] as { type?: string }).type === "slot",
  );

/** Slots that are actually shown. Columns hides the ones beyond its count. */
export function visibleSlots(config: AnyConfig, item: ComponentData): [string, SlotField][] {
  const slots = slotFields(config, item.type);
  if (item.type === "Columns") return slots.slice(0, Number(item.props.count) || slots.length);
  return slots;
}

const accepts = (slot: SlotField, type: string) =>
  (!slot.allow || slot.allow.includes(type)) && !(slot.disallow ?? []).includes(type);

/** Which slot field a zone belongs to, or null for the page itself. */
function slotOfZone(config: AnyConfig, data: Data, zone: string): SlotField | null {
  if (zone === ROOT_ZONE) return null;
  const [parentId, slot] = splitZone(zone);
  const parent = findById(data, parentId);
  const field = parent ? config.components[parent.item.type]?.fields?.[slot] : undefined;
  return (field as SlotField | undefined) ?? null;
}

const splitZone = (zone: string): [string, string] => {
  const i = zone.lastIndexOf(":");
  return [zone.slice(0, i), zone.slice(i + 1)];
};

const zoneAccepts = (config: AnyConfig, data: Data, zone: string, type: string) => {
  const slot = slotOfZone(config, data, zone);
  return slot === null || accepts(slot, type);
};

/** Finds a block anywhere in the page, with its position. */
export function findById(data: Data, id: string): Located | null {
  const walk = (
    items: ComponentData[],
    zone: string,
    parent: Located["parent"],
  ): Located | null => {
    for (const [index, item] of items.entries()) {
      if (item.props.id === id) return { item, zone, index, siblings: items, parent };
      for (const [key, value] of Object.entries(item.props)) {
        if (!Array.isArray(value) || !value.every((v) => v && typeof v === "object" && "type" in v)) continue;
        const found = walk(value as ComponentData[], `${item.props.id}:${key}`, { item, slot: key, zone, index });
        if (found) return found;
      }
    }
    return null;
  };
  return walk(data.content, ROOT_ZONE, null);
}

export interface PlannedMove {
  action:
    | { type: "reorder"; sourceIndex: number; destinationIndex: number; destinationZone: string }
    | { type: "move"; sourceIndex: number; sourceZone: string; destinationIndex: number; destinationZone: string };
  /** What happened, for screen readers: "Heading moved into Section, position 3 of 3." */
  announcement: string;
}

const labelOf = (config: AnyConfig, item: ComponentData) => config.components[item.type]?.label ?? item.type;

/** Human name for where a zone is: "the page", "Section", "column 2 of Columns". */
function placeName(config: AnyConfig, data: Data, zone: string): string {
  if (zone === ROOT_ZONE) return "the page";
  const [parentId, slot] = splitZone(zone);
  const parent = findById(data, parentId);
  if (!parent) return "the page";
  const label = labelOf(config, parent.item);
  const slots = visibleSlots(config, parent.item);
  if (slots.length > 1) {
    const n = slots.findIndex(([name]) => name === slot) + 1;
    return `column ${n} of ${label}`;
  }
  return label;
}

/**
 * Plans one keyboard move for block `id`. Returns null when the move isn't
 * possible (already at the top, nothing to move into, not allowed there).
 */
export function planMove(data: Data, config: AnyConfig, id: string, kind: MoveKind): PlannedMove | null {
  const at = findById(data, id);
  if (!at) return null;
  const { item, zone, index, siblings, parent } = at;
  const label = labelOf(config, item);

  const announce = (destZone: string, destIndex: number, total: number, verb: string) =>
    `${label} ${verb} ${placeName(config, data, destZone)}, position ${destIndex + 1} of ${total}.`;

  switch (kind) {
    case "up":
    case "down": {
      const dest = kind === "up" ? index - 1 : index + 1;
      if (dest < 0 || dest >= siblings.length) return null;
      return {
        action: { type: "reorder", sourceIndex: index, destinationIndex: dest, destinationZone: zone },
        announcement: announce(zone, dest, siblings.length, `moved ${kind} in`),
      };
    }
    case "out": {
      if (!parent || !zoneAccepts(config, data, parent.zone, item.type)) return null;
      const destIndex = parent.index + 1;
      const total = (findById(data, parent.item.props.id as string)?.siblings.length ?? 0) + 1;
      return {
        action: { type: "move", sourceIndex: index, sourceZone: zone, destinationIndex: destIndex, destinationZone: parent.zone },
        announcement: `${label} moved out of ${labelOf(config, parent.item)} into ${placeName(config, data, parent.zone)}, position ${destIndex + 1} of ${total}.`,
      };
    }
    case "into": {
      const above = siblings[index - 1];
      if (!above) return null;
      const slot = visibleSlots(config, above).find(([, field]) => accepts(field, item.type));
      if (!slot) return null;
      const destZone = `${above.props.id}:${slot[0]}`;
      const contents = (above.props[slot[0]] as ComponentData[] | undefined) ?? [];
      return {
        action: { type: "move", sourceIndex: index, sourceZone: zone, destinationIndex: contents.length, destinationZone: destZone },
        announcement: announce(destZone, contents.length, contents.length + 1, "moved into"),
      };
    }
    case "prevSlot":
    case "nextSlot": {
      if (!parent) return null;
      const slots = visibleSlots(config, parent.item);
      const i = slots.findIndex(([name]) => name === parent.slot);
      const target = slots[kind === "prevSlot" ? i - 1 : i + 1];
      if (i < 0 || !target || !accepts(target[1], item.type)) return null;
      const destZone = `${parent.item.props.id}:${target[0]}`;
      const contents = (parent.item.props[target[0]] as ComponentData[] | undefined) ?? [];
      return {
        action: { type: "move", sourceIndex: index, sourceZone: zone, destinationIndex: contents.length, destinationZone: destZone },
        announcement: announce(destZone, contents.length, contents.length + 1, "moved to"),
      };
    }
  }
}

export interface PlannedInsert {
  action: { type: "insert"; componentType: string; destinationIndex: number; destinationZone: string; id: string };
  announcement: string;
}

/**
 * Keyboard alternative to dragging a block in from the block list: adds it
 * right after the selected block (or after its container, if it can't go
 * there), or at the end of the page when nothing is selected.
 */
export function planInsert(
  data: Data,
  config: AnyConfig,
  type: string,
  selectedId: string | null,
  newId: string,
): PlannedInsert | null {
  if (!config.components[type]) return null;
  const label = config.components[type]?.label ?? type;
  const make = (zone: string, index: number, total: number): PlannedInsert => ({
    action: { type: "insert", componentType: type, destinationIndex: index, destinationZone: zone, id: newId },
    announcement: `${label} added to ${placeName(config, data, zone)}, position ${index + 1} of ${total}. It's selected; edit it in the panel on the right.`,
  });

  let at = selectedId ? findById(data, selectedId) : null;
  while (at) {
    if (zoneAccepts(config, data, at.zone, type)) return make(at.zone, at.index + 1, at.siblings.length + 1);
    at = at.parent ? findById(data, at.parent.item.props.id as string) : null;
  }
  return make(ROOT_ZONE, data.content.length, data.content.length + 1);
}

/** Moves offered for a block, in the order the action bar shows them. */
export function availableMoves(data: Data, config: AnyConfig, id: string): MoveKind[] {
  return (["up", "down", "out", "into", "prevSlot", "nextSlot"] as const).filter(
    (kind) => planMove(data, config, id, kind) !== null,
  );
}

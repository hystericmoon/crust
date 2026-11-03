/**
 * Builder fields for the F079 blocks: the Map's pin (Find on the map, or a
 * pasted link), and which fields show when (the slideshow's speed only when
 * it plays on its own).
 */
import type { Components, MapPin } from "@crust/blocks";
import { createUsePuck, type Config } from "@puckeditor/core";
import { MapPinField } from "./MapPinField";

const usePuckSelector = createUsePuck();
type Props = Record<string, unknown>;

/** Whether a field of an F079 block shows, given the block's settings. */
export function interactiveFieldShown(component: string, key: string, props: Props): boolean {
  if (component === "Slideshow" && key === "speed") return props.autoplay === "yes";
  return true;
}

function Pin({ value, onChange }: { value: unknown; onChange: (v: MapPin | null) => void }) {
  const address = usePuckSelector((s) => (s.selectedItem?.type === "Map" ? String(s.selectedItem.props.address ?? "") : ""));
  return <MapPinField value={value} onChange={onChange} address={address} />;
}

export function withInteractiveFields(config: Config<Components>): Config<Components> {
  const c = config.components;
  return {
    ...config,
    components: {
      ...c,
      Map: {
        ...c.Map,
        fields: {
          ...c.Map.fields,
          pin: { type: "custom", label: "Map pin", render: ({ value, onChange }: { value: unknown; onChange: (v: MapPin | null) => void }) => <Pin value={value} onChange={onChange} /> },
        },
      },
    },
  } as unknown as Config<Components>;
}

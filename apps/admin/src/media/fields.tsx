/**
 * Puts the media library into every image field of every block (F034):
 * top-level fields ("src", "imageSrc") and those inside lists (Gallery
 * photos, Grid cards, Logo row logos). Picking a photo also fills the
 * block's alt text from the library.
 */
import { mediaFileOf, type Components } from "@crust/blocks";
import type { Config } from "@puckeditor/core";
import { ImageField } from "./ImageField";
import { findMedia } from "./store";

/** Image address fields and the alt text field that goes with each. */
const IMAGE_KEYS: Record<string, string> = { src: "alt", imageSrc: "imageAlt" };

/** "Background image URL (optional)" → "Background image (optional)". */
export const imageLabel = (label: string | undefined) => (label ?? "Image").replace(/\s*URL\b/, "").trim() || "Image";

type AnyField = { type?: string; label?: string; arrayFields?: Record<string, AnyField> };
type Props = Record<string, unknown>;

/** The alt key for an image key, if this block has that field. */
const altKeyFor = (key: string, fields: Record<string, unknown>) => {
  const alt = IMAGE_KEYS[key];
  return alt && alt in fields ? alt : undefined;
};

/**
 * After a new library photo is put in a field, its alt text from the library
 * goes into the block's alt field (an old description would be wrong).
 */
export function fillAltText(props: Props, lastProps: Props | null, pairs: [string, string][]): Props {
  if (!lastProps) return props;
  let next = props;
  for (const [srcKey, altKey] of pairs) {
    const src = props[srcKey];
    if (typeof src !== "string" || src === lastProps[srcKey]) continue;
    const item = findMedia(mediaFileOf(src));
    if (item?.alt) next = { ...next, [altKey]: item.alt };
  }
  return next;
}

export function withMediaFields(config: Config<Components>): Config<Components> {
  const components = Object.fromEntries(
    Object.entries(config.components).map(([name, comp]) => {
      const fields: Record<string, unknown> = { ...comp.fields };
      const pairs: [string, string][] = [];
      for (const [key, f] of Object.entries(fields)) {
        const field = f as AnyField;
        if (field?.type === "text" && key in IMAGE_KEYS) {
          const alt = altKeyFor(key, fields);
          if (alt) pairs.push([key, alt]);
          const label = imageLabel(field.label);
          fields[key] = {
            type: "custom",
            label,
            render: ({ value, onChange }: { value: string | undefined; onChange: (v: string) => void }) => (
              <ImageField label={label} value={value ?? ""} onChange={onChange} />
            ),
          };
        } else if (field?.type === "array" && field.arrayFields) {
          const sub: Record<string, AnyField & { altKey?: string }> = { ...field.arrayFields };
          let changed = false;
          for (const [k, sf] of Object.entries(sub)) {
            if (sf?.type !== "text" || !(k in IMAGE_KEYS)) continue;
            sub[k] = { type: "image", label: imageLabel(sf.label), altKey: altKeyFor(k, sub) };
            changed = true;
          }
          if (changed) fields[key] = { ...field, arrayFields: sub };
        }
      }
      if (!pairs.length) return [name, { ...comp, fields }];
      const own = comp.resolveData;
      return [
        name,
        {
          ...comp,
          fields,
          resolveData: async (data: { props: Props }, params: { lastData: { props: Props } | null }) => {
            const base = (own ? await (own as (d: unknown, p: unknown) => Promise<{ props: Props }>)(data, params) : data) as { props: Props };
            const props = fillAltText(base.props, params.lastData?.props ?? null, pairs);
            return props === base.props ? base : { ...base, props };
          },
        },
      ];
    }),
  );
  return { ...config, components } as unknown as Config<Components>;
}

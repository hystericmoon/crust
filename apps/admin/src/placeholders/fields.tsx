/**
 * F046: "Replace me" marks in the builder. Template makers tick which of a
 * block's words and photos are sample content (Advanced tab); everyone else
 * meets them as dashed outlines and the "To replace" list.
 */
import { cleanPlaceholder, markableFields, type Components } from "@crust/blocks";
import type { Config } from "@puckeditor/core";
import { useId } from "react";

export function ReplaceMeField({ type, value, onChange }: { type: string; value: unknown; onChange: (v: string[] | undefined) => void }) {
  const marked = cleanPlaceholder(type, value);
  const id = useId();
  const fields = markableFields[type] ?? [];
  return (
    <fieldset className="ph-field" aria-describedby={`${id}-help`}>
      <legend className="ph-label">Replace me</legend>
      {fields.map((f) => {
        const on = marked.includes(f.field);
        return (
          <label key={f.field} className="ph-check">
            <input
              type="checkbox"
              checked={on}
              onChange={() => {
                const next = on ? marked.filter((x) => x !== f.field) : cleanPlaceholder(type, [...marked, f.field]);
                onChange(next.length ? next : undefined);
              }}
            />
            {f.label}
          </label>
        );
      })}
      <p className="ph-help" id={`${id}-help`}>
        For templates: tick sample words or photos that whoever uses the template should replace. Publishing waits until they're replaced.
      </p>
    </fieldset>
  );
}

/** Every block with words or photos gets the "Replace me" field. */
export function withPlaceholderEditing(config: Config<Components>): Config<Components> {
  const components = Object.fromEntries(
    Object.entries(config.components).map(([name, comp]) => {
      if (!markableFields[name]) return [name, comp];
      const fields = {
        ...comp.fields,
        placeholder: {
          type: "custom",
          label: "Replace me",
          render: ({ value, onChange }: { value: unknown; onChange: (v: string[] | undefined) => void }) => <ReplaceMeField type={name} value={value} onChange={onChange} />,
        },
      };
      return [name, { ...comp, fields }];
    }),
  );
  return { ...config, components } as unknown as Config<Components>;
}

/**
 * The Text block's Text field becomes the rich text editor in the builder
 * (F042). The published renderer never loads Lexical.
 */
import type { Components } from "@crust/blocks";
import type { Config } from "@puckeditor/core";
import { RichTextEditor } from "./RichTextEditor";

export function withRichText(config: Config<Components>): Config<Components> {
  const text = config.components.Text;
  return {
    ...config,
    components: {
      ...config.components,
      Text: {
        ...text,
        fields: {
          ...(text.fields as NonNullable<typeof text.fields>),
          text: {
            type: "custom",
            label: "Text",
            render: ({ value, onChange, id }) => <RichTextEditor id={id} label="Text" value={value} onChange={onChange} />,
          },
        } as NonNullable<typeof text.fields>,
      },
    },
  };
}

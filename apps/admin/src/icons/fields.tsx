/**
 * Builder fields for icons (F077): the icon picker replaces the `icon` text
 * fields of the Icon block, Card, Button and Icon list (and each list
 * line's own icon), and the Icon block asks for a name when it's a link.
 */
import { iconA11y, socialLinkOf, socialNetworkNames, socialNetworks, type Components } from "@crust/blocks";
import { createUsePuck, type Config } from "@puckeditor/core";
import { useId } from "react";
import { IconPicker } from "./IconPicker";

const usePuckSelector = createUsePuck();

type Render = { value: string | undefined; onChange: (v: string) => void };

const picker = (label: string, opts: { optional?: boolean; classic?: boolean; numbers?: boolean } = {}) => ({
  type: "custom" as const,
  label,
  render: ({ value, onChange }: Render) => <IconPicker label={label} value={value ?? ""} onChange={onChange} {...opts} />,
});

/** The Icon block's name field: required once the icon is a link (WCAG 1.1.1, 2.4.4, 4.1.2). */
function IconNameField({ value, onChange }: Render) {
  const id = useId();
  const href = usePuckSelector((s) => (s.selectedItem?.type === "Icon" ? String(s.selectedItem.props.href ?? "") : ""));
  const a11y = iconA11y(value ?? "", href);
  return (
    <div className="ic-field">
      <label className="ic-label" htmlFor={id}>
        Name for screen readers
      </label>
      <input
        id={id}
        className="ic-input"
        value={value ?? ""}
        aria-describedby={`${id}-note`}
        aria-invalid={a11y.missingName || undefined}
        onChange={(e) => onChange(e.target.value)}
      />
      <p id={`${id}-note`} className={a11y.missingName ? "ic-note is-warning" : "ic-note"}>
        {a11y.missingName
          ? "Needed: this icon is a link, so say where it goes (“Call us”, “Our menu”). Publishing waits until it has one."
          : a11y.kind === "image"
            ? "Read out as a picture with this name."
            : "Empty: the icon is decoration and screen readers skip it (right when words sit next to it)."}
      </p>
    </div>
  );
}

/** Under Social links: which networks Crust recognises from the pasted address. */
function SocialHelp() {
  const links = usePuckSelector((s) => (s.selectedItem?.type === "SocialLinks" ? ((s.selectedItem.props.links ?? []) as { href?: string }[]) : []));
  const bad = links.filter((l) => (l.href ?? "").trim() && !socialLinkOf(l.href ?? "")).length;
  return (
    <div className="ic-field">
      {bad ? (
        <p className="ic-note is-warning" role="status">
          {bad === 1 ? "One address isn't" : `${bad} addresses aren't`} a full https:// address, so {bad === 1 ? "it's" : "they're"} left out.
        </p>
      ) : null}
      <p className="ic-note">
        Crust picks the icon from the address: {socialNetworks.map((n) => socialNetworkNames[n]).join(", ")}. Other sites get a globe.
      </p>
    </div>
  );
}

export function withIconFields(config: Config<Components>): Config<Components> {
  const c = config.components;
  const iconList = c.IconList;
  const listItems = iconList.fields?.items as unknown as { arrayFields: Record<string, unknown> } & Record<string, unknown>;
  return {
    ...config,
    components: {
      ...c,
      Icon: {
        ...c.Icon,
        fields: {
          ...c.Icon.fields,
          icon: picker("Icon"),
          label: { type: "custom", label: "Name for screen readers", render: (p: Render) => <IconNameField {...p} /> },
        },
      },
      Card: { ...c.Card, fields: { ...c.Card.fields, icon: picker("Icon (shown when there's no photo)", { optional: true }) } },
      Button: { ...c.Button, fields: { ...c.Button.fields, icon: picker("Icon (optional)", { optional: true }) } },
      IconList: {
        ...iconList,
        fields: {
          ...iconList.fields,
          items: { ...listItems, arrayFields: { ...listItems.arrayFields, icon: { type: "icon", label: "Own icon (optional)", classic: true } } },
          icon: picker("Icon for every line", { classic: true, numbers: true }),
        },
      },
      SocialLinks: { ...c.SocialLinks, fields: { ...c.SocialLinks.fields, help: { type: "custom", label: "", render: () => <SocialHelp /> } } },
    },
  } as unknown as Config<Components>;
}

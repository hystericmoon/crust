/**
 * Icon, Divider and Social links blocks (F077). Plain HTML and SVG, no
 * JavaScript. The builder swaps the `icon` text fields for the icon picker
 * (apps/admin/src/icons).
 */
import type { ComponentConfig } from "@puckeditor/core";
import { alignField, vars, type Align } from "./block-helpers";
import { spaceVar, spacingField } from "./fields";
import { IconSvg, SocialSvg, iconA11y, isIconName, socialLabel, socialLinkOf } from "./icons";
import type { SpacingStep } from "./tokens";
import { safeUrl } from "./url";

export const iconLooks = ["plain", "circle", "square"] as const;
export type IconLook = (typeof iconLooks)[number];
export const iconLookNames: Record<IconLook, string> = { plain: "Plain", circle: "In a circle", square: "In a square" };
export const iconSizes = ["sm", "md", "lg"] as const;
export type IconSize = (typeof iconSizes)[number];
export const iconSizeNames: Record<IconSize, string> = { sm: "S", md: "M", lg: "L" };
/** Drawn size in px; a badge adds room around it. */
export const iconPx: Record<IconSize, number> = { sm: 24, md: 32, lg: 48 };

export type IconProps = {
  icon: string;
  look: IconLook;
  size: IconSize;
  colour: "primary" | "text";
  /** Name for screen readers: needed when the icon is a link or stands alone. */
  label: string;
  href: string;
  align: Align;
};

export const dividerKinds = ["line", "accent", "label", "dots"] as const;
export type DividerKind = (typeof dividerKinds)[number];
export const dividerKindNames: Record<DividerKind, string> = { line: "Thin line", accent: "Short bar", label: "Line with a label", dots: "Three dots" };
export const dividerWidths = ["short", "medium", "full"] as const;
export type DividerWidth = (typeof dividerWidths)[number];
export type DividerProps = { kind: DividerKind; label: string; width: DividerWidth; space: SpacingStep; align: Align };

export const socialLimit = 12;
export type SocialLinksProps = {
  links: { href: string }[];
  show: "icons" | "names";
  look: "plain" | "circle";
  /** Whose profiles: links are read out as "<who> on Instagram". */
  who: string;
  align: Align;
};

const look = (l: unknown): IconLook => (iconLooks.includes(l as IconLook) ? (l as IconLook) : "plain");
const sizeOf = (s: unknown): IconSize => (iconSizes.includes(s as IconSize) ? (s as IconSize) : "md");

/** An icon with its look, as used by the Icon block and Cards. Decoration unless `a11y` names it. */
export function IconMark({ name, look: l, size, colour }: { name: string; look: IconLook; size: IconSize; colour: "primary" | "text" }) {
  if (!isIconName(name)) return null;
  return (
    <span className={`cr-icon cr-icon-look-${look(l)} cr-icon-size-${sizeOf(size)} cr-icon-colour-${colour === "text" ? "text" : "primary"}`} aria-hidden="true">
      <IconSvg name={name} size={iconPx[sizeOf(size)]} />
    </span>
  );
}

export const Icon: ComponentConfig<IconProps> = {
  label: "Icon",
  fields: {
    icon: { type: "text", label: "Icon" },
    label: { type: "text", label: "Name for screen readers (needed with a link)" },
    href: { type: "text", label: "Link (optional)" },
    look: { type: "radio", label: "Look", options: iconLooks.map((l) => ({ label: iconLookNames[l], value: l })) },
    size: { type: "radio", label: "Size", options: iconSizes.map((s) => ({ label: iconSizeNames[s], value: s })) },
    colour: {
      type: "radio",
      label: "Icon colour",
      options: [
        { label: "Accent", value: "primary" },
        { label: "Text", value: "text" },
      ],
    },
    align: alignField,
  },
  defaultProps: { icon: "sparkles", look: "circle", size: "md", colour: "primary", label: "", href: "", align: "left" },
  render: ({ icon, look: l, size, colour, label, href, align }) => {
    if (!isIconName(icon)) return <div className={`cr-icon-block cr-align-${align ?? "left"}`} />;
    const a11y = iconA11y(label ?? "", href ?? "");
    const mark = <IconMark name={icon} look={l} size={size} colour={colour} />;
    return (
      <div className={`cr-icon-block cr-align-${align ?? "left"}`}>
        {a11y.kind === "link" ? (
          // An unnamed link stops the publish (data-cr-needs-name); the builder asks for the name.
          <a className="cr-icon-link" href={safeUrl(href)} {...(a11y.missingName ? { "data-cr-needs-name": "Icon" } : { "aria-label": a11y.name })}>
            {mark}
          </a>
        ) : a11y.kind === "image" ? (
          <span className="cr-icon-named" role="img" aria-label={a11y.name}>
            {mark}
          </span>
        ) : (
          mark
        )}
      </div>
    );
  },
};

export const Divider: ComponentConfig<DividerProps> = {
  label: "Divider",
  fields: {
    kind: { type: "radio", label: "Look", options: dividerKinds.map((k) => ({ label: dividerKindNames[k], value: k })) },
    label: { type: "text", label: "Label (for “Line with a label”)" },
    width: {
      type: "radio",
      label: "Width",
      options: [
        { label: "Short", value: "short" },
        { label: "Medium", value: "medium" },
        { label: "Full", value: "full" },
      ],
    },
    align: alignField,
    space: spacingField("Space above and below"),
  },
  defaultProps: { kind: "line", label: "", width: "full", space: "md", align: "center" },
  render: ({ kind, label, width, space, align }) => {
    const text = (label ?? "").trim();
    // A label turns the line into a named separator; without one it's decoration.
    const k: DividerKind = kind === "label" && !text ? "line" : dividerKinds.includes(kind) ? kind : "line";
    const w: DividerWidth = dividerWidths.includes(width) ? width : "full";
    const className = `cr-divider cr-divider-${k} cr-divider-${w} cr-align-${align ?? "center"}`;
    const style = vars({ "--cr-divider-space": spaceVar(space ?? "md") });
    if (k === "label") {
      return (
        <div className={className} style={style} role="separator" aria-label={text}>
          <span className="cr-divider-text" aria-hidden="true">
            {text}
          </span>
        </div>
      );
    }
    return (
      <div className={className} style={style} aria-hidden="true">
        {k === "dots" ? (
          <>
            <i />
            <i />
            <i />
          </>
        ) : null}
      </div>
    );
  },
};

export const SocialLinks: ComponentConfig<SocialLinksProps> = {
  label: "Social links",
  fields: {
    links: {
      type: "array",
      label: "Profiles (paste each address)",
      max: socialLimit,
      getItemSummary: (item) => (item.href ? (socialLinkOf(item.href)?.name ?? "Not a https:// address") : "Profile"),
      defaultItemProps: { href: "" },
      arrayFields: { href: { type: "text", label: "Profile address (https://…)" } },
    },
    who: { type: "text", label: "Whose profiles (read out as “… on Instagram”)" },
    show: {
      type: "radio",
      label: "Show",
      options: [
        { label: "Icons only", value: "icons" },
        { label: "Icons and names", value: "names" },
      ],
    },
    look: {
      type: "radio",
      label: "Look",
      options: [
        { label: "Plain", value: "plain" },
        { label: "In a circle", value: "circle" },
      ],
    },
    align: alignField,
  },
  defaultProps: {
    links: [{ href: "https://instagram.com/" }, { href: "https://facebook.com/" }, { href: "https://linkedin.com/" }],
    who: "",
    show: "icons",
    look: "plain",
    align: "left",
  },
  render: ({ links, who, show, look: l, align }) => {
    const items = (links ?? []).flatMap((it) => {
      const link = socialLinkOf(it.href ?? "");
      return link ? [{ href: it.href.trim(), link }] : [];
    });
    return (
      <ul className={`cr-social cr-social-${show === "names" ? "names" : "icons"} cr-social-${l === "circle" ? "circle" : "plain"} cr-align-${align ?? "left"}`} role="list">
        {items.map(({ href, link }, i) => (
          <li key={i}>
            {/* The name holds the visible word (WCAG 2.5.3): "Atelier on Instagram". */}
            <a className="cr-social-link" href={safeUrl(href)} aria-label={socialLabel(link, who ?? "")} rel="me">
              <span className="cr-social-mark" aria-hidden="true">
                <SocialSvg network={link.network} size={20} />
              </span>
              {show === "names" ? <span aria-hidden="true">{link.name}</span> : null}
            </a>
          </li>
        ))}
      </ul>
    );
  },
};

export const iconBlocks = { Icon, Divider, SocialLinks };

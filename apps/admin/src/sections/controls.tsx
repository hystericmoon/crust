/**
 * Section style controls (F025), shared by the side panel, the canvas
 * toolbar and Site settings. Plain components: they get values and report
 * changes, so they work (and are tested) without Puck.
 */
import {
  AA,
  buttonLookNames,
  buttonLooks,
  colorRoleInfo,
  colorRoles,
  effectiveTint,
  normalizeHex,
  resolveSectionStyle,
  sectionHeightNames,
  sectionHeights,
  sectionStyleIds,
  sectionStyleNames,
  sectionStylesOf,
  tintLevels,
  tintNames,
  weakestReadableTint,
  type ButtonLook,
  type SectionHeight,
  type SectionStyle,
  type SectionStyleId,
  type SiteTokens,
  type TintLevel,
} from "@crust/blocks";
import { useId, useState, type KeyboardEvent, type ReactNode } from "react";

// --- Radio group with arrow keys (roving tab stop) ---------------------------

interface RadioOption<V extends string> {
  value: V;
  label: string;
  content?: ReactNode;
}

export function RadioGroup<V extends string>({
  label,
  options,
  value,
  onChange,
  className,
  optionClass,
}: {
  label: string;
  options: RadioOption<V>[];
  value: V;
  onChange: (value: V) => void;
  className: string;
  optionClass: string;
}) {
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (!step) return;
    e.preventDefault();
    e.stopPropagation();
    const i = options.findIndex((o) => o.value === value);
    const next = options[(i + step + options.length) % options.length]!;
    onChange(next.value);
    const buttons = e.currentTarget.querySelectorAll<HTMLButtonElement>("[role=radio]");
    requestAnimationFrame(() => buttons[options.indexOf(next)]?.focus());
  };
  return (
    <div role="radiogroup" aria-label={label} className={className} onKeyDown={onKey}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          aria-label={o.content ? o.label : undefined}
          tabIndex={o.value === value ? 0 : -1}
          className={optionClass}
          onClick={() => onChange(o.value)}
        >
          {o.content ?? o.label}
        </button>
      ))}
    </div>
  );
}

// --- Style tiles ---------------------------------------------------------------

/** A miniature of the style: its background, a text line and its button. */
export function StyleSwatch({ tokens, id, size = "tile" }: { tokens: SiteTokens; id: SectionStyleId; size?: "tile" | "dot" }) {
  const s = resolveSectionStyle(tokens, id);
  if (size === "dot") return <span className="sx-dot" style={{ background: s.bg }} aria-hidden="true" />;
  return (
    <span className="sx-swatch" style={{ background: s.bg }} aria-hidden="true">
      <i style={{ background: s.ink }} />
      <i style={{ background: s.button.look === "outline" ? "transparent" : s.button.bg, borderColor: s.button.border }} />
    </span>
  );
}

export function StyleTiles({
  tokens,
  value,
  onChange,
  counts,
}: {
  tokens: SiteTokens;
  value: SectionStyleId;
  onChange: (id: SectionStyleId) => void;
  /** How many sections on this page use each style. */
  counts?: Partial<Record<SectionStyleId, number>>;
}) {
  return (
    <RadioGroup
      label="Section style"
      className="sx-tiles"
      optionClass="sx-tile"
      value={value}
      onChange={onChange}
      options={sectionStyleIds.map((id) => {
        const n = counts?.[id] ?? 0;
        const used = counts ? ` · ${n} on this page` : "";
        return {
          value: id,
          label: `${sectionStyleNames[id]}${used}`,
          content: (
            <>
              <StyleSwatch tokens={tokens} id={id} />
              <span className="sx-tile-name">{sectionStyleNames[id]}</span>
              {counts ? <span className="sx-tile-count">{n} on this page</span> : null}
            </>
          ),
        };
      })}
    />
  );
}

// --- Height --------------------------------------------------------------------

const heightBars: Record<SectionHeight, number> = { auto: 10, medium: 16, large: 22, full: 28 };

export function HeightPicker({ value, onChange }: { value: SectionHeight; onChange: (h: SectionHeight) => void }) {
  return (
    <RadioGroup
      label="Section height"
      className="sx-heights"
      optionClass="sx-height"
      value={value}
      onChange={onChange}
      options={sectionHeights.map((h) => ({
        value: h,
        label: sectionHeightNames[h],
        content: (
          <>
            <i style={{ height: heightBars[h] }} aria-hidden="true" />
            <span>{h === "full" ? "Full" : sectionHeightNames[h]}</span>
          </>
        ),
      }))}
    />
  );
}

// --- Image tint ------------------------------------------------------------------

export function TintPicker({
  tokens,
  style,
  value,
  onChange,
}: {
  tokens: SiteTokens;
  style: SectionStyleId;
  value: TintLevel;
  onChange: (t: TintLevel) => void;
}) {
  const resolved = resolveSectionStyle(tokens, style);
  const { raised } = effectiveTint(resolved, value);
  const fix = weakestReadableTint(resolved);
  return (
    <div className="sx-stack">
      <RadioGroup
        label="Image tint"
        className="sx-seg"
        optionClass="sx-seg-option"
        value={value}
        onChange={onChange}
        options={tintLevels.map((l) => ({ value: l, label: tintNames[l] }))}
      />
      <p className={raised ? "sx-note is-raised" : "sx-note"} role="status">
        {raised
          ? `${tintNames[value]} is too faint on ${sectionStyleNames[style]}; Crust makes it stronger so text stays readable on any photo.`
          : "Text stays readable on any photo."}
      </p>
      {raised && fix ? (
        <button type="button" className="sx-button" onClick={() => onChange(fix)}>
          Use {tintNames[fix].toLowerCase()} tint
        </button>
      ) : null}
    </div>
  );
}

// --- Site-wide style editor (YOOtheme-style global parameters) ---------------------

export function SectionStyleEditor({
  tokens,
  id,
  onChange,
  usedOnPage,
}: {
  tokens: SiteTokens;
  id: SectionStyleId;
  onChange: (tokens: SiteTokens) => void;
  /** Sections on the current page that change too; omitted outside the builder. */
  usedOnPage?: number;
}) {
  const styles = sectionStylesOf(tokens);
  const style = styles[id];
  const resolved = resolveSectionStyle(tokens, id);
  const customId = useId();
  const isRole = (colorRoles as readonly string[]).includes(style.bg);
  const [custom, setCustom] = useState(isRole ? "" : style.bg);
  const set = (patch: Partial<SectionStyle>) =>
    onChange({ ...tokens, sectionStyles: { ...styles, [id]: { ...style, ...patch } } });

  return (
    <div className="sx-editor">
      {usedOnPage !== undefined ? (
        <p className="sx-scope-note">
          Changes {usedOnPage} section{usedOnPage === 1 ? "" : "s"} on this page, and every {sectionStyleNames[id]} section on other
          pages.
        </p>
      ) : null}
      <div className="sx-stack">
        <span className="sx-label">Background</span>
        <RadioGroup
          label={`${sectionStyleNames[id]} background`}
          className="sx-colors"
          optionClass="sx-color"
          value={isRole ? style.bg : "custom"}
          onChange={(v) => (v === "custom" ? custom && set({ bg: custom }) : set({ bg: v }))}
          options={[
            ...colorRoles.map((role) => ({
              value: role as string,
              label: `Site colour: ${colorRoleInfo[role].name}`,
              content: <span className="sx-color-chip" style={{ background: tokens.colors[role] }} />,
            })),
            ...(custom ? [{ value: "custom", label: `Custom colour ${custom}`, content: <span className="sx-color-chip" style={{ background: custom }} /> }] : []),
          ]}
        />
        <label className="sx-custom" htmlFor={customId}>
          Custom colour
          <input
            id={customId}
            className="sx-input"
            type="text"
            inputMode="text"
            placeholder="#F3EAD8"
            defaultValue={isRole ? "" : style.bg}
            onChange={(e) => {
              const hex = normalizeHex(e.target.value);
              if (hex) {
                setCustom(hex);
                set({ bg: hex });
              }
            }}
          />
        </label>
      </div>
      <div className="sx-stack">
        <span className="sx-label">Buttons</span>
        <RadioGroup<ButtonLook>
          label={`${sectionStyleNames[id]} buttons`}
          className="sx-seg"
          optionClass="sx-seg-option"
          value={style.button}
          onChange={(button) => set({ button })}
          options={buttonLooks.map((b) => ({ value: b, label: buttonLookNames[b] }))}
        />
        {style.button === "solid" && resolved.button.look === "inverse" ? (
          <p className="sx-note">Solid buttons would disappear on this background, so they show inverse.</p>
        ) : null}
      </div>
      <p className={resolved.inkRatio < AA ? "sx-note is-failing" : "sx-note"} aria-live="polite">
        {resolved.inkRatio < AA
          ? `No site colour is readable on this background (${resolved.inkRatio.toFixed(2)}:1). Pick a lighter or darker one.`
          : "Text colour picks itself (dark or light), so it always passes contrast."}
      </p>
    </div>
  );
}

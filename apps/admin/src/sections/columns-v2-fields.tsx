/**
 * Columns settings added with F074 (direction A of
 * https://claude.ai/artifact/9mia2cufYDWGXjSPr3zYbn): one box look for all
 * columns plus an optional highlighted column, line-up, dividers, photo
 * first on phones and a column kept in view. Gap between rows sits in
 * Advanced with the other spacing.
 */
import {
  boxPaddingNames,
  boxPaddings,
  cleanBox,
  cleanHighlight,
  cleanSticky,
  columnAlignNames,
  columnAligns,
  reversedFocusWarning,
  sectionStyleIds,
  sectionStyleNames,
  type BoxPadding,
  type ColumnAlign,
  type ColumnBox,
  type ColumnHighlight,
  type ColumnsProps,
  type SectionStyleId,
  type SiteTokens,
} from "@crust/blocks";
import { createUsePuck, type CustomField } from "@puckeditor/core";
import { useId, type ReactElement } from "react";
import { RadioGroup, StyleSwatch } from "./controls";
import { useSiteStyle } from "./site-style";

const usePuckSelector = createUsePuck();

function useSelectedColumns(): ColumnsProps | null {
  const item = usePuckSelector((s) => s.selectedItem);
  return item?.type === "Columns" ? (item.props as ColumnsProps) : null;
}

type BoxStyle = SectionStyleId | "none";

/** Style swatches with "None" first; plain, for the panel and tests. */
export function BoxStylePicker({
  tokens,
  value,
  onChange,
  label,
  withNone = true,
}: {
  tokens: SiteTokens;
  value: BoxStyle;
  onChange: (v: BoxStyle) => void;
  label: string;
  withNone?: boolean;
}) {
  const ids: BoxStyle[] = withNone ? ["none", ...sectionStyleIds] : [...sectionStyleIds];
  return (
    <RadioGroup<BoxStyle>
      label={label}
      className="sx-boxstyles"
      optionClass="sx-boxstyle"
      value={value}
      onChange={onChange}
      options={ids.map((id) => ({
        value: id,
        label: id === "none" ? "None" : sectionStyleNames[id],
        content: (
          <>
            {id === "none" ? <span className="sx-box-none" aria-hidden="true" /> : <StyleSwatch tokens={tokens} id={id} />}
            <span>{id === "none" ? "None" : sectionStyleNames[id]}</span>
          </>
        ),
      }))}
    />
  );
}

export function BoxPicker({ tokens, value, onChange }: { tokens: SiteTokens; value: ColumnBox | undefined; onChange: (b: ColumnBox) => void }) {
  const id = useId();
  const box = cleanBox(value) ?? { style: "none" as const, padding: "md" as BoxPadding, rounded: true };
  return (
    <div className="sx-stack">
      <span className="sx-group">Boxes</span>
      <span className="sx-label">Box behind each column</span>
      <BoxStylePicker tokens={tokens} label="Box behind each column" value={box.style} onChange={(style) => onChange({ ...box, style })} />
      {box.style !== "none" ? (
        <>
          <span className="sx-label">Padding</span>
          <RadioGroup<BoxPadding>
            label="Box padding"
            className="sx-seg"
            optionClass="sx-seg-option"
            value={box.padding}
            onChange={(padding) => onChange({ ...box, padding })}
            options={boxPaddings.map((p) => ({ value: p, label: boxPaddingNames[p] }))}
          />
          <label className="sx-check" htmlFor={`${id}-round`}>
            <input id={`${id}-round`} type="checkbox" checked={box.rounded} onChange={(e) => onChange({ ...box, rounded: e.target.checked })} />
            Rounded corners
          </label>
        </>
      ) : (
        <p className="sx-note">Columns sit straight on the section. Pick a style to give each one a box.</p>
      )}
    </div>
  );
}

export function HighlightPicker({
  tokens,
  count,
  value,
  onChange,
}: {
  tokens: SiteTokens;
  count: number;
  value: ColumnHighlight | undefined;
  onChange: (h: ColumnHighlight | undefined) => void;
}) {
  const h = cleanHighlight(value, count);
  const options = ["0", ...Array.from({ length: count }, (_, i) => String(i + 1))];
  return (
    <div className="sx-stack">
      <span className="sx-label">Highlight a column</span>
      <RadioGroup<string>
        label="Highlight a column"
        className="sx-seg"
        optionClass="sx-seg-option"
        value={String(h?.column ?? 0)}
        onChange={(c) => onChange(c === "0" ? undefined : { column: Number(c), style: h?.style ?? "primary" })}
        options={options.map((c) => (c === "0" ? { value: c, label: "None" } : { value: c, label: `Column ${c}`, content: c }))}
      />
      {h ? (
        <BoxStylePicker
          tokens={tokens}
          label={`Column ${h.column} style`}
          withNone={false}
          value={h.style}
          onChange={(style) => onChange({ column: h.column, style: style as SectionStyleId })}
        />
      ) : (
        <p className="sx-note">For pricing or a "most popular" choice: one column in another style.</p>
      )}
    </div>
  );
}

export function PhoneOrderField({ value, onChange, warn }: { value: "normal" | "reverse" | undefined; onChange: (v: "normal" | "reverse") => void; warn: boolean }) {
  const id = useId();
  const on = value === "reverse";
  return (
    <div className="sx-stack">
      <label className="sx-check" htmlFor={id}>
        <input id={id} type="checkbox" checked={on} onChange={(e) => onChange(e.target.checked ? "reverse" : "normal")} aria-describedby={`${id}-help`} />
        Last column first on phones
      </label>
      <p id={`${id}-help`} className={on && warn ? "sx-note is-raised" : "sx-note"}>
        {on && warn
          ? "Two columns have links or buttons. On phones the Tab key will reach them in written order, which is now bottom to top. Keep links in one column, or leave this off."
          : "For a photo in the last column: phones show it first. Screen readers and the Tab key still follow the written order."}
      </p>
    </div>
  );
}

export function StickyPicker({ count, value, onChange }: { count: number; value: number | undefined; onChange: (v: number) => void }) {
  const current = cleanSticky(value, count) ?? 0;
  const options = ["0", ...Array.from({ length: count }, (_, i) => String(i + 1))];
  return (
    <div className="sx-stack">
      <span className="sx-label">Keep in view while scrolling</span>
      <RadioGroup<string>
        label="Keep in view while scrolling"
        className="sx-seg"
        optionClass="sx-seg-option"
        value={String(current)}
        onChange={(c) => onChange(Number(c))}
        options={options.map((c) => (c === "0" ? { value: c, label: "None" } : { value: c, label: `Column ${c}`, content: c }))}
      />
      <p className="sx-note">On screens 1024 px and wider, this column stays in view while a longer one scrolls past.</p>
    </div>
  );
}

// --- Puck fields (they read the selected row's column count and content) ----------------------

function LineUpField({ value, onChange }: { value: ColumnAlign | undefined; onChange: (v: ColumnAlign) => void }) {
  return (
    <div className="sx-stack">
      <span className="sx-label">Line up</span>
      <RadioGroup<ColumnAlign>
        label="Line up columns"
        className="sx-seg"
        optionClass="sx-seg-option"
        value={value ?? "top"}
        onChange={onChange}
        options={columnAligns.map((a) => ({ value: a, label: columnAlignNames[a] }))}
      />
    </div>
  );
}

function BoxField({ value, onChange }: { value: ColumnBox | undefined; onChange: (b: ColumnBox) => void }) {
  const site = useSiteStyle();
  return <BoxPicker tokens={site.tokens} value={value} onChange={onChange} />;
}

function HighlightField({ value, onChange }: { value: ColumnHighlight | undefined; onChange: (h: ColumnHighlight | undefined) => void }) {
  const site = useSiteStyle();
  const row = useSelectedColumns();
  return <HighlightPicker tokens={site.tokens} count={Number(row?.count ?? 2)} value={value} onChange={onChange} />;
}

function DividersField({ value, onChange }: { value: boolean | undefined; onChange: (v: boolean) => void }) {
  const id = useId();
  return (
    <div className="sx-stack">
      <span className="sx-group">Between and around</span>
      <label className="sx-check" htmlFor={id}>
        <input id={id} type="checkbox" checked={value === true} onChange={(e) => onChange(e.target.checked)} />
        Dividers between columns
      </label>
      <p className="sx-note">Beside columns that sit side by side, above columns that stack. None where columns wrap 2 + 1.</p>
    </div>
  );
}

function PhoneField({ value, onChange }: { value: "normal" | "reverse" | undefined; onChange: (v: "normal" | "reverse") => void }) {
  const row = useSelectedColumns();
  const count = Number(row?.count ?? 2);
  const warn = row ? reversedFocusWarning([row.column1, row.column2, row.column3, row.column4], count) : false;
  return <PhoneOrderField value={value} onChange={onChange} warn={warn} />;
}

function StickyField({ value, onChange }: { value: number | undefined; onChange: (v: number) => void }) {
  const row = useSelectedColumns();
  return <StickyPicker count={Number(row?.count ?? 2)} value={value} onChange={onChange} />;
}

type Render<T> = (p: { value: T; onChange: (v: T) => void }) => ReactElement | null;
const custom = <T,>(label: string, render: Render<T>) => ({ type: "custom", label, render }) as unknown as CustomField<T>;

/** The F074 fields, replacing the plain ones from the block config. */
export const columnsV2Fields = {
  valign: custom<ColumnAlign | undefined>("Line up", ({ value, onChange }) => <LineUpField value={value} onChange={(v) => onChange(v)} />),
  box: custom<ColumnBox | undefined>("Boxes", ({ value, onChange }) => <BoxField value={value} onChange={(v) => onChange(v)} />),
  highlight: custom<ColumnHighlight | undefined>("Highlight a column", ({ value, onChange }) => <HighlightField value={value} onChange={(v) => onChange(v)} />),
  dividers: custom<boolean | undefined>("Dividers", ({ value, onChange }) => <DividersField value={value} onChange={(v) => onChange(v)} />),
  phoneOrder: custom<"normal" | "reverse" | undefined>("Order on phones", ({ value, onChange }) => <PhoneField value={value} onChange={(v) => onChange(v)} />),
  sticky: custom<number | undefined>("Keep in view", ({ value, onChange }) => <StickyField value={value} onChange={(v) => onChange(v)} />),
};

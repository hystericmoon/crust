/**
 * Per-device settings in the builder (F029, direction A): column widths for
 * all three devices at once (no hidden "current device" mode), and "Show on"
 * toggles for every block.
 */
import {
  cleanHideOn,
  deviceNames,
  devices,
  resolveWidths,
  widthOptions,
  type ColumnWidths,
  type Components,
  type Device,
  type HideOn,
} from "@crust/blocks";
import { createUsePuck, useGetPuck, type Config } from "@puckeditor/core";
import { useId } from "react";
import { RadioGroup } from "../sections/controls";

const usePuckSelector = createUsePuck();

/** Canvas widths, the same as the builder's viewport switcher. */
export const deviceWidths: Record<Device, number> = { desktop: 1280, tablet: 768, phone: 375 };

const icon: Record<Device, string> = {
  desktop: "M3 5h18v11H3zM8 20h8M12 16v4",
  tablet: "M6 3h12v18H6z",
  phone: "M8 3h8v18H8z",
};
export function DeviceIcon({ device }: { device: Device }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d={icon[device]} />
    </svg>
  );
}

function Bars({ ratios, wrap, count }: { ratios: number[] | null; wrap?: boolean; count: number }) {
  if (ratios) {
    return (
      <span className="rs-bars" aria-hidden="true">
        {ratios.map((r, i) => (
          <i key={i} style={{ flexGrow: r }} />
        ))}
      </span>
    );
  }
  if (wrap) {
    return (
      <span className="rs-bars is-wrap" aria-hidden="true">
        <i />
        <i />
        {count === 3 ? <i className="is-full" /> : <><i /><i /></>}
      </span>
    );
  }
  return (
    <span className="rs-bars is-stack" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <i key={i} />
      ))}
    </span>
  );
}

/** "Desktop" etc. as a button that shows that width in the canvas. */
function DeviceLink({ device }: { device: Device }) {
  const getPuck = useGetPuck();
  return (
    <button
      type="button"
      className="rs-device"
      onClick={() => {
        const { appState, dispatch } = getPuck();
        dispatch({ type: "setUi", ui: { viewports: { ...appState.ui.viewports, current: { width: deviceWidths[device], height: "auto" } } } });
      }}
    >
      <DeviceIcon device={device} />
      <span>{deviceNames[device]}</span>
      <span className="rs-sr">: show in the canvas</span>
    </button>
  );
}

export function WidthsField({ value, onChange }: { value: ColumnWidths | undefined; onChange: (v: ColumnWidths) => void }) {
  const item = usePuckSelector((s) => s.selectedItem);
  const count = Number((item?.props as { count?: string } | undefined)?.count ?? 2);
  const current = resolveWidths(count, value);
  const options = widthOptions(count);
  // Puck draws the panel twice (sidebar and phone layout): ids must be unique.
  const id = useId();
  return (
    <div className="rs-widths" role="group" aria-labelledby={`${id}-label`}>
      <span className="rs-label" id={`${id}-label`}>
        Widths
      </span>
      {devices.map((d) => (
        <div className="rs-row" key={d}>
          <DeviceLink device={d} />
          <RadioGroup<string>
            label={`${deviceNames[d]} widths`}
            className="rs-tiles"
            optionClass="rs-tile"
            value={current[d]}
            onChange={(id) => onChange({ ...current, [d]: id })}
            options={options.map((o) => ({
              value: o.id,
              label: o.label,
              content: (
                <>
                  <Bars ratios={o.ratios} wrap={o.wrap} count={count} />
                  <span className="rs-tile-name">{o.label}</span>
                </>
              ),
            }))}
          />
        </div>
      ))}
    </div>
  );
}

export function ShowOnField({ value, onChange }: { value: HideOn | undefined; onChange: (v: HideOn) => void }) {
  const hidden = cleanHideOn(value);
  const shown = devices.filter((d) => !hidden.includes(d));
  const id = useId();
  return (
    <div className="rs-show" role="group" aria-labelledby={`${id}-label`}>
      <span className="rs-label" id={`${id}-label`}>
        Show on
      </span>
      <div className="rs-chips">
        {devices.map((d) => {
          const on = !hidden.includes(d);
          return (
            <button
              key={d}
              type="button"
              className="rs-chip"
              aria-pressed={on}
              onClick={() => onChange(on ? [...hidden, d] : hidden.filter((x) => x !== d))}
            >
              <DeviceIcon device={d} />
              {deviceNames[d]}
            </button>
          );
        })}
      </div>
      <p className="rs-note" role="status">
        {shown.length === 0
          ? "Hidden on every device: visitors won't see this block."
          : hidden.length
            ? `Hidden on ${hidden.map((d) => deviceNames[d].toLowerCase()).join(" and ")}. In the builder it shows faded there, so you can still select it.`
            : ""}
      </p>
    </div>
  );
}

/** The builder's config: Columns get per-device widths, every block gets "Show on". */
export function withResponsiveEditing(config: Config<Components>): Config<Components> {
  const components = Object.fromEntries(
    Object.entries(config.components).map(([name, comp]) => {
      const fields: Record<string, unknown> = { ...comp.fields };
      if (name === "Columns") {
        fields.widths = { type: "custom", label: "Widths", render: ({ value, onChange }: { value: ColumnWidths; onChange: (v: ColumnWidths) => void }) => <WidthsField value={value} onChange={onChange} /> };
      }
      fields.hideOn = { type: "custom", label: "Show on", render: ({ value, onChange }: { value: HideOn; onChange: (v: HideOn) => void }) => <ShowOnField value={value} onChange={onChange} /> };
      return [name, { ...comp, fields }];
    }),
  );
  return { ...config, components } as unknown as Config<Components>;
}

/**
 * Section settings added with F073 (direction A of
 * https://claude.ai/artifact/NK9TwfBQMN6s6LHuEAuWQi): three groups in the
 * Style tab, Layout (width), Background (kind, then only that kind's
 * fields) and Over and under (pull up, header on top). Which fields show
 * is decided by `sectionFieldShown`, used by the settings tabs.
 */
import {
  backgroundKindNames,
  backgroundKindOf,
  backgroundKinds,
  cleanFocus,
  cleanGradient,
  entranceNames,
  entrances,
  motionOf,
  type Entrance,
  colorRoleInfo,
  gradientColours,
  gradientDirectionNames,
  gradientDirections,
  overlapNames,
  overlapSizes,
  resolveSectionStyle,
  sectionWidthHelp,
  sectionWidthNames,
  sectionWidths,
  videoAddress,
  type BackgroundKind,
  type ColorRole,
  type FocalPoint,
  type GradientDirection,
  type OverlapSize,
  type SectionGradient,
  type SectionProps,
  type SectionStyleId,
  type SectionWidth,
  type SiteTokens,
} from "@crust/blocks";
import type { CustomField } from "@puckeditor/core";
import { useId, useState, type KeyboardEvent, type MouseEvent, type ReactElement } from "react";
import { ImageField } from "../media/ImageField";
import { RadioGroup } from "./controls";
import { useSiteStyle } from "./site-style";
import { useIsFirstSection, usePatchSelected, useSelectedSection } from "./editing";

// --- Which fields show ---------------------------------------------------------------------

/**
 * Background fields follow the kind; "Header sits on this section" is for a
 * page's first section only. Any other field always shows.
 */
export function sectionFieldShown(key: string, props: Partial<SectionProps>, isFirst: boolean): boolean {
  const kind = backgroundKindOf(props);
  switch (key) {
    case "gradient":
      return kind === "gradient";
    case "imageSrc":
    case "tint":
      return kind === "photo" || kind === "video";
    case "videoSrc":
      return kind === "video";
    case "focus":
      return (kind === "photo" || kind === "video") && !!props.imageSrc?.trim();
    case "headerOver":
      return isFirst;
    case "parallax":
      return (kind === "photo" || kind === "video") && !!props.imageSrc?.trim();
    default:
      return true;
  }
}

// --- Width ----------------------------------------------------------------------------------

/** Left and right inset of the content bar in each width picture, in %. */
const widthBars: Record<SectionWidth, [number, number]> = {
  narrow: [32, 32],
  normal: [20, 20],
  wide: [10, 10],
  full: [3, 3],
  left: [0, 20],
  right: [20, 0],
};

export function WidthPicker({ value, onChange }: { value: SectionWidth; onChange: (w: SectionWidth) => void }) {
  return (
    <RadioGroup
      label="Section width"
      className="sx-widths"
      optionClass="sx-width"
      value={value}
      onChange={onChange}
      options={sectionWidths.map((w) => ({
        value: w,
        label: `${sectionWidthNames[w]}: ${sectionWidthHelp[w]}`,
        content: (
          <>
            <i aria-hidden="true">
              <b style={{ left: `${widthBars[w][0]}%`, right: `${widthBars[w][1]}%` }} />
            </i>
            <span>{sectionWidthNames[w]}</span>
          </>
        ),
      }))}
    />
  );
}

function WidthField({ value, onChange }: { value: SectionWidth | undefined; onChange: (v: SectionWidth) => void }) {
  const w = value ?? "normal";
  return (
    <div className="sx-stack">
      <span className="sx-group">Layout</span>
      <span className="sx-label">Width</span>
      <WidthPicker value={w} onChange={onChange} />
      <p className="sx-note">{sectionWidthHelp[w]}</p>
    </div>
  );
}

// --- Background kind ---------------------------------------------------------------------

function KindField() {
  const section = useSelectedSection();
  const patch = usePatchSelected();
  const site = useSiteStyle();
  if (!section) return null;
  // Choosing Gradient shows one straight away, ending in the first colour that reads.
  const choose = (bgKind: BackgroundKind) => {
    const first = gradientColours(site.tokens, (section.background ?? "background") as SectionStyleId)[0];
    patch(bgKind === "gradient" && !cleanGradient(section.gradient) && first ? { bgKind, gradient: { to: first, direction: "down" } } : { bgKind });
  };
  const kind = backgroundKindOf(section);
  return (
    <div className="sx-stack">
      <span className="sx-group">Background</span>
      <RadioGroup<BackgroundKind>
        label="Background"
        className="sx-seg"
        optionClass="sx-seg-option"
        value={kind}
        onChange={choose}
        options={backgroundKinds.map((k) => ({ value: k, label: backgroundKindNames[k] }))}
      />
      {kind === "colour" ? <p className="sx-note">The colour of the section's style, above.</p> : null}
    </div>
  );
}

// --- Gradient -----------------------------------------------------------------------------

function GradientField({ value, onChange }: { value: SectionGradient | undefined; onChange: (g: SectionGradient) => void }) {
  const site = useSiteStyle();
  const section = useSelectedSection();
  return <GradientPicker tokens={site.tokens} style={(section?.background ?? "background") as SectionStyleId} value={value} onChange={onChange} />;
}

export function GradientPicker({
  tokens,
  style,
  value,
  onChange,
}: {
  tokens: SiteTokens;
  style: SectionStyleId;
  value: SectionGradient | undefined;
  onChange: (g: SectionGradient) => void;
}) {
  const offered = gradientColours(tokens, style);
  const current = cleanGradient(value);
  const start = resolveSectionStyle(tokens, style).bg;
  if (!offered.length)
    return (
      <p className="sx-note is-failing">
        No site colour keeps this style's text readable all along a gradient. Pick another style above, or use Colour.
      </p>
    );
  const to = current && offered.includes(current.to) ? current.to : offered[0]!;
  const direction = current?.direction ?? "down";
  const kept = current && !offered.includes(current.to);
  return (
    <div className="sx-stack">
      <span className="sx-label">Ends in</span>
      <RadioGroup<ColorRole>
        label="Gradient ends in"
        className="sx-grad-colours"
        optionClass="sx-grad-colour"
        value={current && offered.includes(current.to) ? current.to : ("" as ColorRole)}
        onChange={(t) => onChange({ to: t, direction })}
        options={offered.map((r) => ({
          value: r,
          label: colorRoleInfo[r].name,
          content: (
            <>
              <i aria-hidden="true" style={{ background: `linear-gradient(135deg, ${start}, ${tokens.colors[r]})` }} />
              <span>{colorRoleInfo[r].name}</span>
            </>
          ),
        }))}
      />
      {kept ? <p className="sx-note is-raised">The colour picked before no longer reads well here, so the gradient isn't shown. Pick one above.</p> : null}
      {!current ? <p className="sx-note">Pick where the gradient ends. Only colours that keep the text readable are offered.</p> : null}
      <span className="sx-label">Direction</span>
      <RadioGroup<GradientDirection>
        label="Gradient direction"
        className="sx-seg"
        optionClass="sx-seg-option"
        value={direction}
        onChange={(d) => onChange({ to, direction: d })}
        options={gradientDirections.map((d) => ({ value: d, label: gradientDirectionNames[d] }))}
      />
    </div>
  );
}

// --- Photo, video and focal point -------------------------------------------------------

function PhotoField({ value, onChange }: { value: string | undefined; onChange: (v: string) => void }) {
  const section = useSelectedSection();
  const video = section ? backgroundKindOf(section) === "video" : false;
  return (
    <div className="sx-stack">
      <ImageField label={video ? "Still photo" : "Background image"} value={value ?? ""} onChange={onChange} />
      {video ? <p className="sx-note">Shown before the video starts, when a visitor has Reduce motion on, and on very slow connections.</p> : null}
    </div>
  );
}

function VideoField({ value, onChange }: { value: string | undefined; onChange: (v: string) => void }) {
  const section = useSelectedSection();
  return <VideoInput value={value} onChange={onChange} hasStill={!!section?.imageSrc?.trim()} />;
}

export function VideoInput({ value, onChange, hasStill }: { value: string | undefined; onChange: (v: string) => void; hasStill: boolean }) {
  const id = useId();
  const raw = value ?? "";
  const ok = videoAddress(raw);
  const message = !raw.trim()
    ? "The web address of a short, silent video file (.mp4 or .webm), starting with https://."
    : !ok
      ? "This isn't a video address Crust can use. It must start with https:// and end in .mp4 or .webm."
      : !hasStill
        ? "Add a still photo above: the video needs one."
        : "Plays silently in a loop, with a pause button. Visitors with Reduce motion on see the still photo.";
  return (
    <div className="sx-stack">
      <label className="sx-label" htmlFor={id}>
        Video address
      </label>
      <input
        id={id}
        className="sx-input"
        type="url"
        inputMode="url"
        value={raw}
        placeholder="https://…/loop.mp4"
        aria-describedby={`${id}-help`}
        aria-invalid={!!raw.trim() && !ok}
        onChange={(e) => onChange(e.target.value)}
      />
      <p id={`${id}-help`} className={raw.trim() && !ok ? "sx-note is-failing" : "sx-note"}>
        {message}
      </p>
    </div>
  );
}

/** Click the photo to set the focal point; the two sliders do the same with the keyboard. */
export function FocusPicker({ src, value, onChange }: { src: string; value: FocalPoint | undefined; onChange: (f: FocalPoint) => void }) {
  const id = useId();
  const f = cleanFocus(value) ?? { x: 50, y: 50 };
  const [failed, setFailed] = useState(false);
  const pick = (e: MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    if (!r.width || !r.height) return;
    onChange({ x: Math.round(((e.clientX - r.left) / r.width) * 100), y: Math.round(((e.clientY - r.top) / r.height) * 100) });
  };
  const slider = (axis: "x" | "y", label: string) => (
    <div className="sx-focus-row">
      <label htmlFor={`${id}-${axis}`}>{label}</label>
      <input
        id={`${id}-${axis}`}
        type="range"
        min={0}
        max={100}
        step={1}
        value={f[axis]}
        onChange={(e) => onChange({ ...f, [axis]: Number(e.target.value) })}
        onKeyDown={(e: KeyboardEvent) => e.stopPropagation()}
      />
      <output htmlFor={`${id}-${axis}`}>{f[axis]}%</output>
    </div>
  );
  return (
    <div className="sx-stack" role="group" aria-labelledby={`${id}-title`}>
      <span className="sx-label" id={`${id}-title`}>
        Focal point
      </span>
      {/* The sliders below are the keyboard and screen-reader way to do this; the photo is a shortcut for the mouse. */}
      <div className="sx-focus" onClick={pick} aria-hidden="true">
        {failed ? <span className="sx-focus-missing">Photo not found</span> : <img src={src} alt="" onError={() => setFailed(true)} />}
        <span className="sx-focus-dot" style={{ left: `${f.x}%`, top: `${f.y}%` }} />
      </div>
      {slider("x", "Across")}
      {slider("y", "Down")}
      <p className="sx-note">What should stay in view when a phone or a tall section crops the photo.</p>
      {f.x !== 50 || f.y !== 50 ? (
        <button type="button" className="sx-button" onClick={() => onChange({ x: 50, y: 50 })}>
          Back to the middle
        </button>
      ) : null}
    </div>
  );
}

function FocusField({ value, onChange }: { value: FocalPoint | undefined; onChange: (f: FocalPoint) => void }) {
  const section = useSelectedSection();
  if (!section?.imageSrc?.trim()) return null;
  return <FocusPicker src={section.imageSrc} value={value} onChange={onChange} />;
}

// --- Over and under -------------------------------------------------------------------------

function OverlapField({ value, onChange }: { value: OverlapSize | undefined; onChange: (o: OverlapSize) => void }) {
  return (
    <div className="sx-stack">
      <span className="sx-group">Over and under</span>
      <span className="sx-label">Pull up over the section above</span>
      <RadioGroup<OverlapSize>
        label="Pull up over the section above"
        className="sx-seg"
        optionClass="sx-seg-option"
        value={value ?? "none"}
        onChange={onChange}
        options={overlapSizes.map((o) => ({ value: o, label: overlapNames[o] }))}
      />
      <p className="sx-note">For cards that overlap a photo above. Give what overlaps its own background (a Card, or a Muted column), so its words stay readable on the section above.</p>
    </div>
  );
}

function HeaderOverField({ value, onChange }: { value: boolean | undefined; onChange: (v: boolean) => void }) {
  const id = useId();
  const section = useSelectedSection();
  const hidden = !!(section as { hideOn?: unknown[] } | null)?.hideOn?.length;
  return (
    <div className="sx-stack">
      <label className="sx-check" htmlFor={id}>
        <input id={id} type="checkbox" checked={value === true} onChange={(e) => onChange(e.target.checked)} aria-describedby={`${id}-help`} />
        Header sits on this section
      </label>
      <p className="sx-note" id={`${id}-help`}>
        {hidden
          ? "This section is hidden on some screens, so the header stays above it."
          : "The header loses its own background and uses this section's colours. It scrolls with the page instead of sticking."}
      </p>
    </div>
  );
}

// --- Motion (F075) -------------------------------------------------------------------------

/** Says where motion is switched on, when the site has it off. */
export function MotionOffNote() {
  const site = useSiteStyle();
  if (motionOf(site.tokens) !== "off") return null;
  return <p className="sx-note">Motion is Off for this site, so this has no effect yet. Turn it on in Site settings → Motion.</p>;
}

function EntranceField({ value, onChange }: { value: Entrance | undefined; onChange: (e: Entrance) => void }) {
  const first = useIsFirstSection();
  return (
    <div className="sx-stack">
      <span className="sx-group">Motion</span>
      <span className="sx-label">Entrance</span>
      <RadioGroup<Entrance>
        label="Entrance"
        className="sx-seg"
        optionClass="sx-seg-option"
        value={value ?? "rise"}
        onChange={onChange}
        options={entrances.map((e) => ({ value: e, label: entranceNames[e] }))}
      />
      <p className="sx-note">
        {first
          ? "This is the page's first section: it is on screen when the page opens, so it never waits for an entrance."
          : "How this section's blocks come in as visitors scroll to it. Rows of columns, cards and photos come in one after another."}
      </p>
      <MotionOffNote />
    </div>
  );
}

function ParallaxField({ value, onChange }: { value: boolean | undefined; onChange: (v: boolean) => void }) {
  const id = useId();
  return (
    <div className="sx-stack">
      <label className="sx-check" htmlFor={id}>
        <input id={id} type="checkbox" checked={value === true} onChange={(e) => onChange(e.target.checked)} aria-describedby={`${id}-help`} />
        Photo moves slower (parallax)
      </label>
      <p className="sx-note" id={`${id}-help`}>
        The background moves a little slower than the page as visitors scroll. The words don't move. Off for visitors with Reduce motion on.
      </p>
    </div>
  );
}

/** Logo row: scroll slowly, with a pause switch on the page. */
export function MovingField({ value, onChange }: { value: "yes" | "no" | undefined; onChange: (v: "yes" | "no") => void }) {
  const id = useId();
  return (
    <div className="sx-stack">
      <label className="sx-check" htmlFor={id}>
        <input id={id} type="checkbox" checked={value === "yes"} onChange={(e) => onChange(e.target.checked ? "yes" : "no")} aria-describedby={`${id}-help`} />
        Scroll slowly
      </label>
      <p className="sx-note" id={`${id}-help`}>
        The logos move slowly from right to left on the published page, with a pause button (anything that moves by itself needs one). They stop while
        the pointer or keyboard is on them. The builder shows them still.
      </p>
      <MotionOffNote />
    </div>
  );
}

type Render<T> = (p: { value: T; onChange: (v: T) => void }) => ReactElement | null;
const custom = <T,>(label: string, render: Render<T>) => ({ type: "custom", label, render }) as unknown as CustomField<T>;

/** The F073 fields, replacing the plain ones from the block config. */
export const sectionV2Fields = {
  width: custom<SectionWidth | undefined>("Width", ({ value, onChange }) => <WidthField value={value} onChange={(v) => onChange(v)} />),
  bgKind: custom<BackgroundKind | undefined>("Background", () => <KindField />),
  gradient: custom<SectionGradient | undefined>("Gradient", ({ value, onChange }) => <GradientField value={value} onChange={(v) => onChange(v)} />),
  imageSrc: custom<string | undefined>("Background image", ({ value, onChange }) => <PhotoField value={value} onChange={(v) => onChange(v)} />),
  videoSrc: custom<string | undefined>("Video address", ({ value, onChange }) => <VideoField value={value} onChange={(v) => onChange(v)} />),
  focus: custom<FocalPoint | undefined>("Focal point", ({ value, onChange }) => <FocusField value={value} onChange={(v) => onChange(v)} />),
  overlap: custom<OverlapSize | undefined>("Pull up over the section above", ({ value, onChange }) => <OverlapField value={value} onChange={(v) => onChange(v)} />),
  headerOver: custom<boolean | undefined>("Header sits on this section", ({ value, onChange }) => <HeaderOverField value={value} onChange={(v) => onChange(v)} />),
  entrance: custom<Entrance | undefined>("Entrance", ({ value, onChange }) => <EntranceField value={value} onChange={(v) => onChange(v)} />),
  parallax: custom<boolean | undefined>("Photo moves slower (parallax)", ({ value, onChange }) => <ParallaxField value={value} onChange={(v) => onChange(v)} />),
};

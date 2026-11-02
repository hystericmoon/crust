/**
 * The style customizer's new groups (F028): type, buttons, cards and links.
 * Every option is a radio group (arrow keys move between choices), drawn
 * as a small picture of the result.
 */
import {
  buttonShapes,
  cardStyles,
  headingSizes,
  headingTrackings,
  headingWeights,
  labelFontStack,
  labelStyles,
  linkStyles,
  sectionStylesOf,
  styleOptionNames,
  styleOptionsOf,
  typeScales,
  type ButtonLook,
  type SiteTokens,
  type StyleOptions,
} from "@crust/blocks";
import { RadioGroup } from "../sections/controls";

type Props = { tokens: SiteTokens; onChange: (tokens: SiteTokens) => void };

function useOption<K extends keyof StyleOptions>({ tokens, onChange }: Props, key: K): [StyleOptions[K], (v: StyleOptions[K]) => void] {
  const value = styleOptionsOf(tokens)[key];
  return [value, (v) => onChange({ ...tokens, style: { ...tokens.style, [key]: v } })];
}

function OptionField<V extends string>({
  id,
  label,
  hint,
  value,
  options,
  onChange,
}: {
  id: string;
  label: string;
  hint?: string;
  value: V;
  options: { value: V; label: string; content?: React.ReactNode }[];
  onChange: (v: V) => void;
}) {
  return (
    <div className="st-option-field">
      <span className="st-field-label" id={`${id}-label`}>
        {label}
      </span>
      {hint ? (
        <p className="st-help" id={`${id}-hint`}>
          {hint}
        </p>
      ) : null}
      <RadioGroup<V>
        label={label}
        className="st-options"
        optionClass="st-option"
        value={value}
        onChange={onChange}
        options={options.map((o) => ({
          ...o,
          content: o.content ? (
            <>
              {o.content}
              <span className="st-option-name">{o.label}</span>
            </>
          ) : undefined,
        }))}
      />
    </div>
  );
}

const trackingEm: Record<(typeof headingTrackings)[number], string> = {
  tightest: "-0.05em",
  tighter: "-0.04em",
  tight: "-0.03em",
  snug: "-0.02em",
  normal: "0",
  wide: "0.02em",
};

export function TypeOptions(props: Props) {
  const [scale, setScale] = useOption(props, "typeScale");
  const [weight, setWeight] = useOption(props, "headingWeight");
  const [track, setTrack] = useOption(props, "headingTracking");
  const heading = props.tokens.fonts.heading;
  return (
    <>
      <OptionField
        id="type-scale"
        label="Heading sizes"
        hint="How much bigger each heading level is. Balanced is how Crust looked before."
        value={scale}
        onChange={setScale}
        options={typeScales.map((s) => {
          const [h1, h2] = headingSizes(s).map((v) => v.replace(/^clamp\([^,]+,[^,]+,\s*([\d.]+rem)\)$/, "$1"));
          return {
            value: s,
            label: styleOptionNames.typeScale[s],
            content: (
              <span className="st-option-pic st-type-pic" aria-hidden="true" style={{ fontFamily: heading }}>
                <b style={{ fontSize: `calc(${h1} * 0.42)` }}>Aa</b>
                <b style={{ fontSize: `calc(${h2} * 0.42)` }}>Aa</b>
                <span>Aa</span>
              </span>
            ),
          };
        })}
      />
      <OptionField
        id="heading-weight"
        label="Heading weight"
        value={String(weight) as `${typeof weight}`}
        onChange={(v) => setWeight(Number(v) as typeof weight)}
        options={headingWeights.map((w) => ({
          value: String(w) as `${typeof w}`,
          label: styleOptionNames.headingWeight[w],
          content: (
            <span className="st-option-pic" aria-hidden="true" style={{ fontFamily: heading, fontWeight: w, fontSize: "1.375rem" }}>
              Ag
            </span>
          ),
        }))}
      />
      <OptionField
        id="heading-tracking"
        label="Heading letter spacing"
        value={track}
        onChange={setTrack}
        options={headingTrackings.map((t) => ({
          value: t,
          label: styleOptionNames.headingTracking[t],
          content: (
            <span
              className="st-option-pic"
              aria-hidden="true"
              style={{ fontFamily: heading, fontWeight: weight, letterSpacing: trackingEm[t] }}
            >
              Studio
            </span>
          ),
        }))}
      />
      <DisplayOptions {...props} />
    </>
  );
}

/** F071: Display headings (a Heading block set to "Display") and the small labels above headings. */
function DisplayOptions(props: Props) {
  const { tokens, onChange } = props;
  const o = styleOptionsOf(tokens);
  // Unset, Display follows the heading weight and spacing (as the published CSS does).
  const dWeight = tokens.style?.displayWeight ?? o.headingWeight;
  const dTrack = tokens.style?.displayTracking ?? o.headingTracking;
  const set = (patch: Partial<StyleOptions>) => onChange({ ...tokens, style: { ...tokens.style, ...patch } });
  const [label, setLabel] = useOption(props, "labelStyle");
  const heading = tokens.fonts.heading;
  const labelPic = (l: (typeof labelStyles)[number]) => {
    const mono = l === "mono" || l === "chip";
    return (
      <span className="st-option-pic" aria-hidden="true">
        <span
          className={l === "chip" ? "st-label-pic is-chip" : "st-label-pic"}
          style={{
            fontFamily: mono ? labelFontStack() : tokens.fonts.body,
            textTransform: l === "plain" ? "none" : "uppercase",
            letterSpacing: l === "plain" ? 0 : mono ? "0.1em" : "0.08em",
          }}
        >
          Studio
        </span>
      </span>
    );
  };
  return (
    <>
      <OptionField
        id="display-weight"
        label="Display heading weight"
        hint="For headings set to Display size in the builder. Light and Regular suit big headings; H3 and H4 never go below Medium."
        value={String(dWeight) as `${typeof dWeight}`}
        onChange={(v) => set({ displayWeight: Number(v) as typeof dWeight })}
        options={headingWeights.map((w) => ({
          value: String(w) as `${typeof w}`,
          label: styleOptionNames.headingWeight[w],
          content: (
            <span className="st-option-pic" aria-hidden="true" style={{ fontFamily: heading, fontWeight: w, fontSize: "1.75rem", letterSpacing: trackingEm[dTrack] }}>
              Ag
            </span>
          ),
        }))}
      />
      <OptionField
        id="display-tracking"
        label="Display heading letter spacing"
        value={dTrack}
        onChange={(t) => set({ displayTracking: t })}
        options={headingTrackings.map((t) => ({
          value: t,
          label: styleOptionNames.headingTracking[t],
          content: (
            <span className="st-option-pic" aria-hidden="true" style={{ fontFamily: heading, fontWeight: dWeight, fontSize: "1.375rem", letterSpacing: trackingEm[t] }}>
              Calm
            </span>
          ),
        }))}
      />
      <OptionField
        id="label-style"
        label="Small labels"
        hint="The optional label above a heading. Mono and Chip use Geist Mono, added to the site only when used."
        value={label}
        onChange={setLabel}
        options={labelStyles.map((l) => ({ value: l, label: styleOptionNames.labelStyle[l], content: labelPic(l) }))}
      />
    </>
  );
}

const lookNames: Record<"solid" | "outline" | "soft", string> = { solid: "Solid", outline: "Outline", soft: "Soft" };

export function ButtonOptions(props: Props) {
  const { tokens, onChange } = props;
  const [shape, setShape] = useOption(props, "buttonShape");
  const looks = sectionStylesOf(tokens);
  // "Main button" is the look on Page and Muted sections, set together (F028 decision).
  const main = looks.background.button === looks.surface.button ? looks.background.button : null;
  const setMain = (look: ButtonLook) =>
    onChange({
      ...tokens,
      sectionStyles: { ...looks, background: { ...looks.background, button: look }, surface: { ...looks.surface, button: look } },
    });
  const radius = { square: "2px", rounded: `${Math.min(tokens.radius, 20)}px`, pill: "999px" };
  const c = tokens.colors;
  const pic = (look: "solid" | "outline" | "soft") => (
    <span className="st-option-pic" aria-hidden="true">
      <span
        className="st-btn-pic"
        style={{
          borderRadius: radius[shape],
          background: look === "solid" ? c.primary : look === "soft" ? `color-mix(in srgb, ${c.primary} 14%, ${c.background})` : "transparent",
          color: look === "solid" ? c.onPrimary : look === "soft" ? c.primary : c.text,
          borderColor: look === "solid" ? c.primary : look === "soft" ? "transparent" : c.text,
        }}
      >
        Button
      </span>
    </span>
  );
  return (
    <>
      <OptionField
        id="button-shape"
        label="Button shape"
        hint="Rounded follows the corner radius in Shape & layout."
        value={shape}
        onChange={setShape}
        options={buttonShapes.map((s) => ({
          value: s,
          label: styleOptionNames.buttonShape[s],
          content: (
            <span className="st-option-pic" aria-hidden="true">
              <span className="st-btn-pic" style={{ borderRadius: radius[s], background: c.primary, color: c.onPrimary, borderColor: c.primary }}>
                Button
              </span>
            </span>
          ),
        }))}
      />
      <OptionField
        id="button-main"
        label="Main button"
        hint="How buttons look on Page and Muted sections. Primary and Dark sections keep their own look, set in Section styles, so buttons stay visible on colour."
        value={(main === "solid" || main === "outline" || main === "soft" ? main : "") as "solid" | "outline" | "soft"}
        onChange={setMain}
        options={(["solid", "outline", "soft"] as const).map((l) => ({ value: l, label: lookNames[l], content: pic(l) }))}
      />
      {main === null || main === "inverse" ? (
        <p className="st-help">Page and Muted sections use different button looks now. Pick one above to set both.</p>
      ) : null}
    </>
  );
}

export function CardOptions(props: Props) {
  const [card, setCard] = useOption(props, "cardStyle");
  const c = props.tokens.colors;
  const box = (s: (typeof cardStyles)[number]) => ({
    background: s === "flat" ? c.surface : c.background,
    border: s === "outline" ? `1.5px solid color-mix(in srgb, ${c.muted} 45%, transparent)` : "1.5px solid transparent",
    boxShadow: s === "shadow" ? "0 1px 2px rgb(0 0 0 / 0.08), 0 6px 16px rgb(0 0 0 / 0.12)" : "none",
    borderRadius: `${Math.min(props.tokens.radius, 16)}px`,
  });
  return (
    <OptionField
      id="card-style"
      label="Card style"
      hint="For every Card block. A card's own colour (Page, Surface or Primary) stays as you set it."
      value={card}
      onChange={setCard}
      options={cardStyles.map((s) => ({
        value: s,
        label: styleOptionNames.cardStyle[s],
        content: (
          <span className="st-option-pic st-card-pic-wrap" aria-hidden="true" style={{ background: c.background }}>
            <span className="st-card-pic" style={box(s)}>
              <i style={{ background: c.text }} />
              <i style={{ background: c.muted }} />
            </span>
          </span>
        ),
      }))}
    />
  );
}

export function LinkOptions(props: Props) {
  const [link, setLink] = useOption(props, "linkStyle");
  const c = props.tokens.colors;
  return (
    <OptionField
      id="link-style"
      label="Links"
      hint="Links stay underlined in every style, so they never rely on colour alone (WCAG 1.4.1)."
      value={link}
      onChange={setLink}
      options={linkStyles.map((s) => ({
        value: s,
        label: styleOptionNames.linkStyle[s],
        content: (
          <span className="st-option-pic" aria-hidden="true" style={{ color: c.text, background: c.background }}>
            Read{" "}
            <span
              style={{
                color: c.primary,
                textDecoration: "underline",
                textUnderlineOffset: "0.2em",
                textDecorationThickness: s === "thick" ? "0.14em" : "auto",
                background: s === "highlight" ? `color-mix(in srgb, ${c.primary} 12%, transparent)` : "none",
                borderRadius: 2,
              }}
            >
              more
            </span>
          </span>
        ),
      }))}
    />
  );
}

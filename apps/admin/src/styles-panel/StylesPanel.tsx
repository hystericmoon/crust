/**
 * F092: the Styles panel (paintbrush). Styles cards first, then Fine-tune
 * (colours, type, buttons, cards, links, spacing, motion, section styles),
 * then Header & footer. Every control is the one Site settings already had;
 * this only regroups them beside the page. Site details live in the sheet.
 */
import { useId, useMemo, useState, type ReactNode } from "react";
import {
  applyLook,
  checkContrast,
  colorRoleInfo,
  colorRoles,
  matchingLook,
  sectionStyleIds,
  sectionStyleNames,
  spacingIncreases,
  spacingSteps,
  tokenLimits,
  type ColorRole,
  type SiteTokens,
  type SpacingStep,
} from "@crust/blocks";
import { SectionStyleEditor, StyleSwatch } from "../sections/controls";
import { useSiteStyle } from "../sections/site-style";
import { ButtonOptions, CardOptions, LinkOptions, MotionOptions, TypeOptions } from "../settings/StyleGroups";
import { FooterOptions, HeaderOptions } from "../settings/ChromeGroups";
import { ColorRow, ContrastPanel, FontField, FontPairs, NumberField, StyleLibrary, fontWeightNote } from "../settings/SiteSettings";
import { SiteSettingsButton } from "./SiteSettingsSheet";
import { SaveBar, useInvalid } from "./useStyleSave";
import { useStylesPanel } from "./context";
import "./styles-panel.css";

type Tune = "colours" | "type" | "buttons" | "cards" | "links" | "spacing" | "motion" | "section-styles";

const tuneRows: { id: Tune; label: string }[] = [
  { id: "colours", label: "Colours" },
  { id: "type", label: "Type" },
  { id: "buttons", label: "Buttons" },
  { id: "cards", label: "Cards" },
  { id: "links", label: "Links" },
  { id: "spacing", label: "Spacing and shape" },
  { id: "motion", label: "Motion" },
  { id: "section-styles", label: "Section styles" },
];

/** One row that opens its controls in place. Only one is open at a time. */
function Disclosure({ id, label, open, onToggle, children }: { id: string; label: string; open: boolean; onToggle: () => void; children: ReactNode }) {
  const body = `${id}-body`;
  return (
    <li className="sp-row">
      <h4 className="sp-row-h">
        <button type="button" id={id} className="sp-row-button" aria-expanded={open} aria-controls={body} onClick={onToggle}>
          <span>{label}</span>
          <span aria-hidden="true" className="sp-chev">{open ? "▾" : "▸"}</span>
        </button>
      </h4>
      <div id={body} role="region" aria-labelledby={id} className="sp-row-body" hidden={!open}>
        {open ? children : null}
      </div>
    </li>
  );
}

export function StylesPanel() {
  const style = useSiteStyle();
  const panel = useStylesPanel();
  const draft = style.tokens;
  const onChange = style.setTokens;
  const uid = useId();
  const [openId, setOpenId] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [beforePreset, setBeforePreset] = useState<{ tokens: SiteTokens; name: string } | null>(null);
  const { invalid, setValidity } = useInvalid();
  const results = useMemo(() => checkContrast(draft.colors), [draft.colors]);
  const failing = results.filter((r) => !r.passes);
  const toggle = (id: string) => setOpenId((o) => (o === id ? null : id));
  const setColor = (role: ColorRole, value: string) => onChange({ ...draft, colors: { ...draft.colors, [role]: value } });
  const rowId = (id: string) => `${uid}-${id}`;

  const body = (id: Tune): ReactNode => {
    switch (id) {
      case "colours":
        return (
          <>
            <p className="st-lede">Each colour has a job. Blocks only use these six, so a change here restyles the whole site.</p>
            <div className="st-rows">
              {colorRoles.map((role) => (
                <ColorRow key={role} role={role} value={draft.colors[role]} failing={failing.filter((r) => r.fg === role)} onChange={(v) => setColor(role, v)} onValidity={setValidity} />
              ))}
            </div>
            <ContrastPanel
              results={results}
              colors={draft.colors}
              onApply={(role, value) => {
                setColor(role, value);
                setStatus(`${colorRoleInfo[role].name} set to ${value}.`);
              }}
            />
          </>
        );
      case "type":
        return (
          <>
            <p className="st-lede">Pick a pair: each card is set in its own fonts. Fonts are published with your site, so visitors' browsers never contact Google.</p>
            <FontPairs fonts={draft.fonts} onPick={(fonts) => onChange({ ...draft, fonts })} />
            <FontField label="Heading font" value={draft.fonts.heading} sample="Build fast sites, visually" onChange={(v) => onChange({ ...draft, fonts: { ...draft.fonts, heading: v } })} heading />
            <FontField label="Body font" value={draft.fonts.body} sample="Design pages with blocks and design tokens." onChange={(v) => onChange({ ...draft, fonts: { ...draft.fonts, body: v } })} />
            <p className="st-help" aria-live="polite">{fontWeightNote(draft.fonts)}</p>
            <TypeOptions tokens={draft} onChange={onChange} />
          </>
        );
      case "buttons":
        return <ButtonOptions tokens={draft} onChange={onChange} />;
      case "cards":
        return <CardOptions tokens={draft} onChange={onChange} />;
      case "links":
        return <LinkOptions tokens={draft} onChange={onChange} />;
      case "motion":
        return <MotionOptions tokens={draft} onChange={onChange} />;
      case "spacing":
        return (
          <>
            <p className="st-lede">The steps you pick from for section padding, gaps and spacers. 1 rem is 16 px.</p>
            <div className="st-spacing">
              {spacingSteps
                .filter((s): s is Exclude<SpacingStep, "none"> => s !== "none")
                .map((step) => (
                  <div className="st-spacing-row" key={step}>
                    <NumberField id={`spacing-${step}`} label={step.toUpperCase()} unit="rem" step={0.25} {...tokenLimits.spacing} value={draft.spacing[step]}
                      onChange={(v) => onChange({ ...draft, spacing: { ...draft.spacing, [step]: v } })} onValidity={setValidity} />
                  </div>
                ))}
            </div>
            {spacingIncreases(draft.spacing) ? null : <p className="st-warning">Each step should be larger than the one before, or the choices in the builder get confusing.</p>}
            <NumberField id="radius" label="Corner radius" unit="px" step={1} {...tokenLimits.radius} value={draft.radius} hint="Buttons, cards and images." onChange={(v) => onChange({ ...draft, radius: v })} onValidity={setValidity} />
            <NumberField id="maxWidth" label="Page width" unit="px" step={10} {...tokenLimits.maxWidth} value={draft.maxWidth}
              hint="The widest your content gets on large screens. Around 1100–1280 px reads well." onChange={(v) => onChange({ ...draft, maxWidth: v })} onValidity={setValidity} />
          </>
        );
      case "section-styles":
        return (
          <>
            <p className="st-lede">Four looks for whole sections. Each section picks one in the builder; a change here restyles every section that uses it.</p>
            {sectionStyleIds.map((sid) => (
              <div className="sx-settings-style" key={sid} role="group" aria-labelledby={`${uid}-sx-${sid}`}>
                <h5 id={`${uid}-sx-${sid}`} className="sx-settings-name">
                  <StyleSwatch tokens={draft} id={sid} />
                  {sectionStyleNames[sid]} sections
                </h5>
                <SectionStyleEditor tokens={draft} id={sid} onChange={onChange} />
              </div>
            ))}
          </>
        );
    }
  };

  return (
    <section className="af-panel sp" aria-label="Styles">
      <div className="sp-head">
        <h2 className="af-panel-title">Styles</h2>
        <SiteSettingsButton />
      </div>
      <p className="af-panel-note">How the whole site looks. To style one section, select it on the page.</p>
      <p className="sp-status" role="status" aria-live="polite">{status}</p>

      <div className="st sp-body">
        <h3 className="sp-h" id={`${uid}-styles-h`} tabIndex={-1}>Styles</h3>
        <p className="st-lede">A complete look in one tap. Spacing, page width and your pages stay as they are.</p>
        {beforePreset ? (
          <button
            type="button"
            className="st-button st-undo"
            onClick={() => {
              const b = beforePreset.tokens;
              onChange({ ...draft, colors: b.colors, fonts: b.fonts, style: b.style, sectionStyles: b.sectionStyles, radius: b.radius });
              setStatus(`Undid ${beforePreset.name}. The look is back to what it was.`);
              setBeforePreset(null);
              setTimeout(() => (document.querySelector<HTMLElement>(".sp .st-look[aria-pressed='true']") ?? document.getElementById(`${uid}-styles-h`))?.focus(), 0);
            }}
          >
            Undo style ({beforePreset.name})
          </button>
        ) : null}
        <StyleLibrary
          tokens={draft}
          onPick={(look, variation) => {
            const now = matchingLook(draft);
            if (now?.look.id === look.id && now.variation.id === variation.id) return;
            setBeforePreset({ tokens: beforePreset?.tokens ?? draft, name: `${look.name} ${variation.name}` });
            onChange(applyLook(draft, look, variation));
            setStatus(`${look.name}, ${variation.name} applied. Use "Undo style" to go back.`);
          }}
        />

        <h3 className="sp-h">Fine-tune</h3>
        <ul className="sp-list">
          {tuneRows.map((r) => (
            <Disclosure key={r.id} id={rowId(r.id)} label={r.id === "colours" && failing.length ? `${r.label} (${failing.length} failing)` : r.label} open={openId === r.id} onToggle={() => toggle(r.id)}>
              {body(r.id)}
            </Disclosure>
          ))}
        </ul>

        <h3 className="sp-h">Header &amp; footer</h3>
        <ul className="sp-list">
          <Disclosure id={rowId("header")} label="Header and menu" open={openId === "header"} onToggle={() => toggle("header")}>
            <p className="st-lede">Shown at the top of every page. The menu marks the page a visitor is on.</p>
            <HeaderOptions chrome={panel.chrome} onChange={panel.onChromeChange} tokens={draft} pages={panel.pages} />
          </Disclosure>
          <Disclosure id={rowId("footer")} label="Footer" open={openId === "footer"} onToggle={() => toggle("footer")}>
            <p className="st-lede">Shown at the bottom of every page.</p>
            <FooterOptions chrome={panel.chrome} onChange={panel.onChromeChange} tokens={draft} pages={panel.pages} />
          </Disclosure>
        </ul>
      </div>
      <SaveBar invalid={invalid} />
    </section>
  );
}

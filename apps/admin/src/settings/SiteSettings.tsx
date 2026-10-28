import {
  checkContrast,
  colorRoleInfo,
  colorRoles,
  findFontStack,
  fontStacks,
  formatRatio,
  normalizeHex,
  spacingIncreases,
  spacingSteps,
  suggestFix,
  tokenLimits,
  validateTokens,
  type ColorRole,
  type ContrastResult,
  type Page,
  type Site,
  type SiteTokens,
  type SpacingStep,
  applyPreset,
  matchingPreset,
  themePresets,
} from "@crust/blocks";
import { useCallback, useEffect, useId, useMemo, useState, type MouseEvent } from "react";
import { sameTokens } from "../tokens-store";
import { Icon } from "./icons";
import { Preview } from "./Preview";

export interface SiteSettingsProps {
  site: Site;
  /** The Home page, shown in the preview. */
  page: Page;
  saved: SiteTokens;
  draft: SiteTokens;
  onChange: (tokens: SiteTokens) => void;
  /** Persists the tokens; returns false if that failed. */
  onSave: (tokens: SiteTokens) => boolean;
  onDiscard: () => void;
}

const sections = [
  { id: "presets", label: "Presets" },
  { id: "colours", label: "Colours" },
  { id: "contrast", label: "Contrast checks" },
  { id: "typography", label: "Typography" },
  { id: "spacing", label: "Spacing" },
  { id: "shape", label: "Shape & layout" },
];

export function SiteSettings({ site, page, saved, draft, onChange, onSave, onDiscard }: SiteSettingsProps) {
  const [status, setStatus] = useState("");
  const [invalid, setInvalid] = useState<ReadonlySet<string>>(new Set());
  const [previewOpen, setPreviewOpen] = useState(true);
  /** Colours and fonts from before the last preset, for one-step undo. */
  const [beforePreset, setBeforePreset] = useState<{ tokens: SiteTokens; name: string } | null>(null);
  const dirty = !sameTokens(saved, draft);
  const results = useMemo(() => checkContrast(draft.colors), [draft.colors]);

  const setValidity = useCallback((field: string, valid: boolean) => {
    setInvalid((prev) => {
      if (valid === !prev.has(field)) return prev;
      const next = new Set(prev);
      if (valid) next.delete(field);
      else next.add(field);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const setColor = (role: ColorRole, value: string) => onChange({ ...draft, colors: { ...draft.colors, [role]: value } });

  const save = () => {
    if (invalid.size > 0) {
      setStatus(`Not saved. Fix the ${invalid.size === 1 ? "field" : `${invalid.size} fields`} marked in red first.`);
      return;
    }
    const problems = validateTokens(draft);
    if (problems.length > 0) {
      setStatus(`Not saved. ${problems.map((p) => p.message).join(" ")}`);
      return;
    }
    setStatus(
      onSave(draft)
        ? "Saved in this browser. The builder uses these settings now; saving to GitHub comes in a later step."
        : "Couldn't save in this browser. Your changes are still here.",
    );
  };

  const discard = () => {
    if (!window.confirm("Discard your unsaved changes to Site settings?")) return;
    onDiscard();
    setBeforePreset(null);
    setStatus("Changes discarded.");
  };

  const previewSite = useMemo(() => ({ ...site, tokens: draft }), [site, draft]);
  const failing = results.filter((r) => !r.passes);

  return (
    <div className="st">
      <header className="st-header">
        <a className="st-back" href="#/">
          <Icon name="back" /> Builder
        </a>
        <h1 className="st-title">Site settings</h1>
        <span className="st-dirty">{dirty ? "Unsaved changes" : "All changes saved"}</span>
        <div className="st-actions">
          <button type="button" className="st-button" onClick={discard} disabled={!dirty}>
            Discard
          </button>
          <button type="button" className="st-button st-button-primary" onClick={save}>
            Save
          </button>
        </div>
      </header>
      <p className="st-status" role="status" aria-live="polite">
        {status}
      </p>

      <div className="st-layout">
        <nav className="st-nav" aria-label="Settings sections">
          <ul>
            {sections.map((s) => (
              <li key={s.id}>
                <a href={`#/settings/${s.id}`} onClick={(e) => jumpTo(e, s.id)}>
                  {s.label}
                  {s.id === "contrast" && failing.length > 0 ? (
                    <span className="st-count"> ({failing.length} failing)</span>
                  ) : null}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <main className="st-form">
          <section className="st-card" id="presets" aria-labelledby="presets-h">
            <h2 id="presets-h">Presets</h2>
            <p className="st-lede">
              A starting point for colours and fonts. Spacing, corners and width stay as they are, and every preset passes the
              contrast checks.
            </p>
            <ul className="st-presets">
              {themePresets.map((preset) => {
                const current = matchingPreset(draft)?.id === preset.id;
                return (
                  <li key={preset.id}>
                    <button
                      type="button"
                      className="st-preset"
                      aria-pressed={current}
                      onClick={() => {
                        if (current) return;
                        setBeforePreset({ tokens: draft, name: preset.name });
                        onChange(applyPreset(draft, preset));
                        setStatus(`${preset.name} applied to colours and fonts. Use "Undo preset" to go back.`);
                      }}
                    >
                      <span className="st-preset-swatches" aria-hidden="true">
                        {(["background", "surface", "text", "primary"] as const).map((role) => (
                          <span key={role} style={{ background: preset.colors[role] }} />
                        ))}
                      </span>
                      <span className="st-preset-name" style={{ fontFamily: preset.fonts.heading }}>
                        {preset.name}
                      </span>
                      <span className="st-help">{preset.description}</span>
                      {current ? <span className="st-current">Current</span> : null}
                    </button>
                  </li>
                );
              })}
            </ul>
            {beforePreset ? (
              <button
                type="button"
                className="st-button st-undo"
                onClick={() => {
                  onChange({ ...draft, colors: beforePreset.tokens.colors, fonts: beforePreset.tokens.fonts });
                  setStatus(`Undid ${beforePreset.name}. Colours and fonts are back to what they were.`);
                  setBeforePreset(null);
                }}
              >
                Undo preset ({beforePreset.name})
              </button>
            ) : null}
          </section>

          <section className="st-card" id="colours" aria-labelledby="colours-h">
            <h2 id="colours-h">Colours</h2>
            <p className="st-lede">Each colour has a job. Blocks only use these six, so a change here restyles the whole site.</p>
            <div className="st-rows">
              {colorRoles.map((role) => (
                <ColorRow
                  key={role}
                  role={role}
                  value={draft.colors[role]}
                  // Only the text colour is marked: that's what the fix changes.
                  failing={failing.filter((r) => r.fg === role)}
                  onChange={(v) => setColor(role, v)}
                  onValidity={setValidity}
                />
              ))}
            </div>
          </section>

          <ContrastPanel
            results={results}
            colors={draft.colors}
            onApply={(role, value) => {
              setColor(role, value);
              setStatus(`${colorRoleInfo[role].name} set to ${value}.`);
            }}
          />

          <section className="st-card" id="typography" aria-labelledby="typography-h">
            <h2 id="typography-h">Typography</h2>
            <p className="st-lede">
              These use fonts already on your visitors' devices: nothing to download, so pages stay fast. They look slightly
              different on Mac, Windows and phones.
            </p>
            <FontField label="Heading font" value={draft.fonts.heading} sample="Build fast sites, visually"
              onChange={(v) => onChange({ ...draft, fonts: { ...draft.fonts, heading: v } })} heading />
            <FontField label="Body font" value={draft.fonts.body} sample="Design pages with blocks and design tokens."
              onChange={(v) => onChange({ ...draft, fonts: { ...draft.fonts, body: v } })} />
          </section>

          <section className="st-card" id="spacing" aria-labelledby="spacing-h">
            <h2 id="spacing-h">Spacing</h2>
            <p className="st-lede">The steps you pick from for section padding, gaps and spacers. 1 rem is 16 px.</p>
            <div className="st-spacing">
              <div className="st-spacing-row">
                <div className="st-number">
                  <span className="st-field-label">None</span>
                  <span className="st-fixed">Always 0</span>
                </div>
              </div>
              {spacingSteps
                .filter((s): s is Exclude<SpacingStep, "none"> => s !== "none")
                .map((step) => (
                  <div className="st-spacing-row" key={step}>
                    <NumberField
                      id={`spacing-${step}`}
                      label={step.toUpperCase()}
                      unit="rem"
                      step={0.25}
                      {...tokenLimits.spacing}
                      value={draft.spacing[step]}
                      onChange={(v) => onChange({ ...draft, spacing: { ...draft.spacing, [step]: v } })}
                      onValidity={setValidity}
                    />
                    <span className="st-bar" style={{ width: `${Math.min(draft.spacing[step], 12)}rem` }} aria-hidden="true" />
                  </div>
                ))}
            </div>
            {spacingIncreases(draft.spacing) ? null : (
              <p className="st-warning">Each step should be larger than the one before, or the choices in the builder get confusing.</p>
            )}
          </section>

          <section className="st-card" id="shape" aria-labelledby="shape-h">
            <h2 id="shape-h">Shape & layout</h2>
            <div className="st-shape">
              <NumberField
                id="radius"
                label="Corner radius"
                unit="px"
                step={1}
                {...tokenLimits.radius}
                value={draft.radius}
                hint="Buttons, cards and images."
                onChange={(v) => onChange({ ...draft, radius: v })}
                onValidity={setValidity}
              />
              <span className="st-corner" style={{ borderRadius: draft.radius }} aria-hidden="true" />
            </div>
            <NumberField
              id="maxWidth"
              label="Page width"
              unit="px"
              step={10}
              {...tokenLimits.maxWidth}
              value={draft.maxWidth}
              hint="The widest your content gets on large screens. Around 1100–1280 px reads well."
              onChange={(v) => onChange({ ...draft, maxWidth: v })}
              onValidity={setValidity}
            />
          </section>
        </main>

        <aside className={`st-aside${previewOpen ? "" : " is-collapsed"}`} aria-label="Live preview">
          <Preview site={previewSite} page={page} open={previewOpen} onToggle={() => setPreviewOpen((o) => !o)} />
        </aside>
      </div>
    </div>
  );
}

/** Section links scroll without changing the #/settings route. */
function jumpTo(e: MouseEvent, id: string) {
  const target = document.getElementById(id);
  if (!target) return;
  e.preventDefault();
  target.scrollIntoView({ block: "start" });
  const heading = target.querySelector<HTMLElement>("h2");
  heading?.setAttribute("tabindex", "-1");
  heading?.focus({ preventScroll: true });
}

function ColorRow({
  role,
  value,
  failing,
  onChange,
  onValidity,
}: {
  role: ColorRole;
  value: string;
  failing: ContrastResult[];
  onChange: (value: string) => void;
  onValidity: (field: string, valid: boolean) => void;
}) {
  const info = colorRoleInfo[role];
  const id = `color-${role}`;
  const [raw, setRaw] = useState(value);
  const hex = normalizeHex(raw);

  // Follow outside changes (Discard, a contrast fix) unless they're what's typed.
  useEffect(() => {
    setRaw((r) => (normalizeHex(r) === normalizeHex(value) ? r : value));
  }, [value]);
  useEffect(() => onValidity(id, hex !== null), [id, hex, onValidity]);

  const update = (next: string) => {
    setRaw(next);
    const n = normalizeHex(next);
    if (n) onChange(n);
  };

  const describedBy = [`${id}-job`, hex === null ? `${id}-error` : null, failing.length ? `${id}-contrast` : null]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={`st-color${failing.length ? " is-failing" : ""}`}>
      <input
        type="color"
        className="st-swatch"
        aria-label={`Pick ${info.name} colour`}
        value={(normalizeHex(value) ?? "#000000").toLowerCase()}
        onChange={(e) => update(e.target.value)}
      />
      <div className="st-color-text">
        <label className="st-field-label" htmlFor={id}>
          {info.name}
        </label>
        <span className="st-help" id={`${id}-job`}>
          {info.job}. Used for: {info.usedFor}.
        </span>
      </div>
      <input
        id={id}
        className="st-input st-hex"
        value={raw}
        onChange={(e) => update(e.target.value)}
        aria-invalid={hex === null || undefined}
        aria-describedby={describedBy}
        autoComplete="off"
        spellCheck={false}
        maxLength={7}
      />
      {hex === null ? (
        <p className="st-error" id={`${id}-error`}>
          Use a hex colour like #4338CA.
        </p>
      ) : null}
      {failing.length ? (
        <p className="st-contrast-note" id={`${id}-contrast`}>
          <Icon name="alert" /> Fails contrast: {failing.map((r) => `${r.label.toLowerCase()} (${formatRatio(r.ratio)})`).join("; ")}.{" "}
          <a href="#/settings/contrast" onClick={(e) => jumpTo(e, "contrast")}>
            See contrast checks
          </a>
        </p>
      ) : null}
    </div>
  );
}

function ContrastPanel({
  results,
  colors,
  onApply,
}: {
  results: ContrastResult[];
  colors: Record<ColorRole, string>;
  onApply: (role: ColorRole, value: string) => void;
}) {
  const failing = results.filter((r) => !r.passes);
  const summary =
    failing.length === 0
      ? `All ${results.length} pairs pass AA (4.5:1 or more).`
      : `${failing.length} of ${results.length} pairs fail AA. Text in these combinations will be hard to read for many people.`;

  return (
    <section className="st-card" id="contrast" aria-labelledby="contrast-h">
      <h2 id="contrast-h">Contrast checks</h2>
      <p className={failing.length ? "st-summary is-failing" : "st-summary"} aria-live="polite">
        {summary}
      </p>
      <ul className="st-pairs">
        {results.map((r) => {
          const fix = r.passes ? null : suggestFix(colors, r.fg);
          const fgName = colorRoleInfo[r.fg].name;
          return (
            <li key={r.id} className={r.passes ? "st-pair" : "st-pair is-failing"}>
              <span className="st-sample" style={{ color: colors[r.fg], background: colors[r.bg] }} aria-hidden="true">
                Aa
              </span>
              <span className="st-pair-label">{r.label}</span>
              <span className="st-ratio">{formatRatio(r.ratio)}</span>
              <span className="st-verdict">
                <Icon name={r.passes ? "check" : "cross"} />
                {r.passes ? "Passes" : "Fails"}
              </span>
              {r.passes ? null : fix && fix !== normalizeHex(colors[r.fg]) ? (
                <button type="button" className="st-button st-fix" onClick={() => onApply(r.fg, fix)}>
                  <span className="st-fix-swatch" style={{ background: fix }} aria-hidden="true" />
                  Use {fix} for {fgName}
                </button>
              ) : (
                <span className="st-help st-nofix">
                  No shade of {fgName} works here. Change {colorRoleInfo[r.bg].name} instead.
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function FontField({
  label,
  value,
  sample,
  onChange,
  heading,
}: {
  label: string;
  value: string;
  sample: string;
  onChange: (stack: string) => void;
  heading?: boolean;
}) {
  const id = useId();
  const current = findFontStack(value);
  return (
    <div className="st-font">
      <label className="st-field-label" htmlFor={id}>
        {label}
      </label>
      <select
        id={id}
        className="st-input"
        value={current?.id ?? "custom"}
        onChange={(e) => {
          const stack = fontStacks.find((f) => f.id === e.target.value);
          if (stack) onChange(stack.stack);
        }}
        aria-describedby={`${id}-stack`}
      >
        {fontStacks.map((f) => (
          <option key={f.id} value={f.id}>
            {f.label}
          </option>
        ))}
        {current ? null : <option value="custom">Custom</option>}
      </select>
      <p className={heading ? "st-font-sample is-heading" : "st-font-sample"} style={{ fontFamily: value }}>
        {sample}
      </p>
      <p className="st-help st-stack" id={`${id}-stack`}>
        Font list: {value}
      </p>
    </div>
  );
}

function NumberField({
  id,
  label,
  unit,
  min,
  max,
  step,
  value,
  hint,
  onChange,
  onValidity,
}: {
  id: string;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  value: number;
  hint?: string;
  onChange: (value: number) => void;
  onValidity: (field: string, valid: boolean) => void;
}) {
  const [raw, setRaw] = useState(String(value));
  const parsed = raw.trim() === "" ? NaN : Number(raw);
  const valid = Number.isFinite(parsed) && parsed >= min && parsed <= max;

  useEffect(() => {
    setRaw((r) => (Number(r) === value ? r : String(value)));
  }, [value]);
  useEffect(() => onValidity(id, valid), [id, valid, onValidity]);

  const describedBy = [hint ? `${id}-hint` : null, valid ? null : `${id}-error`].filter(Boolean).join(" ") || undefined;
  return (
    <div className="st-number">
      <label className="st-field-label" htmlFor={id}>
        {label}
        <span className="st-sr"> in {unit}</span>
      </label>
      <span className="st-input-unit">
        <input
          id={id}
          className="st-input"
          type="number"
          inputMode="decimal"
          min={min}
          max={max}
          step={step}
          value={raw}
          aria-invalid={!valid || undefined}
          aria-describedby={describedBy}
          onChange={(e) => {
            setRaw(e.target.value);
            const n = Number(e.target.value);
            if (e.target.value.trim() !== "" && Number.isFinite(n) && n >= min && n <= max) onChange(n);
          }}
        />
        <span className="st-unit" aria-hidden="true">
          {unit}
        </span>
      </span>
      {hint ? (
        <p className="st-help" id={`${id}-hint`}>
          {hint}
        </p>
      ) : null}
      {valid ? null : (
        <p className="st-error" id={`${id}-error`}>
          Use a number from {min} to {max} {unit}.
        </p>
      )}
    </div>
  );
}

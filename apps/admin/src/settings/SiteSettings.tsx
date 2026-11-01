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
import { useCallback, useEffect, useId, useMemo, useState, type MouseEvent, type ReactNode } from "react";
import { sectionStyleIds, sectionStyleNames } from "@crust/blocks";
import { SectionStyleEditor, StyleSwatch } from "../sections/controls";
import { sameTokens } from "../tokens-store";
import { Icon } from "./icons";
import { Preview } from "./Preview";
import { ThemePackGroup, type PackPreview } from "./ThemePack";
import { ButtonOptions, CardOptions, LinkOptions, TypeOptions } from "./StyleGroups";
import { chromeProblems, FooterOptions, HeaderOptions, type PageOption } from "./ChromeGroups";
import { migrateChrome, validateChrome, type SiteChrome } from "@crust/blocks";
import { SiteAddressGroup } from "./SiteAddress";
import { TemplateGroup } from "./TemplateGroup";
import { bundledLoader, type TemplateLoader } from "../templates/collect";

export interface SiteSettingsProps {
  site: Site;
  /** The Home page, shown in the preview. */
  page: Page;
  saved: SiteTokens;
  draft: SiteTokens;
  onChange: (tokens: SiteTokens) => void;
  /** Persists the tokens; resolves to the message to show. */
  onSave: (tokens: SiteTokens) => Promise<string>;
  onDiscard: () => void;
  /** Extra top-bar link, e.g. the Publish shortcut (F024). */
  headerLink?: ReactNode;
  /** Header and footer (F031), edited and saved together with the tokens. */
  chrome?: SiteChrome;
  onChromeChange?: (chrome: SiteChrome) => void;
  /** True when the header or footer differs from what's saved. */
  chromeDirty?: boolean;
  /** The site's pages, for building menus. */
  pages?: PageOption[];
  /** The site's own address (F044), saved with the tokens as site.json's baseUrl. */
  address?: string;
  onAddressChange?: (baseUrl: string) => void;
  /** True when the address differs from what's saved. */
  addressDirty?: boolean;
  /** Where "Save as template" (F045) reads the site from, and whether that's GitHub. */
  templateLoader?: TemplateLoader;
  githubOn?: boolean;
}

/** Direction A (F028): one group at a time, beside the live preview. */
export const groups = [
  { id: "presets", label: "Presets" },
  { id: "colours", label: "Colours" },
  { id: "typography", label: "Typography" },
  { id: "buttons", label: "Buttons" },
  { id: "cards", label: "Cards" },
  { id: "links", label: "Links" },
  { id: "section-styles", label: "Section styles" },
  { id: "header", label: "Header & menu" },
  { id: "footer", label: "Footer" },
  { id: "spacing", label: "Spacing" },
  { id: "shape", label: "Shape & layout" },
  { id: "theme-pack", label: "Theme pack" },
  { id: "template", label: "Template" },
  { id: "address", label: "Site address" },
] as const;
export type GroupId = (typeof groups)[number]["id"];

/** Which group holds a field, from its id (for "fix the fields marked in red"). */
export function groupOfField(field: string): GroupId | null {
  if (field.startsWith("color-")) return "colours";
  if (field.startsWith("spacing-")) return "spacing";
  if (field === "radius" || field === "maxWidth") return "shape";
  if (field === "site-address") return "address";
  return null;
}

/** The group for a clicked part of the preview; null keeps the colour jump (F014). */
export function groupForElement(el: Element): GroupId | null {
  if (el.closest(".cr-site-header")) return "header";
  if (el.closest(".cr-site-footer")) return "footer";
  if (el.closest(".cr-button")) return "buttons";
  if (el.closest(".cr-card-link")) return "links";
  if (el.closest(".cr-card")) return "cards";
  if (el.closest(".cr-heading")) return "typography";
  return null;
}

export function SiteSettings({
  site,
  page,
  saved,
  draft,
  onChange,
  onSave,
  onDiscard,
  headerLink,
  chrome = migrateChrome(site, []),
  onChromeChange = () => undefined,
  chromeDirty = false,
  pages = [],
  address = site.baseUrl,
  onAddressChange = () => undefined,
  addressDirty = false,
  templateLoader = bundledLoader,
  githubOn = false,
}: SiteSettingsProps) {
  const [status, setStatus] = useState("");
  const [invalid, setInvalid] = useState<ReadonlySet<string>>(new Set());
  const [previewOpen, setPreviewOpen] = useState(true);
  const [group, setGroup] = useState<GroupId>("presets");
  /** After switching groups: what to focus once the group is shown. */
  const [pendingFocus, setPendingFocus] = useState<string | null>(null);
  useEffect(() => {
    if (!pendingFocus) return;
    const el = document.getElementById(pendingFocus);
    el?.scrollIntoView({ block: "center" });
    el?.focus({ preventScroll: true });
    if (el instanceof HTMLInputElement) el.select();
    setPendingFocus(null);
  }, [pendingFocus]);
  const open = (id: GroupId, focus = `${id}-h`) => {
    setGroup(id);
    setPendingFocus(focus);
  };
  /** Colours and fonts from before the last preset, for one-step undo. */
  const [beforePreset, setBeforePreset] = useState<{ tokens: SiteTokens; name: string } | null>(null);
  const dirty = !sameTokens(saved, draft) || chromeDirty || addressDirty;
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

  const [saving, setSaving] = useState(false);
  const save = async () => {
    if (saving) return;
    if (invalid.size > 0) {
      const first = [...invalid][0]!;
      const where = groupOfField(first);
      if (where) open(where, first);
      setStatus(`Not saved. Fix the ${invalid.size === 1 ? "field" : `${invalid.size} fields`} marked in red first.`);
      return;
    }
    const problems = [...validateTokens(draft), ...validateChrome(chrome)];
    const chromeGroup = (["header", "footer"] as const).find((g) => chromeProblems(chrome, g).length);
    if (chromeGroup && problems.length === validateChrome(chrome).length) open(chromeGroup);
    if (problems.length > 0) {
      setStatus(`Not saved. ${problems.map((p) => p.message).join(" ")}`);
      return;
    }
    setSaving(true);
    setStatus("Saving…");
    try {
      setStatus(await onSave(draft));
    } finally {
      setSaving(false);
    }
  };

  const discard = () => {
    if (!window.confirm("Discard your unsaved changes to Site settings?")) return;
    onDiscard();
    setBeforePreset(null);
    setStatus("Changes discarded.");
  };

  /** A theme pack being looked at (F033); only shown while its group is open. */
  const [packPreview, setPackPreview] = useState<PackPreview | null>(null);
  const withPack = (p: PackPreview | null) => ({
    tokens: p?.tokens ?? draft,
    chrome: p?.chrome ? { header: { ...chrome.header, ...p.chrome.header }, footer: { ...chrome.footer, ...p.chrome.footer } } : chrome,
  });
  const previewSite = useMemo(() => {
    const shown = withPack(group === "theme-pack" ? packPreview : null);
    return { ...site, tokens: shown.tokens, header: shown.chrome.header, footer: shown.chrome.footer };
    // withPack only reads draft and chrome.
  }, [site, draft, chrome, group, packPreview]);
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
          {headerLink}
          <button type="button" className="st-button" onClick={discard} disabled={!dirty}>
            Discard
          </button>
          <button type="button" className="st-button st-button-primary" onClick={save} aria-disabled={saving || undefined}>
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </header>
      <p className="st-status" role="status" aria-live="polite">
        {status}
      </p>

      <div className="st-layout">
        <nav className="st-nav" aria-label="Style groups">
          <ul>
            {groups.map((g) => {
              const fix = [...invalid].some((f) => groupOfField(f) === g.id) || ((g.id === "header" || g.id === "footer") && chromeProblems(chrome, g.id).length > 0);
              return (
                <li key={g.id}>
                  <button type="button" className="st-nav-item" aria-current={group === g.id ? "true" : undefined} onClick={() => open(g.id)}>
                    {g.label}
                    {g.id === "colours" && failing.length > 0 ? <span className="st-count"> ({failing.length} failing)</span> : null}
                    {fix ? <span className="st-count"> (fix)</span> : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <main className="st-form">
          <section className="st-card" id="presets" aria-labelledby="presets-h" hidden={group !== "presets"}>
            <h2 id="presets-h" tabIndex={-1}>Presets</h2>
            <p className="st-lede">
              A complete look: colours, fonts, headings, buttons, cards and links. Spacing, corners and page width stay as they
              are, and every preset passes the contrast checks.
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
                        setStatus(`${preset.name} applied. Use "Undo preset" to go back.`);
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
                  const before = beforePreset.tokens;
                  onChange({ ...draft, colors: before.colors, fonts: before.fonts, style: before.style, sectionStyles: before.sectionStyles });
                  setStatus(`Undid ${beforePreset.name}. The look is back to what it was.`);
                  setBeforePreset(null);
                  // F069 (WCAG 2.4.3): this button goes away; focus the preset that is current again, or the heading.
                  setTimeout(() => {
                    const back = document.querySelector<HTMLElement>("#presets .st-preset[aria-pressed='true']") ?? document.getElementById("presets-h");
                    back?.focus();
                  }, 0);
                }}
              >
                Undo preset ({beforePreset.name})
              </button>
            ) : null}
          </section>

          <div hidden={group !== "colours"}>
          <section className="st-card" id="colours" aria-labelledby="colours-h">
            <h2 id="colours-h" tabIndex={-1}>Colours</h2>
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
          </div>

          <section className="st-card" id="buttons" aria-labelledby="buttons-h" hidden={group !== "buttons"}>
            <h2 id="buttons-h" tabIndex={-1}>Buttons</h2>
            <ButtonOptions tokens={draft} onChange={onChange} />
          </section>

          <section className="st-card" id="cards" aria-labelledby="cards-h" hidden={group !== "cards"}>
            <h2 id="cards-h" tabIndex={-1}>Cards</h2>
            <CardOptions tokens={draft} onChange={onChange} />
          </section>

          <section className="st-card" id="links" aria-labelledby="links-h" hidden={group !== "links"}>
            <h2 id="links-h" tabIndex={-1}>Links</h2>
            <LinkOptions tokens={draft} onChange={onChange} />
          </section>

          <section className="st-card" id="section-styles" aria-labelledby="section-styles-h" hidden={group !== "section-styles"}>
            <h2 id="section-styles-h" tabIndex={-1}>Section styles</h2>
            <p className="st-lede">
              Four looks for whole sections. Each section picks one in the builder; a change here restyles every section that uses it.
            </p>
            <div className="sx-settings">
              {sectionStyleIds.map((id) => (
                <div className="sx-settings-style" key={id} role="group" aria-labelledby={`sx-${id}-h`}>
                  <h3 id={`sx-${id}-h`} className="sx-settings-name">
                    <StyleSwatch tokens={draft} id={id} />
                    {sectionStyleNames[id]} sections
                  </h3>
                  <SectionStyleEditor tokens={draft} id={id} onChange={onChange} />
                </div>
              ))}
            </div>
          </section>

          <section className="st-card" id="header" aria-labelledby="header-h" hidden={group !== "header"}>
            <h2 id="header-h" tabIndex={-1}>Header & menu</h2>
            <p className="st-lede">Shown at the top of every page. The menu marks the page a visitor is on.</p>
            <HeaderOptions chrome={chrome} onChange={onChromeChange} tokens={draft} pages={pages} />
          </section>

          <section className="st-card" id="footer" aria-labelledby="footer-h" hidden={group !== "footer"}>
            <h2 id="footer-h" tabIndex={-1}>Footer</h2>
            <p className="st-lede">Shown at the bottom of every page.</p>
            <FooterOptions chrome={chrome} onChange={onChromeChange} tokens={draft} pages={pages} />
          </section>

          <section className="st-card" id="typography" aria-labelledby="typography-h" hidden={group !== "typography"}>
            <h2 id="typography-h" tabIndex={-1}>Typography</h2>
            <p className="st-lede">
              These use fonts already on your visitors' devices: nothing to download, so pages stay fast. They look slightly
              different on Mac, Windows and phones.
            </p>
            <FontField label="Heading font" value={draft.fonts.heading} sample="Build fast sites, visually"
              onChange={(v) => onChange({ ...draft, fonts: { ...draft.fonts, heading: v } })} heading />
            <FontField label="Body font" value={draft.fonts.body} sample="Design pages with blocks and design tokens."
              onChange={(v) => onChange({ ...draft, fonts: { ...draft.fonts, body: v } })} />
            <TypeOptions tokens={draft} onChange={onChange} />
          </section>

          <section className="st-card" id="spacing" aria-labelledby="spacing-h" hidden={group !== "spacing"}>
            <h2 id="spacing-h" tabIndex={-1}>Spacing</h2>
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

          <section className="st-card" id="shape" aria-labelledby="shape-h" hidden={group !== "shape"}>
            <h2 id="shape-h" tabIndex={-1}>Shape & layout</h2>
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

          <section className="st-card" id="theme-pack" aria-labelledby="theme-pack-h" hidden={group !== "theme-pack"}>
            <h2 id="theme-pack-h" tabIndex={-1}>Theme pack</h2>
            <p className="st-lede">Take this site's look to another Crust site, or bring one in, as a single .crust file.</p>
            <ThemePackGroup
              siteName={site.name}
              tokens={draft}
              chrome={chrome}
              canExport={invalid.size === 0 && validateTokens(draft).length === 0}
              onPreview={setPackPreview}
              onApply={(p) => {
                const next = withPack(p);
                if (p.tokens) {
                  setBeforePreset(null);
                  onChange(next.tokens);
                }
                if (p.chrome) onChromeChange(next.chrome);
              }}
            />
          </section>

          <section className="st-card" id="template" aria-labelledby="template-h" hidden={group !== "template"}>
            <h2 id="template-h" tabIndex={-1}>Save as template</h2>
            <TemplateGroup
              site={{ name: site.name, language: site.language }}
              tokens={draft}
              chrome={chrome}
              canSave={invalid.size === 0 && validateTokens(draft).length === 0}
              loader={templateLoader}
              connected={githubOn}
            />
          </section>

          <section className="st-card" id="address" aria-labelledby="address-h" hidden={group !== "address"}>
            <h2 id="address-h" tabIndex={-1}>Site address</h2>
            <SiteAddressGroup value={address} onChange={onAddressChange} onValidity={setValidity} />
          </section>
        </main>

        <aside className={`st-aside${previewOpen ? "" : " is-collapsed"}`} aria-label="Live preview">
          <Preview
            site={previewSite}
            page={page}
            open={previewOpen}
            onToggle={() => setPreviewOpen((o) => !o)}
            onPick={(role, el) => {
              // While editing colours, a click finds the colour (F014); otherwise it opens that part's group (F028).
              const part = group === "colours" || !el ? null : groupForElement(el);
              if (part) {
                open(part);
                setStatus(`Showing ${groups.find((g) => g.id === part)!.label}: the settings for that part of the page.`);
                return;
              }
              open("colours", `color-${role}`);
              setStatus(`That part of the page uses ${colorRoleInfo[role].name}. Its field is selected.`);
            }}
          />
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

/**
 * Theme pack (F033): download this site's look as a .crust file, or bring
 * one in. An imported pack is checked first, then shown in the preview;
 * nothing changes until "Use this theme", and the style still waits for
 * Save (Discard takes it back).
 */
import {
  colorRoleInfo,
  colorRoles,
  config,
  freeLayoutName,
  makeThemePack,
  packFileName,
  packSummary,
  readThemePack,
  type PackChrome,
  type PackParts,
  type SiteChrome,
  type SiteTokens,
  type ThemePack,
} from "@crust/blocks";
import { useEffect, useId, useRef, useState } from "react";
import { useMyLayouts } from "../layouts/mine";

export interface PackPreview {
  tokens?: SiteTokens;
  chrome?: PackChrome;
}

type Props = {
  siteName: string;
  tokens: SiteTokens;
  chrome: SiteChrome;
  /** False while a field is invalid: the pack would carry the mistake. */
  canExport: boolean;
  /** Shows a pack in the preview, or null for the site's own look. */
  onPreview: (p: PackPreview | null) => void;
  /** Puts the pack's style and header/footer look into the unsaved draft. */
  onApply: (p: PackPreview) => void;
};

export const chromeLook = (c: SiteChrome): PackChrome => ({ header: { style: c.header.style, sticky: c.header.sticky }, footer: { style: c.footer.style } });

function Check({ label, checked, disabled, onChange }: { label: string; checked: boolean; disabled?: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="st-check st-check-quiet">
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function ThemePackGroup({ siteName, tokens, chrome, canExport, onPreview, onApply }: Props) {
  const id = useId();
  const mine = useMyLayouts();
  const saved = (mine.layouts ?? []).filter((l) => l.kind !== "element");
  const [name, setName] = useState(`${siteName} look`);
  const [parts, setParts] = useState<PackParts>({ tokens: true, chrome: true, layouts: true });
  const [exportMessage, setExportMessage] = useState("");

  const [loaded, setLoaded] = useState<ThemePack | null>(null);
  const [take, setTake] = useState<PackParts>({ tokens: true, chrome: true, layouts: true });
  const [problems, setProblems] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [importMessage, setImportMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // The preview follows what's loaded and ticked.
  useEffect(() => {
    if (!loaded) return onPreview(null);
    onPreview({ tokens: take.tokens ? loaded.tokens : undefined, chrome: take.chrome ? loaded.chrome : undefined });
  }, [loaded, take, onPreview]);
  // Leaving the group puts the site's own look back.
  useEffect(() => () => onPreview(null), [onPreview]);

  const exportPack = () => {
    if (!canExport) {
      setExportMessage("Fix the fields marked in red first, so the pack doesn't carry the mistake.");
      return;
    }
    // F080: saved element styles stay out of packs for now (DECISIONS F080).
    const layouts = saved.flatMap((l) => (l.kind === "element" ? [] : [{ name: l.name, kind: l.kind, content: l.content as never }]));
    const pack = makeThemePack(name, parts, { tokens, chrome: chromeLook(chrome), layouts });
    const file = packFileName(pack.name);
    download(file, `${JSON.stringify(pack, null, 2)}\n`);
    setExportMessage(`Downloaded ${file}. Open Site settings → Theme pack in another Crust site to bring it in.`);
  };

  const choose = async (file: File | undefined) => {
    setImportMessage("");
    if (!file) return;
    const { pack, problems: found, warnings: leftOut = [] } = readThemePack(await file.text(), config.components);
    setWarnings(leftOut);
    if (fileRef.current) fileRef.current.value = "";
    if (!pack) {
      setLoaded(null);
      setProblems(found);
      return;
    }
    setProblems([]);
    setTake({ tokens: !!pack.tokens, chrome: !!pack.chrome, layouts: !!pack.layouts?.length });
    setLoaded(pack);
  };

  const cancel = () => {
    const was = loaded?.name;
    setLoaded(null);
    setImportMessage(was ? `“${was}” wasn't used. Nothing changed.` : "");
    fileRef.current?.focus();
  };

  const apply = async () => {
    if (!loaded || busy) return;
    setBusy(true);
    const done: string[] = [];
    onApply({ tokens: take.tokens ? loaded.tokens : undefined, chrome: take.chrome ? loaded.chrome : undefined });
    if (take.tokens || take.chrome) done.push("The style is in place: Save to keep it, or Discard to undo it.");
    if (take.layouts && loaded.layouts?.length) {
      const taken = saved.map((l) => l.name);
      const failed: string[] = [];
      let added = 0;
      for (const l of loaded.layouts) {
        const free = freeLayoutName(l.name, taken);
        taken.push(free);
        const error = await mine.save(free, l.kind, l.content as never);
        if (error) failed.push(`${l.name} (${error})`);
        else added++;
      }
      if (added) done.push(`Added ${added} layout${added === 1 ? "" : "s"} to My layouts.`);
      if (failed.length) done.push(`Couldn't add: ${failed.join("; ")}.`);
    }
    setImportMessage(`Used “${loaded.name}”. ${done.join(" ")}`);
    setLoaded(null);
    setBusy(false);
  };

  const nothingTicked = loaded && !take.tokens && !take.chrome && !take.layouts;

  return (
    <>
      <div className="st-pack-part">
        <h3 className="st-pack-h">Download this site's look</h3>
        <label className="st-field-label" htmlFor={`${id}-name`}>
          Theme name
        </label>
        <input id={`${id}-name`} className="st-input" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />
        <fieldset className="st-pack-parts">
          <legend className="st-field-label">Include</legend>
          <Check label="Style: colours, fonts, spacing, section styles, buttons, cards, links" checked={parts.tokens} onChange={(v) => setParts({ ...parts, tokens: v })} />
          <Check label="Header and footer look (styles and sticky, not your links)" checked={parts.chrome} onChange={(v) => setParts({ ...parts, chrome: v })} />
          <Check
            label={saved.length ? `My layouts (${saved.length})` : "My layouts (none saved yet)"}
            checked={parts.layouts && saved.length > 0}
            disabled={!saved.length}
            onChange={(v) => setParts({ ...parts, layouts: v })}
          />
        </fieldset>
        <p className="st-help">The pack holds what the preview shows, including changes you haven't saved. Only Crust settings and blocks: no code.</p>
        <button type="button" className="st-button st-button-primary" disabled={!parts.tokens && !parts.chrome && !(parts.layouts && saved.length)} onClick={exportPack}>
          Download theme pack
        </button>
        <p className="st-pack-message" role="status">
          {exportMessage}
        </p>
      </div>

      <div className="st-pack-part">
        <h3 className="st-pack-h">Bring in a theme pack</h3>
        <label className="st-field-label" htmlFor={`${id}-file`}>
          Choose a .crust file
        </label>
        <input
          ref={fileRef}
          id={`${id}-file`}
          className="st-file"
          type="file"
          accept=".crust,application/json"
          aria-describedby={`${id}-file-help`}
          onChange={(e) => void choose(e.target.files?.[0])}
        />
        <p className="st-help" id={`${id}-file-help`}>
          It's checked first, then shown in the preview. Nothing changes until you choose “Use this theme”.
        </p>

        {problems.length ? (
          <div className="st-warning" role="alert">
            <p className="st-pack-alert-title">Nothing was changed. This file can't be used:</p>
            <ul>
              {problems.slice(0, 8).map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
            {problems.length > 8 ? <p>…and {problems.length - 8} more.</p> : null}
          </div>
        ) : null}

        {loaded ? (
          <section className="st-pack-loaded" aria-labelledby={`${id}-loaded`}>
            <h4 id={`${id}-loaded`} className="st-pack-name">
              Previewing “{loaded.name}”
            </h4>
            {loaded.tokens ? (
              <ul className="st-pack-swatches" aria-label="Its colours">
                {colorRoles.map((r) => (
                  <li key={r}>
                    <span className="st-pack-swatch" style={{ background: loaded.tokens!.colors[r] }} aria-hidden="true" />
                    {colorRoleInfo[r].name} {loaded.tokens!.colors[r].toUpperCase()}
                  </li>
                ))}
              </ul>
            ) : null}
            {warnings.length ? (
              <div className="st-warning" role="alert">
                <p className="st-pack-alert-title">{warnings[0]}</p>
                <ul>
                  {warnings.slice(1).map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            <fieldset className="st-pack-parts">
              <legend className="st-field-label">Use</legend>
              {packSummary(loaded).map((line) => {
                const key: keyof PackParts = line.startsWith("Style") ? "tokens" : line.startsWith("Header") ? "chrome" : "layouts";
                return <Check key={key} label={line} checked={take[key]} onChange={(v) => setTake({ ...take, [key]: v })} />;
              })}
            </fieldset>
            {take.layouts && loaded.layouts?.length ? <p className="st-help">Layouts are added to My layouts next to yours; none are replaced.</p> : null}
            <div className="st-pack-actions">
              <button type="button" className="st-button st-button-primary" disabled={!!nothingTicked} aria-disabled={busy || undefined} onClick={() => void apply()}>
                {busy ? "Using…" : "Use this theme"}
              </button>
              <button type="button" className="st-button" onClick={cancel}>
                Cancel
              </button>
            </div>
          </section>
        ) : null}
        <p className="st-pack-message" role="status">
          {importMessage}
        </p>
      </div>
    </>
  );
}

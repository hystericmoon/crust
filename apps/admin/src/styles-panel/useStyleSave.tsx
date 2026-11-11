/** F092: save and discard for the Styles panel and the Site settings sheet, with the same checks as the old Site settings screen. */
import { useCallback, useState } from "react";
import { checkSiteSeo, validateChrome, validateTokens } from "@crust/blocks";
import { useSiteStyle } from "../sections/site-style";
import { useStylesPanel } from "./context";

export function useInvalid() {
  const [invalid, setInvalid] = useState<ReadonlySet<string>>(new Set());
  const setValidity = useCallback((field: string, valid: boolean) => {
    setInvalid((prev) => {
      if (valid === !prev.has(field)) return prev;
      const next = new Set(prev);
      if (valid) next.delete(field);
      else next.add(field);
      return next;
    });
  }, []);
  return { invalid, setValidity };
}

export function SaveBar({ invalid }: { invalid: ReadonlySet<string> }) {
  const style = useSiteStyle();
  const panel = useStylesPanel();
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const dirty = style.dirty || panel.chromeDirty || panel.addressDirty || panel.detailsDirty;

  const save = async () => {
    if (saving) return;
    if (invalid.size > 0) {
      setStatus(`Not saved. Fix the ${invalid.size === 1 ? "field" : `${invalid.size} fields`} marked in red first.`);
      return;
    }
    const problems = [...validateTokens(style.tokens), ...validateChrome(panel.chrome)];
    const seoProblems = checkSiteSeo(panel.details.seo);
    if (seoProblems.length > 0) {
      setStatus(`Not saved. ${seoProblems.join(" ")}`);
      return;
    }
    if (problems.length > 0) {
      setStatus(`Not saved. ${problems.map((p) => p.message).join(" ")}`);
      return;
    }
    setSaving(true);
    setStatus("Saving…");
    try {
      setStatus(await panel.save());
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="sp-save">
      <p className="sp-status" role="status" aria-live="polite">
        {status || (dirty ? "Unsaved changes" : "All changes saved")}
      </p>
      <div className="sp-save-buttons">
        <button
          type="button"
          className="st-button"
          disabled={!dirty}
          onClick={() => {
            if (!window.confirm("Discard your unsaved changes to the site's look and settings?")) return;
            panel.discard();
            setStatus("Changes discarded.");
          }}
        >
          Discard
        </button>
        <button type="button" className="st-button st-button-primary" onClick={save} aria-disabled={saving || undefined}>
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}

/**
 * F092: the Site settings sheet. Site details (address, search defaults,
 * where to publish, theme pack, template) in a proper dialog: the browser
 * keeps focus inside, Escape closes it and focus goes back to the button.
 * The groups are the ones the Site settings screen has.
 */
import { useId, useState } from "react";
import { validateTokens } from "@crust/blocks";
import { Dialog } from "../pages/PageActions";
import { useSiteStyle } from "../sections/site-style";
import { SiteAddressGroup } from "../settings/SiteAddress";
import { TemplateGroup } from "../settings/TemplateGroup";
import { ThemePackGroup } from "../settings/ThemePack";
import { useStylesPanel } from "./context";
import { SaveBar, useInvalid } from "./useStyleSave";
import "./styles-panel.css";

export function SiteSettingsSheet({ onClose }: { onClose: () => void }) {
  const style = useSiteStyle();
  const panel = useStylesPanel();
  const id = useId();
  const { invalid, setValidity } = useInvalid();
  const draft = style.tokens;
  return (
    <Dialog labelledBy={`${id}-title`} onClose={onClose}>
      <div className="st sp-sheet">
        <div className="sp-sheet-head">
          <h2 id={`${id}-title`} className="sp-sheet-title">Site settings</h2>
          <button type="button" className="st-button" onClick={onClose}>
            Close
          </button>
        </div>

        <section aria-labelledby={`${id}-address`} className="sp-sheet-group">
          <h3 id={`${id}-address`}>Site address</h3>
          <SiteAddressGroup value={panel.address} onChange={panel.onAddressChange} onValidity={setValidity} />
        </section>

        <section aria-labelledby={`${id}-search`} className="sp-sheet-group">
          <h3 id={`${id}-search`}>Search defaults</h3>
          <p className="st-lede">
            Search engines and shared links use your site name, <strong>{panel.site.name}</strong>, and its language, <strong>{panel.site.language}</strong>,
            when a page has no title of its own. Each page's title, description and sharing picture are in that page's settings.
          </p>
        </section>

        <section aria-labelledby={`${id}-publish`} className="sp-sheet-group">
          <h3 id={`${id}-publish`}>Where to publish</h3>
          <p className="st-lede">Visitors see your changes when you press Publish. The place it goes to is set up on the home screen.</p>
          <a className="st-button" href="#/?focus=publish">
            Open Publish
          </a>
        </section>

        <section aria-labelledby={`${id}-pack`} className="sp-sheet-group">
          <h3 id={`${id}-pack`}>Theme pack</h3>
          <p className="st-lede">Take this site's look to another Crust site, or bring one in, as a single .crust file.</p>
          <ThemePackGroup
            siteName={panel.site.name}
            tokens={draft}
            chrome={panel.chrome}
            canExport={invalid.size === 0 && validateTokens(draft).length === 0}
            onPreview={() => undefined}
            onApply={(p) => {
              if (p.tokens) style.setTokens(p.tokens);
              if (p.chrome) panel.onChromeChange({ header: { ...panel.chrome.header, ...p.chrome.header }, footer: { ...panel.chrome.footer, ...p.chrome.footer } });
            }}
          />
        </section>

        <section aria-labelledby={`${id}-template`} className="sp-sheet-group">
          <h3 id={`${id}-template`}>Save as template</h3>
          <TemplateGroup
            site={panel.site}
            tokens={draft}
            chrome={panel.chrome}
            canSave={invalid.size === 0 && validateTokens(draft).length === 0}
            loader={panel.templateLoader}
            connected={panel.githubOn}
          />
          <a className="st-button" href="#/templates">
            Start from a template
          </a>
        </section>

        <SaveBar invalid={invalid} />
      </div>
    </Dialog>
  );
}

/** A button that opens the sheet. Used in the Styles panel and the Site panel. */
export function SiteSettingsButton({ className = "st-button sp-site-button" }: { className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={className} aria-haspopup="dialog" onClick={() => setOpen(true)}>
        Site settings
      </button>
      {open ? <SiteSettingsSheet onClose={() => setOpen(false)} /> : null}
    </>
  );
}

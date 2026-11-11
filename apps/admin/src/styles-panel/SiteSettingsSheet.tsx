/**
 * F092: the Site settings sheet. Site details (address, search defaults,
 * where to publish, theme pack, template) in a proper dialog: the browser
 * keeps focus inside, Escape closes it and focus goes back to the button.
 * The groups are the ones the Site settings screen has.
 */
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { displayUrl, shorten, siteHost, siteSeoLimits, seoAdvice, validateTokens } from "@crust/blocks";
import { Dialog } from "../pages/PageActions";
import { desktopHosts } from "../publish/hosts";
import { desktopPublisher } from "../desktop/local-publish";
import { DesktopPublishPanel } from "../publish/DesktopPublishPanel";
import { ImageField } from "../media/ImageField";
import { loadSavedAddress } from "../chrome-store";
import { useSiteStyle } from "../sections/site-style";
import { SiteAddressGroup } from "../settings/SiteAddress";
import { TemplateGroup } from "../settings/TemplateGroup";
import { ThemePackGroup } from "../settings/ThemePack";
import { useStylesPanel } from "./context";
import { SaveBar, useInvalid } from "./useStyleSave";
import "./styles-panel.css";
import { HeadingShift } from "../settings/heading";

/** Common languages for the site's language code; a code the site already has is kept even when it is not listed. */
const LANGUAGES: [string, string][] = [
  ["en", "English"], ["id", "Bahasa Indonesia"], ["es", "Español"], ["fr", "Français"], ["de", "Deutsch"], ["pt", "Português"],
  ["it", "Italiano"], ["nl", "Nederlands"], ["ja", "日本語"], ["ko", "한국어"], ["zh", "中文"], ["ar", "العربية"],
];
const languageName = (code: string) => LANGUAGES.find(([c]) => c === code)?.[1] ?? code;

/**
 * One group of the sheet (F094, direction C): its title and what it is set to now, with a button that opens its
 * fields in place. Opening moves focus to the first field; Done puts it back on the button.
 */
function Group({ id, title, summary, open, onToggle, children }: { id: string; title: string; summary: ReactNode; open: boolean; onToggle: () => void; children: ReactNode }) {
  const button = useRef<HTMLButtonElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const wasOpen = useRef(open);
  useEffect(() => {
    if (open && !wasOpen.current) body.current?.querySelector<HTMLElement>("input, select, textarea, button, a")?.focus();
    if (!open && wasOpen.current) button.current?.focus();
    wasOpen.current = open;
  }, [open]);
  return (
    <section aria-labelledby={`${id}-title`} className={open ? "sp-row is-open" : "sp-row"}>
      <div className="sp-row-top">
        <h3 id={`${id}-title`}>{title}</h3>
        <button type="button" className="st-button" aria-expanded={open} aria-controls={`${id}-body`} aria-label={`${open ? "Done with" : "Edit"} ${title}`} ref={button} onClick={onToggle}>
          {open ? "Done" : "Edit"}
        </button>
      </div>
      {open ? null : <div className="sp-row-value">{summary}</div>}
      <div id={`${id}-body`} ref={body} className="sp-row-body" hidden={!open}>
        {open ? children : null}
      </div>
    </section>
  );
}

function SearchFields({ idBase, onValidity }: { idBase: string; onValidity: (field: string, valid: boolean) => void }) {
  const panel = useStylesPanel();
  const d = panel.details;
  const set = (patch: Partial<typeof d>) => panel.onDetailsChange({ ...d, ...patch });
  const setSeo = (patch: Partial<typeof d.seo>) => set({ seo: { ...d.seo, ...patch } });
  const description = d.seo.description ?? "";
  const image = d.seo.image ?? "";
  const nameOk = d.name.trim().length > 0;
  const altOk = !image.trim() || !!d.seo.imageAlt?.trim();
  useEffect(() => onValidity("site-name", nameOk), [nameOk, onValidity]);
  useEffect(() => onValidity("site-image-alt", altOk), [altOk, onValidity]);
  const languages = LANGUAGES.some(([c]) => c === d.language) ? LANGUAGES : [[d.language, d.language] as [string, string], ...LANGUAGES];
  const shown = description.trim() || "Your page's own description shows here.";
  return (
    <>
      <p className="st-lede">What search engines and shared links show when a page has no title or description of its own.</p>
      <div className="sp-field">
        <label className="st-field-label" htmlFor={`${idBase}-name`}>Site name</label>
        <input id={`${idBase}-name`} className="st-input" value={d.name} aria-invalid={!nameOk || undefined} aria-describedby={nameOk ? undefined : `${idBase}-name-error`} onChange={(e) => set({ name: e.target.value })} />
        {nameOk ? null : <p id={`${idBase}-name-error`} className="st-error">Give your site a name.</p>}
      </div>
      <div className="sp-field">
        <label className="st-field-label" htmlFor={`${idBase}-lang`}>Language</label>
        <select id={`${idBase}-lang`} className="st-input" value={d.language} onChange={(e) => set({ language: e.target.value })}>
          {languages.map(([code, name]) => (
            <option key={code} value={code}>{name}</option>
          ))}
        </select>
      </div>
      <div className="sp-field">
        <label className="st-field-label" htmlFor={`${idBase}-desc`}>Description when a page has none</label>
        <textarea id={`${idBase}-desc`} className="st-input" rows={3} maxLength={siteSeoLimits.description} value={description} aria-describedby={`${idBase}-desc-count`} onChange={(e) => setSeo({ description: e.target.value })} />
        <p id={`${idBase}-desc-count`} className="sp-hint">
          {description.length} of about {seoAdvice.description} characters{description.length > seoAdvice.description ? ". Search engines usually cut it there." : ""}
        </p>
      </div>
      <div className="sp-field">
        <ImageField label="Sharing picture" value={image} onChange={(src) => setSeo({ image: src })} onPick={(src, alt) => setSeo({ image: src, imageAlt: d.seo.imageAlt?.trim() ? d.seo.imageAlt : alt })} />
        {image.trim() ? (
          <>
            <label className="st-field-label" htmlFor={`${idBase}-alt`}>Describe the picture (alt text)</label>
            <input id={`${idBase}-alt`} className="st-input" maxLength={siteSeoLimits.imageAlt} value={d.seo.imageAlt ?? ""} aria-invalid={!altOk || undefined} aria-describedby={altOk ? undefined : `${idBase}-alt-error`} onChange={(e) => setSeo({ imageAlt: e.target.value })} />
            {altOk ? null : <p id={`${idBase}-alt-error`} className="st-error">Describe the picture so people who can't see it know what it shows.</p>}
          </>
        ) : null}
        <p className="sp-hint">Pages with their own sharing picture keep it.</p>
      </div>
      <div className="sp-snippet" role="group" aria-label="How it can look in search">
        <span className="sp-hint">How it can look in search</span>
        <span className="sp-snippet-title">{d.name.trim() || "Your site"}</span>
        <span className="sp-hint">{displayUrl(panel.address, "/")} · {shorten(shown, seoAdvice.description)}</span>
      </div>
    </>
  );
}

export function SiteSettingsSheet({ onClose }: { onClose: () => void }) {
  const style = useSiteStyle();
  const panel = useStylesPanel();
  const id = useId();
  const { invalid, setValidity } = useInvalid();
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const toggle = (g: string) => () => setOpenGroup((cur) => (cur === g ? null : g));
  const draft = style.tokens;
  const publisher = desktopPublisher();
  const saved = panel.details;
  const own = siteHost(panel.address);
  return (
    <Dialog labelledBy={`${id}-title`} onClose={onClose}>
      <HeadingShift.Provider value={1}>
      <div className="st sp-sheet">
        <div className="sp-sheet-head">
          <h2 id={`${id}-title`} className="sp-sheet-title">Site settings</h2>
          <button type="button" className="st-button" onClick={onClose}>
            Close
          </button>
        </div>

        <Group id={`${id}-address`} title="Site address" open={openGroup === "address"} onToggle={toggle("address")} summary={own || "Not set. Your site uses its free address."}>
          <SiteAddressGroup value={panel.address} onChange={panel.onAddressChange} onValidity={setValidity} />
        </Group>

        <Group
          id={`${id}-search`}
          title="Search defaults"
          open={openGroup === "search"}
          onToggle={toggle("search")}
          summary={
            <>
              {saved.name} · {languageName(saved.language)}
              <br />
              {saved.seo.description?.trim() ? shorten(saved.seo.description, 90) : "No default description yet."}
            </>
          }
        >
          <SearchFields idBase={`${id}-s`} onValidity={setValidity} />
        </Group>

        <Group
          id={`${id}-publish`}
          title="Where to publish"
          open={openGroup === "publish"}
          onToggle={toggle("publish")}
          summary={publisher ? "On this computer. Open to connect a host or export the site." : `Your site's ${own ? "own address" : "free address"}, when you press Publish.`}
        >
          {publisher ? (
            <DesktopPublishPanel publisher={publisher} siteUrl={loadSavedAddress(panel.address)} hosts={desktopHosts()} />
          ) : (
            <>
              <p className="st-lede">Visitors see your changes when you press Publish. The place it goes to is set up on the home screen.</p>
              <a className="st-button" href="#/?focus=publish">
                Open Publish
              </a>
            </>
          )}
        </Group>

        <Group id={`${id}-pack`} title="Theme pack" open={openGroup === "pack"} onToggle={toggle("pack")} summary="Take this site's look to another Crust site, or bring one in, as a single .crust file.">
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
        </Group>

        <Group id={`${id}-template`} title="Save as template" open={openGroup === "template"} onToggle={toggle("template")} summary="Use this site as a starting point for new sites.">
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
        </Group>

        <SaveBar invalid={invalid} />
      </div>
      </HeadingShift.Provider>
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

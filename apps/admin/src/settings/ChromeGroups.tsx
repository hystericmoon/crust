/**
 * Header and Footer in Site settings (F031): edited once, shown on every
 * page. Menus are lists with Move up / Move down buttons (no dragging needed)
 * and "Add a page" from the site's pages.
 */
import {
  chromeLimits,
  menuFromPages,
  validateChrome,
  type FooterColumn,
  type MenuLink,
  type SiteChrome,
  type SiteFooter,
  type SiteHeader,
  type SiteTokens,
} from "@crust/blocks";
import { useId, useState } from "react";
import { StyleTiles } from "../sections/controls";

export interface PageOption {
  path: string;
  title: string;
}

type Props = { chrome: SiteChrome; onChange: (c: SiteChrome) => void; tokens: SiteTokens; pages: PageOption[] };

/** Problems for one part ("header" or "footer"), in the owner's words. */
export function chromeProblems(chrome: SiteChrome, part: "header" | "footer"): string[] {
  return validateChrome(chrome)
    .filter((p) => p.path.startsWith(part))
    .map((p) => p.message);
}

function Problems({ list }: { list: string[] }) {
  if (!list.length) return null;
  return (
    <ul className="st-warning st-chrome-problems" role="alert">
      {list.map((m) => (
        <li key={m}>{m}</li>
      ))}
    </ul>
  );
}

function TextField({ label, value, onChange, hint, multiline }: { label: string; value: string; onChange: (v: string) => void; hint?: string; multiline?: boolean }) {
  const id = useId();
  return (
    <div className="st-chrome-field">
      <label className="st-field-label" htmlFor={id}>
        {label}
      </label>
      {multiline ? (
        <textarea id={id} className="st-input st-textarea" value={value} rows={3} aria-describedby={hint ? `${id}-hint` : undefined} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input id={id} className="st-input" value={value} aria-describedby={hint ? `${id}-hint` : undefined} onChange={(e) => onChange(e.target.value)} />
      )}
      {hint ? (
        <p className="st-help" id={`${id}-hint`}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="st-check">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

/** A list of links: label, address, move up/down, remove; add a page or a blank link. */
export function LinkListEditor({
  name,
  links,
  onChange,
  max,
  pages,
}: {
  name: string;
  links: MenuLink[];
  onChange: (links: MenuLink[]) => void;
  max: number;
  pages: PageOption[];
}) {
  const id = useId();
  const [message, setMessage] = useState("");
  const unused = pages.filter((p) => !links.some((l) => l.href === p.path));
  const [pick, setPick] = useState("");
  const set = (i: number, patch: Partial<MenuLink>) => onChange(links.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const move = (i: number, by: number) => {
    const j = i + by;
    if (j < 0 || j >= links.length) return;
    const next = [...links];
    [next[i], next[j]] = [next[j]!, next[i]!];
    onChange(next);
    setMessage(`${links[i]!.label || "Link"} moved to position ${j + 1} of ${links.length}.`);
    requestAnimationFrame(() => document.getElementById(`${id}-${j}-${by < 0 ? "up" : "down"}`)?.focus());
  };
  const full = links.length >= max;
  return (
    <div className="st-links" role="group" aria-labelledby={`${id}-name`}>
      <span className="st-field-label" id={`${id}-name`}>
        {name}
      </span>
      {links.length ? (
        <ol className="st-link-list">
          {links.map((l, i) => (
            <li key={i} className="st-link-row">
              <label className="st-sr" htmlFor={`${id}-${i}-label`}>
                {name} link {i + 1}: label
              </label>
              <input id={`${id}-${i}-label`} className="st-input" placeholder="Label" value={l.label} onChange={(e) => set(i, { label: e.target.value })} />
              <label className="st-sr" htmlFor={`${id}-${i}-href`}>
                {name} link {i + 1}: address
              </label>
              <input id={`${id}-${i}-href`} className="st-input" placeholder="/about or https://…" value={l.href} onChange={(e) => set(i, { href: e.target.value })} />
              <span className="st-link-actions">
                <button type="button" id={`${id}-${i}-up`} className="st-icon-button" disabled={i === 0} aria-label={`Move ${l.label || `link ${i + 1}`} up`} onClick={() => move(i, -1)}>
                  ↑
                </button>
                <button type="button" id={`${id}-${i}-down`} className="st-icon-button" disabled={i === links.length - 1} aria-label={`Move ${l.label || `link ${i + 1}`} down`} onClick={() => move(i, 1)}>
                  ↓
                </button>
                <button
                  type="button"
                  className="st-icon-button"
                  aria-label={`Remove ${l.label || `link ${i + 1}`}`}
                  onClick={() => {
                    onChange(links.filter((_, j) => j !== i));
                    setMessage(`${l.label || "Link"} removed.`);
                  }}
                >
                  ×
                </button>
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="st-help">No links yet.</p>
      )}
      <div className="st-link-add">
        {unused.length ? (
          <>
            <label className="st-sr" htmlFor={`${id}-pick`}>
              Page to add to {name}
            </label>
            <select id={`${id}-pick`} className="st-input" value={pick} onChange={(e) => setPick(e.target.value)} disabled={full}>
              <option value="">Choose a page…</option>
              {unused.map((p) => (
                <option key={p.path} value={p.path}>
                  {p.title} ({p.path})
                </option>
              ))}
            </select>
            <button
              type="button"
              className="st-button"
              disabled={full || !pick}
              onClick={() => {
                const page = pages.find((p) => p.path === pick);
                if (!page) return;
                const label = page.path === "/" ? "Home" : page.title.slice(0, chromeLimits.label);
                onChange([...links, { label, href: page.path }]);
                setPick("");
                setMessage(`${label} added.`);
              }}
            >
              Add page
            </button>
          </>
        ) : null}
        <button type="button" className="st-button" disabled={full} onClick={() => onChange([...links, { label: "", href: "" }])}>
          Add a link
        </button>
      </div>
      {full ? <p className="st-help">That's the most this list can hold ({max}).</p> : null}
      <p className="st-sr" role="status">
        {message}
      </p>
    </div>
  );
}

export function HeaderOptions({ chrome, onChange, tokens, pages }: Props) {
  const h = chrome.header;
  const set = (patch: Partial<SiteHeader>) => onChange({ ...chrome, header: { ...h, ...patch } });
  return (
    <>
      <Check label="Show a header on every page" checked={h.show} onChange={(show) => set({ show })} />
      <div className="st-chrome-body" hidden={!h.show}>
        <fieldset className="st-fieldset">
          <legend className="st-field-label">Logo</legend>
          <TextField label="Name" value={h.logo.text} onChange={(text) => set({ logo: { ...h.logo, text } })} hint="Shown when there's no logo image, and links to the home page." />
          <TextField label="Logo image address (optional)" value={h.logo.imageSrc} onChange={(imageSrc) => set({ logo: { ...h.logo, imageSrc } })} />
          {h.logo.imageSrc.trim() ? (
            <TextField label="Logo description" value={h.logo.imageAlt} onChange={(imageAlt) => set({ logo: { ...h.logo, imageAlt } })} hint={`What the logo says, for people who can't see it, e.g. "Haho Studio".`} />
          ) : null}
        </fieldset>
        <LinkListEditor name="Menu" links={h.menu} onChange={(menu) => set({ menu })} max={chromeLimits.menu} pages={pages} />
        <button type="button" className="st-button st-link-reset" onClick={() => set({ menu: menuFromPages(pages) })}>
          Rebuild the menu from my pages
        </button>
        <fieldset className="st-fieldset">
          <legend className="st-field-label">Button at the end (optional)</legend>
          <TextField label="Button label" value={h.cta.label} onChange={(label) => set({ cta: { ...h.cta, label } })} hint="Leave empty for no button." />
          <TextField label="Button link" value={h.cta.href} onChange={(href) => set({ cta: { ...h.cta, href } })} />
        </fieldset>
        <Check label="Keep the header at the top while scrolling" checked={h.sticky} onChange={(sticky) => set({ sticky })} />
        <div className="st-chrome-field">
          <span className="st-field-label" aria-hidden="true">
            Header style
          </span>
          <StyleTiles tokens={tokens} label="Header style" value={h.style} onChange={(style) => set({ style })} />
        </div>
        <p className="st-help">On phones the menu folds into a Menu button that opens without JavaScript.</p>
      </div>
      <Problems list={chromeProblems(chrome, "header")} />
    </>
  );
}

export function FooterOptions({ chrome, onChange, tokens, pages }: Props) {
  const f = chrome.footer;
  const set = (patch: Partial<SiteFooter>) => onChange({ ...chrome, footer: { ...f, ...patch } });
  const setColumn = (i: number, patch: Partial<FooterColumn>) => set({ columns: f.columns.map((c, j) => (j === i ? { ...c, ...patch } : c)) });
  return (
    <>
      <Check label="Show a footer on every page" checked={f.show} onChange={(show) => set({ show })} />
      <div className="st-chrome-body" hidden={!f.show}>
        <TextField label="Short text (optional)" value={f.text} onChange={(text) => set({ text })} multiline hint="A line about you, shown first." />
        {f.columns.map((c, i) => (
          <fieldset className="st-fieldset" key={i}>
            <legend className="st-field-label">Column {i + 1}</legend>
            <TextField label="Column title" value={c.title} onChange={(title) => setColumn(i, { title })} />
            <LinkListEditor name={c.title || `Column ${i + 1}`} links={c.links} onChange={(links) => setColumn(i, { links })} max={chromeLimits.links} pages={pages} />
            <button type="button" className="st-button" onClick={() => set({ columns: f.columns.filter((_, j) => j !== i) })}>
              Remove column {i + 1}
            </button>
          </fieldset>
        ))}
        <button type="button" className="st-button" disabled={f.columns.length >= chromeLimits.columns} onClick={() => set({ columns: [...f.columns, { title: "", links: [] }] })}>
          Add a column of links
        </button>
        <TextField label="Copyright line" value={f.copyright} onChange={(copyright) => set({ copyright })} hint="{year} and {name} are filled in when you publish." />
        <div className="st-chrome-field">
          <span className="st-field-label" aria-hidden="true">
            Footer style
          </span>
          <StyleTiles tokens={tokens} label="Footer style" value={f.style} onChange={(style) => set({ style })} />
        </div>
      </div>
      <Problems list={chromeProblems(chrome, "footer")} />
    </>
  );
}
